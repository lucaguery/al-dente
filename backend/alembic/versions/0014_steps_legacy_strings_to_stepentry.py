"""recipes.steps — convert legacy list[str] rows to list[StepEntry]

Phase 42 STEP-04 / hotfix — migration 0013 explicitly left legacy
``list[str]`` step values intact under the assumption that the lazy
backfill in /active visit (STEP-03) would convert them later. But the
list and shortlist endpoints (``GET /recipes`` and ``GET /shortlists/today``)
serialize through ``RecipeResponse.model_validate``, which rejects the
legacy shape with a Pydantic ``ValidationError`` — crashing the whole
list response before the user ever reaches /active.

This migration converts every legacy string element to
``{"text": <str>, "ingredient_refs": []}`` so the new schema validates.
The lazy backfill on /active still has work to do: ``ingredient_refs``
arrays are empty here and only get populated when Gemini re-extracts.

Idempotent: rows whose steps are already all objects are untouched.

Revision ID: 0014
Revises: 0013
Create Date: 2026-05-21
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE recipes
        SET steps = (
            SELECT jsonb_agg(
                CASE
                    WHEN jsonb_typeof(elem) = 'string'
                        THEN jsonb_build_object('text', elem, 'ingredient_refs', '[]'::jsonb)
                    ELSE elem
                END
            )
            FROM jsonb_array_elements(steps) AS elem
        )
        WHERE jsonb_typeof(steps) = 'array'
          AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(steps) AS elem
              WHERE jsonb_typeof(elem) = 'string'
          );
        """
    )


def downgrade() -> None:
    # Lossy: ingredient_refs is dropped on the way back.
    op.execute(
        """
        UPDATE recipes
        SET steps = (
            SELECT jsonb_agg(elem->>'text')
            FROM jsonb_array_elements(steps) AS elem
        )
        WHERE jsonb_typeof(steps) = 'array'
          AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(steps) AS elem
              WHERE jsonb_typeof(elem) = 'object'
                AND elem ? 'text'
          );
        """
    )
