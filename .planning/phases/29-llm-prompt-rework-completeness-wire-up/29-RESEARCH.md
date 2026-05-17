# Phase 29: LLM Prompt Rework + Completeness Wire-Up — Research

**Researched:** 2026-05-17
**Domain:** Gemini (google-genai SDK) + Pydantic v2 + SQLAlchemy 2.0 + FastAPI BackgroundTasks + Next.js 16 / React 19
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Full-thread Gemini prompt + idempotency (LLM-01)**
- D-01: Server-side diff for advisories (NOT Gemini structured output). Gemini returns standard `GeminiExtractedRecipe` (+ `summary_body`). BackgroundTask diffs extracted vs current row, gated by `manually_edited_fields`.
- D-02: Thread serialized as role-labeled French prose. Format: `USER (text): {text}` / `USER (voice): {transcript}` / `USER (url): {url}` / `USER (photo): [voir image n°{i}]` / `USER (answer {field}): {value}` / `SYSTEM (summary): {body}` / `SYSTEM (question {field}): {prompt}` / `SYSTEM (advisory {field}): {current} → {proposed}`. Pinned-field set appended as `CHAMPS ÉPINGLÉS...`. Photos as `types.Part.from_bytes` alongside prose.
- D-03: Idempotency via extraction hash: `hashlib.sha256(extracted.model_dump_json(sort_keys=True).encode()).hexdigest()`. Hash stored in most recent `summary` turn's payload as `extraction_hash: str`.
- D-04: Keep `gemini-2.5-flash`.

**Summary turn shape + emission timing (LLM-01)**
- D-05: Extend `GeminiExtractedRecipe` with `summary_body: str = Field(..., max_length=240)`.
- D-06: `summary.payload.chips` = `"{french_label}: {value}"` strings for fields changed this turn.
- D-07: `summary` emitted on every LLM-triggering turn that produces new extraction.
- D-08: `summary_complete` / `summary_later` gate question emission. New column `recipes.questions_deferred_until: timestamp | null`. `summary_complete` → POST `/questions/trigger`. `summary_later` → POST `/questions/defer` sets `now() + 24h`.

**Question turns (LLM-03)**
- D-09: Eligible fields = 11-field `FIELD_KEYS` set. Excludes `seasonality` and `tags`.
- D-10: Input type per field — chip-single: `cuisine`, `difficulty`, `main_protein`; chip-multi: `mood`; stepper: `prep_time_minutes`, `cook_time_minutes`, `servings`; text: `title`, `description`; SKIP: `ingredients`, `steps`.
- D-11: One question per LLM run, highest-priority missing field per `FIELD_KEYS` order.
- D-12: De-dup: unanswered question = `question` turn with `payload.field == X` AND no later `answer` turn with `kind == "answer"` and `payload.in_reply_to_turn_id == that_question.id`.
- D-13: `QuestionTurnPayload` shape: `{kind, field, prompt, input_type, options, multi}`.
- D-14: Locked French prompt strings per field in `_FIELD_PROMPTS_FR`.
- D-15: NEW module `backend/app/services/completeness.py` — parallel of `frontend/lib/recipe-completeness.ts`.

**Advisory emission (LLM-02)**
- D-16: Conflict = strict equality after type-normalize (strings trim+case-sensitive; enums literal; numbers integer; unordered lists set; ordered lists positional).
- D-17: `reason_excerpt` = literal slice of most recent user turn, truncated 120 chars.
- D-18: De-dup: suppress if open advisory for same field already exists (unresolved).
- D-19: Emit advisories for all 13 `AnswerField` keys (no skip list).

**Summary CTA wire-up (Phase 27 deferred stubs)**
- D-20: New endpoints: `POST /recipes/{id}/questions/trigger` (201 or 204) and `POST /recipes/{id}/questions/defer` (204).
- D-21: New migration: `recipes.questions_deferred_until: timestamp | null` (NULL default). Drop on downgrade.
- D-22: Frontend `SystemBubble.tsx` summary CTAs wire `onClick` to new endpoints.

### Claude's Discretion

- Prompt builder location: inline in `services/llm.py` (recommended).
- Test mode bypass: extend `if settings.environment == "test":` guards; add `canned_thread_extract` to `llm_fixtures.py`.
- `_FIELD_LABELS_FR` in `services/completeness.py`: hand-maintained (recommended over generated file).
- Photo content in thread prompt: `USER (photo): [voir image n°{i}]` + separate `types.Part.from_bytes` parts; max 4 photos.
- Migration filename: `0011_add_questions_deferred_until.py`.
- Tests: pytest coverage for completeness parity, prompt builder, advisory de-dup, question emission, summary hash idempotency, defer/trigger endpoints. Playwright e2e for summary CTA.
- `process_thread_turn` async vs sync: planner may convert to `async def` (BackgroundTasks accepts both).
- Hash storage: in `summary` turn payload (recommended, zero schema change beyond `questions_deferred_until`).
- Failure mode for `process_thread_turn`: reuse `_record_turn_enrichment_failure`.
- Shared `_run_thread_llm(db, recipe, trigger_turn_id) -> None` for common body.

### Deferred Ideas (OUT OF SCOPE)

- Question turns for `seasonality`, `tags`, `ingredients`, `steps`.
- Per-field defer settings.
- Indefinite defer.
- Gemini-generated `reason_excerpt`.
- Tolerant conflict comparison.
- Skip advisories on free-text fields.
- Multi-call Gemini orchestration.
- Gemini model upgrade.
- Per-recipe `questions_deferred_until` UI surface (badges/reset button).
- De-normalize `extraction_hash` onto `recipes.last_extraction_hash`.
- Backend-driven resolution detection index.
- Turn editing/deletion.
- Push notifications for advisories.
- Per-member turn attribution.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LLM-01 | Gemini prompt receives full ordered thread + pinned-field set; single call per trigger; full re-read idempotency | D-01..D-07; `_build_thread_prompt`, `_run_thread_llm` shape documented below |
| LLM-02 | BackgroundTask emits `advisory` turn for each pinned field where LLM interpretation conflicts; does NOT silently overwrite | D-16..D-19; `_should_emit_advisory`, `is_conflict` helpers documented below |
| LLM-03 | BackgroundTask emits ONE `question` turn for highest-priority missing field; parallel Python completeness module | D-09..D-15; `compute_completeness`, `INPUT_TYPE_MAP`, `_FIELD_PROMPTS_FR` documented below |
| LLM-04 | `CompletenessCard` stays unchanged (passive read-only indicator) | Verified: CompletenessCard mounts unchanged per D-15 parity design |
</phase_requirements>

---

## Summary

Phase 29 fills the `process_thread_turn` stub at `services/llm.py:740` and extends `promote_draft` to emit `summary` / `question` / `advisory` system turns after every LLM-triggering capture. The Gemini prompt is rebuilt around the full ordered thread serialized as role-labeled French prose, with photo bytes passed as `types.Part.from_bytes` parts alongside the prose text. The existing `GeminiExtractedRecipe` schema gains `summary_body: Optional[str] = None` (see pitfall below for why it must be `Optional`). A new `backend/app/services/completeness.py` module ports `frontend/lib/recipe-completeness.ts` byte-for-byte. One Alembic migration adds `recipes.questions_deferred_until`. Two new endpoints wire the `summary_complete` / `summary_later` CTA buttons from Phase 27.

**Primary recommendation:** Make `_run_thread_llm` and `process_thread_turn` both `async def`. This is mandatory because `process_thread_turn` is called from within `extract_and_process_url_turn` (an `async def` at line 901), and any `asyncio.run()` call inside a synchronous `process_thread_turn` would raise `RuntimeError: cannot run event loop while event loop is running`. `promote_draft` stays `sync def` and calls `asyncio.run(_run_thread_llm(...))` for its broadcast (same as the existing `_broadcast_promoted` pattern).

---

## Project Constraints (from CLAUDE.md)

- **MVP posture:** Clean rewrites only. `SummaryTurnPayload` + `QuestionTurnPayload` stubs are REPLACED atomically (no compat shim). `extract_from_transcript` and `extract_from_photos` may be deleted if no other callers remain after `_run_thread_llm` subsumes them.
- **Gemini SDK:** `google-genai` unified SDK (NOT `google.generativeai`). Imports: `from google import genai; from google.genai import types`. [VERIFIED: runtime import confirmed]
- **Single uvicorn worker:** Invariant #7 — APScheduler in-process, no multi-worker concerns.
- **Locked vocabularies:** `services/completeness.py` joins the locked-vocabulary discipline. Drift between `FIELD_KEYS`, `INPUT_TYPE_MAP`, `_FIELD_PROMPTS_FR`, `_FIELD_LABELS_FR`, `OPTIONS_MAP` in `completeness.py` and `frontend/lib/recipe-completeness.ts` / `frontend/lib/enum-labels.ts` is a bug category.
- **HttpOnly cookie auth:** Invariant #8 — frontend calls go through Next.js rewrites. New endpoints (`/questions/trigger`, `/questions/defer`) follow same auth pattern as existing turns endpoints.
- **Realtime contract:** Invariant #4 — `turn.created` broadcasts for system turns already in place per Phase 26 D-06. No new event types needed.
- **Raw inputs preserved:** Invariant #5 — full thread re-read every LLM run satisfies this.
- **Next.js 16 breaking changes:** Consult `frontend/node_modules/next/dist/docs/` before writing frontend code.

---

## Standard Stack

### Core (backend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `google-genai` | `>=1.75` [VERIFIED: pyproject.toml] | Gemini API calls | Unified SDK; legacy `google.generativeai` deprecated 2025-08-31 |
| `pydantic` | `2.13.3` [VERIFIED: uv run python] | Schema definitions + validation | Project-wide |
| `sqlalchemy` | `>=2.0` [VERIFIED: pyproject.toml] | ORM + typed mapped columns | Project-wide |
| `hashlib` | stdlib | SHA256 hashing for extraction idempotency | No extra dep |
| `json` | stdlib | Canonical JSON for deterministic hash | `sort_keys=True` parameter |

### Core (frontend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-intl` | Project standard | i18n keys for new toast string | Already in use |
| `api()` helper | `frontend/lib/api.ts` | `summary_complete` / `summary_later` POST calls | Project-standard fetch wrapper |

---

## Architecture Patterns

### Existing Pattern: BackgroundTask + SessionLocal

Both `promote_draft` (sync) and `extract_and_process_url_turn` (async) open their own `SessionLocal()`. Phase 29's `_run_thread_llm` receives `db: Session` from its caller rather than opening a new session — both callers already have one open. [VERIFIED: CONTEXT.md code_context; existing llm.py pattern]

```python
# _run_thread_llm receives the caller's session
async def _run_thread_llm(
    db: Session,
    recipe: Recipe,
    trigger_turn_id: UUID,
) -> None:
    ...
```

### Existing Pattern: Broadcast in async vs sync context

`_broadcast_promoted` (sync helper, uses `asyncio.run()`) guards against reentrant calls with `asyncio.get_running_loop()`. For the new `_run_thread_llm` (async), broadcasts are `await broadcast_to_household(...)` directly — no `asyncio.run()` needed. For `promote_draft` (stays sync), wrapping the async `_run_thread_llm` via `asyncio.run()` is the correct pattern. [VERIFIED: llm.py:453-478; starlette BackgroundTask source confirmed async callables are awaited in event loop]

```python
# In promote_draft (sync def) — wraps async _run_thread_llm:
asyncio.run(_run_thread_llm(db, recipe, first_turn.id))

# In process_thread_turn (async def) — awaits directly:
await _run_thread_llm(db, recipe, turn_id)
```

### Existing Pattern: JSONB mutation + flag_modified

When UPDATING an existing turn's JSONB payload, use `flag_modified(turn, "payload")` after `turn.payload = {**(turn.payload or {}), "new_key": value}`. For NEW turn inserts, payload is set at construction time — no `flag_modified` needed. [VERIFIED: llm.py:880-882 pattern]

### Existing Pattern: Test-mode bypass

```python
if settings.environment == "test":
    from app.services.llm_fixtures import canned_thread_extract
    extracted = canned_thread_extract(turns, pinned)
else:
    # real Gemini call
```

### New Pattern: System Turn Insertion (series of advisory/question/summary)

Positions for system turns are assigned sequentially in one transaction. Since `_run_thread_llm` is called after the triggering user turn is already committed, positions must be read fresh:

```python
# Get next available position
max_pos = db.scalar(
    select(func.max(RecipeTurn.position)).where(RecipeTurn.recipe_id == recipe.id)
)
base_pos = 0 if max_pos is None else max_pos + 1

# Insert advisory turns at base_pos, base_pos+1, ... then summary at base_pos+N
# Insert question turn after summary
```

The DB `UNIQUE(recipe_id, position)` constraint is the backstop under invariant #7 (single worker). The asyncio lock from `services/thread.py` is available only from `async` contexts — `_run_thread_llm` being `async def` means it can use `acquire_position_lock` if needed. However, since the triggering user turn is already committed and no concurrent user-turn POST can race with a BackgroundTask on the same recipe (single worker + sequential), DB `MAX(position)` in the same transaction is sufficient. [VERIFIED: thread.py pattern; invariant #7]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA256 hash of Pydantic model | Custom serialization | `hashlib.sha256(json.dumps(extracted.model_dump(), sort_keys=True, ensure_ascii=False).encode()).hexdigest()` | See Pitfall 1 |
| JSONB sub-key mutations | Direct dict assignment | `turn.payload = {**old, "key": val}` + `flag_modified(turn, "payload")` | SQLAlchemy change detection |
| Async broadcasts from sync BackgroundTask | Custom thread pool | `asyncio.run(broadcast_to_household(...))` with running-loop guard (existing `_broadcast_promoted` pattern) | RuntimeError on reentry |
| Field-level completeness | Per-caller logic | `compute_completeness(recipe)` in `services/completeness.py` | Single source; parity with frontend |
| Vocabulary option lists | Hardcoded in prompt | `OPTIONS_MAP` in `completeness.py` importing from `_VALID_*` frozensets in `schemas/recipe_turn.py` | Drift-free |

---

## Critical Pitfalls

### Pitfall 1: D-03 says `model_dump_json(sort_keys=True)` — THIS DOES NOT EXIST IN PYDANTIC V2

**What goes wrong:** `GeminiExtractedRecipe.model_dump_json()` in Pydantic v2 has NO `sort_keys` parameter. The CONTEXT.md D-03 description (`hashlib.sha256(extracted.model_dump_json(sort_keys=True).encode()).hexdigest()`) will raise `TypeError: BaseModel.model_dump_json() got an unexpected keyword argument 'sort_keys'`.

**Verified:** Confirmed `TypeError` at runtime with Pydantic 2.13.3.

**Fix (use this instead):**
```python
import hashlib, json

def _extraction_hash(extracted: GeminiExtractedRecipe) -> str:
    canonical = json.dumps(
        extracted.model_dump(), sort_keys=True, ensure_ascii=False
    )
    return hashlib.sha256(canonical.encode()).hexdigest()
```

**Risk if wrong:** Hash collisions (non-canonical field order varies between Python dict iterations pre-3.7; fine in 3.12, but `sort_keys=True` via json.dumps is still the deterministic canonical form).

### Pitfall 2: `summary_body: str = Field(...)` BREAKS `apply_voice_modification`

**What goes wrong:** `apply_voice_modification` uses `GeminiExtractedRecipe` as `response_schema` for its Gemini call. The `_MODIFY_PROMPT` does NOT request `summary_body`. If `summary_body` is declared `str = Field(...)` (required), Gemini's response for voice-modify will not include it, causing `ValidationError` when parsing.

**`apply_voice_modification` IS still used** by `POST /recipes/{id}/voice-modify` (confirmed at `routers/recipes.py:415`). It cannot be deleted.

**Fix (use Optional):**
```python
summary_body: Optional[str] = None  # Thread path fills this; voice-modify leaves None
```

**In `_run_thread_llm`, guard:**
```python
summary_body = extracted.summary_body or f"J'ai mis à jour {len(changed_fields)} champ(s)."
```

**Risk if wrong:** `POST /recipes/{id}/voice-modify` always returns 502 after Phase 29 (Gemini validation fails).

### Pitfall 3: `asyncio.run()` inside `process_thread_turn` if it stays `sync def`

**What goes wrong:** `extract_and_process_url_turn` (async def) calls `process_thread_turn(recipe_id, turn_id)` synchronously at line 901 while inside a running event loop. If `process_thread_turn` (sync def) internally calls `asyncio.run()` for broadcasts, Python raises `RuntimeError: This event loop is already running`.

**Verified:** `asyncio.get_running_loop()` would not raise in this context; `asyncio.run()` would therefore fail.

**Fix:** Convert `process_thread_turn` to `async def`. Update callsite at line 901 to `await process_thread_turn(recipe_id, turn_id)`. `BackgroundTasks.add_task` accepts both sync and async callables (confirmed from starlette source: async callables are awaited directly, sync callables run in threadpool).

**Impact on `promote_draft`:** `promote_draft` stays `sync def`. Its internal calls to `_run_thread_llm` (which is `async def`) use `asyncio.run(_run_thread_llm(db, recipe, trigger_turn_id))`. This is safe because `promote_draft` is scheduled as a sync BackgroundTask (runs in threadpool, no running event loop).

### Pitfall 4: `extract_from_transcript` / `extract_from_photos` still called in `promote_draft`

**Current state:** `promote_draft` voice branch calls `extract_from_transcript` (line 669); photo branch calls `extract_from_photos` (line 696). Phase 29 replaces these calls with `_run_thread_llm`.

**Risk:** If executor forgets to remove these calls from `promote_draft` branches, the thread LLM runs twice. [VERIFIED: identified callers at lines 669, 696]

**Fix:** Phase 29 replaces these direct calls with the shared `_run_thread_llm` body. After replacement, `extract_from_transcript` and `extract_from_photos` have NO remaining callers and MUST be deleted per MVP no-shim posture. [VERIFIED: grep confirms zero other callers outside llm.py]

### Pitfall 5: ~~`RecipeResponse` is missing `manually_edited_fields`~~ — RESOLVED 2026-05-17

**Status:** RESOLVED via commit `1953997 fix(28): restore Phase 28 work accidentally wiped by docs(29) commit`. The full Phase 28 wipe (1331 lines across 10 files + 4 deleted SUMMARY/VERIFICATION files) has been salvaged from `86da606`. `RecipeResponse.manually_edited_fields` is back in place (`backend/app/schemas/recipe.py:155`). All Phase 28 surfaces — SystemBubble onClick handlers, `_apply_put_pinning`, RecipeForm marginalia, page.tsx optimistic handlers, e2e specs — are restored. Wave 1 of Phase 29 should **NOT** re-add this field; it exists. The planner should skip this finding entirely.

**Original finding** (kept for audit): The `docs(29): capture phase context` commit (81cd858) accidentally swept in pre-existing staged deletions that wiped Phase 28 work. The pattern was already documented as recurring on Phases 27 and 28 — see PROJECT.md "Worktree-harness contamination surfaced AGAIN" notes. The documented salvage pattern (`git checkout <pre-wipe-commit> -- <files>`) was applied verbatim.

### Pitfall 6: Photo turns in thread need position-aware byte fetching

**What goes wrong:** Photo turns' `payload.photo_paths` is a list of Supabase Storage paths. The prompt builder must download each photo's bytes using `storage_service.download_recipe_photo(path)`. Embedding bytes directly is within Gemini's 1M token window for 4 images (<20MB total). However, the builder must not download if more than 4 photo turns exist across the full thread (token budget cap) — apply the same cap as `extract_from_photos` (max 4 photos total per call). [VERIFIED: existing pattern at llm.py:271-277]

```python
# In _build_thread_prompt: accumulate photo_parts up to 4 total across all photo turns
photo_count = 0
for turn in thread:
    if turn.kind == "photo" and photo_count < 4:
        for path in (turn.payload.get("photo_paths") or []):
            if photo_count >= 4:
                break
            photo_bytes = storage_service.download_recipe_photo(path)
            photo_parts.append(types.Part.from_bytes(data=photo_bytes, mime_type="image/jpeg"))
            photo_count += 1
```

### Pitfall 7: `_build_thread_prompt` must return BOTH prose string AND parts list

**What goes wrong:** The Gemini call for `extract_from_photos` uses `contents=[_EXTRACT_PROMPT_PHOTOS, *parts]` where the first element is the prose string and the rest are `types.Part` objects. For the thread call, the prose IS the prompt (all turn serializations concatenated) plus the photo byte parts. The return type must be `tuple[str, list[types.Part]]`:

```python
def _build_thread_prompt(
    thread: list[RecipeTurn],
    pinned: set[str],
    db: Session,
) -> tuple[str, list[types.Part]]:
    ...
    return prose, photo_parts  # prose contains [voir image n°{i}] placeholders

# Gemini call:
prose, parts = _build_thread_prompt(thread, pinned, db)
contents = [prose, *parts]  if parts else [prose]
```

**Verified:** Existing pattern at llm.py:274-285 — `contents=[str, *Part_list]` is the supported mixed format.

### Pitfall 8: Advisory de-dup walk must handle empty turns list

**What goes wrong:** `_should_emit_advisory(turns, field, proposed_value)` walks `turns[]` backward to find the most recent advisory for the field. If `turns` is empty or contains no prior advisories, the function must return `True` (allow emission). Defensive guard is required.

### Pitfall 9: `questions_deferred_until` check uses server-side `now()`

**What goes wrong:** Checking `recipe.questions_deferred_until > datetime.now()` in Python code requires timezone-aware comparison. The column is `DateTime(timezone=True)` — it stores UTC. Use:

```python
from datetime import datetime, timezone
if recipe.questions_deferred_until and recipe.questions_deferred_until > datetime.now(tz=timezone.utc):
    # questions deferred — skip emission
```

---

## Architecture Decisions Resolved

### 1. `process_thread_turn`: async def (mandatory)

**Decision:** Convert `process_thread_turn` from `sync def` to `async def`. [VERIFIED via starlette BackgroundTask source]

**Rationale:** Called from `extract_and_process_url_turn` (async def) at line 901. Any `asyncio.run()` inside the sync body would RuntimeError. Conversion is safe: `BackgroundTasks.add_task` accepts async callables (confirmed).

**Callsite change at llm.py:901:** `process_thread_turn(recipe_id, turn_id)` → `await process_thread_turn(recipe_id, turn_id)`.

**No other callsite changes required.** Router calls `background_tasks.add_task(process_thread_turn, ...)` — unchanged.

### 2. `_run_thread_llm`: async def, receives `db: Session`

```python
async def _run_thread_llm(
    db: Session,
    recipe: Recipe,
    trigger_turn_id: UUID,
) -> None:
    """Shared body: build thread prompt, call Gemini, diff, emit advisory/question/summary turns."""
```

Called via `asyncio.run()` from `promote_draft` (sync), `await` from `process_thread_turn` (async). Both callers pass their already-open `db` session.

### 3. `extract_from_transcript` / `extract_from_photos`: DELETE

After `_run_thread_llm` subsumes the voice/photo paths in `promote_draft`, both functions have zero callers. Delete per MVP no-shim posture. `apply_voice_modification` stays (has its own caller). The `llm_fixtures.py` functions `canned_voice_recipe` and `canned_photo_recipe` also become dead code — delete those too (or keep if other tests reference them — check).

**Verified: no callers outside llm.py's own promote_draft branches** (grep confirms).

### 4. `summary_body` is `Optional[str] = None` in `GeminiExtractedRecipe`

Mandatory to avoid breaking `apply_voice_modification`. The thread-extraction prompt explicitly requests `summary_body`; the voice-modify prompt does not. `_run_thread_llm` uses a server-generated fallback if `extracted.summary_body` is None. [VERIFIED: apply_voice_modification at routers/recipes.py:415 uses GeminiExtractedRecipe as response_schema]

### 5. Endpoints stay in `routers/recipes.py`

Per D-20 and D-25 (Claude's Discretion), keep both new endpoints in the existing `recipes.py` router. No new `routers/questions.py` for v0.6.

### 6. `extraction_hash` JSON key name

D-03 specifies storing in `summary` turn payload. Recommend key name `extraction_hash` (matches D-03 prose). Payload shape for summary turns:
```python
{
    "kind": "summary",
    "body": "J'ai extrait la recette : ...",
    "chips": ["cuisine: italien", "difficulté: facile"],
    "extraction_hash": "sha256hex..."
}
```

### 7. Failure mode: reuse `_record_turn_enrichment_failure`

If Gemini fails during `process_thread_turn`, the recipe is already `structured`. Reuse `_record_turn_enrichment_failure` (recipe status unchanged; failure surfaced on turn payload). If Gemini fails during `promote_draft` LLM branches (voice/photo), use existing `_record_failure` (status → 'failed'). [VERIFIED: existing helper at llm.py:534]

### 8. `_extract_reason_from_thread` algorithm

Walk `turns[]` backward from `trigger_turn_id` position. Stop at first `sender == "user"` turn. Extract per kind:
- `text`: `payload.text[:120]`
- `voice`: `payload.transcript[:120]`
- `url`: `f"extrait de {payload.url[:100]}"`
- `photo`: `"extrait de la photo"`
- `answer`: `f"tu as répondu : « {payload.value} »"`

Wrap result in `« »`: `f"« {excerpt} »"`. Strip newlines before truncation.

### 9. Advisory emission order before summary

Emit all advisories, then question, then summary. Within the same transaction (atomic). Positions: `advisory_turns` get consecutive positions, `question` follows, `summary` last. All broadcast via `await broadcast_to_household(...)` after commit, one `turn.created` per turn.

---

## Schemas to Graduate (from Phase 25 stubs)

### `SummaryTurnPayload` (currently a stub at schemas/recipe_turn.py:204)

```python
class SummaryTurnPayload(BaseModel):
    kind: Literal["summary"]
    body: str                    # Gemini-generated or server-fallback French prose
    chips: list[str] = Field(default_factory=list)  # "{label}: {value}" strings
    extraction_hash: str         # SHA256 of GeminiExtractedRecipe.model_dump() sorted
```

### `QuestionTurnPayload` (currently a stub at schemas/recipe_turn.py:209)

```python
class QuestionTurnPayload(BaseModel):
    kind: Literal["question"]
    field: AnswerField
    prompt: str
    input_type: Literal["chip", "stepper", "text"]
    options: list[str] = Field(default_factory=list)  # empty for stepper/text
    multi: bool = False          # True only for "mood" chip-multi field
```

**Both REPLACE the Phase 25 stubs atomically (MVP no-shim).** The discriminated union in `TurnPayload` is already set up; only the stub class bodies change.

---

## `services/completeness.py` — Python Port Specification

Port of `frontend/lib/recipe-completeness.ts`. Exposes:

```python
from typing import Literal, Optional
from app.models.recipe import Recipe

FieldKey = Literal[
    "title", "description", "ingredients", "steps",
    "prep_time_minutes", "cook_time_minutes", "servings",
    "difficulty", "cuisine", "mood", "main_protein",
]

FIELD_KEYS: tuple[FieldKey, ...] = (
    "title", "description", "ingredients", "steps",
    "prep_time_minutes", "cook_time_minutes", "servings",
    "difficulty", "cuisine", "mood", "main_protein",
)

def is_field_filled(recipe: Recipe, key: FieldKey) -> bool:
    """Strict non-empty rule (mirrors TypeScript isFieldFilled):
    - strings: not None AND strip() != ""
    - numbers: not None (0 is valid)
    - arrays: len > 0 (None = empty)
    """
    ...

def compute_completeness(recipe: Recipe) -> tuple[int, list[FieldKey]]:
    """Returns (percent: int, missing_fields: list[FieldKey]) in FIELD_KEYS order."""
    ...

def is_conflict(field: str, current: Any, proposed: Any) -> bool:
    """D-16 strict equality after type-normalize."""
    ...

# Input type map (D-10)
INPUT_TYPE_MAP: dict[FieldKey, Optional[Literal["chip", "stepper", "text"]]] = {
    "title": "text",
    "description": "text",
    "prep_time_minutes": "stepper",
    "cook_time_minutes": "stepper",
    "servings": "stepper",
    "difficulty": "chip",
    "cuisine": "chip",
    "mood": "chip",
    "main_protein": "chip",
    "ingredients": None,  # SKIP
    "steps": None,        # SKIP
}

# Locked French prompts (D-14)
_FIELD_PROMPTS_FR: dict[FieldKey, str] = {
    "title": "Quel est le titre de cette recette ?",
    "description": "En une phrase, comment décrirais-tu cette recette ?",
    "prep_time_minutes": "Combien de minutes de préparation ?",
    "cook_time_minutes": "Combien de minutes de cuisson ?",
    "servings": "Pour combien de personnes ?",
    "difficulty": "Quel niveau de difficulté ?",
    "cuisine": "Quelle cuisine ?",
    "mood": "Quelle ambiance ?",
    "main_protein": "Quelle protéine principale ?",
}

# French field labels for chip display (D-06)
_FIELD_LABELS_FR: dict[FieldKey, str] = {
    "title": "titre",
    "description": "description",
    "ingredients": "ingrédients",
    "steps": "étapes",
    "prep_time_minutes": "préparation",
    "cook_time_minutes": "cuisson",
    "servings": "personnes",
    "difficulty": "difficulté",
    "cuisine": "cuisine",
    "mood": "ambiance",
    "main_protein": "protéine",
}

# Chip options (import from _VALID_* frozensets in schemas/recipe_turn.py — drift-free)
OPTIONS_MAP: dict[FieldKey, list[str]] = {
    "difficulty": sorted(_VALID_DIFFICULTIES),
    "cuisine": sorted(_VALID_CUISINES),
    "mood": sorted(_VALID_MOODS),
    "main_protein": sorted(_VALID_PROTEINS),
    # others: empty list (stepper, text, skip)
}
```

**Locked-vocabulary enforcement:** `OPTIONS_MAP` imports from `_VALID_*` frozensets in `schemas/recipe_turn.py` — single source, no drift risk. `_FIELD_LABELS_FR` mirrors `ANSWER_FIELD_LABELS` in `frontend/lib/enum-labels.ts` (static map, 13 keys). [VERIFIED: enum-labels.ts ANSWER_FIELD_LABELS at line 18-32]

---

## Migration Shape: `0011_add_questions_deferred_until.py`

```python
revision: str = "0011"
down_revision: str = "0009"  # VERIFY: check last migration is 0009

def upgrade() -> None:
    op.add_column(
        "recipes",
        sa.Column(
            "questions_deferred_until",
            sa.DateTime(timezone=True),
            nullable=True,
        )
    )

def downgrade() -> None:
    op.drop_column("recipes", "questions_deferred_until")
```

**No backfill needed** (NULL = "not deferred"). [VERIFIED: existing DateTime(timezone=True) pattern at recipe.py:116 for `last_cooked_at`]

**ALSO NEEDED in schema.py `RecipeResponse`:** Add `questions_deferred_until: Optional[datetime] = None`. (Note: `manually_edited_fields` is already present per the Phase 28 restoration in commit `1953997`; do NOT re-add — see Pitfall 5 RESOLVED note.)

---

## SQLAlchemy 2.0 ORM Column Addition

Add to `backend/app/models/recipe.py` inside `Recipe` class:

```python
# Phase 29 D-21 — question deferral gate. NULL = questions allowed.
# Set by POST /recipes/{id}/questions/defer to now() + 24h.
questions_deferred_until: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True), nullable=True
)
```

Pattern mirrors `last_cooked_at` at recipe.py:116. [VERIFIED: exact same column type]

---

## Frontend Changes

### `RecipeThread/types.ts` extension

Add to the detail-mode branch of `RecipeThreadProps`:

```typescript
/** Whether questions are currently deferred (derived from recipe.questions_deferred_until). */
deferred?: boolean;
onSummaryComplete: (turnId: string) => Promise<void>;
onSummaryLater: (turnId: string) => Promise<void>;
```

### `RecipeThread/SystemBubble.tsx` summary branch

The current summary branch (lines 43-87) has `<button>` elements with no `onClick`. Phase 29 wires them. The `SystemBubble` receives `turn` only — callbacks must flow from the parent via props or a context. Given the existing prop-drilling pattern in `RecipeThread`, extend `SystemBubble` to accept `onSummaryComplete` / `onSummaryLater` callbacks OR pass them through `index.tsx` render.

**Existing render path in `index.tsx` line 255:**
```tsx
<SystemBubble turn={turn} />
```

Phase 29 extends to:
```tsx
<SystemBubble
  turn={turn}
  deferred={props.deferred}
  onSummaryComplete={props.onSummaryComplete}
  onSummaryLater={props.onSummaryLater}
/>
```

### `frontend/app/recipes/[id]/page.tsx` new handlers

```typescript
const handleSummaryComplete = useCallback(async (turnId: string) => {
  if (!id) return;
  const res = await api(`/api/recipes/${id}/questions/trigger`, { method: "POST" });
  if (res === null || (res as Response).status === 204) {
    toast.success(tThread("all_complete"));
  }
  // 201: new question turn arrives via turn.created WS (already subscribed)
}, [id, tThread]);

const handleSummaryLater = useCallback(async (_turnId: string) => {
  if (!id) return;
  await api(`/api/recipes/${id}/questions/defer`, { method: "POST" });
  // recipe.updated WS will carry questions_deferred_until; setRecipe updates deferred prop
}, [id]);
```

### `frontend/lib/recipes.ts` Recipe type extension

```typescript
questions_deferred_until?: string | null;
```

### i18n key addition (`frontend/lib/i18n/fr.json`)

Under `recipes.thread`:
```json
"all_complete": "Tout est complet."
```

---

## Test Architecture

### `backend/tests/test_completeness.py` (NEW)

Port `frontend/lib/recipe-completeness.test.ts` verbatim. Pattern: pytest functions, no fixtures needed (pure functions). Covers:
- 100% complete recipe → percent=100, missingFields=[]
- Title-only → percent=9, missingFields=[10 fields]
- Percent rounding: 5/11 → 45, 6/11 → 55
- String trim (whitespace-only → missing)
- Number zero is valid
- Number null → missing
- Array empty → missing
- Canonical field order preserved

### `backend/tests/test_llm_thread.py` (NEW)

```python
# Test helpers needed:
def _make_structured_recipe(db, member):
    ...

def _make_user_turn(db, recipe, kind, payload):
    ...

def _make_system_turn(db, recipe, kind, payload):
    ...
```

Tests (all using `db_session` + `client` fixtures per conftest.py pattern):

1. **Prompt builder shape** — `_build_thread_prompt` with mixed turns produces expected prose structure + photo_parts count.
2. **Advisory de-dup** — `_should_emit_advisory`: open advisory suppresses; resolved advisory allows; different proposed_value allows.
3. **Question emission** — highest-priority missing field is picked; already-open question skips to next.
4. **Summary hash idempotency** — re-run with same thread produces no new summary turn (extraction_hash match).
5. **Defer endpoint** — `POST /questions/defer` sets `questions_deferred_until`; subsequent LLM run skips question emission.
6. **Trigger endpoint complete** — `POST /questions/trigger` with all fields filled → 204 No Content.
7. **Trigger endpoint missing field** — `POST /questions/trigger` with missing field → 201 + question turn.
8. **`process_thread_turn` integration** — submits text turn, verifies summary + question turns emitted in test mode (uses `canned_thread_extract` fixture).

### Playwright e2e

Add to `frontend/tests/e2e/recipe-detail.spec.ts` or new file:
- Tap "Oui, compléter" → new question turn appears in thread (via WS).
- Tap "Plus tard" → no question turn on next refinement (deferral active).

---

## `canned_thread_extract` Fixture Shape

Add to `backend/app/services/llm_fixtures.py`:

```python
def canned_thread_extract(
    turns: list,  # list[RecipeTurn]
    pinned: set[str],
) -> "GeminiExtractedRecipe":
    """Deterministic thread extraction result for test mode (Phase 29).
    
    Returns the same 'risotto' shape as canned_voice_recipe so existing
    Playwright recipe assertions still match. summary_body is a French
    prose stub. Ignores turns content (deterministic).
    """
    from app.services.llm import GeminiExtractedRecipe, GeminiIngredient
    return GeminiExtractedRecipe(
        title="Risotto aux champignons (test)",
        # ... same as canned_voice_recipe ...
        summary_body="J'ai extrait la recette : risotto aux champignons, 2 personnes.",
    )
```

---

## Open Questions — Resolved

| Question | Resolution |
|----------|-----------|
| 1. Delete `extract_from_transcript` / `extract_from_photos`? | YES — delete. Zero callers after Phase 29. `apply_voice_modification` stays. |
| 2. `_run_thread_llm` sync or async? | ASYNC — mandatory (called from async `extract_and_process_url_turn`). |
| 3. Photo bytes in prompt — inline placeholder + separate parts? | YES — `[voir image n°{i}]` in prose + `types.Part.from_bytes` parts. Max 4 photos total. |
| 4. New endpoints in `recipes.py` or `questions.py`? | `recipes.py` — per D-20/D-25. |
| 5. `_FIELD_PROMPTS_FR` dict — verified shape? | Documented above in completeness.py spec. |
| 6. `extraction_hash` JSON key name? | `extraction_hash` (literal key in summary payload dict). |
| 7. Failure mode — reuse `_record_turn_enrichment_failure`? | YES — recipe stays structured, failure on turn payload. |
| 8. `_extract_reason_from_thread` skips system turns? | YES — walks backward, stops at first `sender == "user"` turn. |

---

## Open Contracts for Planner to Lock

1. **Photo token cap across thread:** CONTEXT.md recommends max 4 photos total (matches `extract_from_photos` limit). Lock this as `_MAX_PHOTO_PARTS = 4`.

2. **`process_thread_turn` callsite at llm.py:901:** Change from `process_thread_turn(recipe_id, turn_id)` to `await process_thread_turn(recipe_id, turn_id)` (mandatory, confirmed above).

3. **`promote_draft` `_run_thread_llm` call:** Use `asyncio.run(_run_thread_llm(db, recipe, first_turn.id))` inside the existing sync BackgroundTask body, after the kind-specific preamble (title rewrite for text; photo download for photo; illustration for both). The text branch removes the title-rewrite step OR moves it into `_run_thread_llm` (recommend: keep title-rewrite in promote_draft text branch since it's not thread-driven; `_run_thread_llm` handles the rest).

4. **`manually_edited_fields` in `RecipeResponse`:** RESOLVED via commit `1953997`. The Phase 28 wipe was salvaged before this research was consumed by the planner; do NOT include re-adding this field in Wave 1. See Pitfall 5 (RESOLVED) for the recovery details.

5. **`summary` turn payload `extraction_hash` lookup:** When checking idempotency in `_run_thread_llm`, scan the most recent `summary` turn for `payload.get("extraction_hash")`. If it matches the new hash: skip all emission. If it differs OR no prior summary exists: proceed with emission.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `apply_voice_modification` must be kept (not deleted) | Architecture Decisions §3 | Low — verified via grep; only risk is unknown caller |
| A2 | The `docs(29)` commit's deletion of `manually_edited_fields` was accidental and must be reverted | Pitfall 5 | Medium — if intentional removal, Phase 28 DETAIL-05 tests would fail |
| A3 | `acquire_position_lock` from `services/thread.py` is available to async `_run_thread_llm` | Architecture Patterns §System Turn Insertion | Low — alternative is DB MAX(position) in transaction which is equally safe under invariant #7 |

**If this table is empty of HIGH-risk items:** All critical claims verified at runtime.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (existing, backend/tests/) |
| Config file | none detected — runs via `uv run pytest backend/tests/` |
| Quick run command | `uv run pytest backend/tests/test_completeness.py -x` |
| Full suite command | `uv run pytest backend/tests/ -x` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LLM-01 | Thread prompt emits summary turn with correct body/chips/hash | unit | `uv run pytest backend/tests/test_llm_thread.py::test_summary_idempotency -x` | ❌ Wave 0 |
| LLM-01 | Re-saving same thread does not emit second summary | unit | `uv run pytest backend/tests/test_llm_thread.py::test_summary_hash_dedup -x` | ❌ Wave 0 |
| LLM-02 | Conflicting field on pinned recipe emits advisory turn | unit | `uv run pytest backend/tests/test_llm_thread.py::test_advisory_emission -x` | ❌ Wave 0 |
| LLM-02 | Open advisory de-duplicated (not emitted twice) | unit | `uv run pytest backend/tests/test_llm_thread.py::test_advisory_dedup -x` | ❌ Wave 0 |
| LLM-03 | Missing field triggers question turn with correct payload | unit | `uv run pytest backend/tests/test_llm_thread.py::test_question_emission -x` | ❌ Wave 0 |
| LLM-03 | Defer endpoint suppresses question emission for 24h | unit | `uv run pytest backend/tests/test_llm_thread.py::test_defer_silences_questions -x` | ❌ Wave 0 |
| LLM-03 | Trigger endpoint returns 201 with question turn when field missing | integration | `uv run pytest backend/tests/test_llm_thread.py::test_trigger_endpoint -x` | ❌ Wave 0 |
| LLM-03 | Trigger endpoint returns 204 when all fields filled | integration | `uv run pytest backend/tests/test_llm_thread.py::test_trigger_endpoint_complete -x` | ❌ Wave 0 |
| LLM-03 | compute_completeness parity with TS helper | unit | `uv run pytest backend/tests/test_completeness.py -x` | ❌ Wave 0 |
| LLM-04 | CompletenessCard unchanged (no regressions) | smoke | Existing Playwright e2e | existing |

### Wave 0 Gaps

- [ ] `backend/tests/test_completeness.py` — covers LLM-03 compute_completeness parity
- [ ] `backend/tests/test_llm_thread.py` — covers LLM-01, LLM-02, LLM-03 thread integration
- [ ] `canned_thread_extract` in `llm_fixtures.py` — required for test mode bypass

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | HttpOnly cookie `aldente_auth` (existing); new endpoints behind `current_member` dep |
| V3 Session Management | inherited | No new session logic |
| V4 Access Control | yes | Cross-household 404 on new endpoints (same pattern as existing recipe endpoints) |
| V5 Input Validation | yes | Pydantic schemas on endpoint bodies; `AnswerField` Literal whitelist already validated |
| V6 Cryptography | no | SHA256 for idempotency (not security); no new secrets |

### Known Threat Patterns for Phase 29 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| `POST /questions/trigger` cross-household | Elevation of privilege | 404 on `Recipe.household_id != member.household_id` check (matches existing pattern) |
| `summary_body` from Gemini injected into DB | Tampering | `max_length=240` in schema; stored verbatim in JSONB (not rendered as HTML) |
| `reason_excerpt` contains user PII | Information disclosure | 120-char slice of user's own turn; not logged; stored in JSONB per invariant #5 |

---

## Sources

### Primary (HIGH confidence)
- `[VERIFIED: runtime]` — Pydantic v2 `model_dump_json` has no `sort_keys` param (confirmed TypeError)
- `[VERIFIED: runtime]` — `apply_voice_modification` uses `GeminiExtractedRecipe` as `response_schema`
- `[VERIFIED: runtime]` — `types.Part.from_bytes(data=..., mime_type=...)` signature confirmed
- `[VERIFIED: starlette source]` — `BackgroundTasks.add_task` accepts async callables (awaited in event loop)
- `[VERIFIED: git log]` — `manually_edited_fields` was added in 0786d28, removed in docs(29) commit 81cd858
- `[VERIFIED: file read]` — `process_thread_turn` stub at llm.py:740 is `sync def`; called from `extract_and_process_url_turn` at line 901
- `[VERIFIED: file read]` — `extract_from_transcript` called at llm.py:669; `extract_from_photos` at llm.py:696
- `[VERIFIED: file read]` — `RecipeResponse` does NOT currently include `manually_edited_fields` or `questions_deferred_until`
- `[VERIFIED: file read]` — `SummaryTurnPayload` and `QuestionTurnPayload` are empty stubs at recipe_turn.py:204-211
- `[VERIFIED: file read]` — `recipe-completeness.ts` FIELD_KEYS order: title, description, ingredients, steps, prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine, mood, main_protein
- `[VERIFIED: file read]` — `SystemBubble.tsx:74-84` summary CTA buttons have no `onClick` (visual stubs)
- `[VERIFIED: file read]` — `RecipeThreadProps` detail mode does not include summary callbacks

### Secondary (MEDIUM confidence)
- `[CITED: llm.py:453-478]` — `_broadcast_promoted` asyncio.run guard pattern
- `[CITED: llm.py:880-882]` — flag_modified JSONB mutation pattern
- `[CITED: alembic/versions/0009_*.py]` — migration pattern for column addition

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified at runtime; SDK imports confirmed
- Architecture: HIGH — all decision points verified against existing code
- Pitfalls: HIGH — Pitfalls 1, 2, 3, 5 verified at runtime or via git log; others derived from existing patterns
- Test plan: MEDIUM — structure verified against existing test patterns; exact assertions TBD by executor

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (stable dependencies; Gemini SDK and Pydantic release cadence low)
