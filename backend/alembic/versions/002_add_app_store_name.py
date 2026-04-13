"""add app_store_name to feedback_sources

Revision ID: 002
Revises: 001
Create Date: 2026-04-12 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add app_store_name column to feedback_sources."""
    op.add_column(
        "feedback_sources",
        sa.Column("app_store_name", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    """Drop app_store_name column from feedback_sources."""
    op.drop_column("feedback_sources", "app_store_name")
