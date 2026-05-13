# Requirements: Al Dente v0.6 — Conversation Capture

**Defined:** 2026-05-13
**Core Value:** Eliminate the daily "on mange quoi ?" debate via a shared library, async voting, and voice/photo capture — installable PWA on both iPhones with no App Store, no $99/year, no native build.
**Milestone Goal:** Replace the five tabbed capture surfaces (`quick` / full-form / `voice` / `photo` / `url`) with a single durable conversation thread that doubles as the recipe's ongoing semantic edit log, per the design locked in ADR-0001 (gh#20).
**Inputs:** GitHub issue #20 (locked via `/grill-with-docs` 2026-05-13) · `docs/adr/0001-recipe-conversation-thread.md` · `CONTEXT.md` (locked Turn / Conversation thread / Advisory turn / Semantic editing / Manual editing vocabulary) · `.scratch/capture-mockups/2-conversation.html` (UI mockup, three frames).

**Locked milestone decisions** (anchored in ADR-0001 + PROJECT.md `Current Milestone: v0.6`):

- **MVP posture authorizes a clean drop.** `recipes.source_capture` is removed in the same Alembic migration that adds `recipe_turns`; all readers rewritten in-place. No compat shim (per CLAUDE.md MVP posture).
- **Conflict UX = advisory bubble (option C).** Informational, not modal. Manual edit wins by default; user taps to accept or dismiss. Rejected alternatives: last-write-wins, silent pinning, interrogative confirmation, append-only proposals (see ADR-0001 §Considered alternatives).
- **Two co-equal edit paths.** *Semantic* = new chat turn (LLM re-interprets the thread). *Manual* = direct field edit, which *pins* the field in `recipes.manually_edited_fields`.
- **LLM trigger table is locked.** User `text` / `voice` / `photo` / `url` turns trigger the LLM. User `answer` (chip / stepper) turns are authoritative manual edits — apply value directly, pin the field, no LLM run. `proposal_accepted` / `proposal_dismissed` are pure state changes — no LLM run. System turns never trigger another run.
- **Idempotency from full re-read.** One Gemini run per Enregistrer; full thread re-read every run. No incremental-context complexity in v0.6.
- **`promote_draft(recipe_id)` consolidation.** The four per-surface `promote_*_draft` functions in `services/llm.py` collapse into one entry point dispatching on the first user turn's `kind`.
- **Invariant #5 (raw inputs kept forever) is satisfied by `recipe_turns`** from this point forward. The legacy `source_capture` JSONB is no longer the canonical raw-input store.

---

## v0.6 Requirements

23 requirements across 6 categories. Source citations anchor each REQ to issue #20 sections + ADR-0001 sections.

### THREAD — Conversation thread data model

- [ ] **THREAD-01**: A new `recipe_turns` table exists with columns `(id UUID PK, recipe_id UUID FK ON DELETE CASCADE, position INTEGER, sender TEXT, kind TEXT, payload JSONB, created_at TIMESTAMPTZ)`, a `UNIQUE (recipe_id, position)` constraint, and an index on `(recipe_id, position)`. Alembic migration adds the table. (issue #20 §Data model)
- [ ] **THREAD-02**: The `recipes.source_capture` JSONB column is **dropped** in the same Alembic migration that adds `recipe_turns`, with a deterministic backfill: one initial turn per existing recipe inferred from the legacy payload (`type='manual'` → kind `text`; `type='voice'|'photo'|'url'` → matching kind). Every reader of `source_capture` in `backend/app/` is rewritten to read from `recipe_turns` in the same change. No compat shim, no fallback path. (ADR-0001 §Consequences · CLAUDE.md MVP posture)
- [ ] **THREAD-03**: A new `recipes.manually_edited_fields JSONB NOT NULL DEFAULT '[]'::jsonb` column tracks which fields have been manually pinned. The set is mutated by `PUT /recipes/{id}` (form save) and by `answer` turns (chip / stepper). The LLM prompt receives this set so it can emit `advisory` turns instead of silently overwriting. (issue #20 §Data model · ADR-0001 §Consequences)
- [ ] **THREAD-04**: The four per-surface promotion functions (`promote_quick_draft`, `promote_full_draft`, `promote_voice_draft`, `promote_photo_draft`) in `backend/app/services/llm.py` collapse into one `promote_draft(recipe_id)` that reads the recipe's initial turns and dispatches on the first user turn's `kind`. Single entry point for the BackgroundTask scheduler. (issue #20 §Decision)

### TURN — Thread API & realtime

- [ ] **TURN-01**: `POST /recipes/{id}/turns` accepts a user turn (`kind ∈ {text, voice, photo, url, answer, proposal_accepted, proposal_dismissed}`) with a kind-typed payload, persists it with the next sequential `position`, and — for LLM-triggering kinds (`text` / `voice` / `photo` / `url`) — schedules a BackgroundTask that re-reads the full thread, runs Gemini once, and appends `summary` / `question` / `advisory` system turns. (issue #20 §LLM trigger table)
- [ ] **TURN-02**: `answer` turns apply the field value directly to `recipes` and add the field name to `manually_edited_fields` — never trigger the LLM. `proposal_accepted` removes the field from `manually_edited_fields` and applies the previously-proposed value. `proposal_dismissed` is a pure no-op state change. Both `accepted`/`dismissed` reference the originating `advisory` turn ID. (issue #20 §LLM trigger table · ADR-0001)
- [ ] **TURN-03**: A new `turn.created` WebSocket event broadcasts via `services/realtime.broadcast_to_household` whenever any turn (user or system) is persisted, per invariant #4. Both phones see new turns within ~200ms. Frontend RealtimeProvider routes the event to the open thread view via the existing DOM CustomEvent bridge. (CLAUDE.md invariant #4)
- [ ] **TURN-04**: The URL-turn LLM path **implements** real URL extraction, closing the long-standing `# TODO(productize)` at `backend/app/routers/recipes.py:481-490`: the BackgroundTask fetches the URL, extracts recipe-shaped content (HTML), stores the extracted file path in the `url` turn payload's `extracted_html_path`, and includes the extracted content in the Gemini prompt alongside the rest of the thread. (issue #20 §Out of scope inversion · PROJECT.md §Surfaced for follow-up)

### CAPTURE — Conversational capture screen

- [ ] **CAPTURE-01**: `/recipes/new` renders the single conversational composer from `.scratch/capture-mockups/2-conversation.html` Frame A — title field above, scrollable thread area in the middle, multi-input composer (text / voice button / photo button / URL bubble) at the bottom. The « Enregistrer » button is **always visible above the composer** from the moment there's a title or ≥1 pending bubble. Minimum capture = title + 1 bubble (2 taps). (issue #20 §Decision "Fast path always available")
- [ ] **CAPTURE-02**: The five tabbed capture surfaces are removed — `frontend/app/recipes/new/page.tsx:35-247` rewritten from scratch, `QuickCaptureTab` / `FullCaptureTab` / `VoiceCaptureTab` / `PhotoCaptureTab` / `UrlCaptureTab` components deleted. No tab navigation remains anywhere in the capture flow. `grep` for the deleted component names in `frontend/` returns zero matches. (issue #20 §Implementation outline Phase C)
- [ ] **CAPTURE-03**: Tapping « Enregistrer » creates the recipe draft and persists each pending bubble as one initial user turn in entry order, then the BackgroundTask runs once over the full thread. No system questions are surfaced before the first save (the LLM hasn't run yet — pre-save questions would be generic). (issue #20 §Decision "Fast path always available")
- [ ] **CAPTURE-04**: After save, the user lands on `/recipes/[id]` and the conversation continues there — the post-LLM `summary` turn and any `question` turns appear inline in the same thread. The capture screen and the detail thread share the same chat component (the recipe's living artifact). (ADR-0001 §Consequences)

### DETAIL — Recipe-detail thread

- [ ] **DETAIL-01**: `/recipes/[id]` shows the durable conversation thread inline alongside the recipe form, using the same chat component as CAPTURE-01. The user can emit new refinement turns (`text` / `voice` / `photo` / `url`) and see system replies (`summary` / `question` / `advisory`) append in real time via the `turn.created` WebSocket event. (ADR-0001 §Consequences)
- [ ] **DETAIL-02**: `question` turns from the system render with chip / stepper / text inputs per the payload's `input_type` field. Tapping a chip or committing a stepper emits an `answer` turn carrying `{in_reply_to_turn_id, field, value}`. The chosen value applies to `recipes` and the field is added to `manually_edited_fields` (the pinning signal). (issue #20 §Payload shapes · ADR-0001)
- [ ] **DETAIL-03**: `advisory` turns render as informational bubbles (not modal) showing `current_value` (pinned), `proposed_value` (LLM's interpretation), and a one-line `reason_excerpt`. Two CTAs: "Mettre à jour" emits `proposal_accepted` (applies proposed, removes pin); "Ignorer" emits `proposal_dismissed`. Manual edit wins by default. (issue #20 §Payload shapes · ADR-0001 §Why "advisory bubble")
- [ ] **DETAIL-04**: A manually-edited-field signal renders next to each affected form field on `/recipes/[id]` (small icon or muted label) — derived from `manually_edited_fields`. The user can see at a glance which fields are pinned and therefore protected from silent LLM overwrites. (ADR-0001 §Consequences)
- [ ] **DETAIL-05**: A direct manual field edit via the existing form (`PUT /recipes/{id}`) adds the affected field(s) to `manually_edited_fields` in the same DB transaction — the pinning signal appears immediately without a separate write. (ADR-0001 §Consequences)

### LLM — Prompt rework + completeness wire-up

- [ ] **LLM-01**: The Gemini prompt is rewritten to receive the **full ordered thread** + the pinned-field set (`manually_edited_fields`) and return a structured `summary` (the recipe field extraction). Single Gemini call per LLM-triggering turn; full re-read provides natural idempotency. (issue #20 §Decision "LLM context = full thread re-read")
- [ ] **LLM-02**: When the LLM's interpretation conflicts with a value already in `manually_edited_fields`, the BackgroundTask emits an `advisory` turn (one per conflicting field) carrying `{field, current_value, proposed_value, reason_excerpt}` — it does **not** silently overwrite the pinned value. (ADR-0001 §Why)
- [ ] **LLM-03**: When `frontend/lib/recipe-completeness.ts` (v0.5 RID-03 helper, reused server-side via a parallel Python implementation or via the API) reports missing high-weight fields, the BackgroundTask emits one `question` turn per missing field, with `{field, prompt, input_type, options?}` shaped for chip / stepper / text input. Question turns stop once completeness clears the threshold. (issue #20 §Implementation outline Phase E)
- [ ] **LLM-04**: The `CompletenessCard` shipped in v0.5 RID-03 remains as a passive read-only progress indicator on `/recipes/[id]` (no behavior change). Authoritative question-asking now lives in the thread; the card and the in-thread `question` turns reference the same `recipe-completeness.ts` helper for consistency. (PROJECT.md §Validated v0.5 RID-03)

### MIGRATION — Cutover & cleanup

- [ ] **MIGRATION-01**: The Alembic migration that adds `recipe_turns` + `manually_edited_fields` and drops `source_capture` runs cleanly on prod-shape data (1 household, 21+ seeded recipes, mixed capture surfaces). Migration is reversible via `alembic downgrade -1` for safety, even though MVP posture authorizes the forward cut. (CLAUDE.md MVP posture · Railway `alembic upgrade head` invariant)
- [ ] **MIGRATION-02**: The idempotent `uv run seed` CLI is updated to use the new thread model — each seeded recipe gets one initial turn matching its legacy capture surface, plus a representative `summary` system turn. `grep -rn "source_capture" backend/` returns zero matches after the change. (v0.2.1 TEST-01 idempotency contract carried forward)

---

## Out of Scope

Explicit v0.6 cuts. Reasons attached to prevent re-adding mid-milestone.

- **gh#23 (photo cache bug)** — independent fix on current `main`; orthogonal to the thread model and ships separately.
- **Push notifications for post-promotion advisories** — `TODO(productize)`; v0.6 relies on the new `turn.created` WebSocket event only. Productize-later debt.
- **Thread editing or deletion of past turns** — append-only per ADR-0001. Revisit only if real user need surfaces.
- **Thread search / filtering UI** — corpus is too small at couple-scale; deferred.
- **Voice-modify (in-thread voice turn re-applying the LLM to refine an existing field)** — already implicit in the thread's full-re-read model; no separate UI surface needed in v0.6. The voice-modify capability from v0.1 CAPTURE-* is implicit in DETAIL-01.
- **Backfill audit / migration dry-run tooling** — covered structurally by the reversible Alembic migration (MIGRATION-01); no separate tooling.
- **Per-member thread attribution (who emitted each turn)** — `sender` is `user` vs `system` only in v0.6; attributing user turns to a specific household member is a productize-later concern.

---

## Future Requirements

Deferred from v0.6 by explicit decision; revisited in v0.7 or later.

- **v0.4 HUMAN-UAT cleanup** — 15 items across phases 16/17/18/19/21 (Playwright suites against live dev stack, Web Push round-trip on both iPhones, manual UX exercise of failed-state inbox + 4-state Notifications Card). Orthogonal to feature work; tracked via `/gsd-audit-uat`.
- **Pillar 6 deficit pass continuation** — 0/14 surfaces scored 4/4 in v0.3; v0.4 + v0.5 + v0.6 incremental work hasn't been formally re-scored. Candidate for a future audit-style milestone.
- **In-thread cooking-log / vote-history projection** — could surface "cooked twice this month" or "validated by [member]" as system turns. Not in v0.6.

---

## Traceability

Filled by `gsd-roadmapper` 2026-05-13 from `.planning/ROADMAP.md`. Coverage: 23/23 v0.6 requirements mapped to exactly one phase. No orphans, no duplicates.

| Requirement | Phase | Status |
|-------------|-------|--------|
| THREAD-01 | Phase 25 — Backend foundation | Pending |
| THREAD-02 | Phase 25 — Backend foundation | Pending |
| THREAD-03 | Phase 25 — Backend foundation | Pending |
| THREAD-04 | Phase 25 — Backend foundation | Pending |
| TURN-01 | Phase 26 — Thread API & realtime | Pending |
| TURN-02 | Phase 26 — Thread API & realtime | Pending |
| TURN-03 | Phase 26 — Thread API & realtime | Pending |
| TURN-04 | Phase 26 — Thread API & realtime | Pending |
| CAPTURE-01 | Phase 27 — Conversational capture screen | Pending |
| CAPTURE-02 | Phase 27 — Conversational capture screen | Pending |
| CAPTURE-03 | Phase 27 — Conversational capture screen | Pending |
| CAPTURE-04 | Phase 27 — Conversational capture screen | Pending |
| DETAIL-01 | Phase 28 — Recipe-detail thread | Pending |
| DETAIL-02 | Phase 28 — Recipe-detail thread | Pending |
| DETAIL-03 | Phase 28 — Recipe-detail thread | Pending |
| DETAIL-04 | Phase 28 — Recipe-detail thread | Pending |
| DETAIL-05 | Phase 28 — Recipe-detail thread | Pending |
| LLM-01 | Phase 29 — LLM prompt rework + completeness wire-up | Pending |
| LLM-02 | Phase 29 — LLM prompt rework + completeness wire-up | Pending |
| LLM-03 | Phase 29 — LLM prompt rework + completeness wire-up | Pending |
| LLM-04 | Phase 29 — LLM prompt rework + completeness wire-up | Pending |
| MIGRATION-01 | Phase 25 — Backend foundation | Pending |
| MIGRATION-02 | Phase 25 — Backend foundation | Pending |

**Coverage validation:**
- Total v0.6 requirements: 23 (THREAD × 4 + TURN × 4 + CAPTURE × 4 + DETAIL × 5 + LLM × 4 + MIGRATION × 2)
- Mapped to phases: 23 ✓
- Orphans: 0
- Duplicates: 0

**Per-phase requirement counts:**
- Phase 25 (Backend foundation): 6 reqs — THREAD × 4 + MIGRATION × 2
- Phase 26 (Thread API & realtime): 4 reqs — TURN × 4
- Phase 27 (Conversational capture screen): 4 reqs — CAPTURE × 4
- Phase 28 (Recipe-detail thread): 5 reqs — DETAIL × 5
- Phase 29 (LLM prompt rework + completeness wire-up): 4 reqs — LLM × 4

**Note on count discrepancy:** The header originally read "22 requirements across 5 categories"; the actual count is 23 across 6 categories (MIGRATION is its own category, distinct from THREAD/TURN/CAPTURE/DETAIL/LLM). Header corrected in this update.

---

*Defined 2026-05-13. 23 requirements across 6 categories. Design locked via ADR-0001; phase mapping derived by `gsd-roadmapper` continues from v0.5 → starts at Phase 25.*
