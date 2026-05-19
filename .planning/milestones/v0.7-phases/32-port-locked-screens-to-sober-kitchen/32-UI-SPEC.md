---
phase: 32
slug: port-locked-screens-to-sober-kitchen
status: draft
shadcn_initialized: true
preset: "al-dente (existing) — shadcn primitives already in @/components/ui/* (button, card, input, sonner, tooltip, dialog, …); components.json present"
created: 2026-05-18
authoritative_source: docs/design-system.html §15 + locked screens (#accueil, #bibliotheque, #recette)
---

# Phase 32 — UI Design Contract

> **This UI-SPEC is an executable digest of `docs/design-system.html` §15.** It is **not** a redesign — the design system doc is the contract. Every section below cross-references back. Where this file and the doc disagree, **the doc wins** and this file is wrong. Planner: deviations must be raised before plan close.

---

## 0. Pre-population Provenance

| Source | Decisions Pulled In | Count |
|--------|---------------------|-------|
| `CONTEXT.md` (USER DECISIONS — locked) | D-01..D-23, plus deferred set | 23 + 9 deferred |
| `RESEARCH.md` (verified findings) | Pattern 1-8, 8 pitfalls, A1-A6 assumptions | 8 + 8 + 6 |
| `REQUIREMENTS.md` | SOBER-01..08, §Out of Scope | 8 reqs + 9 cuts |
| `ROADMAP.md` (Phase 32 success criteria) | 6 acceptance gates | 6 |
| `docs/design-system.html` §15 + locked screens | Token table verbatim, primitive CSS verbatim, screen composition | full §15 |
| `CLAUDE.md` invariants | #2, #4, #6, MVP posture, locked vocabularies | 5 invariants |
| User input this session | None — `--auto` mode | 0 |

**Open Questions surfaced (deferred per `--auto`):**
- A1 — themeColor exact hex for `oklch(0.50 0.10 32)`. Default chosen: `#8B4A35` (planner verifies with CSS Color 4 calculator at 32-01 plan time).
- A6 — `conteste` per-seat mapping. Default chosen: doc mock at line 1515 is authoritative — yes-voter seat = `seat-state-valide` (or `pressenti` if not unanimous), no-voter seat = `seat-state-contested` (with strike).

---

## 1. Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized) |
| Preset | al-dente custom — Cormorant Garamond + IBM Plex Sans + Caveat (added 32-01); Tailwind v4 with `@theme inline` token bridge; OKLCH primary `oklch(0.50 0.10 32)` after 32-01 swap |
| Component library | shadcn primitives over Radix (button, card, input, sonner, tooltip, dialog); custom primitives in `@/components/` |
| Icon library | `lucide-react` ^1.14.0 |
| Font (display) | Cormorant Garamond (`--font-display`) — weights 400, 500; styles normal, italic |
| Font (body) | IBM Plex Sans (`--font-body`) — weights 300, 400, 500, 600; styles normal, italic |
| Font (marginalia) | **NEW IN 32-01** — Caveat (`--font-marginalia`) — weights 500, 600; subsets latin + latin-ext; `display: swap`; fallback `cursive` |
| Animation easing | `--ease-craft: cubic-bezier(0.32, 0.72, 0, 1)` |
| Animation durations | `--duration-fast: 150ms`, `--duration-normal: 280ms`, `--duration-slow: 3200ms` **(NEW)** |
| Reduced motion | global `globals.css` rule sets `animation-duration: 0ms !important`; `.loader-brand` has explicit `prefers-reduced-motion` fallback (animation: none; stroke-dashoffset: 0) |

---

## 2. Token Delta — `frontend/app/globals.css` `:root`

Source: `docs/design-system.html` §15.A (lines 1880-1919). **Token *names* are preserved; only values change.** Tailwind `@theme inline` block is NOT edited.

### 2.1 Values to swap

| Token | OLD (v0.2 terracotta) | NEW (sober) |
|-------|-----------------------|-------------|
| `--background` | `oklch(0.985 0.008 60)` | `oklch(0.975 0.006 75)` |
| `--foreground` | `oklch(0.22 0.018 50)` | `oklch(0.21 0.014 55)` |
| `--card` | `oklch(0.992 0.006 60)` | `oklch(0.99 0.005 75)` |
| `--primary` | `oklch(0.595 0.135 35)` | `oklch(0.50 0.10 32)` |
| `--secondary` | `oklch(0.945 0.012 50)` | `oklch(0.93 0.010 60)` |
| `--muted-foreground` | `oklch(0.50 0.014 50)` | `oklch(0.50 0.012 55)` |
| `--border` | `oklch(0.88 0.012 50)` | `oklch(0.86 0.010 55)` |
| `--destructive` | `oklch(0.55 0.20 25)` | `oklch(0.50 0.15 25)` |
| `--radius` | `0.75rem` | `0.625rem` |
| `--shadow-card` | `0 1px 2px 0 rgba(74,56,40,.06), 0 2px 4px 0 rgba(74,56,40,.05)` | `0 1px 2px 0 rgba(74,56,40,.05), 0 1px 3px 0 rgba(74,56,40,.03)` (halved) |
| `--color-member-rose-bg` | `#F43F5E` | `#C0364A` |
| `--color-member-amber-bg` | `#F59E0B` | `#C98512` |
| `--color-member-emerald-bg` | `#10B981` | `#0D8A64` |
| `--color-member-sky-bg` | `#0EA5E9` | `#0879AD` |
| `--color-member-violet-bg` | `#8B5CF6` | `#6E46C1` |

### 2.2 Tokens to ADD

| Token | Value | Location | Notes |
|-------|-------|----------|-------|
| `--font-marginalia` | `"Caveat", cursive` | `:root` | Resolved by Caveat next/font/google import in `layout.tsx`; cursive fallback for offline PWA edge |
| `--duration-slow` | `3200ms` | `@theme inline` (alongside `--duration-fast`, `--duration-normal`) | Used by `.loader-brand` `drawLoop` keyframe |
| `--patina` | `0` | `:root` (global default; per-card override via inline `style` or className) | Consumed by `.ledger-card`, `.ledger-card::before`, `.ledger-card::after` |

### 2.3 Tokens that MUST NOT change (invariant #2 + DECIDE-03 guard — D-23)

| Token | Value | Why locked |
|-------|-------|------------|
| `--color-valide-foreground` | `#10b981` | Emerald h≈145 — DECIDE-03 invariant. Validé state must stay green even after member-emerald desaturation. |
| `--color-valide-emphasis` | `#047857` | Same family — used in Validé meta text. |
| `--color-valide-border` | `#10b98180` | Same family — used in Validé seat halo. |
| `--color-valide-border-faint` | `#10b9814d` | Same family — used in `.shortlist-row.is-valide` border. |
| `--color-cooking-foreground` | `#047857` | Same family — cooking-log banner. |
| `--valide-tint` | `oklch(0.93 0.06 145)` | h≈145 emerald background tint for Validé rows. |

### 2.4 `themeColor` viewport export

| File | Current | New | Confidence |
|------|---------|-----|------------|
| `frontend/app/layout.tsx` viewport export | `themeColor: "#C8553D"` | `themeColor: "#8B4A35"` (approximation of `oklch(0.50 0.10 32)`) | **MEDIUM** — planner must verify hex via CSS Color 4 calculator at 32-01 plan time |

### 2.5 `.text-display` italic removal

Source: §15.B (line 1930-1931). `font-style: italic` removed from `.text-display`. Cormorant 500 upright is the new register; italic register reserved for `.marginalia em` only.

---

## 3. Spacing Scale

Inherited from existing tokens (declared in `:root` via `--spacing-*`). Already 4-pt aligned. No new spacing tokens added in Phase 32.

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-page-x` | `1.5rem` (24px) | Horizontal page padding |
| `--spacing-section-y` | `1.5rem` (24px) | Vertical section breaks |
| `--spacing-stack-y` | `0.75rem` (12px) | Default stack gap |
| `--spacing-bottom-safe` | `6rem` (96px) | Bottom safe-area inset accommodation (Phase 31 sets `<main> pb-[calc(5rem+env(safe-area-inset-bottom))]`) |

**Per-surface spacing (locked screens):**

| Surface | Spec |
|---------|------|
| Accueil shortlist stack gap | `10px` (between rows — see §15 Accueil mock line 1488) |
| Accueil section gap | `gap-3` (12px) for rows; H1 → marginalia subhead = `margin-top: -4px` |
| Accueil CTA position | `margin-top: auto` on bottom container — sticks to bottom of phone-content |
| Bibliothèque grid gap | `10px` (2-col mobile) |
| Bibliothèque list gap | `14px` between rows |
| Bibliothèque patine sections | `8px` between section dividers |
| Bibliothèque view-switcher | `padding: 3px` outer, `padding: 5px 9px` per button |
| Recette body padding | `18px 20px 24px` |
| Recette body stack gap | `14px` between sections |
| Recette sticky topbar padding | `14px 18px 8px` |
| Recette photo bleed | `-mt-9` (negative top margin = `-38px` per doc, equivalent to `-2.375rem`) |
| Recette sticky CTA padding | `12px 20px calc(12px + env(safe-area-inset-bottom))` |

Exceptions: none. All values are multiples of 2px (most are multiples of 4px). Sub-4px values (`-38px`, `5px 9px`) are inherited verbatim from the locked design system.

---

## 4. Typography Register

Inherited from globals.css `.text-*` utilities (no value changes in Phase 32 except `.text-display` italic removal).

| Role | Class | Font | Size | Weight | Line-Height | Notes |
|------|-------|------|------|--------|-------------|-------|
| Display (H1) | `.text-display` | Cormorant Garamond | `clamp(2rem, 5.5vw, 2.5rem)` | 500 | 1.1 | letter-spacing -0.02em; **italic REMOVED in 32-01** |
| Title (H2 page) | `.text-title` | Cormorant Garamond | 1.4rem (22.4px) | 500 | 1.2 | letter-spacing -0.012em |
| Page Header | `.text-page-header` | Cormorant Garamond | 1.25rem (20px) | 500 | 1.2 | letter-spacing -0.01em |
| Body | `.text-body` | IBM Plex Sans | 0.975rem (15.6px) | 400 | 1.55 | default |
| Caption | `.text-caption` | IBM Plex Sans | 0.8125rem (13px) | 400 | 1.45 | color `var(--foreground-muted)` |
| Marginalia sm | `.marginalia.marginalia-sm` | **Caveat** | 1rem (16px) | 500 | 1.25 | color `var(--primary)` |
| Marginalia md | `.marginalia.marginalia-md` | **Caveat** | 1.2rem (19.2px) | 500 | 1.25 | color `var(--primary)` |
| Marginalia lg | `.marginalia.marginalia-lg` | **Caveat** | 1.5rem (24px) | 500 | 1.25 | color `var(--primary)` |
| Marginalia slant variant | `.marginalia.slant` | Caveat | (size class) | 500 | 1.25 | adds `transform: rotate(-1.2deg); display: inline-block` |
| Marginalia emphasized | `.marginalia em` | Caveat | (size class) | 500 italic | 1.25 | color `color-mix(in oklch, var(--primary) 70%, var(--foreground))` |
| Pin label (Phase 28) | inline style | Caveat | 12px | 600 | (none) | rotate(-1.2deg) gutter — Phase 28 lock, **API frozen**, no `<Marginalia>` composition |

**Per-surface typography (locked screens):**

| Surface | Element | Spec |
|---------|---------|------|
| Accueil | H1 "On mange quoi ce soir ?" | `.text-display` overridden to `font-size: 28px` (per mock line 1485); upright (no italic) |
| Accueil | Page-header date row | Cormorant 500 20px left + `.text-caption` 13px right |
| Accueil | Shortlist row title | Cormorant 500 17px (`shortlist-info h4`); letter-spacing -0.005em |
| Accueil | Shortlist row meta | IBM Plex 12px `--foreground-muted` |
| Accueil | Validé row meta | Caveat 16px (`marginalia-sm`), color `--color-valide-emphasis` |
| Bibliothèque | Page label "Bibliothèque" | Cormorant 500 20px |
| Bibliothèque | Recipe count caption | `.text-caption` 13px |
| Bibliothèque | View-switch button | IBM Plex 500 12px |
| Bibliothèque grid card | Recipe title | Cormorant 500 13px |
| Bibliothèque grid card | "X fois" / relative date | Caveat 16px (when patina ≥ 2 with note) OR `.text-caption` 11px (no note) |
| Bibliothèque list card | Recipe title | Cormorant 500 18px |
| Bibliothèque list card | Meta line | `.text-caption` 13px |
| Bibliothèque list card | Marginalia note | Caveat 16px `marginalia-sm slant` |
| Bibliothèque patine section header | "Héritage" / "Habitudes" / "À l'essai" | Cormorant 500 16px + count Caveat 15px |
| Recette | H2 title | Cormorant 500 26px, letter-spacing -0.015em, line-height 1.1 |
| Recette | Identity subhead | Caveat 16px `marginalia-sm slant` |
| Recette | Section heads "Ingrédients" / "Étapes" | Cormorant 500 17px |
| Recette | Servings caption | `.text-caption` (font-family IBM Plex 400 13px) |
| Recette | Ingredient qty | Cormorant 500 13.5px, color `--primary` |
| Recette | Ingredient name | IBM Plex 400 13.5px |
| Recette | Step body | IBM Plex 400 13.5px, line-height 1.55 |
| Recette | Step number | Cormorant 500 13.5px, color `--primary`, margin-right 8px |
| Recette | Inline step marginalia | Caveat 14px `marginalia-sm slant` (font-size override per mock line 1815), `display: block; margin: 4px 0 0 12px` |

---

## 5. Color (60 / 30 / 10)

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Dominant (60%) | `--background` | `oklch(0.975 0.006 75)` (warm cream) | Page background, body |
| Secondary (30%) | `--card` + `--secondary` + `--surface-muted` | card `oklch(0.99 0.005 75)` / secondary `oklch(0.93 0.010 60)` | Cards, view-switch background pill, badges, nav chrome |
| Accent (10%) | `--primary` (sober terracotta) | `oklch(0.50 0.10 32)` ≈ `#8B4A35` | See accent-reserved-for list below |
| Semantic — destructive | `--destructive` | `oklch(0.50 0.15 25)` | Destructive button only (none added in Phase 32 surfaces) |
| Semantic — validated | `--color-valide-foreground` | `#10b981` (emerald h≈145) — **LOCKED, do NOT desaturate** | Validé state ring on seats, Validé row meta text, cooking banner |

### Accent reserved for (per locked screens — explicit list)

- Primary CTA button background (`.btn-primary`) — Accueil bottom CTA, Recette bottom CTA, onboarding Submit
- Primary ring on focus (`--ring: var(--primary)`)
- Caveat marginalia text default color (`.marginalia` → `color: var(--primary)`)
- Ingredient quantity numbers (Recette `.qty`)
- Step number numerals (Recette `.step-num`)
- View-switcher active button text + dogear stroke (`.view-switch button.active` → `color: var(--primary)`)
- BottomNav active tab text + halo (Phase 31 contract — token-only inheritance in Phase 32)
- `.ledger-card::before` patina gradient (orange-warm radial blend; quantity scaled by `var(--patina)`)
- Recipe-photo gradient (linear-gradient from `color-mix(var(--primary) 30%, --surface-rose-100)` to `color-mix(var(--primary) 8%, --surface-muted)`)
- `.patina-stamp` text color (mixed with neutral)
- Section-header count in Bibliothèque patine view
- PinLabel text (Phase 28 lock)
- `<Toaster>` info / success icon color (inherits from `--primary`)

**Accent NOT reserved for:** body text, captions, borders (except focus ring), card backgrounds, dividers, icons inside badges (use neutral foreground), seat backgrounds (use member colors).

### Member colors (5 desaturated values)

| Member token | Value | Foreground |
|--------------|-------|------------|
| rose | `#C0364A` | `#ffffff` |
| amber | `#C98512` | `#1f1311` |
| emerald | `#0D8A64` | `#ffffff` |
| sky | `#0879AD` | `#ffffff` |
| violet | `#6E46C1` | `#ffffff` |

Used on `<TableVote>` seat backgrounds only. Couple-scale (2 members): typically rose + violet (per Accueil mock — L = rose, M = violet).

---

## 6. Copywriting Contract

### 6.1 New i18n keys (D-13, D-21) — `frontend/lib/i18n/fr.json`

| Key | French | Source | When rendered |
|-----|--------|--------|---------------|
| `home.subhead.validated` | `"— déjà une idée validée"` | doc line 1486 | Accueil subhead when ≥1 shortlist row state === "valide" |
| `home.subhead.tentative` | `"— une piste, à confirmer"` | D-13 derived | Accueil subhead when ≥1 row "pressenti" but no "valide" |
| `home.subhead.empty` | `"— personne ne s'est encore prononcé"` | D-13 derived | Accueil subhead when no votes / all rows "sans_avis" |
| `home.library.patina_section.heritage` | `"Héritage"` | doc line 1695 | Bibliothèque patine section header (patina ≥ 3) |
| `home.library.patina_section.habitudes` | `"Habitudes"` | doc line 1705 | Bibliothèque patine section header (patina === 2) |
| `home.library.patina_section.essai` | `"À l'essai"` | doc line 1717 | Bibliothèque patine section header (patina ≤ 1) |
| `recipes.detail.subhead.cooked` | `"cuisiné {count} fois"` | doc line 1664 | Recette subhead when `recipe.cook_count > 0` |
| `recipes.detail.subhead.never` | `"pas encore cuisiné"` | D-13 derived | Recette subhead when `recipe.cook_count === 0` |
| `home.library.view.grid.aria` | `"Grille"` | doc line 1602 | View-switcher button `aria-label` (grid) |
| `home.library.view.list.aria` | `"Liste"` | doc line 1603 | View-switcher button `aria-label` (list) |
| `home.library.view.patina.aria` | `"Patine"` | doc line 1604 | View-switcher button `aria-label` (patina) |

**Pluralization note (A5):** French "cuisiné 1 fois" is grammatically correct (no need for "cuisiné une fois" variant). `next-intl` `{count}` interpolation without ICU `plural` block is acceptable.

**Phase 32 forbidden i18n additions (per D-13 / D-16):** `home.subhead.partial`, `home.subhead.dispute`, advisory marginalia, Capture copy, Réception copy, provenance attribution copy ("de chez maman"), per-step `step_notes` copy variants.

### 6.2 Existing copy — reused (no changes)

| Element | Copy | Reason |
|---------|------|--------|
| H1 Accueil | `"On mange quoi ce soir ?"` (existing fr.json key) | unchanged register |
| Accueil CTA (validé row exists) | `"Cuisiner {recipe.title}"` | interpolated, already wired in HomeDecide |
| Recette CTA | `"Cuisiner maintenant"` | doc line 1826 — already in fr.json or trivially added |
| BottomNav labels | Phase 31 keys (`nav.home`, `nav.recipes`, `nav.add`, `nav.profile`) | Phase 31 contract preserved |

### 6.3 Empty / Error / Destructive

| Element | Copy | Notes |
|---------|------|-------|
| Accueil — empty shortlist | `home.subhead.empty` Caveat marginalia + existing "Aucune recette" or "Capturez votre première recette" body (existing key, unchanged) | No new design needed; the marginalia conveys the empty register |
| Bibliothèque — empty search | existing `recipes.empty.search` key (unchanged) | not redesigned in Phase 32 |
| Bibliothèque — empty patine view bucket | i18n optional — show section header with `count = 0` (e.g., "Héritage 0") OR omit empty buckets entirely. **Phase 32 decision: omit empty buckets** (don't show header if `bucket.length === 0`). Cleaner visually; matches doc mock (only buckets with content rendered). |
| Recette — no log notes | Step 1 marginalia is **absent** entirely (no fallback copy) — D-13 explicit |
| Recette — no photo | Recipe-photo gradient + lucide glyph (existing pattern — BUG-02 fix from Phase 30 ensures glyph renders) |
| Destructive actions in Phase 32 surfaces | **None.** Recette détail's delete/menu actions are deferred (no menu items defined in scope). The `more-horizontal` button is a placeholder (Phase 28 menu); content is out of scope. |

---

## 7. Primitives Contract (32-02)

Source: `docs/design-system.html` §15.C + verbatim CSS blocks. Lives in `@/components/` (planner's call whether to introduce a `@/components/sober/` subfolder).

### 7.1 `<LedgerCard>`

**Props:**
```tsx
interface LedgerCardProps {
  patina: 0 | 1 | 2 | 3;
  dogear?: boolean;             // renders <span class="dogear"> SVG overlay; defaults to patina >= 3
  className?: string;
  children: React.ReactNode;
}
```

**Composition:**
- Renders a `<div>` (independent of shadcn `<Card>` — per A4, cleaner CSS specificity) with class `.ledger-card`, inline style `style={{ "--patina": patina } as CSSProperties}`.
- The `.ledger-card` CSS (in globals.css after 32-01) handles `background`, `border`, `border-radius`, `box-shadow`, `padding`, `overflow`, and `::before` / `::after` patina overlays.
- `dogear` renders the SVG corner-fold from doc line 1612 only when `true` OR by default when `patina >= 3` (Héritage). For Phase 32 the implementation defaults to `patina >= 3` (the doc mock only shows dogear on Risotto p=3 and Héritage section card).
- `<LedgerCard>` consumers must NOT add `paper-grain` class (Pitfall 1 — double-grain).
- `<LedgerCard>` MAY contain `.patina-stamp` as a child if a "X fois" stamp is desired (Bibliothèque patine view); not in default render.

**API guarantees:**
- Pure CSS-driven; zero JS runtime cost.
- Reduced-motion safe (no animations on the patina overlays themselves).
- Composable: works with `<Link>` wrapper, `<article>`, `<div>` semantics — planner picks element via `as` prop OR fixed `<article>` (planner's call; doc mocks use `<article>`).

### 7.2 `<TableVote>`

**Props:**
```tsx
interface TableVoteProps {
  votes: ShortlistVote[];        // raw votes for this shortlist_id × recipe_id
  members: HouseholdMember[];     // for seat ordering + initials + color tokens
  myMemberId: string;             // to place "me" at seat-north
  size?: "ts-56" | "ts-72" | "ts-90"; // default ts-90 (full size); ts-56 used in shortlist row
}
```

**Per-seat mapping (couple-scale, N=2):**
- seat-north → `me` (member matching `myMemberId`)
- seat-south → partner (the other member)
- seat-east, seat-west → not rendered (mounted only when N ≥ 3, future N>2 households)

**Per-seat state derivation (INVARIANT #2 GUARD — D-19):**

`<TableVote>` internally maps `votes` → per-seat CSS class. NO `state` column on `votes` or `daily_shortlist_recipes`. Algorithm:

1. Compute aggregate state via `computeVoteState(votes, members.length)` from `lib/votes.ts`.
2. Derive each seat's individual class as follows:

| Aggregate state | seat-north (me) | seat-south (partner) | Notes |
|-----------------|-----------------|---------------------|-------|
| `"valide"` (unanimous yes) | `seat-state-valide` | `seat-state-valide` | both green halos |
| `"pressenti"` (≥1 yes, no no's, not all voted) | `seat-state-pressenti` for yes voters; `seat-state-neutral` for non-voters | (same per-seat rule) | primary-alpha ring on yes voters |
| `"conteste"` (≥1 yes + ≥1 no) | yes voter → `seat-state-pressenti` (or `valide` if doc mock interpretation); no voter → `seat-state-contested` (strike-through bar) | (same per-seat rule) | doc mock line 1515: yes seat = `seat-state-valide`, no seat = `seat-state-contested`. **Phase 32 default: yes voter → `seat-state-valide` if 1 yes + 1 no, else `seat-state-pressenti`; no voter → `seat-state-contested`.** Planner may consult user on the visual nuance. |
| `"rejete"` (unanimous no) | both seats → `seat-state-rejected` (45% opacity, grayscale, directional push-away) | (same) | seat-north pushes up; seat-south pushes down |
| `"sans_avis"` (no votes) | both seats → `seat-state-neutral` (32% opacity, grayscale) | (same) | |

**CSS class names (in globals.css after 32-01, verbatim from doc lines 267-297):**
- `.seat-state-valide` — green ring halo
- `.seat-state-pressenti` — primary-alpha ring + inset white
- `.seat-state-neutral` — opacity 0.32, grayscale 0.7
- `.seat-state-rejected` — opacity 0.45, grayscale 0.85, directional `translateY/X` offset per seat position
- `.seat-state-contested` — `::after` strike-through bar at 1.5px height, foreground 55% opacity

**Seat background = member color** (inline style `style={{ background: 'var(--color-member-rose-bg)', color: 'var(--color-member-rose-foreground)' }}` based on the seat's member assignment). Seat content = member initial (single uppercase character).

**Sizes:**
- `ts-90` (default 90×90px) — used in 32-02 storybook / fallback
- `ts-72` (72×72px) — reserved for future tablet view
- `ts-56` (56×56px) — used in **Accueil shortlist rows** (default for HomeDecide composition)

**API guarantees:**
- `<TableVote>` does NOT mutate; it only renders state.
- Consumes existing `computeVoteState` (no new state machine).
- No new realtime broadcasts (D-20).
- All 4 DOM seats rendered for N≤2 households, but seats `east` / `west` get `seat-state-neutral` + `display: none` style (preserves DOM contract for future N>2 expansion without re-rendering tree). Phase 32 default: only mount the N seats actually needed (north + south for N=2) — planner's call.

### 7.3 `<Marginalia>`

**Props:**
```tsx
interface MarginaliaProps {
  size?: "sm" | "md" | "lg";   // default "sm"
  slant?: boolean;             // default false
  as?: "p" | "span" | "div";   // default "p" — block contexts use "p"; inline contexts pass "span"
  className?: string;
  children: React.ReactNode;
}
```

**Composition:**
- Renders `<p>` (or chosen element) with classes `marginalia marginalia-${size}` + optional `slant`.
- Color inherits from `.marginalia` CSS (var(--primary)).
- Children may include `<em>` for emphasized marginalia (color-mix per CSS).

**API guarantees:**
- Pure styled wrapper; no state, no effects.
- Works at any size ≥ 16px (sm = 1rem = 16px). For sub-16px sites (PinLabel @ 12px), do NOT use `<Marginalia>`; use raw inline style + `var(--font-marginalia)` directly (PinLabel pattern preserved — D-05).

### 7.4 `<BrandLoader>`

**Props:**
```tsx
interface BrandLoaderProps {
  size?: "default" | "sm";     // default = 96×96px (centered page state); sm = ~18×18px (inline)
  "aria-label"?: string;       // default "Chargement" — French
}
```

**Composition:**
- Renders a `<div class="loader-brand">` wrapper containing the two-path SVG from `BrandIcon.tsx`.
- For `size="default"`: 96×96px container per `.loader-brand` CSS.
- For `size="sm"`: ~18×18px inline (uses same 160×160 viewBox, same `stroke-dasharray: 220` — SVG scales proportionally, A3).
- The `.loader-brand svg path` CSS applies `stroke-dasharray: 220` + animation `drawLoop var(--duration-slow) var(--ease-craft) infinite`.
- Second path uses `animation-delay: 280ms` for stagger.
- `prefers-reduced-motion` fallback: `animation: none; stroke-dashoffset: 0; opacity: 1` (flat brand mark).

**API guarantees:**
- Zero third-party dependencies.
- No `animate-spin` class — grep gate (D-14) verifies.
- Reduced-motion safe by construction (CSS-only).
- ARIA-friendly: default `aria-label="Chargement"` on the wrapper.

### 7.5 New utility classes (in `@layer utilities` of globals.css after 32-01)

Source: §15.B verbatim + Patine block (lines 186-236) + Table block (lines 238-297) + Loader block (lines 299-320).

| Class | Purpose |
|-------|---------|
| `.marginalia` | base — Caveat 500 1.25 line-height, primary color |
| `.marginalia-sm` | 1rem |
| `.marginalia-md` | 1.2rem |
| `.marginalia-lg` | 1.5rem |
| `.marginalia.slant` | rotate(-1.2deg) inline-block |
| `.marginalia em` | italic + color-mix |
| `.ledger-card` | patina card base |
| `.ledger-card::before` | radial gradient warm overlay |
| `.ledger-card::after` | dot-grid grain overlay |
| `.dogear` | absolute 26×26 SVG corner-fold |
| `.patina-stamp` | absolute Caveat label inside ledger-card |
| `.table-scene` | 90×90 wrapper |
| `.table-plate` | round plate (inset 16px) |
| `.table-seat` | seat dot 22×22 |
| `.seat-north` `.seat-south` `.seat-east` `.seat-west` | position |
| `.seat-state-valide` | green halo |
| `.seat-state-pressenti` | primary-alpha ring |
| `.seat-state-neutral` | opacity 0.32 + grayscale |
| `.seat-state-rejected` | opacity 0.45 + grayscale + directional translate |
| `.seat-state-contested` | strike-through `::after` bar |
| `.loader-brand` | 96×96 loader container |
| `.ts-56` / `.ts-72` | table-scene size helpers (inset, seat size scaled) |
| `@keyframes drawLoop` | stroke-dasharray loop |
| `prefers-reduced-motion` rule | flat brand mark fallback |

`.paper-grain` (existing v0.2) — **kept** for non-recipe surfaces (cooking-log feed, settings cards, recipe-detail body strips). Removed from `RecipeCard`'s outer `<Link>` only (Pitfall 1).

---

## 8. Sweep Contracts (32-02 close)

### 8.1 Spinner sweep — call-site → BrandLoader mapping

| File | Site | Today | After 32-02 |
|------|------|-------|-------------|
| `components/HomeDecide.tsx` | warm-load delayed-flag spinner | `Loader2 animate-spin` (centered) | `<BrandLoader>` (default 96px, centered in page state) |
| `components/HomeDecide.tsx` | cold-load delayed-flag spinner | `Loader2 animate-spin` (centered) | `<BrandLoader>` (default 96px, centered) |
| `components/RecipeForm.tsx` | submit button pending icon | `Loader2 animate-spin` (inline) | `<BrandLoader size="sm">` (inline, replaces icon slot) |
| `components/RecipeThread/SystemBubble.tsx` | LLM processing bubble | `Loader2 animate-spin` (inline in chat bubble) | `<BrandLoader size="sm">` (inline) |
| `components/RecipeThread/SystemBubble.tsx` | Advisory bubble pending | `Loader2 animate-spin` | `<BrandLoader size="sm">` |
| `components/RecipeThread/SystemBubble.tsx` | Default bubble pending | `Loader2 animate-spin` | `<BrandLoader size="sm">` |
| `components/VoiceModifySheet.tsx` | voice processing | `Loader2 animate-spin` (centered) | `<BrandLoader size="sm">` (inline within sheet) OR `<BrandLoader>` (default — planner's call based on sheet body height) |
| `components/SearchInput.tsx` | in-input pending icon | `Loader2 animate-spin` (16px inline) | `<BrandLoader size="sm">` |
| `app/onboarding/create/page.tsx` | submit button pending | `Loader2 animate-spin` (inline) | `<BrandLoader size="sm">` |
| `app/onboarding/join/page.tsx` | submit pending | `Loader2 animate-spin` (inline) | `<BrandLoader size="sm">` |
| `app/onboarding/join/page.tsx` | verify-code pending | `Loader2 animate-spin` (inline) | `<BrandLoader size="sm">` |
| `components/ui/sonner.tsx` | Toaster `icons.loading` prop | `<Loader2Icon className="size-4 animate-spin" />` (line 28) | `<BrandLoader size="sm" />` (one-line swap per Pattern 6) |

**Grep gate at 32-02 close (mandatory):**
```bash
grep -rn "animate-spin\|Spinner\|LoadingSpinner" frontend/
# Expected output: 0 matches outside BrandLoader.tsx itself
```
If non-zero, plan fails. Per D-14 / D-15.

### 8.2 Marginalia register sweep

| Site (today) | Register | Phase 32 action |
|--------------|----------|-----------------|
| `PinLabel.tsx` | Caveat 12px/600 (sub-register) | **KEEP** — Phase 28 lock; uses `var(--font-marginalia)` directly. Once 32-01 lands Caveat, automatically resolves to Caveat with no code change. |
| Accueil subhead (new in 32-03) | Caveat 16px slant | **ADD** `<Marginalia size="sm" slant>` — copy from `home.subhead.*` |
| Accueil Validé row meta (new in 32-03) | Caveat 16px (no slant), color `--color-valide-emphasis` | **ADD** inline `<Marginalia size="sm">` with `className` overriding color |
| Bibliothèque grid card "X fois" (new in 32-04) | Caveat 16px (patina ≥ 2 only) | **ADD** `<Marginalia size="sm">` (no slant per doc) |
| Bibliothèque list card note (new in 32-04) | Caveat 16px slant | **ADD** `<Marginalia size="sm" slant>` — copy = `cooking_logs[0].notes` |
| Bibliothèque patine section header count (new in 32-04) | Caveat 15px | **ADD** inline `<Marginalia>` with font-size override OR inline `<span class="marginalia">` |
| Recette identity subhead (new in 32-05) | Caveat 16px slant | **ADD** `<Marginalia size="sm" slant>` — `recipes.detail.subhead.*` |
| Recette step-1 marginalia (new in 32-05, conditional) | Caveat 14px slant | **ADD** `<Marginalia size="sm" slant>` (with font-size override to 14px per doc line 1815) — only when `cookingLog?.notes` truthy |
| Capture advisory bubble (Phase 28, existing) | NOT marginalia | **DO NOT ADD** marginalia register — D-16 explicit. Capture stays at current register. |
| Capture SystemBubble copy (Phase 28, existing) | NOT marginalia | **DO NOT ADD** marginalia register — D-16 explicit. |

**Grep gate at 32-02 close (verification):**
```bash
grep -rn "var(--font-marginalia)" frontend/components/ frontend/app/
# Expected: PinLabel.tsx + Marginalia.tsx (primitive) + any direct inline uses (rare)
```

---

## 9. Surface Composition Contracts

### 9.1 Accueil (32-03) — `frontend/components/HomeDecide.tsx`

Source: `docs/design-system.html` #accueil (lines 1471-1577).

**Structure (top → bottom):**
1. **Header row:** `display: flex; justify-content: space-between; align-items: baseline;` — page label "Accueil" (Cormorant 500 20px) left + date caption ("Mardi · 13 mai") right.
2. **H1:** `.text-display` overridden to 28px upright — `"On mange quoi ce soir ?"` (existing fr.json key).
3. **Subhead:** `<Marginalia size="sm" slant>` — state-dependent content:
   - `home.subhead.validated` if `shortlist.some(r => state === "valide")`
   - else `home.subhead.tentative` if `shortlist.some(r => state === "pressenti")`
   - else `home.subhead.empty`
   - `margin-top: -4px` (per doc).
4. **Shortlist stack** (`.stack` `gap: 10px`):
   - Each row = `.shortlist-row` (`.is-valide` class if state === "valide"):
     - Left: `<TableVote size="ts-56">` (56×56)
     - Right: `.shortlist-info` (h4 Cormorant 17px + meta caption OR Validé meta marginalia)
     - For Validé rows: `--valide-tint` background tint + `--color-valide-border-faint` border + meta = `<Marginalia size="sm">` with `color: var(--color-valide-emphasis)` saying `"validé · à cuisiner"` (existing key reused or new key `home.shortlist.valide_meta`).
5. **Sticky bottom CTA:**
   - Container has `margin-top: auto`.
   - `<button class="btn btn-primary btn-lg" style="width:100%">` — content: lucide `flame` icon + `"Cuisiner {recipe.title}"` (target = first `state === "valide"` row, fallback to first `state === "pressenti"`).
   - If no shortlist row qualifies → existing empty-state path (CTA hidden or shows "Capturer une recette" — out of new scope; preserve current empty-state behavior).
6. **`<ShortlistDeck>` (swipe deck)** — **SURVIVES UNCHANGED.** D-06 explicit. The swipe deck stays mounted as a separate sub-surface inside HomeDecide. Only the list/voting visuals (TableVote per row + `--valide-tint`) change. The deck's vote-by-swipe interaction is untouched.

**Behaviors:**
- Click on a shortlist row → navigates to `/recipes/[id]` (preserve existing routing).
- TableVote is read-only on Accueil (voting happens via ShortlistDeck).
- Realtime updates: existing `RealtimeProvider` already wires `vote.created` / `shortlist` events. Phase 32 adds no new events (D-20). TableVote re-renders on next state update from the same provider.

**Files touched in 32-03:**
- `frontend/components/HomeDecide.tsx` (primary)
- `frontend/lib/i18n/fr.json` (3 new keys + optional 1 for Validé meta)
- Tests: extend `frontend/tests/e2e/shortlist-vote.spec.ts` for seat CSS class assertions (Wave 0 Gap from RESEARCH.md)

### 9.2 Bibliothèque (32-04) — `frontend/app/recipes/page.tsx`

Source: `docs/design-system.html` #bibliotheque (lines 1580-1768).

**Structure (top → bottom):**
1. **Sticky header row:** page label "Bibliothèque" (Cormorant 500 20px) + ghost `<button class="btn-ghost btn-sm">` with lucide `plus` icon (Add CTA — already present, untouched).
2. **Search input:** `.input` with leading lucide `search` icon (existing pattern, untouched in Phase 32 visually except token-leak).
3. **Meta row:** `display: flex; justify-content: space-between;` — left: `<small class="text-caption">{N} recettes</small>`; right: `<LibraryViewSwitch>`.
4. **`<LibraryViewSwitch>`** (new primitive):
   - 3 buttons inline-pill — icons: `layout-grid`, `list`, `layers`.
   - Active state: white `--card` background + `--shadow-card` + `--primary` text color.
   - `aria-label` keys: `home.library.view.{grid,list,patina}.aria`.
   - State: `view: "grid" | "list" | "patina"`, default `"grid"`, persisted in `localStorage["aldente.library.view"]`.
   - SSR pre-render: `"grid"`.
   - Hydration: `useEffect` reads localStorage, sets state, triggers 150ms `opacity 0 → 1` panel transition.
5. **Three view panels** (only one rendered at a time):
   - **Grid (default):** 2-col → 3-col responsive grid (mobile 2-col; tablet+ 3-col; planner may add 4-col @ md+ optionally — doc shows 2-col mobile).
     - Each tile = `<LedgerCard patina={cookCountToPatina(r.cook_count)}>` wrapping `<RecipeCard>` body.
     - `padding: 0` override on LedgerCard for grid (photo-flush).
     - Title Cormorant 500 13px (mobile tight; planner may bump to 14-15px at larger viewports).
     - Patine ≥ 2 with note → "{count} fois" Caveat 16px marginalia.
     - Patine 0-1 → relative date `.text-caption` 11-12px ("il y a 4 j", "2 sem", "jamais").
     - Dogear renders when `patina >= 3`.
   - **List (editorial):** vertical stack of `<RecipeRow>` (new primitive).
     - `<RecipeRow>` = horizontal `<LedgerCard patina={n}>` with `display: flex; gap: 12px; padding: 12px;`.
     - Left flex-1: title Cormorant 500 18px + meta caption (cuisine · cook-frequency) + optional marginalia note (Caveat 16px slant, sourced from existing recipe metadata OR most recent cooking log note — D-13 deferred for list-view; **Phase 32 default: marginalia uses `cooking_logs[0]?.notes` for the recipe via the same separate fetch pattern as Pattern 8**. If fetch is expensive in list context, marginalia may be omitted in list view — planner's call. **Recommendation: omit marginalia in list view for Phase 32 unless a cheap data source exists; doc mock value "cèpes secs, magique" is illustrative, not from data**).
     - Right 72×72: photo block (lucide glyph fallback when no `photo_url`).
   - **Patine (grouped):** sections per `groupByPatina(recipes)` bucket.
     - Héritage (patina ≥ 3): single column, large card (`<LedgerCard>` with dogear), 56×56 photo block + Caveat "{count} fois" marginalia.
     - Habitudes (patina === 2): 2-col grid, compact card.
     - À l'essai (patina ≤ 1): 3-col grid, very compact card (photo-only).
     - Each section preceded by `.section-divider` with header "Héritage / Habitudes / À l'essai" + Caveat count.
     - Empty buckets omitted (Phase 32 decision per §6.3).
6. **Bottom nav** (Phase 31 contract — token-only inheritance).

**Behaviors:**
- View switch click → updates localStorage, sets state, opacity transition.
- Search input → existing filter logic, unchanged.
- Card click → `/recipes/[id]` (existing route, unchanged).

**Helpers added in 32-04 (`frontend/lib/recipes.ts`):**

```ts
export function cookCountToPatina(n: number): 0 | 1 | 2 | 3 {
  if (n === 0) return 0;
  if (n <= 2) return 1;
  if (n <= 10) return 2;
  return 3;
}

export function groupByPatina(recipes: Recipe[]): {
  heritage: Recipe[];
  habitudes: Recipe[];
  essai: Recipe[];
} {
  return {
    heritage: recipes.filter(r => cookCountToPatina(r.cook_count) >= 3),
    habitudes: recipes.filter(r => cookCountToPatina(r.cook_count) === 2),
    essai: recipes.filter(r => cookCountToPatina(r.cook_count) <= 1),
  };
}
```

**Files touched in 32-04:**
- `frontend/app/recipes/page.tsx` (primary)
- `frontend/components/LibraryViewSwitch.tsx` (NEW)
- `frontend/components/RecipeRow.tsx` (NEW)
- `frontend/components/RecipeCard.tsx` (modified — `paper-grain` removed from outer Link; body wrapped in LedgerCard from page.tsx side OR RecipeCard accepts a `patina` prop and wraps internally)
- `frontend/lib/recipes.ts` (+2 helpers)
- `frontend/lib/i18n/fr.json` (3 + 3 aria keys)
- Tests: new Wave 0 spec for view-switcher localStorage persistence

### 9.3 Recette détail (32-05) — `frontend/app/recipes/[id]/page.tsx`

Source: `docs/design-system.html` #recette (lines 1771-1869).

**Structure (top → bottom):**
1. **Sticky floating bar:**
   - `position: sticky; top: 0; z-index: 5; padding: 14px 18px 8px;`
   - `backdrop-filter: blur(12px); background: color-mix(in oklch, var(--background) 80%, transparent);`
   - `display: flex; justify-content: space-between; align-items: center;`
   - Left: back button (lucide `chevron-left`, ghost-sm with card-bg outline).
   - Right: menu button (lucide `more-horizontal`, ghost-sm with card-bg outline) — menu items out of scope.
2. **Hero photo:**
   - `.recipe-photo` aspect-ratio 16:10.
   - `margin-top: -38px` (bleeds into the sticky bar).
   - `border-radius: 0` (corner-flush).
   - Uses `useSignedPhotoUrl` (Phase 30 BUG-01 hook). Glyph fallback (lucide) via `recipe-photo .glyph` pattern when no photo.
3. **Body block** (`padding: 18px 20px 24px; display: flex; flex-direction: column; gap: 14px;`):
   - **Title section:**
     - H2 Cormorant 500 26px, letter-spacing -0.015em, line-height 1.1.
     - Subhead `<Marginalia size="sm" slant>` (margin-top 4px):
       - If `recipe.cook_count > 0` → `recipes.detail.subhead.cooked` with `{count: recipe.cook_count}`.
       - Else → `recipes.detail.subhead.never`.
   - **Badge row:** `.row gap: 6px;` of `.badge` chips:
     - Timer: lucide `timer` 11px + `{recipe.time_minutes} min`.
     - Difficulty: lucide `flame` 11px + `useEnumLabels` label (e.g., "Moyen").
     - Cuisine: `useEnumLabels` label (e.g., "Italienne").
     - Mood: `useEnumLabels` label (e.g., "Réconfortant").
     - Badges only render when data exists; no fallback.
   - **Ingredients section:**
     - H4 Cormorant 500 17px "Ingrédients" + servings `.text-caption` "· {servings} personnes" (font-family override to IBM Plex 400 inside the small per doc line 1801).
     - `.ingredients` flex-column gap 6px of `.ingredient` rows.
     - `.ingredient` = `display: flex; gap: 10px; align-items: baseline;`
     - `.qty` (Cormorant 500, primary color) + `.name` (IBM Plex 400, foreground).
   - **Steps section:**
     - H4 Cormorant 500 17px "Étapes".
     - `.stack gap: 0;` of `.step` rows.
     - Each `.step` = `padding: 8px 0; border-top: 1px dashed var(--border);` (no border-top on first).
     - `.step-num` (Cormorant 500, primary color, margin-right 8px) + step body (IBM Plex 13.5px).
     - **Step 1 marginalia (conditional):**
       - Render `<Marginalia size="sm" slant>` inline below step 1 ONLY if the most recent cooking_log for this recipe has `notes !== null`.
       - Source: separate fetch of `GET /cooking-logs?days=365`, filter by `recipe_id`, find most recent with `notes`.
       - `display: block; margin: 4px 0 0 12px; font-size: 14px;` (override default 16px per doc line 1815).
       - If no log or no notes → step 1 renders without marginalia (no fallback copy).
4. **Sticky bottom CTA:**
   - `position: sticky; bottom: 0;`
   - `padding: 12px 20px calc(12px + env(safe-area-inset-bottom));`
   - `background: color-mix(in oklch, var(--background) 92%, transparent); backdrop-filter: blur(12px); border-top: 1px solid var(--border);`
   - Button: `<button class="btn btn-primary btn-lg" style="width:100%">` + lucide `flame` 18px + `"Cuisiner maintenant"`.
   - On click: existing `POST /api/cooking-logs` path (no new logic in Phase 32; reuse existing handler).
5. **Existing `<PinLabel>` gutter labels** (Phase 28) — **SURVIVE UNCHANGED.** PinLabel mounts on edited fields. Phase 28 contract preserved.

**Files touched in 32-05:**
- `frontend/app/recipes/[id]/page.tsx` (primary)
- `frontend/lib/i18n/fr.json` (2 new subhead keys already added in 32-04 — confirm presence)
- Optional: `frontend/lib/cooking-logs.ts` if a helper for "most recent log with notes for recipe" is extracted. Planner's call.
- Tests: visual gate (manual iPhone pass).

### 9.4 Capture (`/recipes/new`) — primitive-level only (D-16)

**ALLOWED:**
- Token-leak via globals.css (automatic — no per-component edits needed).
- Spinner swap in `RecipeThread/SystemBubble.tsx` (3 sites → `<BrandLoader size="sm">`).
- Caveat font automatic resolution wherever `var(--font-marginalia)` already applies (PinLabel — transitive).

**FORBIDDEN:**
- Layout changes.
- New sections.
- New copy.
- Marginalia register expansion (no `<Marginalia>` added to advisory bubbles or thread content).
- Changes to RecipeThread composition or props.

### 9.5 BottomNav (`components/BottomNav.tsx`) — D-18 token-only

**ALLOWED:**
- Token-driven inheritance — primary hue shift via `--primary`, shadow halving via `--shadow-nav`, radius change via `--radius`.

**FORBIDDEN:**
- Structural changes (4 + central CTA shape preserved from Phase 31).
- Icon swaps (deferred per gh#25 carve-out).
- `aria-current` semantics changes.

**Verify after 32-01:**
- Phase 31's `pb-[calc(5rem+env(safe-area-inset-bottom))]` arithmetic still holds.
- Central CTA filled circle still reads as the loudest element (it will — sober primary is less saturated but still the only solid-fill primary on the nav).
- Removed redundant ring/shadow tweaks if any visually clash with the softer sober shadows.

---

## 10. Cleanup (§15.D)

| Action | File | Status |
|--------|------|--------|
| Delete `frontend/app/styleguide/page.tsx` | already marked `TODO(milestone-close)` in v0.2 | Done in 32-01 |
| Verify schema: zero new columns | `backend/app/models/*` | Grep gate at 32-04 close (D-19): `grep -rn "state.*column\|vote_state.*Mapped" backend/app/models/` returns 0 |
| Verify locked vocabularies parity (D-22) | `frontend/lib/enums.ts` ↔ `backend/app/models/enums.py` | No drift introduced (Phase 32 doesn't touch enums) |
| iOS Safari PWA Caveat test | Manual gate before 32-05 sign-off | §15.D explicit |

---

## 11. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official (already installed) | `card`, `button`, `input`, `sonner`, `tooltip`, `dialog`, `tabs`, `sheet`, `popover` (existing) | not required (project-installed, MIT, audited at install time) |
| Third-party registries | **None.** Phase 32 introduces zero new shadcn blocks from any registry. All four new primitives (`<LedgerCard>`, `<TableVote>`, `<Marginalia>`, `<BrandLoader>`) are hand-authored in `@/components/`. | not applicable |

No external block fetches required during Phase 32 plans.

---

## 12. Invariant Guards (must hold at phase close)

Per CONTEXT.md D-19..D-23:

| Guard | Verification |
|-------|--------------|
| Invariant #2 — voting state computed, NOT stored | `grep -rn "state.*column\|vote_state.*Mapped" backend/app/models/` returns 0 at phase close |
| Invariant #4 — zero new `broadcast_to_household` events | Manual code-review at 32-03 and 32-05 sign-off; no `.broadcast_to_household(` additions in Phase 32 commits |
| Invariant #6 — French-only via next-intl | All visible strings via `useTranslations()`; no hardcoded `"On mange…"` literals in new code; new keys land in `fr.json` |
| Locked vocabularies parity | `enums.ts` ↔ `enums.py` diff returns 0 changes in Phase 32 commits |
| Validé color invariant DECIDE-03 (D-23) | `--color-valide-foreground` / `--color-valide-emphasis` / `--color-valide-border` / `--color-cooking-foreground` unchanged in 32-01 globals.css diff |
| MVP posture (no compat shims) | Token values swap in-place; `/styleguide` deleted in 32-01; no parallel old/new paths live simultaneously |
| Phase 31 BottomNav stability | `BottomNav.tsx` structural diff in Phase 32 = empty (token-only inheritance) |
| Reduced-motion fallback present | `prefers-reduced-motion` block in `.loader-brand` CSS verified at 32-02 close |

---

## 13. Sampling Strategy & Verification

| Surface | Verification Mode | Cadence |
|---------|-------------------|---------|
| 32-01 Tokens | Browser DevTools — confirm OKLCH values in computed styles | Per commit |
| 32-01 Caveat load | iOS Safari PWA standalone screenshot of PinLabel (already-Caveat marginalia post-load) | Once at 32-01 close |
| 32-02 Primitives | Visual review of each primitive in isolation (Playwright screenshots OR `/styleguide`'s replacement via doc page) | Per primitive |
| 32-02 Spinner sweep | `grep -rn "animate-spin\|Spinner\|LoadingSpinner" frontend/` → 0 outside BrandLoader | At plan close (mandatory gate) |
| 32-02 Marginalia sweep | `grep -rn "var(--font-marginalia)" frontend/` → PinLabel + Marginalia.tsx + per-site uses | At plan close |
| 32-03 Accueil | iPhone-shape side-by-side with `docs/design-system.html` #accueil | At plan close |
| 32-04 Bibliothèque | iPhone-shape side-by-side for all 3 views; localStorage persistence Playwright spec | At plan close |
| 32-04 Phase-wide grep gates | (1) `grep -rn "terracotta\|0\.595 0\.135 35" frontend/{app,components}` → 0; (2) `grep -rn "state.*column" backend/app/models/` → 0 | At plan close |
| 32-05 Recette détail | iPhone-shape side-by-side with #recette; verify step-1 marginalia renders only when log notes exist | At plan close |
| Phase gate | Manual iPhone PWA walkthrough; visual compare to all three locked screens; Playwright suite green | Before `/gsd-verify-work` |

---

## 14. Open Questions (deferred for `--auto` mode)

1. **themeColor exact hex for sober primary (A1).** OKLCH→sRGB conversion `oklch(0.50 0.10 32)` ≈ `#8B4A35` by approximation. Planner: verify with CSS Color 4 calculator at 32-01 plan time. If hex differs by > 5 in any channel, update accordingly.
2. **`conteste` per-seat visual (A6).** Phase 32 default: yes-voter seat = `seat-state-valide` (1 yes + 1 no) or `seat-state-pressenti` (multi-member), no-voter seat = `seat-state-contested` (strike). Matches doc mock line 1515. Planner may consult user during 32-02 implementation if mock interpretation is ambiguous.
3. **List view marginalia data source (32-04).** Doc mock shows "cèpes secs, magique" but there's no field on `Recipe` model. **Phase 32 default: omit list-view marginalia unless cheap data source exists (e.g., reuse the same `cooking_logs` fetch from detail page if planner wants to share state).** Recommendation: omit in 32-04 to keep the plan small.
4. **BrandLoader `size="sm"` stroke-dasharray (A3).** Phase 32 default: same dasharray=220 at scaled SVG. Planner: visually verify at 16-18px during 32-02 implementation; if jagged, scale dasharray proportionally.
5. **`<LedgerCard>` element semantics (`<article>` vs `<div>`).** Doc mocks use `<article>`. Phase 32 default: fixed `<article>` for recipe-card surfaces; `<div>` for any non-recipe future use. Planner picks per call-site.
6. **Bibliothèque grid responsive breakpoints.** Doc shows 2-col mobile. Phase 32 default: 2-col (mobile) → 3-col (`@md` ≥ 768px) → optional 4-col (`@lg` ≥ 1024px). Planner picks; current desktop usage is rare (PWA on iPhone).

---

## Copywriting Contract (template required summary)

| Element | Copy |
|---------|------|
| Primary CTA (Accueil) | `Cuisiner {recipe.title}` (existing pattern, FR) |
| Primary CTA (Recette) | `Cuisiner maintenant` |
| Empty state heading (Accueil) | (existing) — Phase 32 adds the Caveat subhead context only |
| Empty state body (Accueil) | `home.subhead.empty` = `— personne ne s'est encore prononcé` |
| Error state | (existing handlers — Phase 32 surfaces no new error UIs) |
| Destructive confirmation | none in scope |

## Spacing Scale (template required summary)

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | inline gaps |
| sm | 8px | tight stacks, badge gap |
| md | 12-16px | row gaps, page padding |
| lg | 24px | section padding |
| xl | 32px | layout gaps |
| 2xl | 48px | major section breaks |
| 3xl | 96px | bottom safe (`--spacing-bottom-safe`) |

Exceptions: `-38px` (Recette photo bleed), `5px 9px` (view-switch button padding) — both inherited verbatim from `docs/design-system.html`.

## Typography (template required summary)

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body (IBM Plex) | 15.6px | 400 | 1.55 |
| Caption (IBM Plex) | 13px | 400 | 1.45 |
| Heading (Cormorant) | 17-22px | 500 | 1.2 |
| Display (Cormorant) | 26-40px clamp | 500 | 1.1 |
| Marginalia (Caveat) | 16-24px | 500 | 1.25 |

## Color (template required summary)

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `oklch(0.975 0.006 75)` warm cream | Page background |
| Secondary (30%) | `oklch(0.99 0.005 75)` card + `oklch(0.93 0.010 60)` secondary | Cards, badges, nav |
| Accent (10%) | `oklch(0.50 0.10 32)` sober terracotta | See §5 reserved list |
| Destructive | `oklch(0.50 0.15 25)` | Destructive only |

Accent reserved for: primary CTA buttons, focus ring, Caveat marginalia, ingredient qty, step number, view-switcher active text, BottomNav active tab, ledger-card patina overlays, recipe-photo gradients, PinLabel text. (See §5 for full list.)

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — all new strings have i18n keys; no hardcoded literals; copy is specific, French, action-oriented
- [ ] Dimension 2 Visuals: PASS — locked screens match doc compositions; patine + table-scene + marginalia + brand-loader land per §15.C
- [ ] Dimension 3 Color: PASS — 60/30/10 holds; accent reserved list explicit; Validé invariant preserved; member colors desaturated correctly
- [ ] Dimension 4 Typography: PASS — Caveat registered + load verified; `.text-display` italic removed; type scale per locked screens
- [ ] Dimension 5 Spacing: PASS — 8-pt scale (with documented sub-4px exceptions from doc); per-surface spacing matches mocks
- [ ] Dimension 6 Registry Safety: PASS — no third-party blocks introduced; only shadcn official (already installed) + hand-authored primitives

**Approval:** pending (checker runs after this draft is committed)

---

*Authoritative source: `docs/design-system.html` §15 + #accueil / #bibliotheque / #recette locked screens. This file is a digest; the doc is the contract.*
