from __future__ import annotations

import pytest
from sqlalchemy import text

from app.services.credits import (
    InsufficientCreditsError,
    decrement_credits,
    increment_credits,
)


async def test_decrement_credits_succeeds_when_balance_sufficient(db, test_user):
    new_balance = await decrement_credits(db, test_user.id, amount=3)
    assert new_balance == 7


async def test_decrement_credits_raises_when_balance_insufficient(db, test_user):
    with pytest.raises(InsufficientCreditsError):
        await decrement_credits(db, test_user.id, amount=11)
    # Balance unchanged
    await db.refresh(test_user)
    assert test_user.credits_balance == 10


async def test_decrement_is_atomic_no_double_spend(db, test_user):
    """Two parallel decrements of 6 each from a 10-balance must result in one
    success and one InsufficientCreditsError, never both succeeding."""
    import asyncio

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.config import settings

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def attempt() -> int | None:
        async with factory() as s:
            try:
                bal = await decrement_credits(s, test_user.id, amount=6)
                await s.commit()
                return bal
            except InsufficientCreditsError:
                return None

    # Persist test_user fixture commit so other sessions see it
    await db.commit()

    results = await asyncio.gather(attempt(), attempt())
    successes = [r for r in results if r is not None]
    failures = [r for r in results if r is None]
    assert len(successes) == 1
    assert len(failures) == 1

    # Clean up the committed row — the db fixture's rollback is a no-op after
    # the explicit commit above, so we must delete explicitly to avoid leaving
    # orphan rows in the dev DB on every test run.
    async with factory() as cleanup:
        await cleanup.execute(
            text("DELETE FROM users WHERE id = :uid"),
            {"uid": test_user.id},
        )
        await cleanup.commit()
    await engine.dispose()


async def test_increment_credits_adds_to_balance(db, test_user):
    new_balance = await increment_credits(db, test_user.id, amount=100)
    assert new_balance == 110
