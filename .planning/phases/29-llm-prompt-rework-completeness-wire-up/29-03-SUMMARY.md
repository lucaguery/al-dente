---
phase: 29-llm-prompt-rework-completeness-wire-up
plan: "03"
subsystem: backend-schemas
tags: [pydantic, schema, turn-payloads, llm-contracts, wave-1]
dependency_graph:
  requires: []
  provides: [SummaryTurnPayload-typed, QuestionTurnPayload-typed]
  affects: [backend/app/schemas/recipe_turn.py, TurnPayload-union]
tech_stack:
  added: []
  patterns: [pydantic-v2-optional-field, discriminated-union-on-kind, answer-field-literal-reuse]
key_files:
  modified:
    - backend/app/schemas/recipe_turn.py
decisions:
  - "summary_body in SummaryTurnPayload.body is Optional[str] = None (not required) because apply_voice_modification reuses GeminiExtractedRecipe as response_schema without summary_body in its prompt — making it required would break POST /recipes/{id}/voice-modify"
  - "extraction_hash is a required str field in SummaryTurnPayload — the emitter always computes and stores it; the idempotency check reads it on the next LLM run"
  - "QuestionTurnPayload.multi defaults to False per Phase 28 D-12 — frontends predating Phase 29 that omit the field will not crash"
  - "TurnPayload discriminated union unchanged — class bodies replaced atomically; no structural change to the Annotated union at line 270"
metrics:
  duration_minutes: 10
  completed_date: "2026-05-17"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 29 Plan 03: Graduate SummaryTurnPayload + QuestionTurnPayload Summary

One-liner: Typed Pydantic replacements for both Phase 25 stubs — body/chips/extraction_hash for summary, field/prompt/input_type/options/multi for question — with locked Optional[str] and AnswerField reuse.

## What Was Built

Both Phase 25 stub classes in `backend/app/schemas/recipe_turn.py` (lines 204-211) were replaced atomically with typed Pydantic models per Phase 29 D-05 and D-13.

### SummaryTurnPayload

```python
class SummaryTurnPayload(BaseModel):
    kind: Literal["summary"]
    body: Optional[str] = Field(default=None, max_length=240)
    chips: List[str] = Field(default_factory=list)
    extraction_hash: str
```

- `body` is `Optional[str]` with 240-char cap — the `_run_thread_llm` server fallback fills it when Gemini returns None
- `chips` defaults to empty list — `"{label}: {value}"` strings for changed fields
- `extraction_hash` is required str — SHA256 of `GeminiExtractedRecipe.model_dump()` via `json.dumps(sort_keys=True)` (not `model_dump_json(sort_keys=True)` which doesn't exist in Pydantic v2)

### QuestionTurnPayload

```python
class QuestionTurnPayload(BaseModel):
    kind: Literal["question"]
    field: AnswerField
    prompt: str
    input_type: Literal["chip", "stepper", "text"]
    options: List[str] = Field(default_factory=list)
    multi: bool = False
```

- `field` reuses the existing `AnswerField` Literal from line 28 (drift-free, single source per Phase 26 D-08)
- `options` defaults to empty list — stepper/text fields carry no options
- `multi` defaults to `False` per Phase 28 D-12 — frontend safely omits the key

## Verification Script Output

```
OK
```

All Pydantic round-trips passed:
- Summary with all fields
- Summary with `body=None` (optional)
- Summary missing `extraction_hash` raises ValidationError
- Question with defaults (`multi=False`, `options=[]`)
- Question `field='not_a_field'` raises ValidationError
- Question `input_type='radio'` raises ValidationError
- Summary `body='x'*241` raises ValidationError (max_length=240)

TurnPayload discriminated union round-trips also verified:
- `kind='summary'` → `SummaryTurnPayload`
- `kind='question'` → `QuestionTurnPayload`
- `kind='advisory'` → `AdvisoryTurnPayload` (unchanged)

## Deviations from Plan

None — plan executed exactly as written.

The `test_turns.py` regression check could not be run because the test Postgres is not available at `localhost:5433` in this worktree environment. The discriminated union structural check was verified directly via `TypeAdapter(TurnPayload).validate_python(...)` round-trips confirming no regression risk.

## Known Stubs

None. Both stub classes are fully replaced. No placeholder text remains (`# Phase 29 LLM-01 defines content` and `# Phase 29 LLM-03 defines content` are both gone, confirmed via grep returning 0).

## Threat Flags

None. No new attack surface introduced — schema-only change. T-29-02 mitigation (`max_length=240` on `body`) is in place. T-29-07 (AnswerField whitelist) inherited from existing `AnswerField` Literal.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Graduate SummaryTurnPayload + QuestionTurnPayload | 59aed61 | backend/app/schemas/recipe_turn.py |

## Must-Haves Status

| Truth | Status |
|-------|--------|
| SummaryTurnPayload validates {kind, body, chips, extraction_hash} with kind='summary' literal | PASS |
| QuestionTurnPayload validates {kind, field, prompt, input_type, options, multi} with kind='question' literal | PASS |
| QuestionTurnPayload.field uses AnswerField Literal (drift-free) | PASS |
| QuestionTurnPayload.multi defaults to False (Phase 28 D-12) | PASS |
| QuestionTurnPayload.options defaults to empty list | PASS |
| Both payloads ride the existing TurnPayload discriminated union without further changes | PASS |

## Self-Check: PASSED

- `backend/app/schemas/recipe_turn.py` exists and was modified: FOUND
- Commit `59aed61` exists: FOUND
- `grep -c 'extraction_hash' backend/app/schemas/recipe_turn.py` → 3 (definition + docstring references) ≥ 1: PASS
- `grep -c 'body: Optional\[str\] = Field(default=None, max_length=240)'` → 1: PASS
- `grep -c 'chips: List\[str\] = Field(default_factory=list)'` → 1: PASS
- `grep -c 'multi: bool = False'` → 1: PASS
- Stub comments: 0 each: PASS
