"""Cooking-logs router — POST /recipes/{id}/cook + GET /cooking-logs/active.

COOK-01: "Je commence à cuisiner" creates an immutable CookingLog with
cooked_at = now(). Phase 4 will add the finalization PUT (photos, rating,
notes) and the same-tx denormalized update of recipes.last_cooked_at +
cook_count (architecture invariant #3, COOK-05).

COOK-02: GET /cooking-logs/active returns the unfinalized log for today's
household (rating IS NULL proxy per A5 in 03-RESEARCH.md), or null. Used
by the home banner.

Per Pattern 7: 409 Conflict if an unfinalized log already exists today.
"""
from __future__ import annotations

from datetime import date as DateType, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.cooking_log import CookingLog
from app.models.member import Member
from app.models.recipe import Recipe
from app.schemas.cooking_log import CookingLogResponse
from app.services.realtime import broadcast_to_household

# Two prefixes — POST is /recipes/{id}/cook (lives under /recipes for
# discoverability), GET is /cooking-logs/active. Use one router with no
# prefix and explicit paths.
router = APIRouter(tags=["cooking_logs"])


@router.post(
    "/recipes/{recipe_id}/cook",
    response_model=CookingLogResponse,
    status_code=201,
)
async def start_cooking(
    recipe_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """COOK-01: start a cooking session. Immutable insert; rating/notes/
    photos are added by Phase 4's finalization PUT.
    """
    recipe = db.get(Recipe, recipe_id)
    if recipe is None or recipe.household_id != member.household_id:
        raise HTTPException(404, "recipe not found")

    # 409 if an unfinalized session exists today for this household
    today = DateType.today()
    existing = db.scalar(
        select(CookingLog).where(
            CookingLog.household_id == member.household_id,
            func.date(CookingLog.cooked_at) == today,
            CookingLog.rating.is_(None),
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="another cooking session is active today",
        )

    log_row = CookingLog(
        recipe_id=recipe_id,
        household_id=member.household_id,
        cooked_by_member_id=member.id,
        cooked_at=datetime.now(timezone.utc),
    )
    db.add(log_row)
    db.commit()
    db.refresh(log_row)

    await broadcast_to_household(
        member.household_id,
        "cooking.started",
        {
            "log_id": str(log_row.id),
            "recipe_id": str(recipe_id),
            "cooked_by_member_id": str(member.id),
        },
    )
    return CookingLogResponse.model_validate(log_row)


@router.get(
    "/cooking-logs/active",
    response_model=CookingLogResponse | None,
)
def get_active_cooking_log(
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """COOK-02: today's unfinalized cooking log for the household, or null."""
    today = DateType.today()
    log_row = db.scalar(
        select(CookingLog).where(
            CookingLog.household_id == member.household_id,
            func.date(CookingLog.cooked_at) == today,
            CookingLog.rating.is_(None),
        )
    )
    if log_row is None:
        return None
    return CookingLogResponse.model_validate(log_row)
