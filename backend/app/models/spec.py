from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Spec(Base):
    """Represents a generated product specification card on the Kanban board."""

    __tablename__ = "specs"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(500), nullable=False)
    content: Mapped[dict] = mapped_column(
        sa.dialects.postgresql.JSONB, nullable=False
    )
    priority: Mapped[str] = mapped_column(
        sa.String(20), default="medium", nullable=False
    )
    status: Mapped[str] = mapped_column(
        sa.String(50), default="backlog", nullable=False
    )
    kanban_order: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    source_chunk_ids: Mapped[list[uuid.UUID]] = mapped_column(
        sa.ARRAY(sa.Uuid), default=list, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, server_default=sa.func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime,
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )

    project: Mapped[Project] = relationship(  # noqa: F821
        "Project", back_populates="specs"
    )
    transparency: Mapped[SpecTransparency | None] = relationship(
        "SpecTransparency",
        back_populates="spec",
        cascade="all, delete-orphan",
        uselist=False,
    )


class SpecTransparency(Base):
    """Stores RAG X-Ray data for a spec: retrieved chunks, prompt, and model metadata."""

    __tablename__ = "spec_transparency"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    spec_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("specs.id", ondelete="CASCADE"), nullable=False
    )
    retrieved_chunks: Mapped[dict] = mapped_column(
        sa.dialects.postgresql.JSONB, nullable=False
    )
    generation_prompt: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    model_used: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    total_chunks_searched: Mapped[int | None] = mapped_column(
        sa.Integer, nullable=True
    )
    retrieval_top_k: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, server_default=sa.func.now(), nullable=False
    )

    spec: Mapped[Spec] = relationship("Spec", back_populates="transparency")
