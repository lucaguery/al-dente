---
phase: 29-llm-prompt-rework-completeness-wire-up
verified: 2026-05-17T19:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Live LLM round-trip: submit a text refinement turn on a recipe with missing fields and confirm (a) a summary turn appears in the thread, (b) a question turn appears for the first missing eligible field, (c) re-submitting the same turn produces no duplicate summary (idempotency)."
    expected: "One summary turn emitted with extraction_hash set; one question turn for the highest-priority non-skipped missing field; re-run with unchanged thread returns silently with no new turns."
    why_human: "Requires live Gemini API + running backend + DB. The test-environment canned fixture path is verified by code inspection and the test suite, but the actual Gemini integration path (models.generate_content call) cannot be exercised without the full stack."
  - test: "Live advisory round-trip: manually pin a field via the form (PUT /recipes/{id}), then submit a text turn that conflicts. Confirm (a) an advisory bubble appears in the thread, (b) the recipe form field stays at the pinned value, (c) tapping 'Mettre à jour' applies the proposed value and removes the pin."
    expected: "Advisory turn emitted with field/current_value/proposed_value/reason_excerpt; recipe form unchanged until 'Mettre à jour' tap; proposal_accepted turn applied, pin removed."
    why_human: "Requires live stack + Gemini response that actually conflicts with a pinned field. Cannot be simulated without real extraction."
  - test: "Defer gate live test: tap 'Plus tard' on a summary bubble; submit another text refinement turn; confirm no new question turn appears while deferred. Wait (or manually set questions_deferred_until to past); submit again; confirm question turn appears."
    expected: "Deferred state: no question emitted. After expiry: question emitted."
    why_human: "Requires live stack + Gemini. Time manipulation or DB reset needed for expiry leg."
  - test: "Playwright e2e: run the two Phase 29 specs in recipe-detail.spec.ts against the seeded test environment."
    expected: "Both specs pass: (1) 'Oui, compléter' produces a question turn or 'Tout est complet.' toast; (2) 'Plus tard' collapses CTAs and suppresses subsequent question turn."
    why_human: "Requires a running seeded stack (backend in test mode with canned_thread_extract) + Playwright browser. The specs were committed and verified at the grep level but not run end-to-end in this phase."
---

# Phase 29: LLM Prompt Rework + Completeness Wire-Up — Verification Report

**Phase Goal:** The Gemini call is rebuilt around the full thread + pinned-field set. The LLM emits `advisory` turns on conflict (never silently overwrites), and emits one `question` turn per missing high-weight field driven by `recipe-completeness.ts`. `CompletenessCard` stays as a passive progress indicator.
**Verified:** 2026-05-17T19:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Each LLM-triggering turn runs Gemini exactly once; re-saving identical thread twice produces same summary (idempotency via extraction_hash) | VERIFIED | `_run_thread_llm` at line 731 calls `_gemini().models.generate_content(...)` exactly once (test path: `canned_thread_extract`). `_extraction_hash` at line 547 uses `json.dumps(model_dump(), sort_keys=True, ensure_ascii=False)` + SHA256 — correctly avoids Pitfall 1. Idempotency check at line 790: if `most_recent_summary.payload["extraction_hash"] == new_hash` → early return with no emission. |
| SC-2 | LLM conflict with manually_edited_fields emits advisory bubble; pinned value not changed until user taps "Mettre à jour" | VERIFIED | `_run_thread_llm` lines 833-849: for each pinned field, calls `is_conflict(field, current, proposed)` then `_should_emit_advisory(thread, field, proposed)` with WR-03 `str()` normalization fix applied (commit `79e9368`). Advisory payloads collected; `safe_extracted` reverts conflicting fields before `_apply_extracted` runs (lines 852-864) — pinned value never overwritten. Advisory de-dup in `_should_emit_advisory` (lines 592-630) suppresses unresolved duplicates. |
| SC-3 | Missing high-weight field produces one question turn per LLM run, gated by INPUT_TYPE_MAP and deferral window | VERIFIED | `_run_thread_llm` lines 891-931: `questions_deferred_until > now()` gate (tz-aware, Pitfall 9). Then `compute_completeness` → iterate `FIELD_KEYS` order → skip `INPUT_TYPE_MAP[field] is None` (ingredients/steps) → skip `_should_emit_question` de-dup → emit first surviving field. Exactly one question turn emitted per run. `QuestionTurnPayload` shape matches D-13. |
| SC-4 | CompletenessCard on /recipes/[id] is unchanged in behavior | VERIFIED | `git diff 34a1970..HEAD -- frontend/components/CompletenessCard.tsx frontend/lib/recipe-completeness.ts` returns 0 lines (confirmed in shell). CompletenessCard is still mounted at page.tsx line 676 unchanged: `<CompletenessCard recipe={recipe} />`. |

**Score:** 4/4 truths verified (automated code inspection)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/alembic/versions/0011_add_questions_deferred_until.py` | Migration adding nullable timestamptz | VERIFIED | Exists. `down_revision = "0009"`. `op.add_column` with `DateTime(timezone=True), nullable=True`. Reversible via `op.drop_column`. |
| `backend/app/models/recipe.py` | ORM column `questions_deferred_until: Mapped[datetime | None]` | VERIFIED | Line 120: `questions_deferred_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)`. |
| `backend/app/schemas/recipe.py` | `RecipeResponse.questions_deferred_until: Optional[datetime] = None` | VERIFIED | Line 162: present. `manually_edited_fields` also confirmed at line 155 (Pitfall 5 gate). |
| `frontend/lib/recipes.ts` | `questions_deferred_until?: string | null` | VERIFIED | Line 71: present. `manually_edited_fields: string[]` at line 63. |
| `backend/app/services/completeness.py` | Python parallel of recipe-completeness.ts (197 LOC) | VERIFIED | Exists, 197 lines. Exports: `FIELD_KEYS`, `is_field_filled`, `compute_completeness`, `INPUT_TYPE_MAP`, `_FIELD_PROMPTS_FR`, `_FIELD_LABELS_FR` (with `seasonality: "saison"` added by commit `52627bf`), `OPTIONS_MAP`, `is_conflict`. Imports from `app.schemas.recipe_turn._VALID_*` (drift-free). |
| `backend/tests/test_completeness.py` | 44 parity tests | VERIFIED | Exists, 44 `def test_` functions confirmed. |
| `backend/app/schemas/recipe_turn.py` | Graduated `SummaryTurnPayload` + `QuestionTurnPayload` | VERIFIED | `SummaryTurnPayload`: `body: Optional[str] = Field(default=None, max_length=240)`, `chips: List[str]`, `extraction_hash: str`. `QuestionTurnPayload`: `field: AnswerField`, `prompt: str`, `input_type: Literal["chip","stepper","text"]`, `options: List[str]`, `multi: bool = False`. Stub comments (`# Phase 29 LLM-01 defines content`) removed — confirmed 0 matches. |
| `backend/app/services/llm.py` | Full-thread LLM body with helpers | VERIFIED | `process_thread_turn` is `async def` (line 1155). `_run_thread_llm` is `async def` (line 731). `_extraction_hash`, `_extract_reason_from_thread`, `_should_emit_advisory`, `_should_emit_question`, `_build_thread_prompt` all present. `extract_from_transcript` and `extract_from_photos` deleted (grep returns nothing). |
| `backend/app/services/llm_fixtures.py` | `canned_thread_extract` present; `canned_voice_recipe`/`canned_photo_recipe` deleted | VERIFIED | `canned_thread_extract` at line 31. `canned_voice_recipe` and `canned_photo_recipe` not found in file. |
| `backend/tests/test_llm_thread.py` | 43 tests covering all must-haves | VERIFIED | Exists, 43 `def test_` functions, 1182 lines. |
| `backend/app/routers/recipes.py` | Two new endpoints: `/questions/trigger` + `/questions/defer` | VERIFIED | `trigger_next_question` at line 1115, `defer_questions` at line 1218. Both import `compute_completeness`, `_should_emit_question`. WR-04 fix applied: thread read inside `async with lock:` block. |
| `backend/tests/test_question_endpoints.py` | 19 tests for both endpoints | VERIFIED | Exists, 19 `def test_\|async def test_` functions, 582 lines. |
| `frontend/components/RecipeThread/types.ts` | `deferred: boolean`, `onSummaryComplete`, `onSummaryLater` in detail mode | VERIFIED | Lines 109-114 (detail branch): all 3 props required. Lines 84-86 (capture branch): `?: never` markers on all 3. |
| `frontend/components/RecipeThread/index.tsx` | Passes 3 new props to SystemBubble | VERIFIED | Lines 303-309: `deferred`, `onSummaryComplete`, `onSummaryLater` all prop-drilled. |
| `frontend/components/RecipeThread/SystemBubble.tsx` | Summary CTAs wired with onClick; deferred gate | VERIFIED | `handleComplete`/`handleLater` functions wired (lines 79-97). Both buttons gated by `deferred === true` (lines 134, 147). `VISUAL STUBS` comment removed — confirmed 0 matches. Spinner guard simplified (IN-02 fix, commit `52627bf`): `{committing ? <Loader2> : t("summary_complete")}`. |
| `frontend/app/recipes/[id]/page.tsx` | `handleSummaryComplete`, `handleSummaryLater`, `deferred` derived prop | VERIFIED | `handleSummaryComplete` at line 406 posts to `/api/recipes/${id}/questions/trigger`; returns null on 204 → `toast.success(tThread("all_complete"))`. `handleSummaryLater` at line 432 posts to `/api/recipes/${id}/questions/defer`. `deferred` at line 592. All 3 passed to RecipeThread at lines 790-792. CR-01 fix confirmed: answer/proposal turn bodies are flat (not nested under `payload` key). |
| `frontend/lib/i18n/fr.json` | `recipes.thread.all_complete = "Tout est complet."` | VERIFIED | Line 269 confirmed. |
| `frontend/tests/e2e/recipe-detail.spec.ts` | Phase 29 CTA specs | VERIFIED | `test.describe('Phase 29 — summary CTA wire-up (D-22)')` with 2 specs. IN-03 fix applied: text turn POSTs use flat `{ kind: 'text', text: '...' }` shape (lines 207, 241, 267). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `_run_thread_llm` | `services/completeness.py` | `from app.services.completeness import compute_completeness, is_conflict, INPUT_TYPE_MAP, ...` | WIRED | Import at line 537 of llm.py confirmed |
| `promote_draft` text branch | `_run_thread_llm` | `asyncio.run(_run_thread_llm(db, recipe, first_turn.id))` | WIRED | Line 1076 confirmed. Note: WR-02 (ordering `_broadcast_promoted` before `asyncio.run`) is deferred by documented disposition. |
| `promote_draft` voice branch | `_run_thread_llm` | `asyncio.run(_run_thread_llm(...))` | WIRED | Line 1094 confirmed |
| `promote_draft` photo branch | `_run_thread_llm` | `asyncio.run(_run_thread_llm(...))` | WIRED | Line 1114 confirmed |
| `process_thread_turn` | `_run_thread_llm` | `await _run_thread_llm(db, recipe, turn_id)` | WIRED | Line 1178 confirmed |
| `extract_and_process_url_turn` | `process_thread_turn` | `await process_thread_turn(recipe_id, turn_id)` | WIRED | Line 1315 confirmed |
| `trigger_next_question` | `completeness.py` + `llm._should_emit_question` | `from app.services.completeness import ...` + `from app.services.llm import _should_emit_question` | WIRED | Lines 96, confirmed in recipes.py imports |
| `defer_questions` | `questions_deferred_until` column | `recipe.questions_deferred_until = datetime.now(tz=timezone.utc) + timedelta(hours=24)` | WIRED | Line 1253 confirmed |
| `SystemBubble` summary CTAs | `page.tsx` handlers | `onSummaryComplete(turn.id)` / `onSummaryLater(turn.id)` prop callbacks | WIRED | SystemBubble lines 83, 95; props threaded through index.tsx lines 303-309; page.tsx lines 791-792 |
| `page.tsx` | `POST /api/recipes/{id}/questions/trigger` | `api()` helper + Next.js rewrite | WIRED | Line 410 confirmed |
| `page.tsx` | `POST /api/recipes/{id}/questions/defer` | `api()` helper + Next.js rewrite | WIRED | Line 436 confirmed |
| `recipe.updated` WS (defer endpoint) | `deferred` derived prop in page.tsx | `recipe.questions_deferred_until` in WS payload → `setRecipe` → recompute `deferred` | WIRED | `deferred = recipe?.questions_deferred_until ? new Date(...) > new Date() : false` at line 592; existing `recipe.updated` WS handler updates recipe state |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SystemBubble.tsx` summary branch | `turn.payload.body`, `turn.payload.chips` | `SummaryTurnPayload` emitted by `_run_thread_llm` from Gemini extraction | Yes (test: canned_thread_extract; prod: Gemini API) | FLOWING |
| `SystemBubble.tsx` question branch | `payload.field`, `payload.prompt`, `payload.input_type` | `QuestionTurnPayload` emitted by `_run_thread_llm` from `_FIELD_PROMPTS_FR` / `INPUT_TYPE_MAP` | Yes — deterministic from completeness module | FLOWING |
| `page.tsx` `deferred` prop | `recipe.questions_deferred_until` | DB column set by `defer_questions` endpoint, delivered via `recipe.updated` WS | Yes — server-computed timestamp | FLOWING |

### Behavioral Spot-Checks

Step 7b skipped — requires a running backend with live Gemini API for the core LLM path. The test-mode path (`canned_thread_extract`) is deterministic and exercises the same code path in `_run_thread_llm`. Module-level import/structural checks were performed via grep verification above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LLM-01 | 29-03 (payload schemas), 29-04 (full-thread prompt + idempotency) | Full ordered thread + pinned-field set to Gemini; single call; idempotency | SATISFIED | `_run_thread_llm` wired; `_extraction_hash` with correct Pitfall-1 formula; `SummaryTurnPayload.extraction_hash` field present; `summary_body: Optional[str]` on `GeminiExtractedRecipe` (Pitfall 2 resolved) |
| LLM-02 | 29-04 (advisory emission + de-dup + skip pinned-conflict in _apply_extracted) | Advisory on conflict; no silent overwrite | SATISFIED | `_should_emit_advisory` with WR-03 str() fix; `safe_extracted` reverts conflicting fields before `_apply_extracted`; advisory de-dup suppresses unresolved duplicates |
| LLM-03 | 29-01 (questions_deferred_until column), 29-02 (completeness module), 29-04 (question emission), 29-05 (trigger/defer endpoints), 29-06 (frontend CTA wire-up) | Question turns for missing high-weight fields; question CTA loop | SATISFIED | Full chain: completeness.py → _run_thread_llm question emission → /questions/trigger + /questions/defer endpoints → SystemBubble CTA onClick wired → page.tsx handlers → deferred prop derived |
| LLM-04 | 29-02 (parallel module, NOT replacement), 29-06 (CompletenessCard untouched) | CompletenessCard passive indicator unchanged | SATISFIED | `git diff 34a1970..HEAD -- frontend/components/CompletenessCard.tsx frontend/lib/recipe-completeness.ts` = 0 lines. Card still mounted at page.tsx line 676. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/app/services/llm.py` | ~1072 | `_broadcast_promoted(recipe)` called before `asyncio.run(_run_thread_llm(...))` in text branch (WR-02 — deferred by documented disposition) | Warning | Low — works today under single uvicorn worker / BackgroundTask thread-pool-executor model; fragile if uvicorn runtime changes. Documented in `_broadcast_promoted` comment and REVIEW-FIX.md. No code change applied. |

No blocker anti-patterns found. All critical and most warning/info items from the code review were fixed (commit `c7a41c3` REVIEW-FIX.md + subsequent fix commits through `52627bf`).

### Human Verification Required

#### 1. Live LLM Round-Trip (SC-1 + LLM-01)

**Test:** Start the full stack (backend + frontend). Open a recipe detail page. Submit a text refinement turn via the composer. Observe the thread.
**Expected:** One summary turn appears with a `body` text and at least one chip. Re-submit the same turn content — no new summary or question turn should appear (idempotency: hash matches).
**Why human:** Requires live Gemini API + running backend + DB. The `canned_thread_extract` fixture exercises the same `_run_thread_llm` code path but does not exercise the actual `models.generate_content` call.

#### 2. Live Advisory Round-Trip (SC-2 + LLM-02)

**Test:** Manually edit the cuisine field via the form (pinning it via `manually_edited_fields`). Then submit a text turn that implies a different cuisine (e.g., "en fait c'est une recette mexicaine" when the pinned value is "italian"). Observe the thread for an advisory bubble. Verify the form field still shows "italian". Tap "Mettre à jour" and confirm "mexican" is applied and the pin is removed.
**Expected:** Advisory turn emitted with `field="cuisine"`, `current_value="italian"`, `proposed_value="mexican"`, `reason_excerpt` containing the turn text. Form unchanged until accepted.
**Why human:** Requires live stack + a Gemini response that actually extracts a conflicting value. The LLM must interpret the turn as implying a cuisine change.

#### 3. Defer Gate Live Test (SC-3 + LLM-03)

**Test:** On a recipe with missing fields, trigger a summary turn. Tap "Plus tard". Observe CTAs collapse to disabled state. Submit another text refinement turn. Confirm no new question turn appears in the thread (only a summary turn). Then either wait 24h or manually set `questions_deferred_until` to a past time in the DB. Submit another turn — confirm a question turn now appears.
**Expected:** Deferred: question suppressed. After expiry: question emitted.
**Why human:** Requires live stack + time manipulation or DB access to test the expiry leg.

#### 4. Playwright E2E Suite (LLM-03 + LLM-04)

**Test:** Run `cd frontend && npx playwright test tests/e2e/recipe-detail.spec.ts --project=seeded` against a running seeded stack.
**Expected:** All Phase 29 specs pass — "Oui, compléter" spec produces question or toast; "Plus tard" spec collapses CTAs and the subsequent LLM run emits no question turn. Existing Phase 28 specs remain green.
**Why human:** Requires seeded backend in test mode, browser automation. The spec code is verified at the source level but not executed.

### Gaps Summary

No automated gaps found. All 4 ROADMAP success criteria are satisfied by code inspection:

- SC-1: `_extraction_hash` + early-return idempotency in `_run_thread_llm` ✓
- SC-2: `_should_emit_advisory` + `safe_extracted` revert + no `_apply_extracted` overwrite ✓
- SC-3: `questions_deferred_until` gate + `compute_completeness` → `INPUT_TYPE_MAP` → `_should_emit_question` → one question turn ✓
- SC-4: Zero modifications to `CompletenessCard.tsx` and `recipe-completeness.ts` ✓

The only deferred issue is WR-02 (`asyncio.run` ordering in the text branch of `promote_draft`), which the code review disposition explicitly accepted as low-risk under the current single-worker FastAPI model.

Status is `human_needed` because the live Gemini round-trip (all four SCs) cannot be verified by static code inspection alone. The behavioral correctness of the `_run_thread_llm` integration with the actual Gemini API, the advisory conflict detection in a real exchange, the defer gate timing, and the Playwright e2e suite all require a running stack.

---

_Verified: 2026-05-17T19:00:00Z_
_Verifier: Claude (gsd-verifier)_
