from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding import embed_query
from app.services.retrieval import RetrievedChunk, retrieve_chunks

logger = logging.getLogger(__name__)

# Five hardcoded exploratory queries. Cached after first run via embed_query
# (Redis SHA-256 key, 1-hour TTL) so repeated runs pay only the cache lookup.
BUILD_NEXT_QUERIES: list[str] = [
    "What are users complaining about?",
    "What features are users requesting?",
    "What experiences received low ratings?",
    "What do users praise about the product?",
    "Where do users encounter friction or confusion?",
]

TOP_K_PER_QUERY = 10
RETRIEVAL_THRESHOLD = 0.25


@dataclass
class ClusteredTheme:
    """Output of the Claude clustering call, before persistence.

    ``chunk_indices`` are 0-indexed into the deduped chunk list returned by
    ``_embed_and_retrieve``. ``severity_hint`` is Claude's qualitative
    severity estimate in the range 0..1.
    """

    name: str
    description: str
    chunk_indices: list[int]  # 0-indexed into the deduped chunk list
    severity_hint: float  # 0..1, Claude's qualitative severity estimate

    # Computed at task time after clustering:
    frequency_pct: float = 0.0
    severity_score: float = 0.0
    chunk_count: int = 0


@dataclass
class GeneratedSpec:
    """One spec generated for a theme.

    ``content`` mirrors the same shape as the existing spec generation output
    (``problem``, ``proposed_solution``, ``user_stories``, etc.) so the Celery
    task can persist it via the same ORM path.
    """

    title: str
    content: dict
    build_rank: int = 0  # filled in during global ranking phase


@dataclass
class ThemeWithSpecs:
    """A theme paired with its generated specs (or empty if generation failed)."""

    theme: ClusteredTheme
    specs: list[GeneratedSpec]
    generation_failed: bool


@dataclass
class BuildNextResult:
    """Final output of run_build_next, returned to the Celery task for persistence.

    ``chunk_source_queries`` maps each retained chunk_id to the query string
    that surfaced it with the highest similarity score, for RAG X-Ray attribution.
    ``retrieval_metadata`` is the dict from ``_embed_and_retrieve`` and populates
    the ``build_reports.retrieval_metadata`` JSONB column.
    """

    themes: list[ThemeWithSpecs]
    chunks: list[RetrievedChunk]
    chunk_source_queries: dict[uuid.UUID, str]  # chunk_id → which query surfaced it
    executive_summary: str
    build_order: list[dict] = field(default_factory=list)
    retrieval_metadata: dict = field(default_factory=dict)


async def _embed_and_retrieve(
    db: AsyncSession,
    project_id: uuid.UUID,
    source_ids: list[uuid.UUID] | None,
) -> tuple[list[RetrievedChunk], dict[uuid.UUID, str], dict]:
    """Embed all 5 queries, retrieve per query, dedupe, and return.

    Runs all 5 ``embed_query`` calls concurrently via ``asyncio.gather``; each
    result is already Redis-cached after the first hit so subsequent runs are
    sub-millisecond. The 5 ``retrieve_chunks`` calls are executed sequentially
    because ``AsyncSession`` / asyncpg is single-flight and cannot safely run
    concurrent statements on the same connection.

    Deduplication keeps the highest-similarity occurrence of each chunk_id across
    queries. The final list is sorted by similarity descending and ``retrieval_rank``
    is reassigned from 1 sequentially.

    Returns:
        A 3-tuple of:
        - ``deduped_chunks`` — deduplicated, sorted list of ``RetrievedChunk``.
        - ``source_query_attribution`` — maps each retained chunk_id to the query
          that surfaced it with the highest similarity (ties broken by query order).
        - ``metadata`` — timing + count dict for the ``retrieval_metadata`` JSONB column.
    """
    start_time = time.monotonic()

    # Embed all 5 queries concurrently. embed_query is Redis-cached so repeated
    # runs against unchanged queries pay only the cache lookup cost.
    query_embeddings: list[list[float]] = await asyncio.gather(
        *(embed_query(q) for q in BUILD_NEXT_QUERIES)
    )

    embed_elapsed_ms = int((time.monotonic() - start_time) * 1000)
    retrieve_start = time.monotonic()

    # Retrieve per query. We serialize because SQLAlchemy AsyncSession is
    # not safe for concurrent statement execution — asyncpg's underlying
    # connection is single-flight. Wall-clock cost is negligible vs. the
    # Claude calls downstream.
    per_query_results: list[tuple[list[RetrievedChunk], int]] = []
    for emb in query_embeddings:
        result = await retrieve_chunks(
            db,
            project_id,
            emb,
            top_k=TOP_K_PER_QUERY,
            threshold=RETRIEVAL_THRESHOLD,
            source_ids=source_ids,
        )
        per_query_results.append(result)

    retrieve_elapsed_ms = int((time.monotonic() - retrieve_start) * 1000)

    # Dedupe by chunk_id, keeping the highest-similarity occurrence.
    # Track which query surfaced each retained chunk for X-Ray attribution.
    deduped: dict[uuid.UUID, RetrievedChunk] = {}
    source_query: dict[uuid.UUID, str] = {}

    for query_text, (chunks, _total) in zip(
        BUILD_NEXT_QUERIES, per_query_results, strict=True
    ):
        for chunk in chunks:
            existing = deduped.get(chunk.chunk_id)
            # Strict `>` so the FIRST query that surfaces a chunk wins on exact ties —
            # gives priority to earlier queries in BUILD_NEXT_QUERIES.
            if existing is None or chunk.similarity_score > existing.similarity_score:
                deduped[chunk.chunk_id] = chunk
                source_query[chunk.chunk_id] = query_text

    # Final list ordered by similarity desc, with rank reassigned from 1.
    ordered = sorted(deduped.values(), key=lambda c: -c.similarity_score)
    # Overwrite per-query retrieval_rank with the global rank across all 5 queries.
    for new_rank, chunk in enumerate(ordered, start=1):
        chunk.retrieval_rank = new_rank

    metadata = {
        "queries": BUILD_NEXT_QUERIES,
        "top_k_per_query": TOP_K_PER_QUERY,
        "threshold": RETRIEVAL_THRESHOLD,
        "raw_total": sum(len(chunks) for chunks, _ in per_query_results),
        "deduped_total": len(ordered),
        "embed_ms": embed_elapsed_ms,
        "retrieve_ms": retrieve_elapsed_ms,
    }

    logger.info(
        "Build Next retrieval: %d raw, %d deduped (project %s, %s sources)",
        metadata["raw_total"],
        len(ordered),
        project_id,
        "all" if source_ids is None else len(source_ids),
    )

    return ordered, source_query, metadata
