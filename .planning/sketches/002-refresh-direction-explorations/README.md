---
sketch: 002
name: refresh-direction-explorations
question: "If we strip Al Dente to modern-sober essentials, what carries the brand?"
winner: "La Grille (direction 2)"
refinement_question: "How warm should La Grille be — minimal, soft, or confident dose of terracotta?"
refinement_winner: "B · Soft warmth"
status: validated
validated_at: 2026-05-21
validation_note: "Partner test passed — 'modern sober' reading achieved without losing Al Dente's warm DNA."
adr: docs/adr/0004-modern-sober-refresh.md
tags: [refresh, design-system, modern-sober, la-grille, warmth-dosage, validated]
references:
  - docs/design-system.html (current Sober Kitchen — to be replaced by Phase implementing this ADR)
  - frontend/app/globals.css
  - themes/grille-warm.css (canonical reference for chosen warmth dose)
  - frontend/public/logo.svg (exported from sketch — the table-à-manger logomark)
---

# Sketch 002 — La Grille · réchauffer le ton

## Status

**Direction retained: La Grille (2)** — the *space carries* discipline.
Geist + Geist Mono on a quiet surface, numbered indices, hairline borders,
8-pt grid feel. The architecture is the personality.

**Refinement round in progress**: La Grille's original spec was deliberately
cool (pure white + olive accent for state). User pivoted to terracotta accent
and "un poil plus chaleureux". Three warmth dosages now live side-by-side for
final comparison.

## How to View

```
open .planning/sketches/002-refresh-direction-explorations/index.html
```

Three phones side-by-side. Same Accueil content, same Grille architecture,
only **surface temperature**, **ink tone**, and **terracotta intensity** vary.
Comparison swatch table is below the phones for direct token comparison.

## The three warmth dosages

| | Variant | Surface | Ink | Accent | Verdict |
|---|---|---|---|---|---|
| **A** | Minimal | `#FFFFFF` pure | `#0A0A0A` true black | `#A8523C` refined terracotta | Restrained, closest to original Grille spec — only the accent changes. |
| **B** | **Soft** *(recommended)* | `#FAFAF7` barely-warm | `#14110D` warm-black | `#A8523C` refined terracotta | Sweet spot. The warmth is felt, not seen. Sober Kitchen modernized. |
| **C** | Confident | `#FAF8F1` bone-cream | `#1B1916` umber-black | `#C8553D` production terracotta | Most chaleureux. Uses the *current* terracotta directly. Risk: edges toward "cookbook" reading. |

### Why B is starred as recommended

The user asked "un poil plus chaleureux" — *a tiny bit warmer*. "Un poil" is
the operative phrase: not noticeably warm, just *less cold*.

- A leaves the surface pure white, which keeps reading "studio site" rather
  than "kitchen tool". Probably too cold for the warm intent.
- B shifts the surface to `#FAFAF7` (a 0.5% warmth lift over A) and warms the
  ink to `#14110D` (a 4-point lift). These are micro-shifts that are felt
  rather than read — exactly the "un poil" the user requested.
- C goes to a clear cream `#FAF8F1` and uses the production terracotta
  `#C8553D`. It works, but it borrows enough from the *current* Sober Kitchen
  that it risks re-introducing the "old" reading we're trying to escape.

The refined terracotta `#A8523C` shared by A and B is the same hue family as
the current production color, but cooler and lower-chroma. It reads as
*modern hospitality* (Aesop, Cult Gaia) rather than 1970s ceramic tile —
which is the single most load-bearing color decision in the refresh.

## What stays from La Grille (shared by all three)

- **Geist sans body** + **Geist Mono** for indices, dates, meta
- **Numbered indices** (`01`, `02`, `03`, `04`) as the Grille keystone move —
  applied across Accueil rows, Recettes list, Ajouter options, Profil settings
- **Hairline borders only**, no shadows
- **Crumb chips** at the top of the stack (`1 validé`, `3 à voter`) using
  Geist Mono
- **Validé indicator** stays subtle: index becomes accent color, recipe name
  gets a tiny accent dot after it, meta text shifts to accent. No full-bleed
  background tint.
- **CTA stays dark ink** (not accent). The accent is reserved for *state*,
  not action. Hover transitions ink → accent.
- **Hero is small** (23px Geist 500). Modern-sober uses less type pressure.
- **Bottom nav**: Accueil / Recettes / Ajouter / Profil (literal, no
  metaphor renaming)

## What gets dropped from Sober Kitchen

When La Grille (any warmth dose) is committed to `frontend/app/globals.css`:

- ❌ Cormorant Garamond (display) → replaced by Geist
- ❌ Caveat (marginalia) → dropped entirely; no handwriting register
- ❌ Paper-grain SVG overlay → dropped
- ❌ Patine ledger card (`.ledger-card` with dog-ear, dot grid, stamp) →
  flat cards or no-cards
- ❌ Warm-brown shadow tokens (`rgba(74,56,40,*)`) → no shadows
- ❌ Mono-terracotta "Validé differentiates by saturation" rule → Validé now
  signals via accent dot + colored index, not by mono-color difference
- ✅ Terracotta DNA preserved (refined to `#A8523C` in A/B, kept as
  `#C8553D` in C)
- ✅ Table-à-manger 2-seat voting concept preserved (redrawn quieter — small
  dots, accent ring when validé)
- ✅ Member-color identity preserved (now: ink for L, mid-gray for M; accent
  takes over when validé)

## Open questions before locking

1. **Pick the warmth dose** — A, B, or C. Or specify a 4th point on the
   spectrum if none of these is quite right (e.g. "B's surface but C's
   terracotta", or "B but slightly warmer indices").
2. **Member-color rendering** — current production has 5 named slots
   (rose/amber/emerald/sky/violet). La Grille's quiet 2-seat scene replaces
   this with ink/muted for the household-of-2 case. Productize-later might
   need a way to express 3+ members; defer until then.
3. **Recipe photography** — none of the dosages show photos yet. La Grille's
   quiet surface composes well with food photography (clean white background
   tradition) — defer to photography spike.

## Next steps

1. **Pick A / B / C** — set `refinement_winner` in this README frontmatter
   to "A", "B", or "C".
2. **Compile chosen tokens into `themes/grille-warm.css`** (currently
   pre-populated with B's tokens). If A or C wins, swap the values.
3. **Write ADR**: `docs/adr/0004-modern-sober-refresh.md`
   - Direction: La Grille (space carries)
   - Warmth dose: [chosen]
   - What stays from Sober Kitchen: terracotta DNA, table-à-manger
   - What gets dropped: Cormorant, Caveat, paper-grain, patine, warm-brown
     shadows, marginalia
4. **Migration phase**: `frontend/app/globals.css` is the canonical surface.
   Wave 1 = token swap; Wave 2 = component refits (Card, Button, BottomNav,
   HomeDecide, RecipeForm). Estimated ~1 day of focused work given how
   token-driven the current globals.css is.
