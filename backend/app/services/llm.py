"""Phase 2 — Gemini 2.5 Flash service. Phase 25 cutover to recipe_turns.

Owns the structured-output schema (`GeminiExtractedRecipe`), the three
Gemini call functions (`extract_from_transcript` / `extract_from_photos` /
`apply_voice_modification`), and the BackgroundTask body that wires those
into a fresh `SessionLocal` + `broadcast_to_household`.

Per `.planning/phases/02-llm-capture-w2/02-RESEARCH.md` §SDK Decision: this
module uses the unified `google-genai` SDK (released 2025), not the legacy
single-API package that was deprecated on 2025-08-31.

Architecture invariants honoured (CLAUDE.md):

* #1 (server-side promotion) — `promote_draft` is queued via
  `BackgroundTasks.add_task` from the routers (Phase 25). It opens its OWN
  `SessionLocal()` because the request session is closed by the time the
  task runs. It NEVER raises out — failures are swallowed and recorded on
  the recipe row. Reads from `recipe_turns` (position=0, sender='user')
  and dispatches on `turn.kind`.
* #4 (realtime contract) — successful promotion broadcasts `recipe.promoted`
  via `broadcast_to_household`; failure does not broadcast (the FE polls
  via `recipe.updated` from the existing list flow + the error badge).
* #5 (raw inputs preserved) — raw inputs now kept in `recipe_turns` table
  (Phase 25 D-08: initial turn payload holds text/transcript/photo_paths/url).

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
from app.models.recipe_turn import RecipeTurn
from app.schemas.recipe import RecipeResponse
from app.services import storage as storage_service
from app.services.realtime import broadcast_to_household
from app.services.svg_sanitizer import sanitize_recipe_svg

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
# Phase 24 RID-02 — DifficultyLiteral mirrors frontend/lib/enums.ts Difficulty.
DifficultyLiteral = Literal["easy", "medium", "hard"]


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
    # Phase 24 RID-02 — three new optional fields (D-13).
    cook_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    difficulty: Optional[DifficultyLiteral] = None
    description: Optional[str] = None
    servings: Optional[int] = Field(default=None, ge=1, le=99)
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
    "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette). "
    # Phase 24 RID-04 D-27 — catchy-title clause. No extra Gemini round-trip for
    # voice/photo: the title instruction lives in the existing extract call so
    # extracted.title IS the catchy version. Voice/photo failure path stays
    # status='failed' (the whole extract failed, not just the title rewrite).
    "Le champ title doit être une formule courte et accrocheuse en français "
    "(max 60 caractères, sans guillemets, sans liste d'ingrédients)."
)
_EXTRACT_PROMPT_PHOTOS = (
    "Voici une recette photographiée (1 à 4 images). Extrais les champs "
    "structurés en français. Renvoie null pour les champs absents — n'invente "
    "rien. Extrais aussi cook_time_minutes (en minutes), difficulty "
    "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette). "
    # Phase 24 RID-04 D-27 — same catchy-title clause as _EXTRACT_PROMPT_VOICE.
    "Le champ title doit être une formule courte et accrocheuse en français "
    "(max 60 caractères, sans guillemets, sans liste d'ingrédients)."
)
_MODIFY_PROMPT = (
    "Voici une recette existante (JSON) et une instruction de modification "
    "dictée en français. Renvoie la recette MODIFIÉE en respectant le même "
    "schéma. Conserve les champs non concernés tels quels."
)

# Phase 24 RID-04 D-25 — plain-text title-rewrite prompt. No JSON schema;
# response.text is the bare-text accessor. Prompt verbatim from gh#10 / D-25.
_REWRITE_TITLE_PROMPT = (
    "Réécris ce titre de recette pour qu'il soit court et accrocheur en "
    "français. Pas plus de 60 caractères. Ne mets pas la liste des ingrédients "
    "dans le titre. Renvoie UNIQUEMENT le nouveau titre, sans guillemets, "
    "sans préfixe."
)

_GEMINI_MODEL = "gemini-2.5-flash"


# ---------------------------------------------------------------------------
# Pure Gemini-call functions (no DB, no broadcast — caller wraps these)
# ---------------------------------------------------------------------------


def extract_from_transcript(transcript: str) -> GeminiExtractedRecipe:
    """Voice transcript -> structured recipe. Raises on Gemini error.

    Caller is responsible for try/except around this — typically only
    `promote_draft` calls it (voice branch) so the error gets recorded
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
# Phase 24 RID-04 — title rewrite (D-25)
# ---------------------------------------------------------------------------


def rewrite_title(original_title: str, recipe_context: dict[str, Any]) -> str:
    """Phase 24 RID-04 — rewrite a recipe title into a catchy French phrasing.

    Returns a stripped, length-capped (≤60 char) plain-text string.
    Raises ValueError on empty Gemini output; raises whatever google-genai
    raises on API errors. Caller (promote_draft text/voice branches) wraps
    this in try/except and routes failures through _record_rewrite_failure.

    recipe_context is reserved for future enrichment (e.g., passing
    cuisine/main_protein so Gemini can tailor the rewrite). v1: not used
    in the prompt — the title alone suffices.

    Plain-text call — no response_schema, no response_mime_type.
    response.text is the bare-text accessor (RESEARCH.md §Pattern 2 +
    google-genai SDK models.py). Do NOT use response.parsed — it is None
    for plain-text calls (RESEARCH.md §Pitfall 4).
    """

    # D-25 test-mode shortcut: deterministic output for Playwright fixtures.
    if settings.environment == "test":
        from app.services.llm_fixtures import canned_rewritten_title
        return canned_rewritten_title(original_title)

    response = _gemini().models.generate_content(
        model=_GEMINI_MODEL,
        contents=[_REWRITE_TITLE_PROMPT, original_title],
        # No config needed for plain text — default output is text (D-25).
    )
    result = (response.text or "").strip()
    if not result:
        raise ValueError("Gemini returned empty title rewrite")
    # Strip newlines defensively (prompt injection mitigation T-24-04-01).
    # Length cap matches the prompt instruction (60 chars).
    result = result.replace("\n", " ").strip()
    return result[:60]


# ---------------------------------------------------------------------------
# Phase 24 RID-05 — per-recipe SVG illustration generation (D-32)
# ---------------------------------------------------------------------------

# Plain-text prompt — Gemini returns raw XML text. Caller passes through
# services/svg_sanitizer.sanitize_recipe_svg before persisting.
_ILLUSTRATION_PROMPT = (
    "Crée un pictogramme SVG simple représentant cette recette. "
    "Trait fin, monochrome. Utilise stroke='currentColor', fill='none', "
    "viewBox='0 0 160 160'. 1 à 3 paths maximum, pas de texte, pas de "
    "remplissage de couleur. Renvoie UNIQUEMENT le XML SVG, sans Markdown, "
    "sans préfixe."
)


def generate_recipe_illustration(recipe_title: str, recipe_context: dict[str, Any]) -> str:
    """Phase 24 RID-05 — generate a monochrome line-art SVG pictogram for a recipe.

    Returns the RAW Gemini output (unstripped, unsanitized). The caller MUST
    pass the result through services/svg_sanitizer.sanitize_recipe_svg before
    persisting. Returning the raw string keeps the trust boundary explicit:
    this function is the LLM call; the sanitizer is the security gate.

    recipe_context reserved for future enrichment (cuisine/main_protein could
    hint Gemini toward style choices). v1: title alone.
    """

    # D-04 test-mode shortcut: deterministic canned SVG for Playwright fixtures.
    if settings.environment == "test":
        from app.services.llm_fixtures import canned_recipe_illustration
        return canned_recipe_illustration(recipe_title)

    response = _gemini().models.generate_content(
        model=_GEMINI_MODEL,
        contents=[_ILLUSTRATION_PROMPT, recipe_title],
        # No config needed for plain text — default output is text (D-32).
    )
    result = (response.text or "").strip()
    if not result:
        raise ValueError("Gemini returned empty illustration")
    return result


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
    # Phase 24 RID-02 — write the three new optional fields (D-13).
    recipe.cook_time_minutes = extracted.cook_time_minutes
    recipe.difficulty = extracted.difficulty
    recipe.description = extracted.description
    recipe.servings = extracted.servings
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


def _record_rewrite_failure(db: Session, recipe: Recipe, exc: Exception) -> None:
    """Phase 24 RID-04 / D-26 — record a title-rewrite failure WITHOUT failing the row.

    Unlike _record_failure (which sets status='failed' for voice/photo extract
    failures where the whole extract failed), this sets status='structured'
    because quick/full-form captures have all their content — only the LLM
    title polish step failed. The promotion_error column carries context so
    the retry endpoint can re-run rewrite if the user wants a fresh attempt
    (D-28). The recipe IS promoted (usable, structured), so we still broadcast
    recipe.promoted. The frontend treats status='structured' rows as done;
    promotion_error context only appears when status='failed'.

    Uses log.warning (NOT log.exception) — rewrite failures are expected
    occasionally (Gemini API hiccups) and don't need stacktrace noise.
    _record_failure uses log.exception for voice/photo because those failures
    are catastrophic (the user loses the recipe entirely without retry).
    """

    log.warning("rewrite failed recipe=%s: %s", recipe.id, exc)
    recipe.status = "structured"  # KEY DIFFERENCE from _record_failure (D-26)
    recipe.promotion_error = str(exc)[:500]
    recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
    db.commit()
    # Still broadcast recipe.promoted — the recipe IS promoted, just without
    # a catchy title. _broadcast_promoted must come after db.commit + refresh
    # so the payload reflects the just-committed state.
    db.refresh(recipe)
    _broadcast_promoted(recipe)


# ---------------------------------------------------------------------------
# BackgroundTask bodies — queued by Plan 02 routers
# ---------------------------------------------------------------------------


def _generate_and_sanitize_illustration(recipe_title: str) -> str | None:
    """Phase 24 RID-05 D-36 — generate + sanitize the per-recipe SVG illustration.

    Returns the sanitized SVG string on success, or None if either Gemini fails
    OR the sanitizer rejects the output. NEVER raises — the caller's broader
    try/except catches the catastrophic promotion-failure path; illustration
    failure is logged and silently downgrades to NULL (frontend BrandIcon fallback).
    """
    try:
        raw_svg = generate_recipe_illustration(recipe_title, {})
    except Exception as exc:  # noqa: BLE001
        log.warning("illustration generation failed for %r: %s", recipe_title, exc)
        return None
    sanitized = sanitize_recipe_svg(raw_svg)
    if sanitized is None:
        log.warning(
            "illustration rejected by sanitizer for %r (raw=%r)",
            recipe_title,
            raw_svg[:200],
        )
        return None
    return sanitized


def promote_draft(recipe_id: UUID) -> None:
    """Single promote entry point — reads first user turn, dispatches on kind.

    Phase 25 THREAD-04 (D-06). Replaces the four per-surface
    promote_*_draft functions. Opens its own SessionLocal
    (BackgroundTask pattern — established in 02-RESEARCH §Pitfall 3).

    Phase 25 does NOT emit summary/question/advisory system turns
    (D-07) — that is Phase 29's job. This function applies extracted
    fields to recipes.* and broadcasts recipe.promoted, exactly as
    the legacy promote_*_draft functions did.

    NEVER raises — exceptions are recorded on the recipe row via _record_failure.
    """
    db = SessionLocal()
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            log.warning("promote_draft: recipe %s vanished", recipe_id)
            return

        first_turn = db.scalar(
            select(RecipeTurn).where(
                RecipeTurn.recipe_id == recipe_id,
                RecipeTurn.sender == "user",
                RecipeTurn.position == 0,
            )
        )
        if first_turn is None:
            log.warning(
                "promote_draft: no first user turn for recipe %s",
                recipe_id,
            )
            return

        try:
            kind = first_turn.kind
            payload = first_turn.payload or {}

            if kind == "text":
                # Quick + full-form path — rewrite title from turn payload.
                # Falls back to recipe.title if the turn payload has no text
                # (e.g. legacy backfill text turns — D-01).
                original_title = payload.get("text") or recipe.title
                new_title = rewrite_title(original_title, {})
                recipe.title = new_title
                # Phase 24 RID-05 D-36 — illustration after title rewrite.
                # Failure NEVER affects recipe.status (BrandIcon fallback for NULL svg).
                recipe.illustration_svg = _generate_and_sanitize_illustration(
                    recipe.title
                )
                recipe.status = "structured"
                recipe.promotion_error = None
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)

            elif kind == "voice":
                transcript = payload.get("transcript") or ""
                if not transcript.strip():
                    raise ValueError("promote_draft voice: empty transcript")
                extracted = extract_from_transcript(transcript)
                _apply_extracted(recipe, extracted)
                # Phase 24 RID-05 D-36 — illustration generation.
                # Failure NEVER affects recipe.status (BrandIcon fallback for NULL svg).
                recipe.illustration_svg = _generate_and_sanitize_illustration(
                    recipe.title
                )
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)

            elif kind == "photo":
                photo_paths = payload.get("photo_paths") or []
                if not photo_paths:
                    # Legacy backfill turns (D-02) have empty payload —
                    # fall back to recipe.photo_paths (Pitfall 4).
                    photo_paths = list(recipe.photo_paths or [])
                if not photo_paths:
                    raise ValueError("promote_draft photo: no photo paths")
                # D-08: download bytes from Supabase Storage. Closes the
                # v0.1 TODO(productize) that noted photo retry wasn't supported
                # because bytes weren't stored (now kept in recipe_turns payload).
                photo_bytes_list = [
                    storage_service.download_recipe_photo(p)
                    for p in photo_paths
                ]
                extracted = extract_from_photos(photo_bytes_list)
                _apply_extracted(recipe, extracted)
                # Phase 24 RID-05 D-36 — illustration generation.
                recipe.illustration_svg = _generate_and_sanitize_illustration(
                    recipe.title
                )
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)

            elif kind == "url":
                # URL extraction is Phase 26 TURN-04. Phase 25 just stamps
                # the draft as structured so the card leaves the inbox —
                # matches v0.5 url-capture behavior (no Gemini call).
                recipe.status = "structured"
                recipe.promotion_error = None
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)

            else:
                raise ValueError(
                    f"promote_draft: unknown turn kind {kind!r}"
                )

        except Exception as exc:  # noqa: BLE001
            _record_failure(db, recipe, exc)
    finally:
        db.close()


def retry_promotion(recipe_id: UUID) -> None:
    """Thin wrapper — Phase 25 D-09.

    Dispatch logic lives in promote_draft. Retry semantics fall out
    naturally (the first user turn is the same; promotion_attempts
    increments). The POST /recipes/{id}/retry-promotion router endpoint
    stays in place; only the service body changed.
    """
    promote_draft(recipe_id)
