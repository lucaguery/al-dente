# Roadmap: Al Dente

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)

## Current Milestone

### v0.2 — Polish: Slow Food artisanal identity

**Goal:** Re-theme every screen of Al Dente to deliver a coherent Slow Food artisanal identity (warm, intimate, restrained Italian heritage) that demonstrably satisfies the four design principles: Design Quality, Originality, Craft, Functionality.

**Source of design decisions:** `.planning/notes/v0.2-design-direction.md`
**Granularity:** coarse · **Total requirements:** 31 across 5 categories
**Phase numbering:** continues from v0.1 (Phase 4 was last shipped); v0.2 starts at Phase 5.
**UI workflow:** every phase uses `/gsd-ui-phase` to generate the UI-SPEC contract first, then `/gsd-plan-phase` for execution planning.

## Phases

- [x] **Phase 5: Design system foundation** — Tokens, typography pairing, paper-grain anchor, warm shadows, motion language, and re-themed base shadcn primitives in `components/ui/*` (completed 2026-05-08)
- [x] **Phase 6: Capture surfaces polish** — Re-theme all 5 capture entrypoints (quick / full / voice / photo / URL) + drafts inbox, close `CAPTURE-11` W4 gap inline (completed 2026-05-08)
- [x] **Phase 7: Decide polish** — Re-theme daily shortlist, swipe deck, vote chips (5 computed states), "Tu décides" delegation, cold-start state; close `DECIDE-05` W4 gap inline (completed 2026-05-08)
- [ ] **Phase 8: Cook polish** — Re-theme recipe detail, library, cooking log history, cooking banner + finalize flow; close `COOK-07/08/11/12` W4 gaps inline
- [ ] **Phase 9: Onboarding + identity polish** — Re-theme household create/join, settings, BottomNav, PWA manifest icon + splash

## Phase Details

### Phase 5: Design system foundation
**Goal:** Establish the Slow Food artisanal token system that every subsequent phase consumes — typography pairing, color palette, paper-grain anchor, warm shadows, motion language, and re-themed base shadcn primitives.
**Depends on:** Nothing (foundation phase)
**Requirements:** DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, DESIGN-05, DESIGN-06, DESIGN-07, DESIGN-08
**Success Criteria** (what must be TRUE):
  1. User opens the app and the surfaces no longer read as rose `#F43F5E` + slate — terracotta primary + warm cream/ink/warm-gray neutrals are visible across whatever screens consume `bg-background`, `bg-card`, `text-primary`, etc., even before per-screen polish lands
  2. User sees a distinctive display serif + body sans pairing render French diacritics (à, é, è, ê, ç, œ) crisply on iOS Safari at PWA-compressed sizes — Geist-alone / Geist+Inter is no longer present
  3. User sees a subtle paper-grain texture on every card surface in the app (recipe cards, sheets, dialogs) but not on full-page backgrounds, buttons, or chrome
  4. User sees warm shadows underneath cards that read as paper-on-wood rather than the previous cool floating box-shadow
  5. Every shadcn primitive in `components/ui/*` (Button, Input, Textarea, Card, Dialog, Sheet, Toast, Skeleton) reflects the new tokens automatically — no unmodified shadcn defaults remain anywhere in the app
**Plans:** 6/6 plans complete
- [x] 05-01-PLAN.md — Migrate globals.css tokens (terracotta + warm neutrals + warm shadows + motion CSS tokens + paper-grain utility)
- [x] 05-02-PLAN.md — Create paper-grain SVG asset at frontend/public/textures/paper-grain.svg
- [x] 05-03-PLAN.md — Replace fonts in layout.tsx (Fraunces + IBM Plex Sans + Geist Mono) + rewrite type-scale utilities
- [x] 05-04-PLAN.md — Create frontend/lib/motion.ts with framer-motion presets (easeCraft, durations, transitions, variants)
- [x] 05-05-PLAN.md — Re-theme all 15 shadcn primitives in components/ui/* (paper-grain on surfaces, warm shadows, ease-craft transitions, terracotta tab indicator)
- [x] 05-06-PLAN.md — Create temporary /styleguide acceptance gate route + visual smoke-test checkpoint
**UI hint:** yes

### Phase 6: Capture surfaces polish
**Goal:** Bring every capture entrypoint and the drafts inbox into the new design system, while folding in the W4 PhotoUploader tap-target gap.
**Depends on:** Phase 5
**Requirements:** CAPTURE-08, CAPTURE-09, CAPTURE-10, CAPTURE-11, CAPTURE-12, CAPTURE-13
**Success Criteria** (what must be TRUE):
  1. User opens any of the 5 capture surfaces (quick-add, full-form, voice, photo, URL) and sees a coherent capture experience using the Phase 5 tokens — typography, terracotta primary, paper-grain card surfaces, warm shadows
  2. User taps the PhotoUploader sheet's `Caméra` and `Photothèque` action buttons and they meet the 48px (h-12) tap-target floor — closing the W4 UI-REVIEW gap
  3. User sees the D-Voice deviation copy ("Tu peux dicter avec le micro du clavier.") preserved on the voice capture surface — no in-app Web Speech regression
  4. User sees recipes in the drafts inbox visually distinguish `draft` vs `structured` status and visibly transition when `recipe.created` / `recipe.promoted` realtime events arrive
  5. The four design principles (Design Quality, Originality, Craft, Functionality) are demonstrable on every capture surface and `/gsd-ui-review` can score each pillar against this phase's UI-SPEC
**Plans:** 6/6 plans complete
**UI hint:** yes

### Phase 7: Decide polish
**Goal:** Re-theme the daily decision flow — shortlist, swipe deck, vote chips, delegation, cold-start — and reconcile the `--color-validé-tint` token naming, while closing the ColdStartChip W4 tap-target gap.
**Depends on:** Phase 5 (parallelizable with Phases 6, 8, 9)
**Requirements:** DECIDE-01, DECIDE-02, DECIDE-03, DECIDE-04, DECIDE-05
**Success Criteria** (what must be TRUE):
  1. User sees the daily shortlist screen rendered with Phase 5 tokens — terracotta accents, cream surfaces, warm-gray secondary chrome, paper-grain on recipe cards
  2. User swipes a recipe in the framer-motion deck and the gesture uses the new motion language (one curve, paper-physics feel) and respects `prefers-reduced-motion`
  3. User sees the 5 vote-chip states (Validé / Pressenti / Contesté / Rejeté / Sans avis) presented with reconciled token naming — spec, CSS variable, and component class all agree on a single name
  4. User opens the "Tu décides" delegation surface and the affordance reads as deliberate, not stock shadcn
  5. User sees a polished cold-start / empty-shortlist state and the ColdStartChip dismiss button now meets the 48px (h-12) tap-target floor
**Plans:** 4/4 plans complete
- [x] 07-01-PLAN.md — DECIDE-03 token comment lock + DECIDE-05 ColdStartChip retheme + h-12 dismiss
- [x] 07-02-PLAN.md — DECIDE-02 springSnap motion preset + ShortlistCard paper-grain + rounded-t photo + springSnap consumer
- [x] 07-03-PLAN.md — DECIDE-03 5-state pill chips (chipClass helper) + DECIDE-04 Tu-décides paper-grain delegation Card + h-12 regenerate
- [x] 07-04-PLAN.md — DECIDE-01 HomeDecide Fraunces-italic display-serif date header (Intl.DateTimeFormat fr-FR)
**UI hint:** yes

### Phase 8: Cook polish
**Goal:** Re-theme the cook-time loop — recipe detail, library/list, cooking-log history, cooking banner, and finalize flow — and fold in the four W4 UI-REVIEW gaps that live on these surfaces.
**Depends on:** Phase 5 (parallelizable with Phases 6, 7, 9)
**Requirements:** COOK-06, COOK-07, COOK-08, COOK-09, COOK-10, COOK-11, COOK-12
**Success Criteria** (what must be TRUE):
  1. User opens any recipe and sees the detail screen (hero, ingredients, instructions, metadata), the recipe library/list, and the cooking-log history all rendered with Phase 5 tokens — coherent with capture and decide surfaces
  2. User sees the CookingBanner re-themed with `Finaliser` rendered via `<Button asChild>` (not raw `<a>` with hand-rolled classes) and both `Finaliser` and `Passer` meet the 48px (h-12) tap-target floor
  3. User taps a RatingPicker card on the finalize screen and the press feedback eases over 100ms (`transition-transform duration-100`) instead of snapping instantly
  4. User attempts to finalize a cooking log while offline and sees the `cooking_log.finalize.offline` toast (`Hors ligne. Réessaie une fois connecté.`) instead of the generic `save_failed` message — guarded by `navigator.onLine` in the submit handler
  5. User sees the recipe subhead on the finalize screen rendered through the `cooking_log.finalize.recipe_subhead` ICU key (`« {title} »`), restoring next-intl conformance
**Plans:** 6/6 plans created
- [ ] 08-01-PLAN.md — i18n offline + recipe_subhead ICU keys + CookingLogFinalize subhead routing (COOK-11, COOK-12)
- [ ] 08-02-PLAN.md — CookingBanner retheme + Finaliser <Button asChild> + h-12 floor (COOK-07)
- [ ] 08-03-PLAN.md — RatingPicker transition-transform 100ms ease-craft + paper-grain + helper text-sm fold (COOK-08)
- [ ] 08-04-PLAN.md — Recipe detail full-bleed hero + cookbook gestures + h-12 header buttons (COOK-06)
- [ ] 08-05-PLAN.md — Recipe library 2-col grid + RecipeCard paper-grain + SearchInput h-12 + Plus h-12 (COOK-09)
- [ ] 08-06-PLAN.md — Cooking-log history view (NEW route + CookingLogCard component) (COOK-10)
**UI hint:** yes

### Phase 9: Onboarding + identity polish
**Goal:** Bring the first-touch and identity surfaces — household create/join, settings, BottomNav, and the installable PWA identity (icon + splash) — into the Slow Food design system.
**Depends on:** Phase 5 (parallelizable with Phases 6, 7, 8)
**Requirements:** ONBOARD-07, ONBOARD-08, ONBOARD-09, ONBOARD-10, ONBOARD-11
**Success Criteria** (what must be TRUE):
  1. A new household member opens the app for the first time and the create + join (invite-code entry) flows present coherently with the rest of the app — terracotta accents, warm typography, paper-grain card surfaces
  2. User opens Settings and sees member color attribution, household info, invite-code display, and the copy-to-clipboard affordance all rendered with Phase 5 tokens
  3. User sees the BottomNav re-themed — icons, active state, and badge styling reflect the warm palette and motion language; cool-gray slate/zinc is gone from this surface
  4. User installs the app via Safari → Add to Home Screen and the home-screen icon shows the new terracotta-backed identity (type-driven monogram or simple food symbol) with a matching splash screen — no rose `#F43F5E` left in the manifest
  5. The four design principles (Design Quality, Originality, Craft, Functionality) hold across the first-touch path and the app reads as a single coherent product end-to-end
**Plans:** TBD (via `/gsd-ui-phase` → `/gsd-plan-phase 9`)
**UI hint:** yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Design system foundation | 6/6 | Complete    | 2026-05-08 |
| 6. Capture surfaces polish | 6/6 | Complete    | 2026-05-08 |
| 7. Decide polish | 4/4 | Complete    | 2026-05-08 |
| 8. Cook polish | 0/0 | Not started | - |
| 9. Onboarding + identity polish | 0/0 | Not started | - |

## Coverage

- v0.2 requirements: 31 total
- Mapped to phases: 31/31 ✓
- Orphans: 0
- Duplicates: 0

## Notes

- Phases 6–9 all consume Phase 5 tokens and shadcn re-themes; they cannot start until Phase 5 ships. After Phase 5, screen-group phases (6, 7, 8, 9) can be ordered in any sequence — the recommended order (capture → decide → cook → onboarding) follows the user's natural daily loop, but there is no functional dependency between them.
- Every phase uses `/gsd-ui-phase` first to lock the UI-SPEC contract (the typography pairing research question is answered when Phase 5 plans), then `/gsd-plan-phase` for execution planning.
- Polish only — no functional regressions. Capture pipeline, scoring, daily shortlist, voting state machine, realtime, and cookie auth are unchanged.
- Behavioral target: retrospective `/gsd-ui-review` on the full app scores ≥ 22/24 (raised from W4's 20/24 on Phase-4 surfaces only). Each phase's success criteria provide the per-pillar handles for that score.

---
*Last updated: 2026-05-08 — v0.2 roadmap created (5 phases, 31 requirements mapped).*
