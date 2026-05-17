---
status: complete
phase: 25-backend-foundation
source: 25-01-SUMMARY.md, 25-02-SUMMARY.md, 25-03-SUMMARY.md
started: 2026-05-13T12:05:00Z
updated: 2026-05-13T12:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Backend boots without errors after the 7 fix commits. `alembic upgrade head` is a no-op against prod (migration 0009 already shipped). `uv run seed` exits 0 (RecipeTurn ON CONFLICT DO UPDATE). PWA loads. GET /recipes/ returns existing recipes with `initial_turn_kind` populated (backfilled by migration).
result: pass

### 2. Quick capture (text) — happy path
expected: From Accueil, use the quick-capture (single-field title). Submit. Brouillon card appears immediately in Bibliothèque. Within a few seconds the card transitions: the rewritten "catchy title" replaces the user-typed title and status becomes structured. The recipe row carries `initial_turn_kind="text"`.
result: pass

### 3. Voice capture — happy path
expected: From the capture tab, record a short voice memo describing a recipe. Submit. Brouillon card with spinner appears. After Gemini extraction completes, the card shows full structured recipe (title rewritten, ingredients + steps populated). Original transcript is preserved in the recipe's position=0 turn payload.
result: pass

### 4. Photo capture — happy path
expected: From the capture tab, upload a photo of a recipe (handwritten or printed). Submit. Brouillon card with spinner appears. After Gemini extraction completes, the card shows the structured recipe with the photo attached. The BackgroundTask successfully re-downloaded the photo via `download_recipe_photo`.
result: pass

### 5. URL capture — happy path
expected: From the capture tab, paste a recipe URL (any normal-length URL). Submit. Brouillon card appears with the URL as title. Stays in Brouillon (per CAPTURE-03 — URL extraction deferred to Phase 26). The recipe row carries `initial_turn_kind="url"` and the URL is preserved verbatim in the turn payload.
result: pass

### 6. Existing recipes display correctly (backfilled `initial_turn_kind`)
expected: Open Bibliothèque. Pre-Phase-25 recipes show the right UI variant per the migration backfill: legacy "manual" → tappable Brouillon (text), voice → spinner if still draft else tappable, photo → spinner if still draft, url → tappable Brouillon. No recipes render as broken/blank.
result: pass

### 7. WR-01 fix: long URL capture + edit roundtrip
expected: Capture a URL longer than 200 characters (find one with a long query string, or use any long URL). The Brouillon title is truncated to exactly 200 chars (the full URL still lives in the turn payload — invariant #5). Tap the recipe and save it (with or without edits) — no 422 error from the PUT endpoint.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
