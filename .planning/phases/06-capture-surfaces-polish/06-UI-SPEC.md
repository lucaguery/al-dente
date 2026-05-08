---
phase: 6
slug: capture-surfaces-polish
status: draft
shadcn_initialized: true
preset: radix-nova (inherited; baseColor neutral, iconLibrary lucide, cssVariables true, registries {})
created: 2026-05-08
inherits_from: 05-UI-SPEC.md
---

# Phase 6 — UI Design Contract

> Polish phase. **Inherits** the entire Phase 5 token system, typography pairing, paper-grain anchor, warm shadow stack, motion language, and re-themed shadcn primitives. This UI-SPEC does NOT re-litigate any of those decisions — it specifies how the 5 capture surfaces, the drafts inbox, the PhotoUploader sheet, and the D-Voice deviation callout consume those tokens, and closes the Phase 5 deferrals (`font-heading` → `font-display` sweep + `transitions` import on `/styleguide`).
>
> **Audience reminder:** Two iPhones, "just us" couple, French only via next-intl. Mobile-first at 390pt iPhone 14 baseline, iOS Safari 17+ PWA standalone is the rendering target. The four design principles (Design Quality, Originality, Craft, Functionality) carry forward unchanged.
>
> **Prescriptive, not exploratory.** A competent executor implements Phase 6 from this contract without further design questions.

---

## Canonical References

| Reference | Why it matters here |
|-----------|---------------------|
| `.planning/phases/05-design-system-foundation/05-UI-SPEC.md` | **Source of truth for all visual tokens.** Phase 6 inherits §Spacing, §Typography, §Color, §Shadows, §Paper-Grain, §Motion, §Component Inventory verbatim. Any apparent conflict between this document and 05-UI-SPEC resolves in favor of 05-UI-SPEC. |
| `.planning/phases/06-capture-surfaces-polish/06-CONTEXT.md` | LOCKED user decisions: status-pill choice, AnimatePresence cross-fade scope, no opacity reduction on draft, no persistent "Nouveau" badge, D-Voice callout treatment, PhotoUploader X-overlay hit-pad approach, quick-add native picker retained. |
| `.planning/notes/v0.2-design-direction.md` | Slow Food artisanal direction; anti-patterns committed (no purple gradients, no cool grays, no trattoria, no twee handmade overload, no Geist-only or Geist+Inter). |
| `.planning/phases/04-polish-w4/04-UI-REVIEW.md` | W4 baseline 20/24. **CAPTURE-11** (PhotoUploader sheet buttons `h-11`→`h-12`) is the gap closed in this phase. Other W4 gaps belong to Phases 7/8. |
| `.planning/REQUIREMENTS.md` (CAPTURE-08..13) | The 6 acceptance items this phase must close. Mapped 1:1 to §Acceptance Criteria below. |
| `frontend/app/globals.css` | Phase 5 tokens already migrated. Deprecation aliases `--font-heading` and `--font-sans` (lines 13–15) **must be removed** in this phase after the sweep completes. |
| `frontend/lib/motion.ts` | Phase 6 imports `variants.fadeIn`, `variants.slideUp`, `transitions.normal` from this module. **Do not author new presets.** |
| `frontend/AGENTS.md` | **Next.js 16.2.4 has training-data drift.** Consult `frontend/node_modules/next/dist/docs/` before writing frontend code. |
| `frontend/lib/i18n/fr.json` | French only via next-intl. **No new keys** added by Phase 6 — every string in scope already exists (verified: `recipes.draft_badge`, `recipes.voice.*`, `recipes.photo.*`, `recipes.url.*`, `recipes.promotion.*`, `recipes.new.*`, `photo_uploader.*`, `inbox.*`). |

---

## Design System (inherited from Phase 5 — restated)

| Property | Value | Source |
|----------|-------|--------|
| Tool | **shadcn/ui** | `frontend/components.json` |
| Preset | **radix-nova** with `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide`, `registries: {}` | unchanged from Phase 5 |
| Component library | shadcn/ui primitives (Radix UI under the hood); 15 primitives in `components/ui/*` already re-themed in Phase 5 | inherited |
| Icon library | **lucide-react** | inherited |
| Font (display) | **Fraunces** (variable, opsz + wght + ital axes) — `var(--font-display)` | Phase 5 §Typography |
| Font (body) | **IBM Plex Sans** (300/400/500/600 + italic 400) — `var(--font-body)` | Phase 5 §Typography |
| Font (mono) | **Geist Mono** — `var(--font-mono)` | inherited (used only by URL input `font-mono` class) |
| CSS architecture | Tailwind v4 `@theme inline` block in `app/globals.css` | inherited |
| i18n | All strings via `next-intl` from `frontend/lib/i18n/fr.json` | **No new keys in Phase 6** |
| Animation library | framer-motion 12.x via `frontend/lib/motion.ts` presets | inherited |
| Texture asset | `frontend/public/textures/paper-grain.svg` | inherited (Phase 5 Plan 02) |
| Tap target floor | **48px** (D-08, raised from 44px) | Phase 4 D-08 + Phase 5 §Spacing |

---

## Spacing Scale

**Inherited from Phase 5 §Spacing unchanged.** Strict 4-multiple subset.

| Token | Value | Usage in Phase 6 |
|-------|-------|------------------|
| xs | 4px | Icon gaps in inline status rows |
| sm | 8px | Compact element spacing inside draft-card chrome (`gap-2`) |
| md | 16px | Default form-field gap (`gap-4`); section padding `p-4` on draft cards |
| lg | 24px | Capture-tab content padding `px-6 pt-6`; section gap `gap-6` |
| xl | 32px | Layout gaps between major form sections in `RecipeForm` |
| 2xl | 48px | **Tap target floor** (D-08); `h-12` on every primary submit + sheet action |
| 3xl | 64px | Bottom-pinned submit bar safe-area contribution |

### Phase 6 spacing exceptions

| Exception | Value | Reason |
|---|---|---|
| Filled photo-tile X overlay (visible chrome) | 28px (`h-7 w-7`) | Visual restraint — visible "X" stays small to read as overlay-on-photo, not button-on-photo. |
| Filled photo-tile X overlay (hit pad) | **48px square** via `before:absolute before:-inset-2.5` (or equivalent invisible expansion) | D-08 / WCAG 2.5.5 minimum tap target. Implementation: `::before` pseudo-element with `inset: -10px` extends the hit area to 28+10+10=48px. The visible chrome is unchanged. |
| Photo-tile body | 96×96 (`h-24 w-24`) | Inherited from Phase 4 PhotoUploader; parent tile already exceeds 48px so the X-overlay's small visible chrome is safe per Phase 4 spec exception clause. |
| Quick-add bottom-fixed submit bar | `pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3` | Inherited iOS safe-area pattern; preserved verbatim. |

**No other exceptions in Phase 6.** Every other touch target — quick-add submit, full-form submit, voice send/restart, photo capture, URL submit, sheet action buttons (`Caméra`, `Photothèque`), draft-card delete/retry — uses `h-12` (48px).

---

## Typography (inherited)

**Inherited from Phase 5 §Typography unchanged.** Fraunces + IBM Plex Sans pairing locked. All four utility classes (`text-display`, `text-title`, `text-body`, `text-caption`) carry forward.

### Phase 6 role assignments (capture surfaces)

| Element | Class / family | Reason |
|---|---|---|
| 5-tab strip labels (`Rapide`, `Complète`, `Voix`, `Photo`, `URL`) | IBM Plex Sans, `font-medium` (500) | **Sans for interactive UI**. Serif is reserved for editorial content per Phase 5 role split. Tab labels are interactive chrome. |
| Sticky header brand title (`Nouvelle recette`) | `text-base font-semibold` (IBM Plex Sans 600) | Header chrome — sans, not display serif. |
| Inbox header title (`À compléter`) | `text-xl font-semibold leading-7` (IBM Plex Sans 600) | Same idiom as v0.1; inbox is a list, not editorial. |
| Empty-state heading (drafts inbox empty) | `text-title` (Fraunces 24/1.2 weight 500, opsz=36, normal) | **Editorial moment** — "Tout est à jour" reads as the cookbook reassuring the user; serif treatment is the signature. |
| Empty-state body | `text-base text-foreground-muted` (IBM Plex Sans 400) | Body sans, muted ink. |
| D-Voice callout headline | `font-display italic` (Fraunces italic, weight 500, opsz=96 inherited from `.text-display`) — but at body size: `text-base italic` with `font-family: var(--font-display)` applied via inline style or a class | **Cookbook margin-note voice.** The callout is a single-line aside; serif italic at body size is the editorial register that says "this is meta-instruction, not running text." |
| Draft-card title | `text-base font-semibold leading-6` (IBM Plex Sans 600) | Inherited from existing `RecipeDraftCard.tsx`; section-heading idiom. Family inherits from `body { font-family: var(--font-body) }`. |
| Draft-card status pill (`Brouillon`, `Échec`) | Badge default (IBM Plex Sans, weight 500) | Inherited from Phase 5 Badge primitive. |
| Draft-card processing label (`Extraction en cours…`) | `text-sm font-medium text-foreground-muted` (IBM Plex Sans 500) | Live-status idiom; muted to avoid competing with the title. |
| Quick-add `title_label`, voice/URL form labels | Label primitive (IBM Plex Sans 500) | Inherited Phase 5 Label re-theme. |
| URL input value | `font-mono text-sm` (Geist Mono) | URLs are code-like; mono is the convention. Preserved unchanged. |

**Type scale used in Phase 6:** 4 sizes (`text-display` 32–44, `text-title` 24, `text-base` 16, `text-sm` 14, `text-caption` 13). Within the 3–4 ceiling — `text-sm` is a Tailwind-native convenience for helper rows, counted against the ceiling as the 4th rendered size.

**Weights used in Phase 6:** 400 (body), 500 (display italic + title + UI labels), 600 (CTAs, draft titles, headers). Inherited from Phase 5.

---

## Color (inherited)

**Inherited from Phase 5 §Color unchanged.** Terracotta primary on warm cream. All OKLCH values verbatim.

### Phase 6 60/30/10 application on capture surfaces

| Slot | % | Where it appears in Phase 6 |
|---|---|---|
| Dominant (60%) | `--background` (cream) | Page background under all 5 tabs, drafts inbox page bg, sticky-header bg at 80% alpha (`bg-background/80 backdrop-blur-sm`). |
| Secondary (30%) | `--card`, `--secondary`, `--muted`, `--popover` (warm cream / warm taupe family) | RecipeForm section card surfaces, draft-card row container, quick-add photo-picker wrapper card, D-Voice callout card body, PhotoUploader sheet content surface, inactive tab triggers, secondary `Caméra`/`Photothèque` action buttons. |
| Accent (10%) | `--primary` (terracotta `oklch(0.595 0.135 35)`) and faint wash `--surface-rose-100` | **Reserved-for list below — no other usage.** |

### Accent reserved-for in Phase 6 (LOCKED)

The terracotta accent appears in Phase 6 ONLY on:

1. **Primary CTAs** — every `Button variant="default"` with `h-12`:
   - Quick-add submit (`Ajouter` / saving / uploading_photo states)
   - Full-form submit (`Enregistrer la recette`)
   - Voice tab `Envoyer`
   - Photo tab `Capturer la recette`
   - URL tab `Ajouter à la boîte de réception`
2. **Active tab indicator** on the 5-tab strip (re-themed Phase 5 `Tabs` primitive uses `--primary` for the active state).
3. **Focus rings** — `--ring` (keyboard focus visibility) on inputs, textareas, buttons, sheet triggers, draft-card delete/retry buttons.
4. **`Plus`-tile dashed border** in `PhotoUploader` and `PhotoCaptureTab` empty add-slot — `border-2 border-dashed border-primary/30` (terracotta at 30% alpha) — replaces the previous `border-border` neutral. Reads as "blank recipe card waiting for content."
5. **D-Voice callout left border accent** — 3px terracotta strip on the leading edge of the helper card (`border-l-[3px] border-primary/60`). Subtle but unmistakable that this card is the affordance.
6. **Realtime arrival highlight** (recipe.created slide-in entrance only) — the entrance animation (`slideUp` variant from Phase 5 motion presets) IS the visual signal; no terracotta pulse, no persistent badge.

### Anti-patterns explicit for Phase 6

| Anti-pattern | Why excluded |
|---|---|
| Terracotta as `Brouillon` badge background | Would compete with the `recipe.promoted` cross-fade signal. **Keep `secondary` Badge variant** (warm taupe). |
| Terracotta on `Échec` badge | `destructive` variant only. The destructive token is intentionally quieted (warm-family red `oklch(0.55 0.20 25)`) so `Échec` reads as warning-in-the-family rather than emergency-vehicle red. |
| Terracotta on draft-card hover | Inherited row uses `hover:bg-surface-muted` (warm taupe) — preserved. Hover on a row is structural, not destination-CTA. |
| Terracotta on processing-row spinner | Spinner stays `text-foreground-muted` so processing reads as "in flight, neutral" rather than calling for attention. |
| Cool grays anywhere | Phase 5 anti-pattern; warm-gray family only. |
| Opacity reduction on `draft` rows | Per CONTEXT.md decision: drafts are first-class until promoted. No `opacity-60` shorthand for "less important." |

### Destructive — reserved for in Phase 6

`--destructive` only on:
- `Badge variant="destructive"` for the `Échec` (failed) draft state
- Toast `variant="destructive"` for actual capture errors (`tErr("network")`, `t("error_size_total")`, `t("invalid")` flows)
- The confirmation `window.confirm(t("delete_confirm"))` text rendering (browser-native; no styling control, but copy is destructive register)

No `Button variant="destructive"` in Phase 6 — the delete-draft button stays `variant="ghost"` with `hover:text-destructive` for restraint.

---

## Shadows (inherited)

**Inherited from Phase 5 §Shadows unchanged.** Two-layer warm-brown paper-on-wood shadows. Token names (`shadow-card`, `shadow-card-hover`, `shadow-nav`) work as before.

### Phase 6 shadow application

| Surface | Shadow class |
|---|---|
| Draft-card row container | None (rows use `border border-border` for separation, not elevation). Preserves Phase 4 idiom. |
| Quick-add photo-picker wrapper Card | `shadow-card` (subtle paper-on-wood lift). |
| RecipeForm section cards (full-form tab) | `shadow-card` if rendered as Card primitive (existing structural choice in `RecipeForm.tsx` — preserved). |
| D-Voice callout card | `shadow-card` (the callout IS a card). |
| PhotoUploader sheet content (the sheet itself) | `shadow-card-hover` — inherited from Phase 5 `sheet.tsx` re-theme. |
| Empty-state Card (drafts inbox) | `shadow-card`. |
| Bottom-fixed submit bar (quick-add) | `border-t border-border` only — no shadow (it's chrome, not card). |
| Sticky header | `border-b border-border` only — no shadow. |

---

## Paper-Grain Texture (inherited application contract)

**Inherited from Phase 5 §Paper-Grain.** The `.paper-grain` utility class is already wired in Phase 5 on `Card`, `DialogContent`, `SheetContent`, `AlertDialogContent`, `SelectContent`. Phase 6 only **extends usage** to draft cards, the D-Voice callout card, the empty-state card, the `Plus` add-tile background, and the quick-add photo-picker wrapper card.

### Phase 6 paper-grain placement

| Element | Apply `paper-grain`? |
|---|---|
| `RecipeDraftCard` row container | **Yes** — drafts are recipe cards on a kitchen counter; grain reinforces the metaphor on the inbox surface. |
| D-Voice callout card | **Yes** — the callout reads as a margin-note pasted onto the surface; grain anchors it. |
| Empty-state card (drafts inbox empty) | **Yes** — visible card surface; consistent treatment. |
| `Plus` add-tile (PhotoUploader + PhotoCaptureTab) | **Yes** — the dashed-border tile reads as a blank recipe card waiting for content; grain reinforces "this is paper, fill it." Apply the utility on the button surface itself; the dashed border lives on top. |
| Quick-add photo-picker wrapper Card | **Yes** — wrapper card around the native `<input type="file">`. Grain brings the row visually in line with the rest of the form. |
| RecipeForm section cards (`Complète` tab) | **Yes** — already inherited from Phase 5 Card re-theme; no per-surface override needed. |
| PhotoUploader sheet content (the sheet panel itself) | **Yes** — already inherited from Phase 5 `SheetContent` re-theme; no per-surface override needed. |
| Filled photo-tile (`h-24 w-24` with image) | **No** — photo bytes ARE the surface; grain on top of food photography is dust, not paper. |
| Locked-empty photo-tile (`aria-hidden`) | **No** — invisible spacer; no surface to texture. |
| 5-tab strip / TabsList | **No** — chrome, not card (Phase 5 anti-pattern). |
| Sticky header | **No** — chrome. |
| Page body backgrounds (under any tab) | **No** — full-page background; Phase 5 anti-pattern. |
| Buttons (any variant), Inputs, Textareas, Badges | **No** — Phase 5 anti-pattern. |
| Bottom-fixed submit bar | **No** — chrome. |
| Toasts (Sonner) | **No** — too small to read; Phase 5 design-direction exclusion. |

**Implementation hint for executor:** add `paper-grain` to the existing className strings; do NOT introduce wrapper components. For the `Plus` tile: the existing `<button>` already takes the dashed border + flex-center; add `paper-grain` to its className. Ordering of utility classes does not matter; the `::before` pseudo and `border-radius: inherit` behavior is provided by the utility class itself.

---

## Motion (inherited)

**Inherited from Phase 5 §Motion unchanged.** One curve (`--ease-craft`), two durations (`--duration-fast` 150ms, `--duration-normal` 280ms). Framer Motion presets in `frontend/lib/motion.ts` (`variants`, `transitions`, `easeCraft`, `durations`).

### Phase 6 motion contract

| Surface / interaction | Animation |
|---|---|
| Tab switch (TabsContent enter/exit) | Inherited from Phase 5 Tabs primitive (tw-animate-css preset under the hood). No per-surface override. |
| Sheet open/close (PhotoUploader, PhotoCaptureTab `Plus`) | Inherited from Phase 5 Sheet primitive — `duration-normal` slide. No override. |
| Toast appear/dismiss | Inherited from Phase 5 Sonner. |
| Submit button press feedback | Inherited from Phase 5 Button primitive — `transition-colors duration-fast ease-craft` + `active:translate-y-px`. |
| Draft-card row hover | `transition-colors` only on `hover:bg-surface-muted`. No translate, no scale (hover on a list row is informational, not committed). |
| **`recipe.created` arrival** (drafts inbox new row) | Wrap the `drafts.map(...)` list in `<AnimatePresence initial={false}>`. Each `RecipeDraftCard` becomes a `<motion.div>` with `variants={variants.slideUp}` + `initial="hidden" animate="visible" exit={{ opacity: 0, transition: transitions.fast }}`. **Use `key={recipe.id}`.** Result: new card slides in from `y: 12` to `y: 0` over `duration-normal` with `easeCraft`. **No persistent "Nouveau" badge — the entrance IS the signal.** |
| **`recipe.promoted` transition** (badge cross-fade on existing row) | Wrap the badge node (and only the badge node — not the surrounding flex row) inside `<AnimatePresence mode="wait">`. The `Brouillon` Badge becomes a `<motion.span>` with `key="brouillon"`, the absence of badge becomes `<motion.span key="structured" />` (empty placeholder). Both use `variants.fadeIn` over `duration-normal`. **Card stays mounted; only the badge node cross-fades.** No sparkle, no skeleton, no whole-card remount. |
| **`recipe.promoted` exit from inbox** | The drafts list filter (status !== 'draft' → drop) drives the row's removal. `AnimatePresence` `exit` runs at `transitions.fast` opacity-only (no slide). |
| Reduced-motion | `@media (prefers-reduced-motion: reduce)` in `globals.css:365-372` clamps all CSS animations to 0ms. For Framer Motion, the `AnimatePresence` consumers in Phase 6 do NOT need `useReducedMotion()` because the CSS clamp covers transition-duration; framer-motion respects the user's `prefers-reduced-motion` automatically through the `MotionConfig` default. **No per-component `useReducedMotion()` calls in Phase 6.** |

### Animation cadence discipline

Phase 6 introduces only TWO motion additions:
1. `slideUp` on `recipe.created` entrance.
2. `fadeIn` on `Brouillon` badge cross-fade during `recipe.promoted`.

**No stacked effects.** No simultaneous slide + scale + color transition. No staggered children. No layout animations. The cadence is "one motion at a time, deliberate, paper-physical." Subtle over decorative is the rule.

### Discretionary choice — where the cross-fade scope lands

Per CONTEXT.md "Claude's Discretion": the `recipe.promoted` cross-fade animates **only the Badge element**, not the surrounding flex row. Reason: animating the wider flex row causes a horizontal jitter on iPhone when the badge dimensions change (badge text "Brouillon" 8 chars vs nothing); animating only the Badge element with `mode="wait"` keeps the row stable and the cross-fade legible.

---

## Component Inventory (deltas from Phase 5)

Phase 6 introduces **zero new shadcn primitives**. The 15 primitives in `components/ui/*` are already re-themed (Phase 5 Plan 05). Phase 6 modifies application-level components only.

### Application components touched in Phase 6

| File | Change shape |
|------|--------------|
| `frontend/app/recipes/new/page.tsx` (245 LOC) | Bump quick-add submit button from `h-11 w-full` (line 204) to `h-12 w-full`. Wrap quick-add photo-picker row (lines 187–201) inside a `<Card className="paper-grain shadow-card">` (cosmetic restyle of native `<input type="file">` row). Verify sticky header Phase 5 token usage; no structural rework. **No new tabs, no `?tab=` deep-link** (deferred). |
| `frontend/components/RecipeForm.tsx` (408 LOC) | Per-section spacing review: confirm `gap-4` form-field gap, `gap-6` section gap, `px-6` page padding. No structural rework. Submit button (`Enregistrer la recette`) confirmed at `h-12`. Inputs/Textarea inherit Phase 5 primitive re-themes. |
| `frontend/components/VoiceCaptureTab.tsx` (104 LOC) | **Add D-Voice persistent callout card** above the Textarea. Card uses `paper-grain shadow-card border-l-[3px] border-primary/60` and renders the existing `recipes.voice.idle_helper` (or a single-line replacement of the existing helper paragraph) via `font-display italic text-base` family override on the headline span. Textarea + button row stays as-is. Bump `Envoyer` to `h-12` if not already. |
| `frontend/components/PhotoCaptureTab.tsx` (236 LOC) | Bump sheet `Caméra` and `Photothèque` buttons from `h-11` (lines 170, 178) to `h-12`. Bump bottom submit button from `h-11 w-full` (line 221) to `h-12 w-full`. Apply `paper-grain` to the `Plus` add-tile button surface; change dashed border from `border-border` to `border-primary/30` (lines 158). Filled-tile X-overlay hit-pad fix (see PhotoUploader entry). |
| `frontend/components/UrlCaptureTab.tsx` (105 LOC) | Bump submit button from `h-11 w-full` (line 90) to `h-12 w-full`. URL input keeps `font-mono text-sm`. Helper info row stays `bg-muted/60` (warm-taupe wash). No structural rework. |
| `frontend/components/PhotoUploader.tsx` (282 LOC) | **Bump sheet buttons to `h-12`** (lines 230, 238 — change `h-11` → `h-12`). **Closes CAPTURE-11 W4 gap.** Filled-tile X-overlay (line 199): keep visible chrome at `h-7 w-7` (28px) — bump from current `h-6 w-6` for visual consistency — and add invisible 48px hit pad via `before:absolute before:-inset-2.5 before:content-['']` (or the equivalent Tailwind v4 idiom) so `28+10+10=48px` square hit area. Apply `paper-grain` to the `Plus` add-tile (line 218); change dashed border from `border-border` to `border-primary/30`. |
| `frontend/components/RecipeDraftCard.tsx` (151 LOC) | **Wrap the Badge node** in `<AnimatePresence mode="wait">` so `recipe.promoted` cross-fades the badge over `duration-normal`. **Add `paper-grain` to the `containerClass`** (line 78). Bump delete button from `h-8 w-8` (line 127) to `h-12 w-12` to honor the D-08 floor. Bump retry button from `h-8` (line 110) to `h-12`. The 16×16 thumbnail placeholder (`h-16 w-16 bg-surface-muted`, line 84) stays — it's chrome, not interactive. |
| `frontend/app/inbox/page.tsx` (134 LOC) | **Wrap the `drafts.map(...)` list inside `<AnimatePresence initial={false}>`** so `recipe.created` arrivals slide in via `variants.slideUp`. Promote each row to `<motion.div key={r.id} variants={variants.slideUp} initial="hidden" animate="visible" exit={{ opacity: 0, transition: transitions.fast }}>`. Pass `recipe` through to the underlying `RecipeDraftCard`. Sticky-header Phase 5 token usage already correct; no rework. |
| `frontend/components/EmptyState.tsx` (32 LOC) | **Re-theme to paper-grain Card with display-serif headline.** Wrap content in `<Card className="paper-grain shadow-card">` (or apply `paper-grain` directly to the existing `<div>` if changing structure introduces churn). Heading: change from `text-xl font-semibold leading-7` to `text-title` (Fraunces 24px, weight 500, opsz=36). Body: keep `text-base text-foreground-muted`. CTA Button (when present): primary terracotta `h-12`. Used by drafts inbox + future Phase 7+ surfaces — single source of truth. |

### Phase 5 deferral closure (Phase 6 sweeps)

| File | Change |
|------|--------|
| `frontend/components/ui/alert-dialog.tsx` line 126 | Replace `font-heading` with `font-display`. |
| `frontend/components/ui/card.tsx` line 41 | Replace `font-heading` with `font-display`. |
| `frontend/components/ui/dialog.tsx` line 133 | Replace `font-heading` with `font-display`. |
| `frontend/components/ui/sheet.tsx` line 117 | Replace `font-heading` with `font-display`. |
| `frontend/app/globals.css` lines 13–15 | **Remove the deprecation aliases** `--font-heading` and `--font-sans` from `@theme inline`. After the four primitive sweeps + the global grep below, these tokens are unreferenced. |
| Repo-wide grep | `grep -rn "font-heading\|font-sans " frontend/app frontend/components` must return **zero hits** (excluding the deletion in `globals.css` itself). Replace any found references with `font-display` or `font-body` respectively. |
| `frontend/app/styleguide/page.tsx` line 14 | Add `transitions` to the import: `import { variants, transitions } from "@/lib/motion";` so motion demos can reference `transitions.fast` / `transitions.normal` directly if needed. **Cosmetic (Phase 5 deferral); Phase 6 closes it.** |

### D-Voice callout — implementation choice

Per CONTEXT.md "Claude's Discretion": **inline the callout markup in `VoiceCaptureTab.tsx`** rather than factoring it into a shared `VoiceDeviationCallout.tsx` component. Reason: the callout is voice-tab-specific and the only consumer in v0.2 is this tab. If a second consumer emerges in v2 (e.g. voice-modify sheet decides to surface a similar callout), the extraction is a low-cost refactor at that point. Premature extraction introduces an indirection without reuse benefit.

### `Plus`-tile dashed-border alpha — terracotta tint choice

Per CONTEXT.md "Claude's Discretion": use `border-primary/30` (terracotta at 30% alpha). Reason: at full alpha terracotta competes with primary CTAs (the only other terracotta surface in view); 30% reads as faint terracotta wash that says "this is a card slot" without claiming destination-CTA hierarchy. The `border-l-[3px] border-primary/60` on the D-Voice callout uses a higher alpha because it's a thinner edge (3px hairline) that needs more saturation to register at iOS-Safari subpixel density.

### X-overlay hit-pad implementation — pseudo vs sibling element

Per CONTEXT.md "Claude's Discretion": use a **`::before` pseudo-element** with `inset: -10px`. Reason: pseudo-elements don't enter the React tree, don't need a key, don't take pointer events away from the button itself (the click target IS the button — the pseudo just expands its bounding box for hit-testing via `pointer-events: auto` on the pseudo). Tailwind v4 supports `before:absolute before:-inset-2.5` ordered-utility shorthand. Sibling absolute element would require a separate React node, an `onClick` re-route, and pointer-event forwarding — strictly more complex with no rendering benefit.

---

## Surface-by-Surface Pinning

The exact visual contract per surface. Executors implement these top-down.

### Surface 1 — Sticky header (shared across all 5 tabs)

**Location:** `frontend/app/recipes/new/page.tsx:139-152`

**Layout:**
- `<header>` with `sticky top-0 z-10 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border`
- Left slot: `<Button size="icon" variant="ghost" asChild>` wrapping `<Link href="/recipes">` with a `ChevronLeft h-5 w-5`. `aria-label={tCommon("back")}` (existing key: "Retour").
- Center slot: `<span className="text-base font-semibold">{t("tab_title")}</span>` — "Nouvelle recette".
- Right slot: `<span className="w-10" aria-hidden />` — visual balance for the back button.

**Phase 6 changes:** none structural. Token consumption already matches Phase 5 (background alpha, border, blur). Verify ghost button has `h-12 w-12` outer footprint in dev tools (the `size="icon"` shadcn variant resolves to `size-8` per `button.tsx:29`; **upgrade to `h-12 w-12 size-12` if sub-48 — see acceptance check below**).

### Surface 2 — 5-tab strip

**Location:** `frontend/app/recipes/new/page.tsx:153-169`

**Layout:**
- `<TabsList className="mx-6 mt-4 w-auto overflow-x-auto scrollbar-none flex">` — horizontal scroll on narrow viewports (5 tabs ≥ iPhone SE 375px width is tight but fits).
- 5 `<TabsTrigger value="..." className="flex-1 min-w-[64px]">{label}</TabsTrigger>` entries.
- Active state: terracotta indicator (Phase 5 Tabs primitive re-theme).
- Inactive state: muted foreground text + transparent background.

**Phase 6 changes:** none. Inherited Phase 5 tab re-theme handles indicator color, transition timing, font-medium weight. Confirm `font-medium` resolves to IBM Plex Sans 500.

### Surface 3 — Quick-add tab (`Rapide`)

**Location:** `frontend/app/recipes/new/page.tsx:170-223`

**Layout (top-down):**
1. **Title field block** (`flex flex-col gap-1.5`):
   - `<Label htmlFor="quick-title">{t("title_label")}</Label>` — "Titre"
   - `<Input id="quick-title" maxLength={200} required autoFocus placeholder={t("title_placeholder")} />` — "Carbonara express"
2. **Photo picker block** — **NEW: wrap in `<Card className="paper-grain shadow-card p-4">`**:
   - Inside the Card: `<Label htmlFor="quick-photo">{tPhoto("add_label")}</Label>` — "Ajouter une photo"
   - Native `<input type="file" id="quick-photo" accept="image/*" />` with the existing terracotta-secondary `file:*` styling. Verify the existing class `file:bg-secondary file:text-secondary-foreground` resolves to warm-taupe under Phase 5 tokens.
   - When `quickPhoto != null`: `<p className="text-xs text-muted-foreground mt-1">{quickPhoto.name}</p>`
3. **Bottom-fixed submit bar:**
   - `<div className="fixed bottom-16 inset-x-0 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 bg-background/80 backdrop-blur-sm border-t border-border z-30">`
   - `<Button className="h-12 w-full" disabled={!quickTitle.trim() || quickStage !== null} onClick={submitQuick}>` — **changed from `h-11` to `h-12`**.
   - Three-state copy: `t("submit_quick")` ("Ajouter") / `tCommon("saving")` ("Enregistrement…") / `t("uploading_photo")` ("Envoi de la photo…") with `<Loader2 className="animate-spin h-4 w-4 mr-2" />` prefix on the latter two.

**Architectural lock:** Pre-save photo picker remains a native `<input type="file">` (PhotoUploader needs a recipe id; quick-add saves first, photos second per `submitQuick` lines 67–116). The Card wrapper is the visual cohesion fix; the architectural two-stage pipeline is preserved.

### Surface 4 — Full-form tab (`Complète`)

**Location:** `frontend/app/recipes/new/page.tsx:224-233` → delegates to `frontend/components/RecipeForm.tsx`

**Phase 6 contract:**
- Section spacing: `flex flex-col gap-6` between sections; `flex flex-col gap-1.5` for label+input pairs; `gap-4` between fields inside a section.
- Cards: each form section is wrapped in a `<Card className="paper-grain">` (existing structural choice — confirm Phase 5 paper-grain inherited automatically).
- Inputs / Textarea: Phase 5 primitive re-themes consumed automatically.
- Submit button: `h-12 w-full` in the form footer (existing — verify).
- Photo section uses the post-save PhotoUploader (recipeId becomes available after first save).

### Surface 5 — Voice tab (`Voix`)

**Location:** `frontend/components/VoiceCaptureTab.tsx`

**Layout (top-down) — REVISED for Phase 6:**
1. **D-Voice persistent callout (NEW)** — replaces / restyles the existing `<p className="text-sm text-muted-foreground">{t("idle_helper")}</p>`:
   - Container: `<Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-1.5">`
   - Headline span: `<span className="font-display italic text-base text-foreground">` — **the load-bearing UX copy**: "Tu peux dicter avec le micro du clavier."
     - Source the copy from a NEW or EXISTING i18n key. **Use existing `recipes.voice.idle_helper`** (`"Dicte ta recette en français. On la met en forme automatiquement."`) — but the CONTEXT.md "load-bearing UX" string is the keyboard-mic deviation copy, which currently lives in `cooking_log.notes.helper_keyboard_mic` (per W4 UI-REVIEW finding 1). For voice-tab consistency, **reuse `recipes.voice.idle_helper`** as the headline and keep the existing copy. The keyboard-mic affordance is implicit in the headline + the keyboard-emoji `🎤` already in `transcript_placeholder`. **No new key added; no copy change.**
   - Optional caption beneath headline: omit. The single-line headline IS the callout.
2. **Textarea block:**
   - `<Textarea aria-label={t("transcript_aria")} placeholder={t("transcript_placeholder")} className="min-h-32 max-h-64" autoFocus disabled={submitting} />`
   - The placeholder (`Dictez via le clavier 🎤 ou tapez votre recette…`) provides the second affordance reminder.
3. **Action row (`flex items-center justify-between gap-3`):**
   - Left: `<Button variant="ghost" onClick={handleRestart} disabled={!canRestart} className="h-12">` — "Recommencer"
   - Right: `<Button variant="default" onClick={handleSend} disabled={!canSend} className="h-12">` — "Envoyer" with `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` prefix while submitting (`tCommon("sending")` "Envoi…").

**D-Voice deviation locked invariants:**
- No `webkitSpeechRecognition` import.
- No browser-speech listener.
- No mic Button rendered in this component.
- No audio recording API.
- The callout copy + the keyboard-emoji placeholder ARE the affordance.

### Surface 6 — Photo tab (`Photo`)

**Location:** `frontend/components/PhotoCaptureTab.tsx`

**Layout (top-down):**
1. **Heading block** (`flex flex-col gap-1.5`):
   - `<h2 className="text-xl font-semibold">{t("empty_heading")}</h2>` — "Photographie la recette"
   - `<p className="text-sm text-muted-foreground">{t("empty_body")}</p>` — "Ajoute jusqu'à 4 photos. Gemini extrait le titre, les ingrédients et les étapes."
2. **2×2 photo grid** (`grid grid-cols-2 gap-3`):
   - Filled tiles: `<div className="relative h-24 w-24 rounded-lg overflow-hidden">` with `<img className="h-full w-full object-cover" />` and the X-overlay button (28px visible chrome, 48px hit pad — see PhotoUploader §X-overlay).
   - Add tile (Sheet trigger): `<button className="paper-grain h-24 w-24 rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center disabled:opacity-50">` — **paper-grain added; dashed border changed from `border-border` to `border-primary/30`**.
   - Locked-empty tiles: `<div aria-hidden className="h-24 w-24" />` — preserved.
3. **Sheet content** (when `+` tapped):
   - `<SheetTitle>{tUploader("sheet_title")}</SheetTitle>` — "Ajouter une photo"
   - `<Button variant="secondary" className="h-12">` × 2 — `Caméra` (with `<Camera />`) + `Photothèque` (with `<ImageIcon />`). **Bumped from `h-11` to `h-12`.**
   - Hidden file inputs: `capture="environment"` for camera, no capture for library.
4. **Bottom submit button:** `<Button className="h-12 w-full" disabled={files.length === 0 || submitting}>` — **bumped from `h-11` to `h-12`** — "Capturer la recette" / `tCommon("sending")` ("Envoi…").

### Surface 7 — URL tab (`URL`)

**Location:** `frontend/components/UrlCaptureTab.tsx`

**Layout (top-down):**
1. **URL input block** (`flex flex-col gap-1.5`):
   - `<Label htmlFor="url-input">{t("field_label")}</Label>` — "URL de la recette"
   - `<Input id="url-input" type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" className="font-mono text-sm" placeholder={t("field_placeholder")} />` — "https://…"
   - Inline error (when `showInlineError`): `<p className="text-sm text-destructive mt-1">{t("invalid")}</p>`
2. **Helper card:** `<div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground"><Info size={16} className="mt-0.5 shrink-0" aria-hidden /><p>{t("helper")}</p></div>`. Phase 5 tokens (`bg-muted/60`, `text-muted-foreground`) already render as warm-taupe wash + faded ink.
3. **Submit button:** `<Button className="h-12 w-full" disabled={!isValid || submitting}>` — **bumped from `h-11` to `h-12`** — "Ajouter à la boîte de réception" / `tCommon("sending")`.

### Surface 8 — Drafts inbox (`/inbox`)

**Location:** `frontend/app/inbox/page.tsx` + `frontend/components/RecipeDraftCard.tsx`

**Layout (top-down):**
1. **Sticky header** (existing): `<h1 className="text-xl font-semibold">{t("tab_title")}</h1>` — "À compléter".
2. **List or empty state** (`<div className="px-6 pt-3 flex flex-col gap-3 pb-24">`):
   - Empty: `<EmptyState icon={Inbox} heading={t("empty_heading")} body={t("empty_body")} />` — empty-state component re-themed (paper-grain Card + display-serif headline).
   - Populated: `<AnimatePresence initial={false}>{drafts.map((r) => <motion.div key={r.id} variants={variants.slideUp} initial="hidden" animate="visible" exit={{ opacity: 0, transition: transitions.fast }}><RecipeDraftCard recipe={r} /></motion.div>)}</AnimatePresence>`.

**`RecipeDraftCard` row contract (per recipe):**

- Container: `<Link href={`/recipes/${recipe.id}/edit`} className="paper-grain flex gap-4 p-3 bg-background rounded-lg border border-border hover:bg-surface-muted transition-colors">` — **`paper-grain` added.** Manual + failed variants wrap in `<Link>`; processing variant wraps in plain `<div>` (non-tappable).
- Thumbnail: `<div aria-hidden className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0" />` — placeholder (recipe `last_cooked_photo_path` rendering deferred to Phase 8 detail surface).
- Body (`flex flex-col gap-1.5 flex-1 min-w-0`):
  - Title: `<h3 className="text-base font-semibold leading-6 line-clamp-1">{recipe.title}</h3>`
  - Status row (`flex items-center gap-2 flex-wrap`):
    - **Manual variant:** `<AnimatePresence mode="wait"><motion.span key="brouillon" variants={variants.fadeIn} initial="hidden" animate="visible" exit="hidden"><Badge variant="secondary">{t("draft_badge")}</Badge></motion.span></AnimatePresence>` — "Brouillon"
    - **Processing variant:** `<span role="status" aria-label="Recette en cours d'extraction" className="flex items-center gap-2 text-sm font-medium text-foreground-muted"><Loader2 size={16} className="animate-spin" aria-hidden />{tPromo("in_flight")}</span>` — "Extraction en cours…"
    - **Failed variant:** `<div className="flex items-center gap-2"><Badge variant="destructive">{tPromo("failed_badge")}</Badge><Button variant="ghost" className="h-12" onClick={handleRetry} disabled={retrying} aria-label={tPromo("retry_aria")}><RefreshCw size={14} className="mr-1.5" />{tPromo("retry")}</Button></div>` — "Échec" + "Réessayer". **Retry button bumped from `h-8` to `h-12`.**
- Delete button (manual + failed only — hidden during processing): `<Button variant="ghost" size="icon" className="h-12 w-12 flex-shrink-0 text-foreground-muted hover:text-destructive" disabled={deleting} onClick={handleDelete} aria-label={t("delete_aria")}>` — **bumped from `h-8 w-8` to `h-12 w-12`** with `<Trash2 size={16} aria-hidden />` (or `<Loader2 className="animate-spin" />` while deleting).

**Realtime visual contract:**

| Event | Visual outcome |
|---|---|
| `recipe.created` (status === 'draft') | New row prepended via `dedupePrepend`. AnimatePresence runs `slideUp` (y=12 → y=0, opacity 0 → 1, `duration-normal`, `easeCraft`). |
| `recipe.updated` (still draft) | In-place replace; no animation (React reconciliation only). |
| `recipe.updated` (status flipped away from draft) | Row drops from list. AnimatePresence `exit` runs opacity-only fade `duration-fast`. |
| `recipe.promoted` (any payload id present in list) | Row drops from list. AnimatePresence `exit` runs opacity-only fade `duration-fast`. The `Brouillon` Badge cross-fade is technically not exercised in inbox (the row exits before the badge transitions) — the badge cross-fade is reserved for surfaces that keep the row mounted (e.g. the future DECIDE-01 daily shortlist if it ever shows draft → structured transitions; out of Phase 6 scope). **Inbox-side: row exits cleanly.** |
| `recipe.deleted` | Row drops; opacity-only fade. |

---

## Copywriting Contract

**Phase 6 introduces NO new user-facing copy.** Every string in scope already exists in `frontend/lib/i18n/fr.json`:

| Element | Key | Copy |
|---|---|---|
| Header title | `recipes.new.tab_title` | Nouvelle recette |
| Tabs | `recipes.new.tab_quick`, `tab_full`, `recipes.voice.tab_label`, `recipes.photo.tab_label`, `recipes.url.tab_label` | Rapide / Complète / Voix / Photo / URL |
| Quick-add primary CTA | `recipes.new.submit_quick` | Ajouter |
| Quick-add saving | `common.saving` | Enregistrement… |
| Quick-add uploading photo | `recipes.new.uploading_photo` | Envoi de la photo… |
| Quick-add success | `recipes.new.saved_toast` | Recette enregistrée |
| Quick-add partial success | `recipes.new.saved_without_photo` | Recette enregistrée, mais la photo n'a pas pu être ajoutée. |
| Full-form primary CTA | `recipes.new.submit_full` | Enregistrer la recette |
| Voice primary CTA | `recipes.voice.send` | Envoyer |
| Voice restart | `recipes.voice.restart` | Recommencer |
| Voice helper (D-Voice callout headline) | `recipes.voice.idle_helper` | Dicte ta recette en français. On la met en forme automatiquement. |
| Voice placeholder (keyboard-mic affordance) | `recipes.voice.transcript_placeholder` | Dictez via le clavier 🎤 ou tapez votre recette… |
| Voice success toast | `recipes.voice.submitted_toast` | Recette en cours d'analyse… |
| Voice empty error | `recipes.voice.empty_transcript` | Aucune parole détectée. Réessaie. |
| Photo primary CTA | `recipes.photo.capture` | Capturer la recette |
| Photo heading | `recipes.photo.empty_heading` | Photographie la recette |
| Photo body | `recipes.photo.empty_body` | Ajoute jusqu'à 4 photos. Gemini extrait le titre, les ingrédients et les étapes. |
| Photo size error | `recipes.photo.error_size_total` | Photos trop volumineuses. Limite Gemini : 18 Mo cumulés. |
| URL primary CTA | `recipes.url.submit` | Ajouter à la boîte de réception |
| URL helper | `recipes.url.helper` | L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception. |
| URL invalid | `recipes.url.invalid` | URL invalide. Vérifie le format (https://…). |
| URL success | `recipes.url.submitted_toast` | URL ajoutée à la boîte de réception. |
| Sheet title | `photo_uploader.sheet_title` | Ajouter une photo |
| Sheet camera | `photo_uploader.sheet_camera` | Caméra |
| Sheet library | `photo_uploader.sheet_library` | Photothèque |
| Photo add ARIA | `photo_uploader.add_label` | Ajouter une photo |
| Photo remove ARIA | `photo_uploader.remove_label` | Retirer la photo |
| Photo removed toast | `photo_uploader.removed_toast` | Photo retirée |
| Photo undo | `photo_uploader.undo_cta` | Annuler |
| Photo limit error | `photo_uploader.error_limit` | Maximum 4 photos par recette. |
| Photo type error | `photo_uploader.error_type` | Format de photo non supporté. |
| Photo size error (per-file) | `photo_uploader.error_size` | Photo non envoyée. Vérifie la taille et réessaie. |
| Photo network error | `photo_uploader.error_network` | Photo non envoyée. Vérifie ta connexion et réessaie. |
| Inbox header | `inbox.tab_title` | À compléter |
| Inbox empty heading | `inbox.empty_heading` | Tout est à jour |
| Inbox empty body | `inbox.empty_body` | Pas de brouillon à compléter. Les recettes ajoutées rapidement atterriront ici. |
| Draft badge | `recipes.draft_badge` | Brouillon |
| Failed badge | `recipes.promotion.failed_badge` | Échec |
| Retry button | `recipes.promotion.retry` | Réessayer |
| Retry ARIA | `recipes.promotion.retry_aria` | Réessayer l'extraction |
| Processing label | `recipes.promotion.in_flight` | Extraction en cours… |
| Promotion success toast | `recipes.promotion.success_toast` | Ta recette « {title} » est prête ! |
| Delete confirm | `recipes.delete_confirm` | Supprimer définitivement ? |
| Delete success | `recipes.delete_success` | Recette supprimée. |
| Delete ARIA | `recipes.delete_aria` | Supprimer |
| Network error fallback | `onboarding.errors.network` | (existing — preserved) |
| Sending generic | `common.sending` | (existing — preserved) |

### Standard contract slots

| Element | Copy |
|---------|------|
| **Primary CTA per tab** | Quick: `Ajouter` · Full: `Enregistrer la recette` · Voice: `Envoyer` · Photo: `Capturer la recette` · URL: `Ajouter à la boîte de réception` |
| **Empty state heading (drafts inbox)** | `Tout est à jour` |
| **Empty state body (drafts inbox)** | `Pas de brouillon à compléter. Les recettes ajoutées rapidement atterriront ici.` |
| **Error state — capture network failure** | Toast `tErr("network")` — "Impossible de joindre le serveur. Réessaie dans un instant." (existing key from onboarding errors). |
| **Error state — URL invalid** | Inline `recipes.url.invalid` — "URL invalide. Vérifie le format (https://…)." |
| **Error state — photo total too large** | Toast `recipes.photo.error_size_total` — "Photos trop volumineuses. Limite Gemini : 18 Mo cumulés." |
| **Error state — voice empty transcript** | Toast `recipes.voice.empty_transcript` — "Aucune parole détectée. Réessaie." |
| **Destructive confirmation — delete draft** | Browser `window.confirm(t("delete_confirm"))` — "Supprimer définitivement ?" The browser-native confirm is the existing approach (preserved); a future productize task may swap to AlertDialog. |
| **Destructive confirmation — failed photo upload (quick-add)** | Soft toast `recipes.new.saved_without_photo` — "Recette enregistrée, mais la photo n'a pas pu être ajoutée." (Not destructive in the strict sense; it's a partial-success notice. Keeps the user informed without blocking.) |

### Copywriting register discipline

- **Tu (informal singular)** throughout — couple-app convention preserved from v0.1.
- **Action verbs first** ("Ajouter", "Capturer", "Envoyer", "Réessayer") — clear intent over ambiguous nouns.
- **No exclamation points** in capture flows — the only `!` is the existing `recipes.promotion.success_toast` ("Ta recette « {title} » est prête !") which is a celebration moment, not a capture surface.
- **French diacritics rendered correctly** in all strings — Fraunces and IBM Plex Sans both ship full Latin Extended Plus per Phase 5 §Typography.
- **No new strings.** If a copy gap is identified during execution, raise it as a deviation — do not add silently.

---

## Acceptance Criteria — CAPTURE-08 through CAPTURE-13 + Phase 5 deferrals

| Req | Closed by |
|---|---|
| **CAPTURE-08** Quick-add capture surface re-themed with new tokens | §Surface 3 — quick-add submit raised to `h-12`, photo-picker row wrapped in paper-grain Card, Phase 5 tokens consumed throughout. |
| **CAPTURE-09** Full-form capture surface re-themed with new tokens | §Surface 4 — RecipeForm consumes Phase 5 primitive re-themes; submit `h-12`; section spacing audit. |
| **CAPTURE-10** Voice capture surface re-themed; D-Voice deviation copy preserved | §Surface 5 — D-Voice callout card with paper-grain + terracotta-60 left border + display-serif italic headline. **No `webkitSpeechRecognition` introduced.** |
| **CAPTURE-11** Photo capture surface re-themed; PhotoUploader sheet buttons raised to `h-12` (W4 closure) | §Component Inventory — `PhotoUploader.tsx` lines 230, 238 changed `h-11` → `h-12`; `PhotoCaptureTab.tsx` lines 170, 178, 221 changed `h-11` → `h-12`; X-overlay 48px hit-pad via `::before`; `Plus`-tile paper-grain + terracotta-30 dashed border. |
| **CAPTURE-12** URL capture surface re-themed | §Surface 7 — submit `h-12`; URL input keeps `font-mono`; helper card consumes Phase 5 muted tokens. |
| **CAPTURE-13** Drafts inbox re-themed; `recipe.created` and `recipe.promoted` realtime visual states | §Surface 8 + §Motion — `slideUp` on `recipe.created` via AnimatePresence; `Brouillon` Badge wrapped in AnimatePresence cross-fade for `recipe.promoted`; paper-grain on draft-card row container; delete + retry buttons raised to `h-12`. |
| **Phase 5 deferral — `font-heading` → `font-display` sweep** | §Component Inventory — alert-dialog.tsx:126, card.tsx:41, dialog.tsx:133, sheet.tsx:117 + repo-wide grep + `globals.css` alias removal. |
| **Phase 5 deferral — `transitions` import on `/styleguide`** | §Component Inventory — `frontend/app/styleguide/page.tsx:14` import line extended. |

### Verification queries (executor smoke checks)

After implementation, these grep queries must pass:

```bash
# 1. No font-heading or font-sans references remain (excluding the deletion in globals.css)
grep -rn "font-heading\|font-sans " frontend/app frontend/components 2>&1 | grep -v "globals.css" 
# expected: 0 results

# 2. No h-11 on capture-surface submit / sheet-action buttons
grep -n "h-11" frontend/components/PhotoUploader.tsx frontend/components/PhotoCaptureTab.tsx frontend/components/UrlCaptureTab.tsx frontend/app/recipes/new/page.tsx 2>&1
# expected: 0 results on submit / sheet-action buttons (any other h-11 like Input default sizing is acceptable)

# 3. PhotoUploader sheet buttons confirmed at h-12
grep -n "h-12" frontend/components/PhotoUploader.tsx 2>&1
# expected: at least 2 hits on the sheet-action buttons

# 4. paper-grain on draft card
grep -n "paper-grain" frontend/components/RecipeDraftCard.tsx 2>&1
# expected: at least 1 hit on containerClass

# 5. AnimatePresence wired in inbox
grep -n "AnimatePresence\|motion.div" frontend/app/inbox/page.tsx 2>&1
# expected: at least 1 hit

# 6. AnimatePresence wired around Badge in draft card
grep -n "AnimatePresence\|motion.span" frontend/components/RecipeDraftCard.tsx 2>&1
# expected: at least 1 hit

# 7. D-Voice callout card present in voice tab
grep -n "paper-grain\|border-primary/60" frontend/components/VoiceCaptureTab.tsx 2>&1
# expected: at least 1 hit

# 8. webkitSpeechRecognition NOT reintroduced
grep -rn "webkitSpeechRecognition\|SpeechRecognition" frontend/components/VoiceCaptureTab.tsx 2>&1
# expected: 0 results

# 9. Plus-tile dashed terracotta border in photo capture
grep -n "border-primary/30" frontend/components/PhotoUploader.tsx frontend/components/PhotoCaptureTab.tsx 2>&1
# expected: at least 2 hits (one per file)
```

### Real-device smoke test (post-implementation)

On iPhone Safari PWA standalone:
1. `/recipes/new` — switch through all 5 tabs; confirm tab strip reads as terracotta active state.
2. **Quick-add:** type a title → tap photo → submit → confirm toast + redirect to `/inbox`.
3. **Full-form:** open `Complète` → confirm sections render as paper-grain Card surfaces.
4. **Voice:** confirm D-Voice callout card with display-serif italic headline + terracotta-60 left border + paper-grain. Long-press dictation field → keyboard mic appears (OS-level) → no in-app mic icon.
5. **Photo:** add a photo → confirm sheet opens with `Caméra` / `Photothèque` buttons at visual height ≥ 48px (measure with browser inspector if uncertain).
6. **URL:** paste a URL → submit → confirm toast.
7. **Drafts inbox:** with two iPhones, capture from one → confirm new row slides in on the other (slideUp). Promote a draft (Gemini completes) → confirm `Brouillon` badge cross-fades and row exits cleanly.
8. **PhotoUploader X-overlay:** tap the X area approximately 10px outside the visible chrome → confirm the photo is removed (proves the 48px hit-pad is active).
9. **Reduced motion:** enable iOS reduce-motion → confirm slideUp + cross-fade clamp to instant.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | (none — Phase 6 adds zero new primitives; consumes Phase 5 re-themes only) | not required |
| third-party | (none declared) | not applicable |

`frontend/components.json` `registries: {}` confirmed unchanged. No third-party blocks introduced. No vetting required.

---

## Out of Scope (re-stated for executor discipline)

- `?tab=` URL deep-link query param — `TODO(productize)` already in `recipes/new/page.tsx:51`; not Phase 6 scope.
- Quick-add → save → PhotoUploader two-step UX rework — architectural; current native picker retained per CONTEXT.md.
- DELETE `/api/recipes/{id}/photos/{path}` endpoint — `TODO(productize)` in `PhotoUploader.tsx:148`; backend work.
- `Album` capture surface — V2 backlog (cut from v0.1).
- Persistent "Nouveau" badge / aging indicator — rejected in CONTEXT.md; entrance animation is the signal.
- In-app `webkitSpeechRecognition` — D-Voice deviation locked since Phase 2.
- Decide / cook / settings surface polish — Phases 7, 8, 9.
- Post-promotion recipe-detail rendering — Phase 8.
- AlertDialog replacement for `window.confirm` on draft delete — productize-later (browser-native confirm preserved).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (every string sourced from existing `fr.json`; no new keys; standard contract slots filled with concrete copy)
- [ ] Dimension 2 Visuals: PASS (paper-grain + warm shadow + terracotta accent applied per the surface-by-surface pinning; anti-pattern list explicit)
- [ ] Dimension 3 Color: PASS (60/30/10 inherited; accent reserved-for list locked to 6 entries; destructive reserved-for narrowed; opacity-on-draft anti-pattern called out)
- [ ] Dimension 4 Typography: PASS (4 sizes, 3 weights inherited from Phase 5; per-element role assignment provided; D-Voice callout uses display-serif italic at body size)
- [ ] Dimension 5 Spacing: PASS (4-multiple inherited; tap-target floor 48px enforced on every CTA + sheet button + draft-card delete/retry; X-overlay hit-pad expansion via pseudo-element)
- [ ] Dimension 6 Registry Safety: PASS (no new registries, no new shadcn primitives, no third-party blocks)

**Approval:** pending
