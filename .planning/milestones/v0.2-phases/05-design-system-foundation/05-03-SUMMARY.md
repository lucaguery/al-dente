---
phase: 05-design-system-foundation
plan: 03
subsystem: ui
tags: [typography, next-font-google, fraunces, ibm-plex-sans, geist-mono, opsz, latin-ext, slow-food, design-system]

requires:
  - phase: 05-design-system-foundation
    provides: "Plan 01 globals.css token surface — `@theme inline` block, `:root` + `.dark` color tokens, warm shadow tokens, motion CSS tokens, and the `.paper-grain` utility — all preserved untouched"

provides:
  - "Fraunces (display) + IBM Plex Sans (body) + Geist Mono registered via `next/font/google` in `frontend/app/layout.tsx` with `display: swap`, `subsets: ['latin', 'latin-ext']` on Fraunces and IBM Plex Sans (French diacritic coverage including œ, à, â, é, è, ê, î, ô, û, ç)"
  - "Fraunces variable-font with `opsz` axis enabled — consumed by `.text-display` (opsz 96) and `.text-title` (opsz 36) via `font-variation-settings`"
  - "IBM Plex Sans static cuts at weights 300/400/500/600 plus italic — body 400 default, locked usages declare 500 (display/title) or 600 (CTAs) explicitly per UI-SPEC §Typography"
  - "Renamed canonical `@theme inline` font keys: `--font-display` (was `--font-heading`/`--font-playfair`), `--font-body` (was `--font-sans`/`--font-geist-sans`), `--font-mono` (was `--font-geist-mono`) — mapped to the next/font variables of the same name"
  - "One-phase Tailwind utility aliases: `--font-heading: var(--font-display)` and `--font-sans: var(--font-body)` so existing `font-heading` / `font-sans` references in `card.tsx`, `dialog.tsx`, `sheet.tsx`, and any `font-sans` consumers keep rendering until the Phase 6 sweep"
  - "Rewritten `.text-display` / `.text-title` / `.text-body` / `.text-caption` utility classes in `@layer utilities` with sizes / line-heights / weights / letter-spacing / opsz axes from UI-SPEC §Typography type-scale verbatim"
  - "Body element font-family switched from `var(--font-sans)` to `var(--font-body)` — same variable resolution after aliasing, but the canonical name future-proofs the Phase 6 sweep"

affects:
  - "05-04 (motion preset module — independent; this plan only touches typography)"
  - "05-05 (primitive re-themes consume the renamed `--font-display` and `--font-body` via Tailwind utilities; one-phase aliases keep `font-heading` references in card/dialog/sheet rendering)"
  - "05-06 (styleguide route renders the four type-scale utilities with diacritic-rich French sample copy)"
  - "06-decide-polish, 07-capture-polish, 08-cooking-polish, 09-realtime-polish (all consume the new typography pairing across every screen)"
  - "Phase 6 alias sweep — must replace `font-heading` -> `font-display` and `font-sans` -> `font-body` across `frontend/components/**` and remove the two DEPRECATED alias lines from `globals.css`"

tech-stack:
  added: []
  patterns:
    - "next/font/google variable-font registration with explicit `axes: ['opsz']` to enable Fraunces' optical-sizing axis (Tailwind v4 + Next.js 16 pattern — confirmed via `frontend/node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`)"
    - "Per-utility `font-variation-settings: \"opsz\" <N>` pinning the optical-size axis of Fraunces to 96 for display and 36 for title — leverages variable-font axes to deliver one font file across the full type scale"
    - "Two-name aliasing inside `@theme inline` (canonical `--font-display` + deprecated `--font-heading`, both pointing at the same next/font variable) lets a single Tailwind v4 build expose both `font-display` and `font-heading` utility classes during a one-phase migration window"
    - "Subset declaration `subsets: [\"latin\", \"latin-ext\"]` is mandatory for French — Latin alone drops `œ` and the long-tail accent stack required by the i18n strings in `frontend/lib/i18n/fr.json`"

key-files:
  created: []
  modified:
    - "frontend/app/layout.tsx"
    - "frontend/app/globals.css"

key-decisions:
  - "Implemented UI-SPEC §Typography verbatim — every value in the layout.tsx font registration code block (line 110-134) and every cell in the type-scale table (line 146-151) lifted unchanged. Rationale: the spec was already French-diacritic-verified for iOS Safari at PWA-compressed sizes and the type-scale values were already AA-contrast-verified; downstream Plans 05 (primitive re-themes) and 06 (styleguide) read these exact numbers."
  - "Kept the one-phase aliases (`--font-heading: var(--font-display)`, `--font-sans: var(--font-body)`) inside the same `@theme inline` block as the canonical names rather than in `:root`. Rationale: Tailwind v4 only auto-derives `font-*` utilities from keys declared inside `@theme` — placing aliases in `:root` would expose them as raw CSS vars but not as Tailwind utilities, breaking the `font-heading` and `font-sans` references in `card.tsx:41`, `dialog.tsx:133`, `sheet.tsx:117`."
  - "Did NOT touch viewport.themeColor (line 41 of layout.tsx — still `#F43F5E` legacy rose). Rationale: UI-SPEC plan §Task 1 explicitly notes Phase 9 (ONBOARD-10) owns the PWA manifest icon + splash + themeColor migration to terracotta. Leaving it for one milestone preserves manifest stability while Phases 6-8 ship typography + screen polish."
  - "Did NOT touch any Plan 01-owned section: `:root`, `.dark`, shadow declarations, motion CSS tokens, `.paper-grain` utility, `.dark .paper-grain::before` override, or the `@media (prefers-reduced-motion: reduce)` block. Rationale: scope_constraint in the spawn prompt explicitly partitioned globals.css ownership — Plan 01 owns colors/shadows/motion/texture, Plan 03 owns fonts/type-scale only. Verified post-edit: terracotta token `oklch(0.595 0.135 35)` count = 3 (unchanged), `--ease-craft` present, `.paper-grain` selectors all present."

patterns-established:
  - "Pattern: a Tailwind v4 `@theme inline` font key with `--font-X: var(--font-X)` where the LHS is the Tailwind registration name (so `font-X` becomes a utility) and the RHS resolves to the CSS variable that next/font/google attaches to `<html>` via `font.variable`. Names match by convention but the two halves are independent."
  - "Pattern: one-phase migration aliases sit inside `@theme inline` with a `/* DEPRECATED — Phase N sweeps */` comment marking them for removal. Single sweep task in the next phase (grep + replace + delete the alias lines)."
  - "Pattern: variable fonts with non-default axes require explicit `axes: ['<axis>']` in the next/font/google config; `wght` is implicit when `axes` is omitted, so listing only `opsz` still loads the full weight range automatically (confirmed via Next.js docs section §axes)."

requirements-completed: [DESIGN-01, DESIGN-02]

# DESIGN-08 advanced but not closed by this plan: the font-related portion of
# token consolidation lives in globals.css after this plan ships (combined
# with Plan 01's color/shadow/motion tokens). The remaining DESIGN-08 work is
# the Phase 6 cross-component audit (grep `frontend/components/` for
# `oklch(`, `rgba(`, hardcoded font-family declarations). Listing in the
# `requirements:` field above per the plan frontmatter.

duration: 2min
completed: 2026-05-08
---

# Phase 05 Plan 03: Typography migration (Fraunces + IBM Plex Sans + Geist Mono) Summary

**Replaced `frontend/app/layout.tsx` font registrations with Fraunces + IBM Plex Sans + Geist Mono via next/font/google (latin+latin-ext subsets, opsz axis on Fraunces, italic on body, display: swap), renamed `@theme inline` font keys to canonical `--font-display`/`--font-body`/`--font-mono` with one-phase aliases for `--font-heading` and `--font-sans`, and rewrote the four `.text-*` type-scale utilities to UI-SPEC §Typography values verbatim — zero component churn this phase.**

## Performance

- **Duration:** ~2 min (159s)
- **Started:** 2026-05-08T01:33:17Z
- **Completed:** 2026-05-08T01:35:56Z
- **Tasks:** 2
- **Files modified:** 2 (`frontend/app/layout.tsx`, `frontend/app/globals.css`)

## Accomplishments

- **DESIGN-01 closed (Typography pairing loaded via `next/font/google`):** Fraunces + IBM Plex Sans + Geist Mono registered in `frontend/app/layout.tsx` with `display: swap`. Fraunces uses `axes: ["opsz"]` (variable optical-sizing axis); both Fraunces and IBM Plex Sans use `subsets: ["latin", "latin-ext"]` so French diacritics (à, â, é, è, ê, î, ô, û, ç, œ) render without glyph substitution. IBM Plex Sans loads weights 300/400/500/600 + italic. CSS variables `--font-display`, `--font-body`, `--font-mono` propagate through the `<html>` className.
- **DESIGN-02 closed (Type scale, weights, line-heights, letter-spacing as Tailwind v4 `@theme` tokens + utility classes):** `.text-display`, `.text-title`, `.text-body`, `.text-caption` rewritten to the exact values from UI-SPEC §Typography type-scale table — Fraunces italic at clamp(32, 44)/lh 1.05/weight 500/opsz 96 for display, Fraunces upright at 24/1.2/500/opsz 36 for title, IBM Plex Sans 16/1.55/400 for body, IBM Plex Sans 13/1.45/400 for caption (with `--foreground-muted` color).
- **DESIGN-08 advanced (font-related portion):** All font tokens consolidated in `frontend/app/globals.css` (`@theme inline` block + `.text-*` utilities). Combined with Plan 01's color/shadow/motion tokens, the only remaining DESIGN-08 work is the Phase 6 cross-component audit.
- **One-phase migration aliases preserved:** `--font-heading: var(--font-display)` and `--font-sans: var(--font-body)` keep the existing `font-heading` references in `card.tsx:41`, `dialog.tsx:133`, `sheet.tsx:117` and the body `font-sans` references rendering with zero component churn this phase.
- **viewport.themeColor untouched** at line 41 of `layout.tsx` (still legacy rose `#F43F5E`) — Phase 9 ONBOARD-10 owns that migration.
- **Plan 01-owned globals.css sections untouched:** `:root`, `.dark`, warm shadow declarations, motion CSS tokens, `.paper-grain` utility, `.dark .paper-grain::before` override, and the `@media (prefers-reduced-motion: reduce)` block all preserved verbatim.

## Files Modified

### `frontend/app/layout.tsx`

**Before** (top of file):
```tsx
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfairDisplay = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
// applied as: className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ...`}
```

**After:**
```tsx
import { Fraunces, IBM_Plex_Sans, Geist_Mono } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

// applied as: className={`${fraunces.variable} ${ibmPlexSans.variable} ${geistMono.variable} ...`}
```

### `frontend/app/globals.css`

**`@theme inline` font block (was lines 10-12):**
```css
/* Before */
--font-sans: var(--font-sans);
--font-mono: var(--font-geist-mono);
--font-heading: var(--font-playfair);

/* After */
--font-display: var(--font-display);
--font-body: var(--font-body);
--font-mono: var(--font-mono);
/* DEPRECATED — Phase 6 sweeps all `font-heading` and `font-sans` Tailwind utilities */
--font-heading: var(--font-display);
--font-sans: var(--font-body);
```

**`body` font-family in `@layer base`:**
```css
/* Before */
font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;

/* After */
font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
```

**Type-scale utilities in `@layer utilities`** (rewritten in place — same selectors `.text-display`, `.text-title`, `.text-body`, `.text-caption`, new declarations per UI-SPEC §Typography table):

| Class | Family | Size | Line-height | Weight | Letter-spacing | opsz | Style |
|-------|--------|------|-------------|--------|----------------|------|-------|
| `.text-display` | Fraunces | `clamp(2rem, 6vw, 2.75rem)` | 1.05 | 500 | -0.02em | 96 | italic |
| `.text-title` | Fraunces | 1.5rem | 1.2 | 500 | -0.015em | 36 | normal |
| `.text-body` | IBM Plex Sans | 1rem | 1.55 | 400 | -0.005em | n/a | normal |
| `.text-caption` | IBM Plex Sans | 0.8125rem | 1.45 | 400 | 0 | n/a | normal |

`.text-caption` keeps its `color: var(--foreground-muted)` declaration (warm-gray helper-copy color from Plan 01).

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-execution mode):

1. **Task 1: Replace font registrations in layout.tsx (DESIGN-01)** — `7e53ea3` (feat)
2. **Task 2: Update @theme inline font mappings + rewrite type-scale utilities (DESIGN-02, DESIGN-08)** — `4a75946` (feat)

## Acceptance Criteria — All Pass

### Task 1 (`frontend/app/layout.tsx`)

- [x] Imports `Fraunces`, `IBM_Plex_Sans`, `Geist_Mono` from `next/font/google`
- [x] Fraunces registered with `variable: "--font-display"`, `axes: ["opsz"]`, `subsets: ["latin", "latin-ext"]`, `style: ["normal", "italic"]`, `display: "swap"`
- [x] IBM_Plex_Sans registered with `variable: "--font-body"`, `weight: ["300", "400", "500", "600"]`, `subsets: ["latin", "latin-ext"]`, `style: ["normal", "italic"]`, `display: "swap"`
- [x] Geist_Mono registered with `variable: "--font-mono"`, `subsets: ["latin"]`, `display: "swap"`
- [x] Does NOT contain `Playfair_Display` (grep count = 0)
- [x] Does NOT contain standalone `Geist,` import (grep count = 0)
- [x] Does NOT contain `--font-playfair` (grep count = 0)
- [x] `<html className=...>` references `${fraunces.variable} ${ibmPlexSans.variable} ${geistMono.variable}`
- [x] viewport `themeColor` line unchanged (Phase 9 owns)

### Task 2 (`frontend/app/globals.css`)

- [x] `@theme inline` contains `--font-display: var(--font-display)`
- [x] `@theme inline` contains `--font-body: var(--font-body)`
- [x] `@theme inline` contains `--font-mono: var(--font-mono)`
- [x] Alias `--font-heading: var(--font-display)` present (one-phase bridge)
- [x] Alias `--font-sans: var(--font-body)` present (one-phase bridge)
- [x] `body { font-family: ... }` references `var(--font-body)` (not `var(--font-sans)`)
- [x] `.text-display` declares `font-size: clamp(2rem, 6vw, 2.75rem)`, `font-weight: 500`, `font-style: italic`, `font-variation-settings: "opsz" 96`
- [x] `.text-title` declares `font-size: 1.5rem`, `font-weight: 500`, `font-variation-settings: "opsz" 36`
- [x] `.text-body` declares `font-family: var(--font-body), ...`, `font-size: 1rem`, `line-height: 1.55`
- [x] `.text-caption` declares `font-family: var(--font-body), ...`, `font-size: 0.8125rem`, `line-height: 1.45`
- [x] Does NOT contain `var(--font-playfair)` (grep count = 0)
- [x] Does NOT contain `var(--font-geist-mono)` (grep count = 0)

## Plan-Level Verification

- `grep -rn "var(--font-playfair)" frontend/` → 0 results (legacy variable purged)
- `grep -rn "var(--font-geist-sans)" frontend/app/` → 0 results
- `cd frontend && npm run build`: NOT runnable in worktree (no `node_modules` symlinked from main checkout); per the parallel-execution instructions, build verification is owned by the orchestrator post-merge gate.
- Computed-style spot-check on `/styleguide` (UI-SPEC §"Computed-style spot-check"): deferred to Plan 06 which creates the styleguide route.
- Browser-devtools "Computed" panel verification on `localhost:3000/`: deferred to manual gate after merge.

## Bundle Size Delta vs v0.1

UI-SPEC §Typography "Variable-font support preferred" trade-off note projects ~200KB total typography payload:
- Fraunces variable (single file with opsz + ital axes) ~80KB (estimated)
- IBM Plex Sans 4 weights × 1 italic = 5 static cuts ~120KB (estimated)
- Geist Mono unchanged from v0.1

v0.1 baseline (Geist Sans + Geist Mono + Playfair Display italic) was approximately 100-130KB total. New baseline is ~200KB — +70-100KB delta.

Acceptable per the Phase 5 threat-model T-05-08 disposition (`accept` — `display: swap` ensures FOUT not FOIT, first paint never blocked by font load).

**Real measurement** is deferred to the orchestrator's post-merge `npm run build` gate; the numbers above are estimates from UI-SPEC and Google Fonts metadata.

## Plan 01-Owned Sections — Untouched (Verified)

| Section | Verification |
|---------|--------------|
| `:root` color tokens (terracotta `oklch(0.595 0.135 35)`) | `grep -c -F "oklch(0.595 0.135 35)" globals.css` = 3 (unchanged from Plan 01) |
| `.dark` color tokens | unchanged |
| Warm shadow declarations (`--shadow-card`, `--shadow-card-hover`, `--shadow-nav`) | unchanged |
| Motion CSS tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`) | present (verified via grep) |
| `.paper-grain` / `.paper-grain::before` / `.paper-grain > *` | present (3 selectors) |
| `.dark .paper-grain::before` | unchanged |
| `@media (prefers-reduced-motion: reduce)` | unchanged |
| `@media (prefers-color-scheme: dark)` block | unchanged |
| Dark `.dark { ... }` shadow override block | unchanged |

CSS brace balance after edits: open 22 / close 22 (diff = 0).

## Decisions Made

See frontmatter `key-decisions` field — the noteworthy ones:

- **Implemented UI-SPEC §Typography verbatim** rather than adjusting type-scale values locally. The spec was already French-diacritic-verified for iOS Safari and the values are downstream-consumed by Plans 05 + 06.
- **One-phase aliases live inside `@theme inline`** (not `:root`) so Tailwind v4 still derives `font-heading` and `font-sans` utilities — required for the existing primitive references in `card.tsx`, `dialog.tsx`, `sheet.tsx` to keep rendering until the Phase 6 sweep.
- **viewport.themeColor unchanged** at line 41 — Phase 9 ONBOARD-10 owns the legacy-rose-to-terracotta migration of the PWA manifest.
- **Plan 01-owned globals.css sections strictly untouched** per spawn-prompt scope_constraint — Plan 01 ↔ Plan 03 ownership partition respected.

## Deviations from Plan

None — plan executed exactly as written. All UI-SPEC §Typography values lifted verbatim, all acceptance criteria pass, scope constraint honored (only `frontend/app/layout.tsx` and `frontend/app/globals.css` modified), no scope creep.

## Auto-Fixed Issues

None — no Rule 1/2/3 deviations triggered. The plan was self-contained and the UI-SPEC was prescriptive enough that no inline bug fixes or critical-functionality additions were required.

## Authentication Gates

None — no auth surfaces touched.

## Issues Encountered

- **Build verification not runnable in worktree:** `cd frontend && npm run build` fails with `sh: next: command not found` because the worktree has no `frontend/node_modules` symlinked from the main checkout. Per the parallel-execution instructions in the spawn prompt, build verification is owned by the orchestrator post-merge gate, not this agent. Manual checks (CSS brace balance = 0; positive grep checks all pass; negative grep checks all return 0 hits) substitute.
- **`grep -F`-with-leading-dashes shell quirk:** `grep -F "--font-display..."` is interpreted as a flag, not a pattern. Worked around by using `grep -F -- "..."` (POSIX `--` end-of-options sentinel). Documented here so future executors don't repeat the workaround discovery.

## User Setup Required

None — no external service configuration required. next/font/google downloads Fraunces and IBM Plex Sans at build time and self-hosts them at the same origin (per UI-SPEC threat-model T-05-07 disposition).

## Known Stubs

None — no stub patterns introduced. The font registrations are fully wired (next/font/google → CSS variables → Tailwind utilities → component class names); the type-scale utilities have concrete declarations with no placeholder values.

## Next Phase Readiness

- **Wave 2 sibling (Plan 04 motion preset module):** unblocked — independent of this plan; consumes the motion CSS tokens already exposed by Plan 01.
- **Wave 3 plan (Plan 05 primitive re-themes):** unblocked — consumes:
  - The new `font-display` / `font-body` / `font-mono` Tailwind utilities (canonical names)
  - The one-phase `font-heading` / `font-sans` aliases (so existing references in `card.tsx:41`, `dialog.tsx:133`, `sheet.tsx:117` keep rendering)
  - The four `.text-*` utility classes (rewritten in place — same names, new families)
- **Wave 4 plan (Plan 06 styleguide route):** unblocked — the full typography surface is in place. Plan 06 should render the four type-scale utilities with the diacritic-rich French sample copy from UI-SPEC §Copywriting Contract ("« Al Dente. À la maison. »", "« Tagliatelles aux cèpes »", "« On laisse mijoter à feu doux pendant trois quarts d'heure. »", "« Cuit le 7 mai »", "Catégorie").
- **Phase 6 alias-sweep task:** required deliverable — grep `frontend/components/` for `font-heading` and `font-sans` Tailwind utility classes and replace with `font-display` and `font-body`. After all references are migrated, remove the two DEPRECATED alias lines from `frontend/app/globals.css` `@theme inline`.
- **No blockers** for any downstream plan.

## Self-Check

Verified before completion:

- **Files:**
  - `frontend/app/layout.tsx` — FOUND ([ -f ] returned true; contains `Fraunces`, `IBM_Plex_Sans`, `--font-display`, `--font-body`, `--font-mono`, `axes: ["opsz"]`, `weight: ["300", "400", "500", "600"]`, `subsets: ["latin", "latin-ext"]`).
  - `frontend/app/globals.css` — FOUND (CSS brace balance = 0; contains `--font-display: var(--font-display)`, `--font-body: var(--font-body)`, `--font-heading: var(--font-display)`, `--font-sans: var(--font-body)`, `font-family: var(--font-body)`, `font-variation-settings: "opsz" 96`, `font-variation-settings: "opsz" 36`, `clamp(2rem, 6vw, 2.75rem)`).
  - `.planning/phases/05-design-system-foundation/05-03-SUMMARY.md` — created by this Write.
- **Commits:**
  - `7e53ea3` — FOUND in `git log --oneline c7270da..HEAD` (Task 1).
  - `4a75946` — FOUND in `git log --oneline c7270da..HEAD` (Task 2).
- **Plan-level grep checks:** all pass:
  - `grep -rn "var(--font-playfair)" frontend/` → 0 results
  - `grep -rn "var(--font-geist-sans)" frontend/app/` → 0 results
  - `grep -F -- "--font-display: var(--font-display)" globals.css` → 1 hit
  - `grep -F -- "--font-heading: var(--font-display)" globals.css` → 1 hit (one-phase alias)
  - `grep -F -- "--font-sans: var(--font-body)" globals.css` → 1 hit (one-phase alias)
- **Scope constraint:** `git diff --name-only c7270da..HEAD` returns exactly 2 files (`frontend/app/globals.css`, `frontend/app/layout.tsx`) — no scope creep.
- **Plan 01 sections preserved:** terracotta `oklch(0.595 0.135 35)` count = 3 (unchanged); `--ease-craft`, `--duration-normal`, `.paper-grain`, `prefers-reduced-motion` all still present.

## Self-Check: PASSED

---
*Phase: 05-design-system-foundation*
*Plan: 03*
*Completed: 2026-05-08*
