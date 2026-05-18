"""add users.deleted_at for soft delete

Revision ID: 007
Revises: 006
Create Date: 2026-05-14
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add deleted_at nullable timestamp to users for soft-delete support.
    The index speeds up the Celery cleanup task's WHERE deleted_at < cutoff query."""
    op.add_column(
        "users",
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"])


def downgrade() -> None:
    """Drop deleted_at index and column from users."""
    op.drop_index("ix_users_deleted_at", table_name="users")
    op.drop_column("users", "deleted_at")
