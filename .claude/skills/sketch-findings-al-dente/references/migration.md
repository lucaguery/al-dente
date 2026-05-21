# Migration · Sober Kitchen → La Grille Soft

Concrete deltas for porting into `frontend/app/globals.css` and downstream
components. Use this as the wave-1 checklist.

## Authoritative document

[ADR-0004 modern-sober refresh](../../../../docs/adr/0004-modern-sober-refresh.md)
— this file is its operational counterpart.

## Token deltas

| Category | Old (Sober Kitchen) | New (La Grille Soft) | Action |
|---|---|---|---|
| Font display | Cormorant Garamond 500 italic | Geist 500 (upright) | Replace `--font-display` in `layout.tsx` |
| Font body | IBM Plex Sans 400 | Geist 400 | Replace `--font-body` in `layout.tsx` |
| Font marginalia | Caveat 500 slant | — | Drop `--font-marginalia` from `:root` |
| Font mono (new) | — | Geist Mono 400 | Add `--font-mono` to layout |
| Surface bg | `oklch(0.975 0.006 75)` | `#FAFAF7` | Update `--background` |
| Surface card | `oklch(0.99 0.005 75)` + paper-grain | `#FFFFFF` (flat) | Update `--card`, drop `.paper-grain::before` rule |
| Encre | `oklch(0.21 0.014 55)` | `#14110D` | Update `--foreground` |
| Muted ink | `oklch(0.50 0.012 55)` | `#6F6B62` | Update `--muted-foreground` |
| Faint ink (new) | — | `#A09A8C` | Add `--foreground-faint` |
| Border | `oklch(0.86 0.010 55)` | `#EDEBE4` | Update `--border` |
| Border strong (new) | — | `#D8D4C7` | Add `--border-strong` |
| Accent | `oklch(0.50 0.10 32)` ≈ `#C8553D` | `#A8523C` | Update `--primary` |
| Accent deep (new) | — | `#8E4330` | Add `--primary-hover` |
| Validé tint | `oklch(0.91 0.045 35)` | `#F5E5DD` | Update `--valide-tint` |
| Validé fg | `#A8412E` (ADR-0003) | `#82371F` | Update `--color-valide-foreground` |
| Shadow card | warm-brown 2-layer | — | Drop `--shadow-card` and `--shadow-card-hover` |
| Shadow deck (new) | — | `0 2px 8px rgba(20,17,13,0.06), 0 12px 28px rgba(20,17,13,0.08)` | Add `--shadow-deck` |
| Paper-grain texture | `/textures/paper-grain.svg` overlay | — | Drop the asset + the `.paper-grain` class |
| Patine ledger card | `.ledger-card` with `--patina` 0-3 | — | Drop `--patina` token + all `.ledger-card` rules |
| Marginalia register | `.marginalia` + slant | — | Drop all `.marginalia*` rules |
| Brand-mark loader | `.loader-brand` draw-stroke 3.2s | Pulse centre dot on logomark 1.8s | Replace component |
| Motion ease | `cubic-bezier(0.32, 0.72, 0, 1)` (`--ease-craft`) | `cubic-bezier(0.22, 1, 0.36, 1)` | Replace `--ease-craft` with `--ease` |
| Duration tokens | `--duration-fast: 150ms`, `--duration-normal: 280ms`, `--duration-slow: 3200ms` | `--duration-fast: 160ms`, `--duration-base: 240ms`, `--duration-slow: 380ms` | Drop the 3200ms (was for loader); update the rest |

## Component deltas

| Component | Old | New |
|---|---|---|
| `Card` | Patine ledger with dot grid + dog-ear | Flat card with hairline border |
| `LedgerCard.tsx` | Component exists | **Delete** — replaced by flat row pattern |
| `Button` (CTA) | Terracotta filled, radius 10 | Ink filled, hover → accent, radius 8 |
| `BottomNav.tsx` | Icon + text label, 4 tabs, central pill CTA | Icon-only, 4 equal tabs, pill-active terracotta-tint |
| `BrandIcon.tsx` | Cormorant "A" with draw animation | `<AlDenteMark>` reading `/logo.svg`, optional pulse on `.center-dot` |
| `<Marginalia>` | Caveat italic slant subtitle | **Delete** — replaced by Geist Mono meta |
| `<TableVote>` | 5-state scene with warm-cream/emerald | 5-state scene with bg/ink/accent (see [components.md](components.md) § Table-à-manger) |
| Validé row state | Background `--valide-tint` wash + emerald halo seats | Background `--valide-chip` + accent index + accent dot + accent ring + accent seats |
| Recipe row indices | None (Cormorant titles only) | Numbered indices `01-NN` in Geist Mono — keystone |

## Asset deltas

| Asset | Action |
|---|---|
| `/textures/paper-grain.svg` | **Delete** |
| Cormorant Garamond font | Drop `next/font/google` import (no remaining uses after migration) |
| IBM Plex Sans font | Drop `next/font/google` import |
| Caveat font | Drop `next/font/google` import |
| Geist sans font | **Add** via `next/font/google` |
| Geist Mono font | **Add** via `next/font/google` |
| `/logo.svg` | **Add** (already exported) |
| `/logo-inverse.svg` | **Add** (already exported) |
| `/logo-favicon.svg` | **Add** (already exported) |

## What stays from Sober Kitchen

These tokens / patterns / behaviors are **not** changing:

- **Terracotta DNA** — the brand colour family survives (refined `#A8523C` from
  production `#C8553D` per ADR-0004, but same hue family)
- **Table-à-manger concept** — the 2-seat voting scene preserves its 5
  computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis) per
  [ADR-0001](../../../../docs/adr/0001-recipe-conversation-thread.md)
  invariant #2
- **5-named member-colour slots** — preserved in `colors.ts` / `colors.py` for
  productize-later. Not surfaced in default 2-member household rendering.
- **Locked vocabularies** — `Season`, `Cuisine`, `Mood`, `Protein`, `Difficulty`,
  `TurnSender`, `TurnKind`, `AnswerField` all unchanged
- **Information architecture** — date → hero → list → CTA → nav across all
  screens. Bottom nav stays 4 tabs (Accueil / Recettes / Ajouter / Profil).
- **HttpOnly cookie auth** — unchanged
- **Card lifecycle motion** (sketch 001) — preserved verbatim; only the palette
  inside the motion shifts

## Productize-later concerns

These are flagged in [ADR-0004](../../../../docs/adr/0004-modern-sober-refresh.md)
under the risk register. Don't block migration on them:

- 3+ member household rendering (table-à-manger seat positioning)
- Recipe photography composition shift against new cool-leaning surface
- Dark icon variant toggle in Profil settings
- Aria-labels on icon-only nav (required, not deferrable — must ship with wave 2)
- Photography placeholders may need re-cropping if photos perform differently
  on the new surface

## Suggested commit messages for migration waves

```
feat(globals): wave-1 token swap — La Grille Soft per ADR-0004

Drops --font-marginalia, --patina, paper-grain SVG.
Adds Geist + Geist Mono via next/font/google.
Migrates --background, --foreground, --primary, --card,
--border, --valide-tint to refined Soft warmth tokens.
```

```
feat(components): wave-2 refits — Card, Button, BottomNav, Input

- Card: hairline border, drop LedgerCard
- Button: ink-filled CTA with accent-hover (replaces terracotta-fill)
- BottomNav: icon-only, pill-active terracotta-tint, aria-labels
- Input: search + composer pill, drop marginalia register

Per ADR-0004.
```

```
feat(home): wave-3 screen refits — HomeDecide, Bibliothèque, RecipeForm

Applies numbered indices keystone across all lists.
Accueil hero shrinks from 28px Cormorant italic → 24px Geist 500.
Validé row gets new 6-signal treatment (bg + index + dot + meta + plate + seats).

Per ADR-0004.
```

```
feat(brand): wave-4 logo integration

- Replaces BrandIcon (Cormorant draw) with AlDenteMark
- Adds AlDenteMark pulse animation on splash + loading states
- Updates apple-icon.tsx + icon.tsx to use logo.svg source
- PWA manifest icons regenerated

Per ADR-0004.
```

```
chore(cleanup): wave-5 — drop Cormorant/Caveat/paper-grain/patine

Final cleanup after migration. Drops:
- Cormorant Garamond + IBM Plex Sans + Caveat font imports
- /textures/paper-grain.svg asset
- .marginalia.* utility classes
- .ledger-card + --patina rules
- --font-marginalia, --shadow-card warm-brown tokens

Per ADR-0004.
```
