---
sketch: 001
name: shortlist-card-lifecycle
question: "What does the full card lifecycle feel like when we bring the Tinder swipe deck back?"
winner: "A + mono-terracotta"
winner_notes: |
  Motion: Variant A (classic Tinder, refined — current code is ~95% there).
  Palette: mono-terracotta — no separate validated hue; saturation differentiates.
  This is an ADR-worthy shift off the locked emerald Validé token (#10B981).
tags: [shortlist, motion, swipe-deck, accueil, palette]
---

# Sketch 001 — Shortlist Card Lifecycle

## Context

Phase 36 SOBER-09 retired the Tinder-style swipe deck in favour of a flat
`VoteSummary` ledger (see `frontend/components/HomeDecide.tsx:451-453`). Luca
prefers the swipe deck after all and wants to feel the **full lifecycle
animation** before re-committing to it.

The current code already has most of the contract (`frontend/components/ShortlistCard.tsx` —
drag + rotation + ring overlays + fly-off + spring entry; `frontend/lib/swipe-tokens.ts` —
threshold 140px, overlay ramp 80px, fly-off 280ms, rotate ±15°). These sketches
explore **how theatrical** the lifecycle should feel, not whether to swipe.

## Design Question

What sequence of motion best carries a user from "five proposals just arrived"
through "I've voted on all of them" — and which of the seven lifecycle phases
should be loud vs. quiet?

## Lifecycle phases (all three variants implement them)

1. **Deal-in** — cards arrive on first paint / after régénérer
2. **Resting pile** — front card crisp, peeks softer (N-depth varies)
3. **Drag** — rotation + threshold ring opacity ramp
4. **Release without commit** — snap back + **shake + marginalia hint**
   ("encore un peu — glissez plus loin")
5. **Commit** — **ring-flash on card + thumb-button pulse + fly-off + inline toast**
   ("✓ Validé · Risotto aux champignons")
6. **Promotion** — peek springs into front slot
7. **Validé celebration / empty state** — both-yes feedback + post-decision

## Feedback layer (round 2 addition — shared by A/B/C)

A swipe deck without "I heard you" feedback reads as throwing cards into the
void. Round 2 added five signals:

- **Progress strip** above the deck — five dots, current = pill, voted-yes =
  emerald, voted-no = muted. You always know where you are.
- **Marginalia counter** beneath the strip — *"3 restantes · 2 oui jusqu'ici"*
  in handwritten Caveat. Updates after each commit.
- **Inline toast** — slides up from beneath the card after commit, lives ~1.4s.
  Names the recipe + the verdict so the action is unambiguous even after the
  card flies off.
- **Snap-back shake + hint** — when drag is released early, the card shakes
  ±6px and a faint marginalia "encore un peu" appears below for ~1.4s. Without
  this the user can't tell if their drag *almost worked* or *did nothing*.
- **Thumb-button echo + ring flash** — tapping the thumb pulses the button
  AND flashes the threshold ring on the card before fly-off. Makes the
  tap pathway feel as decisive as the swipe pathway (D-03 first-class parity).
- **Partner ripple** — when the partner votes on the current card, the
  partner chip pulses with an emerald wash and a tiny ♥ pops next to the name.

## How to View

```
open .planning/sketches/001-shortlist-card-lifecycle/index.html
```

Each variant has a **Lifecycle cycler** at the bottom — buttons fire deal-in,
drag (hold), release-early (with shake+hint), commit, partner-voted ripple,
validé celebration, and empty state so you can feel every feedback moment.

Suggested walk:

1. Hit **↻ Replay deal-in** — watch cards arrive.
2. Hit **⮕ Drag right (hold)** — see the ring fill.
3. Hit **↩ Release early** — card shakes, "encore un peu" hint flickers below.
4. Hit **✓ Commit yes** — ring flashes, thumb pulses, toast slides up, card
   flies off, progress strip ticks forward, counter updates.
5. Hit **⟳ Partner voted** — chip on the new front card pulses emerald.
6. Hit **★ Validé celebration** — both-yes overlay.
7. Repeat commit 3-4× more, then **∅ Empty state** — post-decision view.

## Variants

- **A — Classic Tinder (refined)** — Honors the current code contract.
  1-deep peek (front + one behind). Symmetric ±9° drag rotation, fly-off at
  +15°/-15°. Deal-in: front + peek drop together in 520ms. Lowest-risk,
  fastest path to ship — re-enable the Phase 3 deck with Phase 23's spring-snap
  retune. Path of least resistance.

- **B — Theatrical pile (3-deep peek)** — Amplifies the "physical pile of cards"
  metaphor. 3 peek cards behind the front, each rotated slightly
  (-1° / +1.2° / -0.6°) for a hand-stacked feel. Deal-in is **staggered** —
  bottom card thuds first, working up to the front card with an over-shoot bounce
  (70% → 102% → 100% scale). Commit fly-off includes a slight upward kick
  (translateY -20px) so the throw feels weighted. Best read of "five proposals"
  as a tangible thing.

- **C — Coverflow slide (lateral, no rotation)** — Lateral motion model.
  Peeks fan to the right with rotateY (3D depth), front card lives at z=0.
  Drag is pure x-translation — **no rotation** on the card during drag, no
  spin on commit. Reads like flipping through a card menu rather than throwing
  cards away. Useful as a **foil**: if A or B don't feel right, this verifies
  whether the rotation/throw model is the actual point.

## What to Look For

| Comparison | A | B | C |
|------------|----|----|----|
| Deal-in feel | brisk, businesslike | theatrical, paper-thud | linear scrub |
| Peek depth | 1 | 3 | 2 (3D) |
| Drag rotation | ±9° | ±11° | 0° |
| Commit motion | rotate+fly | rotate+fly+kick | slide-only |
| Pile metaphor | thin | thick | flat queue |
| Implementation cost | ★ (already ~95% there) | ★★ (extra peek depth + stagger) | ★★★ (perspective + rotateY rebuild) |

**Watch for:**
- Does the deal-in last too long? B's 600ms+stagger may feel slow on every regen.
- Does C feel less decisive without the rotation? Tinder's rotation is half the
  reason the gesture reads as "throwing this away."
- In B, does the 3-deep peek crowd the partner-vote dot in the bottom-right of
  the photo well?
- After commit, does the peek-to-front promotion read smoothly, or does the
  front card "blink" into existence?

## Reference points (from project)

- `frontend/components/ShortlistCard.tsx` — current motion contract (drag, rings,
  fly-off, spring entry)
- `frontend/lib/swipe-tokens.ts` — locked thresholds (140px, 80px ramp, 15°)
- `frontend/lib/motion.ts` — `easeCraft`, `transitions.springSnap`
- `docs/design-system.html#accueil` — header row + marginalia stack
- Phase 23 (DECK-01 → DECK-04) — the original "deliberate motion" retune that
  these sketches honour
