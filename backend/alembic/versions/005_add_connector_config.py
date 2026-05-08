"""Add connector_config JSONB column to feedback_sources

Revision ID: 005
Revises: 004
Create Date: 2026-05-08

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "feedback_sources",
        sa.Column(
            "connector_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("feedback_sources", "connector_config")
