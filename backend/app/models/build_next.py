from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.chunk import FeedbackChunk
    from app.models.project import Project
    from app.models.spec import Spec
    from app.models.user import User


class BuildReport(Base):
    """Top-level Build Next run artifact.

    Each run creates one row. The row transitions through
    ``pending → running → success | failure``. Persistent — users browse
    history. Promoted specs link back via ``BuildReportSpec.promoted_spec_id``.
    """

    __tablename__ = "build_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        sa.String(20), default="pending", nullable=False
    )
    task_id: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    executive_summary: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    build_order: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    retrieval_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    partial_failure: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, default=False
    )
    source_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(sa.Uuid), nullable=False, default=list
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
    completed_at: Mapped[datetime | None] = mapped_column(sa.DateTime, nullable=True)

    project: Mapped[Project] = relationship(  # noqa: F821
        "Project", back_populates="build_reports"
    )
    user: Mapped[User] = relationship("User")  # noqa: F821
    themes: Mapped[list[BuildTheme]] = relationship(
        "BuildTheme",
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="BuildTheme.rank",
    )
    specs: Mapped[list[BuildReportSpec]] = relationship(
        "BuildReportSpec",
        back_populates="report",
        cascade="all, delete",
        order_by="BuildReportSpec.build_rank",
    )
    chunks: Mapped[list[BuildReportChunk]] = relationship(
        "BuildReportChunk",
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="BuildReportChunk.retrieval_rank",
    )


class BuildTheme(Base):
    """One clustered theme inside a report.

    Frequency and severity scores are computed at task time from the
    cluster output's chunk indices. ``spec_generation_failed`` is the
    per-theme partial-failure flag — true when this theme's spec gen
    raised but other themes succeeded.
    """

    __tablename__ = "build_themes"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    report_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("build_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    rank: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    description: Mapped[str] = mapped_column(sa.Text, nullable=False, default="")
    frequency_pct: Mapped[float] = mapped_column(sa.Float, nullable=False, default=0.0)
    chunk_count: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    severity_score: Mapped[float] = mapped_column(
        sa.Float, nullable=False, default=0.0
    )
    spec_generation_failed: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, default=False
    )

    report: Mapped[BuildReport] = relationship(
        "BuildReport", back_populates="themes"
    )
    specs: Mapped[list[BuildReportSpec]] = relationship(
        "BuildReportSpec",
        back_populates="theme",
        cascade="all, delete-orphan",
        order_by="BuildReportSpec.build_rank",
    )


class BuildReportSpec(Base):
    """One generated spec inside a report, nested under a theme.

    ``content`` mirrors the shape of ``Spec.content`` (problem,
    proposed_solution, user_stories, acceptance_criteria, priority,
    effort_estimate, supporting_feedback_indices). ``promoted_spec_id``
    is set when the user clicks "+ Kanban"; ``ON DELETE SET NULL`` clears
    it if the promoted Kanban spec is later deleted.
    """

    __tablename__ = "build_report_specs"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    report_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("build_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    theme_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("build_themes.id", ondelete="CASCADE"),
        nullable=False,
    )
    build_rank: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    promoted_spec_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("specs.id", ondelete="SET NULL"),
        nullable=True,
    )

    report: Mapped[BuildReport] = relationship(
        "BuildReport", back_populates="specs"
    )
    theme: Mapped[BuildTheme] = relationship(
        "BuildTheme", back_populates="specs"
    )
    promoted_spec: Mapped[Spec | None] = relationship(  # noqa: F821
        "Spec",
        foreign_keys=[promoted_spec_id],
    )


class BuildReportChunk(Base):
    """One retrieved chunk persisted for the RAG X-Ray panel.

    ``source_query`` records which of the 5 multi-queries surfaced this
    chunk (highest-similarity wins on ties). Used by the X-Ray panel to
    show ``Q1 · Q2`` attribution badges per chunk.
    """

    __tablename__ = "build_report_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    report_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("build_reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("feedback_chunks.id", ondelete="CASCADE"),
        nullable=False,
    )
    retrieval_rank: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    similarity: Mapped[float] = mapped_column(sa.Float, nullable=False)
    source_query: Mapped[str] = mapped_column(sa.String(255), nullable=False)

    report: Mapped[BuildReport] = relationship(
        "BuildReport", back_populates="chunks"
    )
    chunk: Mapped[FeedbackChunk] = relationship("FeedbackChunk")  # noqa: F821
