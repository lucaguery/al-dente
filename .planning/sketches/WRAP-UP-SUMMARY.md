# Sketch Wrap-Up Summary

**Date:** 2026-05-21
**Sketches processed:** 2
**Design areas:** Tokens · Components · Logo & identity · Screens · Motion · Migration
**Skill output:** `./.claude/skills/sketch-findings-al-dente/`
**Authoritative ADR:** [docs/adr/0004-modern-sober-refresh.md](../../docs/adr/0004-modern-sober-refresh.md)

## Included Sketches

| # | Name | Winner | Design Area |
|---|------|--------|-------------|
| 001 | shortlist-card-lifecycle | A + mono-terracotta *(palette superseded by ADR-0004; motion lifecycle preserved)* | Motion (deck lifecycle) |
| 002 | refresh-direction-explorations | **★ La Grille · Soft warmth (B) — validated 2026-05-21** | Tokens / Components / Logo / Screens / Migration |

## Excluded Sketches

None — both sketches contribute durable findings. Sketch 001 partially
superseded (palette) but its motion lifecycle is canonical.

## Design Direction

**La Grille · Soft warmth** — the *space and system* carry the brand. Geist
sans + Geist Mono on a soft-warm off-white surface (`#FAFAF7`), with refined
terracotta (`#A8523C`) reserved exclusively for state (validé / active /
advisory). The table-à-manger geometry doubles as the logomark (plate + 2
seats + accent dot — same shape as the in-app voting scene).

Replaces the previous "Sober Kitchen / Slow Food artisanal" register
(Cormorant Garamond + Caveat + paper-grain + patine + warm-brown shadows)
which partner-tested as reading "old, something for old people".

## Key Decisions

### Palette
- Surface: `#FAFAF7` (off-white tiède, a 1.5% lift over pure white)
- Ink: `#14110D` (warm-black, not pure)
- Muted: `#6F6B62` · Faint: `#A09A8C`
- Accent: `#A8523C` (refined terracotta — cooler + lower chroma than `#C8553D`)
- Border: `#EDEBE4` · Border strong: `#D8D4C7`
- Validé chip: `#F5E5DD` bg + `#82371F` fg
- **No shadows** (except deck card) — hairlines carry the system
- **No texture** — paper-grain SVG dropped entirely

### Typography
- Geist + Geist Mono (2 families, replaces Cormorant + Caveat + IBM Plex Sans)
- Hero 24px Geist 500 -0.03em (smaller than the previous 38px Cormorant italic)
- Mono for indices, dates, metadata, IDs — the "data stack"
- No italic register, no handwriting register

### Composition keystone
**Numbered indices** (`01 02 03 04` in Geist Mono) prefix every list row
across every screen. This is the signature move of La Grille.

### Logo & brand
The logomark IS the in-app voting scene rendered at brand scale:
- Plate edge + inner well (≥32px) + 2 seats at N/S + centre dot
- Centre dot hardcoded `#A8523C` (same brand atom as the wordmark's "." dot)
- 3 SVG variants exported: primary, inverse, simplified favicon
- 3 iOS app icon treatments: cream (default), ink, accent

### Bottom navigation
Icon-only, no text labels. 36px tap pill, 20px Lucide icons:
- `house` / `library-big` / `plus` / `users-round`
- Active tab: `--valide-chip` background + accent icon
- ARIA labels required in production

### Motion
- Single ease: `cubic-bezier(0.22, 1, 0.36, 1)`
- Three durations: 160 / 240 / 380ms
- Logo centre dot pulse on splash + loading (1.8s)
- Deck lifecycle (sketch 001) preserved verbatim — only the palette inside the motion shifts

## Layout patterns

- Shared chrome: `top bar → hero → list/content → CTA → bottom nav`
- 10 canonical screens cover the full daily loop:
  - **Flow principal** (4): Accueil / Recettes (list) / Ajouter / Profil
  - **Détails** (3): Recette structurée / Recette thread / Shortlist deck
  - **Variantes** (3): Splash · Cooking · Onboarding · Recettes grille
- Validé row treatment: 6 reinforcing signals (bg + index + dot + meta + plate
  ring + seats colour)

## What stays from Sober Kitchen

- Terracotta DNA (refined, not replaced)
- Table-à-manger 5-state concept
- 5-named member-color slots (kept as token, not surfaced)
- All locked vocabularies (Cuisine, Mood, Season, …)
- Information architecture across all screens
- Card lifecycle motion (deck Tinder)

## What dies

- Cormorant Garamond + Caveat + IBM Plex Sans
- Paper-grain texture overlay
- Patine ledger card (`.ledger-card`, `--patina`)
- Marginalia register (`.marginalia*`)
- Warm-brown two-layer shadows
- The `--ease-craft` potter's curve

## Implementation gate

Migration plan codified in [ADR-0004](../../docs/adr/0004-modern-sober-refresh.md)
across 5 waves (token swap → components → screens → logo → cleanup). The
skill `sketch-findings-al-dente` is the working reference during execution.

Next user step: run `/gsd-plan-phase` to create the executable plan when ready.
