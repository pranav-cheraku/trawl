"""drop dead build_next_analyses; create build_reports + themes + specs + chunks

Revision ID: 004
Revises: 003
Create Date: 2026-04-27 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace dead Day-1 build_next_analyses scaffold with the real schema."""
    # 1. Drop the unused Day-1 placeholder table.
    op.drop_table("build_next_analyses")

    # 2. build_reports — top-level run artifact.
    op.create_table(
        "build_reports",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("task_id", sa.String(255), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("executive_summary", sa.Text(), nullable=True),
        sa.Column("build_order", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "retrieval_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "partial_failure",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "source_ids",
            sa.ARRAY(sa.Uuid()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_build_reports_project_id_created_at",
        "build_reports",
        ["project_id", sa.text("created_at DESC")],
    )

    # 3. build_themes — clustered theme per report.
    op.create_table(
        "build_themes",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("report_id", sa.Uuid(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("frequency_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("severity_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "spec_generation_failed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.ForeignKeyConstraint(["report_id"], ["build_reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_build_themes_report_id", "build_themes", ["report_id"])

    # 4. build_report_specs — generated specs nested under themes.
    op.create_table(
        "build_report_specs",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("report_id", sa.Uuid(), nullable=False),
        sa.Column("theme_id", sa.Uuid(), nullable=False),
        sa.Column("build_rank", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column(
            "content", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("promoted_spec_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["report_id"], ["build_reports.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["theme_id"], ["build_themes.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["promoted_spec_id"], ["specs.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_build_report_specs_report_id", "build_report_specs", ["report_id"]
    )
    op.create_index(
        "ix_build_report_specs_theme_id", "build_report_specs", ["theme_id"]
    )

    # 5. build_report_chunks — RAG X-Ray data per report.
    op.create_table(
        "build_report_chunks",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("report_id", sa.Uuid(), nullable=False),
        sa.Column("chunk_id", sa.Uuid(), nullable=False),
        sa.Column("retrieval_rank", sa.Integer(), nullable=False),
        sa.Column("similarity", sa.Float(), nullable=False),
        sa.Column("source_query", sa.String(255), nullable=False),
        sa.ForeignKeyConstraint(
            ["report_id"], ["build_reports.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["chunk_id"], ["feedback_chunks.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_build_report_chunks_report_id", "build_report_chunks", ["report_id"]
    )

    # 6. specs — add nullable back-link to source build_report_spec.
    op.add_column(
        "specs",
        sa.Column("build_report_spec_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_specs_build_report_spec_id",
        "specs",
        "build_report_specs",
        ["build_report_spec_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_specs_build_report_spec_id",
        "specs",
        ["build_report_spec_id"],
    )


def downgrade() -> None:
    """Reverse — drop new tables and restore the Day-1 placeholder."""
    op.drop_constraint("uq_specs_build_report_spec_id", "specs", type_="unique")
    op.drop_constraint(
        "fk_specs_build_report_spec_id", "specs", type_="foreignkey"
    )
    op.drop_column("specs", "build_report_spec_id")

    op.drop_index("ix_build_report_chunks_report_id", table_name="build_report_chunks")
    op.drop_table("build_report_chunks")

    op.drop_index("ix_build_report_specs_theme_id", table_name="build_report_specs")
    op.drop_index("ix_build_report_specs_report_id", table_name="build_report_specs")
    op.drop_table("build_report_specs")

    op.drop_index("ix_build_themes_report_id", table_name="build_themes")
    op.drop_table("build_themes")

    op.drop_index(
        "ix_build_reports_project_id_created_at", table_name="build_reports"
    )
    op.drop_table("build_reports")

    # Restore the Day-1 placeholder so downgrade is symmetric.
    op.create_table(
        "build_next_analyses",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status", sa.String(50), nullable=False, server_default="processing"
        ),
        sa.Column(
            "theme_clusters",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "ranked_opportunities",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "generated_spec_ids",
            sa.ARRAY(sa.Uuid()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "corpus_stats",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"], ["projects.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
