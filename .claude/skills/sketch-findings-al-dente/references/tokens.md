# Tokens · La Grille Soft warmth

The design system foundations. Port these into `frontend/app/globals.css` in
migration wave 1 per [ADR-0004](../../../../docs/adr/0004-modern-sober-refresh.md).

## Color

### Surface
```css
--bg:             #FAFAF7;  /* off-white tiède — page background */
--surface:        #FFFFFF;  /* pure white — cards, popovers */
--hover:          #FFFFFF;  /* same as surface — hover lift */
--chip:           #F1EFE8;  /* muted chip background */
--valide-chip:    #F5E5DD;  /* validé pill bg + nav active pill bg */
```

### Ink
```css
--ink:    #14110D;  /* primary text — warm-black */
--muted:  #6F6B62;  /* secondary text — warm-leaning gray */
--faint:  #A09A8C;  /* placeholders, footers */
```

### Accent — terracotta affiné
```css
--accent:          #A8523C;  /* refined terracotta (cooler + lower chroma) */
--accent-deep:     #8E4330;  /* hover, deeper variant */
--valide-chip-fg:  #82371F;  /* readable accent on validé-chip bg */
```

**Important**: the accent is used **only for state**, never as button background
or decoration. Validé, active-nav, advisory, hover transitions — that's it.

### Border
```css
--border:         #EDEBE4;  /* hairline 1px — most separators */
--border-strong:  #D8D4C7;  /* stronger 1.5px — emphasis */
```

### Why these exact values
- The 0.5–1.5% lift from pure white to `#FAFAF7` is felt, not seen. Pure white
  reads "studio site"; cream reads "cookbook". `#FAFAF7` sits between them.
- `#14110D` is a warm-leaning near-black (chroma ~0.005). Pure `#000000` reads
  cold and editorial; `#14110D` reads warm and intentional.
- The refined accent `#A8523C` shifted from production `#C8553D` by lowering
  chroma ~10% and cooling the hue. The result reads modern hospitality (Aesop,
  Cult Gaia, Toteme) instead of 1970s ceramic-tile.

## Typography

### Stack
```css
--font-display:  'Geist', system-ui, sans-serif;
--font-sans:     'Geist', system-ui, sans-serif;
--font-mono:     'Geist Mono', ui-monospace, monospace;
```

Load via `next/font/google` in `frontend/app/layout.tsx`. Two families total —
**Cormorant Garamond, IBM Plex Sans, and Caveat are dropped**.

### Scale
| Class | Family | Size | Line | Tracking | Weight |
|---|---|---|---|---|---|
| `.hero` | Geist | 24px | 1.18 | -0.03em | 500 |
| `.title` | Geist | 18px | 1.22 | -0.02em | 500 |
| `.name` | Geist | 14.5px | 1.25 | -0.02em | 500 |
| `.body` | Geist | 13px | 1.55 | -0.005em | 400 |
| `.meta` (mono) | Geist Mono | 11px | 1.45 | 0 | 400 |
| `.micro` (mono) | Geist Mono | 10.5px | 1.4 | 0 | 400 |

**Discipline**: Geist sans for everything that reads as prose; Geist Mono for
everything that reads as data (indices, timestamps, IDs, dimensions, metadata).

### Hero is smaller than before
The previous Cormorant hero was `clamp(2rem, 6vw, 2.75rem)` ≈ 32-44px italic.
New hero is **24px upright Geist 500**. Modern-sober uses *less* type pressure,
not more. This is load-bearing — bigger heroes re-introduce the "publication"
register.

## Spacing

4-pt grid. Common values:
```
4, 8, 12, 14, 16, 18, 20, 22, 24, 28, 32, 48
```

Card internal padding: 14–18px. Inter-row gap: 4–10px. Section padding: 24px
horizontal. No hard-coded spacing tokens needed — Tailwind utilities `p-3`,
`p-4`, `gap-2`, etc. handle this.

## Shape (radii)

```css
--radius-sm:    4px;   /* badges, tiny tags */
--radius-md:    8px;   /* buttons, CTAs, inputs */
--radius-lg:    10px;  /* cards, settings rows */
--radius-xl:    18px;  /* deck cards (Tinder) */
--radius-pill:  9999px; /* state pills, avatars, nav pills */
```

## Shadows

**None in the system**, with one exception:

```css
/* Deck card only — the Tinder card stack metaphor needs depth */
--shadow-deck: 0 2px 8px rgba(20,17,13,0.06), 0 12px 28px rgba(20,17,13,0.08);
```

Everywhere else: cards exist by `1px solid var(--border)` + radius. Drop the
old `--shadow-card` warm-brown two-layer tokens entirely.

## Motion

```css
--ease:           cubic-bezier(0.22, 1, 0.36, 1);  /* deliberate ease-out */
--duration-fast:  160ms;   /* button feedback, chip toggle */
--duration-base:  240ms;   /* card hover, sheet open */
--duration-slow:  380ms;   /* deal-in, modal */
```

No spring overshoot. The previous `ease-craft` (0.32, 0.72, 0, 1) had a
"potter's curve" feel that contributed to the artisanal register. Drop it.

**Reduced motion**: keep the existing global `@media (prefers-reduced-motion)`
rule that sets all `animation-duration` + `transition-duration` to 0ms.

## Member colors

Production currently keeps 5 named slots (rose / amber / emerald / sky / violet)
in `frontend/lib/colors.ts` + `backend/app/colors.py`. The new design shows
**only 2 active slots** in the household-of-2 case:
- Member 1 (you): `var(--ink)` → `var(--accent)` when validé
- Member 2 (partner): `var(--muted)` → `var(--accent)` when validé

The 5-slot model stays in tokens for productize-later (3+ member households).
Don't delete the colour tokens; just don't surface them in default rendering.

## Source

Theme reference: [sources/themes/grille-warm.css](../sources/themes/grille-warm.css)
