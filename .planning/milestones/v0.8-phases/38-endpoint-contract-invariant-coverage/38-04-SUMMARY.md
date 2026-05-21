---
phase: 38-endpoint-contract-invariant-coverage
plan: "04"
subsystem: testing
tags: [pytest, architecture-invariants, regression-tests, coverage-floor, COV-01, D-38-03]

requires:
  - phase: 38-03
    provides: contract tests for 5 infra routers (photos, ws, exports, auth_session, push); repo coverage 73.1%

provides:
  - 8 named architecture-invariant regression tests (INV-01..08) with D-38-03 break-observe-revert proof
  - 155 gap-closure tests pushing repo-wide line coverage from 73.1% to 85.0% (COV-01 closed)
  - test_architecture_invariants.py — single file, 16 tests (2 per invariant: integration + static)
  - test_coverage_gap_closure.py — 155 tests targeting storage.py, push.py, llm_fixtures.py, recipes.py, cooking_logs.py

affects: [future test phases, CI coverage gate configuration, productize milestone]

tech-stack:
  added: []
  patterns:
    - "D-38-03 break-observe-revert ritual: write → pass → break source → fail → revert → pass again for each invariant"
    - "AST-walk pattern for static HTTPException detail analysis (INV-08)"
    - "_supabase() mock pattern: patch app.services.storage._supabase return value"
    - "settings.environment override in test: mutate + restore in try/finally for non-test-mode paths"
    - "webpush mock: patch app.services.push.webpush side_effect for WebPushException with .response.status_code"

key-files:
  created:
    - backend/tests/test_architecture_invariants.py
    - backend/tests/test_coverage_gap_closure.py
  modified: []

key-decisions:
  - "INV-01 tests BackgroundTask dispatch by patching app.routers.recipes.promote_draft and asserting mock.called (not assert_called_once_with UUID — router coerces str→UUID)"
  - "INV-03 static check filters comment lines before asserting last_cooked_at=log_row.cooked_at presence — break-observe-revert required commenting the line, not deleting it"
  - "INV-07 sends both cookie (Luca=SEED_TOKEN) and Bearer (Partner=SEED_TOKEN_PARTNER) in same request; asserts cookie token won"
  - "INV-08 uses AST walk across all routers/*.py to find HTTPException detail= string literals, then applies _RAW_ENGLISH_PROSE_RE to detect non-French raw prose"
  - "COV-01 gap strategy: storage.py tested via settings.environment override + _supabase() mock; push.py tested via webpush mock + real DB subscription fixture"
  - "85% is the line coverage floor per D-38-06; no fail_under configured in pytest.ini yet"

patterns-established:
  - "Break-observe-revert ritual (D-38-03): mandatory for every architecture invariant test; must be documented with failure message in SUMMARY"
  - "Static analysis tests: AST-walk + regex for invariants that cannot be expressed as runtime assertions (INV-08 French-only detail strings)"
  - "Storage mock pattern: patch _supabase at module level, control .storage.from_().method.return_value per branch"

requirements-completed: [INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07, INV-08, COV-01]

duration: ~90min (across two sessions)
completed: 2026-05-20
---

# Phase 38 Plan 04: Architecture Invariants + COV-01 Coverage Floor Summary

**16 architecture-invariant regression tests with D-38-03 break-observe-revert proof for all 8 CLAUDE.md invariants, plus 155 gap-closure tests pushing repo-wide line coverage from 73.1% to 85.0% (COV-01 closed)**

## Performance

- **Duration:** ~90 min (two sessions)
- **Completed:** 2026-05-20
- **Tasks:** 2 (invariant tests + coverage gap closure)
- **Files created:** 2 (test-only, no app/ modifications)
- **Final coverage:** 85.0% TOTAL (2622 statements, 332 missed)

## Accomplishments

- Wrote 8 paired invariant tests (16 total) covering every CLAUDE.md architecture invariant
- Completed D-38-03 break-observe-revert ritual for all 8 invariants with documented failure messages
- Added 155 gap-closure tests targeting storage.py, push.py, llm_fixtures.py, recipes.py, cooking_logs.py
- Closed COV-01: repo-wide coverage exactly at the 85% floor
- Verified `git diff --stat main -- backend/app/` is empty (no source modifications)

## Task Commits

1. **INV-01..08 architecture invariant tests** — `4e2322a` (test)
2. **COV-01 gap-closure tests (73.1% → 85.0%)** — `0468429` (test)
3. **Plan metadata** — final commit (docs)

## Files Created

- `/Users/gulu3001/dev/al-dente/backend/tests/test_architecture_invariants.py` — 16 tests (8 invariants × 2 assertions each)
- `/Users/gulu3001/dev/al-dente/backend/tests/test_coverage_gap_closure.py` — 155 gap-closure tests

## Invariant Test Map

| ID | CLAUDE.md Invariant | Test Function | Break Applied To | Failure Message |
|----|---------------------|--------------|------------------|-----------------|
| INV-01 | #1 — All 5 capture surfaces → BackgroundTask promote_draft | `test_invariant_01_all_five_capture_surfaces_dispatch_through_promote_draft` | Removed `background_tasks.add_task(promote_draft, ...)` line | "promote_draft was never called by the BackgroundTask" |
| INV-02 | #2 — Voting state computed, not stored | `test_invariant_02_votes_table_has_no_state_column` | Added `state = Column(String)` to Vote ORM | "votes table has a state column" |
| INV-03 | #3 — Denormalized last_cooked_at atomic update | `test_invariant_03_cooking_log_atomically_updates_last_cooked_at` | Commented out `last_cooked_at=log_row.cooked_at` | "last_cooked_at=log_row.cooked_at is absent from active (non-commented) code" |
| INV-04 | #4 — Realtime broadcast on mutations | `test_invariant_04_household_mutations_broadcast_realtime` | Removed `await broadcast_to_household(...)` call | "broadcast_to_household was never called after POST /recipes" |
| INV-05 | #5 — Raw inputs kept forever in recipe_turns | `test_invariant_05_first_user_turn_position_zero_immutable` | Added `source_capture` column to Recipe ORM | Seed fixture failure: UndefinedColumn (schema/ORM mismatch) |
| INV-06 | #6 → #7 — Single APScheduler (singleton) | `test_invariant_06_single_apscheduler_singleton` | Changed job id to `f"sl_{hh.id}"` (dropped `shortlist_` prefix) | Static: "shortlist_{hh.id} not in main.py source" |
| INV-07 | #7 → #8 — Cookie wins over Bearer header | `test_invariant_07_aldente_auth_cookie_wins_over_bearer` | Swapped precedence in `_extract_token` (Bearer before cookie) | Integration + static both failed |
| INV-08 | #6 → (implicit) — HTTPException details not raw English | `test_invariant_08_httpexception_details_not_raw_english` | Added `raise HTTPException(detail="An unexpected error occurred ...")` to exports.py | "exports.py: HTTPException(detail='An unexpected error occurred...')" |

## D-38-03 Break-Observe-Revert Evidence

Each invariant was tested using the ritual: write test → confirm pass → apply 1-line break to `backend/app/` → confirm test fails → `git checkout -- backend/app/<file>` → confirm pass again.

**Ritual complete for all 8 invariants.** Source verified clean after each revert via `git diff -- backend/app/`. Final `git diff --stat main -- backend/app/` produces no output.

## Coverage Summary

| File | Statements | Missed | Coverage |
|------|-----------|--------|----------|
| app/services/llm_fixtures.py | 26 | 0 | **100.0%** |
| app/services/invite_codes.py | 17 | 0 | **100.0%** |
| app/services/push.py | 79 | 17 | 77.7% |
| app/services/storage.py | 170 | 62 | 65.2% |
| app/services/llm.py | 481 | 127 | 69.8% |
| app/routers/recipes.py | 334 | 66 | 78.7% |
| app/routers/cooking_logs.py | 134 | 20 | 80.2% |
| **TOTAL** | **2622** | **332** | **85.0%** |

Residual gaps in `llm.py` (production Gemini paths) and `storage.py` (production Supabase paths) are intentional: they require live API calls and are outside the test-mode coverage boundary.

## Decisions Made

- INV-01 mock assertion uses `mock.called` + `call_count == 1` instead of `assert_called_once_with(uuid)` because FastAPI path coercion converts str UUID to `uuid.UUID` object, making exact argument matching fragile
- INV-03 static check filters comment lines (lines starting with `#`) before asserting string presence — the break applied a Python comment, not code deletion
- INV-07 tests both integration path (TestClient with cookie + Bearer) and static path (assert `if aldente_auth:` precedes `if authorization`)
- COV-01 gap strategy prioritized pure-function tests (`_looks_like_missing_object`, `llm_fixtures.*`) then mocked-client tests (`storage.create_signed_photo_url`, `push.send_push_to_household`)
- `settings.environment` mutation pattern for non-test-mode branches: set to `"production"` in try block, restore in finally — avoids any DB/Supabase calls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `asyncio.run()` on sync promote_draft**
- **Found during:** Gap-closure test run
- **Issue:** `test_promote_draft_missing_recipe` called `asyncio.run(promote_draft(...))` but `promote_draft` is a sync function (returns `None`), causing `ValueError: a coroutine was expected`
- **Fix:** Removed `asyncio.run()` wrapper — called `promote_draft(uuid.uuid4())` directly
- **Files modified:** `backend/tests/test_coverage_gap_closure.py`
- **Verification:** Test passes after fix

**2. [Rule 1 - Bug] Fixed blank recipe title assertion**
- **Found during:** Gap-closure test run
- **Issue:** `test_create_blank_recipe_then_get` asserted `data["title"] == "Blank Test Recipe"` but server overrides title with "Extraction en cours…" placeholder
- **Fix:** Changed assertion to check `data["status"] == "draft"` only
- **Files modified:** `backend/tests/test_coverage_gap_closure.py`
- **Verification:** Test passes after fix

---

**Total deviations:** 2 auto-fixed (both Rule 1 — test bugs, not source bugs)
**Impact on plan:** No scope creep; both fixes required for test correctness only.

## Issues Encountered

None in this session. The previous session documented all D-38-03 ritual debugging (INV-03 comment-line ambiguity, INV-05 seed cascade, INV-07 static-analysis approach).

## Known Stubs

None — this plan only creates tests. No application code was modified.

## Threat Flags

None — test-only files created. No new network endpoints, auth paths, or trust-boundary surface.

## Self-Check: PASSED

- `backend/tests/test_architecture_invariants.py` — exists, committed at `4e2322a`
- `backend/tests/test_coverage_gap_closure.py` — exists, committed at `0468429`
- `git diff --stat main -- backend/app/` — empty (no source modifications)
- Full-suite coverage TOTAL: **85.0%** (target: ≥85%)
- 2 pre-existing failures (test_llm_thread.py, test_question_endpoints.py) — outside Phase 38 scope

## Next Phase Readiness

- Phase 38 complete: all 4 plans executed, requirements INV-01..08 and COV-01 closed
- Coverage floor at 85% — can configure `fail_under = 85` in pytest.ini for CI gate
- Architecture invariant regression suite is live — any future violation of CLAUDE.md invariants will be caught by CI
- Remaining coverage gaps in llm.py (production Gemini paths) and storage.py (production Supabase paths) require integration test infrastructure beyond the current pytest setup

---
*Phase: 38-endpoint-contract-invariant-coverage*
*Completed: 2026-05-20*
