---
status: partial
phase: 17-history-feature-restoration
source: [17-VERIFICATION.md]
started: 2026-05-11T16:15:00.000Z
updated: 2026-05-11T16:15:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Run cooking-log-history.spec.ts under seeded project
expected: After `docker compose up -d && uv run seed && uvicorn app.main:app --port 8000 & npm run dev &`, `cd frontend && npx playwright test --project=seeded cooking-log-history` exits 0. The spec opens /cooking-logs, asserts cards visible for the 3 seeded logs, taps one, lands on /cooking-logs/{id}, and asserts the recipe title + rating chip render.
result: [pending]

### 2. Run cooking-log-create-finalize.spec.ts (Phase 15 double-tap witness)
expected: Same runbook. The spec creates a cooking log, taps Finaliser twice, asserts `cook_count` increments exactly once. This is the load-bearing run of Plan 15-04's INV-02 assertion now that FIX-01 unblocks the active-log lookup.
result: [pending]

### 3. Visual check on /cooking-logs/[id] at iPhone-shape viewport
expected: Open `/cooking-logs/{some-log-id}` in Safari at ~iPhone 14 width (390×844). Verify: paper-grain Card surface, Fraunces italic date header (locale-aware French), member-color chip for "cooked by", aspect-square photo, rating chip with French label (loved/liked/disliked), notes paragraph with preserved line breaks, back-link to /recipes/{id}. Pillar 6 "feels Al Dente" judgment.
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
