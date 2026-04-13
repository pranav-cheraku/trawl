from __future__ import annotations

import uuid
from datetime import datetime

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

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    app_name: str = Field(..., min_length=1, max_length=255)
    country: str = Field(default="us", max_length=10)


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
