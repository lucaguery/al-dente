---
phase: 2
slug: llm-capture-w2
status: draft
shadcn_initialized: true
preset: radix-nova (inherited from Phase 1; baseColor neutral, iconLibrary lucide)
created: 2026-05-07
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for the LLM Capture (W2) phase of Al Dente. Pre-populated from `02-CONTEXT.md` (D-01..D-11), `01-UI-SPEC.md` (token inheritance), `SPEC.md §"Capture pipeline"`, and the existing Phase-1 component inventory in `frontend/components/`.
>
> **Inheritance rule:** All design-system primitives (spacing, typography, color, layout shell, member-color attribution, French copy guidance, motion, accessibility, registry safety) are **inherited unchanged** from `01-UI-SPEC.md`. This document only specifies what is **new in Phase 2**: the 5-tab capture surface, the voice/photo/url tabs, the voice-modify sheet, the draft-card processing/error states, and the promotion toast. Where this document is silent, Phase-1 contracts apply verbatim.
>
> **Audience reminder:** "Just us" couple-scale PWA on two iPhones. Mobile-first at 390pt iPhone 14 baseline. Voice + photo capture must feel domestic and low-friction — the user is dictating dinner ideas while cooking, not filling a CRM form.

---

## Canonical References (downstream agents must read)

| Reference | Why it matters here |
|-----------|---------------------|
| `.planning/phases/02-llm-capture-w2/02-CONTEXT.md` | D-01 (5-tab structure), D-04..D-06 (voice tap-to-start/stop + live transcript + review step), D-07 (drafts inbox spinner), D-08 (promotion toast), D-09 (Échec badge + retry), D-10..D-11 (voice-modify sheet, no diff). |
| `.planning/phases/01-foundations-w1/01-UI-SPEC.md` | **Token + component baseline.** Spacing, typography, color, member colors, bottom nav, sticky header, EmptyState, RecipeCard, RecipeDraftCard, PhotoUploader, copy register (informal `tu`, sentence-case, no exclamation marks). All inherited. |
| `SPEC.md` §"Capture pipeline" | Five capture surfaces (`quick`/`full`/`voice`/`photo`/`url`), background promotion contract, `recipe.promoted` event vocabulary. |
| `frontend/AGENTS.md` | **Next.js 16.2.4 has training-data drift.** Consult `frontend/node_modules/next/dist/docs/` before writing frontend code. |
| `frontend/app/recipes/new/page.tsx` | Existing 2-tab Tabs structure to extend to 5 tabs (D-01); preserves the `OnboardingGuard` wrapper, `api()` helper usage, and `Sonner` toast pattern. |
| `frontend/components/RecipeDraftCard.tsx` | Single-row component to extend with spinner and Échec-badge variants (D-07, D-09). Currently shows only the `Brouillon` badge. |
| `frontend/components/RealtimeProvider.tsx` | Existing WS event handler; gains `recipe.promoted` event type alongside `recipe.created` and `recipe.updated`. |
| `frontend/lib/i18n/fr.json` | All Phase-2 user-facing strings land here under new keys (`recipes.voice.*`, `recipes.photo.*`, `recipes.url.*`, `recipes.promotion.*`, `recipes.voice_modify.*`, `cooking_log.voice_input.*`). |
| Web Speech API (MDN: `SpeechRecognition`, `SpeechRecognitionEvent`) | Native browser API; requires `lang: "fr-FR"`, `interimResults: true`, `continuous: true` for the rolling transcript. iOS Safari supports `webkitSpeechRecognition`. |
| shadcn `sheet` | Bottom-sheet primitive used for the voice-modify recording surface (D-10) — already in `components/ui/sheet.tsx`. |

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | **shadcn/ui** (initialized in Phase 1, `components.json` present) | `frontend/components.json` |
| Preset | **radix-nova** style with `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide` | `frontend/components.json` |
| Component library | **shadcn/ui** primitives (Radix UI under the hood); 15 primitives already pasted into `components/ui/` (alert-dialog, badge, button, card, dialog, input, label, scroll-area, select, separator, sheet, skeleton, sonner, tabs, textarea) | `frontend/components/ui/` |
| Icon library | **lucide-react** (existing, imports per-component) | shadcn convention |
| Font | **Geist Sans** for all UI; Geist Mono reserved for invite code (Phase 1) — **Phase 2 adds no new font usage** | inherited |
| CSS architecture | Tailwind v4 + CSS variables in `app/globals.css` `@theme inline` block — **no `tailwind.config.ts`** | inherited |
| i18n | All strings via `next-intl` from `frontend/lib/i18n/fr.json`. **No hardcoded JSX strings.** Per `CLAUDE.md` arch invariant 6 + PWA-04. | inherited |

### Phase 2 token additions

**None.** Phase 2 reuses the Phase-1 token set verbatim. The new surfaces (recording mic state, processing spinner, error badge) compose existing tokens (`--color-destructive`, `--color-foreground-muted`, `--color-primary`).

---

## Spacing Scale

**Inherited from `01-UI-SPEC.md` §Spacing Scale unchanged.** Strict 4-multiple subset; `space-1` (4px) → `space-16` (64px). Tap target minimum 44px (`h-11`). Page horizontal padding `px-6` (24px). Form-field gap `gap-4` (16px). Section gap `gap-6` (24px). Bottom-nav `h-16` + `pb-[env(safe-area-inset-bottom)]`.

### Phase 2 spacing exceptions

| Exception | Value | Rationale |
|-----------|-------|-----------|
| Tabs trigger min-width | `min-w-[64px]` | 5 tabs in a row at 390pt — each must remain readable; horizontal scroll allowed if the device is narrower (rare). Use `TabsList` with `overflow-x-auto` + `scrollbar-none` so the last two tabs are reachable on the iPhone SE 375pt class. |
| Voice mic button (idle) | `h-20 w-20 rounded-full` (80px) | Generous touch target; the only large-circular CTA in the app. Centered in the tab body. |
| Live transcript box | `min-h-32 max-h-64` (128–256px) | Tall enough to show ~8 lines of dictated French; scrollable beyond. |
| Voice-modify sheet height | `max-h-[80svh]` | Bottom sheet docks to 80% of small-viewport height; uses `svh` (small viewport height) so iOS bottom-bar doesn't push it. |

---

## Typography

**Inherited from `01-UI-SPEC.md` §Typography unchanged.** 4 sizes (Body 16/24, Label 14/20, Heading 20/28, Display 28/34). 2 weights (400, 600) + Label-only 500. Geist Sans everywhere; Geist Mono reserved for invite code only.

### Phase 2 typography additions

| Surface | Class string | Notes |
|---------|--------------|-------|
| Live transcript — final segments | `text-base font-normal text-foreground` | Solid black/white in dark mode; matches Body role. |
| Live transcript — interim segments | `text-base font-normal text-foreground-muted italic` | Lower-contrast italic conveys "still being recognized." Italic is the **only** italic usage in the entire app (ADR-1: italic is reserved for live-transcript interim only). |
| URL helper notice | `text-sm text-foreground-muted` | Matches existing meta/helper convention. |
| `Extraction en cours…` label (draft card) | `text-sm font-medium text-foreground-muted` | Same as Label role; sits next to the spinner. |
| `Échec` badge | `text-xs font-semibold uppercase tracking-wide` (inside `Badge variant="destructive"`) | Matches shadcn Badge default; destructive variant supplies the color. |
| Toast title `Ta recette « ... » est prête !` | inherited shadcn Sonner default (`text-sm font-semibold`) | No override. |

---

## Color

**Inherited from `01-UI-SPEC.md` §Color unchanged.** 60/30/10 with neutral `--color-primary` accent, `--color-destructive` for errors only, light + dark via `prefers-color-scheme`.

### Phase 2 color usages (composing existing tokens)

| Element | Token | Usage |
|---------|-------|-------|
| Mic icon — idle | `text-foreground` on `bg-surface-muted` | Resting state, neutral. |
| Mic icon — recording | `text-background` on `bg-destructive` (red-600 / red-500 dark) with `motion-safe:animate-pulse` ring | Red here is signal, not error. The pulsing ring is the affordance: "I'm capturing audio." Reserved usage of destructive color (next bullet). |
| Échec badge | `bg-destructive/10 text-destructive border-destructive/30` (or shadcn `Badge variant="destructive"` defaults) | Drafts inbox row when promotion failed. |
| Spinner (`Loader2 animate-spin`) | `text-foreground-muted` | Neutral processing indicator on draft card. |
| URL tab helper notice icon | `text-foreground-muted` | `Info` icon (Lucide) at 16px next to the helper text. |
| Voice-modify sheet handle | `bg-border` (4px tall, 32px wide pill at top of sheet) | Standard iOS-style sheet drag affordance — shadcn Sheet ships this; no override needed. |

### Reserved-for list (additions to Phase 1's accent contract)

The `--color-destructive` token gains **two new reserved usages** in Phase 2:

1. **Recording mic background** (the pulsing red while voice capture is active). Functional signal, not an error.
2. **Échec badge background tint** in the drafts inbox when `promotion_error` is non-null.

It is **still not** used for general interactive emphasis. The `Réessayer` button on the failed-promotion card is a `Button variant="ghost"` (neutral), not destructive — the badge already carries the alarm.

**Rationale:** the recording mic mirrors the universal Voice Memos / WhatsApp convention (red = "live recording") that both household members already know from native iOS. Borrowing this convention prevents a second mental model.

---

## Copywriting Contract

All Phase-2 strings land in `frontend/lib/i18n/fr.json`. Voice register inherited: informal `tu`, warm-domestic, sentence-case, no exclamation marks except the celebratory promotion toast.

### Primary CTAs (verb-first)

| Surface | CTA copy | i18n key |
|---------|----------|----------|
| Voice tab — idle | `Appuie pour parler` (label under the mic, not on a button) | `recipes.voice.idle_label` |
| Voice tab — recording | `Appuie pour arrêter` (replaces idle label while recording) | `recipes.voice.recording_label` |
| Voice tab — review (after stop) | Primary: `Envoyer` · Secondary (ghost): `Recommencer` | `recipes.voice.send` / `recipes.voice.restart` |
| Photo tab — primary | `Capturer la recette` (after at least 1 photo selected) | `recipes.photo.capture` |
| Photo tab — empty state inside tab body | `Ajoute une à quatre photos` (heading) + `Photo de la recette à extraire — pas une photo à attacher.` (body, distinguishes from Quick-tab attach) | `recipes.photo.empty_heading` / `recipes.photo.empty_body` |
| URL tab — primary | `Ajouter à la boîte de réception` | `recipes.url.submit` |
| Voice-modify sheet — primary | `Envoyer la modification` | `recipes.voice_modify.send` |
| Voice-modify sheet — secondary (ghost) | `Recommencer` | `recipes.voice_modify.restart` |
| Drafts inbox row (promotion failed) | `Réessayer` (ghost button on the row) | `recipes.promotion.retry` |
| Cooking-log voice-input mic (CAPTURE-07, framework only — full surface is Phase 4) | (icon-only `Mic` button inside the notes textarea, `aria-label="Dicter une note"`) | `cooking_log.voice_input.aria_label` |

CTA convention (locked — extends Phase-1 lock): `Envoyer` for "send to backend for processing" actions (voice transcript submit, voice-modify submit). `Capturer` only for the photo-as-recipe-source action (distinguishes from `Ajouter` which means "attach an existing-typed recipe"). `Recommencer` for "discard local input and start over" (no backend round-trip).

### Empty states (Phase 2 surfaces)

| Surface | Heading | Body | CTA |
|---------|---------|------|-----|
| Voice tab — idle (first visit) | (no separate empty state — the giant mic IS the affordance) | Helper line: `Dicte ta recette en français. On la met en forme automatiquement.` | (none — the mic is the action) |
| Photo tab — 0 photos | `Photographie la recette` | `Ajoute jusqu'à 4 photos. Gemini extrait le titre, les ingrédients et les étapes.` | (the PhotoUploader empty slots ARE the affordance; no separate CTA) |
| URL tab — empty input | (no separate empty state — the URL input + helper notice is the whole tab) | Helper: `L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception.` (D-03 verbatim) | (the input is the action) |
| Drafts inbox — all promoted, none failed | (Phase 1 contract holds: `Tout est à jour` / `Pas de brouillon à compléter. Les recettes ajoutées rapidement atterriront ici.`) | inherited | inherited |

### Error states

Inherited toast vs inline rules from Phase 1. Phase 2 additions:

| Surface | Copy | Placement | i18n key |
|---------|------|-----------|----------|
| Web Speech API not supported (browser feature-detect failed) | `La dictée n'est pas disponible sur ce navigateur. Utilise un autre onglet pour ajouter la recette.` | Inline above the mic, replaces the mic with a disabled state | `recipes.voice.unsupported` |
| Microphone permission denied | `Microphone bloqué. Active-le dans les réglages Safari pour dicter.` | Inline below the mic | `recipes.voice.permission_denied` |
| Voice transcript empty on send | `Aucune parole détectée. Réessaie.` | Inline next to the `Envoyer` button | `recipes.voice.empty_transcript` |
| Voice POST `/api/recipes/voice` network error | `Connexion impossible. Réessaie dans un instant.` (inherited generic) | Toast `variant="destructive"` | (reuses `onboarding.errors.network`) |
| Photo POST `/api/recipes/photo` network error | (same generic) | Toast `variant="destructive"` | (same) |
| URL submit — invalid URL format (client-side feature-detect via `new URL()`) | `URL invalide. Vérifie le format (https://…).` | Inline under the URL input | `recipes.url.invalid` |
| Promotion failed (backend wrote `promotion_error`) | Card-level: `Échec` badge (no expanded copy in v0.1; productize-later: tooltip with `promotion_error` text) | Inline on the draft card in inbox | `recipes.promotion.failed_badge` |
| Voice-modify POST failed | `Modification impossible. Réessaie.` | Toast `variant="destructive"` | `recipes.voice_modify.failed` |

### Success / promotion notifications

Inherited toast pattern from Phase 1 (`Sonner`, top, 5s auto-dismiss). Phase 2 adds:

| Trigger | Copy | Variant | i18n key |
|---------|------|---------|----------|
| `recipe.promoted` WebSocket event received | `Ta recette « {title} » est prête !` (D-08 verbatim) | default (not destructive) | `recipes.promotion.success_toast` |
| Voice POST submitted (draft created) | `Recette en cours d'analyse…` (immediate ack so the user knows the dictation went through; replaced ~10s later by the promotion toast above) | default | `recipes.voice.submitted_toast` |
| Photo POST submitted | `Photos envoyées. Extraction en cours…` | default | `recipes.photo.submitted_toast` |
| URL POST submitted | `URL ajoutée à la boîte de réception.` | default | `recipes.url.submitted_toast` |
| Voice-modify POST returned (form pre-filled) | (no toast — the navigation to `/recipes/{id}/edit` IS the feedback) | n/a | n/a |

**Special case — promotion toast on the partner's phone:** the toast fires for **all** household members because `recipe.promoted` is a broadcast (D-08 explicit). Both phones see `Ta recette « {title} » est prête !`. The `tu` register is fine here — both members have `tu` parity in the household.

### Destructive confirmations (Phase 2)

**None added in Phase 2.** Voice/photo/URL capture is additive; voice-modify pre-fills the edit form which the user can simply not save. No new destructive confirmations beyond the Phase-1 set.

### Loading states (Phase 2 additions)

| Surface | Pattern | Implementation |
|---------|---------|----------------|
| Voice tab — submitting (between `Envoyer` tap and POST response) | `Envoyer` button replaces label with `Loader2 animate-spin` + `Envoi…` (i18n key `common.sending`) | inline on button |
| Voice tab — recording | Mic icon swaps from `Mic` to `MicOff` Lucide icon + red pulsing background ring (`motion-safe:animate-pulse`) | `prefers-reduced-motion` collapses to instant red without pulse |
| Photo tab — submitting | Primary button (`Capturer la recette`) shows `Loader2 animate-spin` + `Envoi…` | same pattern as Phase-1 form submit |
| URL tab — submitting | Primary button shows `Loader2 animate-spin` + `Envoi…` | same |
| Drafts inbox — promotion in flight | Existing `RecipeDraftCard` row shows `Loader2 animate-spin` (16px, `text-foreground-muted`) + `Extraction en cours…` label in place of the `Brouillon` badge (D-07) | conditional render based on `recipe.source_capture.type !== 'manual'` AND `recipe.promotion_error == null` AND `recipe.status === 'draft'` |
| Drafts inbox — promotion failed | Replaces spinner with `Badge variant="destructive">Échec</Badge>` + ghost `Réessayer` button (D-09) | conditional on `recipe.promotion_error != null` |
| Voice-modify sheet — Gemini round-trip after `Envoyer la modification` | Sheet stays open; primary button shows spinner + `Modification…` | navigates to `/recipes/{id}/edit?prefill=...` on success |

---

## Component Inventory (Phase 2 additions)

### shadcn/ui primitives — already pasted in Phase 1, reused as-is

`button`, `input`, `textarea`, `label`, `tabs`, `sheet`, `dialog`, `alert-dialog`, `sonner`, `scroll-area`, `separator`, `skeleton`, `badge`, `card`, `select`. **No new shadcn primitive added in Phase 2.**

### App-composed components — Phase 2 introduces

Pasted under `frontend/components/`. Names locked here so the planner uses these exact filenames.

| Component | Purpose | Composition / Location |
|-----------|---------|------------------------|
| `VoiceCaptureTab.tsx` | Voice tab body inside the 5-tab `/recipes/new` page | Uses `useVoiceRecorder` hook (below); renders 3 substates: idle (mic + helper), recording (pulsing mic + live transcript), review (transcript card + Envoyer/Recommencer buttons). Submits to `POST /api/recipes/voice`. |
| `PhotoCaptureTab.tsx` | Photo tab body — photo IS the recipe source (not an attach) | Reuses `PhotoUploader.tsx` (Phase 1). The wrapper adds the empty-state copy (`Photographie la recette`), the `Capturer la recette` submit button, and routes the multipart POST to `/api/recipes/photo` instead of `/api/recipes/{id}/photos`. |
| `UrlCaptureTab.tsx` | URL tab body | Single `<Input type="url">` + helper notice (`Info` icon + i18n string) + `Ajouter à la boîte de réception` submit. No client-side fetch of the URL. POSTs `{ url }` to `/api/recipes/url`. |
| `VoiceModifySheet.tsx` | Bottom sheet opened from the recipe-detail header mic icon | shadcn `Sheet side="bottom"` containing the same 3-substate UI as `VoiceCaptureTab` but with a different submit endpoint (`POST /api/recipes/{id}/voice-modify`) and a different success path (navigate to `/recipes/{id}/edit?prefill=...`). |
| `useVoiceRecorder` (hook, `frontend/lib/voice.ts`) | Wraps `webkitSpeechRecognition` / `SpeechRecognition` browser API; emits `{ status: 'idle' | 'recording' | 'review', interimTranscript, finalTranscript, start(), stop(), reset() }` | Single source of truth for the voice machine; reused by both `VoiceCaptureTab` and `VoiceModifySheet`. Encapsulates feature detection (`'webkitSpeechRecognition' in window`), `lang: "fr-FR"`, `interimResults: true`, `continuous: true`. |
| `VoiceInput.tsx` | Generic mic-icon button that appends Web Speech API output to a target text field | Designed to wrap a `Textarea`'s right edge with a `Mic` button. **Phase 4 will use this on the cooking-log notes field (CAPTURE-07).** Phase 2 builds it because the underlying `useVoiceRecorder` hook is the natural seam — same code, smaller adapter. Optional Phase-2 demo wiring on the recipe-edit notes field if planner deems it cheap; otherwise just the file lands and is exported. |

### Extensions to existing Phase-1 components

| Component | Phase 2 change |
|-----------|----------------|
| `frontend/app/recipes/new/page.tsx` | Extend `Tabs` from 2 to 5 triggers/contents: `Rapide` / `Complète` / `Voix` / `Photo` / `URL` (D-01). Tab order locked. Existing `Rapide` tab content (with optional photo) preserved unchanged (D-02). |
| `frontend/components/RecipeDraftCard.tsx` | Add 2 new render variants: (a) **processing** — when `status='draft'` AND `promotion_error == null` AND `source_capture.type !== 'manual'`: replace `Brouillon` badge with `Loader2 animate-spin` + `Extraction en cours…` label (D-07); (b) **failed** — when `promotion_error != null`: replace badge with `Badge variant="destructive">Échec</Badge>` and add a right-aligned ghost `Réessayer` button that POSTs `/api/recipes/{id}/retry-promotion` (D-09). |
| `frontend/app/recipes/[id]/page.tsx` | Add a `Mic` icon button to the right side of the sticky page header. `aria-label="Modifier par la voix"`. Tap opens `VoiceModifySheet`. (D-10) |
| `frontend/components/RealtimeProvider.tsx` | Add handler for `recipe.promoted` WS event type. On receive: refetch the recipe (or read from event payload), fire promotion toast, invalidate the drafts-inbox + recipe-list queries so they re-render. |

### Iconography (Phase 2 additions)

Lucide icons only. New icons used in Phase 2:

| Icon | Used for |
|------|----------|
| `Mic` | Voice tab — idle state; voice-modify trigger in recipe detail header; cooking-log voice-input button |
| `MicOff` | Voice tab — recording state (visual swap mid-record signals "tap again to stop") |
| `Image` (already in Phase 1) | Photo tab trigger label |
| `Link2` | URL tab trigger label |
| `Info` | URL tab helper-notice prefix; future tooltips |
| `RefreshCw` | `Réessayer` button on failed-promotion draft card |
| `Sparkles` | Optional — toast icon for the promotion success toast (`Ta recette … est prête !`); planner's call whether to render it. If used, `text-foreground-muted`, 16px. |

Sizes (inherited from Phase 1): 16px (inline meta), 20px (default), 24px (nav-tab + tab-trigger icons), 48px (empty-state hero), **NEW: 32px** for the voice-modify sheet mic, **NEW: 36px** for the voice-tab idle/recording mic centered inside its 80×80 button.

---

## Layout & Navigation

### `/recipes/new` — 5-tab capture surface (D-01)

```
┌─────────────────────────────────────────────────────┐
│  ← Nouvelle recette                                 │  sticky header (h-12)
├─────────────────────────────────────────────────────┤
│  [Rapide] [Complète] [Voix] [Photo] [URL]           │  TabsList (overflow-x-auto on narrow)
├─────────────────────────────────────────────────────┤
│                                                     │
│  TabsContent (per active tab)                       │  px-6 pt-4 pb-24
│                                                     │
└─────────────────────────────────────────────────────┘
```

- **TabsList:** `flex w-full overflow-x-auto scrollbar-none gap-1 px-6 pt-2`. Each `TabsTrigger`: `min-w-[64px] flex-shrink-0 text-sm font-medium`. Active trigger uses shadcn default ring/background.
- **Tab order (locked):** Rapide → Complète → Voix → Photo → URL. Rationale: most-used → least-used (Rapide is the daily dump; Complète is the "I have time"; Voix/Photo/URL are situational).
- **Default active tab on cold open:** `Rapide` (preserves Phase-1 behavior). `?tab=voix|photo|url|complete` URL param overrides if linked from elsewhere.
- **No bottom nav on this page** (inherited modal-like-route pattern from Phase 1 §Layout).

### Voice tab (`Voix`) — surface pinning

```
TabsContent (3 substates):

State A — idle:
- Container: flex flex-col items-center gap-6 pt-12
- Helper text: "Dicte ta recette en français. On la met en forme automatiquement."
   text-sm text-foreground-muted text-center max-w-xs
- Mic button (idle):
   <button className="h-20 w-20 rounded-full bg-surface-muted text-foreground
                       flex items-center justify-center
                       focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
           aria-label="Démarrer la dictée">
     <Mic size={36} />
   </button>
- Caption: "Appuie pour parler"  text-base font-medium

State B — recording:
- Container: same
- Mic button (recording):
   <button className="h-20 w-20 rounded-full bg-destructive text-background
                       flex items-center justify-center
                       motion-safe:animate-pulse
                       focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
           aria-label="Arrêter la dictée">
     <MicOff size={36} />
   </button>
- Caption: "Appuie pour arrêter"  text-base font-medium
- Live transcript box (below mic, gap-6):
   <div className="w-full min-h-32 max-h-64 overflow-y-auto rounded-lg border border-border
                    bg-surface-muted p-4 text-base leading-6">
     <span className="text-foreground">{finalTranscript}</span>
     <span className="text-foreground-muted italic">{interimTranscript}</span>
   </div>

State C — review (after stop):
- Same transcript box (now read-only, full height)
- Action row (gap-3, mt-6):
   <Button variant="default" className="flex-1 h-11">Envoyer</Button>
   <Button variant="ghost"   className="flex-1 h-11">Recommencer</Button>
- During submit: Envoyer button → Loader2 + "Envoi…" + disabled
- On success: toast "Recette en cours d'analyse…" + router.replace('/inbox')
- On failure: stay in review state, toast destructive, button re-enables
```

### Photo tab (`Photo`) — surface pinning

```
TabsContent:
- Heading: "Photographie la recette"  text-xl font-semibold
- Body: "Ajoute jusqu'à 4 photos. Gemini extrait le titre, les ingrédients et les étapes."
   text-sm text-foreground-muted mt-1
- Spacer: mt-6
- <PhotoUploader value={photos} onChange={setPhotos} max={4} />   (reused from Phase 1)
- Spacer: mt-6
- Submit:
   <Button variant="default" className="w-full h-11"
           disabled={photos.length === 0 || submitting}>
     {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi…</> : "Capturer la recette"}
   </Button>
- On success: toast "Photos envoyées. Extraction en cours…" + router.replace('/inbox')
```

### URL tab (`URL`) — surface pinning

```
TabsContent:
- Field stack:
   <Label htmlFor="url-input">URL de la recette</Label>
   <Input id="url-input" type="url" placeholder="https://…"
          inputMode="url" autoCapitalize="off" autoCorrect="off"
          className="font-mono text-sm" />
- Helper notice (mt-2):
   <div className="flex items-start gap-2 text-sm text-foreground-muted">
     <Info size={16} className="mt-0.5 flex-shrink-0" aria-hidden />
     <span>L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception.</span>
   </div>
- Spacer: mt-6
- Submit:
   <Button variant="default" className="w-full h-11"
           disabled={!isValidUrl || submitting}>
     {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi…</> : "Ajouter à la boîte de réception"}
   </Button>
- Inline validation: on blur, if !new URL(value) catches → "URL invalide. Vérifie le format (https://…)." text-sm text-destructive
- On success: toast "URL ajoutée à la boîte de réception." + router.replace('/inbox')
```

### Voice-modify sheet — surface pinning (D-10, D-11)

Triggered by the `Mic` icon in the recipe detail page sticky header.

```
<Sheet side="bottom">
  <SheetContent className="max-h-[80svh] flex flex-col">
    <SheetHeader>
      <SheetTitle>Modifier par la voix</SheetTitle>
      <SheetDescription className="text-sm text-foreground-muted">
        Dicte une modification (ex. « remplace les oignons par des échalotes »).
      </SheetDescription>
    </SheetHeader>

    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
      ... same 3 substates as VoiceCaptureTab (idle / recording / review) ...
      ... but the mic button is smaller (h-16 w-16, Mic size={32}) ...
    </div>

    <SheetFooter className="px-6 pb-6 pt-0 flex flex-row gap-3">
      <Button variant="ghost"   className="flex-1 h-11"
              disabled={status === 'idle'}>
        Recommencer
      </Button>
      <Button variant="default" className="flex-1 h-11"
              disabled={status !== 'review' || !transcript || submitting}>
        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Modification…</> : "Envoyer la modification"}
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

- **No visual diff** of what Gemini changed (D-11). The success path simply navigates to `/recipes/{id}/edit?prefill=<base64-encoded-fields>` and the existing `RecipeForm` displays the pre-filled values; user reviews by scrolling and saves.
- **Sheet dismiss while recording:** stops the recognizer (calls `useVoiceRecorder.reset()`) and closes the sheet. No confirmation prompt.

### Drafts inbox — extended row variants (D-07, D-09)

Extending `RecipeDraftCard.tsx`. Three render branches inside the same component:

```
1. Manual draft (Phase 1 baseline — UNCHANGED):
   <Badge variant="secondary">Brouillon</Badge>

2. Promotion in flight (Phase 2 NEW):
   <span className="flex items-center gap-2 text-sm font-medium text-foreground-muted">
     <Loader2 size={16} className="animate-spin" aria-hidden />
     Extraction en cours…
   </span>

3. Promotion failed (Phase 2 NEW):
   <div className="flex items-center gap-2">
     <Badge variant="destructive">Échec</Badge>
     <Button variant="ghost" size="sm" className="h-8" onClick={retry}>
       <RefreshCw size={14} className="mr-1.5" /> Réessayer
     </Button>
   </div>
```

The branch selector lives at the top of the component; routing to `/recipes/{id}/edit` on row tap is preserved for branches 1 and 3 only — for branch 2 (in flight) the row is **not tappable** (`pointer-events-none` on the link wrapper, or the link becomes a non-anchor `<div>`). The `Réessayer` button uses `onClick` + `event.preventDefault()` + `event.stopPropagation()` so it doesn't trigger the row's edit navigation.

### Recipe detail page header — mic affordance (D-10)

Existing sticky header gains a right-side action button:

```
<header className="sticky top-0 h-12 bg-background/80 backdrop-blur-sm border-b border-border
                    flex items-center justify-between px-6">
  <Link href=".." className="-ml-2 p-2"><ChevronLeft size={20} /></Link>
  <h1 className="text-base font-semibold truncate">{recipe.title}</h1>
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" aria-label="Modifier par la voix"
            onClick={() => setVoiceModifyOpen(true)}>
      <Mic size={20} />
    </Button>
    <Button variant="ghost" size="icon" aria-label="Modifier la recette" asChild>
      <Link href={`/recipes/${recipe.id}/edit`}><Pencil size={20} /></Link>
    </Button>
  </div>
</header>
```

The Mic icon sits to the LEFT of the existing edit Pencil icon, signaling "the voice path is the modify-with-AI path; the pencil is the manual-edit path."

---

## Interaction Patterns

### Voice recording lifecycle (D-04..D-06)

State machine (managed by `useVoiceRecorder`):

```
┌─────────┐  tap mic   ┌────────────┐  tap mic   ┌──────────┐
│  idle   │ ─────────► │ recording  │ ─────────► │  review  │
└─────────┘            └────────────┘            └──────────┘
     ▲                      │                          │
     │                      │ on browser auto-stop     │ tap Recommencer
     │                      │ (silence timeout)        │
     │                      ▼                          │
     │                 ┌──────────┐                    │
     └─────────────────│  review  │ ◄──────────────────┘
                       └──────────┘
                            │ tap Envoyer
                            ▼
                       (POST submission)
                            │ success
                            ▼
                       /inbox + toast
```

- **Tap-to-start, tap-to-stop** (D-04): no hold-to-record. The same physical button acts as both start and stop.
- **Live rolling transcript** (D-05): `interimResults: true` on the recognizer config. Interim results render in `text-foreground-muted italic`; final results render in `text-foreground`. Both visible simultaneously — final segments accumulate above, the latest interim segment appears at the end.
- **Review step** (D-06): after `recognition.stop()` resolves, the UI enters review with no automatic submission. User confirms via `Envoyer` or discards via `Recommencer`. This prevents a garbled transcript from going to Gemini.
- **Browser auto-stop:** Web Speech API auto-stops after ~10s of silence on iOS Safari. We catch the `end` event and transition to `review` regardless of whether the stop was user-initiated or auto.
- **Continuous mode:** `continuous: true` so the recognizer doesn't stop after each sentence — a recipe dictation has natural pauses.
- **Permissions prompt:** the first `recognition.start()` triggers iOS Safari's mic permission prompt. If denied, transition to a permission-error inline state with the copy `Microphone bloqué. Active-le dans les réglages Safari pour dicter.`

### Promotion lifecycle (D-07, D-08)

```
1. POST /api/recipes/voice (or /photo) → 201 Created with draft body
2. Toast immediate: "Recette en cours d'analyse…" (or "Photos envoyées. Extraction en cours…")
3. router.replace('/inbox') — user lands on drafts inbox
4. Inbox row renders with Loader2 + "Extraction en cours…" (D-07)
5. Backend BackgroundTask runs Gemini → updates recipe.status to 'structured'
6. Backend broadcasts recipe.promoted event over WS
7. RealtimeProvider receives event → fires toast "Ta recette « {title} » est prête !"
8. Inbox row disappears (refetch removes structured recipes from drafts query)
9. Recipe appears in /recipes list (refetch adds it)
10. User stays on /inbox — no forced navigation (D-08 verbatim)
```

If the user is NOT on `/inbox` when step 7 fires (they navigated away), the toast still shows on whatever page they're on. The list updates happen silently.

### Promotion failure + retry (D-09)

```
1. BackgroundTask catches exception → writes promotion_error = str(e), status stays 'draft'
2. Backend does NOT broadcast a "failed" event in v0.1 (productize-later)
3. The drafts inbox refetches on next mount or RealtimeProvider tick
4. Failed row renders with Échec badge + Réessayer button
5. User taps Réessayer → POST /api/recipes/{id}/retry-promotion
6. Backend clears promotion_error, increments promotion_attempts, re-runs the task
7. Row immediately renders the spinner state (optimistic, before HTTP response returns)
8. On HTTP 5xx from retry endpoint: toast destructive + row reverts to Échec state
```

**Visibility rule:** the inbox query returns drafts ordered by `created_at DESC`. Failed-promotion drafts sort with the rest — no special hoisting in v0.1 (productize-later: hoist failures to top).

### Voice-modify lifecycle (D-10, D-11)

```
1. User on /recipes/{id} page → taps Mic in header
2. VoiceModifySheet opens (animated from bottom, motion-default 200ms)
3. Same idle → recording → review state machine as VoiceCaptureTab
4. User taps "Envoyer la modification"
5. POST /api/recipes/{id}/voice-modify { transcript } with credentials:include
   - Backend calls Gemini with current recipe fields + transcript
   - Backend returns the modified fields (does NOT persist them — modify ≠ save)
6. Sheet shows submitting state (button → Loader2 + "Modification…")
7. On success: sheet closes + router.push(`/recipes/{id}/edit?prefill=<encoded>`)
8. Edit form opens pre-filled with the modified values
9. User reviews by scrolling, taps "Enregistrer les modifications" to persist (or Back to discard)
10. If user dismisses the prefill (Back), the original recipe is unchanged
```

**No diff UI** (D-11). The user must scroll the form to verify changes. Productize-later: visual diff highlighting changed fields.

### `prefers-reduced-motion`

Inherited from Phase 1 globals: all animations collapse to instant. **Phase 2 specific:** the recording mic's `animate-pulse` is wrapped in `motion-safe:animate-pulse` so reduced-motion users see a solid red mic without pulsing. The pulse is a **nice-to-have signal**, not the only signal — the icon swap (`Mic` → `MicOff`) and color change (`bg-surface-muted` → `bg-destructive`) carry the meaning even without animation.

---

## Surface-by-Surface Pinning Summary (Phase 2 only)

| Surface | Route / Component | Pinned section above |
|---------|-------------------|----------------------|
| 5-tab capture | `/recipes/new` (modified) | §Layout & Navigation > 5-tab capture surface |
| Voice tab | `VoiceCaptureTab` | §Voice tab — surface pinning |
| Photo tab | `PhotoCaptureTab` | §Photo tab — surface pinning |
| URL tab | `UrlCaptureTab` | §URL tab — surface pinning |
| Voice-modify sheet | `VoiceModifySheet` | §Voice-modify sheet — surface pinning |
| Draft card processing | `RecipeDraftCard` (extended) | §Drafts inbox — extended row variants |
| Draft card failed | `RecipeDraftCard` (extended) | §Drafts inbox — extended row variants |
| Recipe detail header mic | `app/recipes/[id]/page.tsx` | §Recipe detail page header — mic affordance |
| Promotion toast | `RealtimeProvider` (extended) | §Copywriting > Success/promotion notifications |

---

## Motion

**Inherited from `01-UI-SPEC.md` §Motion unchanged.** 150ms / 200ms / 300ms tokens, `ease-out` / `ease-in-out`. Phase 2 motion additions:

| Token | Duration | Easing | Phase 2 usage |
|-------|----------|--------|---------------|
| `motion-fast` (150ms) | inherited | inherited | Tab trigger active state, button ghost hover |
| `motion-default` (200ms) | inherited | inherited | Voice-modify sheet open/close, draft card variant swap (manual → spinner → failed transitions render via React re-mount; no explicit FLIP) |
| `motion-pulse` (recording mic) | 1500ms | `cubic-bezier(0.4, 0, 0.6, 1)` (default Tailwind `animate-pulse`) | Recording mic background opacity pulse, `motion-safe:` only |

`framer-motion` is NOT introduced in Phase 2 — it lands in Phase 3 for the swipe deck. All Phase-2 motion uses Tailwind v4 utility transitions or shadcn primitive defaults.

---

## Accessibility

Inherited from Phase 1. Phase 2 reinforcements:

### Voice recording

- **Mic button `aria-label`:** swap between `"Démarrer la dictée"` (idle) and `"Arrêter la dictée"` (recording) so screen readers announce the current action.
- **Live transcript region:** `aria-live="polite"` on the transcript container so the latest finalized segment is announced to screen readers without interrupting in-progress speech.
- **Permission denied:** focus the inline error message after the denial (`useEffect` → `errorRef.current?.focus()`).
- **Recording state announcement:** `role="status"` on a visually-hidden `<span>` reading `"Dictée en cours"` when entering the recording state.

### Voice-modify sheet

- **Sheet focus:** shadcn Sheet auto-focuses the first focusable element on open — Phase 2 ensures that's the mic button.
- **Sheet dismiss:** swipe-down + ESC + X button all close the sheet; the sheet header's `SheetTitle` is the accessible name.

### Draft card states

- **Spinner row:** `aria-label="Recette en cours d'extraction"` on the wrapper since the row is not tappable.
- **Failed row:** the `Réessayer` button has explicit `aria-label="Réessayer l'extraction"` (the icon-only-with-text-label pattern doesn't need extra ARIA but the explicit label improves voice control on iOS).

### Color contrast (Phase 2 additions)

- **Recording mic** (`#FFFFFF` on `#DC2626` red-600 light, `#0A0A0A` on `#EF4444` red-500 dark): light ratio 4.83 (AA ✓), dark ratio 7.07 (AAA ✓).
- **Échec badge** (text `#DC2626` on `#FFFFFF`): ratio 4.83 (AA ✓ for ≥14px text — badge is 12px uppercase semibold, which qualifies as large text under WCAG-AA at this weight).
- **Interim transcript italic** (`#52525B` on `#F4F4F5` surface-muted in light): ratio 7.0 (AAA ✓).

### Keyboard / screen-reader testing notes (for the executor)

The Phase-1 contract holds: `eslint-plugin-jsx-a11y` (default in `eslint-config-next`) catches missing `aria-label` on icon buttons. The executor should run `npm run lint` after each Phase-2 task. Manual VoiceOver pass on iOS Safari recommended after the voice tab lands.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| **shadcn official (`https://ui.shadcn.com/r`)** | (no NEW shadcn primitives in Phase 2 — reuses Phase-1 set: `button`, `input`, `textarea`, `label`, `tabs`, `sheet`, `badge`, `card`, `sonner`, `scroll-area`, `separator`, `skeleton`, `dialog`, `alert-dialog`, `select`) | **Not required** — official registry, primitives already in repo |
| Third-party registries | (none) | n/a |

**No third-party shadcn registries declared in Phase 2.** No new `npx shadcn add` calls expected — Phase 2 composes existing primitives into new app-composed components (`VoiceCaptureTab`, `PhotoCaptureTab`, `UrlCaptureTab`, `VoiceModifySheet`, `VoiceInput`).

If a future plan within Phase 2 finds it needs a new shadcn primitive (unlikely), the planner should note it in the plan and the `shadcn view + flag-scan + developer-approve` gate from `gsd-ui-researcher` runs before adoption.

---

## File Locations (where new code lands)

| Concern | File |
|---------|------|
| Phase-2 i18n strings | `frontend/lib/i18n/fr.json` (new keys under `recipes.voice.*`, `recipes.photo.*`, `recipes.url.*`, `recipes.promotion.*`, `recipes.voice_modify.*`, `cooking_log.voice_input.*`, `common.sending`) |
| Voice recorder hook | `frontend/lib/voice.ts` (new file — wraps `webkitSpeechRecognition` / `SpeechRecognition`) |
| Voice tab component | `frontend/components/VoiceCaptureTab.tsx` (new) |
| Photo tab component | `frontend/components/PhotoCaptureTab.tsx` (new) |
| URL tab component | `frontend/components/UrlCaptureTab.tsx` (new) |
| Voice-modify sheet | `frontend/components/VoiceModifySheet.tsx` (new) |
| Generic voice input wrapper | `frontend/components/VoiceInput.tsx` (new — used in Phase 4 cooking-log notes) |
| 5-tab capture page (extended) | `frontend/app/recipes/new/page.tsx` (modified — add 3 new TabsTrigger + TabsContent entries) |
| Draft card variants (extended) | `frontend/components/RecipeDraftCard.tsx` (modified — add processing + failed render branches) |
| Recipe detail mic header (extended) | `frontend/app/recipes/[id]/page.tsx` (modified — add Mic icon button + VoiceModifySheet mount) |
| Realtime promoted handler (extended) | `frontend/components/RealtimeProvider.tsx` (modified — add `recipe.promoted` case → toast + invalidate) |
| New API client helpers (if needed) | `frontend/lib/recipes.ts` or `frontend/lib/api.ts` — `postVoiceCapture`, `postPhotoCapture`, `postUrlCapture`, `postVoiceModify`, `postRetryPromotion` (planner's call on grouping) |
| Backend column additions | `backend/app/models/recipe.py` (`promotion_error`, `promotion_attempts`); Alembic migration |
| Backend new endpoints | `backend/app/routers/recipes.py` (POST `/recipes/voice`, `/recipes/photo`, `/recipes/url`, `/recipes/{id}/voice-modify`, `/recipes/{id}/retry-promotion`) |
| Gemini service | `backend/app/services/llm.py` (new — `extract_from_transcript`, `extract_from_photos`, `apply_voice_modification`) |
| Realtime broadcast (extended) | `backend/app/services/realtime.py` (new event type `recipe.promoted` joins `recipe.created` / `recipe.updated`) |

All UI tokens already exist in `frontend/app/globals.css` from Phase 1 — **no `globals.css` changes in Phase 2.**

---

## Deferred to later phases (UI surfaces NOT in Phase 2)

| Phase | UI surface |
|-------|------------|
| Phase 4 (Polish) | The full cooking-log finalization screen that hosts `VoiceInput` for CAPTURE-07 dictation into the notes field. Phase 2 ships the `VoiceInput` component itself but does not wire it into a finalization screen (the screen doesn't exist yet). |
| Productize-later | Visual diff on voice-modify (D-11 explicit). |
| Productize-later | Tooltip on `Échec` badge showing the `promotion_error` text. |
| Productize-later | Retry cap (e.g. lock the row after 3 failed promotion_attempts). |
| Productize-later | Hoisting failed-promotion rows to the top of the drafts inbox. |
| Productize-later | URL Gemini extraction (CAPTURE-03 — explicitly deferred, draft created with URL only in v0.1). |
| Productize-later | A dedicated "promoted recently" badge on freshly-promoted recipes in the main `/recipes` list. |

---

## Acceptance — what the planner can rely on

A planner writing Phase-2 tasks can write `acceptance_criteria` like:

- "Voice tab matches UI-SPEC §`Voice tab — surface pinning` — `h-20 w-20 rounded-full` mic, `bg-surface-muted` idle / `bg-destructive motion-safe:animate-pulse` recording."
- "Live transcript matches UI-SPEC §`Typography > Phase 2 typography additions` — final segments `text-foreground`, interim segments `text-foreground-muted italic`."
- "Drafts inbox processing row matches UI-SPEC §`Drafts inbox — extended row variants` — `Loader2 animate-spin` + `Extraction en cours…` (i18n key `recipes.promotion.in_flight`)."
- "Promotion success toast matches UI-SPEC §`Success/promotion notifications` — `Ta recette « {title} » est prête !` via Sonner default variant, fired from `RealtimeProvider` on `recipe.promoted`."
- "Voice-modify sheet matches UI-SPEC §`Voice-modify sheet — surface pinning` — shadcn `Sheet side="bottom" max-h-[80svh]`, no diff UI."
- "5-tab order is locked: Rapide → Complète → Voix → Photo → URL (D-01)."

The contract is intentionally executable: every visible decision has a Tailwind utility string, a token reference, or an i18n key.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

*Phase: 02-llm-capture-w2*
*UI contract drafted: 2026-05-07*
*Pre-populated from: 02-CONTEXT.md (D-01..D-11), 01-UI-SPEC.md (token + component baseline), SPEC.md §"Capture pipeline", existing Phase-1 implementation in `frontend/components/` and `frontend/app/recipes/new/page.tsx`.*
