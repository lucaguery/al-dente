---
name: sketch-findings-al-dente
description: Validated design decisions, CSS patterns, and visual direction from sketch experiments. Auto-loaded during UI implementation on al-dente. Loaded when starting work on `frontend/app/globals.css`, components, or any UI surface during the modern-sober refresh migration.
---

<context>
## Project: al-dente

A shared recipe + decision app for couples, built as an installable PWA. Audience
is "just us" (Luca + partner). The daily question is *on mange quoi ce soir ?* —
a household-of-2 dinner decision tool.

**Design direction (validated 2026-05-21 by partner test):**
La Grille · Soft warmth — the *space and system* carry the brand. Geist sans +
Geist Mono on a soft-warm off-white surface (#FAFAF7), with refined terracotta
(#A8523C) reserved exclusively for state (validé / active / advisory). The
table-à-manger geometry doubles as the logomark (plate + 2 seats + accent dot).

This direction replaces the previous "Sober Kitchen / Slow Food artisanal"
register (Cormorant Garamond + Caveat + paper-grain + patine + warm-brown
shadows) which partner-tested as reading "old, something for old people".

**Authoritative source of truth:** [ADR-0004](../../../../docs/adr/0004-modern-sober-refresh.md)

Sketch sessions wrapped: 2026-05-21
</context>

<design_direction>
## Overall Direction

### The discipline question
*"What carries the brand if we strip Al Dente to essentials?"* — Three answers
were tested (color / space / typography). **Space won.** The grid system,
numbered indices, hairline borders, and Geist Mono data-stack carry the brand;
color and typography step back into supporting roles.

### Surface
- Background: `#FAFAF7` — off-white with imperceptible warmth (a 1.5% lift over
  pure white)
- Card / surface: `#FFFFFF` — pure white, no texture
- Border: `#EDEBE4` hairline (1px), `#D8D4C7` for stronger separators
- **No shadows** — cards exist by border + radius, not depth (one exception: the
  Tinder deck card keeps a soft ambient shadow because the card-stack metaphor
  requires depth perception)
- **No texture** — paper-grain SVG dropped entirely

### Ink
- Primary text: `#14110D` — warm-black (not pure #000)
- Muted: `#6F6B62` — warm-leaning gray
- Faint: `#A09A8C` — for placeholder text, footers

### Accent — terracotta affiné
- `#A8523C` — refined terracotta (cooler + lower chroma than current production
  `#C8553D`). Reads "modern hospitality" (Aesop, Cult Gaia) rather than 1970s
  ceramic tile.
- Used **only for state**, never as button background or decoration:
  - Validé (consensus reached)
  - Vous-êtes-ici (active tab in nav, "vous" pill in profile)
  - Advisory (system warning bar)
  - Hover transition on CTA (ink → accent)

### Typography
- **Geist** — display + body (1 family, multiple weights). Replaces Cormorant
  Garamond + IBM Plex Sans.
- **Geist Mono** — indices, dates, metadata, IDs. The "data stack" that signals
  structured information rather than prose.
- **Caveat dropped.** No handwriting register anywhere.
- Hero size: **24px** Geist 500 (-0.03em). Modern sober uses *less* type
  pressure than the previous 38-44px Cormorant hero.

### Composition keystone
**Numbered indices everywhere** — `01 02 03 04` in Geist Mono prefixes every
list row (shortlist, library, settings, ingredients, steps, capture options).
This is the signature move of La Grille — without it, the system dilutes into
generic "modern sans on white".

### Bottom navigation
Icon-only (no text labels), 36px height tap pill, 20px Lucide icons. Active tab
gets `#F5E5DD` background (the valide-chip token) + accent icon color. Icons:
`house` / `library-big` / `plus` / `users-round`. ARIA labels required in
production (without visible labels, screen readers read "image").

### Logo
The logomark IS the table-à-manger — same geometry as the in-app voting scene.
Plate edge (1.5–2px stroke), inner well (optional, ≥32px sizes), 2 seats at
north/south, centre accent dot (`#A8523C`). The terracotta period after
"Dente." in the wordmark is the same brand atom in typographic register.

### Motion
- Single ease: `cubic-bezier(0.22, 1, 0.36, 1)` — deliberate ease-out, no spring
  overshoot (replaces the previous "ease-craft" potter's curve)
- 3 durations: 160ms (button feedback) / 240ms (card transitions) / 380ms (sheet)
- Card lifecycle (deck Tinder) preserved from sketch 001: deal-in → rest →
  drag → release-without-commit → commit → fly-off → promote → empty
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Tokens | [references/tokens.md](references/tokens.md) | Surface `#FAFAF7`, ink `#14110D`, accent `#A8523C`, Geist + Geist Mono, no shadow/texture |
| Components | [references/components.md](references/components.md) | Buttons ink-bg / accent-hover, hairline cards, pill chips, icon-only nav, 5-state table-à-manger |
| Logo & identity | [references/logo-and-identity.md](references/logo-and-identity.md) | Logomark = in-app voting scene geometry; 3 app icon variants (cream / ink / accent) |
| Screens | [references/screens.md](references/screens.md) | 10 canonical screens — flow / details / variantes — all share same chrome (top → hero → list → CTA → nav) |
| Motion | [references/motion.md](references/motion.md) | Card lifecycle (sketch 001) + general motion grammar (sketch 002); pulse on logo centre dot for loading |
| Migration | [references/migration.md](references/migration.md) | 17-row delta table: Sober Kitchen → La Grille Soft (what stays, what dies) |

## Theme

The winning theme tokens are at [sources/themes/grille-warm.css](sources/themes/grille-warm.css)
— ready to port to `frontend/app/globals.css` wave 1.

Companion theme [sources/themes/mono-terracotta.css](sources/themes/mono-terracotta.css)
preserves the sketch 001 Validé palette decision (superseded by ADR-0004's
broader refresh, but kept as a useful colour-only reference).

## Source Files

Original sketch HTMLs preserved in [sources/](sources/) for complete reference:
- [sources/001-shortlist-card-lifecycle/index.html](sources/001-shortlist-card-lifecycle/index.html)
  — the Tinder swipe deck lifecycle exploration
- [sources/002-refresh-direction-explorations/index.html](sources/002-refresh-direction-explorations/index.html)
  — the canonical La Grille Soft sketch with 10 screens + 16 components sections

## Authoritative Decisions

| Document | Scope |
|---|---|
| [ADR-0004](../../../docs/adr/0004-modern-sober-refresh.md) | Visual refresh — direction, tokens, type, logo |
| [ADR-0003](../../../docs/adr/0003-validated-color-mono-terracotta.md) | Validé colour shift to mono-terracotta (refined further in ADR-0004) |

</findings_index>

<metadata>
## Processed Sketches

- 001-shortlist-card-lifecycle (winner: A + mono-terracotta — *palette superseded by ADR-0004; motion lifecycle preserved*)
- 002-refresh-direction-explorations (winner: La Grille · Soft warmth, **validated 2026-05-21**)
</metadata>
