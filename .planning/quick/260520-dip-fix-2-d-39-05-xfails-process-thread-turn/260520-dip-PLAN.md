---
phase: quick-260520-dip
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/tests/test_llm_thread.py
  - backend/tests/test_question_endpoints.py
  - backend/app/services/llm_fixtures.py
autonomous: true
requirements:
  - D-39-05-CAT-B  # Fix Category B xfail (test_process_thread_turn_failure_records_on_turn_payload)
  - D-39-05-CAT-C  # Fix Category C xfail (test_defer_suppresses_question_in_run_thread_llm)

must_haves:
  truths:
    - "test_process_thread_turn_failure_records_on_turn_payload PASSES in isolation"
    - "test_process_thread_turn_failure_records_on_turn_payload PASSES in full-suite run"
    - "test_defer_suppresses_question_in_run_thread_llm PASSES in isolation"
    - "test_defer_suppresses_question_in_run_thread_llm PASSES in full-suite run"
    - "All other LLM-touching tests (test_llm_thread.py, test_llm_thread_kinds.py, test_turns.py, test_question_endpoints.py) remain green — no fixture regression"
    - "Full backend suite: 0 failed; xfailed count equals 1 (only migration 0006 remains by-design xfail)"
    - "Repo line coverage ≥ 85.0% sustained (target 85.08%+)"
    - "scripts/check_rules_files_coverage.py coverage.json exits 0 (all 4 rules files still at 100%)"
  artifacts:
    - path: "backend/tests/test_llm_thread.py"
      provides: "Category B fix — no @pytest.mark.xfail on test_process_thread_turn_failure_records_on_turn_payload; session-lifecycle compatible with process_thread_turn's SessionLocal()/close() flow"
      contains: "test_process_thread_turn_failure_records_on_turn_payload"
    - path: "backend/tests/test_question_endpoints.py"
      provides: "Category C fix — no @pytest.mark.xfail on test_defer_suppresses_question_in_run_thread_llm"
      contains: "test_defer_suppresses_question_in_run_thread_llm"
    - path: "backend/app/services/llm_fixtures.py"
      provides: "canned_thread_extract recognises a sentinel in any user text/voice turn and returns an extract with at least one eligible missing field, so the defer-cleared branch in _run_thread_llm has something to ask a question about"
      contains: "__TEST_FORCE_NEW_HASH__"
    - path: ".planning/quick/260520-dip-fix-2-d-39-05-xfails-process-thread-turn/260520-dip-SUMMARY.md"
      provides: "Before/after test counts, coverage delta, fix shape per test, regression check"
  key_links:
    - from: "backend/tests/test_llm_thread.py::test_process_thread_turn_failure_records_on_turn_payload"
      to: "backend/app/services/llm.py::process_thread_turn"
      via: "monkeypatch llm_module.SessionLocal returns a session whose close() is a no-op (or test re-fetches via _TestSessionLocal after await)"
      pattern: "SessionLocal"
    - from: "backend/tests/test_question_endpoints.py::test_defer_suppresses_question_in_run_thread_llm"
      to: "backend/app/services/llm_fixtures.py::canned_thread_extract"
      via: "sentinel __TEST_FORCE_NEW_HASH__ in any text/voice turn → fixture returns extract with one eligible field omitted"
      pattern: "__TEST_FORCE_NEW_HASH__"
---

<objective>
Fix the 2 D-39-05 xfails (real test/fixture bugs from v0.8 Plan 39-02) so the backend suite is fully green except for the 1 by-design migration 0006 xfail. Both fixes are diagnostic: Category B is a session-lifecycle bug in the test (process_thread_turn's `db.close()` detaches the test's session-bound recipe/turn); Category C is a missing branch in the canned LLM fixture (no scenario emits an eligible-missing field so the post-defer-clear assertion is structurally unreachable).

Purpose: Close the tactical xfail follow-up flagged in 39-02-SUMMARY §"Follow-up TODOs" item 1. After this lands, the only xfail in the suite is migration 0006 (Postgres ALTER TYPE DROP VALUE unsupported, intentional per Phase 16 D-16-02).

Output: 3 atomic commits (2 fixes + verification), updated SUMMARY.md, sustained ≥85% coverage with rules-files gate green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/39-migration-safety-ci-gate/39-02-SUMMARY.md
@.planning/phases/38-endpoint-contract-invariant-coverage/38-01-SUMMARY.md
@.planning/phases/37-test-infrastructure-service-branch-coverage/37-01-SUMMARY.md
@CLAUDE.md
@backend/CLAUDE.md
@backend/tests/conftest.py

<interfaces>
<!-- Extracted from codebase. The executor should use these directly — no need to re-explore. -->

Production code being exercised — `backend/app/services/llm.py`:

  async def process_thread_turn(recipe_id: UUID, turn_id: UUID) -> None:
      """Phase 29 LLM-01 — NEVER raises out; exceptions recorded on trigger turn's payload."""
      db = SessionLocal()                      # ← monkeypatched in tests to return db_session
      try:
          recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
          ...
          turn = db.scalar(select(RecipeTurn).where(RecipeTurn.id == turn_id))
          ...
          try:
              await _run_thread_llm(db, recipe, turn_id)
          except Exception as exc:
              _record_turn_enrichment_failure(db, recipe, turn, exc)
      finally:
          db.close()                            # ← THIS closes the test's session → detaches recipe/turn

  def _record_turn_enrichment_failure(db, recipe, turn, exc) -> None:
      turn.payload = {**(turn.payload or {}), "extraction_error": str(exc)[:500]}
      flag_modified(turn, "payload")
      db.commit()

  async def _run_thread_llm(db, recipe, trigger_turn_id):
      ...
      if settings.environment == "test":
          from app.services.llm_fixtures import canned_thread_extract
          extracted = canned_thread_extract(thread, pinned)
      ...
      # D-08 / Pitfall 9 — gate on questions_deferred_until (tz-aware)
      questions_deferred = (
          recipe.questions_deferred_until is not None
          and recipe.questions_deferred_until > datetime.now(tz=timezone.utc)
      )
      if not questions_deferred:
          _, missing = compute_completeness(recipe)       # ← canned fills EVERY field → missing == []
          chosen_field: Optional[str] = None
          for field in missing:
              if INPUT_TYPE_MAP.get(field) is None:
                  continue
              if not _should_emit_question(thread, field):
                  continue
              chosen_field = field
              break
          if chosen_field is not None:
              ... emit question turn ...

Current canned fixture — `backend/app/services/llm_fixtures.py::canned_thread_extract`:

  Fills EVERY field of GeminiExtractedRecipe (title, ingredients, steps, prep_time_minutes,
  cook_time_minutes, difficulty, description, servings, cuisine, mood, main_protein,
  seasonality, summary_body). Already branches on __TEST_FORCE_FAIL__ prefix in text/voice
  turn payloads — established sentinel pattern.

Test fixture — `backend/tests/conftest.py` line 50-53:

  _engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True, future=True)
  _TestSessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)

  The db_session fixture wraps `_engine.connect()` + `connection.begin()` (outer tx, never
  committed) + `_TestSessionLocal(bind=connection)` + SAVEPOINT via `connection.begin_nested()`.
  The `after_transaction_end` listener reopens a fresh SAVEPOINT on each inner commit.
  Teardown calls `session.close()` + `transaction.rollback()` + `connection.close()`.

Current xfail decorators to remove:

  backend/tests/test_llm_thread.py line 1060–1069 (above test_process_thread_turn_failure_records_on_turn_payload)
  backend/tests/test_question_endpoints.py line 483–492 (above test_defer_suppresses_question_in_run_thread_llm)

Defer test body — `backend/tests/test_question_endpoints.py` line 494–592:

  Step 2: client.post("/recipes/{id}/questions/defer") — sets questions_deferred_until = now()+24h
  Step 3: insert text_turn with payload {"text": "ajoute des poireaux"}
  Step 4: await llm_module._run_thread_llm(db_session, recipe, text_turn.id)
          → asserts no question turn emitted (gate held)
          → asserts exactly 1 summary turn
  Step 5: recipe.questions_deferred_until = None; db_session.commit()
          Insert text_turn2 with payload {"text": "__TEST_FORCE_NEW_HASH__ ajoute du parmesan"}
          await llm_module._run_thread_llm(db_session, recipe, text_turn2.id)
          → asserts len(question_turns_after) >= 1  ← CURRENTLY FAILS (canned fills every field)

  The __TEST_FORCE_NEW_HASH__ sentinel is referenced ONLY in this test body today —
  llm_fixtures.py has no branch on it. Fixture must recognise it on either text or voice
  turn payloads (mirror of the existing __TEST_FORCE_FAIL__ pattern) and return an extract
  with at least one eligible missing field (and a new summary_body so the extraction_hash
  differs from the first invocation — idempotency check in _run_thread_llm short-circuits
  otherwise).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Category B — process_thread_turn session lifecycle</name>
  <files>backend/tests/test_llm_thread.py</files>
  <action>
Fix `test_process_thread_turn_failure_records_on_turn_payload` (lines 1060-1108).

Root cause (confirmed by reading process_thread_turn in app/services/llm.py:1161-1188): the test monkeypatches `llm_module.SessionLocal` to return `db_session`, but `process_thread_turn`'s `finally: db.close()` closes that session. Subsequent `db_session.expire_all()` and `db_session.scalar(select(...))` calls in the test body then operate on a closed session and fail.

Smaller fix — wrap the returned session so `.close()` is a no-op for the test's monkeypatch only (≈3 lines diff vs. restructuring to a non-monkeypatch isolation strategy). Implement:

  1. Remove the `@pytest.mark.xfail(strict=False, reason="...D-39-05 / 37-01-SUMMARY Category B...")` decorator above the test (lines 1060-1069).
  2. Replace `monkeypatch.setattr(llm_module, "SessionLocal", lambda: db_session)` at line 1081 with a factory that yields a thin wrapper exposing every Session attribute via `__getattr__` to `db_session` AND overriding `close()` to be a no-op. The wrapper does NOT subclass Session — keep it a duck-typed adapter so we touch no SQLAlchemy internals. The two `commit()`/`scalar()`/etc. calls inside `process_thread_turn` continue to delegate to the real `db_session`, so writes land in the outer SAVEPOINT and stay visible to the test body's `expire_all` + `select`.
  3. Do NOT modify the other 3 sites that use the same monkeypatch line in this file (lines 1037, 1128, 1164) — those tests are already passing because they do NOT call `expire_all` + re-select after the closed-by-finally point. Leave their lambdas alone.

Verify the wrapper does not break the existing passing test `test_process_thread_turn_emits_summary_and_question` (line 1027) — that test uses the unmodified lambda monkeypatch and must continue to pass. Run both tests after the change to confirm.

If the wrapper approach surfaces any unexpected SQLAlchemy issue (e.g., session detached on attribute access via __getattr__), fall back to plan B: insert `recipe_id = recipe.id; trigger_id = trigger.id` before the `await`, then after the await re-open a session via `_TestSessionLocal(bind=...)` against the same engine and re-fetch by id for the assertions. Plan B is larger (~10 lines) but isolates from the lifecycle entirely. Prefer plan A first.

Per backend/CLAUDE.md MVP posture: no compat shims; clean change. Per .planning/CLAUDE.md: file-changing tools invoked under this GSD plan only.
  </action>
  <verify>
    <automated>cd backend && set -a && source ../.env.test.example && set +a && DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test GEMINI_API_KEY=stub uv run pytest tests/test_llm_thread.py -x -q</automated>
  </verify>
  <done>
xfail decorator removed; `test_process_thread_turn_failure_records_on_turn_payload` passes; all 53 tests in `test_llm_thread.py` still pass (no regression on the 3 other tests that share the SessionLocal monkeypatch pattern). Commit message: `test: fix Category B — process_thread_turn_failure session lifecycle (D-39-05)`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix Category C — canned LLM fixture emits eligible-missing field on sentinel</name>
  <files>backend/app/services/llm_fixtures.py, backend/tests/test_question_endpoints.py</files>
  <action>
Fix `test_defer_suppresses_question_in_run_thread_llm` (lines 483-592 in test_question_endpoints.py).

Root cause (confirmed by reading _run_thread_llm in app/services/llm.py:730-960 + the canned fixture in app/services/llm_fixtures.py:31-79): `canned_thread_extract` fills every field of `GeminiExtractedRecipe`. After `_apply_extracted` runs against the test recipe (`recipe.title = "Risotto"` + other fields blank), `compute_completeness(recipe)` returns `missing == []` because every field is now filled. The `for field in missing:` loop in `_run_thread_llm` (line 900) iterates zero times → `chosen_field` stays None → no question turn is emitted. The defer-cleared branch's assertion `len(question_turns_after) >= 1` is structurally unreachable until the fixture emits a partial extract for this scenario.

The defer test's Step 5 already inserts a sentinel marker on the trigger turn: `payload={"text": "__TEST_FORCE_NEW_HASH__ ajoute du parmesan"}` (line 575). The sentinel is currently referenced ONLY in the defer test body — no fixture branch consumes it (verified via `grep -rn "__TEST_FORCE_NEW_HASH__" backend/`).

Implementation:

  1. In `backend/app/services/llm_fixtures.py::canned_thread_extract`:
     - Add a constant `_FORCE_NEW_HASH_PREFIX = "__TEST_FORCE_NEW_HASH__"` near the top of the module (after `_FORCE_FAIL_PREFIX`).
     - Before the return statement that builds the canned `GeminiExtractedRecipe`, scan the same `turns` list the function already iterates for force-fail. If any text or voice turn's payload starts with the new sentinel, return a SECOND canned shape that:
         * sets `cook_time_minutes=None` (so the field stays missing → `_run_thread_llm` picks it as the question)
         * sets `summary_body` to a distinct French string (so `_extraction_hash` differs from the default branch and the idempotency check on line 786-797 does NOT short-circuit the second `_run_thread_llm` call)
         * keeps every OTHER field identical to the default shape (title, ingredients, steps, etc.) so no test that consumes the default risotto-shape extract regresses
     - Choice rationale documented inline: `cook_time_minutes` is in `INPUT_TYPE_MAP` (numeric → stepper) per services/completeness.py, so it's eligible for question emission (D-10/D-11). Cuisine or main_protein would also work — `cook_time_minutes` chosen because it's a stepper input (clearer in fixture comments) and orthogonal to mood/seasonality which already vary across the codebase.
     - Keep the existing `_FORCE_FAIL_PREFIX` branch unchanged — the new sentinel is checked BEFORE the default return but AFTER the force-fail check (so force-fail still wins when both are present in different turns).

  2. In `backend/tests/test_question_endpoints.py`:
     - Remove the `@pytest.mark.xfail(strict=False, reason="...D-39-05 / 37-01-SUMMARY Category C...")` decorator above `test_defer_suppresses_question_in_run_thread_llm` (lines 483-492).
     - No body changes — the test already inserts the sentinel; once the fixture honors it, the assertion `len(question_turns_after) >= 1` will hold.

Regression scope: every test that calls `_run_thread_llm` or `process_thread_turn` in test mode invokes `canned_thread_extract` via `_run_thread_llm` line 768. The new branch only activates when a turn payload starts with `__TEST_FORCE_NEW_HASH__` — verified to exist nowhere else in the suite via grep. All existing callers go through the default branch unchanged. Verify by running the full LLM-touching test set (Task 2 verify command).

Per CLAUDE.md MVP posture: no compat shim — clean addition of a test-mode branch keyed on a sentinel (mirrors the established `__TEST_FORCE_FAIL__` pattern). Per backend/CLAUDE.md: `from google import genai` SDK is irrelevant here (fixture is canned, not live).
  </action>
  <verify>
    <automated>cd backend && set -a && source ../.env.test.example && set +a && DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test GEMINI_API_KEY=stub uv run pytest tests/test_question_endpoints.py tests/test_llm_thread.py tests/test_llm_thread_kinds.py tests/test_turns.py -x -q</automated>
  </verify>
  <done>
xfail decorator removed; `test_defer_suppresses_question_in_run_thread_llm` passes; ALL tests in `test_question_endpoints.py`, `test_llm_thread.py`, `test_llm_thread_kinds.py`, `test_turns.py` still pass (zero LLM-fixture regression). Commit message: `test: fix Category C — llm_fixtures emits question turn for defer test (D-39-05)`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Full-suite verification + write SUMMARY.md (no commit)</name>
  <files>.planning/quick/260520-dip-fix-2-d-39-05-xfails-process-thread-turn/260520-dip-SUMMARY.md</files>
  <action>
Run the full backend suite with coverage and assert all must_haves hold. Then write the SUMMARY.md. NO COMMIT in this task — the orchestrator handles the docs commit.

Steps:

  1. Run the full suite with coverage:
     ```
     cd backend && set -a && source ../.env.test.example && set +a && \
       DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test \
       GEMINI_API_KEY=stub \
       uv run pytest --cov=app --cov-report=term --cov-report=json:coverage.json
     ```
     Capture the numeric outputs:
       * pass count (expect ≥ 542 = 540 + 2 unxfailed)
       * fail count (expect 0)
       * xfailed count (expect 1 — migration 0006 only)
       * skipped count (expect 3)
       * repo line coverage % (expect ≥ 85.0%)

  2. Confirm the per-file rules gate still passes:
     ```
     cd backend && python ../scripts/check_rules_files_coverage.py coverage.json
     ```
     Expect: exit 0.

  3. Confirm the migration test xfail is the only remaining xfail. Use pytest's verbose summary output (`--tb=no -ra` if needed) to list the xfail id; it MUST be the migration 0006 test in `tests/migrations/test_migration_safety.py`. Any other xfail in the output is a regression and Task 1 / Task 2 must be revisited.

  4. Write the SUMMARY.md at the path in <files>. Required sections (follow the GSD summary template):
     - **Result** table — before/after for: tests passed, tests xfailed, repo coverage %, rules-files gate status. "Before" baseline = 540 pass / 3 xfail / 85.08% (from 39-02-SUMMARY).
     - **D-39-05 fix shapes** — one paragraph per category describing the EXACT change shape used (e.g., for Cat B: "no-op-close wrapper" or "post-await re-fetch via _TestSessionLocal"; for Cat C: "sentinel __TEST_FORCE_NEW_HASH__ branch returning extract with cook_time_minutes=None and distinct summary_body").
     - **Regression check** — list of LLM-touching test files run after each fix + pass counts.
     - **Verification numbers** — per memory `feedback_verify_before_claiming_done.md`: exact pass/fail/xfail/skip counts + coverage %, taken from the pytest output of step 1.
     - **Threat flags** — none expected (test-only + fixture-only changes).
     - **Self-Check** — checklist of all must_haves with ✓/✗ markers.

  5. DO NOT push to origin/main. DO NOT modify CI workflows or pyproject.toml. DO NOT touch any test file other than the two listed in Task 1 / Task 2. DO NOT commit in this task.
  </action>
  <verify>
    <automated>test -f .planning/quick/260520-dip-fix-2-d-39-05-xfails-process-thread-turn/260520-dip-SUMMARY.md && grep -E "passed|xfailed|coverage" .planning/quick/260520-dip-fix-2-d-39-05-xfails-process-thread-turn/260520-dip-SUMMARY.md</automated>
  </verify>
  <done>
Full suite shows 0 failed; xfailed count == 1 (migration 0006); repo coverage ≥ 85.0%; rules-files gate exits 0; SUMMARY.md exists with concrete before/after numbers, fix-shape paragraphs, and regression check. No commit performed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| pytest test runner → backend session lifecycle | Test-only monkeypatch on `llm_module.SessionLocal`; touches no production session path |
| canned fixture → production LLM call site | `_run_thread_llm` branches on `settings.environment == "test"`; production never reaches `canned_thread_extract` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-260520-dip-01 | Tampering | canned_thread_extract sentinel branch | accept | Sentinel `__TEST_FORCE_NEW_HASH__` is test-only (no production code emits this prefix). Mirror of established `__TEST_FORCE_FAIL__` pattern which has shipped without incident across 5 milestones. Production code path (`settings.environment != "test"`) does NOT call this fixture — `_run_thread_llm` lines 767-783 select live Gemini in non-test envs. |
| T-quick-260520-dip-02 | Information Disclosure | no-op-close session wrapper in test | accept | Wrapper exists only in the test body — never imported by production code. Worst case if the wrapper leaks into another test: that test would observe extra committed rows via SAVEPOINT until next teardown; conftest's outer `transaction.rollback()` always clears them. No PII / no auth-token / no DB credentials touched. |
| T-quick-260520-dip-SC | Tampering | npm/pip/cargo installs | n/a | No package installs in this quick — pure test + fixture edits. RESEARCH.md package-legitimacy gate not applicable. |
</threat_model>

<verification>
**Per-task verification** is captured in each `<verify>` block above. The orchestrator-level full-suite verification is Task 3.

**End-to-end gate** (run at orchestrator close):
  1. Full backend suite: 0 failed, xfailed count == 1 (only migration 0006), skipped == 3
  2. Repo coverage ≥ 85.0% (target 85.08% per 39-02 baseline)
  3. `scripts/check_rules_files_coverage.py coverage.json` exits 0
  4. `git status` shows: 3 modified files (backend/app/services/llm_fixtures.py, backend/tests/test_llm_thread.py, backend/tests/test_question_endpoints.py) + 1 new SUMMARY.md
  5. `git log --oneline -3` shows 2 task-level commits (Task 1, Task 2). Task 3 leaves changes uncommitted for the orchestrator.

**Forbidden file modifications** (scope_fence — if `git diff` touches any of these, reject):
  - `.github/workflows/**` (Phase 39 owns CI)
  - `backend/pyproject.toml` (Phase 39 owns fail_under)
  - any test file under `backend/tests/` OTHER than `test_llm_thread.py` and `test_question_endpoints.py`
  - any file under `backend/app/` OTHER than `services/llm_fixtures.py`
</verification>

<success_criteria>
- [ ] Both xfail decorators removed (verified via `grep "xfail" backend/tests/test_llm_thread.py backend/tests/test_question_endpoints.py` showing zero D-39-05 references)
- [ ] `test_process_thread_turn_failure_records_on_turn_payload` PASSES in isolation AND full-suite
- [ ] `test_defer_suppresses_question_in_run_thread_llm` PASSES in isolation AND full-suite
- [ ] `test_llm_thread.py`, `test_llm_thread_kinds.py`, `test_turns.py`, `test_question_endpoints.py` all green (regression check)
- [ ] Full backend suite: 0 failed; 1 xfailed (migration 0006 only); ~3 skipped
- [ ] Repo line coverage ≥ 85.0% sustained
- [ ] `scripts/check_rules_files_coverage.py coverage.json` exits 0
- [ ] 2 atomic task commits exist + SUMMARY.md staged uncommitted for orchestrator
- [ ] No file outside the 3 listed in `files_modified` is modified
- [ ] No push to origin/main
</success_criteria>

<output>
After Task 3, the working tree contains:
  - 2 task commits on the current branch (Task 1 + Task 2) — pushed by user manually
  - `.planning/quick/260520-dip-fix-2-d-39-05-xfails-process-thread-turn/260520-dip-SUMMARY.md` ready for orchestrator docs commit
</output>
