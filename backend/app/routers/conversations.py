from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.models.conversation import Conversation, Message
from app.models.feedback import FeedbackSource
from app.models.project import Project
from app.schemas.conversation import (
    ConversationCreateRequest,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationUpdateRequest,
    MessageResponse,
    SendMessageRequest,
)
from app.services.embedding import embed_query
from app.services.generation import generate_answer
from app.services.retrieval import RetrievedChunk, retrieve_chunks

router = APIRouter(tags=["conversations"])
logger = logging.getLogger(__name__)

TOP_K = 8
SIMILARITY_THRESHOLD = 0.3
HISTORY_LIMIT = 6
TITLE_MAX_CHARS = 80


async def _get_project_for_user(
    project_id: uuid.UUID,
    db: AsyncSession,
    user_id: uuid.UUID,
) -> Project:
    """Load a project and verify it belongs to the authenticated user."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == user_id,
        )
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )
    return project


async def _get_conversation_for_project(
    conversation_id: uuid.UUID,
    project_id: uuid.UUID,
    db: AsyncSession,
) -> Conversation:
    """Load a conversation scoped to a project, 404 if missing."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    return conversation


def _chunk_to_transparency_dict(chunk: RetrievedChunk) -> dict:
    """Serialize a RetrievedChunk into the transparency JSONB shape.

    Keys are camelCase so the blob matches the frontend's expected shape
    without an extra transformation layer.

    Stores BOTH a short preview (for compact card display) and the full
    chunk text + full parent feedback item content so the frontend can
    open a detail modal without a follow-up API call.
    """
    text = chunk.chunk_text or ""
    preview = text[:280] + ("…" if len(text) > 280 else "")
    return {
        "chunkId": str(chunk.chunk_id),
        "feedbackItemId": str(chunk.feedback_item_id),
        "chunkTextPreview": preview,
        "chunkText": text,
        "feedbackItemContent": chunk.feedback_item_content,
        "similarityScore": chunk.similarity_score,
        "retrievalRank": chunk.retrieval_rank,
        "sourceType": chunk.source_type,
        "sourceName": chunk.source_name,
    }


async def _project_has_ready_source(db: AsyncSession, project_id: uuid.UUID) -> bool:
    """Return True if the project has at least one source with status='ready'."""
    result = await db.execute(
        select(FeedbackSource.id)
        .where(
            FeedbackSource.project_id == project_id,
            FeedbackSource.status == "ready",
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


@router.post(
    "/projects/{project_id}/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation",
)
async def create_conversation(
    project_id: uuid.UUID,
    body: ConversationCreateRequest = ConversationCreateRequest(),
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> Conversation:
    """Create a conversation for a project, optionally with a user-chosen
    title. If no title is provided (or it's empty after stripping), the
    conversation is untitled and will be auto-named from the first user
    message on the next send."""
    project = await _get_project_for_user(project_id, db, user_id)

    initial_title: str | None = None
    if body.title is not None:
        stripped = body.title.strip()
        initial_title = stripped if stripped else None

    conversation = Conversation(project_id=project.id, title=initial_title)
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.get(
    "/projects/{project_id}/conversations",
    response_model=list[ConversationResponse],
    status_code=status.HTTP_200_OK,
    summary="List conversations for a project",
)
async def list_conversations(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> list[Conversation]:
    """Return all conversations for a project, newest first."""
    await _get_project_for_user(project_id, db, user_id)

    result = await db.execute(
        select(Conversation)
        .where(Conversation.project_id == project_id)
        .order_by(Conversation.created_at.desc())
    )
    return list(result.scalars().all())


@router.get(
    "/projects/{project_id}/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a conversation with its full message history",
)
async def get_conversation(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> Conversation:
    """Return a conversation with nested messages in chronological order."""
    await _get_project_for_user(project_id, db, user_id)

    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
        )
        .options(selectinload(Conversation.messages))
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    # Sort messages chronologically ascending (oldest first)
    conversation.messages.sort(key=lambda m: m.created_at)
    return conversation


@router.patch(
    "/projects/{project_id}/conversations/{conversation_id}",
    response_model=ConversationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a conversation's title",
)
async def update_conversation(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID,
    body: ConversationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> Conversation:
    """Rename a conversation. Empty or whitespace-only titles are
    normalized to NULL so the next user message can re-auto-populate."""
    await _get_project_for_user(project_id, db, user_id)
    conversation = await _get_conversation_for_project(
        conversation_id, project_id, db
    )

    if body.title is None:
        conversation.title = None
    else:
        stripped = body.title.strip()
        conversation.title = stripped if stripped else None

    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.post(
    "/projects/{project_id}/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a message and get a RAG-generated answer",
)
async def send_message(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID,
    body: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> Message:
    """Synchronous RAG message endpoint.

    Flow: validate ownership → check project has ready sources → load history
    → embed query → retrieve chunks → generate answer (if any) → store both
    user and assistant messages with transparency metadata → return assistant.
    """
    await _get_project_for_user(project_id, db, user_id)
    conversation = await _get_conversation_for_project(
        conversation_id, project_id, db
    )

    if not await _project_has_ready_source(db, project_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No feedback sources ready yet. Connect an App Store app or "
                "upload a CSV on the Sources tab, then try again."
            ),
        )

    # Load last N messages for conversation context
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(HISTORY_LIMIT)
    )
    history = list(reversed(history_result.scalars().all()))

    # --- Retrieval -----------------------------------------------------------
    # User-tunable retrieval params from the RAG X-Ray sliders, falling back to
    # the server defaults when the client didn't send overrides.
    effective_top_k = body.top_k if body.top_k is not None else TOP_K
    effective_threshold = (
        body.threshold if body.threshold is not None else SIMILARITY_THRESHOLD
    )
    retrieval_start = time.perf_counter()
    query_embedding = await embed_query(body.content)
    chunks, total_candidates = await retrieve_chunks(
        db,
        project_id,
        query_embedding,
        top_k=effective_top_k,
        threshold=effective_threshold,
        source_ids=body.source_ids,
    )
    retrieval_latency_ms = int((time.perf_counter() - retrieval_start) * 1000)

    # --- Generation (skipped if no chunks) -----------------------------------
    transparency_chunks = [_chunk_to_transparency_dict(c) for c in chunks]

    if not chunks:
        answer_text = (
            "I couldn't find any feedback relevant to that question. "
            "Try rephrasing, or check the Sources tab to make sure your "
            "feedback data is ingested."
        )
        supporting_chunk_ids: list[uuid.UUID] = []
        generation_latency_ms = 0
        model_used: str | None = None
        input_tokens = 0
        output_tokens = 0
    else:
        generation_start = time.perf_counter()
        result = await generate_answer(body.content, chunks, history=history)
        generation_latency_ms = int((time.perf_counter() - generation_start) * 1000)
        answer_text = result.answer
        # Map 1-indexed chunk positions back to their chunk UUIDs
        supporting_chunk_ids = [
            chunks[i - 1].chunk_id
            for i in result.supporting_indices
            if 1 <= i <= len(chunks)
        ]
        model_used = result.model
        input_tokens = result.input_tokens
        output_tokens = result.output_tokens

    transparency_payload = {
        "query": body.content,
        "retrievedChunks": transparency_chunks,
        "modelUsed": model_used,
        "topK": effective_top_k,
        "threshold": effective_threshold,
        "totalChunksSearched": total_candidates,
        "retrievalLatencyMs": retrieval_latency_ms,
        "generationLatencyMs": generation_latency_ms,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
    }

    # --- Auto-populate conversation title from first user message -----------
    if conversation.title is None:
        trimmed = body.content.strip()
        if len(trimmed) > TITLE_MAX_CHARS:
            conversation.title = trimmed[: TITLE_MAX_CHARS - 1].rstrip() + "…"
        else:
            conversation.title = trimmed

    # --- Persist both messages in one transaction ----------------------------
    # Explicit timestamps so user_message strictly precedes assistant_message.
    now = datetime.utcnow()
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=body.content,
        source_chunk_ids=[],
        transparency=None,
        created_at=now,
    )
    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=answer_text,
        source_chunk_ids=supporting_chunk_ids,
        transparency=transparency_payload,
        created_at=datetime.utcnow(),
    )
    db.add(user_message)
    db.add(assistant_message)
    await db.commit()
    await db.refresh(assistant_message)

    logger.info(
        "Conversation %s: answered query (retrieval=%dms gen=%dms chunks=%d/%d)",
        conversation.id,
        retrieval_latency_ms,
        generation_latency_ms,
        len(chunks),
        total_candidates,
    )

    return assistant_message


@router.delete(
    "/projects/{project_id}/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Delete a conversation and all its messages",
)
async def delete_conversation(
    project_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> None:
    """Delete a conversation. Cascades to all its messages."""
    await _get_project_for_user(project_id, db, user_id)
    conversation = await _get_conversation_for_project(
        conversation_id, project_id, db
    )
    await db.delete(conversation)
    await db.commit()
