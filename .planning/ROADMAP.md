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
- **v0.8** ✅ (2026-05-19 → 2026-05-21) — Backend Coverage Until Done. Test suite catches regression on any documented architectural invariant, endpoint contract, or business-logic state machine. Three phases: (37) autouse seed fixture unblocked 96 failing tests + voting/auth/algorithm/shortlist/llm services to 100% line coverage via `SimpleNamespace` + `AsyncMock` patterns; (38) savepoint-based txn rollback fixture + 10 routers × 4-test contract (happy / 401 / **404-cross-household-NOT-403** / validation) + 16 architecture-invariant regression tests with D-38-03 break-observe-revert proof + 155 gap-closure tests pushed coverage 73.1% → **85.0%** (COV-01 closed); (39) throwaway-DB fixture for all 11 Alembic revisions (10 clean, 1 by-design xfail on migration 0006 `ALTER TYPE DROP VALUE`) + GHA `backend-tests.yml` Postgres 16 service container + `fail_under = 85` repo floor + per-file 100% floor via `scripts/check_rules_files_coverage.py`. Final: 540 pass / 3 skip / 3 xfail, 85.08% repo coverage. Closes gh#28. 3 phases, 9 plans, 33 requirements. → [Archive](.planning/milestones/v0.8-ROADMAP.md)
- **v0.9** ✅ (2026-05-21) — La Grille Completion. Closed the sketch-002 vs implementation gap surfaced 2026-05-21 (8 unimplemented sketch screens + cooking-logs token drift). Three phases: (40) **Pure-frontend restyles** — Profil literal-sketch rewrite + GET /households/{id}/stats endpoint + Onboarding wordmark composition + Library text-only minimal view + `app/loading.tsx` splash + cooking-logs token drift sweep; (41) **Navigation surgery + first backend touch** — dedicated `/recipes/[id]/thread` route + Nouvelle Recette 5-option picker + `/recipes/new/[surface]` pre-seeded thread + 3-button `ShortlistThumbButtons` (X/RotateCcw/Heart) + `DELETE /votes/{vote_id}` endpoint with veto-window 409 guard + `vote.deleted` broadcast (invariant #2 preserved via DELETE semantics, no state column); (42) **Structured steps + active cooking session** — Alembic 0013 ALTERs `recipes.steps` to `NOT NULL DEFAULT '[]'::jsonb` + UPDATE backfill, Gemini prompt-schema extended with structured `steps: list[StepEntry]`, NEW `POST /recipes/{id}/extract-steps` endpoint + `extract_and_persist_steps` BackgroundTask, NEW `app/cooking-logs/[id]/active/page.tsx` route with progress segments + step navigator + finalize CTA. 3 phases, 14 plans, 19/19 active requirements (SPLA-02 deferred per Phase 40 D-09 — iOS apple-touch-startup-image matrix). → [Archive](.planning/milestones/v0.9-ROADMAP.md)

## Current Milestone: _(none — awaiting next milestone)_

Run `/gsd-new-milestone` to scaffold the next milestone. La Grille Completion shipped; the visual + interaction contract of sketch 002 is now in full alignment with production.

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
| v0.8 (Phases 37-39) | 3 | 9 | ✅ Complete | 2026-05-21 |
| v0.9 (Phases 40-42) | 3 | 14 | ✅ Complete | 2026-05-21 |

**Cumulative:** 11 milestones shipped · 43 phases shipped · 185 plans shipped.

---

*Last updated: 2026-05-21 — v0.9 La Grille Completion shipped (3 phases, 14 plans, 19/19 active requirements; SPLA-02 deferred per Phase 40 D-09). Closes the sketch-002 vs implementation gap. Next: `/gsd-new-milestone` when next scope emerges.*
