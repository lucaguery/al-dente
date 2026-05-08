# Milestones

## v0.2 Polish: Slow Food artisanal identity (Shipped: 2026-05-08)

**Phases completed:** 5 phases, 26 plans, 36 tasks

**Key accomplishments:**

- Migrated `frontend/app/globals.css` to terracotta+warm-cream+warm-taupe OKLCH tokens, two-layer warm-brown shadows, motion CSS tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`), and a `.paper-grain` utility class — full v0.1 token-name preservation, zero component churn.
- One-liner:
- Before
- Created `frontend/lib/motion.ts` — the JS half of DESIGN-06. Exports `easeCraft`, `durations`, `transitions`, and `variants` (fadeIn / slideUp / pressFeedback / swipeCommit) per UI-SPEC §Motion verbatim, in numeric lockstep with the CSS motion tokens in globals.css.
- Sweep `font-heading` → `font-display` across 4 shadcn Title primitives, delete the deprecated `--font-heading` / `--font-sans` `@theme` aliases, and stage `transitions` import on the styleguide page so Phase 5 closes with a clean token surface.
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- Edit 1 — `transitions` import
- 5-state vote-chip pill render with LOCKED color story + paper-grain Tu-décides delegation Card mirroring Phase 6 D-Voice pattern, in a single 28-line surgical edit to VoteSummary.tsx (no new files, no new i18n keys, no architectural change).
- One-liner:
- CookingBanner re-themed to a paper-grain Card with a subtle terracotta wash (bg-primary/8) and Finaliser converted from a raw `<Link>` with hand-rolled inline-flex classes to `<Button asChild>` wrapping `<Link>` — both action buttons cleared to the 48px tap-target floor, closing W4 UI-REVIEW gap COOK-07.
- COOK-08 closed: RatingPicker press feedback upgraded from instant transition-all snap to 100ms ease-craft paper-physics depression, paper-grain anchor added to each rating card surface, and helper-line typography folded into the Phase 8 4-size type-scale.
- RecipeCard joins the kitchen-counter card system (paper-grain frame), SearchInput field rises to 48px D-08 floor with terracotta-30 focus ring on a paper-grain wrapper, and the recipe library converts from a flex-stack to a responsive 2-col mobile-first grid (md:3 / lg:4) — closing COOK-09 in 3 surgical edits, ~15 lines total.
- Next.js 16 ImageResponse-driven app icon (terracotta + cream pasta-strand) replaces static PNGs; manifest + viewport migrated to Slow Food terracotta; Phase 5 deferral CLOSED.
- One-liner:
- One-liner:
- One-liner:

---
