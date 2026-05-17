---
status: partial
phase: 29-llm-prompt-rework-completeness-wire-up
source: [29-VERIFICATION.md]
started: 2026-05-17T16:00:00Z
updated: 2026-05-17T16:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Live LLM round-trip
expected: One `summary` turn emitted with `extraction_hash` set; one `question` turn for the highest-priority non-skipped missing field; re-run with unchanged thread returns silently with no new turns (SC-1 idempotency).
why_human: Requires live Gemini API + running backend + Postgres. Code-inspection verified the canned-fixture path; only the actual `models.generate_content` call cannot be exercised without the full stack.
result: [pending]

### 2. Live advisory round-trip
expected: Manually pin a field via the form (PUT /recipes/{id}), then submit a text turn that conflicts. An `advisory` turn appears with `{field, current_value, proposed_value, reason_excerpt}`; the recipe form stays at the pinned value (SC-2 no silent overwrite); tapping "Mettre à jour" applies the proposed value and removes the pin (`proposal_accepted` turn lands).
why_human: End-to-end conflict-detection + advisory render + accept flow depends on Phase 28 UI consuming Phase 29 emissions in real time over WebSocket.
result: [pending]

### 3. Defer gate live test
expected: With a recipe that has missing fields, tap "Plus tard" on a summary turn → next refinement turn produces NO new question turn (defer suppression). After 24h (or by manually setting `questions_deferred_until` to past), the next refinement turn produces a question again.
why_human: Requires real-time clock interaction and WebSocket-driven re-render of the SystemBubble deferred state.
result: [pending]

### 4. Playwright e2e suite
expected: `cd frontend && npx playwright test tests/e2e/recipe-detail.spec.ts --project=seeded` passes — including the Phase 29 summary CTA specs added in 29-06 (trigger emits question or shows "Tout est complet." toast; defer collapses CTAs and suppresses next emission).
why_human: Requires the test stack — seed DB via `uv run seed`, backend + frontend dev servers, Playwright browser. The specs themselves were patched in CR-01 fix (`d1672f7`) to use flat top-level turn payload; this verifies the patch holds in a live run.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
