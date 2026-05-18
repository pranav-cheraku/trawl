"""Celery task for spec generation: retrieve feedback chunks, call Claude, persist specs.

The async work (embed + retrieve + generate) runs inside a single asyncio.run()
call to avoid multiple event loops. The finally block in _async_generate_specs
disposes module-level async singletons (Redis client, asyncpg engine pool)
inside the same loop so the next Celery task starts fresh without loop-leaked
state. Without this, the second task in a worker process raises "Future attached
to a different loop".

supporting_feedback_indices from the LLM are 1-based (matching the numbered
context the model sees). They are mapped to chunk UUIDs with `chunks[i - 1]`
and validated against the actual chunk list length.
"""
from __future__ import annotations

import asyncio
import logging
import uuid

from sqlalchemy import func, select

from app.celery_app import celery_app
from app.database import AsyncSessionLocal, SyncSessionLocal, engine
from app.models.spec import Spec, SpecTransparency
from app.services.embedding import close_redis, embed_query
from app.services.generation import (
    SpecGenerationResult,
    generate_feature_specs,
    generate_user_stories,
)
from app.services.retrieval import RetrievedChunk, retrieve_chunks

logger = logging.getLogger(__name__)

SPEC_TOP_K = 20
SPEC_THRESHOLD = 0.25
DEFAULT_QUERY = (
    "key user problems, feature requests, complaints, and improvement suggestions"
)


async def _async_generate_specs(
    project_id: uuid.UUID,
    spec_type: str,
    focus: str | None,
    source_ids: list[uuid.UUID] | None,
) -> tuple[SpecGenerationResult | None, list[RetrievedChunk], int]:
    """Run embed + retrieve + generate in one event loop.

    The finally block disposes module-level singletons (Redis client, asyncpg
    engine pool) inside the same loop so the next Celery task starts fresh.
    Without this, singletons leak loop-bound state -> "Future attached to a
    different loop" on the second task.
    """
    try:
        query_text = focus if focus else DEFAULT_QUERY

        query_embedding = await embed_query(query_text)

        async with AsyncSessionLocal() as db:
            chunks, total_candidates = await retrieve_chunks(
                db,
                project_id,
                query_embedding,
                SPEC_TOP_K,
                SPEC_THRESHOLD,
                source_ids=source_ids,
            )

        if not chunks:
            return None, [], 0

        if spec_type == "user_stories":
            result = await generate_user_stories(chunks, focus)
        else:
            result = await generate_feature_specs(chunks, focus)

        return result, chunks, total_candidates
    finally:
        await close_redis()
        await engine.dispose()


def _chunk_to_transparency_dict(chunk: RetrievedChunk) -> dict:
    """Serialize a RetrievedChunk into the camelCase transparency JSONB shape."""
    text = chunk.chunk_text or ""
    preview = text[:280] + ("\u2026" if len(text) > 280 else "")
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


@celery_app.task(bind=True, max_retries=1)  # type: ignore[misc]
def generate_specs_task(
    self: object,
    project_id: str,
    spec_type: str,
    focus: str | None,
    source_ids: list[str] | None = None,
) -> dict:
    """Async Celery task: retrieve chunks, generate specs via Claude, persist.

    Returns a dict with the created spec IDs and count for the polling
    endpoint to relay to the frontend.
    """
    pid = uuid.UUID(project_id)

    with SyncSessionLocal() as session:
        try:
            # Parse inside try so malformed UUIDs surface via logger.exception.
            parsed_source_ids: list[uuid.UUID] | None = (
                [uuid.UUID(s) for s in source_ids]
                if source_ids is not None
                else None
            )

            result, chunks, total_candidates = asyncio.run(
                _async_generate_specs(pid, spec_type, focus, parsed_source_ids)
            )

            if result is None or not chunks:
                logger.warning(
                    "No chunks found for project %s — cannot generate specs", pid
                )
                return {"spec_ids": [], "count": 0}

            if not result.specs:
                logger.warning("Claude returned 0 specs for project %s", pid)
                return {"spec_ids": [], "count": 0}

            max_order = session.execute(
                select(func.coalesce(func.max(Spec.kanban_order), -1)).where(
                    Spec.project_id == pid
                )
            ).scalar()
            next_order = (max_order or -1) + 1

            created_specs: list[Spec] = []
            transparency_dicts = [_chunk_to_transparency_dict(c) for c in chunks]

            for idx, spec_dict in enumerate(result.specs):
                # supporting_feedback_indices are 1-based; map to chunk UUIDs.
                source_chunk_ids = [
                    chunks[i - 1].chunk_id
                    for i in spec_dict.get("supporting_feedback_indices", [])
                    if 1 <= i <= len(chunks)
                ]

                spec = Spec(
                    project_id=pid,
                    type=spec_type,
                    title=spec_dict.get("title", "Untitled Spec"),
                    content=spec_dict,
                    priority=spec_dict.get("priority", "medium"),
                    status="backlog",
                    kanban_order=next_order + idx,
                    source_chunk_ids=source_chunk_ids,
                )
                session.add(spec)
                session.flush()  # populate spec.id before inserting transparency FK

                transparency = SpecTransparency(
                    spec_id=spec.id,
                    retrieved_chunks=transparency_dicts,
                    generation_prompt=focus,
                    model_used=result.model,
                    total_chunks_searched=total_candidates,
                    retrieval_top_k=SPEC_TOP_K,
                )
                session.add(transparency)
                created_specs.append(spec)

            session.commit()

            spec_ids = [str(s.id) for s in created_specs]
            logger.info(
                "Generated %d specs for project %s (type=%s, focus=%r, source_ids=%s)",
                len(spec_ids),
                pid,
                spec_type,
                focus,
                "all" if source_ids is None else f"{len(source_ids)} sources",
            )
            return {"spec_ids": spec_ids, "count": len(spec_ids)}

        except Exception:
            logger.exception(
                "Failed to generate specs for project %s", project_id
            )
            session.rollback()
            raise
