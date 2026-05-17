---
status: partial
phase: 28-recipe-detail-thread
source: [28-VERIFICATION.md]
started: 2026-05-17T14:45:00Z
updated: 2026-05-17T14:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Chip / stepper answer → immediate field update + pin signal

**expected:** Open `/recipes/[id]` with a seeded recipe that has a `question` turn in its thread. Tap a chip option (or commit a stepper), then tap « Valider ». The corresponding recipe form field updates immediately (optimistic state). A « épinglé » Caveat label appears in the gutter beside the relevant section. The `POST /turns` answer call fires in the network tab (`kind=answer`). No page reload required.

**result:** [pending]

**why_human:** Requires a running dev stack + a seed `question` turn. Phase 29 LLM-03 emits `question` turns from the completeness helper; Phase 28 only wires the consumer side. Can be validated sooner via direct DB insert of a synthetic `question` turn or via a manual SQL fixture.

### 2. Advisory accept/dismiss + « conflit » escalation + post-resolution collapse

**expected:** Insert a synthetic `advisory` turn for a pinned field (e.g. `cuisine` pinned, advisory proposing a different cuisine). Open `/recipes/[id]`. Verify the gutter label shows « conflit » in destructive amber rather than « épinglé ». Tap the « conflit » label. The page scrolls smoothly to the advisory bubble in the chat thread (`data-advisory-id` scroll target). The advisory bubble shows `current_value`, `proposed_value`, `reason_excerpt`. Tapping « Mettre à jour » applies the proposed value immediately on the form, removes the pin (« épinglé » disappears), and the advisory bubble collapses to a muted italic summary line after the WS `turn.created` event lands. Tapping « Ignorer » on a fresh advisory dismisses without changing the field, and the bubble also collapses to a one-line muted summary.

**result:** [pending]

**why_human:** Requires a running dev stack + a seed `advisory` turn. Phase 29 LLM-02 emits `advisory` turns when the LLM's interpretation conflicts with a pinned value; Phase 28 only wires the consumer side. Playwright `« conflit »` spec is scaffolded as `test.skip` pending Phase 29 LLM-02. Manual SQL fixture or DB insert is the fastest validation path.

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
