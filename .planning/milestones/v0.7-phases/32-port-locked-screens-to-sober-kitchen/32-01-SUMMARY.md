---
phase: 32-port-locked-screens-to-sober-kitchen
plan: 01
subsystem: ui
tags: [css, tailwind, design-system, tokens, typography, caveat, oklch, sober-kitchen]

# Dependency graph
requires: []
provides:
  - "Sober OKLCH token palette in globals.css :root (14 value swaps + 3 new tokens)"
  - "5 desaturated member-bg hexes in :root"
  - "Halved --shadow-card (0.05/0.03 from 0.06/0.05)"
  - "Caveat font registered via next/font/google in layout.tsx; --font-marginalia on <html>"
  - "themeColor updated to #8B4A35 (sober primary approximation)"
  - "font-style:italic removed from .text-display (upright register)"
  - "4 primitive CSS class libraries in @layer utilities of globals.css (marginalia + ledger-card + table-scene + loader-brand)"
  - "@keyframes drawLoop + prefers-reduced-motion fallback for .loader-brand"
  - "/styleguide route deleted (§15.D)"
affects:
  - 32-02-primitives
  - 32-03-accueil-port
  - 32-04-bibliotheque-port
  - 32-05-recette-port

# Tech tracking
tech-stack:
  added: ["Caveat (Google Fonts via next/font/google, weights 500+600)"]
  patterns:
    - "Token names preserved, values swapped in place — Tailwind @theme inline block untouched"
    - "New utility classes added in sibling @layer utilities block after the existing one"
    - "--patina: 0 global default; per-card inline style override pattern"
    - "DECIDE-03 invariant guard: --color-valide-* tokens never touched in :root desaturation sweep"

key-files:
  created: []
  modified:
    - "frontend/app/globals.css"
    - "frontend/app/layout.tsx"
  deleted:
    - "frontend/app/styleguide/page.tsx"

key-decisions:
  - "themeColor approximated to #8B4A35 for oklch(0.50 0.10 32); iOS PWA chrome tolerance is wide — flagged for visual verification in DevTools (A1 resolved)"
  - "DECIDE-03 invariant preserved: --color-valide-foreground stays #10B981 / --color-valide-emphasis stays #047857 / valide emerald h≈145 unchanged"
  - ".dark block NOT touched in Phase 32 — dark-mode rebalance is a future phase"
  - "sidebar-ring in :root kept at old oklch(0.595 0.135 35) — not in §15.A delta scope"
  - "ENVIRONMENT_FALLBACK build error is pre-existing (Supabase env not set at build time); build exit code 0 confirmed clean"

patterns-established:
  - "Sober Kitchen token naming: OKLCH primaries in :root, token names preserved, values swapped"
  - "Caveat as --font-marginalia: registered in layout.tsx, exposed on <html>, cursive fallback in :root for offline PWA edge"
  - "Ledger-card patina driven by CSS calc() on --patina CSS custom property (0-3)"
  - "Table-à-manger seat states as CSS classes: seat-state-valide/pressenti/neutral/rejected/contested"
  - "Brand-mark loader via @keyframes drawLoop on stroke-dasharray; prefers-reduced-motion kills animation"

requirements-completed: [SOBER-01]

# Metrics
duration: 15min
completed: 2026-05-18
---

# Phase 32 Plan 01: Sober Kitchen Token Foundation Summary

**Sober OKLCH palette (14 value swaps, 3 new tokens, 5 desaturated member hexes) landed in globals.css; Caveat registered as --font-marginalia; 4 CSS primitive libraries (marginalia + ledger-card + table-scene + loader-brand) added; /styleguide deleted**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-18T09:38:00Z
- **Completed:** 2026-05-18T09:52:46Z
- **Tasks:** 3
- **Files modified:** 2 (+ 1 deleted)

## Accomplishments

- Applied all §15.A sober token delta to globals.css :root: 9 OKLCH values swapped + 4 mirror tokens (popover/muted/accent/input) + radius 0.75rem → 0.625rem; 5 member-bg hexes desaturated; --shadow-card halved; --duration-slow + --font-marginalia + --patina:0 added
- Registered Caveat (weights 500+600) in layout.tsx via next/font/google; exposed --font-marginalia on `<html>` className; PinLabel.tsx now resolves to Caveat without any code change
- Added 27+ utility classes across 4 primitive CSS libraries in a new @layer utilities block; @keyframes drawLoop with prefers-reduced-motion fallback
- Deleted frontend/app/styleguide/page.tsx (marked TODO(milestone-close) since v0.2)
- DECIDE-03 invariant preserved: emerald h≈145 tokens untouched throughout

## Task Commits

1. **Task 1: Swap §15.A tokens in globals.css :root + add new tokens + halve shadows** - `dd7e97b` (feat)
2. **Task 2: Register Caveat font in layout.tsx + update themeColor** - `af9ed2b` (feat)
3. **Task 3: Add §15.B utility classes + patine + table-scene + loader-brand CSS; delete /styleguide** - `6a5df5c` (feat)

## Files Created/Modified

- `frontend/app/globals.css` - 14 OKLCH/hex token value swaps + 3 new tokens + halved shadow + italic removal from .text-display + 177 lines of new utility CSS (marginalia + ledger-card + table-scene + loader-brand + @keyframes drawLoop + prefers-reduced-motion)
- `frontend/app/layout.tsx` - Caveat font import + definition (--font-marginalia, 500+600) + ${caveat.variable} on html + themeColor #C8553D → #8B4A35
- `frontend/app/styleguide/page.tsx` - DELETED (§15.D cleanup)

## Decisions Made

- themeColor: `#8B4A35` is an acceptable approximation of `oklch(0.50 0.10 32)` for iOS PWA chrome color (A1 resolved per implementation_notes). Visual verification in browser DevTools recommended at plan close.
- `.dark` block untouched — dark-mode rebalance is explicitly deferred per 32-CONTEXT.md.
- `sidebar-ring` in `:root` kept at old terracotta value — it is not in the §15.A delta table.
- Pre-existing `ENVIRONMENT_FALLBACK` build warning (Supabase env vars absent at build time) is not caused by this plan; build exits 0.

## Deviations from Plan

None — plan executed exactly as written. All token swaps, mirror tokens, new tokens, member-bg hexes, shadow halving, utility classes, and styleguide deletion performed per spec.

## Known Stubs

None — this plan is CSS/font only; no data wiring, no UI rendering paths.

## Threat Flags

None — CSS/font registration only. No new network endpoints, no auth paths, no schema changes. Caveat self-hosts at build time (no Google CDN runtime fetch per T-32-01-01). All threat dispositions accepted per plan threat model.

## Issues Encountered

- The `@layer utilities` block edit required two separate blocks (original + new sibling) because the existing block ends at line 480 — this is valid Tailwind v4 behavior (same-layer blocks concatenate at cascade time).
- The `:root` member-color block edit needed surrounding comment context to disambiguate from the `.dark` block which has identical property structure.

## Open Question A1 Status

themeColor approximated to `#8B4A35`. Per CSS Color 4: `oklch(0.50 0.10 32)` ≈ sRGB(139, 74, 53) ≈ `#8B4A35`. Delta from computed value is within 5 sRGB channels. iOS PWA chrome tolerance is wide — acceptable for Phase 32. Planner may revise after visual verification.

## iOS PWA Caveat Check Status

Deferred to phase close (32-05 sign-off per §15.D gate). Cursive fallback in --font-marginalia covers the offline edge.

## Next Phase Readiness

- 32-02 (Primitives + sweeps) can now compose `<LedgerCard>`, `<TableVote>`, `<Marginalia>`, `<BrandLoader>` against these CSS classes
- PinLabel.tsx automatically renders in Caveat (no code change needed) once 32-01 is deployed
- All four CSS primitive class libraries available at build time
- /styleguide route gone from route table (confirmed in build output)

## Self-Check: PASSED

- FOUND: frontend/app/globals.css
- FOUND: frontend/app/layout.tsx
- CONFIRMED DELETED: frontend/app/styleguide/page.tsx
- FOUND: dd7e97b (Task 1 commit)
- FOUND: af9ed2b (Task 2 commit)
- FOUND: 6a5df5c (Task 3 commit)

---
*Phase: 32-port-locked-screens-to-sober-kitchen*
*Completed: 2026-05-18*
