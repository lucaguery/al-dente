---
gsd_state_version: 1.0
milestone: v0.8
milestone_name: Backend Coverage Until Done
status: Phase 39 Plan 01 complete; MIG-01 + MIG-02 closed. Ready for Plan 39-02 (CI gate).
stopped_at: 39-01 committed (c39b367 + 95f31e3). SUMMARY.md written. 11 migration tests: 10 passed, 1 xfailed (0006 intentional non-downgradeable).
last_updated: "2026-05-20T12:00:00.000Z"
last_activity: 2026-05-20 — Phase 39 Plan 01 shipped. 3 files created: tests/migrations/__init__.py, conftest.py (throwaway-DB fixture), test_migration_safety.py (11 parametrized upgrade+downgrade cases). MIG-01 + MIG-02 closed. 0006 xfailed (Postgres ALTER TYPE DROP VALUE unsupported, intentional). Parent suite 521/2 baseline preserved.
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 7
  completed_plans: 8
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-19 — v0.8 Backend Coverage Until Done scaffolded)

**Core value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Current focus:** v0.8 — Backend Coverage Until Done

## Current Position

Phase: 39 (Migration Safety + CI Gate) — **complete**
Plan: 39-02 shipped (06f7975 — floor closure; c164c36 — GHA workflow; 9988b9e — gate script; ba17783 — pyproject fail_under + xfails)
Status: **v0.8 milestone COMPLETE.** All 33 requirements closed; all 6 user-goal items met. Ready for `/gsd-complete-milestone v0.8`.
Last activity: 2026-05-20 — Phase 39 closed. 11 migrations (10 clean upgrade+downgrade, 1 by-design xfail per Postgres `ALTER TYPE DROP VALUE` limit). GHA `backend-tests.yml` with Postgres 16 service + `alembic upgrade head` + seed + `pytest --cov` + per-file rules-files gate (`scripts/check_rules_files_coverage.py`). `fail_under = 85` in `backend/pyproject.toml`. Final repo coverage **85.08%** (540 pass / 3 skip / 3 xfail). Closes gh#28.

Progress: `[x] [x] [x]` — 3/3 phases complete (33/33 requirements closed)

## Performance Metrics

**Velocity (cumulative through v0.7.1):**

- Total milestones shipped: 9 (v0.1 → v0.7.1)
- Total phases shipped: 36
- Total plans shipped: 162
- Total requirements validated: 193 (49 v0.1 + 31 v0.2 + 4 v0.2.1 + 16 v0.3 + 24 v0.4 + 12 v0.5 + 23 v0.6 + 12 v0.7 + 22 v0.7.1)
- v0.7.1 timeline: 2026-05-18 → 2026-05-18 (1 calendar day)

**By Milestone:**

| Milestone | Phases | Status |
|-----------|--------|--------|
| v0.1 (W1-W4 + 01.1) | 5 | ✅ Complete (shipped 2026-05-08) |
| v0.2 (Phases 5-9) | 5 | ✅ Complete (shipped 2026-05-08) |
| v0.2.1 (Phase 10) | 1 | ✅ Complete (shipped 2026-05-09) |
| v0.3 (Phases 11-14) | 4 | ✅ Complete (shipped 2026-05-11) |
| v0.4 (Phases 15-21) | 7 | ✅ Complete (shipped 2026-05-11) |
| v0.5 (Phases 22-24) | 3 | ✅ Complete (shipped 2026-05-13) |
| v0.6 (Phases 25-29) | 5 | ✅ Complete (shipped 2026-05-17) |
| v0.7 (Phases 30-33) | 4 | ✅ Complete (shipped 2026-05-18) |
| v0.7.1 (Phases 34-36) | 3 | ✅ Complete (shipped 2026-05-18) |
| v0.8 (Phases 37-39) | 3 | 🔄 In progress |
| Phase 38 P03 | 25 | 3 tasks | 5 files |

## Accumulated Context

### Roadmap Evolution

- v0.8 milestone scaffolded 2026-05-19: 3 phases (37-39), 33 requirements (COV × 7 + INV × 8 + ROUT × 10 + SERV × 4 + MIG × 2 + CI × 2). Closes gh#28 (test coverage deferred from v0.7). Baseline captured in quick-260519-uxn: 35.9% line / 6.8% branch, 96 tests failing on missing seed, 4 rules files at 17.6–82.5%. **3 locked decisions captured at scaffold time:** seed-dependency fix mechanism (TBD discuss-phase: autouse fixture vs test rewrite), coverage-floor enforcement (`fail_under = 85` + per-file `fail_under = 100` in pyproject.toml asserted in CI), migration-safety pattern (throwaway-DB fixture, separate from txn-rollback fixture).
- v0.7.1 milestone scaffolded 2026-05-18 direct from 260518-kba walkthrough punch list (Route B — no orchestrator): 3 phases (34-36), 22 requirements (LIVE × 6 + ENUM × 4 + SOBER × 8 + POLISH × 4). Patch milestone in v0.2.1 mold — closes the v0.7 contract before v0.8 feature work. **3 locked decisions captured at scaffold time:** SOBER-09 first-paint ledger (vs dual-mode doc update), B-03 two-layer fix (backend ingredient serialization + frontend formatter), LIVE-02 plan-step-0 prod verification gate. **No new architecture-invariant changes expected** — patch milestone closes contract gaps, doesn't restructure.
- v0.7 milestone shipped 2026-05-18: 4 phases (30-33), 9 plans, 12 requirements (BUG × 2 + NAV × 1 + SOBER × 8 + DX × 1). Closes gh#23/24/25/27/29; defers gh#26 (« Suggérer ») to backlog and gh#28 (test coverage) to v0.8. **No new architecture-invariant evolutions** (D-11 explicitly kept invariants #2 and #7 at root, not duplicated to backend/CLAUDE.md). **CLAUDE.md restructure** — root pruned from 114 → 34 lines of guidance; backend/frontend/.planning scoped files load per-subtree; `frontend/AGENTS.md` deleted per the D-12 override (Claude Code is the only AI assistant in active use today, revisit gate: second AI assistant added).
- v0.6 milestone shipped 2026-05-17: 5 phases (25-29), 22 plans, 23 requirements (THREAD × 4 + TURN × 4 + CAPTURE × 4 + DETAIL × 5 + LLM × 4 + MIGRATION × 2). Closes gh#20 per ADR-0001. **Architecture invariant #1 evolved further** — all five capture surfaces now flow through one `promote_draft(recipe_id)` entry point dispatching on first turn's `kind`. **Invariant #5 satisfied by `recipe_turns`** going forward; legacy `source_capture` JSONB retired. **Invariant #4** extended with `turn.created` + `turn.updated` semantics.
- v0.5 milestone shipped 2026-05-13: 3 phases (22-24), 9 plans, 12 requirements (QW × 3 / DECK × 4 / RID × 5). Closed 12 GitHub issues. **Invariant #1 first shift** — quick + full-form captures moved from sync `structured`-on-return to async `BackgroundTask`.
- v0.4 milestone shipped 2026-05-11: 7 phases (15-21), 27 plans, 24 reqs.
- v0.3 milestone shipped 2026-05-11: 4 phases (11-14), 16 plans, 16 reqs. Audit-only.
- v0.2.1 milestone shipped 2026-05-09: single-phase patch (Phase 10) for E2E test infrastructure.
- v0.2 milestone shipped 2026-05-08: 5 phases (5-9), 31 reqs.
- v0.1 milestone shipped 2026-05-08: 5 phases (1, 01.1, 2-4), 49 reqs.

### Decisions

See PROJECT.md Key Decisions table for the cumulative log. v0.7 and v0.7.1 decisions archived in `.planning/milestones/v0.7-ROADMAP.md` and `.planning/milestones/v0.7.1-ROADMAP.md`.

**v0.8 locked decisions (captured at scaffold time):**

| Decision | Choice | Phase |
|----------|--------|-------|
| Seed-dependency fix | TBD during Phase 37 discuss-phase: (a) autouse session-scoped seed fixture OR (b) rewrite 96 tests to insert own data | 37 |
| Coverage-floor enforcement | `fail_under = 85` (repo) + per-file `fail_under = 100` (4 rules files) in `backend/pyproject.toml`; asserted in CI gate | 39 |
| Migration safety pattern | Throwaway-DB fixture in `backend/tests/migrations/conftest.py` — separate from connection-scoped txn rollback fixture | 39 |
| svg_sanitizer_test relocation | Move to `backend/tests/test_svg_sanitizer.py` (proper home) — cleaner than `omit` in pyproject | 37 |
| CI runtime | GitHub Actions with Postgres 16 service container (not docker compose) — native to GHA; matches Railway prod env | 39 |

### Open Research

None. Baseline captured in quick-260519-uxn (2026-05-19). Coverage numbers and failing-test root cause fully characterized.

### Blockers/Concerns

- **Seed dependency TBD (Phase 37 discuss-phase):** 96 tests fail with missing `test-token-luca` seed. Mechanism — autouse fixture (faster, couples tests to global seed) vs test rewrite (cleaner isolation, N×96 surgery) — decided during Phase 37 discuss-phase before any implementation.
- **Per-file `fail_under` syntax:** pytest-cov per-file floor enforcement mechanism needs verification against pyproject.toml `[tool.coverage.report]` section syntax before CI gate is written in Phase 39.
- **HUMAN-UAT backlog carried forward** — Phase 30 (3 items: iPhone PWA self-heal, fresh pictogram render, post-deploy migration heal), Phase 32 (4 items: live Sober Kitchen verification), Phase 29 (4 items: Gemini round-trip, advisory round-trip, defer gate, Playwright suite), Phase 28 (2 items: chip/stepper answer, advisory accept/dismiss), Phase 21 v0.4 era (15 items). All tracked via `/gsd-audit-uat`.
- **3 acknowledged v0.5 warnings:** WR-01 (idempotent `db.close()` in `retry_promotion`), WR-02 (seed misses Phase 24 fields on 18 of 21 recipes per intended D-16 nudge). WR-03 was structurally resolved by v0.6 Phase 25's `source_capture` drop.
- **Behavioral validation gate** (≥ 2 weeks daily use by both members, v0.1 definition-of-done) still pending — orthogonal to feature milestones.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260512-df0 | Improve suggestion list layout (slide smoothness, photos, blank states, completion message) | 2026-05-12 | 4937f3e | [260512-df0](./quick/260512-df0-improve-suggestion-list-layout-slide-smo/) |
| 260512-gpl | Swap display font Fraunces → Cormorant Garamond globally; rebuild RecipeCard as vertical 2-col photo-grid | 2026-05-12 | 5441edb | [260512-gpl](./quick/260512-gpl-ui-cormorant-garamond-font-swap-directio/) |
| 260512-l0l | Harmonize typography and spacing across all frontend pages | 2026-05-12 | db3fb44 | [260512-l0l](./quick/260512-l0l-harmonize-typography-and-spacing-across-/) |
| 260512-lif | Follow-up sweep: extend page-rhythm tokens into capture/summary components + onboarding sticky-header register | 2026-05-12 | 665f613 | [260512-lif](./quick/260512-lif-harmonize-capture-tab-summary-components/) |
| fast-19 | Fix Accueil spinner flash on cache hits — `useDelayedFlag(250)` gates both spinner returns in `HomeDecide` | 2026-05-12 | 7a1f39c | gh#19 (closed) |
| 260518-kba | Playwright MCP walkthrough — observation-only punch list (10 bugs / 7 polish / 8 design-drift) for v0.7 Sober Kitchen triage | 2026-05-18 | e303a6a | [260518-kba](./quick/260518-kba-ui-walkthrough-punch-list/) |
| 260519-ucl | Align CLAUDE.md Invariant 5 + snake_case example with ADR-0001 (graphify drift fix) | 2026-05-19 | d85ecd9 | [260519-ucl](./quick/260519-ucl-align-claude-md-invariant-5-and-snake-ca/) |
| 260519-uxn | Add pytest-cov + capture backend coverage baseline (35.9% line / 6.8% branch; rules-files gap surfaced) | 2026-05-19 | 4e24da6 | [260519-uxn](./quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/) |
| 260520-hpz | Bring back swipe deck on Accueil — Variant A + mono-terracotta palette + feedback layer (sketch 001 winner; supersedes Phase 5 emerald Validé lock via ADR-0003) | 2026-05-20 | 4b3d61b | [260520-hpz](./quick/260520-hpz-bring-back-swipe-deck-on-accueil-variant/) |

## Deferred Items

Items acknowledged and deferred at v0.7.1 milestone close on 2026-05-18:

| Category | Item | Status | Notes |
|----------|------|--------|-------|
| uat_gap | Phase 30 — 30-HUMAN-UAT.md | partial (3 open) | iPhone PWA self-heal · fresh pictogram render · post-deploy migration heal of in-prod ns0 rows. Tracked via /gsd-audit-uat. |
| uat_gap | Phase 32 — 32-HUMAN-UAT.md | partial (4 open) | Live Sober Kitchen UAT items. Tracked via /gsd-audit-uat. |
| verification_gap | Phase 30 — 30-VERIFICATION.md | human_needed | Verifier passed 4/4 must-haves in code; 3 items need physical-device UAT. |
| verification_gap | Phase 32 — 32-VERIFICATION.md | human_needed | Verifier passed 6/6 in code (post_verify_fix 1872d2b closed truth-1/2/3 gaps); 4 items need physical-device UAT. |
| quick_task | 260507-g0k-ui-polish-complet-bug-fix-bottomnav-safe | missing | Pre-v0.7 (May 7), orphaned tracking. |
| quick_task | 260507-hbw-module-level-stale-while-revalidate-cach | missing | Pre-v0.7 (May 7), orphaned tracking. |
| quick_task | 260507-hd0-create-a-beautiful-polished-layout-for-t | missing | Pre-v0.7 (May 7), orphaned tracking. |
| quick_task | 260507-nmi-catch-up-with-what-has-been-done | missing | Pre-v0.7 (May 7), orphaned tracking. |
| quick_task | 260508-1ln-fix-audit-gaps-cooking-finalized-handler | missing | Pre-v0.8 (May 8), orphaned tracking. |
| quick_task | 260512-df0-improve-suggestion-list-layout-slide-smo | missing | Pre-v0.7 (May 12, v0.5/v0.6 era), orphaned tracking. |
| quick_task | 260512-gpl-ui-cormorant-garamond-font-swap-directio | missing | Pre-v0.7 (May 12), orphaned tracking. |
| quick_task | 260512-l0l-harmonize-typography-and-spacing-across- | missing | Pre-v0.7 (May 12), orphaned tracking. |
| quick_task | 260512-lif-harmonize-capture-tab-summary-components | missing | Pre-v0.7 (May 12), orphaned tracking. |

UAT and verification gaps are persisted in their `HUMAN-UAT.md` files and surface via `/gsd-audit-uat`. The 9 quick-task entries are pre-v0.7 — the audit reports them as `missing` because tracking files aren't in the expected layout; the underlying work shipped in earlier milestones.

## Session Continuity

Last activity: 2026-05-20 — Completed quick task 260520-hpz: Bring back swipe deck on Accueil — Variant A + mono-terracotta palette + feedback layer. 7 atomic commits (palette tokens, design-system mirror, ADR-0003, i18n strings, ShortlistDeck restore + HomeDecide rewire, ShortlistProgress + snap-back + thumb echo, toast + partner ripple). Sketch 001 winner shipped; manual UAT pending on iPhone PWA viewport.
Stopped at: 7-task quick complete; SUMMARY at .planning/quick/260520-hpz-bring-back-swipe-deck-on-accueil-variant/260520-hpz-SUMMARY.md.
Next: User UAT walkthrough (see SUMMARY.md "Manual UAT pending"). Follow-ups in SUMMARY: re-record E2E specs against the restored swipe-deck surface; clear pre-existing lint debt (separate quick task).

## Operator Next Steps

- Run `/gsd:plan-phase 37` to define plans for Phase 37 (unblock 96 failing tests + 4 rules files to 100%)
- Key discuss-phase decision for Phase 37: seed-dependency fix mechanism — autouse fixture (a) or test rewrite (b)
- After Phase 37 closes, advance to `/gsd:plan-phase 38` for router + invariant coverage
- After Phase 38 closes, advance to `/gsd:plan-phase 39` for migration safety + CI gate
- Close gh#28 after Phase 39 ships
