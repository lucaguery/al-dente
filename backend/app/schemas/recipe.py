"""Pydantic v2 schemas for the recipe library API.

Wire-format contract for the capture + edit surfaces:

* ``RecipeBlankCreate`` — POST /recipes (Phase 27 CAPTURE-03, empty body, status='draft')
* ``RecipeUpdate``      — PUT /recipes/{id} (manually_edited_fields INTENTIONALLY absent — Phase 28 DETAIL-05)
* ``RecipeResponse``    — every read shape + the WS broadcast payload
* ``PromotionRetryResponse`` — POST /recipes/{id}/retry-promotion + POST /recipes/{id}/promote

Locked-vocabulary validation flows through ``app.models.enums`` (Cuisine, Mood,
Protein, Season). Because those classes inherit ``str, Enum``, Pydantic v2 both
accepts the wire-format string at input *and* serializes back to that string
through ``model_dump(mode='json')`` — keeping the frontend ↔ backend vocab
drift surface to a single file pair (CLAUDE.md "Shared Vocabulary").

CLAUDE.md invariant 5 — raw inputs are kept forever — is enforced via
``recipe_turns`` (Phase 25 cutover). The initial user turn (position=0,
sender='user') stores the original captured text/transcript/url/photo_paths
and is never overwritten. ``manually_edited_fields`` is absent from
``RecipeUpdate``; the write path is Phase 28 DETAIL-05.

Phase 27 CAPTURE-03 + CONTEXT.md D-12 + D-13b:
The five legacy create endpoints (POST /recipes full-form, /quick, /voice,
/photo, /url) and their request schemas (RecipeFullCreate, RecipeQuickCreate,
VoiceCaptureRequest, UrlCaptureRequest) have been deleted. The conversational
capture screen uses only: POST /recipes (blank draft), POST /recipes/{id}/turns,
POST /recipes/{id}/turns/photo, POST /recipes/{id}/promote.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import Cuisine, Mood, Protein, Season

# Phase 24 RID-02 — DifficultyLiteral matches the Difficulty enum wire values.
# Mirrors the CuisineLiteral / ProteinLiteral pattern in services/llm.py for
# Pydantic validation of the difficulty TEXT column (D-12).
DifficultyLiteral = Literal["easy", "medium", "hard"]


# --- Sub-shapes -------------------------------------------------------------


class IngredientItem(BaseModel):
    """One row of the ``ingredients`` JSONB array.

    SPEC.md §"Data model": ``ingredients JSONB`` = ``[{name, quantity, unit}, ...]``.
    Quantities and units are nullable because quick-add can promote to structured
    later via PUT and partial fills are common.
    """

    name: str = Field(min_length=1, max_length=200)
    quantity: float | None = None
    unit: str | None = Field(default=None, max_length=40)


class StepEntry(BaseModel):
    """One structured cooking step.

    Phase 42 STEP-01 (D-03) — replaces the legacy flat-string step shape.
    ``ingredient_refs`` are exact-string matches against ``ingredients[].name``
    (D-08); the frontend joins by name with a graceful fallback to the
    ref text if no match (services/llm.py extraction is constrained by
    the Gemini prompt to reuse the ingredient names verbatim).
    """

    text: str = Field(..., min_length=1)
    ingredient_refs: list[str] = Field(default_factory=list)


# --- Create requests --------------------------------------------------------


class RecipeBlankCreate(BaseModel):
    """Phase 27 CAPTURE-03 — empty-body create for the conversational capture
    screen. The server stamps status='draft' and title='Extraction en cours…';
    all recipe fields are populated by promote_draft after « Enregistrer »
    triggers POST /recipes/{id}/promote. CONTEXT.md D-12 + D-13b.

    Strict {} per CONTEXT.md Claude's Discretion ("Recommend strict {}").
    """

    pass


class RecipeUpdate(BaseModel):
    """RECIPE-05 — patch-style update.

    ``manually_edited_fields`` is INTENTIONALLY absent — write path is Phase 28
    DETAIL-05. ``photo_paths``, ``cook_count`` and ``last_cooked_at`` are also
    absent: the photo route (01-09) and the cooking-log handler (W3) own those
    columns respectively. Raw capture inputs are kept forever in ``recipe_turns``
    (Phase 25 invariant #5 via turn payload, not a column on this schema).

    Setting ``status`` here IS allowed in W1 because the user's "I finished
    filling the draft" gesture is the only promotion path until W2's
    BackgroundTask lands. Threat T-01-08-08 documents this as accepted.
    """

    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: Literal["draft", "structured", "verified"] | None = None
    ingredients: list[IngredientItem] | None = None
    # Phase 42 STEP-01 — structured steps. Update DTO keeps None-means-no-change
    # semantics; default-factory empty list applies only to RecipeResponse.
    steps: list[StepEntry] | None = None
    prep_time_minutes: int | None = Field(default=None, ge=0, le=24 * 60)
    # Phase 24 RID-02 — three optional recipe-identity fields (D-12).
    cook_time_minutes: int | None = Field(default=None, ge=0, le=24 * 60)
    difficulty: DifficultyLiteral | None = None
    description: str | None = None
    servings: int | None = Field(default=None, ge=1, le=99)
    cuisine: Cuisine | None = None
    mood: list[Mood] | None = None
    main_protein: Protein | None = None
    seasonality: list[Season] | None = None
    tags: list[str] | None = None


# --- Response shape ---------------------------------------------------------


class RecipeResponse(BaseModel):
    """Single shape used for every read endpoint AND every WS broadcast payload.

    Keeping HTTP and WS payloads byte-identical means the frontend has one
    parser to maintain (plan 01-10). ``mood``/``seasonality``/``cuisine``/
    ``main_protein`` come back as plain strings because the SQLAlchemy model
    stores them as ``ARRAY(Text)``/``Text`` columns — the wire vocabulary is
    enforced on the WRITE side via the create/update schemas above.
    """

    id: UUID
    household_id: UUID
    created_by_member_id: UUID
    status: str
    # Phase 25 — kind of the first user turn (text/voice/photo/url),
    # synthesized server-side from recipe_turns. Used by RecipeDraftCard
    # variant logic in place of the legacy capture-type field.
    # None for the rare case of a recipe with no first user turn
    # (should not happen post-migration).
    initial_turn_kind: str | None = None
    title: str
    photo_paths: list[str]
    ingredients: list[IngredientItem] | None = None
    # Phase 42 STEP-01 (D-03) — list[StepEntry] with default []. Never None
    # on the wire; legacy rows surface via the lazy backfill in plan 42-03.
    steps: list[StepEntry] = Field(default_factory=list)
    prep_time_minutes: int | None = None
    # Phase 24 RID-02 — three optional recipe-identity fields (D-12).
    cook_time_minutes: int | None = None
    difficulty: str | None = None
    description: str | None = None
    # Phase 24 RID-05 D-39 — sanitized SVG illustration. NULL when not
    # yet generated or rejected by the sanitizer. Frontend renders via
    # dangerouslySetInnerHTML with the trust boundary documented at the
    # call site (per D-38).
    illustration_svg: str | None = None
    servings: int | None = None
    cuisine: str | None = None
    main_protein: str | None = None
    mood: list[str]
    seasonality: list[str]
    tags: list[str]
    # Phase 28 DETAIL-05 — carries the pin set so the `recipe.updated` WS broadcast
    # and every HTTP read surface deliver pin state to the frontend. Mutated by
    # `_apply_answer_turn`, `_apply_proposal_accepted`, and `_apply_put_pinning`.
    # Sorted on the write side for deterministic test assertions.
    manually_edited_fields: list[str] = Field(default_factory=list)
    last_cooked_at: datetime | None = None
    # Phase 29 D-21 / D-22 — drives the SystemBubble.tsx summary CTA collapse:
    # when set to a future timestamp, the frontend renders the summary bubble's
    # CTAs as dimmed/collapsed (questions are deferred). Mutated by
    # POST /recipes/{id}/questions/defer; cleared structurally by the column
    # being NULLable (no explicit "un-defer" endpoint — auto-expires after 24h).
    questions_deferred_until: datetime | None = None
    cook_count: int
    # Phase 4 (D-05): path of the most recent cooking-log photo. Set in same
    # tx as last_cooked_at + cook_count by PUT /cooking-logs/{id}. NULL =
    # never cooked OR most recent log had no photos.
    last_cooked_photo_path: str | None = None
    # Phase 2 (CONTEXT.md D-09 / Plan 02-05): surface promotion telemetry on the
    # wire so RecipeDraftCard can pick processing vs failed variants. Defaults
    # mean older callers (without the migrated columns) still validate.
    promotion_error: str | None = None
    promotion_attempts: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VoiceModifyRequest(BaseModel):
    """POST /recipes/{id}/voice-modify body."""

    transcript: str = Field(min_length=1, max_length=10_000)


class PromotionRetryResponse(BaseModel):
    """POST /recipes/{id}/retry-promotion + POST /recipes/{id}/promote response — minimal ack."""

    recipe_id: UUID
    queued: bool
