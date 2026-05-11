"""add 'failed' value to the recipe_status enum (Phase 16 D-16-02)

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-11

Phase 16 (Capture pipeline correctness / CAP-01) extends the terminal-state
set for recipes from {structured} to {structured, failed}. When Gemini
extraction fails (parse error, schema mismatch, network timeout > 30s), the
BackgroundTask promotion path now writes `status='failed'` alongside the
human-readable French sentence in `promotion_error` (which already exists
since 0003_promotion_columns.py).

Architecture invariant #1 (CLAUDE.md): five capture surfaces, one shape —
all 5 still return a draft, all promotion still runs server-side in a
FastAPI BackgroundTask, the terminal state set is now {structured, failed}.

Idempotency / Railway redeploy safety: Postgres `ALTER TYPE ... ADD VALUE`
is auto-committed and CANNOT run inside a transaction block. Alembic wraps
upgrade() in an implicit transaction by default; we escape it via
`op.get_context().autocommit_block()` so the ALTER TYPE statement commits
as its own DDL operation. The IF NOT EXISTS guard then makes re-running
the migration a no-op.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE must be auto-committed (not inside a tx).
    # autocommit_block() exits the implicit Alembic transaction for the
    # duration of the block. IF NOT EXISTS makes re-runs a no-op so the
    # daily Railway redeploy that runs `alembic upgrade head` is safe.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE recipe_status ADD VALUE IF NOT EXISTS 'failed'")


def downgrade() -> None:
    # Postgres does not support removing a value from an ENUM type without
    # recreating the type and rewriting every column that references it.
    # We accept asymmetric migrations here: rollback would require dropping
    # any rows where status='failed' first, recreating the type without
    # 'failed', and re-pointing the column — out of scope for this
    # remediation phase. If a v2 rollback is ever needed, do it as a
    # bespoke data migration. (Matches the asymmetric-downgrade precedent
    # used for additive ENUM extensions across most production Postgres
    # codebases.)
    raise NotImplementedError(
        "ALTER TYPE recipe_status DROP VALUE is not supported by Postgres; "
        "manual data migration required to rollback Phase 16 D-16-02."
    )
