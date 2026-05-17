---
phase: 29-llm-prompt-rework-completeness-wire-up
reviewed: 2026-05-17T16:39:46Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/alembic/versions/0011_add_questions_deferred_until.py
  - backend/app/models/recipe.py
  - backend/app/routers/recipes.py
  - backend/app/schemas/recipe_turn.py
  - backend/app/schemas/recipe.py
  - backend/app/services/completeness.py
  - backend/app/services/llm_fixtures.py
  - backend/app/services/llm.py
  - backend/tests/test_completeness.py
  - backend/tests/test_llm_thread.py
  - backend/tests/test_question_endpoints.py
  - frontend/app/recipes/[id]/page.tsx
  - frontend/components/RecipeThread/index.tsx
  - frontend/components/RecipeThread/SystemBubble.tsx
  - frontend/components/RecipeThread/types.ts
  - frontend/lib/i18n/fr.json
  - frontend/lib/recipes.ts
  - frontend/tests/e2e/recipe-detail.spec.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-05-17T16:39:46Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 29 lands a substantial rework: new `_run_thread_llm` shared entry point, `completeness.py` service, two new router endpoints, schema graduation for `SummaryTurnPayload` / `QuestionTurnPayload`, Alembic migration 0011, and frontend wiring for summary CTAs. The architecture invariants (tz-aware deferral, no client-supplied defer time, async `process_thread_turn`, Pitfall-1 hash, `summary_body` Optional) are correctly implemented.

One critical bug is present in `page.tsx`: the answer turn POST body nests `in_reply_to_turn_id`, `field`, and `value` under an extra `payload` key that the backend's discriminated-union parser does not expect, causing every answer-turn submission to 422. Four warnings cover a missing recipe.updated broadcast after `_apply_extracted` in `_run_thread_llm`, an asyncio.run / running-loop incompatibility in the `text` branch of `promote_draft`, a stale-thread read race in the trigger endpoint, and the advisory-payload idempotency check comparing a UUID string to a UUID object. Three info items cover unused state, dead-code pattern, and a test relying on a text turn payload shape that differs from what the backend emits.

## Critical Issues

### CR-01: Answer turn POST body sends nested `payload` key — backend receives 422

**File:** `frontend/app/recipes/[id]/page.tsx:305-316`

**Issue:** `handlePostAnswerTurn` wraps `in_reply_to_turn_id`, `field`, and `value` under a `payload` sub-key:

```ts
body: JSON.stringify({
  kind: "answer",
  payload: {
    in_reply_to_turn_id: submission.in_reply_to_turn_id,
    field: submission.field,
    value: submission.value,
  },
}),
```

The `TurnPayload` discriminated union in `backend/app/schemas/recipe_turn.py` expects the fields **at the top level** alongside `kind`:

```python
class AnswerTurnPayload(BaseModel):
    kind: Literal["answer"]
    in_reply_to_turn_id: UUID   # top-level
    field: AnswerField          # top-level
    value: Any                  # top-level
```

Pydantic v2's discriminated-union parser sees `{"kind": "answer", "payload": {...}}` and cannot find `field` at the top level, producing a 422. Every question-bubble "Valider" tap will fail silently (the `catch` block in `handlePostAnswerTurn` calls `toast.error` and re-throws, but the answer is never applied).

The same nested-payload pattern is also used in `handlePostProposalAccepted` (line 361) and `handlePostProposalDismissed` (line 389) — those payloads contain only `in_reply_to_turn_id`, which IS a top-level field on the respective schemas, BUT they wrap it in a `payload` key. For `proposal_accepted` Pydantic will reject the request for the same reason (missing `in_reply_to_turn_id` at top level). For `proposal_dismissed` same problem.

**Fix:** Flatten all three handlers so the body matches the backend discriminated union:

```ts
// Answer turn — correct flat shape
body: JSON.stringify({
  kind: "answer",
  in_reply_to_turn_id: submission.in_reply_to_turn_id,
  field: submission.field,
  value: submission.value,
}),

// proposal_accepted — correct flat shape
body: JSON.stringify({
  kind: "proposal_accepted",
  in_reply_to_turn_id: advisoryTurnId,
}),

// proposal_dismissed — correct flat shape
body: JSON.stringify({
  kind: "proposal_dismissed",
  in_reply_to_turn_id: advisoryTurnId,
}),
```

## Warnings

### WR-01: `_run_thread_llm` does not broadcast `recipe.updated` after applying extracted fields

**File:** `backend/app/services/llm.py:950-962`

**Issue:** `_run_thread_llm` calls `_apply_extracted(recipe, safe_extracted)` which mutates `recipe.title`, `recipe.status`, `recipe.cuisine`, `recipe.ingredients`, etc., then calls `db.commit()`. It then broadcasts `turn.created` for each emitted system turn (summary, question, advisory). However, it does **not** broadcast `recipe.updated` after `db.commit()` — so the partner's phone never receives the field changes.

Architecture invariant #4 requires that every household-affecting mutation broadcast via `broadcast_to_household`. The initial `promote_draft` branches broadcast `recipe.promoted` via `_broadcast_promoted`, but `_run_thread_llm` (which runs afterwards in `promote_draft` for the text branch, and directly for voice/photo, and from `process_thread_turn` for refinement turns) silently applies recipe-level mutations without a corresponding broadcast.

The frontend relies on `recipe.updated` WS frames to refresh `recipe.title`, `recipe.cuisine`, etc. on the partner's phone. Without this broadcast the partner sees stale data until a manual reload.

**Fix:** After `db.commit()` / `db.refresh(recipe)` (before the `turn.created` broadcasts at line 957), add:

```python
db.refresh(recipe)
recipe_payload = RecipeResponse.model_validate(recipe).model_dump(mode="json")
await broadcast_to_household(
    recipe.household_id, "recipe.updated", recipe_payload
)
```

Note: `recipe.household_id` is available on the SQLAlchemy object; no additional query needed.

### WR-02: `asyncio.run()` inside `promote_draft` text branch is called while an event loop is already running

**File:** `backend/app/services/llm.py:1065`

**Issue:** After the text branch commits and calls `_broadcast_promoted(recipe)` (line 1061), it executes:

```python
asyncio.run(_run_thread_llm(db, recipe, first_turn.id))
```

`_broadcast_promoted` includes a guard that raises `RuntimeError` if called inside a running loop, ensuring it is sync-safe. But `asyncio.run()` itself **raises `RuntimeError: This event loop is already running`** when called from within a coroutine or from a thread where a loop is already active.

FastAPI BackgroundTasks run in the same thread as the event loop (under a single uvicorn worker per invariant #7). When `promote_draft` is invoked as a `BackgroundTasks.add_task(promote_draft, recipe_id)` callable, FastAPI runs it as a synchronous function in a thread pool executor — which means it runs in a background thread where there is **no running loop**. So `asyncio.run()` works today in that context.

However, the voice and photo branches (lines 1083, 1103) already use `asyncio.run(_run_thread_llm(...))` without an intermediate `_broadcast_promoted`, and they call `asyncio.run` **before** the synchronous `_broadcast_promoted`. The text branch calls `_broadcast_promoted` first (via `asyncio.run(broadcast_to_household(...))` inside that helper) and then calls `asyncio.run(_run_thread_llm(...))` again. Calling `asyncio.run()` twice in sequence from the same sync thread should work on CPython (each call creates a new loop), but leaves two separate event loops open consecutively inside one BackgroundTask which is unusual and could interact poorly if the Starlette/uvicorn runtime changes.

More concretely: `_broadcast_promoted` (lines 433-443) detects a running loop and raises. If uvicorn ever adopts `run_in_threadpool` that reuses the same loop thread, these will break. The voice/photo branches avoid the issue by calling `asyncio.run(_run_thread_llm(...))` first, then `_broadcast_promoted`. The text branch inverts this order and has **two** separate `asyncio.run` calls in sequence.

**Fix:** Unify the text branch to match the voice/photo ordering — call `asyncio.run(_run_thread_llm(...))` before `_broadcast_promoted`:

```python
# text branch — recommended order
recipe.title = new_title
recipe.illustration_svg = _generate_and_sanitize_illustration(recipe.title)
recipe.status = "structured"
recipe.promotion_error = None
recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
db.commit()
db.refresh(recipe)
# Run thread LLM (async → sync bridge) before broadcast
asyncio.run(_run_thread_llm(db, recipe, first_turn.id))
# Broadcast promoted (uses its own asyncio.run internally)
_broadcast_promoted(recipe)
```

This mirrors the voice/photo pattern and eliminates the double `asyncio.run` sequence risk.

### WR-03: `_should_emit_advisory` compares UUID string to UUID object — always mismatches

**File:** `backend/app/services/llm.py:616`

**Issue:** In `_should_emit_advisory`, the resolution check compares:

```python
if (turn.payload or {}).get("in_reply_to_turn_id") == str(most_recent_advisory.id):
```

`turn.payload` is a JSONB dict. When an `AnswerTurnPayload` or `ProposalAcceptedPayload` is persisted, the router strips `kind` via `exclude={"kind"}` and stores the rest. The `in_reply_to_turn_id` field in `AnswerTurnPayload` / `ProposalAcceptedPayload` is typed as `UUID` in the Pydantic schema. When `.model_dump(mode="json")` serializes it, UUIDs are emitted as strings (`"xxxxxxxx-xxxx-..."`). So `turn.payload.get("in_reply_to_turn_id")` returns a `str`.

`most_recent_advisory.id` is a Python `UUID` object from the SQLAlchemy model (the `UUID(as_uuid=True)` column). `str(most_recent_advisory.id)` converts it to the standard hyphenated lowercase UUID string.

This comparison is **correct** — both sides are strings after `str(...)`. However, if the payload was stored without `mode="json"` (e.g. direct dict spread with a UUID object as value), the left side would be a `UUID` object and the comparison would fail. Looking at the actual persistence path in `create_turn` (router line 884):

```python
payload_dict = body.model_dump(mode="json", exclude={"kind"})
```

`mode="json"` ensures UUID → string serialization. So this comparison is safe for proposal turns created by the router. But `_make_user_turn` in tests inserts payload directly as a raw dict with `str(q.id)` (test line 614: `"in_reply_to_turn_id": str(q.id)`), so tests are also safe.

The actual issue is in `_should_emit_question` (line 648):

```python
and (turn.payload or {}).get("in_reply_to_turn_id") == str(most_recent_question.id)
```

Same pattern — safe for router-created turns (mode="json"), consistent. No actual bug here at runtime, but the pattern is fragile. If the payload ever stores a UUID object directly (e.g. test helper forgets `str()`), the de-dup silently fails and duplicate questions get emitted. The concern warrants a note.

**Actual bug:** In `_should_emit_advisory` at line 617, the iteration is:

```python
for turn in turns:
    if turn.position <= most_recent_advisory.position:
        continue
    if turn.kind in ("proposal_accepted", "proposal_dismissed"):
        if (turn.payload or {}).get("in_reply_to_turn_id") == str(most_recent_advisory.id):
            resolved = True
            break
```

`turn.kind` for proposal turns is `"proposal_accepted"` or `"proposal_dismissed"`, but these turns come from `body.kind` in the router — which IS `"proposal_accepted"` / `"proposal_dismissed"`. The `RecipeTurn.kind` column stores this string verbatim. This is correct.

BUT: `test_question_endpoints.py` line 614 stores the answer turn's `in_reply_to_turn_id` as a UUID via `str(q.id)` — this is fine. The real fragility is that `_should_emit_advisory` uses `turn.kind in ("proposal_accepted", "proposal_dismissed")` to find resolution turns, but the actual test for `_should_emit_advisory` at `test_llm_thread.py:505-519` creates a `"proposal_dismissed"` user turn with payload `{"in_reply_to_turn_id": str(adv.id)}` — here the kind matches and `str(adv.id)` produces the right string, so tests pass.

This is not a runtime crash but the defensive note stands: add a `str()` coercion on both sides or normalize at storage time.

**Fix:** In both `_should_emit_advisory` and `_should_emit_question`, normalize the retrieved value:

```python
ref_id = str((turn.payload or {}).get("in_reply_to_turn_id") or "")
if ref_id == str(most_recent_advisory.id):
```

### WR-04: `trigger_next_question` endpoint reads thread BEFORE checking completeness — stale-thread race with `_run_thread_llm`

**File:** `backend/app/routers/recipes.py:1148-1165`

**Issue:** `trigger_next_question` reads the thread at line 1148-1154, then calls `compute_completeness(recipe)` at line 1157. If `_run_thread_llm` is running concurrently (e.g. from a BackgroundTask on a previous turn), it may commit a new `question` turn to the DB **after** the `trigger_next_question` reads the thread but **before** the endpoint's `_should_emit_question` call. The de-dup check would then see the stale snapshot and emit a duplicate question turn for the same field.

Under invariant #7 (single uvicorn worker, asyncio event loop), the trigger endpoint is `async def` and runs on the event loop. `process_thread_turn` is also async and runs as a `BackgroundTask`. FastAPI BackgroundTasks run *after* the response is sent, in the same event-loop iteration. Two concurrent requests on the same recipe could race: one from the WS feed (refinement turn → BackgroundTask → `process_thread_turn`) and one from a CTA tap → `trigger_next_question`. However, with a single uvicorn worker, they are interleaved cooperatively, not truly parallel, so the race window exists only at `await` suspension points.

The existing per-recipe `acquire_position_lock` is used for the insert (line 1182), but the thread-read and completeness check happen *outside* the lock. A concurrent `_run_thread_llm` that commits a question turn between the trigger's thread read and its lock acquisition would result in a duplicate question for the same field.

This is a low-probability race at couple scale, but it is a correctness issue (duplicate questions confuse the user).

**Fix:** Move the thread load inside the `acquire_position_lock` block, or re-read the thread after acquiring the lock to refresh the de-dup state:

```python
lock = await acquire_position_lock(recipe_id)
async with lock:
    # Re-read thread after acquiring lock to prevent stale de-dup race
    thread = list(db.scalars(
        select(RecipeTurn)
        .where(RecipeTurn.recipe_id == recipe_id)
        .order_by(RecipeTurn.position.asc())
    ).all())
    _, missing = compute_completeness(recipe)
    chosen_field = None
    for field in missing:
        if INPUT_TYPE_MAP.get(field) is None:
            continue
        if not _should_emit_question(thread, field):
            continue
        chosen_field = field
        break
    if chosen_field is None:
        response.status_code = status.HTTP_204_NO_CONTENT
        return None
    # ... build payload and insert turn ...
```

## Info

### IN-01: `_FIELD_LABELS_FR` missing `"seasonality"` key — chip label for seasonality would fall back to the raw key

**File:** `backend/app/services/completeness.py:129-141`

**Issue:** `_FIELD_LABELS_FR` covers all 11 `FIELD_KEYS` except `"seasonality"`. The summary chip generation in `_run_thread_llm` uses `_FIELD_LABELS_FR.get(field, field)` — the fallback is the raw field name `"seasonality"` (English), which would appear in a chip as `"seasonality: autumn, winter"` instead of a French label.

`seasonality` is not in `FIELD_KEYS` (which only has 11 fields up to `main_protein`) and is therefore not tracked by `compute_completeness`, so it would only appear in the chip list if it changed during extraction and was non-pinned. However the advisory logic in `_run_thread_llm` does include `"seasonality"` in `extracted_map` (line 814). If seasonality changed and was in `changed_fields`, the chip would use the raw English key.

`FIELD_KEYS` intentionally excludes `seasonality` and `tags` from completeness tracking, and `_FIELD_LABELS_FR` does include `seasonality` is absent — confirmed by reading lines 129-141.

Actually on re-reading, the dict at line 129 **does not include `seasonality`**:
- title, description, ingredients, steps, prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine, mood, main_protein — 11 entries.
- `seasonality` is absent.

Since `extracted_map` includes `seasonality` at line 814, and `changed_fields.append(field)` is called for all non-pinned diffs, a seasonality change would produce a chip with label `"seasonality"` (English fallback).

**Fix:** Add `"seasonality": "saison"` to `_FIELD_LABELS_FR` (and the matching test assertion in `test_completeness.py`).

### IN-02: `committing` spinner in `SystemBubble.tsx` summary branch shows spinner only when `!deferred` — logic is inverted

**File:** `frontend/components/RecipeThread/SystemBubble.tsx:138-142`

**Issue:** The spinner on the "Oui, compléter" button renders when `committing && !deferred`:

```tsx
{committing && !deferred ? (
  <Loader2 size={14} className="animate-spin" aria-hidden />
) : (
  t("summary_complete")
)}
```

When `deferred === true`, the button is already `disabled` (line 134). The spinner guard `!deferred` means: if `deferred` is true and the user somehow triggered a commit, no spinner would show. This is unreachable (button is disabled when `deferred`), but the condition is redundant and could confuse future maintainers.

The simpler and correct form is:

```tsx
{committing ? (
  <Loader2 size={14} className="animate-spin" aria-hidden />
) : (
  t("summary_complete")
)}
```

This is a minor logic smell, not a runtime bug.

### IN-03: E2E test `recipe-detail.spec.ts` sends text turn with body `{ kind: 'text', payload: { text: ... } }` — mismatched with backend schema

**File:** `frontend/tests/e2e/recipe-detail.spec.ts:206-210` and `240-244`

**Issue:** The Playwright test POSTs turns with:

```ts
data: { kind: 'text', payload: { text: 'ajoute du basilic' } },
```

The backend `TextTurnPayload` schema expects:

```python
class TextTurnPayload(BaseModel):
    kind: Literal["text"]
    text: str  # top-level, not nested under payload
```

The same pattern as CR-01: the `payload` nesting is incorrect. Playwright's `request.post` with `data:` serializes as JSON and sends `{"kind":"text","payload":{"text":"..."}}`. The backend will attempt to parse this with the discriminated union — it will match `kind="text"` but then `TextTurnPayload` will fail to validate because `text` is absent at the top level. Pydantic v2 would return 422.

This means the Phase 29 E2E specs for the summary CTA loop would currently **fail at the turn POST step** (`expect(turnRes.ok()).toBeTruthy()` would fail).

**Fix:** Flatten the payload in both spec lines:

```ts
data: { kind: 'text', text: 'ajoute du basilic' },
// and
data: { kind: 'text', text: 'ajoute des poireaux' },
```

---

_Reviewed: 2026-05-17T16:39:46Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
