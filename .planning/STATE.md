---
gsd_state_version: 1.0
milestone: v0.2.1
milestone_name: "E2E test infrastructure"
status: shipped
stopped_at: v0.2.1 milestone complete — awaiting next-milestone scope
last_updated: "2026-05-09T02:15:00.000Z"
last_activity: 2026-05-09
progress:
  total_phases: 11
  completed_phases: 11
  total_plans: 64
  completed_plans: 64
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-09 after v0.2.1 milestone)

**Core value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Current focus:** None — v0.2.1 shipped. Awaiting `/gsd-new-milestone` to scope next direction.

## Current Position

Milestone: v0.2.1 (shipped 2026-05-09)
Phase: None (Phase 10 complete)
Status: Awaiting next-milestone scope
Last activity: 2026-05-09

Progress: [██████████] 100% (3 milestones shipped: v0.1 / v0.2 / v0.2.1)

## Performance Metrics

**Velocity (cumulative):**

- Total plans completed: 90 (57 v0.1 + 26 v0.2 + 7 v0.2.1)
- v0.1 timeline: 2026-05-05 → 2026-05-08 (3 days, 50 commits, 283 files, ~70,950 insertions)
- v0.2 timeline: 2026-05-08 (1 day, 26 plans, 31 requirements)
- v0.2.1 timeline: 2026-05-08 → 2026-05-09 (1 phase, 7 plans, 4 requirements, ~9,431 insertions across 56 files)

**By Milestone:**

| Milestone | Phases | Status |
|-----------|--------|--------|
| v0.1 (W1-W4 + 01.1) | 5 | ✅ Complete |
| v0.2 (Phases 5-9) | 5 | ✅ Complete |
| v0.2.1 (Phase 10) | 1 | ✅ Complete |

## Accumulated Context

### Roadmap Evolution

- v0.2.1 milestone shipped 2026-05-09: single-phase patch milestone (Phase 10) for E2E test infrastructure. The runtime verification surfaced 5 real product issues — see milestones/v0.2.1-ROADMAP.md "Surfaced product issues" — none fixed inline (per `feedback_executor_scope_creep`); filed for v0.2.2 follow-up. Bottom-sheet positioning bug filed at https://github.com/lucaguery/al-dente/issues/1.
- v0.2 milestone shipped 2026-05-08: 5 phases (5-9), 31 requirements, Slow Food design system locked.
- v0.1 milestone shipped 2026-05-08: 5 phases (1, 01.1, 2-4), 49 requirements, full PWA loop.
- W4 UI-REVIEW gaps folded inline into screen-group phases per requirement IDs (CAPTURE-11 → Phase 6; DECIDE-05 → Phase 7; COOK-07/08/11/12 → Phase 8). No separate fix phase.
- Phase 01.1 inserted after Phase 1: cookie-auth-and-recovery (URGENT, v0.1). Driver: dual-phone testing showed iOS Safari evicts `localStorage` across PWA force-quit → reopen.
- Album (ALBUM-01/02/03) cut from v0.1 to v2 per 04-CONTEXT.md — not useful enough at couple-scale.

### Decisions

See PROJECT.md Key Decisions table — all 13 v0.1 decisions validated, v0.2 design direction locked, and v0.2.1 test-infrastructure decisions added (Bearer-header auth shortcut + `aldente_auth` storageState cookie for WS upgrades, Docker Postgres on :5433, env-flag stub for Gemini/Storage in test mode, uuid5+merge idempotent seed, iPhone-shape Chromium viewport for mobile-only layout bug detection, `toBeInViewport()` on critical interactive surfaces).

### Surfaced product issues (v0.2.1 → v0.2.2 backlog)

- **TZ-01**: Active-cook filter uses Python local-tz date vs UTC DB date in `cooking_logs.py:72-78,118-126`. Late-evening cooks fall through across UTC offset window.
- **URL-01**: URL extraction is `# TODO(productize)` at `recipes.py:481-490`. Drafts created from URL never promote.
- **CL-01**: GET /cooking-logs (list) endpoint missing — the `/cooking-logs` history page renders but never has data.
- **SEED-01**: Seed cross-day idempotency hole at `cli/seed.py:369,405`. Workaround: `docker compose down -v` between days. Already documented in TESTING.md.
- **WS-01**: WS upgrade reads only cookie / `?token=` — never `Authorization` header. Required Playwright config to set cookie via storageState (already shipped).
- **Sheet-01** ([#1](https://github.com/lucaguery/al-dente/issues/1)): `paper-grain` class on `SheetContent` overrides Tailwind `fixed`, leaving bottom sheets off-screen on iPhone-sized viewports. `capture-photo.spec.ts` "photo upload sheet is reachable" is `test.fixme` until this lands.

### Open Research

None — between milestones.

### Blockers/Concerns

- None blocking. The 6 surfaced product issues above are tracked for v0.2.2 (or whichever follow-up milestone scopes them).

## Session Continuity

Last session: 2026-05-09T02:15:00.000Z
Stopped at: v0.2.1 milestone archived (commit pending)
Resume file: None — between milestones
Next: `/gsd-new-milestone` to scope v0.2.2 (close surfaced product issues + v0.2 deferred polish) or v0.3 (new feature direction). Behavioral validation gate (≥ 2 weeks of daily use by both household members per SPEC.md) is still the implicit gate before broader scope decisions.
