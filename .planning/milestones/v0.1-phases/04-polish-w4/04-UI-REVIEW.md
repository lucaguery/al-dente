---
phase: 4
slug: polish-w4
reviewed_at: 2026-05-08
baseline: 04-UI-SPEC.md (approved 2026-05-07)
screenshots: not captured (no dev server detected)
auditor: gsd-ui-review
---

# Phase 4 — UI Review

**Audited:** 2026-05-08
**Baseline:** `04-UI-SPEC.md` (approved, radix-nova preset, Tailwind v4, shadcn/ui)
**Screenshots:** Not captured — no dev server detected at localhost:3000 or localhost:5173. Code-only audit.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Visual Hierarchy | 4/4 | Clear focal hierarchy: Playfair title, three-tier section structure, gated primary CTA |
| 2. Interaction Feedback | 3/4 | Press scale and color transitions work; `active:scale-[0.98]` on RatingPicker cards is instant (no `transition-transform`) |
| 3. Consistency | 3/4 | `bg-valide-tint` token used correctly; spec named token `--color-validé-tint` but implementation uses `valide` (no accent) — consistent at least with itself |
| 4. Accessibility | 3/4 | `aria-pressed`, `aria-labelledby`, focus rings on RatingPicker all correct; CookingBanner buttons (`h-9`) and PhotoUploader sheet buttons (`h-11`) are below the 48px Phase-4 floor |
| 5. Mobile-first Layout | 4/4 | `px-6 pb-24 flex-1` single-scroll, vertical stacking, safe-area handled by shell, no horizontal overflow sources found |
| 6. Spec Adherence | 3/4 | Voice-notes-mic-button intentionally dropped (D-Voice iOS precedent, documented deviation); offline submit gate, `photo_size`/`photo_type` i18n keys, and `recipe_subhead` i18n key absent; `transition-transform duration-100` missing from RatingPicker |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **RatingPicker press feedback is instant on transform** — `active:scale-[0.98]` is declared without `transition-transform duration-100`, so the spec's "subtle tap acknowledgement" collapses to an immediate snap. The spec (`04-UI-SPEC.md` §RatingPicker, §Motion) explicitly calls for `transition-transform duration-100` as a separate property from `transition-colors duration-150`. Fix: add `transition-transform duration-100` to the class string at `frontend/components/RatingPicker.tsx:68`.

2. **CookingBanner tap targets are below the Phase-4 48px floor** — The "Finaliser" link and "Passer" ghost button are both `h-9` (36px) at `frontend/components/CookingBanner.tsx:56,65`. Phase-4 D-08 raised the floor to 48px for existing components that are touched during Phase 4. The banner is touched indirectly (it links to the new finalize page). Fix: upgrade to `h-12` (48px) on both interactive elements in `CookingBanner.tsx`.

3. **Missing offline submit toast i18n key** — `cooking_log.finalize.offline` is specified in `04-UI-SPEC.md` §Error states but absent from `frontend/lib/i18n/fr.json`. The submit handler in `CookingLogFinalize.tsx` does not check `navigator.onLine` before submission, so the offline-submit toast (`Hors ligne. Réessaie une fois connecté.`) cannot fire. Fix: add the key to `fr.json` and add an `if (!navigator.onLine)` guard at the top of `handleSubmit` in `CookingLogFinalize.tsx:81`.

---

## Detailed Findings

### Pillar 1: Visual Hierarchy (4/4)

The finalize page achieves clear three-level hierarchy through the component structure and typography choices.

**Strengths:**
- `h1` uses `text-title` (Playfair Display, 1.375rem, 600 weight) at `CookingLogFinalize.tsx:136` — editorial register matches the "moment of completion" intent.
- Recipe title as muted subhead (`text-base text-foreground-muted line-clamp-1` at `CookingLogFinalize.tsx:137`) correctly subordinates to the page title.
- Section headings (`text-base font-semibold leading-6` at lines 144, 161, 175) use the Heading-Body register consistently across all three sections.
- Helper copy at `text-sm text-foreground-muted` correctly falls a level below the headings.
- RatingPicker cards (`h-20 w-full`) are the dominant interactive surface — scale is proportional to their importance.
- `Finaliser` CTA gating is visually clear: disabled state is handled by shadcn's native disabled opacity, and the helper text `Choisis une note pour pouvoir finaliser.` disappears on selection (line 164), removing visual noise once the gate clears.
- Loading skeleton at lines 111-113 preserves layout structure with animated `bg-surface-muted` pulses.
- Empty/gone state uses the shared `EmptyState` component (lines 121-128) with the spec-mandated `Sparkles` icon and correct copy keys.

**No deficiencies found in this pillar.**

---

### Pillar 2: Interaction Feedback (3/4)

**Strengths:**
- `transition-colors duration-150` on RatingPicker cards (`RatingPicker.tsx:68`) produces smooth 150ms color transitions on selection — matches `motion-fast` token.
- `hover:bg-secondary/50` on unselected cards provides a resting-state hover affordance (`RatingPicker.tsx:47`).
- `aria-pressed={selected}` at `RatingPicker.tsx:64` communicates selection state to AT and provides a truthful programmatic hook.
- Submit button correctly reads `{submitting ? t("submitting") : t("submit")}` at `CookingLogFinalize.tsx:198-201` — `Enregistrement…` text replaces `Finaliser` during the async call.
- `disabled={!canSubmit}` at `CookingLogFinalize.tsx:195` uses native HTML disabled which sets `aria-disabled` and prevents interaction.
- PhotoUploader `disabled:opacity-50` at `PhotoUploader.tsx:218` visually communicates the disabled add-slot state.
- RecipeCard `active:translate-y-px transition-all duration-150` at `RecipeCard.tsx:72` gives a micro-tap sink on the recipe list.

**Finding (score impact):**

- `RatingPicker.tsx:68` — The class string `"transition-colors duration-150 active:scale-[0.98]"` applies `transition-colors` but not `transition-transform`. In Tailwind v4, `transition-colors` only animates the `color`, `background-color`, `border-color`, `text-decoration-color`, `fill`, and `stroke` properties. The `scale` transform applied by `active:scale-[0.98]` is NOT covered, so the press effect is instantaneous rather than the intended 100ms ease. The spec at `04-UI-SPEC.md` §Motion explicitly specifies `transition-transform duration-100` as a separate utility. The missing class is `transition-transform duration-100` (or the combined `transition` shorthand).

---

### Pillar 3: Consistency (3/4)

**Strengths:**
- Zero hardcoded color values (`#rrggbb` or `rgb()`) found across all audited components.
- RatingPicker correctly maps `loved → bg-surface-rose-100/border-primary`, `liked → bg-valide-tint/border-emerald-500`, `disliked → bg-surface-muted/border-foreground-muted` — exactly the three reserved-for additions in `04-UI-SPEC.md` §Color.
- `text-primary/text-primary-foreground` on the `Finaliser` CTA is the only `bg-primary` usage in the new Phase-4 surface, matching the 10% accent contract.
- `bg-valide-tint` for the CookingBanner background (`CookingBanner.tsx:35`) correctly reuses the Phase-3 "cooking in progress" semantic.
- `shadow-card` class applied consistently to RatingPicker cards (`RatingPicker.tsx:67`), matching the recipe-row card pattern.
- Section layout (`flex flex-col gap-4`, `flex flex-col gap-1` heading/helper pairs) is identical to the spec's pinned layout tree at `04-UI-SPEC.md` §Surface 2.

**Finding (minor, no score impact beyond this pillar):**

- The spec uses `--color-validé-tint` (with French accent `é`) as the CSS variable name in `04-UI-SPEC.md` §Color. The implementation uses `bg-valide-tint` (no accent) in `RatingPicker.tsx:36` and `CookingBanner.tsx:35`. The actual CSS variable in `app/globals.css:72` is `--color-valide-tint` (no accent). The spec text and the CSS variable are inconsistent with each other, but the implementation matches the actual CSS variable. This is a spec documentation inconsistency, not an implementation defect. Noted for the spec's next revision.

- `CookingBanner.tsx:56` — the "Finaliser" link is styled with raw inline Tailwind rather than the shadcn `Button` component: `inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium gap-1`. Using a raw `<a>` with hand-rolled button classes instead of `<Button asChild>` means this element won't automatically pick up any future Button variant changes. Minor pattern drift; functionally equivalent.

---

### Pillar 4: Accessibility (3/4)

**Strengths:**
- `aria-pressed={selected}` on each RatingPicker card (`RatingPicker.tsx:64`) correctly announces selection state.
- `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none` at `RatingPicker.tsx:69` — the full Phase-4 D-08 focus-ring token applied correctly, and `focus-visible:` (not `focus:`) prevents rings on touch/mouse click.
- `aria-labelledby="photos-heading"`, `aria-labelledby="rating-heading"`, `aria-labelledby="notes-heading"` on all three `<section>` elements in `CookingLogFinalize.tsx:142,159,173`.
- `aria-labelledby="notes-heading"` on the Textarea at `CookingLogFinalize.tsx:183` — labelled by section heading rather than a redundant `<label>`.
- `aria-describedby={!rating ? "rating-heading" : undefined}` on the submit button at `CookingLogFinalize.tsx:197` — links the disabled button to the rating section heading as its description.
- `aria-label={t("remove_label")}` on the photo remove button at `PhotoUploader.tsx:201` — reads as "Retirer la photo" in French.
- `aria-label={t("add_label")}` on the add-slot button at `PhotoUploader.tsx:217` — reads as "Ajouter une photo".
- Icons correctly marked `aria-hidden` throughout.
- `role="region" aria-labelledby="cooking-banner-title"` on CookingBanner at `CookingBanner.tsx:33-34`.

**Findings (score impact):**

1. **CookingBanner.tsx:56,65** — Both the "Finaliser" link (`h-9`, 36px) and the "Passer" ghost button (`h-9`, 36px) are below the Phase-4 48px tap-target floor (D-08). The spec at `04-UI-SPEC.md` §Tap Targets specifies 48px as the minimum for components touched in Phase 4. The banner is implicitly touched by Phase 4 (it links to the new finalize page). Both elements need `h-12` (48px).

2. **PhotoUploader.tsx:230,238** — The Sheet action buttons ("Caméra" and "Photothèque") are `h-11` (44px), one pixel below the raised 48px floor. These are new Phase-4 surfaces (the sheet is triggered only in cooking-log mode). Fix: `h-12`.

3. **PhotoUploader.tsx:203** — The photo-remove overlay button is `h-6 w-6` (24px). This is covered by the spec's explicit exception at `04-UI-SPEC.md` §Tap Targets: "overlays on tightly-packed grids may stay ≤48px provided the parent tile is ≥48px AND a parallel keyboard-accessible alternative exists." The parent tile is `h-24 w-24` (96px) and the button has `aria-label`. Exception applies — not flagged as deficient.

4. **ColdStartChip.tsx:56** — Dismiss button is `h-8 w-8` (32px), below 48px. Phase-4 D-08 lists this as a D-10 productize-later candidate (per `04-03-SUMMARY.md` — out of scope for Phase 4). Noted for completeness, not scored against.

---

### Pillar 5: Mobile-first Layout (4/4)

**Strengths:**
- Finalize page outer container `flex flex-col flex-1 px-6 pt-6 pb-24 gap-8` at `CookingLogFinalize.tsx:134` — matches the spec's pinned layout tree exactly, including the `pb-24` (96px) bottom padding that keeps the submit button above the bottom nav.
- Shell-level safe-area handling in `app/layout.tsx:63,69` (`paddingTop: env(safe-area-inset-top)` and `pb-[calc(4rem+env(safe-area-inset-bottom))]`) means the finalize page inherits correct insets without per-page declarations.
- RatingPicker `flex flex-col gap-3` at `RatingPicker.tsx:57` — vertical stacking only, never horizontal. Cards never become a row at any width.
- `w-full` on each RatingPicker card at `RatingPicker.tsx:67` — full-width at all viewpoints.
- PhotoUploader `grid grid-cols-2 gap-3` at `PhotoUploader.tsx:180` — 2x2 grid with fixed `h-24 w-24` tiles; at 375px (standard iPhone SE), two 96px tiles + 12px gap = 204px, well within the 375px-48px-padding = 327px content width. No overflow.
- RecipeCard `line-clamp-1` at `RecipeCard.tsx:88` prevents text overflow on recipe titles.
- `line-clamp-1` on the recipe subhead at `CookingLogFinalize.tsx:137` handles long recipe titles without overflow.
- Textarea `min-h-32` at `CookingLogFinalize.tsx:187` — 128px minimum matches spec, gives comfortable dictation surface.
- `max-w-md` content cap is set at the layout-shell level (not visible in the finalize page itself, but inherited from the Phase-1 layout shell). No per-page max-width needed.

**No deficiencies found in this pillar.**

---

### Pillar 6: Spec Adherence (3/4)

**Documented deviations (explicitly approved in SUMMARYs):**

1. **Voice-notes Mic button omitted** — `04-UI-SPEC.md` §Surface 4 specifies a `<VoiceInput>` mic button next to the notes textarea. `CookingLogFinalize.tsx:173-188` implements textarea-only with helper copy `Tu peux dicter avec le micro du clavier.`. This is an intentional, documented deviation in `04-02-SUMMARY.md §Deviations` citing Phase-2 D-Voice (Web Speech API broken on iOS PWA standalone). The notes helper copy was also updated in `fr.json` (`cooking_log.notes.helper_keyboard_mic`). Deviation is valid and within the spec's platform-reality clause.

2. **Detail-page hero does not surface `last_cooked_photo_path`** — `04-UI-SPEC.md` §Surface 6 allows option A, B, or C for the detail-page hero. Plan 04-02 picked option C (omit), citing the backend path-validation constraint. `TODO(productize)` marker present in `frontend/app/recipes/[id]/page.tsx`. Deviation is documented and within spec.

**Undocumented gaps:**

3. **`cooking_log.finalize.offline` i18n key missing** — `04-UI-SPEC.md` §Error states specifies `cooking_log.finalize.offline` key with copy `Hors ligne. Réessaie une fois connecté.` for offline submit. The key is absent from `frontend/lib/i18n/fr.json`. The submit handler (`CookingLogFinalize.tsx:81-106`) has no `navigator.onLine` check before calling `putFinalizeCookingLog`. On offline submit, the call will throw a network error and fall through to the generic `save_failed` toast, not the specific offline-context copy. Impact: user sees a slightly wrong error message when tapping Finaliser while offline.

4. **`cooking_log.finalize.photo_size` and `cooking_log.finalize.photo_type` i18n keys missing** — The spec (§Error states) notes these may reuse existing `photo_uploader.*` keys when copy is identical, or use cooking-log-specific keys. The implementation reuses the `photo_uploader.*` keys via the t("error_size") calls in `PhotoUploader.tsx:105,106`. The reuse is spec-approved. However the spec also mentions `cooking_log.finalize.photo_size` as an alternative key name for the 413 case. Not a defect — the shared `photo_uploader.error_size` key is the spec-approved path.

5. **`cooking_log.finalize.recipe_subhead` i18n key not used** — The spec's Copywriting Contract at §Section headings specifies key `cooking_log.finalize.recipe_subhead` for `« {title} »` with ICU interpolation. The implementation at `CookingLogFinalize.tsx:137` renders the recipe title inline as a JSX expression: `« {state.recipe.title} »` without a translation key. Copy is functionally correct (French guillemets with hard-coded spaces), but it bypasses next-intl for the ICU interpolation pattern. The title itself is server-provided data (not a hardcoded string), but the surrounding guillemets are hardcoded JSX. Minor pattern divergence from the `CLAUDE.md` invariant "all user-facing strings go through next-intl."

6. **`cooking_log.notes.mic_start_aria` and `mic_stop_aria` keys absent** — These were specified for the mic button aria-labels that was ultimately not implemented (see deviation 1 above). Keys are correctly absent given the approved deviation.

7. **`transition-transform duration-100` missing from RatingPicker** — Detailed in Pillar 2. The spec at `04-UI-SPEC.md` §Motion and §RatingPicker explicitly specifies this class for the `active:scale-[0.98]` press feedback.

---

## Registry Safety

`frontend/components.json` has `"registries": {}` — no third-party registries declared. Phase 4 adds zero new shadcn primitives and zero new npm dependencies. Registry audit: 0 third-party blocks, no vetting required.

---

## Files Audited

| File | Role |
|------|------|
| `frontend/app/cooking-logs/[id]/finalize/page.tsx` | Route shell — server/client bridge |
| `frontend/components/CookingLogFinalize.tsx` | Main finalize form component |
| `frontend/components/RatingPicker.tsx` | Three-card rating selector |
| `frontend/components/PhotoUploader.tsx` | Photo grid with cooking-log mode |
| `frontend/components/CookingBanner.tsx` | Active-session banner (Phase 3, audited for Phase-4 tap-target floor) |
| `frontend/components/RecipeCard.tsx` | Living-image integration (D-05) |
| `frontend/components/ColdStartChip.tsx` | Cold-start dismissible chip (D-09 lint fix) |
| `frontend/lib/i18n/fr.json` | French string bundle — Phase-4 keys audited |
| `frontend/app/globals.css` | CSS variable definitions and `prefers-reduced-motion` rule |
| `frontend/app/layout.tsx` | Safe-area inset handling |
| `frontend/components.json` | shadcn registry configuration |
| `.planning/phases/04-polish-w4/04-UI-SPEC.md` | Design contract |
| `.planning/phases/04-polish-w4/04-02-SUMMARY.md` | Documented deviations |
| `.planning/phases/04-polish-w4/04-03-SUMMARY.md` | Lint cleanup results |
| `.planning/phases/04-polish-w4/04-04-SUMMARY.md` | Pre-flight results |
