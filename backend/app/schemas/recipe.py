"""Pydantic v2 schemas for the recipe library API (plan 01-08).

Wire-format contract for the W1 manual capture surfaces:

* ``RecipeFullCreate``  — POST /recipes (RECIPE-01, status='structured')
* ``RecipeQuickCreate`` — POST /recipes/quick (RECIPE-02, status='draft')
* ``RecipeUpdate``      — PUT /recipes/{id} (RECIPE-05, source_capture INTENTIONALLY absent)
* ``RecipeResponse``    — every read shape + the WS broadcast payload

Locked-vocabulary validation flows through ``app.models.enums`` (Cuisine, Mood,
Protein, Season). Because those classes inherit ``str, Enum``, Pydantic v2 both
accepts the wire-format string at input *and* serializes back to that string
through ``model_dump(mode='json')`` — keeping the frontend ↔ backend vocab
drift surface to a single file pair (CLAUDE.md "Shared Vocabulary").

CLAUDE.md invariant 5 — raw inputs are kept forever — is enforced here by the
deliberate ABSENCE of ``source_capture`` from ``RecipeUpdate``: the only path
to write that JSONB column is the create handlers.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import Cuisine, Mood, Protein, Season


# --- Sub-shapes -------------------------------------------------------------


class IngredientItem(BaseModel):
    """One row of the ``ingredients`` JSONB array.

    SPEC.md §"Data model": ``ingredients JSONB`` = ``[{name, quantity, unit}, ...]``.
    Quantities and units are nullable because quick-add can promote to structured
    later via PUT and partial fills are common.
    """

    name: str = Field(min_length=1, max_length=200)
    quantity: Optional[float] = None
    unit: Optional[str] = Field(default=None, max_length=40)


# --- Create requests --------------------------------------------------------


class RecipeFullCreate(BaseModel):
    """RECIPE-01 — full-form create. Server stamps ``status='structured'``.

    The full-form surface is "the human did the structuring work" path; the
    LLM-promotion path (W2) lands on the same shape via ``status='structured'``
    once the BackgroundTask returns.
    """

    title: str = Field(min_length=1, max_length=200)
    ingredients: List[IngredientItem] = Field(default_factory=list)
    steps: List[str] = Field(default_factory=list)
    prep_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    servings: Optional[int] = Field(default=None, ge=1, le=99)
    cuisine: Optional[Cuisine] = None
    mood: List[Mood] = Field(default_factory=list)
    main_protein: Optional[Protein] = None
    seasonality: List[Season] = Field(
        default_factory=lambda: [
            Season.spring,
            Season.summer,
            Season.autumn,
            Season.winter,
        ]
    )
    tags: List[str] = Field(default_factory=list)


class RecipeQuickCreate(BaseModel):
    """RECIPE-02 — title-only quick add. Server stamps ``status='draft'``.

    Photo upload is a SEPARATE call (``POST /recipes/{id}/photos`` lands in
    plan 01-09); the FE chains the two when a photo was attached at quick-add
    time so this plan and 01-09 can be executed in parallel without touching
    the same router file.
    """

    title: str = Field(min_length=1, max_length=200)


class RecipeUpdate(BaseModel):
    """RECIPE-05 — patch-style update.

    ``source_capture`` is INTENTIONALLY absent — CLAUDE.md invariant 5: raw
    inputs are kept forever and never overwritten via PUT. ``photo_paths``,
    ``cook_count`` and ``last_cooked_at`` are also absent: the photo route
    (01-09) and the cooking-log handler (W3) own those columns respectively.

    Setting ``status`` here IS allowed in W1 because the user's "I finished
    filling the draft" gesture is the only promotion path until W2's
    BackgroundTask lands. Threat T-01-08-08 documents this as accepted.
    """

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    status: Optional[Literal["draft", "structured", "verified"]] = None
    ingredients: Optional[List[IngredientItem]] = None
    steps: Optional[List[str]] = None
    prep_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    servings: Optional[int] = Field(default=None, ge=1, le=99)
    cuisine: Optional[Cuisine] = None
    mood: Optional[List[Mood]] = None
    main_protein: Optional[Protein] = None
    seasonality: Optional[List[Season]] = None
    tags: Optional[List[str]] = None


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
    title: str
    source_capture: dict[str, Any]
    photo_paths: List[str]
    ingredients: Optional[List[IngredientItem]] = None
    steps: Optional[List[str]] = None
    prep_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    cuisine: Optional[str] = None
    main_protein: Optional[str] = None
    mood: List[str]
    seasonality: List[str]
    tags: List[str]
    last_cooked_at: Optional[datetime] = None
    cook_count: int
    # Phase 2 (CONTEXT.md D-09 / Plan 02-05): surface promotion telemetry on the
    # wire so RecipeDraftCard can pick processing vs failed variants. Defaults
    # mean older callers (without the migrated columns) still validate.
    promotion_error: Optional[str] = None
    promotion_attempts: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Phase 2 capture surfaces (W2) -----------------------------------------


class VoiceCaptureRequest(BaseModel):
    """POST /recipes/voice body. Transcript text only — frontend collects via
    textarea (iOS keyboard dictation or manual typing). NO Web Speech API on
    the wire (see Phase 2 critical decision: textarea-only voice UX)."""

    transcript: str = Field(min_length=1, max_length=10_000)


class UrlCaptureRequest(BaseModel):
    """POST /recipes/url body. URL stored in source_capture verbatim;
    no Gemini extraction in v0.1 (CAPTURE-03 explicit).

    # TODO(productize): URL fetch + Gemini extraction (CAPTURE-03 deferred).
    """

    url: str = Field(min_length=1, max_length=2_000)


class VoiceModifyRequest(BaseModel):
    """POST /recipes/{id}/voice-modify body. Same shape as VoiceCaptureRequest."""

    transcript: str = Field(min_length=1, max_length=10_000)


class PromotionRetryResponse(BaseModel):
    """POST /recipes/{id}/retry-promotion response — minimal ack."""

    recipe_id: UUID
    queued: bool
