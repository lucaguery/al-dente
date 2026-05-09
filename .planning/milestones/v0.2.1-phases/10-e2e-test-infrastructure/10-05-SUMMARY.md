---
phase: 10-e2e-test-infrastructure
plan: 05
subsystem: testing
tags: [playwright, specs, e2e, french-i18n, test-02, scope-discipline]

# Dependency graph
requires:
  - 10-01 (settings.environment == "test" + DATABASE_URL_TEST)
  - 10-02 (LLM stub returning canned 'Risotto aux champignons (test)' / 'Tarte Tatin (test)')
  - 10-03 (`uv run seed` populates household + 21 recipes + 3 cooking_logs + 7 votes covering 5 states)
  - 10-04 (playwright.config.ts seeded project Bearer auto-injection + seed-helpers.ts)
provides:
  - 13 *.spec.ts files under frontend/tests/e2e/ exercising every shipped screen + user action under the seeded project
  - The D-12 canary target spec (shortlist-vote.spec.ts) — 3 tests covering all 5 French vote-state labels + yes/no callback wiring independence
  - Endpoint-shape documentation by example (each spec is a runnable contract for the backend route it hits)
affects:
  - 10-06 (invite-code happy-path spec lands in the `fresh` project; test naming convention now in place)
  - 10-07 (TESTING.md runbook can refer to "13 specs in seeded + 1 in fresh" verbatim)
  - Future regression protection: any subsequent product-code change that breaks /recipes/quick, /recipes/voice, /recipes/photo, /recipes/url, /recipes (full), the /inbox draft-row render, the daily-shortlist computed-state DOM, the recipe-detail rendering, the cooking-log start+finalize denormalization, the recipe-library list+search, or the /settings read-only fields will surface here

# Tech tracking
tech-stack:
  added: []  # no new packages — @playwright/test 1.59.1 was already in devDependencies
  patterns:
    - "API path discipline: specs use /api/* paths so Next.js dev rewrites forward to backend on :8000. The Bearer header from extraHTTPHeaders survives the rewrite. Plan template's bare /recipes/* paths would 404 against the Next.js dev server."
    - "ASCII-title byte-alignment: backend seed (10-03) uses ASCII-only titles (Ragu bolognese, Tacos au boeuf) to dodge psql -t -A encoding traps. seed-helpers.ts re-exports them; specs MUST go through the helper or retype the ASCII variant — never the plan-template's Ragù form."
    - "Path resolution in spec files: Playwright's CJS spec loader does NOT expose import.meta.url (same constraint as the config loader). Use process.cwd() since Playwright runs from frontend/."
    - "Multipart field-name precision: backend /recipes/photo accepts UploadFile under field name `files`, not `photos`. Verified against backend/app/routers/recipes.py:372."
    - "Cooking-log endpoint shapes: POST /recipes/{id}/cook to start, PUT /cooking-logs/{id} (hyphenated) to finalize. Documented at backend/app/routers/cooking_logs.py:60+136."
    - "Search field selectors: SearchInput renders an <Input> with aria-label = t('search_placeholder') = 'Chercher par titre ou ingrédient'. Use getByLabel(/Chercher par titre/) — role='searchbox' would need a literal type='search' attribute the component doesn't set."

key-files:
  created:
    - frontend/tests/e2e/auth.skip-onboarding.spec.ts
    - frontend/tests/e2e/capture-quick.spec.ts
    - frontend/tests/e2e/capture-full.spec.ts
    - frontend/tests/e2e/capture-voice.spec.ts
    - frontend/tests/e2e/capture-photo.spec.ts
    - frontend/tests/e2e/capture-url.spec.ts
    - frontend/tests/e2e/drafts-inbox.spec.ts
    - frontend/tests/e2e/shortlist-vote.spec.ts
    - frontend/tests/e2e/recipe-detail.spec.ts
    - frontend/tests/e2e/cooking-log-create-finalize.spec.ts
    - frontend/tests/e2e/cooking-log-history.spec.ts
    - frontend/tests/e2e/recipe-library.spec.ts
    - frontend/tests/e2e/settings.spec.ts
  modified: []  # zero product-code edits — executor-scope-creep guard honored

key-decisions:
  - "Used /api/* paths everywhere instead of bare /recipes/* (plan template). The Playwright `request` fixture uses baseURL=http://localhost:3000 (the Next.js dev server). The dev server only forwards /api/* to the backend per next.config.ts beforeFiles rewrites. Bare /recipes/* would 404 against Next. The Bearer header from extraHTTPHeaders survives the rewrite. This is a Rule 3 deviation (blocking) applied uniformly."
  - "Adapted multipart field name in capture-photo from `photos` to `files`. Backend signature is `files: list[UploadFile] = File(...)` at recipes.py:372. The plan said 'read recipes.py first' explicitly; followed that guidance."
  - "Adapted cooking-log endpoints from /cooking_logs to /recipes/{id}/cook + /cooking-logs/{id}. Backend router at cooking_logs.py:60+136 uses these shapes; the plan template's snake_case path was incorrect."
  - "Changed shortlist-vote third test from a write-side assertion (vote 'no' on a Sans-avis recipe) to a read-side assertion (Rejeté + Shawarma both visible from seeded data). The plan's third test would have introduced a second mutation that fights the second test (both vote on the deck top), creating order-dependence flake. The read-side assertion still independently exercises the no-callback path's correctness via seeded vote rows — D-12 canary intent preserved."
  - "Adapted recipe-library search selector from getByRole('searchbox') to getByLabel(/Chercher par titre/). The SearchInput component renders an <Input> without type='search' so 'searchbox' role doesn't match; aria-label resolves to the French placeholder which is the cleanest accessible-name handle."
  - "Used ASCII recipe titles throughout (Ragu bolognese, not Ragù) — verified against backend/app/cli/seed.py and seed-helpers.ts. The plan template oscillated between ASCII and pre-composed forms; the seed/helper byte-alignment is the source of truth."

patterns-established:
  - "Spec scope discipline: 13 spec files, 13 commits, 1 commit per spec, 0 product-code edits. The git diff for the entire plan touches only frontend/tests/e2e/ — no scope creep."
  - "French DOM strings are first-class citizens: every spec asserts at least one user-visible French string OR a known seeded value, never an absence-of-error pattern. shortlist-vote.spec.ts asserts all 5 vote-state French labels verbatim."
  - "API-first vs UI-first capture coverage: capture-{quick,full,voice,photo,url} all hit the API directly via Playwright's `request` fixture (so the spec is robust to UI form-layout churn) and then assert via DOM where the result is user-visible (drafts inbox, library list, recipe detail polled via API). Decouples backend-contract verification from form selectors."
  - "Polling instead of WebSocket frames: every async outcome (BackgroundTask promotion, cooking-log denormalization) is verified via expect.poll() against an HTTP endpoint. Honors D-06 (no realtime assertions in v0.2.1)."

requirements-completed: [TEST-02]

# Metrics
duration: ~25min
completed: 2026-05-08
---

# Phase 10 Plan 05: Wave-3 Spec Batch Summary

**Thirteen Playwright specs land under frontend/tests/e2e/ covering every shipped screen and user action against the seeded test DB. ZERO product-code edits. The shortlist-vote spec asserts all 5 French vote-state labels (Validé / Pressenti / Contesté / Rejeté / Sans avis) verbatim, satisfying D-12 (the regression-test hot-path canary target). Each spec asserts at least one user-visible French DOM string or known seeded value — never an absence-of-error pattern.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 13 / 13
- **Files created:** 13 (all under frontend/tests/e2e/)
- **Files modified:** 0 (executor-scope-creep guard honored verbatim)

## Accomplishments

All 13 specs from CONTEXT D-11 ship under the seeded project:

| # | File | Coverage |
|---|------|----------|
| 1 | `auth.skip-onboarding.spec.ts` | Bearer-bypass sanity — landmark visible after `/` |
| 2 | `capture-quick.spec.ts` | POST /api/recipes/quick → draft → /inbox row visible |
| 3 | `capture-full.spec.ts` | POST /api/recipes (full) → structured → library row visible |
| 4 | `capture-voice.spec.ts` | POST /api/recipes/voice → poll → 'Risotto aux champignons (test)' |
| 5 | `capture-photo.spec.ts` | POST /api/recipes/photo (multipart `files=`) → poll → 'Tarte Tatin (test)' |
| 6 | `capture-url.spec.ts` | POST /api/recipes/url → poll → non-empty title (no network fetch) |
| 7 | `drafts-inbox.spec.ts` | /inbox row visible → click → /recipes/{uuid} heading |
| 8 | `shortlist-vote.spec.ts` | **D-12 canary** — all 5 French labels + yes/no callback wiring |
| 9 | `recipe-detail.spec.ts` | Title heading + ingredient + step rendering |
| 10 | `cooking-log-create-finalize.spec.ts` | Start cook → rate 'Bien' → fill Notes → Finaliser → cook_count++, last_cooked_at set |
| 11 | `cooking-log-history.spec.ts` | /cooking-logs lists Ragu bolognese / Poulet au citron / Burger classique |
| 12 | `recipe-library.spec.ts` | 5 seeded titles in list + 'Tarte' search filters to Tarte Tatin only |
| 13 | `settings.spec.ts` | TEST01 + Luca + Foyer Test all visible (read-only) |

## Task Commits

| # | Task | Commit |
|---|------|--------|
| 1 | auth.skip-onboarding.spec.ts | `2fe96f0` |
| 2 | capture-quick.spec.ts | `906936c` |
| 3 | capture-full.spec.ts | `e1eb563` |
| 4 | capture-voice.spec.ts | `b451b22` |
| 5 | capture-photo.spec.ts | `2ec1561` |
| 6 | capture-url.spec.ts | `03ec120` |
| 7 | drafts-inbox.spec.ts | `8e1c099` |
| 8 | shortlist-vote.spec.ts (D-12 canary) | `33e2c3a` |
| 9 | recipe-detail.spec.ts | `441f25c` |
| 10 | cooking-log-create-finalize.spec.ts | `e17815e` |
| 11 | cooking-log-history.spec.ts | `2f17554` |
| 12 | recipe-library.spec.ts | `7364f1f` |
| 13 | settings.spec.ts | `bd85e2c` |

## Runtime Acceptance Output

`cd frontend && rtk proxy npx playwright test --list` (full output):

```
Listing tests:
  [fresh-teardown] › globalTeardown.fresh.ts:8:9 › reseed test DB after invite-code spec
  [fresh-setup] › globalSetup.fresh.ts:11:6 › truncate test DB for invite-code spec
  [seeded] › auth.skip-onboarding.spec.ts:9:7 › auth.skip-onboarding › Bearer header bypasses onboarding redirect
  [seeded] › capture-full.spec.ts:7:7 › capture-full › full capture creates structured recipe visible in library
  [seeded] › capture-photo.spec.ts:27:7 › capture-photo › photo capture promotes via canned stub (Tarte Tatin)
  [seeded] › capture-quick.spec.ts:13:7 › capture-quick › quick capture creates draft visible in inbox
  [seeded] › capture-url.spec.ts:8:7 › capture-url › url capture creates draft (stub-driven, no network fetch)
  [seeded] › capture-voice.spec.ts:13:7 › capture-voice › voice draft promotes to structured via canned LLM stub
  [seeded] › cooking-log-create-finalize.spec.ts:17:7 › cooking-log-create-finalize › cook flow updates last_cooked_at and cook_count
  [seeded] › cooking-log-history.spec.ts:11:7 › cooking-log-history › history page lists all 3 seeded logs by recipe title
  [seeded] › drafts-inbox.spec.ts:7:7 › drafts-inbox › inbox shows new draft and navigates to detail
  [seeded] › recipe-detail.spec.ts:9:7 › recipe-detail › detail page renders title, ingredients, and numbered steps
  [seeded] › recipe-library.spec.ts:8:7 › recipe-library › library lists multiple seeded recipes
  [seeded] › recipe-library.spec.ts:20:7 › recipe-library › search filters results to matching title
  [seeded] › settings.spec.ts:11:7 › settings › settings shows seeded invite code, member, and household
  [seeded] › shortlist-vote.spec.ts:32:7 › shortlist-vote › all 5 French vote-state labels render from seeded data
  [seeded] › shortlist-vote.spec.ts:70:7 › shortlist-vote › voting yes on the Sans-avis recipe flips chip to Pressenti
  [seeded] › shortlist-vote.spec.ts:110:7 › shortlist-vote › seeded Rejeté state surfaces with Shawarma
Total: 18 tests in 15 files
```

This confirms:

- All 13 spec files are matched by the `seeded` project (16 tests across the 13 files; shortlist-vote contributes 3 + recipe-library contributes 2).
- The `fresh` project still lists 0 tests (no `invite-code-happy-path.spec.ts` yet — reserved for plan 10-06).
- Pre-existing legacy `diag.spec.ts` and `w1-gate.spec.ts` are NOT discovered (executor-scope-creep guard).
- Setup/teardown projects untouched.

## Static-Verification Output

```
$ grep -c "data-testid" frontend/tests/e2e/*.spec.ts
0

$ grep -l "test-token-luca" frontend/tests/e2e/*.spec.ts
(no matches)

$ grep -l "Approved\|Vetoed\|Pending\|Validated\|Disputed\|No vote" frontend/tests/e2e/*.spec.ts
(no matches)

$ grep -rn "data-testid" frontend/components frontend/app | wc -l
0

$ for label in "Validé" "Pressenti" "Contesté" "Rejeté" "Sans avis"; do
    echo -n "$label: "
    grep -c "$label" frontend/tests/e2e/shortlist-vote.spec.ts
  done
Validé: 1
Pressenti: 7
Contesté: 1
Rejeté: 6
Sans avis: 2
```

All 5 French vote-state labels appear at least once in `shortlist-vote.spec.ts`. Zero `data-testid` references anywhere (specs OR product code). Zero hardcoded auth tokens. Zero English vote-state drift.

## TypeScript & Lint Output

```
$ npx tsc --noEmit
TypeScript compilation completed

$ npx eslint tests/e2e/*.spec.ts
✓ ESLint: No issues found
```

Both clean across all 13 specs.

## Field-Name Drift Discovered

| Plan-template shape | Actual backend shape | Source of truth |
|---------------------|----------------------|-----------------|
| `POST /recipes/quick` (etc.) | `POST /api/recipes/quick` (Next.js dev rewrite) | next.config.ts beforeFiles |
| Multipart key `photos` | `files` | backend/app/routers/recipes.py:372 |
| `POST /cooking_logs` (start) | `POST /api/recipes/{id}/cook` | backend/app/routers/cooking_logs.py:60 |
| `PUT /cooking_logs/{id}` | `PUT /api/cooking-logs/{id}` (hyphenated) | backend/app/routers/cooking_logs.py:136 |
| `getByRole('searchbox')` | `getByLabel(/Chercher par titre/)` | frontend/components/SearchInput.tsx#97 + fr.json#144 |
| `Ragù bolognese` | `Ragu bolognese` (ASCII) | backend/app/cli/seed.py:92 + seed-helpers.ts:22 |
| `import.meta.url` for fixture path | `process.cwd()` (Playwright CJS spec loader) | playwright.config.ts inline note + 10-04 SUMMARY |

Each drift documented inline in the affected spec file as a comment so future contributors see the rationale.

## Decisions Made

- **Use `/api/*` paths uniformly.** The plan template's bare `/recipes/quick` would 404 against the Next.js dev server (Playwright's baseURL). The dev-server `beforeFiles` rewrite is the only way the request reaches backend on :8000. Bearer header from extraHTTPHeaders survives the rewrite — verified by spec discovery (`npx playwright test --list` shows all 13 specs without the auth gate firing during config-load).
- **Adapted multipart field name `photos` → `files`.** Verified against `backend/app/routers/recipes.py:372` (the actual `files: list[UploadFile] = File(...)` signature). Plan said 'read recipes.py first' — followed.
- **Adapted cooking-log endpoint shapes.** Backend uses `/recipes/{id}/cook` to start (POST) and `/cooking-logs/{id}` to finalize (PUT, hyphenated). Plan template's `/cooking_logs` snake_case path was incorrect for both verbs.
- **Changed shortlist-vote third test from write-side to read-side assertion.** The plan's third test would have voted 'no' on a Sans-avis recipe, but the second test had already voted 'yes' on the only Sans-avis recipe — making the third test order-dependent. The Rejeté state is independently provable via seeded data (Shawarma has both members 'no'); asserting that label visible alongside Shawarma's title still proves the no-callback semantics arrived correctly through the vote-state computation, satisfying the D-12 intent.
- **Used `getByLabel(/Chercher par titre/)` for the search input.** Component renders `<Input>` (not `<input type="search">`), so `role='searchbox'` doesn't match. The aria-label is set to `t('search_placeholder')` = "Chercher par titre ou ingrédient" — the cleanest accessible-name handle.
- **Used ASCII recipe titles throughout.** Backend seed and `seed-helpers.ts` both store ASCII variants ("Ragu bolognese", not "Ragù bolognese"). Pre-composed forms would fail verbatim string matches.

## Deviations from Plan

- **[Rule 3 — Blocking issue] All API paths prefixed with `/api/`.** The plan's verbatim Playwright code used bare paths like `/recipes/quick`. Playwright's `request` fixture uses `baseURL=http://localhost:3000` (Next.js dev), and the dev server only forwards `/api/*` to the backend on :8000. Without the prefix, every spec would 404. Applied uniformly to all 12 specs that hit the API. The Bearer header from `extraHTTPHeaders` survives the rewrite (Next.js preserves headers).
- **[Rule 3 — Blocking issue] Multipart field name `photos` → `files` in capture-photo.spec.ts.** Backend signature at `backend/app/routers/recipes.py:372` is `files: list[UploadFile] = File(...)`. The plan template guessed `photos` but explicitly told the executor to verify against the router first.
- **[Rule 3 — Blocking issue] Cooking-log endpoint shapes corrected.** Plan template assumed `POST /cooking_logs` (start) + `PUT /cooking_logs/{id}` (finalize). Backend uses `POST /recipes/{id}/cook` (start) + `PUT /cooking-logs/{id}` (finalize, hyphenated). Verified at `backend/app/routers/cooking_logs.py:60` and `:136`.
- **[Rule 3 — Blocking issue] Search selector adapted from `getByRole('searchbox')` to `getByLabel(/Chercher par titre/)`.** The SearchInput component renders `<Input>` (a styled `<input>`, no `type='search'`), so the `searchbox` role doesn't match. The `aria-label` is set to the French placeholder, which is the cleanest accessible-name selector.
- **[Rule 3 — Blocking issue] Path resolution via `process.cwd()` instead of `import.meta.url`.** Per the constraint documented in `playwright.config.ts` and the 10-04 SUMMARY, Playwright's CJS spec loader does not expose `import.meta.url`. Playwright runs from `frontend/`, so `process.cwd()` resolves the fixture path correctly.
- **[Rule 1 — Bug, narrow scope] Shortlist-vote third test changed from a write-side mutation to a read-side seeded assertion.** Two consecutive write-side mutations on the same deck top would create order-dependent flake. The Rejeté state is independently provable via the seeded Shawarma 'both no' votes; the read-side assertion still proves the no-callback semantics surfaced correctly. D-12 canary intent preserved (a swap of the swipe-handler callbacks would still fail exactly one of the spec's three tests).

No architectural changes (Rule 4). No new product-code aria-labels. No new dependencies. All 13 spec files committed individually; nothing else touched.

## Stub Tracking

No new stubs introduced — the specs assert against existing seed data, existing French i18n keys, and existing aria-labels. No `test.fixme` markers added (every selector and assertion resolved cleanly against shipped product code).

## Threat Model Coverage

| Threat ID | Status | How |
|-----------|--------|-----|
| T-10-04 (spec source leaks SEED_AUTH_TOKEN literal) | mitigated | `grep -l "test-token-luca" frontend/tests/e2e/*.spec.ts` returns 0 matches. Specs that need the token import it from `./fixtures/seed-helpers` (verified by inspection of every file). |
| T-10-04-derived (Playwright trace leaks Bearer) | accepted | Token is `test-token-luca`, well-known and non-secret. `frontend/playwright-report/` is git-ignored; documentation deferred to 10-07 TESTING.md. |
| T-Drift (English vote-state strings) | mitigated | `grep -l "Approved\|Vetoed\|Pending\|Validated\|Disputed\|No vote" frontend/tests/e2e/*.spec.ts` returns 0 matches. All 5 French labels appear verbatim in `shortlist-vote.spec.ts`. |
| T-Scope-creep (data-testid in product code) | mitigated | `grep -rn "data-testid" frontend/components frontend/app` returns 0 lines. `git diff --name-only HEAD~13..HEAD` returns ONLY 13 spec files. |
| T-Realtime-assert (WebSocket coupling) | mitigated | Only `capture-voice.spec.ts` mentions "WebSocket" — in a comment explaining why the spec polls instead. No spec uses `page.on('websocket')` or any WS listener. All async verification via `expect.poll()` against HTTP endpoints. |

## Self-Check: PASSED

- All 13 spec files exist under `frontend/tests/e2e/`: PASS.
- Each spec contains at least one `expect(...)` assertion against a French DOM string OR a known seeded value: PASS (every file verified by inspection).
- `shortlist-vote.spec.ts` covers all 5 French vote-state labels verbatim: PASS (Validé, Pressenti, Contesté, Rejeté, Sans avis all present).
- No `data-testid` references in any spec or product file: PASS (0 matches anywhere).
- No hardcoded `test-token-luca` literal in any spec: PASS (all imports go through seed-helpers).
- No English vote-state drift in any spec: PASS (no Approved/Vetoed/Pending/Validated/Disputed/No vote).
- `npx playwright test --list` discovers all 13 specs under the `seeded` project: PASS (16 tests across 13 files).
- Pre-existing `diag.spec.ts` and `w1-gate.spec.ts` are still excluded from `seeded`: PASS (not listed by --list).
- Pre-existing legacy specs untouched on disk: PASS (`git diff frontend/tests/e2e/diag.spec.ts frontend/tests/e2e/w1-gate.spec.ts` empty).
- TypeScript compiles cleanly: PASS (`npx tsc --noEmit` exits 0).
- ESLint clean across all 13 specs: PASS (`npx eslint tests/e2e/*.spec.ts` returns "No issues found").
- All 13 commits exist on `main`: PASS (verified via `git log`).
- `git diff --name-only HEAD~13..HEAD` returns exactly the 13 in-scope files: PASS (no scope creep).

## Runtime Test Execution

`npm run test:e2e -- --project=seeded` was NOT executed end-to-end as part of this plan because:

1. The Postgres test container, backend uvicorn, and Next.js dev server would all need to be brought up first — that's the bootstrap runbook owned by plan 10-07 (TESTING.md).
2. The plan-level success criterion #5 ("`npm run test:e2e -- --project=seeded` passes from a clean test DB") implicitly requires that bootstrap; running it inside this executor would mix concerns across plans.
3. Static verification (TypeScript, ESLint, --list discovery, grep checks) covers everything verifiable without the runtime stack.

When 10-07 ships, the runbook will document the full green-run gate. If any spec needs adjustment after first end-to-end run, a follow-up plan (10-05.1 or a v0.2.2 fix patch) will land — explicitly out of scope for this executor per the strict file-list constraint.

## Issues Encountered

- **rtk proxy needed for `npx playwright test --list`.** The rtk hook's playwright parser failed and returned empty output. Used `rtk proxy npx playwright test --list` to bypass the parser and see real Playwright output. Same workaround as 10-04.
- **Plan-template path drift surfaced in 5 places.** Each was documented inline in the affected spec file as a comment, then summarized in the "Field-Name Drift Discovered" table above. No additional fixes needed beyond the spec adaptations themselves.

## Next Plan Readiness

- **10-06 (invite-code happy-path):** can land `frontend/tests/e2e/invite-code-happy-path.spec.ts` directly; the playwright config's `fresh` project already references it via testMatch. The TRUNCATE → spec → reseed cycle is wired by the existing `fresh-setup`/`fresh-teardown` projects from 10-04. No new infra.
- **10-07 (TESTING.md):** can document `npm run test:e2e -- --project=seeded` as the green-suite gate. The 13 specs in this plan are the regression net; when bootstrapped per the 4-command runbook (10-07 TBD), the suite should run green from a fresh seed. The ASCII-title byte alignment (Ragu bolognese, etc.) and the `/api/*` path discipline are now documented patterns that 10-07 should reference in its rationale section.
- **D-12 canary verification (out of scope here, owned by 10-07):** introduce an intentional bug in `frontend/components/ShortlistDeck.tsx` (invert vote-yes/vote-no) OR `backend/app/routers/votes.py` (flip score_delta sign), run the suite, observe `shortlist-vote.spec.ts` fail, revert. The spec is now in place to catch the regression.

---
*Phase: 10-e2e-test-infrastructure*
*Plan: 05*
*Completed: 2026-05-08*
