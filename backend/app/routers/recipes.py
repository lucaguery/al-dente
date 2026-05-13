"""Recipe library API (plan 01-08). Phase 25 cutover to recipe_turns.

Endpoints:

* ``POST /recipes``         — RECIPE-01 full-form create (status='draft' → promotes)
* ``POST /recipes/quick``   — RECIPE-02 title-only quick add (status='draft' → promotes)
* ``GET  /recipes``         — RECIPE-03 / 06 list w/ ILIKE search + status filter
* ``GET  /recipes/{id}``    — RECIPE-04 detail (404 on cross-household, no leak)
* ``PUT  /recipes/{id}``    — RECIPE-05 patch

Architecture invariants enforced here:

* CLAUDE.md #4 — every household-syncing mutation broadcasts via
  ``broadcast_to_household``. We emit ``recipe.created`` on POST + POST /quick
  and ``recipe.updated`` on PUT.
* CLAUDE.md #5 — raw inputs kept forever in ``recipe_turns`` (Phase 25). Each
  POST handler inserts a position=0 user turn (kind=text/voice/photo/url) before
  committing. The turn payload preserves the original capture input verbatim.
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

import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import Text, cast, delete as sa_delete, or_, select
from sqlalchemy.orm import Session

from app.auth import current_member
from app.db import get_db
from app.models.cooking_log import CookingLog
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn
from app.models.vote import Vote
from app.schemas.recipe import (
    PromotionRetryResponse,
    RecipeFullCreate,
    RecipeQuickCreate,
    RecipeResponse,
    RecipeUpdate,
    UrlCaptureRequest,
    VoiceCaptureRequest,
    VoiceModifyRequest,
)
from app.services import storage as storage_service
from app.services.llm import (
    apply_voice_modification,
    promote_draft,
    retry_promotion,
)
from app.services.realtime import broadcast_to_household
from app.services.storage import MAX_BYTES, upload_recipe_photo

log = logging.getLogger(__name__)

router = APIRouter(prefix="/recipes", tags=["recipes"])


# Fields the update handler must NEVER touch — defense-in-depth even though
# RecipeUpdate doesn't define these. Order: Phase 28 DETAIL-05 (manually_edited_fields),
# 01-09-owned (photo_paths), W3-owned (cook_count/last_cooked_at), and the
# write-once relationship/identity columns.
_UPDATE_FORBIDDEN_FIELDS = frozenset({
    "manually_edited_fields",  # Phase 28 DETAIL-05 owns the write path
    "photo_paths",
    "cook_count",
    "last_cooked_at",
    "household_id",
    "created_by_member_id",
    "id",
    "created_at",
})

# Gemini inline-image cap is 20 MB per request; budget 18 MB for the photos
# alone (2 MB headroom for prompt text). Phase 2 02-CONTEXT photo upload guard.
GEMINI_PHOTO_TOTAL_BYTES_CAP = 18 * 1024 * 1024
MAX_PHOTOS_PER_CAPTURE = 4


def _first_turn_kind(db: Session, recipe_id: UUID) -> str | None:
    """Return the kind of the first user turn for a recipe, or None if absent.

    Phase 25 — synthesized server-side to populate RecipeResponse.initial_turn_kind.
    The UNIQUE index on (recipe_id, position) makes this a single O(1) lookup.
    """
    return db.scalar(
        select(RecipeTurn.kind).where(
            RecipeTurn.recipe_id == recipe_id,
            RecipeTurn.sender == "user",
            RecipeTurn.position == 0,
        )
    )


def _to_response(r: Recipe, initial_turn_kind: str | None = None) -> RecipeResponse:
    """Build a RecipeResponse, injecting the synthesized initial_turn_kind field."""
    resp = RecipeResponse.model_validate(r)
    resp.initial_turn_kind = initial_turn_kind
    return resp


def _to_response_payload(r: Recipe, initial_turn_kind: str | None = None) -> dict:
    """Serialize a Recipe row to the wire shape used by both HTTP and WS.

    Keeping HTTP responses and WS broadcast payloads byte-identical means the
    frontend has one parser for both surfaces (plan 01-10).
    """
    return _to_response(r, initial_turn_kind).model_dump(mode="json")


def _coerce_enum_value(value):
    """Strip the ``str, Enum`` mixin off a Pydantic-coerced enum value.

    SQLAlchemy ``ARRAY(Text)`` / ``Text`` columns want plain strings; the
    Pydantic schema deliberately uses the enum types so input validation runs.
    """
    return value.value if hasattr(value, "value") else value


def _cleanup_partial_uploads(paths: list[str]) -> None:
    """WR-02 — best-effort delete of Storage blobs after a partial-upload failure.

    Called from POST /recipes/photo when one of N uploads raises after some
    have succeeded. The recipe row is rolled back in the same except block,
    so leftover blobs have no DB referent and would orphan in Supabase. We
    swallow per-path delete errors so the original upload exception still
    surfaces to the client.
    """
    if not paths:
        return
    try:
        bucket = storage_service._supabase().storage.from_(storage_service.BUCKET)
        bucket.remove(paths)
    except Exception:  # noqa: BLE001 — cleanup is best-effort
        log.warning(
            "partial-upload cleanup failed for paths=%s", paths, exc_info=True
        )


@router.post(
    "",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_full(
    body: RecipeFullCreate,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """RECIPE-01 — full-form create.

    Phase 25 cutover: inserts a position=0 text turn (D-12) before committing.
    The BackgroundTask (promote_draft) reads that turn and rewrites the title.
    CLAUDE.md invariant #5 preserved — original title kept in the turn payload.
    """
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title=body.title,
        ingredients=[i.model_dump() for i in body.ingredients] or None,
        steps=body.steps or None,
        prep_time_minutes=body.prep_time_minutes,
        # Phase 24 RID-02 — three new optional recipe-identity fields.
        cook_time_minutes=body.cook_time_minutes,
        difficulty=body.difficulty,
        description=body.description,
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
    db.flush()  # need recipe.id for turn FK

    # Phase 25 D-12 — text turn; payload preserves the user's original title.
    turn = RecipeTurn(
        recipe_id=recipe.id,
        position=0,
        sender="user",
        kind="text",
        payload={"text": body.title},
    )
    db.add(turn)
    db.commit()
    db.refresh(recipe)

    payload = _to_response_payload(recipe, initial_turn_kind="text")
    # REALTIME-02: recipe.created broadcasts sync; recipe.promoted from task.
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    # Queue promote_draft — opens its own SessionLocal (RESEARCH §Pitfall 3).
    background_tasks.add_task(promote_draft, recipe.id)

    return _to_response(recipe, initial_turn_kind="text")


@router.post(
    "/quick",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_quick(
    body: RecipeQuickCreate,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """RECIPE-02 — title-only quick add. Server stamps ``status='draft'``.

    Phase 25 cutover: inserts a position=0 text turn (D-12) before committing.
    The original title is preserved in the turn payload (invariant #5); recipe.title
    is overwritten by the catchy rewrite on promote_draft success.

    Photo upload remains a separate ``POST /recipes/{id}/photos`` call.
    """
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title=body.title,
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.flush()  # need recipe.id for turn FK

    # Phase 25 D-12 — text turn; payload preserves the user's original title.
    turn = RecipeTurn(
        recipe_id=recipe.id,
        position=0,
        sender="user",
        kind="text",
        payload={"text": body.title},
    )
    db.add(turn)
    db.commit()
    db.refresh(recipe)

    payload = _to_response_payload(recipe, initial_turn_kind="text")
    # recipe.created broadcasts sync; recipe.promoted from the BackgroundTask.
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    # Queue promote_draft — opens its own SessionLocal (RESEARCH §Pitfall 3).
    background_tasks.add_task(promote_draft, recipe.id)

    return _to_response(recipe, initial_turn_kind="text")


@router.get("", response_model=List[RecipeResponse])
def list_recipes(
    q: Optional[str] = Query(default=None, max_length=200),
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        # Phase 16 CAP-01: accepts the new 'failed' terminal state added in
        # Plan 16-01 / migration 0006. The inbox refetches with status=draft
        # AND status=failed in Plan 16-04 so the failed cards remain in /inbox.
        pattern="^(draft|structured|verified|failed)$",
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

    # Phase 25 — populate initial_turn_kind via a single subquery (avoids N+1).
    # Recipes with no initial user turn still appear (initial_turn_kind=None).
    recipe_ids = [r.id for r in rows]
    if recipe_ids:
        first_turn_subq = (
            select(RecipeTurn.recipe_id, RecipeTurn.kind)
            .where(
                RecipeTurn.sender == "user",
                RecipeTurn.position == 0,
                RecipeTurn.recipe_id.in_(recipe_ids),
            )
            .subquery()
        )
        kind_rows = db.execute(
            select(first_turn_subq.c.recipe_id, first_turn_subq.c.kind)
        ).all()
        kind_by_recipe_id = {str(row.recipe_id): row.kind for row in kind_rows}
    else:
        kind_by_recipe_id = {}

    return [
        _to_response(r, initial_turn_kind=kind_by_recipe_id.get(str(r.id)))
        for r in rows
    ]


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
    kind = _first_turn_kind(db, r.id)
    return _to_response(r, initial_turn_kind=kind)


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: UUID,
    body: RecipeUpdate,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """RECIPE-05 — patch-style update.

    Only the fields in the request body are touched. ``manually_edited_fields``,
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

    kind = _first_turn_kind(db, r.id)
    payload = _to_response_payload(r, initial_turn_kind=kind)
    await broadcast_to_household(member.household_id, "recipe.updated", payload)
    return _to_response(r, initial_turn_kind=kind)


# --- Phase 2 capture surfaces (W2, plan 02-02) -----------------------------


@router.post(
    "/voice",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_voice(
    body: VoiceCaptureRequest,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """CAPTURE-01 — voice capture. Creates a draft synchronously, queues
    Gemini promotion via BackgroundTask. The promotion task broadcasts
    ``recipe.promoted`` on success or writes ``promotion_error`` on failure.

    Phase 25 cutover: inserts a position=0 voice turn (D-12) with the transcript
    in the payload before committing. promote_draft reads the turn to extract.

    Note: per Phase 2 critical decision, the transcript arrives as plain text
    (frontend uses a textarea + iOS keyboard dictation). NO Web Speech API.
    """
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title="(extraction en cours…)",  # placeholder until BackgroundTask promotes
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.flush()  # need recipe.id for turn FK

    # Phase 25 D-12 — voice turn; transcript preserved in payload (invariant #5).
    turn = RecipeTurn(
        recipe_id=recipe.id,
        position=0,
        sender="user",
        kind="voice",
        payload={"transcript": body.transcript},
    )
    db.add(turn)
    db.commit()
    db.refresh(recipe)

    # Broadcast so partner phones see the placeholder card with spinner state.
    payload = _to_response_payload(recipe, initial_turn_kind="voice")
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    # Queue promote_draft — opens its own SessionLocal (RESEARCH §Pitfall 3).
    background_tasks.add_task(promote_draft, recipe.id)
    return _to_response(recipe, initial_turn_kind="voice")


@router.post(
    "/photo",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_photo(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """CAPTURE-02 — photo capture. 1-4 images, each <=8 MB, total <=18 MB.

    Phase 25 D-08: uploads photos to Supabase Storage IN THE ROUTER before
    creating the turn. Storage paths land in BOTH recipes.photo_paths AND the
    photo turn payload. promote_draft downloads bytes via download_recipe_photo.
    """
    if not files or len(files) < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="at least one photo required",
        )
    if len(files) > MAX_PHOTOS_PER_CAPTURE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="at most 4 photos accepted",
        )

    # Read all bytes up-front; enforce per-file + total caps.
    contents: list[bytes] = []
    total = 0
    for f in files:
        data = await f.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"photo exceeds {MAX_BYTES} bytes",
            )
        if not data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="empty photo",
            )
        total += len(data)
        if total > GEMINI_PHOTO_TOTAL_BYTES_CAP:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    "combined photo size exceeds Gemini 18 MB cap; "
                    "use fewer or smaller photos"
                ),
            )
        contents.append(data)

    # Create the draft record.
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title="(extraction en cours…)",
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.flush()  # need recipe.id for Storage path + turn FK

    # D-08: upload bytes to Supabase Storage BEFORE creating the turn.
    # Path is server-generated (T-25-06 path-traversal guard).
    # WR-02: if a later upload in the loop raises, best-effort delete the
    # already-uploaded blobs — otherwise they orphan in Supabase Storage
    # (the recipe row is rolled back, so they have no DB referent).
    paths: list[str] = []
    try:
        for content in contents:
            path = upload_recipe_photo(
                household_id=member.household_id,
                recipe_id=recipe.id,
                content=content,
            )
            paths.append(path)
    except ValueError as exc:
        _cleanup_partial_uploads(paths)
        db.rollback()
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
    except Exception:
        # Any other exception (Supabase network error, etc.) — same cleanup contract.
        _cleanup_partial_uploads(paths)
        db.rollback()
        raise

    # Paths go into BOTH recipes.photo_paths AND the photo turn payload (D-10).
    recipe.photo_paths = paths

    # Phase 25 D-10 — photo turn with photo_paths in payload (same paths as above).
    turn = RecipeTurn(
        recipe_id=recipe.id,
        position=0,
        sender="user",
        kind="photo",
        payload={"photo_paths": paths},
    )
    db.add(turn)
    db.commit()
    db.refresh(recipe)

    payload = _to_response_payload(recipe, initial_turn_kind="photo")
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    # promote_draft downloads bytes from Storage via download_recipe_photo (D-08).
    background_tasks.add_task(promote_draft, recipe.id)
    return _to_response(recipe, initial_turn_kind="photo")


@router.post(
    "/url",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_url(
    body: UrlCaptureRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """CAPTURE-03 — URL paste. NO Gemini call in Phase 25; URL extraction is
    Phase 26 TURN-04. The URL is stored in the turn payload (invariant #5).

    # TODO(productize): URL fetch + Gemini extraction (CAPTURE-03 deferred — Phase 26).
    """
    # Best-effort URL syntax check — catches obvious typos. Heavy validation
    # is the frontend's job (see plan 04-03 url tab).
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="url must start with http:// or https://",
        )

    # Title placeholder — drafts inbox row shows the URL host as a hint.
    # WR-01: cap at 200 chars to match RecipeUpdate.title's max_length=200, so
    # later PUTs to this row (which often re-submit the existing title) don't
    # 422. Full URL is preserved verbatim in the turn payload (invariant #5).
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title=url[:200],  # better than "(extraction…)" since extraction is deferred
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.flush()  # need recipe.id for turn FK

    # Phase 25 D-11 — url turn; URL preserved in payload (invariant #5).
    # No BackgroundTask queued — URL extraction is Phase 26 TURN-04.
    turn = RecipeTurn(
        recipe_id=recipe.id,
        position=0,
        sender="user",
        kind="url",
        payload={"url": url},
    )
    db.add(turn)
    db.commit()
    db.refresh(recipe)

    payload = _to_response_payload(recipe, initial_turn_kind="url")
    await broadcast_to_household(member.household_id, "recipe.created", payload)
    return _to_response(recipe, initial_turn_kind="url")


@router.post(
    "/{recipe_id}/voice-modify",
    # Returns the GeminiExtractedRecipe shape; no Recipe row mutation.
    response_model=None,
    status_code=status.HTTP_200_OK,
)
def voice_modify(
    recipe_id: UUID,
    body: VoiceModifyRequest,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> dict:
    """CAPTURE-05 — voice modification. Synchronous Gemini call; returns the
    modified fields to the FE. Does NOT persist — the user reviews via the
    edit form and saves via PUT /recipes/{id}.

    Cross-household: 404 (consistent with /{id} and /{id} PUT)."""

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

    # Pass the existing recipe as JSON to Gemini. Use the response wire
    # shape so Gemini sees the same fields the FE renders.
    recipe_json = _to_response_payload(recipe)
    try:
        extracted = apply_voice_modification(recipe_json, body.transcript)
    except Exception as exc:  # noqa: BLE001 — Gemini errors mapped to 502
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"gemini error: {str(exc)[:200]}",
        ) from exc

    # Return the parsed shape verbatim — frontend places into edit form.
    return extracted.model_dump(mode="json")


@router.post(
    "/{recipe_id}/retry-promotion",
    response_model=PromotionRetryResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_promote(
    recipe_id: UUID,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> PromotionRetryResponse:
    """Phase 16 D-16-05 — retry a failed promotion. Resets the row from
    `failed` to `draft` (so the FE refetch sees the in-flight/spinner
    variant) and clears `promotion_error`, then queues retry_promotion
    which wraps promote_draft (Phase 25 D-09 collapse).

    Idempotency contract: retrying a recipe already in `structured` is a
    no-op 202 (status untouched; we still queue retry_promotion but the
    BackgroundTask body short-circuits on non-failed input). Retrying a
    recipe in `draft` (e.g. mid-flight) is also a no-op 202.

    Returns 404 for cross-household or missing recipes — existence not
    leaked (matches the contract on GET /{id}).
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

    # Phase 16 D-16-04 / D-16-06: reset failed → draft so the FE inbox row
    # flips from the failed variant to the in-flight/spinner variant.
    if recipe.status == "failed":
        recipe.status = "draft"
    # Clear the error optimistically so the FE inbox row swaps variants.
    recipe.promotion_error = None
    db.commit()
    db.refresh(recipe)

    # Broadcast the "in flight" state so the partner's inbox row also flips.
    kind = _first_turn_kind(db, recipe.id)
    payload = _to_response_payload(recipe, initial_turn_kind=kind)
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    background_tasks.add_task(retry_promotion, recipe.id)
    return PromotionRetryResponse(recipe_id=recipe.id, queued=True)


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe(
    recipe_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> None:
    """Hard-delete a recipe and its FK-constrained children (votes, cooking logs).

    Returns 404 for cross-household or missing recipes so existence isn't leaked.
    Broadcasts recipe.deleted so both clients remove it from their local state.
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

    # Delete FK-constrained rows first (no ondelete=CASCADE on these FKs).
    db.execute(sa_delete(Vote).where(Vote.recipe_id == recipe_id))
    db.execute(sa_delete(CookingLog).where(CookingLog.recipe_id == recipe_id))
    db.delete(recipe)
    db.commit()

    await broadcast_to_household(
        member.household_id, "recipe.deleted", {"id": str(recipe_id)}
    )
