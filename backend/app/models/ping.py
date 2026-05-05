"""Ping model — throwaway round-trip-test scaffold (D-01).

The W1 dogfood gate is the Vercel → Railway → Supabase → WebSocket loop, validated
by exchanging pings between two phones. Once that gate passes on both phones,
plan 01-12 (dogfood-cleanup) drops this model + the table + the corresponding
endpoint and emits a follow-up Alembic migration.

DO NOT add foreign keys POINTING AT this table — nothing should depend on pings.
"""

from __future__ import annotations

from uuid import UUID as PyUUID

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


# TODO(productize): D-01 — this entire model + table is deleted after the W1 round-trip
# gate passes (see plan 01-12-dogfood-cleanup). Do not add foreign keys pointing AT this table.
class Ping(Base, TimestampMixin):
    __tablename__ = "pings"

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
    sent_by_member_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("members.id"),
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(String(120), nullable=True)
