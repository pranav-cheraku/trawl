from __future__ import annotations

import uuid

from fastapi import HTTPException, Request, status
from jose import ExpiredSignatureError, JWTError, jwt

from app.config import settings

DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
_DEV_SECRET = "dev-secret-change-in-production"


async def get_user_id_from_token(request: Request) -> uuid.UUID:
    """Extract and validate user ID from JWT Bearer token.

    In dev mode (JWT_SECRET == default), allows unauthenticated requests
    by falling back to DEV_USER_ID.

    Args:
        request: The incoming FastAPI request object.

    Returns:
        The authenticated user's UUID.

    Raises:
        HTTPException: 401 if the token is missing (in production), expired,
            malformed, or contains an invalid subject claim.
    """
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
