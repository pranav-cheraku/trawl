from __future__ import annotations

import uuid

from app.database import get_db  # noqa: F401  re-exported for router convenience

# Placeholder user ID for development (auth comes Day 4).
# A matching row MUST exist in the users table for FK constraints.
DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def get_current_user() -> uuid.UUID:
    """Return the authenticated user's ID.

    Placeholder: returns a fixed UUID until NextAuth JWT integration is wired
    up in backend/app/middleware/auth.py on Day 4.
    """
    return DEV_USER_ID
