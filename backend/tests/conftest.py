from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.user import User


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
