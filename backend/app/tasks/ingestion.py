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


@celery_app.task(bind=True, max_retries=2)  # type: ignore[misc]
def ingest_appstore_source(self: object, source_id: str) -> None:
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
            country = source.app_store_country or "us"
            reviews = asyncio.run(appstore.fetch_reviews(app_id, country))

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
            # Always clean up temp file
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
