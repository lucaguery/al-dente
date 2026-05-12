"""Phase 10 D-04 — canned GeminiExtractedRecipe values for test mode.

These shapes match what real Gemini returns for a French dictation; they're
the same vocabulary literals the production code uses (mirror of enums).

Architecture invariant #5 (raw inputs preserved) means callers still record
the transcript / photo paths in source_capture; only the LLM extraction
result is canned.
"""

from typing import Any

from app.services.llm import (
    GeminiExtractedRecipe,
    GeminiIngredient,
)


# Phase 16 D-16-13: test-only force-failure prefix. When the transcript
# starts with this token, canned_voice_recipe raises so the
# promote_voice_draft BackgroundTask hits _record_failure (Plan 16-03),
# transitioning the row to status='failed' deterministically. The prefix
# is a test-only convention — production transcripts never start with it.
# Used by frontend/tests/e2e/capture-voice-failed-recovery.spec.ts.
_FORCE_FAIL_PREFIX = "__TEST_FORCE_FAIL__"


def canned_voice_recipe(transcript: str) -> GeminiExtractedRecipe:
    """Deterministic 'risotto' shape; ignores transcript content.

    The transcript is preserved in source_capture by the caller; we don't
    need to vary the output by transcript for v0.2.1 specs.

    Phase 16 D-16-13: when the transcript starts with __TEST_FORCE_FAIL__,
    raises RuntimeError so the BackgroundTask hits _record_failure (Plan
    16-03) and the row terminates at status='failed'. The Playwright spec
    capture-voice-failed-recovery.spec.ts uses this prefix to seed a
    deterministic failed-state row.
    """
    if transcript.startswith(_FORCE_FAIL_PREFIX):
        raise RuntimeError(
            "Extraction forcée à échouer pour les tests (D-16-13). "
            "Le préfixe __TEST_FORCE_FAIL__ active ce chemin."
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
        servings=2,
        difficulty="medium",
        description="Risotto crémeux aux champignons et parmesan (test).",
        cuisine="italian",
        mood=["comfort"],
        main_protein="none",
        seasonality=["autumn", "winter"],
    )


def canned_photo_recipe(photo_count: int) -> GeminiExtractedRecipe:
    """Deterministic 'tarte tatin' shape for photo capture spec."""
    return GeminiExtractedRecipe(
        title="Tarte Tatin (test)",
        ingredients=[
            GeminiIngredient(name="pommes", quantity=6.0, unit=None),
            GeminiIngredient(name="sucre", quantity=150.0, unit="g"),
            GeminiIngredient(name="beurre", quantity=80.0, unit="g"),
            GeminiIngredient(name="pâte feuilletée", quantity=1.0, unit=None),
        ],
        steps=[
            "Caraméliser le sucre avec le beurre.",
            "Disposer les pommes.",
            "Couvrir de pâte feuilletée.",
            "Cuire 30 minutes à 200°C.",
        ],
        prep_time_minutes=60,
        cook_time_minutes=30,
        servings=6,
        difficulty="medium",
        description="Tarte aux pommes caramélisées renversée (test).",
        cuisine="french",
        mood=["celebratory", "comfort"],
        main_protein="none",
        seasonality=["autumn"],
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
