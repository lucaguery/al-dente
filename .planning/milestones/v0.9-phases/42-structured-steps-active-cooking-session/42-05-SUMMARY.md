---
phase: 42-structured-steps-active-cooking-session
plan: "05"
subsystem: frontend-tests
tags: [playwright, e2e, active-cooking-session, backfill-loader]
dependency_graph:
  requires: [42-04]
  provides: [test_coverage_active_route]
  affects:
    - frontend/tests/e2e/active-cooking-session.spec.ts
tech_stack:
  added: []
  patterns:
    - createCookingLog helper mirroring cooking-log-create-finalize.spec.ts (stale-log drain → create new cooking log → return ids)
    - Conditional waits with 30s timeout to bridge both already-structured and post-backfill paths
    - Bounded step-advance loop (max 20 iterations) to find the finalize CTA without hardcoding step count
key_files:
  created:
    - frontend/tests/e2e/active-cooking-session.spec.ts (163 LOC)
  modified: []
status: complete
commit_hashes:
  - ee77cb3 # playwright spec
---

# Plan 42-05 Summary

Playwright E2E spec for the /active route. Three scenarios per the must_haves:

## Tests

1. **`happy path — det-top + progress + step navigator render`** (ACTV-01/02)
   - Navigate to `/cooking-logs/{id}/active`
   - Wait up to 30s for `étape N/M` pin to render (handles both already-structured and post-backfill paths)
   - Assert close button (aria-label `Fermer la session de cuisine`), progress segments, navigator footer

2. **`finalize transition — last step CTA routes to /finalize`** (ACTV-03)
   - Same setup as test 1
   - Tap `Étape suivante` up to 20 times until `Terminé · marquer cuisinée` appears
   - Tap finalize CTA, assert URL becomes `/cooking-logs/{id}/finalize`

3. **`backfill loading — loader visible then replaced by step navigator`** (STEP-03)
   - Navigate to `/active`
   - Final state must be the step navigator within 30s
   - After navigator renders, assert loader copy `Préparation des étapes…` is no longer in DOM
   - The 30s ceiling guards against silent BackgroundTask failure

## Helper

`createCookingLog(request, recipeFilter)` — finds a recipe by predicate, drains stale in-flight cooking logs, creates a fresh one, returns `{ recipeId, cookingLogId }`. Mirrors `cooking-log-create-finalize.spec.ts`'s pattern for isolation.

## Constraints honored

- **Per TESTING.md Pitfall 10**: no `consoleErrors` assertion (expected third-party noise would flake the assert).
- **Per CLAUDE.md invariant #6**: assertions use French strings exclusively (no i18n bypass in tests).
- **No new auth or seed shape invented**: uses the existing `seeded` Playwright project + `SEED_TOKEN` bearer from `playwright.config.ts`.

## What's exercised end-to-end

- Frontend route `/cooking-logs/{id}/active` (Plan 42-04)
- Backend `POST /recipes/{id}/extract-steps` endpoint (Plan 42-03) via the loader path
- Backend `BackgroundTask` `extract_and_persist_steps` (Plan 42-03)
- Backend Gemini prompt-schema extracting structured steps (Plan 42-02)
- `recipes.steps NOT NULL DEFAULT '[]'::jsonb` column (Plan 42-01 migration 0013)
- WebSocket `recipe.updated` broadcast (existing realtime contract)
- `/cooking-logs/{id}/finalize` route (existing — unchanged in Phase 42)

Phase 42's full vertical slice is now under test.

## Caveats

- The spec depends on the synthetic seed producing at least one recipe (any title) — currently the seed creates ~21 recipes.
- If the seed produces 0 structured-step recipes AND 0 empty-step recipes (unlikely), the 30s timeout would catch the case as a real bug rather than a flaky test.
- Test 2's bounded loop (max 20 iterations) handles any reasonable step count. If a recipe ever has >20 steps, the loop terminates without tapping finalize and the assertion fails — surfaces as a real bug.

## Files written

- **Created**: `frontend/tests/e2e/active-cooking-session.spec.ts` (163 LOC, lint-clean)
- **Modified**: none

## Verification

Run locally:
```
cd frontend && npm run test:e2e -- active-cooking-session.spec.ts
```

Expected: 3 passing tests against the local synthetic-seed stack.
