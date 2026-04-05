from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class FeedbackSource(Base):
    """Represents a source of feedback (uploaded file or App Store connector)."""

    __tablename__ = "feedback_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    filename: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    app_store_id: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    app_store_country: Mapped[str | None] = mapped_column(sa.String(10), nullable=True)
    last_scraped_at: Mapped[datetime | None] = mapped_column(
        sa.DateTime, nullable=True
    )
    record_count: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        sa.String(50), default="processing", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, server_default=sa.func.now(), nullable=False
    )

    project: Mapped[Project] = relationship(  # noqa: F821
        "Project", back_populates="feedback_sources"
    )
    feedback_items: Mapped[list[FeedbackItem]] = relationship(
        "FeedbackItem", back_populates="source", cascade="all, delete-orphan"
    )


class FeedbackItem(Base):
    """Represents a single piece of feedback content from a source."""

    __tablename__ = "feedback_items"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("feedback_sources.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(sa.Text, nullable=False)
    item_metadata: Mapped[dict] = mapped_column(
        sa.dialects.postgresql.JSONB,
        name="metadata",
        default=dict,
        nullable=False,
    )
    external_id: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, server_default=sa.func.now(), nullable=False
    )

    __table_args__ = (
        sa.Index(
            "ix_feedback_items_source_external",
            "source_id",
            "external_id",
            unique=True,
            postgresql_where=sa.text("external_id IS NOT NULL"),
        ),
    )

    source: Mapped[FeedbackSource] = relationship(
        "FeedbackSource", back_populates="feedback_items"
    )
    project: Mapped[Project] = relationship(  # noqa: F821
        "Project", back_populates="feedback_items"
    )
    chunks: Mapped[list[FeedbackChunk]] = relationship(  # noqa: F821
        "FeedbackChunk", back_populates="feedback_item", cascade="all, delete-orphan"
    )
