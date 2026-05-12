---
phase: 24
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/components/BrandIcon.tsx
  - frontend/components/EmptyState.tsx
  - frontend/app/onboarding/welcome/page.tsx
  - frontend/components/HomeDecide.tsx
  - frontend/app/inbox/page.tsx
  - frontend/app/recipes/page.tsx
autonomous: true
requirements: [RID-01]
requirements_addressed: [RID-01]
tags: [ui, brand, empty-state, lucide-icon, nextjs-app-router]

must_haves:
  truths:
    - "BrandIcon component renders the pasta-strand mark verbatim from app/icon.tsx (viewBox 0 0 160 160, two paths, currentColor stroke)"
    - "Onboarding welcome screen shows BrandIcon above the wordmark with aria-label=\"al dente\""
    - "Drafts inbox empty state renders BrandIcon instead of the Lucide Inbox icon"
    - "Recipes library empty state (no recipes, no search query) renders BrandIcon instead of BookOpen"
    - "Shortlist deck empty state (in HomeDecide) renders BrandIcon instead of Sparkles"
    - "Recipes library 'no results' (search query non-empty) still uses lucide Search icon — this empty state is NOT a brand moment per D-08 (3 empty states: inbox + recipes-library default + shortlist)"
    - "EmptyState icon prop accepts both Lucide icons and BrandIcon (ComponentType<{ size?, className? }>) without TS errors"
    - "frontend/app/icon.tsx is NOT deleted (still generates PWA app icon at edge runtime per D-09)"
  artifacts:
    - path: "frontend/components/BrandIcon.tsx"
      provides: "BrandIcon functional component, props {size?, strokeWidth?, className?, aria-label?}"
      contains: "viewBox=\"0 0 160 160\""
    - path: "frontend/components/EmptyState.tsx"
      provides: "EmptyState with widened icon prop type (ComponentType, not LucideIcon)"
      contains: "ComponentType<{ size?: number; className?: string }>"
    - path: "frontend/app/onboarding/welcome/page.tsx"
      provides: "Welcome page mounting BrandIcon above the h1 wordmark with aria-label=\"al dente\""
      contains: "<BrandIcon"
    - path: "frontend/components/HomeDecide.tsx"
      provides: "Shortlist EmptyState uses BrandIcon instead of Sparkles"
      contains: "icon={BrandIcon}"
    - path: "frontend/app/inbox/page.tsx"
      provides: "Drafts inbox EmptyState uses BrandIcon instead of Inbox"
      contains: "icon={BrandIcon}"
    - path: "frontend/app/recipes/page.tsx"
      provides: "Recipes library default EmptyState uses BrandIcon instead of BookOpen (search-empty state keeps Search icon)"
      contains: "icon={BrandIcon}"
  key_links:
    - from: "frontend/components/EmptyState.tsx"
      to: "BrandIcon (and Lucide icons)"
      via: "icon prop typed as ComponentType<{ size?, className? }>"
      pattern: "ComponentType<\\{ size\\?: number; className\\?: string \\}>"
    - from: "frontend/components/BrandIcon.tsx"
      to: "frontend/app/icon.tsx (PWA twin)"
      via: "shared <path d=\"...\"> data — coordinated updates required if brand mark changes"
      pattern: "M 40 80 C 40 50, 70 30, 100 40"
---

<objective>
Phase 24 / RID-01 — BrandIcon. Extract the existing `app/icon.tsx` pasta-strand SVG into a reusable `frontend/components/BrandIcon.tsx`, widen `EmptyState`'s `icon` prop to accept the new component, and mount it on the four required surfaces: onboarding welcome screen + drafts inbox empty state + recipes library default empty state + shortlist deck empty state.

Purpose: Establish the brand mark as a reusable React component so RID-05 (per-recipe illustration) has a fallback path and the four key "blank canvas" surfaces feel cohesively al dente. Closes gh#11.

Output: One new component file (`BrandIcon.tsx`), one type widening (`EmptyState.tsx`), four call-site updates (welcome page + HomeDecide + inbox page + recipes page).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/24-recipe-identity/24-CONTEXT.md
@.planning/phases/24-recipe-identity/24-RESEARCH.md
@CLAUDE.md
@frontend/AGENTS.md
@frontend/app/icon.tsx
@frontend/components/EmptyState.tsx
@frontend/app/onboarding/welcome/page.tsx
@frontend/components/HomeDecide.tsx
@frontend/app/inbox/page.tsx
@frontend/app/recipes/page.tsx
</context>

<interfaces>
<!-- Key types and primitives the executor needs. Extracted from codebase. No exploration required. -->

From `frontend/app/icon.tsx` (lines 26-39 — verbatim source; do NOT delete this file per D-09 — it is the PWA Edge runtime icon generator):
```tsx
<svg
  width="160"
  height="160"
  viewBox="0 0 160 160"
  fill="none"
  stroke="#FAF7F2"  /* literal cream; BrandIcon uses currentColor instead */
  strokeWidth="6"
  strokeLinecap="round"
>
  {/* Outer pasta-strand spiral (closed Bézier whorl) */}
  <path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z" />
  {/* Inner whorl — single curve reading as the pasta unfurling */}
  <path d="M 60 80 C 60 65, 80 55, 95 65" />
</svg>
```

From `frontend/components/EmptyState.tsx` (current state — 35 lines):
```tsx
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  heading,
  body,
  cta,
}: {
  icon: LucideIcon;   // <-- THIS is the type to widen
  heading: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="paper-grain shadow-card flex flex-col items-center text-center px-6 py-12 gap-3 rounded-lg bg-card border border-border">
      <Icon className="text-foreground-muted" size={48} aria-hidden />
      <h2 className="text-title">{heading}</h2>
      <p className="text-base text-foreground-muted max-w-xs">{body}</p>
      {cta ? (
        <Button asChild className="h-12 mt-3">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
```

From `frontend/app/onboarding/welcome/page.tsx` (current state — wordmark in an h1, no icon present; we mount BrandIcon above the h1 inside the header):
```tsx
<header className="flex flex-col items-center gap-2 text-center">
  <h1 className="text-display">{tHome("title")}</h1>
  <p className="text-base text-foreground-muted mt-2 text-center">{t("tagline")}</p>
</header>
```

From `frontend/components/HomeDecide.tsx:417-425` (the shortlist empty state):
```tsx
<div className="px-(--spacing-page-x) mt-6">
  <EmptyState
    icon={Sparkles}     // <-- replace with BrandIcon
    heading={tShortlist("empty_heading")}
    body={tShortlist("empty_body")}
    cta={{ href: "/recipes/new", label: tShortlist("empty_cta") }}
  />
```

From `frontend/app/inbox/page.tsx:156-161` (the drafts inbox empty state):
```tsx
<EmptyState
  icon={Inbox}     // <-- replace with BrandIcon (and drop Inbox import)
  heading={t("empty_heading")}
  body={t("empty_body")}
/>
```

From `frontend/app/recipes/page.tsx:130-146` — TWO empty states, distinguished by `query.trim().length > 0`:
- `query !== ""` → Lucide `Search` icon — KEEP (this is a "no results" search state, not a brand moment per D-08).
- `query === ""` → Lucide `BookOpen` icon — REPLACE with BrandIcon (this is the default "no recipes yet" state).

From `frontend/components/BrandIcon.tsx` (NEW — see Task 1 for full source) — the contract callers rely on:
```tsx
export function BrandIcon({
  size = 48,
  strokeWidth = 6,
  className,
  "aria-label": ariaLabel,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-label"?: string;
}): JSX.Element;
```

**LucideIcon compatibility** (RESEARCH.md §Target 9): `LucideIcon` is `ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>`. A plain function component returning `<svg>` does NOT satisfy this — TypeScript will error. Widen `EmptyState.tsx`'s `icon` prop to `ComponentType<{ size?: number; className?: string }>` (a structural subset that BOTH Lucide icons AND BrandIcon satisfy). All other Lucide call sites continue to type-check (LucideProps is a superset of `{ size?, className? }`).
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create frontend/components/BrandIcon.tsx (RID-01 / D-06, D-07, D-09)</name>
  <files>frontend/components/BrandIcon.tsx</files>
  <read_first>
    - frontend/app/icon.tsx (verbatim source of the two <path d="..."> strings — D-06 mandates byte-identical copy of those two strings, viewBox, fill, stroke-linecap)
    - frontend/components/EmptyState.tsx (current contract — Icon is invoked as `<Icon className="text-foreground-muted" size={48} aria-hidden />`; BrandIcon MUST render correctly when called with those exact props)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §"RID-01 — BrandIcon" (D-06..D-09)
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Example 2: BrandIcon component"
  </read_first>
  <action>
    Create a NEW file `frontend/components/BrandIcon.tsx` with the EXACT contents below (this is the verbatim research-confirmed shape — do not improvise wording, do not reorder attributes, do not rewrap props):

    ```tsx
    // RID-01 — Reusable brand mark extracted from frontend/app/icon.tsx.
    //
    // Why a duplicate of the two <path d="..."> strings: app/icon.tsx runs at
    // the Next.js Edge runtime (`ImageResponse`) and rasterizes the SVG to a
    // PNG for the PWA `apple-icon.tsx` / manifest pipeline. It cannot be
    // imported by React components because its export is an ImageResponse,
    // not a JSX element. So both files keep the same two path strings; per
    // 24-CONTEXT.md D-09, both must update together if the brand mark ever
    // changes. The viewBox / paths are byte-identical to app/icon.tsx:26-39.
    //
    // Why `stroke="currentColor"` instead of the literal `#FAF7F2`: BrandIcon
    // inherits the text color of its container so it tints into whatever
    // palette wraps it (foreground-muted on EmptyState, primary on onboarding
    // welcome, etc.). The PWA twin keeps the literal because the Edge runtime
    // cannot resolve CSS variables.
    export function BrandIcon({
      size = 48,
      strokeWidth = 6,
      className,
      "aria-label": ariaLabel,
    }: {
      size?: number;
      strokeWidth?: number;
      className?: string;
      "aria-label"?: string;
    }) {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={className}
          aria-label={ariaLabel}
          aria-hidden={ariaLabel === undefined ? true : undefined}
          role={ariaLabel !== undefined ? "img" : undefined}
        >
          {/* Outer pasta-strand spiral (closed Bézier whorl) — verbatim from app/icon.tsx */}
          <path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z" />
          {/* Inner whorl — single curve reading as the pasta unfurling — verbatim from app/icon.tsx */}
          <path d="M 60 80 C 60 65, 80 55, 95 65" />
        </svg>
      );
    }
    ```

    Specifically:
    - Default `size=48` matches EmptyState's existing `<Icon size={48} />` call site (D-07).
    - Default `strokeWidth=6` matches `frontend/app/icon.tsx:32` (D-06).
    - The two `<path d="...">` strings must be BYTE-IDENTICAL to lines 36 and 38 of `frontend/app/icon.tsx`. Copy them verbatim. Do NOT improvise or "simplify".
    - When `aria-label` is omitted → `aria-hidden="true"` + no role (decorative).
    - When `aria-label` is provided → `role="img"` + the supplied label, NO `aria-hidden` (screen-reader announces the label).
    - The component is a plain function component (no forwardRef) — React 19.2.4 treats ref as a regular prop on function components per RESEARCH.md §Target 3; no Lucide call site passes a ref to EmptyState's icon, so this is irrelevant for v0.5.
    - Do NOT add `"use client"` directive — the component is pure SVG markup with no hooks; it is safe to render on the server.
    - Trailing newline at end of file.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "viewBox=\"0 0 160 160\"" components/BrandIcon.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && test -f components/BrandIcon.tsx && echo OK` prints OK.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "export function BrandIcon" components/BrandIcon.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "viewBox=\"0 0 160 160\"" components/BrandIcon.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "fill=\"none\"" components/BrandIcon.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "stroke=\"currentColor\"" components/BrandIcon.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z" components/BrandIcon.tsx` returns `1` (outer path verbatim from app/icon.tsx).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "M 60 80 C 60 65, 80 55, 95 65" components/BrandIcon.tsx` returns `1` (inner path verbatim from app/icon.tsx).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "size = 48" components/BrandIcon.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "strokeWidth = 6" components/BrandIcon.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "\"use client\"" components/BrandIcon.tsx` returns `0` (no use-client directive — pure SVG).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "aria-hidden" components/BrandIcon.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - The path data in `frontend/components/BrandIcon.tsx` is BYTE-IDENTICAL to `frontend/app/icon.tsx` lines 36 and 38 (verifiable by diffing the `<path d="..." />` substrings).
  </acceptance_criteria>
  <done>
    `frontend/components/BrandIcon.tsx` exists, exports `BrandIcon` as a default-size-48, default-strokeWidth-6, currentColor-stroked, viewBox-0-0-160-160 SVG functional component with the two pasta-strand paths copied verbatim from `app/icon.tsx`. `aria-label` opt-in switches between decorative (`aria-hidden`) and labeled (`role="img"`). TypeScript compiles cleanly.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Widen EmptyState's icon prop type to accept both Lucide and BrandIcon (RID-01 / D-08)</name>
  <files>frontend/components/EmptyState.tsx</files>
  <read_first>
    - frontend/components/EmptyState.tsx (full file — 35 lines; the file being modified)
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Target 9: EmptyState LucideIcon Type Compatibility (RID-01)" (this is the load-bearing reason widening is required, not optional)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-08
  </read_first>
  <action>
    Modify `frontend/components/EmptyState.tsx` so the `icon` prop accepts both Lucide icons AND BrandIcon. The current prop type `LucideIcon` (which is `ForwardRefExoticComponent<...>`) does NOT structurally match a plain function component, so TypeScript would error on `icon={BrandIcon}` if left unchanged.

    Three sub-edits:

    SUB-EDIT 2A — Replace the `LucideIcon` type import with `ComponentType` from React.
    Current line 2: `import type { LucideIcon } from "lucide-react";`
    Replace with:    `import type { ComponentType } from "react";`

    SUB-EDIT 2B — Widen the `icon` prop type at line 17.
    Current line 17: `  icon: LucideIcon;`
    Replace with:    `  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;`

    Why `"aria-hidden"?: boolean` is included in the structural type: line 24 invokes `<Icon ... aria-hidden />` (boolean-form aria-hidden). Including it in the type so any future icon component declares it (Lucide already accepts arbitrary `LucideProps` so this is harmless; BrandIcon accepts the boolean form via `aria-hidden?: boolean` semantics through its `aria-label` opt-in path — both satisfy the structural type).

    SUB-EDIT 2C — Do NOT modify any other line. The render body at lines 22-33 stays byte-identical: `<Icon className="text-foreground-muted" size={48} aria-hidden />` still works because both Lucide icons and BrandIcon accept those props.

    Preserve the leading comment block (lines 5-10) — it documents the deliberate choice to not import `Card` here. Do NOT remove or modify it.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "ComponentType<{ size?: number; className?: string" components/EmptyState.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import type { ComponentType } from \"react\";" components/EmptyState.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "LucideIcon" components/EmptyState.tsx` returns `0` (no remaining Lucide-specific type reference).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "ComponentType<{ size?: number; className?: string" components/EmptyState.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<Icon className=\"text-foreground-muted\" size={48} aria-hidden />" components/EmptyState.tsx` returns `1` (render body unchanged).
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0 (no TS regression on existing Lucide call sites — Lucide icons still satisfy the wider structural type because their `LucideProps` is a superset of `{ size?, className?, aria-hidden? }`).
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint components/EmptyState.tsx` exits 0.
  </acceptance_criteria>
  <done>
    `EmptyState.tsx` no longer imports `LucideIcon`; the `icon` prop is `ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>`. The render body is unchanged. All four existing Lucide call sites (Sparkles in HomeDecide, Inbox in inbox page, BookOpen + Search in recipes page, plus any others) still type-check.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Mount BrandIcon on the onboarding welcome screen (RID-01 / D-08)</name>
  <files>frontend/app/onboarding/welcome/page.tsx</files>
  <read_first>
    - frontend/app/onboarding/welcome/page.tsx (full file — 62 lines)
    - frontend/components/BrandIcon.tsx (from Task 1 — the component contract)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-08 (mount points — onboarding welcome is the first of four)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §"Claude's Discretion" bullet 1 (a labeled BrandIcon at the welcome screen makes screen-reader sense — pass aria-label="al dente")
  </read_first>
  <action>
    Modify `frontend/app/onboarding/welcome/page.tsx` to render BrandIcon ABOVE the `<h1 className="text-display">` wordmark inside the existing `<header>` block. This is a brand moment — the icon gets a real `aria-label="al dente"` so VoiceOver users hear the brand name (per CONTEXT.md §Claude's Discretion bullet 1).

    Two sub-edits:

    SUB-EDIT 3A — Add the BrandIcon import. After the existing import line `import { ChevronRight } from "lucide-react";` (currently line 5), add:
    ```tsx
    import { BrandIcon } from "@/components/BrandIcon";
    ```

    Keep alphabetical-ish ordering: place it after the `lucide-react` import and before the `@/components/ui/card` import on line 6 (placing it adjacent to the other `@/components/*` imports).

    SUB-EDIT 3B — Inside the existing `<header className="flex flex-col items-center gap-2 text-center">` block (currently lines 21-29), insert a BrandIcon as the FIRST child, immediately before the `<h1 className="text-display">`. The header's `gap-2` flex layout will naturally space the icon above the wordmark.

    Current header block:
    ```tsx
    <header className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-display">{tHome("title")}</h1>
      <p className="text-base text-foreground-muted mt-2 text-center">
        {t("tagline")}
      </p>
    </header>
    ```

    New header block:
    ```tsx
    <header className="flex flex-col items-center gap-2 text-center">
      <BrandIcon
        size={72}
        aria-label="al dente"
        className="text-primary mb-2"
      />
      <h1 className="text-display">{tHome("title")}</h1>
      <p className="text-base text-foreground-muted mt-2 text-center">
        {t("tagline")}
      </p>
    </header>
    ```

    Specifically:
    - `size={72}` — larger than the EmptyState default (48) because this is the onboarding "first impression" surface; the mark earns more presence here than in a per-section empty state.
    - `aria-label="al dente"` — labeled per CONTEXT.md §Claude's Discretion bullet 1; VoiceOver announces "al dente" before "Welcome" / wordmark.
    - `className="text-primary mb-2"` — terracotta brand color (matches `text-display` Fraunces italic color expectation per the Phase 9 design system); `mb-2` adds a small extra gap above the wordmark beyond the parent's `gap-2`.
    - Do NOT touch the surrounding `<section>`, the CTA Card pair (lines 36-58), the `<div className="flex-1" />` spacer, or the imports for `useTranslations` / `Link` / `Card` / `ChevronRight`.
    - Do NOT add any new translations to `fr.json` — `"al dente"` is the literal brand name (not a translatable string; same casing as the wordmark itself).
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<BrandIcon" app/onboarding/welcome/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import { BrandIcon } from \"@/components/BrandIcon\";" app/onboarding/welcome/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<BrandIcon" app/onboarding/welcome/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "aria-label=\"al dente\"" app/onboarding/welcome/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "size={72}" app/onboarding/welcome/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "text-primary mb-2" app/onboarding/welcome/page.tsx` returns `1`.
    - The wordmark <h1> survives: `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<h1 className=\"text-display\">{tHome(\"title\")}</h1>" app/onboarding/welcome/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint app/onboarding/welcome/page.tsx` exits 0.
  </acceptance_criteria>
  <done>
    Onboarding welcome screen renders `<BrandIcon size={72} aria-label="al dente" className="text-primary mb-2" />` as the first child of the header `<header>`, above the wordmark. VoiceOver announces "al dente" on focus. The rest of the page is unchanged.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Swap Sparkles → BrandIcon in HomeDecide shortlist empty state (RID-01 / D-08)</name>
  <files>frontend/components/HomeDecide.tsx</files>
  <read_first>
    - frontend/components/HomeDecide.tsx (current state — focus on the Sparkles import line and the EmptyState call site at L418)
    - frontend/components/BrandIcon.tsx (from Task 1)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-08 (this is the shortlist deck empty state — 1 of 3 EmptyState swaps)
  </read_first>
  <action>
    Two sub-edits in `frontend/components/HomeDecide.tsx`:

    SUB-EDIT 4A — Drop `Sparkles` from the `lucide-react` import (or remove it from the destructured list).
    Locate the line that imports `Sparkles` from `"lucide-react"`. The shape may be either:
      `import { Sparkles, OtherIcon } from "lucide-react";` (multi-icon)
    or
      `import { Sparkles } from "lucide-react";` (lone)
    or
      `import { OtherIcon1, Sparkles, OtherIcon2 } from "lucide-react";` (middle of list).

    Use `grep -n "Sparkles\b" frontend/components/HomeDecide.tsx` to find the exact line, then:
    - If `Sparkles` is the SOLE imported icon on that line, DELETE the entire line.
    - If it's one of several, remove only the `Sparkles,` or `, Sparkles` or `Sparkles, ` token; preserve all other imports verbatim.
    - If after removal there is NO remaining usage of `Sparkles` in the file (grep returns zero matches in the imports list), confirm there are zero `<Sparkles` JSX usages elsewhere in the file: `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<Sparkles" components/HomeDecide.tsx` MUST return `0` after this edit.

    SUB-EDIT 4B — Add the BrandIcon import (anywhere among the `@/components/*` imports — preserve alphabetical-ish ordering):
    ```tsx
    import { BrandIcon } from "@/components/BrandIcon";
    ```

    SUB-EDIT 4C — At the EmptyState call site (currently line 418 `icon={Sparkles}`), change `icon={Sparkles}` to `icon={BrandIcon}`. Preserve every other prop on the EmptyState verbatim:
    ```tsx
    <EmptyState
      icon={BrandIcon}
      heading={tShortlist("empty_heading")}
      body={tShortlist("empty_body")}
      cta={{
        href: "/recipes/new",
        label: tShortlist("empty_cta"),
      }}
    />
    ```

    Do NOT modify any other part of `HomeDecide.tsx` — the cooking banner, the regenerate sheet, the active-cook filter, the bottom-safe padding, etc.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={BrandIcon}" components/HomeDecide.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import { BrandIcon } from \"@/components/BrandIcon\";" components/HomeDecide.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "Sparkles" components/HomeDecide.tsx` returns `0` (Sparkles fully removed from imports and JSX).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={BrandIcon}" components/HomeDecide.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={Sparkles}" components/HomeDecide.tsx` returns `0`.
    - The EmptyState's `heading={tShortlist(\"empty_heading\")}` and `cta=` props are unchanged: `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "tShortlist(\"empty_heading\")" components/HomeDecide.tsx` is unchanged from pre-edit count.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint components/HomeDecide.tsx` exits 0.
  </acceptance_criteria>
  <done>
    The shortlist empty state in HomeDecide.tsx renders `<EmptyState icon={BrandIcon} ... />`. Sparkles is no longer imported. All other behavior (regenerate sheet, cooking banner, copy) is unchanged.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Swap Inbox → BrandIcon in /inbox empty state (RID-01 / D-08)</name>
  <files>frontend/app/inbox/page.tsx</files>
  <read_first>
    - frontend/app/inbox/page.tsx (current state — Inbox icon imported at L11, EmptyState at L156-161)
    - frontend/components/BrandIcon.tsx (from Task 1)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-08 (drafts inbox is 1 of 3 EmptyState swaps)
  </read_first>
  <action>
    Three sub-edits in `frontend/app/inbox/page.tsx`:

    SUB-EDIT 5A — Drop `Inbox` from the lucide-react import at line 11.
    Current line 11: `import { Inbox } from "lucide-react";`
    Because Inbox is the SOLE icon imported on this line, DELETE the entire line. (Verify with `grep -c "from \"lucide-react\"" frontend/app/inbox/page.tsx` before the edit — should return 1; after deletion, returns 0.)

    SUB-EDIT 5B — Add the BrandIcon import. Insert immediately after the deleted Inbox line (or among the existing `@/components/*` imports — keep alphabetical-ish ordering with the existing `@/components/EmptyState` import at line 14):
    ```tsx
    import { BrandIcon } from "@/components/BrandIcon";
    ```

    SUB-EDIT 5C — At the EmptyState call site (currently lines 156-161), change `icon={Inbox}` to `icon={BrandIcon}`. Preserve every other prop verbatim:
    ```tsx
    <EmptyState
      icon={BrandIcon}
      heading={t("empty_heading")}
      body={t("empty_body")}
    />
    ```

    Do NOT modify the cache logic, the dedupePrepend helper, the realtime subscription block, the OnboardingGuard wrapper, the sticky header, or any other part of the file.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={BrandIcon}" app/inbox/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import { BrandIcon } from \"@/components/BrandIcon\";" app/inbox/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "Inbox" app/inbox/page.tsx` returns `0` (no Inbox icon import, no `<Inbox` JSX, no `Inbox` token anywhere — the comment at line 4 says "Drafts inbox" not "Inbox").
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={BrandIcon}" app/inbox/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={Inbox}" app/inbox/page.tsx` returns `0`.
    - The EmptyState's `heading={t(\"empty_heading\")}` and `body={t(\"empty_body\")}` props are unchanged.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint app/inbox/page.tsx` exits 0.
  </acceptance_criteria>
  <done>
    The drafts inbox empty state renders `<EmptyState icon={BrandIcon} ... />`. The Inbox Lucide icon is no longer imported. Realtime / cache logic untouched.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Swap BookOpen → BrandIcon in /recipes default empty state (keep Search for no-results state) (RID-01 / D-08)</name>
  <files>frontend/app/recipes/page.tsx</files>
  <read_first>
    - frontend/app/recipes/page.tsx (current state — focus on the lucide-react import at L16 and the dual EmptyState block at L130-146)
    - frontend/components/BrandIcon.tsx (from Task 1)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-08 (recipes-library default empty state is 1 of 3 — note that the "no search results" state is INTENTIONALLY excluded; it's a transient state, not a brand moment)
  </read_first>
  <action>
    Three sub-edits in `frontend/app/recipes/page.tsx`:

    SUB-EDIT 6A — Drop `BookOpen` from the lucide-react import at line 16, BUT KEEP `Plus` AND `Search` (both still used elsewhere on the page).
    Current line 16: `import { BookOpen, Plus, Search } from "lucide-react";`
    Replace with:    `import { Plus, Search } from "lucide-react";`

    SUB-EDIT 6B — Add the BrandIcon import. Insert among the existing `@/components/*` imports (keep alphabetical-ish ordering with `@/components/EmptyState` at L19):
    ```tsx
    import { BrandIcon } from "@/components/BrandIcon";
    ```

    SUB-EDIT 6C — At the dual-branch EmptyState block (currently L130-146), change ONLY the second branch (the `query.trim().length > 0` ? Search : BookOpen ternary). The Search branch stays unchanged; the BookOpen branch becomes BrandIcon. Preserve every other prop verbatim:

    Current block:
    ```tsx
    {query.trim().length > 0 ? (
      <EmptyState
        icon={Search}
        heading={t("no_results_heading", { query })}
        body={t("no_results_body")}
      />
    ) : (
      <EmptyState
        icon={BookOpen}
        heading={t("empty_heading")}
        body={t("empty_body")}
        cta={{ label: t("empty_cta"), href: "/recipes/new" }}
      />
    )}
    ```

    New block:
    ```tsx
    {query.trim().length > 0 ? (
      <EmptyState
        icon={Search}
        heading={t("no_results_heading", { query })}
        body={t("no_results_body")}
      />
    ) : (
      <EmptyState
        icon={BrandIcon}
        heading={t("empty_heading")}
        body={t("empty_body")}
        cta={{ label: t("empty_cta"), href: "/recipes/new" }}
      />
    )}
    ```

    Specifically:
    - The `query.trim().length > 0` (no-results) branch still uses `Search`. This is intentional per D-08 — "no results" is a transient functional state, not a brand moment. The brand mark belongs on the "no recipes yet" default state where the user is invited to capture their first recipe.
    - Do NOT touch the surrounding `recipes.length === 0` guard, the grid `<div className="px-(--spacing-page-x) grid grid-cols-2 ...">`, the cache logic, the realtime subscription, the SearchInput, the Plus add button, or the OnboardingGuard wrapper.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={BrandIcon}" app/recipes/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import { BrandIcon } from \"@/components/BrandIcon\";" app/recipes/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import { Plus, Search } from \"lucide-react\";" app/recipes/page.tsx` returns `1` (BookOpen dropped, Plus + Search preserved).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "BookOpen" app/recipes/page.tsx` returns `0`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={BrandIcon}" app/recipes/page.tsx` returns `1` (default empty state).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={Search}" app/recipes/page.tsx` returns `1` (no-results state preserved — still uses lucide Search).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "icon={BookOpen}" app/recipes/page.tsx` returns `0`.
    - Both branches' `heading` / `body` / `cta` props are unchanged: `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "t(\"no_results_heading\", { query })\|t(\"empty_heading\")\|t(\"empty_body\")\|t(\"empty_cta\")" app/recipes/page.tsx` returns at least `4`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint app/recipes/page.tsx` exits 0.
  </acceptance_criteria>
  <done>
    `/recipes` default empty state (no recipes, no search query) renders `<EmptyState icon={BrandIcon} ... />` with the existing `empty_cta`. The "no results for {query}" state still uses the Lucide Search icon (intentional — D-08). BookOpen is no longer imported. Plus + Search remain.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none) | Pure SVG render of static brand assets — no user input crosses any new boundary. The two `<path d="...">` strings are hardcoded in the component source, not LLM-generated. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-24-01-01 | Spoofing | BrandIcon component | accept | Pure render — no auth surface introduced. |
| T-24-01-02 | Tampering | BrandIcon component | accept | The SVG path data is hardcoded in the source file; no user-controlled content reaches the renderer. A future supply-chain compromise of the source file would be detected via git review. |
| T-24-01-03 | Information Disclosure | EmptyState type widening | accept | `ComponentType<{ size?, className?, aria-hidden? }>` widens what can be passed, NOT what data flows out. No information disclosure surface. |
| T-24-01-04 | Denial of Service | n/a | accept | Adding a 2-path SVG to four pages increases per-page payload by <1 KB. No DoS surface. |

**Summary:** RID-01 is a pure-render, pure-frontend, no-data-ingestion plan. No security boundaries crossed. All STRIDE categories receive `accept` dispositions. Low severity overall.
</threat_model>

<verification>
## Phase 24 / RID-01 Verification — grep gates + manual UI smoke

Per D-40 / D-41. No new Playwright specs (D-42 — fixture updates only when applicable; RID-01 doesn't change fixtures).

### Grep gates (must all pass after Task 1-6 complete)

```bash
# 1. BrandIcon component exists and matches app/icon.tsx SVG verbatim
test -f frontend/components/BrandIcon.tsx
grep -c "viewBox=\"0 0 160 160\"" frontend/components/BrandIcon.tsx       # Expected: 1
grep -c "stroke=\"currentColor\"" frontend/components/BrandIcon.tsx       # Expected: 1
grep -c "M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z" frontend/components/BrandIcon.tsx   # Expected: 1
grep -c "M 60 80 C 60 65, 80 55, 95 65" frontend/components/BrandIcon.tsx # Expected: 1

# 2. PWA twin (app/icon.tsx) still exists — D-09
test -f frontend/app/icon.tsx
grep -c "ImageResponse" frontend/app/icon.tsx                              # Expected: 1 (still the Edge-runtime PWA icon)

# 3. EmptyState type widened
grep -c "ComponentType<{ size?: number; className?: string" frontend/components/EmptyState.tsx   # Expected: 1
grep -c "LucideIcon" frontend/components/EmptyState.tsx                    # Expected: 0

# 4. BrandIcon mounted at 4 expected surfaces
grep -rn "<BrandIcon\|icon={BrandIcon}" frontend/                          # Expected: 4 lines:
#   frontend/app/onboarding/welcome/page.tsx: <BrandIcon size={72} ...
#   frontend/components/HomeDecide.tsx: icon={BrandIcon}
#   frontend/app/inbox/page.tsx: icon={BrandIcon}
#   frontend/app/recipes/page.tsx: icon={BrandIcon}

# 5. Old Lucide icons dropped where required, preserved where required
grep -c "BookOpen" frontend/app/recipes/page.tsx                           # Expected: 0
grep -c "Sparkles" frontend/components/HomeDecide.tsx                      # Expected: 0
grep -c "from \"lucide-react\"" frontend/app/inbox/page.tsx                # Expected: 0 (no remaining lucide import — Inbox was the only icon)
grep -c "Search" frontend/app/recipes/page.tsx                             # Expected: at least 2 (import + JSX usage on no-results branch)
```

### Build / lint gates

```bash
cd frontend && npx tsc --noEmit -p tsconfig.json     # Expected: exit 0
cd frontend && npx eslint components/BrandIcon.tsx components/EmptyState.tsx app/onboarding/welcome/page.tsx components/HomeDecide.tsx app/inbox/page.tsx app/recipes/page.tsx   # Expected: exit 0
cd frontend && npx next build --webpack              # Expected: clean build (deploy gate — Vercel runs this on push to main)
```

### Manual UI smoke (D-41 — operator runs against seeded fixture via `uv run seed`)

1. **Onboarding welcome** (`/onboarding/welcome`): Pasta-strand brand mark appears above the wordmark in terracotta. VoiceOver (iOS) announces "al dente" when focused.
2. **Empty drafts inbox** (`/inbox` with zero drafts): Pasta-strand mark replaces the previous Inbox-tray icon. `text-foreground-muted` tint.
3. **Empty recipes library** (`/recipes` with zero recipes, no search): Pasta-strand mark replaces the previous BookOpen icon. CTA ("Capturer une recette") still navigates to `/recipes/new`.
4. **Empty recipes library WITH search query** (`/recipes?q=foo` with no matches): Lucide Search icon still shown (intentionally — not a brand moment).
5. **Empty shortlist deck** (`/` with no shortlist for today): Pasta-strand mark replaces the previous Sparkles icon. Regenerate-shortlist CTA still works.
6. **PWA app icon** (long-press home-screen install on iOS): The installed app icon is still the cream-on-terracotta pasta-strand (verifies `app/icon.tsx` is unmodified — D-09).
</verification>

<success_criteria>
The plan is complete when:

1. All grep gates from §Verification pass (BrandIcon exists with verbatim paths; PWA twin preserved; EmptyState widened; 4 BrandIcon mount points; 3 Lucide icons dropped; Search icon preserved).
2. `cd frontend && npx tsc --noEmit && npx eslint <touched files> && npx next build --webpack` exits 0 cleanly.
3. Manual UI smoke (6 steps) passes on the seeded fixture.
4. RID-01 success criterion 1 (`A BrandIcon component exists at frontend/components/BrandIcon.tsx and is visible on the onboarding welcome screen and on shortlist/inbox/recipes empty states`) is satisfied.
5. All tasks merged in ONE atomic commit. Suggested commit message: `feat(24-01): brand icon — extract BrandIcon component + mount on welcome + 3 empty states (RID-01, gh#11)`.
</success_criteria>

<output>
After completion, create `.planning/phases/24-recipe-identity/24-01-brand-icon-SUMMARY.md` documenting:

- RID-01 closed; gh#11 closeable on merge to main.
- Files created: 1 (`frontend/components/BrandIcon.tsx`).
- Files modified: 5 (`frontend/components/EmptyState.tsx`, `frontend/app/onboarding/welcome/page.tsx`, `frontend/components/HomeDecide.tsx`, `frontend/app/inbox/page.tsx`, `frontend/app/recipes/page.tsx`).
- Brand mark mounted at 4 surfaces (welcome + 3 empty states).
- Lucide icons dropped: `Inbox`, `BookOpen`, `Sparkles`. Preserved: `Search` (no-results state per D-08), `Plus` (recipes header add button), `ChevronRight` (welcome CTAs).
- PWA twin (`app/icon.tsx`) explicitly NOT deleted per D-09 — both files share the same path data; coordinated update required for future brand changes.
- Provides for future phases: `BrandIcon` is the RID-05 fallback component when `recipe.illustration_svg` is NULL or sanitizer-rejected (D-37). The `ComponentType<{ size?, className? }>` structural typing for EmptyState is reusable for any future icon-prop widening.
- Verification: grep gates + manual UI smoke. No Playwright fixture updates needed (no data/wire change).
</output>
