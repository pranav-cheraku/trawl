"""Pydantic schemas for the Build Next feature.

_CamelModel consolidates alias_generator=to_camel + from_attributes=True so
all schemas in this file share the same config. Nested dict fields (content,
retrieval_metadata, build_order entries) keep their snake_case keys verbatim
because alias_generator only transforms declared model fields.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


BuildStatus = Literal["pending", "running", "success", "failure"]


class _CamelModel(BaseModel):
    """Base for all schemas. alias_generator produces camelCase JSON.

    Nested dict fields (content, retrieval_metadata, build_order entries)
    keep their snake_case keys verbatim. alias_generator only transforms
    declared model fields.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class RunBuildNextRequest(_CamelModel):
    """POST body for /projects/{id}/build-next/runs."""

    source_ids: list[uuid.UUID] | None = Field(default=None)


class RunBuildNextResponse(_CamelModel):
    """202 response. Task kicked off."""

    report_id: uuid.UUID
    task_id: str


class AlreadyRunningResponse(_CamelModel):
    """409 response when a run is already in flight for this project."""

    existing_report_id: uuid.UUID
    task_id: str | None


class BuildReportSummary(_CamelModel):
    """Item in the GET /runs list response (for the run switcher)."""

    id: uuid.UUID
    status: BuildStatus
    created_at: datetime
    completed_at: datetime | None
    source_count: int
    theme_count: int
    spec_count: int


class BuildThemeResponse(_CamelModel):
    id: uuid.UUID
    rank: int
    name: str
    description: str
    frequency_pct: float
    chunk_count: int
    severity_score: float
    spec_generation_failed: bool


class BuildReportSpecResponse(_CamelModel):
    id: uuid.UUID
    theme_id: uuid.UUID
    build_rank: int
    title: str
    content: dict[str, Any]
    promoted_spec_id: uuid.UUID | None


class BuildOrderEntry(_CamelModel):
    """Entry in the build_order JSONB list. Keys camelCased on the wire."""

    rank: int
    spec_id: uuid.UUID | None
    rationale: str


class BuildReportResponse(_CamelModel):
    """Full report payload for GET /build-reports/{id}."""

    id: uuid.UUID
    project_id: uuid.UUID
    status: BuildStatus
    task_id: str | None
    failure_reason: str | None
    executive_summary: str | None
    themes: list[BuildThemeResponse]
    specs: list[BuildReportSpecResponse]
    build_order: list[BuildOrderEntry]
    retrieval_metadata: dict[str, Any] | None
    source_ids: list[uuid.UUID]
    partial_failure: bool
    created_at: datetime
    completed_at: datetime | None


class BuildReportChunkResponse(_CamelModel):
    chunk_id: uuid.UUID
    similarity: float
    retrieval_rank: int
    source_query: str
    chunk_text: str
    source_name: str
    feedback_item_id: uuid.UUID


class BuildReportChunksResponse(_CamelModel):
    chunks: list[BuildReportChunkResponse]


class PromoteSpecResponse(_CamelModel):
    """201 response from the promote endpoint."""

    kanban_spec_id: uuid.UUID


class AlreadyPromotedResponse(_CamelModel):
    """409 response when the spec was already promoted."""

    existing_spec_id: uuid.UUID
