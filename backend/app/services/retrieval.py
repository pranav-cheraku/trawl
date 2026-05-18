"""retrieval.py: pgvector cosine similarity search for the RAG pipeline.

Executes a COUNT + SELECT pair against feedback_chunks using the <=> operator.
Supports a three-state source_ids filter (None / [] / [ids]) and returns ranked
RetrievedChunk objects alongside a total-candidates count for the RAG X-Ray panel.
"""
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

    pgvector expects '[0.1,0.2,...]'. We bind it as a string and cast to
    ::vector in the query so the driver does not try to interpret it.
    """
    return "[" + ",".join(f"{v:.8f}" for v in vector) + "]"


def _derive_source_name(
    source_type: str,
    app_store_name: str | None,
    filename: str | None,
) -> str:
    """Return a human-readable display name for a source, with sensible fallbacks."""
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
    source_ids: list[uuid.UUID] | None = None,
) -> tuple[list[RetrievedChunk], int]:
    """Retrieve the top_k most similar chunks for a query in a project.

    Uses pgvector cosine distance (<=> operator) with an IVFFlat index.
    Similarity is computed as 1 - distance so higher values mean closer matches.

    source_ids has three states: None = no filter, [] = short-circuit to ([], 0)
    without any DB call (user muted every source), non-empty = AND fi.source_id IN (...).

    Returns (chunks ordered by rank ascending, total_candidates above threshold).
    """
    if not query_embedding:
        raise ValueError("query_embedding must be non-empty")

    # Empty list means the user has muted every source; skip the DB entirely.
    if source_ids is not None and len(source_ids) == 0:
        return [], 0

    vector_literal = _format_vector_literal(query_embedding)

    # Build the optional source filter once and splice it into both queries
    # so COUNT and SELECT always share identical WHERE conditions.
    source_filter_sql = ""
    source_filter_params: dict[str, uuid.UUID] = {}
    if source_ids:
        # Bind each id individually rather than interpolating to keep the query safe.
        placeholders = ", ".join(
            f":source_id_{i}" for i in range(len(source_ids))
        )
        source_filter_sql = f" AND fi.source_id IN ({placeholders})"
        source_filter_params = {
            f"source_id_{i}": sid for i, sid in enumerate(source_ids)
        }

    # COUNT uses the same WHERE clause as the SELECT so the "N candidates" number
    # in the X-Ray panel reflects the true retrieval pool, not the raw table size.
    count_sql = text(
        f"""
        SELECT COUNT(*)
        FROM feedback_chunks fc
        JOIN feedback_items   fi ON fi.id = fc.feedback_item_id
        WHERE fc.project_id = :project_id
          AND fc.embedding IS NOT NULL
          AND (1 - (fc.embedding <=> (:qvec)::vector)) >= :threshold
          {source_filter_sql}
        """
    )
    count_result = await db.execute(
        count_sql,
        {
            "project_id": project_id,
            "qvec": vector_literal,
            "threshold": threshold,
            **source_filter_params,
        },
    )
    total_candidates = int(count_result.scalar() or 0)

    # ORDER BY raw distance ascending so pgvector's IVFFlat index is used;
    # the similarity column is computed separately for display.
    select_sql = text(
        f"""
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
          {source_filter_sql}
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
            **source_filter_params,
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
        "Retrieved %d/%d chunks for project %s (top_k=%d, threshold=%.2f, source_ids=%s)",
        len(chunks),
        total_candidates,
        project_id,
        top_k,
        threshold,
        "all" if source_ids is None else f"{len(source_ids)} sources",
    )
    return chunks, total_candidates
