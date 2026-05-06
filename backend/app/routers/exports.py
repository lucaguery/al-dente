"""RECIPE-08 — JSON export of the household's recipe library.

Productize-later disaster-recovery hook: the "owner leaves household" /
"household split" workflow isn't supported in v0.1 except by exporting the
library here and re-importing manually elsewhere. Per CONTEXT.md
"JSON export shape":

* Single ``recipes.json`` blob (top-level ``{"recipes": [...]}``).
* Each recipe matches the same ``RecipeResponse`` shape used by the API.
* ``photo_paths`` are STRINGS (Supabase storage paths). Raw photo bytes are
  NOT included — disaster recovery copies the bucket separately.
* Cooking-logs and votes are NOT included (don't exist yet in W1 anyway).
* ``Content-Disposition: attachment`` so Safari's "Add to Files" prompts.

Cross-household isolation: the path-param ``household_id`` MUST match the
bearer's ``member.household_id``. Mismatch returns 404 (not 403) so existence
of other households can't be probed (T-01-08-06).
"""

from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.member import Member
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeResponse

router = APIRouter(prefix="/households", tags=["households-export"])


@router.get("/{household_id}/export.json")
def export_recipes(
    household_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> Response:
    """Return the household's recipe library as a JSON attachment."""

    if household_id != member.household_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="household not found"
        )

    rows = db.scalars(
        select(Recipe).where(Recipe.household_id == member.household_id)
    ).all()

    # Same RecipeResponse shape the API serves on every read endpoint.
    data = [RecipeResponse.model_validate(r).model_dump(mode="json") for r in rows]
    body = json.dumps(
        {"recipes": data}, ensure_ascii=False, indent=2
    ).encode("utf-8")

    filename = f"al-dente-recipes-{household_id}.json"
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
