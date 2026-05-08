---
title: Design originality follow-up — making the Slow Food identity actually distinctive
date: 2026-05-08
context: Captured after v0.2 milestone close. User feedback on shipped PWA.
status: open
applies_to: future polish milestone (v0.2.1 or v0.3 design pass)
---

# Design originality follow-up

## The observation (post-v0.2 ship)

After v0.2 shipped on iPhone PWA, the user's read was:

> "The UI is for sure better but it's not that original."

This is the correct read. The shipped result is "tasteful warm shadcn" rather than "artisanal Italian cookbook." The Slow Food identity was supposed to arrive via four stacked moves; one of them is under-delivering.

## Diagnosis

The v0.2 identity strategy stacked four moves:

1. **Color** — terracotta + warm cream + warm taupe (working)
2. **Typography** — Fraunces display + IBM Plex Sans body (working — Fraunces does signature work on date header, step numbers, identity signature, callouts)
3. **Texture** — paper-grain on every Card surface (under-delivering, see below)
4. **Motion** — paper-physics swipe via spring 240/28/1.1 + `--ease-craft` curve (working)

The texture was meant to be the **distinctive** move — the thing that makes the app not read as "yet another shadcn site." Three of the four moves are deliberately restrained (the v0.2 anti-pattern list explicitly forbids "lean handmade overload"), so when the texture disappears at viewing distance, what's left reads tasteful but generic.

### Why paper-grain disappears in the shipped build

`frontend/app/globals.css`:

```css
.paper-grain::before {
  background-image: url('/textures/paper-grain.svg');
  background-size: 240px 240px;
  opacity: 0.06;
  mix-blend-mode: multiply;
}
```

The asset is a 454-byte `<feTurbulence>` SVG (warm-brown fractal noise). On a 4-inch iPhone screen at retina pixel density, **6% multiply over warm-cream is essentially invisible**. The texture isn't doing brand work — it's an Easter egg.

The original Phase 5 intent was "perceptible up close, invisible from across the room." Reality on iPhone PWA is "invisible up close too."

## Candidate moves (ranked by effort vs distinctiveness payoff)

### 1. Bump paper-grain visibility (1-line CSS change)
- Opacity from `0.06` to `0.10–0.12`, or change `mix-blend-mode` from `multiply` to `overlay`
- Single edit in `globals.css`, ~2 LOC
- Risk: at ~12% on iPhone you may cross from "tasteful texture" into "looks dirty"
- **Worth testing on device first.** If it lands, brand reads stronger for a 1-line change. If it doesn't, we know the texture was always going to be invisible and we should pick from #2–#4 instead.

### 2. Add a second textural element
The v0.2 anti-pattern list explicitly cut these as "lean handmade overload" — but that decision was made *before* we could see the texture-only result. Worth revisiting now:
- Hand-cut deckle edge on Card surfaces (clip-path with a wavy mask)
- Single ornamental glyph as a section divider in recipe detail
- Subtle cookbook-page-edge gradient at the bottom of the recipe-detail hero
- Hand-drawn underline on Fraunces section headings (Ingrédients / Préparation)

Each is ~10–30 LOC. Picking one or two would push the identity past "tasteful" into "specific."

### 3. Push typography harder
Fraunces is currently restricted to display register (date header, step numbers, callouts, identity signature) + a few italic moments. The body register is still IBM Plex Sans. To strengthen:
- Drop-cap on the first paragraph of recipe instructions (Fraunces large italic)
- Old-style figures + tabular ligatures on the invite code (Fraunces OpenType features)
- Cuisine / mood / season Badges in Fraunces small-caps (Fraunces supports `font-feature-settings: 'smcp'`)
- Recipe metadata "time / serves" in Fraunces italic numerals

Each is a ~5 LOC className change. Cumulative effect: the typography stops being "warm sans + occasional serif accent" and starts being "editorial cookbook."

### 4. One signature visual moment per surface
The recipe-detail "cookbook chapter-opener" hero (full-bleed photo + paper-grain title strip with `backdrop-blur-sm`) is the strongest move in the whole app — it's the one shipped surface that reads as *specifically* a cookbook, not a generic recipe app. Phase 8 had exactly one of those.

If every primary surface had one such moment, the identity would land:
- HomeDecide: a stronger "today's menu" register on the date header (calligraphy pull-out, larger Fraunces with italic flourish, paper-grain banner extension)
- Drafts inbox: an editorial "draft pile" gesture (slight overlap on cards, scribble corner)
- Settings: a stronger "logbook" register on the Foyer Card (the invite code is already there — could expand)
- Cooking-log history: dated section headers as cookbook chapter dividers

Highest effort (each is a real design pass), highest payoff. This is what would push the milestone from 22.4/24 to "memorable."

## Recommendation

**Cheapest experiment first.** Start with move #1 (bump paper-grain opacity). One line of CSS, real-device test. If it works, brand reads ~2× stronger immediately. If it doesn't, we have evidence that texture-alone was never going to carry the identity, and we plan a v0.2.1 (or v0.3) design pass around moves #2 + #3 with one or two #4 signature surfaces.

## Constraints to honor

- Solo dev, ~1 weekend budget per polish iteration — moves #2 and #4 are real work, not a CSS tweak
- v0.2 anti-pattern list (in `.planning/notes/v0.2-design-direction.md`) was committed deliberately. If we want to revisit "lean handmade overload" we should explicitly mark which anti-patterns we're un-committing
- Behavioral validation gate (≥ 2 weeks of daily use per `SPEC.md`) hasn't fired yet. May be worth waiting for that gate before another design pass — the daily-use signal will reveal which surfaces actually need brand work and which are fine

## Where this lives next

- If small (move #1 only): rolled into `v0.2.1` patch milestone alongside the 14 other deferred items in `.planning/milestones/v0.2-MILESTONE-AUDIT.md`
- If meaningful (moves #2–#4): full milestone of its own (`v0.3 — Design originality pass` or similar) opened via `/gsd-new-milestone`
