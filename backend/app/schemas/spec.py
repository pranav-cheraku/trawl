"""Pydantic schemas for spec generation, Kanban CRUD, and task polling.

Note on dict field keys: alias_generator=to_camel only transforms declared
model fields. Values inside `content: dict` and `result: dict` stay snake_case
(e.g. `spec_ids`, `proposed_solution`, `supporting_feedback_indices`).
The frontend types reflect this.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class GenerateSpecsRequest(BaseModel):
    """Request body for kicking off spec generation."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    type: str = Field(..., pattern=r"^(feature_specs|user_stories)$")
    focus: str | None = Field(default=None, max_length=500)
    # None = all sources, [] = user muted everything (returns no chunks).
    source_ids: list[uuid.UUID] | None = None


class GenerateSpecsResponse(BaseModel):
    """Response returned when a generation task is queued."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    task_id: str


class TaskStatusResponse(BaseModel):
    """Polling response for an async Celery task."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    task_id: str
    status: str
    result: dict | None = None
    error: str | None = None


class SpecUpdateRequest(BaseModel):
    """Partial update for a spec (title, content, priority, status)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str | None = Field(default=None, max_length=500)
    content: dict | None = None
    priority: str | None = Field(
        default=None, pattern=r"^(critical|high|medium|low)$"
    )
    status: str | None = Field(
        default=None, pattern=r"^(backlog|planned|in_progress|done)$"
    )


class ReorderItem(BaseModel):
    """A single item in a batch reorder request."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: uuid.UUID
    kanban_order: int
    status: str = Field(..., pattern=r"^(backlog|planned|in_progress|done)$")


class ReorderRequest(BaseModel):
    """Batch update for kanban_order and status on multiple specs."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    items: list[ReorderItem] = Field(..., min_length=1)


class SpecResponse(BaseModel):
    """Full spec as returned by list/get/update endpoints."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    project_id: uuid.UUID
    type: str
    title: str
    content: dict
    priority: str
    status: str
    kanban_order: int
    source_chunk_ids: list[uuid.UUID]
    created_at: datetime
    updated_at: datetime


class SpecSourcesResponse(BaseModel):
    """RAG X-Ray transparency data for a single spec."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        protected_namespaces=(),
    )

    spec_id: uuid.UUID
    retrieved_chunks: list[dict]
    generation_prompt: str | None
    model_used: str | None
    total_chunks_searched: int | None
    retrieval_top_k: int | None
