"""Celery application configuration for Trawl background tasks.

Uses Redis as both the broker and result backend. Tasks are explicitly listed
in `include` because autodiscover_tasks does not find nested package modules.

`result_extended=True` records task args in the result backend so the
/api/tasks/{task_id} endpoint can verify the caller owns the project that was
passed as the first arg before returning any result payload.
"""
from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "trawl",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Store task args in the result backend so the task-status endpoint can
    # check that the caller owns the project a task was dispatched for.
    result_extended=True,
)

celery_app.conf.update(
    include=[
        "app.tasks.ingestion",
        "app.tasks.spec_generation",
        "app.tasks.build_next",
        "app.tasks.cleanup",
    ]
)

# Beat schedule. Runs daily at 03:00 UTC.
# Worker MUST be started with `-B` to embed beat in the worker process.
celery_app.conf.beat_schedule = {
    "cleanup-expired-deleted-users": {
        "task": "app.tasks.cleanup.cleanup_expired_deleted_users",
        "schedule": crontab(hour=3, minute=0),
    },
}
