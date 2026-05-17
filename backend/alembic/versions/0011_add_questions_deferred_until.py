"""Phase 29 D-21 — add recipes.questions_deferred_until.

Single nullable timestamptz column. NULL = questions allowed. Set by
POST /recipes/{id}/questions/defer to now() + 24h to silence question
emission for the recipe across the next 24-hour window (D-08).

Revision ID: 0011
Revises: 0009
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "recipes",
        sa.Column(
            "questions_deferred_until",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("recipes", "questions_deferred_until")
