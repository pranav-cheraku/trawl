from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database import engine as app_engine
from app.models.user import User


@pytest_asyncio.fixture(autouse=True)
async def dispose_app_engine() -> AsyncIterator[None]:
    """Dispose the shared app engine after every test.

    Tests that use ASGITransport(app=app) exercise get_db, which draws
    connections from the module-level async engine.  Under pytest-asyncio's
    function-scoped event loop, each test gets a fresh loop.  Without this
    fixture the asyncpg pool stays bound to the previous loop, causing
    'Event loop is closed' errors in the next test that touches the engine.
    """
    yield
    await app_engine.dispose()


@pytest_asyncio.fixture
async def db() -> AsyncIterator[AsyncSession]:
    """Per-test async session against the dev DB. Rolled back at teardown."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()
    await engine.dispose()


@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> User:
    """Create a test user with 10 credits and flush (but not commit) it."""
    user = User(
        email=f"test-{uuid.uuid4()}@example.com",
        name="Test User",
        credits_balance=10,
    )
    db.add(user)
    await db.flush()
    return user
