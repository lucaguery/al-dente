"""Member model — individual user within a household.

SPEC.md §"Data model":
    members (id UUID PK, household_id UUID FK→households CASCADE, name TEXT,
             color_hex TEXT, auth_token TEXT UNIQUE, joined_at TIMESTAMPTZ)
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Member(Base):
    __tablename__ = "members"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    household_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("households.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    # One of MEMBER_COLORS in app/colors.py — D-04 Tailwind 500 hex values.
    color_hex: Mapped[str] = mapped_column(String, nullable=False)
    # Opaque base64url, generated via secrets.token_urlsafe(32) — INFRA-06.
    auth_token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    household: Mapped["Household"] = relationship(back_populates="members")  # noqa: F821
