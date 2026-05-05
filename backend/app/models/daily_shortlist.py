"""DailyShortlist model — per-day ranked recipe picks.

SPEC.md §"Data model":
    daily_shortlists (id UUID PK, household_id UUID FK CASCADE, date DATE,
                      generation INT DEFAULT 1, recipe_ids UUID[],
                      filters JSONB, created_at TIMESTAMPTZ,
                      UNIQUE(household_id, date, generation))
"""

from __future__ import annotations

from datetime import date as DateType
from datetime import datetime
from uuid import UUID as PyUUID

from sqlalchemy import Date, DateTime, ForeignKey, Integer, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DailyShortlist(Base):
    __tablename__ = "daily_shortlists"

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
    date: Mapped[DateType] = mapped_column(Date, nullable=False)
    generation: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    # Ranked, ≤ 5 — no element FK at the SQL level since UUID[] is opaque to PG.
    recipe_ids: Mapped[list[PyUUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False)
    filters: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("household_id", "date", "generation", name="uq_daily_shortlists_hh_date_gen"),
    )
