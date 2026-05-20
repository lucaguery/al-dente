"""RecipeTurn — append-only conversation thread row.

Phase 25 THREAD-01 (migration 0009). One row per turn; position is
0-indexed and unique per recipe (D-16). sender/kind are TEXT + CHECK
per D-13 (matches Phase 24 RID-02 difficulty precedent).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RecipeTurn(Base):
    __tablename__ = "recipe_turns"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    recipe_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    sender: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("recipe_id", "position", name="uq_recipe_turns_recipe_position"),
        Index("idx_recipe_turns_recipe_position", "recipe_id", "position"),
        CheckConstraint(
            "sender IN ('user','system')",
            name="recipe_turns_sender_check",
        ),
        CheckConstraint(
            "kind IN ('text','voice','photo','url','answer',"
            "'proposal_accepted','proposal_dismissed','summary',"
            "'question','advisory')",
            name="recipe_turns_kind_check",
        ),
    )
