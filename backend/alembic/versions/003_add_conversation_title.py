"""add title to conversations

Revision ID: 003
Revises: 002
Create Date: 2026-04-14 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add title column to conversations (nullable, auto-populated from
    first user message on send)."""
    op.add_column(
        "conversations",
        sa.Column("title", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    """Drop title column from conversations."""
    op.drop_column("conversations", "title")
