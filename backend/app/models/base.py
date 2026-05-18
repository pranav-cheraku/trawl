"""Declarative base class shared by all SQLAlchemy ORM models.

The type_annotation_map entries mean mapped_column(uuid.UUID) produces a
native Uuid column and mapped_column(dict) produces JSONB automatically,
without having to spell it out on every column.
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    type_annotation_map = {
        uuid.UUID: sa.Uuid,
        dict: JSONB,
    }
