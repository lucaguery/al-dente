"""Unit tests for app.services.algorithm — 100% line-coverage target (COV-03, SERV-02).

Tests cover every weight/penalty branch of score_recipe (hard filters +
soft scoring), plus select_top5_with_diversity, select_top5_soft_diversity,
and select_top_n_with_cold_start across all three cold-start corpus sizes.

Pure-function tests: no DB access needed for score_recipe / select_* because:
  - score_recipe only reads .status, .cuisine, .prep_time_minutes,
    .main_protein, .mood (list), .seasonality (list), and calls .days_since_cooked().
  - We use SimpleNamespace stand-ins (not SQLAlchemy Recipe instances) because
    Recipe.__new__(Recipe) doesn't initialize the SQLAlchemy instrumentation state,
    causing AttributeError on attribute assignment. SimpleNamespace provides the
    same duck-typed interface for the pure-function calls.
  - days_since_cooked() is stubbed via lambda on the SimpleNamespace.

Determinism: monkeypatch `app.services.algorithm.random.uniform` to return 0.0
for all score_recipe tests so jitter doesn't affect float assertions.

SERV-02 acceptance: every hard-filter branch, every soft-scoring branch,
and every cold-start corpus-size branch is demonstrably covered.
"""

from __future__ import annotations

import types

import pytest

from app.services.algorithm import (
    ShortlistContext,
    ShortlistFilters,
    score_recipe,
    select_top5_soft_diversity,
    select_top5_with_diversity,
    select_top_n_with_cold_start,
)

# ---------------------------------------------------------------------------
# Helper — build a SimpleNamespace stand-in with sensible defaults for scoring
# ---------------------------------------------------------------------------


def _make_recipe(
    *,
    status: str = "structured",
    cuisine: str | None = "italian",
    prep_time_minutes: int | None = 30,
    main_protein: str | None = "poultry",
    mood: list[str] | None = None,
    seasonality: list[str] | None = None,
    days_since_cooked: int = 999,  # default: never cooked → max recency
) -> types.SimpleNamespace:
    """Return a SimpleNamespace stand-in whose scoring-relevant attributes are set.

    score_recipe only reads: .status, .cuisine, .prep_time_minutes,
    .main_protein, .mood, .seasonality, and calls .days_since_cooked().
    We stub days_since_cooked() as a lambda returning the given int so tests
    are fully deterministic without a DB or datetime manipulation.
    """
    r = types.SimpleNamespace(
        status=status,
        cuisine=cuisine,
        prep_time_minutes=prep_time_minutes,
        main_protein=main_protein,
        mood=mood if mood is not None else ["comfort"],
        seasonality=seasonality
        if seasonality is not None
        else ["spring", "summer", "autumn", "winter"],
    )
    r.days_since_cooked = lambda: days_since_cooked
    return r


def _ctx(
    *,
    current_season: str = "spring",
    recent_cuisines: set[str] | None = None,
    recent_proteins: set[str] | None = None,
    filters: ShortlistFilters | None = None,
) -> ShortlistContext:
    return ShortlistContext(
        current_season=current_season,
        recent_cuisines=recent_cuisines or set(),
        recent_proteins=recent_proteins or set(),
        filters=filters,
    )


# ---------------------------------------------------------------------------
# Class 1: Hard-filter branches (all should return None)
# ---------------------------------------------------------------------------


class TestScoreRecipeHardFilters:
    """score_recipe returns None for every hard-filter rejection branch."""

    def test_status_draft_rejected(self, monkeypatch) -> None:
        """recipe.status == 'draft' → None (line 49)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(status="draft")
        assert score_recipe(r, _ctx()) is None

    def test_status_failed_rejected(self, monkeypatch) -> None:
        """recipe.status == 'failed' → None (same branch, different value)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(status="failed")
        assert score_recipe(r, _ctx()) is None

    def test_cuisine_filter_mismatch_rejected(self, monkeypatch) -> None:
        """filters.cuisine == 'asian' and recipe.cuisine == 'italian' → None (line 53-54)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(cuisine="italian")
        f = ShortlistFilters(cuisine="asian")
        assert score_recipe(r, _ctx(filters=f)) is None

    def test_max_prep_time_exceeded_rejected(self, monkeypatch) -> None:
        """filters.max_prep_time == 30, recipe.prep_time_minutes == 60 → None (line 55-56)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(prep_time_minutes=60)
        f = ShortlistFilters(max_prep_time=30)
        assert score_recipe(r, _ctx(filters=f)) is None

    def test_max_prep_time_none_uses_999_fallback_rejected(self, monkeypatch) -> None:
        """filters.max_prep_time == 30, recipe.prep_time_minutes is None → (None or 999) > 30 → None."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(prep_time_minutes=None)
        f = ShortlistFilters(max_prep_time=30)
        assert score_recipe(r, _ctx(filters=f)) is None

    def test_exclude_protein_match_rejected(self, monkeypatch) -> None:
        """filters.exclude_protein == 'fish', recipe.main_protein == 'fish' → None (line 57-58)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(main_protein="fish")
        f = ShortlistFilters(exclude_protein="fish")
        assert score_recipe(r, _ctx(filters=f)) is None

    def test_required_moods_no_overlap_rejected(self, monkeypatch) -> None:
        """filters.required_moods == ['quick'], recipe.mood == ['comfort'] → no overlap → None (line 59-60)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(mood=["comfort"])
        f = ShortlistFilters(required_moods=["quick"])
        assert score_recipe(r, _ctx(filters=f)) is None


# ---------------------------------------------------------------------------
# Class 2: Soft-scoring branches (all should return a float, not None)
# ---------------------------------------------------------------------------


class TestScoreRecipeSoftScoring:
    """score_recipe returns the expected float for each soft-scoring branch."""

    def test_seasonality_match_adds_1(self, monkeypatch) -> None:
        """current_season in recipe.seasonality → +1.0 (line 64-65)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(seasonality=["spring"], days_since_cooked=999)
        # days=999 → capped recency = 1.0 × 1.5; season match → +1.0
        result = score_recipe(r, _ctx(current_season="spring"))
        assert result == pytest.approx(1.0 + 1.5)  # season + recency_capped

    def test_seasonality_mismatch_no_bonus(self, monkeypatch) -> None:
        """current_season NOT in recipe.seasonality → no +1.0 bonus."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(seasonality=["winter"], days_since_cooked=999)
        result = score_recipe(r, _ctx(current_season="spring"))
        assert result == pytest.approx(1.5)  # only recency_capped

    def test_recency_never_cooked_gives_max(self, monkeypatch) -> None:
        """days_since_cooked() = 999 → capped to 1.0 → score += 1.5 (line 66-67)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(seasonality=[], days_since_cooked=999)
        result = score_recipe(r, _ctx())
        assert result == pytest.approx(1.5)  # 1.5 * min(999/14, 1.0)

    def test_recency_7_days_mid_range(self, monkeypatch) -> None:
        """days_since_cooked() = 7 → 1.5 * (7/14) = 0.75 (line 66-67 mid-range)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(seasonality=[], days_since_cooked=7)
        result = score_recipe(r, _ctx())
        assert result == pytest.approx(1.5 * (7 / 14.0))

    def test_mood_overlap_proportional_bonus(self, monkeypatch) -> None:
        """required_moods=['quick','comfort'], recipe.mood=['quick','light'] → overlap=1, ratio=0.5 → +0.4 (line 68-70)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(mood=["quick", "light"], seasonality=[], days_since_cooked=999)
        f = ShortlistFilters(required_moods=["quick", "comfort"])
        result = score_recipe(r, _ctx(filters=f))
        # recency_capped + mood_bonus = 1.5 + 0.8*(1/2) = 1.5 + 0.4 = 1.9
        assert result == pytest.approx(1.5 + 0.4)

    def test_recent_cuisine_penalty(self, monkeypatch) -> None:
        """recipe.cuisine in recent_cuisines → -0.5 (line 71-72)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(cuisine="italian", seasonality=[], days_since_cooked=999)
        result = score_recipe(r, _ctx(recent_cuisines={"italian"}))
        # recency_capped - cuisine_penalty = 1.5 - 0.5 = 1.0
        assert result == pytest.approx(1.0)

    def test_recent_protein_penalty(self, monkeypatch) -> None:
        """recipe.main_protein in recent_proteins → -0.5 (line 73-74)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(main_protein="poultry", seasonality=[], days_since_cooked=999)
        result = score_recipe(r, _ctx(recent_proteins={"poultry"}))
        # recency_capped - protein_penalty = 1.5 - 0.5 = 1.0
        assert result == pytest.approx(1.0)

    def test_structured_status_accepted(self, monkeypatch) -> None:
        """recipe.status == 'structured' → accepted (not None)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(status="structured")
        assert score_recipe(r, _ctx()) is not None

    def test_verified_status_accepted(self, monkeypatch) -> None:
        """recipe.status == 'verified' → accepted (not None)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(status="verified")
        assert score_recipe(r, _ctx()) is not None

    def test_cuisine_filter_match_accepted(self, monkeypatch) -> None:
        """filters.cuisine == 'italian', recipe.cuisine == 'italian' → accepted (filter branch taken, not rejected)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(cuisine="italian")
        f = ShortlistFilters(cuisine="italian")
        assert score_recipe(r, _ctx(filters=f)) is not None

    def test_max_prep_time_within_limit_accepted(self, monkeypatch) -> None:
        """filters.max_prep_time == 60, recipe.prep_time_minutes == 30 → accepted."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(prep_time_minutes=30)
        f = ShortlistFilters(max_prep_time=60)
        assert score_recipe(r, _ctx(filters=f)) is not None

    def test_exclude_protein_no_match_accepted(self, monkeypatch) -> None:
        """filters.exclude_protein == 'fish', recipe.main_protein == 'poultry' → accepted."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(main_protein="poultry")
        f = ShortlistFilters(exclude_protein="fish")
        assert score_recipe(r, _ctx(filters=f)) is not None

    def test_required_moods_overlap_accepted(self, monkeypatch) -> None:
        """filters.required_moods == ['quick'], recipe.mood == ['quick'] → accepted."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe(mood=["quick"])
        f = ShortlistFilters(required_moods=["quick"])
        assert score_recipe(r, _ctx(filters=f)) is not None

    def test_no_filters_object_skips_filter_block(self, monkeypatch) -> None:
        """filters=None → filter block entirely skipped; still returns a float (line 51 branch)."""
        monkeypatch.setattr("app.services.algorithm.random.uniform", lambda a, b: 0.0)
        r = _make_recipe()
        assert score_recipe(r, _ctx(filters=None)) is not None


# ---------------------------------------------------------------------------
# Class 3: select_top5_with_diversity
# ---------------------------------------------------------------------------


class TestSelectTop5WithDiversity:
    """select_top5_with_diversity (lines 87-104): two-pass selection."""

    def _ranked(self, recipes: list[Recipe]) -> list[tuple[Recipe, float]]:
        """Pair each recipe with a descending score for ranking."""
        return [(r, float(100 - i)) for i, r in enumerate(recipes)]

    def test_five_distinct_pairs_picks_all_five(self) -> None:
        """5 recipes each with unique (cuisine, protein) → all 5 picked in pass 1."""
        cuisines = ["italian", "french", "asian", "mediterranean", "indian"]
        proteins = ["poultry", "redMeat", "fish", "seafood", "egg"]
        recipes = [_make_recipe(cuisine=c, main_protein=p) for c, p in zip(cuisines, proteins)]
        ranked = self._ranked(recipes)
        picks = select_top5_with_diversity(ranked)
        assert len(picks) == 5
        # All 5 original recipes appear in picks (SimpleNamespace is unhashable,
        # so compare via list identity rather than set membership)
        for r in recipes:
            assert r in picks

    def test_duplicates_trigger_pass_two_top_up(self) -> None:
        """3 distinct + 4 with same cuisine/protein → pass 1 gets 3, pass 2 tops up to 5."""
        # 3 distinct (cuisine+protein unique)
        r1 = _make_recipe(cuisine="italian", main_protein="poultry")
        r2 = _make_recipe(cuisine="french", main_protein="redMeat")
        r3 = _make_recipe(cuisine="asian", main_protein="fish")
        # 4 with cuisine "italian" / protein "poultry" — will collide with r1 in pass 1
        # but pass 2 will pick the top 2 leftovers
        r4 = _make_recipe(cuisine="italian", main_protein="poultry")
        r5 = _make_recipe(cuisine="italian", main_protein="poultry")
        ranked = self._ranked([r1, r2, r3, r4, r5])
        picks = select_top5_with_diversity(ranked)
        # Must have exactly 5 (pass 2 topped up from 3 to 5)
        assert len(picks) == 5
        # r1, r2, r3 must be in the picks (they were distinct)
        assert r1 in picks
        assert r2 in picks
        assert r3 in picks

    def test_fewer_than_five_ranked_returns_all(self) -> None:
        """3 ranked recipes → returns all 3 (both passes respect the limit)."""
        r1 = _make_recipe(cuisine="italian", main_protein="poultry")
        r2 = _make_recipe(cuisine="french", main_protein="redMeat")
        r3 = _make_recipe(cuisine="asian", main_protein="fish")
        ranked = self._ranked([r1, r2, r3])
        picks = select_top5_with_diversity(ranked)
        assert len(picks) == 3

    def test_empty_ranked_returns_empty(self) -> None:
        """Empty ranked list → returns [] without error."""
        picks = select_top5_with_diversity([])
        assert picks == []

    def test_pass_one_breaks_at_five(self) -> None:
        """7 distinct (cuisine, protein) → pass 1 picks first 5; pass 2 adds none."""
        recipes = [
            _make_recipe(cuisine=c, main_protein=p)
            for c, p in [
                ("italian", "poultry"),
                ("french", "redMeat"),
                ("asian", "fish"),
                ("mediterranean", "seafood"),
                ("indian", "egg"),
                ("mexican", "legume"),
                ("american", "none"),
            ]
        ]
        ranked = self._ranked(recipes)
        picks = select_top5_with_diversity(ranked)
        assert len(picks) == 5

    def test_pass_two_breaks_at_five(self) -> None:
        """All same cuisine/protein → pass 1 picks 1, pass 2 tops up to 5 from 7."""
        recipes = [_make_recipe(cuisine="italian", main_protein="poultry") for _ in range(7)]
        ranked = self._ranked(recipes)
        picks = select_top5_with_diversity(ranked)
        assert len(picks) == 5


# ---------------------------------------------------------------------------
# Class 4: select_top5_soft_diversity
# ---------------------------------------------------------------------------


class TestSelectTop5SoftDiversity:
    """select_top5_soft_diversity (lines 114-124): simple top-5 from ranked list."""

    def _ranked(self, recipes: list[Recipe]) -> list[tuple[Recipe, float]]:
        return [(r, float(100 - i)) for i, r in enumerate(recipes)]

    def test_seven_ranked_returns_first_five(self) -> None:
        """7 recipes → first 5 picked (while loop stops at len(picks) >= 5)."""
        recipes = [_make_recipe(cuisine="italian") for _ in range(7)]
        ranked = self._ranked(recipes)
        picks = select_top5_soft_diversity(ranked)
        assert len(picks) == 5
        # Must be the first 5 in ranked order
        assert picks == [r for r, _ in ranked[:5]]

    def test_three_ranked_returns_all_three(self) -> None:
        """3 ranked recipes → all 3 returned (loop exits when i >= len(ranked))."""
        recipes = [_make_recipe(cuisine="italian") for _ in range(3)]
        ranked = self._ranked(recipes)
        picks = select_top5_soft_diversity(ranked)
        assert len(picks) == 3

    def test_empty_ranked_returns_empty(self) -> None:
        """Empty input → empty output."""
        picks = select_top5_soft_diversity([])
        assert picks == []


# ---------------------------------------------------------------------------
# Class 5: select_top_n_with_cold_start — corpus-size branches
# ---------------------------------------------------------------------------


class TestColdStart:
    """select_top_n_with_cold_start (lines 142-146): corpus-size dispatch."""

    def _ranked(self, recipes: list[Recipe]) -> list[tuple[Recipe, float]]:
        return [(r, float(100 - i)) for i, r in enumerate(recipes)]

    def _many_recipes(self, n: int) -> list[Recipe]:
        cuisines = [
            "italian",
            "french",
            "asian",
            "mediterranean",
            "indian",
            "mexican",
            "american",
            "northAfrican",
            "other",
            "mediterranean",
        ]
        proteins = [
            "poultry",
            "redMeat",
            "fish",
            "seafood",
            "egg",
            "legume",
            "none",
            "poultry",
            "redMeat",
            "fish",
        ]
        return [
            _make_recipe(
                cuisine=cuisines[i % len(cuisines)], main_protein=proteins[i % len(proteins)]
            )
            for i in range(n)
        ]

    def test_corpus_size_5_simple_top5(self) -> None:
        """corpus_size=5 (<10) → simple top-5 by score; no diversification (line 143)."""
        recipes = self._many_recipes(7)
        ranked = self._ranked(recipes)
        picks = select_top_n_with_cold_start(ranked, corpus_size=5)
        # Should be the first 5 of ranked[:5]
        expected = [r for r, _ in ranked[:5]]
        assert picks == expected

    def test_corpus_size_9_simple_top5(self) -> None:
        """corpus_size=9 (<10) → still simple path."""
        recipes = self._many_recipes(7)
        ranked = self._ranked(recipes)
        picks = select_top_n_with_cold_start(ranked, corpus_size=9)
        expected = [r for r, _ in ranked[:5]]
        assert picks == expected

    def test_corpus_size_10_soft_diversity(self) -> None:
        """corpus_size=10 (>=10, <30) → select_top5_soft_diversity branch (line 145)."""
        recipes = self._many_recipes(7)
        ranked = self._ranked(recipes)
        picks = select_top_n_with_cold_start(ranked, corpus_size=10)
        # soft_diversity is simple top-5
        expected = select_top5_soft_diversity(ranked)
        assert picks == expected

    def test_corpus_size_15_soft_diversity(self) -> None:
        """corpus_size=15 (10<=x<30) → soft diversity branch."""
        recipes = self._many_recipes(7)
        ranked = self._ranked(recipes)
        picks = select_top_n_with_cold_start(ranked, corpus_size=15)
        expected = select_top5_soft_diversity(ranked)
        assert picks == expected

    def test_corpus_size_29_soft_diversity(self) -> None:
        """corpus_size=29 (10<=x<30) → soft diversity branch (boundary)."""
        recipes = self._many_recipes(7)
        ranked = self._ranked(recipes)
        picks = select_top_n_with_cold_start(ranked, corpus_size=29)
        expected = select_top5_soft_diversity(ranked)
        assert picks == expected

    def test_corpus_size_30_full_diversity(self) -> None:
        """corpus_size=30 (>=30) → select_top5_with_diversity branch (line 146)."""
        recipes = self._many_recipes(7)
        ranked = self._ranked(recipes)
        picks = select_top_n_with_cold_start(ranked, corpus_size=30)
        expected = select_top5_with_diversity(ranked)
        assert picks == expected

    def test_corpus_size_100_full_diversity(self) -> None:
        """corpus_size=100 → full diversity branch."""
        recipes = self._many_recipes(7)
        ranked = self._ranked(recipes)
        picks = select_top_n_with_cold_start(ranked, corpus_size=100)
        expected = select_top5_with_diversity(ranked)
        assert picks == expected

    def test_few_candidates_with_large_corpus_simple_path(self) -> None:
        """corpus_size < 10 with 2 candidates → top-2 returned ([:5] of 2-element list)."""
        recipes = self._many_recipes(2)
        ranked = self._ranked(recipes)
        picks = select_top_n_with_cold_start(ranked, corpus_size=5)
        assert len(picks) == 2
        assert picks == [r for r, _ in ranked]
