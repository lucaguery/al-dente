---
gsd_state_version: 1.0
milestone: v0.6
milestone_name: Conversation Capture
status: executing
stopped_at: Phase 28 UI-SPEC approved
last_updated: "2026-05-17T11:36:11.972Z"
last_activity: 2026-05-17
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 12
  completed_plans: 12
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13 — v0.6 Conversation Capture milestone started, closes gh#20 via ADR-0001 design)

**Core value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Current focus:** Phase 27 — conversational-capture-screen

## Current Position

Milestone: v0.6 Conversation Capture
Phase: 28
Plan: Not started
Status: Executing Phase 27
Last activity: 2026-05-17

Resume: `/gsd-plan-phase 25` to decompose Phase 25 into plans

Progress: [░░░░░░░░░░] 0/5 phases complete in v0.6 · 6/6 prior milestones shipped

## Performance Metrics

**Velocity (cumulative):**

- Total milestones shipped: 6 (v0.1 → v0.5)
- Total phases shipped: ~32
- Total plans shipped: ~125
- Total requirements validated: 136 (49 v0.1 + 31 v0.2 + 4 v0.2.1 + 16 v0.3 + 24 v0.4 + 12 v0.5)
- v0.5 timeline: 2026-05-12 → 2026-05-13 (~10 hours wall-clock / 2 calendar days, 84 commits, 75 files, +13,491 / −142 lines, 0 critical / 3 warnings / 3 info code review findings)

**By Milestone:**

| Milestone | Phases | Status |
|-----------|--------|--------|
| v0.1 (W1-W4 + 01.1) | 5 | ✅ Complete |
| v0.2 (Phases 5-9) | 5 | ✅ Complete |
| v0.2.1 (Phase 10) | 1 | ✅ Complete |
| v0.3 (Phases 11-14) | 4 | ✅ Complete |
| v0.4 (Phases 15-21) | 7 | ✅ Complete |
| v0.5 (Phases 22-24) | 3 | ✅ Complete (shipped 2026-05-13) |
| v0.6 (Phases 25-29) | 5 | 🚧 In progress — Phase 25 ready to plan |
| Phase 25 P02 | 180 | 3 tasks | 8 files |

## Accumulated Context

### Roadmap Evolution

- v0.6 milestone roadmapped 2026-05-13: 5 phases (25-29), 23 requirements (THREAD × 4 + TURN × 4 + CAPTURE × 4 + DETAIL × 5 + LLM × 4 + MIGRATION × 2). Phases follow the ADR-0001 + gh#20 Phase A→E natural dependency chain: backend foundation → thread API & realtime → capture screen → recipe-detail thread → LLM prompt rework. Coverage 100%; no orphans. Shared chat component built in Phase 27 is mounted (not rebuilt) in Phase 28.
- v0.5 milestone completed 2026-05-13: 3 phases (22-24), 9 plans, 12 requirements (QW × 3 / DECK × 4 / RID × 5). Closed 12 GitHub issues. **Architecture invariant #1 has formally shifted** — quick + full-form captures moved from sync `structured`-on-return to async `BackgroundTask`. v0.6 will further evolve invariant #1 (single `promote_draft(id)` entry point reading from `recipe_turns`).
- v0.4 milestone shipped 2026-05-11: 7 phases (15-21), 27 plans, 24 reqs.
- v0.3 milestone shipped 2026-05-11: 4 phases (11-14), 16 plans, 16 reqs. Audit-only.
- v0.2.1 milestone shipped 2026-05-09: single-phase patch (Phase 10) for E2E test infrastructure.
- v0.2 milestone shipped 2026-05-08: 5 phases (5-9), 31 reqs.
- v0.1 milestone shipped 2026-05-08: 5 phases (1, 01.1, 2-4), 49 reqs.

### Decisions

See PROJECT.md Key Decisions table. v0.6 milestone-level decisions are locked in `Current Milestone: v0.6` + ADR-0001:

- MVP posture authorizes clean `source_capture` drop (no compat shim, single Alembic migration).
- Conflict UX = advisory bubble (option C — informational, manual edit wins by default).
- LLM trigger table locked: `text`/`voice`/`photo`/`url` user turns → Gemini; `answer` → direct + pin; `proposal_accepted`/`proposal_dismissed` → pure state changes.
- One Gemini call per Enregistrer; full thread re-read every run (natural idempotency).
- `promote_draft(recipe_id)` consolidation in Phase 25.
- Invariant #5 satisfied by `recipe_turns` going forward.
- [Phase 25]: promote_draft dispatches on turn.kind (text/voice/photo/url) — single entry point for all five capture surfaces
- [Phase 25]: Photo bytes uploaded to Storage in router (D-08), paths stored in turn payload; BackgroundTask uses download_recipe_photo for re-extraction
- [Phase 25]: ON CONFLICT DO UPDATE on UNIQUE(recipe_id, position) for idempotent seed upserts — migration backfilled with random UUIDs making PK-based merge impossible

### Open Research

Phase 25 may surface schema-level decisions during plan-phase (e.g. exact backfill rule for legacy `source_capture` payloads with edge shapes). No milestone-level research gates remaining — ADR-0001 + REQUIREMENTS.md + the gh#20 issue thread close the design surface.

### Blockers/Concerns

- None blocking. Roadmap is clean and coverage is 100%.
- **Requirement count discrepancy surfaced during roadmapping:** REQUIREMENTS.md header and instructions both state "22 requirements" but the actual count is 23 (THREAD × 4 + TURN × 4 + CAPTURE × 4 + DETAIL × 5 + LLM × 4 + MIGRATION × 2 = 23). The roadmap maps all 23 to phases; no requirement is orphaned. Worth correcting REQUIREMENTS.md header in a quick edit.
- **3 acknowledged warnings carried forward from v0.5 at couple-scale** — WR-01 (idempotent `db.close()` in `retry_promotion`), WR-02 (seed misses Phase 24 fields on 18 of 21 recipes per intended D-16 nudge), WR-03 (BackgroundTask reads `recipe.title` not `source_capture.payload.title`). WR-03 specifically lands inside v0.6 scope — Phase 25's `promote_draft(id)` rewrite + `source_capture` drop will resolve it structurally.
- **15 v0.4 HUMAN-UAT items** remain orthogonal — tracked via `/gsd-audit-uat`.
- **Behavioral validation gate** (≥ 2 weeks daily use by both members, v0.1 definition-of-done) still pending — orthogonal to feature milestones.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260512-df0 | Improve suggestion list layout (slide smoothness, photos, blank states, completion message) | 2026-05-12 | 4937f3e | [260512-df0](./quick/260512-df0-improve-suggestion-list-layout-slide-smo/) |
| 260512-gpl | Swap display font Fraunces → Cormorant Garamond globally; rebuild RecipeCard as vertical 2-col photo-grid | 2026-05-12 | 5441edb | [260512-gpl](./quick/260512-gpl-ui-cormorant-garamond-font-swap-directio/) |
| 260512-l0l | Harmonize typography and spacing across all frontend pages | 2026-05-12 | db3fb44 | [260512-l0l](./quick/260512-l0l-harmonize-typography-and-spacing-across-/) |
| 260512-lif | Follow-up sweep: extend page-rhythm tokens into capture/summary components + onboarding sticky-header register | 2026-05-12 | 665f613 | [260512-lif](./quick/260512-lif-harmonize-capture-tab-summary-components/) |
| fast-19 | Fix Accueil spinner flash on cache hits — `useDelayedFlag(250)` gates both spinner returns in `HomeDecide` | 2026-05-12 | 7a1f39c | gh#19 (closed) |

## Session Continuity

Last activity: 2026-05-13 — v0.6 ROADMAP.md created (5 phases / 23 reqs / coverage 100%)
Stopped at: Phase 28 UI-SPEC approved
Resume file: .planning/phases/28-recipe-detail-thread/28-UI-SPEC.md
Next: `/gsd-plan-phase 25` (Backend foundation — recipe_turns + drop source_capture + promote_draft consolidation + seed update)
