---
phase: 08-cook-polish
plan: 04
subsystem: frontend/recipe-detail
tags: [ui, slow-food, cookbook-gestures, recipe-detail, tap-target, paper-grain, fraunces, COOK-06]
requirements: [COOK-06]
dependency-graph:
  requires:
    - phase 5 design tokens (text-display, text-title, paper-grain utility, bg-card/85 surface, --color-primary terracotta)
    - phase 6 cookbook gesture vocabulary (paper-grain Card surface)
    - phase 7 cookbook gesture vocabulary (paper-grain frame on photo cards)
  provides:
    - recipe-detail screen retheme aligned to phase 8 cookbook chapter-opener gesture
    - hero overlay strip pattern (full-bleed photo + bg-card/85 backdrop-blur-sm paper-grain title strip)
    - cookbook printers' guideline-rule pattern on ingredient list (border-l-2 border-primary/30 pl-4)
    - Fraunces-italic terracotta-80 step-number prefix in flex column pattern
    - h-12 w-12 floor on all 6 header icon buttons across all 3 page states (404 / skeleton / main)
  affects:
    - frontend/app/recipes/[id]/page.tsx (only file in scope)
tech-stack:
  added: []
  patterns:
    - hero overlay strip (relative + absolute-bottom pattern with bg-card/85 backdrop-blur-sm paper-grain)
    - cookbook ingredient guideline-rule (border-l-2 border-primary/30 pl-4 + leading-relaxed)
    - editorial step-number prefix (font-display italic text-primary/80 in flex column with shrink-0)
    - section heading typography (text-title vs body text-base leading-relaxed register split)
key-files:
  created: []
  modified:
    - frontend/app/recipes/[id]/page.tsx
decisions:
  - Used `backdrop-blur-sm` (4px) as locked starting point per UI-SPEC; defer 8px upgrade to real-device test
  - Added explicit `paper-grain` className on no-photo fallback Card for grep-verifiable contract (Card primitive already carries paper-grain internally; explicit class makes it auditable)
  - Concatenated `h-12 w-12` BEFORE existing color classes on delete button per UI-SPEC §"Surface 1" JSX ordering convention
  - Kept `scrollbar-none` utility on multi-photo carousel (verified defined in app/globals.css line 357)
metrics:
  duration: 3m
  completed: 2026-05-08
  tasks-completed: 3
  files-modified: 1
  loc-after: 338
---

# Phase 08 Plan 04: Recipe Detail Cookbook Polish (COOK-06) Summary

Re-themed `/recipes/[id]` from a generic photo-carousel + sans-serif body into the cookbook chapter-opener centerpiece of Phase 8: full-bleed hero photo with title overlaid in italic Fraunces on a `bg-card/85 backdrop-blur-sm paper-grain` strip, terracotta-30 cookbook printers' guideline-rule on ingredients, Fraunces-italic terracotta-80 step-number prefixes in flex columns over IBM Plex Sans body, all 6 header icon buttons raised to the 48px D-08 floor across the 404 / loading-skeleton / main-render states.

## What Was Built

### Task 1 — Hero overlay strip + body wrapper breathing (commit `f9d1bdb`)

Replaced the previous horizontal photo carousel + `h-44` placeholder pair with the locked Phase 8 hero contract:

- **With photos:** `<div className="relative">` containing `<img className="aspect-[4/3] w-full rounded-b-2xl object-cover">` and an absolute-bottom overlay `<div className="absolute inset-x-0 bottom-0 bg-card/85 backdrop-blur-sm paper-grain px-6 py-4 rounded-b-2xl">` housing the title at `text-display`.
- **Without photos:** `<Card className="paper-grain shadow-card mx-6 my-4 px-6 py-6">` with the same `text-display` title, replacing the previous gray "no photo" placeholder.
- Removed the standalone `<h1 className="text-[28px] font-semibold tracking-tight leading-tight">` from the body — title now lives inside either the overlay strip or the fallback Card (single source of truth, two render paths).
- Body wrapper gained `mt-6` (`px-6 flex flex-col gap-6 pb-24 mt-6`) for 24px breathing under the hero.
- Metadata pill row className reordered to `flex flex-wrap gap-2 items-center` to match UI-SPEC §"Surface 1" JSX for diff cleanliness.
- Added `import { Card } from "@/components/ui/card";` (only new import).

### Task 2 — Cookbook gestures on body sections (commit `991fc34`)

- **Multi-photo carousel:** Inserted between metadata pills and ingredients, gated on `photoUrls.length > 1`, rendering `photoUrls.slice(1)` (hero already shows photo 1). Uses `-mx-6 px-6 scrollbar-none snap-x snap-mandatory` so scroll content reaches the gutter without inflating other rows.
- **Ingredient list:** `<ul>` upgraded to `border-l-2 border-primary/30 pl-4 flex flex-col gap-2 py-1` (terracotta-30 cookbook printers' guideline-rule); each `<li>` gained `leading-relaxed`.
- **Step list:** `<ol>` lost `list-decimal list-inside`; each `<li>` is now a `flex gap-3` two-column row with `<span className="font-display italic text-primary/80 text-base shrink-0">{i+1}.</span>` (Fraunces italic terracotta-80 number) + `<span className="text-base leading-relaxed">{s}</span>` (IBM Plex Sans body for procedural readability).
- **Section headings:** `Ingrédients` and `Étapes` (`section_steps` i18n key) upgraded from `text-xl font-semibold` to `text-title` (Fraunces 24px upright per Phase 5 type system).

### Task 3 — D-08 48px tap-target floor on all 6 header icon buttons (commit `f296af5`)

Added `className="h-12 w-12"` to every `<Button size="icon" variant="ghost">` across the file's three page states:

- 404-empty branch header back button (1)
- Loading-skeleton branch header back button (1)
- Main render header: back, mic (VoiceModify trigger), edit, delete (4)

For the delete button, `h-12 w-12` was concatenated **before** the existing `text-foreground-muted hover:text-destructive` color treatment (UI-SPEC §"Surface 1" JSX ordering convention; Tailwind class order is non-significant for non-conflicting properties). Lucide icons remain at `h-5 w-5` (20px glyph inside 48px square — matches Phase 6 inbox header pattern).

## Key Decisions

1. **`backdrop-blur-sm` (4px) over `backdrop-blur` (8px)** — per UI-SPEC the 4px variant is the locked starting point; iOS 17+ Safari has been gentle on backdrop-blur in PWA standalone (CONTEXT.md verified note). Real-device legibility upgrade deferrable.
2. **Explicit `paper-grain` className on the no-photo fallback Card** — Card primitive already carries `paper-grain` internally (line 15 of `card.tsx`), but the explicit class makes the contract grep-verifiable and matches UI-SPEC §"Phase 8 paper-grain placement" wording.
3. **`scrollbar-none` retained on multi-photo carousel** — verified the utility is defined at `frontend/app/globals.css:357` (matches other consumers like `frontend/app/recipes/new/page.tsx:154`).
4. **Class ordering on delete button** — placed `h-12 w-12` first to match UI-SPEC §"Surface 1" JSX example order (semantically equivalent in Tailwind, but cleaner for diff review).

## Verification Results

| Check | Expected | Got |
|-------|----------|-----|
| `grep -cF 'bg-card/85 backdrop-blur-sm paper-grain' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'aspect-[4/3] w-full rounded-b-2xl object-cover' page.tsx` | 1 | 1 ✓ |
| `grep -cF '<h1 className="text-display text-foreground">' page.tsx` | 2 | 2 ✓ (overlay + fallback) |
| `grep -cF 'text-[28px] font-semibold tracking-tight' page.tsx` | 0 | 0 ✓ (standalone h1 removed) |
| `grep -cF 'pb-24 mt-6' page.tsx` | 1 | 1 ✓ |
| `grep -cF '<Card className="paper-grain shadow-card mx-6 my-4 px-6 py-6">' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'border-l-2 border-primary/30 pl-4' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'font-display italic text-primary/80 text-base shrink-0' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'text-title' page.tsx` | 2 | 2 ✓ (Ingrédients + Étapes) |
| `grep -cE 'text-xl font-semibold' page.tsx` | 0 | 0 ✓ |
| `grep -cF 'list-decimal list-inside' page.tsx` | 0 | 0 ✓ |
| `grep -cF 'photoUrls.slice(1).map' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'photoUrls.length > 1' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'text-base leading-relaxed' page.tsx` | ≥2 | 2 ✓ (ingredient + step body) |
| `grep -cF '{i + 1}.' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'h-12 w-12' page.tsx` | ≥6 | 6 ✓ |
| `grep -cF 'aria-label={t("back_aria")}' page.tsx` | 3 | 3 ✓ |
| `grep -cF 'aria-label={tVoiceModify("trigger_aria")}' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'aria-label={t("edit_aria")}' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'aria-label={t("delete_aria")}' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'text-foreground-muted hover:text-destructive' page.tsx` | 1 | 1 ✓ |
| `grep -cF 'dangerouslySetInnerHTML' page.tsx` (T-08-04-01) | 0 | 0 ✓ |
| TypeScript `npx tsc --noEmit` for this file | clean | clean ✓ |
| File LOC | ≥300 | 338 ✓ |

## Threat Model Compliance

- **T-08-04-01 (XSS via JSX content)** — no `dangerouslySetInnerHTML` introduced; all recipe content (`recipe.title`, ingredient `name`/`quantity`/`unit`, step text) renders as React text nodes through React's auto-escape. Verified post-edit (0 hits).
- **T-08-04-02 (Photo path leakage)** — hero `<img src={photoUrls[0]}>` and carousel `photoUrls.slice(1)` consume the existing `photoUrls` state populated by `refreshPhotoUrls` → `getSignedPhotoUrl()` (5-min server-scoped URLs). No raw `recipe.photo_paths[i]` is rendered.
- **T-08-04-03/04/05** — accept dispositions (no change), realtime listeners + edit-route push + backdrop-blur compositor path all preserved.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1/2/3 deviations triggered. No checkpoints. No architectural changes.

## Preserved Invariants (no-touch verification)

- State machine (`useState` for `recipe` / `notFound` / `photoUrls` / `voiceModifyOpen` / `deleting`) — preserved verbatim.
- `refreshPhotoUrls` callback (`useCallback`) — preserved verbatim.
- Initial-load `useEffect` (api fetch + 404 detection) — preserved verbatim.
- Realtime `useEffect` (recipe.updated / recipe.deleted handlers) — preserved verbatim.
- `handleDelete` confirm + toast + replace flow — preserved verbatim.
- `metaSpan` derivation — preserved verbatim.
- Footer `t("footer_last_cooked", ...)` / `t("footer_cook_count", ...)` — preserved verbatim.
- VoiceModifySheet integration — preserved verbatim.
- Loading-state skeleton inner content (`h-44 w-full rounded-lg bg-surface-muted animate-pulse`) — preserved verbatim (separate concern from the now-removed no-photo placeholder).
- All i18n key usage — no new keys; no key deletions.
- All 5 lucide icons (ChevronLeft, FileQuestion, Mic, Pencil, Trash2) — preserved verbatim, all icons remain at `h-5 w-5`.

## Known Stubs

None. All visual elements are wired to real state (`recipe`, `photoUrls`, `metaSpan`); no placeholder data, no "coming soon" copy, no orphan TODOs introduced.

## Self-Check: PASSED

- Modified file exists: `frontend/app/recipes/[id]/page.tsx` ✓
- Commits exist:
  - `f9d1bdb` (Task 1) ✓
  - `991fc34` (Task 2) ✓
  - `f296af5` (Task 3) ✓
- All success-criteria greps pass ✓
- TypeScript clean for this file ✓
- LOC ≥ 300 (338 actual) ✓
