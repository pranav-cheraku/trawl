from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import update

from app.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.build_next import (
    BuildReport,
    BuildReportChunk,
    BuildReportSpec,
    BuildTheme,
)
from app.services.build_next import run_build_next

logger = logging.getLogger(__name__)

TASK_TIME_LIMIT = 600  # hard timeout (10 min)
TASK_SOFT_TIME_LIMIT = 540  # soft timeout (9 min) for graceful logging


async def _mark_failure(report_id: uuid.UUID, reason: str) -> None:
    """Open a fresh session and mark the report as failed.

    Used from both the RuntimeError (user-facing) and Exception (internal)
    branches so the persistence shape is identical.
    """
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(BuildReport)
            .where(BuildReport.id == report_id)
            .values(
                status="failure",
                failure_reason=reason,
                updated_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
            )
        )
        await db.commit()


async def _async_run_and_persist(
    report_id: uuid.UUID,
    project_id: uuid.UUID,
    source_ids: list[uuid.UUID] | None,
    celery_task_id: str,
) -> dict[str, Any]:
    """Run the pipeline and persist all result rows in a single async session.

    Mirrors the pattern in tasks/spec_generation.py: ONE asyncio.run() at
    the Celery boundary, all DB I/O happens here.
    """
    # Three separate sessions to keep transactions tight:
    #
    #   1. Mark running — must commit before the pipeline runs so the polling
    #      endpoint sees status="running" immediately.
    #   2. Run pipeline — wraps the long-running Claude calls; if anything
    #      raises, this session is rolled back and a fresh one (via
    #      _mark_failure) writes the failure marker.
    #   3. Persist success — fresh session so we don't carry any state from
    #      the pipeline session.
    #
    # If the worker is SIGKILLed mid-pipeline (OOM, container restart), the
    # row stays as `running` indefinitely. The frontend's 10-minute stale
    # heuristic in build/page.tsx covers that zombie case.
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(BuildReport)
            .where(BuildReport.id == report_id)
            .values(
                status="running",
                task_id=celery_task_id,
                updated_at=datetime.utcnow(),
            )
        )
        await db.commit()

    try:
        async with AsyncSessionLocal() as db:
            result = await run_build_next(db, project_id, source_ids)
    except RuntimeError as e:
        # User-facing failure — message is already actionable.
        logger.info("Build pipeline failed for report %s: %s", report_id, e)
        await _mark_failure(report_id, str(e))
        return {"reportId": str(report_id), "status": "failure", "reason": str(e)}
    except Exception as e:
        # Unexpected internal failure. Surface a PM-friendly message — the
        # exception's own .message often carries the actionable detail (e.g.
        # Anthropic's "API usage limit reached" text); prefer it over the
        # bare class name.
        logger.exception("Unexpected build_next failure for report %s", report_id)
        detail = (
            getattr(e, "message", None)
            or (str(e) if str(e) else None)
            or type(e).__name__
        )
        reason = f"Generation service error — {detail}"
        await _mark_failure(report_id, reason)
        return {"reportId": str(report_id), "status": "failure", "reason": reason}

    # Persist the success path. Single transaction.
    async with AsyncSessionLocal() as db:
        # Persist themes — get back ids by ordering.
        theme_models: list[BuildTheme] = []
        for theme_rank, pair in enumerate(result.themes, start=1):
            t = BuildTheme(
                report_id=report_id,
                rank=theme_rank,
                name=pair.theme.name,
                description=pair.theme.description,
                frequency_pct=pair.theme.frequency_pct,
                chunk_count=pair.theme.chunk_count,
                severity_score=pair.theme.severity_score,
                spec_generation_failed=pair.generation_failed,
            )
            db.add(t)
            theme_models.append(t)
        await db.flush()  # populate theme ids

        # Persist specs across all themes, ordered by build_rank.
        spec_models_by_rank: dict[int, BuildReportSpec] = {}
        for theme_model, pair in zip(theme_models, result.themes, strict=True):
            for spec in pair.specs:
                m = BuildReportSpec(
                    report_id=report_id,
                    theme_id=theme_model.id,
                    build_rank=spec.build_rank,
                    title=spec.title,
                    content=spec.content,
                )
                db.add(m)
                spec_models_by_rank[spec.build_rank] = m
        await db.flush()  # populate spec ids

        # Inject the spec_id into each build_order entry now that ids exist.
        enriched_build_order: list[dict[str, Any]] = []
        for entry in result.build_order:
            raw_rank = entry.get("rank")
            rank: int | None = raw_rank if isinstance(raw_rank, int) else None
            spec_model = spec_models_by_rank.get(rank) if rank is not None else None
            enriched_build_order.append(
                {
                    "rank": rank,
                    "specId": str(spec_model.id) if spec_model else None,
                    "rationale": entry.get("rationale", ""),
                }
            )

        # Persist chunks (RAG X-Ray).
        for chunk in result.chunks:
            source_query = result.chunk_source_queries.get(chunk.chunk_id)
            if source_query is None:
                logger.warning(
                    "Build Next: chunk %s missing from source_query attribution",
                    chunk.chunk_id,
                )
                source_query = ""
            db.add(
                BuildReportChunk(
                    report_id=report_id,
                    chunk_id=chunk.chunk_id,
                    retrieval_rank=chunk.retrieval_rank,
                    similarity=chunk.similarity_score,
                    source_query=source_query,
                )
            )

        # Update the report row with summary, build_order, metadata, status.
        partial_failure = any(p.generation_failed for p in result.themes)
        await db.execute(
            update(BuildReport)
            .where(BuildReport.id == report_id)
            .values(
                status="success",
                executive_summary=result.executive_summary,
                build_order=enriched_build_order,
                retrieval_metadata=result.retrieval_metadata,
                partial_failure=partial_failure,
                updated_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
            )
        )
        await db.commit()

    return {
        "reportId": str(report_id),
        "status": "success",
        "themeCount": len(result.themes),
        "specCount": sum(len(p.specs) for p in result.themes),
        "partialFailure": any(p.generation_failed for p in result.themes),
    }


@celery_app.task(  # type: ignore[misc]
    bind=True,
    max_retries=0,
    time_limit=TASK_TIME_LIMIT,
    soft_time_limit=TASK_SOFT_TIME_LIMIT,
)
def run_build_next_task(
    self: Any,
    report_id: str,
    project_id: str,
    source_ids: list[str] | None,
) -> dict[str, Any]:
    """Celery entrypoint. JSON-serializable args only — UUIDs are strings."""
    try:
        report_uuid = uuid.UUID(report_id)
        project_uuid = uuid.UUID(project_id)
        source_uuids: list[uuid.UUID] | None = (
            [uuid.UUID(s) for s in source_ids] if source_ids is not None else None
        )
    except (ValueError, TypeError):
        logger.exception(
            "Invalid UUID args to run_build_next_task: report_id=%s project_id=%s",
            report_id,
            project_id,
        )
        return {"status": "failure", "reason": "invalid arguments"}

    return asyncio.run(
        _async_run_and_persist(
            report_uuid,
            project_uuid,
            source_uuids,
            self.request.id,
        )
    )
