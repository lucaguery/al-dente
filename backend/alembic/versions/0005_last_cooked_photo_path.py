"""last_cooked_photo_path — recipe-card living image (D-05)

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-07

Phase 4 (W4 Polish) — adds the nullable TEXT column that holds the path of
the most recent cooking-log photo for the recipe. Set in the same DB
transaction as last_cooked_at + cook_count by PUT /cooking-logs/{id}
(architecture invariant #3 from CLAUDE.md, COOK-05).

NULL semantics: never cooked, OR most recent log had no photos.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recipes",
        sa.Column("last_cooked_photo_path", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("recipes", "last_cooked_photo_path")
