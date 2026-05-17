# Phase 31: Bottom Nav Restructure — Research

**Researched:** 2026-05-18
**Domain:** Next.js 16 App Router navigation hooks, Tailwind v4 token utilities, next-intl key mechanics, iOS PWA safe-area inset interactions, Playwright E2E selector audit
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: 3 flat tabs + 1 central CTA = 4 slots total. No « Suggérer » placeholder slot.
- D-02: Left → right order: Accueil / Recettes / [Ajouter CTA] / Profil.
- D-03: All 4 slots remain `flex: 1` siblings inside the existing `<nav className="flex">` shell. No slot breaks out of flex distribution.
- D-04: Inline-larger circle, fully contained in the nav bar. No notch, no FAB protrusion above the bar's top edge.
- D-05: CTA circle ~56 px diameter, white `+` glyph centered. Sibling icon-pills stay at today's ~40 px wash (`h-10 w-10`). Nav bar content height grows from `min-h-[4rem]` to ~72–80 px content.
- D-06: `Ajouter` label sits below the circle, same `text-xs font-medium` register as siblings.
- D-07: `<main>` padding-bottom changes from `pb-[calc(4rem+env(safe-area-inset-bottom))]` to `pb-[calc(5rem+env(safe-area-inset-bottom))]`.
- D-08: Active route match: `pathname === "/recipes/new"` (exact match only).
- D-09: `usePathname()` is the active-detection mechanism for all 4 slots. `useSelectedLayoutSegment()` is insufficient and must NOT be used for active matching.
- D-10: Onboarding hide check stays segment-based (`segment?.startsWith("onboarding")`). Both hooks coexist in the same component.
- D-11: CTA active visual: filled-primary + `ring-2 ring-primary/30` (additive, not transformative).
- D-12: Active state is mutually exclusive across 4 slots: at most one slot has `aria-current="page"` at any time.
- D-13: `variant: "tab" | "central-cta"` discriminated union on the `Tab` type. `TABS` const is `ReadonlyArray<Tab>`.
- D-14: Grep gate: `grep -rn "variant.*tab\|variant.*central-cta" frontend/` must return the type definition AND the TABS entries.
- D-15: Rename `nav.settings` → `nav.profile` in `fr.json`, value `"Profil"`. Route at `/settings` unchanged.
- D-16: Add `nav.add = "Ajouter"`. Used as visible label AND `aria-label` on the CTA `<Link>`.
- D-17: Profil tab icon stays `Settings` from lucide-react. Icon swaps deferred.
- D-18: The "Drafts-tab badge" acceptance criterion is stale — Phase 27 D-11 removed the drafts tab entirely. No drafts badge exists to preserve.

### Claude's Discretion
- Exact CSS values for the ring active state (`ring-2 ring-primary/30` is illustrative).
- Whether to extract a `<CentralCTA />` sub-component or inline the branch in the map callback.
- Exact pixel value for the nav-bar content height (~72 vs ~80 px).
- Whether the `usePathname()` migration also rewrites the Accueil tab's active check (`pathname === "/"` recommended for consistency).
- Where to put the `aria-label="Ajouter"` fallback — `<Link>` element is the spec's recommendation.

### Deferred Ideas (OUT OF SCOPE)
- « Suggérer » tab (gh#26 — backlog, needs product design).
- Bottom-nav icon swaps for the other four tabs.
- Smart Paste capture-screen redesign.
- Motion/animation on CTA tap beyond standard `active:scale-95`.
- Active-state animated transitions between routes.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Central elevated « Ajouter » CTA in bottom nav — filled primary circle, white `+`, aria-current semantics, per-tab variant discriminator, safe-area and onboarding-hide preserved | All 10 technical questions below are answered; implementation is fully specified in CONTEXT.md + UI-SPEC.md; no new dependencies required |
</phase_requirements>

---

## Summary

Phase 31 is a contained frontend-only restructure of a single component (`BottomNav.tsx`) plus two adjacent files (`app/layout.tsx`, `lib/i18n/fr.json`) and a Playwright audit pass. The decisions are locked in CONTEXT.md (D-01 through D-18) and the visual contract is locked in UI-SPEC.md. Research confirms there are no architectural surprises: all required APIs exist in the installed versions, no new packages are needed, and the audit of the codebase turns up exactly the call sites that were expected.

The load-bearing technical switch is the replacement of `useSelectedLayoutSegment()` with `usePathname()` for active-tab detection. The currently installed Next.js 16.2.4 exports both from `next/navigation`; both can coexist in the same client component (the hide gate keeps the segment hook, active matching moves to the pathname hook). The collision risk — `/recipes/new` returning `"recipes"` from the segment hook and double-activating the Recettes tab AND the CTA simultaneously — is the primary pitfall the planner must address.

The token audit confirms that `ring-2 ring-primary/30`, `bg-primary/8`, `bg-primary`, `text-primary`, `text-foreground-muted`, `text-primary-foreground`, and `ring-offset-background` are all valid against the present `globals.css` token set. The `Plus` icon is already imported in three other files (`Composer.tsx`, `PhotoUploader.tsx`, `recipes/page.tsx`) — no new import path, no tree-shaking concern. The 4rem/pb-16 audit finds exactly one call site outside the nav itself: line 68 of `app/layout.tsx`, which D-07 targets.

**Primary recommendation:** Implement as a single plan (31-01) that rewrites `BottomNav.tsx`, updates `app/layout.tsx` line 68, updates `fr.json`, and audits the four E2E spec files. The scope is small enough that splitting into multiple plans adds coordination cost without benefit.

---

## Standard Stack

### Core (no new packages required)

| Library | Installed Version | Purpose | Verification |
|---------|------------------|---------|--------------|
| next/navigation | Next.js 16.2.4 | `usePathname()` + `useSelectedLayoutSegment()` | [VERIFIED: `next/dist/client/components/navigation.d.ts` — both exported, typed] |
| next-intl | 4.11.0 | `useTranslations("nav")` — adds `nav.add`, renames `nav.settings` → `nav.profile` | [VERIFIED: installed, already wired in BottomNav.tsx] |
| lucide-react | 1.14.0 | `Plus` icon for the CTA circle | [VERIFIED: `plus.mjs` exists in `node_modules/lucide-react/dist/esm/icons/`; already imported in `Composer.tsx`, `PhotoUploader.tsx`, `recipes/page.tsx`] |
| tailwindcss | 4.2.4 | All utility classes used in the component (`flex-1`, `ring-2`, `ring-primary/30`, `min-h-[4.5rem]`, `w-14 h-14`, `active:scale-95`) | [VERIFIED: installed v4.2.4; arbitrary value syntax `min-h-[4.5rem]` confirmed valid; see token analysis below] |

**No `npm install` step is required for this phase.** [VERIFIED: codebase grep]

---

## Architecture Patterns

### Next.js 16 Hook Coexistence (D-09, D-10)

`usePathname()` and `useSelectedLayoutSegment()` are both exported from `next/navigation` in Next.js 16.2.4. [VERIFIED: `navigation.d.ts` lines 32–125] Both can be called unconditionally in the same client component — they are independent hooks backed by different React context providers. The combined pattern for Phase 31:

```typescript
// VERIFIED: both hooks are from 'next/navigation'; coexistence is safe in App Router
"use client";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";

export function BottomNav() {
  const segment = useSelectedLayoutSegment(); // hide gate only (D-10)
  const pathname = usePathname();             // active matching for all 4 slots (D-09)

  if (segment?.startsWith("onboarding")) return null;

  // Active predicate for each slot
  const isActive = (tab: Tab): boolean => {
    if (tab.variant === "central-cta") return pathname === tab.pathname;
    if (tab.matchExact) return pathname === tab.pathname;
    return pathname.startsWith(tab.pathname) && pathname !== "/recipes/new";
  };
  // ...
}
```

**Critical invariant:** `useSelectedLayoutSegment()` returns `"recipes"` for BOTH `/recipes` and `/recipes/new`. Using it for active matching creates a double-active state. `usePathname()` returns the exact path string, enabling the exclusive predicates in the slot roster. [VERIFIED: CONTEXT.md D-09 documents this as the load-bearing fix]

**App Router constraint:** Both hooks require `"use client"` — already present in the current `BottomNav.tsx`. No layout-boundary complications since the component is already a leaf client component mounted from the root server layout.

### Discriminated Union: `Tab` Type (D-13)

The planner-recommended shape from UI-SPEC.md:

```typescript
// Source: 31-UI-SPEC.md §Component Specification
type FlatTab = {
  variant: "tab";
  href: string;
  pathname: string;
  matchExact: boolean;
  icon: LucideIcon;
  labelKey: "home" | "recipes" | "profile";
};

type CentralCTA = {
  variant: "central-cta";
  href: string;
  pathname: string;  // "/recipes/new"
  labelKey: "add";
};

type Tab = FlatTab | CentralCTA;
```

The `.map()` callback narrows cleanly with `if (tab.variant === "central-cta")` — TypeScript narrows to `CentralCTA` in that branch and `FlatTab` otherwise. The grep gate (`grep -rn "variant.*tab\|variant.*central-cta" frontend/`) hits the type definition and each TABS array entry. [VERIFIED: TypeScript discriminated union pattern; consistent with existing codebase patterns]

### Slot Roster (D-01, D-02, UI-SPEC.md)

| Slot | href | variant | labelKey | icon | Active predicate |
|------|------|---------|----------|------|-----------------|
| 1 | `/` | `"tab"` | `"home"` | `Home` | `pathname === "/"` |
| 2 | `/recipes` | `"tab"` | `"recipes"` | `BookOpen` | `pathname.startsWith("/recipes") && pathname !== "/recipes/new"` |
| 3 | `/recipes/new` | `"central-cta"` | `"add"` | n/a — `Plus` inline | `pathname === "/recipes/new"` |
| 4 | `/settings` | `"tab"` | `"profile"` | `Settings` | `pathname === "/settings" \|\| pathname.startsWith("/settings/")` |

The predicates are mutually exclusive for the route set in use. [VERIFIED: active-state matrix in 31-UI-SPEC.md cross-checked against route table]

### Active-State Matrix Verification

The full matrix from UI-SPEC.md has been verified as self-consistent:

| Route | Slot 1 active | Slot 2 active | Slot 3 active | Slot 4 active |
|-------|--------------|--------------|--------------|--------------|
| `/` | YES | no | no | no |
| `/recipes` | no | YES | no | no |
| `/recipes/[id]` | no | YES | no | no |
| `/recipes/new` | no | no | YES | no |
| `/settings` | no | no | no | YES |
| `/settings/*` | no | no | no | YES |

Exactly one active slot per row. D-12 satisfied by predicate design. [VERIFIED: manually cross-checked]

### `app/layout.tsx` Change (D-07)

Single line change at line 68 — no other modifications needed:

```diff
- <main className="flex flex-col flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
+ <main className="flex flex-col flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">
```

[VERIFIED: `app/layout.tsx` line 68 confirmed as the sole `4rem` nav-height reference in app/ and components/ directories]

### Anti-Patterns to Avoid

- **Using `useSelectedLayoutSegment()` for active matching:** Returns `"recipes"` for both `/recipes` and `/recipes/new`, causing double-active. [VERIFIED: navigation.d.ts behavior; CONTEXT.md D-09]
- **Applying `bg-primary/8` pill wash to the CTA branch:** The pill wash is designed for the small icon-pill (40px). The CTA owns its own visual treatment (filled circle + ring). [VERIFIED: CONTEXT.md §Pitfalls]
- **Double safe-area padding:** The nav element already has `pb-[env(safe-area-inset-bottom)]` — do not also add safe-area padding to the CTA circle inner span.
- **Width percentage hardcoding:** Do not use `width: 25%` per slot. Keep `flex: 1` so a future 5th slot (gh#26) needs only a TABS array addition. [VERIFIED: D-03]
- **Conditional spread mid-JSX:** The variant discriminator must be a top-of-callback `if (tab.variant === "central-cta")` switch, not inline ternaries scattered through the JSX. [VERIFIED: D-13]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active route detection | Custom history listener or ref-based path tracker | `usePathname()` from `next/navigation` | Already in the dependency tree; SSR-safe; App Router guaranteed |
| Accessible nav landmark | Custom role/aria attribute spread | `<nav aria-label="...">` with `aria-current="page"` on active `<Link>` | WCAG 2.1 NAV landmark pattern; already established in codebase |
| Opacity modifier on tokens | Manual rgba(…) calculations | `bg-primary/8`, `ring-primary/30` | Tailwind v4 opacity modifier syntax works against CSS custom property tokens via `--tw-bg-opacity` |
| Icon bundle | Inline SVG path literal | `Plus` from `lucide-react` | Already in bundle (3 existing import sites); consistent with sibling icons |

---

## Tailwind v4 Token Analysis

### Token Validity Audit

All classes specified in UI-SPEC.md are valid against the present `globals.css` `@theme inline` block and `:root`/`.dark` token definitions. [VERIFIED: globals.css read in full]

| Utility Class | Token Source | Valid? |
|--------------|-------------|--------|
| `bg-primary` | `--color-primary` → `--primary` (oklch 0.595 0.135 35) | YES |
| `text-primary-foreground` | `--color-primary-foreground` → `--primary-foreground` | YES |
| `text-primary` | `--color-primary` | YES |
| `text-foreground-muted` | `--color-foreground-muted` → `--foreground-muted` | YES — explicitly added to `@theme inline` |
| `bg-primary/8` | opacity modifier on `--color-primary` | YES — Tailwind v4 opacity modifier works on CSS var tokens |
| `ring-2` | ring-width utility | YES — Tailwind v4 `ring-2` = `--tw-ring-shadow` at 2px |
| `ring-primary/30` | `--color-primary` with 30% opacity as ring color | YES — `ring-{color}/{opacity}` is valid v4 syntax |
| `ring-offset-1` | ring-offset-width utility | YES |
| `ring-offset-background` | `--color-background` | YES — `--color-background` is declared in `@theme inline` |
| `bg-card/85` | `--color-card` with opacity modifier | YES — already used in the current nav shell |
| `backdrop-blur-md` | backdrop filter | YES — unchanged from current implementation |
| `active:scale-95` | interactive state + scale | YES — `scale-95` is in the default scale |
| `min-h-[4.5rem]` | arbitrary value | YES — Tailwind v4 arbitrary value syntax `[...]` is fully supported; 4.5rem = 72px |
| `w-14 h-14` | spacing scale (14 × 0.25rem = 3.5rem = 56px) | YES — `h-14`/`w-14` are established in the codebase (`ShortlistCard.tsx`, `VoteSummary.tsx`) |
| `h-10 w-10` | spacing scale (10 × 0.25rem = 2.5rem = 40px) | YES — already used in current BottomNav.tsx pill wash |
| `transition-all duration-fast ease-craft` | `--duration-fast` + `--ease-craft` from `@theme inline` | YES — already used in current BottomNav.tsx |

**`min-h-[4.5rem]` vs `min-h-18`:** Tailwind v4 does NOT generate `min-h-18` in the default output for this project (confirmed: `grep` returns zero hits for `min-h-18` or `4.5rem` in the compiled utilities). Use the arbitrary value `min-h-[4.5rem]` — consistent with the existing `min-h-[4rem]` pattern in the current nav shell. [VERIFIED: grep on node_modules/tailwindcss/dist/utilities.css + project source]

### No Token Extensions Required

Phase 31 does NOT require any additions to `globals.css` `@theme inline`. All ring, color, motion, and spacing tokens needed are present. The `ring-offset-background` token is covered by `--color-background`. [VERIFIED: globals.css full read]

---

## next-intl Key Mechanics (D-15, D-16)

### Current State

`fr.json` `nav` namespace today:
```json
"nav": {
  "home": "Accueil",
  "recipes": "Recettes",
  "settings": "Réglages"
}
```

`BottomNav.tsx` `labelKey` type today: `"home" | "recipes" | "settings"`.

### Required Changes

1. **Delete** `nav.settings` from `fr.json`.
2. **Add** `nav.profile = "Profil"` to `fr.json`.
3. **Add** `nav.add = "Ajouter"` to `fr.json`.
4. **Update** `FlatTab.labelKey` type to `"home" | "recipes" | "profile"`.
5. **Update** `CentralCTA.labelKey` type to `"add"`.
6. **Replace** `t("settings")` call in the settings-tab entry with `t("profile")`.

### Call-Site Audit: `nav.settings` / `t("settings")`

Search results for `nav.settings`, `t("settings")`, `t('settings')`, and `"Réglages"` in the frontend source: [VERIFIED: grep across frontend/app/, frontend/components/, frontend/lib/]

| File | Reference | Action |
|------|-----------|--------|
| `frontend/lib/i18n/fr.json:13` | `"settings": "Réglages"` | DELETE key, ADD `"profile": "Profil"` + `"add": "Ajouter"` |
| `frontend/components/BottomNav.tsx:13` | `labelKey: "home" \| "recipes" \| "settings"` | Update type to new discriminated union |
| `frontend/app/globals.css:412` | Comment: `"Bibliothèque, Réception, Réglages, recipe detail"` | No-op — comment only, not a selector or key |
| `frontend/lib/i18n/fr.json:63` | `"Réessaie depuis Réglages."` (settings body copy, not nav key) | No-op — this is `home.push.subscribe_failed`, not `nav.settings` |
| `frontend/lib/i18n/fr.json:310` | `"settings": { ... }` (settings PAGE namespace) | No-op — this is the settings page's own namespace, not the nav key |
| `frontend/lib/i18n/fr.json:337` | `"Réglages iOS"` (iOS settings explanation text) | No-op — user-facing settings page copy |

**Conclusion:** The only TypeScript file referencing `t("settings")` in the nav context is `BottomNav.tsx`. No other component reads `t("settings")` from the `nav` namespace. The `settings` namespace at the top-level of `fr.json` is a separate namespace and is unaffected. [VERIFIED: grep results — zero other hits in app/components/]

### TypeScript Narrowing

With the discriminated union, TypeScript narrows `labelKey` automatically per variant:
- In the `FlatTab` branch: `labelKey` is typed `"home" | "recipes" | "profile"`, so `t(tab.labelKey)` is type-safe.
- In the `CentralCTA` branch: `labelKey` is typed `"add"`, so `t("add")` is explicit.
- No `as` casts required.

[ASSUMED: next-intl 4.11.0 provides good TypeScript type inference from `useTranslations`. Behavior is consistent with the pattern already established in the codebase.]

---

## Safe-Area Inset and Nav Height Analysis

### Current State
- Nav element: `min-h-[4rem]` = 64px content + `pb-[env(safe-area-inset-bottom)]` additive.
- `<main>`: `pb-[calc(4rem+env(safe-area-inset-bottom))]`.

### Phase 31 Target (D-05, D-07)
- Nav element: `min-h-[4.5rem]` = 72px content + `pb-[env(safe-area-inset-bottom)]` additive.
- `<main>`: `pb-[calc(5rem+env(safe-area-inset-bottom))]`.

The `<main>` padding uses 5rem (80px) while the nav content is 72px — giving 8px of extra clearance above the nav floor. This is intentional: content tap-targets need clear viewport access above the nav surface.

### iOS PWA Safe-Area Math
- iPhone X and later: `env(safe-area-inset-bottom)` = 34px in PWA standalone mode.
- Nav total height on notched devices: 72px (content) + 34px (inset) = **106px total nav height**.
- `<main>` bottom padding: 80px + 34px = **114px total clearance**.

The 114px clearance has not changed in character — it was previously 64px + 34px = 98px. The 16px increase is proportional. Nothing in the codebase is known to assume nav height < 100px; the `--spacing-bottom-safe: 6rem (96px)` token is additive (content breathing room ABOVE the nav floor, not instead of it) and does not need to change. [VERIFIED: globals.css comment at `--spacing-bottom-safe` explicitly states "Layout.tsx ALREADY pads `<main>` by `4rem + env(safe-area-inset-bottom)` to clear the nav itself; this token is the additional content breathing room"]

### Hardcoded 4rem Audit

Grep result for `pb-16`, `pb-[4rem`, `min-h-[4rem]` in `frontend/app/` and `frontend/components/`:

**Only hit:** `frontend/components/BottomNav.tsx:48` — `min-h-[4rem]` in the nav shell className.

The `app/layout.tsx:68` `pb-[calc(4rem+env(safe-area-inset-bottom))]` was found via direct file read (not grep pattern match, because the grep searched only app/ and components/ subdirectories; `layout.tsx` is in `app/` and is confirmed as the only other site). [VERIFIED: direct file reads of BottomNav.tsx and app/layout.tsx]

**Both sites to update:**
1. `BottomNav.tsx:48` — `min-h-[4rem]` → `min-h-[4.5rem]`
2. `app/layout.tsx:68` — `pb-[calc(4rem+env(safe-area-inset-bottom))]` → `pb-[calc(5rem+env(safe-area-inset-bottom))]`

No other call sites exist. [VERIFIED: grep across app/ and components/]

### Keyboard Inset on iOS

The iOS software keyboard pushes a `visualViewport` resize event but does NOT change `env(safe-area-inset-bottom)`. The nav uses `fixed bottom-0` positioning — it stays anchored at the visual bottom independent of keyboard state. This is pre-existing behavior and Phase 31 does not change it.

---

## Playwright Selector Audit

### Specs with Bottom-Nav References

[VERIFIED: grep across frontend/tests/e2e/]

| Spec file | Reference type | Phase 31 impact |
|-----------|---------------|----------------|
| `auth.skip-onboarding.spec.ts` | `getByRole('navigation', { name: 'Navigation principale' })` + `toBeInViewport()` | **No change needed** — uses aria-label, not tab count or label text. The taller nav still passes `toBeInViewport()`. |
| `invite-code-happy-path.spec.ts` | `getByRole('navigation', { name: 'Navigation principale' })` | **No change needed** — same robust selector. |
| `shortlist-vote.spec.ts` | Comment reference only (`// BottomNav or a sticky CTA covers…`) | **No change needed** — not a selector assertion. |
| `w1-gate.spec.ts` | Comment reference only (`// Scope to the PingPanel card so we don't accidentally count BottomNav <ul> children`) | **No change needed** — not a selector assertion. |
| `settings.spec.ts` | `page.goto('/settings')` — navigates to settings page, no nav label selector | **No change needed** — tests settings page content (invite code, member name), not nav chrome. |
| `settings-member-rename.spec.ts` | `page.goto('/settings')` — no nav label selector | **No change needed** — tests inline rename flow, not nav chrome. |

**Key finding: Zero test files contain `getByText("Réglages")` or any selector that matches the `nav.settings` label.** [VERIFIED: grep returned zero hits for `Réglages|Reglages` in `frontend/tests/`]

All nav-related specs use the stable `aria-label="Navigation principale"` selector, which is unchanged. No spec updates are required for the rename or CTA addition.

**Post-change verification recommended:** After implementing, run `grep -rn "Réglages\|Reglages\|settings.*tab" frontend/tests/` to confirm the audit holds.

---

## Common Pitfalls

### Pitfall 1: Active-State Collision on `/recipes/new`
**What goes wrong:** If `useSelectedLayoutSegment()` is kept for active matching, it returns `"recipes"` for both `/recipes` and `/recipes/new`. Both the Recettes tab (segment `"recipes"`) and the CTA (trying to match `/recipes/new`) would activate simultaneously, violating D-12.
**Why it happens:** `useSelectedLayoutSegment()` resolves to the FIRST dynamic segment, not the full path.
**How to avoid:** Use `usePathname()` exclusively for all 4 active predicates. Keep `useSelectedLayoutSegment()` ONLY for the onboarding hide check. [VERIFIED: navigation.d.ts confirms segment vs pathname semantics]
**Warning signs:** Two slots showing `aria-current="page"` simultaneously on `/recipes/new`.

### Pitfall 2: Padding-Bottom Drift
**What goes wrong:** Content on long pages clips behind the nav if `pb-[calc(4rem+…)]` is not updated.
**Why it happens:** Exactly two sites hardcode the 4rem nav height: `BottomNav.tsx:48` and `app/layout.tsx:68`. Missing either breaks layout.
**How to avoid:** Update BOTH sites atomically. The audit confirms exactly two sites — no others. [VERIFIED: grep]
**Warning signs:** Content at the bottom of a scrollable list is hidden behind the nav bar.

### Pitfall 3: Pill Wash Applied to CTA Branch
**What goes wrong:** The `bg-primary/8` pill wash renders on the CTA when active, creating a double-filled-circle effect (filled circle PLUS a pill wash behind it).
**Why it happens:** Copying the flat-tab active branch without respecting the variant split.
**How to avoid:** The `bg-primary/8` span must be inside the `variant === "tab"` branch only. The CTA's active state is additive ring on top of the always-filled circle.
**Warning signs:** A washed-out ring around the CTA circle instead of the intended clean filled-circle-plus-subtle-ring.

### Pitfall 4: `aria-current` on Both Branches
**What goes wrong:** `aria-current="page"` is set correctly on both variant branches independently — but the active predicate must ensure at most one `true` result across all 4 slots.
**Why it happens:** If the predicate logic has overlap (e.g., `/recipes/new` matches both the Recettes predicate and the CTA predicate), two slots get `aria-current="page"`.
**How to avoid:** The Recettes slot's predicate explicitly excludes `/recipes/new`: `pathname.startsWith("/recipes") && pathname !== "/recipes/new"`. Verify this exclusion is present.
**Warning signs:** Screen reader announces two "current page" landmarks.

### Pitfall 5: Onboarding Hide Using pathname Instead of Segment
**What goes wrong:** Replacing `segment?.startsWith("onboarding")` with `pathname.startsWith("/onboarding")` is a behavioral change that could have subtle routing differences.
**Why it happens:** Refactoring both hooks at once during the active-detection migration.
**How to avoid:** Deliberately keep the hide check on `useSelectedLayoutSegment()` per D-10. The segment-based check is already tested and validated.
**Warning signs:** Nav renders on onboarding screens, or nav disappears on routes it should show.

---

## Code Examples

### Complete Discriminated Union Pattern

```typescript
// Source: 31-UI-SPEC.md §Component Specification (verified against Next.js 16.2.4 + lucide-react 1.14.0)
"use client";

import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, BookOpen, Settings, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type FlatTab = {
  variant: "tab";
  href: string;
  pathname: string;
  matchExact: boolean;
  icon: LucideIcon;
  labelKey: "home" | "recipes" | "profile";
};

type CentralCTA = {
  variant: "central-cta";
  href: string;
  pathname: string;
  labelKey: "add";
};

type Tab = FlatTab | CentralCTA;

const TABS: ReadonlyArray<Tab> = [
  { variant: "tab", href: "/",              pathname: "/",            matchExact: true,  icon: Home,     labelKey: "home"    },
  { variant: "tab", href: "/recipes",       pathname: "/recipes",     matchExact: false, icon: BookOpen, labelKey: "recipes" },
  { variant: "central-cta", href: "/recipes/new", pathname: "/recipes/new",                             labelKey: "add"     },
  { variant: "tab", href: "/settings",      pathname: "/settings",    matchExact: false, icon: Settings, labelKey: "profile" },
] as const;
```

### Active Predicate (Mutually Exclusive)

```typescript
// Source: 31-UI-SPEC.md §usePathname() + useSelectedLayoutSegment() coexistence
const isActive = (tab: Tab): boolean => {
  if (tab.variant === "central-cta") return pathname === tab.pathname;
  if (tab.matchExact) return pathname === tab.pathname;
  // For prefix-match tabs, explicitly exclude /recipes/new from the recipes tab
  return pathname.startsWith(tab.pathname) && pathname !== "/recipes/new";
};
```

### CTA Circle Render Branch (UI-SPEC.md §central-cta render)

```tsx
// variant === "central-cta" branch — Source: 31-UI-SPEC.md
<Link
  key={href}
  href={href}
  aria-label={t("add")}
  aria-current={active ? "page" : undefined}
  className="relative flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors duration-fast ease-craft"
>
  <span
    aria-hidden
    className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground w-14 h-14 transition-all duration-fast ease-craft active:scale-95${active ? " ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`}
  >
    <Plus size={24} strokeWidth={2.5} aria-hidden />
  </span>
  <span className={active ? "text-primary" : "text-foreground-muted"}>
    {t("add")}
  </span>
</Link>
```

### fr.json Nav Namespace After Change

```json
"nav": {
  "home": "Accueil",
  "recipes": "Recettes",
  "profile": "Profil",
  "add": "Ajouter"
}
```

---

## Runtime State Inventory

Step 2.5: SKIPPED. Phase 31 is a UI restructure — no stored data, live service config, OS-registered state, secrets/env vars, or build artifacts reference the nav tab structure or the `nav.settings` i18n key by runtime value. The `nav.settings` → `nav.profile` rename is compile-time only (TypeScript + JSON bundle). None — verified by codebase grep.

---

## Environment Availability

Step 2.6: No external tool dependencies beyond the frontend build chain. All required packages (`next`, `lucide-react`, `next-intl`, `tailwindcss`) are already installed. No new CLI tools, databases, or services are required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| lucide-react `Plus` icon | CTA circle glyph | ✓ | 1.14.0 | — |
| `usePathname` from next/navigation | Active detection (D-09) | ✓ | Next.js 16.2.4 | — |
| `useSelectedLayoutSegment` | Hide gate (D-10) | ✓ | Next.js 16.2.4 | — |
| `useTranslations("nav")` from next-intl | Label rendering | ✓ | 4.11.0 | — |
| Tailwind v4 `ring-*`, `w-14 h-14`, `min-h-[4.5rem]` | CTA styling | ✓ | 4.2.4 | — |

**No missing dependencies.**

---

## Files to Change

Exactly 4 files. No backend changes. No new dependencies.

| File | Change | Scope |
|------|--------|-------|
| `frontend/components/BottomNav.tsx` | Full rewrite of `Tab` type + `TABS` const + render logic; add `usePathname` import; keep `useSelectedLayoutSegment` for hide gate; `min-h-[4rem]` → `min-h-[4.5rem]` | Primary change |
| `frontend/app/layout.tsx:68` | `pb-[calc(4rem+…)]` → `pb-[calc(5rem+…)]` — single token change | Adjacent change |
| `frontend/lib/i18n/fr.json` | Delete `nav.settings`; add `nav.profile = "Profil"`; add `nav.add = "Ajouter"` | i18n change |
| `frontend/tests/e2e/*.spec.ts` | Audit only — zero changes required (confirmed no `Réglages` selectors) | Verification pass |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | next-intl 4.11.0 provides TypeScript type inference from `useTranslations("nav")` so that `t("profile")` and `t("add")` are type-checked against fr.json keys | next-intl Key Mechanics | Low — even without inference, the runtime lookup works; only TypeScript type errors would surface at build time, which is immediately caught |

**All other claims were verified via direct tool calls in this session.** The assumptions log has one entry.

---

## Open Questions

1. **Nav content height: 72px (`min-h-[4.5rem]`) vs 80px (`min-h-[5rem]`)**
   - What we know: UI-SPEC.md locks 72px (56px circle + 4px top pad + 12px label). Claude's Discretion allows the planner to adjust to 80px.
   - What's unclear: Whether iPhone SE-class height (568px screen) needs the extra breathing room.
   - Recommendation: Use 72px (`min-h-[4.5rem]`) as locked in UI-SPEC.md. The `<main>` pb is already set to 5rem (80px) giving 8px of floor clearance.

2. **Accueil tab active check: `pathname === "/"` vs keeping `segment === null`**
   - What we know: CONTEXT.md recommends migrating all 4 slots to `usePathname()` for consistency.
   - What's unclear: Whether there are sub-routes under `/` that would break a strict `=== "/"` check.
   - Recommendation: Use `pathname === "/"` — the home route has no sub-routes in the current app; consistent mechanism is cleaner.

---

## Grep Gate Verification Commands

These grep commands must pass after implementation (success criteria from ROADMAP.md + CONTEXT.md D-14):

```bash
# 1. Variant discriminator is in use
grep -rn "variant.*tab\|variant.*central-cta" frontend/

# 2. No remaining 4rem nav-height references
grep -rn "pb-16\|pb-\[4rem\|min-h-\[4rem\]" frontend/app/ frontend/components/

# 3. nav.settings key is gone
grep -rn "nav\.settings\|\"settings\": \"Réglages\"" frontend/lib/

# 4. nav.profile and nav.add are present
grep -rn "nav\.profile\|nav\.add" frontend/lib/

# 5. No Réglages selectors in tests
grep -rn "Réglages\|Reglages\|settings.*tab" frontend/tests/
```

---

## Sources

### Primary (HIGH confidence — verified by direct file inspection)
- `frontend/components/BottomNav.tsx` — current implementation (3-tab shape, hook usage, icon imports)
- `frontend/app/layout.tsx` — `pb-[calc(4rem+env(safe-area-inset-bottom))]` at line 68 confirmed as the sole `4rem` nav-height reference outside the nav component itself
- `frontend/app/globals.css` — full token set; all Phase 31 utilities confirmed valid
- `frontend/lib/i18n/fr.json` — `nav` namespace confirmed; `nav.settings` is the only nav key requiring change
- `frontend/node_modules/next/dist/client/components/navigation.d.ts` — `usePathname()` and `useSelectedLayoutSegment()` both exported and typed; coexistence confirmed
- `frontend/node_modules/lucide-react/dist/esm/icons/plus.mjs` — `Plus` icon confirmed present in lucide-react 1.14.0
- `frontend/node_modules/tailwindcss/` — v4.2.4 confirmed; `min-h-[4.5rem]` arbitrary syntax confirmed valid; `min-h-18` is NOT in compiled output (arbitrary form required)
- `frontend/tests/e2e/*.spec.ts` — all specs audited; zero `Réglages` selectors; all nav selectors use stable `aria-label="Navigation principale"`

### Secondary (MEDIUM confidence — cross-referenced)
- `.planning/phases/31-bottom-nav-restructure/31-CONTEXT.md` — locked decisions D-01 through D-18
- `.planning/phases/31-bottom-nav-restructure/31-UI-SPEC.md` — visual + interaction contract, component specification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules
- Architecture: HIGH — hooks verified in navigation.d.ts; patterns verified in existing codebase
- Token/CSS: HIGH — globals.css read in full; utilities confirmed
- Pitfalls: HIGH — based on direct code analysis + CONTEXT.md cross-check
- E2E selector audit: HIGH — grep across all test files; zero hits for label-based nav selectors

**Research date:** 2026-05-18
**Valid until:** 2026-06-18 (stable domain — Next.js 16 + Tailwind v4 + lucide-react are locked in package.json)
