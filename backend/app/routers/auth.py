from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.user import UpdateUserName, UserResponse, UserSync

router = APIRouter(tags=["auth"])


@router.post(
    "/auth/sync",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Upsert a user on login (called by NextAuth jwt callback)",
)
async def sync_user(
    body: UserSync,
    db: AsyncSession = Depends(get_db),
    x_auth_secret: str | None = Header(default=None),
) -> User:
    """Create, update, or restore a user record from NextAuth identity data.

    Three branches:
    - Active row exists (deleted_at IS NULL) → normal upsert (update fields).
    - Soft-deleted row exists (deleted_at IS NOT NULL) → restore by setting
      deleted_at = NULL and updating fields. All owned data is preserved.
    - No row → create fresh with SIGNUP_CREDITS starter credits.

    The Celery beat task hard-deletes soft-deleted rows older than 30 days +
    1h buffer, so by the time a user re-signs-in after grace, the row no
    longer exists and we fall through to the create branch.

    Protected by X-Auth-Secret, NOT JWT, because the NextAuth jwt callback calls
    this before the client JWT exists.
    """
    if x_auth_secret != settings.JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Auth-Secret header",
        )

    # Lookup includes soft-deleted rows so we can restore them.
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        # No row → create fresh
        user = User(
            email=body.email,
            name=body.name,
            avatar_url=body.avatar_url,
            credits_balance=settings.SIGNUP_CREDITS,
        )
        db.add(user)
    else:
        # Row exists — restore if soft-deleted, then update OAuth-provided fields
        if user.deleted_at is not None:
            user.deleted_at = None
        if body.name is not None:
            user.name = body.name
        if body.avatar_url is not None:
            user.avatar_url = body.avatar_url

    await db.flush()
    await db.refresh(user)
    return user


@router.get(
    "/auth/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Return the currently authenticated user",
)
async def get_me(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> User:
    """Fetch the authenticated user's profile."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user: User | None = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return user


@router.patch(
    "/auth/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update the authenticated user's display name",
)
async def update_me(
    body: UpdateUserName,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> User:
    """Update the authenticated user's display name."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    user.name = body.name
    await db.flush()
    await db.refresh(user)
    return user


@router.delete(
    "/auth/me",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Soft-delete the authenticated user (30-day grace before permanent cleanup)",
)
async def delete_me(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> Response:
    """Mark the authenticated user as soft-deleted.

    Sets users.deleted_at = now(). All owned data (projects, specs, etc.) is
    preserved. A scheduled Celery beat task hard-deletes rows whose deleted_at
    is older than 30 days + 1h buffer, at which point SQLAlchemy ORM cascade
    on User.projects wipes everything transitively.

    Re-signing in with the same Google account before the cleanup task fires
    will restore the row (deleted_at = NULL) via /auth/sync.
    """
    from datetime import datetime

    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    user.deleted_at = datetime.utcnow()
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
