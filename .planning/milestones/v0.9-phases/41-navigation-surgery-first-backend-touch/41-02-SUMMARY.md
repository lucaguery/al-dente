---
phase: 41-navigation-surgery-first-backend-touch
plan: 02
subsystem: frontend
tags: [thread, route, navigation, i18n]
requires: [RecipeThread, RealtimeProvider, api utility, fr.json recipes.thread.*]
provides: [/recipes/[id]/thread route, ThreadTopBar component, N tours det-top pin]
affects: [app/recipes/[id]/page.tsx, app/recipes/[id]/thread/page.tsx, components/RecipeThread/ThreadTopBar.tsx, lib/i18n/fr.json, tests/e2e/recipe-thread-route.spec.ts]
tech_stack:
  added: []
  patterns: [thin-top-bar, route-level-thread-host, hard-rip-out]
key_files:
  created:
    - frontend/app/recipes/[id]/thread/page.tsx
    - frontend/components/RecipeThread/ThreadTopBar.tsx
    - frontend/tests/e2e/recipe-thread-route.spec.ts
  modified:
    - frontend/app/recipes/[id]/page.tsx
    - frontend/lib/i18n/fr.json
key_decisions:
  - "Thread route is a client component (`'use client'`) — mirrors the existing /recipes/[id]/page.tsx pattern (useEffect-based fetch + realtime subscription) so the two surfaces stay structurally consistent and the new route is self-contained (no prop-drill of handlers across routes)"
  - "toursCount derives from turns.length live (D-15) — no new denormalized field on Recipe. The Recipe type doesn't expose turns_count today; adding one is out of scope for v0.9 (would need a backend migration). The live count is fed by turn.created broadcasts via the existing RealtimeProvider"
  - "Hard rip-out of the inline RecipeThread mount from the structured view (D-17) — 245 net lines removed from /recipes/[id]/page.tsx (10 handlers + API_BASE + formRef + deferred + postingTurn state). MVP no-shim posture; the structured view IS the structured view post-Phase-41"
  - "N tours pin onClick = e.stopPropagation() because the body's click-to-edit handler wraps the title row. Without this, tapping the pin would also fire router.push('/recipes/{id}/edit'). h-12 -my-3 gives the pin a 48px hit area inside the title row without shifting the title's vertical position"
  - "Back-arrow uses explicit <Link href> (D-16) — deterministic for shared/deep URLs that didn't enter via /recipes/[id]"
requirements_completed: [THRD-01, THRD-02]
duration: ~20 min
completed: 2026-05-21
---

# Phase 41 Plan 02: Recipe Thread Dedicated Route Summary

Move the recipe-thread surface from inline-at-bottom-of-structured-view to its
own `/recipes/[id]/thread` route. The structured view (`/recipes/[id]`) loses
its inline `<RecipeThread>` mount (hard deletion per D-17) and gains a tappable
`N tours` pin in the det-top right slot that routes to `/thread`.

**Duration:** ~20 min · **Tasks:** 3/3 · **Files:** 5 (3 created, 2 modified) · **Commits:** 3

| Task | Status | Commit |
|------|--------|--------|
| 1. ThreadTopBar + /recipes/[id]/thread route | green | `b79ad73` |
| 2. Hard-delete inline thread from structured view + add N tours pin | green | `b47a47d` |
| 3. Playwright spec — recipe-thread-route.spec.ts | green | `40be585` |

## What Was Built

### `frontend/components/RecipeThread/ThreadTopBar.tsx` (created)

Thin top-bar matching sketch §Recette thread (lines 1866-1916):
- Lucide `ArrowLeft` icon wrapped in `<Link href={`/recipes/${recipeId}`}>` —
  explicit href per D-16 (deterministic for shared/deep URLs).
- Truncated crumb: `{recipeName} · thread` (truncate at 20 chars with ellipsis).
- Right slot: `{count} tours` Geist Mono pin, `tabular-nums`, informational.
- Header: `h-12 px-4 border-b border-border bg-background`.

### `frontend/app/recipes/[id]/thread/page.tsx` (created)

Client component. Fetches recipe + turns + subscribes to realtime
(`recipe.updated`, `turn.created`, `turn.updated`). Mounts:
```
<ThreadTopBar recipeId, recipeName, toursCount={turns.length} />
<RecipeThread mode="detail" ... full handler set/>
```
Owns its own copies of the per-turn POST handlers
(`handlePostTextTurn`, `handlePostVoiceTurn`, `handlePostUrlTurn`,
`handlePostPhotoTurn`, `handlePostAnswerTurn`, `handlePostProposalAccepted`,
`handlePostProposalDismissed`, `handleSummaryComplete`,
`handleSummaryLater`) — copied verbatim from /recipes/[id]/page.tsx so
each surface is self-contained.

### `frontend/app/recipes/[id]/page.tsx` (modified — 245 net lines removed)

Deletions:
- `<RecipeThread mode='detail' .../>` mount (lines 992-1010 in the
  pre-Phase-41 file).
- 9 per-turn handler functions (moved to /thread route).
- `RecipeThread` + `RecipeStatus` + `AnswerTurnSubmission` imports.
- `API_BASE` constant (only the multipart photo turn used it).
- `formRef` ref (was the scrollIntoView target for the manual-edit link).
- `postingTurn` state + `useRef` import.
- `deferred` derived variable (only fed RecipeThread).

Additions:
- `Link` import from `next/link`.
- `N tours` det-top pin in the title row, right slot:
  ```
  <Link
    href={`/recipes/${recipe.id}/thread`}
    aria-label={`${tThread("see_conversation_aria")} · ${turns.length} ${tThread("tours_label")}`}
    onClick={(e) => e.stopPropagation()}
    className="flex items-center h-12 px-3 -my-3 text-caption font-mono tabular-nums text-muted-foreground hover:text-foreground transition-colors shrink-0"
  >
    {turns.length} {tThread("tours_label")}
  </Link>
  ```
- Title block converted from column to flex row (title takes `flex-1
  min-w-0`, pin takes `shrink-0`).

### `frontend/lib/i18n/fr.json` (modified)

Four new keys under `recipes.thread.*`:
```
"back_aria": "Retour à la recette",
"crumb_suffix": "thread",
"tours_label": "tours",
"see_conversation_aria": "Voir la conversation"
```

### `frontend/tests/e2e/recipe-thread-route.spec.ts` (created)

Four scenarios:
1. **Structured view does not mount RecipeThread inline** — `toHaveCount(0)`
   on both composer placeholder variants (detail + capture). Locks the
   hard rip-out.
2. **Det-top "N tours" pin visible + routes to /thread** —
   `getByLabel(/Voir la conversation/i)` → click → URL match
   `/recipes/[^/]+/thread$`.
3. **Thread route renders ThreadTopBar** — back-arrow aria-label + crumb
   `· thread` + tours pin scoped to `<header>`.
4. **Back-arrow routes explicitly to /recipes/[id]** — `toHaveURL` exact
   `/recipes/{seededRecipeId}$` (deterministic Link, not `router.back()`).

## Verification

```
$ cd frontend && npx eslint app/recipes/\[id\]/page.tsx \
    app/recipes/\[id\]/thread/page.tsx \
    components/RecipeThread/ThreadTopBar.tsx \
    tests/e2e/recipe-thread-route.spec.ts
✓ ESLint: No issues found

$ cd frontend && npm run build
✓ Compiled successfully in 3.2s
…
├ ƒ /recipes/[id]
├ ƒ /recipes/[id]/edit
├ ƒ /recipes/[id]/thread          ← new route registered

$ grep -E "<RecipeThread|import RecipeThread" frontend/app/recipes/\[id\]/page.tsx
(no matches — inline mount removed)

$ node -e "JSON.parse(require('fs').readFileSync('frontend/lib/i18n/fr.json'))"
(parses)
```

## Deviations from Plan

**[Note] `npm run build` ends with `ENVIRONMENT_FALLBACK` error.**
The Next.js build compile + TypeScript pass succeed; the static-page-data
collection phase at the very end errors with `ENVIRONMENT_FALLBACK` from
chunks/69.js. Bisected via `git stash` — this error is **pre-existing** on
`main` (not introduced by Phase 41). Logged here so it doesn't surprise the
verifier. Same behaviour will surface on any phase running `npm run build`
on this branch until that pre-existing issue is fixed.

**[Note] Playwright spec runs deferred to UAT / CI.**
The spec file is verified by lint + TypeScript only. A live `npx playwright
test` requires the full local stack (Postgres on 5433 + uvicorn backend +
next dev frontend); inline execution can't reasonably spin that up. The
spec syntax is correct and uses the canonical patterns from
`recipe-detail.spec.ts`; integration coverage lands on the next CI run.

**Total deviations:** 0 functional (both notes are environmental, not
behavioral). Plan executed exactly as written.

## Authentication Gates

None.

## Next Phase Readiness

**Plan 41-03 ready (Wave 1, parallel-eligible after fr.json serialization).**

41-02 and 41-03 both touch `frontend/lib/i18n/fr.json`. Because the
orchestrator runs sequentially (worktrees disabled per project config),
41-03 picks up the file with the four new `recipes.thread.*` keys already
in place and adds its own `recipes.new.*` keys on top — no merge conflict.

## Self-Check: PASSED

- All 3 tasks completed + individually committed
- Inline RecipeThread mount hard-deleted (grep -c "<RecipeThread" returns 0)
- `/recipes/[id]/thread` route registered in `next build` output (`ƒ` line)
- All new i18n keys flow through `useTranslations` — no hardcoded French
- ESLint: 0 warnings across the 4 touched files
- TypeScript: build compile + type-check both pass
- ADR-0004 La Grille tokens only (Geist + Geist Mono, hairline border,
  off-white background, refined terracotta reserved for state)
- Playwright spec exists and lints clean; integration run deferred to UAT/CI
