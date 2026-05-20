"""Recipe library API. Phase 27 CAPTURE-03: conversational capture endpoints.

Endpoints:

* ``POST /recipes``                    — Phase 27 CAPTURE-03 blank-draft create ({})
* ``GET  /recipes``                    — RECIPE-03 / 06 list w/ ILIKE search + status filter
* ``GET  /recipes/{id}``               — RECIPE-04 detail (404 on cross-household, no leak)
* ``PUT  /recipes/{id}``               — RECIPE-05 patch
* ``POST /recipes/{id}/voice-modify``  — CAPTURE-05 voice modification (untouched)
* ``POST /recipes/{id}/retry-promotion`` — Phase 16 failed-promotion retry
* ``POST /recipes/{id}/promote``       — Phase 27 D-13b coalescing promote trigger
* ``DELETE /recipes/{id}``             — hard delete
* ``POST /recipes/{id}/turns``         — Phase 26 TURN-01 append text/voice/url/answer/proposal turn
* ``POST /recipes/{id}/turns/photo``   — Phase 26 TURN-01 multipart photo turn
* ``GET  /recipes/{id}/turns``         — Phase 26 TURN-01 ordered turn list

Architecture invariants enforced here:

* CLAUDE.md #4 — every household-syncing mutation broadcasts via
  ``broadcast_to_household``. We emit ``recipe.created`` on POST and
  ``recipe.updated`` on PUT.
* CLAUDE.md #5 — raw inputs kept forever in ``recipe_turns`` (Phase 25+).
  The initial user turn (position=0, sender='user') stores the original
  capture payload verbatim. POST /recipes no longer inserts a turn — the
  first turn arrives via POST /recipes/{id}/turns (Phase 26 D-20).
* D-03 — text search is ``WHERE title ILIKE :q OR ingredients::text ILIKE :q``
  with ``:q`` formatted as ``%query%``. No pg_trgm, no FTS.

Phase 27 CAPTURE-03 / CONTEXT.md D-12 + D-13b:
The five legacy capture endpoints (POST /recipes full-form, /quick, /voice,
/photo, /url) have been deleted. The conversational capture screen uses:
  1. POST /recipes → blank draft (this file)
  2. POST /recipes/{id}/turns → per-bubble user turns (Phase 26)
  3. POST /recipes/{id}/turns/photo → per-photo bubble (Phase 26)
  4. POST /recipes/{id}/promote → coalescing promote_draft trigger (this file)

Cross-household isolation: every read/write filters by ``member.household_id``.
A member of A cannot read/edit/list recipes of B. Detail endpoint returns 404
(not 403) on cross-household to avoid leaking existence (T-01-08-04).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import get_args
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import Text, cast, func, or_, select
from sqlalchemy import delete as sa_delete
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
    RecipeBlankCreate,
    RecipeResponse,
    RecipeUpdate,
    VoiceModifyRequest,
)
from app.schemas.recipe_turn import (
    AdvisoryTurnPayload,
    AnswerField,
    AnswerTurnPayload,
    ProposalAcceptedPayload,
    ProposalDismissedPayload,
    QuestionTurnPayload,
    TurnPayload,
    TurnResponse,
)
from app.services import storage as storage_service
from app.services.completeness import (
    _FIELD_PROMPTS_FR,
    INPUT_TYPE_MAP,
    OPTIONS_MAP,
    compute_completeness,
)
from app.services.llm import (
    _should_emit_question,
    apply_voice_modification,
    extract_and_process_url_turn,  # Phase 26 D-22 url dispatch
    process_thread_turn,  # Phase 26 D-21/D-22 text/voice/photo dispatch
    promote_draft,
    retry_promotion,
)
from app.services.realtime import broadcast_to_household
from app.services.storage import MAX_BYTES, upload_recipe_photo
from app.services.thread import acquire_position_lock

log = logging.getLogger(__name__)

router = APIRouter(prefix="/recipes", tags=["recipes"])


# Fields the update handler must NEVER touch — defense-in-depth even though
# RecipeUpdate doesn't define these. Order: Phase 28 DETAIL-05 (manually_edited_fields),
# 01-09-owned (photo_paths), W3-owned (cook_count/last_cooked_at), and the
# write-once relationship/identity columns.
_UPDATE_FORBIDDEN_FIELDS = frozenset(
    {
        "manually_edited_fields",  # Phase 28 DETAIL-05 owns the write path
        "photo_paths",
        "cook_count",
        "last_cooked_at",
        "household_id",
        "created_by_member_id",
        "id",
        "created_at",
    }
)

# Phase 28 DETAIL-05 — the 13 AnswerField keys eligible for auto-pin/unpin on
# PUT /recipes/{id}. Single source: backend/app/schemas/recipe_turn.py AnswerField.
# Mirrors frontend/lib/enums.ts ANSWER_FIELDS per locked-vocabulary discipline.
_ANSWER_FIELD_SET: frozenset[str] = frozenset(get_args(AnswerField))

# Blank-predicate groupings mirroring frontend/lib/recipe-completeness.ts::isFieldFilled.
# Drift between TS and Python = bug category (CLAUDE.md).
_STRING_ANSWER_FIELDS = frozenset({"title", "description", "difficulty", "cuisine", "main_protein"})
_INT_ANSWER_FIELDS = frozenset({"prep_time_minutes", "cook_time_minutes", "servings"})
_LIST_ANSWER_FIELDS = frozenset({"ingredients", "steps", "mood", "seasonality", "tags"})


def _is_blank_for_field(field_name: str, value) -> bool:
    """Mirror of frontend/lib/recipe-completeness.ts::isFieldFilled inverse.

    String: None or whitespace-only. Integer: None only (0 is valid per D-09).
    List: None or empty. Phase 28 DETAIL-05.
    """
    if field_name in _STRING_ANSWER_FIELDS:
        return value is None or (isinstance(value, str) and value.strip() == "")
    if field_name in _INT_ANSWER_FIELDS:
        return value is None  # 0 is a valid value, not blank
    if field_name in _LIST_ANSWER_FIELDS:
        return value is None or len(value) == 0
    return value is None  # safety default for any future AnswerField additions


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
        log.warning("partial-upload cleanup failed for paths=%s", paths, exc_info=True)


@router.post(
    "",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_blank(
    body: RecipeBlankCreate,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """Phase 27 CAPTURE-03 — blank-draft create for the conversational capture screen.

    Per CONTEXT.md D-12 + D-13b: POST /recipes accepts {} and ONLY creates the
    draft row + broadcasts recipe.created. It does NOT schedule promote_draft —
    that is the explicit job of POST /recipes/{id}/promote (D-13b), called by
    the frontend after all per-bubble POST /turns have landed.

    Why no promote_draft here: the user adds N pending bubbles in the chat
    composer; on Enregistrer the frontend posts each as one /turns call (Phase
    26 D-20), then calls /promote ONCE so promote_draft runs over the full
    thread (ADR-0001 "one Gemini call per Enregistrer"). If POST /recipes
    scheduled promote_draft here, it would race the per-turn BackgroundTasks
    Phase 26 already schedules per D-22 — both would re-read the thread and
    produce duplicate-system-turn noise.

    Layering note (Phase 27 → Phase 29): Phase 26's POST /turns schedules
    process_thread_turn (text/voice/photo) and extract_and_process_url_turn
    (url) as BackgroundTasks per D-22. Those stubs run alongside the new
    POST /promote's promote_draft. Today (Phase 27) process_thread_turn is a
    stub (26-02-PLAN Task 1) that does no real work, so in practice only
    promote_draft from POST /promote does meaningful extraction. Phase 29 fills
    process_thread_turn's body; until then the coexistence is harmless.

    Title placeholder is the same literal Phase 26's RealtimeProvider
    inspects to know when the draft is still extracting.
    """
    recipe = Recipe(
        household_id=member.household_id,
        created_by_member_id=member.id,
        status="draft",
        title="Extraction en cours…",
        photo_paths=[],
        mood=[],
        seasonality=["spring", "summer", "autumn", "winter"],
        tags=[],
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    payload = _to_response_payload(recipe, initial_turn_kind=None)
    await broadcast_to_household(member.household_id, "recipe.created", payload)

    return _to_response(recipe, initial_turn_kind=None)


@router.get("", response_model=list[RecipeResponse])
def list_recipes(
    q: str | None = Query(default=None, max_length=200),
    status_filter: str | None = Query(
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
) -> list[RecipeResponse]:
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
        kind_rows = db.execute(select(first_turn_subq.c.recipe_id, first_turn_subq.c.kind)).all()
        kind_by_recipe_id = {str(row.recipe_id): row.kind for row in kind_rows}
    else:
        kind_by_recipe_id = {}

    return [_to_response(r, initial_turn_kind=kind_by_recipe_id.get(str(r.id))) for r in rows]


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")

    # Phase 28 DETAIL-05 — snapshot AnswerField values BEFORE setattr mutates them.
    # _apply_put_pinning diffs the body against this snapshot to detect pins/unpins.
    # Must come BEFORE the setattr loop (28-RESEARCH.md §2 enum-coercion ordering
    # gotcha: after setattr, getattr(r, field) already holds the new value and
    # the diff would always be empty).
    pre_update_snapshot = {field: getattr(r, field, None) for field in _ANSWER_FIELD_SET}
    _apply_put_pinning(db, r, body, pre_update_snapshot)

    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        if key in _UPDATE_FORBIDDEN_FIELDS:
            continue
        if key in ("cuisine", "main_protein") and value is not None:
            value = _coerce_enum_value(value)
        elif key in ("mood", "seasonality") and value is not None:
            value = [_coerce_enum_value(v) for v in value]
        elif key == "ingredients" and value is not None:
            value = [(i.model_dump() if hasattr(i, "model_dump") else i) for i in value]
        setattr(r, key, value)

    r.updated_at = datetime.now(tz=UTC)
    db.commit()
    db.refresh(r)

    kind = _first_turn_kind(db, r.id)
    payload = _to_response_payload(r, initial_turn_kind=kind)
    await broadcast_to_household(member.household_id, "recipe.updated", payload)
    return _to_response(r, initial_turn_kind=kind)


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")

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


@router.post(
    "/{recipe_id}/promote",
    response_model=PromotionRetryResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def promote_recipe(
    recipe_id: UUID,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> PromotionRetryResponse:
    """Phase 27 CAPTURE-03 / CONTEXT.md D-13b — coalescing promote trigger.

    Called once by the frontend after all per-bubble POST /turns have landed
    (the chat composer save flow). Schedules promote_draft over the full
    thread — matching ADR-0001 "one Gemini call per Enregistrer".

    No-op idempotency: if the user double-taps Enregistrer, two promote_draft
    runs happen back-to-back. Each one re-reads the full thread (Phase 26 D-22)
    and the second run sees the result of the first; the LLM idempotency comes
    from "full re-read" (ADR-0001), not from request-level deduplication.

    422 when the recipe has no position=0 user turn — promote_draft would
    raise inside the BackgroundTask, which has no caller to report to. Fail
    fast at HTTP time instead. Cross-household → 404.
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
            detail="recipe not found",
        )

    has_user_turn = db.scalar(
        select(func.count(RecipeTurn.id)).where(
            RecipeTurn.recipe_id == recipe_id,
            RecipeTurn.sender == "user",
            RecipeTurn.position == 0,
        )
    )
    if not has_user_turn:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="recipe has no initial user turn; post a /turns request first",
        )

    background_tasks.add_task(promote_draft, recipe_id)
    return PromotionRetryResponse(recipe_id=recipe_id, queued=True)


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")

    # Delete FK-constrained rows first (no ondelete=CASCADE on these FKs).
    db.execute(sa_delete(Vote).where(Vote.recipe_id == recipe_id))
    db.execute(sa_delete(CookingLog).where(CookingLog.recipe_id == recipe_id))
    db.delete(recipe)
    db.commit()

    await broadcast_to_household(member.household_id, "recipe.deleted", {"id": str(recipe_id)})


# ===========================================================================
# Phase 26 — Thread API (TURN-01 / TURN-02 / TURN-03 / TURN-04)
# ===========================================================================


# ---------------------------------------------------------------------------
# Phase 26 — thread-turn handlers (D-10, D-12, D-15, D-16)
# ---------------------------------------------------------------------------


def _apply_answer_turn(db: Session, recipe: Recipe, payload: AnswerTurnPayload) -> None:
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


def _apply_proposal_accepted(db: Session, recipe: Recipe, payload: ProposalAcceptedPayload) -> None:
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


def _apply_put_pinning(
    db: Session,
    recipe: Recipe,
    body: RecipeUpdate,
    pre_update_snapshot: dict,
) -> None:
    """Phase 28 DETAIL-05 — diff-based auto-pin on PUT /recipes/{id}.

    Compares the PUT body's AnswerField keys against `pre_update_snapshot`
    (taken BEFORE the setattr loop so old values are still on the ORM object).
    Differing values pin the field; values that arrive blank (per
    `_is_blank_for_field`) UNPIN the field. Same-value re-saves are a no-op
    (D-08).

    Must be called BEFORE the setattr loop — calling after would make
    `getattr(recipe, field)` already hold the new value and the diff would
    always be empty (28-RESEARCH.md §2 enum-coercion ordering gotcha).

    Mirrors the same set-semantics + sorted reassignment idiom as
    `_apply_answer_turn` and `_apply_proposal_accepted`. Same DB transaction
    as the field writes (invariant #3).

    `db` is accepted for API symmetry with the other pin helpers and for future
    SELECT FOR UPDATE expansion (T-28-02 productize-later note), but is unused
    today (single uvicorn worker — invariant #7 serializes concurrent PUT
    requests at the asyncio event-loop level).
    """
    data = body.model_dump(exclude_unset=True)
    current_pins: set[str] = set(recipe.manually_edited_fields or [])

    for field_name, new_value in data.items():
        if field_name not in _ANSWER_FIELD_SET:
            continue  # D-10: only AnswerField keys are pin-eligible

        old_value = pre_update_snapshot.get(field_name)

        # Coerce new_value to a comparable shape that matches how the setattr
        # loop will write it to the DB. Necessary for:
        #   - Scalar enum fields (cuisine, main_protein): Pydantic wraps them
        #     in the Enum subclass; DB stores plain string.
        #   - List-of-enum fields (mood, seasonality): same wrapping + list.
        #   - ingredients: Pydantic IngredientItem objects → list[dict].
        # All other fields (strings, ints, list[str]) need no coercion.
        # Sort list-of-string fields before compare (D-09/28-RESEARCH §2
        # list-order gotcha) so ["comfort","light"] == ["light","comfort"].
        if field_name in ("cuisine", "main_protein") and new_value is not None:
            coerced_new = _coerce_enum_value(new_value)
        elif field_name in ("mood", "seasonality") and new_value is not None:
            coerced_new = sorted([_coerce_enum_value(v) for v in new_value])
            old_value = sorted(list(old_value or []))
        elif field_name == "ingredients" and new_value is not None:
            coerced_new = [(i.model_dump() if hasattr(i, "model_dump") else i) for i in new_value]
        else:
            coerced_new = new_value

        if _is_blank_for_field(field_name, coerced_new):
            # D-09 — clearing a field UNPINS it (asymmetric to answer-turn pin path)
            current_pins.discard(field_name)
            continue

        if coerced_new != old_value:
            # D-08 — same value is a no-op; genuine change pins the field
            current_pins.add(field_name)

    # Full reassignment — in-place .append on JSONB silently fails without
    # flag_modified (RESEARCH §Area 4 / routers/recipes.py:607-608 comment).
    recipe.manually_edited_fields = sorted(current_pins)


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
                    "combined photo size exceeds Gemini 18 MB cap; use fewer or smaller photos"
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
    response_model=list[TurnResponse],
)
def list_turns(
    recipe_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> list[TurnResponse]:
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


# ===========================================================================
# Phase 29 — Question CTA endpoints (LLM-03 / D-20)
# ===========================================================================
#
# These endpoints back the « Oui, compléter » and « Plus tard » buttons in the
# Phase 27 SystemBubble summary branch (wired by Plan 29-06 frontend slice).
# - /questions/trigger: synchronously emits the next missing-field question
#   using the SAME logic as services/llm._run_thread_llm's question step,
#   minus the LLM call (no extraction needed — we already know which field
#   is missing via the shared services/completeness module).
# - /questions/defer: sets recipes.questions_deferred_until = now() + 24h,
#   which the Phase 29 _run_thread_llm body reads to skip question emission
#   for the next 24-hour window (D-08).


@router.post(
    "/{recipe_id}/questions/trigger",
    response_model=None,  # response varies by branch (201 TurnResponse OR 204)
    status_code=status.HTTP_201_CREATED,
)
async def trigger_next_question(
    recipe_id: UUID,
    response: Response,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
):
    """Phase 29 D-20 / LLM-03 — emit the next missing-field question on demand.

    Used by the « Oui, compléter » CTA in SystemBubble's summary branch.

    Picks the highest-priority eligible missing field per services/completeness
    (FIELD_KEYS order; skips ingredients/steps via INPUT_TYPE_MAP[field] is None;
    de-dups against existing open question turns via _should_emit_question).
    Emits ONE question turn, returns 201 + TurnResponse.

    Returns 204 No Content when no eligible missing field remains (or all
    candidates already have open questions). Frontend renders "Tout est complet."
    toast on 204.

    Cross-household → 404 (no existence leak, T-29-13).
    """
    recipe = db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        )
    )
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")

    # Pick the highest-priority eligible missing field (D-11 + D-12).
    # Thread read and de-dup check happen INSIDE the position lock to prevent a
    # stale-thread race with _run_thread_llm running concurrently as a BackgroundTask
    # (WR-04 — a concurrent commit between the thread read and lock acquisition could
    # cause duplicate question turns for the same field).
    _, missing = compute_completeness(recipe)

    lock = await acquire_position_lock(recipe_id)
    async with lock:
        # Re-read thread after acquiring lock — prevents stale de-dup snapshot.
        thread = list(
            db.scalars(
                select(RecipeTurn)
                .where(RecipeTurn.recipe_id == recipe_id)
                .order_by(RecipeTurn.position.asc())
            ).all()
        )
        chosen_field: str | None = None
        for field in missing:
            if INPUT_TYPE_MAP.get(field) is None:
                continue  # D-10 SKIP — ingredients/steps
            if not _should_emit_question(thread, field):
                continue  # D-12 — open unanswered question already exists
            chosen_field = field
            break

        if chosen_field is None:
            response.status_code = status.HTTP_204_NO_CONTENT
            return None

        # Build the question payload — mirrors _run_thread_llm's emission shape (D-13)
        q_payload = QuestionTurnPayload(
            kind="question",
            field=chosen_field,
            prompt=_FIELD_PROMPTS_FR[chosen_field],
            input_type=INPUT_TYPE_MAP[chosen_field],
            options=OPTIONS_MAP.get(chosen_field, []),
            multi=(chosen_field == "mood"),  # D-10 — only mood is chip-multi
        ).model_dump(mode="json", exclude={"kind"})

        max_pos = db.scalar(
            select(func.max(RecipeTurn.position)).where(
                RecipeTurn.recipe_id == recipe_id,
            )
        )
        next_position = 0 if max_pos is None else max_pos + 1
        turn = RecipeTurn(
            recipe_id=recipe_id,
            position=next_position,
            sender="system",
            kind="question",
            payload=q_payload,
        )
        db.add(turn)
        db.commit()
        db.refresh(turn)

    # Broadcast AFTER commit — prevents phantom-state race (Phase 26 RESEARCH §Area 7)
    await broadcast_to_household(
        member.household_id,
        "turn.created",
        TurnResponse.model_validate(turn).model_dump(mode="json"),
    )

    return TurnResponse.model_validate(turn)


@router.post(
    "/{recipe_id}/questions/defer",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def defer_questions(
    recipe_id: UUID,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> None:
    """Phase 29 D-08 / D-20 — pause question emission for 24h.

    Used by the « Plus tard » CTA in SystemBubble's summary branch.

    Sets recipes.questions_deferred_until = now() + 24h (tz-aware UTC per
    Pitfall 9). The Phase 29 _run_thread_llm body reads this column and
    skips question emission while now() < questions_deferred_until.

    Broadcasts recipe.updated so both phones see the new value and the
    SystemBubble summary CTAs collapse into the "deferred" state (D-22).
    Auto-expires after 24h — no separate "un-defer" endpoint needed (the
    user re-engages naturally on the next session).

    T-29-14: endpoint takes NO body — questions_deferred_until is server-computed
    as datetime.now(tz=timezone.utc) + timedelta(hours=24). No client-supplied
    value is accepted.

    Cross-household → 404 (no existence leak, T-29-13).
    """
    recipe = db.scalar(
        select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        )
    )
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")

    recipe.questions_deferred_until = datetime.now(tz=UTC) + timedelta(hours=24)
    recipe.updated_at = datetime.now(tz=UTC)
    db.commit()
    db.refresh(recipe)

    # Mirror PUT /recipes/{id} broadcast pattern (cross-phone sync per invariant #4)
    kind = _first_turn_kind(db, recipe.id)
    payload = _to_response_payload(recipe, initial_turn_kind=kind)
    await broadcast_to_household(member.household_id, "recipe.updated", payload)
