# Roadmap: Al Dente

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)
- **v0.2** ✅ (2026-05-08) — Polish: Slow Food artisanal identity. Re-themed every surface (capture / decide / cook / onboarding) onto the Phase 5 design system (terracotta + warm-cream + Fraunces italic + paper-grain). Closed 5 W4 UI-REVIEW gaps inline (CAPTURE-11, DECIDE-05, COOK-07/08/11/12) plus the Phase 5 themeColor deferral. NEW PWA identity via Next.js 16 `app/icon.tsx`. UI audit average 22.4/24 across 5 phases (best 23/24). 5 phases, 26 plans, 31 requirements. → [Archive](.planning/milestones/v0.2-ROADMAP.md)
- **v0.2.1** ✅ (2026-05-08 → 2026-05-09) — E2E test infrastructure: one-command synthetic seed (`uv run seed` — 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states, idempotent via uuid5+merge) + committed Playwright suite (14 specs across `seeded` and `fresh` projects, iPhone-shape Chromium viewport with `toBeInViewport()` on critical surfaces) + 4-command bootstrap runbook (`TESTING.md`). 1 phase, 7 plans, 4 requirements. → [Archive](.planning/milestones/v0.2.1-ROADMAP.md)
- **v0.3** ✅ (2026-05-09 → 2026-05-11) — Audit & Uniqueness Foundation. Audit-only milestone — zero new product features, zero product-code drift. 4 milestone-level artifacts in `.planning/v0.3/`: `RUNBOOK.md` (prod synthetic ops at `https://al-dente-pink.vercel.app`, code `DEMO01`), `WALKTHROUGH.md` (1,276 lines, ~64 severity-tagged findings across 14 surfaces, 8 GitHub issues filed #1-#8), `UI-AUDIT.md` (14 surface scores, mean 20.21/24, 5✅/9⚠/0❌), `ASSESSMENT.md` (510 lines, 27 ranked findings across 3 tiers ordered by impact on "feels Al Dente", anti-prescription gate enforced structurally via `check-assessment.sh`). 4 phases, 16 plans, 16 requirements. → [Archive](.planning/milestones/v0.3-ROADMAP.md)
- **v0.4** ✅ (2026-05-11) — Audit Remediation & Identity Polish. Closed both v0.3 Tier 1 invariant breaks (B-3 MEMBER_COUNT + B-4 cook_count idempotency), 4 Tier 2 correctness clusters (capture pipeline, history feature, identity management, validation surfaces), the C-1 token-completeness gap (15 new semantic CSS variables + emerald/member-color migration on 7 audit-cited surfaces), and the v0.2.2 backlog (TZ-01, SEED-01, POLISH-01/02). 6 surfaces flipped ⚠ Mixed → ✅ Feels Al Dente under the SAME 6-pillar rubric; cumulative mean 20.21/24 → 21.71/24 (+1.50). 7 phases, 27 plans, 24 requirements. → [Archive](.planning/milestones/v0.4-ROADMAP.md)

## Current Milestone

**v0.5 — Mixed Sweep**

Close ~10 open GitHub issues across three coherent themes — quick wins, swipe-deck polish, and recipe identity — in a single tight sweep that pays down post-audit backlog without expanding scope.

## Phases

- [x] **Phase 22: Quick wins** — Drop Geist Mono, add version footer, fix French tag labels on deck/detail/inbox (completed 2026-05-12)
- [x] **Phase 23: Deck polish** — Replace OUI/NON overlays with tint, tune swipe thresholds, swap thumb buttons to Heart icons, add tap-to-detail (completed 2026-05-12)
- [ ] **Phase 24: Recipe identity** — BrandIcon component, completeness scorecard + 3 new fields, LLM title rewrite (shifts invariant #1), per-recipe SVG illustration

## Phase Details

### Phase 22: Quick wins
**Goal**: Users experience a lighter, more polished app with no dead-weight font, an identifiable build stamp in Settings, and correct French labels on recipe tags everywhere
**Depends on**: Nothing — all three requirements are independent of each other and of Phase 23/24
**Requirements**: QW-01, QW-02, QW-03
**Success Criteria** (what must be TRUE):
  1. `grep -rn "font-mono\|--font-mono\|Geist_Mono" frontend/` returns zero matches and the invite-code display in the join screen remains visually correct
  2. The bottom of the Settings page shows the running version, short git SHA, and Vercel environment — identifiable per device after a prod deploy
  3. Recipe tags on the shortlist deck card, recipe detail page, and drafts inbox all display French labels (e.g. "Méditerranéen" not "mediterranean") with no hardcoded English strings visible
**Plans**: 3 plans
- [x] 22-01-PLAN.md — Drop Geist Mono font + swap two font-mono call sites to tabular-nums (QW-01 / gh#13)
- [x] 22-02-PLAN.md — Build-time env re-export + VersionFooter component mounted at bottom of /settings (QW-02 / gh#15)
- [x] 22-03-PLAN.md — Wrap cuisine/mood/protein renders on ShortlistCard + recipe detail in useEnumLabels() (QW-03 / gh#21)

### Phase 23: Deck polish
**Goal**: The swipe deck feels deliberate and immersive — subtle tint feedback replaces text overlays, a lively spring snap rewards intentional swipes, Heart icons replace thumbs, and cards open to full detail on tap
**Depends on**: Phase 22 (cosmetically independent; may run immediately after)
**Requirements**: DECK-01, DECK-02, DECK-03, DECK-04
**Success Criteria** (what must be TRUE):
  1. Dragging a shortlist card in either direction shows a full-card color tint (emerald-tinted for yes, destructive-tinted for no) with no OUI/NON text overlay visible anywhere on the card
  2. A casual ~50 px drift snaps the card back cleanly; a deliberate ~150 px drag commits the swipe; a fast flick also commits — no ambiguous in-between state visible on device
  3. The thumb-button row shows a filled emerald Heart for "like" and an outline neutral Heart for "dislike" — no thumbs-up/thumbs-down icons remain anywhere on the deck
  4. Tapping (not dragging) a shortlist card opens `/recipes/[id]` detail; pressing Back returns to the deck with the same card on top; thumb-button taps still vote without navigating
  5. All four behaviors above pass a manual `prefers-reduced-motion` device pass (motion paths disabled; functional paths unchanged)
**Plans**: 1 plan (single atomic plan per D-23 — deviates intentionally from Phase 22 1-req-1-plan pattern since all 4 DECK reqs share files and ship as one coherent user-visible beat)
- [x] 23-01-deck-polish-PLAN.md — Ring overlays replace OUI/NON + swipe threshold retune + filled/outline Heart icons + tap-to-detail (DECK-01..04 / gh#14, gh#16, gh#17, gh#18)
**UI hint**: yes

### Phase 24: Recipe identity
**Goal**: Every recipe acquires a catchy French title, optional difficulty/cook-time/description fields, a completeness nudge when fields are missing, a brand-consistent BrandIcon for empty states, and a small per-recipe SVG illustration in list views
**Depends on**: Phase 23 (BrandIcon RID-01 lands in Wave 1 alongside RID-02 — both pure-frontend / pure-backend with zero shared files; Wave 2 is serial RID-03 → RID-04 → RID-05 because all three touch services/llm.py / _apply_extracted)
**Requirements**: RID-01, RID-02, RID-03, RID-04, RID-05
**Success Criteria** (what must be TRUE):
  1. A `BrandIcon` component exists at `frontend/components/BrandIcon.tsx` and is visible on the onboarding welcome screen and on shortlist/inbox/recipes empty states
  2. A recipe captured via any surface (quick/full/voice/photo) acquires a LLM-rewritten "catchy" French title by the time its status reaches `structured`; the original user-entered title is preserved in `source_capture` JSONB; on rewrite failure the user title is kept unchanged and `promotion_error` is set
  3. `CLAUDE.md` invariant #1 wording is updated in the same plan that ships the title-rewrite `BackgroundTask` to reflect that quick and full-form captures are now async (draft → BackgroundTask rewrite → structured)
  4. Recipes with `computeCompleteness(recipe).percent < 100` display a `CompletenessCard` above the body on `/recipes/[id]`; recipes at 100% show nothing; the chip-links navigate to the edit page with a `?focus=` param that scrolls/focuses the matching input
  5. Recipe list rows in the inbox and recipes library show a small (~40×40) per-recipe SVG illustration; missing or failed illustrations fall back to the `BrandIcon`; no `<script>`, `<foreignObject>`, `<text>`, `<image>`, `<use>`, `<a>`, `<style>`, or `on*=` content survives the server-side sanitizer (unit tests confirm)
**Plans**: 5 plans (Wave 1 parallel: 24-01 + 24-02 / Wave 2 serial: 24-03 → 24-04 → 24-05)
- [ ] 24-01-brand-icon-PLAN.md — BrandIcon component extracted from app/icon.tsx + EmptyState type widen + mount on welcome + 3 empty states (RID-01 / gh#11)
- [ ] 24-02-data-model-PLAN.md — Alembic 0007 + 3 new optional fields + Difficulty enum on both sides + Pydantic / Gemini schema / RecipeForm / detail page (RID-02 / gh#22 Part A)
- [ ] 24-03-completeness-PLAN.md — computeCompleteness() pure helper + CompletenessCard + ?focus= ref-focus on edit page (Suspense-wrapped) (RID-03 / gh#22 Part B)
- [ ] 24-04-title-rewrite-PLAN.md — rewrite_title() + promote_quick_draft / promote_full_draft BackgroundTasks + voice/photo prompt extension + CLAUDE.md invariant #1 shift (RID-04 / gh#10)
- [ ] 24-05-illustration-PLAN.md — Alembic 0008 + svg_sanitizer with allowlist + unit tests + generate_recipe_illustration + 4 BackgroundTask extensions + RecipeIllustration component (RID-05 / gh#12)
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 22. Quick wins | 3/3 | Complete    | 2026-05-12 |
| 23. Deck polish | 1/1 | Complete    | 2026-05-12 |
| 24. Recipe identity | 0/5 | Not started | - |

---
*Last updated: 2026-05-12 — v0.5 Mixed Sweep roadmap created. 3 phases (22–24), 12 requirements mapped (QW × 3 / DECK × 4 / RID × 5). 100% coverage. Phase 24 serial order load-bearing: RID-01 → RID-02 → RID-03 → RID-04 → RID-05. Invariant #1 shift ships inside Phase 24 plan for RID-04.*
