---
phase: 06-capture-surfaces-polish
plan: 01
subsystem: ui
tags: [tailwind, theme-tokens, typography, fraunces, ibm-plex-sans, shadcn, motion]

# Dependency graph
requires:
  - phase: 05-design-system-foundation
    provides: "font-display / font-body / font-mono @theme tokens, Fraunces + IBM Plex Sans pairing, frontend/lib/motion.ts (variants + transitions exports)"
provides:
  - "Title primitives (alert-dialog, card, dialog, sheet) consume font-display directly — no alias indirection"
  - "globals.css @theme inline locked to font-display + font-body + font-mono only"
  - "styleguide page imports both variants and transitions from @/lib/motion (staged for future motion demos)"
affects:
  - "06-02 through 06-06 (capture surface polish plans) — all consume Title primitives + token surface without alias indirection"
  - "07–09 (voting / cooking / onboarding polish) — same clean token contract"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Locked font-utility contract: font-display, font-body, font-mono only — no font-heading / font-sans aliases"
    - "Future drift back to font-heading/font-sans fails loudly at the Tailwind utility-resolution step (no token registered)"

key-files:
  created:
    - .planning/phases/06-capture-surfaces-polish/06-01-SUMMARY.md
  modified:
    - frontend/components/ui/alert-dialog.tsx
    - frontend/components/ui/card.tsx
    - frontend/components/ui/dialog.tsx
    - frontend/components/ui/sheet.tsx
    - frontend/app/globals.css
    - frontend/app/styleguide/page.tsx

key-decisions:
  - "Removed --font-heading and --font-sans @theme aliases unconditionally — Phase 5 deferral closure means the contract is now: drift back to old utilities fails at compile (loud failure, not silent fallback)"
  - "Replaced @apply font-sans on html { } in globals.css with @apply font-body — orphaned consumer not surfaced in the plan's grep (font-sans; vs font-sans space) but blocking the alias removal"
  - "Kept transitions import on styleguide unused — plan explicitly accepts the no-error lint warning rather than introducing eslint-disable"

patterns-established:
  - "Token-system locking pattern: when a deprecation alias is sweep-replaced, also remove the alias declaration in the same plan so the contract is enforced by the build, not by convention"

requirements-completed: []

# Metrics
duration: ~25min
completed: 2026-05-08
---

# Phase 06 Plan 01: Phase 5 Deferral Closure Summary

**Sweep `font-heading` → `font-display` across 4 shadcn Title primitives, delete the deprecated `--font-heading` / `--font-sans` `@theme` aliases, and stage `transitions` import on the styleguide page so Phase 5 closes with a clean token surface.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-08T09:21:30Z (approx)
- **Completed:** 2026-05-08T09:46:13Z
- **Tasks:** 3
- **Files modified:** 6 (4 primitives + globals.css + styleguide page)

## Accomplishments

- Four shadcn Title primitives (`alert-dialog`, `card`, `dialog`, `sheet`) now render with `font-display` (Fraunces) directly — no alias indirection
- `globals.css` `@theme inline` block reduced to `--font-display`, `--font-body`, `--font-mono` only; deprecation comment + two alias declarations gone
- One orphaned `@apply font-sans` consumer (in `html { }`) replaced with `@apply font-body` — would have broken the build silently otherwise
- Styleguide page imports `transitions` alongside `variants` so future motion demos can reference `transitions.fast` / `transitions.normal` without re-editing the import
- `npm run build` compiles successfully (14 static pages generated, TypeScript clean)
- `npm run lint` passes with 0 errors (1 unused-vars warning on staged `transitions` import — explicitly accepted by the plan)

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-mode worktree):

1. **Task 1: Sweep font-heading → font-display in 4 Title primitives** — `1c607b4` (refactor)
2. **Task 2: Remove deprecated --font-heading and --font-sans aliases from globals.css** — `57bc5f5` (refactor)
3. **Task 3: Add `transitions` import to styleguide page** — `04ade60` (chore)

## Files Created/Modified

- `frontend/components/ui/alert-dialog.tsx` — Title className: `font-heading` → `font-display`
- `frontend/components/ui/card.tsx` — Title className: `font-heading` → `font-display`
- `frontend/components/ui/dialog.tsx` — Title className: `font-heading` → `font-display`
- `frontend/components/ui/sheet.tsx` — Title className: `font-heading` → `font-display`
- `frontend/app/globals.css` — Removed `--font-heading` / `--font-sans` aliases + deprecation comment from `@theme inline`; replaced `@apply font-sans` with `@apply font-body` on `html { }`
- `frontend/app/styleguide/page.tsx` — Line 14 import extended: `{ variants }` → `{ variants, transitions }`
- `.planning/phases/06-capture-surfaces-polish/06-01-SUMMARY.md` — this file

## Verification Proof

```bash
# 1. Zero font-heading or font-sans utility refs remain (grep exit 1, no matches)
$ grep -rn "font-heading\|font-sans " frontend/app frontend/components
exit=1

# 2. Title primitives all use font-display
$ grep -n "font-display" frontend/components/ui/{alert-dialog,card,dialog,sheet}.tsx
frontend/components/ui/alert-dialog.tsx:126:        "font-display text-base font-medium ..."
frontend/components/ui/card.tsx:41:        "font-display text-base leading-snug font-medium ..."
frontend/components/ui/dialog.tsx:133:        "font-display text-base leading-none font-medium"
frontend/components/ui/sheet.tsx:117:        "font-display text-base font-medium text-foreground"

# 3. globals.css aliases gone (grep exit 1)
$ grep -n "font-heading\|font-sans" frontend/app/globals.css
exit=1

# 4. styleguide imports transitions
$ grep -n 'import { variants, transitions } from "@/lib/motion"' frontend/app/styleguide/page.tsx
14:import { variants, transitions } from "@/lib/motion";

# 5. Build passes
$ cd frontend && npm run build
✓ Compiled successfully in 13.5s
✓ Generating static pages using 7 workers (14/14)

# 6. Lint passes
$ cd frontend && npm run lint
3 problems (0 errors, 3 warnings)
# (1 warning = the deliberately-staged transitions import; 2 warnings pre-existing in worker bundle)
```

## Decisions Made

- **Locked font-utility contract by removal, not deprecation comment.** Once Task 1's sweep eliminated all callers, the alias was dead code. Removing it means future drift back to `font-heading` / `font-sans` fails to resolve at the Tailwind level — a developer notices immediately. The deprecation comment in the @theme block was also load-bearing context that goes stale; deleting it is cleaner than rewriting it.
- **Did not silence the unused-`transitions` lint warning.** Plan explicitly directed: only add `void transitions;` if lint *fails* the build. It surfaces a warning (not error), so lint still passes — left as-is per Task 3 directive.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Replaced orphaned `@apply font-sans` consumer in globals.css**
- **Found during:** Task 2 (alias removal)
- **Issue:** After deleting the `--font-sans` alias from `@theme inline`, `frontend/app/globals.css` line 251 still contained `@apply font-sans;` inside `html { }`. The plan's Task 1 grep scanned for `font-sans ` (with trailing space) and missed this `font-sans;` (with semicolon) consumer. Without the fix, Tailwind would either fail to resolve the utility at build time or silently drop the rule.
- **Fix:** Replaced with `@apply font-body;` per the UI-SPEC role split (sans-for-body) — same role, canonical token name.
- **Files modified:** `frontend/app/globals.css`
- **Verification:** `npm run build` compiles successfully (14 static pages); `grep -n "font-sans" frontend/app/globals.css` returns exit 1 (no matches).
- **Committed in:** `57bc5f5` (Task 2 commit, atomically with the alias removal so the build never enters a broken state)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was strictly necessary — without it, Task 2's alias removal would have produced an invalid `@apply` directive. No scope creep; the change is one-character-equivalent and tightly scoped to the same `globals.css` file Task 2 already owns.

## Issues Encountered

- **Frontend `node_modules` was not present in this worktree.** Resolved by running `npm ci` before `npm run build` and `npm run lint`. Standard worktree-setup friction; not a code issue.

## User Setup Required

None — no external service configuration touched.

## Next Phase Readiness

- Phase 5 deferrals are now closed: no `font-heading` / `font-sans` utility references anywhere in `frontend/app` or `frontend/components`, no alias declarations in `@theme inline`.
- Phase 6 plans 02–06 (capture-surface polish) can now consume the token surface cleanly. Any new shadcn primitive added in subsequent phases can reference `font-display` / `font-body` directly without worrying about which alias to use.
- The styleguide page (`/styleguide`) still renders correctly — used as a visual smoke gate after each subsequent phase plan, per UI-SPEC.

## Self-Check: PASSED

Verified:
- `frontend/components/ui/alert-dialog.tsx` exists, contains `font-display` on line 126: FOUND
- `frontend/components/ui/card.tsx` exists, contains `font-display` on line 41: FOUND
- `frontend/components/ui/dialog.tsx` exists, contains `font-display` on line 133: FOUND
- `frontend/components/ui/sheet.tsx` exists, contains `font-display` on line 117: FOUND
- `frontend/app/globals.css` exists, no `font-heading`/`font-sans` matches: VERIFIED
- `frontend/app/styleguide/page.tsx` exists, line 14 reads `import { variants, transitions } from "@/lib/motion";`: VERIFIED
- Commit `1c607b4` exists in `git log`: FOUND
- Commit `57bc5f5` exists in `git log`: FOUND
- Commit `04ade60` exists in `git log`: FOUND

---
*Phase: 06-capture-surfaces-polish*
*Plan: 01*
*Completed: 2026-05-08*
