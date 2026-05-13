from __future__ import annotations

import logging
import uuid
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_current_user, get_db
from app.models.build_next import (
    BuildReport,
    BuildReportChunk,
    BuildReportSpec,
    BuildTheme,
)
from app.models.chunk import FeedbackChunk
from app.models.feedback import FeedbackItem, FeedbackSource
from app.models.project import Project
from app.models.spec import Spec
from app.schemas.build_next import (
    AlreadyPromotedResponse,
    AlreadyRunningResponse,
    BuildOrderEntry,
    BuildReportChunkResponse,
    BuildReportChunksResponse,
    BuildReportResponse,
    BuildReportSpecResponse,
    BuildReportSummary,
    BuildStatus,
    BuildThemeResponse,
    PromoteSpecResponse,
    RunBuildNextRequest,
    RunBuildNextResponse,
)
from app.tasks.build_next import run_build_next_task

logger = logging.getLogger(__name__)

router = APIRouter(tags=["build-next"])


async def _get_project_for_user(
    project_id: uuid.UUID, db: AsyncSession, user_id: uuid.UUID
) -> Project:
    """Return the project if the user owns it; 404 otherwise."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id, Project.user_id == user_id
        )
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found."
        )
    return project


@router.post(
    "/projects/{project_id}/build-next/runs",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=RunBuildNextResponse,
    responses={
        status.HTTP_409_CONFLICT: {"model": AlreadyRunningResponse},
    },
)
async def trigger_build_next(
    project_id: uuid.UUID,
    body: RunBuildNextRequest,
    user_id: uuid.UUID = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RunBuildNextResponse:
    """Kick off a Build Next run. 202 + {reportId, taskId}; 409 if a run is
    already pending/running for this project."""
    await _get_project_for_user(project_id, db, user_id)

    if body.source_ids is not None and len(body.source_ids) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activate at least one source to run",
        )

    existing = await db.execute(
        select(BuildReport).where(
            BuildReport.project_id == project_id,
            BuildReport.status.in_(["pending", "running"]),
        )
    )
    existing_row = existing.scalar_one_or_none()
    if existing_row is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "existingReportId": str(existing_row.id),
                "taskId": existing_row.task_id,
            },
        )

    source_ids_value = body.source_ids if body.source_ids is not None else []
    report = BuildReport(
        project_id=project_id,
        user_id=user_id,
        status="pending",
        source_ids=source_ids_value,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # UUIDs must be strings for Celery's JSON serializer.
    source_ids_str = (
        [str(s) for s in body.source_ids] if body.source_ids is not None else None
    )
    # If the broker is down here, the row stays as pending with task_id=None.
    # The frontend's 10-minute stale heuristic treats such rows as failed on next mount.
    async_result = run_build_next_task.delay(
        str(report.id), str(project_id), source_ids_str
    )

    report.task_id = async_result.id
    await db.commit()

    return RunBuildNextResponse(report_id=report.id, task_id=async_result.id)


@router.get(
    "/projects/{project_id}/build-next/runs",
    response_model=list[BuildReportSummary],
)
async def list_build_runs(
    project_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BuildReportSummary]:
    """List runs for a project, newest first. Used by the run switcher."""
    await _get_project_for_user(project_id, db, user_id)

    theme_count_subq = (
        select(BuildTheme.report_id, func.count(BuildTheme.id).label("theme_count"))
        .group_by(BuildTheme.report_id)
        .subquery()
    )
    spec_count_subq = (
        select(
            BuildReportSpec.report_id,
            func.count(BuildReportSpec.id).label("spec_count"),
        )
        .group_by(BuildReportSpec.report_id)
        .subquery()
    )

    result = await db.execute(
        select(
            BuildReport,
            func.coalesce(theme_count_subq.c.theme_count, 0).label("theme_count"),
            func.coalesce(spec_count_subq.c.spec_count, 0).label("spec_count"),
        )
        .outerjoin(theme_count_subq, BuildReport.id == theme_count_subq.c.report_id)
        .outerjoin(spec_count_subq, BuildReport.id == spec_count_subq.c.report_id)
        .where(BuildReport.project_id == project_id)
        .order_by(BuildReport.created_at.desc())
    )

    summaries: list[BuildReportSummary] = []
    for report, theme_count, spec_count in result.all():
        summaries.append(
            BuildReportSummary(
                id=report.id,
                status=report.status,
                created_at=report.created_at,
                completed_at=report.completed_at,
                source_count=len(report.source_ids or []),
                theme_count=int(theme_count or 0),
                spec_count=int(spec_count or 0),
            )
        )
    return summaries


@router.get(
    "/build-reports/{report_id}",
    response_model=BuildReportResponse,
)
async def get_build_report(
    report_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BuildReportResponse:
    """Fetch a full report. Themes + specs + build_order + metadata."""
    result = await db.execute(
        select(BuildReport)
        .options(
            selectinload(BuildReport.themes),
            selectinload(BuildReport.specs),
        )
        .where(BuildReport.id == report_id, BuildReport.user_id == user_id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Build report not found."
        )

    themes = [
        BuildThemeResponse.model_validate(t)
        for t in sorted(report.themes, key=lambda t: t.rank)
    ]
    specs = [
        BuildReportSpecResponse.model_validate(s)
        for s in sorted(report.specs, key=lambda s: s.build_rank)
    ]
    build_order_raw = cast("list[dict]", report.build_order or [])
    build_order: list[BuildOrderEntry] = []
    for entry in build_order_raw:
        spec_id_str = entry.get("specId")
        if spec_id_str is None:
            logger.warning(
                "Build report %s has build_order entry with rank %s but no specId",
                report_id,
                entry.get("rank"),
            )
        build_order.append(
            BuildOrderEntry(
                rank=entry.get("rank", 0),
                spec_id=uuid.UUID(spec_id_str) if spec_id_str else None,
                rationale=entry.get("rationale", ""),
            )
        )

    return BuildReportResponse(
        id=report.id,
        project_id=report.project_id,
        status=cast("BuildStatus", report.status),
        task_id=report.task_id,
        failure_reason=report.failure_reason,
        executive_summary=report.executive_summary,
        themes=themes,
        specs=specs,
        build_order=build_order,
        retrieval_metadata=report.retrieval_metadata,
        source_ids=report.source_ids or [],
        partial_failure=report.partial_failure,
        created_at=report.created_at,
        completed_at=report.completed_at,
    )


@router.get(
    "/build-reports/{report_id}/chunks",
    response_model=BuildReportChunksResponse,
)
async def get_build_report_chunks(
    report_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BuildReportChunksResponse:
    """RAG X-Ray data: chunks with similarity, rank, query attribution."""
    auth = await db.execute(
        select(BuildReport.id).where(
            BuildReport.id == report_id, BuildReport.user_id == user_id
        )
    )
    if auth.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Build report not found."
        )

    result = await db.execute(
        select(
            BuildReportChunk,
            FeedbackChunk.chunk_text,
            FeedbackChunk.feedback_item_id,
            FeedbackSource.source_type,
            FeedbackSource.app_store_name,
            FeedbackSource.filename,
        )
        .join(FeedbackChunk, FeedbackChunk.id == BuildReportChunk.chunk_id)
        .join(FeedbackItem, FeedbackItem.id == FeedbackChunk.feedback_item_id)
        .join(FeedbackSource, FeedbackSource.id == FeedbackItem.source_id)
        .where(BuildReportChunk.report_id == report_id)
        .order_by(BuildReportChunk.retrieval_rank.asc())
    )

    chunks: list[BuildReportChunkResponse] = []
    for row in result.all():
        chunk_row, chunk_text, fi_id, source_type, app_name, filename = row
        source_name = (
            app_name
            or filename
            or f"{source_type or 'source'} (untitled)"
        )
        chunks.append(
            BuildReportChunkResponse(
                chunk_id=chunk_row.chunk_id,
                similarity=chunk_row.similarity,
                retrieval_rank=chunk_row.retrieval_rank,
                source_query=chunk_row.source_query,
                chunk_text=chunk_text,
                source_name=source_name,
                feedback_item_id=fi_id,
            )
        )
    return BuildReportChunksResponse(chunks=chunks)


@router.post(
    "/build-reports/{report_id}/specs/{spec_id}/promote",
    status_code=status.HTTP_201_CREATED,
    response_model=PromoteSpecResponse,
    responses={
        status.HTTP_409_CONFLICT: {"model": AlreadyPromotedResponse},
    },
)
async def promote_build_spec(
    report_id: uuid.UUID,
    spec_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PromoteSpecResponse:
    """Promote a build_report_spec into the Kanban as a Spec row.

    Lands at the top of Backlog (kanban_order=0); existing Backlog rows are
    shifted up by 1 first to make room. Sets promoted_spec_id back-pointer.
    """
    auth_q = await db.execute(
        select(BuildReport).where(
            BuildReport.id == report_id, BuildReport.user_id == user_id
        )
    )
    report = auth_q.scalar_one_or_none()
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Build report not found."
        )

    # Lock the row to prevent concurrent double-promote.
    source_q = await db.execute(
        select(BuildReportSpec)
        .where(
            BuildReportSpec.id == spec_id,
            BuildReportSpec.report_id == report_id,
        )
        .with_for_update()
    )
    source_spec = source_q.scalar_one_or_none()
    if source_spec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Spec not found in report."
        )

    if source_spec.promoted_spec_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"existingSpecId": str(source_spec.promoted_spec_id)},
        )

    # Shift existing Backlog rows up before inserting at order=0 (avoids collision).
    await db.execute(
        update(Spec)
        .where(
            and_(
                Spec.project_id == report.project_id,
                Spec.status == "backlog",
            )
        )
        .values(kanban_order=Spec.kanban_order + 1)
    )

    new_spec = Spec(
        project_id=report.project_id,
        title=source_spec.title,
        content=source_spec.content,
        type="feature_specs",
        priority=str(source_spec.content.get("priority", "medium")),
        status="backlog",
        kanban_order=0,
        build_report_spec_id=source_spec.id,
    )
    db.add(new_spec)
    await db.flush()

    source_spec.promoted_spec_id = new_spec.id
    await db.commit()
    return PromoteSpecResponse(kanban_spec_id=new_spec.id)
