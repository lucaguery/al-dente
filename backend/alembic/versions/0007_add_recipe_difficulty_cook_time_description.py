"""Phase 24 RID-02 — add cook_time_minutes / difficulty / description.

Three optional recipe-identity columns:
- cook_time_minutes INTEGER NULL  (mirrors prep_time_minutes; no CHECK)
- difficulty TEXT NULL + recipes_difficulty_check CHECK constraint
  (mirrors the cuisine/main_protein TEXT+CHECK pattern; values
  'easy' / 'medium' / 'hard' lock-stepped with backend/app/models/enums.py
  Difficulty and frontend/lib/enums.ts Difficulty)
- description TEXT NULL  (free-form long-text)

Backfill posture: NULL on all existing rows (no server_default). Existing
recipes will show low CompletenessCard scores after this lands — that's
the intended nudge per gh#22 / RID-03.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recipes",
        sa.Column("cook_time_minutes", sa.Integer(), nullable=True),
    )
    op.add_column(
        "recipes",
        sa.Column("difficulty", sa.Text(), nullable=True),
    )
    op.add_column(
        "recipes",
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_check_constraint(
        "recipes_difficulty_check",
        "recipes",
        "difficulty IS NULL OR difficulty IN ('easy','medium','hard')",
    )


def downgrade() -> None:
    op.drop_constraint("recipes_difficulty_check", "recipes", type_="check")
    op.drop_column("recipes", "description")
    op.drop_column("recipes", "difficulty")
    op.drop_column("recipes", "cook_time_minutes")
