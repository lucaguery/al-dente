"""Phase 2 — Gemini 2.5 Flash service.

Owns the structured-output schema (`GeminiExtractedRecipe`), the three
Gemini call functions (`extract_from_transcript` / `extract_from_photos` /
`apply_voice_modification`), and the BackgroundTask bodies that wire those
into a fresh `SessionLocal` + `broadcast_to_household`.

Per `.planning/phases/02-llm-capture-w2/02-RESEARCH.md` §SDK Decision: this
module uses the unified `google-genai` SDK (released 2025), not the legacy
single-API package that was deprecated on 2025-08-31.

Architecture invariants honoured (CLAUDE.md):

* #1 (server-side promotion) — `promote_voice_draft` / `promote_photo_draft`
  are queued via `BackgroundTasks.add_task` from the routers (Plan 02). They
  open their OWN `SessionLocal()` because the request session is closed by
  the time the task runs. They NEVER raise out — failures are swallowed and
  recorded on the recipe row.
* #4 (realtime contract) — successful promotion broadcasts `recipe.promoted`
  via `broadcast_to_household`; failure does not broadcast (the FE polls
  via `recipe.updated` from the existing list flow + the error badge).
* #5 (raw inputs preserved) — `retry_promotion` rereads `source_capture` to
  reconstruct the input rather than asking the caller to re-supply it.

Threat-model mitigations (T-02-01-01 .. T-02-01-07 from the plan):

* User input (transcript / recipe JSON) is passed as a SEPARATE `contents[]`
  element — never concatenated into a system-style prompt string. The
  `response_schema=GeminiExtractedRecipe` Pydantic model + `Literal` enums
  (cuisine / mood / main_protein / seasonality) constrain the output shape
  so prompt-injection cannot widen the data surface.
* `_record_failure` truncates the exception message to 500 chars before
  writing to the DB to limit PII leakage from a verbose SDK error.
* `GEMINI_API_KEY` is read once at client construction; the value is never
  logged. We do not `print()` transcripts or recipe JSON.
"""

from __future__ import annotations

import asyncio
import json as _json
import logging
from typing import Any, Literal, Optional
from uuid import UUID

from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models.recipe import Recipe
from app.schemas.recipe import RecipeResponse
from app.services.realtime import broadcast_to_household

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Locked-vocabulary literals
# ---------------------------------------------------------------------------
# Mirror of `app/models/enums.py` — wire-format (camelCase) values verbatim.
# Drift between this list and the Enum classes is a category of bug per
# CLAUDE.md "Shared Vocabulary". These literals are what Gemini is forced
# to choose from via the `response_schema`.

CuisineLiteral = Literal[
    "italian",
    "french",
    "asian",
    "mediterranean",
    "middleEastern",
    "indian",
    "mexican",
    "northAfrican",
    "american",
    "other",
]
ProteinLiteral = Literal[
    "poultry",
    "redMeat",
    "fish",
    "seafood",
    "egg",
    "legume",
    "none",
]
MoodLiteral = Literal[
    "comfort",
    "light",
    "quick",
    "celebratory",
    "adventurous",
]
SeasonLiteral = Literal["spring", "summer", "autumn", "winter"]


# ---------------------------------------------------------------------------
# Pydantic schema for Gemini structured output
# ---------------------------------------------------------------------------


class GeminiIngredient(BaseModel):
    """One row of the `recipes.ingredients` JSONB array.

    SPEC.md §"Data model" shape: `{name, quantity, unit}`. Quantities and
    units are nullable because dictation rarely yields exact numbers.
    """

    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None


class GeminiExtractedRecipe(BaseModel):
    """Schema constraining Gemini's structured output.

    Field names mirror the `recipes` columns. Anything Gemini cannot extract
    must be `null` — the prompt instructs it to never invent values
    (T-02-01-01 mitigation: prompt + schema constrain the output shape).

    `mood` and `seasonality` default to empty lists because Gemini's
    `application/json` mode rejects `None` for `list` fields under some
    schema configurations; the BackgroundTask substitutes the all-seasons
    default when seasonality comes back empty (matches the DB column default).
    """

    title: str
    ingredients: Optional[list[GeminiIngredient]] = None
    steps: Optional[list[str]] = None
    prep_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    # Phase 24 RID-02 — cook_time_minutes mirrors prep_time_minutes shape.
    cook_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    servings: Optional[int] = Field(default=None, ge=1, le=99)
    # Phase 24 RID-02 — difficulty + description. Literal pattern matches CuisineLiteral.
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    cuisine: Optional[CuisineLiteral] = None
    mood: list[MoodLiteral] = Field(default_factory=list)
    main_protein: Optional[ProteinLiteral] = None
    seasonality: list[SeasonLiteral] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Lazy client singleton
# ---------------------------------------------------------------------------

_client: genai.Client | None = None


def _gemini() -> genai.Client:
    """Lazy-construct the Gemini client so missing env doesn't crash import.

    Module-import time has to stay safe (Alembic / pytest collect import
    services without env). The error surfaces at call time instead.
    """

    global _client
    if _client is None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_EXTRACT_PROMPT_VOICE = (
    "Extrais les champs structurés de cette recette dictée en français. "
    "Renvoie null pour les champs absents — n'invente rien. Ne mets que des "
    "valeurs des vocabulaires verrouillés pour cuisine, mood, main_protein, "
    "seasonality. Extrais aussi cook_time_minutes (en minutes), difficulty "
    "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette)."
)
_EXTRACT_PROMPT_PHOTOS = (
    "Voici une recette photographiée (1 à 4 images). Extrais les champs "
    "structurés en français. Renvoie null pour les champs absents — n'invente "
    "rien. Extrais aussi cook_time_minutes (en minutes), difficulty "
    "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette)."
)
_MODIFY_PROMPT = (
    "Voici une recette existante (JSON) et une instruction de modification "
    "dictée en français. Renvoie la recette MODIFIÉE en respectant le même "
    "schéma. Conserve les champs non concernés tels quels."
)

_GEMINI_MODEL = "gemini-2.5-flash"


# ---------------------------------------------------------------------------
# Pure Gemini-call functions (no DB, no broadcast — caller wraps these)
# ---------------------------------------------------------------------------


def extract_from_transcript(transcript: str) -> GeminiExtractedRecipe:
    """Voice transcript -> structured recipe. Raises on Gemini error.

    Caller is responsible for try/except around this — typically only
    `promote_voice_draft` calls it directly so the error gets recorded
    on the recipe row.
    """

    # D-04 — deterministic test mode: skip Gemini, return canned data.
    if settings.environment == "test":
        from app.services.llm_fixtures import canned_voice_recipe
        return canned_voice_recipe(transcript)

    response = _gemini().models.generate_content(
        model=_GEMINI_MODEL,
        contents=[_EXTRACT_PROMPT_VOICE, transcript],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiExtractedRecipe,
        ),
    )
    parsed = response.parsed
    if not isinstance(parsed, GeminiExtractedRecipe):
        raise ValueError("Gemini did not return a valid GeminiExtractedRecipe")
    return parsed


def extract_from_photos(photo_bytes_list: list[bytes]) -> GeminiExtractedRecipe:
    """1-4 photos -> structured recipe via inline bytes path (<20 MB total).

    The router (`POST /recipes/photo`, Plan 02) has already sniffed/validated
    each photo's MIME via `storage.detect_mime_and_ext`; we pass `image/jpeg`
    here because Gemini auto-detects from the magic bytes regardless of the
    declared MIME — we just need a vaguely-image hint in the part metadata.
    """

    # D-04 — deterministic test mode: skip Gemini, return canned data.
    if settings.environment == "test":
        from app.services.llm_fixtures import canned_photo_recipe
        return canned_photo_recipe(len(photo_bytes_list))

    if not photo_bytes_list:
        raise ValueError("at least one photo required")
    if len(photo_bytes_list) > 4:
        raise ValueError("at most 4 photos accepted")

    parts = [
        types.Part.from_bytes(data=b, mime_type="image/jpeg")
        for b in photo_bytes_list
    ]
    response = _gemini().models.generate_content(
        model=_GEMINI_MODEL,
        contents=[_EXTRACT_PROMPT_PHOTOS, *parts],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiExtractedRecipe,
        ),
    )
    parsed = response.parsed
    if not isinstance(parsed, GeminiExtractedRecipe):
        raise ValueError("Gemini did not return a valid GeminiExtractedRecipe")
    return parsed


def apply_voice_modification(
    recipe_json: dict[str, Any], transcript: str
) -> GeminiExtractedRecipe:
    """Existing recipe + modification instruction -> modified structured recipe.

    Read-only — does NOT persist. Caller (router for
    `POST /recipes/{id}/voice-modify`, Plan 02) returns the result to the FE
    so the user can review the pre-filled edit form (CONTEXT.md D-10/D-11).

    `recipe_json` is server-derived (read from the DB filtered by
    `member.household_id`) — never client-supplied (T-02-01-05 mitigation).
    """

    # D-04 — deterministic test mode: skip Gemini, return canned data.
    if settings.environment == "test":
        from app.services.llm_fixtures import canned_modified_recipe
        return canned_modified_recipe(recipe_json, transcript)

    response = _gemini().models.generate_content(
        model=_GEMINI_MODEL,
        contents=[
            _MODIFY_PROMPT,
            f"Recette actuelle: {_json.dumps(recipe_json, ensure_ascii=False)}",
            f"Instruction: {transcript}",
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiExtractedRecipe,
        ),
    )
    parsed = response.parsed
    if not isinstance(parsed, GeminiExtractedRecipe):
        raise ValueError("Gemini did not return a valid GeminiExtractedRecipe")
    return parsed


# ---------------------------------------------------------------------------
# Helpers used by the BackgroundTask bodies
# ---------------------------------------------------------------------------


def _apply_extracted(recipe: Recipe, extracted: GeminiExtractedRecipe) -> None:
    """Apply Gemini's parsed output to the recipe row in-place.

    Promotion succeeds only if Gemini extracted a non-empty title (the only
    NOT NULL non-default column). Empty seasonality falls back to all four
    seasons to match the DB column's server default.
    """

    if not extracted.title or not extracted.title.strip():
        raise ValueError("Gemini returned empty title")
    recipe.title = extracted.title
    recipe.ingredients = (
        [i.model_dump() for i in extracted.ingredients]
        if extracted.ingredients
        else None
    )
    recipe.steps = extracted.steps
    recipe.prep_time_minutes = extracted.prep_time_minutes
    recipe.servings = extracted.servings
    # Phase 24 RID-02 — three optional recipe-identity fields.
    recipe.cook_time_minutes = extracted.cook_time_minutes
    recipe.difficulty = extracted.difficulty
    recipe.description = extracted.description
    recipe.cuisine = extracted.cuisine
    recipe.mood = list(extracted.mood) if extracted.mood else []
    recipe.main_protein = extracted.main_protein
    recipe.seasonality = (
        list(extracted.seasonality)
        if extracted.seasonality
        else ["spring", "summer", "autumn", "winter"]
    )
    recipe.status = "structured"
    recipe.promotion_error = None


def _broadcast_promoted(recipe: Recipe) -> None:
    """Fan out a `recipe.promoted` frame to both phones in the household.

    `broadcast_to_household` is async; the BackgroundTask runs sync, so we
    spin up a one-shot event loop with `asyncio.run`. The realtime helper
    swallows per-socket failures internally so we never raise from here.
    """

    payload = RecipeResponse.model_validate(recipe).model_dump(mode="json")
    asyncio.run(broadcast_to_household(recipe.household_id, "recipe.promoted", payload))


def _record_failure(db: Session, recipe: Recipe, exc: Exception) -> None:
    """Persist a Gemini failure to the recipe row.

    Truncates the message to 500 chars to limit PII leakage from a verbose
    SDK error (T-02-01-02 mitigation). Phase 16 D-16-04: also flips the
    recipe status to 'failed' so the inbox row branches on the canonical
    terminal state rather than the `promotion_error != null` workaround.

    The frontend renders the French failed-state label + truncated error
    context + Réessayer/Supprimer actions (CONTEXT.md D-16-06; implemented
    in Plan 16-04). The pre-Phase-16 v0.1 surface (Échec badge with retry)
    continues to work because the failed-state branch already keys off
    `promotion_error != null` — once the FE flips to `status === "failed"`
    (Plan 16-04), both conditions converge.
    """

    log.exception("promotion failed recipe=%s", recipe.id)
    recipe.status = "failed"
    recipe.promotion_error = str(exc)[:500]
    recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
    db.commit()


# ---------------------------------------------------------------------------
# BackgroundTask bodies — queued by Plan 02 routers
# ---------------------------------------------------------------------------


def promote_voice_draft(recipe_id: UUID, transcript: str) -> None:
    """BackgroundTask body for `POST /recipes/voice` (Plan 02).

    Opens its own `SessionLocal()` because the request session is closed
    by the time this runs (FastAPI BackgroundTasks run AFTER the response
    has been sent). NEVER raises — exceptions are recorded on the row.
    """

    db = SessionLocal()
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            log.warning("promote_voice: recipe %s vanished", recipe_id)
            return
        try:
            extracted = extract_from_transcript(transcript)
            _apply_extracted(recipe, extracted)
            recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
            db.commit()
            db.refresh(recipe)
            _broadcast_promoted(recipe)
        except Exception as exc:  # noqa: BLE001 — must never raise out of task
            _record_failure(db, recipe, exc)
    finally:
        db.close()


def promote_photo_draft(recipe_id: UUID, photo_bytes_list: list[bytes]) -> None:
    """BackgroundTask body for `POST /recipes/photo` (Plan 02).

    Same contract as `promote_voice_draft`: own session, swallowed errors,
    success-path broadcast.
    """

    db = SessionLocal()
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            log.warning("promote_photo: recipe %s vanished", recipe_id)
            return
        try:
            extracted = extract_from_photos(photo_bytes_list)
            _apply_extracted(recipe, extracted)
            recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
            db.commit()
            db.refresh(recipe)
            _broadcast_promoted(recipe)
        except Exception as exc:  # noqa: BLE001
            _record_failure(db, recipe, exc)
    finally:
        db.close()


def retry_promotion(recipe_id: UUID) -> None:
    """BackgroundTask body for `POST /recipes/{id}/retry-promotion` (Plan 02).

    Re-reads `source_capture` (CLAUDE.md invariant #5: raw inputs are kept
    forever) to reconstruct the original transcript / photo paths, clears
    `promotion_error`, then dispatches to the appropriate `promote_*`.

    # TODO(productize): photo retries currently surface a clear error
    because v0.1 doesn't re-download photo bytes from Supabase Storage. The
    transcript path works because the transcript is stored verbatim in
    `source_capture.payload`.
    """

    db = SessionLocal()
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            return
        sc = recipe.source_capture or {}
        sc_type = sc.get("type")
        payload = sc.get("payload") or {}
        recipe.promotion_error = None
        db.commit()

        if sc_type == "voice":
            transcript = payload.get("transcript") or ""
            if not transcript.strip():
                _record_failure(
                    db, recipe, ValueError("retry: transcript missing")
                )
                return
            # Drop the request session — promote_voice_draft opens its own.
            db.close()
            promote_voice_draft(recipe_id, transcript)
            return
        if sc_type == "photo":
            # photo bytes aren't stored in source_capture (only paths); v0.1
            # photo retries surface a clear error rather than re-downloading
            # from Supabase Storage. # TODO(productize)
            _record_failure(
                db,
                recipe,
                ValueError(
                    "photo retry not supported in v0.1 — # TODO(productize)"
                ),
            )
            return
        # url / manual / unknown — should never reach retry path
        _record_failure(
            db,
            recipe,
            ValueError(f"retry not applicable for type={sc_type!r}"),
        )
    finally:
        db.close()
