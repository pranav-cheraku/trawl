"""Build Next models: BuildReport, BuildTheme, BuildReportSpec, BuildReportChunk.

BuildReport is the top-level artifact for one "What Should We Build Next?" run.
BuildTheme is one cluster of feedback. BuildReportSpec is one generated spec
inside a theme. BuildReportChunk persists the retrieved chunks for the X-Ray panel.

Cascade rules:
- BuildTheme.specs: `delete-orphan` (theme owns specs; theme_id is NOT NULL).
- BuildReport.specs: `cascade="all, delete"` without `-orphan` (report-level
  eager delete; specs are also owned by a theme, so orphan-delete would conflict).

The `promoted_spec_id` FK uses ON DELETE SET NULL so deleting a Kanban spec
does not orphan the BuildReportSpec row.
"""
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
    """Top-level Build Next run artifact. Status transitions: pending -> running -> success | failure."""

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

    spec_generation_failed is the per-theme partial-failure flag set when this
    theme's spec generation raised but other themes succeeded.
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

    promoted_spec_id is set when the user promotes to Kanban; ON DELETE SET NULL
    clears it if the promoted Kanban spec is later deleted.
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

    source_query records which of the 5 multi-queries surfaced this chunk
    (highest-similarity wins on ties), used to show query attribution badges.
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
