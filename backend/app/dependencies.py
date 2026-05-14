from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db  # noqa: F401  re-exported for router convenience
from app.middleware.auth import get_user_id_from_token
from app.services.credits import InsufficientCreditsError, decrement_credits

get_current_user = get_user_id_from_token


def require_credits(amount: int) -> Callable[..., Awaitable[uuid.UUID]]:
    """Returns a FastAPI dep that atomically charges `amount` credits and
    returns the user_id. Raises HTTP 402 if balance is insufficient.

    The decrement is committed by the calling endpoint via the normal db
    session lifecycle. If the request later fails downstream, credits are
    NOT refunded (acceptable scope decision: portfolio-grade, not refundable).
    """

    async def _dep(
        user_id: uuid.UUID = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> uuid.UUID:
        try:
            await decrement_credits(db, user_id, amount=amount)
        except InsufficientCreditsError as exc:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"Insufficient credits. This action costs {amount} credits."
                ),
            ) from exc
        return user_id

    return _dep
