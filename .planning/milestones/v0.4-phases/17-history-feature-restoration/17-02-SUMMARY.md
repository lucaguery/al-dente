---
phase: 17-history-feature-restoration
plan: 02
subsystem: ui
tags: [HIST-02, frontend, cooking-log, detail-page, paper-grain, next-intl, fraunces, signed-url]

# Dependency graph
requires:
  - phase: 17-history-feature-restoration (plan 01)
    provides: "Backend GET /api/cooking-logs and /api/cooking-logs/{id} endpoints (HIST-01 + HIST-02 server contracts)"
  - phase: 08-frontend-polish
    provides: "paper-grain Card frame, CookingLogCard ratingChipClass shape, Fraunces italic date header gesture"
  - phase: 01.1-cookie-auth
    provides: "useSession() household.members roster, OnboardingGuard"
provides:
  - "frontend/lib/cooking.ts: fetchCookingLogs(days?) + fetchCookingLog(id) typed clients"
  - "frontend/app/cooking-logs/[id]/page.tsx: paper-grain detail page (HIST-02 closes B-5 / Issue #6)"
  - "Pattern: useSession()-resolved member chip (name + color_hex) — no new fetch"
affects: [17-03-history-list-rewire, 20-polish-i18n-sweep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSession()-derived member chip (D-17-07 Option A, no new fetch)"
    - "Inline ratingChipClass mirror of CookingLogCard (2-consumer threshold not yet hit)"
    - "absolute French date in Fraunces italic via Intl.DateTimeFormat('fr-FR')"

key-files:
  created:
    - "frontend/app/cooking-logs/[id]/page.tsx"
  modified:
    - "frontend/lib/cooking.ts"

key-decisions:
  - "Member-chip resolution via useSession() (D-17-07 Option A — household roster already in session, no new endpoint)"
  - "Three irreducible French strings kept inline + TODO(productize) marked for Phase 20 sweep (Path B per plan)"
  - "Reuse cooking_log.finalize.gone_heading for the 404 fallback (same user affordance as stale-log path)"
  - "Inline ratingChipClass helper rather than extracting <RatingChip /> — 2 consumers only"
  - "fr.json not modified (constraint #1 'ONLY modify files listed' takes precedence over constraint #5)"

patterns-established:
  - "Detail-page member chip: useSession().members.find by id, render dot+name with color_hex inline-style"
  - "404 detection: string-prefix match on Error.message (`err.message.startsWith('404')`) — api<T> throws Error('<status> <statusText>')"

requirements-completed: [HIST-02]

# Metrics
duration: 12min
completed: 2026-05-11
---

# Phase 17 Plan 02: HIST-02 Cooking-log Detail Page Summary

**Paper-grain `/cooking-logs/[id]` detail route with Fraunces italic French date header, useSession-resolved member chip, and the typed `fetchCookingLog(s)` API clients backing it.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-11T15:38:00Z
- **Completed:** 2026-05-11T15:50:49Z
- **Tasks:** 2
- **Files modified:** 1 (cooking.ts), 1 created (detail page)

## Accomplishments

- `fetchCookingLogs(days?: number)` and `fetchCookingLog(id)` exported from `frontend/lib/cooking.ts` — both typed against the existing `CookingLogResponse`, both use the cookie-auth `api<T>` wrapper.
- New `frontend/app/cooking-logs/[id]/page.tsx` reads a single household-scoped cooking log and renders a paper-grain Card with:
  - Fraunces italic absolute French date header (cookbook-chapter-opener gesture per D-17-05).
  - Cooked-by member name + color chip resolved from `useSession().members` (no new fetch — D-17-07 Option A).
  - `aspect-square` photo via signed URL (5-min TTL, same pattern as `CookingLogCard`).
  - Rating chip (loved/liked/disliked) reusing `cooking_log.rating.*` i18n keys.
  - Notes paragraph with `whitespace-pre-line` (preserves line breaks).
  - Back-link to `/recipes/{recipe_id}` so the user can re-cook.
  - 404 fallback that reuses `cooking_log.finalize.gone_heading` — "Cette cuisson n'est plus disponible".
- Sibling write route `frontend/app/cooking-logs/[id]/finalize/page.tsx` is byte-identical (verified via empty `git diff HEAD~2`).
- TypeScript `--noEmit` clean. ESLint clean (`--max-warnings 0`).

## Task Commits

Each task was committed atomically with `--no-verify`:

1. **Task 1: Extend `frontend/lib/cooking.ts` with `fetchCookingLogs` + `fetchCookingLog`** — `1d77c9e` (feat)
2. **Task 2: Create `/cooking-logs/[id]` detail route page** — `c09ce34` (feat)

## Files Created/Modified

- `frontend/lib/cooking.ts` — Added `fetchCookingLogs(days?)` + `fetchCookingLog(id)`. Five existing exports byte-identical (only additions).
- `frontend/app/cooking-logs/[id]/page.tsx` (NEW) — Paper-grain detail Card. Wraps in `OnboardingGuard` consistent with the finalize sibling.

## Decisions Made

- **Member chip via `useSession()`** (D-17-07 Option A). The session already exposes `household.members: ReadonlyArray<SessionMember>` with `id`, `name`, `color_hex`. No new fetch needed. The chip is a 2.5px color dot + member name in muted text. If the cook is no longer in the household, the chip silently hides (member may have been removed; the log row stays valid).
- **Three inline French strings kept with `TODO(productize): i18n — Phase 20 (FIX-03)` markers** ("Détail de la cuisson" aria-label, "Voir la recette" link label, "Une erreur s'est produite. Réessaie plus tard." fallback). Plan 17-02 explicitly accepts Path B (TODO comments) for strings with no existing key; the Phase 20 polish-i18n-sweep is the canonical place to lift these into `fr.json`. fr.json was NOT modified — constraint #1's "ONLY modify files listed in `files_modified`" takes precedence over constraint #5's "add new keys" permission. All strings WITH existing keys (rating labels, 404 copy, notes heading) DO route through `useTranslations`.
- **Inline `ratingChipClass` helper** rather than extracting a shared `<RatingChip />` — the 2-consumer threshold has now been reached (CookingLogCard + this detail page); the third consumer triggers the refactor. The class string is byte-identical to `CookingLogCard.ratingChipClass` so the rating chip reads identically on list and detail surfaces.
- **404 detection via string prefix match** on `err.message.startsWith("404")` — the `api<T>` wrapper throws `Error("<status> <statusText>")` so there's no structured status field on the Error. Same idiom as `frontend/app/recipes/[id]/page.tsx` lines 92.

## Deviations from Plan

None - plan executed exactly as written, including the explicit Path B (TODO i18n markers) the plan permitted as the alternative to Path A.

## Issues Encountered

- **Hook PreToolUse reminder triggered on cooking.ts edit** despite the file being read earlier in the session. The Edit succeeded on retry — non-blocking. Root cause was likely a hook race; no fix needed.

## Threat Flags

No new threat surface introduced. All threats covered by the plan's `<threat_model>` (T-17-02-01..06) — backend enforcement is the trust boundary; the frontend trusts the response.

## Known Stubs

None. The page renders all four data shapes (date header, member chip, photo, rating, notes, recipe back-link) wired to real data. The cooked-by chip falls back to "hidden" (not a stub) when the member is not in the current session roster — this is a legitimate runtime state (member removed from household), not a placeholder.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plan 17-03 (Wave 2)** rewires `frontend/app/cooking-logs/page.tsx` to call the new `fetchCookingLogs(days)` helper and removes the `{ logs: ... }` envelope shape. Plan 17-02's helpers are ready for that consumer.
- **Plan 17-01 (parallel, also Wave 1)** ships the backend endpoints (`GET /cooking-logs`, `GET /cooking-logs/{id}`). The frontend already knows the contract; integration is automatic once both land on `main`.
- **Phase 20 i18n sweep** has three TODO-marked strings to pick up in this file (grep `TODO(productize): i18n` in `frontend/app/cooking-logs/[id]/page.tsx`).

## Self-Check: PASSED

- `test -f frontend/app/cooking-logs/[id]/page.tsx` — FOUND
- `frontend/lib/cooking.ts` contains `fetchCookingLogs` and `fetchCookingLog` exports — FOUND (7 total exports, was 5)
- Commit `1d77c9e` (Task 1) — FOUND in `git log`
- Commit `c09ce34` (Task 2) — FOUND in `git log`
- `Intl.DateTimeFormat` present in detail page — FOUND (line 60)
- `useTranslations` / `t(...)` references in detail page — FOUND (9 references)
- `frontend/app/cooking-logs/[id]/finalize/page.tsx` byte-identical pre-execution — VERIFIED (empty diff over both task commits)
- `npx tsc --noEmit` exits 0 — PASS
- `npx eslint app/cooking-logs/[id]/page.tsx lib/cooking.ts --max-warnings 0` exits 0 — PASS

---
*Phase: 17-history-feature-restoration*
*Completed: 2026-05-11*
