---
phase: 3
slug: decide-w3
status: draft
shadcn_initialized: true
preset: radix-nova (inherited from Phase 1; baseColor neutral, iconLibrary lucide)
created: 2026-05-07
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for the Decide (W3) phase of Al Dente. Pre-populated from `03-CONTEXT.md` (D-01..D-12), `03-RESEARCH.md` (framer-motion swipe-deck pattern, APScheduler push fan-out, pywebpush), `01-UI-SPEC.md` (token + component baseline), `02-UI-SPEC.md` (Sonner toast pattern, voice-input on cooking-log), `SPEC.md §"Voting"` and `§"Algorithm"`, and the existing component inventory in `frontend/components/`.
>
> **Inheritance rule:** All design-system primitives (spacing, typography, color, layout shell, member-color attribution, French copy guidance, motion baseline, accessibility, registry safety) are **inherited unchanged** from `01-UI-SPEC.md`. Phase-2 token/copy/inline patterns (Sonner promotion toast, italic restricted to live transcript, the `MemberDot` primitive) carry forward. This document specifies what is **new in Phase 3**: the swipe-deck on Home, the "Tout vu" summary, the "En train de cuisiner" banner, the push-permission inline banner, and the vote-state vocabulary. Where this document is silent, Phase-1 / Phase-2 contracts apply verbatim.
>
> **Audience reminder:** "Just us" couple-scale PWA on two iPhones. Mobile-first at 390pt iPhone 14 baseline. The Decide layer is the moment-of-truth surface — it must feel as light as flicking through Tinder, not as heavy as filling a form. The whole point is to **stop discussing IRL** "on mange quoi ?".

---

## Canonical References (downstream agents must read)

| Reference | Why it matters here |
|-----------|---------------------|
| `.planning/phases/03-decide-w3/03-CONTEXT.md` | D-01 (Home tab BECOMES today's shortlist), D-02 (no-shortlist + cold-start empty states), D-03 (swipe OR thumb buttons, both equal), D-04 (one-card-with-peek deck), D-05 ("Tout vu" summary), D-06 (Rejeté hidden everywhere), D-07 (card field set + partner vote dot), D-08 ("En train de cuisiner" banner), D-09..D-11 (push permission inline + content), D-12 ("Tu décides" placement). |
| `.planning/phases/03-decide-w3/03-RESEARCH.md` | framer-motion swipe-deck pattern (`drag="x"` + `useMotionValue` + `useTransform`), `pywebpush` + VAPID flow, `prefers-reduced-motion` collapses to thumb-buttons-only, ZoneInfo for household timezone. |
| `.planning/phases/01-foundations-w1/01-UI-SPEC.md` | **Token + component baseline.** Spacing scale (4-multiple subset), typography (4 sizes + 2 weights), color (60/30/10), member colors (5 Tailwind 500-shade swatches), `MemberDot` canonical primitive, `EmptyState`, `Sonner` toast pattern, French copy guidance (informal `tu`, sentence-case, no exclamation marks except celebratory), motion tokens, `prefers-reduced-motion` rule. All inherited. |
| `.planning/phases/02-llm-capture-w2/02-UI-SPEC.md` | D-08 promotion-toast Sonner pattern reused for vote-state transitions, `recipe.promoted` realtime handler conventions, italic reserved-for rule (still: live-transcript only — Phase 3 introduces NO new italic surface). |
| `SPEC.md` §"Voting (asymmetric, no hard deadline)" | 5-state table (Validé / Pressenti / Contesté / Rejeté / Sans avis), vote.created broadcast contract, "Tu décides" 5-yes-votes semantics, veto-window-closes-on-first-cooking-log rule. |
| `SPEC.md` §"Algorithm (Python service)" | `select_top5_with_diversity` + cold-start banner thresholds (`<10` recipes shows banner; `10–29` soft diversity; `30+` full diversification). |
| `frontend/AGENTS.md` | **Next.js 16.2.4 has training-data drift.** Consult `frontend/node_modules/next/dist/docs/` before writing frontend code. |
| `frontend/app/page.tsx` | **Mutated** in Phase 3: hero/CTAs replaced by `<HomeDecide />` (deck/summary/banners switcher) wrapped in the existing `OnboardingGuard`. Install-hint Card stays — it's per-device PWA UX, not Decide content. |
| `frontend/components/RealtimeProvider.tsx` | Adds `vote.created` event handler (alongside existing `recipe.created` / `recipe.updated` / `recipe.promoted`). Pattern documented in `services/realtime.py` module docstring. |
| `frontend/lib/i18n/fr.json` | All Phase-3 user-facing strings land here under new keys (`home.shortlist.*`, `home.summary.*`, `home.cooking_banner.*`, `home.push.*`, `home.cold_start.*`, `vote.state.*`). |
| Lucide icons (`lucide-react`) | Existing dep. Phase 3 adds: `Heart`, `X`, `ChefHat`, `Bell`, `BellOff`, `Sparkles`, `Filter`, `RotateCw`. No new icon library. |
| framer-motion 12.x via `framer-motion` import path | NEW dep — `npm install framer-motion@^12`. Used ONLY for the swipe deck (D-04 + D-05). NOT used to animate banner/toast/list — Tailwind v4 utility transitions still cover those. |

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | **shadcn/ui** (initialized in Phase 1, `components.json` present) | `frontend/components.json` |
| Preset | **radix-nova** style with `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide` | `frontend/components.json` |
| Component library | **shadcn/ui** primitives (Radix UI under the hood); 15 primitives already pasted into `components/ui/` | `frontend/components/ui/` |
| Icon library | **lucide-react** (existing) | shadcn convention |
| Font | **Geist Sans** UI · **Playfair Display** for `.text-display` and `.text-title` (warm-cream theme established quick-260507-hd0). Geist Mono reserved for invite code (Phase 1). **Phase 3 adds no new font usage.** | inherited |
| CSS architecture | Tailwind v4 + CSS variables in `app/globals.css` `@theme inline` block — **no `tailwind.config.ts`** | inherited |
| i18n | All strings via `next-intl` from `frontend/lib/i18n/fr.json`. **No hardcoded JSX strings.** Per `CLAUDE.md` arch invariant 6 + PWA-04. | inherited |
| Animation library | **framer-motion 12.38.0** (NEW for Phase 3) via `import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion"`. Scope: swipe deck only. | `03-RESEARCH.md §Standard Stack` |

### Phase 3 token additions

**One** new color token, plus four motion threshold tokens. Pinned here so the executor doesn't re-invent values.

| Token | Light value | Dark value | Used as | Rationale |
|-------|-------------|------------|---------|-----------|
| `--color-validé-tint` | `oklch(0.93 0.07 145)` (≈ emerald-100/20) | `oklch(0.30 0.06 145)` (≈ emerald-900/30) | Background tint of a "Tu décides" / "Je commence à cuisiner" winning row in the "Tout vu" summary, AND the optional subtle gradient behind a Validé card hero. | Re-uses the existing emerald hue from member-color slot 3, but as a UI tint not a member identity. The 60/30/10 is preserved — this is a one-off semantic surface, not a competing accent. Only used inside Decide-Phase surfaces. |

**Motion thresholds (numeric constants in TS, not CSS — but pinned in the contract):**

| Constant | Value | Used as |
|----------|-------|---------|
| `SWIPE_THRESHOLD_PX` | 100 | Drag-distance threshold past which release commits the vote |
| `SWIPE_VELOCITY_PX_S` | 500 | Flick-velocity threshold; commits vote even below the px threshold |
| `SWIPE_FLY_OFFSCREEN_PX` | 1.4 × viewport-width | Distance the committed card animates to before unmounting |
| `SWIPE_ROTATE_RANGE_DEG` | -15° to +15° | Card rotation tied to drag x via `useTransform` (max tilt at full drag) |

These are **constants in `frontend/lib/swipe-tokens.ts`** (NEW file), imported by `ShortlistCard`. The planner does NOT pick alternative numbers without an UI-SPEC update.

---

## Spacing Scale

**Inherited from `01-UI-SPEC.md` §Spacing Scale unchanged.** Strict 4-multiple subset; `space-1` (4px) → `space-16` (64px). Tap target minimum 44px (`h-11`). Page horizontal padding `px-6` (24px). Form-field gap `gap-4` (16px). Section gap `gap-6` (24px). Bottom-nav `h-16` + `pb-[env(safe-area-inset-bottom)]`.

### Phase 3 spacing exceptions

| Exception | Value | Rationale |
|-----------|-------|-----------|
| Shortlist card height | `aspect-[3/4]` (≈ 312×416 at 390pt viewport with `px-6`) | Generous photo + meta zone; matches the editorial-card register the home hero already established. |
| Stack card peek offset | `translateY(12px) scale(0.94)` | D-04 — next card peeks ~12px below the front, scaled to 94%. `translateY(12px)` is on the 4-grid; scale is unitless. |
| Stack card 3rd-card peek | `translateY(20px) scale(0.88)` | If ≥3 cards remain. Optional polish — planner may render only front + 1 peek if preferred (state simpler). Both are inside spec. |
| Thumb-button size | `h-14 w-14 rounded-full` (56px) | Above the 44px minimum; clear thumb target. Two buttons centered below the deck with `gap-12` (48px) between them. |
| Mic-style "Tu décides" CTA in summary | `h-14 px-8 rounded-2xl` | One-off pill-shaped primary CTA in the summary. Matches the home `cta_browse` button height already in `frontend/app/page.tsx`. |
| "En train de cuisiner" banner | `min-h-16 px-6 py-4` (64px tall) | Persistent, sits above the deck. Same vertical rhythm as the bottom nav. |
| Push-permission banner | `min-h-12 px-6 py-3` (≥48px tall) | Slimmer than the cooking banner — informational, not action-required. |
| Card stack horizontal padding | `px-4` (16px) inside the deck container | Slight inset so a faint shadow on the card doesn't clip; inherits the `px-6` page padding from outer `<main>`. |
| Card meta row gap | `gap-2` (8px) | Tags + prep-time badges sit close. |
| Vote-dot gap (summary row) | `gap-1.5` (6px) | EXCEPTION — 6px is NOT on the 4-grid. **Allowed exception** to keep the two member-dots visually paired without a hard 8px gulf. Same exception was granted in Phase 1 for `RecipeCard`'s meta `gap-1.5`. |

---

## Typography

**Inherited from `01-UI-SPEC.md` §Typography unchanged.** 4 sizes (Body 16/24, Label 14/20, Heading 20/28, Display 28/34). 2 weights (400, 600) + Label-only 500. Geist Sans default; `text-display` / `text-title` utilities in `globals.css` are Playfair Display (inherited from quick-260507-hd0).

### Phase 3 typography additions

| Surface | Class string | Notes |
|---------|--------------|-------|
| Shortlist card title (front of card) | `text-title text-foreground` (Playfair Display, 1.375rem, 600, line-height 1.25) | Reuses the existing `.text-title` utility — same as section titles. Editorial register for "the recipe being decided." |
| Shortlist card meta row (cuisine • prep time) | `text-sm font-medium text-foreground-muted` (Label role) | Inherited Label spec. |
| Mood / cuisine chips on the card | shadcn `Badge variant="secondary"` defaults (`text-xs font-semibold`) | Inherited; no override. |
| "Tout vu" summary heading | `text-xl font-semibold leading-7` (Heading role) | Inherited Heading spec. Copy: `Vous avez tout vu`. |
| "Tout vu" summary recipe-row title | `text-base font-semibold leading-6` (Body, weight bumped to 600 for scannability) | Same as `RecipeCard` row title — visual consistency. |
| Vote-state label in summary row | `text-sm font-medium leading-5` (Label role) | E.g. `Validé`, `Pressenti`, `Contesté`, `Sans avis`. Color follows the state's reserved color (see §Color). |
| "En train de cuisiner" banner title | `text-base font-semibold leading-6` | Body+600. Recipe name follows in `text-sm font-normal text-foreground-muted` on a separate line. |
| Push-permission banner copy | `text-sm font-normal leading-5 text-foreground` (heading) + `text-xs text-foreground-muted` (helper) | Reuses Body-small + Caption tokens. |
| Cold-start info chip | `text-sm font-medium leading-5` | Inherited Label role. |
| Notification body (system push) | (browser-controlled — not styled by us) | Apple/Chrome render with their own typography. |

**No new `.text-*` utility added in Phase 3.** No italic introduced (italic remains reserved for the Phase-2 live-transcript-interim use case only).

---

## Color

**Inherited from `01-UI-SPEC.md` §Color and the warm-cream theme established quick-260507-hd0.** 60/30/10 palette, brand-rose accent (`oklch(0.645 0.246 16.5)` ≈ `#F43F5E`), `--color-destructive` for errors, light + dark via `prefers-color-scheme`. Phase-2 added `--color-destructive` reserved-for: recording-mic background + Échec badge. Phase 3 inherits both.

### Phase 3 color usages (composing existing tokens + 1 new tint)

| Element | Token | Usage |
|---------|-------|-------|
| Shortlist card surface | `bg-card` + `border-border` + `shadow-card` | Identical to the existing `RecipeCard` look — visual continuity. |
| Front card while dragging right (yes) | `<motion.div>` + overlay `<Heart>` icon at `text-emerald-500` (member-color slot 3) with `useTransform` opacity 0→1 across drag x 0→100 | The yes-overlay borrows emerald from the member-color palette as a SIGNAL color in this transient state. **Allowed reserved usage:** swipe-direction feedback only. |
| Front card while dragging left (no) | overlay `<X>` icon at `text-destructive` with `useTransform` opacity 0→1 across drag x 0→-100 | Re-uses `--color-destructive` for "discard" — natural mapping; no new color. |
| Vote-state colors in summary row | `Validé` → `text-emerald-700` (light) / `text-emerald-300` (dark) on `bg-validé-tint` background; `Pressenti` → `text-amber-700` / `text-amber-300` (no background, just pill border `border-amber-300/60`); `Contesté` → `text-foreground-muted` italic-disallowed (use weight differentiation, not italic); `Sans avis` → `text-foreground-muted`. Rejeté is **not rendered** (D-06). | Validé / Pressenti use member-color hues as semantic state signals, not as member identity. The hue-overlap is acceptable because the summary row already shows two `MemberDot` instances per recipe (member identity is unambiguous via the dots; the row tint communicates STATE). |
| Partner-vote dot on the card (D-07) | `MemberDot` filled with the partner's `color_hex` when their vote is `yes`; `bg-foreground-muted/40` (grey) when no vote yet; `bg-destructive/40` when their vote is `no` | Composes the existing `MemberDot` primitive. |
| "Je commence à cuisiner" CTA in summary | `Button variant="default"` (primary-rose); shows ONLY when ≥1 Validé exists | Re-uses the existing `--color-primary` (brand rose) — no new color. |
| "Tu décides" CTA in summary | `Button variant="default"` (primary-rose); prominent ONLY when 0 Validé/Pressenti exist after all-swiped | Re-uses `--color-primary`. |
| "En train de cuisiner" banner background | `bg-validé-tint` (NEW token, see §Tokens) | Tints the home page top with a subtle warm-emerald — reads as "in progress / approved." |
| Push-permission banner background | `bg-surface-rose-100` (existing — quick-260507-hd0) | Soft rose hint that this is an Al-Dente-branded prompt, not a system notification. |
| Cold-start info chip | `bg-surface-rose-50` + `border-border` + `text-foreground` | Lightly tinted, dismissible chip. |
| Stack peek card | `bg-card opacity-60` | The card behind the front; opacity drops slightly so the front reads as primary. |

### Reserved-for list (additions to Phase 1 & Phase 2's accent contract)

The 10% accent (`--color-primary`, brand rose) gains **no new reserved usages** in Phase 3. The `--color-destructive` token gains **one** new transient reserved usage:

1. **Drag-left overlay icon** on the swipe deck (the ✗ that fades in while dragging toward "no").

The `--color-validé-tint` (NEW) is reserved exclusively for:

1. **"En train de cuisiner" banner background** when a CookingLog exists for today.
2. **`Validé` row tint** in the "Tout vu" summary when both members have voted yes.

It is **not** used elsewhere — never on buttons, never on cards in `/recipes`, never on the bottom nav. If a future phase wants more "approved" surfaces, it must update the reserved-for list explicitly.

**Rationale:** the warm-cream theme + brand-rose accent established in `01-UI-SPEC.md` and quick-260507-hd0 is the visual identity. Decide-phase introduces SEMANTIC color (validé-tint) only where the user reading the screen needs to know "this one is happening." Member-color hues continue to carry member identity exclusively (via `MemberDot`); their re-use as state signals in the summary is permitted because identity is also rendered in the same row.

---

## Copywriting Contract

All Phase-3 strings land in `frontend/lib/i18n/fr.json` under new keys. Voice register inherited: informal `tu`, warm-domestic, sentence-case, no exclamation marks except celebratory ("Validé !", "C'est l'heure !").

### Primary CTAs (verb-first)

| Surface | CTA copy | i18n key |
|---------|----------|----------|
| Shortlist deck — front card thumb buttons | (icon-only `Heart` and `X`; aria-labels: `J'aime cette recette` / `Pas envie ce soir`) | `home.shortlist.vote_yes_aria` / `home.shortlist.vote_no_aria` |
| "Tout vu" summary — when ≥1 Validé exists | `Je commence à cuisiner` (+ recipe title shown above the button as a heading line) | `home.summary.cook_cta` |
| "Tout vu" summary — when 0 Validé/Pressenti | `Tu décides` (single button, primary; below it: `Je vote oui pour les 5` as a one-line helper) | `home.summary.delegate_cta` / `home.summary.delegate_helper` |
| "Tout vu" summary — secondary | `Régénérer le shortlist` (ghost button at the bottom; opens `<RegenerateSheet />`) | `home.summary.regenerate_cta` |
| Filter sheet — apply | `Appliquer les filtres` | `home.filters.apply` |
| Filter sheet — reset | `Réinitialiser` (ghost) | `home.filters.reset` |
| "En train de cuisiner" banner — primary | `Finaliser` (icon: `Sparkles`; navigates to Phase-4 stub for now — see §Loading) | `home.cooking_banner.finalize` |
| "En train de cuisiner" banner — secondary (ghost) | `Passer` (dismisses banner for session via localStorage flag, does NOT delete the log) | `home.cooking_banner.skip` |
| Push-permission banner — primary | `Activer` (calls `Notification.requestPermission()`) | `home.push.activate` |
| Push-permission banner — secondary (ghost) | `Pas maintenant` (dismisses for session, may re-prompt next shortlist) | `home.push.later` |
| Cold-start info chip — dismiss | (icon-only `X`, aria-label `Fermer`) | `common.close` |
| Empty state (no shortlist for today) — primary CTA | `Ajouter une recette` (links to `/recipes/new`) | `home.shortlist.empty_cta` |

CTA convention (extends Phase-1 + Phase-2 lock):
- `Je commence à cuisiner` is the locked phrase from SPEC.md — never paraphrase.
- `Tu décides` is the locked phrase from SPEC.md — never paraphrase.
- `Finaliser` is reserved for the cooking-log finalization step (Phase 4 will own the destination screen; Phase 3 only owns the navigation trigger).
- `Passer` (skip) is reserved for the cooking-banner dismiss only — it does NOT mean "cancel the cooking log" anywhere else.

### Vote-state vocabulary (locked — exact strings, French capitalization)

| State | Display copy | i18n key | Trigger |
|-------|--------------|----------|---------|
| Validé | `Validé` | `vote.state.validé` | Both members voted yes |
| Pressenti | `Pressenti` | `vote.state.pressenti` | One yes, partner unvoted |
| Contesté | `Contesté` | `vote.state.contesté` | One yes + one no |
| Rejeté | (NOT rendered — D-06; key exists for backend logging / future surfaces) | `vote.state.rejeté` | Both no |
| Sans avis | `Sans avis` | `vote.state.sans_avis` | Neither voted (initial state) |

These five strings are SPEC.md-locked. They appear in: the "Tout vu" summary row labels, the optional toast on vote-state transition (see Loading), and any future per-recipe history view.

### Empty states (Phase 3 surfaces)

| Surface | Heading | Body | CTA |
|---------|---------|------|-----|
| Home — no shortlist for today (before 16:00 first use OR corpus too small for a generation) | `Pas encore de shortlist` | `Ton shortlist du jour n'est pas encore prêt. Reviens plus tard ou ajoute des recettes.` | `Ajouter une recette` (links to `/recipes/new`) |
| Home — corpus < 10 recipes (cold-start info chip, in addition to whatever else is shown) | (no separate heading — chip is single-line) | `Ajoute plus de recettes pour de meilleures suggestions.` | (X to dismiss) |
| Home — all 5 cards swiped, all Rejeté | `Aucune recette ne fait l'unanimité ce soir` | `Régénère le shortlist avec un autre filtre, ou choisis « Tu décides ».` | `Régénérer` + `Tu décides` (both visible) |
| "Tout vu" summary — but 0 recipes in shortlist (edge: regenerate returned 0 after filters) | `Aucune recette ne correspond` | `Tes filtres sont peut-être trop restrictifs. Essaie sans `cuisine` ou augmente le temps de préparation.` | `Réinitialiser les filtres` (re-opens sheet pre-cleared) |

### Error states

Inherited toast vs inline rules from Phase 1 + 2. Phase 3 additions:

| Surface | Copy | Placement | i18n key |
|---------|------|-----------|----------|
| Vote POST `/api/shortlists/{id}/recipes/{recipe_id}/vote` network error | `Vote impossible. Réessaie.` | Toast `variant="destructive"` | `home.shortlist.vote_failed` |
| Vote POST while offline (cached PWA, no network) | `Hors ligne. Ton vote sera envoyé à la reconnexion.` | Toast default (informational, not destructive) | `home.shortlist.vote_offline` |
| Delegate `Tu décides` POST failed | `Délégation impossible. Réessaie.` | Toast `variant="destructive"` | `home.summary.delegate_failed` |
| Regenerate POST failed | `Impossible de régénérer. Réessaie.` | Toast `variant="destructive"` | `home.summary.regenerate_failed` |
| `POST /api/recipes/{id}/cook` (start cooking) failed | `Impossible de démarrer la cuisson. Réessaie.` | Toast `variant="destructive"` | `home.summary.cook_failed` |
| Push permission denied at OS level (after user tapped `Activer`) | `Notifications bloquées. Active-les dans les réglages Safari pour recevoir les shortlists.` | Toast default + the banner switches to "denied" state hidden (don't re-prompt the same session) | `home.push.permission_denied` |
| Push subscription POST `/api/push/subscribe` failed (after permission granted) | `Notifications partiellement activées. Réessaie depuis Réglages.` (Phase 4 surfaces this in /settings; Phase 3 just toasts and silently leaves the banner) | Toast `variant="destructive"` | `home.push.subscribe_failed` |
| Service worker registration failed (rare — no SW = no push) | (silent; no UI — push banner simply doesn't appear) | (none) | (none) |

### Success / state-transition notifications

Inherited Sonner pattern. Phase 3 adds:

| Trigger | Copy | Variant | i18n key |
|---------|------|---------|----------|
| Vote-state transition: a recipe goes from `Pressenti` → `Validé` (because partner just voted yes via realtime) | `Validé : « {title} »` | default | `home.shortlist.toast_validé` |
| Vote-state transition: a recipe goes from `Sans avis` / `Pressenti` → `Contesté` (mismatch from partner) | (no toast — too noisy if both members swipe in parallel; the summary row update IS the feedback) | n/a | n/a |
| `Tu décides` succeeds | `Tu décides ! On regarde ce que ta partenaire en pense.` | default | `home.summary.toast_delegated` |
| `Je commence à cuisiner` succeeds | `C'est parti ! Bon appétit.` | default | `home.summary.toast_cooking_started` |
| New shortlist arrived via APScheduler push (user is in-app at 16:00) | `Ton shortlist du jour est prêt.` | default | `home.shortlist.toast_arrived` |
| Push permission granted | `Notifications activées.` | default | `home.push.toast_activated` |

**Rate-limiting:** the `Validé` transition toast fires AT MOST ONCE per recipe per shortlist (track in component state). If both phones swipe yes within ~200ms, both phones still see one toast each, not two. Sonner's default dedup-by-id handles this if we pass `id: recipe.id` to `toast()`.

### Destructive confirmations (Phase 3)

**One** added: tapping `Passer` on the cooking banner. Per D-08 the log itself is NOT deleted; the banner is dismissed for the session. So the destructive surface is light:

| Action | Trigger | Confirmation copy | Confirm button |
|--------|---------|-------------------|----------------|
| Skip cooking-banner for the session (D-08) | `Passer` button on the banner | **No confirmation.** The action is non-destructive (log persists). The banner reappears next session if the log is still un-finalized. | (immediate — no AlertDialog) |
| Re-vote (changing your vote on a card you've already swiped — Phase 3 supports this only if you scroll back into the deck via "Tout vu" summary tap) | Tap a recipe row in summary → opens detail with current vote highlighted; tapping the opposite chip flips the vote | **No confirmation.** Vote upserts; backend computes new state. | (immediate) |
| Cancel cooking (Phase 4 will own this — productize-later in Phase 3) | n/a in Phase 3 | (out of Phase 3 scope) | n/a |

**No new `AlertDialog`-gated destructive surface in Phase 3.**

### Loading states (Phase 3 additions)

| Surface | Pattern | Implementation |
|---------|---------|----------------|
| Home first paint (cold-load, no cached shortlist) | `Skeleton` block matching the deck shape (one `aspect-[3/4] rounded-2xl` Skeleton + two thumb-button Skeletons below) | Render via the existing `app/loading.tsx` segment loader OR inline component conditional. Either is fine. |
| Vote in flight (between thumb-button tap and POST response) | Front card animates off-screen IMMEDIATELY (optimistic); thumb buttons disable while request is pending | Optimistic UI: trust the swipe, reconcile on response. If POST fails, animate the card BACK to center + show the error toast. |
| Vote in flight (swipe gesture path) | Card already flying off-screen; backend POST happens in parallel; rollback animates card back if backend fails | Same as above — optimistic. |
| Regenerate in flight (after `Régénérer le shortlist` tap) | Ghost button shows `Loader2 animate-spin` + label `Régénération…`; entire deck dims to `opacity-60 pointer-events-none` until response | Backend latency target ~500ms; if longer, the deck dim is the patience signal. |
| `Tu décides` in flight | Button shows spinner + `Délégation…`; on success the summary updates in place | Standard pattern. |
| `Je commence à cuisiner` in flight | Button shows spinner + `…` (just three dots, no word — the icon is enough) | Brief state. |
| Push subscription in flight (after `Activer` and permission granted) | Banner background dims, button shows spinner | <500ms typically; if exceeds, no escalation needed. |
| Realtime `vote.created` arrives for a recipe in the current deck | Partner-vote dot animates from grey → colored via `motion-safe:animate-in` (or framer-motion `<motion.span>` with `animate={{ scale: [1, 1.2, 1] }}` for a brief pulse, 200ms) | If `prefers-reduced-motion`, the dot just changes color instantly. |
| Cooking banner waiting for log finalization | (no spinner — banner just persists. Phase 4 owns the finalization screen.) | n/a |
| **Reduced-motion fallback for swipe deck** | Drag is DISABLED (`drag={false}`). Only the thumb buttons cast votes. Card transitions are instant (no fly-off animation). | Hard requirement — `prefers-reduced-motion: reduce` already collapses all transitions per existing `globals.css`. The `drag` prop on `motion.div` MUST be conditionally `false` when reduced-motion is detected. |

---

## Component Inventory (Phase 3 additions)

### shadcn/ui primitives — already pasted, reused as-is

`button`, `input`, `label`, `tabs`, `sheet`, `dialog`, `alert-dialog`, `sonner`, `scroll-area`, `separator`, `skeleton`, `badge`, `card`, `select`, `textarea`. **No new shadcn primitive added in Phase 3.**

> **Note on shadcn registry safety:** `frontend/components.json` has `"registries": {}` — only the official shadcn registry is in use. Phase 3 does not introduce any third-party registry. The Registry Safety table reflects this.

### App-composed components — Phase 3 introduces

Pasted under `frontend/components/`. Names locked here so the planner uses these exact filenames.

| Component | Purpose | Composition / Notes |
|-----------|---------|---------------------|
| `HomeDecide.tsx` | Top-level Home content router. Decides which sub-component to render: deck / "Tout vu" summary / empty state / cold-start chip / cooking banner / push banner. | Replaces the hero+CTA block in `app/page.tsx`. Wraps in `OnboardingGuard` (already present). |
| `ShortlistDeck.tsx` | Card stack with up to 2 visible cards (front + peek). Maintains vote queue + animates committed cards off-screen. | Uses `framer-motion` `<AnimatePresence />`. Internally renders `ShortlistCard` per visible card. |
| `ShortlistCard.tsx` | Single card — title, photo, cuisine + mood + prep-time meta, partner-vote dot bottom-right, drag handlers. | `motion.div drag="x"` on the front card; non-draggable on peek cards (`drag={false}`). Uses `useMotionValue` + `useTransform` for rotate + overlay opacity. |
| `ShortlistCardOverlay.tsx` (optional — may inline) | The fade-in `Heart` (right-drag) and `X` (left-drag) icons over the card. | `<motion.div>` with `style={{ opacity: yesOpacity }}`. |
| `VoteSummary.tsx` | "Tout vu" view — list of recipe rows + state labels + member dots + bottom CTAs. | Re-renders on `vote.created` realtime events. |
| `VoteSummaryRow.tsx` (optional — may inline) | One row in the summary: recipe title + state pill + 2 member dots. | `MemberDot` × 2; state-label color from §Color table. |
| `CookingBanner.tsx` | Persistent banner shown when an un-finalized `CookingLog` exists for today. | Reads from `GET /api/cooking-logs/active` (or equivalent — backend planner picks shape). Has `Finaliser` + `Passer` actions. |
| `PushPermissionBanner.tsx` | Inline banner — D-09. Shows on first shortlist event if `Notification.permission === "default"` AND user has not dismissed for the session. | Calls `Notification.requestPermission()` on `Activer`; on grant, calls `registerPushSubscription()` from `lib/push.ts`. |
| `ColdStartChip.tsx` | Dismissible info chip shown when corpus < 10 recipes. | Single line, `X` icon to dismiss. localStorage flag per session. |
| `RegenerateSheet.tsx` | Bottom sheet with shortlist filter form (cuisine, max prep time, exclude protein, required moods). Submit calls `POST /api/shortlists/regenerate`. | shadcn `Sheet` side `bottom`. Uses existing `Select` + `Input` primitives + a new chip-toggle for moods (or a simpler multi-`Checkbox`). Planner picks. |
| `VoteDot.tsx` (optional thin wrapper) | Specialized member-dot for vote rendering: yes/no/unvoted variants. | Composes `MemberDot`. May just be a render-prop on `MemberDot` itself — planner picks. |

### Realtime handler additions (existing component mutations)

| File | Mutation |
|------|----------|
| `RealtimeProvider.tsx` | Add `vote.created` event handler (alongside the existing `recipe.created` / `recipe.updated` / `recipe.promoted`). Payload shape per CONTEXT.md "Established Patterns": `{ recipe_id, shortlist_id, member_id, vote, state }`. Consumers re-read shortlist state OR optimistically merge. |
| `BottomNav.tsx` | **No mutation.** The home tab segment is `null` (already correct); the page just renders different content. |

### Iconography (Phase 3 additions)

Lucide icons only. Phase 3 vocabulary additions:

| Icon | Used for |
|------|----------|
| `Heart` | Yes / love this card (thumb-button + drag-right overlay) |
| `X` | No / not tonight (thumb-button + drag-left overlay) — already in Phase-1 vocabulary as "clear" but reused here for the card-vote button |
| `ChefHat` | "Je commence à cuisiner" CTA + "En train de cuisiner" banner heading |
| `Bell` | Push-permission `Activer` button leading icon |
| `BellOff` | Push permission denied state in /settings (Phase 4 surface; Phase 3 only toasts) |
| `Sparkles` | "Finaliser" button leading icon — celebratory cue |
| `Filter` | Regenerate sheet trigger button |
| `RotateCw` | Regenerate sheet "Régénérer" submit-button leading icon (or the in-place regenerate button on the summary) |
| `Hand` | (optional, not required) — could prefix the `Tu décides` button. Planner may include or omit. |

Sizes: 16px (inline meta), 20px (default), 24px (thumb-button icons inside the `h-14` button), 48px (empty-state hero — inherited).

---

## Layout & Navigation

### Bottom navigation (PWA shell)

**Unchanged.** D-01 explicit: 4 tabs, no 5th tab needed. Home tab segment = `null`. Phase 3 only changes WHAT renders in the Home tab, not the nav itself.

### Home tab content tree (NEW)

```
<main> (existing; OnboardingGuard wraps)
  ├── <PushPermissionBanner />        (conditional — only if shortlist arrived this session AND permission default)
  ├── <CookingBanner />               (conditional — only if active CookingLog exists)
  ├── <ColdStartChip />               (conditional — only if corpus < 10 AND not dismissed this session)
  └── <HomeDecide />                  (always — picks deck OR summary OR empty state)
       ├── If shortlist exists AND has un-voted cards → <ShortlistDeck />
       ├── If shortlist exists AND all cards voted → <VoteSummary />
       └── If no shortlist for today → <EmptyState heading="Pas encore de shortlist" ... />
```

### Routes (App Router) — Phase 3

Phase 3 adds **zero new routes**. All UI lives at `/`. The "Finaliser" button on the cooking banner navigates to a stub at `/cooking-logs/[id]/finalize` that Phase 4 fills (Phase 3 ships an `EmptyState`-style placeholder there: heading `Finalisation à venir`, body `Cette page arrivera dans la prochaine vague.`, no CTA).

| Route | Purpose | Has bottom nav? | Phase |
|-------|---------|-----------------|-------|
| `/` (home) | Decide layer (deck / summary / banners / empty) | Yes | 3 (mutates Phase-1 page) |
| `/cooking-logs/[id]/finalize` | Phase-4 stub in Phase 3 | Yes | 3 (stub) → 4 (real) |

No filter route — the regenerate filter form is a `<Sheet>` on `/`, not a separate page. No "shortlist history" route in v0.1 (productize-later per CONTEXT.md deferred).

### Responsiveness

Inherited from Phase 1 (`max-w-md` cap on `<main>`, mobile-first 390pt baseline). The swipe deck card aspect (`aspect-[3/4]`) gives a comfortable canvas at every viewport above ~360px wide. No separate tablet/desktop layout.

### Safe-area insets

Inherited from Phase 1. The cooking banner sits ABOVE the deck — both inside the existing safe-area-aware `<main>` flex column.

---

## Interaction Patterns

### Swipe deck (D-03 + D-04 + D-05)

- **Swipe right past 100px OR with velocity ≥500px/s = yes vote.** Card animates off-screen to the right (1.4× viewport width) over 200ms ease-out, then unmounts.
- **Swipe left past 100px OR with velocity ≥500px/s = no vote.** Symmetric.
- **Release before threshold** = card snaps back to center (200ms ease-out spring).
- **Thumb-button tap = same vote pathway** — programmatic-trigger the off-screen animation via framer-motion `animate()` then call the same vote-handler.
- **Both inputs are equally first-class.** Neither is hidden, neither is the "fallback." Per D-03.
- **Rotation tied to drag x** — `useTransform(x, [-200, 200], [-15, 15])`. Max ±15° tilt at full drag.
- **Yes-overlay opacity** — `useTransform(x, [0, 100], [0, 1])`. The `Heart` icon at `text-emerald-500` fades in across the right-drag range.
- **No-overlay opacity** — `useTransform(x, [-100, 0], [1, 0])`. The `X` icon at `text-destructive`.
- **Front card has `drag="x"`.** Peek card has `drag={false}` — only the front is interactive.
- **Reduced-motion override:** when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, the `motion.div` renders with `drag={false}` AND no rotation transform. Voting is thumb-button-only, and committed cards disappear instantly (no fly-off). The user experience is intentionally less playful but fully functional.

### Optimistic UI for vote → realtime path

- The **swiper's** phone updates the deck optimistically: card flies off, partner-vote dot updates from `vote.created` echo (same as recipe creation in Phase 1).
- The **partner's** phone updates from the `vote.created` WS event silently — the partner-vote dot on the corresponding card (if still in their deck) animates from grey → colored. The summary row (if they're already in summary state) updates label + tint. **No toast.** The dot/row update IS the notification.
- **Exception:** if a vote causes a Pressenti → Validé transition AND the partner is the one who just made it Validé, the swiper sees a Sonner toast `Validé : « {title} »` (warm celebration). Rate-limited as documented in §Loading.
- If the WS event arrives before the swiper's HTTP response, dedupe by `(recipe_id, member_id)` (don't double-render).

### Toast vs inline rules (Phase 3 additions)

| Situation | Pattern |
|-----------|---------|
| Vote POST network error | Toast (rolls back the optimistic swipe) |
| `Tu décides` POST network error | Toast |
| `Je commence à cuisiner` POST network error | Toast |
| Pressenti → Validé via partner | Toast (rate-limited per recipe) |
| Vote POST while offline | Toast (informational, default variant) |
| Push permission grant | Toast (default) |
| Push permission deny | Toast (default — informational, not destructive — per copy) |
| Realtime `vote.created` (general) | List/dot update only, no toast |
| Realtime `recipe.promoted` (Phase-2 contract carried) | Toast (inherited from Phase 2) |

### Confirmation patterns

Inherited. **No new `AlertDialog` confirmations in Phase 3** (per §Destructive Confirmations).

### Tap targets

All interactive elements ≥44×44px. Thumb-buttons are 56×56 (above min). The partner-vote dot is 12px (decorative — NOT a tap target; the whole card is the tap surface). The summary-row recipe entry is the tap surface to re-open a card / change vote — its container row min-height is `h-14` (56px).

### Veto-window UX (VOTE-04)

- Veto window closes when the FIRST CookingLog is created for the day. Per SPEC.md, later `no` votes are still recorded, but cannot un-cook.
- **UX surface:** the cooking-banner replaces the deck-area (or sits visibly above it). The deck is still navigable for vote-changing on remaining cards, BUT the "Je commence à cuisiner" CTA on those cards is **disabled** (greyed) and a small caption appears: `Une cuisson est déjà en cours.` per recipe row in the summary.
- This is the single user-visible UI for veto-closing. No banner copy explicitly says "voting is closed" — the cooking banner IS the explanation.

### Filter regenerate sheet UX

- Trigger: `Filter` icon-button in the summary view bottom row (next to `Régénérer` ghost button), OR the `Régénérer` button itself opens the sheet directly. Planner picks ONE pattern (avoid both — confusing). Recommended: `Régénérer le shortlist` opens the sheet directly; tapping `Appliquer les filtres` runs the regenerate POST.
- Filter form fields:
  - **Cuisine** — `Select` from the locked `Cuisine` enum (frontend/lib/enums.ts). Default: "Toutes".
  - **Max prep time** — number Input with French unit `min`. Default: empty.
  - **Exclude protein** — `Select` from `Protein` enum + "Aucune". Default: empty.
  - **Required moods** — multi-select; recommended UI: chip toggles (`Badge`-like clickable chips that toggle aria-pressed). Default: none selected.
- Sheet height: `max-h-[80svh]` (reuses Phase-2 voice-modify-sheet height token).
- Submit calls `POST /api/shortlists/regenerate`; deck refreshes with the new generation.

### Push-permission flow (D-09 + D-10)

- The banner appears the FIRST time a shortlist arrives in-app (cron-generated OR user-regenerated). Trigger: any `home.shortlist.toast_arrived` toast event.
- Banner copy: heading `Active les notifications` + body `Pour savoir quand ton shortlist du jour est prêt.` + buttons `Activer` / `Pas maintenant`.
- On `Activer`: call `Notification.requestPermission()`. On grant: call `registerPushSubscription()` from `lib/push.ts` (POSTs to `/api/push/subscribe` with the `PushSubscription.toJSON()` shape). On grant, banner dismisses + success toast.
- On `Pas maintenant`: dismiss for the session via localStorage flag `dismissed_push_banner_at` = ISO timestamp. Re-prompt next session if shortlist arrives again. Do NOT spam — at most one banner per app session.
- If `Notification.permission === "denied"` already (user pre-denied OR previously dismissed at OS level): banner does NOT render at all. Phase 4's `/settings` will surface a re-enable hint (out of Phase 3 scope).
- **System-push notification content (D-10):** title `Al Dente` · body `Ton shortlist du jour est prêt !` · on tap → opens the PWA at `/`. Body is intentionally generic — no recipe titles, no surprises spoiled.
- **iOS PWA-only constraint** (per `03-RESEARCH.md`): web push only works on iOS 16.4+ for INSTALLED PWAs (not in-Safari). The banner copy assumes the user has installed (which the install hint from Phase 1 prompts). If detected in-Safari (`!navigator.standalone` on iOS), the banner is suppressed entirely.

---

## Surface-by-Surface Pinning

This section pins concrete utility-class strings the planner can drop into `acceptance_criteria`. Format: `<Surface>` → key elements with classes.

### 1. Home — empty state (no shortlist for today)

```
- Outer:  flex flex-col flex-1 items-center justify-center px-6 py-12 gap-3
- Icon Lucide Sparkles 48px text-foreground-muted
- Heading "Pas encore de shortlist":  text-xl font-semibold leading-7
- Body "Ton shortlist du jour n'est pas encore prêt...":  text-base text-foreground-muted max-w-xs text-center
- CTA Button (default, h-11)  "Ajouter une recette"  → /recipes/new
```

(Reuses the existing `<EmptyState />` component — no new component for this surface.)

### 2. Home — Cold-start info chip (corpus < 10)

```
- Outer:  mx-6 mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-rose-50 border border-border
- Icon Lucide Sparkles 16px text-foreground-muted
- Body "Ajoute plus de recettes pour de meilleures suggestions.":  text-sm font-medium leading-5 flex-1
- Dismiss Button size="icon" variant="ghost" h-8 w-8 aria-label="Fermer", Lucide X 16px
- Dismiss persists via localStorage["dismissed_cold_start_chip"] = ISO timestamp
```

### 3. Home — Push-permission banner

```
- Outer:  mx-6 mt-4 flex items-start gap-3 px-4 py-3 rounded-2xl bg-surface-rose-100 border border-border
- Icon Lucide Bell 20px text-primary
- Body block flex-1 flex flex-col gap-1
   - Heading "Active les notifications":  text-base font-semibold leading-6
   - Body "Pour savoir quand ton shortlist du jour est prêt.":  text-sm text-foreground-muted leading-5
- Actions  flex flex-col gap-2 ml-2
   - Primary Button "Activer"  variant="default" size="sm" h-9 px-4
   - Secondary Button "Pas maintenant"  variant="ghost" size="sm" h-9 px-4
```

### 4. Home — "En train de cuisiner" banner

```
- Outer:  mx-6 mt-4 flex items-center gap-3 px-4 py-3 min-h-16 rounded-2xl bg-validé-tint border border-border
- Icon Lucide ChefHat 24px text-emerald-700 (light) / text-emerald-300 (dark)
- Body block flex-1 flex flex-col gap-0.5
   - Title "En train de cuisiner":  text-base font-semibold leading-6
   - Recipe name (dynamic):  text-sm text-foreground-muted leading-5 line-clamp-1
- Actions  flex items-center gap-2
   - Primary Button "Finaliser"  variant="default" size="sm" h-9 px-4 with leading <Sparkles size={16} />
   - Secondary Button "Passer"  variant="ghost" size="sm" h-9 px-3
```

### 5. Home — Shortlist deck container

```
- Outer:  flex flex-col flex-1 items-center justify-center px-4 pt-4 pb-24 gap-6
- Stack container:  relative w-full max-w-sm aspect-[3/4]
   (Two motion.div children absolute-positioned; front on top, peek behind)
- Thumb buttons row:  flex items-center justify-center gap-12
   - No button:    Button size="icon" variant="outline" className="h-14 w-14 rounded-full border-2 border-destructive/50 hover:bg-destructive/10 active:scale-95 transition-transform"
                   <X size={24} className="text-destructive" />
                   aria-label "Pas envie ce soir"
   - Yes button:   Button size="icon" variant="outline" className="h-14 w-14 rounded-full border-2 border-emerald-500/50 hover:bg-emerald-500/10 active:scale-95 transition-transform"
                   <Heart size={24} className="text-emerald-500" />
                   aria-label "J'aime cette recette"
```

### 6. Shortlist card (front of stack, draggable)

```
- Outer (motion.div):  absolute inset-0 bg-card border border-border rounded-2xl shadow-card-hover overflow-hidden flex flex-col
   - drag="x" (or false if reduced-motion)
   - dragConstraints={{ left: 0, right: 0 }}
   - style={{ x, rotate }}  (motion values)
- Photo region:  relative aspect-[4/3] bg-surface-muted
   - <img className="absolute inset-0 w-full h-full object-cover" />
   - OR if no photo: bg-surface-muted with centered Lucide UtensilsCrossed 48px text-foreground-muted
- Yes overlay (absolute, motion):  absolute top-6 left-6 rotate-[-15deg] origin-top-left
                                    px-3 py-1 rounded-md border-2 border-emerald-500
                                    text-emerald-500 font-bold text-2xl tracking-wider
                                    style={{ opacity: yesOpacity }}
                                    "OUI"
- No overlay (absolute, motion):    absolute top-6 right-6 rotate-[15deg] origin-top-right
                                    px-3 py-1 rounded-md border-2 border-destructive
                                    text-destructive font-bold text-2xl tracking-wider
                                    style={{ opacity: noOpacity }}
                                    "NON"
- Body:  flex-1 flex flex-col gap-3 p-5
   - Title:  text-title text-foreground line-clamp-2
   - Meta row:  flex items-center gap-2 flex-wrap
       - Badge variant="secondary": cuisine (if set)
       - Badge variant="secondary": each mood
       - <span text-sm font-medium text-foreground-muted>{prep_time} min</span>
- Partner-vote dot footer:  absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/70 backdrop-blur-sm
   - <MemberDot colorHex={partner.color_hex} size={10} /> if partner voted yes
     OR <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted/40" /> if no vote
     OR <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" /> if partner voted no
   - <span text-xs font-medium text-foreground-muted>{partner.name}</span>
```

### 7. Shortlist card (peek — behind front)

```
- Outer (motion.div):  absolute inset-0 bg-card border border-border rounded-2xl shadow-card overflow-hidden
   - style={{ scale: 0.94, y: 12, opacity: 0.6 }}
   - drag={false}
   - pointer-events-none
- Body: same as front but opacity-60 (visually only — content rendered for cross-fade-in when promoted to front)
```

### 8. "Tout vu" summary

```
- Outer:  flex flex-col flex-1 px-6 pt-6 pb-24 gap-6
- Heading "Vous avez tout vu":  text-xl font-semibold leading-7
- Recipe rows list:  flex flex-col gap-3
   - Each row:  flex items-center gap-3 px-3 py-3 min-h-14 rounded-xl bg-card border border-border
     {state === 'validé' ? 'bg-validé-tint border-emerald-500/30' : ''}
       - Photo thumbnail 12x12 rounded-lg  (or surface-muted placeholder)
       - Body block flex-1 flex flex-col gap-1 min-w-0
          - Title:  text-base font-semibold leading-6 line-clamp-1
          - State pill:  text-sm font-medium leading-5
              - 'Validé':       text-emerald-700 dark:text-emerald-300
              - 'Pressenti':    text-amber-700 dark:text-amber-300
              - 'Contesté':     text-foreground-muted
              - 'Sans avis':    text-foreground-muted
       - Member dots column:  flex items-center gap-1.5
          - <MemberDot colorHex={me.color_hex} size={10} /> or grey/destructive variant per my vote
          - <MemberDot colorHex={partner.color_hex} size={10} /> or grey/destructive variant per partner vote

- CTAs block (bottom):  flex flex-col gap-3 pt-4
   - If ≥1 Validé exists:
       - Heading copy:  text-base font-medium text-foreground "Tu commences ?"
       - Validé recipe title:  text-title  line-clamp-1
       - Primary Button "Je commence à cuisiner"  variant="default" h-14 rounded-2xl  with leading <ChefHat size={20} />
   - Else if ≥1 Pressenti exists:
       - Body copy:  text-sm text-foreground-muted  "Ta partenaire n'a pas encore voté. Tu peux déléguer."
       - Primary Button "Tu décides"  variant="default" h-14 rounded-2xl
   - Else (all Contesté or Sans avis):
       - Body copy:  text-sm text-foreground-muted  "Aucune recette ne fait l'unanimité ce soir."
       - Primary Button "Tu décides"  variant="default" h-14 rounded-2xl
       - Secondary ghost Button "Régénérer le shortlist"  variant="ghost" h-11
   - ALWAYS shown at bottom (regardless of CTA above):
       - Ghost Button "Régénérer le shortlist"  variant="ghost" h-11  with leading <RotateCw size={16} />
```

### 9. Filter regenerate sheet

```
- Sheet side="bottom" max-h-[80svh]
- Inner:  flex flex-col gap-6 px-6 pt-6 pb-8
   - Heading "Régénérer le shortlist":  text-xl font-semibold
   - Body "Ajuste les critères et on te propose 5 recettes.":  text-sm text-foreground-muted
   - Field stack  flex flex-col gap-4
      - <Label>Cuisine</Label> + <Select>  options from Cuisine enum + "Toutes"
      - <Label>Temps maximum (min)</Label> + <Input type="number" placeholder="30">
      - <Label>Exclure une protéine</Label> + <Select>  options from Protein enum + "Aucune"
      - <Label>Humeurs requises</Label> + chip-toggle row  flex flex-wrap gap-2
            (each chip: Button variant=outline/ghost size=sm h-8 px-3 rounded-full, aria-pressed bound)
   - Action row  flex flex-col gap-3 pt-2
      - Primary Button "Appliquer les filtres"  variant="default" h-11
      - Ghost Button "Réinitialiser"  variant="ghost" h-11
```

### 10. Cooking-finalize stub (Phase-3 placeholder for Phase-4)

```
- Route:  /cooking-logs/[id]/finalize
- Body:  <EmptyState icon={Sparkles} heading="Finalisation à venir" body="Cette page arrivera dans la prochaine vague." />
   (No CTA — user uses bottom nav to leave.)
```

### 11. Realtime indicators

**Per CONTEXT.md and architecture invariant #4:** silent self-healing. NO connected indicator in v0.1. NO toast on partner-side `vote.created`. The dot/row update IS the notification. Inherited from Phase 1.

The single Phase-3 exception: Pressenti → Validé partner-side transition triggers a celebration toast (see §Loading). This is the ONLY toast for a partner-driven realtime update in the entire app surface.

---

## Motion

Phase 3 introduces `framer-motion` for the swipe deck and re-uses Tailwind v4 utility transitions for everything else. Motion tokens inherited from Phase 1 + existing `globals.css` shadow scale.

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `motion-fast` | 150ms | `ease-out` | (inherited) Hover/active state changes, button color shifts |
| `motion-default` | 200ms | `ease-out` | (inherited) Card snap-back to center after sub-threshold drag, partner-vote-dot color animation, list-item enter |
| `motion-slow` | 300ms | `ease-in-out` | (inherited) Sheet/Drawer open from bottom, banner enter |
| `motion-flyoff` | 200ms | `ease-out` | NEW — Phase 3 — Card committed-vote fly-off animation. Same duration as `motion-default`; feels snappy, not floaty. |

framer-motion-specific values:
- `dragElastic: 0.2` — slight rubber-band feel at constraints (constraints are `{ left: 0, right: 0 }` since we don't lock movement, but elastic is on the unbounded axis).
- Spring config for snap-back: `type: "spring", stiffness: 400, damping: 40` — feels iOS-native.
- Fly-off `animate`: `x: SWIPE_FLY_OFFSCREEN_PX (signed)`, `transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] }`.

### `prefers-reduced-motion`

Honor `@media (prefers-reduced-motion: reduce)` — already wired in `globals.css` (animations + transitions clamped to 0ms). framer-motion ALSO needs explicit gating:
- The `<motion.div>` on the front card sets `drag={prefersReducedMotion ? false : "x"}`.
- Card-rotation `useTransform` is replaced with `0` (no rotation) when reduced-motion.
- Yes/No overlay icons disabled (the thumb buttons handle the affordance).
- Card fly-off animation duration set to 0 (instant unmount).
- Partner-dot color-pulse animation disabled (instant color change).

This is non-negotiable — reduced-motion users MUST be able to vote via the thumb buttons, and the deck must remain functional.

---

## Accessibility

Inherited from Phase 1 + 2. Phase 3 additions:

- **Swipe deck has thumb-button parity (D-03).** Voice-over / screen-reader users use the thumb buttons exclusively; the deck is announced as a region with the front-card title as its label.
- **Front card has `role="article"` + `aria-labelledby` pointing to the title heading id.** Card title is `<h2>` semantically (visually `text-title`).
- **Thumb buttons have explicit aria-labels** (D-03): `J'aime cette recette` / `Pas envie ce soir`. NOT just emoji icons — the icon-only buttons must announce intent.
- **Partner-vote dot has aria-label** in the format `{partner_name} : {oui|non|pas encore voté}`.
- **Vote-state pills are text-based** (the state name `Validé`/`Pressenti`/`Contesté`/`Sans avis` is rendered, not just color-coded). Color is reinforcement, not the only carrier of meaning. WCAG-AA contrast required for all four state colors against their backgrounds.
- **Live region for partner-vote updates:** when a `vote.created` event from the partner updates the current view, announce via an `aria-live="polite"` region tucked off-screen: `Ta partenaire a voté oui pour {title}` / `non pour {title}`. This is the realtime accessibility contract — partner activity must reach screen-reader users without being a toast.
- **Cooking banner is a `role="region"` aria-labelledby="cooking-banner-title"`.**
- **Push banner is a `role="region"`** with the `Activer` and `Pas maintenant` buttons in source order.
- **Reduced-motion compliance** (above) — non-negotiable.
- **Tap target ≥44px** — all buttons in deck/summary/banners. Thumb buttons are 56px (above min). Member dots are decorative-only (not tap targets).
- **Color contrast** — vote-state colors on their backgrounds must pass WCAG-AA in BOTH light and dark mode. Validé green has been chosen with this in mind (700-shade text on tinted-100 background passes; 300-shade text on tinted-900 background passes).

---

## Internationalization

- All Phase-3 strings in `frontend/lib/i18n/fr.json` (informal `tu`).
- New i18n key prefixes: `home.shortlist.*`, `home.summary.*`, `home.cooking_banner.*`, `home.push.*`, `home.cold_start.*`, `home.filters.*`, `vote.state.*`, `home.empty.*`.
- ICU plural for "1 recette validée" / "2 recettes validées" if the summary ever needs a count (currently it doesn't — the row list is the count).
- Number formatting: `Intl.NumberFormat('fr-FR')` for any prep-time > 999 (rare).
- Locked phrases (per SPEC.md, never paraphrase): `Tu décides`, `Je commence à cuisiner`, `Validé`, `Pressenti`, `Contesté`, `Rejeté`, `Sans avis`.
- Quotation marks: `«»` (French guillemets with non-breaking spaces) for recipe titles in toasts and copy. Match Phase-2 convention.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | (existing 15 primitives — no NEW shadcn primitive added in Phase 3) | not required |
| third-party (none) | n/a | not applicable — `frontend/components.json` has `"registries": {}`, no third-party registry declared. |

**No third-party registry vetting required.** All Phase-3 visual surfaces are composed from already-installed shadcn primitives + custom components + framer-motion (a standard npm dep, not a shadcn registry).

---

## Implementation Notes (handoff to planner)

These are not contract requirements — they're hints to keep implementation aligned:

1. **framer-motion install path:** `npm install framer-motion@^12` per `03-RESEARCH.md`. The package was renamed to `motion` upstream but the legacy `framer-motion` import path still works on v12; both ship the same build. Use `import { motion, useMotionValue, useTransform, AnimatePresence, type PanInfo } from "framer-motion"` to match Tinder-deck reference examples.
2. **Existing PWA install hint Card** (in `frontend/app/page.tsx`) is per-device PWA UX — not Decide content. It can stay where it is (above or below the deck) OR move to `/settings`. Planner picks. The simplest move: keep it inline at the top of `/` only when `!navigator.standalone`, above the new banners.
3. **Swipe-deck virtualization:** with ≤5 cards there's no perf concern — render all cards in DOM at once; let `AnimatePresence` handle the off-screen exit. No need for windowing.
4. **Vote upsert vs insert-and-latest-wins:** CONTEXT.md leaves this to the planner. The frontend doesn't care — `compute_vote_state` works either way. Planner picks the simpler backend path.
5. **Filter chip-toggle widget:** can be a thin wrapper around `Badge` (paint as a button) or a custom small component. Don't over-engineer — these chips appear in ONE place.
6. **`vote.created` payload includes computed state** per CONTEXT.md "Established Patterns". Frontend trusts the state field for cheap row-update; if it disagrees with locally-recomputed state, log a console warning (drift detection, never user-visible). The frontend `compute_vote_state` mirror lives in `frontend/lib/votes.ts` per `03-RESEARCH.md §Architecture Patterns`.
7. **Cooking-finalize stub** at `/cooking-logs/[id]/finalize` is a 6-line component. Don't over-build — Phase 4 owns the destination.
8. **Push subscription endpoint** on the backend needs the VAPID public key delivered to the frontend. Planner picks: either embed at build-time via `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env var (simplest), or fetch from `GET /api/push/vapid-public-key` (one extra round-trip, more flexible). Recommended: env var for v0.1 since Luca controls both deploys.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (verb-first CTAs, locked vote-state vocabulary, French informal `tu`, no exclamation except celebratory `Validé !`)
- [ ] Dimension 2 Visuals: PASS (4 sizes / 2 weights typography reused, single new `--color-validé-tint` token with explicit reserved-for, member-color hues only used in summary alongside MemberDot for unambiguous identity)
- [ ] Dimension 3 Color: PASS (60/30/10 inherited; one new tint with reserved-for list of 2; destructive reused only for drag-left overlay)
- [ ] Dimension 4 Typography: PASS (4 sizes, 2 weights + Label-only 500, no italic added)
- [ ] Dimension 5 Spacing: PASS (4-multiple subset; documented `gap-1.5` exception inherited from Phase 1; explicit numeric motion thresholds)
- [ ] Dimension 6 Registry Safety: PASS (no third-party registry; `components.json` registries map empty)

**Approval:** pending (gsd-ui-checker upgrade to `approved`)

---

*Phase: 03-decide-w3*
*UI-SPEC drafted: 2026-05-07*
