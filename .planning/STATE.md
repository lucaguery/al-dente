---
gsd_state_version: 1.0
milestone: v0.8
milestone_name: Backend Coverage Until Done
status: planning
last_updated: "2026-05-19T20:31:32.717Z"
last_activity: 2026-05-19
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18 — v0.7.1 Sober Kitchen Finish shipped and archived)

**Core value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Current focus:** Milestone complete

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-19 — Milestone v0.8 started

## Performance Metrics

**Velocity (cumulative through v0.7):**

- Total milestones shipped: 8 (v0.1 → v0.7)
- Total phases shipped: 34
- Total plans shipped: 147
- Total requirements validated: 171 (49 v0.1 + 31 v0.2 + 4 v0.2.1 + 16 v0.3 + 24 v0.4 + 12 v0.5 + 23 v0.6 + 12 v0.7)
- v0.7 timeline: 2026-05-17 → 2026-05-18 (2 calendar days)

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

## Accumulated Context

### Roadmap Evolution

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

See PROJECT.md Key Decisions table for the cumulative log. v0.7 decisions archived in `.planning/milestones/v0.7-ROADMAP.md` and the per-phase context files (test-coverage deferral, « Suggérer » deferral, bug-fix shape, bottom-nav variant discriminator, AGENTS.md deletion override D-12, D-04 verification FAIL fallback).

### Open Research

None — v0.7.1 discovery already captured in the 260518-kba punch list (Playwright walk + accessibility-tree snapshots + screenshots). Plan-phase consumes that artifact directly.

### Blockers/Concerns

- **None blocking.** v0.7.1 milestone scaffolded; awaiting `/gsd-plan-phase 34`.
- **LIVE-02 prod verification is plan step 0** for Phase 34 — if the deployed photo-url handler returns 500 on missing storage objects (not 404), scope expands to backend handler hardening before any UI work.
- **SOBER-09 + LIVE-04 coupling** — if Phase 36 SOBER-09 (first-paint ledger) lands before Phase 34 LIVE-04 (marginalia branch), LIVE-04 is structurally resolved by SOBER-09 and the verification step asserts consistency held; if Phase 34 ships first, LIVE-04 ships the explicit `validéCount === 0` branch guard.
- **SOBER-15 + POLISH-03 deferred to Phase 36 discuss-phase** — Rejeté row visibility and meta-pill icon harmonization are substantive design calls; operator input gates final implementation shape.
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

## Deferred Items

Items acknowledged and deferred at v0.7 milestone close on 2026-05-18:

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
| quick_task | 260508-1ln-fix-audit-gaps-cooking-finalized-handler | missing | Pre-v0.7 (May 8), orphaned tracking. |
| quick_task | 260512-df0-improve-suggestion-list-layout-slide-smo | missing | Pre-v0.7 (May 12, v0.5/v0.6 era), orphaned tracking. |
| quick_task | 260512-gpl-ui-cormorant-garamond-font-swap-directio | missing | Pre-v0.7 (May 12), orphaned tracking. |
| quick_task | 260512-l0l-harmonize-typography-and-spacing-across- | missing | Pre-v0.7 (May 12), orphaned tracking. |
| quick_task | 260512-lif-harmonize-capture-tab-summary-components | missing | Pre-v0.7 (May 12), orphaned tracking. |

UAT and verification gaps are persisted in their `HUMAN-UAT.md` files and surface via `/gsd-audit-uat`. The 9 quick-task entries are pre-v0.7 — the audit reports them as `missing` because tracking files aren't in the expected layout; the underlying work shipped in earlier milestones.

## Session Continuity

Last activity: 2026-05-19 — Completed quick task 260519-uxn: pytest-cov wired into backend; baseline 35.9% line / 6.8% branch captured. Rules-files gap surfaced (auth.py 82.5% — easiest; algorithm.py 17.6% — hardest). Next: scaffold v0.8 milestone (backend coverage) using these numbers.
Stopped at: Baseline coverage captured; ready to scaffold v0.8 milestone via /gsd-new-milestone.
Next: Run /gsd-new-milestone to scope v0.8 — Backend Coverage Until Done; then plan phases A/B/C per session goal (services-branch tests → endpoint-contract tests → migration safety + CI gate).

## Operator Next Steps

- Run `/gsd-execute-phase 34` (or `/gsd:execute-plan 34-03`) to land LIVE-03 — Settings renders both household members
- After Phase 34 closes, advance to `/gsd-plan-phase 35` for the enum sweep
- Review v0.7 HUMAN-UAT carry-forward via `/gsd-audit-uat` (Phase 30 + Phase 32 items need physical-device validation — orthogonal to v0.7.1 scope)
