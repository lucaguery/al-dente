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
from sqlalchemy import Text, cast, delete as sa_delete, func, or_, select
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
from app.schemas.recipe_turn import (
    TurnPayload,
    TurnResponse,
    AnswerTurnPayload,
    ProposalAcceptedPayload,
    ProposalDismissedPayload,
    AdvisoryTurnPayload,
)
from app.services.llm import (
    apply_voice_modification,
    extract_and_process_url_turn,  # Phase 26 D-22 url dispatch
    process_thread_turn,            # Phase 26 D-21/D-22 text/voice/photo dispatch
    promote_draft,
    retry_promotion,
)
from app.services.thread import acquire_position_lock
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
    """Build a RecipeResponse, injecting the synthesized initial_turn_kind field.

    WR-04: use ``model_copy`` rather than mutating the validated instance —
    makes it explicit that ``initial_turn_kind`` is synthesized server-side
    (it has no source attribute on the SQLAlchemy ORM object) and avoids
    bypassing field validation via ``__setattr__``.
    """
    resp = RecipeResponse.model_validate(r)
    return resp.model_copy(update={"initial_turn_kind": initial_turn_kind})


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
        # WR-03: do NOT echo the raw SDK exception to the client — google-genai
        # error messages can include request URLs containing API keys in the
        # ?key=AIza… query string. Log the detail server-side, return generic.
        log.exception("voice_modify failed recipe=%s", recipe_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="gemini extraction failed",
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


# ===========================================================================
# Phase 26 — Thread API (TURN-01 / TURN-02 / TURN-03 / TURN-04)
# ===========================================================================


# ---------------------------------------------------------------------------
# Phase 26 — thread-turn handlers (D-10, D-12, D-15, D-16)
# ---------------------------------------------------------------------------


def _apply_answer_turn(
    db: Session, recipe: Recipe, payload: AnswerTurnPayload
) -> None:
    """Phase 26 D-10/D-12 — atomic field-apply + pin.

    Validates that in_reply_to_turn_id points to a `question` turn in the
    same recipe (D-12). Applies payload.value to recipes.<payload.field>
    and adds payload.field to recipes.manually_edited_fields (set semantics,
    sorted for deterministic test assertions per RESEARCH §Area 4). No commit
    here — caller wraps the insert + this call in one transaction.

    Raises HTTPException(422) on invalid in_reply_to_turn_id.
    """
    referenced = db.scalar(
        select(RecipeTurn).where(
            RecipeTurn.id == payload.in_reply_to_turn_id,
            RecipeTurn.recipe_id == recipe.id,
        )
    )
    if referenced is None or referenced.kind != "question":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="in_reply_to_turn_id must reference a question turn in this recipe",
        )
    # D-10 atomic apply.
    setattr(recipe, payload.field, payload.value)
    # Full reassignment is the safe JSONB idiom (RESEARCH §Area 4 — in-place
    # list.append on a JSONB column silently fails without flag_modified).
    current: set[str] = set(recipe.manually_edited_fields or [])
    current.add(payload.field)
    recipe.manually_edited_fields = sorted(current)


def _apply_proposal_accepted(
    db: Session, recipe: Recipe, payload: ProposalAcceptedPayload
) -> None:
    """Phase 26 D-16 — apply advisory's proposed_value + REMOVE the field pin.

    Reads the referenced advisory turn (must be in same recipe), validates
    its payload against AdvisoryTurnPayload (Phase 26 D-17 read-side
    contract), applies proposed_value to recipe.<field>, and discards
    field from manually_edited_fields (set semantics, sorted).

    Raises HTTPException(422) on invalid in_reply_to_turn_id or malformed
    advisory payload.
    """
    referenced = db.scalar(
        select(RecipeTurn).where(
            RecipeTurn.id == payload.in_reply_to_turn_id,
            RecipeTurn.recipe_id == recipe.id,
        )
    )
    if referenced is None or referenced.kind != "advisory":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="in_reply_to_turn_id must reference an advisory turn in this recipe",
        )
    # D-17 — parse the advisory payload via AdvisoryTurnPayload so the
    # field + proposed_value are typed and structurally validated.
    # IN-03 — spread persisted payload FIRST, then pin kind='advisory' so the
    # discriminator can't be shadowed by a stray payload key.
    try:
        advisory_payload = AdvisoryTurnPayload.model_validate(
            {**(referenced.payload or {}), "kind": "advisory"}
        )
    except Exception as exc:  # noqa: BLE001 — pydantic ValidationError or KeyError
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"referenced advisory turn has malformed payload: {exc!s}",
        ) from exc

    # WR-03 — AdvisoryTurnPayload only enforces shape (field + proposed_value),
    # NOT per-field value type/range. An LLM-emitted advisory (Phase 29) could
    # ship `{field: "difficulty", proposed_value: ["evil", "list"]}` and the
    # naked setattr below would write a list to a text column. Route the
    # proposed_value through AnswerTurnPayload's per-field validator (mirror
    # of the answer-turn write path) so trust-boundary discipline is uniform.
    try:
        AnswerTurnPayload(
            kind="answer",
            in_reply_to_turn_id=payload.in_reply_to_turn_id,
            field=advisory_payload.field,
            value=advisory_payload.proposed_value,
        )
    except Exception as exc:  # noqa: BLE001 — pydantic ValidationError
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"advisory proposed_value fails per-field validation: {exc!s}",
        ) from exc

    # Apply proposed value + REMOVE pin (full reassignment idiom).
    setattr(recipe, advisory_payload.field, advisory_payload.proposed_value)
    current: set[str] = set(recipe.manually_edited_fields or [])
    current.discard(advisory_payload.field)
    recipe.manually_edited_fields = sorted(current)


def _validate_proposal_dismissed_ref(
    db: Session, recipe: Recipe, payload: ProposalDismissedPayload
) -> None:
    """Phase 26 D-15 — pure-validation helper.

    Confirms in_reply_to_turn_id points to an advisory turn in the same
    recipe. No field mutation, no manually_edited_fields touch — dismissal
    is a state-change-only event (the turn row itself is the state).

    Raises HTTPException(422) on invalid ref.
    """
    referenced = db.scalar(
        select(RecipeTurn).where(
            RecipeTurn.id == payload.in_reply_to_turn_id,
            RecipeTurn.recipe_id == recipe.id,
        )
    )
    if referenced is None or referenced.kind != "advisory":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="in_reply_to_turn_id must reference an advisory turn in this recipe",
        )


@router.post(
    "/{recipe_id}/turns",
    response_model=TurnResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_turn(
    recipe_id: UUID,
    body: TurnPayload,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> TurnResponse:
    """Phase 26 TURN-01 — append a user turn to a recipe's thread.

    Accepts 6 kinds via TurnPayload discriminated union:
      text, voice, url, answer, proposal_accepted, proposal_dismissed.

    Photo turns route to POST /recipes/{id}/turns/photo (D-01 split topology).

    Dispatch matrix (D-22):
      * text / voice → BackgroundTask: process_thread_turn (Phase 29 fills body)
      * url          → BackgroundTask: extract_and_process_url_turn (closes TODO(productize))
      * answer       → atomic field-apply + pin (no LLM)
      * proposal_*   → validated state change (no LLM)

    Every persisted turn broadcasts `turn.created` via broadcast_to_household
    (invariant #4). Status code is 201 (D-04) regardless of whether a
    BackgroundTask was scheduled.

    Cross-household → 404 (matches GET /recipes/{id} — no existence leak).
    No status guard (D-05) — turns can be appended to a recipe in any status.
    """
    # Reject photo kind here — multipart endpoint handles it (D-01).
    if body.kind == "photo":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="photo turns must POST to /recipes/{id}/turns/photo (multipart)",
        )

    recipe = db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        )
    )
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    # D-18 — serialize position read + insert under per-recipe asyncio Lock.
    # DB UNIQUE(recipe_id, position) is the backstop (invariant #7 — single worker).
    lock = await acquire_position_lock(recipe_id)
    async with lock:
        max_pos = db.scalar(
            select(func.max(RecipeTurn.position)).where(
                RecipeTurn.recipe_id == recipe_id,
            )
        )
        next_position = 0 if max_pos is None else max_pos + 1

        # Strip the discriminator from the persisted payload — kind lives on
        # the column, payload should not duplicate it.
        payload_dict = body.model_dump(mode="json", exclude={"kind"})

        turn = RecipeTurn(
            recipe_id=recipe_id,
            position=next_position,
            sender="user",
            kind=body.kind,
            payload=payload_dict,
        )
        db.add(turn)

        # Kind-specific side effects (all in the same transaction per D-10 / D-16).
        if body.kind == "answer":
            _apply_answer_turn(db, recipe, body)
        elif body.kind == "proposal_accepted":
            _apply_proposal_accepted(db, recipe, body)
        elif body.kind == "proposal_dismissed":
            _validate_proposal_dismissed_ref(db, recipe, body)

        db.commit()
        db.refresh(turn)

    # D-03 / D-06 — broadcast turn.created with full TurnResponse payload.
    # RESEARCH §Area 7: commit BEFORE broadcast to avoid phantom-turn race.
    await broadcast_to_household(
        member.household_id,
        "turn.created",
        TurnResponse.model_validate(turn).model_dump(mode="json"),
    )

    # D-22 — schedule BackgroundTask only for LLM-triggering kinds.
    if body.kind in ("text", "voice"):
        background_tasks.add_task(process_thread_turn, recipe_id, turn.id)
    elif body.kind == "url":
        background_tasks.add_task(extract_and_process_url_turn, recipe_id, turn.id)
    # answer / proposal_accepted / proposal_dismissed → no BackgroundTask
    # (D-11, D-15, D-16 — verified by log inspection per ROADMAP SC-2 / SC-4).

    return TurnResponse.model_validate(turn)


@router.post(
    "/{recipe_id}/turns/photo",
    response_model=TurnResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_turn_photo(
    recipe_id: UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> TurnResponse:
    """Phase 26 TURN-01 — multipart photo turn (D-01 split topology).

    Mirrors POST /recipes/photo (the initial capture endpoint) for FOLLOW-UP
    photo turns on existing recipes. Photos upload via upload_recipe_photo to
    the recipe-photos bucket; storage paths land in the turn payload as
    `photo_paths` (D-10 — same shape as the initial photo capture turn).

    Schedules process_thread_turn (D-22) — Phase 29 fills the LLM body.
    Cross-household → 404.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="at least one photo required",
        )
    if len(files) > MAX_PHOTOS_PER_CAPTURE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="at most 4 photos accepted",
        )

    # Read bytes up-front (mirrors create_photo at line 514).
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

    recipe = db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        )
    )
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    # Upload bytes to Storage — same cleanup contract as create_photo (WR-02).
    paths: list[str] = []
    try:
        for content in contents:
            path = upload_recipe_photo(
                household_id=member.household_id,
                recipe_id=recipe_id,
                content=content,
            )
            paths.append(path)
    except ValueError as exc:
        _cleanup_partial_uploads(paths)
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
        _cleanup_partial_uploads(paths)
        raise

    # D-18 — serialize position + insert under per-recipe lock. WR-04: Storage
    # uploads above happen OUTSIDE the lock (couple-scale ok; two phones rarely
    # upload to the same recipe in the same second). Compare with create_turn
    # (JSON) where the lock encompasses the only DB read+write — here it only
    # serializes the position counter. The DB UNIQUE(recipe_id, position) is
    # the backstop if two interleaved photo uploads do race.
    lock = await acquire_position_lock(recipe_id)
    async with lock:
        max_pos = db.scalar(
            select(func.max(RecipeTurn.position)).where(
                RecipeTurn.recipe_id == recipe_id,
            )
        )
        next_position = 0 if max_pos is None else max_pos + 1

        turn = RecipeTurn(
            recipe_id=recipe_id,
            position=next_position,
            sender="user",
            kind="photo",
            payload={"photo_paths": paths},
        )
        db.add(turn)
        db.commit()
        db.refresh(turn)

    await broadcast_to_household(
        member.household_id,
        "turn.created",
        TurnResponse.model_validate(turn).model_dump(mode="json"),
    )

    # D-22 — photo dispatches to process_thread_turn (Phase 29 fills body).
    background_tasks.add_task(process_thread_turn, recipe_id, turn.id)

    return TurnResponse.model_validate(turn)


@router.get(
    "/{recipe_id}/turns",
    response_model=List[TurnResponse],
)
def list_turns(
    recipe_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> List[TurnResponse]:
    """Phase 26 TURN-01 — flat list ordered by position ASC.

    No pagination — couple-scale corpus is 5-50 turns per recipe (D-02).
    Cross-household → 404 (matches GET /recipes/{id} no-leak contract).
    200 + [] when no turns exist (defensive — Phase 25 backfill should
    have inserted position=0 for every surviving recipe).
    """
    recipe = db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        )
    )
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )
    rows = db.scalars(
        select(RecipeTurn)
        .where(RecipeTurn.recipe_id == recipe_id)
        .order_by(RecipeTurn.position.asc())
    ).all()
    return [TurnResponse.model_validate(r) for r in rows]
