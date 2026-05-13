---
phase: 26-thread-api-realtime
verified: 2026-05-13T00:00:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open two browser tabs (simulating two phones) on the same household. In tab 1, POST a text turn to /recipes/{id}/turns. Observe tab 2's open thread view."
    expected: "The new turn bubble appears in tab 2 within ~200ms via the turn.created WebSocket event."
    why_human: "Automated tests monkeypatch broadcast_to_household with no connected WS peers; the actual DOM CustomEvent bridge and RealtimeProvider routing cannot be verified without two live clients connected to the app."
  - test: "Post a URL turn to /recipes/{id}/turns with a real external recipe URL (e.g. a Marmiton page). Wait ~10s for the BackgroundTask to complete."
    expected: "The turn bubble re-renders with a 'Lien extrait' indicator, turn.payload.extracted_html_path is set, and turn.updated fires to the second tab."
    why_human: "Real httpx + trafilatura execution against an external host, Supabase Storage upload, and WebSocket turn.updated delivery to a second client cannot be verified without a live stack."
  - test: "Deploy to staging (push to main). Verify the recipe-urls Supabase Storage bucket is created on startup."
    expected: "Supabase Storage dashboard shows a recipe-urls bucket after the first Railway deploy. ensure_url_bucket_exists() in the lifespan logs 'storage.bucket_created name=recipe-urls' or 'storage.bucket_exists name=recipe-urls'."
    why_human: "The ensure_url_bucket_exists helper is a no-op in test mode; bucket creation against the live Supabase admin API requires a deployed app with service-role credentials."
---

# Phase 26: Thread API & Realtime Verification Report

**Phase Goal:** Ship the unified `POST /recipes/{id}/turns` thread API (text/voice/url/photo/answer/proposal_accepted/proposal_dismissed kinds), the per-recipe asyncio position lock, the SSRF defense, the URL-extraction BackgroundTask that closes the long-standing TODO(productize), and broadcast `turn.created` / `turn.updated` on the realtime channel.

**Verified:** 2026-05-13
**Status:** human_needed
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /recipes/{id}/turns accepts 6 JSON kinds (text/voice/url/answer/proposal_accepted/proposal_dismissed) via TurnPayload discriminated union, photo kind rejected with 422 | ✓ VERIFIED | `create_turn` at recipes.py:955 — `if body.kind == "photo": raise HTTPException(422)`; `body: TurnPayload` uses discriminator='kind' union; all 6 kinds present in the union |
| 2 | POST /recipes/{id}/turns/photo accepts multipart and creates photo turn | ✓ VERIFIED | `create_turn_photo` at recipes.py:1060; multipart `files: list[UploadFile]`; inserts kind='photo' turn with photo_paths payload; schedules process_thread_turn |
| 3 | GET /recipes/{id}/turns returns ordered list, 404 on cross-household | ✓ VERIFIED | `list_turns` at recipes.py:1195; `WHERE household_id = member.household_id` → 404; `.order_by(RecipeTurn.position.asc())`; test_get_turns_cross_household_returns_404 passes |
| 4 | answer turn atomically updates recipes.<field> + appends field to manually_edited_fields (set semantics, sorted) | ✓ VERIFIED | `_apply_answer_turn` at recipes.py:829; `setattr(recipe, payload.field, payload.value)` + `current.add(payload.field)` + `recipe.manually_edited_fields = sorted(current)`; single transaction with turn insert; test SC-2 passes |
| 5 | proposal_accepted REMOVES the field pin via AdvisoryTurnPayload-validated proposed_value (WR-03 fix applied) | ✓ VERIFIED | `_apply_proposal_accepted` at recipes.py:862; constructs transient AnswerTurnPayload to validate proposed_value (WR-03 fix); `current.discard(advisory_payload.field)` + `sorted(current)`; test_proposal_accepted_removes_pin passes + test_proposal_accepted_rejects_malformed_advisory_proposed_value passes |
| 6 | proposal_dismissed is a validated no-op | ✓ VERIFIED | `_validate_proposal_dismissed_ref` at recipes.py:926; validates advisory ref in same recipe; no setattr, no manually_edited_fields touch, no BackgroundTask; test SC-4 passes |
| 7 | text/voice schedule process_thread_turn; url schedules extract_and_process_url_turn; answer/proposal_accepted/proposal_dismissed schedule nothing | ✓ VERIFIED | recipes.py:1044-1050: `if body.kind in ("text", "voice"): background_tasks.add_task(process_thread_turn, ...); elif body.kind == "url": background_tasks.add_task(extract_and_process_url_turn, ...)`; test_answer_turn_applies_value_and_pins_without_llm monkeypatches router-bound name and asserts calls == [] |
| 8 | Every persisted user turn broadcasts turn.created AFTER commit | ✓ VERIFIED | recipes.py:1036-1042: `await broadcast_to_household(member.household_id, "turn.created", TurnResponse.model_validate(turn).model_dump(mode="json"))` — called AFTER `db.commit()` + `db.refresh(turn)` in both create_turn and create_turn_photo (line 1181); commit-before-broadcast ordering verified |
| 9 | turn.updated broadcast from extract_and_process_url_turn only (D-29) | ✓ VERIFIED | llm.py:889-892: `await broadcast_to_household(recipe.household_id, "turn.updated", TurnResponse.model_validate(turn).model_dump(mode="json"))` — called only in extract_and_process_url_turn, after db.commit() + db.refresh(turn); grep confirms zero other "turn.updated" callsites in the codebase |
| 10 | _is_safe_url blocks RFC1918, loopback, 169.254.169.254, link-local, metadata.google.internal | ✓ VERIFIED | thread.py:65-111; ipaddress.ip_address checks: is_loopback, is_private, is_link_local, is_unspecified, is_multicast; hostname literal blocklist: localhost, ip6-localhost, ip6-loopback, metadata.google.internal, 169.254.169.254; spot-check against 9 hostile URLs passed; test_is_safe_url_blocks_metadata_endpoint passes |
| 11 | WeakValueDictionary[recipe_id → asyncio.Lock] for position serialization | ✓ VERIFIED | thread.py:37: `_position_locks: "weakref.WeakValueDictionary[UUID, asyncio.Lock]" = weakref.WeakValueDictionary()`; acquire_position_lock returns same Lock for same recipe_id; spot-check passed |
| 12 | CR-01 fix: extract_and_process_url_turn does NOT demote structured recipes | ✓ VERIFIED | llm.py:903-917: `if recipe.status == "draft": _record_failure(...)  else: _record_turn_enrichment_failure(...)` — structured recipes route to _record_turn_enrichment_failure (records on turn.payload, not recipe.status); test_record_turn_enrichment_failure_preserves_recipe_status passes |
| 13 | CLAUDE.md invariant #4 lists turn.created and turn.updated; realtime.py docstring lists both events; legacy TODO(productize) for URL extraction removed | ✓ VERIFIED | CLAUDE.md line 36: "...`turn.created`, `turn.updated`..." with explanation of which function fires each; realtime.py lines 14-15: `turn.created — routers/recipes.py thread endpoints` and `turn.updated — services/llm.py extract_and_process_url_turn`; grep confirms zero matches for "TODO(productize): URL fetch + Gemini extraction" in recipes.py; forward-pointer comment at recipes.py:633-639 |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/schemas/recipe_turn.py` | Typed AnswerTurnPayload (D-08/D-09), AdvisoryTurnPayload (D-17), UrlTurnPayload (D-25) | ✓ VERIFIED | AnswerField Literal with exactly 13 values; _VALID_* frozensets at module level; @model_validator per-field validation; AdvisoryTurnPayload requires all 4 fields; UrlTurnPayload has extracted_html_path: Optional[str] = None |
| `backend/app/services/thread.py` | acquire_position_lock + _is_safe_url | ✓ VERIFIED | WeakValueDictionary-backed per-recipe lock; ipaddress-based SSRF blocker with 11-case hostname/IP coverage; TODO(productize) comment for pg_advisory_xact_lock |
| `backend/app/services/llm.py` | process_thread_turn stub (D-21) + extract_and_process_url_turn body (D-28) + _record_turn_enrichment_failure (CR-01) | ✓ VERIFIED | process_thread_turn: sync def, no-op log; extract_and_process_url_turn: async def, full pipeline (SSRF gate + httpx + trafilatura include_tables=True + storage upload + flag_modified + commit + turn.updated broadcast + process_thread_turn invocation); _record_turn_enrichment_failure: status-preserving failure path for structured recipes |
| `backend/app/services/storage.py` | URL_BUCKET + upload_recipe_url_extract + ensure_url_bucket_exists (D-26) | ✓ VERIFIED | URL_BUCKET = "recipe-urls"; upload_recipe_url_extract with test-mode short-circuit and upsert=true; ensure_url_bucket_exists is no-op in test mode |
| `backend/app/services/llm_fixtures.py` | canned_url_extract for test-mode bypass (D-30) | ✓ VERIFIED | canned_url_extract with __TEST_FORCE_FAIL_URL__ prefix support; returns deterministic French recipe markdown |
| `backend/app/main.py` | lifespan calls ensure_url_bucket_exists() on startup | ✓ VERIFIED | line 87: `storage_service.ensure_url_bucket_exists()` in lifespan |
| `backend/app/routers/recipes.py` | POST /turns + POST /turns/photo + GET /turns + helper functions | ✓ VERIFIED | All three endpoints mounted at correct paths; _apply_answer_turn, _apply_proposal_accepted, _validate_proposal_dismissed_ref all present |
| `backend/app/services/realtime.py` | Docstring lists turn.created and turn.updated | ✓ VERIFIED | Lines 14-15 list both events with phase attribution |
| `CLAUDE.md` | Invariant #4 lists turn.created and turn.updated | ✓ VERIFIED | Line 36 includes both events with explanation of firing source |
| `backend/tests/test_turns.py` | pytest suite with 15 tests (8 original + 7 from WR-05 fix) | ✓ VERIFIED | 15 test functions present covering all 4 ROADMAP success criteria plus SSRF unit tests, CR-01 regression, range validation, cross-recipe scoping, malformed UUID, malformed advisory proposed_value |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| recipes.py:POST /turns | services/thread.py:acquire_position_lock | `from app.services.thread import acquire_position_lock`; `lock = await acquire_position_lock(recipe_id); async with lock:` | ✓ WIRED | recipes.py line 88 import; line 1003 lock acquisition; both POST endpoints use the lock |
| recipes.py:POST /turns | services/realtime.py:broadcast_to_household | `await broadcast_to_household(member.household_id, "turn.created", ...)` | ✓ WIRED | recipes.py line 1038-1042 (create_turn) and line 1179-1183 (create_turn_photo); committed BEFORE broadcast |
| recipes.py:POST /turns | services/llm.py:process_thread_turn / extract_and_process_url_turn | `background_tasks.add_task(process_thread_turn, ...)` / `background_tasks.add_task(extract_and_process_url_turn, ...)` | ✓ WIRED | recipes.py lines 1044-1048; dispatch matrix enforced: text/voice → process_thread_turn; url → extract_and_process_url_turn |
| services/llm.py:extract_and_process_url_turn | services/thread.py:_is_safe_url | `from app.services.thread import _is_safe_url`; `if not _is_safe_url(url): raise ValueError(...)` | ✓ WIRED | llm.py line 65 import; line 826 SSRF gate before httpx.AsyncClient.get |
| services/llm.py:extract_and_process_url_turn | services/storage.py:upload_recipe_url_extract | `storage_service.upload_recipe_url_extract(...)` | ✓ WIRED | llm.py line 869-874; called after trafilatura extraction |
| services/llm.py:extract_and_process_url_turn | services/realtime.py:broadcast_to_household | `await broadcast_to_household(recipe.household_id, "turn.updated", ...)` | ✓ WIRED | llm.py lines 889-892; only callsite for turn.updated in the codebase |
| schemas/recipe_turn.py | (no dependency on services/llm.py) | No import | ✓ VERIFIED | grep confirms zero `from app.services.llm import` in recipe_turn.py; vocabulary frozensets duplicated per locked-vocabulary discipline |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| create_turn (recipes.py) | turn (RecipeTurn row) | DB insert via SQLAlchemy; payload from validated TurnPayload body | Yes — `db.add(turn); db.commit(); db.refresh(turn)` then model_validate to TurnResponse | ✓ FLOWING |
| extract_and_process_url_turn (llm.py) | extracted_markdown | trafilatura.extract(response.text, ...) or canned_url_extract in test mode | Yes — real httpx fetch (or canned fixture); turn.payload updated with extracted_html_path | ✓ FLOWING |
| _apply_answer_turn (recipes.py) | recipe.<field> | payload.value from validated AnswerTurnPayload | Yes — setattr writes to the live Recipe ORM row; committed in same transaction as turn insert | ✓ FLOWING |
| _apply_proposal_accepted (recipes.py) | recipe.<advisory_payload.field> | advisory turn's payload.proposed_value, re-validated via transient AnswerTurnPayload | Yes — reads DB row, validates value, setattr to Recipe row | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| AnswerField has exactly 13 values | `python -c "from app.schemas.recipe_turn import AnswerField; import typing; assert len(typing.get_args(AnswerField)) == 13"` | 13 entries confirmed | ✓ PASS |
| acquire_position_lock returns same Lock for same recipe_id | `python -c "import asyncio; from uuid import uuid4; from app.services.thread import acquire_position_lock; asyncio.run(check())"` | Same instance returned | ✓ PASS |
| _is_safe_url blocks 9 hostile URLs | Inline assertions in spot-check | All 9 blocked + 1 allowed | ✓ PASS |
| process_thread_turn is sync, extract_and_process_url_turn is async | inspect.iscoroutinefunction checks | Correct async/sync signatures | ✓ PASS |
| All three turn endpoints mounted | `from app.main import app; [r.path for r in app.routes if 'turns' in r.path]` | /recipes/{recipe_id}/turns POST, /recipes/{recipe_id}/turns/photo POST, /recipes/{recipe_id}/turns GET | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TURN-01 | 26-01, 26-02, 26-03, 26-04 | POST /turns accepts all 7 turn kinds, persists with next sequential position, schedules BackgroundTask for LLM-triggering kinds | ✓ SATISFIED | Three endpoints wired; position lock serializes reads; dispatch matrix enforced per D-22 |
| TURN-02 | 26-01, 26-03, 26-04 | answer turns apply directly + pin field; proposal_accepted removes pin; proposal_dismissed is pure no-op | ✓ SATISFIED | _apply_answer_turn + _apply_proposal_accepted + _validate_proposal_dismissed_ref wired; WR-03 fix adds per-field validation on proposal_accepted; all paths covered by tests |
| TURN-03 | 26-03, 26-04 | turn.created WebSocket event broadcasts via broadcast_to_household whenever any turn is persisted | ✓ SATISFIED (partial live verification deferred) | Both POST endpoints broadcast turn.created after commit; realtime.py docstring + CLAUDE.md invariant #4 updated; live 2-phone round-trip requires human test |
| TURN-04 | 26-01, 26-02, 26-03, 26-04 | URL-turn BackgroundTask implements real URL extraction; closes TODO(productize) | ✓ SATISFIED | extract_and_process_url_turn: full pipeline (SSRF + httpx + trafilatura + storage + flag_modified + turn.updated broadcast); legacy TODO marker removed; test SC-3 passes with test-mode canned bypass |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `backend/app/schemas/recipe_turn.py:206-211` | `SummaryTurnPayload` and `QuestionTurnPayload` are stubs (empty bodies, `# Phase 29 LLM-01/03 defines content`) | INFO | Intentional stubs per plan design — Phase 29 owns their content shape. Not user-visible; exist only to complete the discriminated union for the DB CHECK constraint. No impact on Phase 26 functionality. |
| `backend/app/services/thread.py:14-16` | `# TODO(productize): D-18 — swap WeakValueDictionary lock to pg_advisory_xact_lock` | INFO | Intentional productize-later comment. Single uvicorn worker (invariant #7) means the in-process lock is correct for current deployment. |
| `backend/app/services/thread.py:79` | `# TODO(productize): add DNS pre-resolve if user sentiment shifts.` | INFO | Intentional productize-later comment for DNS rebinding defense. Couple-scale workload; authenticated members only. Explicitly accepted in threat register as T-26-07. |

No blocker or warning-level anti-patterns found. The two stubs (SummaryTurnPayload, QuestionTurnPayload) are by design and listed in all plan SUMMARY.md files under "Known Stubs."

---

### Human Verification Required

#### 1. Live turn.created WebSocket delivery (ROADMAP SC-1)

**Test:** Open two browser tabs logged into the same household on the deployed app. In tab 1, navigate to a recipe detail page and post a text turn via the thread UI (or via curl against the deployed API). Watch tab 2.

**Expected:** The new turn bubble appears in tab 2 within ~200ms — the RealtimeProvider receives the `turn.created` WebSocket event and routes it to the open thread view via the existing DOM CustomEvent bridge.

**Why human:** Automated tests monkeypatch `broadcast_to_household` so WS peers never receive frames. The DOM CustomEvent bridge in the frontend RealtimeProvider (`frontend/lib/realtime.ts`) cannot be exercised without two live browser sessions connected to the deployed backend.

#### 2. Real URL extraction end-to-end (ROADMAP SC-3)

**Test:** POST a URL turn with a real French recipe URL (e.g. `https://www.marmiton.org/recettes/recette_tarte-aux-poireaux_10630.aspx`) to `/recipes/{id}/turns` with `kind="url"`. Wait 10-15s and re-fetch the turn via `GET /recipes/{id}/turns`.

**Expected:** `turn.payload.extracted_html_path` is set to a path in the `recipe-urls` Supabase Storage bucket. The ingredient table is preserved in the extracted markdown (trafilatura `include_tables=True`). Tab 2 receives `turn.updated` and the url bubble re-renders.

**Why human:** Real httpx execution against an external host, actual trafilatura extraction (with its 10-20% failure rate on JS-rendered pages), live Supabase Storage upload, and WebSocket `turn.updated` delivery cannot be verified without the deployed stack. Test mode uses `canned_url_extract`.

#### 3. recipe-urls Supabase Storage bucket creation (D-26)

**Test:** Deploy to staging (push to main). Check the Railway startup logs and the Supabase Storage dashboard.

**Expected:** Startup logs contain `storage.bucket_created name=recipe-urls` on first deploy, or `storage.bucket_exists name=recipe-urls` on subsequent deploys. Supabase Storage dashboard shows the `recipe-urls` bucket with `public=False`, `file_size_limit=5MB`, `allowed_mime_types=[text/plain, text/markdown]`.

**Why human:** `ensure_url_bucket_exists()` is a no-op under `settings.environment == "test"`. Bucket creation requires live Supabase service-role credentials and a running Railway deployment.

---

### Gaps Summary

No gaps found. All 13 observable truths are verified. Three items require human verification against the live stack (WebSocket 2-phone delivery, real URL extraction, Supabase bucket creation) — these are inherent live-system behaviors that cannot be validated programmatically without a running deployment and connected WS clients.

The code review (26-REVIEW.md) identified 11 findings that were all addressed in 26-REVIEW-FIX.md: CR-01 (structured recipe demotion bug fixed in _record_turn_enrichment_failure), WR-01 through WR-06 (unbound variable, async guard, proposal_accepted validation, comment honesty, test coverage gaps, TODO removal), IN-01 through IN-04 (IPv6 coverage comment, localhost case documentation, dict spread order, URL None fallback). All fixes are confirmed present in the codebase.

---

_Verified: 2026-05-13T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
