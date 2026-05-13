---
phase: 24-recipe-identity
fixed_at: 2026-05-13T00:00:00Z
review_path: .planning/phases/24-recipe-identity/24-REVIEW.md
iteration: 2
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-05-13
**Source review:** .planning/phases/24-recipe-identity/24-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 6 (WR-01, WR-02, WR-03, IN-01, IN-02, IN-03 — all scope)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: `retry_promotion` double `db.close()` in voice and manual branches

**Files modified:** `backend/app/services/llm.py`
**Commit:** 135fb58
**Applied fix:** Removed the two inline `db.close()` calls before `promote_voice_draft(...)` and `promote_full_draft(...)` in `retry_promotion`. The `finally: db.close()` block on line 744 is now the single close path for all branches, consistent with the photo branch. Updated comments to clarify that each promote function opens its own `SessionLocal`.

---

### WR-02: `run_prod_synthetic_seed` missing Phase 24 columns on Recipe constructor

**Files modified:** `backend/app/cli/seed.py`
**Commit:** e95e197
**Applied fix:** Added `cook_time_minutes`, `difficulty`, `description`, and `illustration_svg` to the `Recipe(...)` constructor in `run_prod_synthetic_seed`, using `spec.get(...)` for each — identical to the pattern already used in the dev seed path (lines 484–489). The DEMO01 household now receives completeness scores and illustrations for the three specs that define `illustration_svg`.

---

### WR-03: `promote_quick_draft` / `promote_full_draft` reading `recipe.title` instead of stable `source_capture.payload.title`

**Files modified:** `backend/app/services/llm.py`
**Commit:** f9a53c3
**Applied fix:** Both `promote_quick_draft` and `promote_full_draft` now derive `original_title` from `(recipe.source_capture or {}).get("payload", {}).get("title") or recipe.title` before passing it to `rewrite_title`. This reads invariant-5's stable copy of the user's original submission, making the rewrite deterministic regardless of concurrent PUT timing. The fallback to `recipe.title` handles quick captures with minimal `source_capture` data.

---

### IN-01: `RecipeForm.tsx` — `onSubmit` prop signature mismatch between edit page and RecipeForm component

**Files modified:** `frontend/app/recipes/[id]/edit/page.tsx`
**Commit:** 66c0420
**Applied fix:** Added `_photoPaths: string[]` as the second parameter to the `onSubmit` handler in `EditInner`. The parameter is intentionally unused (the edit page manages photo paths via the `photo_paths` field on the form body), so it is prefixed with `_` per TypeScript convention. This aligns the handler signature with the `Props` type declaration `onSubmit: (body: RecipeBody, photoPaths: string[]) => Promise<void>` in `RecipeForm.tsx`.

---

### IN-02: `svg_sanitizer.py` — `viewBox` normalization does not strip namespace-prefixed viewBox before setting canonical value

**Files modified:** `backend/app/services/svg_sanitizer.py`
**Commit:** 9740398
**Applied fix:** Replaced the bare `root.attrib["viewBox"] = "0 0 160 160"` assignment with a defensive loop that iterates `root.attrib.keys()` and deletes any key whose `_strip_namespace(k).lower()` equals `"viewbox"` before setting the canonical plain `"viewBox"` key. This prevents ET from serializing both a namespace-prefixed and a plain viewBox attribute when the input SVG declares `xmlns="http://www.w3.org/2000/svg"`. Uses the same `_strip_namespace` helper already present in the module.

---

### IN-03: `llm_fixtures.py` — canned fixtures missing RID-02 fields causing low test-mode completeness scores

**Files modified:** `backend/app/services/llm_fixtures.py`
**Commit:** 725b458
**Applied fix:** Added `cook_time_minutes`, `difficulty`, and `description` to both `canned_voice_recipe` (risotto: `cook_time_minutes=25`, `difficulty="medium"`, `description="Un risotto crémeux aux champignons, parfait pour l'automne."`) and `canned_photo_recipe` (tarte tatin: `cook_time_minutes=30`, `difficulty="easy"`, `description="Recette canned pour les tests."`). Playwright test-mode promotions now populate all three Phase 24 fields, raising CompletenessCard scores from ~7/11 to 10/11.

---

_Fixed: 2026-05-13_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
