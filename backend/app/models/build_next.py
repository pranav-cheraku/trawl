from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class BuildNextAnalysis(Base):
    """Represents a 'What Should We Build Next?' multi-query analysis job."""

    __tablename__ = "build_next_analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        sa.String(50), default="processing", nullable=False
    )
    theme_clusters: Mapped[dict | None] = mapped_column(
        sa.dialects.postgresql.JSONB, nullable=True
    )
    ranked_opportunities: Mapped[dict | None] = mapped_column(
        sa.dialects.postgresql.JSONB, nullable=True
    )
    generated_spec_ids: Mapped[list[uuid.UUID]] = mapped_column(
        sa.ARRAY(sa.Uuid), default=list, nullable=False
    )
    corpus_stats: Mapped[dict | None] = mapped_column(
        sa.dialects.postgresql.JSONB, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, server_default=sa.func.now(), nullable=False
    )

    project: Mapped[Project] = relationship(  # noqa: F821
        "Project", back_populates="build_next_analyses"
    )
