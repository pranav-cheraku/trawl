from __future__ import annotations

import logging
import os
import tempfile
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.feedback import FeedbackItem, FeedbackSource
from app.models.project import Project
from app.schemas.feedback import (
    AppStoreConnectRequest,
    ChunkDetailResponse,
    FeedbackItemResponse,
    GooglePlayConnectRequest,
    GooglePlaySearchResult,
    ManualPasteRequest,
    RedditConnectRequest,
    SourceResponse,
)
from app.services import google_play
from app.services.appstore import search_app
from app.services.manual_parser import parse_paste
from app.tasks.ingestion import ingest_appstore_source, ingest_csv_source

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sources"])


@router.get(
    "/play/search",
    response_model=list[GooglePlaySearchResult],
)
async def search_google_play(
    q: str,
    user_id: uuid.UUID = Depends(get_current_user),
) -> list[dict]:
    """Proxy to Google Play search. Auth-required so we don't expose a public
    free-rate-limit-spending search endpoint.
    """
    if len(q.strip()) < 2:
        return []
    try:
        return await google_play.search_apps(q.strip(), limit=8)
    except Exception as e:
        logger.exception("Google Play search failed for %s", q)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Play search failed: {e}",
        )


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


@router.post(
    "/projects/{project_id}/sources/appstore",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Connect an App Store source",
)
async def connect_appstore(
    project_id: uuid.UUID,
    body: AppStoreConnectRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> FeedbackSource:
    """Search for an app and start scraping its reviews.

    Returns the new source immediately with status 'scraping'.
    Poll GET /sources/{id} to track progress.
    """
    project = await _get_project_for_user(project_id, db, user_id)

    app_info = await search_app(body.app_name, body.country)

    source = FeedbackSource(
        project_id=project.id,
        source_type="app_store",
        app_store_id=app_info["app_id"],
        app_store_name=app_info["app_name"],
        app_store_country=body.country,
        status="scraping",
        connector_config={"preset": body.preset},
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    # Must commit before .delay() so the Celery worker can read the row.
    ingest_appstore_source.delay(str(source.id), preset=body.preset)

    return source


@router.post(
    "/projects/{project_id}/sources/csv",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a CSV feedback source",
)
async def upload_csv(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    content_column: str = Form(default="content", min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> FeedbackSource:
    """Upload a CSV file and start processing it.

    The CSV must have a column matching content_column (default: 'content').
    All other columns are stored as metadata.
    Returns the new source immediately with status 'processing'.
    """
    project = await _get_project_for_user(project_id, db, user_id)

    max_size = 10 * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 10 MB.",
        )
    await file.seek(0)

    upload_dir = "/tmp/trawl_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    tmp = tempfile.NamedTemporaryFile(
        delete=False, suffix=".csv", prefix="trawl_upload_", dir=upload_dir
    )
    content = await file.read()
    tmp.write(content)
    tmp.close()

    source = FeedbackSource(
        project_id=project.id,
        source_type="csv",
        filename=file.filename,
        status="processing",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    # Must commit before .delay() so the Celery worker can read the row.
    ingest_csv_source.delay(str(source.id), tmp.name, content_column)

    return source


@router.post(
    "/projects/{project_id}/sources/manual",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_manual_paste_source(
    project_id: uuid.UUID,
    body: ManualPasteRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> FeedbackSource:
    """Create a new feedback source from a manual paste.

    Splits the paste into items (paragraph-first, line fallback), persists the
    source row, then enqueues ingest_manual_task which inserts items + chains
    to chunk -> embed.
    """
    project = await _get_project_for_user(project_id, db, user_id)

    items = parse_paste(body.content)
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paste was empty after trimming.",
        )

    source = FeedbackSource(
        project_id=project.id,
        source_type="manual",
        status="pending",
        record_count=0,
        connector_config={"title": (body.title or "").strip() or None},
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    from app.tasks.ingestion import ingest_manual_task

    ingest_manual_task.delay(str(source.id), items)
    return source


@router.post(
    "/projects/{project_id}/sources/google_play",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_google_play_source(
    project_id: uuid.UUID,
    body: GooglePlayConnectRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> FeedbackSource:
    """Create a Google Play feedback source and enqueue review ingestion.

    Returns the new source immediately with status 'pending'.
    Poll GET /sources/{id} to track ingestion progress.
    """
    project = await _get_project_for_user(project_id, db, user_id)

    source = FeedbackSource(
        project_id=project.id,
        source_type="google_play",
        status="pending",
        record_count=0,
        connector_config={
            "package_name": body.package_name,
            "app_name": body.app_name,
            "preset": body.preset,
        },
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    from app.tasks.ingestion import ingest_google_play_task

    ingest_google_play_task.delay(
        str(source.id), body.package_name, preset=body.preset
    )
    return source


@router.post(
    "/projects/{project_id}/sources/reddit",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reddit_source(
    project_id: uuid.UUID,
    body: RedditConnectRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> FeedbackSource:
    """Create a Reddit feedback source and enqueue ingestion.

    Accepts a subreddit name or keyword search term. For subreddit mode,
    strips a leading 'r/' so users can type either 'spotify' or 'r/spotify'.
    Returns the new source immediately with status 'pending'.
    Poll GET /sources/{id} to track ingestion progress.
    """
    project = await _get_project_for_user(project_id, db, user_id)

    value = body.value.strip()
    if not value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reddit value cannot be empty.",
        )

    if body.mode == "subreddit":
        value = value.lstrip("r/").strip()
        if not value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subreddit name cannot be empty.",
            )

    source = FeedbackSource(
        project_id=project.id,
        source_type="reddit",
        status="pending",
        record_count=0,
        connector_config={
            "mode": body.mode,
            "value": value,
            "preset": body.preset,
        },
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    from app.tasks.ingestion import ingest_reddit_task

    ingest_reddit_task.delay(
        str(source.id), body.mode, value, preset=body.preset
    )
    return source


@router.get(
    "/projects/{project_id}/sources",
    response_model=list[SourceResponse],
    status_code=status.HTTP_200_OK,
    summary="List all sources for a project",
)
async def list_sources(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> list[FeedbackSource]:
    """Return all feedback sources for a project, newest first."""
    await _get_project_for_user(project_id, db, user_id)

    result = await db.execute(
        select(FeedbackSource)
        .where(FeedbackSource.project_id == project_id)
        .order_by(FeedbackSource.created_at.desc())
    )
    return list(result.scalars().all())


@router.get(
    "/projects/{project_id}/sources/{source_id}",
    response_model=SourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a single source (for status polling)",
)
async def get_source(
    project_id: uuid.UUID,
    source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> FeedbackSource:
    """Fetch a single source by ID. Use for polling ingestion status."""
    await _get_project_for_user(project_id, db, user_id)

    result = await db.execute(
        select(FeedbackSource).where(
            FeedbackSource.id == source_id,
            FeedbackSource.project_id == project_id,
        )
    )
    source = result.scalar_one_or_none()
    if source is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found.",
        )
    return source


@router.delete(
    "/projects/{project_id}/sources/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Delete a source and all its data",
)
async def delete_source(
    project_id: uuid.UUID,
    source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> None:
    """Delete a feedback source and cascade to its items and chunks."""
    await _get_project_for_user(project_id, db, user_id)

    result = await db.execute(
        select(FeedbackSource).where(
            FeedbackSource.id == source_id,
            FeedbackSource.project_id == project_id,
        )
    )
    source = result.scalar_one_or_none()
    if source is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found.",
        )
    await db.delete(source)
    await db.commit()


@router.get(
    "/projects/{project_id}/sources/{source_id}/items",
    response_model=list[FeedbackItemResponse],
    status_code=status.HTTP_200_OK,
    summary="List feedback items for a source",
)
async def list_items(
    project_id: uuid.UUID,
    source_id: uuid.UUID,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> list[FeedbackItem]:
    """Return paginated feedback items for a source."""
    await _get_project_for_user(project_id, db, user_id)

    source_result = await db.execute(
        select(FeedbackSource.id).where(
            FeedbackSource.id == source_id,
            FeedbackSource.project_id == project_id,
        )
    )
    if source_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found.",
        )

    result = await db.execute(
        select(FeedbackItem)
        .where(FeedbackItem.source_id == source_id)
        .order_by(FeedbackItem.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get(
    "/projects/{project_id}/chunks/{chunk_id}",
    response_model=ChunkDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get full text for a chunk + its parent feedback item",
)
async def get_chunk_detail(
    project_id: uuid.UUID,
    chunk_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict:
    """Return the full text of a chunk and its parent feedback item."""
    await _get_project_for_user(project_id, db, user_id)

    result = await db.execute(
        text(
            """
            SELECT
                fc.id              AS chunk_id,
                fc.chunk_text      AS chunk_text,
                fc.feedback_item_id AS feedback_item_id,
                fi.content         AS feedback_item_content,
                fs.source_type     AS source_type,
                fs.app_store_name  AS app_store_name,
                fs.filename        AS filename
            FROM feedback_chunks fc
            JOIN feedback_items   fi ON fi.id = fc.feedback_item_id
            JOIN feedback_sources fs ON fs.id = fi.source_id
            WHERE fc.id = :chunk_id AND fc.project_id = :project_id
            """
        ),
        {"chunk_id": chunk_id, "project_id": project_id},
    )
    row = result.mappings().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chunk not found.",
        )

    source_name = (
        row["app_store_name"]
        or row["filename"]
        or (
            "App Store"
            if row["source_type"] == "app_store"
            else "CSV Upload"
            if row["source_type"] == "csv"
            else "Unknown source"
        )
    )

    return {
        "chunkId": str(row["chunk_id"]),
        "feedbackItemId": str(row["feedback_item_id"]),
        "chunkText": row["chunk_text"] or "",
        "feedbackItemContent": row["feedback_item_content"] or "",
        "sourceType": row["source_type"],
        "sourceName": source_name,
    }
