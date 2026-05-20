"""Phase 10 D-04 — canned GeminiExtractedRecipe values for test mode.

These shapes match what real Gemini returns for a French dictation; they're
the same vocabulary literals the production code uses (mirror of enums).

Architecture invariant #5 (raw inputs preserved) means callers still record
the transcript / photo paths in recipe_turns payload (Phase 25 cutover);
only the LLM extraction result is canned here.

Phase 29 change: canned_voice_recipe and canned_photo_recipe have been deleted
(MVP no-shim posture). _run_thread_llm subsumes both paths via the full thread
prompt. canned_thread_extract is the single test-mode extraction fixture.
"""

from typing import Any

from app.services.llm import (
    GeminiExtractedRecipe,
    GeminiIngredient,
)


# Phase 16 D-16-13: test-only force-failure prefix. When the transcript
# starts with this token, canned_thread_extract raises so the BackgroundTask
# hits _record_failure / _record_turn_enrichment_failure deterministically.
# The prefix is a test-only convention — production text never starts with it.
# Used by frontend/tests/e2e/capture-voice-failed-recovery.spec.ts.
_FORCE_FAIL_PREFIX = "__TEST_FORCE_FAIL__"

# D-39-05 Category C fix: test-only sentinel that triggers a partial extraction
# (cook_time_minutes omitted so compute_completeness finds at least one eligible
# missing field → _run_thread_llm emits a question turn). The distinct summary_body
# ensures _extraction_hash differs from the default branch so the idempotency check
# in _run_thread_llm does NOT short-circuit the second call.
# cook_time_minutes is in INPUT_TYPE_MAP (numeric stepper) → eligible for question
# emission per D-10/D-11; choosing it keeps the partial shape orthogonal to
# mood/seasonality which vary in other fixture tests.
_FORCE_NEW_HASH_PREFIX = "__TEST_FORCE_NEW_HASH__"


def canned_thread_extract(
    turns,  # list[RecipeTurn] — inspected for sentinel prefixes; shape is deterministic
    pinned,  # set[str] — unused for deterministic shape
) -> GeminiExtractedRecipe:
    """Phase 29 — deterministic full-thread extraction for test mode.

    Returns the same 'risotto' shape that canned_voice_recipe used to return,
    so existing Playwright recipe assertions still match. summary_body is a
    French prose stub. Inspects each text/voice turn for two sentinel prefixes
    (mirrors the established D-16-13 pattern):

    - __TEST_FORCE_FAIL__: raises RuntimeError to exercise the failure-recording path.
    - __TEST_FORCE_NEW_HASH__: returns a partial extract (cook_time_minutes=None,
      distinct summary_body) so _run_thread_llm emits a question turn after a
      deferral is cleared (D-08 / D-39-05 Category C test).

    Force-fail is checked first; if both sentinels appear in different turns,
    force-fail wins.
    """
    force_new_hash = False
    for turn in turns:
        payload = turn.payload or {}
        if turn.kind == "text":
            text = payload.get("text", "")
            if text.startswith(_FORCE_FAIL_PREFIX):
                raise RuntimeError(
                    "Thread extraction forcée à échouer pour les tests (Phase 29). "
                    "Le préfixe __TEST_FORCE_FAIL__ active ce chemin."
                )
            if text.startswith(_FORCE_NEW_HASH_PREFIX):
                force_new_hash = True
        if turn.kind == "voice":
            transcript = payload.get("transcript", "")
            if transcript.startswith(_FORCE_FAIL_PREFIX):
                raise RuntimeError(
                    "Thread extraction forcée à échouer pour les tests (Phase 29). "
                    "Le préfixe __TEST_FORCE_FAIL__ active ce chemin."
                )
            if transcript.startswith(_FORCE_NEW_HASH_PREFIX):
                force_new_hash = True

    if force_new_hash:
        # Partial extract: cook_time_minutes omitted (None) → eligible missing field
        # for question emission. summary_body is distinct so _extraction_hash differs
        # from the default branch and the idempotency gate does not short-circuit.
        return GeminiExtractedRecipe(
            title="Risotto aux champignons (test)",
            ingredients=[
                GeminiIngredient(name="riz arborio", quantity=300.0, unit="g"),
                GeminiIngredient(name="champignons", quantity=400.0, unit="g"),
                GeminiIngredient(name="bouillon de légumes", quantity=1.0, unit="L"),
                GeminiIngredient(name="parmesan", quantity=50.0, unit="g"),
            ],
            steps=[
                "Faire revenir l'oignon dans le beurre.",
                "Ajouter le riz et nacrer.",
                "Mouiller au bouillon louche par louche.",
                "Incorporer les champignons et le parmesan.",
            ],
            prep_time_minutes=35,
            cook_time_minutes=None,  # omitted → compute_completeness finds missing field
            difficulty="medium",
            description="Un risotto crémeux aux champignons, parfait pour l'automne.",
            servings=2,
            cuisine="italian",
            mood=["comfort"],
            main_protein="none",
            seasonality=["autumn", "winter"],
            summary_body="J'ai mis à jour la recette avec les nouveaux ingrédients (test).",
        )

    return GeminiExtractedRecipe(
        title="Risotto aux champignons (test)",
        ingredients=[
            GeminiIngredient(name="riz arborio", quantity=300.0, unit="g"),
            GeminiIngredient(name="champignons", quantity=400.0, unit="g"),
            GeminiIngredient(name="bouillon de légumes", quantity=1.0, unit="L"),
            GeminiIngredient(name="parmesan", quantity=50.0, unit="g"),
        ],
        steps=[
            "Faire revenir l'oignon dans le beurre.",
            "Ajouter le riz et nacrer.",
            "Mouiller au bouillon louche par louche.",
            "Incorporer les champignons et le parmesan.",
        ],
        prep_time_minutes=35,
        cook_time_minutes=25,
        difficulty="medium",
        description="Un risotto crémeux aux champignons, parfait pour l'automne.",
        servings=2,
        cuisine="italian",
        mood=["comfort"],
        main_protein="none",
        seasonality=["autumn", "winter"],
        summary_body="J'ai extrait la recette : risotto aux champignons, 2 personnes.",
    )


def canned_rewritten_title(original_title: str) -> str:
    """Phase 24 RID-04 D-25 — deterministic catchy-title rewrite for test mode.

    Returned by services/llm.rewrite_title when settings.environment == "test".
    Returns a fixed catchy phrasing suffixed '(test)' so Playwright assertions
    can target the rewritten value explicitly (and so a missed test-mode switch
    is visible in logs).

    The __TEST_FORCE_FAIL__ prefix forces a RuntimeError to test the
    _record_rewrite_failure path (D-26) deterministically in Playwright specs.
    Mirrors the force-fail behavior at canned_voice_recipe (D-16-13).
    """
    if original_title.startswith(_FORCE_FAIL_PREFIX):
        raise RuntimeError(
            "Rewrite forcée à échouer pour les tests (RID-04 D-26). "
            "Le préfixe __TEST_FORCE_FAIL__ active ce chemin."
        )
    return "Délices maison (test)"


# Phase 24 RID-05 D-32 — deterministic SVG for test mode. Passes the
# sanitizer (uses only <svg> + <path> with allowed attrs). The returned
# string is intentionally minimal so Playwright assertions on illustration
# rendering can target a known shape.
def canned_recipe_illustration(recipe_title: str) -> str:
    """Deterministic monochrome SVG pictogram for test mode (RID-05).

    Same __TEST_FORCE_FAIL_ILLUSTRATION__ convention as canned_voice_recipe: a title
    prefixed with the sentinel raises so the BackgroundTask hits the
    illustration-failure branch (which leaves illustration_svg=NULL per D-36
    but does NOT affect recipe.status).
    """
    if recipe_title.startswith("__TEST_FORCE_FAIL_ILLUSTRATION__"):
        raise RuntimeError(
            "Illustration forcée à échouer pour les tests (RID-05 D-36)."
        )
    return (
        '<svg viewBox="0 0 160 160" fill="none" stroke="currentColor" '
        'xmlns="http://www.w3.org/2000/svg">'
        '<path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z"/>'
        '</svg>'
    )


def canned_modified_recipe(
    recipe_json: dict[str, Any], transcript: str
) -> GeminiExtractedRecipe:
    """Echo the input recipe but mark prep_time_minutes as +10 to simulate a modification."""
    return GeminiExtractedRecipe(
        title=recipe_json.get("title", "Recette modifiée (test)"),
        ingredients=[
            GeminiIngredient(**i) for i in (recipe_json.get("ingredients") or [])
        ] or None,
        steps=recipe_json.get("steps"),
        prep_time_minutes=(recipe_json.get("prep_time_minutes") or 30) + 10,
        servings=recipe_json.get("servings"),
        cuisine=recipe_json.get("cuisine"),
        mood=recipe_json.get("mood") or [],
        main_protein=recipe_json.get("main_protein"),
        seasonality=recipe_json.get("seasonality") or [],
    )


# Phase 26 D-30 — deterministic URL-extract markdown for test mode.
# Mirrors canned_voice_recipe's __TEST_FORCE_FAIL__ convention (D-16-13).
# Used by services/llm.extract_and_process_url_turn when settings.environment == "test".
_FORCE_FAIL_URL_PREFIX = "https://__TEST_FORCE_FAIL_URL__"


def canned_url_extract(url: str) -> str:
    """Deterministic recipe-shaped markdown for URL-turn extraction tests.

    Returns ~400-byte markdown matching what trafilatura would emit for a
    well-formed French recipe page (ingredients table + numbered steps).
    Playwright + pytest assertions can grep for known tokens.

    The __TEST_FORCE_FAIL_URL__ prefix forces a RuntimeError so the
    extract_and_process_url_turn BackgroundTask hits _record_failure
    deterministically (mirrors canned_voice_recipe D-16-13 force-fail).
    """
    if url.startswith(_FORCE_FAIL_URL_PREFIX):
        raise RuntimeError(
            "URL extraction forcée à échouer pour les tests (Phase 26 D-30). "
            "Le préfixe https://__TEST_FORCE_FAIL_URL__ active ce chemin."
        )
    return (
        "# Tarte aux poireaux (test)\n"
        "\n"
        "## Ingrédients\n"
        "\n"
        "| Quantité | Ingrédient |\n"
        "|----------|------------|\n"
        "| 4        | poireaux   |\n"
        "| 200 g    | lardons    |\n"
        "| 200 ml   | crème fraîche |\n"
        "| 1        | pâte brisée |\n"
        "\n"
        "## Préparation\n"
        "\n"
        "1. Émincer les poireaux et les faire revenir 10 min.\n"
        "2. Ajouter les lardons et la crème.\n"
        "3. Verser sur la pâte et cuire 30 min à 200°C.\n"
    )
