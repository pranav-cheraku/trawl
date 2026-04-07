from __future__ import annotations

import uuid
from typing import TYPE_CHECKING
from datetime import datetime

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.feedback import FeedbackItem
    from app.models.project import Project


class FeedbackChunk(Base):
    """Represents a text chunk derived from a feedback item, with a vector embedding."""

    __tablename__ = "feedback_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    feedback_item_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("feedback_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    chunk_text: Mapped[str] = mapped_column(sa.Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    token_count: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(1024), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, server_default=sa.func.now(), nullable=False
    )

    __table_args__ = (
        sa.Index(
            "ix_feedback_chunks_embedding_ivfflat",
            "embedding",
            postgresql_using="ivfflat",
            postgresql_ops={"embedding": "vector_cosine_ops"},
            postgresql_with={"lists": 100},
        ),
    )

    feedback_item: Mapped[FeedbackItem] = relationship(  # noqa: F821
        "FeedbackItem", back_populates="chunks"
    )
    project: Mapped[Project] = relationship(  # noqa: F821
        "Project", back_populates="feedback_chunks"
    )
