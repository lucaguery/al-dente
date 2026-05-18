---
status: partial
phase: 31-bottom-nav-restructure
source: [31-VERIFICATION.md]
started: 2026-05-18T00:00:00Z
updated: 2026-05-18T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visual elevation reads as primary affordance on real screen
expected: On an iPhone (or iOS Safari at the PWA viewport), the central « Ajouter » circle reads as the loudest, most-tappable element on the bottom nav. The 56 px vs 40 px ratio + filled terracotta vs no-fill siblings should make this obvious without instruction. If it looks "same as the others, just colored", the spec is failing in spirit even though the code is correct.
result: [pending]

### 2. Safe-area math correct at 5rem nav band on iPhone X+
expected: No clipping of the CTA's label against the home-indicator area. No overlap between the nav and the last row of content on `/`, `/recipes`, `/recipes/[id]`, or `/settings`. The 5rem + safe-area-inset additive padding leaves a clean gap above the home indicator.
result: [pending]

### 3. Screen-reader reachability and landmark navigation
expected: VoiceOver (iOS) or TalkBack announces the nav as "Navigation principale". Swiping through tabs reaches all 4 slots (Accueil / Recettes / Ajouter / Profil) in left-to-right order. The Ajouter button announces "Ajouter, bouton". When on `/recipes/new`, VoiceOver announces "page actuelle" on the CTA.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
