"""JWT authentication dependency for FastAPI request handlers.

This is a FastAPI `Depends()` function, NOT Starlette ASGI middleware.
Auth resolution order:
  1. `request.state.user_id_override` set by DemoAccessMiddleware (demo path).
  2. Bearer token in Authorization header (normal path).
  3. Dev fallback to DEV_USER_ID when JWT_SECRET is the default value and
     no header is present (local development without a real OAuth flow).
"""
from __future__ import annotations

import uuid

from fastapi import HTTPException, Request, status
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings

DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
_DEV_SECRET = "dev-secret-change-in-production"


async def get_user_id_from_token(request: Request) -> uuid.UUID:
    """Validate JWT Bearer token and return the user UUID.

    If ``DemoAccessMiddleware`` has set ``request.state.user_id_override``,
    that value is returned immediately without inspecting the JWT.

    Falls back to DEV_USER_ID when JWT_SECRET is the default dev value and
    no Authorization header is present.
    """
    override: uuid.UUID | None = getattr(request.state, "user_id_override", None)
    if override is not None:
        return override

    authorization: str | None = request.headers.get("Authorization")

    if not authorization:
        if settings.JWT_SECRET == _DEV_SECRET:
            return DEV_USER_ID
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme",
        )

    token = authorization[len("Bearer "):]

    try:
        payload: dict = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    sub: str | None = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )

    return user_id
