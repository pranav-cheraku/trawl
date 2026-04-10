from __future__ import annotations

import os
import tempfile
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.feedback import FeedbackItem, FeedbackSource
from app.models.project import Project
from app.schemas.feedback import (
    AppStoreConnectRequest,
    FeedbackItemResponse,
    SourceResponse,
)
from app.services.appstore import search_app
from app.tasks.ingestion import ingest_appstore_source, ingest_csv_source

router = APIRouter(tags=["sources"])


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

    # Resolve app name to App Store ID (fail fast if not found)
    app_info = await search_app(body.app_name, body.country)

    source = FeedbackSource(
        project_id=project.id,
        source_type="app_store",
        app_store_id=app_info["app_id"],
        app_store_country=body.country,
        status="scraping",
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    # Kick off async ingestion pipeline (must be after commit so worker can read the row)
    ingest_appstore_source.delay(str(source.id))

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

    # Validate file size (10 MB limit)
    max_size = 10 * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 10 MB.",
        )
    await file.seek(0)

    # Save uploaded file to shared volume (accessible by both API and Celery worker)
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

    # Kick off async ingestion pipeline (must be after commit so worker can read the row)
    ingest_csv_source.delay(str(source.id), tmp.name, content_column)

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

    # Verify source exists
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
