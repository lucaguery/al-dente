---
phase: 25-backend-foundation
plan: "03"
subsystem: frontend
tags: [recipe-turns, frontend-cutover, typescript, e2e-tests, locked-vocabulary]
dependency_graph:
  requires: [25-01, 25-02]
  provides:
    - Recipe type without source_capture (initial_turn_kind: TurnKind | null)
    - RecipeDraftCard reads initial_turn_kind for variant logic
    - e2e specs assert initial_turn_kind on API responses
  affects:
    - frontend/lib/recipes.ts (field swap)
    - frontend/components/RecipeDraftCard.tsx (captureType + isProcessing rewrite)
    - frontend/components/UrlCaptureTab.tsx (comment cleanup)
    - frontend/lib/recipe-completeness.ts (comment cleanup)
    - frontend/tests/e2e/capture-full.spec.ts
    - frontend/tests/e2e/capture-quick.spec.ts
    - frontend/tests/e2e/capture-url.spec.ts
    - frontend/tests/e2e/capture-voice-failed-recovery.spec.ts
tech_stack:
  added: []
  patterns:
    - TurnKind import from locked-vocabulary enums.ts (Phase 25 THREAD-01)
    - initial_turn_kind as TurnKind | null on Recipe type (mirrors backend Optional[str])
key_files:
  created: []
  modified:
    - frontend/lib/recipes.ts
    - frontend/components/RecipeDraftCard.tsx
    - frontend/components/UrlCaptureTab.tsx
    - frontend/lib/recipe-completeness.ts
    - frontend/tests/e2e/capture-full.spec.ts
    - frontend/tests/e2e/capture-quick.spec.ts
    - frontend/tests/e2e/capture-url.spec.ts
    - frontend/tests/e2e/capture-voice-failed-recovery.spec.ts
decisions:
  - "initial_turn_kind: TurnKind | null on Recipe type (not source_capture) — matches backend RecipeResponse.initial_turn_kind Optional[str]"
  - "captureType !== 'text' in isProcessing (was 'manual') — D-01 maps legacy manual captures to text kind"
  - "E2e specs use minimum-diff approach: remove source_capture from POST bodies, assert initial_turn_kind literal on response"
  - "recipe-completeness.test.ts:230 negative assertion left unchanged — isFieldKey('source_capture')=false is still correct"
metrics:
  duration_minutes: 20
  completed_date: "2026-05-13"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 8
---

# Phase 25 Plan 03: Frontend source_capture Cutover Summary

**One-liner:** Frontend Recipe type swaps source_capture for initial_turn_kind (TurnKind | null), RecipeDraftCard reads initial_turn_kind with manual→text rename in isProcessing check, and all 4 e2e capture specs assert initial_turn_kind on API responses — closing the Phase 25 frontend/backend lockstep cutover (THREAD-02).

## What Was Built

### Task 1: Recipe type + RecipeDraftCard rewrite

**`frontend/lib/recipes.ts`:**

- Removed: `source_capture: { type: string; payload?: unknown };` (line 25)
- Added: `import type { TurnKind } from "@/lib/enums";`
- Added: `initial_turn_kind: TurnKind | null;` with JSDoc explaining Phase 25 synthesis from recipe_turns

The field type `TurnKind | null` mirrors the backend's `Optional[str]` — `null` is the wire value when no initial user turn exists (should not occur post-migration D-01..D-04).

**`frontend/components/RecipeDraftCard.tsx`:**

- Updated file-level comment: references `recipe.initial_turn_kind` instead of `recipe.source_capture.type`
- Line 65: `const captureType = recipe.initial_turn_kind;` (was `recipe.source_capture?.type`)
- isProcessing check: `captureType !== "text"` (was `"manual"`) — D-01 maps all legacy manual captures to the `text` TurnKind; Plan 02 Task 2 writes `kind="text"` for both quick and full-form POSTs going forward

Variant mapping after rewrite:

| initial_turn_kind | UI variant |
|-------------------|------------|
| `"text"` | Manual-captured — Brouillon badge, tappable to edit |
| `"voice"` | Processing — spinner, non-tappable |
| `"photo"` | Processing — spinner, non-tappable |
| `"url"` | URL-pending — Brouillon badge, tappable (CAPTURE-03 deferral) |
| `null` | Processing (defensive fallback) |

### Task 2: E2e spec updates + comment cleanup

**E2e spec strategy — minimum-diff approach:**

1. `capture-full.spec.ts`: Removed `source_capture: { type: 'manual', payload: { title } }` from POST body (backend no longer accepts/uses this field); added `expect(created.initial_turn_kind).toBe('text')` assertion after status check.

2. `capture-quick.spec.ts`: Removed `source_capture: { type: 'manual', payload: { title } }` from POST body; added `expect(created.initial_turn_kind).toBe('text')` assertion.

3. `capture-url.spec.ts`: Replaced `expect(draft.source_capture).toMatchObject({ type: 'url', payload: { url: '...' } })` with `expect(draft.initial_turn_kind).toBe('url')`; updated spec comment to reference Phase 25 cutover.

4. `capture-voice-failed-recovery.spec.ts`: Updated comment at line 99 — "transcript reused from source_capture" → "transcript reused from the recipe_turns initial user turn". No behavior change.

**Comment cleanup:**

- `UrlCaptureTab.tsx`: Rewrote "URL stored in source_capture" → "URL captured as the recipe's first user turn (kind='url', payload `{url}`)"
- `recipe-completeness.ts`: Rewrote "source_capture excluded from scoring" → "thread metadata (initial_turn_kind, recipe_turns) excluded from scoring"

**Intentionally unchanged:**

- `frontend/lib/recipe-completeness.test.ts:230` — `assert.ok(!isFieldKey("source_capture"))` negative assertion remains valid: `source_capture` is not a recipe field key and the test correctly returns `false`. Per RESEARCH §Frontend Cutover Map row 6.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 — Recipe type + RecipeDraftCard | `1e0f52f` | feat(25-03): replace source_capture with initial_turn_kind in Recipe type + RecipeDraftCard |
| 2 — E2e specs + comment cleanup | `61ca51d` | feat(25-03): update e2e specs + comment cleanup — complete frontend source_capture cutover |

## Final Frontend Grep Gate

```
$ grep -rn "source_capture" frontend/ --include="*.ts" --include="*.tsx" | grep -v "recipe-completeness.test.ts"
(no output — 0 matches)

$ grep -n "source_capture" frontend/lib/recipe-completeness.test.ts
230:  assert.ok(!isFieldKey("source_capture"));
```

Single allowed reference at `recipe-completeness.test.ts:230` — intact and unchanged.

## TypeScript Compile

```
$ cd frontend && npx tsc --noEmit
TypeScript compilation completed (exit 0)
```

## ESLint Note

`npx eslint . --max-warnings 0` cannot run directly in the worktree (no `node_modules/` in the worktree — symlinked from main repo for verification). When run with symlinked node_modules, pre-existing errors appear in `capture-url.spec.ts` (`playwright/no-skipped-test` rule for the pre-existing `test.fixme` call at line 24) and `shortlist-vote.spec.ts` (out of scope). These errors pre-exist in the base commit (eb176bf) and are not caused by Plan 03 changes. The 7 files changed in this plan lint clean in isolation (0 errors, 0 warnings).

## Phase 25 Closure Note

All five ROADMAP success criteria are met across the three plans:

1. **Migration runs cleanly** — Plan 01 (migration 0009): recipe_turns created, source_capture dropped, 28 backfilled turns, failed rows deleted.
2. **Backend grep zero** — Plan 02: `grep -rn "source_capture" backend/app/ backend/tests/` returns 0 matches.
3. **5 capture surfaces still work** — Plan 02: all five POST handlers write recipe_turns + schedule promote_draft; 20 backend tests pass.
4. **Seed idempotent** — Plan 02 Task 3: `uv run seed` inserts RecipeTurn rows via ON CONFLICT DO UPDATE.
5. **Downgrade+upgrade reversibility** — Plan 01: `alembic downgrade -1` + `alembic upgrade head` both exit 0 on prod-shape data; downgrade is best-effort (failed-row deletions irrecoverable, documented).

THREAD-02 requirement satisfied: frontend and backend cut over in the same Phase 25 wave — Recipe type, RecipeDraftCard, and e2e specs all reference initial_turn_kind; no source_capture references remain in either app (except the intentional negative-assertion test).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

The only noteworthy runtime discovery was the ESLint infrastructure limitation in the git worktree environment (no node_modules in worktree). This was resolved by symlinking from the main repo, and the pre-existing ESLint errors in `capture-url.spec.ts` and `shortlist-vote.spec.ts` were confirmed pre-existing against the base commit. No code fixes were required.

## Known Stubs

None — all frontend consumers of the initial_turn_kind field are wired. The `test.fixme` in `capture-url.spec.ts` is intentional (URL promotion deferred to Phase 26 TURN-04) and pre-dates this plan.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. This plan is purely frontend type and UI logic — reads `initial_turn_kind` from the existing API response shape that Plan 02 established.

## Self-Check

Files modified exist:
- `frontend/lib/recipes.ts` — FOUND, contains `initial_turn_kind: TurnKind | null`
- `frontend/components/RecipeDraftCard.tsx` — FOUND, contains `recipe.initial_turn_kind`
- `frontend/components/UrlCaptureTab.tsx` — FOUND, comment updated
- `frontend/lib/recipe-completeness.ts` — FOUND, comment updated
- `frontend/tests/e2e/capture-full.spec.ts` — FOUND, contains `initial_turn_kind`
- `frontend/tests/e2e/capture-quick.spec.ts` — FOUND, contains `initial_turn_kind`
- `frontend/tests/e2e/capture-url.spec.ts` — FOUND, contains `initial_turn_kind`
- `frontend/tests/e2e/capture-voice-failed-recovery.spec.ts` — FOUND, comment updated

## Self-Check: PASSED
