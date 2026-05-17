---
status: partial
phase: 30-live-bug-sweep
source: [30-VERIFICATION.md]
started: 2026-05-18T00:30:00Z
updated: 2026-05-18T00:40:00Z
---

## Current Test

[testing skipped — deferred by user 2026-05-18 to focus on Phase 31]

## Tests

### 1. iPhone PWA photo self-heal after backgrounding (BUG-01 acceptance)
expected: Load household on iPhone PWA → lock screen 10 min → unlock → recipe photos render or self-recover within one visible frame, no manual refresh, no skeleton/spinner during swap; onError fires cache-invalidate + refetch exactly once and does not loop.
result: skipped
reason: User chose to defer — moving to Phase 31. Requires physical iPhone in PWA mode + 10-min suspend window.

### 2. Fresh recipe pictogram render (BUG-02 acceptance)
expected: Capture a fresh recipe without a photo (voice / text quick-add). Wait for promotion + Gemini illustration emission. Library card and inbox draft row render a visible colored pictogram, not a muted empty square.
result: skipped
reason: User chose to defer — moving to Phase 31. Requires live Gemini round-trip + visual confirmation.

### 3. Post-deploy migration 0012 heals existing ns0-poisoned rows
expected: After next push to main, Railway runs `alembic upgrade head`; existing recipes that previously showed empty squares now render their pictograms. Re-running `alembic upgrade head` a second time is a no-op (idempotent WHERE).
result: skipped
reason: User chose to defer — moving to Phase 31. Verifiable only after next push to main triggers Railway deploy.

## Summary

total: 3
passed: 0
issues: 0
pending: 0
skipped: 3
blocked: 0

## Gaps

[none — all skips have reasons; no code issues found]
