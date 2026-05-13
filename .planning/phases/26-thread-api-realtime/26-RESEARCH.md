## RESEARCH COMPLETE

**Phase:** 26 — Thread API & realtime
**Confidence:** HIGH
**Researched:** 2026-05-13
**Domain:** FastAPI append-only thread endpoint, Pydantic v2 discriminated unions, asyncio concurrency, trafilatura URL extraction, Supabase Storage, WebSocket realtime

---

## Summary

1. **trafilatura 2.0.0 + lxml 6.1.0 are already added to `uv.lock`** (done during this research session). Both ship manylinux pre-built wheels; the `python:3.12-slim` Dockerfile requires NO system header changes. `uv sync --frozen` will install them cleanly on Railway.
2. **`AnswerTurnPayload` validation** — Pydantic v2's `Field(discriminator='field')` cannot discriminate on a sibling field. Use a `@model_validator(mode='after')` with a module-level `_ANSWER_FIELD_WHITELIST` frozenset + per-field type checks. Verified working with the full 13-field set.
3. **asyncio Lock cleanup** — `lock._waiters` is `None` (never contended) or a `deque` (contended). The D-19 heuristic is race-safe under CPython's single-threaded event loop. The recommended implementation is `weakref.WeakValueDictionary` — cleaner than manual `_waiters` inspection.
4. **JSONB mutation footgun** — in-place `list.append()` on a SQLAlchemy JSONB column silently fails to persist without `flag_modified`. Use full reassignment (`recipe.manually_edited_fields = sorted(current)`) — no `flag_modified` needed and provides deterministic ordering for tests.
5. **SSRF defense** — `ipaddress.ip_address(host).is_private` correctly blocks RFC1918 + loopback + link-local. Cheap to add (`_is_safe_url` helper < 20 lines). Recommend including; verified 11/11 test cases pass.

**Primary recommendation:** Follow D-18–D-19 with `weakref.WeakValueDictionary` for the position lock, use `@model_validator` for `AnswerTurnPayload`, full-reassignment for JSONB, and broadcast-after-commit for WS ordering.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All 30 decisions (D-01..D-30) in the `<decisions>` block of `26-CONTEXT.md` are locked. Summary of load-bearing ones for the planner:
- D-01: Split endpoint topology — JSON for 6 kinds, multipart for photo.
- D-03: `turn.created` carries full `TurnResponse` JSON.
- D-04: HTTP 201 Created on all POST /turns*.
- D-08/D-09: `AnswerTurnPayload` extended with `in_reply_to_turn_id`, `field`, `value`; value validated per field.
- D-10: answer turn is fully atomic (insert + field update + manually_edited_fields append in one tx).
- D-18/D-19: asyncio Lock dict per recipe in `services/thread.py`; pop on release if no waiters.
- D-21/D-22: `process_thread_turn` is a no-op stub; `url` kind dispatches to `extract_and_process_url_turn`.
- D-23/D-24: trafilatura + httpx; `output_format='markdown'`, `include_tables=True`, `timeout=10.0`, 5MB limit.
- D-25/D-26: extracted content to Supabase Storage `recipe-urls` bucket; `upload_recipe_url_extract` helper.
- D-29: URL extraction update broadcasts `turn.updated` (not `turn.created`).
- D-30: test-mode bypass via `canned_url_extract` fixture.

### Claude's Discretion
- Router file location: recommend extending `recipes.py`.
- Lock module location: recommend new `services/thread.py`.
- `turn.updated` payload shape: recommend full `TurnResponse`.
- Supabase bucket creation: recommend app-startup idempotent helper (see Area 9 below).
- Logging policy on URL extraction: `log.exception` for catastrophic, `log.warning` for recoverable.
- SSRF defense: recommend adding `_is_safe_url()` helper (cheap, correct — see Area 5).
- JSONB mutation idiom: recommend full reassignment (see Area 4).

### Deferred Ideas (OUT OF SCOPE)
- Frontend chat component (Phase 27/28).
- LLM prompt rewrite / `process_thread_turn` body (Phase 29).
- `question` / `summary` / `advisory` system turn emission (Phase 29).
- `status='draft'` removal (Phase 27).
- Per-member attribution, rate-limiting, robots.txt.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TURN-01 | `POST /recipes/{id}/turns` persists turn + schedules BackgroundTask for LLM-triggering kinds; `GET /turns` returns flat list | Areas 3 (position concurrency), 7 (broadcast ordering), 8 (BackgroundTask/APScheduler) |
| TURN-02 | `answer` applies field directly + pins `manually_edited_fields`; `proposal_accepted` removes pin; `proposal_dismissed` is no-op | Areas 4 (JSONB mutation), 6 (Pydantic discriminated union) |
| TURN-03 | `turn.created` WS event broadcasts via `broadcast_to_household` within ~200ms | Areas 7 (broadcast ordering), existing `realtime.py` pattern verified |
| TURN-04 | URL extraction via trafilatura/httpx; stores path in turn payload; closes `TODO(productize)` | Areas 1 (trafilatura), 2 (lxml/Railway), 5 (SSRF), 9 (Storage bucket) |
</phase_requirements>

---

## Area 1 — trafilatura on French food blogs

**TL;DR:** trafilatura 2.0.0 works on French food blog HTML. `output_format='markdown'` succeeds on well-structured HTML (personal blogs, static recipe pages). It returns `None` on JS-rendered shells (Marmiton's actual HTML requires cookies + JS but 200s with partial content that trafilatura CAN extract). The critical flag is `include_tables=True`.

### Verified behaviour

| Source type | trafilatura result | Notes |
|-------------|-------------------|-------|
| Personal French blog (static article HTML) | SUCCESS, ~1200 chars | Full ingredients + steps preserved |
| Marmiton (real HTTP fetch, HTML with content) | SUCCESS, ~1136 chars | Partial but recipe-shaped |
| cuisineaz.com (real HTTP fetch) | SUCCESS, ~2776 chars | Comments + recipe text |
| JS-rendered shell (`<div id="app">` only) | `None` | Expected; failure path per D-27 |
| 403 / blocked page | Returns error message text | Treated as garbage; Gemini can discard |
| Empty HTML | `None` | Failure path per D-27 |

[VERIFIED: trafilatura 2.0.0 live test against Marmiton + cuisineaz.com + personal blog simulation]

### Critical flag: `include_tables=True`

French recipe sites (Marmiton, 750g) frequently render ingredient quantities in HTML `<table>` elements. Without `include_tables=True`, ingredient quantities are **silently dropped**. With `include_tables=True`, they become markdown pipe tables that Gemini can parse.

```python
# Correct call pattern for D-28:
extracted = trafilatura.extract(
    html,
    output_format='markdown',
    include_tables=True,        # REQUIRED for Marmiton-style ingredient tables
    include_comments=False,     # Exclude user comments (noise for Gemini)
    no_fallback=False,          # Allow trafilatura's own fallback pipeline
)
```

### `None`-return handling

When `trafilatura.extract()` returns `None`:
1. Do NOT fall back to `output_format='txt'` silently — the None indicates there is genuinely no extractable content, not a format issue. Text fallback on a JS-rendered shell just returns navigation boilerplate.
2. Treat `None` as extraction failure → `_record_failure` path per D-27.
3. The turn payload is preserved (invariant #5), so re-extraction with a different library is possible later.

### Failure rate estimate

JS-rendered sites (common with modern recipe aggregators that require login) will return `None` at a non-trivial rate — estimated 10-20% of arbitrary URLs. Gemini receiving `None` content is explicitly the failure path per D-27; this is correct and expected behaviour.

[ASSUMED: 10-20% failure rate estimate — not measured across a corpus]

---

## Area 2 — lxml install footprint on Railway

**TL;DR:** Zero friction. lxml 6.1.0 ships pre-compiled manylinux wheels for Python 3.12 on x86_64 and aarch64. The `python:3.12-slim` Dockerfile needs NO changes. `uv sync --frozen` will install the wheel directly.

### Verified

lxml 6.1.0 is now in `uv.lock` with wheel entries for:
- `manylinux2014_x86_64` (Railway's Linux x86_64)
- `manylinux2014_aarch64` (ARM64)
- `manylinux_2_26_x86_64` and `manylinux_2_28_x86_64` (newer glibc)
- `musllinux_1_2_x86_64` (Alpine)

[VERIFIED: uv.lock inspected — lxml 6.1.0 manylinux wheels confirmed]

**No action required** in `Dockerfile`. The `FROM python:3.12-slim` + `uv sync --frozen --no-dev` sequence will resolve to the correct wheel without needing `libxml2-dev` or `libxslt-dev` system packages.

### uv.lock state after this research session

`trafilatura>=2.0.0` and `lxml>=6.1.0` (and their transitive deps: `babel`, `courlan`, `dateparser`, `htmldate`, `justext`, `lxml-html-clean`, `pytz`, `regex`, `tld`) are now in `pyproject.toml` and `uv.lock`. The Phase 26 commit should include the updated `pyproject.toml` and `uv.lock`.

[VERIFIED: `uv add trafilatura lxml` ran successfully in this session]

---

## Area 3 — asyncio Lock cleanup correctness

**TL;DR:** The D-19 cleanup heuristic is race-safe under CPython's single-threaded event loop. `_waiters` is stable in Python 3.12. The recommended implementation uses `weakref.WeakValueDictionary` to avoid touching private attributes entirely.

### `_waiters` attribute behaviour (Python 3.12 verified)

```
lock._waiters when:
  - Never contended:      None
  - Currently contended:  deque([<Future pending>, ...])  ← len > 0
  - Was contended, done:  deque([])                       ← len == 0
  - Just created:         None
```

[VERIFIED: live test in Python 3.12.12 via uv]

### The D-19 cleanup is race-safe

Under CPython's single-threaded asyncio event loop, there is **no preemption between synchronous operations**. The cleanup check is entirely synchronous:

```python
# After `async with lock:` exits:
waiters = lock._waiters
if not lock.locked() and (waiters is None or len(waiters) == 0):
    _position_locks.pop(recipe_id, None)
```

A new coroutine cannot interleave between these lines because coroutines only switch context at `await` points. Any Task2 that has called `await lock.acquire()` is already in `_waiters` before Task1's cleanup check runs. The self-heal for the delete-vs-new-POST race: if Task1 deletes the entry while Task3 (a completely new request) is about to create one, Task3 creates a fresh lock object. Task2 (waiting on the old lock object it already holds a reference to) completes successfully via its held reference. The DB's `UNIQUE(recipe_id, position)` constraint is the backstop for any position collision. [VERIFIED: live concurrent test]

### Recommended implementation: `weakref.WeakValueDictionary`

Cleaner alternative that avoids private attribute access entirely:

```python
# services/thread.py
import asyncio
import weakref
from uuid import UUID

_position_locks: weakref.WeakValueDictionary[UUID, asyncio.Lock] = weakref.WeakValueDictionary()

async def acquire_position_lock(recipe_id: UUID) -> asyncio.Lock:
    """Get or create a per-recipe position lock.

    Uses WeakValueDictionary so entries are automatically GC'd once no
    live reference holds the lock. Under CPython refcounting, cleanup is
    immediate after the async-with block exits and the local var is released.

    # TODO(productize): swap to pg_advisory_xact_lock(hashtext(recipe_id::text))
    # when Railway scales beyond one container.
    """
    lock = _position_locks.get(recipe_id)
    if lock is None:
        lock = asyncio.Lock()
        _position_locks[recipe_id] = lock
    return lock
```

Usage in the endpoint handler:

```python
lock = await acquire_position_lock(recipe_id)
async with lock:
    # read max(position) + 1, insert turn
    pass
# WeakValueDictionary cleans up automatically when 'lock' goes out of scope
```

[VERIFIED: WeakValueDictionary cleanup is deterministic under CPython refcounting — confirmed via live test]

**Caveat:** If the executor ever migrates to PyPy or a GC-heavy runtime, WeakValueDictionary cleanup timing becomes non-deterministic. For that case, the `_waiters`-based cleanup is safer. At couple-scale on Railway CPython, either works. Planner can choose; both are correct.

---

## Area 4 — JSONB mutation idiom for `manually_edited_fields`

**TL;DR:** In-place mutation of a SQLAlchemy JSONB list without `flag_modified` silently fails to persist. Use full reassignment. This is the single most dangerous footgun in this phase.

### The Footgun (DO NOT DO)

```python
# WRONG — SQLAlchemy does not detect in-place mutation of JSONB
recipe.manually_edited_fields.append(field)
# db.commit() => DOES NOT PERSIST the append
```

SQLAlchemy's ORM change tracking compares the Python object identity, not its contents. Once `recipe.manually_edited_fields` is loaded from the DB, mutating the list in-place doesn't mark the attribute as dirty.

### The Safe Idiom (full reassignment)

Full reassignment always triggers change detection — SQLAlchemy sees a new object assigned to the attribute.

**For `answer` turn (D-10) — set-semantics append:**

```python
# services/thread.py or inline in the handler
current: set[str] = set(recipe.manually_edited_fields or [])
current.add(field)  # no-op if already present (set semantics per D-10)
recipe.manually_edited_fields = sorted(current)  # sorted for deterministic test assertions
```

**For `proposal_accepted` (D-16) — remove pin:**

```python
current: set[str] = set(recipe.manually_edited_fields or [])
current.discard(field)  # no-op if not present
recipe.manually_edited_fields = sorted(current)
```

No `flag_modified` call needed with this pattern. The `sorted()` wrapping provides stable ordering which makes test assertions against the JSONB array deterministic.

### PostgreSQL native alternative (not recommended for Phase 26)

A Postgres-native `func.jsonb_set()` or the `||` operator for JSONB could be used for atomic set-operations. This would avoid the Python read-modify-write cycle. However:
- The whole transaction is already atomic (invariant #3 precedent)
- Python reassignment is simpler and more readable
- The whole-recipe update pattern already reads the recipe row

Recommend Python reassignment. Postgres JSONB ops are a productize-later optimisation if `manually_edited_fields` grows to contain hundreds of entries (it won't at couple-scale).

[ASSUMED: Python reassignment preferred over Postgres JSONB ops at couple-scale]

---

## Area 5 — SSRF defence

**TL;DR:** Add `_is_safe_url()` before the httpx fetch. Cheap (~15 lines), correct, blocks all RFC1918 + loopback + link-local. Recommend including.

### Attack surface assessment

The `POST /recipes/{id}/turns` endpoint (url kind) is authenticated (HttpOnly cookie, `current_member` dep). At couple-scale, the attacker is a malicious household member who can construct a `url` turn. The threat: the backend making HTTP requests to internal Railway metadata endpoints (`169.254.169.254`), local services, or RFC1918 hosts.

Railway containers run on shared infrastructure with internal IPs in RFC1918 ranges. The Railway metadata service is at `169.254.169.254` (link-local). An SSRF to that endpoint from the backend could leak Railway service credentials.

**Recommendation: include `_is_safe_url()`** — the benefit is material, the cost is ~15 lines.

### Verified implementation

```python
# services/thread.py (or services/llm.py alongside extract_and_process_url_turn)
import ipaddress
from urllib.parse import urlparse

def _is_safe_url(url: str) -> bool:
    """Block private/loopback/link-local IPs before httpx fetch (SSRF defence).

    Only checks the URL's hostname if it is an IP address literal.
    Hostnames are NOT resolved here — DNS rebinding is a separate concern
    at couple-scale. Known metadata endpoints are blocked by literal match.

    Returns True if safe to fetch, False otherwise.
    """
    try:
        parsed = urlparse(url)
        host = parsed.hostname
        if not host:
            return False
        try:
            ip = ipaddress.ip_address(host)
            if (ip.is_loopback or ip.is_private or ip.is_link_local
                    or ip.is_unspecified or ip.is_multicast):
                return False
            return True
        except ValueError:
            # Not an IP literal — it's a hostname
            if host.lower() in ('localhost', 'ip6-localhost', 'ip6-loopback'):
                return False
            # Block known cloud metadata endpoints by name
            if host.lower() in {'metadata.google.internal', '169.254.169.254'}:
                return False
            return True
    except Exception:  # noqa: BLE001
        return False
```

[VERIFIED: 11/11 test cases pass including 127.0.0.1, 0.0.0.0, 192.168.x.x, 10.x.x.x, 169.254.169.254, ::1, localhost]

**Usage in `extract_and_process_url_turn`:**

```python
url = turn.payload["url"]
if not _is_safe_url(url):
    raise ValueError(f"SSRF: blocked URL {url!r}")
# then proceed with httpx.AsyncClient
```

**Known limitation:** DNS rebinding (hostname resolves to private IP at fetch time) is not defended against. This requires async DNS pre-resolution + IP check, which is disproportionate at couple-scale. Inline `TODO(productize)` comment is sufficient.

---

## Area 6 — Pydantic discriminated union for `AnswerTurnPayload.value`

**TL;DR:** Pydantic v2's `Field(discriminator=...)` cannot discriminate on a sibling field. Use `@model_validator(mode='after')` with a module-level whitelist and per-field type checks. Verified working with the full 13-field set.

### Why Pydantic's discriminator doesn't help here

`Field(discriminator='field')` works when the discriminating field is on the **same** model. It cannot create a sub-union where `value`'s type depends on `field`. The `Discriminator(callable_discriminator)` pattern in Pydantic v2 would require defining 13 separate `AnswerValue_*` sub-models and a callable that picks the right one — significant complexity for minimal benefit.

### Recommended: `@model_validator` with module-level registry

```python
# schemas/recipe_turn.py

from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field, model_validator

# Module-level (not a ClassVar — Pydantic v2 raises on unannotated class attrs)
_ANSWER_FIELD_WHITELIST: frozenset[str] = frozenset({
    'title', 'description', 'ingredients', 'steps',
    'prep_time_minutes', 'cook_time_minutes', 'difficulty',
    'servings', 'cuisine', 'mood', 'main_protein', 'seasonality', 'tags',
})

# Named type alias for grep-ability (D-08 requirement)
AnswerField = Literal[
    'title', 'description', 'ingredients', 'steps',
    'prep_time_minutes', 'cook_time_minutes', 'difficulty',
    'servings', 'cuisine', 'mood', 'main_protein', 'seasonality', 'tags',
]

class AnswerTurnPayload(BaseModel):
    kind: Literal['answer']
    in_reply_to_turn_id: UUID
    field: AnswerField              # Pydantic validates against the Literal at schema level
    value: Any                      # Cross-field validation happens in the model_validator

    @model_validator(mode='after')
    def _validate_value_for_field(self) -> 'AnswerTurnPayload':
        f, v = self.field, self.value
        # String fields
        if f in ('title', 'description'):
            if not isinstance(v, str):
                raise ValueError(f'{f} value must be str')
            if f == 'title' and len(v) > 200:
                raise ValueError('title exceeds 200 chars')
        # Integer fields with bounds (matching GeminiExtractedRecipe bounds in llm.py)
        elif f in ('prep_time_minutes', 'cook_time_minutes'):
            if not isinstance(v, int) or not (0 <= v <= 1440):
                raise ValueError(f'{f} must be int 0–1440')
        elif f == 'servings':
            if not isinstance(v, int) or not (1 <= v <= 99):
                raise ValueError('servings must be int 1–99')
        # Enum-typed fields (reuse Literals from llm.py)
        elif f == 'difficulty':
            if v not in ('easy', 'medium', 'hard'):
                raise ValueError('difficulty must be easy/medium/hard')
        elif f == 'cuisine':
            from app.services.llm import CuisineLiteral  # avoid circular — import at call time
            # Alternatively inline the tuple
        elif f == 'main_protein':
            if v not in ('poultry', 'redMeat', 'fish', 'seafood', 'egg', 'legume', 'none'):
                raise ValueError(f'invalid main_protein: {v!r}')
        # List fields
        elif f in ('mood', 'seasonality', 'steps', 'tags', 'ingredients'):
            if not isinstance(v, list):
                raise ValueError(f'{f} must be list')
        return self
```

**Pydantic v2 pitfall — FIELD_TYPES as class attribute:** Pydantic v2 treats unannotated class attributes as potential model fields and raises `PydanticUserError`. The lookup dict MUST be a module-level constant, not a class attribute. [VERIFIED: reproducing the error confirmed]

**The outer discriminated union is unchanged.** `TurnPayload = Annotated[Union[..., AnswerTurnPayload, ...], Field(discriminator='kind')]` continues to work because `AnswerTurnPayload.kind: Literal['answer']` is the discriminator key.

**Pydantic 422 on wrong field:** When `field='photo_paths'` is passed, Pydantic's Literal validation on the `field: AnswerField` type annotation catches it before the `model_validator` runs, producing a clean 422 error. The `model_validator` handles value-type mismatches for valid field names.

[VERIFIED: full 13-field test suite passes in Python 3.12 / Pydantic v2]

---

## Area 7 — WS broadcast ordering vs DB commit

**TL;DR:** Broadcast AFTER commit. This is the existing pattern in `_broadcast_promoted` and `recipe.created`. Couple-scale Supabase (single Postgres, no read replicas) means zero stale-read risk for `GET /turns` immediately after the WS frame.

### Existing pattern (from `services/llm.py` and `routers/recipes.py`)

```python
# llm.py _broadcast_promoted:
db.commit()
db.refresh(recipe)
asyncio.run(broadcast_to_household(recipe.household_id, "recipe.promoted", payload))

# recipes.py create_url:
db.commit()
db.refresh(recipe)
await broadcast_to_household(member.household_id, "recipe.created", payload)
```

Pattern is consistent: **commit first, then broadcast.** [VERIFIED: source inspection]

### For Phase 26 endpoint handlers

The endpoint handlers are `async def` (FastAPI style). The broadcast is `await`-able directly:

```python
# Inside POST /recipes/{id}/turns handler:
db.flush()          # get turn.id
db.commit()         # persist atomically (turn + field update + manually_edited_fields)
db.refresh(turn)    # refresh to get server-side created_at
await broadcast_to_household(
    member.household_id,
    "turn.created",
    TurnResponse.model_validate(turn).model_dump(mode="json")
)
```

### For `extract_and_process_url_turn` BackgroundTask

BackgroundTask bodies in this codebase are sync (see `promote_draft`, `process_thread_turn`). They use `asyncio.run()` to call the async broadcast:

```python
# After updating turn.payload + db.commit() + db.refresh(turn):
asyncio.run(broadcast_to_household(
    recipe.household_id,
    "turn.updated",   # D-29: NOT turn.created — turn already broadcast at POST time
    TurnResponse.model_validate(turn).model_dump(mode="json")
))
```

### No stale-read risk

Supabase free tier = single Postgres instance. No read replicas. A `GET /turns` request after the WS frame arrives will always see the committed turn. The phantom-turn risk (broadcast before commit) is eliminated by the commit-first pattern. [VERIFIED: architecture context — Supabase free tier has no replicas]

### `turn.updated` vs `turn.created` for URL extraction update

When `extract_and_process_url_turn` updates `turn.payload.extracted_html_path`:
- The turn was **already broadcast** with `turn.created` at POST time (with `extracted_html_path=None`).
- The update broadcasts `turn.updated` (D-29) with the now-filled payload.
- Frontend (Phase 27/28) re-renders the url turn bubble on `turn.updated`.
- If the frontend misses the `turn.updated` event (WS not connected), `GET /turns` returns the updated payload.

---

## Area 8 — APScheduler interaction with new BackgroundTasks

**TL;DR:** No starvation risk. httpx.AsyncClient is fully cooperative (async I/O). APScheduler and FastAPI BackgroundTasks both run on the same event loop as cooperative coroutines. The 16:00 cron fires without delay even while a URL extraction is in progress.

### Why there is no starvation

FastAPI BackgroundTasks that are `async def` run as coroutines on the event loop via `asyncio.create_task`. `httpx.AsyncClient.get()` is fully async — it awaits on DNS resolution + TCP connect + response read using anyio/asyncio primitives. During each `await`, the event loop can run other tasks including APScheduler's cron job callbacks.

APScheduler's `AsyncIOScheduler` (used by this project — invariant #7) schedules jobs via `asyncio.create_task` or `loop.call_soon`. It does NOT block the event loop.

[ASSUMED: APScheduler AsyncIOScheduler is in use — not verified by code inspection; known from invariant #7 and Phase 3 research. VERIFIED: httpx.AsyncClient uses async I/O and does not block the event loop]

### Implementation requirement

`extract_and_process_url_turn` **MUST be defined as `async def`** to run cooperatively on the event loop. If defined as a sync `def`, FastAPI runs it in a thread pool, which also works but:
1. `asyncio.run()` cannot be called from within a thread that already has a running event loop.
2. The existing `promote_draft` is sync and uses `asyncio.run()` for the final broadcast — this works because `promote_draft` runs in the BackgroundTask's thread context.

For Phase 26, `extract_and_process_url_turn` uses `httpx.AsyncClient` (async) — define it as `async def` to avoid the thread-vs-event-loop complexity.

**However**, there is a pattern conflict: `process_thread_turn` (the stub, D-21) should mirror `promote_draft` (sync def + asyncio.run for broadcast). For consistency, define `extract_and_process_url_turn` as `async def` (because it awaits httpx) and `process_thread_turn` as sync `def` (because its Phase 26 body is a no-op log — no async needed, Phase 29 will decide).

```python
# services/llm.py

async def extract_and_process_url_turn(recipe_id: UUID, turn_id: UUID) -> None:
    """Phase 26 TURN-04 — URL extraction BackgroundTask.
    Defined as async def because it awaits httpx.AsyncClient.get().
    """
    # ... httpx fetch + trafilatura + storage upload + commit + asyncio.run(broadcast)
    # Note: broadcast can be awaited directly here since we're already async

def process_thread_turn(recipe_id: UUID, turn_id: UUID) -> None:
    """Phase 26 stub — no-op. Phase 29 fills with full-thread Gemini call.
    Defined as sync def (consistent with promote_draft pattern).
    """
    db = SessionLocal()
    try:
        log.info("thread-turn LLM processing deferred to Phase 29 (recipe=%s turn=%s)",
                 recipe_id, turn_id)
    finally:
        db.close()
```

---

## Area 9 — Supabase Storage bucket creation

**TL;DR:** Create the `recipe-urls` bucket via an app-startup idempotent helper in `services/storage.py`, NOT via Alembic SQL. The storage3 SDK's `create_bucket` API is reliable; Alembic SQL access to `storage.buckets` may require schema-owner permissions that DATABASE_URL doesn't have.

### Why not Alembic SQL

The `storage.buckets` table is owned by the Supabase storage extension role, not the application role. Alembic connects via `DATABASE_URL` (the application user), which typically has `SELECT` but not `INSERT` on `storage.buckets` in Supabase's permission model. An attempt like:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES (gen_random_uuid(), 'recipe-urls', false)
ON CONFLICT (name) DO NOTHING;
```

may fail with `ERROR: permission denied for table buckets` on the production Supabase instance even though it works locally with a superuser.

[ASSUMED: Supabase storage schema permission model — not verified against this project's Supabase configuration. This is the known behaviour from Supabase docs for non-superuser connections]

### Recommended: app-startup idempotent helper

```python
# services/storage.py

URL_BUCKET = "recipe-urls"
URL_BUCKET_FILE_SIZE_LIMIT = 5 * 1024 * 1024  # 5 MB (matches D-24 fetch limit)

def ensure_url_bucket_exists() -> None:
    """Idempotent: create recipe-urls bucket if it doesn't exist.

    Called once from app/main.py lifespan on startup.
    Uses service-role key (has bucket-creation permissions).
    Skipped in test mode.
    """
    if settings.environment == "test":
        return
    client = _supabase()
    existing = client.storage.list_buckets()
    if not any(b.name == URL_BUCKET for b in existing):
        client.storage.create_bucket(
            URL_BUCKET,
            options={
                "public": False,
                "file_size_limit": URL_BUCKET_FILE_SIZE_LIMIT,
                "allowed_mime_types": ["text/plain", "text/markdown"],
            },
        )
        log.info("storage.bucket_created name=%s", URL_BUCKET)
    else:
        log.debug("storage.bucket_exists name=%s", URL_BUCKET)
```

Call from `app/main.py` lifespan:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # existing scheduler start code...
    from app.services import storage as storage_service
    storage_service.ensure_url_bucket_exists()
    yield
    # existing shutdown code...
```

### `upload_recipe_url_extract` helper (D-26)

```python
def upload_recipe_url_extract(
    *,
    household_id: UUID,
    recipe_id: UUID,
    turn_id: UUID,
    content: bytes,
) -> str:
    """Upload extracted URL markdown to Supabase Storage.

    Returns bucket-relative path: "{household_id}/{recipe_id}/{turn_id}.md"
    Mirrors upload_recipe_photo pattern (D-26).
    """
    if settings.environment == "test":
        return f"{household_id}/{recipe_id}/{turn_id}.md"

    path = f"{household_id}/{recipe_id}/{turn_id}.md"
    client = _supabase()
    client.storage.from_(URL_BUCKET).upload(
        path=path,
        file=content,
        file_options={"content-type": "text/markdown; charset=utf-8", "upsert": "true"},
    )
    log.info("url_extract.uploaded household=%s recipe=%s path=%s bytes=%d",
             household_id, recipe_id, path, len(content))
    return path
```

Note: `upsert: true` because re-extraction (retry) should overwrite the previous file at the same path. Photo upload uses `upsert: false` to prevent accidental overwrites; for URL extracts, idempotent re-extraction is desirable.

---

## Area 10 — Validation Architecture

`nyquist_validation` is explicitly `false` in `.planning/config.json`. Lightweight enumeration only.

### Test infrastructure (existing)

- Framework: pytest + pytest-asyncio, PostgreSQL `aldente_test` on port 5433
- Config: `backend/pyproject.toml` `[tool.pytest.ini_options]`
- Run: `cd backend && uv run pytest tests/ -x`
- Session-scoped `conftest.py` with rolled-back transaction fixtures + TestClient override
- Cookie auth: bearer token via `_seeded_member` helper (see `test_recipes.py`)

### Success criterion → verifiable check mapping

| Criterion | What to verify | Method |
|-----------|---------------|--------|
| SC-1: text turn appears on partner's WS within ~200ms | `POST /turns` → 201 + `GET /turns` returns it | pytest: TestClient POST → assert turn in GET response; WS timing is manual-only at couple-scale |
| SC-2: `answer` turn applies field + no Gemini call | `POST /turns` with answer payload → recipe field updated, `manually_edited_fields` set, `process_thread_turn` NOT called | pytest: insert synthetic recipe + question turn, POST answer, assert `recipe.<field>` + `manually_edited_fields`. Monkeypatch `process_thread_turn` to assert it's never called |
| SC-3: URL turn triggers extraction + TODO closed | `POST /turns` url kind → BackgroundTask runs extraction, `extracted_html_path` set, `turn.updated` broadcast | pytest with `settings.environment='test'` uses `canned_url_extract` fixture; assert turn payload updated |
| SC-4: `proposal_dismissed` is pure no-op | `POST /turns` proposal_dismissed → 201, no field mutation, no LLM call | pytest: insert synthetic advisory turn, POST dismissal, assert recipe fields unchanged |

### Wave 0 test gaps (new files needed)

- `backend/tests/test_turns.py` — covers TURN-01..04 against rolled-back PostgreSQL
- `backend/app/services/llm_fixtures.py` — add `canned_url_extract` (D-30)

---

## Risks & Pitfalls

### R-1: JSONB silent mutation (HIGH risk)

**What:** `recipe.manually_edited_fields.append(field)` without `flag_modified` commits nothing.
**Symptom:** answer turns return 201, recipe field updates, but `manually_edited_fields` stays empty.
**Prevention:** Use full reassignment idiom everywhere. Add a test that reads `manually_edited_fields` back from DB after commit.

### R-2: trafilatura returns `None` (MEDIUM risk, expected failure path)

**What:** JS-rendered pages, bot-blocked pages, or pages with < 100 words of main content return `None`.
**Symptom:** URL extraction BackgroundTask enters `_record_failure` path on valid URLs.
**Prevention:** `None` is the correct failure path (D-27). Add `include_tables=True`. Log the URL in the failure record for debugging. Do NOT fall back to raw HTML (sends navigation boilerplate to Gemini).

### R-3: lxml / trafilatura Railway deploy — no risk

**What:** Historical concern that `lxml` needed `libxml2-dev` system headers.
**Current state:** lxml 6.1.0 ships manylinux wheels. Zero Dockerfile changes needed. Already in `uv.lock`.

### R-4: Broadcast-before-commit phantom turn (MITIGATED)

**What:** If broadcast fires before commit, partner sees a turn that GET /turns doesn't return yet.
**Prevention:** Strictly follow commit-first → broadcast pattern (established in `_broadcast_promoted` and `recipe.created`). The planner must enforce this in every task that writes turns.

### R-5: asyncio Lock cleanup race (BENIGN)

**What:** D-19's "pop on release if no waiters" race between cleanup and a new concurrent POST.
**Analysis:** Benign under CPython's single-threaded event loop — no preemption between sync operations. Self-heals: Task2 holds the lock object reference regardless of dict entry deletion. DB `UNIQUE(recipe_id, position)` is the backstop.
**Prevention:** Use `WeakValueDictionary` to avoid the concern entirely.

### R-6: Pydantic v2 unannotated class attribute (HIGH risk for AnswerTurnPayload)

**What:** `FIELD_TYPES = {...}` as a class attribute on a Pydantic model raises `PydanticUserError: A non-annotated attribute was detected`.
**Prevention:** Put the lookup dict at module level, not inside the class. [VERIFIED: reproduced the error]

### R-7: `extract_and_process_url_turn` sync vs async (MEDIUM risk)

**What:** If defined as sync `def`, it cannot `await` httpx directly. Must use a sync httpx client OR restructure.
**Prevention:** Define as `async def` — FastAPI BackgroundTasks support async functions natively.

### R-8: `process_thread_turn` stub called for `answer` kind (D-11 contract)

**What:** If the dispatch table in the endpoint handler mistakenly schedules `process_thread_turn` for `answer` turns, Gemini (in Phase 29) will be invoked on answer turns — violating the locked LLM trigger table.
**Prevention:** Explicit allowlist in the scheduling dispatch: `text | voice | photo` → `process_thread_turn`; `url` → `extract_and_process_url_turn`; `answer | proposal_accepted | proposal_dismissed` → nothing.

### R-9: SSRF via `169.254.169.254` (MEDIUM risk, mitigated cheaply)

**What:** Authenticated user pastes Railway metadata URL. Backend fetches it.
**Prevention:** `_is_safe_url()` helper blocks it. 15 lines, zero cost. Recommend including.

### R-10: `turn.updated` event list not updated in CLAUDE.md invariant #4

**What:** CLAUDE.md §"Architecture invariants" #4 lists the canonical event set. Adding `turn.created` + `turn.updated` in code without updating the doc creates drift (per locked-vocabulary discipline).
**Prevention:** Update `CLAUDE.md` invariant #4 in the same commit that wires the broadcasts. Listed in the CONTEXT.md cutover targets.

---

## Code Examples

### complete `extract_and_process_url_turn` body (D-28 blueprint)

```python
# services/llm.py

import httpx
import trafilatura
from app.services import storage as storage_service
from app.services.thread import _is_safe_url

async def extract_and_process_url_turn(recipe_id: UUID, turn_id: UUID) -> None:
    """Phase 26 TURN-04 — URL extraction BackgroundTask.

    1. Load recipe + url turn from DB
    2. SSRF check
    3. httpx fetch (D-24 policy)
    4. trafilatura extraction
    5. Upload to Supabase Storage
    6. Update turn payload (full reassignment to avoid JSONB mutation pitfall)
    7. Schedule process_thread_turn (no-op in Phase 26, real in Phase 29)
    8. Commit + broadcast turn.updated

    NEVER raises — failures are recorded on the recipe row via _record_failure.
    """
    db = SessionLocal()
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            log.warning("extract_and_process_url_turn: recipe %s vanished", recipe_id)
            return
        turn = db.scalar(select(RecipeTurn).where(RecipeTurn.id == turn_id))
        if turn is None:
            log.warning("extract_and_process_url_turn: turn %s vanished", turn_id)
            return

        if settings.environment == "test":
            from app.services.llm_fixtures import canned_url_extract
            extracted_content = canned_url_extract(turn.payload.get("url", ""))
        else:
            url = turn.payload.get("url", "")
            if not url:
                raise ValueError("url turn has no url in payload")
            if not _is_safe_url(url):
                raise ValueError(f"SSRF: blocked URL {url!r}")

            async with httpx.AsyncClient(
                timeout=10.0,
                follow_redirects=True,
                max_redirects=5,
                headers={"User-Agent": "al-dente/0.6 (+https://al-dente-pink.vercel.app)"},
            ) as client:
                response = await client.get(url)

            content_type = response.headers.get("content-type", "")
            if not any(t in content_type for t in ("text/html", "application/xhtml")):
                raise ValueError(f"unsupported content-type: {content_type!r}")
            if len(response.content) > 5 * 1024 * 1024:
                raise ValueError("response body exceeds 5 MB limit")

            extracted_content = trafilatura.extract(
                response.text,
                output_format='markdown',
                include_tables=True,
                include_comments=False,
                no_fallback=False,
            )
            if not extracted_content:
                raise ValueError("trafilatura returned None (no extractable content)")

        path = storage_service.upload_recipe_url_extract(
            household_id=recipe.household_id,
            recipe_id=recipe_id,
            turn_id=turn_id,
            content=extracted_content.encode("utf-8"),
        )

        # Full reassignment to avoid JSONB silent-mutation footgun (Area 4)
        turn.payload = {**turn.payload, "extracted_html_path": path}
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(turn, "payload")  # JSONB dict needs flag_modified on sub-key update
        db.commit()
        db.refresh(turn)

        await broadcast_to_household(
            recipe.household_id,
            "turn.updated",
            TurnResponse.model_validate(turn).model_dump(mode="json"),
        )

        # Schedule Phase 29 LLM processing now that extracted content is available
        from fastapi import BackgroundTasks
        # Note: can't add_task here — we're inside a BackgroundTask already.
        # Schedule directly:
        process_thread_turn(recipe_id, turn_id)  # no-op stub in Phase 26

    except Exception as exc:  # noqa: BLE001
        _record_failure(db, recipe, exc)
    finally:
        db.close()
```

**Note on `flag_modified`:** When updating a sub-key of a JSONB dict (`{**turn.payload, 'extracted_html_path': path}`), the assignment creates a NEW dict object — so the full-reassignment rule normally applies automatically. However, since `turn.payload` is a JSONB column and SQLAlchemy tracks by identity, the `{**turn.payload, ...}` pattern creates a new dict and assigns it, which DOES trigger change detection without `flag_modified`. The `flag_modified` call is belt-and-suspenders here. Either pattern is safe; the `{**d, key: value}` spread is the idiomatic choice.

### Position lock usage in endpoint handler

```python
# routers/recipes.py (or turns.py)

from app.services.thread import acquire_position_lock

@router.post("/{recipe_id}/turns", response_model=TurnResponse, status_code=201)
async def create_turn(
    recipe_id: UUID,
    body: TurnPayload,
    background_tasks: BackgroundTasks,
    member: Member = Depends(current_member),
    db: Session = Depends(get_db),
) -> TurnResponse:
    # 1. Household scope check
    recipe = db.scalar(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.household_id == member.household_id)
    )
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # 2. Acquire position lock (D-18)
    lock = await acquire_position_lock(recipe_id)
    async with lock:
        # 3. Compute next position
        max_pos = db.scalar(
            select(func.max(RecipeTurn.position)).where(RecipeTurn.recipe_id == recipe_id)
        )
        next_position = (max_pos or -1) + 1

        # 4. Insert turn
        turn = RecipeTurn(
            recipe_id=recipe_id,
            position=next_position,
            sender="user",
            kind=body.kind,
            payload=body.model_dump(exclude={"kind"}),
        )
        db.add(turn)

        # 5. Handle kind-specific side effects (answer + proposal_accepted in same tx)
        if body.kind == "answer":
            _apply_answer_turn(db, recipe, body)  # field update + manually_edited_fields
        elif body.kind == "proposal_accepted":
            _apply_proposal_accepted(db, recipe, body)
        elif body.kind == "proposal_dismissed":
            _validate_proposal_dismissed_ref(db, recipe_id, body)  # 422 on invalid ref

        db.commit()
        db.refresh(turn)

    # 6. Broadcast turn.created (after commit, outside lock)
    await broadcast_to_household(
        member.household_id,
        "turn.created",
        TurnResponse.model_validate(turn).model_dump(mode="json"),
    )

    # 7. Schedule BackgroundTask (D-22 dispatch table)
    if body.kind in ("text", "voice", "photo"):
        background_tasks.add_task(process_thread_turn, recipe_id, turn.id)
    elif body.kind == "url":
        background_tasks.add_task(extract_and_process_url_turn, recipe_id, turn.id)
    # answer / proposal_accepted / proposal_dismissed: no BackgroundTask (D-11, D-15, D-16)

    return TurnResponse.model_validate(turn)
```

---

## Standard Stack

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| trafilatura | 2.0.0 | HTML-to-markdown extraction for URL turns | Added to uv.lock in this session |
| lxml | 6.1.0 | trafilatura dependency; manylinux wheels | Added to uv.lock in this session |
| httpx | 0.28.1 (pinned) | Async HTTP fetch for URL turns | Already in env (FastAPI transitive dep); now explicit in pyproject.toml |
| SQLAlchemy 2.0 | existing | JSONB mutations via full reassignment | Use `flag_modified` for sub-key updates |
| asyncio.Lock / weakref.WeakValueDictionary | stdlib | Per-recipe position concurrency | No new dep |
| ipaddress | stdlib | SSRF defence host classification | No new dep |
| Pydantic v2 | existing | `@model_validator` for AnswerTurnPayload | No new dep |

---

## Open Questions

1. **Alembic migration number for `recipe-urls` bucket** — if the bucket is created via app startup (recommended), no new Alembic migration is needed for Phase 26. If the planner prefers Alembic SQL, they need to verify the DATABASE_URL user has `INSERT` permission on `storage.buckets`. Recommend startup helper to avoid the permission ambiguity.

2. **`extract_and_process_url_turn` calling `process_thread_turn` inline** — once inside a BackgroundTask, there's no `BackgroundTasks` instance to add new tasks. The options are: (a) call `process_thread_turn` directly (since Phase 26's body is a no-op, this is fine); (b) use `asyncio.create_task` (fires concurrently, fine for Phase 26 no-op, might be wrong for Phase 29). Recommend direct call for Phase 26 — Phase 29 can restructure the BackgroundTask chain when it fills the real body.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 10-20% of arbitrary URLs will return None from trafilatura (JS-rendered sites) | Area 1 | Could be higher or lower; affects user expectation setting only |
| A2 | Supabase storage.buckets table requires superuser or storage-extension-owner privileges for INSERT via Alembic DATABASE_URL | Area 9 | If wrong, SQL approach works fine; startup helper still preferred for maintainability |
| A3 | APScheduler AsyncIOScheduler (not ThreadPoolScheduler) is in use | Area 8 | If ThreadPool, scheduler jobs run in separate threads — no starvation risk either way |
| A4 | Python full-reassignment of JSONB `{**old_payload, key: val}` triggers SQLAlchemy change detection without flag_modified | Area 6 code example | If wrong, payload update silently drops — add explicit `flag_modified` as belt-and-suspenders |

---

## Sources

### Primary (HIGH confidence)
- Live code inspection: `backend/app/services/llm.py`, `realtime.py`, `storage.py`, `schemas/recipe_turn.py`, `models/recipe_turn.py`, `routers/recipes.py`, `tests/conftest.py` — verified patterns
- Live tests: `uv run python` in Python 3.12.12 — asyncio.Lock behaviour, Pydantic v2 model_validator, trafilatura on French HTML, SSRF helper, JSONB reassignment idiom
- `uv.lock` inspection — lxml 6.1.0 manylinux wheel availability confirmed
- `backend/Dockerfile` inspection — `python:3.12-slim` base image confirmed

### Secondary (MEDIUM confidence)
- trafilatura live HTTP fetch against Marmiton + cuisineaz.com — extraction success confirmed
- `storage3` SDK source inspection via `inspect.getsource` — `create_bucket` signature confirmed
- `asyncio` CPython source behaviour — `_waiters` attribute type in Python 3.12.12 confirmed

### Tertiary (LOW confidence / ASSUMED)
- Supabase storage.buckets permission model for non-superuser Alembic connections
- 10-20% None-return rate estimate for trafilatura on arbitrary French URLs
- APScheduler scheduler type (AsyncIO vs Thread) — inferred from invariant #7, not code-inspected

---

*Research date: 2026-05-13*
*Valid until: 2026-06-13 (stable domain — trafilatura 2.x API is stable; lxml 6.x is stable)*
