---
status: partial
phase: 32-port-locked-screens-to-sober-kitchen
source: [32-VERIFICATION.md]
started: 2026-05-18T14:30:00Z
updated: 2026-05-18T14:30:00Z
---

## Current Test

[awaiting human testing — open Al Dente in iPhone Safari, install as PWA, run the four tests below in order]

## Tests

### 1. Side-by-side visual fidelity vs `docs/design-system.html`
expected: Accueil, Bibliothèque, and Recette — Détail all match their locked-screen references — layout, type scale, spacing, and identity tokens (terracotta sober palette, patine cards, table-à-manger scene, Caveat marginalia)
result: [pending]

### 2. Patine treatment across cook-count tiers
expected: A freshly captured recipe (0 cooks) renders patina=0 (un-aged card, no dogear, lightest border). A frequently cooked recipe (>10 cooks) renders patina=3 (dogear visible, darker border, amber paper-grain, denser background overlay). The 1-2 cook tier shows patina=1; 3-10 shows patina=2.
result: [pending]

### 3. iOS PWA Caveat font load (§15.D explicit gate)
expected: After installing as PWA on iPhone Safari and force-quitting/reopening, all Caveat surfaces still render in recognizable handwriting script (not the generic `cursive` fallback). Surfaces to verify: PinLabel gutter labels on Recette détail; Accueil subhead ("— déjà une idée validée" / "— une piste, à confirmer" / "— personne ne s'est encore prononcé"); Recette détail identity subhead ("cuisiné N fois" / "pas encore cuisiné"); step-1 marginalia when a cooking_log note exists.
result: [pending]

### 4. Table-à-manger 5-state visual distinctness
expected: All five computed vote states render visibly distinct seats within the same table-scene primitive — Validé (emerald halo around the seat dot), Pressenti (terracotta inset ring), Sans avis (faded grayscale), Rejeté (pushed outward + grayscale), Contesté (horizontal strike-through bar through the seat).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
