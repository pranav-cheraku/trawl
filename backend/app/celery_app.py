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
)

celery_app.conf.update(
    include=[
        "app.tasks.ingestion",
        "app.tasks.spec_generation",
        "app.tasks.build_next",
        "app.tasks.cleanup",
    ]
)

# Beat schedule — runs daily at 03:00 UTC.
# Worker MUST be started with `-B` to embed beat in the worker process.
celery_app.conf.beat_schedule = {
    "cleanup-expired-deleted-users": {
        "task": "app.tasks.cleanup.cleanup_expired_deleted_users",
        "schedule": crontab(hour=3, minute=0),
    },
}
