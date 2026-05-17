---
phase: 26
plan: 03
type: execute
status: complete
authored_by: orchestrator
note: |
  The router endpoints + handler helpers in this plan were implemented by the
  worktree-agent-a5fa96eb72af63630 executor as a Rule 3 (blocking dependency)
  deviation — its plan 26-04 pytest suite could not exist without the endpoints.
  The realtime.py docstring + CLAUDE.md invariant #4 updates were applied inline
  by the orchestrator after merging.
requirements_addressed: [TURN-01, TURN-02, TURN-03, TURN-04]
---

# Plan 26-03 — Thread endpoints + realtime contract update

## What was built

Three new endpoints in `backend/app/routers/recipes.py`:

- **`POST /recipes/{id}/turns`** — JSON-bodied turn append. Validates the body
  against `TurnPayload` (discriminated on `kind`), serializes position assignment
  under `await acquire_position_lock(recipe_id)`, persists the turn, broadcasts
  `turn.created` with `TurnResponse` JSON, and dispatches the kind-specific
  BackgroundTask per the D-22 matrix:

  | kind                 | BackgroundTask                                    |
  |----------------------|---------------------------------------------------|
  | `text`/`voice`       | `services/llm.process_thread_turn`                |
  | `url`                | `services/llm.extract_and_process_url_turn`       |
  | `answer`             | none — `_apply_answer_turn` mutates inline        |
  | `proposal_accepted`  | none — `_apply_proposal_accepted` mutates inline  |
  | `proposal_dismissed` | none — `_validate_proposal_dismissed_ref` only    |

- **`POST /recipes/{id}/turns/photo`** — multipart upload variant. Uploads each
  file to Supabase Storage, then creates a `photo` turn with `photo_paths` in
  the payload, broadcasts `turn.created`, and schedules `process_thread_turn`.

- **`GET /recipes/{id}/turns`** — flat list of `TurnResponse` ordered by
  `position ASC`; returns `404` on cross-household access (no leak), `200 []`
  on empty.

Three internal helpers in the same file:

- `_apply_answer_turn(db, recipe, body)` — atomically inserts the answer turn,
  writes the value to `recipes.<field>`, and appends `<field>` to
  `manually_edited_fields` using set semantics (sorted on write).
- `_apply_proposal_accepted(db, recipe, body)` — validates the referenced
  advisory exists in the thread, applies `proposed_value`, **removes** the
  field from `manually_edited_fields`.
- `_validate_proposal_dismissed_ref(db, recipe, body)` — pure validation; no
  state mutation, no LLM call.

## Realtime contract

`services/realtime.py` module docstring updated to list `turn.created` (POST
time, all user kinds) and `turn.updated` (D-29 — fired only by
`extract_and_process_url_turn` after it backfills `extracted_html_path`; never
re-broadcast for the same turn).

`CLAUDE.md` invariant #4 updated with the same two event types plus a one-line
explanation of who fires which.

## Legacy `# TODO(productize)` removed

The pre-Phase-26 URL extraction TODO at `recipes.py:621-625` is gone — URL
extraction now runs as the `extract_and_process_url_turn` BackgroundTask
scheduled by the unified `POST /recipes/{id}/turns` endpoint, closing the
long-standing productize debt.

## Key files

### Created
- (none — all changes are edits)

### Modified
- `backend/app/routers/recipes.py` — +394 lines (three endpoints + three helpers + imports)
- `backend/app/services/realtime.py` — +2 lines (docstring event list)
- `CLAUDE.md` — invariant #4 expanded by one line

## Architecture invariants honoured

- **#1 (server-side promotion)** — text/voice/photo/url turns all promote via
  BackgroundTask; never client-side.
- **#4 (realtime contract)** — every persisted user turn broadcasts before the
  request returns; the docstring + CLAUDE.md are now the canonical event list.
- **#5 (raw inputs preserved)** — turn payloads keep the original text /
  transcript / URL / photo paths.
- **#7 (single uvicorn worker)** — `acquire_position_lock` is an in-process
  `WeakValueDictionary[recipe_id → asyncio.Lock]`; a `TODO(productize)` on
  `services/thread.py` flags the `pg_advisory_xact_lock` swap needed at
  scale-out.

## Commits

- `c51b1c9 feat(26-03): add POST/GET /turns endpoints + answer/proposal handlers to recipes.py` (from worktree-agent-a5fa96eb72af63630)
- Inline orchestrator edit: realtime.py docstring + CLAUDE.md invariant #4 (this commit)
