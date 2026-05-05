"""CookingLog model — append-only record of an actual cooking session.

SPEC.md §"Data model":
    cooking_logs (id UUID PK, recipe_id UUID FK, household_id UUID FK CASCADE,
                  cooked_by_member_id UUID FK, cooked_at TIMESTAMPTZ NOT NULL,
                  photo_paths TEXT[], rating log_rating, notes TEXT)
    log_rating ENUM('loved','liked','disliked')
    idx_logs_household_time, idx_logs_recipe
"""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID as PyUUID

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class LogRating(str, enum.Enum):
    """Mirrors the SQL ENUM ``log_rating``. Locked 3-value scale per PROJECT.md."""

    loved = "loved"
    liked = "liked"
    disliked = "disliked"


class CookingLog(Base):
    __tablename__ = "cooking_logs"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    recipe_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recipes.id"),
        nullable=False,
    )
    household_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("households.id", ondelete="CASCADE"),
        nullable=False,
    )
    cooked_by_member_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("members.id"),
        nullable=False,
    )
    # Immutable start time — set once at "Je commence à cuisiner" tap.
    cooked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    photo_paths: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        server_default=text("'{}'"),
        default=list,
    )
    rating: Mapped[LogRating | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_logs_household_time", "household_id", text("cooked_at DESC")),
        Index("idx_logs_recipe", "recipe_id"),
    )
