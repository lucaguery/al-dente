"""Votes router — POST /shortlists/{shortlist_id}/recipes/{recipe_id}/vote.

Architecture invariant #2: voting state is COMPUTED, never stored. The
response includes the freshly-computed state so the frontend can update
its summary row immediately, but the canonical source is the rows.

VOTE-04 (veto window): votes are NEVER rejected — even after a CookingLog
exists, late `no` votes are accepted as v0.2-weighting signal but cannot
un-cook. The UI affordance closes via the cooking banner; the endpoint
itself is unconditional. (Pitfall 4.)
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.daily_shortlist import DailyShortlist
from app.models.member import Member
from app.models.vote import Vote
from app.schemas.vote import VoteRequest, VoteResponse
from app.services.realtime import broadcast_to_household
from app.services.voting import compute_vote_state

router = APIRouter(prefix="/shortlists", tags=["votes"])


@router.post(
    "/{shortlist_id}/recipes/{recipe_id}/vote",
    response_model=VoteResponse,
    status_code=201,
)
async def cast_vote(
    shortlist_id: UUID,
    recipe_id: UUID,
    body: VoteRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """VOTE-01 + VOTE-02 + VOTE-05: upsert + compute state + broadcast."""
    shortlist = db.get(DailyShortlist, shortlist_id)
    if shortlist is None or shortlist.household_id != member.household_id:
        raise HTTPException(404, "shortlist not found")
    if recipe_id not in shortlist.recipe_ids:
        raise HTTPException(400, "recipe not in this shortlist")

    # Upsert on (shortlist_id, recipe_id, member_id) — the UNIQUE constraint
    # was added in migration 0004 by Plan 01. ON CONFLICT DO UPDATE flips a
    # 'no' to 'yes' (or vice versa) atomically.
    stmt = (
        pg_insert(Vote)
        .values(
            shortlist_id=shortlist_id,
            recipe_id=recipe_id,
            member_id=member.id,
            vote=body.vote,
        )
        .on_conflict_do_update(
            index_elements=["shortlist_id", "recipe_id", "member_id"],
            set_={"vote": body.vote, "created_at": func.now()},
        )
    )
    db.execute(stmt)
    db.commit()

    # Recompute state from ALL votes for this (shortlist, recipe) pair.
    votes_for_recipe = list(
        db.scalars(
            select(Vote).where(
                Vote.shortlist_id == shortlist_id, Vote.recipe_id == recipe_id
            )
        ).all()
    )
    member_count = (
        db.scalar(
            select(func.count(Member.id)).where(
                Member.household_id == member.household_id
            )
        )
        or 2
    )
    state = compute_vote_state(votes_for_recipe, member_count)

    payload = {
        "shortlist_id": str(shortlist_id),
        "recipe_id": str(recipe_id),
        "member_id": str(member.id),
        "vote": body.vote,
        "state": state.value,
    }
    await broadcast_to_household(member.household_id, "vote.created", payload)
    return payload
