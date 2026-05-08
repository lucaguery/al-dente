---
phase: 05-design-system-foundation
plan: 02
subsystem: design-system / texture-anchor
tags: [design-system, texture, svg, paper-grain, slow-food, asset]
requires: []
provides:
  - "frontend/public/textures/paper-grain.svg as canonical paper-grain texture asset"
  - "DESIGN-04 (asset half) — single source of truth for the .paper-grain CSS utility"
affects:
  - "Plan 05-01 (consumes the asset via background-image url('/textures/paper-grain.svg'))"
  - "Phase 5 styleguide route (will render paper-grain on card surfaces for visual verification)"
  - "Phases 6-9 card-surface polish (every Card / Dialog / Sheet / Popover surface gets paper-grain)"
tech-stack:
  added: []
  patterns:
    - "Static SVG asset served from frontend/public/ — deterministic, gzip-friendly, no runtime cost"
    - "feTurbulence fractalNoise + feColorMatrix tint pattern — reproducible across builds via fixed seed"
key-files:
  created:
    - "frontend/public/textures/paper-grain.svg"
  modified: []
decisions:
  - "Wrote the SVG verbatim from UI-SPEC §Paper-Grain — zero deviation from the locked attribute set (baseFrequency=0.92, numOctaves=2, seed=7, stitchTiles=stitch, color matrix R=0.29 G=0.22 B=0.16, alpha=0.55)"
  - "No xmlns:xlink, no <title>, no <desc>, no external image refs — self-contained 454-byte asset (under the ~1KB UI-SPEC target)"
metrics:
  duration: "<1 minute (single-file write + verification)"
  completed: "2026-05-08"
  tasks_completed: 1
  files_changed: 1
  commits: 1
---

# Phase 5 Plan 2: Paper-grain SVG asset Summary

**One-liner:** Wrote the canonical 240×240 paper-grain noise SVG at `frontend/public/textures/paper-grain.svg` — deterministic fractalNoise with seed=7, warm-brown color matrix at 55% alpha, `stitchTiles="stitch"` for seamless tile repetition, 454 bytes total.

## What Shipped

The asset half of DESIGN-04 (paper-grain texture anchor). Plan 01 owns the matching `.paper-grain` CSS utility in `globals.css`; this plan ensures that utility's `background-image: url('/textures/paper-grain.svg')` reference resolves to a real, deterministic, ~half-KB asset on the deployed PWA.

### File created

| Path | Size | Purpose |
|------|------|---------|
| `frontend/public/textures/paper-grain.svg` | 454 bytes | Single source of truth for the paper-grain texture; consumed by `.paper-grain` CSS utility (Plan 01) |

The directory `frontend/public/textures/` did not previously exist; it was created as part of this plan.

### Asset content (verbatim from UI-SPEC §Paper-Grain)

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.92" numOctaves="2" seed="7" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0.29
                           0 0 0 0 0.22
                           0 0 0 0 0.16
                           0 0 0 0.55 0"/>
  </filter>
  <rect width="240" height="240" filter="url(#grain)"/>
</svg>
```

### Why each value (preserved from UI-SPEC reasoning)

- `width / height = 240` — square tile, large enough that repetition is invisible at recipe-card sizes (327×120) and finalize-card sizes (327×80).
- `baseFrequency="0.92"` — fine-grain, paper-fiber feel; degrades gracefully on retina.
- `numOctaves="2"` — single octave is too uniform; 3+ becomes "marble." Two gives organic variance.
- `seed="7"` — deterministic seed so the texture is reproducible across builds (no flicker between deploys).
- `stitchTiles="stitch"` — eliminates the seam visible at tile borders when repeated as `background-image`.
- `feColorMatrix` — converts grayscale noise to a warm-brown tint at R=0.29, G=0.22, B=0.16, alpha 0.55 (matches the wood-shadow color family from Plan 01 — coherent palette).

## Verification

Plan's automated grep set (all PASS):

| Check | Result |
|---|---|
| `test -f frontend/public/textures/paper-grain.svg` | PASS |
| `grep -F 'baseFrequency="0.92"'` | PASS |
| `grep -F 'numOctaves="2"'` | PASS |
| `grep -F 'seed="7"'` | PASS |
| `grep -F 'stitchTiles="stitch"'` | PASS |
| `grep -F 'fractalNoise'` | PASS |
| `grep -F '0.29'` (red channel of warm-brown tint) | PASS |
| `grep -F '0.55'` (alpha multiplier) | PASS |
| `grep -F '<rect width="240" height="240"'` (fill rect) | PASS |
| File size < 2KB sanity bound | PASS (454 bytes, ~22% of bound) |
| No `<script>`, no `onload=`/`onerror=` | PASS |
| No `<image href=` or `xlink:href` external image refs | PASS |
| Root `xmlns="http://www.w3.org/2000/svg"` present | PASS |
| `viewBox="0 0 240 240"` present | PASS |

### Visual confirmation method (manual, post-deploy)

After Plan 01's CSS utility lands and the deploy runs, a developer can verify the asset by:

1. Loading `https://<deployed-host>/textures/paper-grain.svg` directly in a browser — should render as a uniform warm-brown noise tile (looks like fine paper grain at native size).
2. Opening the temporary `/styleguide` route once Plan 06 ships it — every card surface should show subtle warm-noise overlay at 6% opacity (light) / 10% (dark).
3. DevTools Network tab should show the asset served with `Content-Type: image/svg+xml` and a transfer size well under 1KB after gzip.

The asset is bundled as a Vercel static asset on push to `main` (no manual deploy step per project convention).

## Deviations from Plan

**None.** SVG content is byte-for-byte identical to the UI-SPEC §Paper-Grain "Exact SVG content" block. No attributes added (no `xmlns:xlink`, no `<title>`, no `<desc>`), no values altered, no formatting normalization.

Scope was strictly limited to `frontend/public/textures/paper-grain.svg` — no edits to `globals.css` (Plan 01 owns the CSS utility wiring), no edits to any component, no other texture files added (single-asset texture-anchor decision per CONTEXT.md preserved).

## Threat Surface Scan

No new trust boundaries introduced beyond what the plan's `<threat_model>` already enumerates (T-05-04, T-05-05, T-05-06 — all `accept` disposition, mitigated by:

- Static asset bundled at build time (no runtime fetch from user-supplied URL)
- Used as CSS `background-image` only — browsers do not execute scripts in SVGs loaded as images
- No script tags or event handlers in the SVG (verified)
- No external image references (verified)

No threat flags raised.

## Commits

| Commit | Type | Subject |
|---|---|---|
| `b055906` | feat | feat(05-02): add paper-grain.svg texture asset (DESIGN-04) |

## Requirements Closed

- **DESIGN-04 (asset half)** — paper-grain texture anchor SVG exists at the canonical path the `.paper-grain` CSS utility (Plan 01) references. The CSS utility half of DESIGN-04 is closed by Plan 05-01.

## Self-Check: PASSED

- File exists: `frontend/public/textures/paper-grain.svg` (454 bytes) — FOUND
- Commit `b055906` exists in git history — FOUND
- All automated grep checks from plan's `<verify>` block — PASS
- All 11 acceptance criteria from plan's `<acceptance_criteria>` — PASS
- File contains no `<script>` tags, no event handlers, no external image references — verified
