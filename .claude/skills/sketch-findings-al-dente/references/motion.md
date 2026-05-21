# Motion & Interaction

Two sources of motion knowledge:
1. **Sketch 001** — the Tinder swipe deck lifecycle (7 phases, deck-card specific)
2. **Sketch 002** — the general motion grammar of La Grille (single ease, three durations)

## General motion tokens (sketch 002)

```css
--ease:           cubic-bezier(0.22, 1, 0.36, 1);  /* deliberate ease-out */
--duration-fast:  160ms;
--duration-base:  240ms;
--duration-slow:  380ms;
```

One curve, three durations. The previous "ease-craft" (0.32, 0.72, 0, 1)
"potter's curve" is dropped — it contributed to the artisanal register that
we're moving away from.

### Usage map
| Interaction | Duration | Notes |
|---|---|---|
| Button colour transition (hover) | `--duration-fast` | ink → accent |
| Chip / tab toggle | `--duration-fast` | bg + colour |
| Card hover lift (translateY -1px) | `--duration-base` | |
| Sheet / dialog open | `--duration-slow` | scale + opacity |
| Row hover (background change) | 220ms | between fast and base |
| Bump feedback (scale 0.985) | 200ms | sketch helper for tap feedback |

## Bump feedback pattern

Used in the sketch for any tap target without other feedback:
```js
function bump(el) {
  el.style.transition = 'transform 200ms ease';
  el.style.transform = 'scale(0.985)';
  setTimeout(() => el.style.transform = '', 140);
}
```

In production, replace with CSS active state:
```css
.tappable:active { transform: scale(0.985); transition: transform 200ms; }
```

## Logo pulse (splash + loading states)

The centre dot of the logomark pulses on splash / loading:
```css
.al-dente-logo .center-dot {
  fill: #A8523C;
  transform-origin: 32px 32px;
  animation: ad-pulse 1.8s ease-in-out infinite;
}
@keyframes ad-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.55; transform: scale(0.82); }
}
```

Static variant (no pulse) via `.al-dente-logo.static`. Use static for marketing
materials, app icon source, and inline UI; use pulse for splash + active loading.

## Splash loader (3-dot bounce)

Three muted dots that briefly turn terracotta at the bounce peak:
```css
.splash-loader .ld {
  width: 6px; height: 6px;
  background: var(--muted);
  border-radius: 50%;
  animation: loader-bounce 1.4s infinite ease-in-out both;
}
.splash-loader .ld:nth-child(1) { animation-delay: -0.32s; }
.splash-loader .ld:nth-child(2) { animation-delay: -0.16s; }
@keyframes loader-bounce {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.7); }
  40%           { opacity: 1; transform: scale(1); background: var(--accent); }
}
```

## Card lifecycle (sketch 001 — preserved for Tinder deck)

The seven lifecycle phases of the deck card. **The motion design is preserved
verbatim from sketch 001's variant A**; only the palette (Validé hue) is
superseded by ADR-0004.

### Phase 1 — Deal-in
Cards arrive on first paint (or after régénérer). Stagger from behind, scale
up to resting position. Duration ~520ms total, ~80ms stagger per card.
Source: `--duration-dealin: 520ms` in original `swipe-tokens.ts`.

### Phase 2 — Resting pile
- Active card: scale 1, translateY 0, full opacity
- Card N-1: scale 0.96, translateY 9px, opacity 0.70, z-index 2
- Card N-2: scale 0.92, translateY 18px, opacity 0.35, z-index 1

```css
.deck-card.c1 { transform: translateY(0) scale(1); z-index: 3; }
.deck-card.c2 { transform: translateY(9px) scale(0.96); opacity: 0.70; z-index: 2; }
.deck-card.c3 { transform: translateY(18px) scale(0.92); opacity: 0.35; z-index: 1; }
```

### Phase 3 — Drag
- Rotation: ±15° at threshold (linear ramp during drag)
- Threshold ring overlay: opacity ramps from 0 → 1 between 80px and 140px swipe distance
- Green ring (left swipe = pass) or terracotta ring (right swipe = vote)

Locked thresholds (don't change without ADR):
```
--swipe-threshold:   140px;   /* commit point */
--swipe-overlay-input: 80px;  /* overlay opacity ramp starts */
--swipe-rotate-deg:   15;     /* max rotation degrees */
```

### Phase 4 — Release without commit
Card hasn't been dragged past 140px threshold. Snap back to resting position
+ small shake + marginalia hint ("encore un peu — glissez plus loin").

The marginalia hint **needs to be redesigned** for La Grille — the previous
Caveat slant hint is dropped. Replace with Geist Mono uppercase nudge:
"GLISSEZ PLUS LOIN" or a small directional chevron + mono label.

### Phase 5 — Commit
- Ring-flash on card (final flash of the threshold ring at full opacity, ~100ms)
- Thumb-button pulse (the corresponding action button pulses)
- Fly-off animation: 280ms, exit direction matches swipe direction, rotation
  continues, opacity → 0
- Inline toast: "Validé !" or "Passé" at bottom

```
--duration-flyoff: 280ms;
```

### Phase 6 — Promote
After fly-off, the next card transitions from c2 → c1 (active). The card
behind (c3 → c2) and a new c3 fades in from below.

### Phase 7 — Validé / empty
When all cards have been voted on:
- Final card commit → "Tout vu" summary
- The validé recipe(s) bubble up with accent treatment
- The Accueil ledger shows the canonical validé row (see [screens.md](screens.md))

## Why preserve the deck lifecycle motion

The deck lifecycle was deliberately designed in sketch 001 to feel **tactile
and craft-like** for the daily decide moment. Even though the surrounding
visual register changes from Sober Kitchen → La Grille:
- The 7-phase narrative still makes the daily decision feel like a small
  ritual (not a chore)
- The threshold ramping (80→140px) is locked behavior, validated in
  prior phases
- The fly-off motion (280ms with rotation) is iconic — a different curve
  would feel like a different app

What changes is **the palette inside the motion**:
- Ring overlay colour: previously emerald, now `var(--accent)` (terracotta)
  per ADR-0003
- Threshold ring + heart button: same shift
- Marginalia hint between deck and bottom: replace Caveat hint with Geist
  Mono micro-label

## What to avoid

- ❌ Spring-overshoot curves (`cubic-bezier(0.34, 1.56, 0.64, 1)` and similar)
  — too playful for the modern-sober register
- ❌ Long durations (≥500ms) for normal interactions — only the deck deal-in
  (520ms) and sheets (380ms) get to be slow
- ❌ Multiple eases in the same component — single `--ease` across the system
- ❌ Caveat-style marginalia hints during deck interactions — replace with
  Geist Mono uppercase nudges
- ❌ Bouncy / playful animations on CTAs or nav — these are deliberate
  interactions, not rewarding
- ❌ Forgetting `@media (prefers-reduced-motion: reduce)` — the global rule
  must set `animation-duration: 0ms !important` and `transition-duration: 0ms !important`

## Source

- Sketch 001 deck lifecycle: [sources/001-shortlist-card-lifecycle/index.html](../sources/001-shortlist-card-lifecycle/index.html)
- Sketch 002 motion grammar: [sources/002-refresh-direction-explorations/index.html](../sources/002-refresh-direction-explorations/index.html)
  tab Composants § Mouvement
