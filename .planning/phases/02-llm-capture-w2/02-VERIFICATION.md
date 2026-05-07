---
phase: 02-llm-capture-w2
verified: 2026-05-07T10:00:00Z
status: human_needed
score: 4/5 roadmap success criteria + 6/7 requirements verified (CAPTURE-07 partial — framework only)
overrides_applied: 0
human_verification:
  - test: "Voice capture end-to-end: dictate a French recipe on iPhone, confirm draft appears with spinner in /inbox within 1s, then confirm promotion to 'structured' fires recipe.promoted toast on both phones within ~10s"
    expected: "Draft appears immediately, then both phones show 'Ta recette « X » est prête !' toast; structured fields (title, ingredients, steps, cuisine, mood, protein) visible in recipe detail"
    why_human: "Requires live GEMINI_API_KEY set on Railway backend + two phones connected to WebSocket; can't verify Gemini inference or WS delivery programmatically"
  - test: "Photo capture: select 1-4 photos via the Photo tab on iPhone, tap 'Capturer la recette', confirm draft in /inbox and eventual promotion"
    expected: "Draft appears immediately with spinner; within ~15s promoted to structured with Gemini-extracted fields"
    why_human: "Requires live Gemini multimodal API + real photos"
  - test: "URL paste: paste a valid recipe URL (https://...) in the URL tab, confirm draft appears in /inbox with URL as title and correct source_capture"
    expected: "201 response, draft visible in /inbox, source_capture.type='url', title = pasted URL"
    why_human: "Requires live backend + auth token"
  - test: "Voice modify: on a structured recipe detail page, tap the Mic icon, type a modification instruction ('remplace les oignons par des échalotes'), confirm edit form opens pre-filled with Gemini's modified output"
    expected: "Sheet opens, submit fires postVoiceModify, edit form shows modified ingredients, sessionStorage entry cleared on load"
    why_human: "Requires live Gemini API + visual verification of pre-filled form"
  - test: "Promotion failure + retry: force a Gemini failure (e.g., empty GEMINI_API_KEY on Railway temporarily), capture by voice, confirm 'Échec' badge in /inbox, tap 'Réessayer', confirm row flips to spinner"
    expected: "Failed draft shows destructive Échec badge + Réessayer ghost button; retry queues and row optimistically shows extraction spinner"
    why_human: "Requires engineering the failure condition on Railway"
---

# Phase 2: LLM Capture (W2) Verification Report

**Phase Goal:** Deliver a fully-wired LLM capture pipeline that lets both household members capture recipes via five surfaces (quick, voice/text, photo, URL, manual) with immediate draft feedback and async Gemini-powered promotion to structured status, surfaced in real-time on both phones.
**Verified:** 2026-05-07T10:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Roadmap Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| SC-1 | Voice dictation → draft → Gemini promotion → recipe.promoted WS event on both phones within ~10s | ? HUMAN | Backend pipeline wired (llm.py BackgroundTask, broadcast_to_household); requires live API key + two phones |
| SC-2 | 1-4 photos → Gemini multimodal extraction → user reviews in edit form | ? HUMAN | Photo endpoint wired, promote_photo_draft BackgroundTask present; requires live Gemini API |
| SC-3 | URL paste → draft in "À compléter" inbox with URL in source_capture | ✓ VERIFIED | POST /recipes/url creates draft, source_capture={type:'url',payload:{url}}, no Gemini call |
| SC-4 | "remplace les oignons..." → edit form opens pre-filled with modification | ? HUMAN | VoiceModifySheet → postVoiceModify → sessionStorage bridge → edit page readPrefill() all wired; requires live Gemini |
| SC-5 | Every captured recipe carries raw input in source_capture JSONB | ✓ VERIFIED | voice: transcript, photo: photo_paths+count, url: url, all present in routers/recipes.py |

**Score:** 2/5 fully verified programmatically; 3/5 require human testing; no criteria provably broken.

### Observable Truths (derived from must_haves across all 5 plans)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `backend/app/services/llm.py` exports 6 functions (3 Gemini calls + 3 BackgroundTask bodies) | ✓ VERIFIED | `grep -c "def extract\|def apply\|def promote\|def retry"` = 6 at correct lines |
| 2 | BackgroundTask bodies open own SessionLocal, never raise, broadcast recipe.promoted on success, write promotion_error on failure | ✓ VERIFIED | 3 × `db = SessionLocal()`, `asyncio.run(broadcast_to_household(..., "recipe.promoted", ...))`, `recipe.promotion_error = str(exc)[:500]` |
| 3 | Uses `from google import genai` (NOT deprecated google.generativeai) | ✓ VERIFIED | `from google import genai` at line 46; deprecated string absent from all backend files |
| 4 | 5 new POST endpoints registered on recipes router with Depends(current_member) | ✓ VERIFIED | 7 total `@router.post` (2 existing + 5 new); all 5 new paths verified via uv run python; 14 `Depends(current_member)` usages |
| 5 | Photo endpoint rejects combined payload >18 MB with 413 | ✓ VERIFIED | `GEMINI_PHOTO_TOTAL_BYTES_CAP = 18 * 1024 * 1024` + check before BackgroundTask queue |
| 6 | URL endpoint stores source_capture, NO Gemini call | ✓ VERIFIED | POST /recipes/url: source_capture set, no background_tasks.add_task call, TODO(productize) marker |
| 7 | recipes.promotion_error (TEXT nullable) + recipes.promotion_attempts (INT default 0) in model + migration | ✓ VERIFIED | Both columns in models/recipe.py; Alembic revision 0003 with down_revision 0002 |
| 8 | All Phase 2 i18n namespaces in fr.json; D-08 toast verbatim | ✓ VERIFIED | voice/photo/url/promotion/voice_modify/cooking_log all present; "Ta recette « {title} » est prête !" exact match |
| 9 | lib/recipes.ts exports 5 typed capture helpers; postPhotoCapture uses FormData with field name "files" | ✓ VERIFIED | 10 exports (4 existing + 5 helpers + 1 type); `fd.append("files", f)` confirmed |
| 10 | RealtimeProvider fires promotion toast on recipe.promoted via i18n key | ✓ VERIFIED | `client.onEvent<Recipe>("recipe.promoted", ...)` + `tPromotion("success_toast", {title})` at lines 179-182 |
| 11 | /recipes/new has 5 tabs in locked order (Rapide/Complète/Voix/Photo/URL) | ✓ VERIFIED | 5 TabsTrigger + 5 TabsContent; VoiceCaptureTab/PhotoCaptureTab/UrlCaptureTab imported and mounted |
| 12 | Voice tab is textarea-only — NO Web Speech API anywhere | ✓ VERIFIED | Zero matches for SpeechRecognition/webkitSpeechRecognition/MediaRecorder across all Phase 2 frontend files |
| 13 | RecipeDraftCard renders 3 variants: manual/processing/failed | ✓ VERIFIED | isProcessing + isFailed booleans at lines 32-38; Loader2/RefreshCw render branches present |
| 14 | Réessayer calls postRetryPromotion + optimistically stays in retrying state | ✓ VERIFIED | `postRetryPromotion(recipe.id)` + `setRetrying(true)` without reset on success path |
| 15 | VoiceModifySheet → sessionStorage → edit page prefill (one-shot) | ✓ VERIFIED | `sessionStorage.setItem("voice-modify-prefill", ...)` in VoiceModifySheet.tsx; `sessionStorage.getItem` + immediate `removeItem` in edit/page.tsx |
| 16 | VoiceInput generic wrapper exists with documented prop contract (CAPTURE-07 framework) | ✓ VERIFIED | export function VoiceInput with placeholderKey/ariaLabelKey defaults; 54 lines |
| 17 | Voice capture + promotion broadcasts recipe.created on draft creation | ✓ VERIFIED | `broadcast_to_household(..., "recipe.created", ...)` present in POST /recipes/voice handler |

**Score:** 17/17 truths verified (3 of 5 roadmap SCs require live human test)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `backend/app/services/llm.py` | ✓ VERIFIED | 452 lines (>200 min); 6 functions; google.genai SDK; no deprecated SDK |
| `backend/alembic/versions/0003_promotion_columns.py` | ✓ VERIFIED | revision 0003, down_revision 0002, add_column for both promotion columns |
| `backend/app/models/recipe.py` | ✓ VERIFIED | promotion_error + promotion_attempts mapped columns present |
| `backend/app/routers/recipes.py` | ✓ VERIFIED | 7 POST routes (5 new); BackgroundTask wiring for voice/photo/retry; apply_voice_modification call |
| `backend/app/schemas/recipe.py` | ✓ VERIFIED | VoiceCaptureRequest, UrlCaptureRequest, VoiceModifyRequest, PromotionRetryResponse + promotion_error/attempts on RecipeResponse |
| `frontend/lib/i18n/fr.json` | ✓ VERIFIED | All Phase 2 namespaces; valid JSON; D-08 verbatim string present |
| `frontend/lib/recipes.ts` | ✓ VERIFIED | 10 exports; 5 helpers; FormData uses "files"; credentials: include; GeminiExtractedRecipe type |
| `frontend/components/RealtimeProvider.tsx` | ✓ VERIFIED | recipe.promoted handler; tPromotion("success_toast"); no router.push |
| `frontend/components/VoiceCaptureTab.tsx` | ✓ VERIFIED | 104 lines; postVoiceCapture call; textarea; no Web Speech API |
| `frontend/components/PhotoCaptureTab.tsx` | ✓ VERIFIED | 236 lines; postPhotoCapture call; TOTAL_BYTES_CAP=18MB; URL.revokeObjectURL |
| `frontend/components/UrlCaptureTab.tsx` | ✓ VERIFIED | 105 lines; postUrlCapture call; new URL() validation |
| `frontend/app/recipes/new/page.tsx` | ✓ VERIFIED | 5 tabs in locked order; VoiceCaptureTab/PhotoCaptureTab/UrlCaptureTab mounted |
| `frontend/components/RecipeDraftCard.tsx` | ✓ VERIFIED | 3 variants; isProcessing/isFailed logic; postRetryPromotion; event.preventDefault/stopPropagation |
| `frontend/components/VoiceModifySheet.tsx` | ✓ VERIFIED | 120 lines; postVoiceModify; sessionStorage.setItem; side="bottom"; no Web Speech API |
| `frontend/components/VoiceInput.tsx` | ✓ VERIFIED | 54 lines; placeholderKey/ariaLabelKey props with defaults; no Web Speech API |
| `frontend/app/recipes/[id]/page.tsx` | ✓ VERIFIED | VoiceModifySheet import; voiceModifyOpen state; Mic icon button; trigger_aria label |
| `frontend/app/recipes/[id]/edit/page.tsx` | ✓ VERIFIED | voice-modify-prefill read + removeItem; try/catch on JSON.parse |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backend/app/services/llm.py` | `google.genai.Client` | `_gemini()` + `response_schema=GeminiExtractedRecipe` | ✓ WIRED | 8 usages of `response_schema=GeminiExtractedRecipe` in generate_content calls |
| `backend/app/services/llm.py` | `broadcast_to_household` | `asyncio.run(broadcast_to_household(..., "recipe.promoted", ...))` | ✓ WIRED | Line 322 |
| `backend/app/services/llm.py` | `SessionLocal` | `db = SessionLocal()` in 3 BackgroundTask bodies | ✓ WIRED | Lines 353, 379, 404 |
| `backend/app/routers/recipes.py` | `promote_voice_draft` | `background_tasks.add_task(promote_voice_draft, ...)` | ✓ WIRED | Line 359 |
| `backend/app/routers/recipes.py` | `promote_photo_draft` | `background_tasks.add_task(promote_photo_draft, ...)` | ✓ WIRED | Line 469 |
| `backend/app/routers/recipes.py` | `retry_promotion` | `background_tasks.add_task(retry_promotion, ...)` | ✓ WIRED | Line 601 |
| `backend/app/routers/recipes.py` | `apply_voice_modification` | synchronous call in voice-modify handler | ✓ WIRED | Line 552 |
| `frontend/components/VoiceCaptureTab.tsx` | `/api/recipes/voice` | `postVoiceCapture(trimmed)` from lib/recipes | ✓ WIRED | Line 50 |
| `frontend/components/PhotoCaptureTab.tsx` | `/api/recipes/photo` | `postPhotoCapture(files)` from lib/recipes | ✓ WIRED | Present |
| `frontend/components/UrlCaptureTab.tsx` | `/api/recipes/url` | `postUrlCapture(value.trim())` from lib/recipes | ✓ WIRED | Present |
| `frontend/components/RealtimeProvider.tsx` | `sonner toast` | `client.onEvent("recipe.promoted", ...)` | ✓ WIRED | Lines 179-185 |
| `frontend/components/RecipeDraftCard.tsx` | `/api/recipes/{id}/retry-promotion` | `postRetryPromotion(recipe.id)` | ✓ WIRED | Line 48 |
| `frontend/components/VoiceModifySheet.tsx` | `/api/recipes/{id}/voice-modify` | `postVoiceModify(recipeId, trimmed)` | ✓ WIRED | Line 61 |
| `frontend/components/VoiceModifySheet.tsx` | `sessionStorage` | `sessionStorage.setItem("voice-modify-prefill", ...)` | ✓ WIRED | Line 63 |
| `frontend/app/recipes/[id]/edit/page.tsx` | `sessionStorage` | `sessionStorage.getItem` + immediate `removeItem` | ✓ WIRED | readPrefill() helper |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `llm.py promote_voice_draft` | `extracted` (GeminiExtractedRecipe) | `extract_from_transcript(transcript)` → Gemini API | Yes (live API; lazy client singleton) | ✓ FLOWING |
| `VoiceModifySheet` | `result` (GeminiExtractedRecipe) | `postVoiceModify(recipeId, transcript)` → POST /api/recipes/{id}/voice-modify | Yes (synchronous Gemini call on backend) | ✓ FLOWING |
| `RecipeDraftCard` | `recipe.promotion_error` | Backend RecipeResponse wire (promotion_error: Optional[str] on schema) | Yes (DB column, returned on every recipe GET) | ✓ FLOWING |
| `edit/page.tsx` form prefill | `prefill` (GeminiExtractedRecipe) | `sessionStorage.getItem("voice-modify-prefill")` → VoiceModifySheet producer | Yes (one-shot sessionStorage; JSON.parse guarded) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| llm module imports cleanly | `uv run python3 -c "from app.services import llm; print('ok')"` | ok (after uv sync) | ✓ PASS |
| GeminiExtractedRecipe fields correct | `uv run python3 -c "from app.services.llm import GeminiExtractedRecipe; print(list(...))"` | `['title', 'ingredients', 'steps', 'prep_time_minutes', 'servings', 'cuisine', 'mood', 'main_protein', 'seasonality']` | ✓ PASS |
| All 5 new routes registered | `uv run python3 -c "from app.routers.recipes import router; ..."` | `/recipes/voice`, `/recipes/photo`, `/recipes/url`, `/{recipe_id}/voice-modify`, `/{recipe_id}/retry-promotion` | ✓ PASS |
| Pydantic schemas import | `uv run python3 -c "from app.schemas.recipe import VoiceCaptureRequest, ..."` | schemas ok | ✓ PASS |
| TypeScript compiles | `npx tsc --noEmit` | 0 errors | ✓ PASS |
| fr.json valid JSON with all namespaces | `python3 -c "import json; d=json.load(open('lib/i18n/fr.json'))"` | All 12 top-level keys present | ✓ PASS |

### Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| CAPTURE-01 | 02-02, 02-04 | Voice capture → draft → Gemini BackgroundTask promotion | ✓ SATISFIED | POST /recipes/voice endpoint; promote_voice_draft BackgroundTask; VoiceCaptureTab using postVoiceCapture |
| CAPTURE-02 | 02-02, 02-04 | Photo capture → 1-4 files multipart → Gemini multimodal | ✓ SATISFIED | POST /recipes/photo with 18MB cap; promote_photo_draft; PhotoCaptureTab using postPhotoCapture |
| CAPTURE-03 | 02-02, 02-04 | URL paste → draft; no Gemini in v0.1 | ✓ SATISFIED | POST /recipes/url stores source_capture; UrlCaptureTab; TODO(productize) for extraction |
| CAPTURE-04 | 02-02, 02-03 | recipe.promoted WS event when draft promoted | ✓ SATISFIED | broadcast_to_household(..., "recipe.promoted", ...); RealtimeProvider toast handler |
| CAPTURE-05 | 02-02, 02-05 | Voice modification of existing recipe via form prefill | ✓ SATISFIED | POST /recipes/{id}/voice-modify; VoiceModifySheet; sessionStorage bridge; edit page prefill |
| CAPTURE-06 | 02-01, 02-02 | Raw inputs in source_capture JSONB forever | ✓ SATISFIED | voice: {type:'voice',payload:{transcript}}; photo: {type:'photo',payload:{photo_paths}}; url: {type:'url',payload:{url}} |
| CAPTURE-07 | 02-05 | Voice notes on cooking-log screen | PARTIAL — framework only | VoiceInput wrapper (textarea-based) exists; cooking-log screen doesn't exist yet (Phase 3/4 scope); actual mounting deferred to Phase 4 |

**Note on CAPTURE-07:** REQUIREMENTS.md maps CAPTURE-07 to Phase 2 with description "Web Speech API directly into notes field." Phase 2's critical design decision abandoned Web Speech API (broken in iOS PWA standalone mode). VoiceInput ships as a textarea-based framework component; Phase 4 SC-1 and COOK-04 cover wiring it into the cooking-log screen. This is a planned deferral, not an accidental gap.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `backend/app/services/llm.py` | `TODO(productize)` on photo retry (3 occurrences) | ℹ️ Info | Photo retry (v0.1 limitation: bytes not re-downloadable) — documented deferral, not a blocker |
| `backend/app/routers/recipes.py` | `TODO(productize)` on URL extraction | ℹ️ Info | URL fetch+extraction deferred per CAPTURE-03 spec — documented, not a blocker |
| `frontend/components/VoiceInput.tsx` | Framework-only — not mounted in Phase 2 | ℹ️ Info | Intentional; Phase 4 wires into cooking-log; contract exported and locked |

No blockers or warnings found. All TODOs are appropriately marked `TODO(productize)`.

### Human Verification Required

#### 1. Voice Capture End-to-End (SC-1)

**Test:** On iPhone Safari (PWA or browser), navigate to /recipes/new → Voix tab. Type a French recipe description (e.g., "tagliatelles aux champignons, 30 minutes, 2 personnes, cuisine italienne"). Tap Envoyer. Watch /inbox.
**Expected:** Draft appears within ~1s with "Extraction en cours…" spinner. Within ~10s, both connected phones see "Ta recette « Tagliatelles aux champignons » est prête !" toast. Recipe detail shows Gemini-extracted title, ingredients, steps, cuisine, mood, main_protein, seasonality.
**Why human:** Requires live GEMINI_API_KEY on Railway + two phones on the same household WebSocket channel; Gemini inference cannot be mocked programmatically.

#### 2. Photo Capture End-to-End (SC-2)

**Test:** On iPhone, /recipes/new → Photo tab. Select 1-2 photos of a recipe card. Tap "Capturer la recette". Watch /inbox.
**Expected:** Draft appears immediately with spinner. ~15s later, recipe promoted with Gemini-extracted structured fields. Navigating to the recipe shows the extracted ingredients and steps.
**Why human:** Requires real photos + live Gemini multimodal API.

#### 3. Voice Modify End-to-End (SC-4)

**Test:** Open a structured recipe detail page. Tap the Mic icon (top-right, left of pencil). Type "remplace les oignons par des échalotes". Tap "Envoyer la modification".
**Expected:** Bottom sheet closes, /recipes/{id}/edit opens with the ingredient list pre-filled with Gemini's modification (échalotes instead of oignons). Refreshing the edit page does NOT re-apply the prefill.
**Why human:** Requires live Gemini API + visual verification of pre-filled edit form.

#### 4. Promotion Failure + Retry (RecipeDraftCard failed variant)

**Test:** Temporarily remove GEMINI_API_KEY from Railway env. Capture by voice. After 10-15s, the inbox row should show "Échec" badge + "Réessayer" button. Restore the key. Tap "Réessayer".
**Expected:** Row flips immediately to "Extraction en cours…" spinner. After Gemini succeeds, recipe promotes and both phones see the success toast.
**Why human:** Requires engineering a Gemini failure on Railway + visual inspection of all three RecipeDraftCard variants.

#### 5. Tab Order Visual Check

**Test:** Open /recipes/new on both iPhone and desktop Chrome.
**Expected:** 5 tabs in exact order: Rapide | Complète | Voix | Photo | URL. On iPhone SE (375pt), tabs are horizontally scrollable without clipping.
**Why human:** Visual/responsive layout cannot be verified by tsc/grep.

### Gaps Summary

No blocking gaps. All code artifacts exist, are substantive, and are wired. The automated verification confirms all backend routes, BackgroundTask bodies, frontend components, and API wiring are in place.

**CAPTURE-07 partial delivery** is the only notable item: the `VoiceInput` textarea wrapper ships in Phase 2 as the framework, but the cooking-log finalization screen (where it will be mounted) is Phase 4 scope (COOK-03, COOK-04, Phase 4 SC-1). This is a planned, documented deferral — not a gap.

Status is `human_needed` because 3 of the 5 roadmap success criteria require live Gemini API calls and WebSocket delivery on real devices to verify.

---

_Verified: 2026-05-07T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
