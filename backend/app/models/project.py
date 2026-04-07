from __future__ import annotations

import uuid
from typing import TYPE_CHECKING
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.build_next import BuildNextAnalysis
    from app.models.chunk import FeedbackChunk
    from app.models.conversation import Conversation
    from app.models.feedback import FeedbackItem, FeedbackSource
    from app.models.spec import Spec
    from app.models.user import User


class Project(Base):
    """Represents a product project that aggregates feedback sources and specs."""

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, server_default=sa.func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime,
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship("User", back_populates="projects")  # noqa: F821
    feedback_sources: Mapped[list[FeedbackSource]] = relationship(  # noqa: F821
        "FeedbackSource", back_populates="project", cascade="all, delete-orphan"
    )
    feedback_items: Mapped[list[FeedbackItem]] = relationship(  # noqa: F821
        "FeedbackItem", back_populates="project", cascade="all, delete-orphan"
    )
    feedback_chunks: Mapped[list[FeedbackChunk]] = relationship(  # noqa: F821
        "FeedbackChunk", back_populates="project", cascade="all, delete-orphan"
    )
    specs: Mapped[list[Spec]] = relationship(  # noqa: F821
        "Spec", back_populates="project", cascade="all, delete-orphan"
    )
    conversations: Mapped[list[Conversation]] = relationship(  # noqa: F821
        "Conversation", back_populates="project", cascade="all, delete-orphan"
    )
    build_next_analyses: Mapped[list[BuildNextAnalysis]] = relationship(  # noqa: F821
        "BuildNextAnalysis", back_populates="project", cascade="all, delete-orphan"
    )
