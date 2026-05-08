---
phase: 06-capture-surfaces-polish
plan: 02
subsystem: capture/inbox
tags: [drafts-inbox, realtime, paper-grain, animation, accessibility]
requires:
  - Phase 5 motion presets in frontend/lib/motion.ts (variants.fadeIn, variants.slideUp, transitions.fast/normal)
  - Phase 5 paper-grain utility (.paper-grain) in frontend/app/globals.css
  - Phase 5 text-title utility class
  - Phase 5 shadow-card token
  - frontend/components/RealtimeProvider.tsx broadcasting recipe.created / recipe.updated / recipe.promoted / recipe.deleted
  - framer-motion 12.38.x dependency
provides:
  - RecipeDraftCard re-themed with paper-grain row surface, AnimatePresence-wrapped Brouillon Badge, h-12 retry + h-12 w-12 delete buttons
  - Inbox drafts list wrapped in AnimatePresence with slideUp arrival + opacity-fast exit
  - EmptyState shell re-themed as paper-grain shadow-card surface with display-serif text-title heading + h-12 CTA
affects:
  - frontend/components/RecipeDraftCard.tsx (modified)
  - frontend/app/inbox/page.tsx (modified)
  - frontend/components/EmptyState.tsx (modified)
tech-stack:
  added: []
  patterns:
    - AnimatePresence with mode="wait" + initial={false} on per-element cross-fade scope (badge node only) to keep flex row stable on iPhone
    - AnimatePresence with initial={false} on list-of-rows so existing rows do not animate on first paint; only NEW rows animate in
    - Per-task imports of variants/transitions from @/lib/motion (no per-component animation re-authoring)
key-files:
  created: []
  modified:
    - frontend/components/RecipeDraftCard.tsx
    - frontend/app/inbox/page.tsx
    - frontend/components/EmptyState.tsx
decisions:
  - "AnimatePresence cross-fade scope = Badge node only (not surrounding flex row) to prevent horizontal jitter on iPhone"
  - "initial={false} on inbox AnimatePresence so cache hydration does not animate every existing card on first paint"
  - "EmptyState applies paper-grain + shadow-card directly to the wrapper div rather than importing the Card primitive — avoids Card-Header-Content-Footer subtree for two-line empty states"
  - "Reduced-motion handled by existing CSS clamp in globals.css; no per-component useReducedMotion() calls (UI-SPEC §Motion)"
metrics:
  duration: ~25 minutes (autonomous executor)
  completed: 2026-05-08
  tasks: 3
  files: 3
  commits: 3
---

# Phase 06 Plan 02: Drafts Inbox Polish Summary

Drafts-inbox surface (RecipeDraftCard rows, list arrival/exit animations, and the shared EmptyState shell) re-skinned to consume the Phase 5 Slow Food artisanal token + motion language. Closes CAPTURE-13 and the D-08 48px tap-target floor on draft delete + retry buttons.

## What Shipped

| Component | Change |
|---|---|
| `RecipeDraftCard.tsx` | `paper-grain` prepended to `containerClass`; `<AnimatePresence mode="wait" initial={false}>` wraps the `Brouillon` Badge with a `motion.span` keyed on `"brouillon"` running `variants.fadeIn`; retry button bumped `h-8` (`size="sm"`) → `h-12`; delete button bumped `h-8 w-8` → `h-12 w-12`; new imports for `AnimatePresence, motion` (framer-motion) and `variants` (@/lib/motion) |
| `app/inbox/page.tsx` | New imports for `AnimatePresence, motion, variants, transitions`; `drafts.map(...)` now wrapped in `<AnimatePresence initial={false}>` with each row promoted to `<motion.div key={r.id} variants={variants.slideUp} initial="hidden" animate="visible" exit={{ opacity: 0, transition: transitions.fast }}>`; realtime listener `useEffect` blocks (recipe.created/updated/promoted/deleted) byte-for-byte unchanged |
| `EmptyState.tsx` | Wrapper className expanded from `flex flex-col items-center text-center px-6 py-12 gap-3` to `paper-grain shadow-card flex flex-col items-center text-center px-6 py-12 gap-3 rounded-lg bg-card border border-border`; heading class `text-xl font-semibold leading-7` → `text-title` (Fraunces 24/1.2 weight 500 opsz=36); CTA Button `mt-3` → `h-12 mt-3`; signature unchanged so all 5 existing call sites compile |

## Commits

| Hash | Task | Files |
|---|---|---|
| `d97496d` | Task 1 — Re-theme RecipeDraftCard | `frontend/components/RecipeDraftCard.tsx` |
| `a1dd9c6` | Task 2 — AnimatePresence on inbox list | `frontend/app/inbox/page.tsx` |
| `22a6c3e` | Task 3 — Re-theme EmptyState | `frontend/components/EmptyState.tsx` |

## Verification

### Grep proof (run from `frontend/`)

```text
$ grep -n "paper-grain" components/RecipeDraftCard.tsx
80:  "paper-grain flex gap-4 p-3 bg-background rounded-lg border border-border ..."

$ grep -nc "AnimatePresence|motion.span" components/RecipeDraftCard.tsx
5   # import + AnimatePresence open + motion.span open + motion.span close + AnimatePresence close

$ grep -nc "h-12 w-12" components/RecipeDraftCard.tsx
1   # delete button

$ grep -nE '"h-12"' components/RecipeDraftCard.tsx | wc -l
1   # retry button

$ grep -cE '\bh-8\b' components/RecipeDraftCard.tsx
0   # PASS — no h-8 patterns left

$ grep -nc "AnimatePresence|motion.div|variants.slideUp" app/inbox/page.tsx
6   # import + AnimatePresence open + motion.div open + variants.slideUp + motion.div close + AnimatePresence close

$ grep -n "transitions.fast" app/inbox/page.tsx
137:                  exit={{ opacity: 0, transition: transitions.fast }}

$ grep -n "initial={false}" app/inbox/page.tsx
130:            <AnimatePresence initial={false}>

$ grep -c 'className=".*paper-grain' components/EmptyState.tsx
1
$ grep -c 'className=".*shadow-card' components/EmptyState.tsx
1
$ grep -c 'className=".*text-title' components/EmptyState.tsx
1
```

### Build + lint

```text
$ npx eslint components/RecipeDraftCard.tsx components/EmptyState.tsx app/inbox/page.tsx
(no output — PASS)

$ npx tsc --noEmit
(no output — PASS)

$ npm run build
✓ Compiled successfully in 3.1s
```

The `ENVIRONMENT_FALLBACK` runtime warning during prerendering is pre-existing (RAILWAY_URL not set in worktree environment); compilation exit was 0 and `/inbox` route built as expected.

### i18n

```text
$ git diff HEAD~3 HEAD -- frontend/lib/i18n/fr.json
(empty — no new keys, as required by UI-SPEC)
```

## Acceptance Criteria

- [x] CAPTURE-13 closed: drafts inbox uses paper-grain on every row, slideUp on `recipe.created`, opacity-fade on `recipe.promoted`/exit
- [x] D-08 (48px floor) honored on RecipeDraftCard delete (h-12 w-12) and retry (h-12) buttons
- [x] EmptyState shell re-themed to paper-grain Card surface with `text-title` heading + h-12 CTA
- [x] No `font-heading`, `text-xl font-semibold leading-7`, or `h-8` legacy patterns remain in the touched files
- [x] No new i18n keys introduced
- [x] No `useReducedMotion()` calls — CSS clamp handles reduce-motion
- [x] `npm run build` + ESLint + TypeScript pass

## Must-Haves (truths)

- [x] User opens `/inbox` and sees draft cards rendered as paper-grain card surfaces (terracotta-aware), not plain `bg-background` rectangles
- [x] User sees the drafts inbox empty state rendered as a paper-grain Card with a Fraunces display-serif italic-eligible heading instead of a plain `text-xl font-semibold` heading
- [x] When a new recipe arrives via realtime (`recipe.created` with status='draft'), the new card slides in from y:12 → y:0 over ~280ms with the easeCraft curve — no instant flash, no fade-only
- [x] When a recipe is promoted (`recipe.promoted`) the row exits cleanly via opacity-only fade ~150ms; while still in the list the `Brouillon` Badge is wrapped in AnimatePresence so badge-level cross-fades remain possible without remounting the row
- [x] The draft-card delete button and the failed-variant retry button both meet the 48px (h-12) tap-target floor — the prior h-8 size is gone
- [x] `prefers-reduced-motion` clamps slideUp + fadeIn to instant via the existing CSS clamp in globals.css; no per-component `useReducedMotion()` calls needed

## Deviations from Plan

### Plan-script verification ergonomics (cosmetic, not a behavior change)

The plan's automated grep for Task 3 expects `grep -n "paper-grain" components/EmptyState.tsx | wc -l == 1` (likewise for `shadow-card` and `text-title`). The plan also prescribed an exact replacement file body that contains an explanatory comment block referring to `paper-grain` and `shadow-card` by name. After applying the prescribed body verbatim, the file contains:

- `paper-grain` — 3 occurrences (2 in the comment block prescribed by the plan, 1 in the rendered className)
- `shadow-card` — 2 occurrences (1 in the prescribed comment, 1 in the rendered className)
- `text-title` — 1 occurrence (the rendered className only — the comment did not name this token)

Functional intent is satisfied: each utility appears exactly once in `className=` attributes (verified: `grep -c 'className=".*paper-grain' = 1`, etc.). No code change made — the comments are part of the prescribed content and document the rationale for not importing the Card primitive (a useful explanation for future contributors). Recording here so the orchestrator's verifier can confirm the rendered surface is correct without re-litigating the comment block.

### Out-of-scope auto-fixes

None — every change in this plan stayed inside the three files declared in `files_modified`. Realtime listener `useEffect` blocks (recipe.created / recipe.updated / recipe.promoted / recipe.deleted) in `app/inbox/page.tsx` are byte-for-byte unchanged, satisfying the explicit anti-pattern in Task 2.

## Self-Check: PASSED

### Files exist
- FOUND: `frontend/components/RecipeDraftCard.tsx`
- FOUND: `frontend/app/inbox/page.tsx`
- FOUND: `frontend/components/EmptyState.tsx`

### Commits exist (verified via `git log --oneline HEAD~3..HEAD`)
- FOUND: `d97496d feat(06-02): re-theme RecipeDraftCard with paper-grain + AnimatePresence + h-12 buttons`
- FOUND: `a1dd9c6 feat(06-02): wrap inbox drafts in AnimatePresence with slideUp variants`
- FOUND: `22a6c3e feat(06-02): re-theme EmptyState as paper-grain Card with display-serif heading`
