# Sketch Manifest — Al Dente

## Design Direction

Bring the **Tinder-style swipe deck** back as the primary shortlist surface,
replacing the Phase 36 SOBER-09 flat `VoteSummary` ledger. Sober Kitchen
aesthetic (terracotta sober + Cormorant + Caveat) carries throughout — these
sketches are about which **lifecycle animation** earns the daily decide moment,
not about visual brand language (which is already locked in
`docs/design-system.html`).

The seven lifecycle phases — deal-in → rest → drag → release → commit →
promote → validé/empty — are the unit of decision. We're picking a motion
personality, not a layout.

## Reference Points

- `frontend/components/ShortlistCard.tsx` — current (retired) swipe contract
- `frontend/lib/swipe-tokens.ts` — locked thresholds Phase 3 → Phase 23
- `frontend/components/HomeDecide.tsx:451-453` — the SOBER-09 retire decision
  we're reversing
- `docs/design-system.html#accueil` — locked header + marginalia stack
- `frontend/lib/motion.ts` — `easeCraft`, `transitions.springSnap`
- `frontend/app/globals.css:--color-valide-foreground: #10B981` — the locked
  emerald Validé token, currently under consideration in these sketches

## Open palette question

The production token for Validé is **emerald-500**, locked in Phase 5. Sketch
001 round 3 surfaced that the emerald reads "traffic light" against the warm
Sober Kitchen register. Three alternative palettes are now live as swappable
themes — see `.planning/sketches/themes/`. A non-default winner here is
ADR-worthy ("Validated state color shift away from emerald").

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | shortlist-card-lifecycle | What does the full card lifecycle feel like when we bring the Tinder swipe deck back? | **A + mono-terracotta** | shortlist, motion, swipe-deck, accueil, palette |
| 002 | refresh-direction-explorations | If we strip to modern-sober essentials, what carries the brand — color, space, or typography? | **★ La Grille · Soft warmth (B) · validated 2026-05-21** | refresh, design-system, modern-sober, la-grille, validated |

## Sketch 002 — Modern sober context

The current Sober Kitchen register reads "old, something for old people". It
tries to be sober but expresses sobriety through aged signals (Cormorant
Garamond, Caveat handwriting, paper-grain, patine, warm cream + warm-brown
shadows).

Two earlier iterations were discarded:
- **First**: Editorial / Soft / Bold (rejected as derivative — "looks like NYT /
  Notion / Cash App")
- **Second**: Carnet de marché / Brasserie de nuit / Tarot des dîners (concept-
  first, rejected as too loud — user pivoted to "modern and sober after all")

This iteration is **discipline-first**. Three modern-sober directions, each
answering the same question differently: *when stripped to essentials, what
carries the brand?*

- **1 · Le Quotidien** — *the color carries.* Mona Sans + bone-warm surface +
  refined terracotta (cooler/lower-chroma than current). Hospitality-restraint.
- **2 · La Grille** — *the space carries.* Geist + Geist Mono on pure white,
  single olive accent for state only, numbered indices, 8-pt grid visible.
  Contemporary studio.
- **3 · L'Édition** — *the typography carries.* Geist body + Newsreader italic
  for recipe names and hero, single ink-blue accent. Modern editorial.

All three: no texture, no shadows, no patine, no Cormorant, no Caveat.
Hairline rules only. Hero sizes 24–28px (not 38–44px like the loud directions).
Bottom-nav tab names stay literal (no metaphor-extension this round).

**Direction retained: La Grille (2)**. Refinement round in progress —
the original Grille spec was deliberately cool (pure white + olive). User
asked for terracotta accent and "un poil plus chaleureux"; three warmth
dosages now live side-by-side:

- **A · Minimal** — pure white kept, accent swapped olive → refined terracotta `#A8523C`
- **B · Soft** *(recommended)* — off-white `#FAFAF7` surface, warm-black ink, refined terracotta
- **C · Confident** — bone-cream `#FAF8F1` surface, umber ink, production terracotta `#C8553D`

`themes/grille-warm.css` carries the canonical refined tokens (currently
pre-populated with B's values).
