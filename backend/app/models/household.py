"""Household model — root tenant scope.

SPEC.md §"Data model":
    households (id UUID PK, name TEXT, invite_code TEXT UNIQUE, created_at TIMESTAMPTZ)
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID

from sqlalchemy import String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Household(Base, TimestampMixin):
    __tablename__ = "households"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    # Regenerable 6-char uppercase alphanumeric (CONTEXT.md "Invite-code format").
    invite_code: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)

    members: Mapped[list["Member"]] = relationship(  # noqa: F821 — forward ref resolved at mapping time
        back_populates="household",
        cascade="all, delete-orphan",
    )
