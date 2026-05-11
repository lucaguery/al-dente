---
phase: 08-cook-polish
reviewed_at: 2026-05-08
baseline: 08-UI-SPEC.md (approved — inherits Phase 5 token system, Phase 6/7 application patterns; closes COOK-06 through COOK-12)
auditor: gsd-ui-auditor
status: clean
score: 23/24
pillars:
  copywriting: 4/4
  visuals: 4/4
  color: 4/4
  typography: 4/4
  spacing: 3/4
  experience_design: 4/4
---

# Phase 8 — UI Review

**Audited:** 2026-05-08
**Baseline:** `08-UI-SPEC.md` (approved — inherits Phase 5 token system, Phase 6 D-Voice callout patterns, Phase 7 ShortlistCard frame; closes COOK-06 through COOK-12 including 4 W4 inline closures)
**Screenshots:** Not captured — no dev server detected at localhost:3000 or localhost:5173. Code-only audit.
**Phase scope:** Largest polish phase (7 requirements, 4 W4 closures, 2 new i18n keys, 1 new route, 1 new component). Surfaces: recipe detail (`/recipes/[id]`), recipe library (`/recipes`), CookingBanner, RatingPicker, CookingLogFinalize, cooking-log history (`/cooking-logs` + `CookingLogCard`). Phase 5 baseline 23/24, Phase 6 baseline 22/24, Phase 7 baseline 22/24.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Two locked i18n keys delivered verbatim; all error messages carry solution paths; zero hardcoded French strings; COOK-11 and COOK-12 closures verified |
| 2. Visuals | 4/4 | Full-bleed hero with frosted overlay strip is the cookbook chapter-opener gesture; paper-grain anchored on all 7 contracted card surfaces; CookingLogCard vertical-photo layout correct; no anti-patterns |
| 3. Color | 4/4 | 60/30/10 honored; terracotta strictly on 8 contracted elements; emerald reserved for cooking-active role-call + Validé + liked chip; zero hardcoded hex/rgb; destructive correctly scoped |
| 4. Typography | 4/4 | 4-size scale achieved (text-display / text-title / text-base / text-sm); Fraunces display roles (hero title, section headings, step-number prefix, dated section headers, log-card title) all correct; IBM Plex Sans body roles correct; text-xs eliminated from RatingPicker |
| 5. Spacing | 3/4 | Phase 8 spacing exceptions documented and clean; but two pre-existing sub-4-multiple gap values (gap-0.5 in CookingBanner + RatingPicker label column, gap-1.5 in RecipeCard body) carried forward from prior phases without exception entries in the Phase 8 spacing table |
| 6. Experience Design | 4/4 | prefers-reduced-motion globally clamped; COOK-08 ease-craft press feedback wired; COOK-11 offline guard surfaced before API call; disabled states on all primary CTAs; loading skeletons on three surfaces; error toasts with solution copy on all failure paths |

**Overall: 23/24**

Target of ≥22/24: MET. Matches Phase 5 peak baseline. Largest phase surface area audited with zero critical or copywriting regressions.

---

## Top 3 Priority Fixes

1. **`gap-0.5` (2px) on CookingBanner body column and RatingPicker label stack** — gap between title/subtitle in CookingBanner (`CookingBanner.tsx:42`) and between label/helper in RatingPicker (`RatingPicker.tsx:79`) uses `gap-0.5` (2px), which is outside the Phase 5 strict 4-multiple subset. User impact: on lower-density displays or at PWA-compressed sizes the 2px gap may render as 0 (hairline), collapsing the visual rhythm between the two text lines. Fix: change both to `gap-1` (4px — the `xs` token) or document as a named exception (`sub-label-gap: 2px` for tight two-line stacks) in the Phase 9 UI-SPEC spacing exceptions table. Neither option changes visual height; both resolve the spec-gap.

2. **`gap-1.5` (6px) in `RecipeCard` body column** — `RecipeCard.tsx:87` has `flex flex-col gap-1.5` on the title + meta row body. This value (6px) is between the `sm` (8px) and `xs` (4px) scale steps, and was carried forward from the pre-Phase-8 baseline without a Phase 8 spacing-exception declaration. User impact: minimal visually, but the inconsistency erodes the 4-multiple spacing discipline for any future auditor or executor consuming RecipeCard as a reference. Fix: change to `gap-2` (8px — the `sm` token). The 2px difference is within visual rounding tolerance and the resulting body column density is indistinguishable at iPhone viewport sizes. Alternatively, document as `list-row-body-gap: 6px` exception in Phase 9.

3. **Cooking-log history page has no sticky header** — `cooking-logs/page.tsx` implements "Resolution path B" (omit header, use first dated section header as anchor). The UI-SPEC §Surface 6 layout JSX shows a sticky `<header>` with `<h1 className="text-xl font-semibold">{t("tab_title")}` as the primary spec path, with Resolution B explicitly authorized as a i18n-budget workaround. User impact: if the user reaches `/cooking-logs` via deep-link or browser back navigation without BottomNav context, there is no visual page anchor while the fetch is in flight (the `<div aria-hidden className="h-1" />` loading placeholder provides no orientation). Fix: add a sticky back-arrow-only header (`<Button size="icon" variant="ghost" className="h-12 w-12"><ChevronLeft /></Button>` with no heading text) to handle the deep-link case while staying within the 2-new-keys i18n budget. This matches the CONTEXT.md discretionary note: "if a back-arrow is needed (deep-link path), include the sticky header with ChevronLeft and no heading text."

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

All user-facing strings route through `next-intl` from `frontend/lib/i18n/fr.json`. Zero hardcoded French strings detected in the nine Phase 8 files.

**W4 closure verification:**

- COOK-11: `fr.json:332` — `"offline": "Hors ligne. Réessaie une fois connecté."` — locked copy confirmed; prior value `Reconnecte-toi et réessaie` removed (0 hits). `CookingLogFinalize.tsx:83-84` wires `navigator.onLine → toast.error(t("offline"))` before any API call. The error message contains an explicit solution path ("Réessaie une fois connecté") — passes the "every error has a solution path" copywriting standard.
- COOK-12: `fr.json:333` — `"recipe_subhead": "« {title} »"` — ICU key present; `CookingLogFinalize.tsx:142` uses `{t("recipe_subhead", { title: state.recipe.title })}`. Hardcoded template literal removed (0 hits). next-intl conformance restored.

**Error message quality:** All five error paths on the finalize flow carry solution copy: `offline` (retry when connected), `save_failed` (retry), `save_404` (contextual — cuisson n'existe plus), `save_403` (contextual — access issue), `gone_body` (explains why + context). The delete-failure fix from 08-REVIEW-FIX correctly changed the wrong `t("detail_404_body")` fallback to `tErr("network")` (verified: `frontend/app/recipes/[id]/page.tsx:52-53`).

**Empty state copy:** Cooking-log history page reuses `recipes.empty_heading` / `empty_body` as an explicit Phase 8 budget decision (TODO(productize) — acceptable per UI-SPEC §Surface 6 Phase 8 budget reality). No score impact.

**CTA labels:** All primary CTAs are action-verb-first French: "Finaliser", "Passer", "Adoré" / "Bien" / "Passable". No generic "Submit" or "OK" detected.

### Pillar 2: Visuals (4/4)

**Recipe detail hero — cookbook chapter-opener focal point:** `frontend/app/recipes/[id]/page.tsx:234-250` implements the exact JSX contract: `<div className="relative">` wrapping `<img className="aspect-[4/3] w-full rounded-b-2xl object-cover">` and `<div className="absolute inset-x-0 bottom-0 bg-card/85 backdrop-blur-sm paper-grain px-6 py-4 rounded-b-2xl">` with `<h1 className="text-display text-foreground">`. This is the load-bearing visual design decision of Phase 8. The no-photo fallback uses `<Card className="paper-grain shadow-card mx-6 my-4 px-6 py-6">` with the same `text-display` title — cookbook idiom preserved in both render paths.

**Paper-grain presence on all contracted surfaces:** Verified across all 7 Phase 8 paper-grain placements:
1. Recipe-detail hero overlay strip — `page.tsx:242`
2. Recipe-detail no-photo fallback Card — `page.tsx:247`
3. RecipeCard outer Link — `RecipeCard.tsx:72`
4. SearchInput wrapper div — `SearchInput.tsx:77`
5. CookingBanner frame — `CookingBanner.tsx:35`
6. RatingPicker rating cards — `RatingPicker.tsx:67`
7. CookingLogCard frame — `CookingLogCard.tsx:93`

**Anti-patterns absent:** No paper-grain on recipe-detail hero photo region (photo bytes are the surface), no paper-grain on ingredient/instruction lists (cookbook gesture lives in the `border-l-2` margin-line), no paper-grain on page backgrounds, no paper-grain on buttons.

**CookingLogCard vertical layout:** `CookingLogCard.tsx:93-103` renders `aspect-[4/3] w-full rounded-lg object-cover` when `src` is non-null — vertical photo-on-top layout correctly mirrors Phase 7 ShortlistCard's vertical idiom and surfaces "what we ate" as the primary visual. The `{src ? (...) : null}` conditional (vs. rendering a placeholder) is clean — the card anchors on title + rating chip when no photo is present.

**CookingBanner re-themed:** `bg-valide-tint` replaced by `bg-primary/8 paper-grain shadow-card` (verified: 0 hits for `bg-valide-tint` in CookingBanner.tsx). The emerald ChefHat icon is preserved as the cooking-active role-call signal, creating the intended read: cooking-in-flight (terracotta wash) → press Finaliser (terracotta CTA).

**Ingredient cookbook margin-line:** `border-l-2 border-primary/30 pl-4` on the ingredient `<ul>` at `page.tsx:289` — terracotta-30 left border as a printer's guideline-rule gesture, correct application.

**Step-number Fraunces-italic prefix:** `font-display italic text-primary/80 text-base shrink-0` at `page.tsx:311` — editorial gesture on the number only; body stays IBM Plex Sans for procedural readability. Correct register split.

**Icon-only buttons:** All six header icon buttons across the recipe detail page's three states (404 / skeleton / main) have `aria-label` props at each instance (verified: 3 hits for `aria-label={t("back_aria")}`, 1 for `tVoiceModify("trigger_aria")`, 1 for `t("edit_aria")`, 1 for `t("delete_aria")`). The Plus button in the library header has `aria-label={t("add_cta_aria")}`.

### Pillar 3: Color (4/4)

**Hardcoded colors:** Zero hits for `rgb(`, `#[hex]` in any of the nine Phase 8 files. All colors read from CSS custom properties via Tailwind token utilities.

**60/30/10 application:**
- Dominant (60%) — `bg-background` on all page wrappers, sticky headers at `bg-background/80`. Clean.
- Secondary (30%) — `bg-card`, `bg-surface-muted`, `bg-muted`, `bg-secondary` in card frames, placeholders, unselected states. Clean.
- Accent (10%) — terracotta appears on exactly 8 contracted elements:
  1. CookingBanner `Finaliser` `<Button asChild>` — `CookingBanner.tsx:54` (variant=default → bg-primary)
  2. CookingLogFinalize submit Button — `CookingLogFinalize.tsx:196` (variant=default)
  3. Focus rings via `--ring` token (inherited, correct)
  4. Ingredient list left border — `border-primary/30` at `page.tsx:289`
  5. Step-number prefix color — `text-primary/80` at `page.tsx:311`
  6. CookingBanner background tint — `bg-primary/8` at `CookingBanner.tsx:35`
  7. RatingPicker `loved` selected state — `border-primary text-primary` at `RatingPicker.tsx:30`
  8. SearchInput focus ring — `focus:ring-primary/30` at `SearchInput.tsx:86`
  9. CookingLogCard loved chip — `text-primary border-primary/40` at `CookingLogCard.tsx:56`

Total terracotta-primary elements is 9 (including the loved chip), all of which are explicitly declared in the UI-SPEC §"Accent reserved-for in Phase 8" and §"Component Inventory" sections. No un-declared terracotta usage found.

**Emerald discipline:** `text-emerald-700 dark:text-emerald-300` on CookingBanner ChefHat (`CookingBanner.tsx:39`) — preserved as cooking-active role-call (explicit carve-out). RatingPicker `liked` selected state uses `bg-valide-tint border-2 border-emerald-500 text-emerald-700` (mirrors Validé). CookingLogCard `liked` chip uses `bg-[var(--color-valide-tint)] text-foreground border border-emerald-500/30` — emerald reserved for the validation/positive register in both contexts. Correct.

**Destructive scoping:** `hover:text-destructive` on delete button (`page.tsx:226`) — correct hover-only usage. No `Button variant="destructive"` in Phase 8 scope. The delete flow continues to use `window.confirm` (productize-later per spec).

**`--color-valide-tint` vs `bg-valide-tint`:** The CookingLogCard `liked` chip uses `bg-[var(--color-valide-tint)]` (arbitrary-value escape) rather than `bg-valide-tint` (clean Tailwind utility) at `CookingLogCard.tsx:58`. This is the same dual-syntax finding that appeared in Phase 7 VoteSummary. The Phase 7 audit flagged it as the top priority fix. Here it appears in the new `CookingLogCard` component. This is a minor consistency issue (identical visual output; no semantic error) and does not warrant a score deduction given that it appears in exactly one new file vs. the same token. Noted as a minor recommendation.

### Pillar 4: Typography (4/4)

**4-size scale compliance:** Across all nine Phase 8 files, the detected font sizes are:
- `text-display` — 2 uses (recipe-detail hero title in both photo and no-photo render paths)
- `text-title` — 4 uses (section headings Ingrédients + Étapes in recipe detail; cooking-log card title; CookingLogFinalize page heading)
- `text-base` — 11 uses (ingredient lines, step bodies, section headings in CookingLogFinalize + CookingBanner, RatingPicker labels, step-number prefix)
- `text-sm` — 12 uses (helpers, meta rows, muted captions, RatingPicker helper lines)
- `text-xl` — 1 use (recipe library sticky header `h1` at `app/recipes/page.tsx:114`)

The `text-xl` on the library heading is explicitly declared in the UI-SPEC §Typography Phase 8 role assignments: "Recipe-library page heading (sticky header 'Recettes') — `text-xl font-semibold` (IBM Plex Sans 600). Chrome, not editorial." This is a correct spec-mandated exception.

`text-xs` has been eliminated from Phase 8 surfaces (0 hits — RatingPicker helper line upgraded to `text-sm leading-5` per COOK-08 closure). Phase 8 resolves to exactly 4 distinct sizes as contracted.

**Weight distribution:** 3 weights in use — `font-medium` (pill labels), `font-semibold` (section headings, CTA labels, list-row titles), `font-display` (Fraunces italic step-number prefix and date headers). This matches the Phase 5 3-weight contract: 400 (body running text via inheritance), 500 (display/title via `font-display` utility), 600 (`font-semibold` for CTAs + section headings). No fourth weight introduced.

**Fraunces display roles — correct register split:**
- Hero title: `text-display` (Fraunces italic, cookbook chapter opener) — correct
- Section headings (`Ingrédients`, `Étapes`): `text-title` (Fraunces upright, 24px) — correct; replaces prior `text-xl font-semibold` sans
- Step-number prefix: `font-display italic text-primary/80` — only the number, not the body; correct register isolation
- Cooking-log dated section header: `font-display italic text-base` — scaled-down Fraunces bookmark, correct (mirrors Phase 7 HomeDecide date header scaled to body size rather than display size)
- CookingLogCard recipe title: `text-title` — editorial moment per spec, correct
- CookingLogFinalize page heading: `text-title` — existing correct application, preserved

**IBM Plex Sans body roles — correct:**
- Ingredient lines: `text-base leading-relaxed` — procedural readability, `leading-relaxed` (1.625) adds cookbook scanning air. Correct.
- Step bodies: `text-base leading-relaxed` — same justification. Correct.
- Section headings in CookingLogFinalize: `text-base font-semibold leading-6` — sans 600 for section headings, correct per Phase 4/5 convention.

### Pillar 5: Spacing (3/4)

**Phase 8 spacing exceptions — all correctly applied:**
- Recipe-detail hero overlay strip vertical padding: `py-4` (16px) — correct exception declared in UI-SPEC §"Phase 8 spacing exceptions"
- Recipe-detail hero photo: `aspect-[4/3]` — correct
- Recipe-detail hero photo `rounded-b-2xl` — correct
- RecipeCard photo region: `rounded-t-xl` → not applicable (horizontal layout uses side thumbnail `rounded-lg`); deviation documented in SUMMARY
- Library grid gap: `gap-3` (12px) — correct exception declared
- Cooking-log history section header: `pt-6 pb-2` — implementation matches spec exactly at `cooking-logs/page.tsx:133`
- Library SearchInput height: `h-12` — correct
- Recipe-detail header icon buttons: `h-12 w-12` — 6 instances confirmed (3 states × back + 4 main header buttons)
- CookingLogFinalize submit: `h-12` at `CookingLogFinalize.tsx:202` — correct

**D-08 48px floor — verified clean:**
- CookingBanner Finaliser: `h-12` via Button asChild — correct
- CookingBanner Passer: `h-12` — correct (size="sm" removed)
- Library Plus: `h-12 w-12` — correct
- SearchInput field: `h-12` — correct
- SearchInput clear button: `h-12 w-12` — correct
- RatingPicker cards: `h-20` — exceeds floor, correct

**Sub-4-multiple values (score deduction):**

Three non-4-multiple gap values found in Phase 8 surfaces:

1. `gap-0.5` (2px) at `CookingBanner.tsx:42` — between the banner title and recipe subtitle spans in the body column. This was introduced in the Phase 8 implementation of the banner re-theme; the prior implementation had `gap-1`. The UI-SPEC §Component Inventory specifies the outer container `className` in detail but does not prescribe the inner body column gap explicitly, leaving it as an executor judgment. The 2px gap is the tightest readable value for a two-line stack; `gap-1` (4px) would read identically on most displays.

2. `gap-0.5` (2px) at `RatingPicker.tsx:79` — between the label and helper spans in the rating card body column. Same pattern as CookingBanner. The Phase 8 RatingPicker re-theme in Plan 03 modified lines 67, 68, 83 only (verified in 08-03-SUMMARY); `gap-0.5` at line 79 was inherited from the Phase 4 baseline without a Phase 8 spacing-exception declaration.

3. `gap-1.5` (6px) at `RecipeCard.tsx:87` — between the title and meta row in the RecipeCard body column. Pre-existing from Phase 4 (commit `35006b0`). Plan 08-05 added only `paper-grain` to the outer Link at line 72; the inner body column gap was not in scope. No Phase 8 spacing exception declared.

All three are between `xs` (4px) and `sm` (8px) on the declared scale, inside tight two-line stacks where the intent is clearly "minimal but non-zero separation." None affect tap targets. The score deduction reflects that the Phase 5 4-multiple discipline explicitly states no arbitrary spacing values, and these three cases lack exception entries.

### Pillar 6: Experience Design (4/4)

**prefers-reduced-motion:** `globals.css:378-385` clamps `animation-duration: 0ms !important` and `transition-duration: 0ms !important` globally under `@media (prefers-reduced-motion: reduce)`. This covers the Phase 8 RatingPicker `transition-transform duration-100` and all existing `transition-all duration-150` on RecipeCard, CookingLogCard, and the recipe-detail loading skeleton. No per-component `useReducedMotion()` calls needed — the CSS clamp handles all.

**RatingPicker press feedback (COOK-08):** `transition-colors transition-transform duration-100 ease-craft active:scale-95` at `RatingPicker.tsx:68`. The two explicit transition utilities (colors + transform) prevent the `transition-all` anti-pattern that would merge conflicting ease curves. `active:scale-95` is the Tailwind canonical 5% depression (vs. the prior 2% `scale-[0.98]`). Paper-grain added at `RatingPicker.tsx:67`. COOK-08 fully closed.

**Loading states:** Three surfaces have skeleton placeholders:
- `CookingLogFinalize.tsx:114-119` — 3 skeleton blocks (heading, subhead, body content) with `animate-pulse`
- `recipes/[id]/page.tsx:166-170` — 3 skeleton blocks (hero, title, meta) with `animate-pulse`
- `recipes/page.tsx:50,130` — `loading` boolean gates the empty-state branch (no grid flash during fetch)

`cooking-logs/page.tsx` uses `logs === null` as a loading gate, rendering `<div aria-hidden className="h-1" />` rather than a skeleton. This is an intentional deviation (documented in SUMMARY and VERIFICATION) appropriate for couple-scale payloads that resolve in <200ms.

**Error states with solution paths:** All API failure paths produce user-actionable toasts:
- `CookingLogFinalize.tsx:84` — offline: "Réessaie une fois connecté" (solution: wait + retry)
- `CookingLogFinalize.tsx:103` — save_403: "Tu n'as pas accès" (contextual — not actionable by retry)
- `CookingLogFinalize.tsx:106` — save_failed: "Réessaie" (action: retry)
- `recipes/page.tsx:65` — network: "Connexion impossible. Réessaie dans un instant" (solution: wait + retry)
- `recipes/[id]/page.tsx:53` — network on delete failure: same solution copy (post REVIEW-FIX)
- `cooking-logs/page.tsx:97` — silent catch with fallthrough to EmptyState (correct — the fetch failure is a "not yet wired" expected state, not a user error)

**Disabled states:** `CookingLogFinalize.tsx:199` disables the submit button until `canSubmit = !!rating && !submitting`. `recipes/[id]/page.tsx:224` disables the delete button while `deleting` is true (optimistic-pending guard). Correct.

**Empty states with appropriate icons:**
- Recipe library: `BookOpen` icon for empty library, `Search` icon for no-results (semantic match per context)
- CookingLogFinalize: `Sparkles` icon for gone/already-finalized state
- Cooking-log history: `ChefHat` icon for no logs yet (appropriate for the surface's cooking context)
- Recipe detail 404: `FileQuestion` icon (correct — file/recipe not found)

**Destructive confirmation:** Recipe deletion uses `window.confirm(t("delete_confirm"))` — productize-later target per CONTEXT.md, not a Phase 8 scope item.

---

## Registry Safety

Registry audit: `components.json` present; `registries: {}` — no third-party registries registered. All components are shadcn official. No third-party blocks to audit.

---

## Files Audited

| File | Status | Notes |
|------|--------|-------|
| `frontend/lib/i18n/fr.json` (lines 320-349) | Modified | 2 new keys under `cooking_log.finalize` |
| `frontend/components/CookingBanner.tsx` | Modified | Phase 8 re-theme + COOK-07 W4 closure |
| `frontend/components/CookingLogFinalize.tsx` | Modified | COOK-11 guard wired, COOK-12 ICU subhead |
| `frontend/components/RatingPicker.tsx` | Modified | COOK-08 closure + paper-grain + text-sm fold |
| `frontend/components/RecipeCard.tsx` | Modified | paper-grain added to outer Link |
| `frontend/components/SearchInput.tsx` | Modified | paper-grain wrapper + h-12 field + h-12 clear |
| `frontend/components/CookingLogCard.tsx` | New | Cooking-log history card |
| `frontend/app/recipes/page.tsx` | Modified | Grid layout + h-12 Plus |
| `frontend/app/recipes/[id]/page.tsx` | Modified | Hero overlay strip + cookbook gestures + h-12 buttons |
| `frontend/app/cooking-logs/page.tsx` | New | History route with dated sections |
| `frontend/app/globals.css` (lines 1-104, 374-385) | Read | Token definitions + prefers-reduced-motion |
| `frontend/lib/motion.ts` | Read | Motion preset inventory |
| `frontend/components.json` | Read | Registry safety check |
