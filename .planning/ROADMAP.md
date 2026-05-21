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

---

## Current Milestone: v0.9 La Grille Completion

**Milestone Goal:** Close the 8 unimplemented sketch screens from sketch 002 (`.claude/skills/sketch-findings-al-dente/sources/002-refresh-direction-explorations/index.html`) plus the `app/cooking-logs/[id]/page.tsx` token drift, bringing production into full alignment with [ADR-0004](docs/adr/0004-modern-sober-refresh.md) La Grille · Soft warmth. Ships risk-graduated: pure-frontend first, navigation surgery + first backend touch second, new data model + active cooking session last.

**Requirements source:** `.planning/REQUIREMENTS.md` (19 v1 requirements across 9 categories)

### Phases

- [x] **Phase 40: Pure-Frontend Restyles** - Bring Profil, Onboarding, Library text-only, Splash, and cooking-logs detail into full La Grille · Soft warmth alignment — no schema or API changes. (completed 2026-05-21)
- [ ] **Phase 41: Navigation Surgery + First Backend Touch** - Dedicated recipe thread route, Nouvelle Recette route-level chooser, and deck undo button (UI + `DELETE /votes/{id}` + veto-window guard).
- [ ] **Phase 42: Structured Steps + Active Cooking Session** - `recipes.steps` JSONB migration, Gemini prompt update, lazy backfill, and new `/cooking-logs/[id]/active` step-by-step cooking route.

### Phase Details

### Phase 40: Pure-Frontend Restyles
**Goal**: Five frontend surfaces (Profil page, Onboarding welcome, Library text-only view, Splash screen, cooking-logs detail token drift) render in full La Grille · Soft warmth alignment per ADR-0004 — Geist type stack, `#FAFAF7` off-white surface, `#A8523C` terracotta accent, hairline borders, numbered indices, no Cards, no paper-grain, no Fraunces/Cormorant/Caveat.
**Depends on**: Nothing (first phase of v0.9; the existing globals.css La Grille token surface is the build baseline)
**Requirements**: PROF-01, ONBO-01, LIB-01, SPLA-01, SPLA-02, DRIFT-01
**Success Criteria** (what must be TRUE):
  1. `/settings` renders a Profil page with "Profil" hero, numbered hairline rows 01-05, and a stats block (recettes / cuisinées / votes) — no Card component is present anywhere on the page.
  2. `/onboarding/welcome` renders wordmark-centric with centered "Al Dente." wordmark, italic-emphasis tagline, sub-tagline, primary filled-dark + ghost hairline button pair, and footer marketing line — no Card component is present.
  3. The Library view switcher offers a third "text-only" mode: pure numbered rows (index + name + meta + tag pill, no photo column); the user's selection persists after app reload.
  4. `app/loading.tsx` renders the La Grille splash composition (table-à-manger logo, wordmark, tagline, 3-dot loader, version footer) on Next.js navigation loads; iOS PWA boot shows a matching `apple-touch-startup-image` on "Add to Home Screen" launch.
  5. `app/cooking-logs/[id]/page.tsx` contains no reference to Fraunces italic, `bg-surface-rose-100`, or `bg-[var(--color-valide-tint)]`; all visual tokens are La Grille set tokens from `frontend/app/globals.css`.
**Plans**:
  - 40-01: Stats backend endpoint + Profil page rewrite (PROF-01)
  - 40-02: Onboarding welcome rewrite (ONBO-01)
  - 40-03: Library text-only mode (LIB-01)
  - 40-04: Splash loading.tsx (SPLA-01; SPLA-02 deferred per D-09)
  - 40-05: cooking-logs DRIFT sweep (DRIFT-01)
**UI hint**: yes

### Phase 41: Navigation Surgery + First Backend Touch
**Goal**: The recipe thread lives at its own dedicated route; capturing a new recipe starts with a numbered 5-option route-level chooser; the shortlist deck exposes an undo button that removes the most-recent vote (refused when the veto window has closed). Architecture invariant #2 (voting state computed from rows) is preserved via DELETE semantics.
**Depends on**: Phase 40 (token surface is consistent; these pages' styling is already settled before surgery begins)
**Requirements**: THRD-01, THRD-02, PICK-01, PICK-02, UNDO-01, UNDO-02, UNDO-03
**Success Criteria** (what must be TRUE):
  1. Navigating to `/recipes/[id]` shows the structured recipe view without an inline thread; a "N tours" pin in the `det-top` area taps through to `/recipes/[id]/thread` which renders the full conversation — and a back-arrow returns to the structured view.
  2. Tapping "Ajouter" opens `/recipes/new` as a numbered 5-option picker (Note rapide / Formulaire / Voix / Photo / Lien); tapping any option mounts the thread composer at `/recipes/new/[surface]` pre-seeded for that capture mode.
  3. The shortlist deck card shows three buttons (X / RotateCcw / Heart); the middle button is enabled only when the current member has a vote on the front card, and tapping it removes that vote and returns the card to "unvoted" state.
  4. When the veto window is closed (a CookingLog exists for that shortlist date), the undo button is disabled and shows the tooltip "vote verrouillé — décision déjà cuisinée"; `DELETE /votes/{id}` returns 409 Conflict in this case.
  5. After a successful undo, all connected household clients recompute vote state via the existing `vote.deleted` WebSocket broadcast — no stale state persists across devices.
**Plans**: TBD
**UI hint**: yes

### Phase 42: Structured Steps + Active Cooking Session
**Goal**: Every recipe can carry structured cooking steps (`recipes.steps` JSONB); new captures populate steps via an updated Gemini prompt; existing recipes get steps lazily on first `/active` visit; a new route `app/cooking-logs/[id]/active/page.tsx` presents a step-by-step cooking session with progress segments, ingredient cross-references, and a "Terminé · marquer cuisinée" CTA that wires to the existing finalization flow.
**Depends on**: Phase 41 (frontend surfaces stable; backend pattern for new endpoints established)
**Requirements**: STEP-01, STEP-02, STEP-03, ACTV-01, ACTV-02, ACTV-03
**Success Criteria** (what must be TRUE):
  1. A newly-promoted recipe contains a `steps` field (array of `{text, ingredient_refs}`) populated by Gemini; the Alembic migration is non-destructive (existing rows keep `steps = NULL`).
  2. Visiting `/cooking-logs/[id]/active` for a recipe with `steps IS NULL` triggers a lazy Gemini re-extraction, persists the result, and broadcasts `recipe.updated` — on a second visit the steps are immediately present without re-extraction.
  3. The active session page renders: `det-top` with X close + start-time crumb + "étape N/M" pin; progress segments (current colored, prior filled, future hollow); current step text; ingredient reference line.
  4. Tapping the prev/next buttons advances or retreats the local step index without a server roundtrip; reaching the last step reveals the "Terminé · marquer cuisinée" CTA.
  5. Tapping "Terminé · marquer cuisinée" routes to `/cooking-logs/[id]/finalize` — no new finalization API is introduced.
**Plans**: TBD
**UI hint**: yes

---

### v0.9 Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 40. Pure-Frontend Restyles | 5/5 | Complete   | 2026-05-21 |
| 41. Navigation Surgery + First Backend Touch | 0/TBD | Not started | - |
| 42. Structured Steps + Active Cooking Session | 0/TBD | Not started | - |

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
| v0.9 (Phases 40-42) | 3 | TBD | 🚧 In progress | - |

**Cumulative:** 10 milestones shipped · 40 phases shipped · 171 plans shipped.

---

*Last updated: 2026-05-21 — v0.9 La Grille Completion roadmap scaffolded (3 phases, 19 requirements: PROF-01, ONBO-01, LIB-01, SPLA-01, SPLA-02, DRIFT-01, THRD-01, THRD-02, PICK-01, PICK-02, UNDO-01, UNDO-02, UNDO-03, STEP-01, STEP-02, STEP-03, ACTV-01, ACTV-02, ACTV-03). Next: `/gsd:plan-phase 40`.*
