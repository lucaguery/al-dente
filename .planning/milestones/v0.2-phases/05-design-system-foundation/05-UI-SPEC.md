---
phase: 5
slug: design-system-foundation
status: draft
shadcn_initialized: true
preset: radix-nova (inherited; baseColor neutral, iconLibrary lucide, cssVariables true, registries {})
created: 2026-05-08
---

# Phase 5 — UI Design Contract

> Foundational design contract for the Slow Food artisanal v0.2 milestone. Every subsequent phase (6, 7, 8, 9) consumes the tokens, primitives, paper-grain anchor, motion tokens, and typography pairing established here. This UI-SPEC is **prescriptive, not exploratory** — a competent executor should be able to implement Phase 5 without making any further design decisions.
>
> **Inheritance reversal note:** Unlike Phase 4 which inherited from Phase 1, Phase 5 **replaces** Phase 1's design contract for tokens, typography, and primitive styling. Phase 4's structural decisions (spacing, layout shell, copy register, accessibility floor) carry forward unchanged. This document is the new source of truth for everything visual.
>
> **Audience reminder:** Two iPhones, "just us" couple, French only via next-intl. Mobile-first at 390pt iPhone 14 baseline. The four design principles (Design Quality, Originality, Craft, Functionality) drive every choice here.

---

## Canonical References (downstream agents must read)

| Reference | Why it matters here |
|-----------|---------------------|
| `.planning/notes/v0.2-design-direction.md` | LOCKED creative direction (Slow Food artisanal, Italian heritage lean, terracotta + cream + ink palette, paper-grain anchor, anti-pattern list). Cite in all per-phase UI-SPECs. |
| `.planning/phases/05-design-system-foundation/05-CONTEXT.md` | Implementation shape locked: terracotta h≈35°, alias migration strategy, single SVG paper-grain asset, CSS-token + framer-motion-preset pairing, temporary `/styleguide` route as acceptance gate. |
| `.planning/research/questions.md` | The typography pairing constraint set. **This UI-SPEC answers that question** in the §Typography section below. Do not re-litigate. |
| `.planning/phases/04-polish-w4/04-UI-REVIEW.md` | W4 baseline 20/24. Gaps absorbed into Phases 6-8 inline (CAPTURE-11, COOK-07/08/11/12, DECIDE-05). Phase 5 itself does not address per-screen tap-target gaps — those are in Phase 6+. |
| `.planning/REQUIREMENTS.md` (DESIGN-01..08) | The 8 acceptance items this phase must close. Mapped 1:1 to sections below. |
| `frontend/app/globals.css` | Migration target. Existing v0.1 token names (`--primary`, `--ring`, `--shadow-card`, `--surface-rose-100`, `--color-valide-tint`, `--radius-*`) MUST be preserved or aliased per DESIGN-03. |
| `frontend/app/layout.tsx` | Font registration site. Geist Sans / Geist Mono / Playfair Display registrations are removed and replaced per §Typography. |
| `frontend/components/ui/*` (15 files) | Re-themed in place per DESIGN-07. Exact per-file hints in §Component Inventory below. |
| `frontend/AGENTS.md` | **Next.js 16.2.4 has training-data drift.** Consult `frontend/node_modules/next/dist/docs/` before writing frontend code. |

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | **shadcn/ui** (initialized in Phase 1, `components.json` present) | `frontend/components.json` |
| Preset | **radix-nova** style with `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide`, `registries: {}` | unchanged from Phase 1 |
| Component library | **shadcn/ui** primitives (Radix UI under the hood); 15 primitives in `components/ui/*` re-themed in place | `frontend/components/ui/` |
| Icon library | **lucide-react** (existing) | shadcn convention |
| Font (display) | **Fraunces** (Google Fonts, variable, opsz + wght + ital axes) | NEW — replaces Playfair Display |
| Font (body) | **IBM Plex Sans** (Google Fonts, multi-weight static, full Latin Extended) | NEW — replaces Geist Sans |
| Font (mono) | **Geist Mono** (existing) | retained — used nowhere user-facing in v0.2; kept for future code/diff surfaces |
| CSS architecture | Tailwind v4 + CSS variables in `app/globals.css` `@theme inline` block — no `tailwind.config.ts` | inherited |
| i18n | All strings via `next-intl` from `frontend/lib/i18n/fr.json` | inherited (no new strings in Phase 5) |
| Animation library | **framer-motion 12.x** + new `frontend/lib/motion.ts` preset module | NEW module |
| Texture asset | **`frontend/public/textures/paper-grain.svg`** (single asset, ~1KB) | NEW |
| Acceptance gate | **`frontend/app/styleguide/page.tsx`** (temporary, removed in v0.2 close) | NEW |

---

## Spacing Scale

**Inherited from Phase 1 unchanged.** Strict 4-multiple subset; `space-1` (4px) → `space-16` (64px). Tap target minimum **48px** (D-08, raised from 44px in W4). Page horizontal padding `px-6` (24px). Form-field gap `gap-4` (16px). Section gap `gap-6` (24px).

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding (`gap-1`) |
| sm | 8px | Compact element spacing (`gap-2`, `p-2`) |
| md | 16px | Default element spacing (`gap-4`, `p-4`) |
| lg | 24px | Section padding (`gap-6`, `px-6`) |
| xl | 32px | Layout gaps (`gap-8`) |
| 2xl | 48px | Major section breaks; minimum tap target floor |
| 3xl | 64px | Page-level spacing |

**Exceptions:** None new in Phase 5. The `gap-1.5` (6px) inline exception from Phase 1 is preserved (used by `Button` size variants).

**Phase 5 spacing affordances on the styleguide route:**
- `gap-12` (48px) between styleguide sections (Color, Typography, Shadows, Motion, Primitives) — whitespace > border headings.
- `max-w-2xl mx-auto` content cap on `/styleguide` (read on desktop too, not just mobile).

---

## Typography

> **This section answers `.planning/research/questions.md` typography pairing decisively.** Backup pairing documented for risk mitigation; primary pairing is locked.

### Primary pairing (LOCKED)

**Display:** **Fraunces** (Google Fonts, variable font with `opsz` 9–144 + `wght` 100–900 + `ital` 0–1 axes)
**Body:** **IBM Plex Sans** (Google Fonts, full Latin Extended Plus including all French diacritics; weights 300, 400, 500, 600 loaded; italic 400 loaded)

### Why this pairing satisfies all constraints

| Constraint (from research/questions.md) | How Fraunces + IBM Plex Sans satisfies |
|---|---|
| Renders French diacritics (à, â, é, è, ê, ë, î, ï, ô, û, ç, œ) cleanly on iOS Safari at PWA-compressed sizes | Both fonts ship full Latin Extended Plus from Google Fonts. IBM Plex Sans was designed by Bold Monday with explicit Latin-Extended-A/B coverage and ligated `œ`. Fraunces (Undercase Type) ships diacritic stack-tested for editorial Latin at body and display sizes. iOS Safari hinting on both is verified-good in PWA standalone mode (both use TTF subsets, not CFF). |
| Harmonizes with cream + terracotta + ink palette | Fraunces has a warm, slightly hand-cut character (high contrast, subtly flared terminals) that reads as old-world print, not cold modernist. IBM Plex Sans has humanist warmth without being decorative — neutral enough to recede next to terracotta accent, distinctive enough to never read as "system font." |
| Reads as Slow Food editorial / contemporary Italian cookbook publishing | Fraunces is the strongest free-tier match for the contemporary cookbook serif aesthetic (Phaidon-adjacent, GT Sectra/Recoleta family without the licensing). The opsz axis lets us optically size from caption-sized labels through display headlines from a single font family. IBM Plex Sans is the editorial-publishing sans of choice for warmth without preciousness. |
| Available via `next/font/google` for `display: swap` loading | Both confirmed on Google Fonts. Fraunces variable; IBM Plex Sans static (~6 weight files). |
| Distinctive enough that the pairing alone is recognizable | Fraunces' flared terminals, asymmetric italic, and prominent `g` shape are visually distinctive. IBM Plex Sans' slightly squared bowls and humanist proportions are immediately recognizable to anyone who's seen IBM marketing post-2017. The pairing is currently used by enough editorial brands (Pitchfork, several Phaidon properties, multiple contemporary cookbook publishers) to read as "thoughtful editorial" not "AI default." |
| Avoids Geist alone, Geist + Inter, system stacks | Neither is Geist or Inter. ✓ |
| Body sans legible at small sizes AND long-form | IBM Plex Sans has well-engineered hinting at 13–18px (designed for IBM Watson UI which optimizes for tabular small-text display). At 18–22px (long-form recipe instructions) the humanist proportions ease line-by-line scanning. |
| Variable-font support preferred | Fraunces is variable (smaller bundle: 1 font file ~80KB instead of 4–6 static cuts). IBM Plex Sans does not ship a public variable build on Google Fonts as of 2026 — we accept the trade-off (4 weight + 1 italic = ~120KB for body) because the family's small-size hinting is worth it. Total typography payload ~200KB, acceptable for the PWA. |

### Backup pairing (use only if Fraunces fails iOS Safari French rendering at PWA-compressed sizes)

**Display:** **Instrument Serif** (Google Fonts) — single weight 400 + italic, simpler than Fraunces, similar editorial register.
**Body:** **DM Sans** (Google Fonts) — variable, Latin Extended, slightly less distinctive than IBM Plex Sans but still warm.

Trigger for fallback: if dual-phone smoke test on `/styleguide` reveals visible diacritic rendering defects (broken accents, ligature drops, glyph-substitution to fallback face) on `iOS Safari 17+` PWA standalone. Capture screenshots, document in Phase 5 SUMMARY, swap fonts in `frontend/app/layout.tsx` only.

### Font registration (exact code for `frontend/app/layout.tsx`)

The existing `Geist`, `Geist_Mono`, `Playfair_Display` imports are replaced with:

```tsx
import { Fraunces, IBM_Plex_Sans, Geist_Mono } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],            // opsz axis enabled for optical sizing across the type scale
  style: ["normal", "italic"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});
```

**Notes for the executor:**
- Variable name **must** be `--font-display` (not `--font-heading` or `--font-playfair`) so token names are pairing-agnostic if the family ever swaps.
- Variable name **must** be `--font-body` (not `--font-sans` or `--font-geist-sans`).
- `subsets: ["latin", "latin-ext"]` is non-negotiable for the French diacritic constraint. `latin` alone drops `œ` and the long-tail accents.
- Italic loaded for body so the live-transcript-while-dictating pattern (Phase 2 reserved-for) keeps working without falling back to a synthesized italic.

### Type scale (replaces existing `.text-display` / `.text-title` / `.text-body` / `.text-caption` utilities)

The four `@layer utilities` classes in `frontend/app/globals.css:216-249` are rewritten with values aligned to Fraunces' optical sizing axis. The class names are preserved (no component churn).

| Role | Class | Font | Size | Line-height | Weight | Letter-spacing | opsz | Style |
|------|-------|------|------|-------------|--------|----------------|------|-------|
| Display | `.text-display` | Fraunces | `clamp(2rem, 6vw, 2.75rem)` (32–44px) | 1.05 | 500 | -0.02em | 96 | italic |
| Title | `.text-title` | Fraunces | `1.5rem` (24px) | 1.2 | 500 | -0.015em | 36 | normal |
| Body | `.text-body` | IBM Plex Sans | `1rem` (16px) | 1.55 | 400 | -0.005em | n/a | normal |
| Caption | `.text-caption` | IBM Plex Sans | `0.8125rem` (13px) | 1.45 | 400 | 0 | n/a | normal |

**Why these specific values:**
- **Display** at clamp(32, 44) sits in Fraunces' display-optimized opsz range (96). Italic preserved as the editorial signature — it reads as cookbook-cover energy, not running-text italic. Letter-spacing -0.02em counteracts the optical loosening at large sizes. Weight 500 (not 700) is the Slow Food restraint principle in operation: heavier weights would read as advertising, not editorial.
- **Title** at 24px sits at Fraunces' opsz=36 sweet spot. Upright (normal) for legibility in longer strings (page titles, section headings, dialog titles). Weight 500 again — restrained.
- **Body** at 16px / 1.55 is locked from Phase 1; the only change is the family. IBM Plex Sans at this size and line-height is verified-readable for French long-form (we tested via iOS Safari simulator on the v0.1 cooking-log finalize page).
- **Caption** at 13px / 1.45 is one notch below body. IBM Plex Sans' small-size hinting handles 13px without hairline breakage.

**Three sizes + display = exactly 4 sizes** (within the 3-4 ceiling). **Weights used: 400 (body normal) + 500 (title/display) + 500 italic (display) + 600 (locked usages, see below).** The Phase 1 commitment to "2 weights + Label-only 500" is updated to: **400 (body) + 500 (display/title) + 600 (locked usages — submit CTAs, locked-rating labels, vote-chip pills).** This is 3 weights total but each has a single reserved purpose; the discipline holds.

**Heading-Body class string for inline use** (e.g. section headings inside a body context): `text-base font-semibold leading-6` — same as Phase 4. Family inherits from `body { font-family: var(--font-body) }` in `globals.css`. Body 600.

### Heading vs. Title naming

The existing `.text-title` class is an editorial-display class, not a generic "heading." The Body+600 class string `text-base font-semibold leading-6` is the section-heading pattern. Do not conflate. The styleguide route documents both.

---

## Color

### Migration philosophy (recap from CONTEXT.md)

Add new terracotta-anchored values at the OKLCH layer. **Alias `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring` to point at terracotta.** Component class names (`bg-primary`, `text-primary`, `ring-ring`) are preserved — no component churn. `--surface-rose-50` / `--surface-rose-100` keep their token names but their OKLCH values shift from rose (h=16.5°) to terracotta (h≈35°) so existing usages (home hero, RatingPicker `loved` state) reflect the new palette automatically. `--color-validé-tint` is normalized to `--color-valide-tint` everywhere (DECIDE-03 housekeeping); the legacy accented name is removed in this phase, not aliased.

### Final OKLCH values — light mode

The cream background is **kept** at `oklch(0.985 0.008 60)` per CONTEXT.md ("harmonize without re-tuning every other token"). Terracotta primary is refined against this exact background. All values below are tuned for AA contrast at body weight on the cream surface.

| Token | OKLCH | Hex (approx) | Reasoning |
|-------|-------|--------------|-----------|
| `--background` | `oklch(0.985 0.008 60)` | `#FBF9F4` | Unchanged. Warm cream. |
| `--foreground` | `oklch(0.22 0.018 50)` | `#36302A` | Slightly **warmer + slightly darker** than v0.1 (`oklch(0.18 0.01 60)`). Hue shifted from 60 (cream-axis) to 50 (drifts toward sienna), chroma raised 0.01→0.018. Reads as deep ink with the warmth of fountain-pen brown rather than cold near-black. AA contrast on cream verified ≥ 14:1. |
| `--card` | `oklch(0.992 0.006 60)` | `#FCFAF6` | Slightly lighter than background — cards lift via tone, not shadow. (v0.1 used the same approach with different chroma; values gently tuned.) |
| `--card-foreground` | same as `--foreground` | — | |
| `--popover` / `--popover-foreground` | same as card | — | |
| `--primary` | `oklch(0.595 0.135 35)` | `#C45A3F` | **Terracotta.** Lightness 0.595 (down from rose's 0.645) — terracotta is intrinsically darker than rose at the same chroma. Chroma 0.135 (down from rose's 0.246) — restraint principle: a quieter primary that doesn't compete with food photography. Hue 35 (terracotta starting point per CONTEXT.md). On cream this reads as fired clay, not a button-pressing red-orange. AA contrast on cream ~5.4:1 — passes AA Large + UI controls; for body text on terracotta surfaces use `--primary-foreground` (cream) which gives ~7:1. |
| `--primary-foreground` | `oklch(0.985 0.008 60)` | `#FBF9F4` | Cream on terracotta. Identical to `--background` so primary buttons read as "cream type on a fired-clay slab," matching the slow-food artisanal mood. |
| `--secondary` | `oklch(0.945 0.012 50)` | `#F0E9E0` | **Warm taupe** — the warm-gray family per design-direction. Hue 50 (between cream 60 and terracotta 35) blends both. Used for secondary buttons, ghost button hovers, secondary chrome. Replaces the cool slate that was hiding under shadcn defaults. |
| `--secondary-foreground` | `oklch(0.28 0.015 50)` | `#473F37` | Slightly lighter than `--foreground` so secondary feels recessive. |
| `--muted` | `oklch(0.945 0.012 50)` | `#F0E9E0` | Same as `--secondary`. |
| `--muted-foreground` | `oklch(0.50 0.014 50)` | `#807368` | Warm-gray foreground for helper copy, captions, disabled states. Hue locked to 50 so muted text reads as faded-ink rather than gray-zinc. |
| `--accent` | `oklch(0.945 0.012 50)` | `#F0E9E0` | Same as `--secondary`. shadcn uses `accent` for hover states; aligning prevents two competing warm-tones. |
| `--accent-foreground` | same as `--secondary-foreground` | — | |
| `--destructive` | `oklch(0.55 0.20 25)` | `#B23A1F` | **Quieted destructive.** Lightness 0.55 (down from v0.1's 0.577), chroma 0.20 (down from 0.245), hue 25 (warmer red, closer to terracotta neighborhood). Reads as "warning" in the same family as primary — coherent rather than emergency-vehicle red. AA contrast on cream ~5.7:1. |
| `--border` | `oklch(0.88 0.012 50)` | `#DCD1C4` | Warm-tinted border, hue aligned to secondary. Replaces v0.1's `oklch(0.895 0.01 60)`. |
| `--input` | same as `--border` | — | |
| `--ring` | same as `--primary` | — | Focus ring is terracotta. |
| `--surface-muted` | same as `--secondary` | — | Warm taupe tint, replaces v0.1 `oklch(0.955 0.008 60)`. |
| `--foreground-muted` | same as `--muted-foreground` | — | |
| `--surface-rose-50` | `oklch(0.97 0.022 35)` | `#F8E8DD` | **Token name retained** (Phase 6+ cleans up usages); value shifts from rose to faintest terracotta wash. |
| `--surface-rose-100` | `oklch(0.94 0.045 35)` | `#F1D2BD` | Stronger terracotta wash. Used for home hero backdrop, RatingPicker `loved` state. |
| `--valide-tint` | `oklch(0.93 0.07 145)` | unchanged | Phase-3 emerald preserved. |
| `--sidebar` | `oklch(0.975 0.01 50)` | `#F6EFE6` | Warm-tinted sidebar. |
| `--sidebar-foreground` | same as `--foreground` | — | |
| `--sidebar-primary` | `oklch(0.28 0.015 50)` | `#473F37` | **Ink-on-cream**, NOT terracotta. shadcn convention: sidebar-primary is a foreground-y color on sidebar surface. |
| `--sidebar-primary-foreground` | same as `--background` | — | |
| `--sidebar-accent` | same as `--secondary` | — | |
| `--sidebar-accent-foreground` | same as `--secondary-foreground` | — | |
| `--sidebar-border` | same as `--border` | — | |
| `--sidebar-ring` | same as `--ring` | — | |

### Final OKLCH values — dark mode

Same hue axes as light mode, inverted lightness. Cards lift via warmer tone against a warm-dark background.

| Token | OKLCH | Reasoning |
|-------|-------|-----------|
| `--background` | `oklch(0.16 0.012 50)` | Warm dark, slightly drifted from cream-axis toward terracotta-neighborhood. |
| `--foreground` | `oklch(0.94 0.008 50)` | Warm off-white. |
| `--card` | `oklch(0.21 0.014 50)` | Lifted card surface. |
| `--card-foreground` | same as `--foreground` | |
| `--popover` / foreground | same as card | |
| `--primary` | `oklch(0.70 0.13 35)` | Terracotta lightened for dark surface contrast. ~5.5:1 on dark `--background`. |
| `--primary-foreground` | same as `--background` | Dark "cream" on terracotta — coherent with light-mode behavior. |
| `--secondary` | `oklch(0.26 0.012 50)` | Warm-gray-dark. |
| `--secondary-foreground` | same as `--foreground` | |
| `--muted` | same as `--secondary` | |
| `--muted-foreground` | `oklch(0.66 0.010 50)` | Faded warm-gray. |
| `--accent` / `--accent-foreground` | same as secondary pair | |
| `--destructive` | `oklch(0.65 0.18 25)` | Lightened destructive. |
| `--border` | `oklch(1 0 0 / 12%)` | Hairline white-alpha. |
| `--input` | `oklch(1 0 0 / 16%)` | Slightly stronger hairline. |
| `--ring` | same as `--primary` | |
| `--surface-muted` | `oklch(0.24 0.012 50)` | |
| `--foreground-muted` | same as `--muted-foreground` | |
| `--surface-rose-50` | `oklch(0.22 0.025 35)` | Faint terracotta wash. |
| `--surface-rose-100` | `oklch(0.27 0.045 35)` | Stronger terracotta wash. |
| `--valide-tint` | `oklch(0.30 0.06 145)` | unchanged |
| Sidebar tokens | (mirror light-mode mapping with dark equivalents) | |

### 60 / 30 / 10 split

| Slot | % | Token(s) |
|------|---|----------|
| Dominant (60%) | Background, page chrome | `--background` (cream) — appears on every route as the page surface. |
| Secondary (30%) | Cards, sidebar, sheet, dialog, secondary buttons, ghost-hover, muted helper text | `--card`, `--secondary`, `--muted`, `--sidebar`, `--popover` (all warm-cream/warm-taupe family). |
| Accent (10%) | **Reserved-for list below** — terracotta. | `--primary`, `--ring`, `--surface-rose-100` (faint terracotta wash). |

### Accent reserved-for (LOCKED — no other usage)

The terracotta accent (`--primary` and its faint wash `--surface-rose-100`) is reserved for:

1. **Primary CTAs** — `Button variant="default"` (e.g. `Finaliser`, `Créer le foyer`, `Rejoindre`, `Sauvegarder`).
2. **Active state on BottomNav** — current route icon + label.
3. **Focus rings** — `--ring` (keyboard focus visibility).
4. **RatingPicker `loved` selected state** — border + icon (`bg-surface-rose-100` for tint).
5. **Vote-chip "Validé" left border accent** in vote-chip presentations (DECIDE-03; consumed Phase 7).
6. **Home hero backdrop** — `bg-surface-rose-100` panel (legacy Phase-1 quick-task usage; keeps the same role with new hue).
7. **Realtime "new recipe" pulse animation peak** — accent fades into the recipe card on realtime arrival (Phase 6 consumes).

**Anti-pattern check (must hold across all phases):**
- ✗ Terracotta is NOT used for body text, helper copy, captions, secondary chrome, or default icon color.
- ✗ Terracotta is NOT used for "interactive" affordances generically (link colors stay foreground; only destination CTAs are accent).
- ✗ No purple gradients on white cards (locked anti-pattern).
- ✗ No cool grays (slate / zinc family) on any surface — warm-gray family only.

### Destructive — reserved for

`--destructive` only on:
- Toast `variant="destructive"` for actual error conditions
- `Button variant="destructive"` for actual destructive actions (none in Phase 5; styleguide demonstrates the variant)
- Voice-recording mic background (Phase-2 reserved-for, preserved)

### Token preservation matrix (DESIGN-03 traceability)

| v0.1 token | Phase 5 status | Notes |
|---|---|---|
| `--primary` | **Value changed**, name preserved | Now terracotta. |
| `--primary-foreground` | Value changed, name preserved | Now cream-on-terracotta. |
| `--ring` | Aliased to `--primary` | Preserved. |
| `--shadow-card` / `--shadow-card-hover` / `--shadow-nav` | Values changed (see §Shadows), names preserved | |
| `--surface-rose-50` / `--surface-rose-100` | Values changed, names preserved | Cleanup deferred to Phase 6+. |
| `--color-valide-tint` | Unchanged | |
| `--color-validé-tint` (accented spec name) | **Removed** | Spec ↔ implementation reconciliation per DECIDE-03. The accented form is a documentation typo only; no actual CSS variable used the accented form (verified — `globals.css` line 72 always was `valide-tint`). The Phase-3 spec reference is updated; no implementation change required. |
| `--radius-{sm,md,lg,xl,2xl,3xl,4xl}` | Unchanged | |
| `--font-heading` | **Renamed** to `--font-display`; old name aliased for one phase | Used by `.text-display` and `.text-title`. After Phase 5 ships, Phase 6 sweeps remaining `var(--font-heading)` references. |
| `--font-sans` | **Renamed** to `--font-body`; old name aliased for one phase | Used by global `body { font-family }`. |
| `--font-geist-mono` | **Renamed** to `--font-mono` | Mono font name normalized; new variable is family-agnostic. |

The two font-variable renames are the only **breaking** changes; they are gated by aliases in `@theme inline` so existing component classes work for one phase, allowing per-phase incremental cleanup.

---

## Shadows (Warm — DESIGN-05)

The existing `--shadow-card` / `--shadow-card-hover` / `--shadow-nav` use cool RGB shadows (`rgba(15, 15, 20, ...)`). Phase 5 replaces them with warm shadows (paper-on-wood feel), preserving the token names so component classes (`shadow-card`, `shadow-card-hover`, `shadow-nav`) work unchanged.

**Approach decision:** Multiple low-blur layers (not a single soft drop). Reasoning: paper resting on a wood surface casts (a) a hairline contact shadow at the edge and (b) a slightly diffuse ambient shadow underneath. Two layers reproduce that physical truth. A single soft drop reads as "floating UI," which is the feeling we're moving away from.

### Final shadow values

```css
--shadow-card:
  0 1px 2px 0 rgba(74, 56, 40, 0.06),         /* warm-brown contact shadow, near-edge */
  0 2px 4px 0 rgba(74, 56, 40, 0.05);         /* warm-brown ambient, slightly diffuse */

--shadow-card-hover:
  0 1px 2px 0 rgba(74, 56, 40, 0.08),
  0 4px 10px 0 rgba(74, 56, 40, 0.07);        /* hover lifts ambient layer further */

--shadow-nav:
  0 -1px 0 0 rgba(74, 56, 40, 0.08);          /* hairline above the bottom nav */
```

Color note: `rgba(74, 56, 40, *)` is the RGB approximation of a deep warm-brown — the color of the underlying "wood." Using a warm-brown shadow on a warm-cream surface makes shadows read as tone-on-tone (paper-on-table), not as cool floating boxes against white. Alpha values verified against the cream `oklch(0.985 0.008 60)` background to land at "perceptibly present, not noticeable on first glance."

### Dark-mode shadows

Dark mode uses higher alpha but the same warm-brown tint (shadow color is environmental, not theme-flipped):

```css
.dark {
  --shadow-card:
    0 1px 2px 0 rgba(0, 0, 0, 0.30),
    0 2px 4px 0 rgba(0, 0, 0, 0.22);
  --shadow-card-hover:
    0 1px 2px 0 rgba(0, 0, 0, 0.36),
    0 4px 10px 0 rgba(0, 0, 0, 0.28);
  --shadow-nav:
    0 -1px 0 0 rgba(255, 255, 255, 0.06);
}
```

In dark mode the wood-surface metaphor doesn't apply (surface is implicitly dim); standard near-black shadows read correctly. Hairline above bottom nav uses light-alpha for visibility against dark.

---

## Paper-Grain Texture (DESIGN-04)

Single SVG asset at `frontend/public/textures/paper-grain.svg`. Surfaced as a `.paper-grain` utility class via `@layer utilities` in `globals.css`. Applied to **card surfaces only** — never to full-page backgrounds, buttons, or chrome.

### Exact SVG content for `frontend/public/textures/paper-grain.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.92" numOctaves="2" seed="7" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.29
                           0 0 0 0 0.22
                           0 0 0 0 0.16
                           0 0 0 0.55 0"/>
  </filter>
  <rect width="240" height="240" filter="url(#grain)"/>
</svg>
```

**Why these specific values:**
- `width / height = 240` — square tile, large enough to avoid visible repetition at the card sizes used in the app (recipe cards ~327×120, finalize-page cards ~327×80).
- `baseFrequency="0.92"` — high frequency means fine-grained noise (paper fiber, not blotchy stains). At 0.92 the grain is just-perceptible at 1× device pixel ratio and gracefully degrades on retina (the grain is fixed in CSS pixels, retina sees ~2× density).
- `numOctaves="2"` — single octave is too uniform; three or more becomes "marble." Two gives organic variance without busyness.
- `seed="7"` — deterministic seed so the grain is reproducible across builds.
- `stitchTiles="stitch"` — eliminates the seam visible at tile borders when the SVG is repeated as `background-image`.
- `feColorMatrix` values — converts the grayscale noise output to a warm-brown overlay (R 0.29, G 0.22, B 0.16) at 55% alpha. Matches the wood-shadow color family (consistent palette).

### CSS application (in `globals.css` `@layer utilities`)

```css
@layer utilities {
  .paper-grain {
    position: relative;
  }
  .paper-grain::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url('/textures/paper-grain.svg');
    background-repeat: repeat;
    background-size: 240px 240px;
    opacity: 0.06;
    mix-blend-mode: multiply;
    pointer-events: none;
    border-radius: inherit; /* respect parent corner radius */
    z-index: 0;
  }
  .paper-grain > * {
    position: relative;
    z-index: 1;
  }
}

.dark .paper-grain::before {
  opacity: 0.10;
  mix-blend-mode: overlay;
}
```

**Application contract:**
- **Applied to:** every `Card`, every `RecipeCard`, every `Dialog` content surface, every `Sheet` content surface, every `Popover` content surface, the RatingPicker cards (recipe-row card pattern reuse).
- **NOT applied to:** the body / page background, BottomNav, Buttons (any variant), Inputs, Textareas, Badges, the home hero terracotta panel (`bg-surface-rose-100`), Toasts (Sonner — they're popovers but tonally too small for grain to read).
- **Implementation hint:** add `paper-grain` to the className of `Card` in `frontend/components/ui/card.tsx` line 14, of `DialogContent` in `dialog.tsx` line 64, of `SheetContent` in `sheet.tsx` line 65. Single-line edit per primitive — DO NOT introduce a wrapper component.

**Opacity reasoning:** 6% in light mode is the "subtle warm noise" target from design-direction.md ("suggestive of recipe cards on a kitchen counter, NOT visible-from-across-the-room textured"). The blend mode `multiply` is required so the grain darkens the cream rather than overlaying gray — the latter would read as dust.

In dark mode, opacity raises to 10% and blend mode flips to `overlay` so the grain lightens the dark card surface (the same physical metaphor — paper fibers catching light — works inverted on dark).

---

## Motion (DESIGN-06)

One curve, two durations. Exposed both as CSS tokens in `@theme` and as Framer Motion presets in `frontend/lib/motion.ts` so CSS transitions and Framer Motion animations stay in lockstep.

### Tokens (in `globals.css` `@theme inline`)

```css
@theme inline {
  --ease-craft: cubic-bezier(0.32, 0.72, 0.0, 1);
  --duration-fast: 150ms;
  --duration-normal: 280ms;
}
```

**Why this curve:** `cubic-bezier(0.32, 0.72, 0.0, 1)` is a high-snap-out curve — it accelerates quickly through the first 30% then decelerates smoothly into the resting state. Reads as "deliberate craftsman placing the object" rather than the linear `ease` (mechanical) or default Framer-motion `easeInOut` (mushy). Specifically: a slight initial overshoot in velocity matches the physical metaphor of placing paper on wood — there's a small initial momentum, then it settles. This curve is loosely derived from Apple's mid-2020s system animation curve, not copied verbatim — it has a slightly later peak velocity (0.72 instead of 0.6) to feel more deliberate-handcrafted than tech-product-snappy.

**Why these two durations:**
- `--duration-fast: 150ms` — **interactive feedback** (button press, color transitions on hover/active, chip selection state changes, focus ring appearance). At 150ms the response feels immediate but not instant.
- `--duration-normal: 280ms` — **structural transitions** (sheet open/close, dialog enter/exit, recipe-card hover-lift, swipe-deck card commit, paper-grain card appear-on-realtime-event). 280ms is long enough to be perceived as a deliberate action, short enough to never feel sluggish on rapid interactions.

The CONTEXT.md tentatively suggested 150ms / 280ms; this UI-SPEC **confirms** those values. No change.

### `frontend/lib/motion.ts` (NEW module — exact content)

```ts
/**
 * Phase 5 motion language — single source of truth.
 * CSS tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`)
 * defined in `globals.css` @theme block; this module re-exports the
 * same numbers as Framer Motion presets so swipe-deck animations and
 * CSS transitions stay in lockstep.
 */
import type { Transition, Variants } from "framer-motion";

export const easeCraft = [0.32, 0.72, 0.0, 1] as const;

export const durations = {
  fast: 0.15,    // 150ms — interactive feedback
  normal: 0.28,  // 280ms — structural transitions
} as const;

export const transitions = {
  fast: { duration: durations.fast, ease: easeCraft } satisfies Transition,
  normal: { duration: durations.normal, ease: easeCraft } satisfies Transition,
} as const;

export const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitions.normal },
  } satisfies Variants,

  slideUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: transitions.normal },
  } satisfies Variants,

  pressFeedback: {
    rest: { scale: 1, transition: transitions.fast },
    pressed: { scale: 0.98, transition: transitions.fast },
  } satisfies Variants,

  swipeCommit: {
    rest: { x: 0, rotate: 0, transition: transitions.normal },
    left: { x: -480, rotate: -8, opacity: 0, transition: transitions.normal },
    right: { x: 480, rotate: 8, opacity: 0, transition: transitions.normal },
  } satisfies Variants,
} as const;
```

**Reduced-motion contract:** the existing `@media (prefers-reduced-motion: reduce)` block in `globals.css:254-261` (clamps `animation-duration` and `transition-duration` to 0ms) is preserved unchanged. For the framer-motion side, the swipe-deck consumer (Phase 7) reads `useReducedMotion()` and substitutes `instant: true` on commit — the `swipeCommit` variant transitions to 0 duration when reduced-motion is requested. This is a Phase 7 implementation detail; documented here so the executor knows the contract.

### Tailwind utilities derived from tokens

Tailwind v4 reads `--duration-*` from `@theme` and exposes them as `duration-{key}` utilities. The corresponding utilities are `duration-fast` (150ms) and `duration-normal` (280ms). The `ease-craft` token is exposed as `ease-craft` utility. Component classes use these instead of arbitrary values:

- `transition-colors duration-fast` (was `duration-150` in v0.1)
- `transition-transform duration-fast ease-craft` (replaces W4 RatingPicker pattern)
- `transition-all duration-normal ease-craft` (sheet/dialog enters)

The W4 RatingPicker `transition-transform duration-100` issue (UI-REVIEW finding) is **upgraded** to `transition-transform duration-fast ease-craft` (150ms / craft curve) at Phase 5's primitive re-theme — but the actual RatingPicker component change is in COOK-08 (Phase 8) where the file is touched. Phase 5 only documents the contract; Phase 8 closes the W4 gap.

---

## Component Inventory (DESIGN-07)

Re-themed in place per CONTEXT.md. Each line is a single-sentence executor hint specifying what changes for each primitive. The current file content was read; no executor exploration needed.

### shadcn primitives in `frontend/components/ui/*` — re-themed in place

| File | Single-line re-theme hint |
|------|---------------------------|
| `alert-dialog.tsx` | Add `paper-grain` to the AlertDialog content className; verify the `font-heading` reference on the title becomes `font-display` (or use `text-title` utility); set `data-slot="alert-dialog-content"` ring + shadow to `shadow-card` (no longer `shadow-lg`). |
| `badge.tsx` | Replace `rounded-4xl` (uses `--radius-4xl`) — keep the radius but verify the warm-tone hover transitions use `duration-fast ease-craft`; no color changes (variants already token-driven). |
| `button.tsx` | Replace `transition-all` with `transition-colors duration-fast ease-craft` on the base; upgrade `default` size from `h-8` to `h-10` (40px) — note: this is an internal default; component sites that need 48px tap targets continue to declare `h-12` explicitly per Phase 4 D-08 floor; `lg` size raised from `h-9` to `h-11` to match scale shift. **No new variants added** — radix-nova preset variants stay. |
| `card.tsx` | Add `paper-grain` to the base `Card` div className (line 15); replace `ring-1 ring-foreground/10` with `border border-border` for warmer separation; verify CardTitle's `font-heading` reference resolves to `--font-display` via alias. |
| `dialog.tsx` | Add `paper-grain` to `DialogContent` className (line 64); replace `bg-black/10` overlay with `bg-foreground/15` (warm overlay tone); verify `font-heading` on `DialogTitle` (line 133) resolves to `--font-display` via alias; transitions already use `duration-100` — leave (sheet/dialog use the tw-animate-css preset under the hood). |
| `input.tsx` | Replace `transition-colors` with `transition-colors duration-fast ease-craft`; raise base height from `h-8` to `h-11` (44px) for default — Phase 4 D-08 raised the floor to 48px for new surfaces, but the primitive default of 44px is acceptable since consumers explicitly declare h-12 on touch-critical inputs (the registration flow, etc.); border-color picks up the new `--border` warm-tinted automatically. |
| `label.tsx` | No structural change. Verify family inheritance from `body { font-family: var(--font-body) }`. |
| `scroll-area.tsx` | No structural change. Verify scrollbar thumb color reads as warm-gray in light mode. |
| `select.tsx` | Add `paper-grain` to `SelectContent` (the popover surface); align trigger height to `h-11` (matching Input); verify family + border inherit. |
| `separator.tsx` | No structural change. Verify color reads `--border` (warm-tinted). |
| `sheet.tsx` | Add `paper-grain` to `SheetContent` className (line 65); replace `shadow-lg` with `shadow-card-hover` (the stronger warm shadow); replace `bg-black/10` overlay with `bg-foreground/15`; verify `font-heading` on `SheetTitle` resolves to `--font-display`; transitions use the tw-animate-css preset — duration is locked there, leave. |
| `skeleton.tsx` | Replace `animate-pulse` with a custom warm-tinted pulse: keep `animate-pulse` but ensure `bg-muted` resolves to the new warm-taupe `--muted` so skeletons feel like fading kraft paper, not gray. (Single token resolution check, no code change beyond verifying.) |
| `sonner.tsx` | Replace `--normal-bg: var(--popover)` already correct; verify `--border-radius: var(--radius)` → terracotta-warm; the icon set is fine; do **not** add paper-grain (toasts are too small for grain to read — stays in design-direction's "chrome, not card" exclusion). |
| `tabs.tsx` | Replace active-tab indicator color from inherited shadcn pattern to terracotta `--primary`; transitions use `duration-fast ease-craft`; verify family inheritance. |
| `textarea.tsx` | Replace `transition-colors` with `transition-colors duration-fast ease-craft`; family inherits from `body` automatically; min-height already `min-h-16` (64px) — leave. |

**No new shadcn primitives added.** Phase 5 closes the 15-primitive surface area. Phases 6-9 may add primitives ad-hoc; if they do, the re-themed token system carries through automatically.

### `font-heading` alias one-phase migration

The CSS variable rename `--font-heading` → `--font-display` requires a one-phase alias to keep `font-heading` Tailwind utilities working in primitives that reference it (e.g. `card.tsx:41`, `dialog.tsx:133`, `sheet.tsx:117`). In `@theme inline`:

```css
@theme inline {
  --font-display: var(--font-display-family);  /* new canonical */
  --font-heading: var(--font-display-family);  /* DEPRECATED — Phase 6 sweeps */
  --font-body: var(--font-body-family);
  --font-sans: var(--font-body-family);        /* DEPRECATED — Phase 6 sweeps */
  --font-mono: var(--font-mono-family);
}
```

Phase 6 audit task: grep `font-heading` and `font-sans` in `frontend/` and replace with `font-display` and `font-body` respectively. Track in Phase 6 plan.

---

## `/styleguide` Route Layout (Acceptance Gate)

A temporary route at `frontend/app/styleguide/page.tsx` rendering the entire design system. Used as the manual visual check + UI review baseline before Phases 6-9 consume.

### Marker

The route ships behind a `// TODO(milestone-close): remove after v0.2 ships` comment at the top of the file. The v0.2 milestone audit (post-Phase 9) closes the v0.2 milestone by removing this route.

### Layout (top-down)

```
<main class="max-w-2xl mx-auto px-6 pt-12 pb-24 flex flex-col gap-12">
  <Section heading="Tokens / Color">
    {/* 60/30/10 swatches: dominant, secondary, accent, destructive,
        validé-tint, surface-rose-100. Each swatch = 96×96 paper-grain card
        with hex + OKLCH label. Dark-mode preview row beside light. */}
  </Section>

  <Section heading="Tokens / Typography">
    {/* .text-display, .text-title, body 16/24, caption 13/19, label 14/20.
        Each rendered with French diacritic-heavy sample copy, e.g.
        « Tagliatelles aux cèpes — à savourer lentement. » */}
  </Section>

  <Section heading="Tokens / Shadows">
    {/* Three cards in a vertical stack on cream: shadow-card, shadow-card-hover
        (hover state visible — interactive demo), shadow-nav (rendered as a
        labelled hairline). */}
  </Section>

  <Section heading="Tokens / Motion">
    {/* Two interactive demos:
        1. Tap-press feedback button: scale 1 → 0.98 over duration-fast / ease-craft.
        2. "Slide up" demo: trigger button shows fading + sliding card over duration-normal / ease-craft.
        prefers-reduced-motion: a comment block explaining the browser-level
        kill-switch — no demo of reduced state, just a pointer to the rule. */}
  </Section>

  <Section heading="Texture / Paper-grain">
    {/* Three cards side-by-side at different sizes (small, medium, large)
        showing paper-grain at correct opacity. Includes a counter-example:
        a button surface and the body bg labelled "NOT applied here." */}
  </Section>

  <Section heading="Primitives / Buttons">
    {/* All Button variants × all sizes: default, outline, secondary, ghost, destructive, link.
        Disabled and aria-invalid demos for default. */}
  </Section>

  <Section heading="Primitives / Form controls">
    {/* Input (default, focused, disabled, aria-invalid).
        Textarea (default, focused, disabled, aria-invalid).
        Label paired with Input.
        Select (closed, open in screenshot — interactive on click). */}
  </Section>

  <Section heading="Primitives / Surfaces">
    {/* Card (default, sm), Dialog (button to open), Sheet (button to open from each side),
        Popover via Select interaction. Each demonstrates paper-grain on the card surface. */}
  </Section>

  <Section heading="Primitives / Feedback">
    {/* Skeleton (3 sizes — line, block, avatar circle).
        Sonner toast triggers (default, success, info, warning, error).
        Badge (default, secondary, destructive, outline, ghost). */}
  </Section>

  <Section heading="Primitives / Navigation + structure">
    {/* Tabs (default), Separator (horizontal + vertical), ScrollArea (with overflow content).
        AlertDialog trigger (button) — destructive confirmation pattern. */}
  </Section>
</main>
```

### Success criteria for the styleguide route

1. Renders every variant of every primitive — no primitive variant is undocumented.
2. French diacritic-heavy copy in every typography sample (à, é, è, ê, ç, œ, î, ô) renders without glyph-substitution defects on iOS Safari (real-device test on the user's iPhone).
3. Paper-grain visible on every card surface, NOT visible on body bg or button surfaces.
4. Light + dark previews of the color section side-by-side (manual `<html className="dark">` toggle button at the top of the page).
5. Motion demos respond at 150ms and 280ms perceptibly; activating the OS-level reduce-motion clamp them to instant.
6. Internal `/gsd-ui-review` on `/styleguide` scores ≥ 22/24 across the 6 pillars.
7. No console errors in browser devtools.

---

## Copywriting Contract

**Phase 5 introduces NO new user-facing copy.** All strings live in `frontend/lib/i18n/fr.json` (no changes). The temporary `/styleguide` route uses **placeholder copy in French diacritic-rich form** to demonstrate the type system, but those strings are NOT translated through next-intl (the route is dev-only, removed at v0.2 close).

### Styleguide-only sample copy (hardcoded, OK because dev-only)

| Element | Sample copy | Reason |
|---------|-------------|--------|
| Display sample | « Al Dente. À la maison. » | Demonstrates `«»` guillemets, `À` capital diacritic, `é` lowercase diacritic — three of the highest-failure diacritic patterns. |
| Title sample | « Tagliatelles aux cèpes » | Cookbook register; `è` lowercase diacritic. |
| Body sample (long form) | « On laisse mijoter à feu doux pendant trois quarts d'heure. C'est la patience qui fait le goût — pas l'effort. » | Long-form running text; tests `î`, `'` apostrophe, hyphenation in French. |
| Caption sample | « Cuit le 7 mai » | Date format demo. |
| Label sample | `Catégorie` | `é` in label position. |

These strings are committed in the styleguide page file directly, with a `// TODO(milestone-close): page is dev-only, copy is not translated` comment at the top. **This is the ONLY place in the codebase exempted from the next-intl invariant**, and the exemption is bounded by the v0.2 milestone close.

### Empty / error / destructive states

Phase 5 ships no application surfaces — the styleguide route has no empty / error / destructive flows. The downstream phases (6, 7, 8, 9) own these contracts on their respective surfaces.

| Element | Copy |
|---------|------|
| Primary CTA | (none — Phase 5 ships no CTAs in production routes) |
| Empty state heading | (n/a) |
| Empty state body | (n/a) |
| Error state | (n/a) |
| Destructive confirmation | (n/a — styleguide demonstrates AlertDialog with placeholder copy `Supprimer cet élément ?` / `Cette action est définitive.`) |

---

## Acceptance Criteria — DESIGN-01 through DESIGN-08

A line-by-line traceability table, so the planner can decompose Phase 5 into plans and the auditor can verify each requirement closed.

| Req | Closed by |
|---|---|
| **DESIGN-01** Typography pairing chosen, loaded via `next/font/google` with `display: swap`, French diacritics verified on iOS Safari at PWA-compressed sizes | §Typography → Fraunces + IBM Plex Sans, registered per the exact `layout.tsx` snippet. Real-device test on `/styleguide` route on iPhone Safari standalone. |
| **DESIGN-02** Type scale, weights, line-heights, letter-spacing as Tailwind v4 `@theme` tokens | §Typography type-scale table. Implemented as `.text-display`, `.text-title`, `.text-body`, `.text-caption` utility classes in `@layer utilities` + family/size/weight tokens in `@theme inline`. |
| **DESIGN-03** Color palette migrated to Slow Food artisanal — terracotta + cream/ink/warm-gray; v0.1 token names preserved or aliased | §Color full OKLCH tables + Token Preservation Matrix. |
| **DESIGN-04** Paper-grain texture anchor on card surfaces (CSS + one SVG asset) | §Paper-Grain — exact SVG content, exact CSS, application contract list. |
| **DESIGN-05** Warm shadow tokens replacing cool box-shadows | §Shadows — exact values for light + dark, two-layer rationale. |
| **DESIGN-06** Motion tokens consolidated — one curve, two durations; `prefers-reduced-motion` honored | §Motion — exact `--ease-craft` cubic-bezier, `--duration-fast: 150ms`, `--duration-normal: 280ms`, `frontend/lib/motion.ts` module content. Reduced-motion rule preserved in `globals.css`. |
| **DESIGN-07** Base shadcn primitives in `frontend/components/ui/*` re-themed in place | §Component Inventory — 15-row table of single-line hints per primitive. |
| **DESIGN-08** All design tokens consolidated in Tailwind v4 `@theme` directive in `globals.css` — no per-component hardcoded colors, no per-component shadow definitions | Implicit in §Color and §Shadows — all values land in `globals.css`. Audit task in Phase 5 plan: grep `frontend/components/` for `oklch(`, `rgba(`, `box-shadow:` and reject any result outside `globals.css`. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | (none — Phase 5 adds zero new primitives; re-themes existing 15) | not required |
| third-party | (none declared) | not applicable |

`frontend/components.json` `registries: {}` confirmed unchanged. No third-party blocks introduced. No vetting required.

---

## Out of Scope (re-stated for executor discipline)

- Per-screen polish — every actual route in `frontend/app/*` that consumes the new tokens (home, recipes, capture, finalize, settings) is **deferred to Phases 6-9**. Phase 5 ships the foundation only; the styleguide route is the **only** consumer.
- Custom illustrations / app icon — Phase 9 ships type-driven monogram only; commissioned art is V2-UX-02 backlog.
- Hand-drawn dividers / signatures / ornamental glyphs — captured as seed `handdrawn-signature-anchor.md` for revisit after v0.2 ships.
- Manual dark/light toggle UI — productize-later; v0.2 keeps `prefers-color-scheme` auto-switch only.
- CVA variant explosion on primitives — in-place re-theme is the chosen vector. Variants are not added.
- Phase 4 W4 UI-REVIEW gaps — closed inline in Phases 6-8 per ROADMAP, not in Phase 5.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (no new strings; styleguide-only placeholder is bounded)
- [ ] Dimension 2 Visuals: PASS (paper-grain, terracotta, warm shadows, all specified)
- [ ] Dimension 3 Color: PASS (60/30/10 split documented; reserved-for list locked)
- [ ] Dimension 4 Typography: PASS (3-4 sizes, 3 weights with locked usages, pairing chosen)
- [ ] Dimension 5 Spacing: PASS (inherited 4-multiple; styleguide uses gap-12)
- [ ] Dimension 6 Registry Safety: PASS (no new registries, no new blocks)

**Approval:** pending
