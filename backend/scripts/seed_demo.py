"""Idempotently seed the demo user + demo project + populated data.

Mirrors the existing Celery task chain inline so it runs in one shot:
  appstore.fetch_reviews_multi_country -> FeedbackItem rows ->
  chunking.chunk_feedback_items -> FeedbackChunk rows ->
  embedding.embed_texts -> chunk.embedding vectors ->
  retrieval.retrieve_chunks + generation.generate_feature_specs -> Spec rows ->
  services.build_next.run_build_next -> BuildReport + BuildTheme + BuildReportSpec
  + BuildReportChunk rows.

Usage:
    cd backend && source venv/bin/activate
    python scripts/seed_demo.py

Costs one-time:
- ~$0.02 Voyage embeddings for ~500 reviews
- ~$0.50-1.50 Anthropic for spec generation + Build Next
- Total < $2 per run

Destructive: deletes any existing demo project before re-seeding.
The demo user is upserted (kept across runs) with credits_balance=0 always.
"""

from __future__ import annotations

import asyncio
import logging
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select, update  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import AsyncSessionLocal, engine  # noqa: E402
from app.models.build_next import (  # noqa: E402
    BuildReport,
    BuildReportChunk,
    BuildReportSpec,
    BuildTheme,
)
from app.models.chunk import FeedbackChunk  # noqa: E402
from app.models.feedback import FeedbackItem, FeedbackSource  # noqa: E402
from app.models.project import Project  # noqa: E402
from app.models.spec import Spec, SpecTransparency  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.appstore import fetch_reviews_multi_country  # noqa: E402
from app.services.build_next import run_build_next  # noqa: E402
from app.services.chunking import chunk_feedback_items  # noqa: E402
from app.services.embedding import close_redis, embed_query, embed_texts  # noqa: E402
from app.services.generation import generate_feature_specs  # noqa: E402
from app.services.retrieval import retrieve_chunks  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("seed_demo")

DEMO_USER_ID = uuid.UUID(settings.DEMO_USER_ID)
DEMO_PROJECT_ID = uuid.UUID(settings.DEMO_PROJECT_ID)

# Notion as the demo target — long history of detailed App Store reviews.
DEMO_APP_NAME = "Notion"
DEMO_APP_STORE_ID = "1232780281"  # Notion's iTunes track_id
DEMO_COUNTRIES = ["us", "gb", "ca", "au", "ie"]

SPEC_TOP_K = 20
SPEC_THRESHOLD = 0.25

# Spread generated specs across 4 Kanban columns so the demo board looks lived-in.
KANBAN_STATUSES = ["backlog", "planned", "in_progress", "done"]


async def _upsert_demo_user_and_reset_project() -> tuple[User, Project, FeedbackSource]:
    """Phase 0: upsert demo user, wipe old project, create fresh Project + FeedbackSource."""
    async with AsyncSessionLocal() as db:
        # Demo user — upsert (kept across runs, credits_balance always reset to 0).
        result = await db.execute(select(User).where(User.id == DEMO_USER_ID))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                id=DEMO_USER_ID,
                email="demo@trawl.app",
                name="Demo",
                credits_balance=0,
            )
            db.add(user)
        else:
            # Enforce invariant: demo user never has spendable credits.
            user.credits_balance = 0

        # Wipe existing demo project so the seed is idempotent.
        # ON DELETE CASCADE handles all child rows.
        await db.execute(delete(Project).where(Project.id == DEMO_PROJECT_ID))
        project = Project(
            id=DEMO_PROJECT_ID,
            user_id=user.id,
            name="Demo: Notion reviews",
            description="Read-only demo seeded with real App Store reviews.",
        )
        db.add(project)
        await db.flush()

        source = FeedbackSource(
            project_id=project.id,
            source_type="app_store",
            app_store_id=DEMO_APP_STORE_ID,
            app_store_name=DEMO_APP_NAME,
            status="scraping",
        )
        db.add(source)
        await db.commit()
        await db.refresh(source)

    logger.info(
        "Phase 0 OK: user=%s project=%s source=%s",
        user.id,
        project.id,
        source.id,
    )
    return user, project, source


async def _ingest_reviews(source: FeedbackSource) -> int:
    """Phase 1: fetch App Store reviews and persist as FeedbackItem rows."""
    reviews, succeeded = await fetch_reviews_multi_country(
        DEMO_APP_STORE_ID, countries=DEMO_COUNTRIES
    )
    async with AsyncSessionLocal() as db:
        items = [
            FeedbackItem(
                source_id=source.id,
                project_id=source.project_id,
                content=r["content"],
                item_metadata={
                    "title": r.get("title", ""),
                    "rating": r.get("rating", 0),
                    "author": r.get("author", ""),
                },
                external_id=r.get("external_id"),
            )
            for r in reviews
        ]
        db.add_all(items)
        await db.execute(
            update(FeedbackSource)
            .where(FeedbackSource.id == source.id)
            .values(
                record_count=len(items),
                last_scraped_at=datetime.utcnow(),
                connector_config={"countries": succeeded},
                status="chunking",
            )
        )
        await db.commit()
    logger.info("Phase 1 OK: ingested %d reviews", len(reviews))
    return len(reviews)


async def _chunk_items(source: FeedbackSource) -> int:
    """Phase 2: chunk FeedbackItems (chunking service is sync; call directly)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FeedbackItem).where(FeedbackItem.source_id == source.id)
        )
        items = result.scalars().all()
        item_dicts = [{"id": i.id, "content": i.content} for i in items]
        chunk_dicts = chunk_feedback_items(item_dicts)

        chunk_models = [
            FeedbackChunk(
                feedback_item_id=c["feedback_item_id"],
                project_id=source.project_id,
                chunk_text=c["chunk_text"],
                chunk_index=c["chunk_index"],
                token_count=c["token_count"],
            )
            for c in chunk_dicts
        ]
        db.add_all(chunk_models)
        await db.execute(
            update(FeedbackSource)
            .where(FeedbackSource.id == source.id)
            .values(status="embedding")
        )
        await db.commit()
    logger.info("Phase 2 OK: %d chunks created", len(chunk_dicts))
    return len(chunk_dicts)


async def _embed_chunks(source: FeedbackSource) -> int:
    """Phase 3: embed all chunks for this source via Voyage (batched, with retries)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FeedbackChunk)
            .join(FeedbackItem, FeedbackItem.id == FeedbackChunk.feedback_item_id)
            .where(FeedbackItem.source_id == source.id)
            .where(FeedbackChunk.embedding.is_(None))
        )
        chunks = result.scalars().all()

    if not chunks:
        logger.info("Phase 3 SKIP: no unembedded chunks found")
        return 0

    texts = [c.chunk_text for c in chunks]
    vectors = await embed_texts(texts)

    async with AsyncSessionLocal() as db:
        for chunk, vector in zip(chunks, vectors):
            await db.execute(
                update(FeedbackChunk)
                .where(FeedbackChunk.id == chunk.id)
                .values(embedding=vector)
            )
        await db.execute(
            update(FeedbackSource)
            .where(FeedbackSource.id == source.id)
            .values(status="ready")
        )
        await db.commit()

    logger.info("Phase 3 OK: embedded %d chunks", len(chunks))
    return len(chunks)


async def _generate_specs(project: Project) -> int:
    """Phase 4: retrieve + generate, persist Spec + SpecTransparency rows."""
    default_query = (
        "key user problems, feature requests, complaints, and improvement suggestions"
    )

    query_embedding = await embed_query(default_query)

    async with AsyncSessionLocal() as db:
        chunks, total_candidates = await retrieve_chunks(
            db,
            project.id,
            query_embedding,
            SPEC_TOP_K,
            SPEC_THRESHOLD,
            source_ids=None,
        )

    if not chunks:
        logger.warning("Phase 4 SKIP: no chunks retrieved above threshold")
        return 0

    result = await generate_feature_specs(chunks, project_context=None)

    if not result.specs:
        logger.warning("Phase 4 SKIP: Claude returned 0 specs")
        return 0

    # Build camelCase transparency dicts (matches tasks/spec_generation.py pattern).
    transparency_dicts: list[dict[str, Any]] = []
    for c in chunks:
        text = c.chunk_text or ""
        preview = text[:280] + ("…" if len(text) > 280 else "")
        transparency_dicts.append({
            "chunkId": str(c.chunk_id),
            "feedbackItemId": str(c.feedback_item_id),
            "chunkTextPreview": preview,
            "chunkText": text,
            "feedbackItemContent": c.feedback_item_content,
            "similarityScore": c.similarity_score,
            "retrievalRank": c.retrieval_rank,
            "sourceType": c.source_type,
            "sourceName": c.source_name,
        })

    async with AsyncSessionLocal() as db:
        for idx, spec_dict in enumerate(result.specs):
            # supporting_feedback_indices are 1-based; map to chunk UUIDs.
            source_chunk_ids = [
                chunks[i - 1].chunk_id
                for i in spec_dict.get("supporting_feedback_indices", [])
                if 1 <= i <= len(chunks)
            ]
            spec = Spec(
                project_id=project.id,
                type="feature_spec",
                title=spec_dict.get("title", "Untitled Spec"),
                content=spec_dict,
                priority=spec_dict.get("priority", "medium"),
                # Spread across Kanban columns so the demo board looks lived-in.
                status=KANBAN_STATUSES[idx % len(KANBAN_STATUSES)],
                kanban_order=idx,
                source_chunk_ids=source_chunk_ids,
            )
            db.add(spec)
            await db.flush()  # populate spec.id for the FK below

            db.add(SpecTransparency(
                spec_id=spec.id,
                retrieved_chunks=transparency_dicts,
                generation_prompt=None,
                model_used=result.model,
                total_chunks_searched=total_candidates,
                retrieval_top_k=SPEC_TOP_K,
            ))
        await db.commit()

    logger.info(
        "Phase 4 OK: %d specs across %d Kanban columns",
        len(result.specs),
        len(KANBAN_STATUSES),
    )
    return len(result.specs)


async def _run_build_next(project: Project) -> uuid.UUID:
    """Phase 5: run Build Next pipeline and persist BuildReport + children.

    Mirrors tasks/build_next.py:_async_run_and_persist but without the
    Celery-specific task_id handling or the mark-running phase (the row starts
    as 'running' and transitions to 'success' or 'failure' within this call).
    """
    # Create the report row first so children can reference its id.
    async with AsyncSessionLocal() as db:
        report = BuildReport(
            project_id=project.id,
            user_id=project.user_id,
            status="running",
            source_ids=[],
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        report_id = report.id

    # Run the pipeline in a fresh session (matches the three-session pattern).
    async with AsyncSessionLocal() as db:
        result = await run_build_next(db, project.id, source_ids=None)

    # Persist results in a third fresh session.
    async with AsyncSessionLocal() as db:
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
        await db.flush()  # populate theme ids before inserting specs

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
        await db.flush()  # populate spec ids before building enriched build_order

        enriched_build_order: list[dict[str, Any]] = []
        for entry in result.build_order:
            raw_rank = entry.get("rank")
            rank: int | None = raw_rank if isinstance(raw_rank, int) else None
            spec_model = spec_models_by_rank.get(rank) if rank is not None else None
            enriched_build_order.append({
                "rank": rank,
                "specId": str(spec_model.id) if spec_model else None,
                "rationale": entry.get("rationale", ""),
            })

        for chunk in result.chunks:
            source_query = result.chunk_source_queries.get(chunk.chunk_id, "")
            db.add(BuildReportChunk(
                report_id=report_id,
                chunk_id=chunk.chunk_id,
                retrieval_rank=chunk.retrieval_rank,
                similarity=chunk.similarity_score,
                source_query=source_query,
            ))

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

    logger.info(
        "Phase 5 OK: report=%s themes=%d specs=%d partial_failure=%s",
        report_id,
        len(result.themes),
        sum(len(p.specs) for p in result.themes),
        partial_failure,
    )
    return report_id


async def main() -> None:
    """Run all seed phases in order, dispose singletons in finally."""
    try:
        user, project, source = await _upsert_demo_user_and_reset_project()
        await _ingest_reviews(source)
        await _chunk_items(source)
        await _embed_chunks(source)
        await _generate_specs(project)
        await _run_build_next(project)
        print()
        print(f"Demo project seeded: {project.id}")
        print(f"  Demo user:          {user.id}")
        print("  Visit http://localhost:3000/demo to verify.")
    finally:
        # Mirror the Celery task pattern: dispose module-level async singletons
        # inside the same loop so asyncio.run() exits cleanly.
        await close_redis()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
