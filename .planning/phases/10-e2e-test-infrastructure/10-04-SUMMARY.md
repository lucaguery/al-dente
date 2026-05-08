---
phase: 10-e2e-test-infrastructure
plan: 04
subsystem: testing
tags: [playwright, webserver, projects, fixtures, jpeg, truncate, reseed, esm-cjs]

# Dependency graph
requires:
  - 10-01 (settings.environment == "test" switch + DATABASE_URL_TEST flow)
  - 10-02 (LLM/storage stubs — capture-photo / capture-voice specs need them, but the harness itself doesn't invoke either)
  - 10-03 (`uv run seed` console script — globalTeardown.fresh.ts shells out to it)
provides:
  - frontend/playwright.config.ts: workers=1, two-server webServer (uvicorn :8000 + next dev :3000), three projects (fresh-setup → fresh, seeded with Bearer header)
  - 3 npm scripts in frontend/package.json (test:e2e, test:e2e:ui, test:e2e:reset) — pre-existing dev/build/start/lint untouched
  - frontend/tests/e2e/fixtures/risotto.jpg (157-byte baseline JPEG, valid magic FF D8 FF + EOI FF D9, 1x1 pixel)
  - frontend/tests/e2e/fixtures/seed-helpers.ts (SEED_AUTH_TOKEN, PARTNER_AUTH_TOKEN, SEEDED_INVITE_CODE, getApiBase(), getSeedAuthToken(), VOTE_STATE_LABELS with the 5 French strings, SHORTLIST_RECIPES by computed state, SEEDED_LOG_RATINGS)
  - frontend/tests/e2e/globalSetup.fresh.ts (TRUNCATE 6 tables CASCADE via spawned `uv run python -c`, with inline aldente_test guard)
  - frontend/tests/e2e/globalTeardown.fresh.ts (re-seed via `uv run seed`)
  - Pre-existing diag.spec.ts and w1-gate.spec.ts excluded via per-project testIgnore (top-level testIgnore is overridden, not merged, when a project sets its own)
affects:
  - 10-05 (Wave-3 specs: every spec just imports from seed-helpers and runs — no spec needs to know about uvicorn ports, env vars, or DB state)
  - 10-06 (invite-code-happy-path spec lands in `fresh` project, gets the truncated DB precondition automatically via the `dependencies: ['fresh-setup']` chain)
  - 10-07 (TESTING.md runbook can reference `npm run test:e2e` as the single Wave-2 entry point)

# Tech tracking
tech-stack:
  added: []  # @playwright/test ^1.59.1 was already in devDependencies; no new packages
  patterns:
    - "Per-project testIgnore replaces, not merges with, top-level testIgnore: when a Playwright project sets its own testIgnore, the top-level array is ignored for that project. Pre-existing legacy specs must therefore appear in BOTH places (or only in each per-project array) to stay excluded."
    - "Playwright loads playwright.config.ts via its CommonJS transform pipeline regardless of tsconfig.json `module: \"esnext\"`. ESM-only idioms (`import.meta.url`, `fileURLToPath`) throw `ReferenceError: exports is not defined in ES module scope` at config-load time. Keep config imports CJS-compatible."
    - "fresh-setup → fresh-teardown coupling via `teardown: 'fresh-teardown'` runs the teardown project AFTER all dependents finish, even on failure. The TEST-04 fresh project then declares `dependencies: ['fresh-setup']` so its specs only run after TRUNCATE has landed."
    - "webServer.env is per-server scoped: backend gets ENVIRONMENT=test + DATABASE_URL=DATABASE_URL_TEST + DATABASE_URL_TEST; frontend gets only NEXT_PUBLIC_API_BASE. No cross-pollination of env vars across servers."

key-files:
  created:
    - frontend/playwright.config.ts (replaces a pre-existing 22-line W1-gate stub that targeted https://al-dente-pink.vercel.app)
    - frontend/tests/e2e/fixtures/risotto.jpg
    - frontend/tests/e2e/fixtures/seed-helpers.ts
    - frontend/tests/e2e/globalSetup.fresh.ts
    - frontend/tests/e2e/globalTeardown.fresh.ts
  modified:
    - frontend/package.json (added test:e2e, test:e2e:ui, test:e2e:reset scripts; pre-existing scripts unchanged)

key-decisions:
  - "Replaced the pre-existing W1-gate playwright.config.ts wholesale rather than dual-mode the file. The old config targeted the Vercel-hosted production URL and ran a single `chromium` project; the new harness needs serial workers, multiple projects, and a webServer pair. Keeping both behaviors in one file would have required env-flag conditionals that don't compose cleanly with project dependencies. The legacy diag.spec.ts and w1-gate.spec.ts are kept on disk (untouched git diff) but excluded from the new run via testIgnore — same workspace, two distinct test universes."
  - "Manual-hex JPEG (157 bytes, 1x1 pixel) over PIL/ImageMagick. Neither tool is installed on this machine. The plan's inline hex string was odd-length and unparseable (Rule 3 deviation). Rather than fall back to a 'risotto.jpg' that's actually a PNG or empty file, a hand-built minimal baseline JPEG was assembled from raw markers (SOI / APP0 JFIF / DQT / SOF0 / DHT × 2 / SOS / EOI). `file(1)` reports it as JPEG; first 3 bytes are FF D8 FF; last 2 bytes are FF D9. Storage stub's detect_mime_and_ext sees a valid JPEG."
  - "Per-project testIgnore for legacy specs (Rule 3 fix). Initial config relied on top-level `testIgnore: [/diag\\.spec\\.ts$/, /w1-gate\\.spec\\.ts$/]` to keep the seeded project clean. First `--list` run showed the seeded project picked up BOTH legacy specs. Playwright's behavior: a per-project testIgnore *replaces* the top-level testIgnore for that project. Solution: re-list the legacy regexes inside the seeded project's own testIgnore. Top-level array preserved as a defensive net for any future project that doesn't set its own."
  - "Drop ESM-only imports from playwright.config.ts (Rule 3 fix). Playwright's CJS config loader threw `ReferenceError: exports is not defined in ES module scope` on `fileURLToPath(import.meta.url)`. The reconstruction was unused anyway (no path operations referenced __dirname) — removed the imports. Documented in inline comment so future contributors don't re-add them."

patterns-established:
  - "Single-machine harness pattern: workers=1 + two webServer entries + project dependencies. Couple-scale workload, no parallelism flake budget, deterministic order. The `seeded` project carries the Bearer header in extraHTTPHeaders (D-01); the `fresh` project deliberately omits it to exercise the cookie path through onboarding."
  - "Phase-10 spec-side env contract: SEED_AUTH_TOKEN is the single source of truth (D-10). The frontend harness reads `process.env.SEED_AUTH_TOKEN` directly; no PLAYWRIGHT_AUTH_TOKEN duplicate. seed-helpers.ts re-exports it as a const + a getter so specs have one canonical name to import."

requirements-completed: [TEST-02, TEST-03]

# Metrics
duration: ~5min
completed: 2026-05-08
---

# Phase 10 Plan 04: Playwright Harness Summary

**Two-server / three-project Playwright orchestration: workers=1, webServer pair (uvicorn ENVIRONMENT=test on :8000 + next dev on :3000), seeded project with Bearer extraHTTPHeaders, fresh project chained off fresh-setup (TRUNCATE 6 tables CASCADE) → fresh-teardown (uv run seed). Plus a 157-byte baseline JPEG fixture, a single-source-of-truth seed-helpers.ts, and the truncate/reseed scripts that gate TEST-04.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 2 / 2
- **Files modified:** 6 (5 created, 1 patched — all in scope)

## Accomplishments

- `frontend/playwright.config.ts` shipped (replaces a pre-existing 22-line W1-gate stub):
  - `workers: 1` + `fullyParallel: false` (D-05)
  - Top-level + per-project `testIgnore` for legacy `diag.spec.ts` / `w1-gate.spec.ts`
  - 4 projects: `fresh-setup` (testMatch globalSetup.fresh.ts, teardown=fresh-teardown), `fresh-teardown` (testMatch globalTeardown.fresh.ts), `seeded` (every `*.spec.ts` minus the listed exclusions, with `extraHTTPHeaders.Authorization = 'Bearer ${SEED_AUTH_TOKEN}'`), `fresh` (only invite-code-happy-path.spec.ts, `dependencies: ['fresh-setup']`)
  - 2 webServer entries: backend on :8000 (`uv run uvicorn app.main:app`, `ENVIRONMENT=test`, `DATABASE_URL=DATABASE_URL_TEST`, healthz probe on `/healthz`, 120s timeout), frontend on :3000 (`npm run dev`, `NEXT_PUBLIC_API_BASE=http://localhost:8000`, 180s timeout for Next.js 16 cold-start per Pitfall 1)
- `frontend/package.json` patched: 3 npm scripts added (`test:e2e`, `test:e2e:ui`, `test:e2e:reset`); pre-existing `dev` / `build` / `start` / `lint` unchanged.
- `frontend/tests/e2e/fixtures/risotto.jpg` shipped: 157-byte baseline JPEG, magic `FF D8 FF`, EOI `FF D9`, `file(1)` reports valid JFIF 1.01 1x1.
- `frontend/tests/e2e/fixtures/seed-helpers.ts` shipped (51 lines): `SEED_AUTH_TOKEN`, `PARTNER_AUTH_TOKEN`, `SEEDED_INVITE_CODE`, `SEEDED_HOUSEHOLD_NAME`, `SEEDED_MEMBER_LUCA`, `SEEDED_MEMBER_PARTNER`, `SHORTLIST_RECIPES` (5 titles by computed state, byte-aligned with backend seed), `VOTE_STATE_LABELS` (5 French strings: Validé / Pressenti / Contesté / Rejeté / Sans avis), `SEEDED_LOG_RATINGS` (3 ratings), `getSeedAuthToken()`, `getApiBase()`.
- `frontend/tests/e2e/globalSetup.fresh.ts` shipped: `setup('truncate test DB for invite-code spec', ...)` shells out via `execSync` to `uv run python -c "..."` running TRUNCATE on the 6 tables CASCADE, with an inline `assert "aldente_test" in settings.database_url` guard.
- `frontend/tests/e2e/globalTeardown.fresh.ts` shipped: `teardown('reseed test DB after invite-code spec', ...)` shells out to `uv run seed`.

## Task Commits

1. **Task 1: playwright.config.ts + npm scripts** — `d20d3ab` (feat)
2. **Task 2: fixtures + seed-helpers + fresh-setup/teardown** — `4933309` (feat)

## Files Created/Modified

- `frontend/playwright.config.ts` (REWRITTEN, ~104 lines) — replaces a 22-line W1-gate stub.
- `frontend/package.json` (MODIFIED, +3 scripts) — keeps `dev`/`build`/`start`/`lint` intact.
- `frontend/tests/e2e/fixtures/risotto.jpg` (NEW, 157 bytes) — minimal baseline JPEG.
- `frontend/tests/e2e/fixtures/seed-helpers.ts` (NEW, 51 lines) — single source of truth for spec-side constants.
- `frontend/tests/e2e/globalSetup.fresh.ts` (NEW, 31 lines) — TEST-04 TRUNCATE.
- `frontend/tests/e2e/globalTeardown.fresh.ts` (NEW, 19 lines) — TEST-04 reseed.

## Backend Healthz Endpoint

Confirmed at `backend/app/main.py:100`:

```python
@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Unauthenticated liveness probe used by Railway."""
    return {"status": "ok"}
```

The plan's `webServer[0].url: 'http://localhost:8000/healthz'` matches the existing endpoint verbatim. No alternative path needed; no new endpoint added (would have been product-code scope creep).

## Runtime Acceptance Output

`cd frontend && npx playwright test --list` after both tasks committed:

```
Listing tests:
  [fresh-teardown] › globalTeardown.fresh.ts:8:9 › reseed test DB after invite-code spec
  [fresh-setup] › globalSetup.fresh.ts:11:6 › truncate test DB for invite-code spec
Total: 2 tests in 2 files
```

This confirms:
- `globalSetup.fresh.ts` is matched by the `fresh-setup` project (acceptance criterion).
- `globalTeardown.fresh.ts` is matched by the `fresh-teardown` project.
- The `seeded` project lists 0 tests (no Wave-3 specs shipped yet — expected per the plan).
- Pre-existing `diag.spec.ts` and `w1-gate.spec.ts` are NOT discovered (executor-scope-creep guard).
- `invite-code-happy-path.spec.ts` is referenced by the `fresh` project's testMatch but doesn't exist yet (will land in plan 10-06).

## Risotto.jpg Generation

- **Tools tried:** `convert` (ImageMagick) → not installed; `python3 -c "from PIL import Image"` → ModuleNotFoundError.
- **Fallback used:** Hand-built baseline JPEG from raw JPEG markers in Python.
- **Size:** 157 bytes (between 100-byte and 500_000-byte sanity bounds).
- **Magic bytes:** `FF D8 FF` (verified via `head -c 3 ... | xxd -p`).
- **EOI:** `FF D9` (verified via `tail -c 2 ... | xxd -p`).
- **`file(1)` output:** `JPEG image data, JFIF standard 1.01, resolution (DPI), density 72x72, segment length 16, baseline, precision 8, 1x1, components 1`.

The plan's inline hex string was odd-length (unparseable via `bytes.fromhex`); the manual fallback above is functionally equivalent (real JPEG, JPEG-detection in storage stub still fires).

## Decisions Made

- **Replace the W1-gate playwright.config.ts wholesale** rather than dual-mode it. The old config targeted https://al-dente-pink.vercel.app with a single `chromium` project. The new harness needs serial workers, multi-server orchestration, and project dependencies — incompatible with the legacy shape. The legacy specs stay on disk untouched but are testIgnored by the new config.
- **Manual-hex JPEG over PIL/ImageMagick.** Neither tool is installed; rather than introduce a build-time dependency just to generate a fixture, hand-crafted the baseline JPEG. It's a real JPEG that detect_mime_and_ext recognizes correctly.
- **Re-list legacy regexes in `seeded` project's own testIgnore.** Discovered during the post-edit `--list` smoke test that the top-level testIgnore was being overridden by the per-project testIgnore. The fix duplicates the regexes; both arrays exist as defense-in-depth.
- **Drop ESM-only imports.** Initial config copy from RESEARCH.md included `fileURLToPath(import.meta.url)` — Playwright's CJS loader rejected it. The `__dirname` it produced wasn't used anyway. Inline comment now warns future contributors.

## Deviations from Plan

- **[Rule 3 — Blocking issue] Hand-built JPEG bytes instead of using the plan's hex string.** The plan's fallback hex was odd-length and unparseable via `bytes.fromhex`. PIL/ImageMagick are both unavailable on this machine. Manually wrote a minimal valid baseline JPEG (157 bytes, 1x1 pixel) using raw JPEG markers in Python. File passes the `file(1)` JPEG check and the magic-bytes acceptance criterion.
- **[Rule 3 — Blocking issue] Removed `import.meta.url` / `fileURLToPath` / `path` imports from playwright.config.ts.** Playwright loads configs via its CJS pipeline, so the ESM-only `import.meta.url` threw `ReferenceError: exports is not defined in ES module scope` at config-load time. The reconstructed `__dirname` was unused. Inline comment documents the constraint.
- **[Rule 3 — Blocking issue] Re-listed `diag.spec.ts` / `w1-gate.spec.ts` regexes inside the `seeded` project's own testIgnore.** First `--list` smoke test surfaced that the seeded project was picking up the legacy specs (Playwright per-project testIgnore replaces, does not merge with, the top-level array). Adding the regexes inside the project's own array fixed it. Top-level array preserved as defense-in-depth.

No architectural changes (Rule 4). No product-code refactors. No new dependencies. All 6 in-scope files modified; nothing else touched (executor-scope-creep guard honored).

## Issues Encountered

- **PreToolUse:Edit hook surfaced READ-BEFORE-EDIT reminders 4 times** during the surgical patches to `playwright.config.ts` and `package.json`. Both files had been Read earlier in the session, so each Edit landed cleanly — soft notices, not rejections.
- **`timeout` is not available in this shell** (`zsh: command not found: timeout`). Worked around by relying on the Bash tool's own timeout parameter for the playwright `--list` run.
- **rtk proxy needed for `npx playwright test --list`** — the rtk hook's playwright parser failed (`All parsing tiers failed`) and returned empty output. Switched to `rtk proxy npx playwright test --list` to bypass the parser and see real Playwright output. Both `--list` runs use the proxy.

## Threat Model Coverage

| Threat ID | Status | How |
|-----------|--------|-----|
| T-10-01-derived (TRUNCATE hits prod DB) | mitigated | globalSetup.fresh.ts spawns `uv run python -c "..."` with `ENVIRONMENT=test DATABASE_URL=$DATABASE_URL_TEST`, plus an inline `assert "aldente_test" in settings.database_url` that fires inside the spawned process. Three guards: env var, URL substring, settings substring. |
| Bearer leak in test-runner traces | accepted | Token is the well-known `test-token-luca`. Documented as such; not a real production credential. Will be re-noted in TESTING.md (plan 10-07). |
| webServer env leak across servers | mitigated | Each webServer entry has its own `env: {...}` block. Backend gets `ENVIRONMENT=test + DATABASE_URL + DATABASE_URL_TEST`; frontend gets only `NEXT_PUBLIC_API_BASE`. No cross-pollination — verified against the source. |

## Self-Check: PASSED

- `frontend/playwright.config.ts` exists, ≥ 80 lines, contains `workers: 1`, `name: 'seeded'`, `name: 'fresh'`, `name: 'fresh-setup'`, `Bearer ${SEED_AUTH_TOKEN}`, `ENVIRONMENT: 'test'`: PASS.
- Top-level `testIgnore` includes both `diag\.spec\.ts` and `w1-gate\.spec\.ts`: PASS.
- `frontend/package.json` has `test:e2e`, `test:e2e:ui`, `test:e2e:reset` scripts; pre-existing `dev`/`build`/`start`/`lint` intact (verified via Python JSON parse): PASS.
- `frontend/tests/e2e/fixtures/risotto.jpg` exists, first 3 bytes are `ff d8 ff`, size = 157 bytes (in 100-500_000 bound): PASS.
- `frontend/tests/e2e/fixtures/seed-helpers.ts` contains `SEED_AUTH_TOKEN`, `VOTE_STATE_LABELS`, `Validé`, `Pressenti`, `Contesté`, `Rejeté`, `Sans avis`, `Ragu bolognese`: PASS.
- `frontend/tests/e2e/globalSetup.fresh.ts` contains `TRUNCATE`, all 6 table names, `CASCADE`: PASS.
- `frontend/tests/e2e/globalTeardown.fresh.ts` contains `uv run seed`: PASS.
- `npx playwright test --list` discovers `globalSetup.fresh.ts` under the `fresh-setup` project: PASS.
- `npx playwright test --list` does NOT report `diag.spec.ts` or `w1-gate.spec.ts` under any project: PASS.
- Pre-existing legacy specs untouched: `git diff frontend/tests/e2e/diag.spec.ts frontend/tests/e2e/w1-gate.spec.ts` is empty: PASS.
- Commit `d20d3ab` exists: PASS.
- Commit `4933309` exists: PASS.
- `git diff --name-only HEAD~2..HEAD` returns exactly the 6 in-scope files (no scope creep): PASS.

## Next Plan Readiness

- Plan 10-05 (bulk Wave-3 specs) can land any `*.spec.ts` file under `frontend/tests/e2e/` and the `seeded` project will pick it up, attach the Bearer header, and run it against the populated test DB. No spec needs to know about uvicorn ports, env vars, or DB state.
- Plan 10-06 (`invite-code-happy-path.spec.ts`) can land under `frontend/tests/e2e/` and Playwright will:
  1. Run the `fresh-setup` project first (TRUNCATE 6 tables CASCADE).
  2. Run the spec under the `fresh` project with no Bearer header (real cookie flow).
  3. Run `fresh-teardown` (re-seed) afterward, including on failure.
- Plan 10-07 (TESTING.md) can document `npm run test:e2e` as the single entry point, and `npm run test:e2e:reset` as the docker-volume nuke for full reset.

---
*Phase: 10-e2e-test-infrastructure*
*Plan: 04*
*Completed: 2026-05-08*
