# Logo & Brand Identity

The logomark IS the table-à-manger — same geometry as the in-app voting scene.
Reusing the central UX metaphor as the brand identity means the logo and the
app's core mechanic speak the same visual language.

## Logomark — primary SVG

ViewBox 64×64. Five elements:
- Outer plate ring: `currentColor` stroke 2px
- Inner well: `currentColor` stroke 1px opacity 0.22 (omit at ≤32px)
- North seat: `currentColor` fill, r=4 at (32, 5)
- South seat: `currentColor` fill, r=4 at (32, 59)
- Centre dot: `#A8523C` fill (hardcoded), r=3.5 at (32, 32)

Source: [frontend/public/logo.svg](../../../../frontend/public/logo.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" role="img" aria-label="Al Dente">
  <circle cx="32" cy="32" r="27" stroke="currentColor" stroke-width="2"/>
  <circle cx="32" cy="32" r="19" stroke="currentColor" stroke-width="1" opacity="0.22"/>
  <circle cx="32" cy="5" r="4" fill="currentColor"/>
  <circle cx="32" cy="59" r="4" fill="currentColor"/>
  <circle cx="32" cy="32" r="3.5" fill="#A8523C"/>
</svg>
```

`currentColor` for ink lets the logo theme via CSS — `color: var(--ink)` for
light backgrounds, `color: var(--bg)` for dark. The centre dot stays
hardcoded terracotta for brand consistency.

## Logo variants

### Default
Ink plate + ink seats + terracotta centre. Used on light surfaces.

### Validé state
Plate ink + **both seats terracotta** + terracotta centre. Used when the
foyer reaches consensus (both members aligned). Visible only on the in-app
table-à-manger; logo headers stay default.

### Inverse
Cream plate + cream seats + terracotta centre on dark background.
Source: [frontend/public/logo-inverse.svg](../../../../frontend/public/logo-inverse.svg)

### Tiny / favicon
At ≤32px sizes, simplify: drop the inner well, thicken the plate stroke,
enlarge the centre dot. Source: [frontend/public/logo-favicon.svg](../../../../frontend/public/logo-favicon.svg)

```svg
<svg viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="32" r="25" stroke="currentColor" stroke-width="6"/>
  <circle cx="32" cy="32" r="9" fill="#A8523C"/>
</svg>
```

The seats are sacrificed below 24px because they become illegible. The
recognisability at that scale comes from the *ring + centre dot* gestalt,
which echoes the wordmark's "Al Dente**.**" dot.

## Logo at scale

| Size | Elements shown | Notes |
|---|---|---|
| 128px+ | All 5 (ring, well, both seats, centre dot) | Hero, splash |
| 64px | Ring, both seats, centre dot (drop well) | Avatar, marketing |
| 32px | Ring (thicker), centre dot (larger) | UI inline |
| 16px | Ring (much thicker), centre dot (much larger) | Favicon |

Production note: ship 3 SVG files (`logo.svg`, `logo-inverse.svg`,
`logo-favicon.svg`) and let the consumer pick by size + context. iOS app icon
uses the `logo.svg` source rasterised at appropriate sizes.

## App icon — iOS Add to Home Screen

iOS applies a rounded-square mask (~22% radius) automatically. The SVG source
keeps square corners; iOS does the mask. Three brand-level variants:

### Cream (primary, default)
- Background: `#FAFAF7` (matches app bg)
- Logo: ink + terracotta centre dot
- Read: warm, "kitchen tool"
- Recommended default.

### Ink (alternative)
- Background: `#14110D`
- Logo: cream + terracotta centre dot
- Read: contrast-forward, "high-contrast home screen"

### Accent (campaign only)
- Background: `#A8523C`
- Logo: cream everything (including centre dot becomes cream)
- Read: saturated, "marketing / social share"

For production, ship **one** variant by default. Cream is the recommendation.
If user-customisable later, expose in Profil settings → "dark icon" toggle.

## Wordmark

The text wordmark is **Al Dente.** in Geist 600 with the terracotta period.

```css
/* Hero */
font: 600 44px 'Geist', sans-serif;
letter-spacing: -0.04em;
color: var(--ink);
/* with span on "." styled: */
color: var(--accent);
```

| Use | Size | Weight | Tracking |
|---|---|---|---|
| Hero (splash, marketing) | 44px | 600 | -0.04em |
| Masthead (top nav) | 14px | 600 | -0.015em |
| Tagline (italic accent style) | 17px | 500 | -0.02em |

The dot after "Dente" is a load-bearing brand element — it shares the same
`#A8523C` hex with the centre dot of the logomark. The two dots are the same
brand atom rendered in two registers (graphic / typographic).

## Tagline

```
On mange quoi ce soir ?
```

With italic-style accent on "ce soir":
```html
On mange quoi <em style="font-style: normal; color: var(--accent);">ce soir</em> ?
```

Note that "italic" here is achieved via colour, not actual italic — Geist
italic does exist but feels editorial. The accent-coloured emphasis carries
the warmth without the editorial register.

## Splash / loading screen

Centred vertically on the phone:
1. Logo, 128px, with pulse animation on centre dot
2. Wordmark "Al Dente." in Geist 600 34px below logo (~28px gap)
3. Tagline "On mange quoi ce soir ?" in muted Geist 400 13.5px below
4. Spacer (push everything up to ~60% of screen)
5. 3-dot bouncing loader at bottom (muted → accent on bounce peak)
6. Version mono "v0.2 · 2026" at very bottom

No bottom nav — first-launch state.

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

## Migration from Sober Kitchen brand

| Element | Old (Sober Kitchen) | New (La Grille) |
|---|---|---|
| Brand-mark loader | `.loader-brand` SVG draw-stroke 3.2s (`drawLoop` keyframes) | Pulse centre dot on logomark 1.8s |
| BrandIcon component | Cormorant Garamond "A" + draw-stroke | `<AlDenteMark>` reading `/logo.svg` with optional pulse |
| Apple touch icon | Generated from BrandIcon | Generated from `/logo.svg` source (cream variant) |
| Favicon | Generated from BrandIcon | `logo-favicon.svg` (simplified ≤32px) |
| PWA manifest icons | 192, 512 | 192, 512 + maskable variants — all from `/logo.svg` |

## Source

Sketch reference: [sources/002-refresh-direction-explorations/index.html](../sources/002-refresh-direction-explorations/index.html)
tab **Composants** § Logo & brand.

Exported SVG assets in `frontend/public/`:
- `logo.svg` — primary, currentColor for ink
- `logo-inverse.svg` — cream-on-dark
- `logo-favicon.svg` — simplified ≤32px
