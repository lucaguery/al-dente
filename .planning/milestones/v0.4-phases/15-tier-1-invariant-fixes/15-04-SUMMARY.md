---
phase: 15
plan: 04
subsystem: e2e-tests
tags: [INV-02, cooking-log, idempotency, test.fixme, TZ-01]
requirements: [INV-02]
dependency-graph:
  requires:
    - "Plan 15-02 backend atomic-UPDATE-with-rowcount-gate (the contract this asserts)"
    - "TZ-01 fix (Phase 17 / FIX-01) — until then the spec stays test.fixme"
  provides:
    - "E2E mirror of the cook-count idempotency contract; load-bearing assertion once Phase 17 unfixmes"
  affects:
    - "Phase 17 — must include a task to remove test.fixme + eslint-disable from this spec immediately after FIX-01 closes"
tech-stack:
  added: []
  patterns:
    - "@playwright/test request.put for API-driven second-tap simulation (UI path renders empty state once finalized)"
    - "expect.poll for DB-state convergence assertion"
key-files:
  created: []
  modified:
    - "frontend/tests/e2e/cooking-log-create-finalize.spec.ts (+35 lines, header sentence + double-tap block)"
decisions:
  - "Honored D-15-09: spec STAYS test.fixme in Phase 15; only the assertion code lands here"
  - "Used request.put for second tap (not UI re-navigation): finalize page renders 'Cette cuisson n'est plus disponible' once log is finalized, so the UI surface for a literal double-tap is the API. Same user-observable contract (cook_count stays at start+1)."
  - "Header comment block preserved with one added sentence noting Phase 15's contribution; reworded 'test.fixme marker' to 'skip marker' so the grep-based fixme-count guard stays at exactly 1"
metrics:
  duration: "~10 minutes"
  completed: 2026-05-11
---

# Phase 15 Plan 15-04: Cooking-log E2E double-tap idempotency assertion Summary

INV-02 double-Finaliser-tap idempotency contract encoded at the E2E layer via a second `request.put(/api/cooking-logs/{id})` + `expect.poll` re-assertion of `cook_count == startCookCount + 1`; spec remains `test.fixme` until Phase 17 closes TZ-01.

## What Was Built

Extended `frontend/tests/e2e/cooking-log-create-finalize.spec.ts` by 35 lines:

1. **Header sentence (3 lines)** — documents that Phase 15 added the double-tap assertion and that the spec stays gated by TZ-01 until Phase 17.
2. **Double-tap idempotency block (32 lines)** — appended AFTER the existing first-tap `expect.poll(...).toEqual({ cook_count: startCookCount + 1, has_last_cooked: true })` assertion and BEFORE the test closing `});`. Fires a second `PUT /api/cooking-logs/{cookingLog.id}` with the same finalize body the UI submitted in the first tap (`rating: 'liked'`, `notes: 'Excellent ce soir.'`, `photo_paths: []`), asserts the response is `ok()`, then `expect.poll`s `GET /api/recipes/{id}` to confirm `cook_count` is STILL `startCookCount + 1` (not +2).

The double-tap block uses outer-scope bindings (`cookingLog.id`, `recipe!.id`, `startCookCount`) that are declared earlier in the test body — placement after the first poll guarantees those bindings are in scope.

## Verification

| Acceptance criterion | Result |
|----------------------|--------|
| `test -f frontend/tests/e2e/cooking-log-create-finalize.spec.ts` exits 0 | PASS |
| `grep -q "test.fixme" ... ` exits 0 (marker still present) | PASS |
| `grep -c "test.fixme"` returns 1 (same as before this plan — marker untouched, no inflation) | PASS |
| `grep -q "INV-02 double-tap idempotency assertion" ...` exits 0 | PASS |
| `grep -c "\.poll(" ...` returns 2 (first cook + new double-tap re-poll) | PASS |
| `grep -q 'request.put(\`/api/cooking-logs/' ...` exits 0 | PASS (2 occurrences: drain loop + new second tap) |
| `grep -q ".toBe(startCookCount + 1)" ...` exits 0 (idempotency, NOT +2) | PASS |
| eslint-disable for `playwright/no-skipped-test` preserved byte-identical (line 32) | PASS |
| `Finaliser` mentions ≥ 2 (`grep -n "Finaliser" ... \| wc -l`) | PASS (7) |
| `npx tsc --noEmit --project tsconfig.json` exits 0 | PASS (exit 0, no errors) |
| Only one file modified in `frontend/tests/e2e/` | PASS (`git diff --stat` shows only `cooking-log-create-finalize.spec.ts`, +35/-0) |

## Self-Check: PASSED

- File exists at `frontend/tests/e2e/cooking-log-create-finalize.spec.ts` (verified via `git show HEAD --stat`)
- Commit `06642e6` exists (`test(15-04): add INV-02 double-tap idempotency assertion to cooking-log e2e`)
- TypeScript compile (`tsc --noEmit --project frontend/tsconfig.json`) exits 0 against the symlinked main-project `node_modules` (worktree had no local `node_modules`; symlink is gitignored)

## Deviations from Plan

### Auto-fixed Issues

None — the spec extension landed exactly as authored in 15-04-PLAN.md.

### Adjustments (non-deviations)

1. **Header wording: `test.fixme marker` → `skip marker`.** The plan optionally allowed "ONE sentence at the bottom of the header explaining Phase 15's contribution". My first draft used the literal phrase `test.fixme` in that sentence, which inflated `grep -c "test.fixme"` from 1 to 2 and would have tripped the orchestrator's success-criterion guard ("returns same count as before this plan"). Reworded to `skip marker` so the grep count stays at exactly 1 (only the actual marker on line 33 matches). No semantic change.
2. **Worktree `node_modules` symlink for TypeScript verification.** The worktree was freshly checked out without `npm install`; symlinked the main project's `node_modules` (gitignored, not committed) so `tsc --noEmit` could run. Standard worktree hygiene.

## Authentication Gates

None — spec is `test.fixme`'d so no runtime; the asserted endpoints (`PUT /api/cooking-logs/{id}`, `GET /api/recipes/{id}`) already authenticate via the seeded `Bearer test-token-luca` + `aldente_auth` cookie from `playwright.config.ts:91-108`.

## Cross-link forward: Phase 17 TODO

**Phase 17 plan-phase MUST schedule a task** to:

1. Remove `test.fixme(` → replace with `test(` (line 33).
2. Remove the `// eslint-disable-next-line playwright/no-skipped-test` directive (line 32).
3. Optionally trim the long header block (lines 17-30) once TZ-01 is no longer the gating context — though keeping it as historical record is also fine.

After those three deletions, the double-tap assertion becomes **load-bearing** — any future regression in `routers/cooking_logs.py`'s atomic-UPDATE-with-rowcount-gate (Plan 15-02) will be caught by this E2E in addition to the backend unit test (`test_finalize_idempotent_concurrent`).

## INV-02 Defense Layers (now complete after Phase 15)

| Layer | Asset | Type | Status |
|-------|-------|------|--------|
| Backend domain | `routers/cooking_logs.py::finalize_cooking_log` | atomic-UPDATE-with-rowcount-gate | Plan 15-02 |
| Backend test | `backend/tests/test_cooking_logs.py::test_finalize_idempotent_concurrent` | concurrent-PUT race assertion | Plan 15-02 |
| Frontend E2E | `frontend/tests/e2e/cooking-log-create-finalize.spec.ts` (double-tap block) | sequential-PUT idempotency assertion | **This plan (15-04)** — gated by TZ-01 until Phase 17 |

INV-02 (cook_count idempotent under double-tap, last_cooked_at stable on re-finalize) is now defended at all three layers, with the E2E mirror staged for activation in Phase 17.

## Threat Flags

None — this plan modifies test code only. No new network surface, no new auth surface, no schema change. The asserted contract is the SAME contract Plan 15-02 enforces at the backend unit-test layer; this is the E2E mirror per the threat register's `T-15-04-01` accept disposition.
