"""Phase 24 RID-05 — add illustration_svg column.

recipes.illustration_svg TEXT NULL — sanitized server-side LLM-generated SVG
rendered on inbox + library list rows via dangerouslySetInnerHTML. NULL
means "not yet generated" OR "rejected by sanitizer" — the frontend treats
both identically (BrandIcon fallback per D-37).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recipes",
        sa.Column("illustration_svg", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("recipes", "illustration_svg")
