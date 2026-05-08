# Phase 6: Capture surfaces polish - Context

**Gathered:** 2026-05-08
**Status:** Ready for UI-SPEC + planning
**Mode:** Smart discuss (autonomous) — 2 grey areas, all defaults accepted

<domain>
## Phase Boundary

Bring every capture entrypoint and the drafts inbox into the Slow Food artisanal design system established in Phase 5, while folding in the W4 PhotoUploader tap-target gap and the alias-removal sweep deferred from Phase 5 verification. Surfaces in scope:

- **5 capture tabs** at `/recipes/new`: Rapide (quick-add), Complète (full-form), Voix (voice), Photo, URL
- **Drafts inbox** at `/inbox` (3 visual variants: manual draft / processing / failed)
- **PhotoUploader** sheet (`Caméra` / `Photothèque` action buttons, filled-tile X-overlay, `Plus` add tile)
- **Voice capture** surface — D-Voice deviation copy treatment

This phase consumes Phase 5 outputs (terracotta primary, paper-grain on cards, `--ease-craft`, `lib/motion.ts` Framer presets, Fraunces display + IBM Plex Sans body). It does NOT change capture pipeline architecture, the 3-variant draft state machine, or the D-Voice deviation itself — only their visual rendering.

**Out of scope:**
- Decide / cook / settings surfaces (Phases 7, 8, 9)
- Adding in-app `webkitSpeechRecognition` (D-Voice deviation locked — keyboard mic only)
- Quick-add → save → PhotoUploader two-step rework (architectural; current pre-save native input retained)
- Post-promotion recipe-detail rendering (Phase 7 / 8)
- Inline `tab=` deep-link query param (`TODO(productize)` line in `recipes/new/page.tsx` — out of scope here)

**Phase 5 deferrals to absorb here:**
- Replace `font-heading` references with `font-display` in 4 Title primitives (alert-dialog, card, dialog, sheet)
- `transitions` import alongside `variants` in `/styleguide` page (cosmetic; Phase 5 deferral)

</domain>

<decisions>
## Implementation Decisions

### Drafts Inbox Status & Realtime Visual

- **Status distinction**: Status pill via Phase 5 `Badge` (`secondary` for `Brouillon`, `default`/no-pill for `structured`). Paper-grain on the card surface for both. **No opacity reduction on draft** — drafts are first-class until promoted.
- **`recipe.promoted` transition**: Card stays mounted; only the badge node cross-fades using `framer-motion` `AnimatePresence` with the Phase 5 motion preset (~280ms with `--ease-craft`). No whole-card remount, no sparkle, no skeleton.
- **`recipe.created` transition**: New card slides in from top using the Phase 5 `slideUp` preset from `frontend/lib/motion.ts`. **No persistent "Nouveau" badge** — the entrance animation is the only signal.
- **Empty inbox**: Reuse existing `EmptyState` component, retheme: paper-grain Card surface, `font-display` italic headline, terracotta-accented primary CTA.

### Capture Surface Chrome

- **5-tab nav typography**: Sans (IBM Plex Sans, `font-medium`). Serif reserved for editorial content per Phase 5 UI-SPEC §Typography role assignment. Tab labels stay interactive-UI.
- **Sticky header**: Preserve current shared sticky header at `app/recipes/new/page.tsx` line 139; retheme to Phase 5 background tokens (`bg-background/80 backdrop-blur-sm`) — no chrome rework.
- **Paper-grain placement**: Apply `paper-grain` only on `Card`-style containers within each tab (recipe form sections, drafts list rows, voice helper callout). **NEVER** on the full tab pane background, the tab strip, or the sticky header.

### PhotoUploader Tap Targets (CAPTURE-11 + extension)

- **Sheet action buttons** (`Caméra`, `Photothèque`): confirm and lock at `h-12` (48px). Phase 6 verification must grep for `h-12` on these two buttons in `components/PhotoUploader.tsx`.
- **Filled-tile X overlay**: bump visible chrome to `h-7 w-7` (28px) and add invisible 48px hit area via a `before:absolute before:inset-[-12px]` pseudo. Visual stays small; tap floor satisfied (D-08 / WCAG 2.5.5 minimum).
- **`Plus` add tile**: keep 96×96 footprint; retheme dashed border to `border-primary/30` (terracotta) and apply paper-grain background on the tile so it reads as "blank recipe card."
- **Removed-toast**: inherits Phase 5 Sonner re-theme automatically — no per-surface override needed.

### Voice Capture (D-Voice deviation)

- **D-Voice deviation copy** (`"Tu peux dicter avec le micro du clavier."`): persistent helper card placed above the textarea on the voice tab. Card uses paper-grain surface + terracotta-tinted left border + `font-display` italic 1-line callout. **Visible at all times, not dismissable, no in-app mic button.** This callout IS the surface's affordance.
- **No in-app `webkitSpeechRecognition`**: D-Voice deviation locked. Phase 6 must NOT re-introduce a mic button or browser-speech listener — deviation copy is load-bearing UX.
- **Textarea styling**: inherits Phase 5 Textarea primitive re-theme. No structural change.

### Quick-Add Surface

- **Pre-save photo picker**: keep native `<input type="file">` pre-recipe-id (PhotoUploader requires a recipe id — locked architectural constraint). Retheme `file:*` Tailwind selectors to terracotta-secondary, wrap the picker row in a paper-grain Card so it reads as a recipe card draft.
- **Two-stage submit feedback**: keep `quickStage` state machine (`title` → `photo` → done). No visual rework beyond retheming the loading copy and spinner with Phase 5 tokens.
- **Bottom-fixed submit button**: preserves current `fixed bottom-16 inset-x-0` position. `h-11 w-full` confirmed ≥ 44px (still under D-08's 48px floor) — bump to `h-12` to align with the rest of the milestone.

### Phase 5 Deferrals to Close

- **`font-heading` → `font-display`** sweep across 4 Title primitives: `components/ui/alert-dialog.tsx`, `components/ui/card.tsx`, `components/ui/dialog.tsx`, `components/ui/sheet.tsx`. Single-line edit each.
- **`/styleguide` page** — add `transitions` import alongside `variants` for the motion demos (cosmetic).

### Claude's Discretion
- Exact terracotta tint values for the D-Voice callout left-border and the `Plus`-tile dashed border (within Phase 5 token range).
- Whether the `recipe.promoted` cross-fade animates the entire `flex` row that contains badge+button, or just the `Badge` element — choose whichever flows visually without flicker on iPhone.
- Implementation shape for the 48px hit area on the X overlay (pseudo-element vs sibling absolute element) — pick whichever React 19 / Tailwind v4 idiom reads cleanest.
- Whether to factor the D-Voice helper Card into a shared `VoiceDeviationCallout.tsx` or inline it in `VoiceCaptureTab.tsx` — judgement call based on reuse potential.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (post-Phase-5)
- Phase 5 `frontend/lib/motion.ts` exports `fadeIn`, `slideUp`, `pressFeedback`, `swipe` Framer Motion presets backed by CSS tokens `--ease-craft`, `--duration-fast` (150ms), `--duration-normal` (280ms). Phase 6 imports these directly — no new presets.
- 15 re-themed shadcn primitives in `components/ui/*` (Phase 5 Plan 01-05). Phase 6 only consumes; no per-primitive structural changes.
- Paper-grain CSS utility: `.paper-grain` class (Phase 5) applies a `::before` pseudo with `mix-blend-mode: multiply`. Already wired on `Card`, `Dialog`, `Sheet`, `AlertDialog`, `Select`. Phase 6 just extends usage to draft cards and the D-Voice helper card.
- `RecipeDraftCard.tsx` (151 LOC) — 3-variant component already exists; Phase 6 reskins, does not restructure.
- `EmptyState.tsx` — generic empty-state shell Phase 6 can decorate.
- `RealtimeProvider.tsx` — already broadcasts `recipe.created` and `recipe.promoted`. Phase 6 only adds the `AnimatePresence` wrapper around the badge node.

### Established Patterns
- Tab management: `Tabs / TabsList / TabsTrigger / TabsContent` from `components/ui/tabs.tsx` (Phase 5 re-themed). 5-tab strip already wired.
- Sticky bottom action area: `fixed bottom-16 inset-x-0 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 bg-background/80 backdrop-blur-sm border-t` — Phase 1 / 4 idiom; Phase 6 keeps it.
- i18n: every user-facing string already routes through `next-intl` (`useTranslations("recipes.new")`, `useTranslations("photo_uploader")`, etc.). **No new keys** unless a copy change is needed; if any are added, update `frontend/lib/i18n/fr.json` only (French v0.1).
- Toast pattern: `sonner` `toast.success` / `toast.warning` / `toast.error` — Phase 5 re-themed; Phase 6 just uses.

### Integration Points
- `frontend/app/recipes/new/page.tsx` — 5-tab capture entry (245 LOC; light retheme + h-11 → h-12 on submit button)
- `frontend/components/RecipeForm.tsx` — full-form (`Complète` tab) (408 LOC; re-theme inputs + section spacing)
- `frontend/components/VoiceCaptureTab.tsx` (104 LOC) — add D-Voice persistent callout
- `frontend/components/PhotoCaptureTab.tsx` (236 LOC) — re-theme; verify upload affordance hierarchy
- `frontend/components/UrlCaptureTab.tsx` (105 LOC) — light re-theme
- `frontend/components/PhotoUploader.tsx` (282 LOC) — confirm `h-12` on sheet buttons; bump X overlay hit area; retheme `Plus` tile
- `frontend/components/RecipeDraftCard.tsx` (151 LOC) — wrap `Badge` in `AnimatePresence`; ensure paper-grain on Card
- `frontend/app/inbox/page.tsx` (134 LOC) — wrap list in `AnimatePresence` for `recipe.created` slide-in
- `frontend/components/EmptyState.tsx` — re-theme to paper-grain Card with display serif headline
- `frontend/components/ui/{alert-dialog,card,dialog,sheet}.tsx` — `font-heading` → `font-display` sweep (Phase 5 deferral)
- `frontend/app/styleguide/page.tsx` — add `transitions` import (Phase 5 deferral)

### Constraints from Prior Phases / Project
- v0.1 token names must NOT break (DESIGN-03 inheritance). Phase 6 uses Phase 5 token aliases.
- D-Voice deviation locked (CONTEXT.md from W2 Phase 2): keyboard-mic only, no `webkitSpeechRecognition`. Phase 6 reinforces — does not re-litigate.
- French only via `next-intl`. No new English strings.
- iOS Safari 17+ PWA standalone is the rendering target. All Phase 6 changes verified via dev-server smoke test on iPhone before phase close.
- Solo dev, ~1 weekend budget per polish phase. Scope reflects "consume Phase 5 + close gaps", not "rebuild surfaces".

</code_context>

<specifics>
## Specific Ideas

- **D-Voice callout copy** (already in `frontend/lib/i18n/fr.json` under `recipes.voice`): preserve the existing `"Tu peux dicter avec le micro du clavier."` string verbatim — visual treatment changes only.
- **`Plus` tile** (PhotoUploader empty add slot): treat it like a blank recipe card on a kitchen counter — paper-grain background + dashed terracotta-30 border + `Plus` glyph in muted-foreground.
- **`Brouillon` badge** (manual variant): keep `secondary` Badge variant from Phase 5, no terracotta override (would compete with promotion-cross-fade signal).
- **`Échec` badge** (failed variant): keep `destructive` Badge variant; no Phase 6 change.
- **Animation cadence**: prefer subtle over decorative. The cross-fade and slideUp are the only motion additions; avoid stacking effects.

</specifics>

<deferred>
## Deferred Ideas

- `?tab=` URL deep-link to capture surface — `TODO(productize)` already in code (line 51 of `recipes/new/page.tsx`); not Phase 6 scope.
- Quick-add → save → PhotoUploader two-step UX — would require re-architecting the pre-save flow; deferred (current native picker retained).
- DELETE `/api/recipes/{id}/photos/{path}` endpoint — `TODO(productize)` in `PhotoUploader.tsx` line 148; backend work, not Phase 6.
- `Album` capture surface — cut from v0.1 to V2 per `04-CONTEXT.md` (commit c7ee1f0). Out of v0.2.
- "Nouveau" persistent badge / aging indicator — rejected during discuss; entrance animation is the signal.

</deferred>
