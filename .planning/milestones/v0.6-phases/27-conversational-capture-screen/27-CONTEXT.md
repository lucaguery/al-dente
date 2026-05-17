# Phase 27: Conversational capture screen - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace `/recipes/new` with **one chat-style composer** (scrollable thread + multi-input composer + always-visible « Enregistrer ») and ship a **shared `RecipeThread` component** that also mounts on `/recipes/[id]` post-save so the conversation continues there. The five tabbed capture surfaces (`QuickCaptureTab` / `FullCaptureTab` / `VoiceCaptureTab` / `PhotoCaptureTab` / `UrlCaptureTab`) are deleted in the same change. The `/inbox` drafts surface and its BottomNav slot are removed.

Phase 27 ships the chat UI shell + all turn-kind rendering (including non-interactive placeholders for `question` / `advisory` whose handlers Phase 28 wires) + the refinement composer on `/recipes/[id]`. Phase 28 owns the chip/stepper interactivity, advisory accept/dismiss CTAs, the recipe-form integration (`manually_edited_fields` write + pin signals). Phase 29 owns the LLM emitter for `summary` / `question` / `advisory` system turns.

**Explicitly out of scope** (deferred to later phases):
- Chip / stepper interactive handlers on `question` turns — Phase 28 DETAIL-02.
- Advisory accept / dismiss CTAs wiring → `proposal_accepted` / `proposal_dismissed` POSTs — Phase 28 DETAIL-03.
- Per-field manual-edit pin signals on the recipe form — Phase 28 DETAIL-04 + DETAIL-05.
- LLM emission of `summary` / `question` / `advisory` system turns — Phase 29 LLM-01..04.
- Pre-save bubble mutability + persistence + cancel/back UX — Claude's Discretion (planner can include sensible defaults).

</domain>

<decisions>
## Implementation Decisions

### Composer affordances (CAPTURE-01, CAPTURE-02)

- **D-01:** **Mic button opens a voice-note sheet with a textarea** (not in-app audio recording). Honors D-Voice (locked since Phase 2 — Web Speech API broken in iOS PWA standalone). The sheet reuses the existing `VoiceCaptureTab`'s D-Voice helper card pattern (paper-grain card, italic display-serif headline, OS-keyboard-mic affordance) and `next-intl` keys `recipes.voice.*`. On « Ajouter » the textarea content becomes a `voice` pending bubble carrying `{transcript: str}` (matching Phase 25 D-12 NEW voice payload shape). No new audio APIs, no MediaRecorder.
- **D-02:** **URL bubbles are emitted via the « + » menu**, not paste detection. Tapping `+` opens a bottom sheet listing « Prendre une photo » / « Choisir une photo » / « Coller un lien ». The URL option opens a small URL input modal reusing `UrlCaptureTab.tsx`'s `new URL(...)` + `http(s)`-scheme validation. On confirm, a `url` pending bubble appears carrying `{url: str}` (Phase 25 D-11 payload shape; Phase 26 D-25 will populate `extracted_html_path` server-side post-extract). Explicit + discoverable; rejects paste-detection magic.
- **D-03:** **One photo per bubble.** Each photo added via the « + » menu (camera or library) produces one `photo` pending bubble. Each photo is uploaded individually via `POST /recipes/{id}/turns/photo` on save (Phase 26 D-01 multipart endpoint accepts `files: list[UploadFile]` but the frontend sends exactly one). Each photo turn payload carries `{photo_paths: [<single supabase storage path>]}` per Phase 25 D-10. Matches the mockup's per-bubble photo rhythm; preserves the 4-photo total cap from `PhotoCaptureTab` (T-02-04-02 `TOTAL_BYTES_CAP = 18 MB`) as a thread-level total, enforced in the composer state.
- **D-04:** **Send button replaces mic when the text input has content** (iMessage / WhatsApp pattern). Composer trailing slot is one button: empty input → mic icon, non-empty input → send arrow. Tapping send creates a `text` pending bubble carrying `{text: str}` (Phase 25 D-12). Keeps the composer's 3-slot footprint (+ / input / mic-or-send) consistent with the mockup design. No always-visible separate send button; no Enter-only submit.

### Title field shape (CAPTURE-01, CAPTURE-03)

- **D-05:** **Title is purely server-derived from the thread content via the LLM.** No separate title input renders in `/recipes/new`. The save payload to the backend does NOT carry a client-provided `title` field. `promote_draft` (Phase 25 THREAD-04) reads the recipe's user turns and the existing `rewrite_title()` pipeline (v0.5 RID-04) — or Gemini extraction for voice/photo/url — sets `recipes.title` during promotion. Unifies all 5 capture paths around "title is a Gemini output". Removes the v0.1 quick-flow's user-typed title affordance.
- **D-06:** **`recipes.title` placeholder pre-promotion is « Extraction en cours… » in italic.** Backend writes a placeholder string (or NULL — planner decides; recommend `"Extraction en cours…"` literal for grep + i18n simplicity) on draft creation. On `recipes.promoted` realtime event (Phase 25 contract) OR on `turn.created` carrying a `summary` system turn (Phase 29 contract), the detail page header swaps to the real title. Pre-promotion header renders italic in the thread-meta block per mockup Frame B's `.thread-meta` design.
- **D-07:** **« Enregistrer » activates on ≥1 pending bubble of any kind.** No title field exists, so the gate becomes "≥1 pending bubble". This rewrites ROADMAP.md Phase 27 Success Criterion 3 wording ("from the moment the user has either a title or ≥1 pending bubble") in the same change — apply the D-01-style "rewrite the success criterion when implementation reveals the wording was wrong" discipline from v0.5 Phase 23. Photo-only / voice-only / URL-only captures all save with a single bubble.

### Draft state + drafts inbox fate (CAPTURE-04, milestone-level cleanup)

- **D-08:** **`status='draft'` stays as the pre-promotion transient state.** No semantic rename, no dropping to `'structured'` at creation. The draft state is now visible only briefly on `/recipes/[id]` (between save and `promote_draft` completion) — there's no exit path other than « Enregistrer » in the new composer (no "save as draft" affordance). Existing `failed` terminal state from v0.4 Phase 16 is preserved. Minimal status-machine churn.
- **D-09:** **Delete `/inbox` entirely.** `frontend/app/inbox/page.tsx` is removed; `frontend/components/RecipeDraftCard.tsx` is removed; `BottomNav.tsx`'s `/inbox` entry is removed; `next-intl` keys under `inbox.*` are pruned. Post-save the user lands on `/recipes/[id]` and watches the structure flip in the thread — no separate inbox is needed. Closes Phase 26 D-05's forward note ("Phase 27 lands [draft-removal] in one clean pass").
- **D-10:** **Failed recipes surface on the main `/recipes` list with a destructive state pill.** A small « Échec » pill renders on the `RecipeCard` for `status='failed'` rows (destructive variant — reuses the existing `--destructive` color token). Tapping opens `/recipes/[id]` where the thread shows the existing `promotion_error` context and the « Réessayer » CTA (existing `POST /recipes/{id}/retry-promotion` endpoint preserved). One surface for everything. `?status=failed` filter usage on `RecipeListPage` checked + retained on the backend; frontend list now fetches both `structured`+`failed` and renders them in the same grid.
- **D-11:** **BottomNav slot count drops from 4 to 3.** Current order: Recettes / Inbox / Décide / Réglages (or equivalent — verify in `BottomNav.tsx`). Inbox slot disappears; the remaining slots redistribute evenly. The drafts-inbox-related routing rules in any middleware are pruned. The realtime cache (`draftsCache` module-level variable in `inbox/page.tsx`) is deleted with the file.

### Recipe creation API at save time (CAPTURE-03)

- **D-12:** **Save flow is `POST /recipes` (minimal body) → N sequential `POST /recipes/{id}/turns` per pending bubble in entry order → backend's `POST /recipes/{id}/turns` for the first user turn auto-schedules `promote_draft(recipe_id)` exactly once.** Honors Phase 26 D-20 ("N sequential POSTs, not a batch endpoint"). The per-recipe asyncio Lock from Phase 26 D-18 serializes positions server-side; the frontend doesn't need to wait between individual POSTs but does so for simplicity (await each in a `for` loop). `POST /recipes` body is `{}` — no `title`, no fields — backend creates a `draft` row with the placeholder title and returns the new id. Photos use `POST /recipes/{id}/turns/photo` multipart per Phase 26 D-01.
- **D-13:** **Backend schedules `promote_draft` exactly once for the batch.** The current Phase 26 D-22 dispatch matrix schedules `process_thread_turn` on every text/voice/photo/url user turn. For the initial-capture batch (multiple bubbles arriving in rapid succession on a fresh draft), the desired behavior is ONE `promote_draft` call after all initial turns land. Two implementation options for the planner:
  - **D-13a (recommended):** The initial `POST /recipes` creates the draft and schedules `promote_draft` to fire AFTER a short coalescing window (e.g., wait until next event-loop tick after each turn POST resets the timer, OR schedule a one-shot APScheduler task that the frontend can defer-then-confirm). Cleaner from a "one Gemini call per Enregistrer" perspective.
  - **D-13b:** The frontend POSTs all turns first, then calls a small `POST /recipes/{id}/promote` (new endpoint) that schedules `promote_draft`. Explicit but adds an endpoint. Phase 26 already has a `POST /recipes/{id}/retry-promotion` precedent (D-09 collapses it to `promote_draft(recipe_id)`).
  - Plan-phase resolves which shape ships. The "one Gemini call per Enregistrer" rule (ADR-0001) MUST hold regardless.

### `/recipes/[id]` scope in Phase 27 (CAPTURE-04)

- **D-14:** **Phase 27 ships the full `RecipeThread` component on `/recipes/[id]`** — all turn kinds rendered (user bubbles for text/voice/photo/url; system bubbles for `summary`/`question`/`advisory`); refinement composer wired (text/voice/photo/url emit `POST /recipes/{id}/turns` per Phase 26). `question` chip/stepper controls render visually but are NON-INTERACTIVE STUBS (no `POST` on tap) — Phase 28 DETAIL-02 wires the handlers. `advisory` accept/dismiss CTAs render visually but are NON-INTERACTIVE STUBS — Phase 28 DETAIL-03 wires the handlers. The `manually_edited_fields` pin signal on the form is purely Phase 28's deliverable (DETAIL-04 + DETAIL-05) — Phase 27 doesn't touch the form's render.
- **D-15:** **The existing recipe form on `/recipes/[id]` stays untouched.** `frontend/app/recipes/[id]/page.tsx` and `frontend/components/RecipeForm.tsx` retain their v0.5 design (hero photo, paper-grain title strip, ingredient/step rendering, `useEnumLabels()` for cuisine/mood/protein). Phase 27 adds the chat thread ALONGSIDE the existing form rendering. The UI-SPEC (via `/gsd-ui-phase`) decides the layout — recommend chat below the existing recipe meta + form, or a thread panel with anchor link from the mockup's « Modifier les champs directement… » dashed link. Phase 28 wires `PUT /recipes/{id}` field-saves to `manually_edited_fields` (DETAIL-05) without restructuring the form.
- **D-16:** **The shared component lives at `frontend/components/RecipeThread/`** as a directory with sub-files: `index.tsx` (orchestrator + WebSocket subscription via existing `useRealtime` + DOM CustomEvent bridge), `Bubble.tsx` (user kinds: `text` / `voice` / `photo` / `url`), `SystemBubble.tsx` (system kinds: `summary` / `question` / `advisory`), `Composer.tsx` (text input + send/mic morph button + `+` menu trigger), `VoiceSheet.tsx` (D-Voice textarea sheet for the mic affordance), `UrlSheet.tsx` (URL input modal triggered by the `+` menu's « Coller un lien »), `PhotoMenu.tsx` (camera / library sub-options inside the `+` menu, reuses the existing `Sheet` patterns from `PhotoCaptureTab`). The orchestrator accepts a `mode: 'capture' | 'detail'` prop and a `recipeId: string | null` prop (null in capture mode, UUID in detail mode). The capture-mode buffers pending bubbles in component state; the detail-mode subscribes to `turn.created` and POSTs each composer emission individually.

### Claude's Discretion (planner / researcher decides)

- **Pre-save bubble mutability** — whether the user can delete a pending bubble before « Enregistrer » (recommend yes, via a small tap-target on each bubble), reorder (recommend no — append-only mirrors the thread invariant from ADR-0001), or edit-in-place (recommend no — type a new bubble instead).
- **Pre-save persistence** — whether pending bubbles survive PWA force-quit / tab close (recommend no for v0.6 — pending state is ephemeral; if a user closes the page they re-capture from scratch). `TODO(productize)` note inline if implemented.
- **Cancel / back behavior on `/recipes/new` with pending bubbles** — recommend a confirmation toast/modal if user taps the back arrow with ≥1 pending bubble; defer to UI-SPEC if more nuance is needed.
- **Loader / extraction-in-progress UX in the thread** — between save (when bubbles land as user turns) and the `recipe.promoted` event (Phase 25) or the first `summary` turn (Phase 29), what shows? Recommend a small italic « Extraction en cours… » row in the thread that disappears on promotion; planner can choose a skeleton bubble alternative.
- **`POST /recipes` body shape post-rewrite** — the body becomes `{}` per D-12, but the planner should decide whether to keep the existing `RecipeCreate` schema (allow optional fields for forward-compat with manual edits during creation) or strip it to `{}` strictly. Recommend strict `{}` — the manual-edit path is `PUT /recipes/{id}` (Phase 28 wires `manually_edited_fields` on PUT per DETAIL-05).
- **`promote_draft` coalescing implementation** (D-13a vs D-13b) — planner / researcher chooses based on the Phase 25 `promote_draft` shape.
- **`RecipeListPage` filter behavior post-`/inbox` deletion** — recommend the main list shows `structured` + `failed` (with state pill on the latter); the `?status=draft` filter is preserved server-side for admin/seed use but no longer rendered in the frontend.
- **i18n keys for new chat copy** — placeholder « Ajouter une note, dicter, joindre… », state pill « Extraction en cours… », `+` menu items, voice sheet prompts. Planner adds these under a new `recipes.thread.*` namespace.
- **Photo-bubble total-bytes cap** — preserve the 18 MB total enforced today by `PhotoCaptureTab` (T-02-04-02). Compute against the cumulative pending photo bubble sizes in the composer state; surface a `toast.error` on overflow.
- **Bottom-bar slot redistribution** — when `/inbox` is removed, the BottomNav goes from 4 → 3 slots. Planner decides the visual rebalance.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Milestone-level design
- `docs/adr/0001-recipe-conversation-thread.md` — Recipe conversation thread architecture, conflict UX rationale (advisory bubble), rejected alternatives, consequences. Phase 27 ships the §Consequences UI bullets.
- `.planning/REQUIREMENTS.md` §CAPTURE-01..04 — 4 requirements anchored to Phase 27.
- `.planning/ROADMAP.md` §"Phase 27: Conversational capture screen" — goal, 4 success criteria, invariant touched (#1 capture pipeline).
- `.planning/PROJECT.md` §"Current Milestone: v0.6" — locked decisions including LLM trigger table + Enregistrer behavior.
- `.scratch/capture-mockups/2-conversation.html` — the 3-frame mockup (Frame A capture / Frame B post-save with system summary / Frame C refinement Q&A). Pixel-level reference for the chat layout, save-bar position, composer affordances, and turn rendering styles.

### Prior phase (must read for forward-compat hooks)
- `.planning/phases/25-backend-foundation/25-CONTEXT.md` — entire file. Especially D-01–D-04 (legacy backfill payload shapes — relevant when rendering pre-Phase-25 recipes' initial turns), D-10–D-12 (NEW turn payload shapes — `{photo_paths}`, `{url}`, `{text}`, `{transcript}` — exactly what Phase 27 emits via `POST /turns`), D-13–D-14 (TurnKind/TurnSender locked vocabularies in `frontend/lib/enums.ts`), D-15 (Pydantic discriminated union on `kind`), D-16 (0-indexed position, planner serializes via Phase 26's asyncio Lock).
- `.planning/phases/26-thread-api-realtime/26-CONTEXT.md` — entire file. Especially D-01 (split endpoint topology — `POST /recipes/{id}/turns` JSON + `POST /recipes/{id}/turns/photo` multipart), D-03 (`turn.created` WS frame carries full `TurnResponse`), D-05 (no status guard on POST turns — chat is draft-agnostic by design), D-06 (broadcasts for both user and system senders), D-20 (N sequential POSTs not a batch endpoint), D-22 (BackgroundTask scheduling matrix — chat composer emissions follow this), D-29 (`turn.updated` event when URL extraction lands the `extracted_html_path`).

### Architecture invariants
- `CLAUDE.md` §"Architecture invariants" — invariant #1 (capture pipeline shape — Phase 27 collapses the 5-surface UI convergence; the UI now reflects the single-shape contract), invariant #4 (realtime — chat subscribes to `turn.created` + `turn.updated` via the existing `useRealtime` DOM CustomEvent bridge), invariant #6 (French-only via `next-intl` — all new strings get keys under `recipes.thread.*`), invariant #7 (single uvicorn worker — relevant only for backend coalescing in D-13), invariant #8 (HttpOnly cookie auth — all `POST /turns` go through `api()` wrapper / `credentials: include`).
- `CLAUDE.md` §"MVP phase posture" — clean drop of `QuickCaptureTab` / `FullCaptureTab` / `VoiceCaptureTab` / `PhotoCaptureTab` / `UrlCaptureTab` + `/inbox/page.tsx` + `RecipeDraftCard.tsx` + BottomNav `/inbox` slot. No compat shim, no parallel surfaces.
- `CLAUDE.md` §"Locked vocabularies" — `TurnKind` (`text`/`voice`/`photo`/`url`/`answer`/`proposal_accepted`/`proposal_dismissed`/`summary`/`question`/`advisory`) and `TurnSender` (`user`/`system`) from Phase 25 D-14 — RecipeThread's rendering switch reads these literals.
- `CLAUDE.md` §"Repo layout" — `frontend/components/` for shared React components; `frontend/lib/recipes.ts` for the API helpers (`postVoiceCapture`, `postPhotoCapture`, `postUrlCapture`, `api<Recipe>`); `frontend/lib/enums.ts` for the locked vocabularies.
- `frontend/CLAUDE.md` → `frontend/AGENTS.md` — Next.js 16 has breaking changes that may not be in your training data. Consult `frontend/node_modules/next/dist/docs/` before writing frontend code.
- `docs/design-system.html` — living design system reference (Sober Kitchen): locked tokens (terracotta sober + Cormorant + Caveat), patine cards, table-à-manger voting, marginalia register, brand-mark loader. Open in browser before designing new UI; do not duplicate its decisions in ad-hoc CSS. The chat bubbles + composer + sheets must consume the locked tokens.

### Prior precedent (P27 should mirror)
- `frontend/app/recipes/new/page.tsx` — the page being replaced; reference the auth flow (`api()` helper + Vercel rewrite + cookie), the `OnboardingGuard` wrapper, the page chrome (sticky h-12 header, back arrow, title), and the existing `setQuickStage` two-step indicator (for the post-save promotion-in-progress feedback).
- `frontend/components/VoiceCaptureTab.tsx` — D-Voice textarea pattern + D-Voice helper card pattern reused by D-01's voice sheet. Mirror the OS-keyboard-mic affordance copy + the paper-grain helper Card with display-serif italic headline.
- `frontend/components/PhotoCaptureTab.tsx` — sheet-with-camera-or-library pattern (`SheetTrigger` + camera capture input + library file input + `URL.createObjectURL` + cleanup) reused by D-03's photo bubble add flow. T-02-04-01 (revoke object URLs on cleanup) + T-02-04-02 (18 MB total cap) carry forward.
- `frontend/components/UrlCaptureTab.tsx` — URL `new URL(...)` + `http(s)`-scheme validation reused by D-02's URL sheet inside the `+` menu.
- `frontend/components/ui/sheet.tsx` (Radix sheet wrapper) — bottom-sheet pattern for the voice sheet + URL sheet + `+` menu.
- `frontend/components/RealtimeProvider.tsx` + `frontend/lib/ws.ts` + `frontend/lib/realtime-events.ts` (or equivalent) — `client.onEvent<TurnResponse>('turn.created', ...)` subscription pattern; DOM CustomEvent bridge for chat list update.
- `frontend/app/inbox/page.tsx` — file being deleted; reference the existing realtime subscription patterns + cache idioms before removing.
- `frontend/components/RecipeForm.tsx` — left untouched per D-15 but inspected to understand the form layout the chat thread mounts alongside on `/recipes/[id]`.
- `frontend/app/recipes/[id]/page.tsx` — current detail page (hero photo, paper-grain title strip, ingredient/step form). Chat thread mounts adjacent per D-15.
- `frontend/lib/api.ts` (`api()` helper) — wrapper around `fetch` with `credentials: 'include'`. New turn POSTs use this (text/url/answer) and multipart photo POSTs use raw `fetch` with FormData (PhotoCaptureTab precedent at `frontend/app/recipes/new/page.tsx:97-104`).
- `frontend/lib/recipes.ts` — `postVoiceCapture` / `postPhotoCapture` / `postUrlCapture` legacy helpers — likely REMOVED in Phase 27 (their endpoints `/recipes/voice` / `/recipes/photo` / `/recipes/url` are obsolete now that Phase 25 routed all capture through `promote_draft` and Phase 26 added `POST /recipes/{id}/turns`). Planner verifies the legacy endpoints can be retired or kept as `# TODO(productize)`-marked aliases.
- `frontend/components/BottomNav.tsx` — `/inbox` slot removed per D-11.
- `frontend/lib/onboarding-guard.tsx` — `/recipes/new` continues wrapped in `OnboardingGuard` post-rewrite.

### Cutover targets (deleted by this phase)
- `frontend/app/inbox/page.tsx` — deleted per D-09.
- `frontend/components/RecipeDraftCard.tsx` — deleted per D-09.
- `frontend/components/VoiceCaptureTab.tsx` — deleted per CAPTURE-02 (its D-Voice helper + textarea pattern is internalized into `RecipeThread/VoiceSheet.tsx`).
- `frontend/components/PhotoCaptureTab.tsx` — deleted per CAPTURE-02 (its sheet + camera/library + bytes-cap patterns are internalized into `RecipeThread/PhotoMenu.tsx`).
- `frontend/components/UrlCaptureTab.tsx` — deleted per CAPTURE-02 (its validation pattern is internalized into `RecipeThread/UrlSheet.tsx`).
- `frontend/messages/fr.json` (or equivalent next-intl source) — `inbox.*` keys pruned; legacy capture-tab keys (`recipes.new.tab_quick`, `recipes.new.tab_full`, `recipes.voice.tab_label`, etc.) pruned; new `recipes.thread.*` keys added.

### Cutover targets (modified by this phase)
- `frontend/app/recipes/new/page.tsx` — rewritten from scratch to mount `<RecipeThread mode="capture" />`.
- `frontend/app/recipes/[id]/page.tsx` — chat thread mounted alongside existing form rendering per D-15.
- `frontend/components/BottomNav.tsx` — `/inbox` entry removed per D-11; visual rebalance for 3 remaining slots.
- `frontend/components/RecipeCard.tsx` — adds the « Échec » destructive state pill for `status='failed'` rows per D-10.
- `frontend/app/recipes/page.tsx` — fetches `structured`+`failed` together per D-10 (was filtering structured-only; failed previously surfaced only via `/inbox`).
- `backend/app/routers/recipes.py` — `POST /recipes` body becomes `{}` (or kept lenient per Claude's Discretion) — creates draft, returns id, schedules `promote_draft` via the D-13 coalescing approach (D-13a recommended).
- `backend/app/services/llm.py` `promote_draft` — verify the function's existing trigger pattern supports the new "schedule once after batch" need from D-13; planner / researcher decides if a small coalescing helper is needed (e.g., an asyncio task that waits ~250ms after the last POST /turns before firing).
- `CLAUDE.md` §"Architecture invariants" #1 — the wording from v0.5 RID-04 ("the v0.5 RID-04 sync→async shift") is updated to reflect "the five-surface convergence is no longer just behavioral; the UI now reflects the single-shape contract" — same atomic commit as the `/recipes/new` rewrite.

### Out of scope for this phase (Phase 28 / 29)
- Chip / stepper interactive handlers on `question` turns + `POST /turns` with `kind='answer'` → Phase 28 DETAIL-02.
- Advisory accept/dismiss CTAs wiring → `POST /turns` with `kind='proposal_accepted'` / `'proposal_dismissed'` → Phase 28 DETAIL-03.
- Per-field manual-edit pin signals on the recipe form + `manually_edited_fields` write path on form save → Phase 28 DETAIL-04 + DETAIL-05.
- LLM emitter for `summary` / `question` / `advisory` system turns (the writer side of what Phase 27 renders) → Phase 29 LLM-01..04.
- `recipe-completeness.ts` server-side parallel for question-turn generation → Phase 29 LLM-03.
- `CompletenessCard` rewiring (it stays as a passive read-only indicator per LLM-04) → Phase 29.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`frontend/components/VoiceCaptureTab.tsx`** — D-Voice helper card pattern (paper-grain, italic display-serif headline at body size, OS-keyboard-mic affordance copy via `recipes.voice.idle_helper`) + textarea idiom (autoFocus, `min-h-32 max-h-64`, restart button). Internalized into `RecipeThread/VoiceSheet.tsx`.
- **`frontend/components/PhotoCaptureTab.tsx`** — `Sheet` + camera capture input + library file input + `URL.createObjectURL` + cleanup. Bytes cap `TOTAL_BYTES_CAP = 18 MB` (T-02-04-02). 4-photo max grid pattern adapted to per-bubble in the thread.
- **`frontend/components/UrlCaptureTab.tsx`** — `new URL(...)` + `http(s)`-scheme validation. Internalized into `RecipeThread/UrlSheet.tsx`.
- **`frontend/lib/api.ts`** — `api<T>(...)` helper with `credentials: 'include'`. All non-multipart turn POSTs use this.
- **`frontend/components/RealtimeProvider.tsx`** + **`frontend/lib/ws.ts`** — WebSocket subscription via `client.onEvent<EventType>(event, handler)` returning an unsubscribe function. `turn.created` + `turn.updated` events subscribed by `RecipeThread/index.tsx` in detail mode.
- **`frontend/components/ui/sheet.tsx`** — Radix-based bottom sheet (Phase 18 Sheet-01 fix applied). Used for voice sheet, URL sheet, `+` menu.
- **`frontend/components/ui/input.tsx`**, **`frontend/components/ui/textarea.tsx`**, **`frontend/components/ui/button.tsx`** — shadcn primitives at v0.2 Phase 5 design-token compliance.
- **`frontend/lib/enums.ts`** — `TurnKind` + `TurnSender` literal unions (Phase 25 D-14). RecipeThread's render switch is a discriminated union on these.
- **`frontend/lib/onboarding-guard.tsx`** — wraps `/recipes/new` (continues post-rewrite).
- **`frontend/lib/motion.ts`** — `variants.slideUp` + `transitions.fast` for `AnimatePresence` on bubble append. Reused for incoming turn animations.
- **`docs/design-system.html`** — locked design tokens for chat bubbles (terracotta primary, paper-grain cards, Cormorant display-serif for thread-meta header, Caveat for any marginalia, sober warm-cream background).

### Established Patterns
- **`OnboardingGuard` wrapper on capture routes** — invariant since Phase 01.1 cookie migration. Preserved on the new `/recipes/new`.
- **`Sheet` + camera capture + library file input pattern** — Phase 6 CAPTURE-11 + Phase 7 polish baseline. Mirrored in `+` menu's photo sub-options.
- **`AnimatePresence` for realtime appends** — Phase 6 drafts-inbox pattern (`recipe.created` → slideUp). RecipeThread reuses for new turns appearing via `turn.created`.
- **DOM CustomEvent bridge for WS → React** — Key Decision row in PROJECT.md. RealtimeProvider dispatches; RecipeThread subscribes via `useEffect`.
- **`api()` wrapper for JSON POSTs + raw `fetch` with FormData for multipart** — `frontend/app/recipes/new/page.tsx:97-104` is the canonical multipart precedent.
- **Locked-vocabulary mirroring** (TS ↔ Python) — Phase 25 D-14 enforced for TurnKind / TurnSender. Phase 27 doesn't add new vocabularies but renders all 10 TurnKinds.
- **Same-tx denormalized writes** (invariant #3) — not directly touched by Phase 27 but the planner must avoid optimistic frontend writes that would race the backend's `same-tx` updates.
- **Paper-grain Card + shadow-card + warm-cream background** — Phase 5 design baseline. Chat-body background mirrors the mockup's `oklch(0.978 0.008 60)` warm-cream.
- **i18n keys under nested namespaces** — `recipes.thread.*` is a new namespace; planner adds keys.

### Integration Points
- **`POST /recipes` (rewritten body) → returns Recipe with `id`** — `frontend/app/recipes/new/page.tsx` rewrite uses `api<Recipe>('/api/recipes', { method: 'POST', body: '{}' })` per D-12.
- **`POST /api/recipes/{id}/turns` (JSON) + `POST /api/recipes/{id}/turns/photo` (multipart)** — Phase 26 endpoints. `RecipeThread/Composer.tsx` calls these directly in detail mode; the capture-mode batch save calls them in a `for` loop after the initial `POST /recipes`.
- **`useRealtime()` + `onEvent<TurnResponse>('turn.created', ...)` + `onEvent<TurnResponse>('turn.updated', ...)`** — RecipeThread's detail-mode subscription. Capture mode doesn't subscribe (no recipe id yet).
- **`useRealtime()` + `onEvent<Recipe>('recipe.promoted', ...)`** — detail-page header swap (placeholder title → real title) per D-06.
- **BottomNav slot removal** — `frontend/components/BottomNav.tsx`'s nav array drops the `/inbox` entry.
- **`RecipeCard` failed pill** — `frontend/components/RecipeCard.tsx` renders « Échec » destructive pill conditional on `recipe.status === 'failed'` per D-10.
- **`/recipes` list fetch** — `frontend/app/recipes/page.tsx` queries union of `structured`+`failed` per D-10.
- **`fr.json` next-intl strings** — `inbox.*` pruned, `recipes.new.tab_*` pruned, legacy capture-tab keys pruned, new `recipes.thread.*` keys added.

</code_context>

<specifics>
## Specific Ideas

- **« Voie rapide »** — the mockup's caption emphasizes that « Enregistrer » must NEVER be blocked by a system dialog. Phase 27 honors this strictly: no modal interrupts the save path; the only blocking confirmation is the back-arrow with pending bubbles (Claude's Discretion).
- **« Extraction en cours… »** as a copy element — the italic placeholder title appears in three places (the `/recipes/[id]` thread-meta header pre-promotion; the chat as a small italic system row between save and `summary` arrival; on the `RecipeCard` for `status='draft'` rows transiting through). The user is the visionary for tone; locked verbatim unless the UI-SPEC discovers a better phrasing.
- **Bubble-per-photo (D-03)** matches the « kitchen counter » mental model — each photo is a discrete capture moment, like laying photos out on a table. The 4-photo cumulative cap (18 MB) is preserved as a thread-level enforcement, not per-bubble.
- **`+` menu** mirrors the mockup's intent — a single "more" affordance that opens a sheet of capture options (photo from camera / photo from library / URL link). Doesn't force the user to know "which tab" up front; the affordance is contextual.
- **Server-derived title (D-05)** unifies the five capture flows around "Gemini generates the title" — the v0.5 RID-04 `rewrite_title()` pipeline for quick/full + the existing extraction-derived title for voice/photo/url. The user never types a title at /recipes/new; the LLM is the source of truth for `recipes.title`.
- **`/inbox` deletion (D-09) + BottomNav drop (D-11)** is a major UX cleanup that closes a Phase 26 D-05 forward note. The user has explicit authority for it; the planner should verify zero data loss (no dangling references to `RecipeDraftCard` or `inbox/*` next-intl keys) before the commit lands.
- **Phase 27 ships the full chat component but only the user-side handlers (D-14)** — `question` chip stubs render visually but don't POST; `advisory` CTAs render visually but don't POST. Phase 28's diff stays small (wire 4 handlers to existing UI). This pattern is the load-bearing reuse contract for the shared component.

</specifics>

<deferred>
## Deferred Ideas

- **Pre-save bubble persistence (localStorage / IndexedDB)** — pending bubbles ephemeral in v0.6; productize-later if user sentiment shifts.
- **Pre-save bubble reorder / edit-in-place** — append-only mirrors ADR-0001 thread invariant; reorder rejected to keep mutability rules consistent.
- **Paste-detection for URL strings in the text input** — rejected in favor of explicit `+` menu's « Coller un lien »; could be a productize-later magic affordance if friction surfaces.
- **MediaRecorder in-app audio recording** — D-Voice locked since Phase 2 (broken in iOS PWA standalone); explicitly rejected for v0.6. Productize-later iff iOS lifts the restriction or a server-side transcription pipeline lands.
- **« Save as draft » affordance pre-promotion** — explicitly NOT shipped (the new composer's only exit is « Enregistrer » or back-with-confirmation). `draft` status is a transient buffer per D-08.
- **Per-member turn attribution** — REQUIREMENTS.md §Out of Scope, productize-later.
- **Push notifications for post-promotion advisories** — REQUIREMENTS.md §Out of Scope, productize-later. Phase 27 only consumes the WebSocket events.
- **Chip / stepper interactive handlers on `question` turns** — Phase 28 DETAIL-02.
- **Advisory accept/dismiss CTAs wiring** — Phase 28 DETAIL-03.
- **`manually_edited_fields` write path + per-field pin signal** — Phase 28 DETAIL-04 + DETAIL-05.
- **LLM emission of `summary` / `question` / `advisory` system turns** — Phase 29 LLM-01..04.
- **Server-side `recipe-completeness` parallel** for question-turn generation — Phase 29 LLM-03.
- **`/recipes` list redesign for the failed-pill addition** — Phase 27 ships the minimum viable pill on `RecipeCard`; a fuller redesign of failed-state browsing (e.g., a filter chip on the list) is post-MVP.

</deferred>

---

*Phase: 27-conversational-capture-screen*
*Context gathered: 2026-05-13*
