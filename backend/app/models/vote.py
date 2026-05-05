"""Vote model — single asymmetric vote on a (shortlist, recipe).

SPEC.md §"Data model":
    vote_value ENUM('yes','no')
    votes (id UUID PK, shortlist_id UUID FK CASCADE, recipe_id UUID FK,
           member_id UUID FK, vote vote_value NOT NULL, created_at TIMESTAMPTZ)
    idx_votes_shortlist (shortlist_id)

Voting state machine (Validé / Pressenti / Contesté / Rejeté / Sans avis) is
COMPUTED from rows in this table, never stored — architecture invariant #2.
"""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID as PyUUID

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class VoteValue(str, enum.Enum):
    """Mirrors the SQL ENUM ``vote_value``. Asymmetric: yes/no only, no neutral."""

    yes = "yes"
    no = "no"


class Vote(Base):
    __tablename__ = "votes"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    shortlist_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("daily_shortlists.id", ondelete="CASCADE"),
        nullable=False,
    )
    recipe_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recipes.id"),
        nullable=False,
    )
    member_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("members.id"),
        nullable=False,
    )
    vote: Mapped[VoteValue] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_votes_shortlist", "shortlist_id"),
    )
