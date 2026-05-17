# Phase 29: LLM prompt rework + completeness wire-up - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild the Gemini-call layer around the full ordered thread + the pinned-field set, fill the `process_thread_turn(recipe_id, turn_id)` stub left at `backend/app/services/llm.py:740` by Phase 26 D-21, and emit `summary` / `question` / `advisory` system turns from BOTH `promote_draft` (initial capture) and `process_thread_turn` (refinement). Wire the Phase 27 `summary_complete` / `summary_later` button stubs (deferred from Phase 28). `CompletenessCard` on `/recipes/[id]` stays unchanged (passive read-only indicator per LLM-04).

Concretely:

- **LLM-01** — Replace the per-surface `extract_from_transcript` / `extract_from_photos` calls inside `promote_draft` and the no-op `process_thread_turn` body with ONE Gemini call that receives the full ordered thread + the pinned-field set in context. One call per LLM-triggering turn; full thread re-read every run. Single source for the prompt-builder lives in `services/llm.py` (a new `_build_thread_prompt(thread: list[RecipeTurn], pinned: set[str]) -> str` helper).
- **LLM-02** — After Gemini returns the extracted recipe, server-side diff each AnswerField against `recipes.manually_edited_fields`. For each pinned field where the extracted value DIFFERS, emit ONE `advisory` turn with `{field, current_value, proposed_value, reason_excerpt}`. The pinned `recipes.<field>` is NOT overwritten — that's the user's job via "Mettre à jour" (Phase 28 D-17). De-dup against existing open advisories per field.
- **LLM-03** — After applying non-conflicting fields, call the new `backend/app/services/completeness.py` Python parallel of `frontend/lib/recipe-completeness.ts` to identify the highest-priority missing field (by `FIELD_KEYS` order). Emit ONE `question` turn for that single field with the locked French prompt string + `input_type` per the per-field map. Skip emission if an unanswered question for the same field already exists.
- **LLM-04** — Don't touch `CompletenessCard` (`frontend/app/recipes/[id]/page.tsx` mount + `frontend/components/CompletenessCard.tsx`). Both card and in-thread questions reference the same helper — the card stays passive, the chat is now authoritative for question-asking.
- **Phase 27 summary CTA wire-up (deferred from Phase 28)** — Wire the visual stubs in `frontend/components/RecipeThread/SystemBubble.tsx:74-84` for `summary_complete` (= "Oui, compléter") and `summary_later` (= "Plus tard"). These gate question emission via a new per-recipe flag.

**Explicitly out of scope** (deferred to other phases / productize-later):
- Pin marginalia rendering, auto-pin diff on PUT, chip/stepper/advisory CTA wire-up — Phase 28 owns all of these (read-side consumer of Phase 29's emissions).
- Push notifications for post-promotion advisories — REQUIREMENTS.md §Out of Scope, productize-later.
- Per-member turn attribution — REQUIREMENTS.md §Out of Scope.
- Re-running the prompt against legacy backfilled url turns (Phase 25 D-03 — those stay un-extracted forever).
- Question turns for `seasonality` and `tags` — out of the 11-field eligible set (D-09). System defaults / optional fields don't trigger chat prompts.
- Question turns for `ingredients` and `steps` — list fields don't fit chip/stepper/text input naturally; user edits these via the form (D-10).

</domain>

<decisions>
## Implementation Decisions

### Full-thread Gemini prompt + idempotency (LLM-01)

- **D-01:** **Server-side diff is the canonical conflict-detection mechanism — NOT Gemini structured output.** Gemini returns the standard `GeminiExtractedRecipe` shape (extended only with `summary_body: str` per D-05). After parsing, the BackgroundTask iterates `AnswerField` keys, compares extracted value vs current row value, and gates emission on `field in recipes.manually_edited_fields`. Single Gemini call per LLM-triggering turn. Deterministic, no schema-vs-pinned-instruction reliability bet on Gemini. Locks the "one call per Enregistrer" rule from PROJECT.md.
- **D-02:** **Thread serialized as role-labeled French prose, NOT JSON.** Format per turn: `USER (text): {payload.text}` / `USER (voice): {payload.transcript}` / `USER (url): {payload.url}` / `USER (photo): [photo content embedded as image part]` / `USER (answer {field}): {value}` / `SYSTEM (summary): {payload.body}` / `SYSTEM (question {field}): {payload.prompt}` / `SYSTEM (advisory {field}): {current_value} → {proposed_value}`. Pinned-field set appended as a parenthetical at the end: `CHAMPS ÉPINGLÉS (ne modifie ces valeurs que si le fil les contredit explicitement — sinon, conserve la valeur actuelle): cuisine=italien, difficulty=easy`. Reads naturally for Gemini's chat-tuned mode; richer signal than JSON for the conversational context. Photo content stays as binary parts (`types.Part.from_bytes`) alongside the prose prompt text — same pattern as today's `extract_from_photos` at `services/llm.py:255`.
- **D-03:** **Idempotency = same extracted fields, summary body may vary; de-dup summary turns by extraction hash.** Re-saving the same thread runs Gemini again. If the parsed `GeminiExtractedRecipe` is byte-identical to the previous run's output (computed via `hashlib.sha256(extracted.model_dump_json(sort_keys=True).encode()).hexdigest()`), do NOT emit a new summary turn — the BackgroundTask returns early after applying fields (which are naturally idempotent via `_apply_extracted` setattr overwrite). If extraction differs (Gemini stochasticity on prose fields like description / title), emit a new summary turn. Hash stored in the most recent `summary` turn's payload as `extraction_hash: str` for fast lookup. Verifies SC-1 ("re-saving the same thread twice produces the same `summary`") via "no new turn rows on re-save."
- **D-04:** **Keep `gemini-2.5-flash`.** Same model as today (`services/llm.py:220`). Flash handles ~1M token context — plenty for the 5-50 turn couple-scale corpus. ~10x cheaper than Pro per call. No upgrade unless conversational refinement quality is visibly degraded post-ship (productize-later).

### Summary turn shape + emission timing (LLM-01)

- **D-05:** **`summary.payload.body` = Gemini-generated conversational diff in French.** Extend `GeminiExtractedRecipe` with `summary_body: str = Field(..., max_length=240)` — Gemini emits a 1-2 sentence French recap of what changed (refinement turn) or what was extracted (initial promote). The prompt instructs: `"Le champ summary_body doit décrire en français en 1-2 phrases ce qui a été extrait ou modifié par rapport au tour précédent. Maximum 240 caractères."` The BackgroundTask copies `extracted.summary_body` into `summary.payload.body` verbatim. For initial promote (no previous extraction to diff against), the prompt phrasing naturally produces "J'ai extrait la recette : …" without a special-case branch.
- **D-06:** **`summary.payload.chips` = field-name + value strings for fields that CHANGED this turn.** Format per chip: `"{french_field_label}: {value}"` (e.g., `["cuisine: italien", "protéine: poisson"]`). For initial `promote_draft`: chips show ALL extracted scalar fields (cuisine / mood / difficulty / prep_time / servings / main_protein) that have non-null values. For `process_thread_turn`: chips show ONLY fields where the extracted value differs from the previous `recipes.<field>` value AND was successfully applied (excludes advisory-blocked fields — those have their own turn). The French field labels reuse `frontend/lib/enum-labels.ts`'s mapping mirrored server-side in a new `_FIELD_LABELS_FR` dict in `services/completeness.py` (drift = bug category, locked-vocabulary discipline).
- **D-07:** **`summary` emitted on every LLM-triggering turn that produces a new extraction.** `promote_draft` emits one summary at the end of its successful path (text/voice/photo/url branches). `process_thread_turn` emits one summary at the end of its body, gated by D-03's idempotency check (skip if extraction hash matches the prior summary's hash). Skip emission entirely if BOTH no fields changed AND no advisories were emitted AND extraction hash matches — the LLM ran but said nothing new.
- **D-08:** **`summary_complete` / `summary_later` CTAs gate question emission per recipe.** Add new column `recipes.questions_deferred_until: timestamp | null` (nullable; default null = questions allowed). "Oui, compléter" (`summary_complete`) → POST `/recipes/{id}/turns` with `kind="answer"`-like payload OR a dedicated `POST /recipes/{id}/questions/trigger` endpoint that synchronously emits the next question turn (planner picks the endpoint shape — recommend dedicated endpoint for clean semantics, avoids overloading the answer-turn writer). "Plus tard" (`summary_later`) → POST `/recipes/{id}/questions/defer` setting `questions_deferred_until = now() + interval '24 hours'`. Both LLM bodies check `recipes.questions_deferred_until > now()` before emitting questions — if true, skip. The deferral auto-expires after 24h so the user re-engages naturally on the next session. Frontend SystemBubble.tsx wires `onClick` for both buttons to call the corresponding endpoint via `api()` helper.

### Question turns: shape, policy, server-side completeness (LLM-03)

- **D-09:** **Eligible field set = the 11-field RID-03 set from `frontend/lib/recipe-completeness.ts:FIELD_KEYS`.** That's: `title`, `description`, `ingredients`, `steps`, `prep_time_minutes`, `cook_time_minutes`, `servings`, `difficulty`, `cuisine`, `mood`, `main_protein`. Aligns 1:1 with `CompletenessCard` per LLM-04. Excludes `seasonality` (system-defaulted to all four seasons) and `tags` (free-form, low-signal). Server-side `compute_completeness()` exposes the same 11 keys.
- **D-10:** **Input type per field (Gemini does not pick; the server emits a deterministic map):**
  - **chip-single:** `cuisine`, `difficulty`, `main_protein` — single-select from locked vocab. `options[]` populated from `_VALID_CUISINES` / `_VALID_DIFFICULTIES` / `_VALID_PROTEINS` (mirror of `schemas/recipe_turn.py:47-58`). `multi: false`.
  - **chip-multi:** `mood` — multi-select from locked vocab. `options[]` from `_VALID_MOODS`. `multi: true`.
  - **stepper:** `prep_time_minutes`, `cook_time_minutes`, `servings` — per Phase 28 D-13/D-14 (5-min step for times, 1 for servings, init=0, servings floor=1).
  - **text:** `title`, `description` — free-form short text.
  - **SKIP (no question emitted):** `ingredients`, `steps` — list-of-string fields with no good chat input affordance. User must complete these via the edit form. The completeness helper still flags them missing, the CompletenessCard still shows them as missing chips, but `process_thread_turn` skips question emission for these two keys.
- **D-11:** **One question per LLM run, highest-priority missing field.** After `_apply_extracted` + advisory emission, call `compute_completeness(recipe)`. Iterate `missing_fields[]` in order; pick the FIRST field that is BOTH (a) eligible for question emission (D-10 skip list excludes ingredients/steps) AND (b) does not already have an unanswered `question` turn later in the thread. Emit ONE `question` turn for that field. Priority order = `FIELD_KEYS` literal order in `recipe-completeness.ts` (title → description → ingredients → steps → prep_time_minutes → cook_time_minutes → servings → difficulty → cuisine → mood → main_protein). If all eligible fields are filled or covered by open questions, emit no question turn. Conversational pacing.
- **D-12:** **De-dup rule for question emission:** "Unanswered question for field X" = there exists an earlier `question` turn in `turns[]` with `payload.field == X` AND NO later `user` turn with `kind == "answer"` and `payload.in_reply_to_turn_id == that_question.id`. Resolved questions (the user answered) DO allow re-emission if the field becomes empty again. Computed server-side at emission time with one DB query per LLM run.
- **D-13:** **Question payload shape (locks Phase 27 SystemBubble.tsx read contract + Phase 28 D-12 multi field):** `QuestionTurnPayload` graduates from Phase 25 stub to:
  ```python
  class QuestionTurnPayload(BaseModel):
      kind: Literal["question"]
      field: AnswerField  # reused from schemas/recipe_turn.py:28
      prompt: str  # French prompt string, locked per field (see D-14)
      input_type: Literal["chip", "stepper", "text"]
      options: list[str] = Field(default_factory=list)  # empty for stepper/text
      multi: bool = False  # only meaningful for chip; defaults to False per Phase 28 D-12
  ```
- **D-14:** **Locked French prompt strings per field — single source in `services/completeness.py`:**
  - `title` → "Quel est le titre de cette recette ?"
  - `description` → "En une phrase, comment décrirais-tu cette recette ?"
  - `prep_time_minutes` → "Combien de minutes de préparation ?"
  - `cook_time_minutes` → "Combien de minutes de cuisson ?"
  - `servings` → "Pour combien de personnes ?"
  - `difficulty` → "Quel niveau de difficulté ?"
  - `cuisine` → "Quelle cuisine ?"
  - `mood` → "Quelle ambiance ?"
  - `main_protein` → "Quelle protéine principale ?"
  - (`ingredients` and `steps` never emitted per D-10.)
  The locked strings live in a `_FIELD_PROMPTS_FR: dict[FieldKey, str]` constant — drift between this dict and the chat UX is a bug category. Plan-phase decides whether to also expose these to `frontend/lib/i18n/fr.json` (the chat renders `payload.prompt` directly so duplication is optional; recommend skipping the i18n round-trip).
- **D-15:** **`backend/app/services/completeness.py` (NEW MODULE) — parallel Python port of `frontend/lib/recipe-completeness.ts`.** Exposes:
  - `FieldKey = Literal[…]` matching the 11-field TS union byte-for-byte
  - `FIELD_KEYS: tuple[FieldKey, …]` preserving evaluation order
  - `is_field_filled(recipe: Recipe, key: FieldKey) -> bool` matching the strict non-empty rule (string trim+non-empty, number not-null, list len>0 — RID-03 D-18)
  - `compute_completeness(recipe: Recipe) -> tuple[int, list[FieldKey]]` returning `(percent, missing_fields)` mirroring the TS API shape
  - `INPUT_TYPE_MAP: dict[FieldKey, Literal["chip", "stepper", "text"] | None]` per D-10 (None = skip emission)
  - `_FIELD_PROMPTS_FR` per D-14
  - `_FIELD_LABELS_FR` per D-06 (chip labels)
  - `OPTIONS_MAP: dict[FieldKey, list[str]]` for chip-typed fields (lookups into the existing `_VALID_*` frozensets in `schemas/recipe_turn.py`)
  
  Locked-vocabulary discipline applies — drift between this module and `frontend/lib/recipe-completeness.ts` is a bug category per CLAUDE.md §"Locked vocabularies". Same atomic-change rule as TurnKind / TurnSender / AnswerField.

### Advisory emission rules (LLM-02)

- **D-16:** **Conflict = strict equality after type-normalize.** Per field type:
  - **Strings** (`title`, `description`): `(current or "").strip() != (proposed or "").strip()` — case-sensitive.
  - **Enums** (`cuisine`, `difficulty`, `main_protein`): literal inequality (`current != proposed`). `'italian' != 'french'`.
  - **Numbers** (`prep_time_minutes`, `cook_time_minutes`, `servings`): integer inequality. `30 != 35` even if both are "about half an hour". No rounding tolerance.
  - **Unordered lists** (`mood`, `seasonality`): set inequality (`set(current or []) != set(proposed or [])`).
  - **Ordered lists** (`ingredients`, `steps`, `tags`): positional inequality. For `ingredients`, dict-element equality on the `{name, quantity, unit}` shape.
  
  Mirrors Phase 28 D-09's "blank" predicate philosophy (strict, type-aware). Defined in `services/completeness.py:is_conflict(field, current, proposed) -> bool` (NEW helper) so the predicate has a single source.
- **D-17:** **`reason_excerpt` = short literal slice of the most recent user turn that COULD have introduced the change.** Walk `turns[]` backward from the current LLM-triggering turn position. Stop at the first `user`-sender turn. Extract text per kind:
  - `text`: `payload.text[:120]`
  - `voice`: `payload.transcript[:120]`
  - `url`: f"extrait de {payload.url[:100]}"
  - `photo`: "extrait de la photo" (fixed string — photos have no text)
  - `answer`: f"tu as répondu : « {payload.value} »" (rare path — answer turns don't trigger Gemini per Phase 26 D-11, but defensive fallback covers refinement chains)
  
  Truncate to 120 chars; strip newlines. Wrap in « » when emitted into `payload.reason_excerpt` so the SystemBubble renders quoted text. Zero extra Gemini calls; deterministic; reads natural in the chat (« parce que tu as dit : "non en fait c'est aux courgettes" »). Helper `_extract_reason_from_thread(turns: list[RecipeTurn], current_pos: int) -> str` in `services/llm.py`.
- **D-18:** **De-dup: suppress emission if an OPEN advisory for the same field already exists.** Before emitting an advisory for field X with proposed value V:
  1. Scan `turns[]` for the most recent `advisory` turn with `payload.field == X`.
  2. If found, check resolution: scan for a later `user` turn with `kind in {proposal_accepted, proposal_dismissed}` and `payload.in_reply_to_turn_id == that_advisory.id`.
  3. If unresolved (no resolution turn) → SUPPRESS. The user has not yet decided; don't pile up duplicate advisories.
  4. If resolved AND the prior advisory's `payload.proposed_value == V` → SUPPRESS. User already decided on this exact proposal.
  5. If resolved AND `proposed_value != V` → EMIT. It's a new conflict with a different proposed value.
  
  Matches the resolution-lookup logic Phase 28 D-19 already builds for the visual collapse — same `turns[]` walk pattern, different action. Helper `_should_emit_advisory(turns, field, proposed_value) -> bool` in `services/llm.py`.
- **D-19:** **Emit advisories for all 13 AnswerField keys (no skip list).** Any pinned field with a conflicting extraction value gets an advisory. No carve-out for lists, no carve-out for free-text. The user's pin is sacred; the user always sees when the LLM disagrees. Pipeline noise managed by D-18 de-dup, not by skip rules.

### Wire-up of summary CTAs (Phase 27 deferred stubs)

- **D-20:** **New endpoints:**
  - `POST /recipes/{id}/questions/trigger` — synchronously emits the next missing-field question via the same logic as `process_thread_turn` D-11 (calls `compute_completeness` → picks highest-priority eligible missing field → emits ONE `question` turn). Returns 201 with the emitted `TurnResponse`. Used by `summary_complete` button. 404 cross-household. Idempotent: if no eligible missing field, returns 204 No Content with empty body.
  - `POST /recipes/{id}/questions/defer` — sets `recipes.questions_deferred_until = now() + interval '24 hours'`, commits, broadcasts `recipe.updated`. Returns 204 No Content. Used by `summary_later` button.
  
  Both endpoints under the existing `/recipes` router prefix; planner can promote to a new `routers/questions.py` if surface grows. Recommend keeping in `recipes.py` for v0.6.
- **D-21:** **New migration:** add column `recipes.questions_deferred_until: timestamp | null` (NULL default). Phase 29's Alembic migration. NO backfill needed (NULL = "not deferred"). Drop-on-downgrade.
- **D-22:** **Frontend wire-up in `SystemBubble.tsx` summary branch:**
  - `summary_complete` button → `onClick` calls `api('/recipes/{id}/questions/trigger', { method: 'POST' })` → optimistic UI: dim the button until response lands; on 201, the new question turn arrives via the `turn.created` WS subscription (already in place per Phase 28 D-19). On 204, render a small toast "Tout est complet."
  - `summary_later` button → `onClick` calls `api('/recipes/{id}/questions/defer', { method: 'POST' })` → optimistic UI: dim both buttons; on 204, collapse the summary CTAs (similar to Phase 28 D-19 advisory collapse) by adding a `deferred?: boolean` prop derived from the page-level recipe.questions_deferred_until field.

### Claude's Discretion (planner / researcher decides)

- **Prompt builder location** — inline in `services/llm.py` as `_build_thread_prompt(...)` helper OR new `services/llm_prompt.py` module. Recommend inline next to `_EXTRACT_PROMPT_VOICE` for visual symmetry with the existing prompt constants. Promote later if the prompt grows multi-section.
- **Test mode bypass** — extend `if settings.environment == "test":` guards inside the new thread-extraction path. Add `canned_thread_extract(turns, pinned)` to `llm_fixtures.py` returning deterministic `GeminiExtractedRecipe + summary_body`. Match the existing fixture pattern.
- **Backend AnswerField → French label map duplication** — `_FIELD_LABELS_FR` in `services/completeness.py` mirrors `frontend/lib/enum-labels.ts`. Locked-vocabulary discipline applies. Planner picks whether to consolidate via a generated file OR keep two hand-maintained sources (recommend hand-maintained — small dict, infrequent change).
- **Photo content in thread prompt** — when a `user` turn has `kind == "photo"`, the prose line reads `USER (photo): [voir image n°{i}]` and the actual photo bytes are appended as `types.Part.from_bytes(...)` parts alongside the prompt text. Multiple photo turns across the thread → multiple image parts. Planner decides token budget cap (recommend max 4 photos total per Gemini call — matches existing `extract_from_photos` limit at `services/llm.py:271`).
- **Migration filename** — follow Alembic `00NN_*.py` pattern (next is likely `0011_add_questions_deferred_until.py`).
- **Tests** — pytest coverage for: (a) `compute_completeness` parity with TS helper (port the TS unit tests verbatim); (b) prompt-builder shape per turn kind; (c) advisory de-dup against open advisories; (d) question emission picks highest-priority missing field; (e) summary hash idempotency (re-run with same thread emits no second summary); (f) defer endpoint silences question emission for 24h; (g) trigger endpoint returns 204 when complete. Playwright e2e: summary CTA wire-up (tap "Oui, compléter" → new question turn appears; tap "Plus tard" → no question turn appears on next refinement).
- **`process_thread_turn` async vs sync** — Phase 26 D-21 left it sync. If the new body uses `async` libraries (e.g., async DB queries or `httpx` for an external lookup), planner can convert to `async def` — `BackgroundTasks.add_task` accepts both, no callsite change.
- **Hash storage location** — D-03 stores `extraction_hash` in the most recent `summary` turn's payload. Planner could also denormalize onto a new `recipes.last_extraction_hash` column for fast lookup (no DB row scan per LLM run). Recommend payload storage (zero schema change beyond `questions_deferred_until`); promote to column if a hot read path emerges.
- **Failure mode for `process_thread_turn`** — if Gemini fails mid-rebuild, follow `_record_failure` pattern (truncate exc to 500 chars, `status` UNCHANGED — the recipe is already structured, only this refinement failed). Phase 26 already shipped `_record_turn_enrichment_failure` for url turns (`services/llm.py:534`) — recommend reuse / extension over a parallel "thread enrichment failure" helper. Surface error on the `summary` turn payload as `error: str` so the chat can render a "L'IA n'a pas pu traiter ce tour" badge (planner can defer this to a follow-up phase if scope balloons).
- **Initial promote vs refinement code path** — keep two distinct entry points (`promote_draft` and `process_thread_turn`) but extract common logic (prompt build, Gemini call, server-diff, advisory emit, completeness + question emit, summary emit) into shared helpers in `services/llm.py`. Recommend a shared `_run_thread_llm(db, recipe, trigger_turn_id) -> None` body that both wrappers call after their kind-specific preamble (text title-rewrite, photo bytes download, url extraction wait).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Milestone-level design
- `docs/adr/0001-recipe-conversation-thread.md` — Recipe conversation thread architecture: §"Why" (LLM context = full thread re-read; advisory as informational, not modal); §"Consequences" (the LLM prompt receives the pinned-field set so it can flag conflicts; new turn kinds `summary` / `question` / `advisory`; the 4 per-surface promotion functions collapse into one). Phase 29 implements the LLM-side of these consequences.
- `.planning/REQUIREMENTS.md` §LLM-01..04 — 4 requirements anchored to Phase 29 (full-thread Gemini call, advisory emission on conflict, question emission from missing high-weight fields, CompletenessCard unchanged).
- `.planning/ROADMAP.md` §"Phase 29: LLM prompt rework + completeness wire-up" — goal, 4 success criteria, invariants touched (#1 capture pipeline shape evolution; #5 raw inputs preserved via `recipe_turns`).
- `.planning/PROJECT.md` §"Current Milestone: v0.6" — locked LLM trigger table (text/voice/photo/url → Gemini; answer → direct + pin; proposal_* → pure state); one Gemini call per Enregistrer; full thread re-read every run (natural idempotency).

### Prior phases (must read for forward-compat contracts)
- `.planning/phases/25-backend-foundation/25-CONTEXT.md` — D-06/D-07 (`promote_draft` signature + scope split: Phase 25 applies extracted fields + broadcasts; Phase 29 ADDS summary/question/advisory emission), D-08/D-10 (photo turn payload `{photo_paths}` consumed by Phase 29 prompt-builder for photo turns inside thread), D-13/D-15 (TurnKind / TurnPayload discriminated union — Phase 29 graduates SummaryTurnPayload + QuestionTurnPayload stubs to typed models).
- `.planning/phases/26-thread-api-realtime/26-CONTEXT.md` — D-08 (AnswerField 13-field whitelist consumed by Phase 29 advisory + question emission), D-17 (`AdvisoryTurnPayload` shape locked — Phase 29 is the FIRST WRITER of this payload, must respect the read-side contract), D-21 (`process_thread_turn(recipe_id, turn_id)` signature locked — Phase 29 fills the body without changing signature or callsite), D-22 (dispatch matrix — Phase 29 doesn't change which kinds schedule which task; only fills the function bodies).
- `.planning/phases/27-conversational-capture-screen/27-CONTEXT.md` — `frontend/components/RecipeThread/SystemBubble.tsx` is the read-side contract for `summary` / `question` / `advisory` payloads. Phase 27 D-14 deferred `summary_complete` / `summary_later` button wiring to Phase 28; Phase 28 deferred it again to Phase 29 — Phase 29 owns this wiring per D-20/D-22.
- `.planning/phases/28-recipe-detail-thread/28-CONTEXT.md` — D-12 (`multi: bool` field in question payload locked — Phase 29 emits it per D-13), D-13/D-14 (stepper config 5-min/1-serving/init=0/servings floor=1 — Phase 29's emitted stepper questions must fit), D-15 (Valider button wraps all chip/stepper answers), D-17/D-18 (advisory CTA handlers POST `proposal_accepted` / `proposal_dismissed` referencing the advisory's `id`), D-19 (advisory resolution-collapse visual — Phase 29's de-dup logic D-18 mirrors this same turns[] walk).

### Architecture invariants
- `CLAUDE.md` §"Architecture invariants" #1 (capture pipeline — Phase 29 completes the v0.6 shape: `promote_draft(id)` from Phase 25 now reads from `recipe_turns` AND emits system turns alongside the recipe update), #4 (realtime — `turn.created` already broadcasts for system turns per Phase 26 D-06; Phase 29's emitted summary/question/advisory turns ride this existing channel), #5 (raw inputs — every LLM-triggering refinement turn is durably preserved in `recipe_turns` per Phase 25; Phase 29 re-reads the full thread on every run, satisfying the "re-extraction with a better model later" goal of #5).
- `CLAUDE.md` §"MVP phase posture" — clean writes. The `SummaryTurnPayload` and `QuestionTurnPayload` Phase 25 stubs are REPLACED atomically in Phase 29 with the typed models per D-13. No compat shim. The new `recipes.questions_deferred_until` column is the only schema addition (single Alembic migration per D-21).
- `CLAUDE.md` §"Locked vocabularies" — `services/completeness.py` is a NEW locked-vocabulary surface: `FIELD_KEYS`, `INPUT_TYPE_MAP`, `_FIELD_PROMPTS_FR`, `_FIELD_LABELS_FR`, `OPTIONS_MAP`. Drift between this module and `frontend/lib/recipe-completeness.ts` (or `frontend/lib/enum-labels.ts`) is a bug category. Plan-phase enforces a `grep` gate that compares the TS `FIELD_KEYS` array against the Python tuple byte-for-byte.
- `CLAUDE.md` §"Gemini SDK" — Phase 29 stays on `google-genai` (the unified SDK). The new prompt-builder uses `types.GenerateContentConfig` per existing pattern.
- `frontend/AGENTS.md` — Next.js 16 breaking changes; consult `frontend/node_modules/next/dist/docs/` before writing frontend code for the summary CTA wire-up.
- `docs/design-system.html` — Sober Kitchen tokens; the chat bubble register already locked in Phase 27. Phase 29 doesn't introduce new visual tokens.

### Code surfaces touched by this phase

#### Backend (the bulk of Phase 29)
- `backend/app/services/llm.py:740` `process_thread_turn` — Phase 29's PRIMARY edit target. Replace the no-op stub body with the full-thread Gemini call + server diff + advisory/question/summary emission. Signature unchanged per Phase 26 D-21.
- `backend/app/services/llm.py:588` `promote_draft` — extend EACH branch (text / voice / photo / url) to call the shared `_run_thread_llm` body after the existing kind-specific work (title rewrite for text; extract_from_transcript / extract_from_photos for voice / photo; URL wait for url). The shared body owns summary/question/advisory emission so initial captures land in the chat with the same UX as refinement turns.
- `backend/app/services/llm.py` NEW helpers:
  - `_build_thread_prompt(thread: list[RecipeTurn], pinned: set[str]) -> str + list[types.Part]` — D-02 prompt format.
  - `_run_thread_llm(db: Session, recipe: Recipe, trigger_turn_id: UUID) -> None` — shared body (D-23 Claude's Discretion).
  - `_extract_reason_from_thread(turns: list[RecipeTurn], current_pos: int) -> str` — D-17 reason builder.
  - `_should_emit_advisory(turns: list[RecipeTurn], field: AnswerField, proposed_value: Any) -> bool` — D-18 de-dup.
  - `_extraction_hash(extracted: GeminiExtractedRecipe) -> str` — D-03 idempotency hash.
- `backend/app/services/llm.py:129` `GeminiExtractedRecipe` — extend with `summary_body: str = Field(..., max_length=240)` per D-05. Backward-compat: legacy `extract_from_transcript` / `extract_from_photos` callers (only `promote_draft` today) MUST accept the new required field; the catchy-title prompt already produces French prose so the new summary_body request fits naturally.
- `backend/app/services/llm.py:183-209` prompt constants — add NEW `_EXTRACT_PROMPT_THREAD` constant containing the full-thread instructions (full extraction + summary_body sentence + pinned-field discipline). Keep existing `_EXTRACT_PROMPT_VOICE` / `_EXTRACT_PROMPT_PHOTOS` (still used by isolated extract_from_* callers IF they survive the refactor — likely both go away in Phase 29 since `_run_thread_llm` subsumes them).
- `backend/app/services/completeness.py` (NEW MODULE) — D-15 server-side completeness parallel.
- `backend/app/schemas/recipe_turn.py:204-211` `SummaryTurnPayload` + `QuestionTurnPayload` — graduate the Phase 25 stubs to typed models per D-05 and D-13.
- `backend/app/routers/recipes.py` — add two new endpoints per D-20:
  - `POST /recipes/{id}/questions/trigger`
  - `POST /recipes/{id}/questions/defer`
- `backend/app/models/recipe.py` — add `questions_deferred_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)` column per D-21.
- `backend/app/schemas/recipe.py` — `RecipeResponse` exposes the new `questions_deferred_until` field so the frontend can derive the "deferred?" prop for SystemBubble.
- `backend/alembic/versions/0011_*.py` (NEW) — D-21 migration. Adds `recipes.questions_deferred_until`. Drop on downgrade.
- `backend/app/services/llm_fixtures.py` — add `canned_thread_extract(turns, pinned)` per Claude's Discretion (test mode bypass).
- `backend/tests/test_llm_thread.py` (NEW or extension of `test_recipes.py`) — test surface per Claude's Discretion bullet `Tests`.
- `backend/tests/test_completeness.py` (NEW) — port `frontend/lib/recipe-completeness.test.ts` verbatim to ensure parity.

#### Frontend (smaller surface — summary CTA wire-up + types)
- `frontend/components/RecipeThread/SystemBubble.tsx:74-84` — wire `onClick` for `summary_complete` and `summary_later` per D-22. Add `deferred?: boolean` prop to control collapse state (derived from `recipe.questions_deferred_until`).
- `frontend/components/RecipeThread/index.tsx` — pass `deferred` prop through orchestrator. Add the two callbacks (`onSummaryComplete(turnId)` / `onSummaryLater(turnId)`) to props OR widen the single `onPostTurn` route per the planner's choice (Phase 28 D-17 left this open).
- `frontend/components/RecipeThread/types.ts` — extend `RecipeThreadProps` (detail mode) with the new callbacks.
- `frontend/app/recipes/[id]/page.tsx` — implement `handleSummaryComplete` (POST to `/questions/trigger`) and `handleSummaryLater` (POST to `/questions/defer`) callbacks, mirroring the Phase 28 D-16 optimistic POST pattern.
- `frontend/lib/recipes.ts` — extend `Recipe` type with `questions_deferred_until: string | null`.
- `frontend/lib/i18n/fr.json` — add new key `recipes.thread.all_complete` = « Tout est complet. » for the 204 No-Content toast on `summary_complete` when no missing fields remain.

### Out-of-scope (other phases own; do NOT touch in Phase 29)
- Pin marginalia rendering on detail page + edit form — Phase 28 DETAIL-04 owns.
- PUT auto-pin diff mechanism — Phase 28 DETAIL-05 owns.
- Chip / stepper / advisory CTA wire-up — Phase 28 DETAIL-02 / DETAIL-03 owns.
- `CompletenessCard` behavior — LLM-04 keeps it unchanged. Phase 29's emission feeds `recipes.<field>` and the card recomputes from those naturally; no card-side change.
- Push notifications when an advisory lands while the recipe is off-screen — productize-later (REQUIREMENTS.md §Out of Scope).
- Re-extracting legacy Phase 25 backfilled url turns — Phase 25 D-03 locks those as un-extracted forever.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`backend/app/services/llm.py:228` `extract_from_transcript`, `:255` `extract_from_photos`, `:292` `apply_voice_modification`** — existing single-turn Gemini callers. The new `_run_thread_llm` subsumes these for in-thread paths; the standalone functions may stay for backward-compat with any direct callers OR be deleted in the same change (planner's call — recommend delete if no other callers, per MVP no-shim posture).
- **`backend/app/services/llm.py:418` `_apply_extracted`** — applies parsed `GeminiExtractedRecipe` to the recipe row. Reused as-is by the thread path AFTER advisory gating (pinned-and-conflicting fields are skipped before this call; non-conflicting fields are applied normally).
- **`backend/app/services/llm.py:453` `_broadcast_promoted`** — broadcasts `recipe.promoted` after sync commit; sync-context only. The thread path uses the existing `recipe.updated` broadcast (already in place at `routers/recipes.py:378`) for non-promotion mutations. New summary/question/advisory turns ride `turn.created` per Phase 26 D-06.
- **`backend/app/services/llm.py:481` `_record_failure`, `:504` `_record_rewrite_failure`, `:534` `_record_turn_enrichment_failure`** — existing failure-recording helpers. Phase 29 reuses `_record_turn_enrichment_failure` for `process_thread_turn` failures (recipe stays structured, turn payload gets `extraction_error`). Initial promote_draft failures still go through `_record_failure` (status='failed').
- **`backend/app/services/realtime.broadcast_to_household`** — already wired; Phase 29 emits `turn.created` for each new system turn via the existing async helper used in Phase 26.
- **`backend/app/schemas/recipe_turn.py:47-58` `_VALID_*` frozensets** — locked vocabulary mirrors; the new `services/completeness.py:OPTIONS_MAP` imports from these to keep chip options drift-free.
- **`backend/app/schemas/recipe_turn.py:28` `AnswerField`** — 13-field whitelist. Phase 29's advisory emission iterates these for diff; question emission iterates the 11-field subset from `services/completeness.py`.
- **`frontend/lib/recipe-completeness.ts`** — D-15 parallel target. Pure function, easy to port. Test file at `frontend/lib/recipe-completeness.test.ts` doubles as the parity-test source.
- **`frontend/components/RecipeThread/SystemBubble.tsx:43-86, :89-156, :158-195`** — Phase 27 visual stubs for summary / question / advisory; Phase 29 EMITS into the contracts these branches consume. Pay particular attention to the `payload.body` / `payload.chips` / `payload.prompt` / `payload.input_type` / `payload.options` / `payload.current_value` / `payload.proposed_value` / `payload.reason_excerpt` keys — these are the load-bearing field names.

### Established Patterns
- **Service-layer BackgroundTask body opens its own `SessionLocal()`** — invariant #7. Phase 25 `promote_draft` and Phase 26 `extract_and_process_url_turn` both follow; Phase 29's `_run_thread_llm` follows when called from `process_thread_turn` (already-open session when called from `promote_draft`).
- **Test-mode bypass via `if settings.environment == "test":`** — universal at Gemini call sites. Phase 29 extends with `canned_thread_extract`.
- **Atomic same-transaction mutations** — invariant #3. Field writes + summary/question/advisory turn inserts happen in one transaction before commit. Same idiom as Phase 26 D-10 (answer turn = insert + apply + pin in one tx).
- **Set-semantics + sorted assignment for `manually_edited_fields`** — established in Phase 26 / Phase 28. Advisory emission DOES NOT mutate this column (pinning happens only via answer-turn or PUT-diff paths). The advisory turn is informational; the user's acceptance (Phase 28 D-17 = proposal_accepted handler) is what unpins.
- **Realtime broadcast after commit** — `turn.created` fired by the router for user turns (Phase 26) AND by service-layer system turn emitters (NEW in Phase 29). The broadcast contract is sender-generic per Phase 26 D-06 — Phase 29 just hands `TurnResponse.model_validate(turn).model_dump(mode='json')` to `broadcast_to_household`.
- **Locked-vocabulary mirroring (TS ↔ Python)** — `TurnKind` / `TurnSender` / `AnswerField` already mirrored. `FIELD_KEYS` / `INPUT_TYPE_MAP` / `_FIELD_PROMPTS_FR` join the discipline in Phase 29.

### Integration Points
- **`process_thread_turn(recipe_id, turn_id)` callsite** — already scheduled by `routers/recipes.py` POST /turns for kind in {text, voice, photo} per Phase 26 D-22, and by `extract_and_process_url_turn` at the end of its body (`services/llm.py:901`). Phase 29 fills the body; callsites are UNCHANGED.
- **`promote_draft(recipe_id)` callsite** — scheduled by all 5 initial-capture routers per Phase 25. Phase 29 extends each branch to call `_run_thread_llm` after the existing kind-specific work. Callsites are UNCHANGED.
- **`POST /recipes/{id}/questions/trigger` + `POST /recipes/{id}/questions/defer`** — NEW endpoints; mounted in `routers/recipes.py`. Frontend `summary_complete` / `summary_later` buttons call these via the `api()` helper (`frontend/lib/api.ts`).
- **`turn.created` WS event for `summary` / `question` / `advisory` turns** — Phase 26 broadcasts these via the same code path as user turns. Phase 28's orchestrator already subscribes to `turn.created` and appends. No new WS event types in Phase 29.
- **`recipe.updated` WS event for `questions_deferred_until` change** — the existing broadcast at `routers/recipes.py:378` will naturally carry the new column value when `POST /questions/defer` runs (which calls the same recipe-update + broadcast path internally). Frontend renders the "deferred" collapse state from the recipe payload.
- **`CompletenessCard` re-render** — when Phase 29 applies extracted fields (non-conflicting), the existing `recipe.updated` broadcast (from `_apply_extracted` + commit + broadcast in the shared body) drives a re-fetch on the detail page, and the card recomputes from the updated `recipes.*` columns. Zero card-side change.

</code_context>

<specifics>
## Specific Ideas

- **The Area 1 trio of decisions (server-side diff for advisories + role-labeled French prose + extraction-hash idempotency) is the load-bearing scope-tightener.** Each one keeps Phase 29 deterministic and observable: the diff is single-source server logic, the prose is greppable for debugging, the hash is a cheap idempotency primitive. Together they make the "one call per Enregistrer" PROJECT.md decision sustainable as the thread grows.
- **`summary.payload.body` coming from Gemini (D-05) is the only Gemini-prose surface in Phase 29.** Everything else is deterministic server logic. This isolation makes the failure mode obvious: if `summary_body` returns empty, fall back to a server-generated `"J'ai mis à jour {N} champs."` template (planner can spec this fallback). The advisory `reason_excerpt` (D-17) intentionally does NOT come from Gemini — it's the user's own words quoted back.
- **Question turn = one per LLM run (D-11) is the conversational-pacing decision.** Phase 28's chip-bubble UI works for 1-2 visible questions at a time; stacking 10 questions in the chat would be visually exhausting and the user would just give up. One question per run gives the user a single decision to make, which they can complete in seconds with a chip tap; the next refinement turn triggers the next question naturally.
- **The defer-24h gate (D-08, D-21) is the user's "leave me alone" lever.** Without it, every refinement turn that doesn't fill a missing field would emit a question — annoying for the user who's mid-flow on something else. 24h is long enough to disable for the session but short enough to re-engage naturally tomorrow. Productize-later: a more granular setting (per-field defer, indefinite defer) if the friction surfaces.
- **The advisory de-dup rule (D-18) is the equivalent of the question de-dup rule (D-12) on the conflict side.** Both walk `turns[]` looking for an open prior emission. This symmetry is intentional — Phase 28 D-19 already builds the resolution-lookup pattern for visual collapse, and Phase 29's emission gates reuse the same walk. ONE turns-walk pattern, three callsites (visual collapse, advisory de-dup, question de-dup). Plan-phase could extract a `_find_resolution_for_advisory(turns, advisory_id)` / `_find_answer_for_question(turns, question_id)` helper pair for symmetry.
- **The 11-field RID-03 set vs 13-field AnswerField set gap (D-09) is the deliberate alignment with the visible UI surface.** `CompletenessCard` shows 11 fields; the chat asks about the same 11. Pinning still works for the full 13 (so `answer` turns and PUT diffs can pin seasonality/tags), but the chat never NAGS about those — they're set-it-and-forget-it defaults. The gap may close in a future phase if a UX signal says users want seasonality/tags questions; for v0.6 the chat stays focused.
- **Server-side completeness as a parallel Python module (D-15) over an API round-trip** matches the architecture's principle: backend owns all mutations, frontend is a thin view. Calling the frontend helper via API would invert that. The locked-vocabulary discipline already proves the maintenance cost is manageable.
- **The Phase 27 summary CTA wire-up landing in Phase 29 (D-20, D-22) is the right placement** — the CTAs only make sense once question emission exists. Phase 28 deferred them precisely because question emission was Phase 29's job. Closing this loop here completes the "summary → questions → answers → next summary" conversational rhythm.

</specifics>

<deferred>
## Deferred Ideas

- **Question turns for `seasonality` and `tags`** — D-09 excludes from the eligible set. Could extend if user feedback shows demand. Productize-later.
- **Question turns for `ingredients` and `steps`** — D-10 skips list fields. A future "structured ingredient editor" chat component could make this viable. Productize-later.
- **Per-field defer settings** (`recipes.questions_deferred_per_field: {field: timestamp}`) — D-08 uses a single recipe-level flag. Per-field would let the user defer just `mood` while still accepting `cuisine` questions. Productize-later if friction surfaces.
- **Indefinite defer** ("never ask me again") — D-08 auto-expires after 24h. A "ne plus demander" option could set `questions_deferred_until = '9999-01-01'`. Productize-later — at couple-scale the 24h re-engagement is the right default.
- **Gemini-generated `reason_excerpt`** — D-17 uses literal user-turn quoting. A Gemini-generated rationale would be higher-quality prose but costs an extra call per conflict. Productize-later if user feedback shows the quoted-text approach is too cryptic.
- **Tolerant conflict comparison** (case-fold strings, round time fields) — D-16 uses strict equality. A tolerant mode would reduce advisory noise on cosmetic differences but risks silently overwriting user-chosen capitalization. Productize-later — tune in v0.7 if advisory noise is a complaint.
- **Skip advisories on free-text fields** (`title`, `description`) — D-19 emits for all 13 keys. Free-text fields are most likely to generate cosmetic-only conflicts. Could skip via a `_NO_ADVISORY_FIELDS = frozenset({"title", "description"})` constant if noise becomes a problem. Productize-later.
- **Multi-call Gemini orchestration** (extract, then ask Gemini for per-conflict rationale, then ask Gemini for question phrasing) — out of scope; would violate "one call per Enregistrer". Productize-later if higher prose quality becomes a milestone goal.
- **Upgrade `gemini-2.5-flash` → `gemini-2.5-pro` for refinement turns** — D-04 keeps Flash. Could split per branch if quality is visibly worse on conversational refinement. Productize-later.
- **Per-recipe `questions_deferred_until` UI surface** (a "questions paused" badge with "reprendre" button) — Phase 29 only flips the flag; the chat collapses the CTAs. A user-visible reset path is a polish item. Productize-later.
- **De-normalize `extraction_hash` onto `recipes.last_extraction_hash`** — D-03 / Claude's Discretion puts it in the summary turn payload. Could move to a column for faster lookup if hot read paths emerge. Productize-later.
- **Backend-driven question / advisory resolution detection** (denormalized index `question_id → answer_turn_id`, `advisory_id → resolution_turn_id`) — Phase 28 D-19 + Phase 29 D-12/D-18 all use client-side / server-side turns-walk. Could denormalize for scale. Couple-scale doesn't need it. Productize-later.
- **Reordering / editing past turns** — REQUIREMENTS.md §Out of Scope (append-only per ADR-0001). Phase 29 honors this strictly.
- **Push notifications for post-promotion advisories** — REQUIREMENTS.md §Out of Scope, productize-later.
- **Per-member turn attribution** — REQUIREMENTS.md §Out of Scope, productize-later.

</deferred>

---

*Phase: 29-llm-prompt-rework-completeness-wire-up*
*Context gathered: 2026-05-17*
