---
phase: 10-e2e-test-infrastructure
plan: 07
subsystem: testing
tags: [docs, runbook, canary-gate, runtime-gap, scope-discipline]

# Dependency graph
requires:
  - 10-01 (env contract, .env.test.example, docker-compose.test.yml)
  - 10-02 (LLM/storage stubs — referenced in TESTING.md troubleshooting)
  - 10-03 (`uv run seed` console script + T-10-01 hard-refusal — cross-referenced verbatim in TESTING.md)
  - 10-04 (playwright.config.ts seeded/fresh projects + npm run test:e2e — referenced in TESTING.md commands)
  - 10-05 (13 seeded specs — itemized in TESTING.md spec matrix)
  - 10-06 (1 fresh spec — itemized in TESTING.md spec matrix)
provides:
  - TESTING.md at repo root: 4-command bootstrap, env-var contract, 14-spec matrix, troubleshooting (7 entries), D-12 canary procedure with revert steps, "What's NOT covered" section
  - Documented runtime gap on the canary execution gate (suite is non-green at baseline due to a frontend harness misconfiguration in 10-04 — Bearer header attaches correctly, but api.ts builds /api/-prefixed paths against NEXT_PUBLIC_API_BASE=http://localhost:8000 which 404s the backend)
affects:
  - Phase 10 close: TESTING.md ships as the single-page runbook for v0.2.1 testers; the canary gate is documented but not executed end-to-end this plan
  - Future follow-up: a 1-line tweak to playwright.config.ts (set NEXT_PUBLIC_API_BASE="" so api.ts paths flow through Next dev rewrites) would unblock the canary; this is a product/infra fix outside 10-07's documented scope

# Tech tracking
tech-stack:
  added: []  # docs-only — no new packages, no code edits
  patterns:
    - "Doc cross-reference style: every variable / spec / pitfall in TESTING.md links back to the plan SUMMARY (10-01..10-06) or CONTEXT decision (D-08, D-10, D-11, D-12) that produced it. Single source of truth → all derivations point upstream."
    - "Runtime-gap escape hatch: when a downstream verification depends on infrastructure the plan does not own, document the gap (file path, observed behavior, hypothesized root cause) instead of patching out-of-scope. Surface to orchestrator for routing."

key-files:
  created:
    - TESTING.md (205 lines)
    - .planning/phases/10-e2e-test-infrastructure/10-07-SUMMARY.md (this file)
  modified: []  # zero product-code edits this plan; both D-12 canary candidate files (frontend/components/ShortlistDeck.tsx, backend/app/routers/votes.py) verified clean via `git diff --quiet`

key-decisions:
  - "TESTING.md authored verbatim from the PLAN.md template — the bootstrap commands, env-var table, spec matrix, troubleshooting, D-12 procedure, and 'NOT covered' list all came pre-locked from CONTEXT D-08/D-10/D-11/D-12. The executor's job was to verify the placeholders against the prior SUMMARYs (every detail matches what 10-01..10-06 actually shipped)."
  - "Canary execution recorded as a Runtime Gap rather than executed. The shortlist-vote suite fails 3/3 at baseline (Validé/Pressenti/Contesté/Rejeté/Sans avis labels not visible because the page redirects to /onboarding/welcome before the test assertion). Root cause traced to a frontend api.ts ↔ playwright.config.ts mismatch in 10-04 (`/api/`-prefixed fetch paths vs. `NEXT_PUBLIC_API_BASE=http://localhost:8000` direct-to-backend → 404). NOT fixed in this plan per scope_constraint (no product/harness edits beyond the reverted canary)."

patterns-established:
  - "Phase-10 plan-07 scope discipline: ONE new file (TESTING.md), ZERO product-code edits. The two D-12 canary candidate files are verified `git diff --quiet` at plan close — invariant honored."

requirements-completed: [TEST-03]

# Metrics
duration: ~25min
completed: 2026-05-08
---

# Phase 10 Plan 07: TESTING.md + D-12 Canary Gate Summary

**TESTING.md ships at repo root (205 lines) with the 4-command bootstrap, full env-var contract, 14-spec matrix, 7-entry troubleshooting section, D-12 canary procedure, and explicit "NOT covered" list. The D-12 canary execution gate could NOT be run end-to-end this plan: the seeded shortlist-vote suite fails 3/3 at baseline due to a `/api/`-prefix mismatch in 10-04's harness, not due to the canary candidate files themselves. Both canary candidate files (`frontend/components/ShortlistDeck.tsx` and `backend/app/routers/votes.py`) are verified `git diff --quiet` at plan close — invariant honored.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 1 of 2 fully executed; Task 2 documented as Runtime Gap (canary procedure recorded but not run end-to-end against a green baseline)
- **Files modified:** 1 (TESTING.md — created at repo root); 0 product-code edits

## Accomplishments

### Task 1 — TESTING.md authored at repo root

`TESTING.md` shipped at the repo root (NOT under `frontend/` or `backend/`) at 205 lines, satisfying every acceptance criterion from the plan:

| Section | Verified |
|---------|---------|
| Quick start (4 commands verbatim from CONTEXT D-08) | grep PASS for `docker compose -f docker-compose.test.yml up -d`, `uv run alembic upgrade head && uv run seed`, `npx playwright install --with-deps chromium`, `npm run test:e2e` |
| Environment variables table (4 vars from D-10) | grep PASS for `SEED_AUTH_TOKEN`, `DATABASE_URL_TEST`, `NEXT_PUBLIC_API_BASE`, `ENVIRONMENT` |
| 5 French vote-state labels | grep PASS for `Validé`, `Pressenti`, `Contesté`, `Rejeté`, `Sans avis` |
| Spec matrix (14 specs from D-11) | All 14 spec filenames present, columns: Spec / Project / Covers / Notes |
| Useful commands | 7 ready-to-paste blocks (full suite, just seeded, just fresh, single spec, UI mode, reset, re-seed, psql inspect) |
| Troubleshooting | 7 entries — Docker port conflict, Playwright Chromium install, Next.js cold-start, APScheduler 16:00 timing, Web Speech / framer-motion console noise, Photo capture Supabase fallthrough, Seed hard-refusal — sourced from RESEARCH.md Pitfalls 1/3/8/10 + plan SUMMARYs |
| Regression canary verification gate (D-12) | Both Procedure A (ShortlistDeck.tsx) and Procedure B (votes.py) documented with `git checkout --` revert steps |
| What's NOT covered | grep PASS for WebSocket/Realtime, CI integration, visual regression, cross-browser, performance, POLISH-01, POLISH-02 |
| `REFUSING to seed` cross-reference | grep PASS — points readers to T-10-01 mitigation in plan 10-03 |

Final automated verify-block from the plan's `<verify>` returns `ALL_VERIFY_PASS` (all 20 grep predicates green); `wc -l TESTING.md` returns 205 (≥ 120 required).

### Task 2 — D-12 regression canary verification gate (Runtime Gap)

Per the plan's Task 2 pre-conditions: "Confirm exit code 0; if not, the canary procedure cannot run — surface as a blocker." That blocker triggered here.

**Pre-condition baseline run** (before any canary edit):

```
$ (cd frontend && npm run test:e2e -- --project=seeded --grep shortlist-vote)
...
✘  1 [seeded] › shortlist-vote.spec.ts:32:7 › all 5 French vote-state labels render from seeded data
✘  2 [seeded] › shortlist-vote.spec.ts:70:7 › voting yes on the Sans-avis recipe flips chip to Pressenti
✘  3 [seeded] › shortlist-vote.spec.ts:110:7 › seeded Rejeté state surfaces with Shawarma
3 failed
```

All three tests fail with the same shape: `getByText('Validé', { exact: true })` (and the other 4 French labels, plus the heading `Tacos au boeuf`) `toBeVisible()` times out. Screenshot evidence in `frontend/test-results/.../test-failed-1.png` shows the page redirecting to `/onboarding/welcome` before any vote-state label can render — i.e. the seeded user is being treated as unauthenticated.

**Root-cause investigation** (read-only — no edits):

1. **Backend Bearer auth works.** Direct curl with `Authorization: Bearer test-token-luca` against `http://localhost:8000/households/me` returns the seeded household payload (`Foyer Test` / invite code `TEST01` / member `Luca`). The same against `/shortlists/today` returns the shortlist with `Ragu bolognese` and the rest. The seed (10-03) is correct, the auth.py Bearer fallback (01.1 D-03) is correct, the test DB is correct.
2. **Frontend api() builds `/api/`-prefixed URLs.** `frontend/components/SessionProvider.tsx:80` calls `api<SessionData>("/api/households/me")`. `frontend/lib/api.ts:41` builds the request as `${API_BASE}${path}` with `API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ""`.
3. **Playwright config sets `NEXT_PUBLIC_API_BASE=http://localhost:8000`** for the frontend webServer (10-04 / `frontend/playwright.config.ts:107`). The intent was "in test we point at the test backend directly" (per 01.1 D-04 inline comment).
4. **Result:** Browser fetch resolves to `http://localhost:8000/api/households/me` — but the backend mounts routes at `/households/me` (no `/api/` prefix). Direct curl confirmation:

   ```
   $ curl -i -H "Authorization: Bearer test-token-luca" http://localhost:8000/api/households/me
   HTTP/1.1 404 Not Found
   ```

5. **The Next.js dev server's rewrite (`next.config.ts:71-74`) is `/api/:path* → ${RAILWAY_BASE}/:path*`** — it strips the `/api/` prefix at proxy time. Production uses this path (Vercel rewrites). The Playwright harness was supposed to set `NEXT_PUBLIC_API_BASE=""` so api.ts builds `/api/households/me` against `http://localhost:3000` (Next dev), which then rewrites to `http://localhost:8000/households/me`. By instead setting it to the bare backend URL, the rewrite is bypassed AND the path mismatch goes uncaught.

6. **Why didn't 10-05's verification catch this?** Plan 10-05's verification ran `npx playwright test --list` only — it never executed the suite end-to-end. The 13 specs are correctly written (they assert on real product behavior), the seed is correct, the backend is correct, but the harness wires them together with a 1-line config bug.

7. **Why does `auth.skip-onboarding.spec.ts` "pass"?** It only asserts `expect(page).not.toHaveURL(/\/onboarding\//)` immediately after `page.goto('/')`. The server returns `/` with status 200 (no SSR-side redirect), so the URL is briefly `/`. Then the client-side `fetchSession` 401s and triggers `window.location.href = "/onboarding/welcome"` (api.ts:68), but by that point the assertion has already passed. The spec is providing FALSE confidence in the auth flow.

**Canary procedure NOT executed end-to-end:** introducing a 1-line bug into `frontend/components/ShortlistDeck.tsx` or `backend/app/routers/votes.py` against this baseline would have produced the same 3/3 failures regardless of the canary, providing no signal about whether the suite catches regressions in those files. Per the plan: "If it's zero (suite missed the bug), that's a real Phase 10 failure — surface as a blocker, do NOT proceed." Inversely: if the baseline can't be made green, introducing a bug produces an expected-bad outcome that proves nothing.

**Final state of canary candidate files** (verified at plan close):

```
$ git diff --quiet frontend/components/ShortlistDeck.tsx && echo "ShortlistDeck.tsx CLEAN"
ShortlistDeck.tsx CLEAN
$ git diff --quiet backend/app/routers/votes.py && echo "votes.py CLEAN"
votes.py CLEAN
$ git status --short
 M .planning/config.json                       # pre-existing, not this plan
 M CLAUDE.md                                   # pre-existing, not this plan
?? .claude/worktrees/                          # pre-existing, not this plan
?? .planning/phases/10-e2e-test-infrastructure/10-01-SUMMARY.md   # untracked from earlier plans
?? frontend/public/worker-9e66885325cabad7.js  # generated runtime artifact, not this plan
```

ZERO modifications to product code from 10-07. The canary candidate files are byte-identical with `main`.

## Runtime Gap (D-12 canary execution)

**What was supposed to happen (per plan):**

1. Run baseline `npm run test:e2e -- --project=seeded --grep shortlist-vote` → exit 0.
2. Edit `frontend/components/ShortlistDeck.tsx` (1 line, invert yes/no callback wiring).
3. Re-run suite → exit non-zero (proves the suite catches the bug).
4. `git checkout -- frontend/components/ShortlistDeck.tsx`.
5. Re-run suite → exit 0 (suite green again).
6. Repeat steps 2-5 for `backend/app/routers/votes.py`.

**What actually happened:**

Step 1 fails — baseline exit code is non-zero (3 of 3 shortlist-vote tests fail). Without a green baseline, steps 2-6 cannot demonstrate regression-catching power: any subsequent run with a canary edit would fail for the same baseline reason, not because of the canary bug.

**Why this is a phase-10 (not 10-07) issue:**

The PLAN.md task 2 explicitly says: "Confirm exit code 0; if not, the canary procedure cannot run — surface as a blocker." The blocker is the harness wiring in 10-04 (`NEXT_PUBLIC_API_BASE=http://localhost:8000` ↔ `/api/`-prefixed fetch paths), NOT the suite or the canary candidate files. Fixing it requires editing `frontend/playwright.config.ts` (a 1-line change: `NEXT_PUBLIC_API_BASE: ''`), which is outside 10-07's `<scope_constraint>` ("NO touching frontend/components/** ... NO modifying STATE.md / ROADMAP.md / REQUIREMENTS.md ... no new dependencies. NO CI workflows.")

A subsequent plan (or a 10-04 follow-up) can:

1. Set `NEXT_PUBLIC_API_BASE: ''` in `frontend/playwright.config.ts` webServer.env (so api.ts paths flow through Next dev rewrites at `:3000/api/* → :8000/*`).
2. Re-run baseline `npm run test:e2e -- --project=seeded --grep shortlist-vote` → expect exit 0.
3. Execute the canary procedure as documented in TESTING.md §"Regression canary verification gate (D-12)".

The procedure itself is fully documented in TESTING.md (the deliverable of this plan) and remains valid as a regression-catching gate — it just hasn't been demonstrated end-to-end yet.

## Files Created/Modified

- `TESTING.md` (NEW, 205 lines) — repo-root runbook + D-12 canary procedure + deferred-scope list.
- (`.planning/phases/10-e2e-test-infrastructure/10-07-SUMMARY.md` — this file.)

ZERO product-code edits. ZERO modifications to:
- `frontend/components/ShortlistDeck.tsx` (D-12 canary candidate file A — `git diff --quiet` PASS).
- `backend/app/routers/votes.py` (D-12 canary candidate file B — `git diff --quiet` PASS).
- `frontend/playwright.config.ts`, `frontend/lib/api.ts`, or any other harness/product file.

## Task Commits

1. **Task 1: TESTING.md at repo root** — `35b9048` (docs)
2. **Task 2: D-12 canary execution** — *(no commit — runtime gap recorded)*

## Decisions Made

- **TESTING.md authored verbatim from the PLAN.md template, with placeholders verified against prior SUMMARYs.** The 4 bootstrap commands, the 4 env vars in the table, the 14-spec matrix, the 7 troubleshooting entries, the D-12 procedure, and the deferred-scope list all came pre-locked. The executor's responsibility was to verify each detail against what 10-01..10-06 actually shipped — every line cross-checks.
- **Canary execution recorded as Runtime Gap rather than fudged.** The plan and the orchestrator preface both explicitly authorize this escape hatch ("If the runtime conditions for the canary aren't met (Docker not running, port :5433 in use, missing dependencies), document that as a runtime-acceptance gap in SUMMARY.md and move on"). Even though Docker/port/deps were ALL fine, the runtime suite-baseline blocker is the same class of issue: a downstream prerequisite is unmet, not by anything 10-07 owns. Documented with full root-cause trace so the next plan can resolve in one targeted edit.

## Deviations from Plan

- **[Rule 3 — Blocking issue, NOT auto-fixed] Suite baseline is RED before canary, blocking the canary execution gate.** Per scope_constraint, the fix (`NEXT_PUBLIC_API_BASE: ''` in `frontend/playwright.config.ts`) was deliberately NOT applied. Surfaced as Runtime Gap instead. The TESTING.md deliverable (the file artifact) is intact and complete; the runtime verification gate is documented but not executed. Acceptance criterion "Final `npm run test:e2e -- --project=seeded` (full suite, all 13 specs) exits 0" cannot be met from this plan alone.
- **No other deviations.** Task 1 executed verbatim per the plan's template, with no drift in commands, env vars, French strings, or spec filenames.

## Issues Encountered

- **Single canary execution blocker** as detailed under Runtime Gap. Investigation was read-only (no `Edit` calls to product or harness files). All evidence (curl probes, log inspection, code reading) cross-checked against the prior SUMMARYs to confirm the gap is in 10-04's harness wiring, not in 10-07's deliverable.
- **No PreToolUse hook reminders this session** (TESTING.md is brand new, no prior Read needed).

## Threat Model Coverage

| Threat ID | Status | How |
|-----------|--------|-----|
| T-10-05-doc (TESTING.md fails to mention seed hard-refusal) | mitigated | TESTING.md §"Seed refuses to run" includes both `REFUSING to seed: ENVIRONMENT='development'` AND `REFUSING to seed: database_url does not contain 'aldente_test'` verbatim, with cross-reference to T-10-01 (plan 10-03). grep PASS. |
| T-Canary-leak (canary edit accidentally committed) | mitigated | No canary edit was made. `git diff --quiet` for both candidate files (`frontend/components/ShortlistDeck.tsx`, `backend/app/routers/votes.py`) returns 0 at plan close. `git status --short` confirms only pre-existing artifacts remain — none of which 10-07 touched. |
| T-Canary-impotence (suite has no real assertion power; the bug passes silently) | UNVERIFIED — runtime gap | The plan's defense against this threat (run a known-bad change, confirm non-zero exit) could not be exercised because the suite is non-green at baseline. Documented as a runtime gap requiring 10-04 follow-up. The threat is NOT confirmed mitigated by 10-07; it is also NOT confirmed un-mitigated — the test is simply not executable today against this harness. |
| T-Doc-drift (TESTING.md commands diverge from package.json / pyproject.toml) | mitigated | Verified inline: `npm run test:e2e` exists in `frontend/package.json` (added by 10-04); `seed` exists in `backend/pyproject.toml [project.scripts]` (added by 10-03). Both are referenced in TESTING.md §"Quick start" and §"Useful commands". |

## Self-Check: PASSED (file deliverable) / FAILED (runtime gate)

Verified post-write:

- `TESTING.md` exists at repo root: FOUND (205 lines).
- All 20 plan-template grep predicates: PASS (the `<verify>` block returns `ALL_VERIFY_PASS`).
- The 4 bootstrap commands present verbatim: PASS.
- The 4 env vars from D-10 documented: PASS.
- All 5 French vote-state labels: PASS.
- All 14 spec filenames in spec matrix: PASS (verified line-by-line against 10-04/10-05/10-06 SUMMARYs).
- "Regression canary verification gate (D-12)" section with both Procedure A and Procedure B: PASS.
- "What's NOT covered" section with WebSocket / CI / visual / cross-browser / perf / POLISH-01 / POLISH-02: PASS.
- `REFUSING to seed` cross-reference: PASS.
- Commit `35b9048` exists: FOUND.
- `git diff --quiet frontend/components/ShortlistDeck.tsx`: PASS (clean).
- `git diff --quiet backend/app/routers/votes.py`: PASS (clean).
- `git status --short` for `frontend/components/**` and `backend/app/**`: NO `M ` lines (no modifications from this plan).

**FAILED self-check items (runtime gate):**

- `npm run test:e2e -- --project=seeded --grep shortlist-vote` exits 0 at baseline: FAILED (3/3 tests fail; root cause is a 10-04 harness misconfiguration, NOT the canary candidates or this plan's deliverable).
- D-12 canary procedure executed end-to-end with documented before/after exit codes: NOT EXECUTED (runtime gap).

## Next Plan / Follow-up Readiness

A follow-up plan or hotfix can close the canary gate with a single targeted change:

1. Edit `frontend/playwright.config.ts` line 107: change `NEXT_PUBLIC_API_BASE: 'http://localhost:8000'` → `NEXT_PUBLIC_API_BASE: ''`. This makes `api.ts` build `/api/households/me` against `http://localhost:3000` (Next dev), which the existing rewrite (`next.config.ts:71-74`) strips and forwards to `http://localhost:8000/households/me`.
2. Verify baseline: `(cd frontend && npm run test:e2e -- --project=seeded --grep shortlist-vote)` — expect exit 0.
3. Execute the D-12 procedure as documented in TESTING.md §"Regression canary verification gate (D-12)" — Procedure A (ShortlistDeck.tsx), then Procedure B (votes.py), with revert via `git checkout --` after each.
4. Record results in a follow-up SUMMARY (e.g. 10-08-SUMMARY.md or a Phase 10 closeout note).

The TESTING.md deliverable from this plan needs no further changes — the runbook is correct, the canary procedure section is accurate, only the runtime execution remains.

---
*Phase: 10-e2e-test-infrastructure*
*Plan: 07*
*Completed: 2026-05-08*
