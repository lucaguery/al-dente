# Phase 5: Design system foundation - Context

**Gathered:** 2026-05-08
**Status:** Ready for UI-SPEC + planning
**Mode:** Smart discuss (autonomous) — single grey area, all defaults accepted

<domain>
## Phase Boundary

Establish the Slow Food artisanal token system that every subsequent v0.2 phase consumes. Deliver:

- Tailwind v4 `@theme` token migration: terracotta primary (h≈35°) replacing rose (h=16.5°), preserving all existing token names via aliases
- Typography pairing (display serif + body sans) chosen at the UI-SPEC step, loaded via `next/font/google`, French diacritics verified on iOS Safari at PWA-compressed sizes
- Paper-grain texture anchor on card surfaces only (single SVG asset, used consistently across cards, NOT on full-page backgrounds, buttons, or chrome)
- Warm shadow tokens replacing cool box-shadows
- Motion language: one curve + two durations (fast 150ms / normal 280ms), exposed both as CSS tokens and as Framer Motion presets via a single source of truth
- Re-themed shadcn primitives in `frontend/components/ui/*` (Button, Input, Textarea, Card, Dialog, Sheet, Toast/Sonner, Skeleton, Badge, Label, ScrollArea, Select, Separator, Tabs, AlertDialog) — modified in place
- Temporary `/styleguide` route demonstrating the foundation before Phases 6-9 consume it

This phase is GATING for Phases 6, 7, 8, 9 — they cannot start until DESIGN-01 through DESIGN-08 ship.

**Out of scope:** Per-screen polish (deferred to Phases 6-9). Custom illustrations / app icon (per ROADMAP — type-driven monogram in Phase 9). Hand-drawn dividers (anti-pattern). Functional changes (polish only).

</domain>

<decisions>
## Implementation Decisions

### Token Migration Strategy
- **Add new terracotta tokens at the OKLCH layer; alias `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring` to point at terracotta** — preserves all existing component class names (`bg-primary`, `text-primary`, `ring-ring`, etc.) per DESIGN-03 ("token names preserved or aliased to avoid component breakage")
- Move primary hue from h=16.5° (rose) to h≈35° (terracotta starting point `#C8553D`, refined during UI-SPEC); precise OKLCH values selected to harmonize with existing cream surface (h≈60°) without re-tuning every other token
- Keep `--surface-rose-50` / `--surface-rose-100` tokens as legacy aliases (mark with comment); they're referenced by the home hero quick-task — replace usages incrementally during Phase 6+ rather than churning Phase 5
- `--color-valide-tint` (h≈145 emerald) reconciled to `--color-valide-tint` everywhere (drop the accented `--color-validé-tint` per DECIDE-03) — this is a Phase 5 token housekeeping deliverable

### Paper-Grain Delivery
- **Single SVG noise asset at `frontend/public/textures/paper-grain.svg`**, referenced via CSS `background-image: url(/textures/paper-grain.svg)`
- Surfaced as a `.paper-grain` utility class in a `@layer utilities` block — applied to card surfaces via `::before` pseudo so the noise sits behind content with `mix-blend-mode: multiply` in light, lifted opacity in dark
- ~30 lines of CSS plus the one SVG asset, per design-direction.md
- NOT applied to full-page backgrounds, buttons, or chrome
- Dark mode: same SVG, lower opacity / different blend mode

### Motion Exposure
- **CSS tokens in `@theme`**: `--ease-craft` (single curve), `--duration-fast: 150ms`, `--duration-normal: 280ms`
- **Thin `frontend/lib/motion.ts` module** re-exports the same numbers as Framer Motion presets (`fadeIn`, `slideUp`, `swipe` transitions) so the swipe deck and CSS transitions stay in lockstep
- `prefers-reduced-motion: reduce` honored — already in v0.1 globals.css, preserved
- Shipped as part of DESIGN-06

### Typography Pairing
- **Decision deferred entirely to the UI-SPEC step (`/gsd-ui-phase 5`)** per `.planning/research/questions.md` (output expected: recommended pairing, backup pairing, weights, type scale)
- Phase 5 discuss only locks the **constraints** for the UI researcher: French diacritics render cleanly on iOS Safari at PWA-compressed sizes; harmonizes with terracotta+cream+ink palette; reads as Slow Food editorial / contemporary Italian cookbook publishing; available via `next/font/google` (or has a self-hosted fallback path); distinctive enough that the pairing alone is recognizable; NOT Geist alone, NOT Geist+Inter, NOT system stacks
- Body sans must be highly legible at small sizes (recipe ingredient lists, vote-deck meta) AND long-form (recipe instructions)
- Variable-font support preferred for bundle size

### Acceptance Gate
- **Temporary `/styleguide` dev route** at `frontend/app/styleguide/page.tsx`, showing every re-themed primitive (all 15 in `components/ui/*`), the full type scale, shadow scale, paper-grain on cards, motion previews
- Built during Phase 5, used as the manual visual check + UI review baseline
- Marked `// TODO(milestone-close)` for removal at end of v0.2 (after Phases 6-9 ship); add explicit cleanup task to v0.2 audit
- Phase 5 ships when: temporary route renders all primitives, UI review on `/styleguide` scores ≥ 22/24, no functional regression on existing v0.1 routes (smoke check via dev server)

### Claude's Discretion
- Exact OKLCH lightness/chroma values for the terracotta primary (refined during UI-SPEC against rendered cream background)
- Exact warm shadow values (paper-on-wood feel — multiple low-blur layers vs single softer drop, decided during implementation)
- Internal organization of `frontend/lib/motion.ts` (single export object vs named exports)
- Whether `/styleguide` is gated behind a `process.env.NODE_ENV === 'development'` flag at runtime or just lives as a route in dev (no PWA cache invalidation cost either way since dev path)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (current v0.1 baseline)
- `frontend/app/globals.css` (260 lines) already structured around Tailwind v4 `@theme` directive — all CSS variables defined in `:root` and `.dark` blocks, mapped into Tailwind theme via `@theme inline { --color-*: var(--*) }` pattern. Phase 5 stays in this same file.
- 15 shadcn primitives already in `frontend/components/ui/*`: alert-dialog, badge, button, card, dialog, input, label, scroll-area, select, separator, sheet, skeleton, sonner, tabs, textarea — all candidates for in-place re-theming per DESIGN-07.
- Existing tokens to preserve as alias targets: `--shadow-card`, `--shadow-card-hover`, `--shadow-nav`, `--color-surface-muted`, `--color-foreground-muted`, `--color-surface-rose-{50,100}`, `--color-valide-tint`, `--radius-{sm,md,lg,xl,2xl,3xl,4xl}`.
- Type scale utilities already exist as `.text-display` / `.text-title` / `.text-body` / `.text-caption` in `@layer utilities` — these are the migration targets for the new typography pairing (replace `var(--font-heading)` → new display serif token; preserve class names).

### Established Patterns
- **Token shape**: OKLCH for all colors with hue axis h≈60° on neutrals (warm cream); h=16.5° on rose primary (migrating to h≈35° terracotta); h=145° on valide-tint (preserved).
- **Light/dark switching**: `.dark` class on `<html>` + a `prefers-color-scheme: dark` `@media` block in `:root` for the auto-switch (no manual toggle in v0.1, productize-later).
- **shadcn primitives**: paste-then-customize convention (per `.planning/notes/v0.2-design-direction.md` line 53-55) — every component in `components/ui/*` already has tweaks beyond vanilla shadcn.
- **Fonts**: loaded via `next/font/google` in `frontend/app/layout.tsx` and exposed as CSS variables (`--font-sans`, `--font-geist-mono`, `--font-playfair`); same pattern for the new pairing.
- **Reduced motion**: global `@media (prefers-reduced-motion: reduce)` clamping all animations to 0ms — preserved as-is.

### Integration Points
- `frontend/app/layout.tsx` — font registration
- `frontend/app/globals.css` — token system (single source of truth)
- `frontend/components/ui/*` — primitives consumed by every screen
- `frontend/lib/motion.ts` (NEW) — Framer Motion preset module
- `frontend/public/textures/paper-grain.svg` (NEW) — texture asset
- `frontend/app/styleguide/page.tsx` (NEW, temporary) — acceptance gate

### Constraints from Prior Phases / Project
- v0.1 token names must NOT break (DESIGN-03)
- `--color-validé-tint` accent typo to be normalized to `--color-valide-tint` everywhere (DECIDE-03 spec ↔ implementation reconciliation; tracked here as housekeeping)
- French only via next-intl, no string changes in this phase
- iOS Safari French diacritic rendering at PWA-compressed sizes is a hard typography constraint
- Solo dev, ~1 weekend budget — phase scope reflects "consolidate, alias, ship the styleguide gate"

</code_context>

<specifics>
## Specific Ideas

- Reference points for typography research (handed to the UI-SPEC researcher): contemporary Italian craft food publishing (Phaidon-adjacent but earthier), Tuscan cookbook aesthetic, slow-food artisanal brands. Candidates already in the research-question doc: Fraunces, Instrument Serif, DM Serif Display (free); GT Sectra, PP Editorial New, Recoleta, GT Super, Tiempos Headline (paid). Body sans candidates: DM Sans, IBM Plex Sans, Manrope (free); Söhne, Inter (Inter has the "too default" flag).
- Terracotta starting OKLCH (UI-SPEC will refine): roughly `oklch(0.62 0.14 35)` — derived from `#C8553D` per design-direction.md. Cream stays at `oklch(0.985 0.008 60)`.
- Paper-grain noise: subtle warm noise/grain suggestive of recipe cards on a kitchen counter; NOT visible-from-across-the-room textured.
- Motion philosophy: "one curve, two durations, sparing decorative use" (per design-direction.md).

</specifics>

<deferred>
## Deferred Ideas

- Hand-drawn dividers / signatures / ornamental glyphs — captured as seed `handdrawn-signature-anchor.md` for revisit after v0.2 ships (per design-direction.md "Path declined")
- Custom illustrated app icon — Phase 9 ships type-driven monogram only; commissioned art is V2-UX-02 backlog
- Manual dark/light toggle UI — productize-later; v0.2 keeps `prefers-color-scheme` auto-switch
- Per-component CVA variant explosion — out of scope; in-place primitive re-theme is the chosen vector

</deferred>
