"""Shortlist router — GET /shortlists/today, POST /shortlists/regenerate,
POST /shortlists/{shortlist_id}/delegate.

All endpoints use cookie-first auth via Depends(current_member). Cross-
household IDs return 404 (not 403) — T-01-08-04 mitigation pattern.
"""
from __future__ import annotations

import logging
from datetime import date as DateType
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.daily_shortlist import DailyShortlist
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.vote import Vote
from app.schemas.recipe import RecipeResponse
from app.schemas.shortlist import (
    RegenerateRequest,
    ShortlistResponse,
    ShortlistVote,
)
from app.services.realtime import broadcast_to_household
from app.services.shortlist import generate_daily_shortlist
from app.services.voting import compute_vote_state

log = logging.getLogger(__name__)
router = APIRouter(prefix="/shortlists", tags=["shortlists"])


def _serialize_shortlist(
    shortlist: DailyShortlist, db: Session
) -> ShortlistResponse:
    """Build ShortlistResponse from a DailyShortlist row."""
    # Fetch recipes (preserving the order in shortlist.recipe_ids)
    if shortlist.recipe_ids:
        recipes_unordered = list(
            db.scalars(
                select(Recipe).where(Recipe.id.in_(shortlist.recipe_ids))
            ).all()
        )
        by_id = {r.id: r for r in recipes_unordered}
        recipes = [by_id[rid] for rid in shortlist.recipe_ids if rid in by_id]
    else:
        recipes = []

    # Fetch all votes for this shortlist
    votes = list(
        db.scalars(select(Vote).where(Vote.shortlist_id == shortlist.id)).all()
    )

    return ShortlistResponse(
        shortlist_id=shortlist.id,
        date=shortlist.date,
        generation=shortlist.generation,
        recipes=[RecipeResponse.model_validate(r) for r in recipes],
        votes=[
            ShortlistVote(
                shortlist_id=v.shortlist_id,
                recipe_id=v.recipe_id,
                member_id=v.member_id,
                vote=v.vote if isinstance(v.vote, str) else v.vote.value,
            )
            for v in votes
        ],
    )


@router.get("/today", response_model=ShortlistResponse | None)
def get_today_shortlist(
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """Latest generation for today, or null if none exists yet."""
    today = DateType.today()
    shortlist = db.scalar(
        select(DailyShortlist)
        .where(
            DailyShortlist.household_id == member.household_id,
            DailyShortlist.date == today,
        )
        .order_by(DailyShortlist.generation.desc())
        .limit(1)
    )
    if shortlist is None:
        return None
    return _serialize_shortlist(shortlist, db)


@router.post("/regenerate", response_model=ShortlistResponse)
async def regenerate(
    body: RegenerateRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """SHORTLIST-02: regenerate today's shortlist with optional filters.
    Increments generation; previous generations remain in the table.
    """
    today = DateType.today()
    last_gen = db.scalar(
        select(func.coalesce(func.max(DailyShortlist.generation), 0)).where(
            DailyShortlist.household_id == member.household_id,
            DailyShortlist.date == today,
        )
    )
    new_gen = (last_gen or 0) + 1
    shortlist = await generate_daily_shortlist(
        member.household_id,
        db=db,
        filters=body.model_dump(exclude_none=True),
        generation=new_gen,
    )
    if shortlist is None:
        raise HTTPException(
            status_code=404,
            detail="empty corpus or no recipes match filters",
        )
    return _serialize_shortlist(shortlist, db)


@router.post("/{shortlist_id}/delegate", response_model=ShortlistResponse)
async def delegate(
    shortlist_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """VOTE-03 + D-12: append `yes` for every recipe in shortlist.recipe_ids
    for the requesting member. Existing yes votes are no-ops; existing no
    votes flip to yes via on_conflict_do_update.
    """
    shortlist = db.get(DailyShortlist, shortlist_id)
    if shortlist is None or shortlist.household_id != member.household_id:
        raise HTTPException(404, "shortlist not found")

    if not shortlist.recipe_ids:
        return _serialize_shortlist(shortlist, db)

    rows = [
        {
            "shortlist_id": shortlist_id,
            "recipe_id": rid,
            "member_id": member.id,
            "vote": "yes",
        }
        for rid in shortlist.recipe_ids
    ]
    stmt = pg_insert(Vote).values(rows).on_conflict_do_update(
        index_elements=["shortlist_id", "recipe_id", "member_id"],
        set_={"vote": "yes", "created_at": func.now()},
    )
    db.execute(stmt)
    db.commit()

    # Fan out 5 individual vote.created events so the existing frontend
    # vote.created handler stays uniform (Pattern 6 recommendation).
    member_count = (
        db.scalar(
            select(func.count(Member.id)).where(
                Member.household_id == member.household_id
            )
        )
        or 2
    )
    for rid in shortlist.recipe_ids:
        votes_for_recipe = list(
            db.scalars(
                select(Vote).where(
                    Vote.shortlist_id == shortlist_id, Vote.recipe_id == rid
                )
            ).all()
        )
        state = compute_vote_state(votes_for_recipe, member_count)
        await broadcast_to_household(
            member.household_id,
            "vote.created",
            {
                "shortlist_id": str(shortlist_id),
                "recipe_id": str(rid),
                "member_id": str(member.id),
                "vote": "yes",
                "state": state.value,
            },
        )

    return _serialize_shortlist(shortlist, db)
