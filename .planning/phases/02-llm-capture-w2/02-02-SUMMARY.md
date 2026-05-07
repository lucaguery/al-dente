---
phase: "02"
plan: "02"
subsystem: backend-api
tags: [api, capture, fastapi, background-task, gemini, realtime]
requires:
  - 02-01-PLAN  # Gemini service module + promotion columns
provides:
  - "POST /recipes/voice (CAPTURE-01)"
  - "POST /recipes/photo (CAPTURE-02)"
  - "POST /recipes/url (CAPTURE-03 deferred path)"
  - "POST /recipes/{id}/voice-modify (CAPTURE-05)"
  - "POST /recipes/{id}/retry-promotion (D-09)"
affects:
  - frontend/app/inbox/page.tsx  # consumes recipe.created on capture
  - frontend/app/capture/*  # plans 02-04, 02-05 will call these endpoints
tech-stack:
  added: []
  patterns:
    - "FastAPI BackgroundTasks for non-blocking Gemini promotion"
    - "Sync 502 mapping for voice-modify Gemini errors (truncated detail)"
    - "Synchronous recipe.created broadcast on every capture (placeholder card)"
key-files:
  created: []
  modified:
    - backend/app/schemas/recipe.py  # +4 Pydantic schemas
    - backend/app/routers/recipes.py  # +5 endpoints, 2 constants, 5 imports
    - backend/app/services/realtime.py  # docstring event vocabulary update
decisions:
  - "Photos uploaded synchronously, then bytes passed to BackgroundTask (saves re-download on happy path)"
  - "URL endpoint stores raw URL only — no Gemini call (CAPTURE-03 deferred to productize)"
  - "voice-modify returns Gemini shape WITHOUT persisting (user reviews via edit form)"
  - "Retry endpoint optimistically clears promotion_error inline before queuing task"
metrics:
  duration: "~4min"
  completed: "2026-05-07T07:15:25Z"
  tasks_total: 2
  tasks_completed: 2
requirements:
  - CAPTURE-01
  - CAPTURE-02
  - CAPTURE-03
  - CAPTURE-04
  - CAPTURE-05
  - CAPTURE-06
---

# Phase 2 Plan 2: Capture Endpoints + Schemas Summary

**One-liner:** Five new POST endpoints on the recipes router (`/voice`, `/photo`, `/url`, `/{id}/voice-modify`, `/{id}/retry-promotion`) wire the Gemini promotion BackgroundTasks from plan 02-01 into HTTP, with photo upload going through the existing Supabase storage helper and a defensive 18 MB combined-size cap below Gemini's 20 MB inline limit.

## What Was Built

### Task 1 — Pydantic schemas (commit `b3de224`)

Appended four schemas to `backend/app/schemas/recipe.py`. Existing classes were not touched.

| Schema                     | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `VoiceCaptureRequest`      | `transcript: str` (1..10_000) for `/voice`                           |
| `UrlCaptureRequest`        | `url: str` (1..2_000) for `/url`; carries TODO(productize) marker    |
| `VoiceModifyRequest`       | `transcript: str` (1..10_000) for `/voice-modify`                    |
| `PromotionRetryResponse`   | `{recipe_id: UUID, queued: bool}` for `/retry-promotion` 202 ack     |

The voice-modify endpoint deliberately uses `response_model=None` and returns `extracted.model_dump(mode="json")` directly — no wire schema is defined to avoid a cross-module import of `GeminiExtractedRecipe` from `services/llm.py` into the schema layer.

### Task 2 — Router endpoints + realtime docstring (commit `e76bc12`)

#### 1. `POST /recipes/voice`

```bash
curl -X POST https://api.example.com/api/recipes/voice \
  -b "aldente_auth=<cookie>" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "tagliatelles aux champignons, 30 minutes, 2 personnes"}'
```

* Returns 201 with `RecipeResponse` shape, `status="draft"`, `title="(extraction en cours…)"`.
* `source_capture = {"type": "voice", "payload": {"transcript": <body>}}`.
* Broadcasts `recipe.created` synchronously so the partner inbox renders the spinner card.
* Queues `promote_voice_draft(recipe.id, transcript)` via `BackgroundTasks.add_task` — the response returns BEFORE Gemini is called.

#### 2. `POST /recipes/photo`

Multipart form. Field name is **`files`** (plural), 1..4 entries. Per-file cap **8 MiB** (`storage.MAX_BYTES`); combined cap **18 MiB** (`GEMINI_PHOTO_TOTAL_BYTES_CAP`). Both caps enforced **before** any Gemini work. Empty file → 400. Oversize per-file or combined → 413. Unsupported magic-bytes → 415.

```bash
curl -X POST https://api.example.com/api/recipes/photo \
  -b "aldente_auth=<cookie>" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg"
```

* Recipe row created with `source_capture = {"type": "photo", "payload": {"photo_paths": [...], "photo_count": N}}` after upload succeeds.
* `photo_paths` populated in the same DB transaction as the upload.
* `recipe.created` broadcast, then `promote_photo_draft(recipe.id, contents)` queued — bytes (not paths) passed to the task to avoid re-download on the happy path.

#### 3. `POST /recipes/url`

```bash
curl -X POST https://api.example.com/api/recipes/url \
  -b "aldente_auth=<cookie>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/recipe"}'
```

* No Gemini call (CAPTURE-03 deferred — `# TODO(productize)` in docstring + UrlCaptureRequest schema).
* Title = the URL itself (better placeholder than "(extraction…)" since extraction is deferred).
* `source_capture = {"type": "url", "payload": {"url": <stripped>}}`.
* Validates `http://` or `https://` prefix → 422 on missing scheme.
* Broadcasts `recipe.created`. Returns 201 immediately.

#### 4. `POST /recipes/{recipe_id}/voice-modify`

* Synchronous Gemini call via `apply_voice_modification(recipe_json, transcript)`.
* `recipe_json` is the SERVER-derived `_to_response_payload(recipe)` — never client-supplied (T-02-02-07 mitigation).
* Returns the `GeminiExtractedRecipe.model_dump(mode="json")` shape directly. **Does NOT persist.** Frontend uses the result to pre-fill the edit form, then calls existing `PUT /recipes/{id}` to save.
* Cross-household → 404 (consistent with `/{id}` GET/PUT).
* Gemini SDK error → 502 with `detail = f"gemini error: {str(exc)[:200]}"` (200-char truncation, T-02-02-05).

Response shape (sample):

```json
{
  "title": "Tagliatelles aux champignons (avec échalotes)",
  "ingredients": [{"name": "échalotes", "quantity": 2.0, "unit": null}, ...],
  "steps": [...],
  "prep_time_minutes": 30,
  "servings": 2,
  "cuisine": "italian",
  "mood": ["comfort"],
  "main_protein": "none",
  "seasonality": ["autumn", "winter"]
}
```

#### 5. `POST /recipes/{recipe_id}/retry-promotion`

```bash
curl -X POST https://api.example.com/api/recipes/<id>/retry-promotion \
  -b "aldente_auth=<cookie>"
# → 202 {"recipe_id": "<id>", "queued": true}
```

* Clears `recipe.promotion_error = None` inline (so the FE can refetch and see the "extraction en cours…" state immediately).
* Re-broadcasts `recipe.created` (cheapest carrier — FE inbox handles dedupe-prepend).
* Queues `retry_promotion(recipe.id)` which re-reads `source_capture` and dispatches to the appropriate `promote_*` task.

### realtime.py docstring update

Updated the `recipe.promoted` line to reference `services/llm.py BackgroundTask (W2 plan 02-02)` and added a new line documenting `recipe.updated` (already broadcast by 01-08's PUT handler — was undocumented).

## Why `recipe.created` Is Broadcast on Every Capture

This is the **single inbox-arrival event** for plans 02-04 and 02-05 to listen on. Every capture surface (`/voice`, `/photo`, `/url`, plus existing `/quick` and `POST /recipes`) broadcasts `recipe.created` synchronously the moment the draft row is committed. The frontend inbox subscribes to this event once and renders the placeholder card with the spinner badge regardless of capture surface.

A subsequent `recipe.promoted` event (emitted from inside `services/llm.py` on Gemini success) flips that same card from spinner to "structured" — that's the second event the inbox listens for. On Gemini failure, no event fires; the FE relies on a manual refetch (or arrival of a new event) to read `promotion_error` and show the "Échec" badge.

The retry endpoint **also** broadcasts `recipe.created` (not `recipe.updated`) on purpose: it's the same shape (the FE re-renders the same card), and it keeps the FE listener vocabulary minimal.

## Threat Model Mitigations (applied)

| Threat ID    | Mitigation                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| T-02-02-01   | All 5 endpoints use `Depends(current_member)` — cookie+Bearer auth from Phase 01.1 D-03.                           |
| T-02-02-02   | `voice-modify` and `retry-promotion` filter `WHERE id=? AND household_id=member.household_id` then 404 on miss.    |
| T-02-02-03   | `/url` validates scheme prefix only; v0.1 never fetches the URL server-side (SSRF surface = 0).                    |
| T-02-02-04   | `/photo` enforces 18 MB combined cap **before** queuing the BackgroundTask — Gemini cost / DoS guard.              |
| T-02-02-05   | `voice-modify` 502 truncates Gemini error to 200 chars in the response detail.                                     |
| T-02-02-06   | `/photo` calls `storage.upload_recipe_photo` which sniffs magic bytes via `detect_mime_and_ext` (Phase 1 T-01-09-01).|
| T-02-02-07   | `voice-modify` does NOT persist — user re-submits via existing PUT (locked-vocabulary validation re-runs there).   |
| T-02-02-08   | BackgroundTask receives only `recipe_id` (not the member object); the recipe row already belongs to the household.|

## Deviations from Plan

None. Plan executed exactly as written — both tasks landed with the byte-for-byte code blocks specified in `02-02-PLAN.md`. The verification command in Task 2 (`<verify><automated>`) returned `routes ok` with all 5 new paths registered.

## Known Stubs

None. `# TODO(productize)` markers exist on `UrlCaptureRequest` and `create_url` for the deferred URL-fetch path, and on `retry_promotion` (in services/llm.py from plan 02-01) for photo-byte re-download — but these are documented v0.1 deferrals, not silent stubs. The inbox renders the URL itself as the recipe title until the user manually fills the form.

## Self-Check: PASSED

Verified files exist:
- FOUND: backend/app/schemas/recipe.py (9 classes total — 5 existing + 4 new)
- FOUND: backend/app/routers/recipes.py (7 `@router.post` decorators — 2 existing + 5 new)
- FOUND: backend/app/services/realtime.py (docstring updated with recipe.promoted plan 02-02 reference)

Verified commits exist:
- FOUND: b3de224 feat(02-02): add Pydantic schemas for capture surfaces
- FOUND: e76bc12 feat(02-02): wire 5 capture endpoints to recipes router

Verified verification commands:
- `uv run python -m compileall -q app/` → ok
- `uv run python -c "from app.routers.recipes import router; ..."` → all 5 new routes present in `sorted(paths)`
- `uv run python -c "from app.routers.recipes import create_voice, create_photo, create_url, voice_modify, retry_promote"` → imports ok
