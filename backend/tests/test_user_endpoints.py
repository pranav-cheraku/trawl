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


async def test_delete_user_cascades_projects(db, test_user):
    """DELETE removes the user AND cascades to their projects."""
    # Create a project owned by test_user
    project = Project(
        user_id=test_user.id,
        name="Will be cascaded",
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

        # Verify cascade — re-query from a fresh session because the test's
        # `db` fixture has cached state.
        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as fresh:
            user_check = await fresh.execute(
                select(User).where(User.id == test_user.id)
            )
            assert user_check.scalar_one_or_none() is None, "User row was not deleted"
            project_check = await fresh.execute(
                select(Project).where(Project.id == project_id)
            )
            assert project_check.scalar_one_or_none() is None, "Project was not cascaded"
        await engine.dispose()
    finally:
        app.dependency_overrides.pop(get_user_id_from_token, None)
        # Cleanup is automatic — the DELETE already removed both rows.


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
