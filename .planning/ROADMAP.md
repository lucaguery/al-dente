# Roadmap: Al Dente

## Completed Milestones

- **v0.1** ✅ (2026-05-05 → 2026-05-08) — Full PWA shipped: infra, onboarding, recipe library, LLM capture, daily shortlist, voting, cooking-log finalization, Web Push, realtime sync. 5 phases, 31 plans, 49 requirements. → [Archive](.planning/milestones/v0.1-ROADMAP.md)
- **v0.2** ✅ (2026-05-08) — Polish: Slow Food artisanal identity. Re-themed every surface (capture / decide / cook / onboarding) onto the Phase 5 design system (terracotta + warm-cream + Fraunces italic + paper-grain). Closed 5 W4 UI-REVIEW gaps inline (CAPTURE-11, DECIDE-05, COOK-07/08/11/12) plus the Phase 5 themeColor deferral. NEW PWA identity via Next.js 16 `app/icon.tsx`. UI audit average 22.4/24 across 5 phases (best 23/24). 5 phases, 26 plans, 31 requirements. → [Archive](.planning/milestones/v0.2-ROADMAP.md)
- **v0.2.1** ✅ (2026-05-08 → 2026-05-09) — E2E test infrastructure: one-command synthetic seed (`uv run seed` — 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states, idempotent via uuid5+merge) + committed Playwright suite (14 specs across `seeded` and `fresh` projects, iPhone-shape Chromium viewport with `toBeInViewport()` on critical surfaces) + 4-command bootstrap runbook (`TESTING.md`). 1 phase, 7 plans, 4 requirements. → [Archive](.planning/milestones/v0.2.1-ROADMAP.md)
- **v0.3** ✅ (2026-05-09 → 2026-05-11) — Audit & Uniqueness Foundation. Audit-only milestone — zero new product features, zero product-code drift. 4 milestone-level artifacts in `.planning/v0.3/`: `RUNBOOK.md` (prod synthetic ops at `https://al-dente-pink.vercel.app`, code `DEMO01`), `WALKTHROUGH.md` (1,276 lines, ~64 severity-tagged findings across 14 surfaces, 8 GitHub issues filed #1-#8), `UI-AUDIT.md` (14 surface scores, mean 20.21/24, 5✅/9⚠/0❌), `ASSESSMENT.md` (510 lines, 27 ranked findings across 3 tiers ordered by impact on "feels Al Dente", anti-prescription gate enforced structurally via `check-assessment.sh`). 4 phases, 16 plans, 16 requirements. → [Archive](.planning/milestones/v0.3-ROADMAP.md)
- **v0.4** ✅ (2026-05-11) — Audit Remediation & Identity Polish. Closed both v0.3 Tier 1 invariant breaks (B-3 MEMBER_COUNT + B-4 cook_count idempotency), 4 Tier 2 correctness clusters (capture pipeline, history feature, identity management, validation surfaces), the C-1 token-completeness gap (15 new semantic CSS variables + emerald/member-color migration on 7 audit-cited surfaces), and the v0.2.2 backlog (TZ-01, SEED-01, POLISH-01/02). 6 surfaces flipped ⚠ Mixed → ✅ Feels Al Dente under the SAME 6-pillar rubric; cumulative mean 20.21/24 → 21.71/24 (+1.50). 7 phases, 27 plans, 24 requirements. → [Archive](.planning/milestones/v0.4-ROADMAP.md)
- **v0.5** ✅ (2026-05-12 → 2026-05-13) — Mixed Sweep. Closed 12 GitHub issues (#10/#11/#12/#13/#14/#15/#16/#17/#18/#21/#22 A+B) across three coherent themes — quick wins, swipe-deck polish, and recipe identity. **Invariant #1 has shifted** — quick + full-form captures moved from sync `structured`-on-return to async `BackgroundTask` (CLAUDE.md updated in same commit as `rewrite_title()`). Shipped LLM "catchy" titles across all capture surfaces, `BrandIcon` brand mark + empty-state mounts, 11-field `CompletenessCard` nudge with `?focus=` edit-page navigation, per-recipe SVG illustration pipeline with stdlib `xml.etree.ElementTree` allowlist sanitizer (28 unit tests, reject-and-fallback), ring-stroke drag overlays replacing OUI/NON, swipe threshold + spring retune, filled/outline Heart thumb buttons, tap-to-detail, Geist Mono drop, `VersionFooter` build stamp, French `useEnumLabels()` sweep on shortlist + recipe detail. 3 phases, 9 plans, 12 requirements. → [Archive](.planning/milestones/v0.5-ROADMAP.md)

## Current Milestone

### 🚧 v0.6 Conversation Capture (in progress — started 2026-05-13)

**Milestone Goal:** Replace the five tabbed capture surfaces (`quick` / full-form / `voice` / `photo` / `url`) with a single durable conversation thread per recipe, doubling as the recipe's ongoing semantic edit log. Closes gh#20; design locked in [ADR-0001](../docs/adr/0001-recipe-conversation-thread.md).

**Locked decisions (from PROJECT.md `Current Milestone: v0.6` + ADR-0001):**

- MVP posture authorizes a clean `source_capture` drop in the same Alembic migration that adds `recipe_turns`. No compat shim, no fallback path.
- Conflict UX = informational `advisory` bubble (option C). Manual edit wins by default; user taps "Mettre à jour" to accept the LLM's interpretation or "Ignorer" to dismiss.
- Two co-equal edit paths: **semantic** (new chat turn → LLM re-interprets the thread) and **manual** (direct field edit → field is pinned in `recipes.manually_edited_fields`).
- LLM trigger table is locked: `text` / `voice` / `photo` / `url` user turns trigger Gemini; `answer` user turns apply directly + pin the field (never trigger Gemini); `proposal_accepted` / `proposal_dismissed` are pure state changes; system turns never trigger another run.
- One Gemini call per Enregistrer; full thread re-read every run (natural idempotency).
- `promote_draft(recipe_id)` consolidation — the four `promote_*_draft` functions in `services/llm.py` collapse into one entry point dispatching on first user turn's `kind`.
- Invariant #5 (raw inputs preserved) is satisfied by `recipe_turns` from v0.6 forward; `source_capture` is retired.

#### Phase 25: Backend foundation
**Goal**: The new thread data model is live in Postgres, the legacy `source_capture` JSONB column is gone in the same migration, and a single `promote_draft(id)` entry point dispatches all capture promotion — all five existing capture surfaces keep working through the cutover with no compat shim.
**Depends on**: Nothing (first v0.6 phase). MIGRATION-01 + MIGRATION-02 anchor this phase — they unblock everything else in v0.6.
**Requirements**: THREAD-01, THREAD-02, THREAD-03, THREAD-04, MIGRATION-01, MIGRATION-02
**Success Criteria** (what must be TRUE):
  1. A user re-saving any **non-failed** recipe shipped under v0.5 still sees it intact after the migration runs — each surviving recipe now carries one initial turn matching its legacy capture surface (`type='manual'→text` / `voice→voice` / `photo→photo` / `url→url`). Recipes with `status='failed'` are deleted by the migration (Plan 25-01 D-05) — explicit MVP trade-off for a cleaner cutover; the deletion cascades pre-cleaned `cooking_logs` and `votes` rows referencing failed recipes.
  2. `grep -rn "source_capture" backend/` returns zero matches; the legacy column no longer exists, and every former reader in `backend/app/` has been rewritten to read from `recipe_turns`.
  3. All five capture surfaces (quick / full-form / voice / photo / url) still successfully promote drafts to `status='structured'` after the cutover, dispatched through the single `promote_draft(id)` entry point.
  4. `uv run seed` runs idempotently against a clean test DB and produces 21+ seeded recipes each carrying its initial turn + a representative `summary` system turn, with `source_capture` referenced nowhere in the seed code.
  5. `alembic downgrade -1` followed by `alembic upgrade head` runs cleanly on prod-shape data (1 household, 21+ recipes, mixed capture surfaces) — reversibility verified even though MVP posture authorizes the forward cut.
**Invariants touched**: #1 (capture pipeline shape — all five surfaces now read their initial turn from `recipe_turns`, no `source_capture` reads remain) · #5 (raw inputs preserved — satisfied by `recipe_turns` going forward, `source_capture` retired)
**Plans:** 3/3 plans complete
Plans:
- [x] 25-01-PLAN.md — Foundation: Alembic 0009 (table + column + DELETE failed + backfill + drop) + RecipeTurn ORM + Pydantic schemas + locked TurnSender/TurnKind vocabularies in both enum files (THREAD-01, THREAD-03, MIGRATION-01)
- [x] 25-02-PLAN.md — Backend cutover: collapse promote_*_draft → promote_draft(recipe_id) + 5 router rewrites with photo Storage upload (D-08) + RecipeResponse.initial_turn_kind + seed.py rewrite + backend test fixes (THREAD-02, THREAD-04, MIGRATION-02)
- [x] 25-03-PLAN.md — Frontend cutover: Recipe type swap (source_capture → initial_turn_kind), RecipeDraftCard rewrite (manual → text), e2e specs + comment cleanup (THREAD-02 frontend half)

#### Phase 26: Thread API & realtime
**Goal**: Every turn — user-emitted (text / voice / photo / url / answer / proposal_accepted / proposal_dismissed) and system-emitted (summary / question / advisory) — is persisted via one append-only endpoint, broadcast over WebSocket, and (where it triggers the LLM) processed via BackgroundTask. URL extraction stops being a stub.
**Depends on**: Phase 25 (the table + `promote_draft` entry point must exist before the endpoint can write turns through them). Closes the long-standing `# TODO(productize)` at `recipes.py:481-490` via TURN-04.
**Requirements**: TURN-01, TURN-02, TURN-03, TURN-04
**Success Criteria** (what must be TRUE):
  1. A user can `POST /recipes/{id}/turns` with a `text` payload and see the new turn appear within ~200ms on the household partner's open thread view, via the new `turn.created` WebSocket event.
  2. A user tapping a chip answer emits an `answer` turn whose value applies directly to the recipe and adds the field to `manually_edited_fields` — no Gemini call is made for that turn (verified by log inspection).
  3. A user posting a URL turn triggers a BackgroundTask that fetches the URL, extracts recipe-shaped HTML, stores the extracted path on the turn payload, and Gemini receives the extracted content alongside the rest of the thread — the long-standing `TODO(productize)` at `recipes.py:481-490` is closed and `capture-url` stops being ⚠ Mixed.
  4. A user dismissing an advisory bubble emits a `proposal_dismissed` turn that is a pure no-op state change (no LLM run, no field mutation) and references the originating `advisory` turn ID.
**Invariants touched**: #4 (realtime — new `turn.created` event added to `services/realtime.broadcast_to_household` callsites)
**Plans:** 4/4 plans complete
Plans:
- [x] 26-01-PLAN.md — Schema graduation (AnswerTurnPayload + AdvisoryTurnPayload + UrlTurnPayload typed) + services/thread.py (per-recipe asyncio Lock + SSRF helper) (TURN-01, TURN-02, TURN-04)
- [x] 26-02-PLAN.md — services/llm BackgroundTasks (process_thread_turn stub + extract_and_process_url_turn body) + storage helpers (recipe-urls bucket + upload_recipe_url_extract) + canned_url_extract fixture (TURN-01, TURN-04)
- [x] 26-03-PLAN.md — Router endpoints (POST /turns JSON + POST /turns/photo multipart + GET /turns) + atomic answer/proposal handlers + D-22 dispatch + turn.created broadcast + CLAUDE.md invariant #4 update (TURN-01, TURN-02, TURN-03, TURN-04)
- [x] 26-04-PLAN.md — pytest suite covering all 4 ROADMAP success criteria + cross-cutting validation (TURN-01, TURN-02, TURN-03, TURN-04)

#### Phase 27: Conversational capture screen
**Goal**: `/recipes/new` is one screen — title above, scrollable thread in the middle, multi-input composer (text / voice / photo / url) at the bottom — and the « Enregistrer » button is always reachable above the composer once there's a title or any pending bubble. The shared chat component is ready for Phase 28 to mount on the recipe-detail page.
**Depends on**: Phase 25 (the backend cutover) · Phase 26 (the `POST /turns` endpoint and `turn.created` WebSocket event must exist before the screen can write turns). **The shared chat component built here is the same component that Phase 28 mounts on `/recipes/[id]`** (CAPTURE-04 contract — one component, two mount points; Phase 28 reuses, does not rebuild).
**Requirements**: CAPTURE-01, CAPTURE-02, CAPTURE-03, CAPTURE-04
**Success Criteria** (what must be TRUE):
  1. A user can capture a recipe in **2 taps** — enter a title, type one text bubble, tap « Enregistrer » — and land on `/recipes/[id]` with the bubble preserved as the first user turn.
  2. The five tabbed capture surfaces are gone — `grep -rn "QuickCaptureTab\|FullCaptureTab\|VoiceCaptureTab\|PhotoCaptureTab\|UrlCaptureTab" frontend/` returns zero matches, and no tab navigation remains anywhere in `/recipes/new`.
  3. The « Enregistrer » button is always visible above the composer from the moment the user has either a title or ≥1 pending bubble; tapping it creates the draft and persists each pending bubble as one initial user turn in entry order before scheduling the BackgroundTask once over the full thread.
  4. After save the user lands on `/recipes/[id]`, the conversation continues there, and the post-LLM `summary` turn + any `question` turns append inline within ~2s — the screen does not surface generic pre-save questions.
**Invariants touched**: #1 (capture pipeline — the five-surface convergence is no longer just behavioral; the UI now reflects the single-shape contract)
**Plans:** 5/5 plans complete
Plans:
- [x] 27-01-PLAN.md — Backend cleanup: POST /recipes empty body + POST /recipes/{id}/promote (D-13b) + delete 4 legacy capture endpoints + drop legacy frontend helpers (CAPTURE-03)
- [x] 27-02-PLAN.md — Build shared RecipeThread component directory (orchestrator + Bubble + SystemBubble + Composer + VoiceSheet + UrlSheet + PhotoMenu + types) + recipes.thread.* i18n namespace (CAPTURE-01, CAPTURE-02, CAPTURE-04)
- [x] 27-03-PLAN.md — Demolition (5 tab components + /inbox + RecipeDraftCard + i18n prune) + rewrite /recipes/new/page.tsx mounting RecipeThread with save flow (CAPTURE-01, CAPTURE-02, CAPTURE-03)
- [x] 27-04-PLAN.md — BottomNav 4→3 redistribution + RecipeCard « Échec » pill + /recipes list documentation (CAPTURE-02)
- [x] 27-05-PLAN.md — Mount RecipeThread on /recipes/[id] in detail mode with turns fetch + turn.created/updated WS subscription + manual-link scroll (CAPTURE-04)
**UI hint**: yes

#### Phase 28: Recipe-detail thread
**Goal**: `/recipes/[id]` is the recipe's living artifact — the chat component is mounted alongside the form, refinement turns post in real time, `question` turns render as chip / stepper / text inputs, `advisory` turns render as informational bubbles (manual edit wins by default), and every form field shows whether it is pinned.
**Depends on**: Phase 27 (shared chat component — Phase 28 mounts the same component, does not rebuild it).
**Requirements**: DETAIL-01, DETAIL-02, DETAIL-03, DETAIL-04, DETAIL-05
**Success Criteria** (what must be TRUE):
  1. A user opening `/recipes/[id]` sees the durable conversation thread inline alongside the recipe form, can post a new `text` / `voice` / `photo` / `url` refinement turn, and sees system replies (`summary` / `question` / `advisory`) append in real time via the `turn.created` event from Phase 26.
  2. A user tapping a chip (or committing a stepper) inside a `question` turn sees the field value update immediately on the recipe form **and** the pinned-field signal appear next to that field — the corresponding `answer` turn carries `{in_reply_to_turn_id, field, value}`.
  3. An `advisory` bubble renders inline (not modal) showing the pinned `current_value`, the LLM's `proposed_value`, and a one-line `reason_excerpt`; tapping "Mettre à jour" applies the proposed value and removes the pin, tapping "Ignorer" dismisses without changing the field.
  4. A user editing any form field via the existing recipe form and saving (`PUT /recipes/{id}`) sees the pinned-field signal appear next to that field immediately — no separate write, no realtime round-trip required.
  5. A user can tell at a glance which fields are pinned vs LLM-managed by scanning the form — the signal is present on every field listed in `recipes.manually_edited_fields`.
**Invariants touched**: #4 (realtime — the detail thread consumes `turn.created` via the existing DOM CustomEvent bridge)
**Plans:** 4 plans
Plans:
- [ ] 28-01-PLAN.md — Backend foundation: add `manually_edited_fields` to `RecipeResponse` + `_apply_put_pinning` helper on PUT /recipes/{id} + 10 pytest cases (DETAIL-05)
- [ ] 28-02-PLAN.md — Frontend vocabulary: `Recipe` type + `ANSWER_FIELDS`/`AnswerField` mirror + `useEnumLabels.field()` + 10 i18n keys + `pin-sections.ts` + `<PinLabel>` component (DETAIL-04)
- [ ] 28-03-PLAN.md — Interactive layer: extend `RecipeThreadProps` + `advisoryResolutions` memo + wire SystemBubble question/advisory handlers with « Valider » + optimistic state handlers in `page.tsx` (DETAIL-01, DETAIL-02, DETAIL-03)
- [ ] 28-04-PLAN.md — Mount marginalia: section-level gutter PinLabels on `/recipes/[id]/page.tsx` with « conflit » scroll + per-input inline PinLabels on `RecipeForm.tsx` + Playwright e2e specs (DETAIL-04, DETAIL-05)
**UI hint**: yes

#### Phase 29: LLM prompt rework + completeness wire-up
**Goal**: The Gemini call is rebuilt around the full thread + pinned-field set. The LLM emits `advisory` turns on conflict (never silently overwrites), and emits one `question` turn per missing high-weight field driven by `recipe-completeness.ts`. `CompletenessCard` stays as a passive progress indicator.
**Depends on**: Phase 28 (the advisory + question UI must exist for the LLM's emissions to be observable end-to-end).
**Requirements**: LLM-01, LLM-02, LLM-03, LLM-04
**Success Criteria** (what must be TRUE):
  1. Each LLM-triggering turn runs Gemini exactly once with the full ordered thread + the pinned-field set in context; re-saving the same thread twice produces the same `summary` (natural idempotency from full re-read, verifiable in the thread).
  2. When the LLM's interpretation of a refinement turn conflicts with a value in `recipes.manually_edited_fields`, the user sees one `advisory` bubble per conflicting field in the thread — the pinned value on the recipe form does **not** change until the user taps "Mettre à jour".
  3. When the recipe's completeness (via the shared `recipe-completeness.ts` helper) reports a missing high-weight field, the user sees a `question` turn appear in the thread with the appropriate `input_type` (chip / stepper / text); question turns stop appearing once completeness clears the threshold.
  4. `CompletenessCard` on `/recipes/[id]` continues to render the progress nudge from v0.5 RID-03 unchanged in behavior — both the card and the in-thread `question` turns reference the same helper, so progress shown on the card matches the question turns generated in the thread.
**Invariants touched**: #1 (capture pipeline — `promote_draft(id)` from Phase 25 now reads from `recipe_turns` and emits system turns alongside the recipe update, completing the v0.5→v0.6 pipeline shape) · #5 (raw inputs — every LLM-triggering refinement turn is now durably preserved in `recipe_turns`)
**Plans:** 3/6 plans executed
Plans:
- [x] 29-01-PLAN.md — Wave 1 foundation: Alembic 0011 adds recipes.questions_deferred_until (timestamptz NULL); mirror on Recipe ORM + RecipeResponse + frontend Recipe type (D-21)
- [x] 29-02-PLAN.md — Wave 1 foundation: NEW backend/app/services/completeness.py — Python parallel of recipe-completeness.ts (FIELD_KEYS, compute_completeness, is_field_filled, is_conflict, INPUT_TYPE_MAP, _FIELD_PROMPTS_FR, _FIELD_LABELS_FR, OPTIONS_MAP) + parity tests (D-15, D-10, D-14, D-06, D-16)
- [x] 29-03-PLAN.md — Wave 1 foundation: Graduate SummaryTurnPayload (body, chips, extraction_hash) + QuestionTurnPayload (field, prompt, input_type, options, multi) from Phase 25 stubs (D-05, D-13)
- [ ] 29-04-PLAN.md — Wave 2 LLM rework: services/llm.py — fill process_thread_turn (async), shared _run_thread_llm body, advisory/question/summary emission with extraction-hash idempotency, role-labeled French-prose prompt, photo-cap 4, reason extractor, advisory de-dup, question de-dup; extend promote_draft text/voice/photo branches; delete extract_from_transcript + extract_from_photos + canned_voice_recipe + canned_photo_recipe (LLM-01, LLM-02, LLM-03)
- [ ] 29-05-PLAN.md — Wave 3 endpoints: POST /recipes/{id}/questions/trigger (201 question OR 204) + POST /recipes/{id}/questions/defer (204, sets now+24h, broadcasts recipe.updated) (LLM-03 / D-20)
- [ ] 29-06-PLAN.md — Wave 3 frontend wire-up: SystemBubble summary CTAs onClick + deferred-state collapse; RecipeThread types/orchestrator pass-through; page.tsx handleSummaryComplete/Later + deferred derived from recipe.questions_deferred_until; fr.json all_complete toast; Playwright e2e; CompletenessCard UNTOUCHED (LLM-03, LLM-04 / D-22)

## Progress

**Execution Order:**
Phases execute in numeric order: 25 → 26 → 27 → 28 → 29

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 25. Backend foundation | v0.6 | 3/3 | Complete    | 2026-05-13 |
| 26. Thread API & realtime | v0.6 | 4/4 | Complete    | 2026-05-13 |
| 27. Conversational capture screen | v0.6 | 5/5 | Complete    | 2026-05-17 |
| 28. Recipe-detail thread | v0.6 | 0/4 | Not started | - |
| 29. LLM prompt rework + completeness wire-up | v0.6 | 3/6 | In Progress|  |

---

*Last updated: 2026-05-13 — v0.6 Conversation Capture roadmap created. 5 phases (25-29), 23 requirements mapped (THREAD × 4 + TURN × 4 + CAPTURE × 4 + DETAIL × 5 + LLM × 4 + MIGRATION × 2). Phase numbering continues from v0.5. Granularity: coarse — 5 phases sits at the upper bound; structure is driven by ADR-0001 + gh#20 Phase A→E natural dependency chain, not padding. Architecture invariants touched: #1 (capture pipeline collapses to single `promote_draft(id)`), #4 (new `turn.created` realtime event), #5 (raw inputs preserved by `recipe_turns`, `source_capture` retired).*
