---
phase: 05-design-system-foundation
reviewed: 2026-05-08T08:01:23Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - frontend/app/globals.css
  - frontend/app/layout.tsx
  - frontend/lib/motion.ts
  - frontend/components/ui/alert-dialog.tsx
  - frontend/components/ui/badge.tsx
  - frontend/components/ui/button.tsx
  - frontend/components/ui/card.tsx
  - frontend/components/ui/dialog.tsx
  - frontend/components/ui/input.tsx
  - frontend/components/ui/select.tsx
  - frontend/components/ui/sheet.tsx
  - frontend/components/ui/tabs.tsx
  - frontend/components/ui/textarea.tsx
  - frontend/app/styleguide/page.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-05-08T08:01:23Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 5 delivers a coherent design system foundation: token migration in `globals.css`, Fraunces + IBM Plex Sans registration in `layout.tsx`, the `motion.ts` preset module, 10 re-themed shadcn primitives (the full listed scope), and the `/styleguide` acceptance gate. No backend changes; review is front-end only.

All OKLCH values in `:root` and `.dark` match the UI-SPEC tables verbatim. The paper-grain SVG asset matches the specified `feTurbulence` / `feColorMatrix` values exactly. Motion curve `cubic-bezier(0.32, 0.72, 0.0, 1)` and durations 150ms / 280ms are consistent between `globals.css` and `motion.ts`. TypeScript is clean: `motion.ts` uses `import type`, `satisfies Transition / Variants` without `any`, and the `as const` tuple for `easeCraft` gives the array the narrow tuple type framer-motion expects. No security issues — the phase ships no auth, data, or API surface.

Four warnings require attention before downstream phases consume these primitives:

1. `SheetContent` uses `transition duration-200 ease-in-out` instead of the `duration-normal ease-craft` tokens — the sheet will animate at a different speed and curve than every other structural transition.
2. `layout.tsx` `viewport.themeColor` is still `"#F43F5E"` (rose/red-orange), not the terracotta primary `oklch(0.595 0.135 35)` (`≈#C45A3F`). This is the iOS Safari PWA chrome colour and is the one place the anti-pattern "rose/red" leaks into real UI.
3. `DialogFooter`'s optional `showCloseButton` renders a `<Button variant="outline">Close</Button>` with hardcoded English text — the only hardcoded English string in the primitives layer; the styleguide does not exercise this prop so it is invisible in the acceptance gate.
4. `font-heading` is still used in `AlertDialogTitle`, `CardTitle`, `DialogTitle`, and `SheetTitle`. The alias in `@theme` keeps it working for now, but the DEPRECATED comment makes the intent clear and the four call sites are listed in the UI-SPEC one-phase migration note — failing to flag this means Phase 6 will find them via grep rather than the review record.

Three info items cover a missing export, a whitespace inconsistency, and a dead conditional.

---

## Warnings

### WR-01: `SheetContent` transition uses `duration-200 ease-in-out` instead of design tokens

**File:** `frontend/components/ui/sheet.tsx:65`
**Issue:** The `SheetContent` className string includes `transition duration-200 ease-in-out`. The UI-SPEC §Motion locks structural transitions to `duration-normal` (280ms) / `ease-craft` (`cubic-bezier(0.32, 0.72, 0.0, 1)`). Sheet open/close is explicitly listed as a "structural transition" in both 05-UI-SPEC.md and the CONTEXT.md decision. The 200ms / `ease-in-out` combination means the sheet will be both 80ms faster and use a fundamentally different curve than Dialog and AlertDialog, breaking the "one curve, two durations" contract.
**Fix:**
```tsx
// Replace in SheetContent className:
// BEFORE:
"... transition duration-200 ease-in-out ..."
// AFTER:
"... transition duration-normal ease-craft ..."
```

---

### WR-02: `viewport.themeColor` is `"#F43F5E"` (rose) — not the terracotta primary

**File:** `frontend/app/layout.tsx:46`
**Issue:** `themeColor: "#F43F5E"` is the v0.1 rose primary color. The terracotta primary is `oklch(0.595 0.135 35)` ≈ `#C45A3F`. This hex value controls the iOS Safari PWA chrome (status bar tint, toolbar pill on iPhone). Shipping the old rose value means the phone-level chrome reads rose while every in-app surface reads terracotta — a visible mismatch on both iPhones. This is the one place the committed anti-pattern ("no rose") leaks into visible UI.
**Fix:**
```tsx
export const viewport: Viewport = {
  themeColor: "#C45A3F",  // terracotta primary ≈ oklch(0.595 0.135 35)
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

---

### WR-03: `DialogFooter` optional close button has hardcoded English `"Close"`

**File:** `frontend/components/ui/dialog.tsx:118`
**Issue:** When `showCloseButton={true}` is passed to `DialogFooter`, the rendered button reads `<Button variant="outline">Close</Button>`. This is the only hardcoded English string in the primitives layer. CLAUDE.md §Localization states "hardcoded strings are productize-later debt — avoid." The styleguide does not exercise `DialogFooter` with `showCloseButton`, so the string is invisible in the acceptance gate. Downstream phases that use this prop (e.g. Phase 8 cooking-finalize dialog) will inherit an English label in a French-only UI.
**Fix:** Replace the hardcoded string with a prop that callers supply, keeping the component's API forward-compatible:
```tsx
function DialogFooter({
  className,
  showCloseButton = false,
  closeLabel = "Fermer",   // caller can override; default is French
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
  closeLabel?: string
}) {
  // ...
  {showCloseButton && (
    <DialogPrimitive.Close asChild>
      <Button variant="outline">{closeLabel}</Button>
    </DialogPrimitive.Close>
  )}
```
(Alternatively, pass `children` as the close trigger — the default-prop approach is the least-churn path.)

---

### WR-04: `font-heading` still used in four Title components — not yet migrated to `font-display`

**Files:**
- `frontend/components/ui/alert-dialog.tsx:126`
- `frontend/components/ui/card.tsx:41`
- `frontend/components/ui/dialog.tsx:133`
- `frontend/components/ui/sheet.tsx:117`

**Issue:** All four Title components use `font-heading` (the deprecated alias). The `@theme inline` block in `globals.css` maps `--font-heading: var(--font-display)`, so the alias works for Phase 5. However, the UI-SPEC §Component Inventory explicitly says these four files should use the new token, and the DEPRECATED comment on line 14 of `globals.css` states "Phase 6 sweeps all `font-heading` and `font-sans` Tailwind utilities." The sweeping is Phase 6's job, but the review record should note that the in-place re-theme did NOT update these four sites — Phase 6 cannot assume the sweep only needs to touch non-primitive files.
**Fix:** Change `font-heading` to `font-display` in all four Title className strings (confirmed safe: the `@theme inline` alias means both resolve identically until the alias is removed):
```tsx
// alert-dialog.tsx:126, card.tsx:41, dialog.tsx:133, sheet.tsx:117
// Before:
"font-heading text-base ..."
// After:
"font-display text-base ..."
```
If this is a deliberate deferral to Phase 6 (as the UI-SPEC implies), add a `// TODO(phase-6): migrate font-heading → font-display` comment at each site so the grep sweep has confirmation.

---

## Info

### IN-01: `SheetPortal` and `SheetOverlay` declared but not exported

**File:** `frontend/components/ui/sheet.tsx:26-45`
**Issue:** `SheetPortal` (line 26) and `SheetOverlay` (line 32) are declared as named functions but absent from the `export { ... }` block at line 138. `DialogPortal` and `DialogOverlay` are exported from `dialog.tsx` — the Sheet API is intentionally symmetrical in shadcn convention. A Phase 6+ consumer building a custom sheet layout (e.g. the bottom-sheet recipe-detail panel) would need to reach for `SheetPortal` directly and would find it missing.
**Fix:** Add to the export block:
```tsx
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,    // add
  SheetOverlay,   // add
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
```

---

### IN-02: `SelectContent` has a missing space before `===` and a dead empty-string conditional

**File:** `frontend/components/ui/select.tsx:72`
**Issue:** Two quality issues on the same line:
1. `position ==="popper"` — missing space before `===`. Not a runtime bug (JavaScript tolerates this) but a code-style inconsistency against every other comparison in the codebase.
2. `position === "popper" && ""` on line 82 inside `SelectPrimitive.Viewport`'s `className`: the conditional evaluates to either `false` or `""` — both are no-ops in a `cn()` call. The branch is dead code with no effect.
**Fix:**
```tsx
// Line 72 — add space:
position === "popper" && "data-[side=bottom]:translate-y-1 ..."

// Lines 80-83 — remove the dead branch entirely:
<SelectPrimitive.Viewport
  data-position={position}
  className={cn(
    "data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)"
    // removed: position === "popper" && ""
  )}
>
```

---

### IN-03: `styleguide/page.tsx` production gate uses `process.env.NODE_ENV` check at render time — correct pattern but worth documenting the RSC caveat

**File:** `frontend/app/styleguide/page.tsx:133-135`
**Issue:** The file is a Client Component (`"use client"` at line 1). `notFound()` from `next/navigation` is called synchronously at the top of the render function when `process.env.NODE_ENV === "production"`. In Next.js App Router, `notFound()` works in both Server and Client Components — calling it client-side throws a special error that the nearest `not-found.tsx` boundary catches. This is functionally correct.

The pattern is slightly unusual (most production gates live in a Server Component wrapper or `middleware.ts` so the bundle never reaches the client). For a dev-only acceptance gate with a `TODO(milestone-close)` marker, the current approach is acceptable. However, if the styleguide bundle is included in the production build (it will be, as a Client Component), the JS is downloaded even though `notFound()` is called immediately. A Server Component wrapper would tree-shake the full bundle from production. Low priority given the milestone-close plan.
**Fix (optional, low priority):** If bundle hygiene matters before the milestone-close, wrap in a thin Server Component that calls `notFound()` server-side:
```tsx
// frontend/app/styleguide/page.tsx (Server Component)
import { notFound } from "next/navigation";
import { StyleguideClient } from "./StyleguideClient";

export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <StyleguideClient />;
}
```
Not a correctness issue — the current implementation works. Noting for completeness.

---

_Reviewed: 2026-05-08T08:01:23Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
