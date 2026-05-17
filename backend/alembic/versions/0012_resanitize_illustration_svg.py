"""Phase 30 BUG-02 D-09/D-10 — re-sanitize existing illustration_svg rows.

The Phase 24 sanitizer emitted <ns0:svg xmlns:ns0="…"> markup because
xml.etree.ElementTree invents a synthetic ns0 prefix when round-tripping
a default-namespace XML doc. Browsers parse that as valid XML but cannot
render it as inline SVG — so every per-recipe illustration on RecipeCard
+ RecipeDraftCard rendered as an empty muted square.

Phase 30 BUG-02 Task 1 fixed the sanitizer (register_namespace at module
level + belt-and-suspenders regex strip). This migration heals the
already-stored rows by running each `illustration_svg` payload through
the new sanitizer. Idempotent — the WHERE clause filters to rows whose
payload contains 'ns0:', so a second run is a no-op.

D-09: re-run through the CURRENT sanitizer (not a hand-rolled strip) to
preserve the full allowlist contract end-to-end. If the sanitizer returns
a string → UPDATE to the clean payload. If it returns None → SET NULL
(the frontend RecipeIllustration component falls back to BrandIcon per
D-37 — graceful degradation, not a regression).

D-10: ships as an Alembic data migration, runs once on next Railway deploy
via the existing `alembic upgrade head` startup step. No standalone
script, no manual trigger, no scheduled job (invariant #7 — single
uvicorn worker; APScheduler not needed for a one-shot data heal).

Revision ID: 0012
Revises: 0011
"""
from __future__ import annotations

import logging
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


log = logging.getLogger("alembic.runtime.migration")


def upgrade() -> None:
    # Import inside upgrade() so the migration module stays import-safe
    # even if app code is unavailable (defensive — Alembic collection
    # imports every version file).
    from app.services.svg_sanitizer import sanitize_recipe_svg

    bind = op.get_bind()

    # Idempotent WHERE — only rows whose payload still contains 'ns0:'
    # need remediation. A second run finds zero matches and exits.
    rows = bind.execute(
        sa.text(
            "SELECT id, illustration_svg FROM recipes "
            "WHERE illustration_svg IS NOT NULL "
            "AND illustration_svg LIKE '%ns0:%'"
        )
    ).fetchall()

    log.info("0012 resanitize: %d candidate rows", len(rows))

    updated = 0
    nulled = 0
    for row in rows:
        recipe_id, raw_svg = row[0], row[1]
        cleaned = sanitize_recipe_svg(raw_svg)
        if cleaned is None:
            # Sanitizer rejected — set NULL, frontend BrandIcon fallback.
            bind.execute(
                sa.text(
                    "UPDATE recipes SET illustration_svg = NULL "
                    "WHERE id = :id"
                ),
                {"id": recipe_id},
            )
            nulled += 1
        else:
            bind.execute(
                sa.text(
                    "UPDATE recipes SET illustration_svg = :svg "
                    "WHERE id = :id"
                ),
                {"id": recipe_id, "svg": cleaned},
            )
            updated += 1

    log.info(
        "0012 resanitize: updated=%d nulled=%d total=%d",
        updated, nulled, updated + nulled,
    )


def downgrade() -> None:
    # Pure data migration — no schema to revert. The previous content of
    # illustration_svg (the broken ns0-prefixed payloads) is not
    # recoverable; downgrade is a no-op by design. Re-running upgrade()
    # is safe because the WHERE clause filters cleaned rows out.
    pass
