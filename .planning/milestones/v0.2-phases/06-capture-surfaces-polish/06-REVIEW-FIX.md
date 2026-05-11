---
phase: 06-capture-surfaces-polish
fixed_at: 2026-05-08T00:00:00Z
review_path: .planning/phases/06-capture-surfaces-polish/06-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-05-08T00:00:00Z
**Source review:** .planning/phases/06-capture-surfaces-polish/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: `scrollbar-none` is an undefined Tailwind utility — silent no-op

**Files modified:** `frontend/app/globals.css`
**Commit:** 36954de
**Applied fix:** Wired the `.scrollbar-none` utility inside the existing `@layer utilities { ... }` block in `globals.css` (next to `.paper-grain`). Sets both `scrollbar-width: none` (Firefox/standard) and `::-webkit-scrollbar { display: none }` (WebKit/Blink). The 5-tab `<TabsList>` at `app/recipes/new/page.tsx:154` now genuinely hides the scrollbar on desktop Safari, Linux browsers, and Android Chromium configs that paint one. Added a comment justifying the canonical spelling (`scrollbar-none` matches the call site, not `scrollbar-hide` or `no-scrollbar`).

### WR-02: `transitions` imported but unused in styleguide

**Files modified:** `frontend/app/styleguide/page.tsx`
**Commit:** ac2fd1f
**Applied fix:** Took option 2 from the review (the recommended one) — used `transitions` visibly in the slide-up demo. Added `transition={slideVisible ? transitions.normal : transitions.fast}` to the `<motion.div>` so the appearance plays at duration-normal and the retreat plays at duration-fast, demonstrating that `transitions.*` are composable presets that can override the bundled-in transition on `variants.slideUp`. Also expanded the `<CardDescription>` copy to teach readers what the override illustrates. The `transitions` import is now functionally used; the Phase 5 deferral cleanup is no longer symbolic.

### WR-03: `recipe.deleted` realtime handler payload type is too narrow

**Files modified:** `frontend/app/inbox/page.tsx`
**Commit:** e82d2e7
**Applied fix:** Changed `realtime.onEvent<{ id: string }>("recipe.deleted", ...)` to `realtime.onEvent<Recipe>("recipe.deleted", ...)` to align with the rest of the file's handlers (`recipe.created`, `recipe.updated`, `recipe.promoted` all use `Recipe`). Added a 4-line comment justifying the choice and pointing at the backend's realtime contract (`services/realtime.py`). The functional code still only reads `payload.id`, but the type now matches the canonical realtime contract so future drift between client/server can't silently mask itself. TypeScript `npx tsc --noEmit` passes cleanly after the change.

---

_Fixed: 2026-05-08T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
