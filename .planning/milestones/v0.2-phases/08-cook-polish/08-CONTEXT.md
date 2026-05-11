# Phase 8: Cook polish - Context

**Gathered:** 2026-05-08
**Status:** Ready for UI-SPEC + planning
**Mode:** Smart discuss (autonomous) — 2 grey areas, all defaults accepted

<domain>
## Phase Boundary

Re-theme the cook-time loop into the Slow Food artisanal design system established in Phase 5 + extended in Phases 6 and 7, while folding in 4 W4 UI-REVIEW gaps (COOK-07/08/11/12). Surfaces in scope:

- **Recipe detail** screen at `/recipes/[id]` (hero + ingredients + instructions + metadata)
- **Recipe library / list** screen at `/recipes` (cards grid, search, filtering, sort)
- **Recipe edit** at `/recipes/[id]/edit` (consumes `RecipeForm` re-themed in Phase 6)
- **CookingBanner** (in-progress cook indicator)
- **CookingLogFinalize** + **RatingPicker** (cook-time finalize flow)
- **Cooking-log history** view ("what we ate this week")
- **W4 inline closures**:
  - COOK-07: CookingBanner `Finaliser` raw `<a>` → `<Button asChild>` + h-12 floor on both buttons
  - COOK-08: RatingPicker instant press snap → `transition-transform duration-100 ease-craft active:scale-95`
  - COOK-11: `navigator.onLine` guard in finalize submit handler + new `cooking_log.finalize.offline` i18n key
  - COOK-12: hardcoded `« ${title} »` template literal → `cooking_log.finalize.recipe_subhead` ICU key

This phase consumes Phase 5 outputs + Phase 6 patterns (paper-grain Card, Fraunces italic callout, terracotta-60 left border) + Phase 7 patterns (Fraunces date-style header, `paper-grain` ShortlistCard frame). It does NOT change cooking-log lifecycle, cook-time API, finalize backend, or the realtime spine — only their visual rendering.

**Out of scope:**
- Capture surfaces (Phase 6, complete)
- Decide flow (Phase 7, complete)
- Onboarding / settings / BottomNav / PWA identity (Phase 9)
- Recipe-detail behavioral changes (cook-start wiring locked in v0.1)
- Adding mid-cook timer / step-by-step UI (cut from v0.1 per PROJECT.md, V2)
- Recipe deletion confirm-dialog rework (out of polish scope)

</domain>

<decisions>
## Implementation Decisions

### Recipe Detail Screen (COOK-06)

- **Hero treatment**: full-bleed photo (`aspect-[4/3] rounded-b-2xl object-cover`); Fraunces display title (`text-display`) overlaid on a `bg-card/85 backdrop-blur-sm paper-grain` strip pinned to the bottom of the hero — cookbook chapter-opener gesture. If no photo, fall back to a paper-grain Card with the title styled the same way (no hero photo placeholder).
- **Section spacing**: `gap-6` (24px) between hero / metadata / ingredients / instructions / footer.
- **Metadata pills** (cuisine / mood / season / protein / time): inherit Phase 5 Badge primitive; row with `flex-wrap gap-2 px-6`. No new shapes.

### Ingredient List

- **Container**: `border-l-2 border-primary/30 pl-4` on the `<ul>` (terracotta margin-line as cookbook gesture).
- **Each line**: `gap-2 py-1` flex row with quantity + unit + name in IBM Plex Sans `text-base leading-relaxed`. The line-rule on the left is decorative — does NOT change semantic structure.
- **Section heading**: `Ingrédients` in `text-title` (Fraunces 24).

### Instruction Body

- **Body type**: IBM Plex Sans `text-base leading-relaxed` for procedural readability — NOT Fraunces (which is reserved for editorial / display register).
- **Step numbering**: numbers rendered in **Fraunces italic** at `text-base` (only the number prefix, not the body) — establishes the editorial gesture without overwhelming legibility.
- **List structure**: numbered `<ol>` with `gap-3 py-1` per step; each step has `flex gap-3` with the number prefix as a `<span className="font-display italic text-primary/80">` and the body as a sibling `<span>`.
- **Section heading**: `Préparation` in `text-title`.

### Recipe Library / List (COOK-09)

- **Card**: identical `RecipeCard` shape as ShortlistCard's Phase 7 frame (paper-grain + warm shadow + `rounded-xl` + `rounded-t-2xl` photo). Reuse rather than fork.
- **Grid**: `grid grid-cols-2 gap-3 px-6` on mobile (390pt baseline), `md:grid-cols-3 lg:grid-cols-4` on desktop. PWA primary target is mobile.
- **Search input** (`SearchInput.tsx`): paper-grain Card surface; terracotta-30 focus ring (`focus:ring-2 focus:ring-primary/30`); preserves debounce + state machine.
- **Sort/filter chips**: inherit Phase 5 Badge / Tabs primitives — no new components.
- **Empty state**: reuse `EmptyState` Phase 6 retheme (paper-grain Card + Fraunces italic body); copy via existing `recipes.list.empty.*` keys.

### Cooking-Log History (COOK-10)

- **Layout**: list of dated cards ("What we ate this week"). Each card: paper-grain Card + recipe title (Fraunces `text-title`) + cooked-on date (IBM Plex `text-sm text-muted-foreground`) + rating chips (use the same `chipClass` helper from Phase 7 if appropriate, else inline).
- **Date grouping**: section headers in Fraunces italic (`font-display italic text-base`) — same gesture as the HomeDecide date header from Phase 7.
- **Reuse**: `RecipeCard` shape may be adapted with a `mode="cooking-log"` prop variant, OR a separate `CookingLogCard` component — judgment call by the executor based on prop overhead.

### CookingBanner (COOK-07 W4 closure)

- **Surface**: paper-grain Card with terracotta-tint background (`bg-primary/8` — subtle, NOT the full terracotta saturation reserved for primary CTAs).
- **`Finaliser` action**: convert from `<a className="...">` to `<Button asChild className="h-12 w-full"><Link href="...">Finaliser</Link></Button>` (closes the W4 raw-anchor issue).
- **`Passer` action**: ghost Button variant at `h-12 w-full` (or `h-12` if side-by-side with Finaliser).
- **Layout**: stack on mobile (Finaliser first, Passer below), or side-by-side `flex gap-3` with `Finaliser` taking 2/3 width — judgment call based on banner height budget. Both buttons MUST clear h-12.
- **Realtime**: existing dispatch event flow preserved.

### RatingPicker (COOK-08 W4 closure)

- **Press feedback**: add `transition-transform duration-100 ease-craft active:scale-95` to each rating card. Replaces the instant snap with a 100ms paper-physics press (matches Phase 5 motion vocabulary — `--ease-craft` curve, `--duration-fast` (150ms) is the close cousin but 100ms reads more "press" than "transition").
- **Color treatment**: selected state gets terracotta border (`border-primary`) and `bg-primary/8`; unselected stays neutral. Validates that the card cluster is the focal point on the finalize screen.
- **No structural change**: `<RatingButton>` props unchanged; click handlers preserved.

### CookingLogFinalize (COOK-11 + COOK-12 + general retheme)

- **COOK-11 offline guard**:
  - **New i18n key**: add `cooking_log.finalize.offline` with value `"Hors ligne. Réessaie une fois connecté."` to `frontend/lib/i18n/fr.json` (the ONLY new key in v0.2 polish so far).
  - **Submit handler**: at the very top of the submit function (before the API call), add `if (!navigator.onLine) { toast.error(t('offline')); return; }`. Prevents the generic `save_failed` from masking offline state.
- **COOK-12 ICU subhead**:
  - **New i18n key**: add `cooking_log.finalize.recipe_subhead` with ICU value `"« {title} »"` to `frontend/lib/i18n/fr.json` (second new key).
  - **Replace template literal**: change `` `« ${title} »` `` to `t('recipe_subhead', { title })`. Restores next-intl conformance.
- **Visual retheme**: photo uploader + textarea + RatingPicker get Phase 5 token treatment; submit Button confirms `h-12`.

### Claude's Discretion
- Exact backdrop-blur intensity on the recipe-detail hero overlay strip (8 / 16 / 24 — try 8 first; iPhone GPU has been gentle on `backdrop-blur` since iOS 17).
- Whether `RecipeCard` is reused via prop variants for cooking-log history vs forked into `CookingLogCard` — pick whichever is shorter to maintain.
- Whether the recipe-detail metadata pill row sits above or below the title overlay strip — try below (default).
- Whether to add a subtle Fraunces small-caps `Ingrédients` / `Préparation` section heading vs plain Fraunces — try plain first; small-caps is a Phase 5 token (`text-display` doesn't have a small-caps variant) but Fraunces does support OpenType `smcp` — defer if iOS Safari doesn't render cleanly.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (post-Phase-5/6/7)
- `frontend/components/ui/card.tsx` — paper-grain Card primitive
- `frontend/lib/motion.ts` — Phase 5 + Phase 7 motion presets (`fadeIn`, `slideUp`, `pressFeedback`, `swipe`, `springSnap`)
- `frontend/components/ui/button.tsx` — Button primitive with `asChild` (Radix Slot) for the COOK-07 conversion
- `frontend/components/RecipeCard.tsx` (104 LOC) — already exists as a list card; Phase 8 retheme target
- `frontend/components/CookingBanner.tsx` (73 LOC) — target for COOK-07
- `frontend/components/CookingLogFinalize.tsx` (209 LOC) — target for COOK-08, COOK-11, COOK-12 + general retheme
- `frontend/components/RatingPicker.tsx` (92 LOC) — target for COOK-08
- `frontend/components/SearchInput.tsx` — target for retheme
- `frontend/components/EmptyState.tsx` — Phase 6 re-themed; reuse for empty library
- Phase 7 patterns to mirror: ShortlistCard frame (paper-grain + rounded-t-2xl photo), Fraunces italic display copy

### Established Patterns
- Recipe detail at `/recipes/[id]/page.tsx` (318 LOC) — server-component shell + client interactive sections
- Recipe library at `/recipes/page.tsx` (152 LOC) — client list with search + grid
- Cooking log finalize at `/cooking-logs/[id]/finalize/page.tsx` (16 LOC) — thin wrapper around `CookingLogFinalize` component
- i18n: `useTranslations("cooking_log.finalize")` pattern

### Integration Points
- `frontend/app/recipes/[id]/page.tsx` — recipe detail (318 LOC; full retheme)
- `frontend/app/recipes/page.tsx` — recipe library (152 LOC; grid + search retheme)
- `frontend/components/RecipeCard.tsx` (104 LOC; align with ShortlistCard frame)
- `frontend/components/CookingBanner.tsx` (73 LOC; COOK-07 + retheme)
- `frontend/components/CookingLogFinalize.tsx` (209 LOC; COOK-08 + COOK-11 + COOK-12 + retheme)
- `frontend/components/RatingPicker.tsx` (92 LOC; COOK-08 transition-transform)
- `frontend/components/SearchInput.tsx` (retheme)
- `frontend/lib/i18n/fr.json` — add 2 new keys (`cooking_log.finalize.offline`, `cooking_log.finalize.recipe_subhead`)
- Possibly: new `frontend/components/CookingLogCard.tsx` for history view (or RecipeCard variant) — judgment call

### Constraints from Prior Phases / Project
- Phase 5 token names locked
- Phase 6/7 patterns established (paper-grain Card + Fraunces italic + terracotta-60 left border for callouts)
- French only via `next-intl` — TWO new keys allowed in this phase (the only ones in v0.2 polish, and they are explicit deliverables)
- iOS Safari 17+ PWA standalone is the rendering target (verify backdrop-blur on the hero overlay)
- Solo dev, ~1 weekend budget
- D-08 floor 48px on interactive controls
- v0.1 token names must NOT break

</code_context>

<specifics>
## Specific Ideas

- **Recipe-detail hero overlay strip example** (mobile baseline 390pt):
  ```tsx
  <div className="relative">
    <img className="aspect-[4/3] w-full rounded-b-2xl object-cover" />
    <div className="absolute inset-x-0 bottom-0 bg-card/85 backdrop-blur-sm paper-grain px-6 py-4 rounded-b-2xl">
      <h1 className="text-display">{recipe.title}</h1>
    </div>
  </div>
  ```
- **Ingredient list cookbook gesture**:
  ```tsx
  <ul className="border-l-2 border-primary/30 pl-4 flex flex-col gap-2 py-1">
    {ingredients.map(i => <li className="text-base leading-relaxed">{i.qty} {i.unit} {i.name}</li>)}
  </ul>
  ```
- **Step numbering**:
  ```tsx
  <ol className="flex flex-col gap-3 py-1">
    {steps.map((s, i) => (
      <li className="flex gap-3">
        <span className="font-display italic text-primary/80 text-base shrink-0">{i + 1}.</span>
        <span className="text-base leading-relaxed">{s}</span>
      </li>
    ))}
  </ol>
  ```
- **CookingBanner Finaliser**:
  ```tsx
  <Button asChild className="h-12 w-full">
    <Link href={`/cooking-logs/${id}/finalize`}>{t('finalize')}</Link>
  </Button>
  ```
- **RatingPicker press**:
  ```tsx
  <button className="transition-transform duration-100 ease-craft active:scale-95 ...">
  ```
- **CookingLogFinalize offline guard**:
  ```tsx
  async function handleSubmit() {
    if (!navigator.onLine) {
      toast.error(t('offline'));
      return;
    }
    // ... existing API call
  }
  ```
- **CookingLogFinalize ICU subhead**:
  ```tsx
  const subhead = t('recipe_subhead', { title: recipe.title });
  ```

</specifics>

<deferred>
## Deferred Ideas

- Mid-cook timer / step-by-step cooking UI (cut from v0.1; V2)
- Avatar / per-member illustrations (cut; V2)
- Replacing browser `navigator.onLine` with service-worker offline detection (productize-later; current API check is sufficient at couple-scale)
- Adding a global online/offline status banner (out of scope)
- Recipe deletion confirm-dialog redesign (uses `window.confirm`; productize-later)
- Cookbook small-caps OpenType usage (deferred until verified on iOS Safari at PWA-compressed sizes)
- `RecipeCard` typography pass for cuisine/mood Badge labels (Phase 7 IN-04 — deferred to broader i18n sweep, not Phase 8)

</deferred>
