"""recipes.steps NOT NULL DEFAULT '[]'::jsonb

Phase 42 STEP-01 — convert the existing nullable recipes.steps JSONB column
(added implicitly via 0001 baseline) to NOT NULL with server_default '[]'::jsonb.

Legacy data: pre-Phase-42 promoted recipes have steps as either NULL (never
populated) or list[str] (flat instructions from old Gemini schema). This
migration backfills NULLs to '[]'::jsonb. Legacy list[str] rows are left
intact — Phase 42 lazy-backfill (STEP-03) re-extracts structured steps on
first /active visit. Per PROJECT.md MVP "no backward-compat shims" rule we
do not preserve the old shape long-term.

Revision ID: 0013
Revises: 0012
Create Date: 2026-05-21
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Backfill NULLs to empty array so the NOT NULL constraint succeeds.
    op.execute("UPDATE recipes SET steps = '[]'::jsonb WHERE steps IS NULL")

    # 2. Apply NOT NULL + server_default in a single alter_column call.
    op.alter_column(
        "recipes",
        "steps",
        existing_type=postgresql.JSONB,
        nullable=False,
        server_default=sa.text("'[]'::jsonb"),
    )


def downgrade() -> None:
    op.alter_column(
        "recipes",
        "steps",
        existing_type=postgresql.JSONB,
        nullable=True,
        server_default=None,
    )
