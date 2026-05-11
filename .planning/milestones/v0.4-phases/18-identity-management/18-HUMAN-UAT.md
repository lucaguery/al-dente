---
status: partial
phase: 18-identity-management
source: [18-VERIFICATION.md]
started: 2026-05-11T16:55:00.000Z
updated: 2026-05-11T16:55:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Run settings-member-rename.spec.ts (seeded)
expected: With backend on :8000 + frontend on :3000 + seed loaded, `cd frontend && npx playwright test --project=seeded settings-member-rename` exits 0. The spec opens /settings, taps Pencil icon, types a new name, presses Enter, asserts the new name appears in the Membre Card and the success toast fires.
result: [pending]

### 2. Run onboarding-household-full.spec.ts
expected: Same runbook. The spec seeds the household to capacity (5 members) and asserts that the 6th join attempt renders the "Foyer complet" terminal Card with title from i18n key `onboarding.join.capacity.title`. May require playwright.config.ts tweak — see 18-04 SUMMARY.
result: [pending]

### 3. Cross-phone realtime — partner sees rename within ~200ms
expected: Two browser sessions (or two devices) authenticated as different members of the same seeded household. Phone A renames the user. Phone B's Settings page should reflect the new name within ~200ms via the `member.updated` WebSocket broadcast + SessionProvider refresh.
result: [pending]

### 4. Manual smoke — Settings Copy button
expected: Open /settings, tap the "Copier le code" Button (or its icon variant). Verify `navigator.clipboard.writeText` succeeds (paste in another app to confirm) AND the "Code copié" toast fires.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

(None — items pending human execution, not blocked.)
