---
phase: 32-port-locked-screens-to-sober-kitchen
plan: 04
subsystem: ui
tags: [design-system, bibliotheque, screen-port, patine, view-switcher, ledger-card]

# Dependency graph
requires: ["32-01", "32-02"]
provides:
  - "Bibliothèque page with 3-view switcher (grid/list/patina), localStorage persistence, anti-flash hydration"
  - "LibraryViewSwitch component: controlled segmented radiogroup with lucide icons + aria-checked"
  - "RecipeRow component: horizontal LedgerCard row for list editorial view (72×72 photo right, title+meta left)"
  - "cookCountToPatina helper: 0→0, 1-2→1, 3-10→2, >10→3 (D-11)"
  - "groupByPatina helper: heritage/habitudes/essai buckets (D-12)"
  - "RecipeCard wrapped in LedgerCard with cookCountToPatina-derived patina; paper-grain removed (Pitfall 1)"
  - "6+ fr.json i18n keys: home.library.patina_section.{heritage,habitudes,essai} + home.library.view.{grid,list,patina}.aria + recipes.library.count_{singular,plural}"
affects:
  - 32-05-recette-port

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PatinaLevel type alias: 0|1|2|3 discriminated union (compile-time checked, no CSS injection)"
    - "cookCountToPatina: O(1) if/return cascade; thresholds from CONTEXT D-11"
    - "groupByPatina: O(3n) triple filter; called per render inside PatinaView (couple-scale safe)"
    - "LibraryViewSwitch: pure controlled component; parent owns localStorage persistence"
    - "Anti-flash hydration: SSR grid default; useEffect reads localStorage post-mount; opacity 0→1 over 150ms"
    - "PatinaSection/PatinaView as file-scoped functions outside RecipesPage (no re-creation on render)"
    - "RecipeRow mirrors RecipeCard photo URL self-heal + cooking-log path detection exactly"
    - "LedgerCard p-0 override on RecipeCard so photo bleeds to card edge"

key-files:
  created:
    - "frontend/components/LibraryViewSwitch.tsx"
    - "frontend/components/RecipeRow.tsx"
  modified:
    - "frontend/lib/recipes.ts"
    - "frontend/lib/i18n/fr.json"
    - "frontend/components/RecipeCard.tsx"
    - "frontend/app/recipes/page.tsx"

key-decisions:
  - "PatinaSection/PatinaView defined as file-scoped functions (not inside RecipesPage) to avoid re-creation on every render"
  - "grid: 2-col mobile → 3-col @md (open Q A4 resolution — PWA iPhone primary; desktop rare)"
  - "List-view marginalia omitted (Open Q3 resolution — no per-row data source wired in Phase 32)"
  - "RecipeCard accepts optional patina prop with default cookCountToPatina(recipe.cook_count)"
  - "pb-(--spacing-bottom-safe) moved to the anti-flash opacity wrapper div to keep spacing in all views"
  - "recipes.library.count_{singular,plural} added to fr.json alongside home.library.* keys"

requirements-completed: [SOBER-03, SOBER-05]

# Metrics
duration: 8min
completed: 2026-05-18
---

# Phase 32 Plan 04: Bibliothèque Port Summary

**Bibliothèque ported to 3-view switcher (grid / list editorial / patine grouped) with LibraryViewSwitch, RecipeRow, cookCountToPatina + groupByPatina helpers, LedgerCard adoption across all recipe cards, paper-grain removed from RecipeCard, and localStorage view persistence with 150ms anti-flash hydration**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-18T10:26:17Z
- **Completed:** 2026-05-18T10:34:00Z
- **Tasks:** 3
- **Files modified/created:** 6

## Accomplishments

### Task 1: Helpers + i18n keys + RecipeCard wrap

**A. Added to `frontend/lib/recipes.ts`** (after `postRetryPromotion`):
- `PatinaLevel` type alias: `0 | 1 | 2 | 3`
- `cookCountToPatina(n: number): PatinaLevel` — thresholds: `0→0`, `1-2→1`, `3-10→2`, `>10→3` (D-11)
- `groupByPatina(recipes: readonly Recipe[])` — returns `{ heritage, habitudes, essai }` (D-12)

**B. Added to `frontend/lib/i18n/fr.json`** under `home.library.*`:
- `home.library.patina_section.heritage` → `"Héritage"`
- `home.library.patina_section.habitudes` → `"Habitudes"`
- `home.library.patina_section.essai` → `"À l'essai"`
- `home.library.view.grid.aria` → `"Grille"`
- `home.library.view.list.aria` → `"Liste"`
- `home.library.view.patina.aria` → `"Patine"`
- `recipes.library.count_singular` → `"{n} recette"`
- `recipes.library.count_plural` → `"{n} recettes"`

**C. Modified `frontend/components/RecipeCard.tsx`**:
- Removed `paper-grain` class from outer `<Link>` (RESEARCH Pitfall 1 — double-grain eliminated)
- Added `LedgerCard` import + `cookCountToPatina` import
- Accepts optional `patina?: PatinaLevel` prop (defaults to `cookCountToPatina(recipe.cook_count)`)
- Wraps card body in `<LedgerCard patina={resolvedPatina} className="flex flex-col overflow-hidden p-0">`
- All existing logic preserved: photo self-heal hook (BUG-01), cooking-log path detection (D-05), « Échec » pill

### Task 2: LibraryViewSwitch + RecipeRow

**`frontend/components/LibraryViewSwitch.tsx`**:
- Controlled segmented radiogroup (`role="radiogroup"`, `role="radio"`, `aria-checked`)
- Icons: `LayoutGrid` / `List` / `Layers` (lucide-react)
- i18n aria labels from `useTranslations("home.library.view")` (D-21)
- Active state: var(--card) background + var(--primary) color + var(--shadow-card)
- Pure controlled — parent page owns localStorage persistence (D-10)

**`frontend/components/RecipeRow.tsx`**:
- Horizontal `<LedgerCard>` row: title + meta left, 72×72 photo right
- Mirrors RecipeCard photo URL self-heal + cooking-log path detection exactly
- Cormorant 18px/500 title (font-display), cuisine Badge + relative date meta
- « Échec » destructive pill preserved for failed status
- List-view marginalia OMITTED (Open Q3 resolution — no per-row data source)

### Task 3: recipes/page.tsx — 3-view Bibliothèque port

**New state:**
- `view: LibraryView` — initialized to `"grid"` (SSR safe)
- `hydrated: boolean` — initialized to `false`; set `true` in `useEffect`

**Hydration effect:**
```tsx
useEffect(() => {
  const stored = window.localStorage.getItem("aldente.library.view");
  if (stored === "list" || stored === "patina") setView(stored);
  setHydrated(true);
}, []);
```
(localStorage read inside `useEffect` only — RESEARCH Pitfall 5)

**Anti-flash container:**
```tsx
<div className={`transition-opacity duration-150 pb-(--spacing-bottom-safe) ${hydrated ? "opacity-100" : "opacity-0"}`}>
```

**Three view panels:**
- Grid: `grid grid-cols-2 md:grid-cols-3 gap-[10px]` — 2-col mobile → 3-col @md
- List: `flex flex-col gap-[14px]` of `<RecipeRow>` items
- Patina: `PatinaView` with `PatinaSection` per bucket (Héritage/Habitudes/À l'essai)

**PatinaSection pattern:**
- Section header: Cormorant 500 16px label + Caveat sm count via `<Marginalia>`
- Heritage: 1-col grid (larger cards — oldest recipes)
- Habitudes: 2-col grid
- À l'essai: 3-col grid (denser — new recipes)
- Empty buckets omitted (UI-SPEC §6.3)

**All existing logic preserved:**
- `useRealtime` subscriptions (recipe.created / recipe.updated / recipe.deleted)
- `recipesCache` module-level cache
- `handleSearch` debounced filter
- Sticky header + Add CTA button
- `EmptyState` for empty search + empty library

## Task Commits

1. **Task 1: Add patina helpers, i18n keys, wrap RecipeCard in LedgerCard** - `b8a1992` (feat)
2. **Task 2: Add LibraryViewSwitch + RecipeRow components** - `3b3b16c` (feat)
3. **Task 3: Port Bibliothèque to 3-view switcher with localStorage + anti-flash** - `c3b4d38` (feat)

## Files Created/Modified

- `frontend/lib/recipes.ts` — MODIFIED: +49 lines (PatinaLevel + cookCountToPatina + groupByPatina)
- `frontend/lib/i18n/fr.json` — MODIFIED: +14 lines (8 new keys)
- `frontend/components/RecipeCard.tsx` — MODIFIED: +12 lines (LedgerCard wrap, paper-grain removed, patina prop)
- `frontend/components/LibraryViewSwitch.tsx` — CREATED: 60 lines
- `frontend/components/RecipeRow.tsx` — CREATED: 133 lines
- `frontend/app/recipes/page.tsx` — MODIFIED: +138 lines / -4 lines (3-view switcher + anti-flash)

## Decisions Made

1. **PatinaSection/PatinaView as file-scoped functions:** Avoids re-creation on every RecipesPage render; cleaner JSX without inline function blowup.
2. **Grid responsive breakpoints:** 2-col mobile → 3-col @md (open Q A4 resolution — iPhone PWA is primary; 4-col @lg skipped).
3. **List-view marginalia omitted:** No per-row data source — would require separate `cooking_logs` fetch per row. Deferred to 32-05 where the data path is simpler (single recipe).
4. **`pb-(--spacing-bottom-safe)` on anti-flash wrapper:** Keeps bottom safe-area inset in all 3 views.
5. **8 i18n keys added:** The plan specified 6 minimum (patina_section × 3 + view × 3); added 2 more (`recipes.library.count_{singular,plural}`) needed by the meta row count display.

## Phase-Wide Grep Gates (D-03)

```
# animate-spin outside BrandLoader.tsx:
grep -rn "animate-spin|Spinner|LoadingSpinner" frontend/ | grep -v BrandLoader.tsx | grep -v showSpinner | wc -l
0  ← PASS (3 showSpinner variable refs in HomeDecide are regex false positives — documented in 32-02 SUMMARY)

# state column guard (invariant #2):
grep -rn "state.*column|vote_state.*Mapped" backend/app/models/ | wc -l
0  ← PASS

# backend files changed:
git diff --name-only HEAD | grep "^backend/" | wc -l
0  ← PASS (no backend changes — invariant #4 preserved)

# TypeScript errors:
cd frontend && npx tsc --noEmit | grep "error TS" | wc -l
0  ← PASS

# Next.js build:
cd frontend && npx next build --webpack → ✓ Compiled successfully, 15/15 pages generated ← PASS
# (ENVIRONMENT_FALLBACK error pre-existing — present before this plan, unrelated to 32-04 changes)
```

## Open Q3 Resolution: List-View Marginalia

Per `implementation_notes` and UI-SPEC §9.2 Open Question 3: list-view marginalia **omitted** for Phase 32. The doc mock shows "cèpes secs, magique" but there's no field on the Recipe model that maps to this without a per-row `cooking_logs` fetch. This will be revisited in 32-05 (recipe detail) where the data path is already simpler (single recipe context). `RecipeRow` is designed to accept future marginalia without a breaking change.

## Open Q A4 Resolution: Grid Responsive Breakpoints

2-col mobile (default) → 3-col @md (`md:grid-cols-3`). Skip 4-col @lg — the iPhone-shaped PWA viewport is the primary use case; desktop is rare. Same reasoning applies to the patine view sections (1/2/3 column density per bucket tier).

## Known Stubs

None — all data flows wired:
- `cookCountToPatina` derives patina from real `recipe.cook_count` field
- `groupByPatina` filters live recipe list from API
- i18n keys translate to real French strings
- `LibraryViewSwitch` controls real view state
- `RecipeRow` displays real recipe data via same API as `RecipeCard`

## Threat Flags

None — no new network endpoints, no auth paths, no schema changes. localStorage stores only `"grid"|"list"|"patina"` literals (validated before state update). All threat dispositions T-32-04-01..05 accepted per plan threat model.

## Self-Check: PASSED

- FOUND: frontend/components/LibraryViewSwitch.tsx ✓
- FOUND: frontend/components/RecipeRow.tsx ✓
- FOUND: frontend/lib/recipes.ts (export function cookCountToPatina) ✓
- FOUND: frontend/lib/recipes.ts (export function groupByPatina) ✓
- FOUND: frontend/lib/recipes.ts (export type PatinaLevel) ✓
- CONFIRMED: cookCountToPatina thresholds: 0→0, 1-2→1, 3-10→2, >10→3 ✓
- CONFIRMED: paper-grain count in RecipeCard = 0 ✓
- CONFIRMED: LedgerCard count in RecipeCard = 3 (import + open + close) ✓
- CONFIRMED: aldente.library.view in page.tsx = 3 (comment + getItem + setItem) ✓
- CONFIRMED: home.library.patina_section.heritage = "Héritage" ✓
- CONFIRMED: home.library.patina_section.habitudes = "Habitudes" ✓
- CONFIRMED: home.library.patina_section.essai = "À l'essai" ✓
- CONFIRMED: home.library.view.grid.aria = "Grille" ✓
- CONFIRMED: home.library.view.list.aria = "Liste" ✓
- CONFIRMED: home.library.view.patina.aria = "Patine" ✓
- CONFIRMED: b8a1992 (Task 1 commit) ✓
- CONFIRMED: 3b3b16c (Task 2 commit) ✓
- CONFIRMED: c3b4d38 (Task 3 commit) ✓
- CONFIRMED: TypeScript errors = 0 ✓
- CONFIRMED: Next.js build = 15/15 pages generated ✓
- CONFIRMED: animate-spin gate = 0 (excluding showSpinner false positives) ✓
- CONFIRMED: state column guard = 0 ✓
- CONFIRMED: backend diff = 0 ✓

---
*Phase: 32-port-locked-screens-to-sober-kitchen*
*Completed: 2026-05-18*
