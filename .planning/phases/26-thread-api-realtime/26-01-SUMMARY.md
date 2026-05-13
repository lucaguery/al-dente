---
phase: 26
plan: "01"
subsystem: backend/schemas+services
tags: [pydantic, validation, ssrf, concurrency, thread-api]
dependency_graph:
  requires: []
  provides:
    - "app.schemas.recipe_turn: typed AnswerTurnPayload, AdvisoryTurnPayload, UrlTurnPayload"
    - "app.services.thread: acquire_position_lock, _is_safe_url"
  affects:
    - "backend/app/schemas/recipe_turn.py"
    - "backend/app/services/thread.py"
tech_stack:
  added: []
  patterns:
    - "Pydantic v2 @model_validator(mode='after') for cross-field value typing"
    - "Module-level frozensets for enum whitelists (R-6: avoids PydanticUserError)"
    - "weakref.WeakValueDictionary for auto-GC'ing per-recipe asyncio.Lock registry"
    - "ipaddress.ip_address for SSRF IP-literal detection"
key_files:
  created:
    - backend/app/services/thread.py
  modified:
    - backend/app/schemas/recipe_turn.py
decisions:
  - "Vocabulary frozensets duplicated at module level (not imported from llm.py) per locked-vocabulary discipline — drift is a bug category"
  - "value: Any + @model_validator chosen over discriminated nested union (Pydantic v2 cannot discriminate on sibling field per RESEARCH §Area 6)"
  - "WeakValueDictionary lock registry scoped to single uvicorn worker (invariant 7); TODO(productize) for pg_advisory_xact_lock on scale-out"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-13"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 26 Plan 01: Typed Turn Schemas + Thread Service Foundation Summary

Graduated Phase 25 Pydantic stubs into typed models with a 13-field AnswerField whitelist + per-field value validation, and shipped the new `services/thread.py` concurrency + SSRF security module.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Graduate AnswerTurnPayload, UrlTurnPayload, AdvisoryTurnPayload | d1630bb | backend/app/schemas/recipe_turn.py |
| 2 | Create services/thread.py with async lock + SSRF helper | 89b6b29 | backend/app/services/thread.py |

## What Was Built

### Task 1: Typed Turn Schemas (D-08, D-09, D-17, D-25)

`backend/app/schemas/recipe_turn.py` rewritten from Phase 25 stubs:

- `AnswerField = Literal[...]` — exactly 13 whitelisted field names (`title`, `description`, `ingredients`, `steps`, `prep_time_minutes`, `cook_time_minutes`, `difficulty`, `servings`, `cuisine`, `mood`, `main_protein`, `seasonality`, `tags`). `photo_paths` intentionally excluded — photo follow-ups go through multipart endpoint.
- `_VALID_DIFFICULTIES / _VALID_CUISINES / _VALID_PROTEINS / _VALID_MOODS / _VALID_SEASONS` — module-level frozensets (R-6 compliance: Pydantic v2 raises `PydanticUserError` for unannotated class-level attrs).
- `AnswerTurnPayload` — `field: AnswerField` enforces whitelist at Pydantic schema boundary (422 before `@model_validator`); `value: Any` with cross-field `@model_validator(mode="after")` enforces per-field shape.
- `UrlTurnPayload` — adds `extracted_html_path: Optional[str] = None` (D-25, forward-compat for Plan 02).
- `AdvisoryTurnPayload` — typed read-side contract: `field`, `current_value`, `proposed_value`, `reason_excerpt` all required (D-17, consumed by Plan 03's proposal_accepted handler).
- `ProposalAcceptedPayload` / `ProposalDismissedPayload` — graduated with `in_reply_to_turn_id: UUID`.
- Discriminated `TurnPayload` union unchanged — still validates all 10 kinds.
- No `from app.services.llm import` — schemas file stays dependency-free of services layer.

### Task 2: services/thread.py (D-18, D-19 + SSRF security gate)

New `backend/app/services/thread.py`:

- `acquire_position_lock(recipe_id: UUID) -> asyncio.Lock` — `WeakValueDictionary`-backed per-recipe lock. Same UUID returns the same lock instance. Auto-GC's under CPython refcounting when no live holder exists. DB `UNIQUE(recipe_id, position)` remains backstop for process-restart races.
- `_is_safe_url(url: Optional[str]) -> bool` — SSRF defense blocking: loopback (127.x, ::1), RFC1918 (10/8, 172.16/12, 192.168/16), link-local (169.254.x), unspecified, multicast; hostname literals `localhost`, `ip6-localhost`, `metadata.google.internal`. All 11 RESEARCH §Area 5 test cases pass.
- `TODO(productize)` comment for `pg_advisory_xact_lock` swap on Railway scale-out.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `SummaryTurnPayload` — content defined by Phase 29 LLM-01
- `QuestionTurnPayload` — content (input_type, field, options) defined by Phase 29 LLM-03

These stubs are intentional per the plan; they exist to keep the `TurnPayload` discriminated union complete for the DB CHECK constraint. Phase 29 owns their content shape.

## Threat Surface Scan

All security-relevant surfaces introduced in this plan are covered by the plan's `<threat_model>`:

| Flag | File | Description |
|------|------|-------------|
| T-26-01 mitigated | backend/app/schemas/recipe_turn.py | `field: AnswerField` Literal + `_VALID_*` frozensets block field/value injection |
| T-26-02 mitigated | backend/app/services/thread.py | `_is_safe_url` blocks RFC1918/loopback/link-local/metadata endpoints |
| T-26-03 accepted | backend/app/services/thread.py | DNS rebinding not defended (couple-scale, documented TODO) |
| T-26-04 mitigated | backend/app/services/thread.py | WeakValueDictionary auto-GCs lock entries |

## Self-Check: PASSED

- `backend/app/schemas/recipe_turn.py` — exists, verified
- `backend/app/services/thread.py` — exists, verified
- Commit d1630bb (Task 1) — exists: `feat(26-01): graduate AnswerTurnPayload, UrlTurnPayload, AdvisoryTurnPayload to typed models`
- Commit 89b6b29 (Task 2) — exists: `feat(26-01): create services/thread.py with per-recipe async lock + SSRF helper`
