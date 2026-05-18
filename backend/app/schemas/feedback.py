"""Pydantic schemas for feedback sources, connectors, and items.

All request schemas use alias_generator=to_camel so the frontend sends
camelCase JSON while the Python attributes stay snake_case.

FeedbackItemResponse uses `validation_alias="item_metadata"` because the ORM
attribute is `item_metadata` (the DB column is `metadata`, renamed to avoid
colliding with SQLAlchemy's reserved attribute).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class AppSearchResult(BaseModel):
    """Response shape for an iTunes app search result."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    track_id: str
    track_name: str
    bundle_id: str
    artwork_url: str
    average_rating: float | None
    rating_count: int
    genre: str


class AppStoreConnectRequest(BaseModel):
    """Request body for connecting an App Store source."""

    app_name: str = Field(..., min_length=1, max_length=255)
    country: str = Field(default="us", max_length=10)
    preset: Literal["quick", "standard"] = "standard"

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ManualPasteRequest(BaseModel):
    """Request body for creating a source from manually pasted text."""

    title: str | None = Field(default=None, max_length=255)
    # Capped so a single paste cannot run up an unbounded embedding bill.
    content: str = Field(..., min_length=1, max_length=100_000)

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class GooglePlaySearchResult(BaseModel):
    """Response shape for a single Google Play app search result."""

    package_name: str
    track_name: str
    artwork_url: str = ""
    average_rating: float | None = None
    rating_count: int = 0
    genre: str = ""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class GooglePlayConnectRequest(BaseModel):
    """Request body for connecting a Google Play source."""

    package_name: str = Field(..., min_length=1, max_length=255)
    app_name: str = Field(..., min_length=1, max_length=255)
    preset: Literal["quick", "standard"] = "standard"

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class RedditConnectRequest(BaseModel):
    """Request body for connecting a Reddit source (subreddit or keyword)."""

    mode: Literal["subreddit", "keyword"]
    value: str = Field(..., min_length=1, max_length=255)
    preset: Literal["quick", "standard", "deep"] = "standard"

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class SourceResponse(BaseModel):
    """Response shape for a feedback source."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    source_type: str
    filename: str | None
    app_store_id: str | None
    app_store_name: str | None
    app_store_country: str | None
    connector_config: dict | None = None
    record_count: int
    status: str
    created_at: datetime


class FeedbackItemResponse(BaseModel):
    """Response shape for a single feedback item."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    content: str
    metadata: dict = Field(default_factory=dict, validation_alias="item_metadata")
    external_id: str | None
    created_at: datetime


class ChunkDetailResponse(BaseModel):
    """Response for GET /projects/{id}/chunks/{id}: full chunk plus parent item."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    chunk_id: uuid.UUID
    feedback_item_id: uuid.UUID
    chunk_text: str
    feedback_item_content: str
    source_type: str
    source_name: str
