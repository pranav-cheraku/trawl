"""Pydantic schemas for conversation and messaging endpoints.

SendMessageRequest accepts optional source_ids and retrieval tuning parameters.
Use `is not None` checks (not `or`) for top_k/threshold so that threshold=0.0
is not coerced to the server default.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class TransparencyChunk(BaseModel):
    """A single retrieved chunk as it appears in a message's transparency blob."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    chunk_id: uuid.UUID
    feedback_item_id: uuid.UUID
    chunk_text_preview: str
    # Full text stored alongside the preview so the detail modal can render without a follow-up fetch.
    chunk_text: str | None = None
    feedback_item_content: str | None = None
    similarity_score: float
    retrieval_rank: int
    source_type: str
    source_name: str


class TransparencyPayload(BaseModel):
    """Full RAG transparency payload stored on assistant messages."""

    # protected_namespaces=() suppresses Pydantic's "model_" prefix warning.
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        protected_namespaces=(),
    )

    query: str
    retrieved_chunks: list[TransparencyChunk]
    model_used: str | None
    top_k: int
    threshold: float
    total_chunks_searched: int
    retrieval_latency_ms: int
    generation_latency_ms: int
    input_tokens: int
    output_tokens: int


class SendMessageRequest(BaseModel):
    """Request body for sending a message into a conversation."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    content: str = Field(..., min_length=1, max_length=2000)
    # None = all sources, [] = user explicitly muted every source (returns no chunks).
    source_ids: list[uuid.UUID] | None = None
    # None = use server defaults. Use `is not None` checks, not `or`, to avoid
    # coercing threshold=0.0 to the default.
    top_k: int | None = Field(default=None, ge=1, le=30)
    threshold: float | None = Field(default=None, ge=0.0, le=1.0)


class ConversationCreateRequest(BaseModel):
    """Request body for creating a new conversation.

    If title is omitted or empty, the conversation is auto-named from the first user message.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str | None = Field(default=None, max_length=255)


class ConversationUpdateRequest(BaseModel):
    """Request body for updating a conversation's metadata (title)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str | None = Field(default=None, max_length=255)


class MessageResponse(BaseModel):
    """Response shape for a single message."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    source_chunk_ids: list[uuid.UUID]
    transparency: dict | None
    created_at: datetime


class ConversationResponse(BaseModel):
    """Response shape for a conversation (no nested messages)."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    project_id: uuid.UUID
    title: str | None
    created_at: datetime


class ConversationDetailResponse(BaseModel):
    """Response shape for a conversation with its full message history."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )

    id: uuid.UUID
    project_id: uuid.UUID
    title: str | None
    created_at: datetime
    messages: list[MessageResponse]
