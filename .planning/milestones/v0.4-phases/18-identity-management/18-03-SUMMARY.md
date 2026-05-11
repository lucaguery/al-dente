---
phase: 18-identity-management
plan: 18-03
subsystem: frontend/onboarding
tags: [IDM-04, frontend, onboarding, capacity, terminal-card, i18n, next-intl]
requires:
  - phase: 18-01
    provides: "POST /api/households/join returns 422 with detail.code === HOUSEHOLD_FULL when the 5-member palette is exhausted"
  - phase: 18-02
    provides: "serialized fr.json edits (settings.member.* + settings.invite_code_copy_cta) — 18-03 extends the same physical file with onboarding.join.capacity.*"
provides:
  - "@frontend/app/onboarding/join/page.tsx::householdFull terminal-Card branch on 422 HOUSEHOLD_FULL"
  - "@frontend/lib/i18n/fr.json::onboarding.join.capacity.{title,body,back_cta}"
affects:
  - frontend/tests/e2e/onboarding-household-full.spec.ts  # Plan 18-04 will exercise this branch
tech-stack:
  added: []
  patterns:
    - "raw-fetch-with-credentials for structured-error discrimination (api() wrapper drops the response body — bypass it surgically when you need the body)"
    - "terminal-state Card render branch on a form page (early-return before the main return) — replaces silently-disabled-button UX"
key-files:
  created: []
  modified:
    - frontend/app/onboarding/join/page.tsx
    - frontend/lib/i18n/fr.json
key-decisions:
  - "D-18-12..14 applied verbatim — terminal Card, single neutral back CTA, i18n keys under onboarding.join.capacity.*"
  - "Bypass lib/api.ts in onSubmit() instead of widening api() — the 422-with-structured-body shape is unique to this endpoint; cross-cutting api.ts churn would touch every caller for a single-call need"
  - "Removed now-unused JoinResponse type (success path no longer reads the body — the cookie does the work)"
patterns-established:
  - "Structured-error discriminator pattern: when a single endpoint has two distinct 422 modes (legacy Pydantic vs structured business error), branch on detail.code in the catch block, not the status code"
  - "Terminal-state branch: an early `if (terminal) return (<TerminalCard/>)` BEFORE the main form return — same paper-grain shell so the surface feels like a state of the same screen, not a new route"
requirements-completed: [IDM-04]
duration: ~10min
completed: 2026-05-11
---

# Phase 18 Plan 03: 422 HOUSEHOLD_FULL terminal Card on join page — Summary

**Onboarding join surface now renders a Fraunces-italic paper-grain "Foyer complet" Card with a single back CTA when the backend returns 422 with `detail.code === "HOUSEHOLD_FULL"` — replacing the silently-disabled submit button (ASSESSMENT B-6 / Issue #7).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-11
- **Completed:** 2026-05-11
- **Tasks:** 2 (i18n keys + page branch)
- **Files modified:** 2

## Accomplishments

- IDM-04 closed: the structured 422 capacity error (from Plan 18-01) now has a terminal UI branch — users hitting a full household see "Foyer complet" + a way back, not a silently-disabled button.
- `lib/i18n/fr.json` gains `onboarding.join.capacity.{title, body, back_cta}` with the locked French copy from D-18-12.
- `onSubmit` now uses raw `fetch` so it can read `body.detail.code` — the existing `api()` wrapper drops the response body, so the discriminator path required a surgical bypass. Same-origin via the Next.js rewrites (CLAUDE.md invariant #8), `credentials: "include"` to send the `aldente_auth` cookie.
- 404 / 409 / plain-422 (legacy Pydantic palette validation) keep their existing inline-error UX — only the `HOUSEHOLD_FULL` discriminator triggers the terminal Card.
- No hardcoded French strings (invariant #6) — all three new strings flow through `next-intl`.

## Task Commits

Each task was committed atomically with `--no-verify` (worktree parallel-executor convention):

1. **Task 1: i18n — onboarding.join.capacity.{title, body, back_cta}** — `c3fa342` (feat)
2. **Task 2: Join page — 422 HOUSEHOLD_FULL discriminator → terminal Card** — `4ad002d` (feat)

The plan-metadata commit (this SUMMARY + STATE/ROADMAP) is owned by the orchestrator per the worktree contract — this executor does NOT update STATE/ROADMAP.

## Files Created/Modified

- `frontend/lib/i18n/fr.json` — Added `onboarding.join.capacity.{title, body, back_cta}` block inside `onboarding.join` (after `submit`). Surgical insert; no other keys touched.
- `frontend/app/onboarding/join/page.tsx` —
  - New `householdFull` state.
  - Replaced `onSubmit` body: `api<JoinResponse>(...)` → raw `fetch()` with `credentials: "include"`, parse 422 body to discriminate `HOUSEHOLD_FULL` vs legacy Pydantic palette validation.
  - New terminal Card render branch (early-return) before the form's `return (`. Same paper-grain shell as the form below.
  - Removed unused `JoinResponse` type (success path no longer reads the body — cookie does the work via `refresh()`).
  - `statusOf()` helper kept (still used by `fetchPreview`'s catch).

## Decisions Made

- **Bypass `lib/api.ts` for `onSubmit`, don't widen it.** `api()` throws `Error("<status> <statusText>")` and drops the body — a long-standing limitation. The 422-with-structured-body shape is unique to this endpoint (IDM-03), so widening `api()` to expose bodies would touch every caller for a single-call need. Plan 18-03 took the surgical path: raw `fetch` inside `onSubmit`, manual `res.json()` inside the non-ok branch.
- **Single back CTA, no second action.** D-18-12 specifies "single neutral button to navigate back" — no "try a different code" affordance. A returning user has to navigate back to /onboarding/welcome and pick a path themselves; the terminal-state design is deliberate (the household IS full, no client-side action can fix it).
- **`router.back()` on the CTA, not `router.replace("/onboarding/welcome")`.** Matches the header back-button affordance one line up — consistent navigation. If the history stack is empty (deep link), `router.back()` is a no-op; that's an acceptable degeneracy at couple-scale (the affordance is the back-arrow header, which behaves identically).

## Deviations from Plan

None - plan executed exactly as written.

The plan's `<action>` block specified the exact `onSubmit` body, state name, JSX shape, and i18n key namespaces verbatim. The only minor implementation choice was removing the now-unused `JoinResponse` type (would have triggered an `@typescript-eslint/no-unused-vars` warning otherwise). That cleanup is hygiene, not a deviation — the type was dead code once the success path stopped reading the response body.

## Issues Encountered

None.

## Known Stubs

None. The `householdFull` branch is fully wired — backend (Plan 18-01) emits the 422, frontend reads `detail.code`, terminal Card renders. The Plan 18-04 Playwright spec will exercise the end-to-end path.

## Self-Check

- `frontend/lib/i18n/fr.json` contains `"Foyer complet"` — FOUND (line 320)
- `frontend/lib/i18n/fr.json` contains `onboarding.join.capacity.{title,body,back_cta}` — FOUND (3/3 keys via `node -e` script per plan acceptance)
- `frontend/app/onboarding/join/page.tsx` contains `HOUSEHOLD_FULL` — FOUND (4 occurrences: 1 load-bearing discriminator at line 161 + 3 comment references; success criterion was ≥ 1)
- `frontend/app/onboarding/join/page.tsx` contains `setHouseholdFull(true)` — FOUND (line 164)
- `frontend/app/onboarding/join/page.tsx` contains `t("capacity.title" | "capacity.body" | "capacity.back_cta")` — FOUND (3/3)
- `frontend/app/onboarding/join/page.tsx` contains the raw `fetch(\`${API_BASE}/api/households/join\`, ...)` call — FOUND (line 132)
- `frontend/app/onboarding/join/page.tsx` contains NO hardcoded `"Foyer complet"` — VERIFIED (0 matches, invariant #6 holds)
- `cd frontend && npx tsc --noEmit -p tsconfig.json` — EXIT 0
- `cd frontend && npx eslint app/onboarding/join/page.tsx` — EXIT 0 (0 errors, 0 warnings)
- `cd frontend && node -e "JSON.parse(require('fs').readFileSync('./lib/i18n/fr.json','utf8'))"` — JSON valid
- Commit `c3fa342` (Task 1) — FOUND
- Commit `4ad002d` (Task 2) — FOUND
- All 6 success criteria from the executor prompt — PASS

## Self-Check: PASSED

## Next Phase Readiness

- Plan 18-04 (Playwright e2e — `onboarding-household-full.spec.ts`) is unblocked. The discriminator is wired end-to-end (backend 422 → frontend terminal Card); the spec needs only to seed 5 members and assert the Card renders.
- No blockers. The capacity Card is the LAST UI surface needed for IDM-04 — the next wave is testing, not implementation.

---
*Phase: 18-identity-management*
*Plan: 03*
*Completed: 2026-05-11*
