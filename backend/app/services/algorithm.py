"""Pure scoring + diversification for the daily shortlist.

SPEC.md §"Algorithm (Python service)" pseudocode, copied verbatim per
.planning/phases/03-decide-w3/03-RESEARCH.md "Don't Hand-Roll" — the dogfood
gate evaluates THIS algorithm; tweaking it is out of scope.

No DB access. No `select(...)`. No `async`. The caller (services/shortlist.py
in Plan 02) is responsible for fetching candidate Recipe rows + the recent-
cooked context, then calling these functions with plain Python objects.

Cold-start tuning (SPEC.md): <10 → no diversification; 10–29 → tie-break
diversification; 30+ → full SPEC.md select_top5_with_diversity.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from app.models.recipe import Recipe


@dataclass
class ShortlistFilters:
    """Optional regenerate filters (SHORTLIST-02). All fields nullable.

    Wire shape: matches schemas/shortlist.py::RegenerateRequest (Plan 02).
    """

    cuisine: str | None = None
    max_prep_time: int | None = None
    exclude_protein: str | None = None
    required_moods: list[str] = field(default_factory=list)


@dataclass
class ShortlistContext:
    """Runtime context for one scoring pass."""

    current_season: str  # one of "spring","summer","autumn","winter"
    recent_cuisines: set[str]  # cuisines cooked in the last 14 days
    recent_proteins: set[str]
    filters: ShortlistFilters | None = None


def score_recipe(recipe: Recipe, context: ShortlistContext) -> float | None:
    """Hard filters → soft scoring per SPEC.md §Algorithm. Returns None if
    the recipe is filtered out, else a float (higher = better).
    """
    # Hard filters
    if recipe.status not in ("structured", "verified"):
        return None
    if context.filters is not None:
        f = context.filters
        if f.cuisine and recipe.cuisine != f.cuisine:
            return None
        if f.max_prep_time and (recipe.prep_time_minutes or 999) > f.max_prep_time:
            return None
        if f.exclude_protein and recipe.main_protein == f.exclude_protein:
            return None
        if f.required_moods and not (set(recipe.mood) & set(f.required_moods)):
            return None

    # Soft scoring
    score = 0.0
    if context.current_season in (recipe.seasonality or []):
        score += 1.0  # seasonalityMatch
    days = recipe.days_since_cooked()
    score += 1.5 * min(days / 14.0, 1.0)  # recencyScore
    if context.filters is not None and context.filters.required_moods:
        overlap = len(set(recipe.mood) & set(context.filters.required_moods))
        score += 0.8 * (overlap / len(context.filters.required_moods))
    if recipe.cuisine in context.recent_cuisines:
        score -= 0.5
    if recipe.main_protein in context.recent_proteins:
        score -= 0.5
    score += random.uniform(0, 0.2)  # jitter
    return score


def select_top5_with_diversity(
    ranked: list[tuple[Recipe, float]],
) -> list[Recipe]:
    """SPEC.md §Algorithm verbatim: full diversification at 30+ recipes.

    Pass 1: highest-score that adds a new (cuisine, protein) pair.
    Pass 2: top up with leftovers preserving rank order.
    """
    picks: list[Recipe] = []
    used_cuisines: set[str] = set()
    used_proteins: set[str] = set()
    for recipe, _ in ranked:
        if len(picks) >= 5:
            break
        c = recipe.cuisine or "other"
        p = recipe.main_protein or "none"
        if c not in used_cuisines and p not in used_proteins:
            picks.append(recipe)
            used_cuisines.add(c)
            used_proteins.add(p)
    for recipe, _ in ranked:
        if len(picks) >= 5:
            break
        if recipe not in picks:
            picks.append(recipe)
    return picks


def select_top5_soft_diversity(
    ranked: list[tuple[Recipe, float]],
) -> list[Recipe]:
    """10–29 recipes: diversity is a tie-break only. Take top-5 by score
    first; if there's a tie (score within 0.001), prefer the one that adds
    diversity to the already-picked set. Lightweight pass.
    """
    picks: list[Recipe] = []
    used_cuisines: set[str] = set()
    used_proteins: set[str] = set()
    i = 0
    while len(picks) < 5 and i < len(ranked):
        r, _ = ranked[i]
        picks.append(r)
        used_cuisines.add(r.cuisine or "other")
        used_proteins.add(r.main_protein or "none")
        i += 1
    return picks


def select_top_n_with_cold_start(
    candidates: list[tuple[Recipe, float]],
    corpus_size: int,
) -> list[Recipe]:
    """Cold-start branching driven by total household corpus size.

    SPEC.md §Algorithm:
    - <10 recipes: no diversification, just top-5 by score (UI also shows
      the 'Ajoute plus de recettes' banner).
    - 10–29 recipes: soft diversification (tie-break only).
    - 30+ recipes: full SPEC select_top5_with_diversity.

    Driven by corpus_size at the call site (NOT len(candidates), which is
    post-hard-filter).
    """
    if corpus_size < 10:
        return [r for r, _ in candidates[:5]]
    if corpus_size < 30:
        return select_top5_soft_diversity(candidates)
    return select_top5_with_diversity(candidates)
