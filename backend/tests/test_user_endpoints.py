from __future__ import annotations

from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.auth import get_user_id_from_token


async def test_update_user_name_succeeds(db, test_user):
    """PATCH with a valid name updates the row and returns 200."""
    app.dependency_overrides[get_user_id_from_token] = lambda: test_user.id
    await db.commit()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.patch(
                "/api/auth/me",
                json={"name": "New Display Name"},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "New Display Name"

        await db.refresh(test_user)
        assert test_user.name == "New Display Name"
    finally:
        app.dependency_overrides.pop(get_user_id_from_token, None)
        from sqlalchemy import text
        await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": test_user.id})
        await db.commit()


async def test_update_user_name_rejects_empty(db, test_user):
    """PATCH with name='' returns 422 (Pydantic min_length=1)."""
    app.dependency_overrides[get_user_id_from_token] = lambda: test_user.id
    await db.commit()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.patch("/api/auth/me", json={"name": ""})
        assert resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_user_id_from_token, None)
        from sqlalchemy import text
        await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": test_user.id})
        await db.commit()


async def test_update_user_name_rejects_too_long(db, test_user):
    """PATCH with name longer than 255 chars returns 422."""
    app.dependency_overrides[get_user_id_from_token] = lambda: test_user.id
    await db.commit()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.patch(
                "/api/auth/me",
                json={"name": "x" * 256},
            )
        assert resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_user_id_from_token, None)
        from sqlalchemy import text
        await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": test_user.id})
        await db.commit()


from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from app.config import settings  # noqa: E402
from app.models.project import Project  # noqa: E402
from app.models.user import User  # noqa: E402


async def test_delete_user_soft_deletes(db, test_user):
    """DELETE sets deleted_at; data is NOT cascade-deleted."""
    from datetime import datetime

    # Create a project owned by test_user
    project = Project(
        user_id=test_user.id,
        name="Should survive soft delete",
        description="",
    )
    db.add(project)
    await db.flush()
    project_id = project.id
    await db.commit()

    app.dependency_overrides[get_user_id_from_token] = lambda: test_user.id
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.delete("/api/auth/me")
        assert resp.status_code == 204
        assert resp.text == ""

        # Verify from a fresh session: user row exists with deleted_at set,
        # project row STILL EXISTS (cascade must not fire on soft delete).
        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as fresh:
            user_check = await fresh.execute(
                select(User).where(User.id == test_user.id)
            )
            user_row = user_check.scalar_one_or_none()
            assert user_row is not None, "User row was hard-deleted (should be soft)"
            assert isinstance(user_row.deleted_at, datetime), "deleted_at was not set"

            project_check = await fresh.execute(
                select(Project).where(Project.id == project_id)
            )
            assert project_check.scalar_one_or_none() is not None, (
                "Project was cascaded — soft delete should preserve data"
            )
        await engine.dispose()
    finally:
        app.dependency_overrides.pop(get_user_id_from_token, None)
        # Cleanup: this test left a soft-deleted user + their project in the DB.
        from sqlalchemy import text
        await db.execute(text("DELETE FROM projects WHERE id = :pid"), {"pid": project_id})
        await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": test_user.id})
        await db.commit()


async def test_delete_user_returns_204_with_empty_body(db, test_user):
    """DELETE returns 204 No Content with no body."""
    app.dependency_overrides[get_user_id_from_token] = lambda: test_user.id
    await db.commit()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.delete("/api/auth/me")
        assert resp.status_code == 204
        assert resp.content == b""
    finally:
        app.dependency_overrides.pop(get_user_id_from_token, None)
        # No cleanup needed — the user was deleted by the endpoint.


async def test_get_me_returns_404_for_soft_deleted_user(db, test_user):
    """A soft-deleted user gets 404 from /auth/me even with a valid JWT."""
    from datetime import datetime

    # Soft-delete the test user directly in the DB
    test_user.deleted_at = datetime.utcnow()
    await db.commit()

    app.dependency_overrides[get_user_id_from_token] = lambda: test_user.id
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/auth/me")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_user_id_from_token, None)
        from sqlalchemy import text
        await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": test_user.id})
        await db.commit()


async def test_sync_user_restores_soft_deleted_user(db, test_user):
    """Re-auth via /auth/sync of a soft-deleted user restores them
    (deleted_at = NULL) and returns the SAME UUID."""
    from datetime import datetime

    from app.config import settings

    # Soft-delete the test user
    original_id = test_user.id
    original_email = test_user.email
    test_user.deleted_at = datetime.utcnow()
    await db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/sync",
            headers={"X-Auth-Secret": settings.JWT_SECRET},
            json={"email": original_email, "name": "Restored Name", "avatarUrl": None},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(original_id), "Restore should preserve UUID"
    assert body["name"] == "Restored Name"

    # Verify from fresh session: deleted_at is now NULL
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as fresh:
        check = await fresh.execute(select(User).where(User.id == original_id))
        row = check.scalar_one_or_none()
        assert row is not None
        assert row.deleted_at is None, "deleted_at should be cleared on restore"
        assert row.name == "Restored Name"
    await engine.dispose()

    # Cleanup
    from sqlalchemy import text
    await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": original_id})
    await db.commit()


async def test_sync_user_creates_fresh_when_no_row_exists(db):
    """If no row exists for the email (e.g., cleanup task already ran),
    /auth/sync creates a fresh user with SIGNUP_CREDITS."""
    import uuid as uuid_mod

    from app.config import settings

    email = f"fresh-{uuid_mod.uuid4()}@example.com"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/sync",
            headers={"X-Auth-Secret": settings.JWT_SECRET},
            json={"email": email, "name": "Fresh User", "avatarUrl": None},
        )
    assert resp.status_code == 200
    body = resp.json()
    new_id = body["id"]
    assert body["name"] == "Fresh User"

    # Verify credits_balance = SIGNUP_CREDITS via fresh session
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as fresh:
        check = await fresh.execute(select(User).where(User.email == email))
        row = check.scalar_one_or_none()
        assert row is not None
        assert row.credits_balance == settings.SIGNUP_CREDITS
        assert row.deleted_at is None
    await engine.dispose()

    # Cleanup
    from sqlalchemy import text
    await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": new_id})
    await db.commit()
