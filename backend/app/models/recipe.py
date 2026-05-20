"""Recipe model — the canonical entity.

SPEC.md §"Data model" recipes table (Phase 25 migration 0009 updates):
- recipe_status enum ('draft', 'structured', 'verified', 'failed')
- TEXT[] columns for mood, seasonality, tags, photo_paths
- JSONB columns for ingredients, steps, manually_edited_fields
- CHECK constraints on cuisine + main_protein matching the locked vocabularies
- Denormalized last_cooked_at + cook_count (architecture invariant #3)
- idx_recipes_household_status, idx_recipes_last_cooked
"""

from __future__ import annotations

import enum
from datetime import UTC, datetime
from uuid import UUID as PyUUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RecipeStatus(str, enum.Enum):
    """Mirrors the SQL ENUM ``recipe_status``."""

    draft = "draft"
    structured = "structured"
    verified = "verified"
    failed = "failed"


class Recipe(Base):
    __tablename__ = "recipes"

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
    created_by_member_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("members.id"),
        nullable=False,
    )
    # Persist enum values as TEXT (native_enum=False) so we can hand-create the
    # PG type explicitly in the baseline migration and own its name + ordering.
    status: Mapped[RecipeStatus] = mapped_column(
        String,
        nullable=False,
        server_default=text("'draft'::recipe_status"),
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    photo_paths: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        server_default=text("'{}'"),
        default=list,
    )
    ingredients: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    steps: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # Phase 25 THREAD-03 (migration 0009) — JSON array of field names edited by the user.
    # Write path owned by Phase 28 DETAIL-05; default [] means no manual overrides.
    manually_edited_fields: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb"), default=list
    )
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Phase 24 RID-02 — three new optional recipe-identity columns (migration 0007).
    cook_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    difficulty: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Phase 24 RID-05 (migration 0008) — per-recipe LLM-generated SVG
    # illustration. Server-side sanitized via services/svg_sanitizer.py
    # before storage; NULL means "not yet generated" OR "rejected by
    # sanitizer". Frontend falls back to BrandIcon (RID-01) for either case.
    illustration_svg: Mapped[str | None] = mapped_column(Text, nullable=True)
    servings: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cuisine: Mapped[str | None] = mapped_column(Text, nullable=True)
    mood: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        server_default=text("'{}'"),
        default=list,
    )
    main_protein: Mapped[str | None] = mapped_column(Text, nullable=True)
    seasonality: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        server_default=text("'{spring,summer,autumn,winter}'"),
        default=lambda: ["spring", "summer", "autumn", "winter"],
    )
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        server_default=text("'{}'"),
        default=list,
    )
    # Denormalized — updated in the same transaction as cooking_logs insert
    # (architecture invariant #3 from CLAUDE.md).
    last_cooked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Phase 29 D-21 / LLM-03 — question deferral gate. NULL = questions allowed.
    # Populated by POST /recipes/{id}/questions/defer with now() + 24h to
    # silence in-thread question emission for the next 24-hour window.
    questions_deferred_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cook_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    # Phase 4 (D-05): path of the most recent cooking-log photo for this
    # recipe. Set by PUT /cooking-logs/{id} in the same transaction as
    # last_cooked_at + cook_count. NULL = never cooked OR most recent log
    # had no photos.
    last_cooked_photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Phase 2 (CONTEXT.md D-09): non-null on every row, but null `promotion_error`
    # means "no failure (or never attempted)". promotion_attempts increments on every
    # try, including the first.
    # TODO(productize): retry cap — lock the card after N failed promotion_attempts.
    promotion_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    promotion_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "cuisine IS NULL OR cuisine IN ("
            "'italian','french','asian','mediterranean','middleEastern',"
            "'indian','mexican','northAfrican','american','other')",
            name="recipes_cuisine_check",
        ),
        CheckConstraint(
            "main_protein IS NULL OR main_protein IN ("
            "'poultry','redMeat','fish','seafood','egg','legume','none')",
            name="recipes_main_protein_check",
        ),
        # Phase 24 RID-02 — difficulty CHECK mirrors cuisine/main_protein pattern
        # (TEXT + CHECK, not native ENUM — see 24-CONTEXT.md D-10).
        CheckConstraint(
            "difficulty IS NULL OR difficulty IN ('easy','medium','hard')",
            name="recipes_difficulty_check",
        ),
        Index("idx_recipes_household_status", "household_id", "status"),
        Index(
            "idx_recipes_last_cooked",
            "household_id",
            text("last_cooked_at DESC NULLS LAST"),
        ),
    )

    def days_since_cooked(self) -> int:
        """Days since the most recent cook, or 999 if never cooked.

        Used by services/algorithm.py for the recency-scoring term:
        score += 1.5 * min(days / 14.0, 1.0). Capped semantics intentional —
        a recipe never cooked is "fully fresh" but capped (any > 14 maps to 1.0).
        """
        from datetime import datetime

        if self.last_cooked_at is None:
            return 999
        now = datetime.now(UTC)
        delta = now - self.last_cooked_at
        return delta.days
