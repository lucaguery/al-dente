---
phase: 29-llm-prompt-rework-completeness-wire-up
plan: "06"
subsystem: frontend/components, frontend/app, frontend/tests
tags: [react, typescript, next-intl, playwright, summary-cta, deferred, optimistic-ui]
dependency_graph:
  requires: [29-01, 29-05]
  provides: [summary CTA onClick wiring, deferred collapse, handleSummaryComplete, handleSummaryLater]
  affects: [frontend/components/RecipeThread/SystemBubble.tsx, frontend/components/RecipeThread/index.tsx, frontend/components/RecipeThread/types.ts, frontend/app/recipes/[id]/page.tsx, frontend/lib/i18n/fr.json, frontend/tests/e2e/recipe-detail.spec.ts]
tech_stack:
  added: []
  patterns: [optimistic committing state (per-bubble), deferred boolean prop derived from server timestamp, useCallback POST handlers keyed off api() null return for 204]
key_files:
  created: []
  modified:
    - frontend/components/RecipeThread/SystemBubble.tsx
    - frontend/components/RecipeThread/index.tsx
    - frontend/components/RecipeThread/types.ts
    - frontend/app/recipes/[id]/page.tsx
    - frontend/lib/i18n/fr.json
    - frontend/tests/e2e/recipe-detail.spec.ts
decisions:
  - "deferred derived with optional chaining (recipe?.questions_deferred_until) to match plan acceptance criterion, even though recipe is narrowed non-null at that point"
  - "e2e specs use request fixture for API calls (POST /turns) rather than UI composer to avoid LLM non-determinism in test environment"
  - "deferred=true disables both CTAs via disabled + aria-disabled (not hidden) — preserves visual context while preventing interaction"
metrics:
  duration: "~6 minutes"
  completed: "2026-05-17"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 6
requirements: [LLM-03, LLM-04]
---

# Phase 29 Plan 06: Frontend Summary CTA Wire-up Summary

Wave 3 slice 2 of 2: wires the `onClick` handlers on the SystemBubble summary branch CTAs (« Oui, compléter » and « Plus tard ») to POST `/questions/trigger` and `/questions/defer`, threads the `deferred` boolean through the component tree to collapse CTAs when `recipe.questions_deferred_until` is a future timestamp, and adds Playwright e2e coverage for the trigger/toast and defer/collapse outcomes.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Extend types + orchestrator + SystemBubble + i18n | `b8caebf` | `types.ts`, `index.tsx`, `SystemBubble.tsx`, `fr.json` |
| 2 | Wire page.tsx handlers + deferred prop + RecipeThread mount | `3a80799` | `frontend/app/recipes/[id]/page.tsx` |
| 3 | Playwright e2e — summary CTA trigger + defer specs | `12d58f2` | `frontend/tests/e2e/recipe-detail.spec.ts` |

## Verification Results

### Success Criteria Gates

```
grep -c "summary_complete|summary_later" SystemBubble.tsx → 2 (wired onClick)
grep -c "questions/trigger|questions/defer" page.tsx → 6 (2 API calls + comments/error logs)
git diff main -- CompletenessCard.tsx recipe-completeness.ts | wc -l → 0 (LLM-04 PASS)
grep -c "VISUAL STUBS" SystemBubble.tsx → 0 (stub comment removed — wire-up landed)
node -e "JSON.parse(fr.json)" → exits 0 (valid JSON)
```

### Type Checks

- `grep -c 'onSummaryComplete: (turnId: string) => Promise<void>'` → 1 (detail-mode branch)
- `grep -c 'onSummaryLater: (turnId: string) => Promise<void>'` → 1 (detail-mode branch)
- `grep -c 'deferred: boolean'` → 1 (detail-mode branch)
- `grep -c 'deferred?: never|onSummaryComplete?: never|onSummaryLater?: never'` → 3 (capture-mode branch)
- `grep -c 'onSummaryComplete=|onSummaryLater=|deferred='` → 3 (index.tsx passes all to SystemBubble)
- `grep -c 'const handleComplete|const handleLater'` → 2
- `grep -c 'onSummaryComplete(turn.id)|onSummaryLater(turn.id)'` → 2
- `grep -c 'deferred === true'` → 4 (both buttons gated ≥2)
- `grep -c '"all_complete": "Tout est complet."'` → 1
- tsc: no errors mentioning onSummaryComplete/onSummaryLater/deferred/all_complete

### Playwright e2e

- `grep -c "Phase 29"` → 7 (≥1 PASS)
- `grep -c "Oui, compléter|Plus tard"` → 9 (≥3 PASS)
- `grep -c "Tout est complet"` → 3 (≥1 PASS)
- `grep -c "questions_deferred_until|defer gate"` → 6 (≥1 PASS)
- `grep -c "questionCountBefore|questionCountAfter"` → 3 (≥2 PASS)
- Existing Phase 28 specs: 0 deletions in diff (only additions)

## Must-Haves Status

| Truth | Status |
|-------|--------|
| SystemBubble summary CTAs wired with onClick handlers | PASS — handleComplete/handleLater invoke onSummaryComplete/onSummaryLater |
| deferred=true collapses CTAs into disabled state | PASS — disabled + aria-disabled + opacity-50 on both buttons |
| RecipeThreadProps detail mode carries 3 new required fields | PASS — deferred, onSummaryComplete, onSummaryLater |
| Capture-mode branch has ?: never markers | PASS — tight discriminator maintained |
| page.tsx handleSummaryComplete POSTs /questions/trigger | PASS — api() returns null on 204 → toast |
| page.tsx handleSummaryLater POSTs /questions/defer | PASS — fire-and-forget; WS recipe.updated updates deferred |
| deferred derived from recipe?.questions_deferred_until > now() | PASS — line 594 |
| fr.json carries recipes.thread.all_complete = "Tout est complet." | PASS — line 269 |
| CompletenessCard.tsx and recipe-completeness.ts NOT modified (LLM-04) | PASS — diff returns 0 |
| Playwright e2e covers trigger → question/toast and defer → collapse | PASS — 2 specs added |
| Phase 28 specs untouched | PASS — zero deletions |

## Deviations from Plan

None — plan executed exactly as written.

The one minor deviation: the `deferred` computation at line 594 uses `recipe?.questions_deferred_until` (optional chaining) even though `recipe` is narrowed to non-null at that call site by prior early returns. This matches the plan's acceptance criterion exactly.

## Known Stubs

None — all summary CTA onClick handlers are fully wired end-to-end. The backend endpoints (`/questions/trigger` and `/questions/defer`) are delivered by Plan 29-05 (parallel Wave 3 executor). The frontend wire-up is complete on this side.

## Threat Flags

No new network endpoints, auth paths, or file access patterns introduced. The two POST calls reuse the existing `api()` helper (HttpOnly cookie, same-origin via Next.js rewrite — invariant #8). No new threat surface beyond what Plan 29-05 already declared in T-29-17 through T-29-20.

## Self-Check: PASSED
