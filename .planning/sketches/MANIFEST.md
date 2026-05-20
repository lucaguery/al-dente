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
