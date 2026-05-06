"""Recipe library API (plan 01-08).

Endpoints:

* ``POST /recipes``         — RECIPE-01 full-form create (status='structured')
* ``POST /recipes/quick``   — RECIPE-02 title-only quick add (status='draft')
* ``GET  /recipes``         — RECIPE-03 / 06 list w/ ILIKE search + status filter
* ``GET  /recipes/{id}``    — RECIPE-04 detail (404 on cross-household, no leak)
* ``PUT  /recipes/{id}``    — RECIPE-05 patch (source_capture preserved)

Architecture invariants enforced here:

* CLAUDE.md #4 — every household-syncing mutation broadcasts via
  ``broadcast_to_household``. We emit ``recipe.created`` on POST + POST /quick
  and ``recipe.updated`` on PUT. The latter is a NEW event type beyond
  REALTIME-02's original list (``recipe.created`` / ``recipe.promoted`` /
  ``vote.created``); the rationale is logged in 01-08-SUMMARY.md so future
  planners treat the four-event vocabulary (``+ recipe.promoted`` in W2,
  ``+ vote.created`` in W3) as authoritative.
* CLAUDE.md #5 — ``source_capture`` is set at create time and NEVER
  overwritten via PUT. Defense-in-depth: ``RecipeUpdate`` schema has no such
  field; the update handler also blocklist-strips it if seen.
* D-03 — text search is ``WHERE title ILIKE :q OR ingredients::text ILIKE :q``
  with ``:q`` formatted as ``%query%``. No pg_trgm, no FTS.

Cross-household isolation: every read/write filters by ``member.household_id``.
A member of A cannot read/edit/list recipes of B. Detail endpoint returns 404
(not 403) on cross-household to avoid leaking existence (T-01-08-04).

NOT in scope:

* DELETE /recipes/{id} — soft/hard delete is productize-later (UI-SPEC marks
  "Supprimer cette recette" as v0.2 affordance).
* POST /recipes/{id}/photos — owned by plan 01-09 (separate router file so
  this plan and 01-09 can land in parallel).
* cook_count + last_cooked_at — owned by W3 cooking-log handler.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Text, cast, or_, select
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.member import Member
from app.models.recipe import Recipe
from app.schemas.recipe import (
    RecipeFullCreate,
    RecipeQuickCreate,
    RecipeResponse,
    RecipeUpdate,
)
from app.services.realtime import broadcast_to_household

router = APIRouter(prefix="/recipes", tags=["recipes"])


# Fields the update handler must NEVER touch — defense-in-depth even though
# RecipeUpdate doesn't define these. Order: invariant-5 (source_capture),
# 01-09-owned (photo_paths), W3-owned (cook_count/last_cooked_at), and the
# write-once relationship/identity columns.
_UPDATE_FORBIDDEN_FIELDS = frozenset({
    "source_capture",
    "photo_paths",
    "cook_count",
    "last_cooked_at",
    "household_id",
    "created_by_member_id",
    "id",
    "created_at",
})


def _to_response_payload(r: Recipe) -> dict:
    """Serialize a Recipe row to the wire shape used by both HTTP and WS.

    Keeping HTTP responses and WS broadcast payloads byte-identical means the
    frontend has one parser for both surfaces (plan 01-10).
    """
    return RecipeResponse.model_validate(r).model_dump(mode="json")


def _coerce_enum_value(value):
    """Strip the ``str, Enum`` mixin off a Pydantic-coerced enum value.

    SQLAlchemy ``ARRAY(Text)`` / ``Text`` columns want plain strings; the
    Pydantic schema deliberately uses the enum types so input validation runs.
    """
    return value.value if hasattr(value, "value") else value


@router.post(
    "",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_full(
    body: RecipeFullCreate,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """RECIPE-01 — full-form create. Server stamps ``status='structured'``."""

    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="structured",
        title=body.title,
        # Invariant 5: full payload kept verbatim so the W2 LLM-promotion path
        # has the original input forever.
        source_capture={"type": "manual", "payload": body.model_dump(mode="json")},
        ingredients=[i.model_dump() for i in body.ingredients] or None,
        steps=body.steps or None,
        prep_time_minutes=body.prep_time_minutes,
        servings=body.servings,
        cuisine=body.cuisine.value if body.cuisine else None,
        mood=[m.value for m in body.mood] or [],
        main_protein=body.main_protein.value if body.main_protein else None,
        seasonality=[s.value for s in body.seasonality]
        or ["spring", "summer", "autumn", "winter"],
        tags=body.tags or [],
        photo_paths=[],
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    payload = _to_response_payload(recipe)
    # REALTIME-02: every household-syncing mutation broadcasts.
    await broadcast_to_household(member.household_id, "recipe.created", payload)
    return RecipeResponse.model_validate(recipe)


@router.post(
    "/quick",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_quick(
    body: RecipeQuickCreate,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """RECIPE-02 — title-only quick add. Server stamps ``status='draft'``.

    Photo upload is a separate ``POST /recipes/{id}/photos`` call in plan 01-09;
    the FE chains the two when a photo was attached at quick-add time.
    """

    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title=body.title,
        source_capture={"type": "manual", "payload": body.model_dump()},
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    payload = _to_response_payload(recipe)
    await broadcast_to_household(member.household_id, "recipe.created", payload)
    return RecipeResponse.model_validate(recipe)


@router.get("", response_model=List[RecipeResponse])
def list_recipes(
    q: Optional[str] = Query(default=None, max_length=200),
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        pattern="^(draft|structured|verified)$",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> List[RecipeResponse]:
    """RECIPE-03 (search) + RECIPE-06 (drafts inbox).

    ``?status=draft`` is the query backing the bottom-nav ``À compléter (N)``
    badge in 01-10. ``?q=`` runs ILIKE on the title and on the cast-to-text
    ingredients JSONB per D-03 — no pg_trgm, no FTS.
    """

    stmt = select(Recipe).where(Recipe.household_id == member.household_id)
    if status_filter:
        stmt = stmt.where(Recipe.status == status_filter)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Recipe.title.ilike(pattern),
                cast(Recipe.ingredients, Text).ilike(pattern),
            )
        )
    stmt = stmt.order_by(Recipe.created_at.desc()).limit(limit).offset(offset)
    rows = db.scalars(stmt).all()
    return [RecipeResponse.model_validate(r) for r in rows]


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """RECIPE-04 — household-scoped detail.

    Returns 404 (not 403) when the recipe exists in another household — same
    response as a nonexistent id, so cross-household existence cannot be
    probed (T-01-08-04 elevation-of-privilege guard).
    """

    r = db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        )
    )
    if r is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found"
        )
    return RecipeResponse.model_validate(r)


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: UUID,
    body: RecipeUpdate,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """RECIPE-05 — patch-style update. Source_capture preserved (invariant 5).

    Only the fields in the request body are touched. ``source_capture``,
    ``photo_paths``, ``cook_count``, ``last_cooked_at`` and the identity
    columns are blocklist-stripped even if seen — defense-in-depth in case
    the schema gains those fields by mistake later.
    """

    r = db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        )
    )
    if r is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found"
        )

    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in _UPDATE_FORBIDDEN_FIELDS:
            continue
        if key in ("cuisine", "main_protein") and value is not None:
            value = _coerce_enum_value(value)
        elif key in ("mood", "seasonality") and value is not None:
            value = [_coerce_enum_value(v) for v in value]
        elif key == "ingredients" and value is not None:
            value = [
                (i.model_dump() if hasattr(i, "model_dump") else i) for i in value
            ]
        setattr(r, key, value)

    r.updated_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(r)

    payload = _to_response_payload(r)
    # NEW event type beyond REALTIME-02's original list — see module docstring.
    await broadcast_to_household(member.household_id, "recipe.updated", payload)
    return RecipeResponse.model_validate(r)
