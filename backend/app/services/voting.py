"""Pure vote-state computation. Architecture invariant #2: voting state is
COMPUTED from rows in `votes`, never stored on a column.

Mirrored on the frontend in lib/votes.ts (Plan 03). The two impls MUST
have identical branch order — drift between server-derived state and
client-derived state is a UX bug class to avoid.

Usage:
    votes_for_recipe = db.scalars(
        select(Vote).where(Vote.shortlist_id == sl_id, Vote.recipe_id == r_id)
    ).all()
    member_count = db.scalar(
        select(func.count(Member.id)).where(Member.household_id == hh_id)
    )
    state = compute_vote_state(votes_for_recipe, member_count)
"""
from __future__ import annotations

import enum
from typing import Iterable

from app.models.vote import Vote


class VoteState(str, enum.Enum):
    """5-state voting machine. SPEC.md §Voting verbatim."""

    valide = "valide"          # both yes
    pressenti = "pressenti"    # one yes, partner unvoted
    conteste = "conteste"      # one yes, one no
    rejete = "rejete"          # both no
    sans_avis = "sans_avis"    # neither voted


def compute_vote_state(
    votes: Iterable[Vote],
    member_count: int = 2,
) -> VoteState:
    """SPEC.md §Voting state machine.

    member_count defaults to 2 (v0.1 single-household couples). Parametrized
    for future expansion (Assumption A1 in 03-RESEARCH.md). Branch order
    matters — must be identical on the frontend mirror.
    """
    yes_count = sum(1 for v in votes if v.vote == "yes")
    no_count = sum(1 for v in votes if v.vote == "no")
    voted = yes_count + no_count

    # Order matters: terminal states first, then mixed, then asymmetric.
    if yes_count == member_count:
        return VoteState.valide
    if no_count == member_count:
        return VoteState.rejete
    if yes_count >= 1 and no_count >= 1:
        return VoteState.conteste
    if yes_count == 1 and voted == 1:
        return VoteState.pressenti
    return VoteState.sans_avis
