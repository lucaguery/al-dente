---
gsd_state_version: 1.0
milestone: v0.7
milestone_name: Sober Kitchen + Polish
status: executing
stopped_at: Phase 33 context gathered
last_updated: "2026-05-18T12:42:19.761Z"
last_activity: 2026-05-18 -- Phase 33 planning complete
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 8
  completed_plans: 7
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-17 — v0.7 Sober Kitchen + Polish milestone opened via `/gsd-new-milestone`)

**Core value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Current focus:** Phase 33 — CLAUDE.md split (DX-01)

## Current Position

Milestone: v0.7 Sober Kitchen + Polish
Phase: 33 of 33
Plan: 1 of 1 — 33-01 (CLAUDE.md split + AGENTS.md override + locked-artifact edits + 9 grep gates)
Status: Ready to execute
Last activity: 2026-05-18 -- Phase 33 planning complete

Resume: `/gsd-execute-phase 33 ${GSD_WS}`

Progress: 3/4 phases complete (Phases 30, 31, 32 shipped — Phase 31 progress tool-undercounted because it lacks a phase dir)

## Performance Metrics

**Velocity (cumulative through v0.6):**

- Total milestones shipped: 7 (v0.1 → v0.6)
- Total phases shipped: 30
- Total plans shipped: 138
- Total requirements validated: 159 (49 v0.1 + 31 v0.2 + 4 v0.2.1 + 16 v0.3 + 24 v0.4 + 12 v0.5 + 23 v0.6)
- v0.6 timeline: 2026-05-13 → 2026-05-17 (5 calendar days, 143 commits, 34 `feat`, 139 files, +37,649 / −2,141 lines)

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
| v0.7 (Phases 30-33) | 4 | 🚧 In Progress |
| Phase 32 P32-03 | 6 | 2 tasks | 3 files |
| Phase 32 P04 | 8 | 3 tasks | 6 files |
| Phase 32 P05 | 11 | 2 tasks | 2 files |

## Accumulated Context

### Roadmap Evolution

- v0.7 roadmap written 2026-05-17: 4 phases (30-33), 12 requirements (BUG × 2 + NAV × 1 + SOBER × 8 + DX × 1). Phase shape locked during `/gsd-new-milestone`. Granularity: coarse.
- v0.7 milestone opened 2026-05-17 from the 8 open GitHub issues. Scope: bug sweep (gh#23, gh#24) → bottom-nav restructure (gh#25) → Sober Kitchen port (gh#29 — `docs/design-system.html` §15 A→E) → CLAUDE.md split (gh#27). Deferred: gh#28 (test coverage → v0.8, after visual contract locks); gh#26 (« Suggérer » tab → backlog, needs product design first). gh#20 to be closed (shipped in v0.6).
- v0.6 milestone shipped 2026-05-17: 5 phases (25-29), 22 plans, 23 requirements (THREAD × 4 + TURN × 4 + CAPTURE × 4 + DETAIL × 5 + LLM × 4 + MIGRATION × 2). Closes gh#20 per ADR-0001. **Architecture invariant #1 evolved further** — all five capture surfaces now flow through one `promote_draft(recipe_id)` entry point dispatching on first turn's `kind`. **Invariant #5 satisfied by `recipe_turns`** going forward; legacy `source_capture` JSONB retired. **Invariant #4** extended with `turn.created` + `turn.updated` semantics.
- v0.5 milestone shipped 2026-05-13: 3 phases (22-24), 9 plans, 12 requirements (QW × 3 / DECK × 4 / RID × 5). Closed 12 GitHub issues. **Invariant #1 first shift** — quick + full-form captures moved from sync `structured`-on-return to async `BackgroundTask`.
- v0.4 milestone shipped 2026-05-11: 7 phases (15-21), 27 plans, 24 reqs.
- v0.3 milestone shipped 2026-05-11: 4 phases (11-14), 16 plans, 16 reqs. Audit-only.
- v0.2.1 milestone shipped 2026-05-09: single-phase patch (Phase 10) for E2E test infrastructure.
- v0.2 milestone shipped 2026-05-08: 5 phases (5-9), 31 reqs.
- v0.1 milestone shipped 2026-05-08: 5 phases (1, 01.1, 2-4), 49 reqs.

### Decisions

See PROJECT.md Key Decisions table for the cumulative log. v0.7 milestone-level decisions live in the Current Milestone block in PROJECT.md (test-coverage deferral, « Suggérer » deferral, bug-fix shape, bottom-nav variant discriminator, CLAUDE.md / AGENTS.md coexistence).

- [Phase 32]: VoteSummary redesigned in place (Choice 1) — single HomeDecide consumer, props interface preserved
- [Phase 32]: home.hero_question + nav.home keys reused for Accueil A header — no new heading key needed
- [Phase 32]: PatinaSection/PatinaView defined as file-scoped functions outside RecipesPage to avoid re-creation on render
- [Phase 32]: Grid breakpoints: 2-col mobile → 3-col @md (skip 4-col @lg — iPhone PWA is primary)
- [Phase 32]: List-view marginalia omitted for Phase 32 — no per-row data source wired; deferred to 32-05
- [Phase 32]: fetchCookingLogs HIST-01 reused for step-1 marginalia; no new backend endpoint (D-08)
- [Phase 32]: handleStartCooking wired via postStartCooking (mirrors HomeDecide pattern); existing ingredient qty/step numeral pattern in terracotta

### Open Research

None — v0.7 is bugs + design port + DX, no new domain ecosystem requiring research. The design contract is already locked in `docs/design-system.html` §15.

### Blockers/Concerns

- **None blocking.** v0.7 ready to discuss Phase 33 (CLAUDE.md split — pure docs restructure, DX-01 only).
- **Phase 32 HUMAN-UAT items** persisted in `.planning/phases/32-port-locked-screens-to-sober-kitchen/32-HUMAN-UAT.md` — tracked via `/gsd-audit-uat`.
- **4 v0.6 Phase 29 HUMAN-UAT items** carried forward — Gemini round-trip, advisory round-trip, defer gate, Playwright suite. Tracked via `/gsd-audit-uat`.
- **2 v0.6 Phase 28 HUMAN-UAT items** carried forward — chip/stepper answer + advisory accept/dismiss (both depend on the Phase 29 LLM emissions landing in live use).
- **15 v0.4 HUMAN-UAT items** remain orthogonal — tracked via `/gsd-audit-uat`.
- **3 acknowledged v0.5 warnings:** WR-01 (idempotent `db.close()` in `retry_promotion`), WR-02 (seed misses Phase 24 fields on 18 of 21 recipes per intended D-16 nudge). WR-03 from v0.5 was structurally resolved by v0.6 Phase 25's `source_capture` drop.
- **Behavioral validation gate** (≥ 2 weeks daily use by both members, v0.1 definition-of-done) still pending — orthogonal to feature milestones.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260512-df0 | Improve suggestion list layout (slide smoothness, photos, blank states, completion message) | 2026-05-12 | 4937f3e | [260512-df0](./quick/260512-df0-improve-suggestion-list-layout-slide-smo/) |
| 260512-gpl | Swap display font Fraunces → Cormorant Garamond globally; rebuild RecipeCard as vertical 2-col photo-grid | 2026-05-12 | 5441edb | [260512-gpl](./quick/260512-gpl-ui-cormorant-garamond-font-swap-directio/) |
| 260512-l0l | Harmonize typography and spacing across all frontend pages | 2026-05-12 | db3fb44 | [260512-l0l](./quick/260512-l0l-harmonize-typography-and-spacing-across-/) |
| 260512-lif | Follow-up sweep: extend page-rhythm tokens into capture/summary components + onboarding sticky-header register | 2026-05-12 | 665f613 | [260512-lif](./quick/260512-lif-harmonize-capture-tab-summary-components/) |
| fast-19 | Fix Accueil spinner flash on cache hits — `useDelayedFlag(250)` gates both spinner returns in `HomeDecide` | 2026-05-12 | 7a1f39c | gh#19 (closed) |
| 260518-kba | Playwright MCP walkthrough — observation-only punch list (10 bugs / 7 polish / 8 design-drift) for v0.7 Sober Kitchen triage | 2026-05-18 | _pending_ | [260518-kba](./quick/260518-kba-ui-walkthrough-punch-list/) |

## Session Continuity

Last activity: 2026-05-18 — Phase 33 planned (`6f1195f`); single atomic plan 33-01 with 8 tasks. Coverage gates green (DX-01 + 6/6 trackable decisions). D-02/03/09/14 marked `[informational]` (rejected-option annotations).
Stopped at: Phase 33 plan committed; ready to execute
Resume file: .planning/phases/33-claude-md-split/33-01-PLAN.md
Next: `/gsd-execute-phase 33 ${GSD_WS}`
