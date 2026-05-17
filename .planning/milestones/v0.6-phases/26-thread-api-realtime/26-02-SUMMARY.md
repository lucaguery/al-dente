---
phase: 26
plan: 02
subsystem: backend
tags: [llm, storage, background-task, url-extraction, ssrf, supabase, trafilatura]
dependency_graph:
  requires: [26-01 (thread.py _is_safe_url and TurnResponse from recipe_turn.py)]
  provides: [process_thread_turn stub (D-21), extract_and_process_url_turn body (TURN-04), upload_recipe_url_extract helper (D-26), canned_url_extract fixture (D-30), ensure_url_bucket_exists startup hook (D-26)]
  affects: [backend/app/services/llm.py, backend/app/services/storage.py, backend/app/services/llm_fixtures.py, backend/app/main.py, backend/app/services/thread.py]
tech_stack:
  added: [trafilatura>=2.0.0, httpx>=0.28.1, lxml>=6.1.0 (pre-installed per research commit b908a77)]
  patterns: [BackgroundTask never-raise contract, JSONB sub-key mutation with flag_modified + dict spread, commit-before-broadcast ordering, test-mode bypass via settings.environment == 'test', SSRF gate before httpx fetch, upsert=true for idempotent re-extraction]
key_files:
  created:
    - backend/app/services/thread.py (SSRF helper _is_safe_url + acquire_position_lock — Rule 3 deviation: blocking dependency for Task 2; created from Plan 26-01 spec)
  modified:
    - backend/app/services/llm_fixtures.py (added canned_url_extract with __TEST_FORCE_FAIL_URL__ force-fail prefix)
    - backend/app/services/storage.py (added URL_BUCKET constant, upload_recipe_url_extract, ensure_url_bucket_exists)
    - backend/app/main.py (wired ensure_url_bucket_exists into lifespan after scheduler.start)
    - backend/app/services/llm.py (added httpx/trafilatura/flag_modified/TurnResponse/_is_safe_url imports; appended process_thread_turn stub + extract_and_process_url_turn body)
decisions:
  - "services/thread.py created in Plan 26-02 (Rule 3) because Plan 26-01 runs in parallel wave 1 and the file is required for extract_and_process_url_turn's SSRF import"
  - "No Alembic migration for recipe-urls bucket creation (RESEARCH §Area 9: storage.buckets SQL may fail on non-superuser Supabase connections; startup helper uses service-role key)"
  - "ensure_url_bucket_exists wrapped in try/except in both storage.py and main.py — startup must never crash on Supabase hiccup"
  - "upsert=true for upload_recipe_url_extract (D-26): re-extraction overwrites deterministic path, vs upsert=false for photos (collision protection)"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-13"
  tasks_completed: 2
  files_modified: 5
---

# Phase 26 Plan 02: BackgroundTask Infrastructure (TURN-04) Summary

**One-liner:** URL extraction pipeline via trafilatura+httpx with SSRF gate, Supabase Storage upload, JSONB flag_modified, and turn.updated broadcast — closing the long-standing TODO(productize) at recipes.py:621-625.

## What Was Built

### Task 1 — Fixtures, Storage Helpers, Startup Hook (commits 9bad8a4)

**`canned_url_extract` fixture (llm_fixtures.py, D-30):**
- Deterministic recipe-shaped markdown (Tarte aux poireaux with ingredient table + numbered steps)
- `__TEST_FORCE_FAIL_URL__` prefix raises RuntimeError to test `_record_failure` path deterministically
- Mirrors the established `__TEST_FORCE_FAIL__` convention from `canned_voice_recipe`

**`upload_recipe_url_extract` + `ensure_url_bucket_exists` (storage.py, D-26):**
- `URL_BUCKET = "recipe-urls"` separate from `recipe-photos` (clean MIME enforcement boundary)
- Path shape: `{household_id}/{recipe_id}/{turn_id}.md` — deterministic per turn, idempotent re-extraction
- `upsert=true` (vs photo's `upsert=false`) — re-extraction overwrites at same path
- `ensure_url_bucket_exists` is a no-op in test mode; wrapped in try/except in both storage.py and main.py

**Lifespan startup hook (main.py):**
- `storage_service.ensure_url_bucket_exists()` called after `scheduler.start()` before `yield`
- Wrapped in sibling try/except — startup never crashes on Supabase admin API hiccup

### Task 2 — process_thread_turn stub + extract_and_process_url_turn body (commit 2307618)

**`process_thread_turn` stub (D-21):**
- Sync `def` matching `promote_draft` pattern
- Opens `SessionLocal()`, logs deferred-to-Phase-29 INFO message, closes — never raises
- Phase 29 fills the body with the full-thread Gemini call without changing signature

**`extract_and_process_url_turn` body (D-28, TURN-04):**
- `async def` — uses `httpx.AsyncClient` (cooperative; FastAPI BackgroundTask async contract)
- SSRF gate: `_is_safe_url(url)` before httpx fetch (T-26-02)
- Conservative fetch policy: `timeout=10.0`, `max_redirects=5`, Content-Type allowlist, 5MB cap (D-24)
- `trafilatura.extract(..., include_tables=True)` — REQUIRED for French recipe sites (R-2: Marmiton ingredient quantities in `<table>` elements silently dropped without this flag)
- `upload_recipe_url_extract(...)` — uploads extracted markdown to `recipe-urls` bucket
- JSONB update: `turn.payload = {**turn.payload, "extracted_html_path": path}` + `flag_modified(turn, "payload")` — belt-and-suspenders for SQLAlchemy JSONB change detection (R-1)
- Commit before broadcast (RESEARCH §Area 7 — phantom-turn risk)
- `turn.updated` broadcast via `broadcast_to_household` with full `TurnResponse` payload (D-29)
- Calls `process_thread_turn(recipe_id, turn_id)` inline — already inside BackgroundTask, no `BackgroundTasks` instance available
- Test-mode bypass: `canned_url_extract(url)` skips httpx + trafilatura (D-30)
- `except Exception` catch-all: `_record_failure` on recipe-found path; log.exception on pre-recipe path

## Deviations from Plan

### Rule 3 — Auto-fix blocking dependency: created services/thread.py

**Found during:** Task 2 pre-execution
**Issue:** `extract_and_process_url_turn` imports `_is_safe_url` from `app.services.thread`. Plan 26-01 (which creates `thread.py`) runs in parallel in a separate worktree — `thread.py` did not exist in this worktree.
**Fix:** Created `backend/app/services/thread.py` from the exact spec in Plan 26-01 Task 2 action block. Contains `_is_safe_url` SSRF helper + `acquire_position_lock` per-recipe asyncio lock (D-18/D-19). This is the same content Plan 26-01 will commit — merge conflict resolution at orchestrator level is expected.
**Files modified:** `backend/app/services/thread.py` (new file)
**Commit:** 9bad8a4

## Known Stubs

- `process_thread_turn` body is intentionally a no-op log stub (D-21). Phase 29 fills it with the full-thread Gemini call. Not a stub in the problematic sense — the function IS callable and will be dispatched by Plan 26-03's router.

## Threat Surface Scan

All STRIDE threats from the plan's threat model are mitigated as specified:

| Threat | Mitigation | Implemented |
|--------|-----------|-------------|
| T-26-02 (SSRF) | `_is_safe_url(url)` before httpx.get | Yes — llm.py:780 |
| T-26-04a (slow loris) | `timeout=10.0` | Yes — llm.py:785 |
| T-26-04b (redirect loop) | `max_redirects=5` | Yes — llm.py:787 |
| T-26-04c (large body) | `len(response.content) > 5 MB` | Yes — llm.py:799 |
| T-26-04d (bad Content-Type) | allowlist check | Yes — llm.py:796 |
| T-26-05 (path traversal) | path = server-side UUIDs only | Yes — storage.py upload_recipe_url_extract |
| T-26-06 (startup crash) | double try/except wrapping | Yes — storage.py + main.py |

No new threat surface introduced beyond what the plan's threat model covers.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| backend/app/services/llm_fixtures.py | FOUND |
| backend/app/services/storage.py | FOUND |
| backend/app/main.py | FOUND |
| backend/app/services/thread.py | FOUND |
| backend/app/services/llm.py | FOUND |
| .planning/phases/26-thread-api-realtime/26-02-SUMMARY.md | FOUND |
| commit 9bad8a4 (Task 1) | FOUND |
| commit 2307618 (Task 2) | FOUND |
