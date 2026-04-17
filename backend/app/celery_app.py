from __future__ import annotations

from celery import Celery

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

celery_app.conf.update(include=["app.tasks.ingestion", "app.tasks.spec_generation"])
