"""drop pings table (D-01 cleanup post round-trip gate)

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-06

Per CONTEXT.md D-01, the pings table was throwaway scaffolding to validate
the W1 round-trip gate (Vercel + Railway + Supabase + WebSocket). Once the
gate passed (01-07 dogfood signal), this migration drops the table. The
downgrade is a stub recreate with no rows -- there is no data restore path
in v0.1 because there were no users producing pings worth preserving.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("pings")


def downgrade() -> None:
    # Best-effort recreate to keep the migration round-trip-safe; rows are lost.
    op.create_table(
        "pings",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "household_id",
            UUID(as_uuid=True),
            sa.ForeignKey("households.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sent_by_member_id",
            UUID(as_uuid=True),
            sa.ForeignKey("members.id"),
            nullable=False,
        ),
        sa.Column("note", sa.String(length=120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
