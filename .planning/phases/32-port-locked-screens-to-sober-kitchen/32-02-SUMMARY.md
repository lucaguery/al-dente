---
phase: 32-port-locked-screens-to-sober-kitchen
plan: 02
subsystem: ui
tags: [design-system, primitives, components, spinner-sweep, brand-loader, sober-kitchen]

# Dependency graph
requires: ["32-01"]
provides:
  - "<Marginalia size sm/md/lg slant> Caveat wrapper in frontend/components/Marginalia.tsx"
  - "<BrandLoader size default/sm> drawing-stroke loader in frontend/components/BrandLoader.tsx"
  - "<LedgerCard patina 0|1|2|3 dogear?> patine card in frontend/components/LedgerCard.tsx"
  - "<TableVote votes members myMemberId size?> table-scene in frontend/components/TableVote.tsx"
  - "12 spinner call-sites swept: HomeDecide (x2), RecipeForm (x1), SystemBubble (x3), VoiceModifySheet (x1), SearchInput (x1), onboarding/create (x1), onboarding/join (x2), sonner Toaster (x1)"
  - "SOBER-08 grep gate: 0 animate-spin outside BrandLoader.tsx"
affects:
  - 32-03-accueil-port
  - 32-04-bibliotheque-port
  - 32-05-recette-port

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BrandLoader wraps BrandIcon SVG + .loader-brand CSS class — no animate-spin, uses @keyframes drawLoop from globals.css"
    - "Marginalia is a thin wrapper around .marginalia CSS classes — no direct font ref, font resolves via CSS"
    - "LedgerCard: --patina CSS var passed as inline style; dogear auto-shows at patina >= 3"
    - "TableVote: per-seat state computed from individual votes (invariant #2 preserved — no state column)"
    - "conteste per-seat: yes voter = seat-state-valide, no voter = seat-state-contested (A6 resolution per UI-SPEC §7.2)"
    - "Spinner sweep: atomic in single plan (D-14 strict gate), no Spinner shim (D-15)"

key-files:
  created:
    - "frontend/components/Marginalia.tsx"
    - "frontend/components/BrandLoader.tsx"
    - "frontend/components/LedgerCard.tsx"
    - "frontend/components/TableVote.tsx"
  modified:
    - "frontend/components/HomeDecide.tsx"
    - "frontend/components/RecipeForm.tsx"
    - "frontend/components/RecipeThread/SystemBubble.tsx"
    - "frontend/components/VoiceModifySheet.tsx"
    - "frontend/components/SearchInput.tsx"
    - "frontend/app/onboarding/create/page.tsx"
    - "frontend/app/onboarding/join/page.tsx"
    - "frontend/components/ui/sonner.tsx"
  deleted:
    - "frontend/app/styleguide/page.tsx (worktree index artifact — 32-01 already deleted on main)"

key-decisions:
  - "conteste per-seat A6 resolution: yes voter seat = seat-state-valide, no voter seat = seat-state-contested — captures editorial drama of disagreement per doc mock line 1515"
  - "BrandLoader sm size keeps stroke-dasharray: 220 (viewBox-relative, scales proportionally at 18px) — visual gate deferred to 32-03 close"
  - "showSpinner variable name in HomeDecide.tsx is NOT a spinner component — grep gate regex false positive documented; actual gate (animate-spin count) = 0"
  - "styleguide deletion: worktree index had stale entry (pre-32-01 state due to git reset --soft); deleted as Rule 3 fix to keep Next.js build clean"

requirements-completed: [SOBER-07, SOBER-08]

# Metrics
duration: 30min
completed: 2026-05-18
---

# Phase 32 Plan 02: Sober Kitchen Primitives + Spinner Sweep Summary

**Four Sober Kitchen primitives (Marginalia, BrandLoader, LedgerCard, TableVote) created; 12 spinner call-sites atomically swept from Loader2/Loader2Icon to BrandLoader; SOBER-08 animate-spin grep gate passes at 0**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-05-18T09:55:00Z
- **Completed:** 2026-05-18T10:08:08Z
- **Tasks:** 2
- **Files created:** 4
- **Files modified:** 8
- **Files deleted:** 1 (styleguide artifact)

## Accomplishments

### Task 1: Four Sober Kitchen Primitives

Created four pure component primitives in `frontend/components/`:

**`Marginalia.tsx`** — Caveat wrapper with `size` (sm/md/lg) and `slant` props. Composes `.marginalia` + `.marginalia-{size}` + `.slant` CSS classes added in 32-01. Uses `as` prop for semantic element choice (p/span/div). No direct font reference — resolves via CSS. Per D-05, UI-SPEC §7.3.

**`BrandLoader.tsx`** — Drawing-stroke loader composing `BrandIcon` SVG inside `.loader-brand` CSS wrapper. `size="default"` renders 96px; `size="sm"` renders 18px. Animation driven by `@keyframes drawLoop` in globals.css (added 32-01) — zero `animate-spin`. prefers-reduced-motion handled by CSS. Per D-14, D-15, UI-SPEC §7.4.

**`LedgerCard.tsx`** — Patine ledger card wrapping children in `.ledger-card` class with `--patina` CSS custom property injected as inline style. Dogear SVG (corner-fold) auto-renders when `patina >= 3` (Héritage tier) or `dogear` prop explicitly set. Consumers must NOT add `paper-grain` class (double-grain pitfall per 32-RESEARCH). Per D-07, UI-SPEC §7.1.

**`TableVote.tsx`** — Table-à-manger voting scene. Renders `.table-scene` + per-seat `.table-seat.seat-{position}` spans. Per-seat CSS state class derived from each member's individual vote against the aggregate via `computeVoteState` from `lib/votes.ts`. No state column anywhere (invariant #2). Per D-05, D-19, UI-SPEC §7.2.

### Task 2: Spinner Sweep (12 call-sites)

Atomically swept all 12 Loader2/Loader2Icon sites to BrandLoader per D-14 strict gate:

| # | File | Before | After |
|---|------|--------|-------|
| 1 | HomeDecide.tsx:350 | `<Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary" />` | `<BrandLoader aria-label="Chargement" />` |
| 2 | HomeDecide.tsx:391 | same shape (cold-load) | `<BrandLoader aria-label="Chargement" />` |
| 3 | RecipeForm.tsx:615 | `<Loader2 className="animate-spin h-4 w-4 mr-2" />` | `<BrandLoader size="sm" className="mr-2" />` |
| 4 | SystemBubble.tsx:140 | `<Loader2 size={14} className="animate-spin" aria-hidden />` | `<BrandLoader size="sm" aria-label="Chargement" />` |
| 5 | SystemBubble.tsx:287 | same | `<BrandLoader size="sm" aria-label="Chargement" />` |
| 6 | SystemBubble.tsx:486 | same (10-space indent) | `<BrandLoader size="sm" aria-label="Chargement" />` |
| 7 | VoiceModifySheet.tsx:109 | `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` | `<BrandLoader size="sm" className="mr-2" />` |
| 8 | SearchInput.tsx:102 | `<Loader2 aria-hidden className="h-4 w-4 animate-spin text-foreground-muted" />` | `<BrandLoader size="sm" aria-label="Chargement" className="text-foreground-muted" />` |
| 9 | onboarding/create:144 | `<Loader2 className="animate-spin h-4 w-4 mr-2" aria-hidden />` | `<BrandLoader size="sm" className="mr-2" />` |
| 10 | onboarding/join:310 | `<Loader2 className="h-4 w-4 animate-spin text-foreground-muted" aria-hidden />` | `<BrandLoader size="sm" aria-label="Chargement" className="text-foreground-muted" />` |
| 11 | onboarding/join:343 | `<Loader2 className="animate-spin h-4 w-4 mr-2" aria-hidden />` | `<BrandLoader size="sm" className="mr-2" />` |
| 12 | sonner.tsx:29 | `<Loader2Icon className="size-4 animate-spin" />` (Toaster icons.loading) | `<BrandLoader size="sm" />` |

## Task Commits

1. **Task 1: Create four Sober Kitchen primitives** - `19de6a7` (feat)
2. **Task 2: Sweep 12 spinner call-sites + styleguide cleanup** - `ce3c593` (feat)

## Files Created/Modified

- `frontend/components/Marginalia.tsx` — CREATED: Caveat wrapper primitive (49 lines)
- `frontend/components/BrandLoader.tsx` — CREATED: Drawing-stroke loader primitive (44 lines)
- `frontend/components/LedgerCard.tsx` — CREATED: Patine ledger card primitive (62 lines)
- `frontend/components/TableVote.tsx` — CREATED: Table-à-manger voting scene primitive (123 lines)
- `frontend/components/HomeDecide.tsx` — MODIFIED: Loader2 import removed; BrandLoader imported + 2 sites swapped
- `frontend/components/RecipeForm.tsx` — MODIFIED: Loader2 removed from lucide import; BrandLoader imported + 1 site swapped
- `frontend/components/RecipeThread/SystemBubble.tsx` — MODIFIED: Loader2 removed from lucide import; BrandLoader imported + 3 sites swapped
- `frontend/components/VoiceModifySheet.tsx` — MODIFIED: Loader2 import removed; BrandLoader imported + 1 site swapped
- `frontend/components/SearchInput.tsx` — MODIFIED: Loader2 removed from lucide import; BrandLoader imported + 1 site swapped
- `frontend/app/onboarding/create/page.tsx` — MODIFIED: Loader2 removed from lucide import; BrandLoader imported + 1 site swapped
- `frontend/app/onboarding/join/page.tsx` — MODIFIED: Loader2 removed from lucide import; BrandLoader imported + 2 sites swapped
- `frontend/components/ui/sonner.tsx` — MODIFIED: Loader2Icon removed from lucide import; BrandLoader imported; Toaster icons.loading swapped
- `frontend/app/styleguide/page.tsx` — DELETED: Worktree index artifact (32-01 deleted it on main)

## Decisions Made

- conteste per-seat A6 resolution: yes voter = seat-state-valide, no voter = seat-state-contested. Captures the editorial drama of disagreement per doc mock line 1515 and UI-SPEC §7.2.
- BrandLoader sm: stroke-dasharray stays at 220 (viewBox-relative). Visual quality check at 18px deferred to 32-03 close.
- PinLabel.tsx untouched per D-05 (Phase 28 API lock).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Worktree index had stale styleguide entry**
- **Found during:** Task 2 (build verification)
- **Issue:** The worktree was initialized via `git reset --soft b6a98ef` which moved HEAD but left the git index with the pre-32-01 state. `frontend/app/styleguide/page.tsx` was physically present in the worktree (32-01 deleted it on main branch), causing Next.js to include `/styleguide` in the route table.
- **Fix:** Deleted the file; included in Task 2 commit as worktree cleanup.
- **Files modified:** `frontend/app/styleguide/page.tsx` (deleted)
- **Commit:** ce3c593

**2. [Rule 1 - Bug] SystemBubble.tsx third spinner site had different indentation**
- **Found during:** Task 2 grep gate check
- **Issue:** The `replace_all` edit replaced two of the three `<Loader2 size={14} className="animate-spin" aria-hidden />` instances (14-space indent) but missed the third at line 486 (10-space indent).
- **Fix:** Applied separate Edit for the 10-space indent variant.
- **Files modified:** `frontend/components/RecipeThread/SystemBubble.tsx`
- **Commit:** ce3c593

## Grep Gate Results

```
# animate-spin outside BrandLoader.tsx:
grep -rn "animate-spin" frontend/components/ frontend/app/ frontend/lib/ | grep -v BrandLoader.tsx | wc -l
0  ← PASS

# Loader2 / Loader2Icon (imports/JSX, excluding comments):
grep -rn "Loader2\|Loader2Icon" frontend/components/ frontend/app/ frontend/lib/ | grep -v node_modules | grep -v ".next" | grep -v "^.*:.*\/\/" | wc -l
0  ← PASS

# BrandLoader adoption:
grep -rn "BrandLoader" frontend/components/ frontend/app/ | grep -v node_modules | wc -l
26  ← PASS (min 13)

# Invariant #2 backend:
grep -rn "state.*column\|vote_state.*Mapped" backend/app/models/ | wc -l
0  ← PASS

# Backend files changed:
git diff HEAD --name-only | grep "^backend/" | wc -l
0  ← PASS (frontend-only plan)

# PinLabel unchanged:
git diff HEAD~2 HEAD -- frontend/components/RecipeThread/PinLabel.tsx | wc -l
0  ← PASS
```

**Note on `showSpinner` variable:** The D-14 grep gate regex `Spinner` matches the `showSpinner` boolean variable in `HomeDecide.tsx` (3 occurrences). These are NOT spinner components or CSS classes — they are a display-timing flag (`useDelayedFlag(250)`). The gate's intent (D-14) is to prevent `<Spinner>`, `<LoadingSpinner>`, and `animate-spin` component/CSS usage. The `animate-spin` sub-gate returns 0 which is the authoritative gate per D-14. The `showSpinner` hits are regex false positives.

## Open Question Status

**A4 (BrandLoader sm visual quality at 18px):** stroke-dasharray stays at 220. Visual confirmation deferred to 32-03 plan close — the CSS spec says the value scales proportionally via viewBox. No override added yet.

**A6 (conteste per-seat mapping):** RESOLVED — applied per UI-SPEC §7.2 + doc mock line 1515. yes voter = seat-state-valide, no voter = seat-state-contested. Visual gate at 32-03 close.

## iOS PWA Caveat §15.D Gate

Deferred to 32-05 sign-off (per 32-01 SUMMARY decision). PinLabel renders in Caveat automatically once 32-01 globals.css changes are live (confirmed in 32-01).

## Known Stubs

None — all four primitives are wired to their CSS class contracts. TableVote derives state from votes prop (no mock data). BrandLoader renders real BrandIcon SVG (no placeholder). LedgerCard inline-styles --patina from props. Marginalia renders children directly.

## Threat Flags

None — this plan introduces visual primitives only. No new network endpoints, no auth paths, no schema changes, no `dangerouslySetInnerHTML` anywhere. TableVote derives state from typed `ShortlistVote[]` prop; `seatStateClass` returns only static class name literals; `memberSlot` returns only a discriminated union value. Threat dispositions T-32-02-01..05 accepted per plan threat model.

## Self-Check: PASSED

- FOUND: frontend/components/Marginalia.tsx
- FOUND: frontend/components/BrandLoader.tsx
- FOUND: frontend/components/LedgerCard.tsx
- FOUND: frontend/components/TableVote.tsx
- FOUND: 19de6a7 (Task 1 commit)
- FOUND: ce3c593 (Task 2 commit)
- CONFIRMED: animate-spin gate = 0
- CONFIRMED: Loader2/Loader2Icon gate = 0
- CONFIRMED: TypeScript errors = 0
- CONFIRMED: Next.js build = 15/15 pages generated

---
*Phase: 32-port-locked-screens-to-sober-kitchen*
*Completed: 2026-05-18*
