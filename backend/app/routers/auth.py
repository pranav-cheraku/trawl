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
    """Create or update a user record from NextAuth identity data.

    Protected by X-Auth-Secret, NOT JWT, because the NextAuth jwt callback calls
    this before the client JWT exists.
    """
    if x_auth_secret != settings.JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Auth-Secret header",
        )

    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=body.email,
            name=body.name,
            avatar_url=body.avatar_url,
            credits_balance=settings.SIGNUP_CREDITS,
        )
        db.add(user)
    else:
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
    result = await db.execute(select(User).where(User.id == user_id))
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
    result = await db.execute(select(User).where(User.id == user_id))
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
    summary="Delete the authenticated user and cascade all owned data",
)
async def delete_me(
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> Response:
    """Permanently delete the authenticated user.

    SQLAlchemy ORM cascade on User.projects (cascade='all, delete-orphan')
    deletes every Project owned by this user. Each Project's own cascades
    delete its FeedbackSources / FeedbackItems / FeedbackChunks / Specs /
    Conversations / BuildReports transitively. The stripe_processed_events
    table is event-id-keyed (not user-scoped) — those rows stay, which is
    correct for idempotency.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    await db.delete(user)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
