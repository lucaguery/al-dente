---
phase: 16-capture-pipeline-correctness
verified: 2026-05-11T00:00:00Z
status: human_needed
score: 8/8 must-haves verified (with documented caveats — e2e specs were not run live this session)
overrides_applied: 0
human_verification:
  - test: "Run the two new Playwright specs against a live uvicorn + Next dev server (seeded household)"
    expected: "`cd frontend && npx playwright test --project=seeded capture-voice-failed-recovery.spec.ts recipe-form-ingredient-parser.spec.ts` exits 0 — both specs pass end-to-end against the real BackgroundTask + Gemini env-flag stub path"
    why_human: "Playwright runtime not available in this verification session; tsc + eslint exit 0 statically but the BG-task race tolerance + AlertDialog scoping + form-submit URL behavior can only be validated against a running stack. Spec authors flagged this as a deferred-to-CI item in 16-05 SUMMARY."
  - test: "Manually exercise the failed-state UI in /inbox against a Railway-deployed backend"
    expected: "POST a voice draft with transcript starting `__TEST_FORCE_FAIL__` (only in test env, not production) — observe `Extraction échouée` Fraunces-italic label + truncated French error sentence + 48px Réessayer + 48px Supprimer with Radix AlertDialog confirm. Tap Réessayer: row resets to draft and re-fails. Tap Supprimer + confirm: row hard-deletes."
    why_human: "Visual layout, French copy clarity, AlertDialog UX feel, and 48px tap target ergonomics on a physical iPhone are not programmatically verifiable. The components, i18n keys, and predicates are all wired correctly per static checks."
  - test: "Manually verify the CAP-03 parser fix on a production-like surface"
    expected: "Open /recipes/new (Complète tab); paste the 4 D-16-09 lines (`4 tomates`, `1 oignon rouge`, `500 g de farine`, `2 c.s. d'huile`); submit; recipe-detail Ingrédients list renders each line exactly once with no `4 tomates 4 tomates` duplication."
    why_human: "Round-trip exercise spans browser parser + backend JSONB storage + detail-page render — easiest validated by a user with the dev stack running. Static checks confirm the whitelist, normalizer, and parser branch land; end-to-end behavior is what the deferred e2e spec covers."
---

# Phase 16: Capture pipeline correctness Verification Report

**Phase Goal:** Users recover from failed captures without abandoning the draft, and French shopping-list ingredient lines round-trip correctly through capture → promotion → detail page.

**Verified:** 2026-05-11
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (merged from ROADMAP Success Criteria + PLAN frontmatter must-haves)

| #  | Truth                                                                                                                                                                                                                | Status      | Evidence                                                                                                                                                                                                                                                            |
| -- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | **SC1**: Gemini failure transitions draft to `failed` terminal state with `promotion_error` populated (no more stuck-at-`(extraction en cours…)`).                                                                   | ✓ VERIFIED  | `backend/app/services/llm.py:357` writes `recipe.status = "failed"` inside `_record_failure`; both `promote_voice_draft` and `promote_photo_draft` call `_record_failure` in their except blocks (llm.py:390, 416). `RecipeStatus.failed` exists at `recipe.py:41`. |
| 2  | **SC2**: `/inbox` on `failed` draft renders French label `Extraction échouée` + inline `Réessayer` + `Supprimer` at 48px tap target.                                                                                 | ✓ VERIFIED  | `RecipeDraftCard.tsx:139` Fraunces-italic destructive label uses `tPromo("failed_label")` = `"Extraction échouée"` (fr.json). Two `h-12` buttons at lines 149, 165. AlertDialog primitive imported (lines 24-32). `isFailed = recipe.status === "failed"` at line 75. |
| 3  | **SC3**: French shopping-list ingredient lines round-trip without duplication on detail page.                                                                                                                        | ✓ VERIFIED  | `RecipeForm.tsx:51` `FRENCH_UNIT_WHITELIST` Set; `_normalizeUnitToken` at line 69; parser branch at line 162-163 uses whitelist. Old greedy regex removed. `recipeToFormValues` unchanged (reverse direction already correct). 4 D-16-09 examples covered.            |
| 4  | **SC4**: Capture pipeline still honors invariant #1 — 5 surfaces, `BackgroundTask` promotion, terminal states `{structured, failed}`.                                                                                | ✓ VERIFIED  | Migration `0006_recipe_status_failed.py` extends Postgres enum with `IF NOT EXISTS` guard inside `autocommit_block()` (idempotent on Railway re-deploys). All 5 capture surfaces still call `_record_failure` from their respective BG tasks. No surface added/removed. |
| 5  | **(PLAN 16-01)**: Locked-vocabulary parity across Python enum / Postgres ENUM / TS literal.                                                                                                                          | ✓ VERIFIED  | `recipe.py:41` `failed = "failed"`; `0006_recipe_status_failed.py:44` `ALTER TYPE recipe_status ADD VALUE IF NOT EXISTS 'failed'`; `recipes.ts:23` `status: "draft" \| "structured" \| "verified" \| "failed"`. All three sites updated in single phase.               |
| 6  | **(PLAN 16-03)**: Retry endpoint resets `failed → draft` synchronously; regex widened to include `failed`.                                                                                                           | ✓ VERIFIED  | `routers/recipes.py:211-212` pattern is `^(draft\|structured\|verified\|failed)$`; line 611 guards `if recipe.status == "failed": recipe.status = "draft"`. Household-scoped 404 contract preserved (line 597-602).                                                  |
| 7  | **(PLAN 16-04)**: Inbox refetch widened to keep failed rows visible; realtime branches preserve failed rows.                                                                                                         | ✓ VERIFIED  | `inbox/page.tsx:49-51` `Promise.all` over `?status=draft` AND `?status=failed`. Realtime branch at line 106 drops only when `payload.status !== "draft" && payload.status !== "failed"`. Created branch widened identically at line 92.                              |
| 8  | **(PLAN 16-05)**: `__TEST_FORCE_FAIL__` deterministic-failure prefix exists in fixtures; two new specs locked at E2E layer.                                                                                          | ✓ VERIFIED (with caveat) | `llm_fixtures.py:25` defines `_FORCE_FAIL_PREFIX`. `canned_voice_recipe` raises French RuntimeError on prefix match (line 40-44). Both spec files exist (180 + 107 lines) with required text patterns. **Caveat:** Specs not run live this session — see human_verification. |

**Score:** 8/8 truths verified (1 with documented caveat — Playwright runtime unavailable; specs are structurally complete + tsc/eslint-clean).

### Required Artifacts

| Artifact                                                                                | Expected                                                              | Status      | Details                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/models/recipe.py`                                                          | `RecipeStatus.failed = "failed"`                                      | ✓ VERIFIED  | Line 41 confirms member; docstring at line 4 lists all four values. Mixin `(str, enum.Enum)` preserved.                                                  |
| `backend/alembic/versions/0006_recipe_status_failed.py`                                 | Idempotent ALTER TYPE migration; `down_revision = "0005"`             | ✓ VERIFIED  | File present (60 lines); `revision = "0006"`, `down_revision = "0005"`. Uses `op.get_context().autocommit_block()` + `ADD VALUE IF NOT EXISTS`. `downgrade()` raises `NotImplementedError`. |
| `frontend/lib/recipes.ts`                                                               | `status` literal includes `"failed"`                                  | ✓ VERIFIED  | Line 23 reads `status: "draft" \| "structured" \| "verified" \| "failed"`.                                                                               |
| `frontend/components/RecipeForm.tsx`                                                    | `FRENCH_UNIT_WHITELIST` + whitelist-gated parser                      | ✓ VERIFIED  | Whitelist constant at line 51; normalizer at line 69; CAP-03 parser branch at line 139. Old greedy regex string `([a-zA-Zàâéèêëïîôùûç]+)?` absent.        |
| `backend/app/services/llm.py`                                                           | `_record_failure` writes `status = "failed"`                          | ✓ VERIFIED  | Line 357 writes status; line 358 preserves 500-char truncation contract; line 359 increments attempts. Symmetric with `_apply_extracted`.                |
| `backend/app/routers/recipes.py`                                                        | Widened status regex + guarded failed→draft reset                     | ✓ VERIFIED  | Line 212 pattern includes `failed`; line 611 reset guard in place. `Depends(current_member)` + household scoping preserved.                              |
| `backend/app/services/llm_fixtures.py`                                                  | `_FORCE_FAIL_PREFIX` constant + conditional raise                     | ✓ VERIFIED  | Line 25 constant; line 40-44 raise. `canned_photo_recipe` + `canned_modified_recipe` untouched.                                                          |
| `backend/tests/test_recipes.py`                                                         | Two regression tests for CAP-01                                       | ✓ VERIFIED  | Both `test_promotion_failure_sets_failed_state` (line 54) and `test_retry_promotion_resets_failed_to_draft` (line 122) present. `monkeypatch.setattr` + direct `status="failed"` seed. |
| `frontend/components/RecipeDraftCard.tsx`                                               | Failed-variant Card with label + error + AlertDialog                  | ✓ VERIFIED  | `isFailed = recipe.status === "failed"` (line 75). Failed JSX (lines 136-201) renders Fraunces-italic label, `line-clamp-2` error, h-12 Réessayer + h-12 Supprimer + Radix AlertDialog. `window.confirm` removed. |
| `frontend/app/inbox/page.tsx`                                                           | Dual fetch + realtime branches keep `failed`                          | ✓ VERIFIED  | `Promise.all([draft, failed])` at line 49-51; merged + sorted client-side. Both realtime branches widened (lines 92, 106).                              |
| `frontend/lib/i18n/fr.json`                                                             | `recipes.promotion.failed_label` + 6 sibling new keys                 | ✓ VERIFIED  | `jq` confirms `failed_label = "Extraction échouée"`, `delete_confirm_title = "Supprimer ce brouillon ?"`, `failed_context_fallback` present. Existing keys preserved. |
| `frontend/tests/e2e/capture-voice-failed-recovery.spec.ts`                              | Two tests with `__TEST_FORCE_FAIL__` + AlertDialog scoping            | ✓ VERIFIED (structurally) | File exists (180 lines). Contains `__TEST_FORCE_FAIL__`, `Extraction échouée`, `Supprimer ce brouillon`, `getByRole('alertdialog')`. No `test.fixme`. **Not run live this session.** |
| `frontend/tests/e2e/recipe-form-ingredient-parser.spec.ts`                              | Negative canary `toHaveCount(0)` on `4 tomates 4 tomates`             | ✓ VERIFIED (structurally) | File exists (107 lines). Contains `4 tomates 4 tomates`, `toHaveCount(0)`, all four ingredient strings. No `test.fixme`. **Not run live this session.**  |

### Key Link Verification

| From                                                       | To                                                            | Via                                                                                  | Status     | Details                                                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/services/llm.py::_record_failure`             | `RecipeStatus.failed` (Python) / Postgres ENUM                | String-literal write `"failed"` round-trips through SQLAlchemy + Postgres            | ✓ WIRED    | `recipe.status = "failed"` at line 357; the value exists in both Python enum (recipe.py:41) and Postgres ENUM (migration 0006).    |
| `backend/app/routers/recipes.py::retry_promote`            | `backend/app/services/llm.py::retry_promotion`                | `background_tasks.add_task(retry_promotion, recipe.id)` (line 625)                  | ✓ WIRED    | Router calls retry_promotion; retry_promotion in turn re-dispatches to promote_voice_draft/promote_photo_draft based on source_capture.type. |
| `frontend/components/RecipeDraftCard.tsx::isFailed`        | `recipe.status === "failed"` (canonical signal)               | Direct predicate sourced from the canonical status field                            | ✓ WIRED    | Line 75. Legacy `promotion_error != null` workaround removed.                                                                       |
| `frontend/components/RecipeDraftCard.tsx::Supprimer flow`  | `DELETE /api/recipes/{id}` (existing endpoint)                | AlertDialog confirm → `handleDelete` → `deleteRecipe(recipe.id)` from `lib/recipes.ts` | ✓ WIRED    | AlertDialogAction onClick wired to handleDelete (line 191); handleDelete invokes deleteRecipe. AlertDialog replaces window.confirm. |
| `frontend/app/inbox/page.tsx`                              | `/api/recipes?status=draft` AND `/api/recipes?status=failed`  | Two parallel GETs via `Promise.all` + client-side dedupe + sort by created_at DESC  | ✓ WIRED    | Lines 49-66. Realtime branches at lines 86-114 maintain the same dual-status filter.                                                |
| `frontend/components/RecipeForm.tsx::formValuesToBody`     | `frontend/app/recipes/[id]/page.tsx` Ingrédients render        | JSONB `{name, quantity, unit}` shape — render at `${qty}${unit} ${name}`            | ✓ WIRED    | Parser produces canonical shape; detail page render unchanged (Phase 8). Round-trip clean.                                          |

### Data-Flow Trace (Level 4)

| Artifact                                          | Data Variable                          | Source                                                                                                         | Produces Real Data | Status     |
| ------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------ | ---------- |
| `RecipeDraftCard.tsx` (failed variant)            | `recipe.promotion_error`               | Backend `_record_failure` writes `str(exc)[:500]` (llm.py:358) — populated from real Gemini SDK exceptions      | Yes                | ✓ FLOWING  |
| `RecipeDraftCard.tsx` (failed variant)            | `recipe.status`                        | Backend `_record_failure` writes `"failed"` (llm.py:357) — populated on every Gemini failure path              | Yes                | ✓ FLOWING  |
| `inbox/page.tsx`                                  | `drafts` (merged Recipe[])             | `Promise.all([fetch draft, fetch failed])` → backend list endpoint with widened regex (recipes.py:212)         | Yes                | ✓ FLOWING  |
| `recipes/[id]/page.tsx` Ingrédients list          | `recipe.ingredients`                   | Backend `recipes.ingredients` JSONB column, populated by both Gemini extraction and full-form `formValuesToBody` | Yes                | ✓ FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                                                            | Command                                                                                          | Result                          | Status            |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- | ----------------- |
| Python enum exposes `RecipeStatus.failed`                                                           | `grep -q "failed = \"failed\"" backend/app/models/recipe.py`                                     | match found at line 41          | ✓ PASS            |
| Alembic migration is registered in chain                                                            | `ls backend/alembic/versions/0006_recipe_status_failed.py`                                       | file present (60 lines)         | ✓ PASS            |
| TypeScript `Recipe.status` includes `"failed"`                                                      | `grep -q '\"draft\" \| \"structured\" \| \"verified\" \| \"failed\"' frontend/lib/recipes.ts`     | match at line 23                | ✓ PASS            |
| `_record_failure` writes `"failed"`                                                                 | `grep -n 'recipe.status = \"failed\"' backend/app/services/llm.py`                               | line 357                        | ✓ PASS            |
| Retry endpoint regex widened                                                                        | `grep -n "(draft\|structured\|verified\|failed)" backend/app/routers/recipes.py`                 | line 212                        | ✓ PASS            |
| Retry endpoint resets failed→draft                                                                  | `grep -n 'if recipe.status == \"failed\"' backend/app/routers/recipes.py`                        | line 611                        | ✓ PASS            |
| Inbox dual-fetch wired                                                                              | `grep -n "status=failed" frontend/app/inbox/page.tsx`                                             | line 51 (in fetch URL)          | ✓ PASS            |
| Realtime branches keep failed                                                                       | `grep -n 'payload.status !== \"draft\" && payload.status !== \"failed\"' frontend/app/inbox/page.tsx` | lines 92, 106                   | ✓ PASS            |
| AlertDialog imported in RecipeDraftCard                                                             | `grep -c "AlertDialog" frontend/components/RecipeDraftCard.tsx`                                   | 12 occurrences (import + JSX)   | ✓ PASS            |
| `window.confirm` removed from RecipeDraftCard                                                       | `grep -n "^\s*window.confirm(" frontend/components/RecipeDraftCard.tsx`                          | none (only in comment)          | ✓ PASS            |
| French whitelist + normalizer in parser                                                             | `grep -n "FRENCH_UNIT_WHITELIST\|_normalizeUnitToken" frontend/components/RecipeForm.tsx`        | lines 51, 69, 162-163           | ✓ PASS            |
| Force-fail prefix in fixtures                                                                       | `grep -n "_FORCE_FAIL_PREFIX" backend/app/services/llm_fixtures.py`                              | line 25 + line 40               | ✓ PASS            |
| Backend pytest module exists                                                                        | `ls backend/tests/test_recipes.py` + 2 test functions                                            | file present, 2 `def test_*`    | ✓ PASS            |
| Two new E2E spec files exist                                                                        | `ls frontend/tests/e2e/capture-voice-failed-recovery.spec.ts frontend/tests/e2e/recipe-form-ingredient-parser.spec.ts` | both present                    | ✓ PASS            |
| 48px tap target (`h-12`) on Réessayer + Supprimer                                                   | `grep -n "h-12" frontend/components/RecipeDraftCard.tsx`                                          | lines 149, 165                  | ✓ PASS            |
| i18n key `failed_label` = "Extraction échouée"                                                       | `jq -e '.recipes.promotion.failed_label == "Extraction échouée"' frontend/lib/i18n/fr.json`      | exit 0                          | ✓ PASS            |
| 6 commits land all 5 plans + 5 summaries                                                            | `git log --oneline -20` includes 16-01 through 16-05 commits + SUMMARYs                         | all 5 plans committed           | ✓ PASS            |
| Playwright specs run live (CAP-01/02/03 end-to-end)                                                 | `cd frontend && npx playwright test --project=seeded capture-voice-failed-recovery.spec.ts recipe-form-ingredient-parser.spec.ts` | Playwright runtime unavailable  | ? SKIP (see human_verification) |

### Requirements Coverage

| Requirement | Source Plan         | Description                                                                                                                                                                                                                | Status        | Evidence                                                                                                                              |
| ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| CAP-01      | 16-01, 16-03, 16-04, 16-05 | Capture pipeline acquires a `failed` terminal state — `recipes.status` adds `failed` via Alembic; BackgroundTask writes `failed` + error context. Architecture invariant #1 extended cleanly. (ASSESSMENT C-4 backend) | ✓ SATISFIED   | All three locked-vocabulary sites updated; `_record_failure` writes status; migration 0006 idempotent. SC1 + SC4 evidence above.       |
| CAP-02      | 16-04, 16-05        | User sees a recovery affordance on failed drafts in `/inbox` — French failed-state label + inline `Réessayer` / `Supprimer` actions. (ASSESSMENT C-4 frontend)                                                            | ✓ SATISFIED   | RecipeDraftCard failed variant + inbox dual-fetch + 7 new i18n keys + AlertDialog confirm. SC2 evidence above.                          |
| CAP-03      | 16-02, 16-05        | Ingredient parser correctly round-trips French shopping-list patterns; no `4 tomates 4 tomates` duplication. (ASSESSMENT B-2, Issue #2)                                                                                  | ✓ SATISFIED   | `FRENCH_UNIT_WHITELIST` + `_normalizeUnitToken` + whitelist-gated parser branch + negative regression canary spec. SC3 evidence above.  |

No orphaned requirements — REQUIREMENTS.md maps CAP-01, CAP-02, CAP-03 to Phase 16 exclusively, and all three IDs appear in plan frontmatter.

### Anti-Patterns Found

| File                                          | Line     | Pattern                                                  | Severity | Impact                                                                                                                          |
| --------------------------------------------- | -------- | -------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/services/llm.py`                 | 428, 459, 464 | `TODO(productize)` — photo-retry path                    | ℹ️ Info  | Pre-existing, NOT introduced by Phase 16. Documented in 16-03 SUMMARY as out-of-scope: "voice path remains the only fully-functional retry route". Acceptable per CLAUDE.md `TODO(productize)` convention. |

No blocker or warning anti-patterns introduced by Phase 16.

### Caveats & Known Limitations (carried forward from SUMMARYs)

1. **E2E specs not run live this session.** `capture-voice-failed-recovery.spec.ts` and `recipe-form-ingredient-parser.spec.ts` are structurally complete, lint-clean, TypeScript-valid, and contain all required text patterns (regression canary, French labels, AlertDialog role scoping). Live Playwright execution is deferred to CI / next manual run. **Routed to human_verification.**

2. **`test_promotion_failure_sets_failed_state` is unit-level rather than HTTP-driven.** Plan 16-03's SUMMARY documents this Rule 1 deviation: the conftest's rolled-back transaction is invisible to the BG task's fresh `SessionLocal()`, so the test drives `_record_failure` directly. The 16-05 e2e spec covers the full HTTP+BG-task path against real uvicorn. Acceptable trade-off for this milestone.

3. **Migration 0006 pushed to local test DB during 16-03's execution.** Railway will run `alembic upgrade head` on the next deploy as usual; the `IF NOT EXISTS` guard + `autocommit_block()` make this idempotent.

4. **`failed_badge` i18n key is now legacy.** Phase 16 plans note no remaining consumer; a future cleanup may remove it once `grep -r "failed_badge" frontend/` returns zero. Preserved defensively for now.

### Human Verification Required

The phase is functionally complete per static checks (8/8 must-haves verified), but three items require human/runtime validation:

1. **Run the two new Playwright specs against a live stack.** Static checks confirm spec structure; runtime confirmation of BG-task race tolerance, AlertDialog scoping, and form-submit URL behavior requires `npx playwright test`. See human_verification[0].
2. **Manual inbox UX exercise on a physical device.** Visual layout, French copy clarity, AlertDialog feel, and 48px tap target ergonomics need eye-on-glass verification. See human_verification[1].
3. **Manual full-form ingredient round-trip.** Browser parser + JSONB storage + detail-page render together — easiest validated by a user. See human_verification[2].

### Gaps Summary

No gaps. All 8 must-haves are wired correctly, all data flows confirmed, all anti-patterns benign. Status is `human_needed` solely because behavior validation requires a running Playwright + uvicorn + Next dev server combination unavailable in this verification session, and end-user UX feel cannot be programmatically asserted.

---

_Verified: 2026-05-11_
_Verifier: Claude (gsd-verifier)_
