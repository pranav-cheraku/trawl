from __future__ import annotations

import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class InsufficientCreditsError(Exception):
    """Raised when a credit decrement would take the balance below zero."""

    def __init__(self, user_id: uuid.UUID, requested: int) -> None:
        self.user_id = user_id
        self.requested = requested
        super().__init__(f"User {user_id} has insufficient credits for {requested}")


async def decrement_credits(
    db: AsyncSession, user_id: uuid.UUID, amount: int
) -> int:
    """Atomically subtract *amount* credits from the user's balance.

    Uses a single ``UPDATE ... WHERE credits_balance >= :amount RETURNING`` so
    concurrent callers cannot both pass the balance check and overspend.  If
    the update affects zero rows the user had insufficient credits and we raise
    :class:`InsufficientCreditsError`.

    Returns the new balance after the decrement.
    """
    if amount <= 0:
        raise ValueError("amount must be positive")

    result = await db.execute(
        text(
            "UPDATE users "
            "SET credits_balance = credits_balance - :amount "
            "WHERE id = :user_id AND credits_balance >= :amount "
            "RETURNING credits_balance"
        ),
        {"amount": amount, "user_id": user_id},
    )
    row = result.fetchone()
    if row is None:
        raise InsufficientCreditsError(user_id, amount)
    return int(row[0])


async def increment_credits(
    db: AsyncSession, user_id: uuid.UUID, amount: int
) -> int:
    """Atomically add *amount* credits to the user's balance.

    Returns the new balance after the increment.
    """
    if amount <= 0:
        raise ValueError("amount must be positive")

    result = await db.execute(
        text(
            "UPDATE users SET credits_balance = credits_balance + :amount "
            "WHERE id = :user_id RETURNING credits_balance"
        ),
        {"amount": amount, "user_id": user_id},
    )
    row = result.fetchone()
    if row is None:
        raise ValueError(f"User {user_id} not found")
    return int(row[0])
