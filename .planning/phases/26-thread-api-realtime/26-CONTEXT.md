# Phase 26: Thread API & realtime - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the **append-only thread API** and **realtime layer** for the recipe conversation thread on top of the Phase 25 foundation. Concretely:

- **`POST /recipes/{id}/turns`** (JSON) — single endpoint for `text`, `voice`, `url`, `answer`, `proposal_accepted`, `proposal_dismissed` turns. Validates payloads via the existing `TurnPayload` discriminated union.
- **`POST /recipes/{id}/turns/photo`** (multipart) — separate sub-path for photo turns; mirrors the existing `POST /recipes/photo` upload pattern.
- **`GET /recipes/{id}/turns`** — flat list ordered by `position ASC`, no pagination. Cross-household 404.
- **`turn.created` WebSocket event** — broadcast via `services/realtime.broadcast_to_household` for every persisted turn (user OR system), carrying the full `TurnResponse` shape. Adds to the invariant #4 event list.
- **URL extraction (TURN-04)** — BackgroundTask fetches the URL via `httpx`, extracts recipe-shaped content via `trafilatura`, uploads the cleaned content to Supabase Storage, stamps the path on the url turn payload. Closes the `# TODO(productize)` at `backend/app/routers/recipes.py:621-625`. `capture-url` exits the ⚠ Mixed bucket.
- **`process_thread_turn(recipe_id, turn_id)` stub** — scheduled by the new endpoint for follow-up `text` / `voice` / `photo` LLM-triggering turns on existing recipes. Body is a no-op log statement in Phase 26; Phase 29 fills it with the full-thread Gemini call.
- **`answer` turn handler** — applies value to `recipes.<field>` and ADDS `field` to `recipes.manually_edited_fields` in the same DB transaction. Whitelisted to 13 completeness-relevant fields.
- **`proposal_accepted` / `proposal_dismissed` handlers** — full implementation now, even though advisory turns (the writer side) ship in Phase 29. The handlers will be testable with synthetic advisory turns inserted directly into the DB.

**Explicitly out of scope** (deferred to later phases):
- The conversational capture screen UI (`/recipes/new` rewrite) — Phase 27.
- The recipe-detail thread UI (`/recipes/[id]` chat component) — Phase 28.
- The LLM prompt rewrite that consumes the full thread + emits `summary` / `question` / `advisory` system turns — Phase 29.
- Removal of `status='draft'` from the recipe lifecycle and drop of the drafts inbox UI — **Phase 27 lands this in one clean pass**. Phase 26 is naturally draft-agnostic (allows turns on any status).

</domain>

<decisions>
## Implementation Decisions

### Endpoint shape (TURN-01)

- **D-01:** Split endpoint topology — `POST /recipes/{id}/turns` accepts JSON for the 6 non-photo user kinds (`text`, `voice`, `url`, `answer`, `proposal_accepted`, `proposal_dismissed`); `POST /recipes/{id}/turns/photo` accepts multipart `files: list[UploadFile]` for photo turns. Mirrors the existing `POST /recipes/photo` precedent (Phase 25 D-08 photo upload pattern). The JSON endpoint validates via the `TurnPayload` discriminated union from `backend/app/schemas/recipe_turn.py` (already in place from Phase 25 D-15); `AnswerTurnPayload` is extended in this phase per D-08 below.
- **D-02:** `GET /recipes/{id}/turns` returns a flat `list[TurnResponse]` sorted by `position ASC`. No pagination — couple-scale corpus is 5–50 turns per recipe. Cross-household 404 (same contract as `GET /recipes/{id}`). 200 OK with empty list when no turns exist (shouldn't happen post-Phase-25 backfill but defensive). Response schema is the existing `TurnResponse` from `schemas/recipe_turn.py`.
- **D-03:** `turn.created` WebSocket frame carries the full `TurnResponse` JSON: `{id, recipe_id, position, sender, kind, payload, created_at}`. Frontend can append directly to the open thread view without a refetch round-trip — meets the ~200ms cross-phone sync goal. Matches the `recipe.created` / `recipe.promoted` full-payload pattern.
- **D-04:** HTTP status code on all `POST /turns*` returns is **201 Created** with the persisted `TurnResponse` body. Consistent with `POST /recipes`. The 202 Accepted shape (which would be more HTTP-correct for BackgroundTask-triggering kinds) introduces frontend dispatch complexity and breaks the uniform write→response contract.
- **D-05:** No `status` guard on POST /turns — turns can be appended to a recipe regardless of its current `status` value (`draft`, `structured`, `failed`, `verified`). Forward-compat with Phase 27's planned draft removal: when `status='draft'` disappears, the endpoint behavior doesn't change. Locks the "thread is the recipe's living artifact" intent.
- **D-06:** `turn.created` broadcasts for both `sender='user'` and `sender='system'`. Phase 26 only emits user turns through the new endpoint, but the broadcast helper is sender-generic so Phase 29's `summary` / `question` / `advisory` system-turn emissions broadcast through the same path without revisiting Phase 26's code. One event for all turn creations — clean contract.
- **D-07:** Phase 25 migration-backfilled turns do **NOT** broadcast (they were inserted before any WS clients exist; database-internal cutover artifacts per Phase 25 deferred). The broadcast lives in the endpoint handler, not in a DB trigger — backfill flows past the broadcast site entirely.

### `answer` turn write contract (TURN-02)

- **D-08:** Extend `AnswerTurnPayload` (Phase 25 stub) with `in_reply_to_turn_id: UUID`, `field: AnswerField`, `value: AnswerValue`. `AnswerField` is a `Literal` whitelist of completeness-relevant columns: `'title'`, `'ingredients'`, `'steps'`, `'prep_time_minutes'`, `'cook_time_minutes'`, `'difficulty'`, `'description'`, `'servings'`, `'cuisine'`, `'mood'`, `'main_protein'`, `'seasonality'`, `'tags'` (the 13 fields that map to `frontend/lib/recipe-completeness.ts`'s 11-field set plus `tags`). Out-of-whitelist `field` → 422 at schema validation. `photo_paths` is explicitly excluded — photo follow-ups go through `POST /turns/photo` (D-01), not `answer` turns.
- **D-09:** `value` validation uses a **per-field Pydantic discriminated union** — `AnswerTurnPayload.value` has a typed shape based on `field`:
  - `field='difficulty'` → `value: DifficultyLiteral`
  - `field='cook_time_minutes' | 'prep_time_minutes' | 'servings'` → `value: int` with appropriate `Field(ge=…, le=…)` bounds matching `GeminiExtractedRecipe`
  - `field='cuisine'` → `value: CuisineLiteral`
  - `field='main_protein'` → `value: ProteinLiteral`
  - `field='mood'` → `value: list[MoodLiteral]`
  - `field='seasonality'` → `value: list[SeasonLiteral]`
  - `field='ingredients'` → `value: list[GeminiIngredient]`
  - `field='steps' | 'tags'` → `value: list[str]`
  - `field='title' | 'description'` → `value: str` (with `max_length` matching the column constraints — title 200, description unbounded)
  
  Reuses the existing `Literal` types and bound expressions from `services/llm.py:73-103` (no duplication of vocabulary). Pydantic 422s on type mismatch at the schema boundary.
- **D-10:** Applying an `answer` turn is **atomic**: insert turn row + update `recipes.<field>` + append `field` to `recipes.manually_edited_fields` JSONB array all happen in a single DB transaction. If `field` is already present in `manually_edited_fields`, it's a no-op insert (set semantics, not list append). Matches the same-tx pattern from invariant #3 (`cooking_logs` + denormalized `recipes.cook_count` / `last_cooked_at`).
- **D-11:** Answer turn **does not run the LLM** — `BackgroundTasks.add_task(process_thread_turn, ...)` is NOT scheduled for `kind='answer'`. Verified by log inspection per ROADMAP.md success criterion 2. The Pydantic validator already enforces `kind='answer'`; the router dispatches scheduling only for `text | voice | photo | url`.
- **D-12:** `in_reply_to_turn_id` validation — must reference an existing `question` turn within the SAME recipe. The handler reads the referenced turn from the DB; rejects 422 if the ref points to a non-question turn or a turn in a different recipe. Phase 29 owns the `question` turn writer; for now the validator works against synthetic question turns inserted by test fixtures.
- **D-13:** Idempotency on answer turns — re-POST is **allowed**. Each tap inserts a fresh turn at a new position. The chat shows the user's repeated answer; the field is re-applied (idempotent setattr). This matches the "thread is append-only" invariant from ADR-0001. Couple-scale collision risk is minimal; rejecting double-taps would surface confusing errors when the WS update arrives between tap and re-tap.

### `proposal_accepted` / `proposal_dismissed` handlers (TURN-02)

- **D-14:** Both handlers ship **fully implemented in Phase 26**, even though the writer (advisory emission) is Phase 29. Tests use synthetic `advisory` turns inserted directly into the DB. The dead-code window between Phase 26 ship and Phase 29 ship is acceptable — the alternative (stub now, full handler later in Phase 29) means Phase 29 has to touch both ends of the contract.
- **D-15:** `proposal_dismissed` payload — `{in_reply_to_turn_id: UUID}` referencing an `advisory` turn in the same recipe. Handler validates the ref (must point to an `advisory` turn in this recipe; 422 otherwise), persists + broadcasts. **Pure no-op state change** — no LLM run, no field mutation, no `manually_edited_fields` touch. Verifiable via log inspection per ROADMAP.md success criterion 4.
- **D-16:** `proposal_accepted` payload — `{in_reply_to_turn_id: UUID}` referencing an `advisory` turn. Handler: validates the ref; reads the advisory turn's payload to extract `field` and `proposed_value` (expected shape per ADR-0001: `{field, current_value, proposed_value, reason_excerpt}` — Phase 29 owns the writer of this shape, Phase 26 documents the read-side contract via an `AdvisoryTurnPayload` Pydantic model with `field`, `current_value`, `proposed_value`, `reason_excerpt` fields all required); applies `proposed_value` to `recipes.<field>`; **REMOVES `field`** from `recipes.manually_edited_fields`. Atomic transaction (same pattern as D-10).
- **D-17:** When Phase 26 ships, `AdvisoryTurnPayload` graduates from a Phase 25 stub to a typed model with `field, current_value, proposed_value, reason_excerpt`. This is the read-side contract that Phase 29's emitter must respect. The Pydantic class is added in the same atomic change as the `proposal_accepted` handler.

### Position concurrency (CAPTURE-03 forward-compat)

- **D-18:** Use an **app-level asyncio Lock dict per recipe** for serializing `position = max(position) + 1` reads + inserts. Pattern: `_position_locks: Dict[UUID, asyncio.Lock]` in `services/thread.py` (new module), `async with await _acquire_position_lock(recipe_id):` wraps the position read + turn insert in the endpoint handler. Safe under invariant #7 (single uvicorn worker, APScheduler in-process); productize-later note inline that says "when Railway scales out, swap to `pg_advisory_xact_lock(hashtext(recipe_id::text))` — no API changes needed."
- **D-19:** Lock cleanup — **pop on release if no waiters**. After releasing, if `lock._waiters` is empty AND `lock.locked()` is False, `del _position_locks[recipe_id]`. Prevents unbounded growth as the household accumulates recipes. Single-recipe Lock churn is cheap (~200 bytes object alloc per turn POST).
- **D-20:** Phase 27 CAPTURE-03 batch persistence — **N sequential POSTs**, not a `/batch` endpoint or embedded array. Phase 27 will create the recipe (or whatever the new creation endpoint looks like after the draft-removal pass) then call `POST /recipes/{id}/turns` once per pending bubble in entry order. The asyncio Lock serializes them server-side; positions land monotonic. Phase 26 does NOT need to expose a batch endpoint — keeps the surface tight.

### BackgroundTask scheduling for thread turns

- **D-21:** Phase 26 introduces a new BackgroundTask function `process_thread_turn(recipe_id: UUID, turn_id: UUID) -> None` in `backend/app/services/llm.py` (alongside `promote_draft` per the established pattern). The body in Phase 26 is a **no-op stub**: opens its own `SessionLocal()` (invariant #7 pattern), logs `"thread-turn LLM processing deferred to Phase 29 (recipe=%s turn=%s)"`, returns. Phase 29 swaps the body for the real full-thread Gemini call without changing the function signature or any callsite.
- **D-22:** Scheduling matrix in `POST /recipes/{id}/turns` and `POST /recipes/{id}/turns/photo`:
  - `text` / `voice` / `photo` → `background_tasks.add_task(process_thread_turn, recipe_id, turn.id)`
  - `url` → `background_tasks.add_task(extract_and_process_url_turn, recipe_id, turn.id)` (the real URL extraction body — see D-23 / D-25)
  - `answer` → **no BackgroundTask** (verified by D-11)
  - `proposal_accepted` / `proposal_dismissed` → **no BackgroundTask** (pure state changes per D-15 / D-16)

### URL extraction (TURN-04)

- **D-23:** Use **`trafilatura`** as the extraction library. Pure Python (MIT), depends on `lxml` which is also pure-Python on most platforms. Returns cleaned text/markdown optimized for LLM ingestion — Gemini receives recipe-shaped content instead of HTML soup. Add both `trafilatura` and `lxml` to `backend/pyproject.toml` dependencies. Rejected alternatives: `recipe-scrapers` (too brittle on French food blogs without schema.org JSON-LD), Gemini native URL grounding (opaque fetch contract; conflicts with invariant #5 traceability), `readability-lxml` (less recipe-aware than trafilatura in 2025+).
- **D-24:** Use **`httpx.AsyncClient`** for the HTTP fetch. Add `httpx` to `pyproject.toml` (FastAPI already pulls it transitively but pin it explicitly). Conservative fetch policy: `timeout=10.0`, `follow_redirects=True`, `max_redirects=5`, User-Agent string `"al-dente/0.6 (+https://al-dente-pink.vercel.app)"`. Reject responses with `Content-Type` not in `{text/html, application/xhtml+xml}` (422 path → status='failed'). Reject response bodies larger than 5MB (stream + abort). No robots.txt check — couple-scale workload, users only paste URLs they want to save.
- **D-25:** Extracted content lives in **Supabase Storage**, not inline in the turn payload. Storage path: `recipe-urls/{household_id}/{recipe_id}/{turn_id}.md` (markdown output from trafilatura). `extracted_html_path` field on the url turn payload carries the full storage path. Mirrors the D-08 photo upload pattern from Phase 25. Invariant #5 (raw inputs preserved forever) satisfied — re-extraction with a better library can read the same stored content. New `UrlTurnPayload` shape: `{kind: 'url', url: str, extracted_html_path: str | None}` — Phase 25's `{kind: 'url', url: str}` extends additively; legacy backfilled url turns have `extracted_html_path=None` forever (Phase 25 D-03).
- **D-26:** Extension to the existing storage service — add `upload_recipe_url_extract(household_id, recipe_id, turn_id, content_bytes) -> str` helper in `backend/app/services/storage.py` returning the storage path. Bucket name: reuse the existing `recipe-photos` bucket OR add a new `recipe-urls` bucket — recommend a new bucket for clean access policies (text/markdown content is non-image; bucket-level MIME enforcement is cleaner). Bucket creation goes in the same Alembic migration that ships Phase 26 (Supabase Storage buckets can be created via SQL).
- **D-27:** Failure mode — extraction failure (fetch error, timeout, oversize, unparseable, trafilatura returned empty) → `status='failed'` + `promotion_error` set with truncated error context (≤500 chars per `_record_failure` precedent). Matches voice/photo extract-failure path. URL turn payload is preserved (invariant #5) so `/retry-promotion` can re-fetch. Asymmetric with text rewrite-failure (D-26 Phase 24) — rejected the "degrade to URL-only" alternative because URL alone gives Gemini nothing usable.
- **D-28:** New BackgroundTask body `extract_and_process_url_turn(recipe_id: UUID, turn_id: UUID) -> None` in `services/llm.py`:
  1. Open `SessionLocal()`, load the recipe + the specific url turn
  2. Fetch the URL via `httpx.AsyncClient` (D-24 policy)
  3. Extract via `trafilatura.extract(html, output_format='markdown')`
  4. Upload extracted markdown to Supabase Storage (D-26 helper)
  5. Update the turn's `payload.extracted_html_path` (JSONB mutation requires a fresh dict assign + `flag_modified` or `payload = {**payload, 'extracted_html_path': path}`)
  6. Schedule `process_thread_turn(recipe_id, turn_id)` so the Phase 29 LLM rewrite can include the extracted content
  7. Commit + broadcast `turn.created` (the turn's payload changed) OR `turn.updated` (new event) — see D-29
- **D-29:** When the URL extraction BackgroundTask updates the turn's payload with `extracted_html_path`, broadcast a new `turn.updated` event (NOT `turn.created` — the turn already broadcast on initial insert). Adds `turn.updated` to invariant #4's event list alongside `turn.created`. Frontend chat component re-renders the url turn bubble to show "Lien extrait" badge or similar. Phase 27 owns the FE rendering of url turns; Phase 26 just emits the event.
- **D-30:** Test-mode bypass — when `settings.environment == "test"`, `extract_and_process_url_turn` short-circuits with a canned fixture (`from app.services.llm_fixtures import canned_url_extract`) matching the established `if settings.environment == "test":` pattern from `extract_from_transcript`, `extract_from_photos`, etc. Deterministic Playwright spec coverage; no real HTTP fetches during tests.

### Claude's Discretion

- **Endpoint URL details** — exact prefix for the new endpoints (`/recipes/{id}/turns` vs `/recipes/{recipe_id}/turns`); router file location (`recipes.py` extension vs new `turns.py` router); URL pattern style consistent with existing recipes endpoints. Recommend extending `recipes.py` (one router, related endpoints) over creating `turns.py`.
- **Lock module location** — `backend/app/services/thread.py` (new, recommended) vs extending `backend/app/services/realtime.py` vs inline in the router. Recommend new module — keeps the concurrency-control primitive cleanly importable.
- **Pydantic union ordering** — the discriminated `TurnPayload` union order in `schemas/recipe_turn.py`; cosmetic; recommend keeping current order with new fields added to existing classes.
- **`turn.updated` payload shape** — full `TurnResponse` (consistent with D-03) or minimal `{recipe_id, turn_id, fields_changed: list[str]}`. Recommend full TurnResponse for consistency.
- **Migration shape for the new Storage bucket** — Alembic file with raw SQL OR a separate Supabase Storage bucket-management script run idempotently on app startup. Recommend the SQL Alembic file for traceability with v0.6's other migrations.
- **Logging policy on URL extraction** — log levels for fetch errors (warning) vs parse errors (info) vs success (debug); structured log fields for grep-ability. Recommend matching `_record_failure` precedent (`log.exception` for catastrophic, `log.warning` for recoverable).
- **Rate-limit policy on POST /turns** — none in Phase 26 (couple-scale doesn't need it; the asyncio Lock per recipe naturally bounds concurrency). Productize-later note.
- **SSRF defense on URL extraction** — block `127.0.0.1`, `0.0.0.0`, `169.254.0.0/16`, RFC1918 ranges before fetch; cheap to add now. Recommend adding a small `_is_safe_url(url) -> bool` helper called before `httpx.get()` — defense-in-depth even at couple-scale. Optional but cheap.
- **Atomic semantics on photo + answer field-apply** — exact SQLAlchemy idiom for mutating `manually_edited_fields` JSONB (`flag_modified` vs full reassignment); planner can choose.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Milestone-level design
- `docs/adr/0001-recipe-conversation-thread.md` — Recipe conversation thread architecture, conflict UX rationale (advisory bubble), rejected alternatives. Phase 26 implements the API + realtime layer of the §Consequences bullets.
- `.planning/REQUIREMENTS.md` §TURN-01..04 — 4 requirements anchored to Phase 26.
- `.planning/ROADMAP.md` §"Phase 26: Thread API & realtime" — goal, 4 success criteria, invariant touched (#4 — realtime).
- `.planning/PROJECT.md` §"Current Milestone: v0.6" — locked decisions including LLM trigger table (user `text`/`voice`/`photo`/`url` → Gemini; `answer` → direct + pin; `proposal_*` → pure state).

### Prior phase (must read for forward-compat hooks)
- `.planning/phases/25-backend-foundation/25-CONTEXT.md` — entire file. Especially D-08 (photo Storage-upload-in-router pattern, mirrored by D-25/D-26 for URL extraction), D-11 (url turn payload forward-compat shape that D-25 extends), D-13/D-15 (TurnKind / TurnSender / TurnPayload union), D-16 (position 0-indexed UNIQUE constraint that D-18 races against), D-12 (no origin metadata).

### Architecture invariants
- `CLAUDE.md` §"Architecture invariants" — invariant #4 (realtime — `turn.created` + `turn.updated` are NEW events added in this phase; broadcast contract through `broadcast_to_household`), invariant #5 (raw inputs preserved — URL extracted content goes to Supabase Storage per D-25, satisfying #5 for URL captures), invariant #7 (single uvicorn worker — enables the app-level asyncio Lock in D-18; APScheduler in-process), invariant #8 (HttpOnly cookie auth — `current_member` dep on every endpoint, including the new ones).
- `CLAUDE.md` §"MVP phase posture" — no compat shim; clean rewrites. Applies to the `AnswerTurnPayload` extension (D-08) and `AdvisoryTurnPayload` graduation (D-17) — Phase 25 stubs are replaced atomically, not extended.
- `CLAUDE.md` §"Locked vocabularies" — `TurnKind` and `TurnSender` are locked in BOTH `backend/app/models/enums.py` AND `frontend/lib/enums.ts` (Phase 25 D-14). Phase 26 doesn't add new kinds; it extends payload shapes only.

### Prior precedent (P26 should mirror)
- `backend/app/services/storage.py:upload_recipe_photo` — D-26 mirrors this pattern for URL markdown uploads.
- `backend/app/services/realtime.py:broadcast_to_household` — D-03 / D-06 / D-29 add `turn.created` and `turn.updated` to the broadcast event list.
- `backend/app/services/llm.py:promote_draft` (Phase 25) — D-21 mirrors the BackgroundTask body pattern (`SessionLocal()`, NEVER raise, log on failure).
- `backend/app/services/llm.py:_record_failure` — D-27 reuses this for URL extraction failures.
- `backend/app/services/llm.py:73-103` — `Literal` types (`CuisineLiteral`, `MoodLiteral`, etc.) reused by D-09 in the `AnswerTurnPayload.value` union.
- `backend/app/services/llm.py:if settings.environment == "test":` — D-30 mirrors this test-mode bypass for `extract_and_process_url_turn`.
- `backend/app/routers/recipes.py:611-667` (`POST /recipes/url` body) — current URL endpoint with the `# TODO(productize)` at lines 621-625. Phase 26 closes the TODO via D-28.
- `backend/app/routers/recipes.py:491-608` (`POST /recipes/photo` body) — multipart upload precedent for `POST /recipes/{id}/turns/photo` (D-01).

### Cutover targets (modified by this phase)
- **New router endpoints** in `backend/app/routers/recipes.py` (or new `routers/turns.py` — planner's call): `POST /recipes/{id}/turns`, `POST /recipes/{id}/turns/photo`, `GET /recipes/{id}/turns`.
- **`backend/app/schemas/recipe_turn.py`** — extend `AnswerTurnPayload` (D-08, D-09), `UrlTurnPayload` (D-25), `AdvisoryTurnPayload` (D-17). Phase 25's stubs become typed models.
- **`backend/app/services/llm.py`** — add `process_thread_turn` (D-21) and `extract_and_process_url_turn` (D-28) BackgroundTask bodies.
- **`backend/app/services/thread.py`** (new module) — per-recipe asyncio Lock primitive (D-18, D-19).
- **`backend/app/services/storage.py`** — add `upload_recipe_url_extract` helper (D-26).
- **`backend/app/services/realtime.py` docstring** — extend the invariant #4 event list to include `turn.created` and `turn.updated` (cosmetic but required for the file to stay self-documenting).
- **`backend/app/services/llm_fixtures.py`** — add `canned_url_extract` for D-30.
- **`backend/app/main.py`** — confirm the new endpoints are mounted via the existing recipes router include (likely no change needed if endpoints stay in `recipes.py`).
- **Alembic migration `0010_*.py`** (new) — Supabase Storage `recipe-urls` bucket creation if D-26 chooses a new bucket; otherwise this file is omitted.
- **`backend/pyproject.toml`** — add `trafilatura` (D-23), `lxml` (D-23 transitive), `httpx` (D-24 explicit pin).
- **`CLAUDE.md` §"Architecture invariants" #4** — extend the event list to include `turn.created` and `turn.updated` in the same commit as the broadcast wiring (Locked-vocabulary-style discipline: drift between code and the invariant doc is a bug category).

### Out of scope for this phase (Phase 27/28/29)
- Frontend chat component rendering of turns (`turn.created` consumer wiring) — Phase 27 (capture) + Phase 28 (detail) own the FE.
- Removal of `status='draft'` from the recipe lifecycle + drafts inbox UI drop — **Phase 27 lands this**.
- LLM prompt rewrite that consumes `recipe_turns` + `manually_edited_fields` and emits `summary` / `question` / `advisory` system turns — Phase 29.
- The advisory-emitter writer that produces `AdvisoryTurnPayload` payloads — Phase 29 (D-17 documents the read-side contract; Phase 26 cannot test end-to-end advisory flows).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `backend/app/schemas/recipe_turn.py` — `TurnPayload` discriminated union already wired (Phase 25 D-15). `AnswerTurnPayload` and `AdvisoryTurnPayload` are stubs awaiting Phase 26 graduation (D-08, D-17).
- `backend/app/models/recipe_turn.py` — RecipeTurn ORM model + UNIQUE(recipe_id, position) constraint (Phase 25 THREAD-01). No model changes needed in Phase 26.
- `backend/app/services/realtime.broadcast_to_household` — already-async fan-out, swallows per-socket failures. Phase 26 adds two new event types (`turn.created`, `turn.updated`) through it.
- `backend/app/services/storage.upload_recipe_photo` — D-26 mirrors this signature/contract for URL markdown uploads.
- `backend/app/services/llm.py` — established BackgroundTask body conventions: open `SessionLocal()` in the task; never raise out (record failures on the recipe row via `_record_failure`); broadcast `recipe.promoted` on success.
- `recipes.manually_edited_fields JSONB NOT NULL DEFAULT '[]'::jsonb` column — shipped in Phase 25 with default `[]`. Phase 26 D-10 and D-16 are the first writers to this column.
- `current_member` auth dependency (cookie-based per invariant #8) — already used by every recipes endpoint; new /turns endpoints adopt it verbatim.
- `frontend/components/RealtimeProvider.tsx` pattern (`client.onEvent<EventType>('turn.created', ...)` + DOM CustomEvent bridge) — Phase 26 only ships the BACKEND broadcast; the frontend consumer wiring is Phase 28 (`useEffect` in the chat component). But the WS frame contract from D-03 must match what the frontend will eventually parse.

### Established Patterns

- **TEXT + CHECK + locked-vocabulary mirroring** — Phase 24/25 precedent. No new vocabularies in Phase 26, but `AnswerTurnPayload`'s `field` Literal is a derived whitelist (D-08) that should be defined as a named `AnswerField = Literal[...]` type in `schemas/recipe_turn.py` for grep-ability.
- **Service-layer BackgroundTask body opens its own `SessionLocal()`** — invariant from `.planning/phases/02-llm-capture-w2/02-RESEARCH.md` §Pitfall 3, honored in Phase 25's `promote_draft`. D-21 and D-28 follow.
- **Single uvicorn worker; APScheduler in-process** — invariant #7. Enables the app-level asyncio Lock in D-18.
- **`if settings.environment == "test"` short-circuit at the service boundary** — paid-API call sites short-circuit to canned fixtures. D-30 follows for URL extraction.
- **Same-tx denormalized updates** — invariant #3 precedent (`cooking_logs` insert + `recipes.cook_count` / `last_cooked_at` update). D-10 and D-16 follow for `answer` + `proposal_accepted` apply paths.

### Integration Points

- **`POST /recipes/{id}/turns` + `POST /recipes/{id}/turns/photo`** — new endpoints under the existing `/recipes` router prefix in `routers/recipes.py`. Adopt `current_member` dep, household-scoped recipe lookup (404 on cross-household), Pydantic body validation via the `TurnPayload` union.
- **`GET /recipes/{id}/turns`** — new endpoint; 404 if recipe doesn't exist or is cross-household (matches `GET /recipes/{id}`); returns `list[TurnResponse]` ordered by `position ASC`.
- **`turn.created` / `turn.updated` WS event types** — emitted from the new endpoints (D-06/D-07) and from `extract_and_process_url_turn` (D-29). Phase 28 will wire the FE consumer; Phase 26's contract is the broadcast frame shape only.
- **`AnswerTurnPayload` extension** — Phase 25 stub becomes a typed `{kind: 'answer', in_reply_to_turn_id, field, value}` discriminated by `field` for the value type. Frontend will eventually emit these from chip/stepper components (Phase 28 DETAIL-02), but Phase 26 only owns the schema + handler.
- **`AdvisoryTurnPayload` graduation** — Phase 25 stub becomes `{kind: 'advisory', field, current_value, proposed_value, reason_excerpt}` because `proposal_accepted` reads it (D-16). Phase 29 writes it.
- **`backend/pyproject.toml` deps** — adds `trafilatura`, `lxml`, `httpx`. Three new top-level deps; the `uv lock` regeneration is part of the Phase 26 commit.

</code_context>

<specifics>
## Specific Ideas

- **"One endpoint per shape" is the consistent thread** — JSON for 6 kinds + multipart for photo + GET for read + new WS events. Tight surface; each endpoint does one thing. Mirrors Phase 25's "minimal payload" discipline (D-12).
- **The "Phase 26 wires scheduling, Phase 29 fills bodies" pattern** is the load-bearing scope-split. It means Phase 26 ships a complete, testable HTTP/WS surface AND a working URL extraction pipeline, while Phase 29 swaps one function body inside `services/llm.py` to enable the LLM rewrite without touching any router callsite. This pattern is what makes wave-based parallelization viable for v0.6.
- **The `status='draft'` removal landing in Phase 27 retroactively validates "allow turns on any status"** (D-05). Phase 26's endpoint is draft-agnostic by design — Phase 27's lifecycle simplification doesn't ripple back into Phase 26's code.
- **URL extraction is the productize-debt-closure moment for v0.6** — the `# TODO(productize)` has been deferred since v0.1 (CAPTURE-03 of the original 4-wave plan). Closing it inside Phase 26 (rather than a separate productize milestone) is the right move because the URL turn payload shape is being settled fresh here.
- **`proposal_*` handlers ship complete even though the writer is Phase 29** — the alternative (Phase 29 implements both handlers + writer atomically) creates a wide Phase 29 blast radius. Splitting into "Phase 26 read-side / Phase 29 write-side" keeps each phase's surface manageable, at the cost of some dead code between ship dates.

</specifics>

<deferred>
## Deferred Ideas

- **`status='draft'` removal + drafts inbox UI drop + single creation endpoint with embedded turns** — Phase 27 (clean pass).
- **Full-thread Gemini call from `process_thread_turn` / Phase 29 LLM prompt rewrite** — Phase 29 LLM-01..04.
- **`question` / `summary` / `advisory` system turn emission** — Phase 29 (LLM-02 emits `advisory`, LLM-03 emits `question`, the BackgroundTask emits `summary` per LLM-01).
- **Frontend chat component (capture + detail mount points)** — Phase 27 CAPTURE-01..04 + Phase 28 DETAIL-01..05.
- **Per-member turn attribution** — REQUIREMENTS.md §Out of Scope, productize-later.
- **Rate-limiting on POST /turns** — couple-scale doesn't need it; the per-recipe asyncio Lock naturally bounds concurrency. Productize-later when household scale increases.
- **Productize-later swap from app-level asyncio Lock to `pg_advisory_xact_lock`** — when Railway scales out beyond one container. Inline `TODO(productize)` comment in `services/thread.py` per D-18.
- **Robots.txt respect on URL fetch** — couple-scale, low risk. Inline `TODO(productize)` if user sentiment shifts.
- **Push notifications for post-promotion advisories** — REQUIREMENTS.md §Out of Scope. Phase 26 only wires `turn.created` over WebSocket.
- **Re-extraction of legacy Phase 25 backfilled url turns** — they stay un-extracted forever per Phase 25 D-03. A future productize-pass could backfill `extracted_html_path` for them; out of scope here.
- **SSRF defense via private-IP allowlist on URL fetch** — Claude's Discretion bullet; planner can include if cheap.

</deferred>

---

*Phase: 26-thread-api-realtime*
*Context gathered: 2026-05-13*
