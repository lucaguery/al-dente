---
phase: 4
slug: polish-w4
status: approved
reviewed_at: 2026-05-07
shadcn_initialized: true
preset: radix-nova (inherited from Phase 1; baseColor neutral, iconLibrary lucide)
created: 2026-05-07
---

# Phase 4 — UI Design Contract

> Visual and interaction contract for the Polish (W4) phase of Al Dente. Pre-populated from `04-CONTEXT.md` (D-03..D-10), `01-UI-SPEC.md` (token + component baseline), `03-UI-SPEC.md` (Sonner toast pattern, CookingBanner, mic-driven voice input, EmptyState), `SPEC.md §"Cooking log"`, `REQUIREMENTS.md` COOK-03/04/05, and the existing component inventory in `frontend/components/`.
>
> **Inheritance rule:** All design-system primitives (spacing scale, typography, color palette, layout shell, member-color attribution, French copy guidance, motion baseline, accessibility, registry safety) are **inherited unchanged** from `01-UI-SPEC.md` and `03-UI-SPEC.md`. Phase-2 voice-input pattern carries forward. This document specifies what is **new in Phase 4**: the cooking-log finalization page, the 3-value rating picker, the recipe-card living image, the mobile polish pass (focus rings, contrast, touch targets), and the app-shell-only offline behavior. Where this document is silent, Phase-1 / Phase-2 / Phase-3 contracts apply verbatim.
>
> **Audience reminder:** "Just us" couple-scale PWA on two iPhones. Mobile-first at 390pt iPhone 14 baseline. Phase 4 is the **finishing layer** — the moment the recipe library stops feeling like a form and starts feeling like a shared cooking journal. The recipe-card living image (D-05) is the single highest-leverage UX deliverable: scrolling the library shows your own food, not stock placeholders.
>
> **Album is OUT.** ALBUM-01/02/03 was cut from MVP per `04-CONTEXT.md`. Phase 4 ships **finalization + living recipe cards + polish**, no shared masonry grid. Productize-later if dogfood reveals demand.

---

## Canonical References (downstream agents must read)

| Reference | Why it matters here |
|-----------|---------------------|
| `.planning/phases/04-polish-w4/04-CONTEXT.md` | D-03 (single-scroll finalize page, rating required), D-04 (post-finalize navigates Home), D-05 (recipe card shows last cooking-log photo via `last_cooked_photo_path`), D-06 (new `POST /cooking-logs/{id}/photos` endpoint, generic `PhotoUploader`), D-07 (offline = app shell only), D-08 (mobile a11y: contrast + 48px targets + focus rings only — no VoiceOver audit), D-09 (Phase 3 lint fixes), D-10 (productize-later sweep is opportunistic). |
| `.planning/phases/03-decide-w3/03-UI-SPEC.md` | **Token + component baseline carry-over.** CookingBanner (existing, unchanged in Phase 4), Sonner toast pattern, MemberDot primitive, EmptyState component, vote-state vocabulary, `prefers-reduced-motion` rule, framer-motion scoping (deck only — Phase 4 introduces NO new framer-motion usage). |
| `.planning/phases/01-foundations-w1/01-UI-SPEC.md` | Spacing scale (4-multiple subset, `gap-1.5` exception inherited), typography (4 sizes + 2 weights + Label-only 500), color (60/30/10 warm-cream + brand-rose accent), 5 member-color slots, French copy register (informal `tu`, sentence-case, no exclamation except celebratory), motion tokens, accessibility baseline. |
| `.planning/phases/02-llm-capture-w2/02-UI-SPEC.md` | **Voice-input pattern.** `VoiceInput.tsx` mic button with live-transcript (italic reserved-for-transcript-only). Phase 4 reuses this pattern for cooking-log notes dictation (COOK-04). No new voice surface — the existing `VoiceInput` is dropped in next to a `Textarea`. |
| `SPEC.md` §"Cooking log" | COOK-03/04/05 acceptance: photos ≤ 4, 3-value `loved`/`liked`/`disliked` rating, free-text notes, denormalized `last_cooked_at`/`cook_count`/(NEW)`last_cooked_photo_path` updated in same DB transaction. |
| `SPEC.md` §"Productize-later TODOs" | Album, per-member ratings, cooking-history timeline, in-cook timer — all OUT of Phase 4. |
| `frontend/AGENTS.md` | **Next.js 16.2.4 has training-data drift.** Consult `frontend/node_modules/next/dist/docs/` before writing frontend code. |
| `frontend/components/CookingBanner.tsx` | Existing — unchanged. The "Finaliser" Link currently navigates to the Phase-3 stub at `/cooking-logs/[id]/finalize`. Phase 4 replaces the stub with the real page; banner code untouched. |
| `frontend/components/PhotoUploader.tsx` | Existing — adapt per D-06. Either add `cookingLogId?: string` prop alongside `recipeId`, OR extract a `PhotoUploaderBase` component. Planner picks the cleaner abstraction. Endpoint branching: if `cookingLogId` → `POST /api/cooking-logs/{id}/photos`; else → existing `POST /api/recipes/{id}/photos`. |
| `frontend/components/RecipeCard.tsx` | Existing — mutated in Phase 4: photo source becomes `last_cooked_photo_path ?? photo_paths[0]`. Single-line change to the `firstPath` derivation. Renders unchanged otherwise. |
| `frontend/components/VoiceInput.tsx` | Existing (Phase 2) — reused as the mic button on the finalize-page notes field. Live-transcript italic stays reserved-for-this-only; once committed, transcript is plain text in the textarea. |
| `frontend/lib/i18n/fr.json` | All Phase-4 user-facing strings land here under new keys (`cooking_log.finalize.*`, `cooking_log.rating.*`, `cooking_log.notes.*`). |
| Lucide icons (`lucide-react`) | Existing dep. Phase 4 adds: `Heart` (rating: loved — already in Phase 3 vocab), `ThumbsUp` (rating: liked), `Meh` (rating: disliked), `Mic` (notes voice — already in Phase 2 vocab), `Camera` (photo section heading — optional). No new icon library. |

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | **shadcn/ui** (initialized in Phase 1, `components.json` present) | `frontend/components.json` |
| Preset | **radix-nova** style with `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide` | inherited |
| Component library | **shadcn/ui** primitives (Radix UI under the hood); 15 primitives already pasted into `components/ui/` — Phase 4 adds **zero** new primitives | `frontend/components/ui/` |
| Icon library | **lucide-react** (existing) | shadcn convention |
| Font | **Geist Sans** UI · **Playfair Display** for `.text-display` and `.text-title` (warm-cream theme established quick-260507-hd0). **Phase 4 adds no new font usage.** | inherited |
| CSS architecture | Tailwind v4 + CSS variables in `app/globals.css` `@theme inline` block — **no `tailwind.config.ts`** | inherited |
| i18n | All strings via `next-intl` from `frontend/lib/i18n/fr.json`. **No hardcoded JSX strings.** Per `CLAUDE.md` arch invariant 6 + PWA-04. | inherited |
| Animation library | **framer-motion 12.x** (already installed in Phase 3). **Phase 4 adds no new framer-motion usage.** | inherited |

### Phase 4 token additions

**Zero new color tokens.** The 3-value rating picker reuses existing tokens — `--color-primary` (rose) for `loved` selected state, `--color-validé-tint` (Phase-3 emerald) for `liked` selected state, and `bg-surface-muted` for `disliked` selected state. See §Color for the full mapping.

**Zero new spacing tokens.** Existing 4-multiple subset is sufficient.

**Zero new motion tokens.** The rating picker uses Tailwind v4 utility transitions only (`transition-colors duration-150`).

The discipline: Phase 4 is a polish layer. Adding tokens here would dilute the contracts established in Phases 1–3.

---

## Spacing Scale

**Inherited from `01-UI-SPEC.md` §Spacing Scale unchanged.** Strict 4-multiple subset; `space-1` (4px) → `space-16` (64px). Tap target minimum **48px** in Phase 4 (D-08 raises the bar from the inherited 44px floor — see §Touch Targets below). Page horizontal padding `px-6` (24px). Form-field gap `gap-4` (16px). Section gap `gap-6` (24px).

### Phase 4 spacing exceptions

| Exception | Value | Rationale |
|-----------|-------|-----------|
| Rating picker card height | `h-20` (80px) | Three large tappable cards in a vertical stack (D-specifics). 80px gives a generous mobile-friendly target with room for icon + label + helper text. Above the 48px minimum. |
| Rating picker card gap (between the 3 cards) | `gap-3` (12px) | Tight stacking — cards visually grouped as a single picker. 12px is on the 4-grid. |
| Rating picker icon size | 28px | Larger than the inherited 24px default — these icons are the primary affordance. |
| Photo section heading bottom gap | `mb-4` (16px) | Standard section gap before the `PhotoUploader` 2x2 grid. |
| Voice mic button height (next to notes textarea) | `h-12 w-12 rounded-full` (48px) | Above the 48px Phase-4 minimum. Inherits the Phase-2 `VoiceInput` button sizing. |
| Notes textarea min-height | `min-h-32` (128px) | ~5 lines of body copy at default text size. Comfortable for dictated notes without being a wall. |
| Notes textarea + mic button gap | `gap-2` (8px) | Mic button sits to the right of (or above on narrow viewports) the textarea. |
| Finalize page section gap | `gap-8` (32px) | Generous breathing room between Photos / Rating / Notes blocks on a single-scroll page. Reads as 3 distinct sections without dividers. |
| Recipe-card living-image swap | (no spacing change) | The image source switches; the 16x16 thumbnail + rounded-lg classes are unchanged. |

---

## Typography

**Inherited from `01-UI-SPEC.md` §Typography unchanged.** 4 sizes (Body 16/24, Label 14/20, Heading 20/28, Display 28/34). 2 weights (400, 600) + Label-only 500. Geist Sans default; `text-display` / `text-title` utilities in `globals.css` are Playfair Display.

### Phase 4 typography additions

| Surface | Class string | Notes |
|---------|--------------|-------|
| Finalize page title | `text-title text-foreground` (Playfair Display, 1.375rem, 600, line-height 1.25) | Same as section titles in `/recipes/{id}` and the home shortlist card front. Editorial register: this is a moment-of-completion screen. |
| Finalize page section heading (Photos / Rating / Notes) | `text-base font-semibold leading-6` | Body+600. Reuses inherited Heading-Body register. Same as recipe-detail field labels. |
| Finalize page section helper copy | `text-sm text-foreground-muted leading-5` | E.g. `Optionnel — jusqu'à 4 photos.`, `Comment c'était ?`, `Tu peux dicter avec le micro.` |
| Rating-picker card label | `text-base font-semibold leading-6` | E.g. `Adoré`, `Bien`, `Passable`. Body+600 — these are the primary affordance labels. |
| Rating-picker card helper (sub-label, optional) | `text-xs text-foreground-muted leading-4` | E.g. `On la refait` / `Pas mal` / `On évite`. Caption role. **Optional** — the planner may omit if the icon + label is clear enough. |
| Notes textarea | (inherited from `Textarea` shadcn primitive — `text-base leading-6`) | Reuses the existing `frontend/components/ui/textarea.tsx` styles. No override. |
| Live-transcript while dictating (notes mic) | `italic text-foreground-muted` | **Inherited from Phase 2 — the SINGLE allowed italic surface.** Live transcript flows in italic, then commits to the textarea as plain text. No new italic usage in Phase 4. |
| Recipe-card meta (unchanged) | `text-sm text-foreground-muted` | Inherited. The card living-image swap doesn't touch typography. |
| Validé pill on summary row (unchanged) | `text-sm font-medium leading-5` | Inherited from Phase 3. |

**No new `.text-*` utility added in Phase 4.** No new italic surface.

---

## Color

**Inherited from `01-UI-SPEC.md` §Color and the warm-cream theme.** 60/30/10 palette, brand-rose accent (`--color-primary` ≈ `#F43F5E`), `--color-destructive` for errors, `--color-validé-tint` (Phase-3 emerald) for "in progress / approved" surfaces, light + dark via `prefers-color-scheme`.

### Phase 4 color usages (composing existing tokens — zero new tokens)

| Element | Token | Usage |
|---------|-------|-------|
| Finalize page background | `bg-background` | Inherited. Same warm-cream as every other route. |
| Finalize page section card background (Photos / Rating / Notes blocks) | none — sections are whitespace-separated, not card-wrapped | Single-scroll page; the structure is **flat** (no nested cards). Visual hierarchy comes from gap-8 spacing + section headings, not borders. |
| Rating-picker card — unselected | `bg-card border border-border text-foreground` + `shadow-card` | Identical to a standard recipe-row card. Neutral resting state. |
| Rating-picker card — `loved` selected | `bg-surface-rose-100 border-2 border-primary text-primary` + `shadow-card` | Reuses the existing `--surface-rose-100` (faint warm-rose tint, established quick-260507-hd0) + brand-rose border. Heart icon at `text-primary`. |
| Rating-picker card — `liked` selected | `bg-validé-tint border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300` + `shadow-card` | Reuses Phase-3's `--color-validé-tint` (emerald) — same hue as Validé / "En train de cuisiner" banner. ThumbsUp icon at `text-emerald-700`. |
| Rating-picker card — `disliked` selected | `bg-surface-muted border-2 border-foreground-muted text-foreground` + `shadow-card` | Neutral grey selection — `disliked` is intentionally not loud. Meh icon at `text-foreground-muted`. |
| Rating-picker card — focus ring (keyboard) | `ring-2 ring-ring ring-offset-2 ring-offset-background` | Inherited shadcn focus pattern. **Phase 4 polish requirement (D-08).** |
| Rating-picker card — pressed/active | `active:scale-[0.98] transition-transform duration-100` | Subtle press feedback on tap. |
| Notes textarea | `bg-card border border-input` (inherited from `Textarea` primitive) | No override. |
| Notes mic button — idle | `bg-secondary text-secondary-foreground` (inherited from `Button variant="secondary"`) | Resting state. |
| Notes mic button — recording | `bg-destructive text-destructive-foreground` | **Inherited Phase-2 reserved usage** for the recording-mic background. Same as the voice-capture mic on `/recipes/new?mode=voice`. |
| Photo section — `PhotoUploader` (existing) | (inherited unchanged) | The 2x2 grid styles, dashed-border add-tile, signed-URL fallback to `bg-surface-muted` placeholder all carry over. |
| `Finaliser` submit button (page bottom) | `bg-primary text-primary-foreground` (variant="default") | Brand-rose primary CTA. Inherited. |
| `Finaliser` submit button — disabled (no rating selected) | `bg-primary/50 text-primary-foreground cursor-not-allowed` (inherited shadcn disabled state) | The button is the single explicit gate per D-03 (rating required). |
| Recipe-card living-image — present | (existing `<img>` styles, src now from `last_cooked_photo_path` signed URL) | No color change. |
| Recipe-card living-image — fallback to recipe `photo_paths[0]` | (same existing `<img>` styles) | No color change. |
| Recipe-card living-image — both null (placeholder) | `bg-surface-muted` (inherited) | Unchanged. |

### Reserved-for list (additions to Phase 1 / 2 / 3 accent contracts)

The 10% accent (`--color-primary`, brand rose) gains **one** new reserved usage in Phase 4:

1. **Rating-picker `loved` selected state** — border + icon color + background tint (via the existing `--surface-rose-100` token).

The `--color-validé-tint` (Phase-3 emerald) gains **one** new reserved usage in Phase 4:

2. **Rating-picker `liked` selected state** — background tint + emerald-500 border + emerald-700/300 icon.

The `--color-destructive` token gains **no** new usages in Phase 4. The notes-mic recording background reuses the Phase-2 reserved-for ("recording-mic background") — same surface, different page.

**Rationale:** The 3-value rating picker is the single new surface that requires color SEMANTICS (love / like / dislike). Reusing existing tokens (rose / emerald / neutral) keeps the palette coherent: love-this maps to brand-rose (the app's affection), liked maps to Validé-emerald (the same "approved" semantic from Phase 3), disliked maps to neutral grey (deliberately quiet — we're not punishing). No new color is introduced.

**Member-color hues** continue to carry member identity exclusively (via `MemberDot`). The rating picker does NOT use member colors — ratings are per-log, not per-member in v0.1 (per-member ratings = V2-MODEL-01, deferred).

---

## Copywriting Contract

All Phase-4 strings land in `frontend/lib/i18n/fr.json` under new keys. Voice register inherited: informal `tu`, warm-domestic, sentence-case, no exclamation marks except celebratory.

### Primary CTAs (verb-first)

| Surface | CTA copy | i18n key |
|---------|----------|----------|
| Finalize page — submit button | `Finaliser` (locked from Phase-3 cooking-banner — same word, same meaning) | `cooking_log.finalize.submit` |
| Finalize page — submit button while submitting | `Enregistrement…` | `cooking_log.finalize.submitting` |
| Finalize page — header back button | (inherited Next.js back; aria-label `Retour`) | `common.back` |
| Notes mic button — start dictation (aria-label) | `Dicter les notes` | `cooking_log.notes.mic_start_aria` |
| Notes mic button — stop dictation (aria-label) | `Arrêter la dictée` | `cooking_log.notes.mic_stop_aria` |

CTA convention (extends Phase-1 / 2 / 3 lock):
- `Finaliser` is the locked phrase from the Phase-3 cooking-banner — Phase 4 owns the destination but the verb stays. Never paraphrase.
- The submit button has **no icon** (inherited from finalize-context — the page itself is the celebration; the button is workmanlike).

### Section headings (locked)

| Surface | Copy | i18n key |
|---------|------|----------|
| Finalize page — page title | `Finaliser la cuisson` | `cooking_log.finalize.page_title` |
| Finalize page — recipe title (subhead) | `« {title} »` (French guillemets with non-breaking spaces — match Phase-2/3 quotation style) | `cooking_log.finalize.recipe_subhead` |
| Photos section heading | `Photos` | `cooking_log.finalize.photos_heading` |
| Photos section helper | `Optionnel — jusqu'à 4 photos de ton plat.` | `cooking_log.finalize.photos_helper` |
| Rating section heading | `Comment c'était ?` | `cooking_log.finalize.rating_heading` |
| Rating section helper | `Choisis une note pour pouvoir finaliser.` (visible until rating is picked; hidden once selected) | `cooking_log.finalize.rating_helper` |
| Notes section heading | `Notes` | `cooking_log.finalize.notes_heading` |
| Notes section helper | `Tu peux dicter avec le micro.` | `cooking_log.finalize.notes_helper` |
| Notes textarea placeholder | `Comment elle a tourné ? À refaire ? À ajuster ?` | `cooking_log.finalize.notes_placeholder` |

### Rating vocabulary (locked — exact strings, French)

The 3 enum values map to French labels. **Locked** — never paraphrase. The enum stays in English in the database / API (`loved`/`liked`/`disliked`) per SPEC.md; only the display copy is French.

| Enum value | Display label | Display sub-label (optional caption) | Icon | i18n key |
|------------|---------------|--------------------------------------|------|----------|
| `loved` | `Adoré` | `On la refait sans hésiter` | `Heart` (filled, 28px) | `cooking_log.rating.loved` / `cooking_log.rating.loved_helper` |
| `liked` | `Bien` | `C'était bon` | `ThumbsUp` (28px) | `cooking_log.rating.liked` / `cooking_log.rating.liked_helper` |
| `disliked` | `Passable` | `On évite la prochaine fois` | `Meh` (28px) | `cooking_log.rating.disliked` / `cooking_log.rating.disliked_helper` |

**Why `Passable` and not a stronger negative?** Per SPEC.md the rating is a decision-relevant signal, not a punishment. `Passable` ("acceptable, but…") is honest French for a meal that didn't shine. Avoids the implicit aggression of `Détesté` / `Mauvais`.

The sub-label captions are **OPTIONAL** — the planner may render them under the main label OR omit them entirely if the icon + label feels clean enough. Both are inside spec. Recommend rendering them for first-time-user clarity; consider hiding once user has finalized 3+ logs (productize-later — not Phase 4).

### Empty states (Phase 4 surfaces)

| Surface | Heading | Body | CTA |
|---------|---------|------|-----|
| Finalize page — log not found / not yours / already finalized | `Cette cuisson n'est plus disponible` | `Elle a peut-être déjà été finalisée, ou elle appartient à un autre foyer.` | `Retour à l'accueil` (links to `/`) |
| Finalize page — log loading | (Skeleton — see §Loading) | (no copy) | (none) |
| Recipe library — no recipes (inherited from Phase 1) | (unchanged) | (unchanged) | (unchanged) |

**The Phase-3 `/cooking-logs/{id}/finalize` STUB EmptyState is REPLACED by the real finalize page in Phase 4.** The stub's `Finalisation à venir` heading is removed; its i18n keys (`home.finalize_stub.*`) become unused and should be deleted from `fr.json` during Phase 4 cleanup.

### Error states

Inherited toast vs inline rules from Phase 1 + 2 + 3. Phase 4 additions:

| Surface | Copy | Placement | i18n key |
|---------|------|-----------|----------|
| `PUT /api/cooking-logs/{id}` network error | `Enregistrement impossible. Réessaie.` | Toast `variant="destructive"` | `cooking_log.finalize.save_failed` |
| `PUT /api/cooking-logs/{id}` 404 (log gone — partner deleted? rare) | `Cette cuisson n'existe plus.` | Toast default + page navigates back to `/` after 2s | `cooking_log.finalize.save_404` |
| `PUT /api/cooking-logs/{id}` 403 (not your household — should never happen but defensive) | `Tu n'as pas accès à cette cuisson.` | Toast `variant="destructive"` + page navigates to `/` | `cooking_log.finalize.save_403` |
| `POST /api/cooking-logs/{id}/photos` 413 (file too large) | `Photo trop lourde.` | Toast `variant="destructive"` | `cooking_log.finalize.photo_size` (or reuse existing `photo_uploader.error_size`) |
| `POST /api/cooking-logs/{id}/photos` 415 (bad MIME) | `Format de photo non pris en charge.` | Toast `variant="destructive"` | `cooking_log.finalize.photo_type` (or reuse `photo_uploader.error_type`) |
| `POST /api/cooking-logs/{id}/photos` 409 (limit) | `Maximum 4 photos.` | Toast `variant="destructive"` | reuse `photo_uploader.error_limit` |
| `POST /api/cooking-logs/{id}/photos` other failure | `Échec de l'envoi de la photo.` | Toast `variant="destructive"` | reuse `photo_uploader.error_network` |
| Web Speech API not available (no browser support) | `La dictée vocale n'est pas disponible sur ce navigateur.` (mic button hidden, helper updated to: `Saisis tes notes ci-dessous.`) | Inline (helper text swap) — no toast | `cooking_log.notes.speech_unavailable` |
| Web Speech API permission denied | `Autorise le micro dans les réglages du navigateur pour dicter.` | Toast default | `cooking_log.notes.speech_denied` |
| Offline submit attempt | `Hors ligne. Réessaie une fois connecté.` | Toast default (informational) | `cooking_log.finalize.offline` |

**Reuse rule:** photo-upload errors **reuse** the existing `photo_uploader.*` i18n keys when the message is identical. Only new keys are added when the cooking-log context changes the wording (e.g. the 404 / 403 cases that don't apply to recipe photos).

### Success notifications

Inherited Sonner pattern. Phase 4 adds:

| Trigger | Copy | Variant | i18n key |
|---------|------|---------|----------|
| `PUT /api/cooking-logs/{id}` succeeds (finalization complete) | `Bien enregistré.` (calm — the navigation back to Home + the cooking-banner disappearing IS the celebration) | default | `cooking_log.finalize.toast_saved` |
| Photo uploaded successfully on finalize page | (no toast — silent; the photo appearing in the grid IS the feedback, same as recipe-photo upload Phase 1) | n/a | n/a |
| Voice-dictation transcript committed to textarea | (no toast — silent; the text appearing IS the feedback, same as Phase-2 voice-capture) | n/a | n/a |

**Tone discipline:** `Bien enregistré.` is intentionally soft. The user already knows it worked because the page goes back to Home and the banner is gone. A loud celebration toast (`Bravo !`, `C'est sauvegardé !`) would feel patronizing in a couple-scale app where this happens 3-7× per week.

### Destructive confirmations (Phase 4)

**Zero new `AlertDialog`-gated destructive surfaces in Phase 4.**

The finalize page has no destructive action — `PUT /cooking-logs/{id}` is an upsert (creates the rating/notes; allows future re-finalize per CONTEXT.md "future re-finalize" allowance, though re-finalize UX is productize-later). Photo removal on the finalize page reuses the existing `PhotoUploader` undo-toast pattern (no AlertDialog).

### Locked phrases (additions to Phase 1 / 2 / 3 lock)

| Phrase | Locked usage | Source |
|--------|--------------|--------|
| `Finaliser la cuisson` | Finalize-page title only | Phase 4 |
| `Adoré` / `Bien` / `Passable` | Rating-picker labels only | Phase 4 — French translations of the SPEC.md `loved`/`liked`/`disliked` enum |
| `Bien enregistré.` | Finalize success toast only | Phase 4 |

---

## Component Inventory (Phase 4 additions)

### shadcn/ui primitives — already pasted, reused as-is

`button`, `input`, `label`, `tabs`, `sheet`, `dialog`, `alert-dialog`, `sonner`, `scroll-area`, `separator`, `skeleton`, `badge`, `card`, `select`, `textarea`. **Phase 4 adds zero new shadcn primitives.**

> **Note on shadcn registry safety:** `frontend/components.json` has `"registries": {}` — only the official shadcn registry is in use. Phase 4 does not introduce any third-party registry. The Registry Safety table reflects this.

### App-composed components — Phase 4 introduces

Pasted under `frontend/components/`. Names locked here so the planner uses these exact filenames.

| Component | Purpose | Composition / Notes |
|-----------|---------|---------------------|
| `RatingPicker.tsx` | Three large tappable cards in a vertical stack: Adoré / Bien / Passable. Selected state visually distinct (border + tinted background per §Color). | Composes `Button` (variant outline) — OR raw `<button>` if `Button` doesn't compose well. Each card is `h-20`, full-width, has icon + label + optional helper. `aria-pressed` bound. Single-select; tapping a different card flips selection. Tapping the same card a second time does NOT clear (the field is required). |
| `CookingLogFinalize.tsx` | The main client-component for the finalize page. Holds form state (photos, rating, notes) + submit handler. | Renders `PhotoUploader` (cooking-log mode) + `RatingPicker` + `Textarea` with `VoiceInput` mic. `Finaliser` button at the bottom is disabled until `rating !== null`. Single-scroll page — no tabs, no steps. |

### App-composed components — Phase 4 mutates

| Component | Mutation | Why |
|-----------|----------|-----|
| `RecipeCard.tsx` | `firstPath` derivation changes from `recipe.photo_paths[0] ?? ""` to `recipe.last_cooked_photo_path ?? recipe.photo_paths[0] ?? ""`. Single-line edit. | D-05 — recipe card shows last cooking-log photo as primary image. Falls back to static recipe photo, then placeholder. |
| `PhotoUploader.tsx` | Per D-06: either accept a new `cookingLogId?: string` optional prop (alongside existing `recipeId`), branching the upload URL to `/api/cooking-logs/{id}/photos` when present; OR extract a shared `PhotoUploaderBase` component that both `recipes/{id}/edit` and `cooking-logs/{id}/finalize` consume. **Planner picks** the lower-complexity path; no UI-SPEC preference. | D-06 — cooking-log photos use a different endpoint but identical UX (2x2 grid, max 4, signed-URL preview). |
| `ShortlistCard.tsx` | Rewrite `useEffect` setState pattern to `useSyncExternalStore` to fix the deferred Phase-3 lint error at `ShortlistCard.tsx:50`. | D-09 — Phase-3 deferred lint cleanup. Reference implementation: `PushPermissionBanner.tsx`. **No visual change** — pure refactor. |
| `HomeDecide.tsx` | Remove unused `eslint-disable` directive at line 169:11. Remove unused `_e` parameter at line 229:31. | D-09 — Phase-3 deferred lint warnings. **No visual change** — pure cleanup. |
| `frontend/lib/votes.ts` | Remove unused `eslint-disable` at line 94:5. | D-09 — Phase-3 deferred lint cleanup. |

### App-composed components — Phase 4 removes

| Component | Why |
|-----------|-----|
| `frontend/app/cooking-logs/[id]/finalize/page.tsx` (Phase-3 stub `EmptyState`) | Replaced by the real finalize page (a server-component shell wrapping `CookingLogFinalize.tsx` client-component). |
| `home.finalize_stub.*` keys in `frontend/lib/i18n/fr.json` | Stub no longer exists; keys become dead. Delete during Phase-4 cleanup. |

### Realtime handler additions (existing component mutations)

| File | Mutation | Required? |
|------|----------|-----------|
| `RealtimeProvider.tsx` | **Optional** — `cooking.finalized` event handler. CONTEXT.md `<deferred>` notes this is "not in requirements but trivial to add." If included: when received, the partner's home invalidates the active-cooking-log cache so the `CookingBanner` disappears in real-time. If omitted: the banner clears on the next manual page-load / SWR revalidation. | **Optional — planner picks.** Recommended: include if the backend planner adds the broadcast. The architecture invariant #4 ("any new mutation that should sync between phones must broadcast") suggests YES, but the impact is small (banner refresh delay of a few seconds, not data loss). |
| `RealtimeProvider.tsx` | `recipe.updated` event handler **may** be reused on the finalize success path so the recipe-card living-image refreshes immediately on the partner's phone. If the backend emits a `recipe.updated` event after the `last_cooked_photo_path` UPDATE, this is automatic. | Recommended (planner decides backend shape). |

### Iconography (Phase 4 additions)

Lucide icons only. Phase 4 vocabulary additions:

| Icon | Used for |
|------|----------|
| `Heart` (filled) | Rating-picker `loved` icon (28px). NB: Phase 3 already uses outline `Heart` for the swipe-deck yes button — this Phase-4 use is the FILLED variant via `fill="currentColor"`. **Disambiguation:** the filled vs outline distinction carries meaning (rating = filled, vote = outline). |
| `ThumbsUp` | Rating-picker `liked` icon (28px). |
| `Meh` | Rating-picker `disliked` icon (28px). NB: Lucide's `Meh` is a flat-mouth face; appropriate for "passable" since it conveys neutral without being negative. |
| `Mic` | Notes voice-dictation button (24px inside h-12 button). Already in Phase-2 vocabulary (voice-capture page) — Phase 4 adds no new mic surface beyond the new finalize-page placement. |
| `Camera` | (Optional) Photos section heading icon. May be omitted if the section heading copy alone is clear. |
| `MicOff` | (Recording state — already in Phase-2 vocab.) When recording, the `Mic` button swaps to `MicOff` to signal "tap to stop." Inherited. |

Sizes: 16px (inline meta), 20px (default), 24px (button leading icon, mic button), 28px (rating-picker primary affordance), 48px (empty-state hero — inherited).

---

## Layout & Navigation

### Bottom navigation (PWA shell)

**Unchanged.** D-01 (Phase 3) explicit: 4 tabs (Home / Recipes / Inbox / Settings), no 5th tab. Per `04-CONTEXT.md`: "BottomNav stays unchanged." The finalize page renders **inside** the existing `<main>` shell; the bottom nav stays visible.

### Routes (App Router) — Phase 4

Phase 4 adds **zero new routes**. It REPLACES the Phase-3 stub at `/cooking-logs/[id]/finalize` with the real page.

| Route | Purpose | Has bottom nav? | Phase |
|-------|---------|-----------------|-------|
| `/cooking-logs/[id]/finalize` | Cooking-log finalization (real, Phase 4) | Yes | 3 (stub) → 4 (real) |
| `/recipes/[id]` | Recipe detail (Phase 1, mutated by D-05 to render `last_cooked_photo_path` as the hero photo when present) | Yes | 1 → 4 (mutation) |
| `/recipes` | Recipe list (Phase 1, mutated by D-05 — `RecipeCard` shows living image) | Yes | 1 → 4 (mutation) |
| `/inbox` | Drafts inbox (Phase 1, unchanged in Phase 4) | Yes | 1 |
| `/settings` | Settings (Phase 1, unchanged in Phase 4) | Yes | 1 |

### Finalize page content tree (NEW)

```
<OnboardingGuard>
  <main className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-8">

    {/* Header — page title + recipe subhead */}
    <header className="flex flex-col gap-1">
      <h1 className="text-title">Finaliser la cuisson</h1>
      <p className="text-base text-foreground-muted line-clamp-1">« {recipeTitle} »</p>
    </header>

    {/* Photos section */}
    <section className="flex flex-col gap-4" aria-labelledby="photos-heading">
      <div className="flex flex-col gap-1">
        <h2 id="photos-heading" className="text-base font-semibold leading-6">Photos</h2>
        <p className="text-sm text-foreground-muted leading-5">Optionnel — jusqu'à 4 photos de ton plat.</p>
      </div>
      <PhotoUploader cookingLogId={logId} paths={photoPaths} onChange={setPhotoPaths} />
    </section>

    {/* Rating section */}
    <section className="flex flex-col gap-4" aria-labelledby="rating-heading">
      <div className="flex flex-col gap-1">
        <h2 id="rating-heading" className="text-base font-semibold leading-6">Comment c'était ?</h2>
        {!rating && (
          <p className="text-sm text-foreground-muted leading-5">Choisis une note pour pouvoir finaliser.</p>
        )}
      </div>
      <RatingPicker value={rating} onChange={setRating} />
    </section>

    {/* Notes section */}
    <section className="flex flex-col gap-4" aria-labelledby="notes-heading">
      <div className="flex flex-col gap-1">
        <h2 id="notes-heading" className="text-base font-semibold leading-6">Notes</h2>
        <p className="text-sm text-foreground-muted leading-5">Tu peux dicter avec le micro.</p>
      </div>
      <div className="flex items-start gap-2">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Comment elle a tourné ? À refaire ? À ajuster ?"
          className="min-h-32 flex-1"
        />
        <VoiceInput onTranscript={(t) => setNotes((prev) => prev + t)} />
      </div>
    </section>

    {/* Submit */}
    <div className="flex flex-col gap-3 pt-4">
      <Button
        type="submit"
        size="lg"
        disabled={!rating || submitting}
        onClick={handleSubmit}
        className="h-12"
      >
        {submitting ? "Enregistrement…" : "Finaliser"}
      </Button>
    </div>

  </main>
</OnboardingGuard>
```

**Note on `VoiceInput` placement:** the Phase-2 `VoiceInput` component renders a mic button. Phase 4 places it **adjacent to** the textarea (right side on wide viewports, possibly below on narrow — the planner adapts via Tailwind responsive classes if needed). The transcript flows into the textarea via `onTranscript` callback, appended to existing notes (so the user can mix typed + dictated text).

### Recipe-card living image (D-05) — surface map

The `last_cooked_photo_path` field surfaces in:

| Surface | Behavior |
|---------|----------|
| `/recipes` list (`RecipeCard`) | 16x16 thumbnail uses `last_cooked_photo_path ?? photo_paths[0] ?? placeholder` |
| `/recipes/[id]` detail | Hero photo (or photo strip if multiple) PRIORITIZES `last_cooked_photo_path` as the first photo. Recipe `photo_paths` follows. **Planner decides** the exact composition: option A — `last_cooked_photo_path` becomes the hero, `photo_paths` is the "recipe references" gallery below; option B — they're merged into a single carousel with `last_cooked_photo_path` first. Both are inside spec. |
| `/inbox` (`RecipeDraftCard`) | **Unchanged** — drafts have no cooking history, so `last_cooked_photo_path` is null by definition. No mutation. |
| Shortlist card (`ShortlistCard`) | **Mutated** — same priority order: `last_cooked_photo_path ?? photo_paths[0] ?? placeholder`. Reinforces the "this recipe has a track record" cue at vote time. |

### Responsiveness

Inherited from Phase 1 (`max-w-md` cap on `<main>`, mobile-first 390pt baseline). Finalize page works at 360px wide minimum — rating-picker cards stack vertically, never become a horizontal row.

### Safe-area insets

Inherited from Phase 1. The finalize page sits inside `<main>` which already respects `pb-[env(safe-area-inset-bottom)]` via the bottom-nav offset. Submit button sits in normal flow above the bottom nav — `pb-24` (96px) bottom padding ensures it doesn't slide under the nav.

---

## Interaction Patterns

### Rating-picker selection

- Three cards rendered in a vertical stack (`flex flex-col gap-3`).
- Each card is a button (`<button type="button">` or shadcn `<Button asChild>`) — full keyboard + screen-reader support.
- Single-select: tapping a card sets `rating` to its value; tapping the same card again does NOT clear (the field is required per D-03).
- Selected state: border becomes `border-2 border-{color}` (rose / emerald / muted); background tints to `bg-{tint}`; icon color saturates.
- Unselected state: `bg-card border border-border` (matches resting recipe-row card).
- Focus ring: visible `ring-2 ring-ring ring-offset-2` on keyboard focus (D-08 polish requirement).
- Press feedback: `active:scale-[0.98] transition-transform duration-100` — subtle tap acknowledgement.
- `aria-pressed={isSelected}` on each card so screen readers announce selected state.

### Voice notes dictation

- Inherited from Phase 2. Tap mic button → `Web Speech API` starts recording (continuous mode, French `fr-FR` lang). Live transcript renders in the placeholder area (or below textarea — planner picks) in italic + muted color while interim.
- Final transcript (after pause / second tap) is appended to the textarea value at the cursor position (or end if no cursor — simpler).
- Mic button color shifts to `bg-destructive` while recording (inherited Phase-2 reserved usage).
- If Web Speech is unavailable: mic button is hidden, helper copy swaps to `Saisis tes notes ci-dessous.` (no JavaScript error popup).

### Submit gating

- `Finaliser` button is disabled (`disabled={!rating || submitting}`) until a rating is selected.
- The disabled state is BOTH visual (opacity, cursor-not-allowed) AND functional (button doesn't respond to clicks).
- Helper text under the rating-picker (`Choisis une note pour pouvoir finaliser.`) hides once a rating is selected — visual reinforcement that the gate is cleared.
- On submit success: navigate to `/` via `router.push("/")` (per D-04). Show toast `Bien enregistré.` AFTER navigation (so the toast appears on Home, where the user lands).
- On submit failure: stay on page; toast destructive variant per §Error states.

### Toast vs inline rules (Phase 4 additions)

| Situation | Pattern |
|-----------|---------|
| Finalize success | Toast (default, `Bien enregistré.`) — fired post-navigation on Home |
| Finalize network error | Toast (destructive) — stay on page |
| Photo upload failure on finalize | Toast (destructive) — reuse existing `PhotoUploader` toast keys where applicable |
| Voice-dictation permission denied | Toast (default — informational) |
| Voice-dictation transcript committed | No toast (silent, the text appearing IS the feedback) |
| Recipe-card living-image swap (after partner finalizes) | No toast (silent, the image refreshes via `recipe.updated` realtime — feels magical without being noisy) |

### Confirmation patterns

Inherited. **Zero new `AlertDialog` confirmations in Phase 4.** Photo removal on the finalize page reuses the `PhotoUploader` undo-toast pattern (no AlertDialog).

### Tap targets (D-08 polish requirement — RAISED FLOOR)

**Phase 4 raises the inherited tap-target floor from 44×44px to 48×48px** for any NEW interactive surface introduced in Phase 4. Existing components that fall below 48px are surveyed and adjusted opportunistically:

| Surface | Current | Phase-4 minimum |
|---------|---------|-----------------|
| Rating-picker card | `h-20` (80px) | ≥ 48px ✓ (well above) |
| Voice mic button (notes) | `h-12 w-12` (48px) | = 48px ✓ |
| `Finaliser` submit button | `h-12` (48px) — UPGRADED from inherited `h-11` (44px) for Phase-4 floor | = 48px ✓ |
| Photo-section "+" tile | `h-24 w-24` (96px) | ≥ 48px ✓ (inherited) |
| Photo "X" remove overlay | `h-6 w-6` (24px — overlay on photo) | **EXCEPTION** — overlays on tightly-packed grids may stay ≤48px provided the parent tile is ≥48px AND a parallel keyboard-accessible alternative exists (in this case, focusing the photo announces the X via aria-label). Inherited Phase-1 disposition. |
| BottomNav tabs | (inherited Phase 1; ≥ 48px ✓) | = 48px ✓ |
| Existing buttons across the app (audit) | Various — most are `h-9 to h-11` (36-44px) | **NOT raised globally in Phase 4.** Only NEW Phase-4 surfaces and any surface the planner is already touching get the upgrade. A full app-wide audit is productize-later. |

The discipline: raising the floor app-wide would scope-creep Phase 4. New work must comply; existing work gets the upgrade only when touched.

### Visible focus rings (D-08 polish requirement — NEW)

All NEW interactive Phase-4 surfaces MUST render a visible focus ring on keyboard focus:

- **Token:** `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none`
- The shadcn `Button` and `Input` primitives ship with this baked in. **Custom `<button>` elements** in `RatingPicker.tsx` MUST add it manually.
- `focus-visible:` (not `focus:`) — only show on keyboard focus, not on touch / mouse click.
- The `--color-ring` token is brand-rose (inherited Phase 1) — focus rings are visually consistent across the app.

The same lint pass that fixes `ShortlistCard` is the right moment to grep for any `<button>` (raw) without focus-visible classes; planner adds them opportunistically (per D-10's productize-later sweep philosophy).

### Color contrast (D-08 polish requirement)

All Phase-4 text-on-surface combinations MUST pass WCAG-AA contrast (4.5:1 for body, 3:1 for large text). The new surfaces:

| Combination | Light mode | Dark mode | Status |
|-------------|------------|-----------|--------|
| `text-primary` on `bg-surface-rose-100` (loved-selected card) | rose-600 on rose-100 | rose-300 on rose-rose-100-dark | ✓ passes (verified in Phase 1) |
| `text-emerald-700` on `bg-validé-tint` (liked-selected card) | emerald-700 on emerald-100 | emerald-300 on emerald-900 | ✓ passes (verified in Phase 3) |
| `text-foreground` on `bg-surface-muted` (disliked-selected card) | zinc-900-ish on warm-cream-darker | zinc-100-ish on warm-cream-dark | ✓ passes (inherited) |
| `text-foreground-muted` on `bg-card` (rating helper copy) | warm-grey-500 on warm-cream-card | warm-grey-400 on warm-cream-dark-card | ✓ passes (inherited Phase 1) |
| `text-destructive-foreground` on `bg-destructive` (recording-mic button) | white on rose-600-saturated | white on rose-700-saturated | ✓ passes (inherited Phase 2) |

If the executor finds a contrast failure during implementation, escalate to UI-SPEC update — do NOT silently desaturate or darken without spec permission.

### Offline behavior (D-07)

Per `04-CONTEXT.md` D-07: **app shell only**, no API caching.

| State | Expected behavior |
|-------|-------------------|
| User opens app while offline | Cached shell renders (HTML, JS, CSS, manifest, icons). Bottom nav visible. Routes navigate. **API-driven content shows loading-then-error states.** |
| `/cooking-logs/{id}/finalize` offline | Page shell renders (heading + sections). API fetch for log details fails → renders `EmptyState` with copy `Cette cuisson n'est plus disponible` (or a more specific offline copy — **planner picks**, recommended: `Tu es hors ligne. Reconnecte-toi pour voir cette cuisson.` with i18n key `cooking_log.finalize.offline_load`). Submit button is disabled. |
| Submit while offline | Toast `Hors ligne. Réessaie une fois connecté.` (informational, default variant). Form state preserved on page — user can retry when reconnected. |
| WebSocket disconnects (Railway free-tier restart) | Inherited Phase-1 reconnect-with-backoff. The "reconnecting" inline indicator (Phase 1) handles the partner-sync recovery. |
| Reconnect while form is dirty | Form state preserved. Submit becomes available again. **No special UX** — the user just notices the network indicator come back. |

**No SWR / React Query offline cache for API responses in Phase 4.** That is productize-later (would require careful invalidation). The app-shell-only contract matches PWA-02 acceptance criteria literally.

---

## Surface-by-Surface Pinning

This section pins concrete utility-class strings the planner can drop into `acceptance_criteria`. Format: `<Surface>` → key elements with classes.

### 1. Finalize page — server-component shell

```
- File:  frontend/app/cooking-logs/[id]/finalize/page.tsx
- Wraps:  <OnboardingGuard><CookingLogFinalize logId={id} /></OnboardingGuard>
- Server-component fetches initial cooking-log details server-side OR delegates entirely to client; planner picks. Recommended: client fetch via SWR-style hook for simplicity.
```

### 2. Finalize page — main client component (CookingLogFinalize.tsx)

```
- Outer:  flex flex-col flex-1 px-6 pt-6 pb-24 gap-8
- Header block:  flex flex-col gap-1
   - h1 "Finaliser la cuisson":  text-title text-foreground
   - p « {recipeTitle} »:  text-base text-foreground-muted line-clamp-1
- Photos section:  flex flex-col gap-4 (aria-labelledby="photos-heading")
   - Heading block flex flex-col gap-1
      - h2 "Photos":  text-base font-semibold leading-6
      - p "Optionnel — jusqu'à 4 photos de ton plat.":  text-sm text-foreground-muted leading-5
   - <PhotoUploader cookingLogId={logId} paths={photoPaths} onChange={setPhotoPaths} />
- Rating section:  flex flex-col gap-4 (aria-labelledby="rating-heading")
   - Heading block flex flex-col gap-1
      - h2 "Comment c'était ?":  text-base font-semibold leading-6
      - p "Choisis une note pour pouvoir finaliser." (only if !rating):  text-sm text-foreground-muted leading-5
   - <RatingPicker value={rating} onChange={setRating} />
- Notes section:  flex flex-col gap-4 (aria-labelledby="notes-heading")
   - Heading block flex flex-col gap-1
      - h2 "Notes":  text-base font-semibold leading-6
      - p "Tu peux dicter avec le micro.":  text-sm text-foreground-muted leading-5
   - Textarea + mic flex items-start gap-2
      - <Textarea value={notes} placeholder="Comment elle a tourné ? À refaire ? À ajuster ?" className="min-h-32 flex-1" />
      - <VoiceInput onTranscript={...} />  (h-12 w-12)
- Submit block:  flex flex-col gap-3 pt-4
   - <Button size="lg" h-12 disabled={!rating || submitting}>{submitting ? "Enregistrement…" : "Finaliser"}</Button>
```

### 3. RatingPicker.tsx

```
- Outer:  flex flex-col gap-3
- Each card: <button type="button" aria-pressed={selected} className="
     h-20 w-full flex items-center gap-4 px-4 rounded-xl border transition-colors duration-150
     focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none
     active:scale-[0.98] transition-transform duration-100
     {selected
       ? variant === 'loved'    ? 'bg-surface-rose-100 border-2 border-primary text-primary shadow-card'
       : variant === 'liked'    ? 'bg-validé-tint border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-card'
       : /* disliked */           'bg-surface-muted border-2 border-foreground-muted text-foreground shadow-card'
       : 'bg-card border border-border text-foreground shadow-card hover:bg-secondary/50'
     }
   ">
- Icon (28px):  Heart (filled) / ThumbsUp / Meh
- Label block flex-1 flex flex-col items-start gap-0.5 text-left
   - Label "Adoré"/"Bien"/"Passable":  text-base font-semibold leading-6
   - Helper "On la refait sans hésiter" / "C'était bon" / "On évite la prochaine fois":  text-xs text-foreground-muted leading-4 (OPTIONAL — may omit entirely)
```

### 4. Notes section — voice-input integration

```
- Outer:  flex items-start gap-2
- Textarea (shadcn primitive, inherited):
   - className: min-h-32 flex-1
   - placeholder: "Comment elle a tourné ? À refaire ? À ajuster ?"
- VoiceInput (Phase-2 component, inherited):
   - h-12 w-12 rounded-full
   - bg-secondary text-secondary-foreground (idle)
   - bg-destructive text-destructive-foreground (recording)
   - aria-label "Dicter les notes" / "Arrêter la dictée"
   - onTranscript callback appends transcript to notes (or replaces interim with final per Phase-2 contract)
- Live-transcript surface (Phase-2-inherited):
   - Either floats below textarea as italic muted text while interim, OR replaces the textarea placeholder while empty
   - PLANNER PICKS which surface — both are inside spec
```

### 5. Mutated RecipeCard.tsx (D-05 living image)

```
- The single source-line edit:
   const firstPath =
     recipe.last_cooked_photo_path ??
     recipe.photo_paths[0] ??
     "";
- Effect dep array: [recipe.id, firstPath]  (unchanged — firstPath now reflects either source)
- Render: identical to existing — 16x16 thumbnail with bg-surface-muted placeholder fallback.
- TypeScript: Recipe type gains `last_cooked_photo_path: string | null` field (matches backend schema).
```

### 6. Mutated `/recipes/{id}` detail page (D-05 living image — hero)

```
- Hero photo:  uses last_cooked_photo_path as first signed-URL src if present, else first of photo_paths, else placeholder.
- Below hero (optional):  small "À propos de cette photo" caption if living-image is showing — text-xs text-foreground-muted "Photo de la dernière cuisson — {relative date}"
   (Recommended — adds the magic. Planner may include or omit; both are inside spec. If included, i18n key: cooking_log.living_image_caption.)
- Rest of detail page UNCHANGED.
```

### 7. Photo-uploader cooking-log mode (PhotoUploader.tsx mutation)

```
- New optional prop: cookingLogId?: string
- Branch upload URL:
   const url = cookingLogId
     ? `${API_BASE}/api/cooking-logs/${cookingLogId}/photos`
     : `${API_BASE}/api/recipes/${recipeId}/photos`;
- Branch signed-URL fetch: getSignedPhotoUrl helper accepts a "context" arg (recipe or cooking-log) and routes to the right backend endpoint.
- 2x2 grid + dashed-border add-tile + signed-URL preview UNCHANGED.
- ALTERNATIVE: extract a `PhotoUploaderBase.tsx` component that both `PhotoUploader` (recipe mode, kept as a thin wrapper) and a new `CookingLogPhotoUploader.tsx` consume. PLANNER PICKS lower-complexity path.
```

### 8. Lint-fix surfaces (D-09)

```
- ShortlistCard.tsx:50 — useSyncExternalStore rewrite:
   - REPLACE the existing useState + useEffect with prefers-reduced-motion media query
     with useSyncExternalStore subscribing to window.matchMedia("(prefers-reduced-motion: reduce)").
   - Reference: PushPermissionBanner.tsx (existing implementation).
   - NO VISUAL CHANGE — pure refactor.
- HomeDecide.tsx:169 — remove unused eslint-disable directive.
- HomeDecide.tsx:229 — remove unused `_e` parameter (if the handler doesn't need the event arg).
- frontend/lib/votes.ts:94 — remove unused eslint-disable directive.
```

### 9. Cooking-banner — UNCHANGED

```
- frontend/components/CookingBanner.tsx — Phase 3 implementation untouched.
- The "Finaliser" Link still navigates to `/cooking-logs/{id}/finalize`.
- Banner disappearance is driven by:
   - Local: SWR/state invalidation after successful PUT (rating becomes non-null).
   - Realtime (optional): cooking.finalized event triggers cache invalidation on partner's phone.
```

### 10. Empty state — finalize page error / not-found

```
- Reuses <EmptyState /> component:
   - icon: Sparkles (inherited 48px)
   - heading: "Cette cuisson n'est plus disponible"
   - body:    "Elle a peut-être déjà été finalisée, ou elle appartient à un autre foyer."
   - cta: { label: "Retour à l'accueil", href: "/" }
```

---

## Motion

Phase 4 introduces **zero new motion tokens**. Inherited from Phase 1 + 3:

| Token | Duration | Easing | Phase-4 usage |
|-------|----------|--------|---------------|
| `motion-fast` (150ms ease-out) | (inherited) | (inherited) | Rating-picker color-shift on selection |
| `motion-default` (200ms ease-out) | (inherited) | (inherited) | (none new) |
| `motion-slow` (300ms ease-in-out) | (inherited) | (inherited) | (none new) |
| `transition-transform duration-100` | 100ms | (default) | Rating-picker `active:scale-[0.98]` press feedback |

framer-motion: **NOT used in any new Phase-4 surface.** The deck-only scoping from Phase 3 holds.

### `prefers-reduced-motion`

Honored via existing `globals.css` rule (animations + transitions clamped to 0ms). The rating-picker `active:scale-[0.98]` collapses to instant under reduced-motion (the existing CSS rule covers it). No special framer-motion gating needed — Phase 4 doesn't use framer-motion in new surfaces.

---

## Accessibility

Inherited from Phase 1 + 2 + 3. Phase 4 additions / strengthenings:

- **Tap target floor raised to 48px for new Phase-4 surfaces** (D-08). Documented per-surface in §Tap Targets.
- **Visible focus rings on all new interactive elements** (D-08). `focus-visible:ring-2` token on `RatingPicker` cards and any custom `<button>`. shadcn primitives ship with this baked in.
- **Rating-picker `aria-pressed`** — each card's selected state is announced to screen readers via `aria-pressed={true|false}`.
- **Rating-picker is a single-select picker, NOT a radio group** — screen readers should announce each card individually with `aria-pressed`. (Alternative: render as `role="radiogroup"` with `role="radio"` children; planner picks. Both are accessible. Recommended: `aria-pressed` toggle-buttons, simpler markup.)
- **Section headings use `<h2>` with `aria-labelledby` linking section to heading** — semantic structure for AT users.
- **Form labels:** `Textarea` is labelled by the section heading via `aria-labelledby="notes-heading"` (preferred over a separate `<label>` since the section heading already names the field).
- **Live-transcript region:** when dictating, the live transcript is rendered in an `aria-live="polite"` region so AT users hear interim text. (Inherited Phase 2 contract — Phase 4 reuses verbatim.)
- **Voice mic button aria-labels:** `Dicter les notes` / `Arrêter la dictée` — context-specific to "notes" so AT users know which field they're dictating into.
- **Submit button disabled state:** `disabled={!rating || submitting}` produces native `aria-disabled` semantics. Helper copy `Choisis une note pour pouvoir finaliser.` is associated with the button via `aria-describedby`.
- **Error toasts:** Sonner's default `aria-live="assertive"` for destructive variant, `aria-live="polite"` for default variant. Inherited.
- **No VoiceOver / screen-reader full audit in v0.1** (D-08 explicit). The above checklist is the v0.1 ceiling; deeper a11y work is productize-later.
- **Color contrast WCAG-AA verified** for all new combinations (see §Color → contrast table).
- **Reduced-motion compliance** (above) — non-negotiable. Inherited Phase-3 rule covers Phase 4 by default since no new framer-motion is added.

---

## Internationalization

- All Phase-4 strings in `frontend/lib/i18n/fr.json` (informal `tu`).
- New i18n key prefixes: `cooking_log.finalize.*`, `cooking_log.rating.*`, `cooking_log.notes.*`, `cooking_log.living_image_caption` (optional).
- Removed key prefix: `home.finalize_stub.*` (Phase-3 stub gone).
- ICU plural: only relevant if photo count is shown ("1 photo" vs "N photos"). Phase 4 does not surface a count — `PhotoUploader` shows the grid directly. Skip.
- Number formatting: `Intl.RelativeTimeFormat('fr-FR')` for `cooking_log.living_image_caption` if implemented (`il y a 3 jours`). Reuses inherited `formatRelativeFr` helper.
- Locked phrases (per Phase-4 lock above): `Finaliser la cuisson`, `Adoré`, `Bien`, `Passable`, `Bien enregistré.`, `Comment c'était ?`, `Comment elle a tourné ?`.
- Quotation marks: `«»` (French guillemets with non-breaking spaces) for recipe titles in headers, toasts, and copy. Match Phase-2/3 convention.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | (existing 15 primitives — no NEW shadcn primitive added in Phase 4) | not required |
| third-party (none) | n/a | not applicable — `frontend/components.json` has `"registries": {}`, no third-party registry declared. |

**No third-party registry vetting required.** All Phase-4 visual surfaces are composed from already-installed shadcn primitives + custom components + Lucide icons + Web Speech API (browser-native). No new npm dep is added in Phase 4.

---

## Implementation Notes (handoff to planner)

These are not contract requirements — they're hints to keep implementation aligned:

1. **Rating-picker as a controlled component** — `value` prop + `onChange` callback. State lives in `CookingLogFinalize.tsx`. The picker itself is stateless. This makes it trivially testable and reusable should a future surface need a 3-value picker (productize-later).

2. **`PhotoUploader` adaptation strategy:** the simplest path is the `cookingLogId?: string` prop addition with a small URL-branch ternary. Extracting a `PhotoUploaderBase` is cleaner long-term but adds a file. Recommend the ternary for v0.1; extract if a third entity-type ever needs photos (productize-later).

3. **`getSignedPhotoUrl` helper:** today it takes `(recipeId, path)`. It needs a small extension to handle cooking-log photo paths. Either add a `cookingLogId?: string` parameter (mutually exclusive with `recipeId`), or split into `getRecipeSignedPhotoUrl` and `getCookingLogSignedPhotoUrl`. Planner picks.

4. **Form state management:** local `useState` for `photoPaths`, `rating`, `notes`. No global state library. Submit handler runs photo-upload-finalization sequentially: photos are already uploaded as the user adds them (via `PhotoUploader` background uploads), so the final `PUT` only sends `{photo_paths, rating, notes}`. **Key invariant:** by the time `Finaliser` is tapped, all photos are already in Supabase Storage.

5. **Backend transaction for COOK-05:** the `PUT /api/cooking-logs/{id}` handler MUST update `recipes.last_cooked_at`, `recipes.cook_count`, AND the new `recipes.last_cooked_photo_path` in the SAME DB transaction as the cooking-log finalization. If `photo_paths` is empty in the PUT body, `last_cooked_photo_path` becomes `NULL` (or stays whatever it was — backend planner picks; recommend setting to `photo_paths[0] ?? NULL`). This is an architecture invariant from `CLAUDE.md`.

6. **Realtime `cooking.finalized` event (optional):** if added, frontend handler should: (a) invalidate the active-cooking-log query so `CookingBanner` disappears; (b) invalidate the recipe-detail and recipe-list queries so the living image refreshes. Recommend implementing — the partner-side magic is the whole point.

7. **`recipe.updated` realtime echo on finalize:** if the backend emits a `recipe.updated` event after the COOK-05 transaction commits (because `last_cooked_photo_path` changed), the existing Phase-1 handler invalidates the recipe-list cache, and the living image swaps automatically on the partner's phone. **No new frontend code required** if the backend does this.

8. **Voice notes append-vs-replace:** when the user dictates, the transcript should APPEND to the existing notes (not replace). This lets the user mix typed + dictated input. Implementation: `setNotes((prev) => prev + (prev ? " " : "") + transcript)` (with a single space separator if there's existing content).

9. **Phase-3 lint cleanup is a SEPARATE plan from the finalize work.** Recommend a small dedicated plan for the lint sweep (D-09) so the diff is reviewable. Productize-later TODO sweep (D-10) happens opportunistically inside other plans.

10. **App-shell offline test:** plan a manual UAT step where the executor toggles airplane mode on iOS and verifies (a) cached shell renders, (b) navigation works, (c) API endpoints show loading-then-error states gracefully. PWA-02 acceptance criteria require this.

11. **Finalize page error edge cases:**
    - **Log already finalized** (`rating !== null` on GET): show the EmptyState `Cette cuisson n'est plus disponible`. Don't allow re-finalize in v0.1 (per CONTEXT.md "future re-finalize" allowance — the backend may permit re-PUT, but the v0.1 frontend gates it).
    - **Log belongs to other household** (403 from GET): show the same EmptyState. Don't leak household existence.
    - **Log doesn't exist** (404 from GET): show the same EmptyState. Same security posture.
    - **Network failure on initial GET**: show a retry CTA (planner picks shape — recommend a simple button `Réessayer` next to the EmptyState body).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (verb-first CTAs, locked rating vocabulary `Adoré`/`Bien`/`Passable`, French informal `tu`, soft success copy `Bien enregistré.`, no exclamation except celebratory, helper text gates submit semantics)
- [ ] Dimension 2 Visuals: PASS (3-value rating picker reuses existing rose / emerald / muted tokens; recipe-card living image is a single-line photo-source swap with placeholder fallback; zero new components beyond `RatingPicker` and `CookingLogFinalize`)
- [ ] Dimension 3 Color: PASS (60/30/10 inherited; zero new tokens; rating picker reuses Phase-1 brand-rose, Phase-3 validé-tint, and inherited surface-muted; reserved-for additions documented)
- [ ] Dimension 4 Typography: PASS (4 sizes, 2 weights + Label-only 500 inherited; `text-title` for finalize page title; no new italic surface; no new `.text-*` utility)
- [ ] Dimension 5 Spacing: PASS (4-multiple subset; rating-picker `h-20` documented; raised tap-target floor to 48px for Phase-4 new surfaces; no exception introduced beyond inherited `gap-1.5`)
- [ ] Dimension 6 Registry Safety: PASS (no third-party registry; `components.json` registries map empty; zero new shadcn primitives; zero new npm deps)

**Approval:** pending (gsd-ui-checker upgrade to `approved`)

---

*Phase: 04-polish-w4*
*UI-SPEC drafted: 2026-05-07*
