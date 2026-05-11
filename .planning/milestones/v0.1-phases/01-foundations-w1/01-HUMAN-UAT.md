---
status: partial
phase: 01-foundations-w1
source: [01-VERIFICATION.md]
started: 2026-05-06T17:23:00Z
updated: 2026-05-06T17:23:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. PWA install on iPhone
expected: Safari → Add to Home Screen installs app, launches fullscreen (no browser chrome), app icon appears on home screen
result: [pending]

### 2. WebSocket reconnect with backoff
expected: After Railway service restart, PWA reconnects automatically within ~30s; no manual reload needed; destructive toast appears if disconnect > 30s
result: [pending]

### 3. Two-phone realtime sync
expected: Recipe created on Phone A appears on Phone B within ~200ms without manual refresh
result: [pending]

### 4. Disabled color swatch on join
expected: When joining a household, colors already taken by existing members are visually disabled (can't be selected)
result: [pending]

### 5. Drop pings migration applied
expected: Run `cd backend && uv run alembic upgrade head` — confirms 0002_drop_pings migration runs clean; `pings` table no longer exists in Supabase
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
