"""Celery tasks for feedback ingestion: ingest -> chunk -> embed pipeline.

All tasks are synchronous (use SyncSessionLocal / psycopg2) because Celery
workers cannot run an async event loop by default. Async service calls
(embed_texts, fetch_reviews_multi_country) are wrapped in asyncio.run().

Pipeline for every connector type:
  ingest_*_task  -- fetch raw items, write FeedbackItem rows, set status=chunking
  chunk_source   -- split items into FeedbackChunk rows, set status=embedding
  embed_source   -- call Voyage AI, write vectors, set status=ready

Each stage chains to the next via .delay(), so they run in separate Celery
tasks (retryable independently).
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime

from app.celery_app import celery_app
from app.database import SyncSessionLocal
from app.models.chunk import FeedbackChunk
from app.models.feedback import FeedbackItem, FeedbackSource
from app.services import appstore, chunking, embedding
from app.services.csv_parser import parse_csv

logger = logging.getLogger(__name__)


COUNTRIES_BY_PRESET: dict[str, list[str]] = {
    "quick": ["us"],
    "standard": ["us", "gb", "ca", "au", "ie"],
}

COUNT_BY_PRESET: dict[str, int] = {
    "quick": 100,
    "standard": 500,
}

REDDIT_PARAMS: dict[str, dict[str, int]] = {
    "quick":    {"posts_limit":  25, "comments_per_post": 5},
    "standard": {"posts_limit": 100, "comments_per_post": 5},
    "deep":     {"posts_limit": 200, "comments_per_post": 5},
}


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def ingest_appstore_source(
    self: object,
    source_id: str,
    preset: str = "standard",
) -> None:
    """Fetch App Store reviews and insert as FeedbackItems."""
    with SyncSessionLocal() as session:
        try:
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is None:
                logger.error("Source %s not found", source_id)
                return

            source.status = "scraping"
            session.commit()

            app_id = source.app_store_id or ""
            countries = COUNTRIES_BY_PRESET.get(preset, COUNTRIES_BY_PRESET["standard"])
            reviews, succeeded_countries = asyncio.run(
                appstore.fetch_reviews_multi_country(app_id, countries=countries)
            )

            items = []
            for review in reviews:
                item = FeedbackItem(
                    source_id=source.id,
                    project_id=source.project_id,
                    content=review["content"],
                    item_metadata={
                        "title": review.get("title", ""),
                        "rating": review.get("rating", 0),
                        "author": review.get("author", ""),
                    },
                    external_id=review.get("external_id"),
                )
                items.append(item)

            session.add_all(items)
            source.record_count = len(items)
            source.last_scraped_at = datetime.utcnow()
            existing_config = source.connector_config or {}
            source.connector_config = {**existing_config, "countries": succeeded_countries}
            source.status = "chunking"
            session.commit()

            chunk_source.delay(source_id)

        except Exception:
            logger.exception("Failed to ingest App Store source %s", source_id)
            session.rollback()
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is not None:
                source.status = "error"
                session.commit()


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def ingest_csv_source(
    self: object, source_id: str, file_path: str, content_column: str = "content"
) -> None:
    """Parse CSV file and insert as FeedbackItems."""
    with SyncSessionLocal() as session:
        try:
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is None:
                logger.error("Source %s not found", source_id)
                return

            with open(file_path, "rb") as f:
                file_content = f.read()

            parsed = parse_csv(file_content, content_column=content_column)

            items = []
            for row in parsed:
                item = FeedbackItem(
                    source_id=source.id,
                    project_id=source.project_id,
                    content=row["content"],
                    item_metadata=row.get("metadata", {}),
                )
                items.append(item)

            session.add_all(items)
            source.record_count = len(items)
            source.status = "chunking"
            session.commit()

            chunk_source.delay(source_id)

        except Exception:
            logger.exception("Failed to ingest CSV source %s", source_id)
            session.rollback()
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is not None:
                source.status = "error"
                session.commit()
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def chunk_source(self: object, source_id: str) -> None:
    """Chunk all FeedbackItems for a source into FeedbackChunks."""
    with SyncSessionLocal() as session:
        try:
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is None:
                logger.error("Source %s not found", source_id)
                return

            items = (
                session.query(FeedbackItem)
                .filter(FeedbackItem.source_id == source.id)
                .all()
            )

            item_dicts = [
                {"id": item.id, "content": item.content}
                for item in items
            ]

            chunks = chunking.chunk_feedback_items(item_dicts)

            chunk_models = []
            for chunk in chunks:
                chunk_model = FeedbackChunk(
                    feedback_item_id=chunk["feedback_item_id"],
                    project_id=source.project_id,
                    chunk_text=chunk["chunk_text"],
                    chunk_index=chunk["chunk_index"],
                    token_count=chunk["token_count"],
                )
                chunk_models.append(chunk_model)

            session.add_all(chunk_models)
            source.status = "embedding"
            session.commit()

            embed_source.delay(source_id)

        except Exception:
            logger.exception("Failed to chunk source %s", source_id)
            session.rollback()
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is not None:
                source.status = "error"
                session.commit()


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def embed_source(self: object, source_id: str) -> None:
    """Embed all un-embedded FeedbackChunks for a source."""
    with SyncSessionLocal() as session:
        try:
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is None:
                logger.error("Source %s not found", source_id)
                return

            chunks = (
                session.query(FeedbackChunk)
                .filter(
                    FeedbackChunk.project_id == source.project_id,
                    FeedbackChunk.feedback_item_id.in_(
                        session.query(FeedbackItem.id).filter(
                            FeedbackItem.source_id == source.id
                        )
                    ),
                    FeedbackChunk.embedding.is_(None),
                )
                .all()
            )

            if not chunks:
                source.status = "ready"
                session.commit()
                return

            texts = [chunk.chunk_text for chunk in chunks]
            vectors = asyncio.run(embedding.embed_texts(texts))

            for chunk, vector in zip(chunks, vectors):
                chunk.embedding = vector

            source.status = "ready"
            session.commit()

        except Exception:
            logger.exception("Failed to embed source %s", source_id)
            session.rollback()
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is not None:
                source.status = "error"
                session.commit()


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def ingest_manual_task(self: object, source_id: str, items: list) -> None:
    """Persist parsed manual-paste items, then chain to chunk_source."""
    with SyncSessionLocal() as session:
        try:
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is None:
                logger.error("ingest_manual_task: source %s not found", source_id)
                return

            source.status = "ingesting"
            session.add(source)
            session.commit()

            feedback_items = []
            for item in items:
                fi = FeedbackItem(
                    source_id=source.id,
                    project_id=source.project_id,
                    content=item["content"],
                    item_metadata={},
                    external_id=item.get("external_id"),
                )
                feedback_items.append(fi)

            session.add_all(feedback_items)
            source.record_count = len(items)
            source.status = "chunking"
            session.add(source)
            session.commit()

        except Exception:
            logger.exception("ingest_manual_task failed for source %s", source_id)
            session.rollback()
            source = session.get(FeedbackSource, uuid.UUID(source_id))
            if source is not None:
                source.status = "error"
                session.commit()
            return

    chunk_source.delay(source_id)


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def ingest_google_play_task(
    self: object,
    source_id: str,
    package_name: str,
    preset: str = "standard",
) -> None:
    """Fetch Google Play reviews for `package_name` and persist as feedback_items."""
    from app.services import google_play

    with SyncSessionLocal() as db:
        try:
            source = db.get(FeedbackSource, uuid.UUID(source_id))
            if source is None:
                logger.error(
                    "ingest_google_play_task: source %s not found", source_id
                )
                return
            source.status = "ingesting"
            db.add(source)
            db.commit()

            count = COUNT_BY_PRESET.get(preset, COUNT_BY_PRESET["standard"])
            reviews_data = asyncio.run(
                google_play.fetch_reviews(package_name, count=count)
            )

            for r in reviews_data:
                fi = FeedbackItem(
                    source_id=source.id,
                    project_id=source.project_id,
                    content=r["content"],
                    item_metadata={
                        "rating": r["rating"],
                        "author": r["author"],
                    },
                    external_id=r["external_id"],
                )
                db.add(fi)
            source.record_count = len(reviews_data)
            source.status = "chunking"
            db.add(source)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception(
                "ingest_google_play_task failed for source %s", source_id
            )
            src = db.get(FeedbackSource, uuid.UUID(source_id))
            if src is not None:
                src.status = "error"
                db.add(src)
                db.commit()
            raise

    chunk_source.delay(source_id)


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def ingest_reddit_task(
    self: object,
    source_id: str,
    mode: str,
    value: str,
    preset: str = "standard",
) -> None:
    """Fetch Reddit posts + comments and persist as feedback_items."""
    from app.services import reddit

    with SyncSessionLocal() as db:
        try:
            source = db.get(FeedbackSource, uuid.UUID(source_id))
            if source is None:
                logger.error(
                    "ingest_reddit_task: source %s not found", source_id
                )
                return
            source.status = "ingesting"
            db.add(source)
            db.commit()

            params = REDDIT_PARAMS.get(preset, REDDIT_PARAMS["standard"])

            if mode == "subreddit":
                items = asyncio.run(reddit.fetch_subreddit(value, **params))
            elif mode == "keyword":
                items = asyncio.run(reddit.fetch_keyword_search(value, **params))
            else:
                raise ValueError(f"Unknown Reddit mode: {mode}")

            for r in items:
                metadata: dict = {
                    "author": r.get("author", ""),
                }
                if r.get("title"):
                    metadata["title"] = r["title"]
                fi = FeedbackItem(
                    source_id=source.id,
                    project_id=source.project_id,
                    content=r["content"],
                    item_metadata=metadata,
                    external_id=r.get("external_id"),
                )
                db.add(fi)
            source.record_count = len(items)
            source.status = "chunking"
            db.add(source)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception(
                "ingest_reddit_task failed for source %s", source_id
            )
            src = db.get(FeedbackSource, uuid.UUID(source_id))
            if src is not None:
                src.status = "error"
                db.add(src)
                db.commit()
            raise

    chunk_source.delay(source_id)
