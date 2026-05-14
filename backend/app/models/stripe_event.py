from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StripeProcessedEvent(Base):
    """Dedupes Stripe webhook events for at-least-once delivery safety."""

    __tablename__ = "stripe_processed_events"

    event_id: Mapped[str] = mapped_column(sa.String(255), primary_key=True)
    processed_at: Mapped[datetime] = mapped_column(
        sa.DateTime, server_default=sa.func.now(), nullable=False
    )
