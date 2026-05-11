---
status: partial
phase: 19-validation-surface-fixes
source: [19-VERIFICATION.md]
started: 2026-05-11T17:30:00.000Z
updated: 2026-05-11T17:30:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Operator round-trip on both iPhones (VAL-04 / P-12-Pu-05)
expected: Follow `.planning/v0.4/PUSH-ROUNDTRIP.md` procedure. Tap "Tester le Web Push" from /styleguide on dev. Both iPhones receive an OS notification with title "Test al dente" within seconds. Fill in the template's `[pending: operator]` slots and mark outcome.
result: [pending]

### 2. capture-photo.spec.ts live green run (VAL-01)
expected: With backend on :8000 + frontend on :3000 + seed loaded, `cd frontend && npx playwright test --project=seeded capture-photo` exits 0. The Sheet-01 fix is verified structurally — confirm runtime reachability.
result: [pending]

### 3. Settings Notifications Card 4-state happy path on real iPhone (VAL-02)
expected: On installed iPhone PWA — verify Notifications Card renders correctly across permission states: default (Activer button), granted (Désactiver button), denied (OS-settings explanation copy).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

(None — items pending human execution, not blocked.)
