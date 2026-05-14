from __future__ import annotations

import uuid
from typing import TYPE_CHECKING
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.project import Project


class User(Base):
    """Represents an authenticated user of the application."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    email: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    credits_balance: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, default=0, server_default=sa.text("0")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        sa.DateTime, nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, server_default=sa.func.now(), nullable=False
    )

    projects: Mapped[list[Project]] = relationship(  # noqa: F821
        "Project", back_populates="user", cascade="all, delete-orphan"
    )
