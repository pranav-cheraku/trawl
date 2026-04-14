from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    """A single chunk returned by a similarity search, with display metadata."""

    chunk_id: uuid.UUID
    feedback_item_id: uuid.UUID
    chunk_text: str
    similarity_score: float
    retrieval_rank: int
    source_type: str
    source_name: str
    feedback_item_content: str


def _format_vector_literal(vector: list[float]) -> str:
    """Format a Python float list as a pgvector literal string.

    pgvector expects the form '[0.1,0.2,...]'. We bind it as a string and
    cast to ::vector in the query so the driver doesn't try to interpret it.
    """
    return "[" + ",".join(f"{v:.8f}" for v in vector) + "]"


def _derive_source_name(
    source_type: str,
    app_store_name: str | None,
    filename: str | None,
) -> str:
    """Pick a human-readable display name for a source, with sensible fallbacks."""
    if app_store_name:
        return app_store_name
    if filename:
        return filename
    if source_type == "app_store":
        return "App Store"
    if source_type == "csv":
        return "CSV Upload"
    return "Unknown source"


async def retrieve_chunks(
    db: AsyncSession,
    project_id: uuid.UUID,
    query_embedding: list[float],
    top_k: int = 8,
    threshold: float = 0.3,
) -> tuple[list[RetrievedChunk], int]:
    """Retrieve the top_k most similar chunks for a query in a project.

    Uses pgvector cosine distance (`<=>`) with an IVFFlat index. Chunks below
    the similarity threshold are excluded in SQL so `total_candidates` reflects
    the real above-threshold pool, not the raw table size.

    Returns a tuple of (chunks ordered by rank ascending, total_candidates).
    """
    if not query_embedding:
        raise ValueError("query_embedding must be non-empty")

    vector_literal = _format_vector_literal(query_embedding)

    # Count candidates above threshold. Same WHERE clause as the main query so
    # the number users see in the X-Ray panel reflects the true retrieval pool.
    count_sql = text(
        """
        SELECT COUNT(*)
        FROM feedback_chunks
        WHERE project_id = :project_id
          AND embedding IS NOT NULL
          AND (1 - (embedding <=> (:qvec)::vector)) >= :threshold
        """
    )
    count_result = await db.execute(
        count_sql,
        {
            "project_id": project_id,
            "qvec": vector_literal,
            "threshold": threshold,
        },
    )
    total_candidates = int(count_result.scalar() or 0)

    # Top-k fetch with joins to source + feedback item for display metadata.
    # Ordering uses raw distance (asc) so pgvector's IVFFlat index is used.
    select_sql = text(
        """
        SELECT
            fc.id              AS chunk_id,
            fc.feedback_item_id AS feedback_item_id,
            fc.chunk_text      AS chunk_text,
            (1 - (fc.embedding <=> (:qvec)::vector)) AS similarity,
            fs.source_type     AS source_type,
            fs.app_store_name  AS app_store_name,
            fs.filename        AS filename,
            fi.content         AS item_content
        FROM feedback_chunks fc
        JOIN feedback_items   fi ON fi.id = fc.feedback_item_id
        JOIN feedback_sources fs ON fs.id = fi.source_id
        WHERE fc.project_id = :project_id
          AND fc.embedding IS NOT NULL
          AND (1 - (fc.embedding <=> (:qvec)::vector)) >= :threshold
        ORDER BY fc.embedding <=> (:qvec)::vector
        LIMIT :top_k
        """
    )
    result = await db.execute(
        select_sql,
        {
            "project_id": project_id,
            "qvec": vector_literal,
            "threshold": threshold,
            "top_k": top_k,
        },
    )
    rows = result.mappings().all()

    chunks: list[RetrievedChunk] = []
    for rank, row in enumerate(rows, start=1):
        chunks.append(
            RetrievedChunk(
                chunk_id=row["chunk_id"],
                feedback_item_id=row["feedback_item_id"],
                chunk_text=row["chunk_text"],
                similarity_score=float(row["similarity"]),
                retrieval_rank=rank,
                source_type=row["source_type"],
                source_name=_derive_source_name(
                    row["source_type"],
                    row["app_store_name"],
                    row["filename"],
                ),
                feedback_item_content=row["item_content"] or "",
            )
        )

    logger.info(
        "Retrieved %d/%d chunks for project %s (top_k=%d, threshold=%.2f)",
        len(chunks),
        total_candidates,
        project_id,
        top_k,
        threshold,
    )
    return chunks, total_candidates
