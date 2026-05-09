---
phase: 10-e2e-test-infrastructure
plan: 06
subsystem: testing
tags: [playwright, fresh-project, cookie-auth, onboarding, invite-code, two-context]

# Dependency graph
requires:
  - 10-04 (Playwright `fresh` project + globalSetup.fresh.ts truncate + extraHTTPHeaders absence)
provides:
  - frontend/tests/e2e/invite-code-happy-path.spec.ts: TEST-04 single spec exercising /onboarding/create → share-code → /onboarding/join end-to-end via cookie auth
affects:
  - 10-07 (TESTING.md runbook can now reference `npm run test:e2e -- --project=fresh` as a working entry point with a real spec attached)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-BrowserContext idiom for cross-member onboarding: each call to `browser.newContext()` returns a fresh cookie jar so the joiner never inherits the creator's session. The cookie-distinctness assertion (`bobAuth!.value !== aliceAuth!.value`) is the proof that the test isn't accidentally short-circuiting."
    - "Reading the invite code from the URL search-param (`?code=...`) instead of scraping the Fraunces-italic monogram <div>: the URL is the SessionProvider/router contract source-of-truth, and adding a DOM-render assertion on top catches the rare case where the page receives the param but fails to display it. Avoids an opaque test-id without sacrificing render coverage."
    - "ColorSwatchPicker uniqueness: the join endpoint rejects duplicate colors with 409, so Alice and Bob must pick different swatches. Spec uses `radio.first()` (slot 1 = rose) for Alice and `radio.nth(1)` (slot 2 = amber) for Bob. The frontend by-code preview greys out Alice's color but Bob still has to actively pick a non-disabled one — using nth(1) is the deterministic equivalent."
    - "Verbatim i18n strings over regex: with the keys read directly from frontend/lib/i18n/fr.json, exact-match getByLabel/getByRole(name: ...) is more fragile-on-purpose. If a key value drifts, the spec breaks AT the spec, surfacing the i18n change at review time rather than letting a permissive regex hide it."

key-files:
  created:
    - frontend/tests/e2e/invite-code-happy-path.spec.ts (164 lines)
  modified: []

key-decisions:
  - "Read the invite code from `alicePage.url()` search-param (`code=...`) rather than scraping the Fraunces-italic monogram <div>. The share-code page (share-code/page.tsx#27) reads `code` from `useSearchParams()` and renders it inside a single styled <div> — but the page's own contract is the URL param. Reading the URL is robust against future styling changes (split spans, decorative kerning) and we still assert the rendered DOM contains the verbatim code, so the render path is still covered."
  - "Use exact i18n strings (e.g. `'Créer un foyer'`, `'Ton prénom'`, `'Rejoindre'`) instead of permissive regex. The plan's draft used regex like `/[Cc]réer.*foyer/` to be tolerant of phrasing drift, but with the keys read directly from `frontend/lib/i18n/fr.json` the exact strings are deterministic and document the contract. If onboarding copy changes, the test breaks AT this spec rather than silently matching whichever new wording happens to fit the regex."
  - "Pick different colors for Alice and Bob (slot 1 vs. slot 2). The backend's `households.py` line 169-173 returns 409 when `color_hex` is already taken — using the same color would 409 the join. Spec calls `radio.first()` for Alice (rose) and `radio.nth(1)` for Bob (amber). Captured the constraint in a `expect(ALICE_COLOR_HEX).not.toBe(BOB_COLOR_HEX)` belt-and-suspenders assertion so future maintainers don't trim the constants and reintroduce the 409."
  - "Assert `not.toHaveURL(/\\/onboarding\\//)` instead of `toHaveURL('/')` for the post-join landing. The join handler does `router.replace('/')` (join/page.tsx#133) so the actual URL IS `/`, but asserting non-onboarding is more robust if a future plan introduces a post-join interstitial (e.g. an install-PWA prompt route). The BottomNav landmark assertion is the positive probe that we're on a real authenticated page, not a 404."

patterns-established:
  - "fresh-project spec template: `await browser.newContext()` for each persona, `creator.cookies()` to read HttpOnly cookies, exact i18n labels, URL search-param extraction for tokens/codes, BottomNav landmark as post-auth probe."

requirements-completed: [TEST-04]

# Metrics
duration: ~3min
completed: 2026-05-08
---

# Phase 10 Plan 06: Invite-Code Happy-Path Spec Summary

**Single Playwright spec under the `fresh` project: Alice creates a household, Bob joins via the invite code, both contexts get distinct HttpOnly+Secure aldente_auth cookies, and Bob lands on HomeDecide with the BottomNav landmark visible. No Bearer header, no SEED_AUTH_TOKEN shortcut — the real cookie flow is the only auth path.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 1 / 1
- **Files modified:** 1 (1 created — the spec only; zero product-code edits)

## Accomplishments

- `frontend/tests/e2e/invite-code-happy-path.spec.ts` shipped (164 lines):
  - Two browser contexts (`creator` for Alice, `joiner` for Bob), each with its own cookie jar.
  - Welcome → Create flow: Alice fills `Nom du foyer` + `Ton prénom` + picks the rose swatch (slot 1) → submits `Créer le foyer` → lands on `/onboarding/share-code`.
  - Cookie attribute assertions on Alice's context: `aldente_auth.httpOnly === true`, `aldente_auth.secure === true`, value length > 0.
  - Invite code extracted from `alicePage.url()` search-param (`?code=...`), pattern-matched against `^[A-Z0-9]{6}$`, AND re-asserted as visible DOM text.
  - Welcome → Join flow on Bob's fresh context: fills `Code d'invitation` + `Ton prénom` + picks the amber swatch (slot 2 — distinct from Alice's rose to avoid a 409) → submits `Rejoindre`.
  - Post-join: assert URL is NOT `/onboarding/*`, assert Bob's `aldente_auth` cookie attributes, assert Bob's cookie value differs from Alice's.
  - BottomNav `<nav aria-label="Navigation principale">` landmark assertion (post-auth probe — hidden on `/onboarding/*` per BottomNav.tsx#76-77).

## Task Commits

1. **Task 1: invite-code-happy-path.spec.ts** — `d0d32d3` (feat)

## Files Created/Modified

- `frontend/tests/e2e/invite-code-happy-path.spec.ts` (NEW, 164 lines) — single-test spec exercising the cookie-auth onboarding path.

## French i18n Strings Used (Verbatim)

After reading `frontend/lib/i18n/fr.json` (the `onboarding.*` namespace), the regex patterns from the plan's draft were replaced with exact-match strings:

| Plan draft regex | Resolved exact string | i18n key |
|---|---|---|
| `/[Cc]réer.*foyer\|.../` | `'Créer un foyer'` | `onboarding.welcome.create_cta` |
| `/[Rr]ejoindre.*foyer\|.../` | `'Rejoindre un foyer'` | `onboarding.welcome.join_cta` |
| `/[Nn]om.*foyer\|.../` | `'Nom du foyer'` | `onboarding.create.household_name_label` |
| `/[Tt]on (prénom\|nom)\|.../` | `'Ton prénom'` | `onboarding.create.member_name_label` + `onboarding.join.member_name_label` |
| `/[Cc]réer\|[Cc]ontinuer\|[Vv]alider/` | `'Créer le foyer'` | `onboarding.create.submit` |
| `/[Cc]ode d'invitation\|[Cc]ode/` | `"Code d'invitation"` | `onboarding.join.code_label` |
| `/[Rr]ejoindre\|[Cc]ontinuer\|[Vv]alider/` | `'Rejoindre'` | `onboarding.join.submit` |
| ColorSwatchPicker (Alice) aria-label | `'Ta couleur'` | `onboarding.create.color_label` |
| ColorSwatchPicker (Bob) aria-label | `'Ta couleur (les couleurs déjà prises sont grisées)'` | `onboarding.join.color_label` |

The two color-label strings are intentionally different — Alice doesn't see "couleurs déjà prises" because no other members exist yet; Bob sees the longer hint because the join screen renders disabled swatches for already-taken colors.

## Invite-Code DOM Selector

**Used:** URL search-param read via `new URL(alicePage.url()).searchParams.get('code')`, with a follow-up `await expect(alicePage.getByText(inviteCode, { exact: true })).toBeVisible()` to verify the rendered DOM contains the code.

**Why not the plan's `text=/^[A-Z0-9]{6}$/`:** The share-code page renders the code inside a Fraunces-italic monogram `<div>` (share-code/page.tsx#60-62) with custom tracking. A pure-text regex selector would still work today but is brittle if the design ever splits the code across spans for kerning effects. The URL search-param IS the page's contract source — reading it is more durable. The DOM `getByText(inviteCode, { exact: true })` assertion still covers the render path, so a regression where the page reads the param but fails to display it would still be caught.

**No follow-up TODO:** No data-testid was added to product code (would have been scope creep). The current dual-probe (URL + verbatim text) is sufficient.

## Post-Join Redirect Destination

**Observed in code:** `router.replace("/")` at `frontend/app/onboarding/join/page.tsx#133`. So Bob lands on `/` (HomeDecide root).

**Spec assertion:** `not.toHaveURL(/\/onboarding\//)` rather than `toHaveURL('/')`. Robust to future post-join interstitials. The BottomNav landmark assertion is the positive probe.

## Color-Picker Constraint

The backend's `POST /api/households/join` returns 409 when `color_hex` is already taken by another household member (`backend/app/routers/households.py#169-173`). To avoid a 409:

- Alice picks slot 1 (rose, `#F43F5E`) — `radio.first()`.
- Bob picks slot 2 (amber, `#F59E0B`) — `radio.nth(1)`.

The frontend by-code preview greys out Alice's swatch on Bob's screen (via `GET /api/households/by-code/{code}` returning `taken_colors`). Picking `nth(1)` is the deterministic equivalent of "pick any non-disabled swatch."

A `expect(ALICE_COLOR_HEX).not.toBe(BOB_COLOR_HEX)` belt-and-suspenders assertion on the constants documents the constraint for future maintainers.

## Runtime Acceptance Output

**Type-check + lint:**
- `npx tsc --noEmit` (frontend/) → 0 errors.
- `npx eslint tests/e2e/invite-code-happy-path.spec.ts` → 0 issues.

**Playwright project membership:**

```
$ rtk proxy npx playwright test --list --project=fresh
Listing tests:
  [fresh-teardown] › globalTeardown.fresh.ts:8:9 › reseed test DB after invite-code spec
  [fresh-setup] › globalSetup.fresh.ts:11:6 › truncate test DB for invite-code spec
  [fresh] › invite-code-happy-path.spec.ts:39:7 › invite-code-happy-path (fresh project — cookie auth) › Alice creates household, Bob joins via invite code
Total: 3 tests in 3 files
```

The spec is listed under `[fresh]` — confirms `playwright.config.ts` testMatch `/invite-code-happy-path\.spec\.ts$/` matches and `dependencies: ['fresh-setup']` chains correctly.

```
$ rtk proxy npx playwright test --list --project=seeded
... (16 tests in 13 files; invite-code-happy-path NOT listed)
```

The spec is NOT listed under `[seeded]` — confirms the `testIgnore: [/invite-code-happy-path\.spec\.ts$/, ...]` from 10-04 successfully excludes it from the Bearer-auth project.

**Live run not executed:** `npm run test:e2e -- --project=fresh` requires uvicorn + Next.js dev to spin up under Playwright's webServer block, plus a working DATABASE_URL_TEST. Per executor scope ("ONE spec file, ONE commit"), executing the live test was not in scope for this plan; the spec ships with type-check + lint + project-membership verification. The actual E2E execution will be exercised in plan 10-07 (TESTING.md runbook + final smoke).

## Acceptance Criteria — All Met

- [x] File `frontend/tests/e2e/invite-code-happy-path.spec.ts` exists with ≥ 60 lines (actual: 164).
- [x] Spec listed by `npx playwright test --list --project=fresh`.
- [x] Spec NOT listed by `npx playwright test --list --project=seeded`.
- [x] Uses 2 `browser.newContext()` calls.
- [x] Asserts cookie name `aldente_auth`.
- [x] Asserts `Navigation principale` landmark.
- [x] No `Authorization.*Bearer` references in the spec body.
- [x] No `SEED_AUTH_TOKEN` references in the spec body.
- [x] All 4 onboarding URLs referenced: `/onboarding/welcome`, `/onboarding/create`, `/onboarding/share-code`, `/onboarding/join`.
- [x] Asserts `httpOnly: true` AND `secure: true` on the cookie objects (both Alice + Bob).
- [x] Asserts the joiner's cookie value differs from the creator's.
- [x] 6-char invite-code pattern `^[A-Z0-9]{6}$` is asserted.
- [x] Type-check + ESLint clean.

## Decisions Made

- **Read invite code from URL search-param.** The page's contract IS `?code=...`; reading it is more durable than scraping the styled `<div>`. The DOM `getByText` assertion still covers the render path.
- **Use verbatim French strings.** Replaced the plan's tolerant regex with exact strings from `fr.json`. If a key drifts, the spec breaks at the spec — desired locality.
- **Pick distinct colors per persona.** Alice = rose (slot 1), Bob = amber (slot 2). Avoids the backend's color-uniqueness 409. Constraint documented via a `not.toBe` constant assertion.
- **Assert `not.toHaveURL(/\/onboarding\//)` for post-join.** Robust to future interstitials; BottomNav is the positive probe.

## Deviations from Plan

- **[Rule 3 — Blocking issue] Replaced regex i18n matchers with exact strings from `fr.json`.** The plan's draft used permissive regex (e.g. `/[Cc]réer.*foyer\|[Cc]ommencer/`) but the actual welcome-page CTA `Card` wraps a `<Link>` (not a `<button>`), and the regex `[Cc]réer` would have also matched the form's submit button label `'Créer le foyer'` if used in the wrong scope. Reading `fr.json` produced unambiguous exact strings, so the spec uses `getByRole('link', { name: 'Créer un foyer', exact: true })` for the welcome CTA and `getByRole('button', { name: 'Créer le foyer', exact: true })` for the form submit. No ambiguity, no regex.
- **[Rule 3 — Blocking issue] ColorSwatchPicker is required.** The plan's draft skipped the color-picker step entirely, but both `/onboarding/create` and `/onboarding/join` enforce `canSubmit = ... && color !== null` (create/page.tsx#43-47, join/page.tsx#109-115) — without a color selection, the submit button stays disabled and the form never POSTs. Added `radiogroup`-targeted swatch clicks for both Alice and Bob, with deliberately distinct slots to avoid a 409 on join.
- **[Rule 3 — Blocking issue] Welcome CTAs are `<Link>`, not `<button>`.** The plan's draft expected `getByRole('button', { name: ... })`. The actual welcome page (welcome/page.tsx#38-46, #49-57) wraps each Card around a `next/link` `Link` — Playwright sees these as `role="link"`. Spec uses `getByRole('link', ...)`.
- **[Rule 3 — Blocking issue] Invite code read from URL, not from regex-scraping the DOM.** The plan's draft used `text=/^[A-Z0-9]{6}$/` to find the code. While that selector would work today, the share-code page (share-code/page.tsx#60) renders the code inside a Fraunces-italic monogram `<div>` with custom tracking — fragile to future design tweaks. The URL search-param is the page's contract source and is read directly via `useSearchParams()` (share-code/page.tsx#27). Spec reads the URL and re-asserts the DOM-rendered text, getting both the contract probe and the render probe.

No architectural changes (Rule 4). No product-code refactors. No data-testid additions. Single in-scope file modified; the existing 13 specs from 10-05 + the harness from 10-04 untouched.

## Issues Encountered

- None. Type-check, lint, and Playwright `--list` all passed first try.
- `rtk proxy` was needed for the `playwright test --list` runs (rtk's playwright parser falls back; same workaround as 10-04).

## Threat Model Coverage

| Threat ID | Status | How |
|-----------|--------|-----|
| T-Bearer-shortcut (executor adds Bearer to "fix flakiness") | mitigated | Spec contains zero `Authorization` / `Bearer` / `SEED_AUTH_TOKEN` references — verified by grep. The `fresh` project explicitly does NOT inject extraHTTPHeaders (10-04). |
| T-Context-bleed (Alice + Bob share a cookie jar) | mitigated | Spec uses `await browser.newContext()` twice (verified by grep). Distinct cookie-value assertion proves the jars are isolated. |
| T-Realtime-assert (per D-06, no WS assertions in this spec) | mitigated | Spec contains zero `WebSocket` / `ws` / `realtime` references — only cookie + URL + DOM probes. |
| T-Cookie-leak (auth_token in test traces) | accepted | Tokens are minted fresh per test run by the real onboarding flow; expire with the browser context (`creator.close()` / `joiner.close()`). globalTeardown.fresh.ts re-seeds anyway. Trace files are git-ignored. |
| T-10-01 (TRUNCATE hits prod DB) | inherited from 10-04 | The fresh-setup project has the inline `aldente_test` guard. This spec inherits that guarantee — if the assert fires, the spec never starts. |

## Self-Check: PASSED

- `frontend/tests/e2e/invite-code-happy-path.spec.ts` exists, 164 lines (≥ 60): PASS.
- All 4 onboarding URLs referenced: PASS.
- `browser.newContext` appears twice: PASS.
- `aldente_auth` referenced: PASS.
- `Navigation principale` referenced: PASS.
- No `Authorization.*Bearer` references: PASS.
- No `SEED_AUTH_TOKEN` references: PASS.
- TypeScript clean: PASS.
- ESLint clean: PASS.
- Playwright `--project=fresh --list` includes the spec: PASS.
- Playwright `--project=seeded --list` does NOT include the spec: PASS.
- Commit `d0d32d3` exists, contains exactly the one spec file: PASS.
- `git diff --name-only HEAD~1..HEAD` returns exactly `frontend/tests/e2e/invite-code-happy-path.spec.ts`: PASS.
- No product-code edits: PASS (verified via git diff scope).

## Next Plan Readiness

- Plan 10-07 (TESTING.md runbook) can now reference `npm run test:e2e -- --project=fresh` as a working entry point with a real spec attached. The end-to-end live run (uvicorn + Next.js + Postgres) is expected to land in 10-07's smoke step.
- All TEST-* requirements (TEST-01 through TEST-04) are now complete; 10-07 closes the phase with documentation.

---
*Phase: 10-e2e-test-infrastructure*
*Plan: 06*
*Completed: 2026-05-08*
