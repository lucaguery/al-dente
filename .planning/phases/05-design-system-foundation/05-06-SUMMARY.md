---
phase: 05-design-system-foundation
plan: 06
subsystem: ui
tags: [acceptance-gate, styleguide, dev-only, visual-smoke-test, milestone-close-cleanup]

requires:
  - phase: 05-design-system-foundation
    plan: 01
    provides: "Token system in globals.css — terracotta primary, warm shadows, paper-grain utility, motion CSS tokens. Styleguide imports/displays all of these."
  - phase: 05-design-system-foundation
    plan: 02
    provides: "Paper-grain SVG asset at /textures/paper-grain.svg consumed by .paper-grain utility on Card surfaces."
  - phase: 05-design-system-foundation
    plan: 03
    provides: "Fraunces + IBM Plex Sans + Geist Mono font registration; type-scale utilities (.text-display, .text-title, .text-body, .text-caption) consumed in the Typography section."
  - phase: 05-design-system-foundation
    plan: 04
    provides: "frontend/lib/motion.ts framer-motion presets consumed by the Motion preview section (pressFeedback for the 'Appuyer' button, slideUp for the 'Afficher/Masquer' toggle)."
  - phase: 05-design-system-foundation
    plan: 05
    provides: "All 15 re-themed shadcn primitives imported and rendered in the Primitives section."

provides:
  - "frontend/app/styleguide/page.tsx: temporary dev-only acceptance-gate route for Phase 5"
  - "Production gate: process.env.NODE_ENV === 'production' → notFound() — route returns 404 in prod builds"
  - "// TODO(milestone-close) marker at top of file flagging removal during v0.2 audit"
  - "Section structure (top-to-bottom): Header → Color → Typography → Shadows → Motion → Texture → Buttons → Form controls → Surfaces → Feedback → Nav + structure"
  - "French diacritic-heavy sample copy verbatim from UI-SPEC §Copywriting Contract (« Al Dente. À la maison. », « Confirmer », 'Cette action est définitive.', Catégorie, Hiver/Printemps/Été, Recettes/Notes/Photos, Supprimer cet élément ?)"
  - "Dark-mode toggle for visual verification under both themes"

affects:
  - "Phases 6, 7, 8, 9 (downstream polish phases): can now consume tokens, fonts, motion, paper-grain, and re-themed primitives knowing the foundation is visually correct"
  - "v0.2 milestone audit: cleanup task — remove frontend/app/styleguide/ directory before milestone close (per // TODO(milestone-close) marker)"
---

# Plan 05-06 SUMMARY — Styleguide Acceptance Gate

## What Shipped

A temporary dev-only `/styleguide` route at `frontend/app/styleguide/page.tsx` that renders every Phase 5 token + primitive in one place. The route is the manual visual acceptance gate for Phase 5 — confirms tokens propagated, fonts loaded, paper-grain visible on cards, warm shadows visible, motion responds at the locked durations.

**File:** `frontend/app/styleguide/page.tsx` (610 lines, NEW).
**Production gate:** `process.env.NODE_ENV === 'production'` → `notFound()` (route returns 404 in prod builds).
**Cleanup marker:** `// TODO(milestone-close)` at top of file — flagged for removal during v0.2 milestone audit.

## Tasks

### Task 1: Create the styleguide route — autonomous: true

Wrote `frontend/app/styleguide/page.tsx` with the exact section layout from UI-SPEC §Styleguide Route Layout. French diacritic-heavy sample copy used verbatim from UI-SPEC §Copywriting Contract. Imports all 15 re-themed primitives from `@/components/ui/*` and the motion presets from `@/lib/motion`. Production gate via `notFound()`.

**Commit:** `d37c2cf feat(05-06): add /styleguide acceptance-gate route with full token + primitive showcase`

### Task 2: Visual smoke test — autonomous: false

Human visual verification on `npm run dev` → `http://localhost:3000/styleguide`. User walked the page top-to-bottom, verified:

- Header `« Al Dente. À la maison. »` in Fraunces italic with `À` `é` `«»` rendering cleanly
- Color section: terracotta primary, no rose `#F43F5E`, no slate
- Typography section: Fraunces display + IBM Plex Sans body with French diacritics rendering
- Shadows section: warm two-layer shadows (paper-on-wood feel), no cool floating box-shadow
- Motion section: `pressFeedback` and `slideUp` variants firing at locked durations
- Texture section: paper-grain visible on cards, NOT on full-page bg
- Primitive sections: all 15 re-themed primitives rendering correctly with the new tokens

**Result:** Approved. Phase 5 acceptance gate satisfied.

## Outcomes

- Phase 5 foundation verified visually before Phases 6-9 consume it
- All 8 DESIGN-* requirements have visible evidence of correct implementation
- Backup typography path (Instrument Serif + DM Sans) NOT triggered — Fraunces + IBM Plex Sans cleared the iOS Safari French diacritic gate
- Styleguide route ready for milestone-close cleanup (tracked via `// TODO(milestone-close)` marker)

## Notes for Phase Verifier

- Production gate is in place: the styleguide will NOT render in prod builds (returns 404 via `notFound()`)
- The route is intentionally not linked from any user-facing screen
- Cleanup task: add to v0.2 milestone audit — remove `frontend/app/styleguide/` directory and its imports
- UI review on this route should score ≥ 22/24 across the 6 pillars (UI-SPEC §Acceptance Criteria)
