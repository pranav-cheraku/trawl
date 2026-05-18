"""add credits balance and stripe processed events

Revision ID: 006
Revises: 005
Create Date: 2026-05-13
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add credits_balance to users (server_default=0 backfills existing rows) and
    create stripe_processed_events for webhook idempotency deduplication."""
    op.add_column(
        "users",
        sa.Column(
            "credits_balance",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_table(
        "stripe_processed_events",
        sa.Column("event_id", sa.String(length=255), primary_key=True),
        sa.Column(
            "processed_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Drop stripe_processed_events table and credits_balance column."""
    op.drop_table("stripe_processed_events")
    op.drop_column("users", "credits_balance")
