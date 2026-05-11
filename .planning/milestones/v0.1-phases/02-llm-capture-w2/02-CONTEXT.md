# Phase 2: LLM Capture (W2) — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers **LLM-assisted recipe capture** via three new surfaces: voice transcript (Web Speech API → Gemini 2.5 Flash), photo multimodal (≤4 photos → Gemini), and URL paste (draft only — extraction is productize-later). It also delivers voice modification of existing recipes and the `recipe.promoted` WebSocket broadcast.

Concretely:
1. **`/recipes/new` grows to 5 tabs:** Rapide / Complète / Voix / Photo / URL
2. **Backend**: `POST /recipes/voice`, `POST /recipes/photo`, `POST /recipes/url`, `POST /recipes/{id}/voice-modify` endpoints; `services/llm.py` (Gemini 2.5 Flash); BackgroundTask promotion flow; `recipe.promoted` WebSocket broadcast
3. **Frontend**: Voice tab with live transcript UI + review step; Photo tab for recipe-from-photo capture; URL tab with extraction-later notice; spinner state in drafts inbox; error badge + retry in inbox; toast on promotion
4. **CAPTURE-07**: Web Speech API directly into the cooking-log notes field — no backend special-casing needed; falls under this phase's frontend scope

**Not in this phase:** shortlist algorithm, voting, cooking-log creation/finalization (W3), album (W4), URL Gemini extraction (productize-later per CAPTURE-03).

</domain>

<decisions>
## Implementation Decisions

### Capture entry point

- **D-01:** `/recipes/new` extends from 2 tabs to **5 tabs**: Rapide | Complète | Voix | Photo | URL. All capture modes live on a single page — one mental model for adding recipes, different input methods per tab.

- **D-02:** The **Quick (Rapide) tab keeps its optional photo input** unchanged. Quick-tab photo = attach a photo without Gemini extraction (same as Phase 1). Photo tab = photo IS the recipe source, Gemini extracts it. Different intent, same component (`PhotoUploader`) reused differently.

- **D-03:** The **URL tab shows a helper notice** informing the user that extraction is coming later: _"L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception."_ The tab has a text input and a submit button; submission creates a draft immediately with the URL in `source_capture`. No extraction in v0.1.

### Voice recording UX

- **D-04:** Voice recording uses **tap-to-start, tap-to-stop** interaction. First tap starts `SpeechRecognition`, second tap stops it and enters the review step. No hold-to-record.

- **D-05:** While recording, the UI shows a **live rolling transcript** — interim results from the Web Speech API are displayed as the user speaks (interim results in grey, final results in solid text). This requires `interimResults: true` on the SpeechRecognition config.

- **D-06:** After tapping stop, the user sees their **transcript in a scrollable read-only box** with two buttons: "Envoyer" (submits to `POST /recipes/voice`) and "Recommencer" (clears transcript, returns to idle state). This review step prevents a garbled transcript from reaching Gemini.

### Promotion feedback

- **D-07:** A draft that is being promoted by Gemini (status = `draft`, `promotion_error` is null, created via voice/photo endpoint) shows in the drafts inbox with a **small spinner and "Extraction en cours…" label** in place of the normal action buttons. The existing `RecipeDraftCard` component is extended to handle this state.

- **D-08:** When `recipe.promoted` fires over WebSocket, the frontend shows a **Sonner toast**: _"Ta recette « [titre] » est prête !"_. The draft card disappears from the inbox and the recipe appears in the main recipe list. Both phones receive the toast (it's a household broadcast). Navigation is not forced — the user stays on the current page but sees the list update live.

### Gemini failure handling

- **D-09:** When a BackgroundTask fails (Gemini API error, timeout, parsing failure), the backend writes the error message to a new **`promotion_error TEXT`** field on the recipe row (no new status value needed — the recipe stays `draft`). The drafts inbox reads this field and shows a **red "Échec" badge + "Réessayer" button** on the card. Tapping retry sends `POST /recipes/{id}/retry-promotion` (or re-calls the original BackgroundTask path — planner decides) and the card returns to spinner state. A `promotion_attempts INT` column (default 0) tracks how many times promotion has been attempted, for observability.

### Voice modification UX

- **D-10:** The voice-modify trigger is a **mic icon in the recipe detail page header**. Tapping it opens the same voice recording sheet (tap-to-start/stop, live transcript, review step). On "Envoyer", the transcript is sent to `POST /recipes/{id}/voice-modify` alongside the current recipe fields. Gemini returns the modified recipe; the frontend navigates to the edit form pre-filled with the new values.

- **D-11:** The edit form opened after voice-modify shows **no visual diff** — fields are simply pre-filled with Gemini's output. User reviews by scrolling as normal. SPEC.md option A specifies "edit form opens pre-filled for review" without a diff requirement; the diff is productize-later.

### Claude's Discretion

The following implementation details are not user-facing decisions — planner and executor should decide without re-asking:

- **Gemini structured output schema:** Extract all recipe fields present in the `recipes` table: `title`, `ingredients` (as JSONB array), `steps` (as JSONB array), `prep_time_minutes`, `servings`, `cuisine` (constrained to enum), `mood` (array), `main_protein` (constrained to enum), `seasonality` (array). Fields Gemini cannot extract should be `null` — do not invent values. Promotion succeeds if at least `title` is extractable.
- **Web Speech API language:** `lang: "fr-FR"` on the SpeechRecognition config.
- **Photo capture for recipe creation:** Same 1–4 photo limit and same multipart upload pattern as Phase 1's photo attach flow. Reuse `PhotoUploader.tsx` on the Photo tab. Backend `POST /recipes/photo` accepts multipart with 1–4 images.
- **BackgroundTask error handling:** `try/except` around the Gemini call in the background function. On exception: write `promotion_error = str(e)`, increment `promotion_attempts`. On success: set `status = 'structured'`, clear `promotion_error`, broadcast `recipe.promoted`.
- **`POST /recipes/url` shape:** `{ url: str }` body. Creates draft with `source_capture = { type: 'url', payload: { url } }`. No LLM call.
- **`POST /recipes/voice` shape:** `{ transcript: str }` body. Creates draft, starts BackgroundTask.
- **`POST /recipes/{id}/retry-promotion` endpoint:** Re-reads `source_capture` to get the original transcript/photo paths, re-runs the BackgroundTask. Resets `promotion_error = null` before re-queuing.
- **CORS / auth:** All new endpoints follow existing `Depends(current_member)` cookie auth pattern (Phase 01.1 D-03).
- **Alembic migration:** Add `promotion_error TEXT` and `promotion_attempts INTEGER NOT NULL DEFAULT 0` columns to the `recipes` table.
- **CAPTURE-07 (voice notes on cooking log):** Web Speech API dictation directly into the cooking-log notes text field. No new component needed — a mic icon button on the notes field calls `SpeechRecognition.start()` and appends interim/final results to the field value. The cooking-log finalization screen is Phase 4, but the voice-notes component can be built as a generic `<VoiceInput>` wrapper that any text field can adopt.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specification

- `SPEC.md` §"Capture pipeline" — five surfaces, endpoint shapes, BackgroundTask pattern, promotion model, code examples (`voice_capture` function), `POST /recipes/{id}/voice-modify` description, voice-notes option C, drafts inbox definition. This is the primary spec for Phase 2.
- `SPEC.md` §"Stack" — Gemini 2.5 Flash via `google-generativeai` Python SDK; Web Speech API for voice; `<input type="file" capture="environment">` for camera capture.

### Requirements

- `.planning/REQUIREMENTS.md` §"LLM-Assisted Capture (CAPTURE)" — CAPTURE-01 through CAPTURE-07 atomic acceptance criteria.
- `.planning/ROADMAP.md` §"Phase 2: LLM Capture (W2)" — phase goal, success criteria (voice dictation → structured within ~10s on both phones), dependency on Phase 1.

### Prior phase context

- `.planning/phases/01-foundations-w1/01-CONTEXT.md` — Phase 1 decisions: D-02 (photo upload pipeline through FastAPI backend as multipart, not presigned URLs), D-04 (color palette, member attribution), established patterns for `lib/api.ts`, `realtime.py`, `broadcast_to_household`.
- `.planning/phases/01.1-cookie-auth-and-recovery/01.1-CONTEXT.md` — D-01 (Next.js rewrite proxy), D-03 (dual-mode cookie+Bearer auth), D-04 (`credentials: "include"`, no Bearer injection). All new endpoints must be reached via `/api/...` path.

### Codebase maps

- `.planning/codebase/ARCHITECTURE.md` — BackgroundTask promotion flow (§"Data Flow"), WebSocket broadcast pattern.
- `.planning/codebase/STACK.md` — current frontend dependencies; Gemini SDK not yet in `backend/pyproject.toml` (needs adding).
- `.planning/codebase/CONCERNS.md` — §"Next.js Breaking Changes Not in Training Data" (consult `frontend/node_modules/next/dist/docs/` before writing frontend code).

### Integration points in existing code

- `backend/app/routers/recipes.py` — existing `POST /recipes` and `POST /recipes/quick` patterns; `broadcast_to_household` call site; `source_capture` handling. New voice/photo/url endpoints follow the same structure.
- `backend/app/services/realtime.py` — `broadcast_to_household` helper; new `recipe.promoted` event type joins the existing `recipe.created` and `recipe.updated` vocabulary.
- `frontend/components/RecipeDraftCard.tsx` — needs spinner + error-badge states for D-07 and D-09.
- `frontend/app/recipes/new/page.tsx` — existing 2-tab structure to be extended to 5 tabs (D-01).
- `frontend/components/PhotoUploader.tsx` — reusable for the Photo capture tab (D-02).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`PhotoUploader.tsx`** — handles ≤4 photos, file picker + camera, preview grid; reuse on Photo capture tab for `POST /recipes/photo`
- **`RecipeDraftCard.tsx`** — existing draft card component; extend with spinner and error-badge render paths for Gemini processing state
- **`RecipeForm.tsx`** — full edit form with all fields; voice-modify result pre-fills this form by passing initial values as props/search params
- **`RealtimeProvider.tsx`** — WebSocket event listener; add handler for `recipe.promoted` event type (currently handles `recipe.created` and `recipe.updated`)
- **`lib/api.ts`** — fetch wrapper with `credentials: "include"`; all new `POST /recipes/voice` etc. calls use this

### Established Patterns

- **BackgroundTask pattern** (`recipes.py`): draft created synchronously, `background_tasks.add_task(promote_fn, recipe.id)` queued — all three new endpoints follow this
- **`broadcast_to_household`**: called after any household-syncing mutation; Phase 2 adds a `recipe.promoted` event alongside the existing `recipe.created`
- **`source_capture` JSONB**: set at create time, never overwritten; Phase 2 capture endpoints follow the same invariant (Phase 1 `recipes.py` already enforces this)
- **Sonner toast**: `toast.success(...)` pattern already used in onboarding and recipe create flows
- **Tab component**: `@/components/ui/tabs` (Tabs / TabsContent / TabsList / TabsTrigger) already used in `/recipes/new`; extend to 5 tabs

### Integration Points

- `/recipes/new/page.tsx`: add 3 new `TabsTrigger` + `TabsContent` entries (Voix, Photo, URL); reuse existing state/loading pattern per tab
- `backend/app/main.py`: no new router needed — voice/photo/url/retry-promotion are all new endpoints on the existing recipes router
- `backend/app/models/recipe.py`: add `promotion_error TEXT` and `promotion_attempts INTEGER NOT NULL DEFAULT 0` columns
- New `backend/app/services/llm.py`: Gemini 2.5 Flash client + structured extraction function + voice-modify function

</code_context>

<specifics>
## Specific Ideas

- Voice tab visual: pulsing mic icon while recording + live transcript below (interim in grey, final in black) — described in D-05
- After stop: transcript in a white scrollable card with "Envoyer" (filled button) and "Recommencer" (ghost button) — matches existing button styles
- URL tab helper text: _"L'extraction automatique arrive bientôt — tu pourras compléter les détails dans la boîte de réception."_ — D-03
- Drafts inbox error state: red badge reading "Échec" (same badge component used for count indicators) + ghost "Réessayer" button — D-09
- Toast message format on promotion: _"Ta recette « [titre] » est prête !"_ — D-08

</specifics>

<deferred>
## Deferred Ideas

- **Gemini extraction for URL pastes** — explicitly out of v0.1 (CAPTURE-03). Draft is created immediately; user fills manually. Add `# TODO(productize)` marker on the URL handler.
- **Visual diff on voice-modify** — showing which fields Gemini changed (D-11 deferred). Productize-later.
- **`promotion_attempts` retry cap** — e.g. stop retrying after 3 failures and lock the card. Not specified for v0.1; planner can add a simple guard but no hard requirement.
- **Gemini prompt versioning / re-promotion on model upgrade** — CLAUDE.md arch invariant #5 says raw inputs are kept forever so prompts can be re-run. Not in Phase 2 scope; `source_capture` preservation enables this later.

</deferred>

---

*Phase: 02-llm-capture-w2*
*Context gathered: 2026-05-07*
