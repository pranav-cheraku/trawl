from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class UserSync(BaseModel):
    """Request body for user sync (upsert on login)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    email: str
    name: str | None = None
    avatar_url: str | None = None


class UserResponse(BaseModel):
    """Response shape for user info."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    email: str
    name: str | None
    avatar_url: str | None
    # Used by the dashboard to show a one-time welcome banner to new accounts.
    created_at: datetime


class UpdateUserName(BaseModel):
    """Request body for PATCH /auth/me — display-name update."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str = Field(min_length=1, max_length=255)
