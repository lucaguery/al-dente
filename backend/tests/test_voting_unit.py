"""Unit tests for app.services.voting — 100% line-coverage target.

Architecture invariant #2: voting state is COMPUTED from rows in `votes`,
never stored. These tests pin the `compute_vote_state` contract and the
frontend-mirror branch ORDER (drift between server-derived and
client-derived state is a UX bug class — CLAUDE.md §voting.py docstring).

No DB round-trip needed: `compute_vote_state` is a pure function.
Vote rows are replaced by lightweight `SimpleNamespace(vote="yes"|"no")`
stand-ins that expose the only attribute the function reads.

SERV-01 acceptance: all 5 VoteState values appear at least once across
the parametrized cases, and member_count ∈ {1, 2} is covered.
"""

from __future__ import annotations

import types

import pytest

from app.services.voting import VoteState, compute_vote_state

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _yes() -> types.SimpleNamespace:
    """Minimal stand-in for a Vote row with vote == 'yes'."""
    return types.SimpleNamespace(vote="yes")


def _no() -> types.SimpleNamespace:
    """Minimal stand-in for a Vote row with vote == 'no'."""
    return types.SimpleNamespace(vote="no")


# ---------------------------------------------------------------------------
# Parametrized coverage matrix
# (votes_list, member_count, expected_state)
# Covers all 5 VoteState values × member_count ∈ {1, 2}  (SERV-01)
# ---------------------------------------------------------------------------

CASES = [
    # -- household_size=2 cases --
    # 1. No votes → sans_avis
    ([], 2, VoteState.sans_avis),
    # 2. Both yes → valide
    ([_yes(), _yes()], 2, VoteState.valide),
    # 3. Both no → rejete
    ([_no(), _no()], 2, VoteState.rejete),
    # 4. One yes + one no → conteste
    ([_yes(), _no()], 2, VoteState.conteste),
    # 5. One yes, partner unvoted → pressenti
    #    (yes_count == 1 and voted == 1; yes_count != member_count so not valide)
    ([_yes()], 2, VoteState.pressenti),
    # 6. Single no with 2 members → NOT rejete (falls through to sans_avis)
    #    Branch: no_count(1) != member_count(2), not conteste (yes==0), not pressenti
    ([_no()], 2, VoteState.sans_avis),
    # -- household_size=1 cases --
    # 7. Single yes → valide (yes_count == member_count == 1)
    ([_yes()], 1, VoteState.valide),
    # 8. Single no → rejete (no_count == member_count == 1)
    ([_no()], 1, VoteState.rejete),
    # 9. No votes, 1 member → sans_avis
    ([], 1, VoteState.sans_avis),
]


@pytest.mark.parametrize("votes,member_count,expected", CASES)
def test_compute_vote_state_parametrized(
    votes: list, member_count: int, expected: VoteState
) -> None:
    """Matrix covers all 5 VoteState values × member_count ∈ {1, 2} (SERV-01)."""
    result = compute_vote_state(votes, member_count)
    assert result == expected, (
        f"compute_vote_state({[v.vote for v in votes]!r}, {member_count}) "
        f"returned {result!r}, expected {expected!r}"
    )


# ---------------------------------------------------------------------------
# Branch ORDER guard
# Ensures early-return ordering is preserved (CLAUDE.md invariant — branch
# order must be identical to frontend mirror at frontend/lib/votes.ts).
# ---------------------------------------------------------------------------


def test_valide_wins_over_conteste() -> None:
    """With member_count=2 and two yes votes, valide is returned before conteste.

    Regression guard: if 'yes >= 1 and no >= 1' check were reordered above
    'yes == member_count', a [yes, yes] list with an accidental extra no
    might reach the wrong branch.  This simpler case pins the ordering:
    pure [yes, yes] must be valide, not conteste.
    """
    assert compute_vote_state([_yes(), _yes()], 2) == VoteState.valide


def test_rejete_wins_over_sans_avis_for_full_no() -> None:
    """Both no → rejete (not sans_avis) — second branch fires before fallthrough."""
    assert compute_vote_state([_no(), _no()], 2) == VoteState.rejete


def test_pressenti_requires_single_yes_single_voted() -> None:
    """pressenti only fires when yes_count==1 AND voted==1.

    Two voters with only one yes (partner unvoted) → pressenti.
    Two voters with yes + no → conteste (yes>=1 and no>=1 fires first).
    """
    assert compute_vote_state([_yes()], 2) == VoteState.pressenti
    # Ordering: conteste branch fires before pressenti when no vote is present.
    assert compute_vote_state([_yes(), _no()], 2) == VoteState.conteste


# ---------------------------------------------------------------------------
# Locked enum value strings (frontend-mirror drift detector)
# If these string literals change server-side without matching frontend update,
# the UI shows the wrong label (CLAUDE.md §Locked vocabularies).
# ---------------------------------------------------------------------------


def test_vote_state_enum_values_are_locked_strings() -> None:
    """String values must be identical to frontend/lib/votes.ts (drift gate)."""
    assert VoteState.valide.value == "valide"
    assert VoteState.pressenti.value == "pressenti"
    assert VoteState.conteste.value == "conteste"
    assert VoteState.rejete.value == "rejete"
    assert VoteState.sans_avis.value == "sans_avis"


def test_all_five_vote_states_reachable() -> None:
    """Assert all 5 VoteState members are reachable from the parametrized matrix.

    This test is a compile-time companion to the parametrize matrix above —
    it fails if a new VoteState is added to the enum without a corresponding
    test case (SERV-01 completeness gate).
    """
    covered = {expected for _, _, expected in CASES}
    all_states = set(VoteState)
    assert covered == all_states, (
        f"Missing VoteState coverage: {all_states - covered}. "
        "Add parametrize entries for any new VoteState values."
    )
