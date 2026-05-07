"""add promotion_error + promotion_attempts to recipes (Phase 2 D-09)

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-07

Phase 2 (LLM Capture / W2) introduces server-side BackgroundTask promotion
of `draft` recipes (voice + photo capture) to `structured`. When Gemini
fails (timeout, parse error, quota), we keep the recipe in `draft` and
record the failure on the row itself so the drafts inbox can show a red
"Échec" badge + "Réessayer" affordance (CONTEXT.md D-09). `promotion_error`
is nullable (null = "no failure / never attempted"); `promotion_attempts`
is a non-null counter that increments on every promotion try, including
the first.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recipes",
        sa.Column("promotion_error", sa.Text(), nullable=True),
    )
    op.add_column(
        "recipes",
        sa.Column(
            "promotion_attempts",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("recipes", "promotion_attempts")
    op.drop_column("recipes", "promotion_error")
