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
from app.services.llm import (
    apply_voice_modification,
    promote_full_draft,
    promote_photo_draft,
    promote_quick_draft,
    promote_voice_draft,
    retry_promotion,
)
from app.services.realtime import broadcast_to_household
from app.services.storage import MAX_BYTES, upload_recipe_photo

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

# Gemini inline-image cap is 20 MB per request; budget 18 MB for the photos
# alone (2 MB headroom for prompt text). Phase 2 02-CONTEXT photo upload guard.
GEMINI_PHOTO_TOTAL_BYTES_CAP = 18 * 1024 * 1024
MAX_PHOTOS_PER_CAPTURE = 4


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
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """RECIPE-01 — full-form create.

    Phase 24 RID-04 D-24: shifted from sync status='structured'-on-return to
    async BackgroundTask. Now stamps status='draft', queues promote_full_draft
    which calls rewrite_title and flips to 'structured' with a catchy title.
    recipe.created still broadcasts sync at the router (D-31); the BackgroundTask
    emits recipe.promoted on success or rewrite-failure (per _record_rewrite_failure).
    CLAUDE.md invariant #1 updates in the same atomic commit as this change.
    Invariant #5: source_capture.payload.title preserves the user's original
    title forever; recipe.title is overwritten by the BackgroundTask's rewrite.
    """

    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",  # Phase 24 RID-04 D-24 — was "structured" pre-Phase-24.
        title=body.title,
        # Invariant 5: full payload kept verbatim — source_capture.payload.title
        # preserves the user's original title forever; recipe.title is overwritten
        # by the BackgroundTask's rewrite, but source_capture is never touched.
        source_capture={"type": "manual", "payload": body.model_dump(mode="json")},
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
    db.commit()
    db.refresh(recipe)

    payload = _to_response_payload(recipe)
    # REALTIME-02 / D-31: recipe.created broadcasts sync at the router;
    # recipe.promoted broadcasts from the BackgroundTask on success.
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    # Phase 24 RID-04 D-24 — queue rewrite. The task opens its own
    # SessionLocal (RESEARCH §Pitfall 3) and runs AFTER the response is sent.
    background_tasks.add_task(promote_full_draft, recipe.id)

    return RecipeResponse.model_validate(recipe)


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

    Phase 24 RID-04 D-24: rewrite_title runs in a BackgroundTask alongside the
    existing draft creation. The user's quick-typed title is preserved in
    source_capture.payload.title forever (invariant #5); recipe.title is
    overwritten by the catchy rewrite on success (D-29 — BackgroundTask wins).

    Photo upload remains a separate ``POST /recipes/{id}/photos`` call.
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
    # D-31: recipe.created broadcasts sync at the router; recipe.promoted
    # broadcasts from the BackgroundTask on success.
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    # Phase 24 RID-04 D-24 — queue rewrite (and downstream illustration in RID-05).
    background_tasks.add_task(promote_quick_draft, recipe.id)

    return RecipeResponse.model_validate(recipe)


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

    Note: per Phase 2 critical decision, the transcript arrives as plain text
    (frontend uses a textarea + iOS keyboard dictation). NO Web Speech API.
    """

    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title="(extraction en cours…)",  # placeholder until BackgroundTask promotes
        # CLAUDE.md invariant 5: raw input persisted forever.
        source_capture={"type": "voice", "payload": {"transcript": body.transcript}},
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    # Broadcast the synchronous draft creation so partner phones see the
    # placeholder card with the spinner state (CONTEXT.md D-07).
    payload = _to_response_payload(recipe)
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    # Queue Gemini promotion. The task opens its own SessionLocal — see
    # services/llm.py and .planning/phases/02-llm-capture-w2/02-RESEARCH.md
    # §"BackgroundTask + DB Session Pattern".
    background_tasks.add_task(promote_voice_draft, recipe.id, body.transcript)
    return RecipeResponse.model_validate(recipe)


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
    Creates a draft + uploads photos to Supabase Storage + queues Gemini
    multimodal promotion."""

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
    # (Photos are small enough that holding them in memory is fine for v0.1.)
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

    # Create the draft + persist photos via the existing storage helper.
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title="(extraction en cours…)",
        source_capture={"type": "photo", "payload": {"photo_count": len(contents)}},
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.flush()  # need recipe.id to compute storage path

    try:
        paths: list[str] = []
        for content in contents:
            path = upload_recipe_photo(
                household_id=member.household_id,
                recipe_id=recipe.id,
                content=content,
            )
            paths.append(path)
    except ValueError as exc:
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

    recipe.photo_paths = paths
    # Persist the photo paths into source_capture too — invariant 5: raw inputs
    # forever. Gemini retries can re-read these paths and re-download.
    recipe.source_capture = {
        "type": "photo",
        "payload": {"photo_paths": paths, "photo_count": len(paths)},
    }
    db.commit()
    db.refresh(recipe)

    payload = _to_response_payload(recipe)
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    # Pass the bytes (not paths) to the BackgroundTask — saves a re-download
    # on the happy path. Failure recovery (retry endpoint) re-downloads.
    background_tasks.add_task(promote_photo_draft, recipe.id, contents)
    return RecipeResponse.model_validate(recipe)


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
    """CAPTURE-03 — URL paste. NO Gemini call in v0.1; URL is stored in
    source_capture and the user fills in the rest from the drafts inbox.

    # TODO(productize): URL fetch + Gemini extraction (CAPTURE-03 deferred).
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
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title=url,  # better than "(extraction…)" since extraction is deferred
        source_capture={"type": "url", "payload": {"url": url}},
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
    which re-reads source_capture and re-runs the appropriate BackgroundTask.

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

    # Phase 16 D-16-04 / D-16-06: when the recipe is in the terminal `failed`
    # state, reset to `draft` so the FE inbox row flips from the failed
    # variant (label + Réessayer/Supprimer) to the in-flight/spinner variant.
    # For non-failed inputs (structured / draft) we leave status alone — the
    # FE only reaches the retry endpoint from the failed-state branch, but
    # other clients (curl, manual ops) MUST not be able to flip a structured
    # recipe back to draft via this endpoint.
    if recipe.status == "failed":
        recipe.status = "draft"
    # Clear the error optimistically so the FE inbox row swaps from "Échec"
    # to "Extraction en cours…" (D-07) when it refetches.
    recipe.promotion_error = None
    db.commit()
    db.refresh(recipe)

    # Broadcast the "in flight" state so the partner's inbox row also flips
    # to spinner. Re-broadcasting recipe.created is the cheapest carrier
    # (FE inbox handles dedupe-prepend; see frontend/app/inbox/page.tsx).
    payload = _to_response_payload(recipe)
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
