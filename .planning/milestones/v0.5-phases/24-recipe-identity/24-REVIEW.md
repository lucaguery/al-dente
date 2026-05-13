---
phase: 24-recipe-identity
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py
  - backend/alembic/versions/0008_add_recipe_illustration_svg.py
  - backend/app/cli/seed.py
  - backend/app/models/enums.py
  - backend/app/models/recipe.py
  - backend/app/routers/recipes.py
  - backend/app/schemas/recipe.py
  - backend/app/services/llm_fixtures.py
  - backend/app/services/llm.py
  - backend/app/services/svg_sanitizer_test.py
  - backend/app/services/svg_sanitizer.py
  - CLAUDE.md
  - frontend/app/inbox/page.tsx
  - frontend/app/onboarding/welcome/page.tsx
  - frontend/app/recipes/[id]/edit/page.tsx
  - frontend/app/recipes/[id]/page.tsx
  - frontend/app/recipes/page.tsx
  - frontend/components/BrandIcon.tsx
  - frontend/components/CompletenessCard.tsx
  - frontend/components/EmptyState.tsx
  - frontend/components/HomeDecide.tsx
  - frontend/components/RecipeCard.tsx
  - frontend/components/RecipeDraftCard.tsx
  - frontend/components/RecipeForm.tsx
  - frontend/components/RecipeIllustration.tsx
  - frontend/lib/enum-labels.ts
  - frontend/lib/enums.ts
  - frontend/lib/i18n/fr.json
  - frontend/lib/recipe-completeness.test.ts
  - frontend/lib/recipe-completeness.ts
  - frontend/lib/recipes.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-05-13
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Phase 24 (Recipe Identity) adds three new recipe-identity columns (`cook_time_minutes`, `difficulty`, `description`), a server-generated SVG illustration, a completeness scoring system, and a catchy-title rewrite step for quick/full-form captures. The implementation is coherent and thoughtfully engineered. The SVG sanitizer is the security-critical surface, and it is correctly structured: byte cap before parse, pre-parse rejection of CDATA/comments/PIs, strict allowlist walk with namespace stripping, normalization on accept. The locked-vocabulary `Difficulty` enum is in sync across Python and TypeScript. The `Suspense` boundary for `useSearchParams()` on the edit page is present and correct. All invariants documented in CLAUDE.md (#1, #4, #5) are honoured.

Three warnings and three info items were found. There are no critical (security or data-loss) issues.

## Warnings

### WR-01: `retry_promotion` closes `db` before calling `promote_*`, but the `finally: db.close()` then executes a second close on an already-closed session

**File:** `backend/app/services/llm.py:712-746`

**Issue:** In the `voice` and `manual` branches of `retry_promotion`, `db.close()` is called explicitly at lines 713 and 737, and then the outer `finally: db.close()` on line 746 fires a second `close()` on the same session. SQLAlchemy `Session.close()` is idempotent when called twice on a pool-based session (returns the connection to the pool on the first call; the second call is a no-op), so this does **not** currently cause data corruption or errors. However, the same pattern is **not** present in the `photo` branch (which calls `_record_failure` and returns normally), meaning the `finally` block is the only close for that path. The structural inconsistency makes the voice and manual branches look like they close twice while the photo branch only closes once — this is a real future-maintenance trap. If the session is ever swapped for an async session or a non-pool connection, the double-close would become an error.

**Fix:** Remove the inline `db.close()` calls before delegating to `promote_*`. Both `promote_voice_draft` and `promote_full_draft` open their own `SessionLocal()`, so they do not need the caller's session to be open. Leave the `finally: db.close()` as the only close path:

```python
if sc_type == "voice":
    transcript = payload.get("transcript") or ""
    if not transcript.strip():
        _record_failure(db, recipe, ValueError("retry: transcript missing"))
        return
    # db remains open until the finally block — promote_voice_draft opens its own.
    promote_voice_draft(recipe_id, transcript)
    return
if sc_type == "manual":
    promote_full_draft(recipe_id)
    return
```

---

### WR-02: `prod-synthetic` seed does not write the three new RID-02 fields (`cook_time_minutes`, `difficulty`, `description`) or `illustration_svg` to recipe rows

**File:** `backend/app/cli/seed.py:797-822`

**Issue:** `run_prod_synthetic_seed` builds recipe rows from `_recipe_specs()` (line 797), which includes the Phase 24 fields (`cook_time_minutes`, `difficulty`, `description`, `illustration_svg`) via `spec.get(...)`. However, the `Recipe(...)` constructor call in `run_prod_synthetic_seed` (lines 797–822) does **not** pass these fields — compare the test-seed path (lines 469–501) which does pass them. The prod-synthetic seed will therefore always write `NULL` for all four fields for every recipe, including the three specs that have `illustration_svg=_SEED_ILLUSTRATION_SVG`. This means the DEMO01 household never shows completeness scores above ~55% (7/11 fields) and never shows illustrations, even though the canonical spec defines them.

This is not a correctness bug for production data (real users won't notice), but it means the prod-synthetic demo household does not reflect Phase 24 features, which is the purpose of that seed. It will also silently diverge every time a new optional column is added.

**Fix:** Mirror the test-seed column list in `run_prod_synthetic_seed` — either pass the four fields explicitly or extract the construction into a shared helper that both seed paths call:

```python
r = _merge_synthetic(db, Recipe(
    ...  # existing fields
    cook_time_minutes=spec.get("cook_time_minutes"),
    difficulty=spec.get("difficulty"),
    description=spec.get("description"),
    illustration_svg=spec.get("illustration_svg"),
))
```

---

### WR-03: `promote_quick_draft` reads `recipe.title` as the input to `rewrite_title`, but the title at that point is still the user's original quick-add title, not the `source_capture.payload.title` permanent copy

**File:** `backend/app/services/llm.py:625`

**Issue:** `promote_quick_draft` calls `rewrite_title(recipe.title, {})` where `recipe.title` is the title the user typed. This is correct as intended — the rewrite uses the user's title as input. However, the comment at line 623 states "source_capture.payload.title preserves the user's input forever (invariant #5); we only overwrite recipe.title here," which is accurate. The concern is a subtle race: if `db.merge()` from a concurrent request has already updated `recipe.title` between the initial `db.add` in the router and when the BackgroundTask reads it, `recipe.title` may not be what the user originally typed. D-29 ("BackgroundTask wins" on race) is documented but the task reads `recipe.title` (which may already have been overwritten by a concurrent PUT) rather than `recipe.source_capture["payload"]["title"]` (the invariant-5 stable copy). For quick-add this is low-probability but for full-form (`promote_full_draft`, same pattern at line 663) a concurrent PUT updating the title before the BackgroundTask runs would cause the BackgroundTask to rewrite the user's NEW title instead of the original.

The fix aligns with the stated invariant: read from `source_capture` instead of `recipe.title` to make the rewrite deterministic regardless of race timing:

```python
original_title = (recipe.source_capture or {}).get("payload", {}).get("title") or recipe.title
new_title = rewrite_title(original_title, {})
```

## Info

### IN-01: `RecipeForm.tsx` — `onSubmit` prop signature mismatch between the edit page and the `RecipeForm` component

**File:** `frontend/components/RecipeForm.tsx:233` and `frontend/app/recipes/[id]/edit/page.tsx:154`

**Issue:** `RecipeForm`'s `Props` type declares `onSubmit: (body: RecipeBody, photoPaths: string[]) => Promise<void>` (line 233), accepting two arguments. The edit page's `onSubmit` handler at line 154 only accepts one argument (`body: RecipeBody`) and never receives or uses `photoPaths`. TypeScript would normally catch this, but because `handleSubmit` (line 283 in RecipeForm.tsx) calls `onSubmit(formValuesToBody(v), v.photo_paths)`, the second argument is silently discarded by the edit page handler. This is not a runtime bug (the edit page manages photo paths through the `photo_paths` field on the form body itself), but the dead second parameter makes the API surface misleading.

**Fix:** Either align the edit page handler signature to match (`async function onSubmit(body: RecipeBody, _photoPaths: string[])`) or change the `Props` type to omit the second argument if no current consumer uses it.

---

### IN-02: `svg_sanitizer.py` — The `viewBox` normalization step does not strip the original `viewBox` from `elem.attrib` before setting the new value; ET may serialize both if the attribute was namespace-prefixed

**File:** `backend/app/services/svg_sanitizer.py:136`

**Issue:** `root.attrib["viewBox"] = "0 0 160 160"` sets the `viewBox` attribute on the root element's attrib dict. In practice this works correctly when the root tag's namespace prefix has been stripped (the allowlist walk checks the clean name, not the ET-keyed name). However, if ET internally stores the attribute under a namespace-prefixed key (e.g. `"{http://www.w3.org/2000/svg}viewBox"`) rather than the plain `"viewBox"` key, setting `root.attrib["viewBox"]` would add a new entry while the original namespaced entry persists. In CPython's ET implementation for SVG with `xmlns="..."`, element attributes are stored with their namespace-stripped form when the document is parsed without a namespace context, so this is not currently a bug. It is, however, an implicit assumption that could break if the parsing behavior changes. The current test suite covers this path (line 43: `assert '50 50 100 100' not in result`), so regression protection exists.

**Suggestion:** Add an explicit cleanup of any existing viewBox-like key before normalizing, or use the full attribute dict replace pattern to be defensive:

```python
# Strip any namespace-prefixed viewBox that ET may have retained
for k in list(root.attrib.keys()):
    if _strip_namespace(k).lower() == "viewbox":
        del root.attrib[k]
root.attrib["viewBox"] = "0 0 160 160"
```

---

### IN-03: `llm_fixtures.py` — `canned_voice_recipe` and `canned_photo_recipe` do not return the three new RID-02 fields (`cook_time_minutes`, `difficulty`, `description`), so completeness scores in test mode will always miss those three fields

**File:** `backend/app/services/llm_fixtures.py:45-65` and `68-90`

**Issue:** The `GeminiExtractedRecipe` schema now includes `cook_time_minutes`, `difficulty`, and `description` (added in Phase 24). The canned fixtures in `llm_fixtures.py` do not set these fields; they default to `None`. This means any Playwright test that promotes a recipe via voice or photo and then opens the detail page will see a CompletenessCard reporting those three fields as missing, which may cause false-positive failures for any spec that asserts on completeness percentage. This is a test-isolation issue only — it has no effect on production behavior.

**Fix:** Add the three fields to the canned fixtures (example for `canned_voice_recipe`):

```python
return GeminiExtractedRecipe(
    title="Risotto aux champignons (test)",
    ...
    cook_time_minutes=25,
    difficulty="medium",
    description="Un risotto crémeux aux champignons, parfait pour l'automne.",
    ...
)
```

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
