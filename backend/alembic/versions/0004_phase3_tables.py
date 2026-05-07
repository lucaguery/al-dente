"""phase3_tables — push_subscriptions, votes UNIQUE, households.timezone

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-07

Phase 3 (W3 Decide) prerequisites:
- push_subscriptions table (one Web Push subscription per member; UNIQUE on
  member_id so POST /push/subscribe can upsert on re-subscription).
- UNIQUE constraint on votes(shortlist_id, recipe_id, member_id) so the vote
  endpoint (Plan 02) can use ON CONFLICT DO UPDATE for re-vote (asymmetric
  voting state machine, architecture invariant #2).
- households.timezone column (Europe/Paris default) so APScheduler's daily
  shortlist CronTrigger fires per-household at the correct local time.

Plan 03-01 deviation note: existing migrations 0001-0003 use plain numeric
revision identifiers ("0001", "0002", "0003"). The plan text suggested
descriptive ids ("0003_promotion_columns") but those would not match
Alembic's actual revision graph and would break ``alembic upgrade head``.
This file follows the established convention.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, Sequence[str], None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. push_subscriptions table
    op.create_table(
        "push_subscriptions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "member_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("members.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("subscription", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("idx_push_subs_member", "push_subscriptions", ["member_id"])

    # 2. UNIQUE on votes (required for ON CONFLICT DO UPDATE in vote upsert)
    op.create_unique_constraint(
        "uq_votes_shortlist_recipe_member",
        "votes",
        ["shortlist_id", "recipe_id", "member_id"],
    )

    # 3. households.timezone column
    op.add_column(
        "households",
        sa.Column(
            "timezone",
            sa.String(),
            nullable=False,
            server_default=sa.text("'Europe/Paris'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("households", "timezone")
    op.drop_constraint(
        "uq_votes_shortlist_recipe_member", "votes", type_="unique"
    )
    op.drop_index("idx_push_subs_member", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
