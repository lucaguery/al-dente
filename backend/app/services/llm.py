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
import hashlib
import json as _json
import logging
from datetime import datetime, timezone
from typing import Any, Literal, Optional
from uuid import UUID

from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

import httpx  # Phase 26 D-24 (already in pyproject.toml per pre-research)
import trafilatura  # Phase 26 D-23 (already in pyproject.toml per pre-research)

from app.config import settings
from app.db import SessionLocal
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn
from app.schemas.recipe import RecipeResponse
from app.schemas.recipe_turn import TurnResponse  # Phase 26 D-29 — turn.updated payload shape
from app.services import storage as storage_service
from app.services.realtime import broadcast_to_household
from app.services.svg_sanitizer import sanitize_recipe_svg
from app.services.thread import _is_safe_url  # Phase 26 SSRF defense
from sqlalchemy.orm.attributes import flag_modified  # Phase 26 D-28 — JSONB sub-key mutation

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
    # Phase 29 D-05 — Gemini-generated 1-2 sentence French recap of what was
    # extracted/modified. Optional because apply_voice_modification reuses this
    # schema and its prompt does NOT request summary_body (Pitfall 2).
    # _run_thread_llm uses a server fallback when None.
    summary_body: Optional[str] = Field(default=None, max_length=240)


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

# Phase 29 D-02 — full-thread prompt. The role-labeled prose is built per-call
# by _build_thread_prompt; this constant is the locked instructional preamble.
_EXTRACT_PROMPT_THREAD = (
    "Voici la conversation complète entre l'utilisateur et le système au sujet "
    "d'une recette. Extrais les champs structurés en français en tenant compte "
    "de TOUS les messages — le plus récent est le plus important s'il contredit "
    "un message antérieur. Renvoie null pour les champs absents — n'invente rien. "
    "Le champ title doit être une formule courte et accrocheuse en français "
    "(max 60 caractères, sans guillemets, sans liste d'ingrédients). "
    "Le champ summary_body doit décrire en français en 1-2 phrases ce qui a été "
    "extrait ou modifié par rapport au tour précédent. Maximum 240 caractères. "
    "Pour les CHAMPS ÉPINGLÉS listés en fin de prompt, ne modifie ces valeurs "
    "que si le fil les contredit explicitement — sinon, conserve la valeur actuelle."
)

# Phase 29 D-23 — photo token cap across thread (matches extract_from_photos limit).
_MAX_PHOTO_PARTS = 4

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

# NOTE: extract_from_transcript and extract_from_photos were deleted in Phase 29
# (MVP no-shim posture). _run_thread_llm subsumes both paths via the full thread prompt.
# apply_voice_modification is preserved — still called by POST /recipes/{id}/voice-modify.


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

    WR-02 — SYNC-CONTEXT ONLY. asyncio.run() forbids reentrant calls;
    invoking this from an async def (e.g. a future hand calls
    _record_rewrite_failure from inside extract_and_process_url_turn,
    which is async) would raise RuntimeError. The defensive guard below
    fails loudly with an actionable message in that scenario — callers
    in async contexts must `await broadcast_to_household(...)` directly.
    """

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        pass  # No loop — safe to asyncio.run()
    else:
        raise RuntimeError(
            "_broadcast_promoted called from within a running event loop; "
            "await broadcast_to_household() directly instead."
        )
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


def _record_turn_enrichment_failure(
    db: Session, recipe: Recipe, turn: RecipeTurn, exc: Exception
) -> None:
    """Phase 26 CR-01 — record a turn-side enrichment failure WITHOUT mutating recipe.status.

    Used by extract_and_process_url_turn when the recipe is already past
    initial promotion (e.g. follow-up url turn on a structured recipe). The
    recipe is unchanged; the failure surfaces on the turn payload so the FE
    can render a 'Lien non extrait — réessayer' chip on the url bubble.

    Symmetric to _record_rewrite_failure (which preserves status='structured'
    when only the title polish step fails). Trafilatura-returns-None hits a
    10-20% rate per RESEARCH §Area 1 / R-2 on JS-rendered pages; demoting the
    whole recipe to 'failed' for a follow-up url turn would destroy the
    library row and force the user through retry-promotion, which would then
    re-run promote_draft against the position=0 turn and ignore the new url
    turn entirely.
    """

    log.warning("turn enrichment failed recipe=%s turn=%s: %s", recipe.id, turn.id, exc)
    turn.payload = {**(turn.payload or {}), "extraction_error": str(exc)[:500]}
    flag_modified(turn, "payload")
    db.commit()


# ---------------------------------------------------------------------------
# Phase 29 — full-thread LLM helpers (LLM-01, LLM-02, LLM-03)
# ---------------------------------------------------------------------------

from sqlalchemy import func  # noqa: E402 — placed here to co-locate with phase 29 helpers

from app.services.completeness import (  # noqa: E402
    FIELD_KEYS,
    INPUT_TYPE_MAP,
    OPTIONS_MAP,
    _FIELD_LABELS_FR,
    _FIELD_PROMPTS_FR,
    compute_completeness,
    is_conflict,
)
from app.schemas.recipe_turn import (  # noqa: E402
    AdvisoryTurnPayload,
    AnswerField,
    QuestionTurnPayload,
    SummaryTurnPayload,
)


def _extraction_hash(extracted: GeminiExtractedRecipe) -> str:
    """Phase 29 D-03 — canonical SHA256 of the parsed extraction.

    Pitfall 1: Pydantic v2 has NO model_dump_json(sort_keys=True). Use
    json.dumps(model_dump(), sort_keys=True, ensure_ascii=False) instead.
    """
    canonical = _json.dumps(
        extracted.model_dump(), sort_keys=True, ensure_ascii=False
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _extract_reason_from_thread(
    turns: list[RecipeTurn], trigger_position: int
) -> str:
    """Phase 29 D-17 — quote the most recent user turn ≤ trigger_position.

    Returns the literal user text wrapped in « », newlines stripped, ≤120 chars
    (≤100 for url). System turns are skipped — the user's own words are quoted.
    Returns «  » (empty quote) defensively if no user turn exists.
    """
    for turn in reversed(turns):
        if turn.position > trigger_position:
            continue
        if turn.sender != "user":
            continue
        payload = turn.payload or {}
        kind = turn.kind
        if kind == "text":
            text = (payload.get("text") or "").replace("\n", " ").strip()[:120]
        elif kind == "voice":
            text = (payload.get("transcript") or "").replace("\n", " ").strip()[:120]
        elif kind == "url":
            url = (payload.get("url") or "")[:100]
            text = f"extrait de {url}"
        elif kind == "photo":
            text = "extrait de la photo"
        elif kind == "answer":
            text = f"tu as répondu : « {payload.get('value', '')} »"
        else:
            continue
        return f"« {text} »"
    return "«  »"


def _should_emit_advisory(
    turns: list[RecipeTurn], field: str, proposed_value: Any
) -> bool:
    """Phase 29 D-18 — suppress duplicate advisories.

    Walk turns backward looking for the most recent advisory turn for this field.
    If unresolved (no later proposal_accepted/proposal_dismissed) → SUPPRESS.
    If resolved AND prior proposed_value == proposed_value → SUPPRESS.
    Otherwise (no prior advisory OR resolved-with-different-proposal) → EMIT.
    """
    # Find most recent advisory for this field
    most_recent_advisory: Optional[RecipeTurn] = None
    for turn in reversed(turns):
        if turn.kind == "advisory" and (turn.payload or {}).get("field") == field:
            most_recent_advisory = turn
            break
    if most_recent_advisory is None:
        return True  # no prior advisory — allow emission
    # Check resolution status
    resolved = False
    for turn in turns:
        if turn.position <= most_recent_advisory.position:
            continue
        if turn.kind in ("proposal_accepted", "proposal_dismissed"):
            # Defensive str() on both sides — payload stores UUID as string via
            # mode="json" serialization, but test helpers may insert raw UUID objects.
            ref_id = str((turn.payload or {}).get("in_reply_to_turn_id") or "")
            if ref_id == str(most_recent_advisory.id):
                resolved = True
                break
    if not resolved:
        return False  # unresolved — don't pile up
    prior_proposed = (most_recent_advisory.payload or {}).get("proposed_value")
    if prior_proposed == proposed_value:
        return False  # already decided on this exact proposal
    return True  # different proposal → emit


def _should_emit_question(
    turns: list[RecipeTurn], field: str
) -> bool:
    """Phase 29 D-12 — suppress when an unanswered question for the field exists.

    Unanswered question = a `question` turn for this field with no later
    `answer` turn whose payload.in_reply_to_turn_id matches the question's id.
    """
    most_recent_question: Optional[RecipeTurn] = None
    for turn in reversed(turns):
        if turn.kind == "question" and (turn.payload or {}).get("field") == field:
            most_recent_question = turn
            break
    if most_recent_question is None:
        return True  # no prior question — allow emission
    # Resolved if a later answer turn references it
    for turn in turns:
        if turn.position <= most_recent_question.position:
            continue
        if turn.kind == "answer":
            # Defensive str() on both sides — same fragility as _should_emit_advisory.
            ref_id = str((turn.payload or {}).get("in_reply_to_turn_id") or "")
            if ref_id == str(most_recent_question.id):
                return True  # resolved → re-emission allowed
    return False  # unanswered → suppress


def _build_thread_prompt(
    thread: list[RecipeTurn],
    pinned: set[str],
) -> tuple[str, list[types.Part]]:
    """Phase 29 D-02 — role-labeled French prose + photo parts (max 4).

    Pitfall 6: download photo bytes from Supabase Storage; cap at 4 across the
    whole thread (matches the deleted extract_from_photos limit).
    Pitfall 7: return (prose, parts) tuple; the Gemini call uses
    contents=[prose, *parts].

    Photo references in the prose are `[voir image n°{i}]` placeholders so
    Gemini can correlate the prose flow with the binary parts.
    """
    lines: list[str] = []
    photo_parts: list[types.Part] = []
    photo_count = 0
    for turn in sorted(thread, key=lambda t: t.position):
        kind = turn.kind
        payload = turn.payload or {}
        if turn.sender == "user":
            if kind == "text":
                lines.append(f"USER (text): {payload.get('text', '')}")
            elif kind == "voice":
                lines.append(f"USER (voice): {payload.get('transcript', '')}")
            elif kind == "url":
                lines.append(f"USER (url): {payload.get('url', '')}")
            elif kind == "photo":
                for path in (payload.get("photo_paths") or []):
                    if photo_count >= _MAX_PHOTO_PARTS:
                        break
                    try:
                        photo_bytes = storage_service.download_recipe_photo(path)
                        photo_parts.append(
                            types.Part.from_bytes(data=photo_bytes, mime_type="image/jpeg")
                        )
                        photo_count += 1
                        lines.append(f"USER (photo): [voir image n°{photo_count}]")
                    except Exception as exc:  # noqa: BLE001
                        log.warning("photo bytes download failed path=%s: %s", path, exc)
            elif kind == "answer":
                lines.append(
                    f"USER (answer {payload.get('field', '?')}): {payload.get('value', '')}"
                )
            # proposal_accepted / proposal_dismissed are state-change only; render as marker
            elif kind == "proposal_accepted":
                lines.append("USER (proposal_accepted)")
            elif kind == "proposal_dismissed":
                lines.append("USER (proposal_dismissed)")
        else:  # system
            if kind == "summary":
                lines.append(f"SYSTEM (summary): {payload.get('body', '')}")
            elif kind == "question":
                lines.append(
                    f"SYSTEM (question {payload.get('field', '?')}): {payload.get('prompt', '')}"
                )
            elif kind == "advisory":
                lines.append(
                    f"SYSTEM (advisory {payload.get('field', '?')}): "
                    f"{payload.get('current_value', '')} → {payload.get('proposed_value', '')}"
                )

    pinned_clause = ""
    if pinned:
        pairs = ", ".join(f"{f}=ÉPINGLÉ" for f in sorted(pinned))
        pinned_clause = (
            "\n\nCHAMPS ÉPINGLÉS (ne modifie ces valeurs que si le fil les contredit "
            f"explicitement — sinon, conserve la valeur actuelle): {pairs}"
        )

    prose = _EXTRACT_PROMPT_THREAD + "\n\n" + "\n".join(lines) + pinned_clause
    return prose, photo_parts


async def _run_thread_llm(
    db: Session,
    recipe: Recipe,
    trigger_turn_id: UUID,
) -> None:
    """Phase 29 LLM-01/02/03 — shared body called from promote_draft + process_thread_turn.

    1. Load the full ordered thread from recipe_turns.
    2. Build the prompt (D-02 — prose + max-4 photo parts).
    3. Call Gemini once (test mode → canned_thread_extract).
    4. Compute extraction_hash (D-03).
    5. If hash matches most recent summary's hash → return early (idempotent).
    6. For each field: if pinned AND is_conflict → emit one advisory (D-16/D-18).
       Otherwise: track changed fields for chips; apply non-conflicting via _apply_extracted (D-01).
    7. Emit ≤1 question turn for the highest-priority missing eligible field (D-09/D-10/D-11/D-12),
       gated by recipes.questions_deferred_until (D-08 / Pitfall 9).
    8. Emit one summary turn with body + chips + extraction_hash (D-05/D-06/D-07).
    9. Broadcast turn.created for each emitted system turn.
    Raises on error — caller decides failure recording strategy:
      - promote_draft: _record_failure (status → 'failed')
      - process_thread_turn: _record_turn_enrichment_failure (status unchanged)
    """
    # Load full thread
    thread: list[RecipeTurn] = list(
        db.scalars(
            select(RecipeTurn)
            .where(RecipeTurn.recipe_id == recipe.id)
            .order_by(RecipeTurn.position.asc())
        ).all()
    )
    pinned = set(recipe.manually_edited_fields or [])

    # Build prompt
    prose, photo_parts = _build_thread_prompt(thread, pinned)

    # Call Gemini (single call per LLM-triggering turn — PROJECT.md invariant)
    if settings.environment == "test":
        from app.services.llm_fixtures import canned_thread_extract
        extracted = canned_thread_extract(thread, pinned)
    else:
        contents: list[Any] = [prose, *photo_parts] if photo_parts else [prose]
        response = _gemini().models.generate_content(
            model=_GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiExtractedRecipe,
            ),
        )
        parsed = response.parsed
        if not isinstance(parsed, GeminiExtractedRecipe):
            raise ValueError("Gemini did not return a valid GeminiExtractedRecipe")
        extracted = parsed

    # D-03 — idempotency check: skip all emission if hash unchanged
    new_hash = _extraction_hash(extracted)
    most_recent_summary: Optional[RecipeTurn] = None
    for turn in reversed(thread):
        if turn.kind == "summary":
            most_recent_summary = turn
            break
    if (
        most_recent_summary is not None
        and (most_recent_summary.payload or {}).get("extraction_hash") == new_hash
    ):
        log.info("thread LLM idempotent: hash unchanged (recipe=%s)", recipe.id)
        return

    # D-16/D-18 — server-side diff for advisories. Iterate over extracted fields.
    # Build a canonical extracted map (all fields that can have advisories).
    extracted_map: dict[str, Any] = {
        "title": extracted.title,
        "description": extracted.description,
        "ingredients": (
            [i.model_dump() for i in extracted.ingredients]
            if extracted.ingredients
            else None
        ),
        "steps": extracted.steps,
        "prep_time_minutes": extracted.prep_time_minutes,
        "cook_time_minutes": extracted.cook_time_minutes,
        "servings": extracted.servings,
        "difficulty": extracted.difficulty,
        "cuisine": extracted.cuisine,
        "mood": list(extracted.mood) if extracted.mood else [],
        "main_protein": extracted.main_protein,
        "seasonality": list(extracted.seasonality) if extracted.seasonality else [],
        # tags is not on GeminiExtractedRecipe — no advisory path for tags from extraction
    }

    # Get the trigger turn's position for reason extraction
    trigger_turn = next((t for t in thread if t.id == trigger_turn_id), None)
    trigger_position = (
        trigger_turn.position if trigger_turn
        else max((t.position for t in thread), default=0)
    )

    advisory_payloads: list[dict] = []
    changed_fields: list[str] = []  # for summary chips (non-pinned diffs applied)

    for field, proposed in extracted_map.items():
        current = getattr(recipe, field, None)
        if field in pinned:
            # D-01/D-19 — pinned: check conflict; if conflict emit advisory
            if not is_conflict(field, current, proposed):
                continue  # no conflict → skip advisory
            if not _should_emit_advisory(thread, field, proposed):
                continue  # D-18 de-dup → suppress
            advisory_payloads.append({
                "kind": "advisory",
                "field": field,
                "current_value": current,
                "proposed_value": proposed,
                "reason_excerpt": _extract_reason_from_thread(thread, trigger_position),
            })
        else:
            # Non-pinned: track fields that changed (for chips)
            if proposed is not None and is_conflict(field, current, proposed):
                changed_fields.append(field)

    # Apply non-pinned-conflicting fields via the existing helper.
    # Build a safe copy of extracted with pinned-conflicting fields reverted to current.
    safe_extracted = extracted.model_copy(deep=True)
    for adv in advisory_payloads:
        f = adv["field"]
        # Revert to current value so _apply_extracted doesn't overwrite user's pin.
        if f == "ingredients" and recipe.ingredients is not None:
            safe_extracted.ingredients = (
                [GeminiIngredient(**i) for i in (recipe.ingredients or [])] or None
            )
        elif hasattr(safe_extracted, f):
            setattr(safe_extracted, f, getattr(recipe, f, None))
    # _apply_extracted requires a non-empty title (its precondition).
    if safe_extracted.title and safe_extracted.title.strip():
        _apply_extracted(recipe, safe_extracted)

    # Get next available position for system turns (single-worker — invariant #7)
    base_pos = db.scalar(
        select(func.max(RecipeTurn.position)).where(RecipeTurn.recipe_id == recipe.id)
    )
    next_pos = 0 if base_pos is None else base_pos + 1
    emitted_turns: list[RecipeTurn] = []

    # Emit advisory turns (one per conflicting pinned field)
    for adv_payload in advisory_payloads:
        validated = AdvisoryTurnPayload(**adv_payload).model_dump(
            mode="json", exclude={"kind"}
        )
        adv_turn = RecipeTurn(
            recipe_id=recipe.id,
            position=next_pos,
            sender="system",
            kind="advisory",
            payload=validated,
        )
        db.add(adv_turn)
        emitted_turns.append(adv_turn)
        next_pos += 1

    # D-11/D-12 — emit ≤1 question for the highest-priority missing eligible field.
    # D-08/Pitfall 9 — gate on questions_deferred_until (tz-aware comparison).
    questions_deferred = (
        recipe.questions_deferred_until is not None
        and recipe.questions_deferred_until > datetime.now(tz=timezone.utc)
    )
    if not questions_deferred:
        # Recompute completeness AFTER _apply_extracted has run
        _, missing = compute_completeness(recipe)
        chosen_field: Optional[str] = None
        for field in missing:
            if INPUT_TYPE_MAP.get(field) is None:
                continue  # D-10 SKIP (ingredients/steps)
            if not _should_emit_question(thread, field):
                continue  # D-12 — open unanswered question already exists
            chosen_field = field
            break
        if chosen_field is not None:
            q_payload = QuestionTurnPayload(
                kind="question",
                field=chosen_field,
                prompt=_FIELD_PROMPTS_FR[chosen_field],
                input_type=INPUT_TYPE_MAP[chosen_field],
                options=OPTIONS_MAP.get(chosen_field, []),
                multi=(chosen_field == "mood"),  # D-10 — only mood is chip-multi
            ).model_dump(mode="json", exclude={"kind"})
            q_turn = RecipeTurn(
                recipe_id=recipe.id,
                position=next_pos,
                sender="system",
                kind="question",
                payload=q_payload,
            )
            db.add(q_turn)
            emitted_turns.append(q_turn)
            next_pos += 1

    # D-05/D-06/D-07 — emit summary turn (always when hash changed)
    chips = []
    for field in changed_fields:
        label = _FIELD_LABELS_FR.get(field, field)
        val = extracted_map[field]
        if isinstance(val, list):
            val_str = ", ".join(str(v) for v in val)
        else:
            val_str = str(val) if val is not None else ""
        chips.append(f"{label}: {val_str}")

    body = extracted.summary_body or f"J'ai mis à jour {len(changed_fields)} champ(s)."
    summary_payload = SummaryTurnPayload(
        kind="summary",
        body=body,
        chips=chips,
        extraction_hash=new_hash,
    ).model_dump(mode="json", exclude={"kind"})
    summary_turn = RecipeTurn(
        recipe_id=recipe.id,
        position=next_pos,
        sender="system",
        kind="summary",
        payload=summary_payload,
    )
    db.add(summary_turn)
    emitted_turns.append(summary_turn)

    db.commit()
    db.refresh(recipe)
    for t in emitted_turns:
        db.refresh(t)

    # Broadcast recipe.updated so the partner's phone picks up any field changes
    # applied by _apply_extracted above (invariant #4 — every household-affecting
    # mutation must broadcast). promote_draft's _broadcast_promoted covers the
    # initial recipe.promoted frame; this covers subsequent field mutations.
    recipe_payload = RecipeResponse.model_validate(recipe).model_dump(mode="json")
    await broadcast_to_household(recipe.household_id, "recipe.updated", recipe_payload)

    # Broadcast turn.created for each emitted system turn (invariant #4)
    for t in emitted_turns:
        await broadcast_to_household(
            recipe.household_id,
            "turn.created",
            TurnResponse.model_validate(t).model_dump(mode="json"),
        )


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

    Phase 29 extends each branch to call _run_thread_llm after the kind-specific
    preamble (title rewrite for text; illustrations for voice/photo) so initial
    captures emit summary/question/advisory system turns alongside the recipe update.
    The url branch defers to process_thread_turn via extract_and_process_url_turn.

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
                try:
                    new_title = rewrite_title(original_title, {})
                except Exception as rewrite_exc:  # noqa: BLE001 — RID-04 D-26
                    # Title rewrite failed but content is complete (the user
                    # already typed a title). Promote anyway with status=structured
                    # and surface the error via promotion_error. _record_rewrite_failure
                    # commits and broadcasts recipe.promoted — never re-raises.
                    recipe.illustration_svg = _generate_and_sanitize_illustration(
                        recipe.title
                    )
                    _record_rewrite_failure(db, recipe, rewrite_exc)
                    return
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
                # Phase 29 LLM-01 — emit summary/question/advisory turns on initial text capture.
                # _run_thread_llm is async; promote_draft is sync. Wrap via asyncio.run per
                # _broadcast_promoted's established pattern (RESEARCH §"Existing Pattern").
                asyncio.run(_run_thread_llm(db, recipe, first_turn.id))

            elif kind == "voice":
                # WR-05: migration 0009 may have backfilled `{"transcript": null}`
                # for legacy voice rows whose source_capture.payload.transcript was
                # NULL/missing. Re-promotion (e.g. retry on a still-draft row) would
                # otherwise flip those rows to status='failed' with no recovery path.
                # Fall back to recipe.title as a last-resort transcript so the
                # extraction has at least something to work with.
                transcript = (payload.get("transcript") or "").strip()
                if not transcript:
                    transcript = (recipe.title or "").strip()
                if not transcript:
                    raise ValueError("promote_draft voice: empty transcript")
                # Phase 29 — _run_thread_llm replaces the old extract_from_transcript +
                # _apply_extracted pair. It reads the voice turn from the thread,
                # calls Gemini with the full thread, applies non-conflicting fields,
                # and emits summary/question/advisory turns.
                asyncio.run(_run_thread_llm(db, recipe, first_turn.id))
                # Illustration after fields are applied (relies on recipe.title from extract).
                # Phase 24 RID-05 D-36 — illustration generation.
                recipe.illustration_svg = _generate_and_sanitize_illustration(recipe.title)
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
                # Phase 29 — _run_thread_llm builds the prompt with photo bytes downloaded
                # via _build_thread_prompt (max 4 across thread per Pitfall 6).
                # Replaces the old download + extract_from_photos + _apply_extracted sequence.
                asyncio.run(_run_thread_llm(db, recipe, first_turn.id))
                # Phase 24 RID-05 D-36 — illustration generation.
                recipe.illustration_svg = _generate_and_sanitize_illustration(recipe.title)
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)

            elif kind == "url":
                # URL extraction runs via extract_and_process_url_turn (Phase 26 TURN-04)
                # which calls process_thread_turn at its end — Phase 29 LLM emission
                # happens there, not here. promote_draft just stamps the row as structured.
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


async def process_thread_turn(recipe_id: UUID, turn_id: UUID) -> None:
    """Phase 29 LLM-01 — full-thread Gemini call after every text/voice/photo refinement.

    Async per RESEARCH §"Architecture Decisions Resolved" §1 — mandatory because
    this is called from inside extract_and_process_url_turn (async def) at line ~1307.
    BackgroundTasks.add_task accepts async callables (confirmed from starlette source).

    Failure mode: reuses _record_turn_enrichment_failure (status unchanged) since the
    recipe is already past initial promotion when this runs.

    NEVER raises out — exceptions are caught and recorded on the trigger turn's payload.
    """
    db = SessionLocal()
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            log.warning("process_thread_turn: recipe %s vanished", recipe_id)
            return
        turn = db.scalar(select(RecipeTurn).where(RecipeTurn.id == turn_id))
        if turn is None:
            log.warning("process_thread_turn: turn %s vanished", turn_id)
            return
        try:
            await _run_thread_llm(db, recipe, turn_id)
        except Exception as exc:  # noqa: BLE001
            _record_turn_enrichment_failure(db, recipe, turn, exc)
    finally:
        db.close()


async def extract_and_process_url_turn(recipe_id: UUID, turn_id: UUID) -> None:
    """Phase 26 D-28 / TURN-04 — close the URL-extraction TODO(productize).

    Fetches the URL stored in the url-turn payload, extracts recipe-shaped
    markdown via trafilatura (include_tables=True is REQUIRED — French
    recipe sites like Marmiton put ingredient quantities in <table> elements,
    which trafilatura silently drops without that flag — RESEARCH §Area 1 / R-2).
    Uploads markdown to Supabase Storage `recipe-urls` bucket. Updates the
    turn payload's extracted_html_path. Broadcasts turn.updated (NOT
    turn.created — the turn was already broadcast at POST time, per D-29).
    Finally invokes process_thread_turn so the (Phase 29) LLM run sees the
    extracted content.

    Async def (NOT sync) — uses httpx.AsyncClient which is cooperative;
    fits the FastAPI BackgroundTask async-callable contract. RESEARCH §Area 8.

    NEVER raises out — failures are recorded via _record_failure (status='failed',
    truncated promotion_error, no broadcast). The user can retry via
    POST /recipes/{id}/retry-promotion (existing endpoint; collapses through
    promote_draft → dispatches on first user turn kind, which for url-captured
    recipes routes back here).

    Failure modes (all → _record_failure):
      * SSRF rejection (_is_safe_url returned False)
      * Non-html Content-Type
      * Body > 5 MB (D-24)
      * httpx error (timeout, DNS, connection refused, etc.)
      * trafilatura returned None or empty (R-2 — JS-rendered shells, blocked pages)
      * Supabase upload failure
    """
    db = SessionLocal()
    recipe: Optional[Recipe] = None
    # WR-01 — defensive init so the except block can safely reference `turn`
    # (CR-01 fix uses it). Any failure between `recipe` lookup and `turn`
    # assignment would otherwise NameError on the except path.
    turn: Optional[RecipeTurn] = None
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            log.warning("extract_and_process_url_turn: recipe %s vanished", recipe_id)
            return
        turn = db.scalar(select(RecipeTurn).where(RecipeTurn.id == turn_id))
        if turn is None:
            log.warning("extract_and_process_url_turn: turn %s vanished", turn_id)
            return

        # D-30 — test-mode bypass uses canned markdown; skip httpx + trafilatura.
        if settings.environment == "test":
            from app.services.llm_fixtures import canned_url_extract
            extracted_markdown = canned_url_extract(turn.payload.get("url") or "")
        else:
            # IN-04 — `.get("url") or ""` makes the None-vs-empty conflation
            # explicit: backfilled or malformed payloads that stored {"url": null}
            # coerce to "" rather than None, so the `if not url` gate fires
            # cleanly and the downstream `_is_safe_url` never sees None.
            url = turn.payload.get("url") or ""
            if not url:
                raise ValueError("url turn has no url in payload")

            # SSRF gate (T-26-02). _is_safe_url blocks RFC1918 / loopback /
            # link-local / 169.254.169.254 / metadata.google.internal.
            # IN-01 — IPv6 coverage: _is_safe_url covers IPv4 (RFC1918 + 127/8
            # + 169.254/16 + 0.0.0.0) and IPv6 ULA (fc00::/7) + loopback (::1)
            # + IPv4-mapped IPv6 (::ffff:10.x). 6to4 (2002::/16) and deprecated
            # site-local (fec0::/10) are not blocked; classified as global per
            # Python's `ipaddress`. Couple-scale risk accepted.
            if not _is_safe_url(url):
                raise ValueError(f"SSRF: blocked URL {url!r}")

            # D-24 — conservative fetch policy.
            async with httpx.AsyncClient(
                timeout=10.0,
                follow_redirects=True,
                max_redirects=5,
                headers={
                    "User-Agent": "al-dente/0.6 (+https://al-dente-pink.vercel.app)",
                },
            ) as client:
                response = await client.get(url)

            # D-24 — content-type allowlist + size cap.
            content_type = (response.headers.get("content-type") or "").lower()
            if not any(t in content_type for t in ("text/html", "application/xhtml")):
                raise ValueError(f"unsupported content-type: {content_type!r}")
            if len(response.content) > 5 * 1024 * 1024:
                raise ValueError("response body exceeds 5 MB limit")

            # D-23 — trafilatura.extract with include_tables=True (REQUIRED
            # for French recipe sites — R-2). Returns None on JS-rendered
            # shells / blocked pages / empty content → failure path per D-27.
            extracted_markdown = trafilatura.extract(
                response.text,
                output_format="markdown",
                include_tables=True,
                include_comments=False,
                no_fallback=False,
            )
            if not extracted_markdown:
                raise ValueError("trafilatura returned no extractable content")

        # D-26 — upload to recipe-urls bucket (Phase 26 storage helper).
        path = storage_service.upload_recipe_url_extract(
            household_id=recipe.household_id,
            recipe_id=recipe_id,
            turn_id=turn_id,
            content=extracted_markdown.encode("utf-8"),
        )

        # D-28 step 5 — update turn payload via dict spread (new dict =
        # SQLAlchemy change detection fires). flag_modified is belt-and-
        # suspenders for JSONB sub-key updates (R-1 footgun documented in
        # RESEARCH §Area 4).
        turn.payload = {**(turn.payload or {}), "extracted_html_path": path}
        flag_modified(turn, "payload")
        db.commit()
        db.refresh(turn)

        # D-29 — broadcast turn.updated (NOT turn.created — the turn was
        # already broadcast at POST time by routers/recipes.py). FE will
        # re-render the url bubble with the "Lien extrait" indicator.
        # Inside an `async def`, we can await broadcast directly.
        await broadcast_to_household(
            recipe.household_id,
            "turn.updated",
            TurnResponse.model_validate(turn).model_dump(mode="json"),
        )

        # D-28 step 6 — Phase 29 LLM follow-up. process_thread_turn is now async
        # (mandatory per RESEARCH §1 / Pitfall 3 — we are inside an async def).
        # Direct await (not BackgroundTasks.add_task) — already in a BackgroundTask.
        await process_thread_turn(recipe_id, turn_id)

    except Exception as exc:  # noqa: BLE001 — never raise out (R-7 / R-8)
        # Rollback any partial DB state before recording the failure.
        db.rollback()
        if recipe is not None and turn is not None:
            # CR-01 — only demote the recipe to status='failed' when this is an
            # INITIAL url capture (recipe.status == 'draft'). Follow-up url turns
            # on already-structured recipes record the failure on the turn payload
            # so the FE can render 'Lien non extrait — réessayer' without losing
            # the recipe's library row. Trafilatura-returns-None hits a 10-20%
            # rate (RESEARCH §Area 1 / R-2); demoting structured recipes on
            # every JS-rendered URL would be a data-integrity bug.
            if recipe.status == "draft":
                _record_failure(db, recipe, exc)
            else:
                _record_turn_enrichment_failure(db, recipe, turn, exc)
        elif recipe is not None:
            # Pre-turn-lookup failure: no turn row to annotate, fall back to
            # legacy recipe-level failure marker (preserves prior behavior).
            _record_failure(db, recipe, exc)
        else:
            log.exception("extract_and_process_url_turn: pre-recipe failure recipe=%s turn=%s", recipe_id, turn_id)
    finally:
        db.close()
