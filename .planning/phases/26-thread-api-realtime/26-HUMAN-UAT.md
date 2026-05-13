---
status: partial
phase: 26-thread-api-realtime
source: [26-VERIFICATION.md]
started: 2026-05-13T00:00:00Z
updated: 2026-05-13T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Live `turn.created` WebSocket delivery (ROADMAP SC-1)
expected: Open two browser tabs (simulating two phones) on the same household. In tab 1, POST a text turn to `/recipes/{id}/turns`. The new turn bubble appears in tab 2 within ~200ms via the `turn.created` WebSocket event.
why_human: Automated tests monkeypatch `broadcast_to_household` with no connected WS peers; the actual DOM CustomEvent bridge and `RealtimeProvider` routing cannot be verified without two live clients connected to the app.
result: [pending]

### 2. Real URL extraction end-to-end (ROADMAP SC-3)
expected: POST a URL turn with a real external recipe URL (e.g. a Marmiton page). After ~10s, the turn bubble re-renders with a "Lien extrait" indicator, `turn.payload.extracted_html_path` is set, and `turn.updated` fires to the second tab.
why_human: Real `httpx` + `trafilatura` execution against an external host, Supabase Storage upload, and WebSocket `turn.updated` delivery to a second client cannot be verified without a live stack.
result: [pending]

### 3. `recipe-urls` Supabase Storage bucket creation (D-26)
expected: Deploy to staging (push to `main`). The Supabase Storage dashboard shows a `recipe-urls` bucket after the first Railway deploy. `ensure_url_bucket_exists()` in the lifespan logs `storage.bucket_created name=recipe-urls` or `storage.bucket_exists name=recipe-urls`.
why_human: The `ensure_url_bucket_exists` helper is a no-op in test mode; bucket creation against the live Supabase admin API requires a deployed app with service-role credentials.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
