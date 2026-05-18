# Roadmap: Al Dente

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

## Current Milestone

_No active milestone._ v0.7.1 Sober Kitchen Finish shipped on 2026-05-18. Run `/gsd-new-milestone` to scope the next cycle.

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

*Last updated: 2026-05-18 — v0.7.1 Sober Kitchen Finish shipped and archived. 3 phases (34-36), 15 plans, 22/22 requirements validated (LIVE × 6 + ENUM × 4 + SOBER × 8 + POLISH × 4). Closes the 260518-kba walkthrough punch list. Next milestone (v0.8) not yet scoped — run `/gsd-new-milestone` when ready.*
