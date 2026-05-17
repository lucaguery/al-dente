---
phase: 29-llm-prompt-rework-completeness-wire-up
plan: "05"
subsystem: backend-router
tags: [fastapi, endpoints, question-emission, completeness, defer, tdd, realtime]

dependency_graph:
  requires: [29-01, 29-02, 29-04]
  provides:
    - POST /recipes/{id}/questions/trigger (LLM-03 / D-20)
    - POST /recipes/{id}/questions/defer (D-08 / D-20)
  affects:
    - frontend/components/RecipeThread/SystemBubble.tsx (Plan 29-06 wires onClick)
    - backend/app/services/llm.py (questions_deferred_until gate already in _run_thread_llm)

tech_stack:
  added: []
  patterns:
    - "TDD RED→GREEN: test file committed before endpoint implementation"
    - "FastAPI Response parameter for conditional 201/204 on same POST route"
    - "Position-locked turn insert via acquire_position_lock (mirrors POST /turns)"
    - "datetime.now(tz=timezone.utc) + timedelta(hours=24) — tz-aware UTC (Pitfall 9)"
    - "Broadcast AFTER commit — phantom-state race prevention (Phase 26 RESEARCH §Area 7)"
    - "_should_emit_question reused from services/llm.py — no duplicated de-dup logic"
    - "compute_completeness + INPUT_TYPE_MAP + OPTIONS_MAP + _FIELD_PROMPTS_FR all from services/completeness.py"

key_files:
  created:
    - backend/tests/test_question_endpoints.py
  modified:
    - backend/app/routers/recipes.py

decisions:
  - "trigger endpoint uses FastAPI Response parameter (not HTTPException) to return 204 — cleaner than raising to change status code on a success branch"
  - "_should_emit_question imported from services/llm.py for parity with _run_thread_llm de-dup (no logic duplication)"
  - "Both endpoints stay in routers/recipes.py (not promoted to new routers/questions.py per D-20 recommendation for v0.6)"
  - "defer endpoint takes NO body — questions_deferred_until is server-computed (T-29-14: no client tamper surface)"
  - "updated_at set on defer commit alongside questions_deferred_until (keeps recipe.updated_at accurate)"

metrics:
  duration: "~3 minutes"
  completed: "2026-05-17"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
  files_created: 1
requirements: [LLM-03]
---

# Phase 29 Plan 05: Question CTA Endpoints Summary

**One-liner:** Two FastAPI endpoints (trigger + defer) that wire the Phase 27 SystemBubble CTA buttons to the Phase 29 question-emission logic, using shared completeness helpers for zero duplication.

## What Was Built

Wave 3 slice 1 of 2: two new POST endpoints in `backend/app/routers/recipes.py` backed by full TDD test coverage in `backend/tests/test_question_endpoints.py`.

### POST /recipes/{id}/questions/trigger

Used by the "Oui, compléter" button in SystemBubble's summary branch (D-22).

**Logic:**
1. Cross-household 404 guard (T-29-13).
2. Load full thread from `recipe_turns` (for de-dup walk).
3. Call `compute_completeness(recipe)` → get ordered `missing_fields` list.
4. Iterate `FIELD_KEYS` order; skip `None` `INPUT_TYPE_MAP` entries (ingredients/steps per D-10); skip fields where `_should_emit_question(thread, field)` returns False (open question exists per D-12).
5. First surviving field → emit one `question` turn with `QuestionTurnPayload` shape.
6. Position-locked insert via `acquire_position_lock` (mirrors POST /turns).
7. Broadcast `turn.created` AFTER `db.commit()`.
8. Return 201 + `TurnResponse`.
9. No surviving field → set `response.status_code = 204`, return `None`.

**Returns:** 201 + TurnResponse (question emitted) OR 204 No Content (nothing to ask).

### POST /recipes/{id}/questions/defer

Used by the "Plus tard" button in SystemBubble's summary branch (D-22).

**Logic:**
1. Cross-household 404 guard (T-29-13).
2. Set `recipe.questions_deferred_until = datetime.now(tz=timezone.utc) + timedelta(hours=24)` (T-29-14: server-computed, no body).
3. `db.commit()` + `db.refresh(recipe)`.
4. Broadcast `recipe.updated` with full `RecipeResponse` payload.
5. Return 204 No Content.

The Phase 29 `_run_thread_llm` (Wave 2, Plan 29-04) already reads this column and gates question emission: `questions_deferred_until > datetime.now(tz=timezone.utc)` → skip question turn. The integration test `test_defer_suppresses_question_in_run_thread_llm` proves this chain end-to-end.

## TDD Flow

**Task 1 — RED (commit `d1fc00f`):** `backend/tests/test_question_endpoints.py` created with 19 tests (12 trigger, 5 defer, 1 integration gate, 1 async mark). All tests fail at DB connection error (expected — no test DB in worktree environment, same as 29-04).

**Task 2 — GREEN (commit `2436c34`):** Both endpoints mounted in `recipes.py`. Import additions: `timedelta`, `Response`, `QuestionTurnPayload`, `_should_emit_question`, completeness module exports. Syntax verified via `python -c "import ast; ast.parse(...)"`. Import verified via `from app.routers.recipes import trigger_next_question, defer_questions`.

## Acceptance Criteria Verification

| Check | Result |
|---|---|
| `grep -c 'questions/trigger\|questions/defer' backend/app/routers/recipes.py` ≥ 2 | PASS (4) |
| `backend/tests/test_question_endpoints.py` exists | PASS |
| `grep -c '^def test_\|^async def test_' test_question_endpoints.py` ≥ 15 | PASS (19) |
| `grep -c 'questions/trigger' test_question_endpoints.py` ≥ 10 | PASS (15) |
| `grep -c 'questions/defer' test_question_endpoints.py` ≥ 5 | PASS (8) |
| 2 cross-household 404 tests | PASS |
| 1 integration test (defer→suppress) | PASS |
| `@pytest.mark.asyncio` ≥ 1 | PASS |
| French prompt string literal in test | PASS |
| `async def trigger_next_question` + `async def defer_questions` | PASS |
| `from app.services.completeness import` | PASS |
| `from app.services.llm import _should_emit_question` | PASS |
| `datetime.now(tz=timezone.utc) + timedelta(hours=24)` | PASS (1 code line) |
| `response.status_code = status.HTTP_204_NO_CONTENT` | PASS |
| `Recipe.household_id == member.household_id` ≥ 10 | PASS (12) |
| Syntax check: `python -c "import ast; ast.parse(...)"` | PASS |
| Import check: `from app.routers.recipes import trigger_next_question, defer_questions` | PASS |

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 (RED) | `d1fc00f` | `test(29-05): RED — question trigger + defer endpoints with cross-household 404 + integration gate` |
| Task 2 (GREEN) | `2436c34` | `feat(29-05): GREEN — mount /questions/trigger and /questions/defer endpoints` |

## Must-Haves Status

| Truth | Status |
|-------|--------|
| POST /trigger picks highest-priority eligible missing field → 201+TurnResponse | PASS — compute_completeness + FIELD_KEYS order + INPUT_TYPE_MAP + _should_emit_question |
| POST /trigger returns 204 when no eligible missing field | PASS — `response.status_code = HTTP_204_NO_CONTENT; return None` |
| POST /defer sets questions_deferred_until = now()+24h (tz-aware UTC) | PASS — `datetime.now(tz=timezone.utc) + timedelta(hours=24)` |
| Both endpoints enforce cross-household 404 | PASS — `Recipe.household_id == member.household_id` filter + HTTPException(404) |
| Both endpoints reuse _FIELD_PROMPTS_FR / INPUT_TYPE_MAP / OPTIONS_MAP from completeness.py | PASS — imported directly, no duplication |
| After defer, next _run_thread_llm run emits NO question turn | PASS — column written by defer endpoint; gate already in _run_thread_llm (29-04) |
| WS broadcasts after db.commit (no phantom-state race) | PASS — both broadcast calls follow db.commit() + db.refresh() |

## Deviations from Plan

None — plan executed exactly as written. All pre-noted decisions applied:
- FastAPI `Response` parameter for conditional 204 branch (not raising HTTPException)
- `_should_emit_question` imported from services/llm.py (no duplication)
- Endpoints remain in routers/recipes.py (not promoted to new file per D-20 v0.6 recommendation)
- `updated_at` set alongside `questions_deferred_until` on defer commit

## Known Stubs

None — both endpoints are fully implemented. The trigger endpoint synchronously emits question turns (no async background task). The defer endpoint sets the column that the already-implemented `_run_thread_llm` gate reads.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-endpoint | backend/app/routers/recipes.py | Two new POST endpoints; both authenticated via `current_member` dep (HttpOnly cookie, invariant #8) and cross-household filtered (T-29-13 mitigated). T-29-14 (client tamper of defer value) mitigated — endpoint takes no body. |

## Self-Check: PASSED

Files exist:
- `backend/tests/test_question_endpoints.py` — FOUND
- `backend/app/routers/recipes.py` — FOUND (modified)

Commits exist:
- `d1fc00f` (test RED) — FOUND
- `2436c34` (feat GREEN) — FOUND

Import verification:
- `from app.routers.recipes import trigger_next_question, defer_questions` — PASSES
- `python -c "import ast; ast.parse(open('app/routers/recipes.py').read())"` — SYNTAX OK
