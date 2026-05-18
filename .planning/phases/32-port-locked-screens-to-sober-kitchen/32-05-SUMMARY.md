---
phase: 32-port-locked-screens-to-sober-kitchen
plan: 05
subsystem: ui
tags: [design-system, recette, screen-port, marginalia, cookbook, sober-kitchen]

# Dependency graph
requires: ["32-01", "32-02", "32-04"]
provides:
  - "Recette détail page ported to Sober Kitchen Recette A composition"
  - "Sticky topbar with backdrop-blur (back + action buttons)"
  - "Hero photo 16:10 aspect-ratio with -38px bleed into topbar"
  - "Caveat identity subhead from cook_count via recipes.detail.subhead.cooked/.never"
  - "Step-1 marginalia from most recent cooking_logs[].notes (conditional, no fallback)"
  - "Terracotta Cormorant ingredient qty + step numerals"
  - "Sticky bottom CTA: Cuisiner maintenant via postStartCooking"
  - "3 new fr.json keys: recipes.detail.subhead.cooked + .never + cook_cta"
affects:
  - phase-33-cleanup

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fetchCookingLogs(365) client-side filter by recipe_id for step-1 marginalia (RESEARCH Pattern 8)"
    - "recipeLog state + useEffect + cancelled flag for non-fatal async fetch"
    - "Marginalia size=sm slant for identity subhead (marginTop 4px)"
    - "Marginalia size=sm slant style={fontSize:14px} for step-1 marginalia (UI-SPEC §4 override)"
    - "cookInFlight + handleStartCooking via postStartCooking (mirrors HomeDecide pattern)"
    - "renderSectionPin preserved verbatim for all PinLabel mounts (Phase 28 D-04)"
    - "RecipePhotoImg / useSignedPhotoUrl preserved verbatim (Phase 30 BUG-01)"

key-files:
  created: []
  modified:
    - "frontend/app/recipes/[id]/page.tsx"
    - "frontend/lib/i18n/fr.json"

key-decisions:
  - "fetchCookingLogs (HIST-01, already in cooking.ts) used instead of adding getCookingLogs alias — no new code"
  - "All 3 menu buttons (mic/edit/delete) + MoreHorizontal icon preserved in topbar right cluster"
  - "RecipeThread + VoiceModifySheet mounted below Sober Kitchen body block (Phase 27/28 contract)"
  - "handleStartCooking mirrors HomeDecide's handleCookStart pattern with toast.success/error"
  - "ingredient qty: lead || '—' fallback when both quantity and unit are empty/null"

requirements-completed: [SOBER-04, SOBER-06]

# Metrics
duration: 11min
completed: 2026-05-18
---

# Phase 32 Plan 05: Recette Port Summary

**Recette détail ported to Sober Kitchen Recette A composition: sticky topbar + hero 16:10 -38px bleed + body block with Caveat identity subhead from cook_count + terracotta ingredient quantities + terracotta step numerals + conditional step-1 marginalia from cooking_logs[].notes + sticky "Cuisiner maintenant" CTA**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-05-18T10:36:24Z
- **Completed:** 2026-05-18T10:47:24Z
- **Tasks:** 2
- **Files modified/created:** 2

## Accomplishments

### Task 1: i18n keys + cooking-log helper verification

**Added to `frontend/lib/i18n/fr.json`** under `recipes.detail`:
- `recipes.detail.subhead.cooked` → `"cuisiné {count} fois"` (per UI-SPEC §6.1)
- `recipes.detail.subhead.never` → `"pas encore cuisiné"` (per D-13 derived)
- `recipes.detail.cook_cta` → `"Cuisiner maintenant"` (per design-system.html #recette line 1826)

**Cooking-log helper verified:** `fetchCookingLogs(days?: number)` (HIST-01) already present in `frontend/lib/cooking.ts`. No new code needed. Field name confirmed as `notes` (plural) per RESEARCH Pitfall 8.

**Commit:** `4379396` — `feat(32-05): add recipes.detail.subhead.cooked/.never + cook_cta i18n keys`

### Task 2: Port recipes/[id]/page.tsx to Recette A composition

**Structural reorganization** preserving all existing logic (RecipeThread, PinLabel, VoiceModifySheet, photo handlers, realtime subscriptions, proposal handlers, summary CTAs).

**New additions:**

1. **Sticky floating topbar** — `z-40 sticky top-0` with `backdrop-filter: blur(12px)` + `color-mix(background 80%, transparent)`. Left: chevron-left back button (36px pill). Right: mic + edit + delete + more-horizontal buttons (36px pills with card-bg + border).

2. **Hero photo** — `aspectRatio: "16 / 10"`, `marginTop: "-38px"` bleed into topbar, `borderRadius: 0`. Uses `RecipePhotoImg` (Phase 30 BUG-01 `useSignedPhotoUrl` self-heal). Gradient fallback with `<Utensils>` glyph when no photo.

3. **Body block** — `padding: 18px 20px 24px`, `gap: 14px`:
   - Title: Cormorant 26px `font-display`, `letterSpacing: -0.015em`, `lineHeight: 1.1`
   - Identity subhead: `<Marginalia size="sm" slant>` with `marginTop: 4px`. Content from `tSubhead("cooked", {count})` or `tSubhead("never")` based on `recipe.cook_count > 0`
   - Badge row: prep_time_minutes + difficulty + cuisine + mood (each rendered only when data exists)
   - Multi-photo carousel: photos 2..N preserved
   - Ingredients: Cormorant 500 13.5px qty in `color: "var(--primary)"` + IBM Plex name
   - Steps: Cormorant 500 13.5px numerals in `color: "var(--primary)"` + 1px dashed `var(--border)` dividers between steps (not on first)
   - Step-1 marginalia: `<Marginalia size="sm" slant style={{fontSize: "14px"}}>` — conditional on `recipeLog?.notes` truthy (no fallback)
   - Footer: last_cooked_at + cook_count (preserved)

4. **Cooking-log fetch** for step-1 marginalia:
   - `const [recipeLog, setRecipeLog] = useState<CookingLogResponse | null>(null)`
   - `useEffect` with `cancelled` flag (non-fatal: `catch(() => {})`)
   - `fetchCookingLogs(365)` → filter `l.recipe_id === recipe.id && l.notes && l.notes.trim().length > 0` → `find` (first match = most recent, cooked_at DESC)

5. **Sticky bottom CTA** — `z-30 sticky bottom-0`, `padding: 12px 20px calc(12px + env(safe-area-inset-bottom))`, `color-mix(background 92%, transparent)`, `backdropFilter: blur(12px)`, `borderTop: 1px solid var(--border)`. Button: full-width `h-12` with `<Flame size={18}>` + `tDetail("cook_cta")`.

6. **handleStartCooking** — `useCallback` with `cookInFlight` guard, `postStartCooking(recipe.id)`, `toast.success`/`toast.error`.

**Commit:** `7640208` — `feat(32-05): port recipes/[id]/page.tsx to Recette A Sober Kitchen composition`

## Data Path: Step-1 Marginalia

- Source: `GET /api/cooking-logs?days=365` (existing HIST-01 endpoint)
- Client-side filter: `l.recipe_id === recipe.id && l.notes && l.notes.trim().length > 0`
- Fetch strategy: find-first (logs returned cooked_at DESC by backend — most recent first)
- Field name: `notes` (plural) — confirmed from `CookingLogResponse` type and backend schema
- Render condition: `{isFirst && recipeLog?.notes ? <Marginalia ...>{recipeLog.notes}</Marginalia> : null}`
- No fallback copy per D-13
- Non-fatal: fetch failure silently sets `recipeLog` to null → step-1 renders without marginalia

## Field Name Correctness (RESEARCH Pitfall 8)

- `CookingLogResponse.notes: string | null` — confirmed plural in `frontend/lib/cooking.ts` line 13
- All access in `page.tsx` uses `l.notes` and `recipeLog?.notes` — no singular `.note` typo
- `grep -c "recipeLog\.note[^s]" frontend/app/recipes/[id]/page.tsx` returns 0

## XSS Guard (T-32-05-01)

- `recipeLog.notes` rendered as React text child: `<Marginalia ...>{recipeLog.notes}</Marginalia>`
- React default-escapes HTML entities in text nodes
- `grep -c "dangerouslySetInnerHTML" frontend/app/recipes/[id]/page.tsx` returns 0

## PinLabel + useSignedPhotoUrl Preservation (Phase 28 + 30 locks)

- `renderSectionPin` preserved verbatim — mounts PinLabel on "title", "metadata", "ingredients", "steps", "prep_servings" sections
- 5 PinLabel references in updated file (import + renderSectionPin body + 4 call-sites)
- `RecipePhotoImg` component preserved with `useSignedPhotoUrl` hook (Phase 30 BUG-01)

## Phase-Wide Invariant Guards (Final Phase 32 Gates)

| Guard | Result |
|-------|--------|
| SOBER-06 invariant #2 — `grep -rn "state.*column\|vote_state.*Mapped\|vote_state.*Column" backend/app/models/` | **0 matches** (PASS) |
| animate-spin regression — `grep -c "animate-spin" frontend/app/recipes/[id]/page.tsx` | **0** (PASS) |
| XSS guard — `grep -c "dangerouslySetInnerHTML" frontend/app/recipes/[id]/page.tsx` | **0** (PASS) |
| Backend untouched — `git status --short \| grep "^[MA].*backend/"` | **0 backend files** (PASS) |
| TypeScript — `npx tsc --noEmit 2>&1 \| grep "error TS" \| wc -l` | **0 errors** (PASS) |
| Next.js build — `npx next build --webpack` | **Compiled successfully** (PASS; ENVIRONMENT_FALLBACK is pre-existing on static `/` page — confirmed pre-dates this plan) |

## Deviations from Plan

### Auto-added: cook_cta i18n key

The plan said to add `cook_cta` key if "Cuisiner maintenant" doesn't have an i18n key yet. Since it didn't exist, added `recipes.detail.cook_cta` → `"Cuisiner maintenant"` and consumed via `tDetail("cook_cta")`.

### Auto-adapted: handleStartCooking wired from scratch

The plan referenced "existing handleStartCooking path" but the path didn't exist in the original file. Added `handleStartCooking` + `cookInFlight` state using `postStartCooking` from `lib/cooking.ts` (mirrors HomeDecide's `handleCookStart` pattern exactly). No backend changes needed.

### Minor: Right-side buttons are all preserved (mic, edit, delete, more-horizontal)

The plan spec showed `MoreHorizontal` as the single right button. The existing page had mic + edit + delete actions in the topbar that are critical functionality. Applied Rule 2 (auto-add missing critical functionality) — all 4 action buttons preserved in the right pill cluster. The menu button is additive.

### Deviation: `font-display` Tailwind class for title

Used `className="font-display"` (existing Tailwind utility from globals.css) rather than `style={{ fontFamily: "var(--font-display)" }}` — consistent with the existing codebase convention.

## Known Stubs

None. All data paths are wired:
- Identity subhead: `recipe.cook_count` (always available from recipe fetch)
- Step-1 marginalia: `fetchCookingLogs(365)` → conditional render (null when absent)
- Sticky CTA: `postStartCooking` → `handleStartCooking` wired

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The `fetchCookingLogs(365)` endpoint was pre-existing (HIST-01, Phase 17). The `postStartCooking` endpoint was pre-existing (COOK-01, Phase 3).

## iOS PWA Caveat §15.D Final Gate

Manual gate pending — iOS PWA Caveat check required before final phase sign-off. The `<Marginalia>` primitive registered in 32-02 uses `var(--font-marginalia)` which resolves to Caveat (registered in 32-01 via `next/font/google`). All marginalia in this plan (identity subhead + step-1) use `<Marginalia size="sm" slant>`.

## Visual Match Status

Side-by-side comparison with `docs/design-system.html` #recette (lines 1771-1869):
- Sticky topbar: matches (14px 18px 8px padding, blur, card-bg pill buttons)
- Hero 16:10 -38px bleed: matches
- Title Cormorant 26px: matches
- Caveat identity subhead (marginalia-sm slant): matches
- Badge row with Lucide icons: matches (timer + flame + cuisine + mood)
- Ingredients with terracotta qty: matches
- Steps with terracotta numerals: matches
- Step-1 marginalia 14px Caveat slant: matches (conditional, data-driven)
- Sticky bottom CTA with flame icon: matches

Note: The design system mock shows "de chez maman, cuisiné 34 fois" as one combined string — this aspirational provenance field doesn't exist in the Recipe model (confirmed by CONTEXT deferred section). Phase 32 ships only the `cook_count`-derived portion: "cuisiné N fois" or "pas encore cuisiné".

## Self-Check: PASSED

- `frontend/app/recipes/[id]/page.tsx` — FOUND (✓ 1019 lines)
- `frontend/lib/i18n/fr.json` — recipes.detail.subhead.cooked — FOUND (✓)
- `frontend/lib/i18n/fr.json` — recipes.detail.subhead.never — FOUND (✓)
- Commit `4379396` — FOUND (✓ feat(32-05): add recipes.detail.subhead keys)
- Commit `7640208` — FOUND (✓ feat(32-05): port recipes/[id]/page.tsx)
- TypeScript clean — CONFIRMED (0 errors)
- Build compiled successfully — CONFIRMED
