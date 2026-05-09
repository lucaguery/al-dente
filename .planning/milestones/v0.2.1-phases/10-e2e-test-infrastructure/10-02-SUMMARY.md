---
phase: 10-e2e-test-infrastructure
plan: 02
subsystem: testing
tags: [llm-stub, gemini, supabase-storage, env-flag, test-mode, fixtures, pydantic]

# Dependency graph
requires:
  - 10-01 (settings.environment == "test" switch + DATABASE_URL_TEST flow)
provides:
  - Deterministic GeminiExtractedRecipe canned responses for voice / photo / modify capture surfaces
  - Test-mode short-circuit at the top of llm.extract_from_transcript / extract_from_photos / apply_voice_modification
  - Test-mode short-circuit at the top of storage.upload_recipe_photo / upload_cooking_log_photo (deterministic synthetic bucket-relative paths)
  - Closes Pitfall 8 — photo capture spec no longer needs SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the Playwright webServer env
affects:
  - 10-04 (capture-photo / capture-voice specs depend on the canned LLM + storage stubs to run deterministically)
  - 10-05+ (every spec exercising the BackgroundTask draft → structured promotion path inherits the stub transitively)

# Tech tracking
tech-stack:
  added: []  # Pure surgical guards — no new runtime deps. llm_fixtures.py reuses the existing pydantic GeminiExtractedRecipe / GeminiIngredient schemas.
  patterns:
    - "Lazy import inside the test-mode guard (from app.services.llm_fixtures import canned_*) — avoids a module-load circular import (llm_fixtures.py imports GeminiExtractedRecipe + GeminiIngredient from llm.py)."
    - "Storage guard placed ABOVE the MAX_BYTES check — test bytes are not size-validated; the canned LLM response (D-04) doesn't need to match anything in object storage so the validation is moot in test mode."
    - "Path shape parity with production: synthetic test paths use the exact same `{household_id}/{recipe_id}/{uuid4()}.{ext}` and `cooking-logs/{household_id}/{log_id}/{uuid4()}.{ext}` shapes — downstream consumers (signed-url helper, photo_paths JSONB) never need to special-case test paths."

key-files:
  created:
    - backend/app/services/llm_fixtures.py
  modified:
    - backend/app/services/llm.py (3 guards inserted, no other lines changed)
    - backend/app/services/storage.py (2 guards inserted, no other lines changed)

key-decisions:
  - "Approach: 4 surgical edits as recommended by RESEARCH.md Open Question 3 + Pitfall 8 — added the storage guard rather than setting fake Supabase env vars in webServer.env. Cleaner: no real Supabase client construction in test mode, no HTTPS round-trip attempted, no service-role key needed in any test-only env file."
  - "Lazy import inside each guard rather than top-of-module: prevents the obvious circular import (llm_fixtures → llm), and keeps llm_fixtures.py off the production import path entirely (it is imported only when the test branch fires)."
  - "Storage guard placement: ABOVE the MAX_BYTES + magic-byte sniff. The canned LLM response is decoupled from the photo bytes in test mode, so test fixtures don't need to be valid images or sized correctly. Sniffing is still attempted to derive the extension when bytes happen to be a real JPEG/PNG (so paths look natural in spec failures), with a 'jpg' fallback."
  - "Locked-vocabulary literals match models/enums.py .value strings verbatim: 'italian', 'french', 'comfort', 'celebratory', 'none', 'autumn', 'winter'. No English drift. Pydantic Literal[…] validates at GeminiExtractedRecipe construction time; the inline verify-block proved the runtime ordering matches ['autumn', 'winter']."

patterns-established:
  - "Test-mode short-circuit lives INSIDE the function, not at a higher abstraction layer. Means any future caller (router, BackgroundTask body, a hypothetical retry path) inherits the stub without coordination — the guard is at the chokepoint, not at the caller."
  - "Canned-response builder takes the same args as the real function (transcript / photo_count / recipe_json+transcript) so the guard is a literal drop-in: same signature, same return type, just instant."

requirements-completed: [TEST-01]

# Metrics
duration: ~10min
completed: 2026-05-08
---

# Phase 10 Plan 02: LLM + Storage Test-Mode Stubs Summary

**Three surgical env-flag guards in services/llm.py + two in services/storage.py + a 89-line llm_fixtures.py exporting canned GeminiExtractedRecipe values, so when ENVIRONMENT=test every recipe-capture surface returns deterministic data instantly without invoking Gemini or Supabase Storage.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 3 / 3
- **Files modified:** 3 (1 created, 2 patched — exactly the in-scope set)

## Accomplishments

- `backend/app/services/llm_fixtures.py` shipped — 89 lines, three canned response builders:
  - `canned_voice_recipe(transcript)` — "Risotto aux champignons (test)" / cuisine=italian / mood=[comfort] / seasonality=[autumn, winter]
  - `canned_photo_recipe(photo_count)` — "Tarte Tatin (test)" / cuisine=french / mood=[celebratory, comfort] / seasonality=[autumn]
  - `canned_modified_recipe(recipe_json, transcript)` — echoes the input recipe with `prep_time_minutes += 10` to simulate a modification
- `backend/app/services/llm.py` — three D-04 guards landed at lines 201 / 229 / 270 (the top of `extract_from_transcript`, `extract_from_photos`, `apply_voice_modification`). Lazy imports inside each guard.
- `backend/app/services/storage.py` — two T-10-06 / Pitfall 8 guards landed at lines 117 / 190 (the top of `upload_recipe_photo` and `upload_cooking_log_photo`). Synthetic paths reuse the exact production shape so consumers never need to branch.
- BackgroundTask bodies (`promote_voice_draft`, `promote_photo_draft`, `retry_promotion`) inherit the stub transitively — no edits to those bodies needed.

## Task Commits

1. **Task 1: backend/app/services/llm_fixtures.py with three canned response builders** — `fb8d858` (feat)
2. **Task 2: D-04 env-flag guards in backend/app/services/llm.py (3 functions)** — `3c8dbd3` (feat)
3. **Task 3: T-10-06 / Pitfall 8 env-flag guards in backend/app/services/storage.py (2 functions)** — `c8df0ed` (feat)

## Files Created/Modified

- `backend/app/services/llm_fixtures.py` (NEW, 89 lines) — three canned `GeminiExtractedRecipe` builders.
- `backend/app/services/llm.py` (MODIFIED, +15 lines) — three 4-line guards inserted; existing prompts, the lazy `_gemini()` client, BackgroundTask bodies, and helper functions (`_apply_extracted` / `_broadcast_promoted` / `_record_failure`) untouched.
- `backend/app/services/storage.py` (MODIFIED, +15 lines) — two 7-line guards inserted; `_supabase()`, `detect_mime_and_ext`, `create_signed_photo_url`, and the `BUCKET` / `MAX_BYTES` / `SIGNED_URL_TTL_SECONDS` constants untouched.

## Verification Run-Through

### Task 1 — Canned-response builder import + values

```
$ uv run python -c "from app.services.llm_fixtures import canned_voice_recipe, canned_photo_recipe, canned_modified_recipe; ..."
OK
```

All three constructors return valid `GeminiExtractedRecipe` instances with locked-vocabulary literal values (`italian`, `french`, `comfort`, `celebratory`, `none`, `autumn`, `winter`). Pydantic validates at construction time via the `Literal[…]` types in llm.py.

### Task 2 — Test-mode short-circuit + production path

Positive-mode (test) — all three extraction functions return canned data:

```
$ ENVIRONMENT=test uv run python -c "
  from app.services.llm import extract_from_transcript, extract_from_photos, apply_voice_modification
  r1 = extract_from_transcript('test'); assert r1.title == 'Risotto aux champignons (test)'
  r2 = extract_from_photos([b'fake']); assert r2.title == 'Tarte Tatin (test)'
  r3 = apply_voice_modification({'title':'X','prep_time_minutes':10}, 't'); assert r3.prep_time_minutes == 20
  print('OK')
"
OK
```

Negative-mode (development) — `_gemini()` is reached and a real network round-trip is attempted:

```
$ ENVIRONMENT=development uv run python -c "from app.services.llm import extract_from_transcript; extract_from_transcript('test')"
# httpx.ConnectError: [SSL: CERTIFICATE_VERIFY_FAILED] (incidental local cert chain issue)
# — but the SDK reached the network, proving the test stub is correctly gated.
```

T-10-02 mitigation confirmed: stub fires only when `environment == "test"`. Default `environment="development"` takes the real Gemini path.

### Task 3 — Storage test-mode stub + production path

Positive-mode (test) — both upload functions return synthetic paths instantly:

```
$ ENVIRONMENT=test uv run python -c "
  from app.services.storage import upload_recipe_photo, upload_cooking_log_photo
  jpeg = b'\xff\xd8\xff\xe0' + b'\x00' * 100
  hh = uuid4(); rid = uuid4()
  p1 = upload_recipe_photo(household_id=hh, recipe_id=rid, content=jpeg)
  assert p1.startswith(f'{hh}/{rid}/') and p1.endswith('.jpg')
  p2 = upload_cooking_log_photo(household_id=hh, log_id=rid, content=jpeg)
  assert p2.startswith(f'cooking-logs/{hh}/{rid}/') and p2.endswith('.jpg')
  # Empty-bytes fallback to .jpg also works
  p3 = upload_recipe_photo(household_id=hh, recipe_id=rid, content=b'')
  assert p3.endswith('.jpg')
  print('OK')
"
OK
```

Negative-mode (development) — `_supabase()` is constructed and the storage3 SDK actually attempts the upload:

```
$ ENVIRONMENT=development uv run python -c "from app.services.storage import upload_recipe_photo; upload_recipe_photo(...)"
# httpx.ConnectError into Supabase Storage REST endpoint — same incidental cert error,
# but the upload attempt confirms the test stub is correctly gated.
```

T-10-06 mitigation confirmed: in test mode, no Supabase client is instantiated, no network call is made, no service-role key is required.

## Vocabulary Mirror Confirmation

The canned-response literal values match `backend/app/models/enums.py` `.value` strings byte-for-byte:

| Field | Canned literal | Enum `.value` |
|-------|---------------|---------------|
| `cuisine` (voice) | `"italian"` | `Cuisine.italian.value == "italian"` |
| `cuisine` (photo) | `"french"` | `Cuisine.french.value == "french"` |
| `mood` (voice) | `["comfort"]` | `Mood.comfort.value == "comfort"` |
| `mood` (photo) | `["celebratory", "comfort"]` | `Mood.celebratory.value == "celebratory"` |
| `main_protein` | `"none"` | `Protein.none.value == "none"` |
| `seasonality` (voice) | `["autumn", "winter"]` | `Season.autumn.value == "autumn"`, `Season.winter.value == "winter"` |

No English drift. The `Literal[…]` types in llm.py reject any value outside the locked enum set, so the fixtures cannot accidentally diverge from production vocabulary at runtime.

## Decisions Made

- **4 surgical edits over 3 + fake Supabase env vars.** RESEARCH.md Open Question 3 left the planner the choice between (a) adding a 4th surgical edit in `services/storage.py` or (b) setting fake Supabase env vars in `playwright.config.ts` `webServer.env`. Picked (a) because it keeps the test-mode boundary at the function chokepoint (consistent with the D-04 LLM guard), avoids a real `_supabase()` client construction (no service-role key in any test env file), and prevents fake-cred + network attempts from polluting test logs.
- **Lazy import inside the guard, not at module top.** Two reasons: (1) `llm_fixtures.py` imports `GeminiExtractedRecipe` and `GeminiIngredient` from `llm.py`, so a top-of-module import in `llm.py` would create a load-order cycle. (2) In production (`environment != "test"`), the `from app.services.llm_fixtures import …` line is dead code — never executed, no module-cache penalty, no chance of accidentally rendering a "(test)"-tagged title.
- **Storage guard placed ABOVE the MAX_BYTES + magic-byte sniff.** The canned LLM response (`canned_photo_recipe`) is independent of the photo bytes — it returns the same Tarte Tatin shape regardless of `photo_count` (the param is just there for signature parity). So in test mode, byte validation is irrelevant. The guard still sniffs to derive the extension when bytes happen to be a real image (cleaner spec failure messages), with a `"jpg"` fallback for empty / synthetic bytes.

## Deviations from Plan

None — plan executed exactly as written. The 3 in-scope files were touched, no others. `git diff --name-only HEAD~3..HEAD` confirms `backend/app/services/llm_fixtures.py`, `backend/app/services/llm.py`, `backend/app/services/storage.py` are the only modified paths. No drive-by edits to routers, models, or other services.

## Issues Encountered

The PreToolUse:Edit hook surfaced READ-BEFORE-EDIT reminders three times during the surgical patch passes on `llm.py` and once on `storage.py`. Both files had been read in the same session's initial context-load batch, so each Edit landed cleanly on the first attempt — the reminders were soft notices, not rejections. Confirmed by post-edit grep counts (3 guards in llm.py / 2 in storage.py) and the inline-Python verify blocks passing.

## Threat Model Coverage

| Threat ID | Status | How |
|-----------|--------|-----|
| T-10-02 (test-mode stub leaks to prod) | mitigated | Guard reads `settings.environment` from the same singleton prod uses; default value is `"development"`. Negative-mode probe confirmed `_gemini()` is invoked and the SDK attempts a real network round-trip when `environment != "test"`. |
| T-10-04 (LLM stub leaks into prod) | mitigated | Same chokepoint as T-10-02. The fixtures module is imported lazily *inside* the guard branch — if the dev mode runs llm.py, the `from app.services.llm_fixtures import …` line is never reached; no risk of accidental "(test)"-titled production data. |
| T-10-06 (photo capture spec hits real Supabase) | mitigated | New guard at top of `upload_recipe_photo` and `upload_cooking_log_photo` returns deterministic synthetic path when `environment == "test"`. `_supabase()` is never instantiated, no service-role key needed in test webServer env. Negative-mode probe confirmed dev path still constructs the client and hits the storage3 SDK upload call. |

## Self-Check: PASSED

Verified post-write:
- `backend/app/services/llm_fixtures.py` exists at 89 lines: FOUND.
- `grep -c "def canned_voice_recipe" llm_fixtures.py == 1`: FOUND.
- `grep -c "def canned_photo_recipe" llm_fixtures.py == 1`: FOUND.
- `grep -c "def canned_modified_recipe" llm_fixtures.py == 1`: FOUND.
- `grep -c "if settings.environment == \"test\":" backend/app/services/llm.py == 3`: FOUND.
- `grep -c "if settings.environment == \"test\":" backend/app/services/storage.py == 2`: FOUND.
- `grep -c "from app.services.llm_fixtures import canned_" backend/app/services/llm.py == 3`: FOUND.
- All extract/upload function signatures unchanged (single match each via grep `-c "def …"`): FOUND.
- BackgroundTask bodies (`promote_voice_draft`, `promote_photo_draft`) and helpers (`_supabase`, `create_signed_photo_url`, `detect_mime_and_ext`) all preserve their single-occurrence grep counts: FOUND.
- Commit `fb8d858` exists: FOUND.
- Commit `3c8dbd3` exists: FOUND.
- Commit `c8df0ed` exists: FOUND.
- `git diff --name-only HEAD~3..HEAD` returns exactly the 3 in-scope files: FOUND (no scope creep).
- Inline Python checks pass for both test-mode and dev-mode behavior on `llm.py` and `storage.py`: FOUND.

## Next Plan Readiness

- Plan 10-03 (idempotent backend seed CLI) can now rely on the test-mode chokepoints being in place — any seed code that exercises capture surfaces (or that gets exercised by them in subsequent specs) will inherit the deterministic stub.
- Plan 10-04 (`capture-photo.spec.ts` + `capture-voice.spec.ts`) can run end-to-end without `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `GEMINI_API_KEY` in the Playwright `webServer` env — exactly the Pitfall 8 escape hatch RESEARCH.md called out.
- Subsequent plans exercising the BackgroundTask draft → structured promotion flow (any spec that creates a recipe via `/recipes/voice` or `/recipes/photo` and asserts the structured fields) inherit the stub transitively through `promote_voice_draft` / `promote_photo_draft`.

---
*Phase: 10-e2e-test-infrastructure*
*Plan: 02*
*Completed: 2026-05-08*
