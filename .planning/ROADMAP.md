# Roadmap: Al Dente

_Source-of-truth for milestone history: `.planning/MILESTONES.md` (full narrative). Locked decisions per milestone live in `.planning/PROJECT.md`. This file is the rolled-up navigational index only._

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)
- **v0.2** ✅ (2026-05-08) — Polish: Slow Food artisanal identity. Re-themed every surface (capture / decide / cook / onboarding) onto the Phase 5 design system (terracotta + warm-cream + Fraunces italic + paper-grain). Closed 5 W4 UI-REVIEW gaps inline (CAPTURE-11, DECIDE-05, COOK-07/08/11/12) plus the Phase 5 themeColor deferral. NEW PWA identity via Next.js 16 `app/icon.tsx`. UI audit average 22.4/24 across 5 phases (best 23/24). 5 phases, 26 plans, 31 requirements. → [Archive](.planning/milestones/v0.2-ROADMAP.md)
- **v0.2.1** ✅ (2026-05-08 → 2026-05-09) — E2E test infrastructure: one-command synthetic seed (`uv run seed`) + committed Playwright suite + 4-command bootstrap runbook. 1 phase, 7 plans, 4 requirements. → [Archive](.planning/milestones/v0.2.1-ROADMAP.md)
- **v0.3** ✅ (2026-05-09 → 2026-05-11) — Audit & Uniqueness Foundation. Audit-only milestone — zero new product features. 4 milestone-level artifacts in `.planning/v0.3/`: RUNBOOK, WALKTHROUGH (~64 findings, 8 GitHub issues #1-#8), UI-AUDIT (mean 20.21/24), ASSESSMENT (27 ranked findings across 3 tiers). 4 phases, 16 plans, 16 requirements. → [Archive](.planning/milestones/v0.3-ROADMAP.md)
- **v0.4** ✅ (2026-05-11) — Audit Remediation & Identity Polish. Closed both v0.3 Tier 1 invariant breaks + 4 Tier 2 correctness clusters + C-1 token-completeness gap. Cumulative mean 20.21/24 → 21.71/24. 7 phases, 27 plans, 24 requirements. → [Archive](.planning/milestones/v0.4-ROADMAP.md)
- **v0.5** ✅ (2026-05-12 → 2026-05-13) — Mixed Sweep. Closed 12 GitHub issues across three themes. **Invariant #1 shifted** — quick + full-form captures moved from sync to async BackgroundTask. 3 phases, 9 plans, 12 requirements. → [Archive](.planning/milestones/v0.5-ROADMAP.md)
- **v0.6** ✅ (2026-05-13 → 2026-05-17) — Conversation Capture. Replaced the five tabbed capture surfaces with one durable conversation thread per recipe — `recipe_turns` table added + legacy `source_capture` JSONB dropped in same Alembic migration. **Invariant #1 evolved** (all five capture surfaces converge through `promote_draft`); **invariant #5 satisfied by `recipe_turns`** going forward. 5 phases, 22 plans, 23 requirements. → [Archive](.planning/milestones/v0.6-ROADMAP.md)
- **v0.7** ✅ (2026-05-17 → 2026-05-18) — Sober Kitchen + Polish. Cleared the live-bug backlog, shipped central elevated « Ajouter » CTA, and ported three locked screens to the Sober Kitchen design system per `docs/design-system.html` §15. Root `CLAUDE.md` split into scoped files. 4 phases, 9 plans, 12 requirements. → [Archive](.planning/milestones/v0.7-ROADMAP.md)
- **v0.7.1** ✅ (2026-05-18) — Sober Kitchen Finish. Closed the 260518-kba walkthrough punch list (22/25 findings — 3 deferred to v0.8). Three phases: (34) live-bug sweep — `/cooking-logs` rendering, photo handler 404-on-miss, Settings members, marginalia guard, version bump, `<main>` strip; (35) systemic enum + extraction-leak sweep — `ChipPayload` wire shape + `formatFieldChip` formatter + `useEnumLabels` at card sites + CI grep gate; (36) Sober Kitchen finish — first-paint ledger (Composition A retired dual-mode swipe-deck), muted Rejeté row, BottomNav central CTA elevation, Patine empty-bucket fallback, cookbook gestures, NBSP sweep, push banner relocation. 3 phases, 15 plans, 22 requirements. 7 code-review warnings resolved across 3 review cycles. ShortlistDeck.tsx (~190 LOC) retired per MVP no-shim. → [Archive](.planning/milestones/v0.7.1-ROADMAP.md)

## Current Milestone: v0.8 — Backend Coverage Until Done

**Goal:** Backend has a test suite that catches any regression to a documented architectural invariant, endpoint contract, or business-logic state machine — with line coverage as a sanity floor (≥85% repo, 100% on 4 named rules files), not the target.

**Baseline (quick-260519-uxn, 2026-05-19):** 35.9% line / 6.8% branch · 96 tests failing on missing seed · rules files at 17.6% / 22.0% / 35.5% / 82.5%.

### Phases

- [ ] **Phase 37: Test Infrastructure + Service Branch Coverage** — Unblock 96 failing tests, relocate svg_sanitizer_test, drive 4 rules files to 100% line coverage.
- [x] **Phase 38: Endpoint Contract + Invariant Coverage** — 10 routers × 4-test contract + 8 named invariant regression tests; repo coverage reaches ≥85%. (completed 2026-05-19)
- [ ] **Phase 39: Migration Safety + CI Gate** — Throwaway-DB migration tests for all 11 Alembic revisions; GitHub Actions gate blocks merge on coverage regression.

### Phase Details

### Phase 37: Test Infrastructure + Service Branch Coverage
**Goal**: The test suite runs clean and the 4 named rules files reach 100% line coverage via targeted unit tests.
**Depends on**: Nothing (first phase of v0.8; builds on baseline captured in quick-260519-uxn)
**Requirements**: COV-02, COV-03, COV-04, COV-05, COV-06, COV-07, SERV-01, SERV-02, SERV-03, SERV-04
**Success Criteria** (what must be TRUE):
  1. `pytest --cov=app` exits 0 with 0 failing tests (seed dependency resolved via chosen mechanism — autouse fixture OR test rewrite, decided during discuss-phase)
  2. `app/services/voting.py`, `app/services/algorithm.py`, `app/services/shortlist.py`, and `app/auth.py` each report 100% line coverage in the HTML report
  3. `backend/tests/test_svg_sanitizer.py` exists and passes; `app/services/svg_sanitizer_test.py` is removed from the source tree (coverage no longer counts it as unmeasured source)
  4. Repo-wide line coverage is demonstrably above 60% (intermediate floor; the full 85% lands in Phase 38 once routers are covered)
**Plans**: TBD

### Phase 38: Endpoint Contract + Invariant Coverage
**Goal**: Every router has a verifiable 4-test contract and every CLAUDE.md architecture invariant has a named regression test that goes red on a 1-line violation; repo coverage reaches ≥85%.
**Depends on**: Phase 37 (clean test suite; rules-files baseline at 100%)
**Requirements**: ROUT-01, ROUT-02, ROUT-03, ROUT-04, ROUT-05, ROUT-06, ROUT-07, ROUT-08, ROUT-09, ROUT-10, INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08, COV-01
**Success Criteria** (what must be TRUE):
  1. 10 routers each have a happy-path, 401-on-missing-auth, 404-on-cross-household (NOT 403), and validation-failure test — all green
  2. 8 invariant regression tests exist with names matching the CLAUDE.md invariant they guard; each demonstrably fails when the invariant is broken (verified by local revert + run)
  3. Repo-wide line coverage reaches ≥85% as reported by `coverage report` (the `fail_under = 85` floor is asserted in CI in Phase 39, but the number must be met here)
**Plans**: TBD

### Phase 39: Migration Safety + CI Gate
**Goal**: Every Alembic migration runs upgrade + downgrade clean on a throwaway DB, and GitHub Actions enforces the coverage floors on every PR so regressions can never silently land.
**Depends on**: Phase 38 (≥85% repo coverage achieved; rules-files at 100%)
**Requirements**: MIG-01, MIG-02, CI-01, CI-02
**Success Criteria** (what must be TRUE):
  1. `backend/tests/migrations/` exists with a throwaway-DB fixture; all 11 current Alembic revisions pass `upgrade <rev>` + `downgrade <prev>` on a clean DB
  2. `.github/workflows/backend-tests.yml` runs on every PR: spins up Postgres 16 service container, applies migrations, runs `pytest --cov`, uploads HTML artifact
  3. CI fails the PR build if `coverage report --fail-under=85` fails OR any of the 4 rules files drops below per-file `fail_under = 100` — demonstrated by an intentional 1-line revert in a draft PR producing a red build
**Plans**: 2 plans
  - [ ] 39-01-PLAN.md — Migration safety: throwaway-DB fixture + parametrized upgrade/downgrade test for all 11 Alembic revisions (MIG-01, MIG-02)
  - [ ] 39-02-PLAN.md — CI gate: fail_under=85 in pyproject + per-file rules-files coverage script + GitHub Actions backend-tests workflow + xfail 2 known failures (CI-01, CI-02)

### Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 37. Test Infrastructure + Service Branch Coverage | 0/? | Not started | - |
| 38. Endpoint Contract + Invariant Coverage | 4/4 | Complete   | 2026-05-19 |
| 39. Migration Safety + CI Gate | 0/2 | Planned | - |

---

## Completed Milestone Progress

| Milestone | Phases | Plans | Status | Completed |
|-----------|--------|-------|--------|-----------|
| v0.1 (W1-W4 + 01.1) | 5 | 31 | ✅ Complete | 2026-05-08 |
| v0.2 (Phases 5-9) | 5 | 26 | ✅ Complete | 2026-05-08 |
| v0.2.1 (Phase 10) | 1 | 7 | ✅ Complete | 2026-05-09 |
| v0.3 (Phases 11-14) | 4 | 16 | ✅ Complete | 2026-05-11 |
| v0.4 (Phases 15-21) | 7 | 27 | ✅ Complete | 2026-05-11 |
| v0.5 (Phases 22-24) | 3 | 9 | ✅ Complete | 2026-05-13 |
| v0.6 (Phases 25-29) | 5 | 22 | ✅ Complete | 2026-05-17 |
| v0.7 (Phases 30-33) | 4 | 9 | ✅ Complete | 2026-05-18 |
| v0.7.1 (Phases 34-36) | 3 | 15 | ✅ Complete | 2026-05-18 |

**Cumulative:** 9 milestones shipped · 37 phases shipped · 162 plans shipped.

---

*Last updated: 2026-05-19 — v0.8 Backend Coverage Until Done roadmap created. 3 phases (37-39), 33 requirements mapped. Baseline: 35.9% line / 6.8% branch (quick-260519-uxn). Next: `/gsd:plan-phase 37`.*
