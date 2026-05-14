from __future__ import annotations

import logging
import uuid
from typing import cast

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.celery_app import celery_app
from app.dependencies import get_current_user, get_db, require_credits
from app.models.feedback import FeedbackSource
from app.models.project import Project
from app.models.spec import Spec
from app.schemas.spec import (
    GenerateSpecsRequest,
    GenerateSpecsResponse,
    ReorderRequest,
    SpecResponse,
    SpecSourcesResponse,
    SpecUpdateRequest,
    TaskStatusResponse,
)
from app.tasks.spec_generation import generate_specs_task

router = APIRouter(tags=["specs"])
logger = logging.getLogger(__name__)


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


async def _project_has_ready_source(
    db: AsyncSession, project_id: uuid.UUID
) -> bool:
    """Return True if the project has at least one source with status='ready'."""
    result = await db.execute(
        select(FeedbackSource.id)
        .where(
            FeedbackSource.project_id == project_id,
            FeedbackSource.status == "ready",
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def _get_spec_for_user(
    spec_id: uuid.UUID,
    db: AsyncSession,
    user_id: uuid.UUID,
) -> Spec:
    """Load a spec and verify the user owns its parent project."""
    result = await db.execute(
        select(Spec)
        .join(Project, Project.id == Spec.project_id)
        .where(Spec.id == spec_id, Project.user_id == user_id)
    )
    spec = result.scalar_one_or_none()
    if spec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spec not found.",
        )
    return spec


@router.post(
    "/projects/{project_id}/generate",
    response_model=GenerateSpecsResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate specs from project feedback",
)
async def generate_specs(
    project_id: uuid.UUID,
    body: GenerateSpecsRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(require_credits(5)),
) -> GenerateSpecsResponse:
    """Kick off an async Celery task that retrieves feedback, calls Claude,
    and persists generated specs. Returns a task_id for polling."""
    await _get_project_for_user(project_id, db, user_id)

    if not await _project_has_ready_source(db, project_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No feedback sources ready yet. Connect an App Store app or "
                "upload a CSV on the Sources tab, then try again."
            ),
        )

    # Must commit before .delay() so the Celery worker sees the row.
    await db.commit()

    # UUIDs must be strings for Celery's JSON serializer; the task parses them back.
    source_ids_for_task: list[str] | None = (
        [str(s) for s in body.source_ids] if body.source_ids is not None else None
    )
    task = generate_specs_task.delay(
        str(project_id), body.type, body.focus, source_ids_for_task
    )
    return GenerateSpecsResponse(task_id=task.id)


@router.get(
    "/tasks/{task_id}",
    response_model=TaskStatusResponse,
    summary="Poll an async task's status",
)
async def get_task_status(
    task_id: str,
    user_id: uuid.UUID = Depends(get_current_user),
) -> TaskStatusResponse:
    """Return the current status of a Celery task (generation, etc.)."""
    result = AsyncResult(task_id, app=celery_app)

    state_map = {
        "PENDING": "pending",
        "STARTED": "started",
        "SUCCESS": "success",
        "FAILURE": "failure",
        "RETRY": "retry",
    }
    mapped_status = state_map.get(result.state, "pending")

    task_result = None
    task_error = None
    if result.state == "SUCCESS":
        task_result = result.result
    elif result.state == "FAILURE":
        task_error = str(result.info) if result.info else "Unknown error"

    return TaskStatusResponse(
        task_id=task_id,
        status=mapped_status,
        result=task_result,
        error=task_error,
    )


@router.get(
    "/projects/{project_id}/specs",
    response_model=list[SpecResponse],
    summary="List specs for a project",
)
async def list_specs(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
    type: str | None = Query(default=None),
    spec_status: str | None = Query(default=None, alias="status"),
    priority: str | None = Query(default=None),
) -> list[Spec]:
    """Return all specs for a project, ordered by kanban_order. Supports
    optional filters on type, status, and priority."""
    await _get_project_for_user(project_id, db, user_id)

    stmt = select(Spec).where(Spec.project_id == project_id)

    if type is not None:
        stmt = stmt.where(Spec.type == type)
    if spec_status is not None:
        stmt = stmt.where(Spec.status == spec_status)
    if priority is not None:
        stmt = stmt.where(Spec.priority == priority)

    stmt = stmt.order_by(Spec.kanban_order.asc())

    result = await db.execute(stmt)
    return list(result.scalars().all())


# /specs/reorder must be defined before /specs/{spec_id} or FastAPI parses "reorder" as a UUID.


@router.patch(
    "/specs/reorder",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Batch update kanban order and status",
)
async def reorder_specs(
    body: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> None:
    """Batch-update kanban_order and status for multiple specs. Used by the
    frontend's drag-and-drop Kanban board."""
    spec_ids = [item.id for item in body.items]

    result = await db.execute(
        select(Spec)
        .join(Project, Project.id == Spec.project_id)
        .where(Spec.id.in_(spec_ids), Project.user_id == user_id)
    )
    specs_by_id = {spec.id: spec for spec in result.scalars().all()}

    if len(specs_by_id) != len(spec_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more specs not found or unauthorized.",
        )

    for item in body.items:
        spec = specs_by_id[item.id]
        spec.kanban_order = item.kanban_order
        spec.status = item.status

    await db.commit()


@router.patch(
    "/specs/{spec_id}",
    response_model=SpecResponse,
    summary="Update a spec",
)
async def update_spec(
    spec_id: uuid.UUID,
    body: SpecUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> Spec:
    """Partial update of a spec's title, content, priority, or status."""
    spec = await _get_spec_for_user(spec_id, db, user_id)

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(spec, field, value)

    await db.commit()
    await db.refresh(spec)
    return spec


@router.delete(
    "/specs/{spec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Delete a spec",
)
async def delete_spec(
    spec_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> None:
    """Delete a spec. Cascades to its SpecTransparency record."""
    spec = await _get_spec_for_user(spec_id, db, user_id)
    await db.delete(spec)
    await db.commit()


@router.get(
    "/specs/{spec_id}/sources",
    response_model=SpecSourcesResponse,
    summary="Get RAG transparency data for a spec",
)
async def get_spec_sources(
    spec_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user),
) -> SpecSourcesResponse:
    """Return the retrieval metadata (RAG X-Ray) for a spec."""
    result = await db.execute(
        select(Spec)
        .join(Project, Project.id == Spec.project_id)
        .where(Spec.id == spec_id, Project.user_id == user_id)
        .options(selectinload(Spec.transparency))
    )
    spec = result.scalar_one_or_none()
    if spec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spec not found.",
        )

    t = spec.transparency
    return SpecSourcesResponse(
        spec_id=spec.id,
        retrieved_chunks=cast("list[dict]", t.retrieved_chunks) if t else [],
        generation_prompt=t.generation_prompt if t else None,
        model_used=t.model_used if t else None,
        total_chunks_searched=t.total_chunks_searched if t else None,
        retrieval_top_k=t.retrieval_top_k if t else None,
    )
