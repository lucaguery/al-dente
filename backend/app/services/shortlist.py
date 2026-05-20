"""Daily shortlist generation: cron-callable + regenerate-callable.

Calls services/algorithm.py pure functions, persists a DailyShortlist row,
broadcasts `shortlist.created`, and triggers the push fan-out (stub in
Plan 02; real pywebpush in Plan 05).

Per .planning/phases/03-decide-w3/03-RESEARCH.md "Pitfall 8": if the
candidate corpus is empty (zero structured recipes), DO NOT insert a row
and DO NOT broadcast/push — frontend's empty-state handles "no shortlist
today" cleanly.
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.cooking_log import CookingLog
from app.models.daily_shortlist import DailyShortlist
from app.models.recipe import Recipe
from app.services.algorithm import (
    ShortlistContext,
    ShortlistFilters,
    score_recipe,
    select_top_n_with_cold_start,
)
from app.services.push import send_push_to_household
from app.services.realtime import broadcast_to_household

log = logging.getLogger(__name__)


def _current_season() -> str:
    """Northern-hemisphere season for v0.1 (Europe/Paris). productize-later:
    derive from household timezone if expanded beyond France."""
    m = datetime.now(UTC).month
    if m in (3, 4, 5):
        return "spring"
    if m in (6, 7, 8):
        return "summer"
    if m in (9, 10, 11):
        return "autumn"
    return "winter"


def _recent_cuisines_and_proteins(
    household_id: UUID, db: Session, days: int = 14
) -> tuple[set[str], set[str]]:
    """Cuisines + proteins of recipes cooked in the last `days` days.

    Powers the -0.5 penalty branches in score_recipe.
    """
    cutoff = datetime.now(UTC) - timedelta(days=days)
    rows = db.execute(
        select(Recipe.cuisine, Recipe.main_protein)
        .join(CookingLog, CookingLog.recipe_id == Recipe.id)
        .where(
            CookingLog.household_id == household_id,
            CookingLog.cooked_at >= cutoff,
        )
    ).all()
    cuisines = {c for c, _ in rows if c}
    proteins = {p for _, p in rows if p}
    return cuisines, proteins


async def generate_daily_shortlist(
    household_id: UUID,
    db: Session | None = None,
    filters: dict[str, Any] | None = None,
    generation: int = 1,
) -> DailyShortlist | None:
    """Daily cron entry-point. Idempotent on (household_id, today, generation).

    Returns the new DailyShortlist row, or None if the corpus has zero
    structured/verified candidates (Pitfall 8 — frontend empty-state
    handles "no shortlist today"; we do NOT insert an empty row, we do
    NOT push).

    APScheduler calls this with `args=[household_id]` and no db (so it
    opens a fresh SessionLocal). The regenerate endpoint passes its
    request-scoped db. Both paths broadcast `shortlist.created` and
    invoke push fan-out (stub in Plan 02).
    """
    own_session = db is None
    db = db or SessionLocal()
    try:
        # Candidate corpus: structured + verified recipes, household-scoped
        candidates = list(
            db.scalars(
                select(Recipe).where(
                    Recipe.household_id == household_id,
                    Recipe.status.in_(("structured", "verified")),
                )
            ).all()
        )
        if not candidates:
            log.info(
                "shortlist.generate household=%s skipped: empty corpus",
                household_id,
            )
            return None

        corpus_size = len(candidates)
        recent_cuisines, recent_proteins = _recent_cuisines_and_proteins(household_id, db)
        filters_obj: ShortlistFilters | None = None
        if filters:
            filters_obj = ShortlistFilters(
                cuisine=filters.get("cuisine"),
                max_prep_time=filters.get("max_prep_time"),
                exclude_protein=filters.get("exclude_protein"),
                required_moods=filters.get("required_moods") or [],
            )
        context = ShortlistContext(
            current_season=_current_season(),
            recent_cuisines=recent_cuisines,
            recent_proteins=recent_proteins,
            filters=filters_obj,
        )

        scored: list[tuple[Recipe, float]] = []
        for r in candidates:
            s = score_recipe(r, context)
            if s is not None:
                scored.append((r, s))
        scored.sort(key=lambda t: t[1], reverse=True)
        picks = select_top_n_with_cold_start(scored, corpus_size)
        if not picks:
            log.info(
                "shortlist.generate household=%s skipped: no picks after filters",
                household_id,
            )
            return None

        shortlist = DailyShortlist(
            household_id=household_id,
            date=date.today(),
            generation=generation,
            recipe_ids=[r.id for r in picks],
            filters=filters,
        )
        db.add(shortlist)
        db.commit()
        db.refresh(shortlist)

        # Broadcast + push (best-effort; do not raise on push failure)
        await broadcast_to_household(
            household_id,
            "shortlist.created",
            {
                "shortlist_id": str(shortlist.id),
                "date": shortlist.date.isoformat(),
                "generation": shortlist.generation,
            },
        )
        try:
            send_push_to_household(
                household_id,
                {
                    "title": "Al Dente",
                    "body": "Ton shortlist du jour est prêt !",
                    "url": "/",
                },
                db=db,
            )
        except Exception as exc:  # noqa: BLE001 — push must never break cron
            log.warning(
                "shortlist.generate push failed household=%s err=%s",
                household_id,
                exc,
            )

        return shortlist
    finally:
        if own_session:
            db.close()
