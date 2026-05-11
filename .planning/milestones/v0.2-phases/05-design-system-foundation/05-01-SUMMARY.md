---
phase: 05-design-system-foundation
plan: 01
subsystem: ui
tags: [tailwind-v4, css-tokens, oklch, design-system, slow-food, terracotta, paper-grain, motion-tokens]

requires:
  - phase: 04-polish-w4
    provides: "v0.1 globals.css token shape (`--primary`, `--ring`, `--shadow-card`, `--surface-rose-*`, `--valide-tint`, `--radius-*`, `--font-*`) — preserved as the alias surface"

provides:
  - "Slow Food artisanal token system in `frontend/app/globals.css`: terracotta primary at h≈35° (`oklch(0.595 0.135 35)` light / `oklch(0.70 0.13 35)` dark) replacing rose at h=16.5°"
  - "Warm-cream + warm-taupe + ink neutral palette (h≈50/60) replacing the cream-axis-only palette of v0.1"
  - "Two-layer warm-brown shadow tokens (`rgba(74, 56, 40, *)`) replacing cool floating shadows (`rgba(15, 15, 20, *)`)"
  - "Motion CSS tokens in `@theme inline`: `--ease-craft` (cubic-bezier(0.32, 0.72, 0.0, 1)), `--duration-fast: 150ms`, `--duration-normal: 280ms` — consumable as Tailwind v4 `ease-craft`, `duration-fast`, `duration-normal` utilities"
  - "`.paper-grain` utility class in `@layer utilities` rendering a multiplied warm-noise overlay via ::before pseudo, wired to `/textures/paper-grain.svg`"
  - "Dark-mode shadow + paper-grain overrides preserving the warm metaphor (paper fibers catching light) inverted for dark surfaces"
  - "Full token-name preservation matrix (DESIGN-03): every v0.1 token name is still defined; values changed in place"

affects:
  - "05-02 (paper-grain SVG asset)"
  - "05-03 (typography migration consumes preserved `.text-*` utilities)"
  - "05-04 (motion preset module re-exports the same numbers)"
  - "05-05 (primitive re-themes consume `bg-primary`, `shadow-card`, `paper-grain`, `ease-craft`)"
  - "05-06 (styleguide route renders the full token system)"
  - "06-decide-polish, 07-capture-polish, 08-cooking-polish, 09-realtime-polish (all consume the new tokens)"

tech-stack:
  added: []
  patterns:
    - "Tailwind v4 `@theme inline` token exposure: `--ease-*` and `--duration-*` keys auto-derive `ease-*` and `duration-*` Tailwind utilities"
    - "Two-layer warm-brown drop shadows (paper-on-wood physical metaphor) with environmental, not theme-flipped, shadow color"
    - "`.paper-grain` ::before overlay pattern with `border-radius: inherit` so the noise respects the parent card's corner radius"
    - "Dual `.dark { ... }` blocks (color block + shadow override block) intentionally separated for organization; CSS rule concatenation makes this lossless"

key-files:
  created: []
  modified:
    - "frontend/app/globals.css"

key-decisions:
  - "Implemented the UI-SPEC §Color tables verbatim — every OKLCH value lifted from the spec without local refinement. Rationale: the spec was already AA-contrast-verified against the cream surface, and downstream plans (03 typography, 05 primitive re-themes, 06 styleguide) all read these exact numbers."
  - "Kept the legacy `--surface-rose-50` / `--surface-rose-100` token names (with values shifted from rose h=16.5° to faint terracotta wash h≈35°) per UI-SPEC §Color 'Token preservation matrix'. Rationale: zero component churn in this plan; cleanup of the rose-named tokens is deferred to Phase 6+."
  - "Placed motion tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`) inside the same `@theme inline { ... }` block as the shadow scale, not in `:root`. Rationale: Tailwind v4 only auto-derives utilities from `@theme` keys — placing them in `:root` would expose them as raw CSS vars but not as `duration-fast` / `ease-craft` utilities."
  - "Added the dark-mode shadow override as a SEPARATE `.dark { ... }` block after the OKLCH `.dark` block, rather than merging into the OKLCH block. Rationale: visually groups shadow-color overrides with the shadow tokens themselves (mirrors UI-SPEC organization); CSS concatenates same-selector rules, so behavior is identical."
  - "Placed the `.dark .paper-grain::before` rule OUTSIDE `@layer utilities` per UI-SPEC instruction. Rationale: matches cascade weight of other `.dark` overrides elsewhere in the file (which are unlayered), preventing specificity surprises when a `.dark` ancestor wins over a layered rule."
  - "Did NOT modify the existing `.text-display` / `.text-title` / `.text-body` / `.text-caption` utilities. Rationale: Plan 03 owns the type-scale rewrite per the plan's task-3 explicit note."

patterns-established:
  - "Pattern: `:root` and `.dark` both define the full token surface (no implicit inheritance); the `@media (prefers-color-scheme: dark)` block selectively overrides only `--surface-muted` and `--foreground-muted` to avoid the split-brain documented in the v0.1 comment"
  - "Pattern: shadow tokens are environmental (warm-brown wood color) rather than theme-flipped — same hue family for light and dark, just different alpha/luminance"
  - "Pattern: utility-class textures use `::before` with `border-radius: inherit` and `pointer-events: none` so they layer cleanly behind content without affecting layout or interaction"

requirements-completed: [DESIGN-03, DESIGN-05, DESIGN-06, DESIGN-08]

duration: 3min
completed: 2026-05-08
---

# Phase 05 Plan 01: Token system migration to Slow Food artisanal palette Summary

**Migrated `frontend/app/globals.css` to terracotta+warm-cream+warm-taupe OKLCH tokens, two-layer warm-brown shadows, motion CSS tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`), and a `.paper-grain` utility class — full v0.1 token-name preservation, zero component churn.**

## Performance

- **Duration:** 3 min (235s)
- **Started:** 2026-05-08T01:22:17Z
- **Completed:** 2026-05-08T01:26:12Z
- **Tasks:** 3
- **Files modified:** 1 (`frontend/app/globals.css`)

## Accomplishments

- **Color migration (DESIGN-03):** `:root` and `.dark` blocks rewritten with terracotta primary (h≈35°), warm-cream background (h≈60°), warm-taupe secondary/muted/accent (h≈50°), faint-terracotta surface-rose-* (h≈35°), and quieted destructive (h=25°). All v0.1 token names preserved.
- **Shadow migration (DESIGN-05):** Cool `rgba(15, 15, 20, *)` shadows replaced by warm `rgba(74, 56, 40, *)` two-layer paper-on-wood shadows in light mode; near-black higher-alpha equivalents in dark mode (separate `.dark { ... }` block).
- **Motion tokens added (DESIGN-06):** `--ease-craft: cubic-bezier(0.32, 0.72, 0.0, 1)`, `--duration-fast: 150ms`, `--duration-normal: 280ms` exposed in `@theme inline` for Tailwind utility consumption.
- **Paper-grain utility added (DESIGN-04 CSS half + DESIGN-08):** `.paper-grain` class in `@layer utilities` with multiplied warm-noise ::before overlay pointing at `/textures/paper-grain.svg`; `border-radius: inherit` so the overlay respects parent card radius; dark-mode override flips blend mode to overlay at 10% opacity.
- **`prefers-reduced-motion` rule preserved unchanged** at the bottom of the file (UI-SPEC §Motion contract).

## Exact OKLCH Values Landed

### Light mode (`:root`)

| Token | OKLCH | Role |
|-------|-------|------|
| `--background` | `oklch(0.985 0.008 60)` | Warm cream (unchanged) |
| `--foreground` | `oklch(0.22 0.018 50)` | Sienna-ink |
| `--card` / `--popover` | `oklch(0.992 0.006 60)` | Lifted cream |
| `--card-foreground` / `--popover-foreground` | `oklch(0.22 0.018 50)` | Same as foreground |
| `--primary` / `--ring` / `--sidebar-ring` | `oklch(0.595 0.135 35)` | **Terracotta** |
| `--primary-foreground` | `oklch(0.985 0.008 60)` | Cream-on-terracotta |
| `--secondary` / `--muted` / `--accent` / `--surface-muted` | `oklch(0.945 0.012 50)` | Warm-taupe |
| `--secondary-foreground` / `--accent-foreground` / `--sidebar-primary` / `--sidebar-accent-foreground` | `oklch(0.28 0.015 50)` | Recessive ink |
| `--muted-foreground` / `--foreground-muted` | `oklch(0.50 0.014 50)` | Faded-ink helper copy |
| `--destructive` | `oklch(0.55 0.20 25)` | Quieted terracotta-family destructive |
| `--border` / `--input` / `--sidebar-border` | `oklch(0.88 0.012 50)` | Warm-taupe hairline |
| `--surface-rose-50` | `oklch(0.97 0.022 35)` | Faintest terracotta wash (token name retained) |
| `--surface-rose-100` | `oklch(0.94 0.045 35)` | Stronger terracotta wash |
| `--sidebar` | `oklch(0.975 0.01 50)` | Warm-tinted sidebar |
| `--valide-tint` | `oklch(0.93 0.07 145)` | Validé emerald (unchanged) |

### Dark mode (`.dark`)

| Token | OKLCH | Role |
|-------|-------|------|
| `--background` | `oklch(0.16 0.012 50)` | Warm dark |
| `--foreground` | `oklch(0.94 0.008 50)` | Warm off-white |
| `--card` / `--popover` / `--sidebar` | `oklch(0.21 0.014 50)` | Lifted card surface |
| `--primary` / `--ring` / `--sidebar-primary` / `--sidebar-ring` | `oklch(0.70 0.13 35)` | Lightened terracotta |
| `--primary-foreground` / `--sidebar-primary-foreground` | `oklch(0.16 0.012 50)` | Dark "cream" |
| `--secondary` / `--muted` / `--accent` / `--sidebar-accent` | `oklch(0.26 0.012 50)` | Warm-gray-dark |
| `--muted-foreground` / `--foreground-muted` | `oklch(0.66 0.010 50)` | Faded warm-gray |
| `--destructive` | `oklch(0.65 0.18 25)` | Lightened destructive |
| `--border` / `--sidebar-border` | `oklch(1 0 0 / 12%)` | White-alpha hairline |
| `--input` | `oklch(1 0 0 / 16%)` | Slightly stronger hairline |
| `--surface-muted` | `oklch(0.24 0.012 50)` | |
| `--surface-rose-50` | `oklch(0.22 0.025 35)` | Faint terracotta wash |
| `--surface-rose-100` | `oklch(0.27 0.045 35)` | Stronger terracotta wash |
| `--valide-tint` | `oklch(0.30 0.06 145)` | unchanged |

The `@media (prefers-color-scheme: dark) { :root { ... } }` block was updated to mirror the new dark `--surface-muted` (`oklch(0.24 0.012 50)`) and `--foreground-muted` (`oklch(0.66 0.010 50)`) values — `surface-rose-*` left untouched in the media query (per the v0.1 split-brain comment, which still applies).

## Shadow Verification (Warm-Brown Components)

- **Light `--shadow-card`:** `0 1px 2px 0 rgba(74, 56, 40, 0.06), 0 2px 4px 0 rgba(74, 56, 40, 0.05)` — warm-brown contact + ambient layers.
- **Light `--shadow-card-hover`:** `0 1px 2px 0 rgba(74, 56, 40, 0.08), 0 4px 10px 0 rgba(74, 56, 40, 0.07)` — hover lifts ambient layer.
- **Light `--shadow-nav`:** `0 -1px 0 0 rgba(74, 56, 40, 0.08)` — hairline above bottom nav.
- **Dark `--shadow-card`:** `0 1px 2px 0 rgba(0, 0, 0, 0.30), 0 2px 4px 0 rgba(0, 0, 0, 0.22)` — near-black higher alpha.
- **Dark `--shadow-card-hover`:** `0 1px 2px 0 rgba(0, 0, 0, 0.36), 0 4px 10px 0 rgba(0, 0, 0, 0.28)`.
- **Dark `--shadow-nav`:** `0 -1px 0 0 rgba(255, 255, 255, 0.06)` — light-alpha hairline visible against dark.
- **Negative check:** `grep -F "rgba(15, 15, 20" frontend/app/globals.css` returns empty — cool shadows fully removed.

## Motion Tokens Exposed

```css
--ease-craft: cubic-bezier(0.32, 0.72, 0.0, 1);
--duration-fast: 150ms;
--duration-normal: 280ms;
```

These auto-derive Tailwind utilities `ease-craft`, `duration-fast`, `duration-normal` for use in component classes (e.g., `transition-transform duration-fast ease-craft`). Plan 04 will re-export the same numbers as Framer Motion presets in `frontend/lib/motion.ts` so CSS transitions and Framer Motion animations stay in lockstep.

## Paper-Grain Utility Selector Path

- `.paper-grain` (positions parent `relative` so the ::before pseudo can absolutely position over it).
- `.paper-grain::before` (light mode default — `mix-blend-mode: multiply`, `opacity: 0.06`, `background-image: url('/textures/paper-grain.svg')`, `background-size: 240px 240px`, `border-radius: inherit`, `pointer-events: none`, `z-index: 0`).
- `.paper-grain > *` (positions direct children at `z-index: 1` so content sits above the noise overlay).
- `.dark .paper-grain::before` (dark-mode override — `mix-blend-mode: overlay`, `opacity: 0.10`).

The SVG asset itself is created in Plan 02 (Wave 1, parallel) at `frontend/public/textures/paper-grain.svg`. Until Plan 02 lands, the utility resolves to a 404 image (no rendering error — ::before just shows nothing).

## Task Commits

Each task was committed atomically with `--no-verify` (parallel execution mode):

1. **Task 1: Migrate `:root` and `.dark` blocks to terracotta + warm-cream + warm-taupe palette (DESIGN-03)** — `0a940ec` (feat)
2. **Task 2: Replace cool shadows with two-layer warm-brown shadows + add motion CSS tokens (DESIGN-05, DESIGN-06)** — `ec28471` (feat)
3. **Task 3: Add `.paper-grain` utility class wired to `/textures/paper-grain.svg` (DESIGN-04, DESIGN-08)** — `4a729c5` (feat)

## Files Created/Modified

- **Modified:** `frontend/app/globals.css` — token system migration (3 sections rewritten: `:root`, `.dark`, `@theme inline` shadow + motion block, `@layer utilities` with new `.paper-grain` rule, plus a new dark `.dark { ... }` shadow override block and a top-level `.dark .paper-grain::before` rule).

## Decisions Made

See frontmatter `key-decisions` field — the noteworthy ones:

- **Implemented UI-SPEC verbatim** rather than refining OKLCH values locally. The spec was already AA-contrast-verified.
- **Kept legacy `--surface-rose-*` token names** with shifted values (rose → faint terracotta wash). Cleanup deferred to Phase 6+.
- **Placed motion tokens in `@theme inline`** (not `:root`) so Tailwind auto-derives `duration-*` and `ease-*` utilities.
- **Separate `.dark { ... }` shadow override block** instead of merging into the OKLCH `.dark` block (visual organization; same behavior).
- **`.dark .paper-grain::before` placed outside `@layer utilities`** (matches cascade weight of other `.dark` overrides).

## Deviations from Plan

None — plan executed exactly as written. All three tasks landed verbatim against the UI-SPEC, all acceptance criteria pass, all token names preserved, no scope creep.

## Issues Encountered

- **Build verification not runnable in worktree:** `cd frontend && npm run build` fails with `sh: next: command not found` because the worktree has no `frontend/node_modules` (the main checkout's `node_modules` is not symlinked). Per the parallel-execution instructions in the spawn prompt ("The orchestrator validates hooks once after all agents complete"), build verification is owned by the orchestrator post-merge gate, not this agent. CSS brace balance was confirmed manually (balance = 0). All `grep`-based acceptance checks from the plan's `<verify>` blocks pass.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Wave 1 sibling (Plan 02):** unblocked — needs to ship the actual `frontend/public/textures/paper-grain.svg` SVG asset so the `.paper-grain` utility resolves to a real image.
- **Wave 2 plans (03 typography, 04 motion preset module):** unblocked — globals.css now exposes the preserved `.text-*` utility class names (Plan 03 will rewrite their bodies but keep names) and the motion CSS tokens (Plan 04 re-exports as Framer Motion presets).
- **Wave 3 plan (05 primitive re-themes):** unblocked — `bg-primary`, `text-primary`, `shadow-card`, `shadow-card-hover`, `shadow-nav`, `ease-craft`, `duration-fast`, `duration-normal`, `paper-grain` are all consumable as Tailwind utilities.
- **Wave 4 plan (06 styleguide):** unblocked — the full token system is in place for the `/styleguide` route to render against.
- **No blockers** for any downstream plan.

## Self-Check

Verified before completion:

- **Files:**
  - `frontend/app/globals.css` — FOUND ([ -f ] returned true; brace balance = 0; 348 lines).
  - `.planning/phases/05-design-system-foundation/05-01-SUMMARY.md` — created by this Write.
- **Commits:**
  - `0a940ec` — FOUND in `git log` (Task 1).
  - `ec28471` — FOUND in `git log` (Task 2).
  - `4a729c5` — FOUND in `git log` (Task 3).
- **Acceptance grep checks:** all 6 plan-level verification commands pass:
  - `grep -F "0.246 16.5"` → empty (rose hue gone)
  - `grep -F "rgba(15, 15, 20"` → empty (cool shadows gone)
  - `grep -F "oklch(0.595 0.135 35)"` → 3 hits (terracotta primary present in light `:root` `--primary`, `--ring`, `--sidebar-ring`)
  - `grep -F -- "--duration-normal: 280ms"` → 1 hit
  - `grep -F "paper-grain::before"` → 2 hits (light + dark, as expected)
- **Token preservation matrix:** all 15 v0.1 token names checked individually — all present (`--primary`, `--ring`, `--shadow-card`, `--surface-rose-100`, `--valide-tint`, `--radius-{sm,md,lg,xl,2xl,3xl,4xl}`, `--font-sans`, `--font-mono`, `--font-heading`).

## Self-Check: PASSED

---
*Phase: 05-design-system-foundation*
*Completed: 2026-05-08*
