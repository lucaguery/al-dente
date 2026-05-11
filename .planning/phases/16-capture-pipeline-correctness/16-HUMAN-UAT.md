---
status: partial
phase: 16-capture-pipeline-correctness
source: [16-VERIFICATION.md]
started: 2026-05-11T15:30:00.000Z
updated: 2026-05-11T15:30:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Run Playwright e2e suite for Phase 16 specs
expected: Both `capture-voice-failed-recovery.spec.ts` (2 tests) and `recipe-form-ingredient-parser.spec.ts` (1 test) pass green under the `seeded` project (`cd frontend && npx playwright test --project=seeded capture-voice-failed-recovery recipe-form-ingredient-parser`). Full seeded suite still passes with no regressions.
result: [pending]

### 2. Manual UX exercise — failed-state inbox card
expected: Voice capture with an empty/garbage transcript flips the inbox row to a paper-grain Card showing "Extraction échouée" in Fraunces italic + truncated French error sentence + Réessayer (terracotta, h-12) + Supprimer (ghost destructive, h-12). Réessayer flips the row back to "extraction en cours…" then either to a normal draft or back to failed. Supprimer opens an AlertDialog confirming "Supprimer ce brouillon ?"; confirming removes the row.
result: [pending]

### 3. Manual full-form ingredient round-trip
expected: Enter `4 tomates`, `1 oignon rouge`, `500 g de farine`, `2 c.s. d'huile` in the full-form ingredients textarea on `/recipes/new`. Submit. Open the resulting recipe-detail page. The Ingrédients list shows each line verbatim — no `4 tomates 4 tomates` duplication. Quantities, units, and names align with the unit-whitelist parser (Plan 16-02).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

(None recorded — items are pending human execution, not blocked.)
