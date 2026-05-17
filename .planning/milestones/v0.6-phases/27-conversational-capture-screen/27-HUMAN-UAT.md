---
status: partial
phase: 27-conversational-capture-screen
source: [27-VERIFICATION.md]
started: 2026-05-13T21:00:00Z
updated: 2026-05-13T21:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Two-tap capture flow (CAPTURE-01 / SC-1)
expected: Open `/recipes/new` in the deployed PWA on iPhone. Type a note in the composer textarea and tap the send (ArrowUp) button. Verify the text bubble appears in the chat. Tap « Enregistrer ». Observe network traffic — exactly 1× `POST /api/recipes` (body `{}`), 1× `POST /api/recipes/{id}/turns` (kind=text), 1× `POST /api/recipes/{id}/promote`, then `router.replace` to `/recipes/{id}`. The text bubble is visible on the detail page as the first user turn.
result: [pending]

### 2. Realtime turn append after promotion (CAPTURE-04 / SC-4)
expected: After tapping « Enregistrer » and landing on `/recipes/{id}`, wait up to 10 seconds for `promote_draft` BackgroundTask to complete. Open a second browser tab on the same household. The post-LLM `summary`/`question` turns append inline within ~2s of `promote_draft` completing. Both tabs show the same turn list. The extraction-in-progress row disappears once `recipe.status` flips to `structured`.
result: [pending]

### 3. Back-arrow discard guard
expected: Navigate to `/recipes/new` with pending bubbles (type a note, do NOT save). Tap the back arrow (ChevronLeft) in the header. A native `window.confirm()` dialog appears with the `discard_confirm` French message. Confirming navigates back; cancelling stays on the page with bubbles preserved.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
