---
status: partial
phase: 11-production-synthetic-household
source: [11-VERIFICATION.md]
started: 2026-05-09T14:35:00Z
updated: 2026-05-09T14:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-End Prod Seed Smoke Check
expected: Both runs of `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic` print identical banner counts: `recipes: 21 / members: 2 / cooking_logs: 3 / votes: 7 / shortlists: 1 / storage objects (synthetic/): 21`. No errors. Run twice consecutively (D-13 idempotency smoke check).
result: [pending]

### 2. Auditor Photo Rendering (Signed-URL Round-Trip)
expected: After joining via invite code `DEMO01` from iPhone, recipe detail pages show photos (not blank). Confirms `recipes.photo_paths = ["synthetic/<slug>.jpg"]` round-trips through the signed-URL flow at `routers/photos.py:173`.
result: [pending]

### 3. Teardown Full Cycle
expected: First `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic --teardown` prints `votes removed: 7 / cooking_logs removed: 3 / daily_shortlists removed: 1 / recipes removed: 21 / members removed: 2 / households removed: 1 / storage objects removed: 21`. Second teardown prints all zeros + "Note: nothing to remove."
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
