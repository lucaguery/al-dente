"""recipes.steps — convert JSON-null values to empty array

Phase 42 STEP-04 / hotfix — migration 0013 backfilled SQL ``NULL`` to
``'[]'::jsonb`` but missed the JSON-null edge case (``steps = 'null'::jsonb``,
which is the JSON literal ``null`` stored in a JSONB column — distinct
from SQL ``NULL``). At least one pre-Phase-42 row in production landed
in that state. The Pydantic ``RecipeResponse.steps: list[StepEntry] =
Field(default_factory=list)`` rejects Python ``None`` derived from JSON
null, crashing ``GET /recipes`` and ``GET /shortlists/today`` whenever
that row is included.

Migration 0014 only handled string elements inside arrays; it could not
help here because the value isn't an array at all.

Idempotent: rows already in the array shape are untouched.

Revision ID: 0015
Revises: 0014
Create Date: 2026-05-21
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE recipes
        SET steps = '[]'::jsonb
        WHERE jsonb_typeof(steps) = 'null';
        """
    )


def downgrade() -> None:
    # No-op: empty array is a strict superset of JSON null for our purposes.
    pass
