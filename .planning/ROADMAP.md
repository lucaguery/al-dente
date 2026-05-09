# Roadmap: Al Dente

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)
- **v0.2** ✅ (2026-05-08) — Polish: Slow Food artisanal identity. Re-themed every surface (capture / decide / cook / onboarding) onto the Phase 5 design system (terracotta + warm-cream + Fraunces italic + paper-grain). Closed 5 W4 UI-REVIEW gaps inline (CAPTURE-11, DECIDE-05, COOK-07/08/11/12) plus the Phase 5 themeColor deferral. NEW PWA identity via Next.js 16 `app/icon.tsx`. UI audit average 22.4/24 across 5 phases (best 23/24). 5 phases, 26 plans, 31 requirements. → [Archive](.planning/milestones/v0.2-ROADMAP.md)
- **v0.2.1** ✅ (2026-05-08 → 2026-05-09) — E2E test infrastructure: one-command synthetic seed (`uv run seed` — 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states, idempotent via uuid5+merge) + committed Playwright suite (14 specs across `seeded` and `fresh` projects, iPhone-shape Chromium viewport with `toBeInViewport()` on critical surfaces) + 4-command bootstrap runbook (`TESTING.md`). 1 phase, 7 plans, 4 requirements. D-12 regression canary verified end-to-end. Surfaced 5 real product issues for follow-up (timezone bug in `cooking_logs.py`, URL extraction TODO, missing `GET /cooking-logs` list, seed cross-day idempotency hole, sheet-positioning [#1](https://github.com/lucaguery/al-dente/issues/1)). → [Archive](.planning/milestones/v0.2.1-ROADMAP.md)

## Current Milestone

_None — planning next milestone. Run `/gsd-new-milestone` to start._

## Next Steps

- **Behavioral validation gate** per `SPEC.md`: ≥ 2 weeks of daily use by both household members. This is the v0.1 definition of done; still the gate to clear before broader scope decisions.
- **v0.2.2 (optional)** — close the 5 product issues surfaced by Phase 10's runtime verification (see `v0.2.1-ROADMAP.md` archive § "Surfaced product issues") plus the v0.2 deferred polish items (POLISH-01 i18n sweep, POLISH-02 Copy button per `.planning/milestones/v0.2-MILESTONE-AUDIT.md`). The bottom-sheet positioning fix [#1](https://github.com/lucaguery/al-dente/issues/1) is the highest-value item — un-`fixme`s `capture-photo.spec.ts`'s viewport assertion when it lands.
- **v1.0 — productize** — extract decisions for multi-household, OAuth, mobile-app shells, etc.
- **v0.3 — first new feature direction** — TBD via `/gsd-new-milestone` discovery.

---
*Last updated: 2026-05-09 — v0.2.1 milestone archived. ROADMAP collapsed to one-line summary; full phase detail in milestones/v0.2.1-ROADMAP.md.*
