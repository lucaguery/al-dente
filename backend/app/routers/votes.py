"""Votes router — POST /shortlists/{shortlist_id}/recipes/{recipe_id}/vote
plus DELETE /votes/{vote_id} (Phase 41 UNDO-01).

Architecture invariant #2: voting state is COMPUTED, never stored. The
response includes the freshly-computed state so the frontend can update
its summary row immediately, but the canonical source is the rows.

VOTE-04 (veto window — POST): votes are NEVER rejected — even after a
CookingLog exists, late `no` votes are accepted as v0.2-weighting signal
but cannot un-cook. The UI affordance closes via the cooking banner; the
POST endpoint itself is unconditional. (Pitfall 4.)

UNDO-01 (Phase 41): DELETE /votes/{vote_id} hard-deletes the row, and
compute_vote_state naturally recomputes from row absence on the next
read — no state column is introduced (invariant #2). Cross-household
isolation goes through Member.household_id (Vote has no household_id
column). The veto window IS enforced on DELETE: if any cooking_log
exists for (household_id, shortlist.date), the DELETE is refused with
409 `veto_window_closed` — defense-in-depth behind the frontend's
preemptive disabled-button tooltip (D-12).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.cooking_log import CookingLog
from app.models.daily_shortlist import DailyShortlist
from app.models.member import Member
from app.models.vote import Vote
from app.schemas.vote import VoteRequest, VoteResponse
from app.services.realtime import broadcast_to_household
from app.services.voting import compute_vote_state

router = APIRouter(prefix="/shortlists", tags=["votes"])
votes_router = APIRouter(prefix="/votes", tags=["votes"])


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
            select(Vote).where(Vote.shortlist_id == shortlist_id, Vote.recipe_id == recipe_id)
        ).all()
    )
    member_count = (
        db.scalar(select(func.count(Member.id)).where(Member.household_id == member.household_id))
        or 2
    )
    state = compute_vote_state(votes_for_recipe, member_count)

    # Resolve the persisted vote row to surface its id (Phase 41 UNDO-01 D-07).
    # The frontend stores this id and uses it later to call DELETE /votes/{vote_id}.
    vote_row = db.scalar(
        select(Vote).where(
            Vote.shortlist_id == shortlist_id,
            Vote.recipe_id == recipe_id,
            Vote.member_id == member.id,
        )
    )

    payload = {
        "vote_id": str(vote_row.id),
        "shortlist_id": str(shortlist_id),
        "recipe_id": str(recipe_id),
        "member_id": str(member.id),
        "vote": body.vote,
        "state": state.value,
    }
    await broadcast_to_household(member.household_id, "vote.created", payload)
    return payload


@votes_router.delete("/{vote_id}", status_code=204)
async def delete_vote(
    vote_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> None:
    """UNDO-01: hard-delete one vote row. Architecture invariant #2 holds —
    state is computed from row existence, so deleting the row IS the undo.

    Order matters:
      1. Resolve the vote (404 if missing — invariant #2 record-existence non-leak).
      2. Cross-household check via Member.household_id join (Vote has no
         household_id column — isolation runs through Member). Same 404 on
         mismatch, NOT 403 — D-38-02 / invariant #2.
      3. Resolve shortlist for the date we use in the veto-window guard.
      4. Veto-window guard (D-12): if any CookingLog exists for
         (household_id, shortlist.date) — counted by date(cooked_at) — refuse
         with 409 `veto_window_closed`. Defense-in-depth behind the frontend's
         preemptive disabled button (Plan 41-04).
      5. Snapshot the broadcast payload BEFORE delete (FKs still resolvable).
      6. Delete + commit.
      7. Broadcast `vote.deleted`. Receiving clients drop the row from their
         votes[] cache and `compute_vote_state` naturally re-derives.
    """
    # 1. Resolve the vote.
    vote = db.get(Vote, vote_id)
    if vote is None:
        raise HTTPException(404, "vote not found")

    # 2. Cross-household check via Member join.
    # Vote has no household_id column — isolation runs through Member.household_id
    # (CLAUDE.md invariant #2 + Plan 41-01).
    vote_member = db.get(Member, vote.member_id)
    if vote_member is None or vote_member.household_id != member.household_id:
        # Same 404 as step 1: an attacker cannot distinguish "vote does not
        # exist" from "vote belongs to another household" (T-41-01 mitigation).
        raise HTTPException(404, "vote not found")

    # 3. Resolve shortlist for the date we use in the veto-window guard.
    # ON DELETE CASCADE on Vote.shortlist_id guarantees this exists in practice,
    # but defend with a 404 if the chain ever breaks.
    shortlist = db.get(DailyShortlist, vote.shortlist_id)
    if shortlist is None:
        raise HTTPException(404, "vote not found")
    shortlist_date = shortlist.date

    # 4. Veto-window guard (D-12).
    # CookingLog stores `cooked_at: datetime` (not a separate shortlist_date
    # column), so the "any cooking happened on the shortlist's date" check
    # casts cooked_at to a date for comparison. The literal detail string
    # MUST be exactly `veto_window_closed` so the frontend can drive the
    # `shortlist.undo.locked` i18n key without parsing prose (Plan 41-04).
    cook_count = db.scalar(
        select(func.count(CookingLog.id)).where(
            CookingLog.household_id == member.household_id,
            func.date(CookingLog.cooked_at) == shortlist_date,
        )
    )
    if cook_count and cook_count > 0:
        raise HTTPException(409, "veto_window_closed")

    # 5. Snapshot the broadcast payload BEFORE delete.
    payload = {
        "vote_id": str(vote.id),
        "shortlist_id": str(vote.shortlist_id),
        "recipe_id": str(vote.recipe_id),
        "member_id": str(vote.member_id),
        "shortlist_date": shortlist_date.isoformat(),
    }

    # 6. Delete + commit.
    db.delete(vote)
    db.commit()

    # 7. Broadcast.
    await broadcast_to_household(member.household_id, "vote.deleted", payload)
    return None
