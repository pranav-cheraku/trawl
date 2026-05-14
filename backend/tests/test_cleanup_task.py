from __future__ import annotations

import uuid as uuid_mod
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.models.project import Project
from app.models.user import User
from app.tasks.cleanup import cleanup_expired_deleted_users


async def test_cleanup_deletes_users_past_grace(db):
    """A user soft-deleted 31 days ago is hard-deleted by the cleanup task,
    and their owned project is cascade-deleted."""
    expired_user = User(
        email=f"expired-{uuid_mod.uuid4()}@example.com",
        name="Expired",
        credits_balance=10,
        deleted_at=datetime.utcnow() - timedelta(days=31),
    )
    db.add(expired_user)
    await db.flush()
    project = Project(
        user_id=expired_user.id,
        name="Doomed",
        description="",
    )
    db.add(project)
    await db.flush()
    user_id = expired_user.id
    project_id = project.id
    await db.commit()

    try:
        # Call the task as a plain function (Celery's @task decorator preserves
        # the underlying callable; direct invocation runs sync without going
        # through the broker).
        result = cleanup_expired_deleted_users()
        assert result["deleted"] >= 1

        # Verify hard delete + cascade via fresh session
        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as fresh:
            user_check = await fresh.execute(select(User).where(User.id == user_id))
            assert user_check.scalar_one_or_none() is None, "User not hard-deleted"
            project_check = await fresh.execute(
                select(Project).where(Project.id == project_id)
            )
            assert project_check.scalar_one_or_none() is None, "Project not cascaded"
        await engine.dispose()
    finally:
        # Defensive cleanup in case the task didn't fire as expected.
        from sqlalchemy import text
        await db.execute(text("DELETE FROM projects WHERE id = :pid"), {"pid": project_id})
        await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
        await db.commit()


async def test_cleanup_skips_within_grace_buffer(db):
    """A user soft-deleted 30 days ago (within the 30d+1h buffer) is NOT deleted."""
    fresh_deleted = User(
        email=f"recent-{uuid_mod.uuid4()}@example.com",
        name="Recent",
        credits_balance=5,
        deleted_at=datetime.utcnow() - timedelta(days=30),
    )
    db.add(fresh_deleted)
    await db.flush()
    user_id = fresh_deleted.id
    await db.commit()

    try:
        cleanup_expired_deleted_users()

        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as fresh:
            check = await fresh.execute(select(User).where(User.id == user_id))
            row = check.scalar_one_or_none()
            assert row is not None, "User within grace window was hard-deleted"
            assert row.deleted_at is not None, "deleted_at was incorrectly cleared"
        await engine.dispose()
    finally:
        from sqlalchemy import text
        await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
        await db.commit()


async def test_cleanup_skips_active_users(db):
    """A user with deleted_at = None is never touched."""
    active = User(
        email=f"active-{uuid_mod.uuid4()}@example.com",
        name="Active",
        credits_balance=100,
        deleted_at=None,
    )
    db.add(active)
    await db.flush()
    user_id = active.id
    await db.commit()

    try:
        cleanup_expired_deleted_users()

        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as fresh:
            check = await fresh.execute(select(User).where(User.id == user_id))
            row = check.scalar_one_or_none()
            assert row is not None, "Active user was hard-deleted"
            assert row.deleted_at is None
        await engine.dispose()
    finally:
        from sqlalchemy import text
        await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
        await db.commit()
