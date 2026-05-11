---
phase: 02-llm-capture-w2
plan: 01
subsystem: backend-llm
tags: [gemini, google-genai, alembic, sqlalchemy, background-tasks, fastapi, pydantic]

# Dependency graph
requires:
  - phase: 01-foundations-w1
    provides: SessionLocal + Recipe model + broadcast_to_household + RecipeResponse schema
provides:
  - Gemini 2.5 Flash service module (app/services/llm.py) with structured output
  - GeminiExtractedRecipe Pydantic schema (locked-vocab Literals for cuisine/mood/protein/seasonality)
  - extract_from_transcript / extract_from_photos / apply_voice_modification pure call functions
  - promote_voice_draft / promote_photo_draft / retry_promotion BackgroundTask bodies
  - recipes.promotion_error (TEXT nullable) + recipes.promotion_attempts (INT default 0) columns
  - Alembic revision 0003 (promotion_columns)
  - settings.gemini_api_key + .env.example GEMINI_API_KEY documentation
affects: [02-02-recipes-routes, 02-03-voice-frontend, 02-04-photo-frontend, 02-05-drafts-inbox]

# Tech tracking
tech-stack:
  added:
    - google-genai>=1.75 (unified GenAI SDK; replaces deprecated single-API package)
  patterns:
    - "Structured-output via Pydantic response_schema (Gemini auto-parses to typed object)"
    - "Locked-vocab Literal types mirror app/models/enums.py wire-format (camelCase) verbatim"
    - "BackgroundTask body opens its own SessionLocal (request session is closed by then)"
    - "BackgroundTask never raises — exceptions caught and recorded on the recipe row"
    - "asyncio.run wraps the async broadcast_to_household call from sync BackgroundTask context"
    - "Lazy client singleton (genai.Client constructed on first call) keeps module import safe without env"
    - "User input passed as separate contents[] element (not concatenated) to constrain prompt-injection surface"

key-files:
  created:
    - backend/alembic/versions/0003_promotion_columns.py
    - backend/app/services/llm.py
  modified:
    - backend/pyproject.toml
    - backend/uv.lock
    - backend/.env.example
    - backend/app/config.py
    - backend/app/models/recipe.py

key-decisions:
  - "google-genai unified SDK chosen over the legacy single-API package (deprecated 2025-08-31 per RESEARCH.md §SDK Decision)"
  - "Single-file services/llm.py (no submodules) — keeps Gemini wiring discoverable and testable as a unit"
  - "Empty seasonality from Gemini falls back to all four seasons in _apply_extracted (matches DB column server_default)"
  - "Photo retry surfaces a TODO(productize) error in v0.1 because source_capture stores paths only, not bytes"
  - "Lazy client singleton in _gemini() so Alembic / pytest collection don't crash without GEMINI_API_KEY set"

patterns-established:
  - "Structured-output Gemini calls: client.models.generate_content with config=types.GenerateContentConfig(response_mime_type='application/json', response_schema=PydanticModel)"
  - "BackgroundTask shape: SessionLocal() in try/finally close, inner try/except _record_failure, success path commits + refresh + broadcast"
  - "Failure recording: log.exception, str(exc)[:500], increment promotion_attempts, leave status='draft', commit"

requirements-completed:
  - CAPTURE-06

# Metrics
duration: 5min
completed: 2026-05-07
---

# Phase 02 Plan 01: Gemini Service Module + Promotion Columns Summary

**Gemini 2.5 Flash service module with structured-output schema, three pure call functions, and three BackgroundTask bodies wiring fresh SessionLocal + recipe.promoted broadcast — plus Alembic 0003 adding promotion_error / promotion_attempts to recipes.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-07T07:01:36Z
- **Completed:** 2026-05-07T07:07:00Z
- **Tasks:** 2
- **Files modified:** 5 (+ 2 created)

## Accomplishments

- Locked the SDK choice: `google-genai>=1.75` (unified) — explicitly NOT the legacy single-API package deprecated 2025-08-31. Pinned in `pyproject.toml`, resolved into `uv.lock`.
- `recipes.promotion_error` (nullable TEXT) and `recipes.promotion_attempts` (NOT NULL INT default 0) columns added via Alembic revision 0003. Model + migration + server defaults consistent.
- Single-file `app/services/llm.py` (~450 lines) exporting:
  - `GeminiExtractedRecipe` Pydantic schema with `Literal` enums for `cuisine` / `mood` / `main_protein` / `seasonality` (locked vocabulary mirrors `app/models/enums.py`).
  - `extract_from_transcript(transcript: str)` / `extract_from_photos(photo_bytes_list: list[bytes])` / `apply_voice_modification(recipe_json, transcript)` — pure Gemini calls with `response_schema` constraint.
  - `promote_voice_draft(recipe_id, transcript)` / `promote_photo_draft(recipe_id, photo_bytes)` / `retry_promotion(recipe_id)` — BackgroundTask bodies opening fresh `SessionLocal()`, broadcasting `recipe.promoted` on success, recording `promotion_error` (truncated to 500 chars) on failure, never raising.
- `settings.gemini_api_key` exposed via pydantic-settings (auto-reads `GEMINI_API_KEY` env var); `.env.example` documents the boundary.
- All 17 plan acceptance criteria pass; module imports cleanly; Recipe ORM round-trip confirms both new columns on the table.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add google-genai dependency, settings, and Alembic migration** — `3780fa6` (feat)
2. **Task 2: Build services/llm.py — Gemini client, extraction functions, BackgroundTask bodies** — `96c798b` (feat)

**Plan metadata commit:** pending (orchestrator handles after wave completion).

## Files Created/Modified

**Created:**
- `backend/alembic/versions/0003_promotion_columns.py` — adds `promotion_error` (Text, nullable) + `promotion_attempts` (Integer, NOT NULL, default 0) to `recipes`. Standard Alembic shape; downgrade reverses both adds.
- `backend/app/services/llm.py` — Gemini service module. Imports, locked-vocab Literals, `GeminiIngredient` + `GeminiExtractedRecipe` schemas, lazy `_gemini()` client, three prompt strings (FR), three pure call functions, three BackgroundTask bodies plus three private helpers (`_apply_extracted`, `_broadcast_promoted`, `_record_failure`).

**Modified:**
- `backend/pyproject.toml` — added `"google-genai>=1.75"` to `dependencies` (alphabetical position kept).
- `backend/uv.lock` — `uv lock` regenerated; added google-genai 1.75.0, google-auth 2.50.0, distro 1.9.0, pyasn1 0.6.3, pyasn1-modules 0.4.2, sniffio 1.3.1.
- `backend/.env.example` — appended `GEMINI_API_KEY=` after `ENVIRONMENT=development`.
- `backend/app/config.py` — added `gemini_api_key: str = ""` to `Settings` after `environment`.
- `backend/app/models/recipe.py` — added `promotion_error` (Mapped[str | None], Text nullable) + `promotion_attempts` (Mapped[int], NOT NULL, server_default 0) on `Recipe`, with `# TODO(productize): retry cap` comment per CONTEXT.md "Deferred Ideas".

## Decisions Made

- **google-genai (unified SDK) over the legacy single-API package** — Per `02-RESEARCH.md` §"Gemini SDK Decision", the legacy single-API package was deprecated on 2025-08-31. The unified SDK is the reference path going forward; uses `client.models.generate_content` with `config=types.GenerateContentConfig(response_schema=...)` for structured output.
- **Lazy client singleton via `_gemini()`** — Module import has to stay safe so Alembic / pytest collection don't crash when `GEMINI_API_KEY` is unset. The error surfaces at call time instead. Same pattern as `_supabase()` in `app/services/storage.py`.
- **Pass user input as a separate `contents[]` element (T-02-01-01 mitigation)** — Concatenating transcript / recipe JSON into the prompt string would widen the prompt-injection surface. Keeping inputs as separate elements + the `Literal`-typed `response_schema` constrains escapes to the locked vocabulary by construction.
- **Photo retry surfaces a clear error in v0.1** — Photo bytes are not stored in `source_capture` (only paths). Re-downloading from Supabase Storage to retry is `# TODO(productize)`. Voice retries work because the transcript is stored verbatim.
- **Empty seasonality fallback to all-four-seasons** — `recipes.seasonality` has a NOT NULL server default of `{spring,summer,autumn,winter}`. When Gemini returns an empty list, `_apply_extracted` substitutes the default rather than persisting an empty array, matching the column's intent.
- **`asyncio.run(broadcast_to_household(...))` from sync BackgroundTask** — `BackgroundTasks` runs sync after the response, so we spin up a one-shot event loop. The realtime helper swallows per-socket failures internally (per `app/services/realtime.py`), so this never raises.

## Deviations from Plan

None - plan executed exactly as written.

The two minor reformulations during execution were not deviations:
- The module docstring originally read "...NOT the deprecated `google-generativeai` package", which contained the literal string the acceptance criteria forbids ("File NEVER contains the string `google.generativeai`"). Reworded to "...the legacy single-API package that was deprecated on 2025-08-31" to satisfy the criterion while preserving the intent.
- The `asyncio.run(broadcast_to_household(...))` call was initially split across multiple lines for readability; flattened to a single line so the acceptance criterion's literal grep pattern (`asyncio.run(broadcast_to_household`) matches.

Both adjustments were made before commit and within the same task.

## Issues Encountered

- The worktree's branch base on entry was `40ec76e` rather than the orchestrator-expected `68e7e4f`. The four phase-2 docs commits + the five `02-0X-PLAN.md` files (which the orchestrator generated as untracked files in the main checkout but not in this worktree) had to be brought in. Resolved via `git reset --soft 68e7e4f` to advance HEAD, then `git restore` to materialize the phase-2 docs from HEAD into the worktree, then `cp` of the five untracked plan files from the main checkout into the worktree's `.planning/phases/02-llm-capture-w2/`. The plan files remained untracked throughout (orchestrator's responsibility to commit them).

## User Setup Required

This plan introduces the `GEMINI_API_KEY` env-var requirement (per `<user_setup>` in the plan frontmatter):

- **Service:** Google AI Studio
- **Why:** Gemini 2.5 Flash structured output for voice + photo recipe capture (CAPTURE-01, CAPTURE-02, CAPTURE-05).
- **How:** Sign in at https://aistudio.google.com/apikey with Google → click "Create API key". Set on Railway dashboard for the backend service AND in `backend/.env` for local dev.
- **Verification:** With the key set, `python -c "from app.config import settings; print(bool(settings.gemini_api_key))"` from `backend/` prints `True`.

The orchestrator owns the consolidated `02-USER-SETUP.md` for the wave; this plan's contribution is the `GEMINI_API_KEY` line.

## Next Phase Readiness

- **Plan 02-02 (recipes routes)** can now `from app.services.llm import promote_voice_draft, promote_photo_draft, retry_promotion, apply_voice_modification` and queue them via `BackgroundTasks.add_task(...)`.
- **Migration revision** is `0003`. Railway runs `alembic upgrade head` on every deploy (per CLAUDE.md), so production picks it up automatically when this plan ships.
- **Frontend plans (02-03 / 02-04 / 02-05)** are unblocked on the schema side — the new columns are in the SQLAlchemy model and the migration, so any read endpoint that hydrates a `RecipeResponse` will surface `promotion_error` once Plan 02 includes it in the response shape (planner's call).
- **Realtime contract** — successful promotion broadcasts `recipe.promoted` with the `RecipeResponse`-shaped payload via the existing `broadcast_to_household` helper. The frontend `RealtimeProvider.tsx` (per CONTEXT.md "Reusable Assets") needs the matching event handler in plan 02-05.

## Threat Flags

None — the plan's `<threat_model>` register covers the Phase-2 surface introduced here (T-02-01-01 .. T-02-01-07). All `mitigate` dispositions are implemented in code:

- T-02-01-01 (prompt injection) — user input passed as separate `contents[]` element + `response_schema=GeminiExtractedRecipe` with `Literal` enums.
- T-02-01-02 (info disclosure via error) — `_record_failure` truncates `str(exc)` to 500 chars.
- T-02-01-04 (key leak) — `_gemini()` reads `settings.gemini_api_key` once at client construction; never logged.
- T-02-01-05 (recipe JSON tampering) — `apply_voice_modification` accepts a server-derived `recipe_json` (the router reads from DB filtered by `member.household_id`).
- T-02-01-06 (BackgroundTask spoofing) — task receives only `recipe_id`; auth is checked by the router that queues it.

## Self-Check: PASSED

Verified against acceptance criteria:

- `backend/app/services/llm.py` exists, 454 lines (>200 line minimum).
- `backend/alembic/versions/0003_promotion_columns.py` exists with `revision: str = "0003"` and `down_revision: ... = "0002"`.
- All grep patterns for required code shapes return expected counts:
  - `def extract_from_transcript`: 1
  - `def extract_from_photos`: 1
  - `def apply_voice_modification`: 1
  - `def promote_voice_draft`: 1
  - `def promote_photo_draft`: 1
  - `def retry_promotion`: 1
  - `response_schema=GeminiExtractedRecipe`: 4
  - `asyncio.run(broadcast_to_household`: 1
  - `db = SessionLocal()`: 3
  - `recipe.promotion_error = str(exc)[:500]`: 1
  - `"recipe.promoted"`: 1
  - `TODO(productize)`: 3
  - `from google import genai`: 1
  - `from google.genai import types`: 1
- No file in `backend/app/` or `backend/pyproject.toml` references `google.generativeai` or `google-generativeai` (deprecated SDK).
- `python -c "from app.services import llm; ..."` succeeds (proves syntax + imports + Pydantic schema validity).
- `Recipe.__table__.columns.keys()` includes `promotion_error` and `promotion_attempts`.
- Both task commits exist on the worktree branch:
  - `3780fa6 feat(02-01): add google-genai dep + promotion columns migration`
  - `96c798b feat(02-01): add Gemini service module + BackgroundTask bodies`

---
*Phase: 02-llm-capture-w2*
*Completed: 2026-05-07*
