# Requirements: Al Dente — v0.2 Polish (Slow Food artisanal identity)

**Defined:** 2026-05-08
**Core Value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Milestone goal:** Re-theme every screen to deliver a coherent Slow Food artisanal identity (warm, intimate, restrained Italian heritage) that demonstrably satisfies the four design principles: Design Quality, Originality, Craft, Functionality.
**Source of design decisions:** `.planning/notes/v0.2-design-direction.md`

## v0.2 Requirements

### DESIGN — Design system foundation

- [ ] **DESIGN-01**: Typography pairing chosen (display serif + body sans) replacing Playfair, loaded via `next/font/google` with `display: swap`, French diacritics verified on iOS Safari at PWA-compressed sizes
- [ ] **DESIGN-02**: Type scale, weights, line-heights, and letter-spacing defined as Tailwind v4 `@theme` tokens (single source of truth)
- [ ] **DESIGN-03**: Color palette migrated to Slow Food artisanal — terracotta primary + cream/ink/warm-gray neutrals, replacing rose `#F43F5E` + slate; all v0.1 token names preserved or aliased to avoid component breakage
- [ ] **DESIGN-04**: Paper-grain texture anchor implemented on card surfaces (CSS + one SVG noise asset), used consistently across all card surfaces, NOT used on full-page backgrounds, buttons, or chrome
- [ ] **DESIGN-05**: Warm shadow tokens replacing cool box-shadows (paper-on-wood feel, not floating)
- [ ] **DESIGN-06**: Motion tokens consolidated — one curve, two durations (fast 150ms / normal 280ms); `prefers-reduced-motion` honored
- [ ] **DESIGN-07**: Base shadcn primitives in `frontend/components/ui/*` re-themed in place (Button, Input, Textarea, Card, Dialog, Sheet, Toast, Skeleton)
- [ ] **DESIGN-08**: All design tokens consolidated in Tailwind v4 `@theme` directive in `globals.css` — no per-component hardcoded colors, no per-component shadow definitions

### CAPTURE — Capture surfaces polish

(Continues numbering from v0.1's CAPTURE × 7.)

- [ ] **CAPTURE-08**: Quick-add capture surface re-themed with new tokens
- [ ] **CAPTURE-09**: Full-form capture surface re-themed with new tokens
- [ ] **CAPTURE-10**: Voice capture surface re-themed (D-Voice deviation copy preserved; no in-app mic regression)
- [ ] **CAPTURE-11**: Photo capture surface re-themed; PhotoUploader sheet action buttons (`Caméra`, `Photothèque`) raised to `h-12` (48px) — closes W4 UI-REVIEW gap
- [ ] **CAPTURE-12**: URL capture surface re-themed
- [ ] **CAPTURE-13**: Drafts inbox re-themed (`draft` and `structured` recipe states; `recipe.created` and `recipe.promoted` realtime visual states)

### DECIDE — Voting + shortlist polish

- [ ] **DECIDE-01**: Daily shortlist screen re-themed with new tokens
- [ ] **DECIDE-02**: Swipe deck (framer-motion) refined with the new motion language (one curve, paper-physics feel)
- [ ] **DECIDE-03**: Vote chip presentation refined for the 5 computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis); `--color-validé-tint` token name reconciled (spec ↔ CSS ↔ implementation single naming)
- [ ] **DECIDE-04**: "Tu décides" delegation surface refined with new tokens
- [ ] **DECIDE-05**: Cold-start / empty-shortlist states polished; ColdStartChip dismiss button raised to `h-12` (48px) — addresses W4 D-10 productize-later note inline

### COOK — Recipe detail + cooking log + library polish

(Continues numbering from v0.1's COOK × 5.)

- [ ] **COOK-06**: Recipe detail screen re-themed (hero, ingredient list, instructions, metadata)
- [ ] **COOK-07**: CookingBanner re-themed AND `Finaliser` link + `Passer` ghost button raised to `h-12` (48px); `Finaliser` converted to `<Button asChild>` instead of raw `<a>` with hand-rolled classes — closes W4 UI-REVIEW gap
- [ ] **COOK-08**: CookingLogFinalize re-themed AND RatingPicker `transition-transform duration-100` added — closes W4 UI-REVIEW gap (instant snap → 100ms ease)
- [ ] **COOK-09**: Recipe library / list re-themed (cards, search, filtering, sort)
- [ ] **COOK-10**: Cooking log history / "what we ate this week" view re-themed
- [ ] **COOK-11**: `cooking_log.finalize.offline` i18n key added (`Hors ligne. Réessaie une fois connecté.`) + `navigator.onLine` guard in submit handler — closes W4 UI-REVIEW gap
- [ ] **COOK-12**: `cooking_log.finalize.recipe_subhead` ICU key used for the `« {title} »` pattern — closes W4 next-intl pattern divergence

### ONBOARD — Onboarding + settings + identity

(Continues numbering from v0.1's ONBOARD × 6.)

- [ ] **ONBOARD-07**: Household create screen re-themed
- [ ] **ONBOARD-08**: Household join (invite-code entry) screen re-themed
- [ ] **ONBOARD-09**: Settings screen re-themed (member color attribution, household info, invite-code display, copy-to-clipboard affordance)
- [ ] **ONBOARD-10**: PWA manifest icon + splash screen updated to reflect new identity (terracotta background, type-driven monogram or simple food symbol — kept simple, no custom illustration commission)
- [ ] **ONBOARD-11**: BottomNav re-themed (icons, active state, badge styling)

## Future Requirements (deferred — NOT in v0.2 scope)

Candidates from v0.1 v2 backlog and exploration:

### V2 — Backlog (post-v0.2)

- **V2-ALBUM-01/02/03** — Shared cooking-log photo gallery (cut from v0.1)
- **V2-AUTH-01** — Supabase Auth magic-link migration (removes invite-code fragility)
- **V2-MODEL-01** — Per-member ratings (richer preference signal)
- **V2-UX-02** — Custom illustrations (seed: `.planning/seeds/handdrawn-signature-anchor.md`)

## Out of Scope

Explicitly excluded for v0.2. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Hand-drawn dividers / icons / ornamental glyphs | Texture anchor is paper-grain only (per design direction); higher-effort path captured as seed for revisit |
| Custom illustrated app icon (commissioned art) | Effort budget — type-driven monogram is sufficient for v0.2 |
| Functional changes (new features, new flows) | v0.2 is polish only; no regressions to cookie auth, WebSocket realtime, Gemini capture, scoring, daily shortlist |
| Backend changes | All work is frontend-only |
| Album / shared photo grid | V2 backlog (cut from v0.1; productize-later) |
| Per-member rating granularity | V2 backlog |
| Supabase Auth migration | V2 backlog |
| Cool-gray surfaces (slate / zinc family) | Anti-pattern committed in design direction |
| Geist alone or Geist+Inter pairing | Anti-pattern (AI-generated default) |
| Trattoria theming (checkered patterns, flag colors) | Anti-pattern committed in design direction |
| Hand-drawn elements outside the paper-grain anchor | Anti-pattern (twee overload) |

## Traceability

Filled by roadmapper during phase creation (2026-05-08).

| Requirement | Phase | Status |
|-------------|-------|--------|
| DESIGN-01 | Phase 5 | Pending |
| DESIGN-02 | Phase 5 | Pending |
| DESIGN-03 | Phase 5 | Pending |
| DESIGN-04 | Phase 5 | Pending |
| DESIGN-05 | Phase 5 | Pending |
| DESIGN-06 | Phase 5 | Pending |
| DESIGN-07 | Phase 5 | Pending |
| DESIGN-08 | Phase 5 | Pending |
| CAPTURE-08 | Phase 6 | Pending |
| CAPTURE-09 | Phase 6 | Pending |
| CAPTURE-10 | Phase 6 | Pending |
| CAPTURE-11 | Phase 6 | Pending |
| CAPTURE-12 | Phase 6 | Pending |
| CAPTURE-13 | Phase 6 | Pending |
| DECIDE-01 | Phase 7 | Pending |
| DECIDE-02 | Phase 7 | Pending |
| DECIDE-03 | Phase 7 | Pending |
| DECIDE-04 | Phase 7 | Pending |
| DECIDE-05 | Phase 7 | Pending |
| COOK-06 | Phase 8 | Pending |
| COOK-07 | Phase 8 | Pending |
| COOK-08 | Phase 8 | Pending |
| COOK-09 | Phase 8 | Pending |
| COOK-10 | Phase 8 | Pending |
| COOK-11 | Phase 8 | Pending |
| COOK-12 | Phase 8 | Pending |
| ONBOARD-07 | Phase 9 | Pending |
| ONBOARD-08 | Phase 9 | Pending |
| ONBOARD-09 | Phase 9 | Pending |
| ONBOARD-10 | Phase 9 | Pending |
| ONBOARD-11 | Phase 9 | Pending |

**Coverage:**
- v0.2 requirements: 31 total
- Mapped to phases: 31 ✓
- Unmapped: 0
- Duplicates: 0

**Per-phase counts:**
- Phase 5 (Design system foundation): 8 requirements (DESIGN × 8)
- Phase 6 (Capture surfaces polish): 6 requirements (CAPTURE × 6)
- Phase 7 (Decide polish): 5 requirements (DECIDE × 5)
- Phase 8 (Cook polish): 7 requirements (COOK × 7)
- Phase 9 (Onboarding + identity polish): 5 requirements (ONBOARD × 5)

---
*Requirements defined: 2026-05-08*
*Last updated: 2026-05-08 — v0.2 roadmap traceability filled by roadmapper (5 phases, 31 mappings)*
