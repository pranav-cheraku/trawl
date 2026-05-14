"""Periodic Celery task that hard-deletes users past the soft-delete grace window."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import select

from app.celery_app import celery_app
from app.database import SyncSessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)

# 30 days hard cutoff + 1 hour buffer to avoid racing a user who signs back
# in exactly at the expiry boundary. The buffer is small enough that the
# "expected grace period" is still 30 days in user-facing copy.
GRACE_PERIOD = timedelta(days=30, hours=1)


@celery_app.task(name="app.tasks.cleanup.cleanup_expired_deleted_users")
def cleanup_expired_deleted_users() -> dict:
    """Hard-delete users whose deleted_at is older than the grace period.

    Uses ORM-level delete so the cascade='all, delete-orphan' on
    User.projects fires and wipes owned data (projects, sources, items,
    chunks, specs, conversations, build reports) transitively.

    Returns {"deleted": <count>} for log/return-value visibility.
    """
    cutoff = datetime.utcnow() - GRACE_PERIOD
    with SyncSessionLocal() as session:
        try:
            expired = session.scalars(
                select(User).where(
                    User.deleted_at.is_not(None),
                    User.deleted_at < cutoff,
                )
            ).all()
            count = len(expired)
            for user in expired:
                session.delete(user)
            session.commit()
            logger.info(
                "cleanup_expired_deleted_users: hard-deleted %d user(s) past %s grace",
                count,
                GRACE_PERIOD,
            )
            return {"deleted": count}
        except Exception:
            logger.exception("cleanup_expired_deleted_users failed")
            session.rollback()
            raise


if __name__ == "__main__":
    # Manual fallback for ad-hoc local cleanup without Celery beat.
    # Run: python -m app.tasks.cleanup
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = cleanup_expired_deleted_users()
    print(result)
