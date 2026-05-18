"""RECIPE-07 — photo upload via multipart-through-backend (plan 01-09).

POST ``/recipes/{recipe_id}/photos`` takes one ``file`` form field, validates
size + MIME by magic-byte sniff, uploads to Supabase Storage, appends the
returned path to ``recipes.photo_paths`` in the same DB transaction, and
broadcasts ``recipe.updated`` so the partner's phone re-renders the gallery.

# TODO(productize): D-02 — switch to presigned Supabase PUT URLs at W2 or W4
# if Railway egress shows up in metrics. Until then, multipart-through-backend
# is the simpler debug story.

Encoded contracts:

* SPEC.md: ``photo_paths`` ≤ 4 entries — enforced by ``MAX_PHOTOS_PER_RECIPE``.
* CONTEXT.md D-02: storage path layout ``recipe-photos/{household_id}/{recipe_id}/{uuid}.{ext}``
  (bucket prefix is implicit — handler stores the relative-to-bucket path).
* CLAUDE.md invariant 4: ``recipe.updated`` broadcast piggybacks on the event
  vocabulary 01-08 added.
* T-01-09-05: cross-household reads/writes return 404 (not 403) so existence
  cannot be probed.

The router lives in its own file (not a slot inside ``recipes.py``) so 01-08
and 01-09 can land in parallel without merge conflict on the same file.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.member import Member
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeResponse
from app.services.realtime import broadcast_to_household
from app.services.storage import (
    MAX_BYTES,
    SIGNED_URL_TTL_SECONDS,
    StorageObjectNotFound,
    create_signed_photo_url,
    upload_recipe_photo,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/recipes", tags=["recipes-photos"])

MAX_PHOTOS_PER_RECIPE = 4  # SPEC.md: photo_paths ≤ 4


@router.post(
    "/{recipe_id}/photos",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_photo(
    recipe_id: UUID,
    file: UploadFile = File(...),
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """Append a photo to a recipe.

    Returns the updated recipe (same shape as ``GET /recipes/{id}``) so the FE
    can drop the response into its store without a follow-up read.
    """
    # 1. Recipe MUST belong to the requester's household.
    # 404 (not 403) on cross-household — T-01-09-05 / consistent with 01-08.
    recipe = db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        )
    )
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found"
        )

    # 2. 4-photo cap — SPEC.md ≤ 4. UI copy: "Maximum 4 photos par recette."
    current_paths = list(recipe.photo_paths or [])
    if len(current_paths) >= MAX_PHOTOS_PER_RECIPE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="photo limit reached",
        )

    # 3. Read with the size cap. Reading MAX_BYTES + 1 lets us detect oversize
    # without exhausting memory if the client streams a huge body.
    content = await file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"file exceeds {MAX_BYTES} bytes",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="empty upload"
        )

    # 4. Validate magic bytes + upload. ValueError ⇒ specific HTTP code.
    try:
        path = upload_recipe_photo(
            household_id=member.household_id,
            recipe_id=recipe.id,
            content=content,
        )
    except ValueError as exc:
        if str(exc) == "oversize":
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="oversize",
            ) from exc
        if str(exc) == "unsupported":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="unsupported media",
            ) from exc
        raise

    # 5. Append to photo_paths in the same DB tx as the upload (D-02 contract).
    # Reassigning the list (not in-place append) so SQLAlchemy detects the
    # change on the ARRAY(Text) column.
    recipe.photo_paths = current_paths + [path]
    db.commit()
    db.refresh(recipe)

    # 6. Broadcast — partner's phone re-renders the gallery.
    payload = RecipeResponse.model_validate(recipe).model_dump(mode="json")
    await broadcast_to_household(
        member.household_id, "recipe.updated", payload
    )
    return RecipeResponse.model_validate(recipe)


@router.get("/{recipe_id}/photo-url")
def signed_photo_url(
    recipe_id: UUID,
    path: str = Query(..., min_length=1, max_length=300),
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> dict:
    """RECIPE-04 read counterpart of RECIPE-07 (plan 01-10).

    Returns a 5-minute signed URL the FE drops into ``<img src=...>``. The
    ``recipe-photos`` bucket is private (Public=OFF), so anonymous reads fail;
    the FE refreshes the URL on each detail-page mount per
    ``SIGNED_URL_TTL_SECONDS``.

    Authorization (T-01-10-01 mitigation):

    1. The recipe MUST live in the requester's household — 404 otherwise
       (matches the 01-08 / 01-09 cross-household policy: 404, not 403, so
       existence cannot be probed).
    2. The ``path`` query MUST be one of the values in ``recipe.photo_paths``.
       Without this check, a member could mint signed URLs for arbitrary
       bucket objects belonging to OTHER recipes inside the SAME household
       (or, with knowledge of any uuid layout, ANY object — though in
       practice household_id is the first segment so cross-household reads
       were already gated by step 1).
    """
    recipe = db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        )
    )
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found"
        )
    if path not in (recipe.photo_paths or []):
        # Same 404 shape as a missing recipe — no probe of "is this path on
        # some other recipe in my household?" answerable.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="path not on recipe"
        )
    try:
        url = create_signed_photo_url(path)
    except StorageObjectNotFound:
        # Phase 34 LIVE-02 (B-02): the path was authorized (recipe + photo_paths
        # match) but Supabase Storage has no object at that path. Return 404
        # rather than letting the missing-object signal bubble to a 500 — the
        # frontend's useSignedPhotoUrl single-retry self-heal can then settle
        # cleanly on the placeholder branch. Warn (not error) so ops can spot
        # seed/upload drift without paging.
        log.warning(
            "signed_photo_url.storage_object_missing recipe=%s path=%s",
            recipe_id,
            path,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="storage object not found",
        ) from None
    return {"url": url, "expires_in": SIGNED_URL_TTL_SECONDS}
