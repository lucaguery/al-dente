---
phase: 27-conversational-capture-screen
verified: 2026-05-13T21:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open /recipes/new in the deployed PWA on an iPhone. Type a note in the composer textarea and tap the send (ArrowUp) button. Verify the text bubble appears in the chat. Tap « Enregistrer ». Observe network traffic."
    expected: "Exactly: 1x POST /api/recipes (body {}), 1x POST /api/recipes/{id}/turns (kind=text), 1x POST /api/recipes/{id}/promote — then router.replace to /recipes/{id}. The text bubble is visible on the detail page as the first user turn."
    why_human: "The 2-tap UAT (CAPTURE-01 SC-1) cannot be confirmed without a running browser — tap sequence, network order, and landing page content all require a live session. The code wires this correctly but end-to-end timing must be human-confirmed."
  - test: "After tapping « Enregistrer » and landing on /recipes/{id}, wait up to 10 seconds. Open a second browser tab on the same household."
    expected: "SC-4: The post-LLM summary/question turns append inline within ~2s of promote_draft completing. Both tabs show the same turn list. The extraction-in-progress row disappears once recipe.status flips to 'structured'."
    why_human: "promote_draft is an async BackgroundTask (Gemini + DB writes). The turn.created WebSocket delivery to the second tab requires two connected clients and a live deployment. Cannot be verified without a running stack."
  - test: "Navigate to /recipes/new with pending bubbles (e.g. type a note). Tap the back arrow (ChevronLeft). Observe the dialog."
    expected: "A native window.confirm() dialog appears with the discard_confirm message. Confirming navigates back; cancelling stays on the page."
    why_human: "window.confirm() behavior requires a real browser session; cannot be exercised via grep or static analysis."
---

# Phase 27: Conversational Capture Screen Verification Report

**Phase Goal:** `/recipes/new` is one screen — title above, scrollable thread in the middle, multi-input composer (text / voice / photo / url) at the bottom — and the « Enregistrer » button is always reachable above the composer once there's a title or any pending bubble. The shared chat component is ready for Phase 28 to mount on the recipe-detail page.

**Verified:** 2026-05-13T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | User can capture a recipe in 2 taps — enter a title, type one text bubble, tap « Enregistrer » — and land on `/recipes/[id]` with the bubble preserved as the first user turn | ✓ VERIFIED (code) / ? HUMAN (runtime) | `frontend/app/recipes/new/page.tsx` wires the full 4-step save flow (createBlankRecipe → for-each-turn POST → promoteDraft → router.replace). The text bubble path is confirmed. End-to-end 2-tap UAT requires human. |
| SC-2 | Composer offers four input methods (text / voice / photo / url) without tabs — text is keyboard-driven; voice / url / photo open dedicated sheets — pending bubbles accumulate locally until « Enregistrer » fires | ✓ VERIFIED | `Composer.tsx` wires `[+]`→PhotoMenu (camera/library/URL), mic button→VoiceSheet, send button→text bubble. No Tabs/TabsTrigger found in the page. `pendingBubbles` state accumulates in `Inner()` until `onSave` fires. |
| SC-3 | « Enregistrer » sends buffered turns as `POST /api/recipes` (empty body) + `POST /api/recipes/{id}/turns` × N + `POST /api/recipes/{id}/promote`, and user lands on `/recipes/[id]` | ✓ VERIFIED | `onSave()` in `page.tsx:130-184` executes exactly: `createBlankRecipe()` → `for...of pendingBubbles` sequential POSTs → `promoteDraft(recipe.id)` → `router.replace(/recipes/${recipe.id})`. Confirmed by reading the wired code. Backend routes verified: `POST /recipes` (create_blank), `POST /recipes/{id}/turns`, `POST /recipes/{id}/promote` (promote_recipe) — all present, legacy `/quick`, `/voice`, `/photo`, `/url` standalone routes confirmed absent. |
| SC-4 | After save, user lands on /recipes/[id], conversation continues there, post-LLM summary + question turns append inline within ~2s | ✓ VERIFIED (code) / ? HUMAN (runtime) | `frontend/app/recipes/[id]/page.tsx` mounts `<RecipeThread mode="detail" />` below the form, fetches turns on mount via `GET /api/recipes/${id}/turns`, subscribes to `turn.created` (append+dedup by id, sort by position) and `turn.updated` (in-place replace per D-29). BackgroundTask scheduling is Phase 29's concern for actually emitting summary/question turns; Phase 27 ships the consumer side. Live 2-phone WS round-trip requires human. |

**Score:** 4/4 success criteria verified in code (3/4 require human confirmation for runtime behavior)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/app/recipes/new/page.tsx` | Conversational capture page with save-flow choreography | ✓ VERIFIED | 233 lines; mounts `<RecipeThread mode="capture" />`; `createBlankRecipe` + `promoteDraft` both imported and called; `for...of pendingBubbles` sequential POSTs; `router.replace` after promote |
| `frontend/components/RecipeThread/index.tsx` | Orchestrator with capture/detail mode discriminated union | ✓ VERIFIED | 351 lines; `"use client"`; `role="log"` + `aria-live="polite"` on chat-body; `useTranslations("recipes.thread")`; save-bar shown when `pendingBubbles.length >= 1`; `AnimatePresence` wraps bubble list |
| `frontend/components/RecipeThread/types.ts` | PendingBubble, PersistedTurn, RecipeThreadProps, ComposerProps | ✓ VERIFIED | All 4 types exported; discriminated union on `mode`; `PendingBubble` union for text/voice/photo/url |
| `frontend/components/RecipeThread/Bubble.tsx` | User bubble renderer with pending X dismiss | ✓ VERIFIED | `USER_BUBBLE_RADIUS = "rounded-[18px_18px_4px_18px]"`; `onDismiss` prop on pending variant |
| `frontend/components/RecipeThread/SystemBubble.tsx` | System bubble renderer with visual stubs | ✓ VERIFIED | `SYS_BUBBLE_RADIUS = "rounded-[18px_18px_18px_4px]"`; Phase 28 comments on all stub buttons; `onClick` comments present but NO live `onClick=` on chip/CTA elements |
| `frontend/components/RecipeThread/Composer.tsx` | 3-slot composer with D-04 morph | ✓ VERIFIED | Imports `Mic`, `ArrowUp`; `voiceOpen`, `photoMenuOpen`, `urlOpen` states; `AnimatePresence` for icon morph |
| `frontend/components/RecipeThread/VoiceSheet.tsx` | D-Voice textarea sheet | ✓ VERIFIED | Comment: "NOT MediaRecorder"; `paper-grain` card; `min-h-32 max-h-64` textarea |
| `frontend/components/RecipeThread/UrlSheet.tsx` | URL input with new URL() validation | ✓ VERIFIED | `new URL(trimmed)`; `p.protocol === "http:"` check |
| `frontend/components/RecipeThread/PhotoMenu.tsx` | Camera/library/URL bottom-sheet menu | ✓ VERIFIED | `capture="environment"` on camera input; hidden file inputs |
| `frontend/lib/i18n/fr.json` | `recipes.thread.*` namespace with all Copywriting Contract keys | ✓ VERIFIED | All 18 spot-checked keys present: `composer_placeholder_capture`, `save_cta`, `extracting`, `plus_menu_title`, `voice_sheet_title`, `url_sheet_title`, `sys_summary_head`, `sys_advisory_head`, `empty_capture_hint`, `manual_edit_link`, `turn_failed`, `state_structured`, `state_draft`, `discard_confirm`, `bubble_count`, `voice_add`, `url_add`, `photo_cap_exceeded` |
| `backend/app/schemas/recipe.py` | `RecipeBlankCreate` schema (strict `{}`); legacy schemas deleted | ✓ VERIFIED | `class RecipeBlankCreate(BaseModel): pass` at line 65; `RecipeBlankCreate().model_dump()` returns `{}`; `RecipeFullCreate`, `RecipeQuickCreate`, `VoiceCaptureRequest`, `UrlCaptureRequest` absent |
| `backend/app/routers/recipes.py` | `create_blank` + `promote_recipe`; legacy handlers absent | ✓ VERIFIED | `create_blank` at line 192; `promote_recipe` at line 488; route `/recipes/{recipe_id}/promote` confirmed; `GET /recipes` route list shows no `/quick`, `/voice`, `/photo`, `/url` standalone POST paths |
| `frontend/lib/recipes.ts` | `createBlankRecipe` + `promoteDraft`; legacy helpers absent | ✓ VERIFIED | `createBlankRecipe` exported at line 154; `promoteDraft` exported at line 165; zero matches for `postVoiceCapture`, `postPhotoCapture`, `postUrlCapture` |
| `frontend/components/BottomNav.tsx` | 3-tab nav (Home/Recipes/Settings); no draftCount/inbox | ✓ VERIFIED | Exactly 3 TABS entries; zero matches for `Inbox`, `draftCount`, `useRealtime`, `useState`, `useEffect`, `/inbox` |
| `frontend/components/RecipeCard.tsx` | « Échec » pill for `status='failed'` | ✓ VERIFIED | `AlertCircle` imported; `recipe.status === "failed"` conditional; `color-mix(in oklch, var(--destructive)...)` styles; `absolute top-2 right-2` positioning |
| `frontend/app/recipes/[id]/page.tsx` | Detail page with RecipeThread + WS subscriptions | ✓ VERIFIED | `import RecipeThread` at line 46; `<RecipeThread mode="detail" ...>` at line 510; `turn.created` + `turn.updated` subscriptions wired via `realtime.onEvent`; `formRef` + `scrollIntoView` for manual-edit link |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `frontend/app/recipes/new/page.tsx` | `frontend/components/RecipeThread/index.tsx` | `import RecipeThread from "@/components/RecipeThread"` | ✓ WIRED | Line 33; `<RecipeThread mode="capture" ...>` at line 221 with all required props |
| `frontend/app/recipes/new/page.tsx` | `POST /api/recipes (empty body)` + `POST /api/recipes/{id}/turns` + `POST /api/recipes/{id}/promote` | `createBlankRecipe` + `api()` + `promoteDraft` from `lib/recipes.ts` | ✓ WIRED | Lines 135, 141-171, 175 — correct 4-step save flow |
| `frontend/app/recipes/[id]/page.tsx` | `frontend/components/RecipeThread/index.tsx` (mode='detail') | `import RecipeThread from "@/components/RecipeThread"` | ✓ WIRED | Line 46; `<RecipeThread mode="detail" ...>` at line 510 with all 5 callbacks + turns/title/recipeStatus props |
| `frontend/app/recipes/[id]/page.tsx` | `GET /api/recipes/{id}/turns` + `turn.created` + `turn.updated` WS events | `api<PersistedTurn[]>()` initial fetch + `realtime.onEvent()` subscriptions | ✓ WIRED | Lines 144, 185, 195 — all three data paths confirmed |
| `backend/app/routers/recipes.py` (`promote_recipe`) | `backend/app/services/llm.py` (`promote_draft`) | `background_tasks.add_task(promote_draft, recipe_id)` | ✓ WIRED | Confirmed importable; `promote_recipe` validates household + position=0 user turn before scheduling |
| `frontend/components/RecipeThread/Composer.tsx` | `VoiceSheet`, `UrlSheet`, `PhotoMenu` | Named imports + state-driven `open` props | ✓ WIRED | `voiceOpen`, `photoMenuOpen`, `urlOpen` states wired to sheet `open` props |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `/recipes/new/page.tsx` | `pendingBubbles` | Local state; populated by `addPendingBubble` callbacks from Composer | Yes — user-driven; no empty array rendered | ✓ FLOWING |
| `/recipes/new/page.tsx` save flow | `recipe.id` | `createBlankRecipe()` → `POST /api/recipes` → backend `create_blank` DB insert | Yes — `db.add(recipe); db.commit(); db.refresh(recipe)` in backend | ✓ FLOWING |
| `/recipes/[id]/page.tsx` | `turns: PersistedTurn[]` | `GET /api/recipes/${id}/turns` + `turn.created` WS | Yes — `list_turns` queries DB `ORDER BY position ASC`; WS appends from Phase 26 broadcast | ✓ FLOWING |
| `RecipeThread/index.tsx` (detail) | `turns` rendered in `<ol>` | Props from parent; WS dedup+sort | Yes — rendered when non-empty; empty-state hint shown otherwise | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `RecipeBlankCreate` schema is strict `{}` | `cd backend && uv run python -c "from app.schemas.recipe import RecipeBlankCreate; print(RecipeBlankCreate().model_dump())"` | `{}` | ✓ PASS |
| All required handlers importable | `cd backend && uv run python -c "from app.routers.recipes import create_blank, promote_recipe, create_turn, create_turn_photo, list_turns; print('ok')"` | `ok` | ✓ PASS |
| No legacy capture routes (`/quick`, `/voice`, `/photo`, `/url`) in app routes | FastAPI route inspection | `/recipes/{recipe_id}/promote:POST`, `/recipes/{recipe_id}/turns:POST`, `/recipes/{recipe_id}/turns/photo:POST`, `/recipes/{recipe_id}/turns:GET`, `/recipes:POST`, `/recipes:GET` only — no legacy paths | ✓ PASS |
| All i18n keys present (`recipes.thread.*`) | Node.js JSON parse + key lookup | 18 spot-checked keys all present | ✓ PASS |
| All 8 RecipeThread sub-files exist | `test -f` checks | All 8 confirmed | ✓ PASS |
| No MediaRecorder in RecipeThread | `grep -rn "MediaRecorder\|getUserMedia" frontend/components/RecipeThread/` | Only a comment in VoiceSheet.tsx ("NOT MediaRecorder") | ✓ PASS |
| BottomNav has exactly 3 tabs | `grep -c "{ href:" frontend/components/BottomNav.tsx` | 3 | ✓ PASS |
| TypeScript — no new errors from Phase 27 | `cd frontend && npx tsc --noEmit` | 17 errors all in `lib/recipe-completeness.test.ts` — pre-existing `readonly` errors from Phase 25 (last touched before Phase 27). Zero errors in Phase 27 files. | ✓ PASS (pre-existing errors exempted per acceptance rules) |
| Legacy helpers deleted from `lib/recipes.ts` | `grep -n "postVoiceCapture\|postPhotoCapture\|postUrlCapture" frontend/lib/recipes.ts` | 0 matches | ✓ PASS |
| 5 legacy capture component files deleted | `test ! -f` checks | VoiceCaptureTab, PhotoCaptureTab, UrlCaptureTab, RecipeDraftCard, inbox/page.tsx all absent | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAPTURE-01 | Plans 27-02, 27-03 | `/recipes/new` renders single conversational composer; « Enregistrer » always visible above composer once ≥1 pending bubble | ✓ SATISFIED | `RecipeThread` save-bar renders when `pendingBubbles.length >= 1`; Composer renders text/voice/photo/url inputs; no tabs |
| CAPTURE-02 | Plans 27-02, 27-03 | Five tabbed capture surfaces removed; `grep` for deleted component names returns zero matches in executable code | ✓ SATISFIED | VoiceCaptureTab, PhotoCaptureTab, UrlCaptureTab, RecipeDraftCard, inbox/page.tsx all deleted; grep confirms zero executable references (comment-only references in RecipeThread sub-files explicitly reference "deleted" for historical context) |
| CAPTURE-03 | Plans 27-01, 27-03 | « Enregistrer » creates draft + persists each bubble as initial user turn in entry order + schedules BackgroundTask once | ✓ SATISFIED | `onSave()` executes: `createBlankRecipe()` → sequential `for...of pendingBubbles` → `promoteDraft()`; backend `promote_recipe` validates and schedules `promote_draft` exactly once |
| CAPTURE-04 | Plans 27-02, 27-05 | After save, user lands on `/recipes/[id]`; conversation continues there; shared chat component used for both mount points | ✓ SATISFIED | `RecipeThread` exported from `frontend/components/RecipeThread/`; mounted in `mode="capture"` on `/recipes/new` and `mode="detail"` on `/recipes/[id]`; `turn.created` + `turn.updated` subscriptions wire realtime appends on the detail page |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/components/RecipeThread/SystemBubble.tsx` | L74-83, L101-151, L182-188 | Stub buttons for question chips / stepper / advisory CTAs (no `onClick`) | INFO | Intentional Phase 27 stubs per CONTEXT.md D-14 and SUMMARY 27-02. Phase 28 wires handlers. Not user-visible as broken — renders correctly, just non-interactive. |
| `frontend/app/recipes/new/page.tsx` | L53-55 | `// TODO(productize)` — pending bubbles are ephemeral in React state | INFO | Explicitly deferred per UI-SPEC Claude's Discretion (pre-save persistence = no for v0.6). Correct behavior, not a regression. |
| `frontend/lib/recipe-completeness.test.ts` | L62-174 | 17 TypeScript `readonly` TS2345 errors + 1 TS5097 extension error | INFO | Pre-existing errors; last touched in Phase 25 before Phase 27 started. Per acceptance grading rules, not a Phase 27 regression. |

No blocker or warning-level anti-patterns found. All identified anti-patterns are intentional stubs or pre-existing issues.

---

### Human Verification Required

#### 1. Two-Tap Capture UAT (SC-1 full confirmation)

**Test:** Open `/recipes/new` in the deployed PWA on iPhone. Type one note in the composer textarea. Observe the bubble appears in the chat body. Tap « Enregistrer ».

**Expected:** Network inspector shows: `POST /api/recipes {}` (201), `POST /api/recipes/{id}/turns {"kind":"text","text":"..."}` (201), `POST /api/recipes/{id}/promote {}` (202) — in that order. Browser navigates to `/recipes/{id}`. The detail page shows the user's bubble as the first turn.

**Why human:** Save-flow sequential POST ordering and navigation timing require a running browser session. The code wires all steps correctly but the runtime order and navigation success cannot be verified statically.

#### 2. Realtime Turn Append After Promotion (SC-4 full confirmation)

**Test:** After landing on `/recipes/{id}` post-save, open a second tab on the same household. Wait for `promote_draft` to complete (≤30s typically — BackgroundTask runs Gemini). Observe both tabs.

**Expected:** The extraction-in-progress row disappears when `recipe.status` flips to `structured` (via `recipe.updated` WS event). In Phase 29, summary/question turns will append via `turn.created`. In Phase 27, the thread shows the user's bubble only (Phase 29 has not yet emitted system turns). Both tabs should show identical turn lists.

**Why human:** BackgroundTask execution timing, WebSocket delivery to a second connected client, and the DOM CustomEvent bridge routing (RealtimeProvider → RecipeThread) cannot be verified without two live browser sessions connected to the deployed app.

#### 3. Back-Arrow Discard Guard (UX confirmation)

**Test:** Type ≥1 note in `/recipes/new`. Tap the back arrow (ChevronLeft in the sticky header).

**Expected:** `window.confirm()` dialog appears with « Abandonner cette recette ? Les notes non enregistrées seront perdues. ». Confirming navigates back and clears pending state. Cancelling stays on the page.

**Why human:** `window.confirm()` requires an interactive browser session; its rendering and behavior cannot be verified via grep or static analysis.

---

### Gaps Summary

No gaps found. All 4 CAPTURE requirements (CAPTURE-01 through CAPTURE-04) are satisfied in code. Three items require human verification against the live deployed stack — these are inherent runtime/browser behaviors (2-tap timing, WebSocket multi-client delivery, native dialog interaction) that cannot be confirmed programmatically.

The `recipe-completeness.test.ts` TypeScript errors are pre-existing (Phase 25 origin, exempted by acceptance grading rules) and have zero impact on Phase 27 functionality.

SystemBubble visual stubs (question chips, advisory CTAs) are intentional per CONTEXT.md D-14 — Phase 28 wires the handlers to the existing JSX structure without restructuring.

---

_Verified: 2026-05-13T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
