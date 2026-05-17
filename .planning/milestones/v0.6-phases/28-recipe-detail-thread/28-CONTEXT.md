# Phase 28: Recipe-detail thread - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the **interactive layer** of the recipe-detail thread on `/recipes/[id]` and the **pinning layer** that ties manual edits to the LLM trust boundary. Concretely:

- Attach `onClick` handlers to the Phase 27 visual stubs in `frontend/components/RecipeThread/SystemBubble.tsx`: chip / stepper / text inputs on `question` turns (DETAIL-02) and "Mettre à jour" / "Ignorer" CTAs on `advisory` turns (DETAIL-03).
- Render a per-field "épinglé" Caveat marginalia signal — derived from `recipes.manually_edited_fields` — on both the detail page (cookbook-style left-gutter marginalia at section level) and the edit form (per-field marginalia next to the label). Escalates to a destructive amber "conflit" label when an open advisory targets a pinned field (DETAIL-04).
- Add the server-side auto-pin mechanism to `PUT /recipes/{id}`: server-side diff against the current row; differing values for AnswerField keys are added to `manually_edited_fields` in the same transaction; clearing a field to blank UNPINS it (DETAIL-05).
- Confirm DETAIL-01 — the chat thread already mounts alongside the form per Phase 27 (`/recipes/[id]/page.tsx:510-521`), refinement turns already POST via the per-kind handlers, system replies already append via the `turn.created` / `turn.updated` WS subscriptions. Phase 28 inherits this contract; no rebuild.

The recipe form structure (`RecipeForm.tsx`) and the recipe-detail layout (`/recipes/[id]/page.tsx` hero + meta + ingredients + steps) are NOT restructured per Phase 27 D-15 — Phase 28 adds the pin-signal layer alongside them.

**Explicitly out of scope** (deferred to other phases):
- LLM emission of `summary` / `question` / `advisory` system turns — Phase 29 LLM-01..04. Phase 28 wires the consumer side; Phase 29 wires the producer side.
- Server-side `recipe-completeness.ts` parallel — Phase 29 LLM-03.
- `CompletenessCard` behavior change — Phase 29 LLM-04 (it stays as a passive read-only indicator from v0.5 RID-03).
- Phase 27 `summary_complete` / `summary_later` stubs — DEFERRED to Phase 29 with the rest of the summary contract. Stubs remain in `SystemBubble.tsx` as visual-only; Phase 29 wires when its emission shape is locked.
- Push notifications for post-promotion advisories — REQUIREMENTS.md §Out of Scope, productize-later.
- Per-member turn attribution — REQUIREMENTS.md §Out of Scope, productize-later.

</domain>

<decisions>
## Implementation Decisions

### Pin signal design + placement (DETAIL-04)

- **D-01:** **Caveat marginalia label `« épinglé »`.** Uses the Sober Kitchen marginalia register (`docs/design-system.html`) — Caveat handwritten font, primary/terracotta tint, small (~12-13px), reads like a cookbook margin annotation. NOT an icon, NOT a border accent, NOT a background tint. The Caveat register is the brand-locked affordance for "annotation by the user, not by the system."
- **D-02:** **Render on BOTH detail page and edit form.** Source of truth is the same — `recipes.manually_edited_fields` — but mount sites differ by layout: edit form has form-input labels (one marginalia per labeled input); detail page has Cards / Badges / list items / metadata spans (one marginalia per section).
- **D-03:** **Detail page layout = section-level marginalia in the left gutter (cookbook style).** For each detail section (`titre`, `description`, `ingrédients`, `étapes`, metadata pills `cuisine`/`mood`/`main_protein`, `cook_time_minutes`/`prep_time_minutes`/`servings`, `difficulty`, `seasonality`, `tags`), a Caveat label floats in the left gutter beside the section header IF any field in that section's `AnswerField` mapping is pinned. Single-pin-per-section visual on the read view; the edit form is where granular per-field marginalia lives. Aligns with the Phase 8 cookbook gesture (terracotta-30 left margin-rule on ingredients list) without duplicating it.
- **D-04:** **Edit form layout = per-input marginalia next to the field label.** `RecipeForm.tsx` renders 11 labeled inputs (title, description, ingredients, steps, prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine, mood, main_protein). Each gets its own « épinglé » marginalia label rendered to the right of (or just above) its label when the field name is in `recipes.manually_edited_fields`. `tags` and `seasonality` have no current form inputs — render no marginalia for them on the edit form (but the detail page section-level marginalia covers `seasonality`).
- **D-05:** **Coverage = all 13 AnswerField keys** (`title`, `description`, `ingredients`, `steps`, `prep_time_minutes`, `cook_time_minutes`, `difficulty`, `servings`, `cuisine`, `mood`, `main_protein`, `seasonality`, `tags`) per `backend/app/schemas/recipe_turn.py:28`. Drift-proof: ONE list of "pinnable fields" on the backend, mirrored 1:1 on the frontend (locked-vocabulary discipline per CLAUDE.md). For pinned fields with no surface to render the marginalia (e.g., `tags` on the detail page until it gets a section), skip rendering — the data still tracks server-side; the visual surfaces when a render site exists.
- **D-06:** **Pin + open advisory ⇒ escalated `« conflit »` Caveat marginalia in destructive amber.** When a field is in `recipes.manually_edited_fields` AND there exists an `advisory` turn in `turns[]` with `payload.field === fieldName` AND no later `proposal_accepted` / `proposal_dismissed` turn references that advisory's `id` (open advisory), the marginalia switches from « épinglé » (primary/terracotta) to « conflit » (destructive amber, same Caveat font). Tapping the « conflit » label scrolls down to the relevant advisory bubble in the thread (`scrollIntoView({behavior:'smooth', block:'center'})`). Closes via the bubble's CTA.

### DETAIL-05 — PUT /recipes/{id} auto-pin mechanism

- **D-07:** **Server-side diff is the canonical mechanism.** For each AnswerField key present in the PUT body, compare to the current DB value. If the new value DIFFERS from the current value, add the field to `recipes.manually_edited_fields` in the same DB transaction as the field write. Same set-semantics + sorted idiom as `_apply_answer_turn` (`backend/app/routers/recipes.py:609-611`). Frontend stays dumb: it sends the form body as-is; the backend owns the policy. **Remove `manually_edited_fields` from `_UPDATE_FORBIDDEN_FIELDS` is NOT what we do** — keep that defense-in-depth so a client cannot set the field directly. Add a separate `_apply_put_pinning(db, recipe, body)` helper called from inside the existing PUT handler (`update_recipe`, `routers/recipes.py:333-379`) after the field writes but before the `db.commit()`.
- **D-08:** **Same-value re-saves are a no-op.** If `body.title == current.title` (exact equality after Pydantic coercion + the enum-coerce step), do NOT pin. Pins reflect the user's intent to override the LLM — re-typing the same string is not intent. Avoids spurious re-pins when the user opens edit, makes no changes, and re-saves.
- **D-09:** **Clearing a field to blank UNPINS the field.** When the PUT body sets a field to an "empty" value AND that field is currently in `recipes.manually_edited_fields`, remove the field from the set in the same transaction. This is asymmetric to the answer-turn path (which always pins). Predicate for "blank" by field type:
  - String (`title`, `description`, `cuisine`, `main_protein`, `difficulty`): `value is None or value.strip() == ""`. (Note: `title` has `min_length=1` constraint; clearing title to `""` is rejected at schema level — the realistic clear path is `null` via JSON, which Pydantic Optional[] permits.)
  - Integer (`prep_time_minutes`, `cook_time_minutes`, `servings`): `value is None` only. `0` is a valid prep time (not a clear).
  - List (`ingredients`, `steps`, `mood`, `seasonality`, `tags`): `value is None or len(value) == 0`.
  Match the same predicate the frontend `recipe-completeness.ts:isFieldFilled` already implements (D-18 — strict non-empty rule) to avoid drift.
- **D-10:** **Eligible fields = only the 13 AnswerField keys.** Other RecipeUpdate fields (`status` is the only non-AnswerField writable field today) are saved but never pin/unpin. The backend `AnswerField` literal at `backend/app/schemas/recipe_turn.py:28` is the SINGLE source — both the answer-turn validator and the new PUT pinning helper consume it. Mirror in `frontend/lib/enums.ts` (or a new `frontend/lib/answer-fields.ts`) per locked-vocabulary discipline.
- **D-11:** **Atomicity = same transaction.** The current handler does `setattr → r.updated_at = now → db.commit() → db.refresh()`. The new pinning logic runs between `setattr` and `db.commit()`, so the recipe write + the pin-set update land in one transaction. The `recipe.updated` WS broadcast (which already fires after commit at `routers/recipes.py:378`) is unchanged — the broadcast payload now naturally carries the new `manually_edited_fields` so the partner phone sees the updated pins via the existing `recipe.updated` event.

### Question turn answer UX (DETAIL-02)

- **D-12:** **Chip mode is driven by an explicit `multi: bool` field in the question payload.** Phase 29 LLM-03 emits `{field, prompt, input_type, options, multi}` for chip questions. Frontend reads `multi` literally. Note for Phase 29: the `multi` value should align with the field's `AnswerField` value-type (single for `cuisine`/`difficulty`/`main_protein`; multi for `mood`/`seasonality`/`tags`/`steps`/`ingredients` — though list-of-strings fields don't fit a chip input naturally). This is a Phase 29 contract decision; Phase 28 just CONSUMES the field. Phase 28 defensively defaults `multi` to `false` if absent.
- **D-13:** **Stepper config — step 5 for time fields, step 1 for servings, initial value = 0.** `prep_time_minutes` and `cook_time_minutes` step in 5-minute increments (cooking-friendly round numbers, matches the existing `RecipeForm.tsx` minute UX). `servings` steps in increments of 1 (integer humans). Initial value defaults to 0 — the user explicitly builds the answer rather than anchoring on an existing value.
- **D-14:** **Servings stepper UI floor = 1, but initial display = 0.** Backend `AnswerTurnPayload._validate_value_for_field` enforces `1 ≤ v ≤ 99` for servings (`backend/app/schemas/recipe_turn.py:128-131`). The stepper renders 0 initially; the `−` button is disabled at 0; the « Valider » button is disabled until value ≥ 1. Prevents the rejected-422 round-trip. Time-field steppers allow 0 (a valid `prep_time_minutes=0` per the `0 ≤ v ≤ 1440` bound).
- **D-15:** **Uniform `« Valider »` button — single-tap chip, multi-tap chip, AND stepper all require the explicit Valider commit before the POST fires.** Mirrors the cooking gesture "set the dial, then go." Prevents misfire on single-tap chip (especially when the user lands on the wrong option first). The Valider button renders inside the question bubble at the bottom, primary/terracotta variant; disabled until the user has selected at least one value (or stepper > min for servings). Honors Phase 27's design vocabulary (primary CTA at h-9, same height as the advisory CTAs).
- **D-16:** **Optimistic UI with rollback.** On tap of Valider, immediately apply the answer value to the local `recipe` React state (the field on the form updates instantly; the « épinglé » marginalia appears instantly). Then `POST /recipes/{id}/turns` with `kind="answer"`. On 201 (and the subsequent `turn.created` WS event for the answer turn + the `recipe.updated` WS event for the field write), the optimistic state and the server state align — no visual change. On POST failure: revert local state to pre-tap value, remove the marginalia, fire `toast.error(t('recipes.thread.action_failed'))`. SC-2 ("the field value update immediately on the recipe form") locks the optimistic path.

### Advisory CTAs (DETAIL-03)

- **D-17:** **"Mettre à jour" (`proposal_accepted`) — optimistic apply proposed value + remove pin + collapse advisory bubble.** On tap: immediately set `recipe.<field> = advisory.payload.proposed_value`, remove the field from local `recipes.manually_edited_fields`, then POST `/recipes/{id}/turns` with `kind="proposal_accepted"` + `in_reply_to_turn_id`. On 201 + WS event, optimistic state and server state align. On failure: revert local state, fire `toast.error(t('recipes.thread.action_failed'))`.
- **D-18:** **"Ignorer" (`proposal_dismissed`) — POST + collapse advisory bubble.** Pure no-op on the recipe row (no field change, no pin change); just emit the dismissal turn. The frontend's local recipe state is unchanged. The advisory bubble itself collapses (see D-19).
- **D-19:** **Advisory bubble collapses to a one-line muted summary after resolution.** After a `proposal_accepted` or `proposal_dismissed` turn lands referencing an advisory's `id` (via `in_reply_to_turn_id`), the original advisory bubble re-renders as a one-line muted-foreground italic row: `« cuisine : italien → méditerranéen (accepté) »` or `« cuisine : italien → méditerranéen (ignoré) »`. The CTAs disappear. The resolution turn itself does NOT render as its own visible bubble — it's purely a state-change marker. Resolution detection is a client-side render-time computation: for each advisory turn, scan `turns[]` for a later turn whose `kind ∈ {proposal_accepted, proposal_dismissed}` AND `payload.in_reply_to_turn_id === advisory.id`. Memoize per advisory turn to avoid re-walking on every render. This deviates from "stays byte-identical append-only" (ADR-0001) at the VISUAL layer only; the underlying data is still append-only.
- **D-20:** **i18n keys for resolution copy:** `recipes.thread.advisory_resolved` ICU pattern `{field} : {from} → {to} ({status})` with `status` mapped to `recipes.thread.advisory_resolved_accepted` (« accepté ») or `recipes.thread.advisory_resolved_dismissed` (« ignoré »).

### In-flight + failure UX

- **D-21:** **Subtle 'syncing' marker on the touched element during the in-flight POST window.** For an answer-turn POST: the question bubble's Valider button shows a small spinner (or its text dims to opacity 0.7) until the response lands. For an advisory-CTA POST: the tapped CTA dims similarly. For a PUT (form save): the existing save button already shows "Enregistrement…" — preserve that. This is a "we are working on it" affordance, not a blocking UX. Disappears on 201 (or fails into D-22).
- **D-22:** **Failure recovery = toast.error + auto-revert + user re-taps.** Single toast pattern across thread mutations: `t('recipes.thread.action_failed')` = `« Action échouée. Réessayer. »`. Local optimistic state reverts to pre-tap value. User re-taps the same chip / CTA / Valider button to retry. No "Réessayer" button inside the toast — keeps the toast minimal and consistent with the existing `tThread('turn_failed')` toast at `recipes/[id]/page.tsx:221`. Plan-phase chooses whether `turn_failed` is renamed/merged with `action_failed` or kept as a separate key for the kind-specific text/voice/url/photo POST failures.

### i18n key scope

- **D-23:** **Split namespace — `recipes.thread.*` for chat-specific copy + `recipes.pin.*` for pin marginalia.** The chat thread strings live where Phase 27 already added them (`recipes.thread.*`). New chat keys for Phase 28:
  - `recipes.thread.answer_valider` = « Valider »
  - `recipes.thread.action_failed` = « Action échouée. Réessayer. »
  - `recipes.thread.advisory_resolved` ICU pattern (see D-20)
  - `recipes.thread.advisory_resolved_accepted` = « accepté »
  - `recipes.thread.advisory_resolved_dismissed` = « ignoré »
  - `recipes.thread.stepper_unit_minutes` = « min »
  - `recipes.thread.stepper_unit_servings` ICU plural = `{count, plural, one {# pers.} other {# pers.}}`
  
  Pin marginalia gets its own namespace because pins render on form rows / detail cards, not the thread:
  - `recipes.pin.label` = « épinglé »
  - `recipes.pin.conflict` = « conflit »
  - `recipes.pin.conflict_aria` ICU pattern « Conflit sur le champ {field} — Voir l'avis » (a11y)
  
  All field labels referenced in copy (e.g., `field` in `advisory_resolved`) route through the existing `useEnumLabels()` helper (`frontend/lib/enum-labels.ts`) extended with AnswerField → French-label mappings.

### Claude's Discretion (planner / researcher decides)

- **Marginalia exact placement** — left gutter on the detail page (gutter width depends on existing `--spacing-page-x` token; planner may shift to overlay-positioned with `absolute` if gutter is too narrow on the iPhone-shape viewport). Vertical alignment with the section header — flush top vs baseline.
- **Marginalia size / weight / exact tint** — Caveat font already loaded; size around 12-13px; primary tint via `var(--primary)` or a new `--color-pin-fg` token for « épinglé », destructive tint via `var(--destructive)` for « conflit ». UI-SPEC step can lock the exact pixel values.
- **Section-to-AnswerField mapping** — concrete map for D-03 (e.g., `metadata-pills` section covers `cuisine` + `mood` + `main_protein`; `ingredients` section covers `ingredients` only). Planner produces this map in plan 28-XX as a `lib/pin-sections.ts` constant.
- **Question-bubble width / vertical rhythm** — when chips wrap to multiple rows + Valider button, what does the bubble look like? Bounded max-width already set in `SystemBubble.tsx` (`max-w-[90%]`). Planner / UI-SPEC iterates.
- **Resolution-summary copy direction** — D-19 uses `field : from → to (status)` literal. Planner may prefer `{field} → {to} (a remplacé {from}, {status})` or similar French rhythm; UI-SPEC adjudicates.
- **Cookbook-marginalia rendering technique** — pure CSS absolute positioning vs grid template areas vs a `<Marginalia>` component wrapper. Plan-phase chooses; the React composition pattern stays at the planner's discretion.
- **Memoization strategy for advisory-resolution lookups** — D-19 mentions per-advisory memo; planner picks `useMemo` vs a `Map<advisoryId, resolutionTurn>` built once per `turns[]` change.
- **PUT pinning helper name + location** — D-07 calls it `_apply_put_pinning` in `routers/recipes.py`. Could also live in a new `services/pinning.py` if the planner expects more pin paths. Default to inline helper next to `_apply_answer_turn` for visual symmetry; promote to a service later if a third pin caller emerges.
- **Backend AnswerField mirror on frontend** — `frontend/lib/enums.ts` could add an `AnswerField` literal union to mirror `backend/app/schemas/recipe_turn.py:28`; OR a new `frontend/lib/answer-fields.ts` file. Either way: locked-vocabulary discipline applies — drift between TS and Python = bug category.
- **Tests** — backend pytest for PUT diff/unpin (`test_recipes.py` or `test_turns.py` extension). Frontend Playwright e2e for: chip answer → optimistic field update → POST round-trip; advisory accept → optimistic apply + collapse; advisory dismiss → collapse only; pin marginalia appears after PUT with diff. Planner sets the test surface.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Milestone-level design
- `docs/adr/0001-recipe-conversation-thread.md` — Conflict UX rationale (advisory bubble, manual edit wins by default), rejected alternatives (last-write-wins / silent pinning / interrogative confirmation / append-only proposals), consequences. The advisory accept/dismiss + pin semantics in this phase are the direct implementation of §Consequences.
- `.planning/REQUIREMENTS.md` §DETAIL-01..05 — 5 requirements anchored to Phase 28.
- `.planning/ROADMAP.md` §"Phase 28: Recipe-detail thread" — goal, 5 success criteria, invariant #4 touched.
- `.planning/PROJECT.md` §"Current Milestone: v0.6" — locked LLM trigger table + advisory bubble semantics + answer turn semantics.

### Prior phase (must read for forward-compat contracts)
- `.planning/phases/25-backend-foundation/25-CONTEXT.md` — D-10 (photo turn payload `{photo_paths}`), D-14 (TurnKind / TurnSender locked vocabularies in both enum files), D-15 (Pydantic discriminated union on `kind`).
- `.planning/phases/26-thread-api-realtime/26-CONTEXT.md` — D-08 (AnswerField 13-field whitelist), D-09 (per-field value validator), D-10 (atomic answer turn = insert + apply + pin in one tx), D-11 (answer turn does NOT trigger LLM), D-12 (in_reply_to_turn_id must reference a question turn — backend enforces), D-15 (`proposal_dismissed` pure state change, must reference an advisory), D-16 (`proposal_accepted` applies proposed_value + unpins, must reference an advisory), D-17 (`AdvisoryTurnPayload` read-side contract for accepted handler).
- `.planning/phases/27-conversational-capture-screen/27-CONTEXT.md` — D-14 (Phase 27 ships visual stubs for question chips + advisory CTAs; Phase 28 wires the handlers), D-15 (the existing recipe form on `/recipes/[id]` stays untouched), D-16 (`frontend/components/RecipeThread/` directory layout). Phase 28 reuses this component — does NOT rebuild.
- `.planning/phases/27-conversational-capture-screen/27-UI-SPEC.md` — `/recipes/[id]` layout (chat below form), thread-meta strip behavior, state pill colors.

### Architecture invariants
- `CLAUDE.md` §"Architecture invariants" #1 (capture pipeline — answer/proposal turns flow through the same POST /turns endpoint as text/voice/photo/url, no special-casing), #4 (realtime — chat consumes `turn.created` + `turn.updated` via the existing `useRealtime` DOM CustomEvent bridge; the new PUT pinning logic propagates via the existing `recipe.updated` broadcast), #6 (French-only via next-intl — all new keys under `recipes.thread.*` + `recipes.pin.*`), #8 (HttpOnly cookie auth — all POSTs use the `api()` wrapper).
- `CLAUDE.md` §"MVP phase posture" — clean writes; the `manually_edited_fields` PUT path lands as a new helper + handler change, no compat shim, no parallel "legacy ignore" path.
- `CLAUDE.md` §"Locked vocabularies" — AnswerField mirrors enforced TS ↔ Python in lockstep. Drift = bug category. Adding AnswerField to the frontend enum (or a parallel file) MUST mirror `backend/app/schemas/recipe_turn.py:28` byte-for-byte.
- `CLAUDE.md` §"Conventions" — Backend uses SQLAlchemy 2.0 typed style + Pydantic v2; frontend uses TypeScript strict + ESLint flat config (no Prettier).
- `frontend/AGENTS.md` — Next.js 16 breaking changes; consult `frontend/node_modules/next/dist/docs/` before writing frontend code.
- `docs/design-system.html` — Sober Kitchen tokens. The « épinglé » / « conflit » marginalia consumes the Caveat handwritten register; the question + advisory bubbles consume the patine card surface. Open in browser before designing pin visuals.

### Code surfaces touched by this phase

#### Frontend (the bulk of Phase 28)
- `frontend/components/RecipeThread/SystemBubble.tsx` — Phase 28's primary edit target. Wire `onClick` to chips/stepper/text in the `question` branch (D-12..D-16). Wire `onClick` to "Mettre à jour" / "Ignorer" in the `advisory` branch (D-17, D-18). Add the resolution-collapse rendering (D-19) — likely a new prop `resolution?: 'accepted' | 'dismissed'` derived by the orchestrator. Keep the Phase 27 stub comments deleted as the handlers land.
- `frontend/components/RecipeThread/index.tsx` — orchestrator. Add the advisory-resolution-lookup memo (D-19) over `props.turns`. Pass `resolution` prop into each system bubble render. Add the answer-POST callback (parent owns the POST; orchestrator passes it through). Either widen `RecipeThreadProps` detail-mode with `onPostAnswerTurn(payload: AnswerTurnPayload) => Promise<void>` + `onPostProposalAccepted(advisoryId) => Promise<void>` + `onPostProposalDismissed(advisoryId) => Promise<void>`, OR keep the orchestrator API symmetric by routing every POST through a single `onPostTurn(payload: TurnPayload)` — planner chooses.
- `frontend/components/RecipeThread/types.ts` — extend `RecipeThreadProps` (detail mode) with the new POST callbacks per the planner's chosen API shape. Keep the `?: never` exhaustiveness markers in the capture-mode union member (Phase 27 D-16 discipline).
- `frontend/app/recipes/[id]/page.tsx` — add the new `handlePostAnswerTurn` / `handlePostProposalAccepted` / `handlePostProposalDismissed` callbacks (mirror the existing `handlePostTextTurn` at `:212-225`). Apply the optimistic state update before the POST + revert on catch. The `recipe.updated` WS subscription (`:160-176`) already re-fetches the recipe — that handler propagates the new pin set without any change. Pin-marginalia render integrated into the existing meta / ingredient / step / metadata blocks per D-03.
- `frontend/components/RecipeForm.tsx` — add the per-input pin marginalia (D-04) next to each labeled input. The component already exposes `recipeId: string` (`:182`); add a new `manuallyEditedFields: string[]` prop (or read from the page-level recipe state passed in via `initial` / a sibling prop). Render the marginalia conditional on field membership in the set.
- `frontend/lib/enums.ts` or new `frontend/lib/answer-fields.ts` — add `ANSWER_FIELDS` literal union mirroring `backend/app/schemas/recipe_turn.py:28`. Locked-vocabulary discipline applies.
- `frontend/lib/i18n/fr.json` (or wherever next-intl loads strings) — add the new keys per D-20 + D-22 + D-23. Two namespaces: `recipes.thread.*` for chat copy and `recipes.pin.*` for marginalia.
- `frontend/lib/enum-labels.ts` (`useEnumLabels` hook) — extend with `field(key: AnswerField) → string` returning the French label for each AnswerField key (used in advisory resolution copy + conflict aria). Today the hook covers `cuisine` / `mood` / `protein` / `difficulty` / `seasonality` — add the remaining keys (`title`, `description`, `ingredients`, `steps`, `prep_time_minutes`, `cook_time_minutes`, `servings`, `tags`).

#### Backend (DETAIL-05 mechanism + targeted forward-compat)
- `backend/app/routers/recipes.py` `update_recipe` (lines 333-379) — keep the existing `setattr` loop; insert a new `_apply_put_pinning(db, recipe, body)` call between the `setattr` loop and `db.commit()`. The helper diffs body vs current row, pins differing AnswerField keys, unpins blank AnswerField keys. The `recipe.updated` broadcast naturally carries the new `manually_edited_fields` value in its payload (no change to the broadcast code).
- `backend/app/routers/recipes.py` `_UPDATE_FORBIDDEN_FIELDS` (lines 105-114) — KEEP `manually_edited_fields` in the forbidden set. Defense-in-depth: client cannot directly set the pin column. The new helper is the only mutation path.
- `backend/app/routers/recipes.py` `_apply_put_pinning` (NEW) — new helper. Lives next to `_apply_answer_turn` and `_apply_proposal_accepted` for visual + semantic symmetry. Set-semantics + sorted idiom matches the existing pin writers.
- `backend/app/schemas/recipe_turn.py:28` `AnswerField` literal — the canonical list. The PUT helper consumes this same literal so the "eligible to pin" gate stays single-source.
- `backend/tests/test_recipes.py` (or extension) — new test surface covering: PUT diff-pin path · PUT clear-unpin path · PUT same-value-no-op · PUT non-AnswerField key (e.g., `status`) does NOT pin · `recipe.updated` broadcast payload contains the new pin set.

### Pinning logic touchpoints (for cross-reference at plan time)
- `backend/app/models/recipe.py:80` — column definition `manually_edited_fields: Mapped[list[str]]`. JSONB, NOT NULL DEFAULT `[]`.
- `backend/app/routers/recipes.py:581-611` `_apply_answer_turn` — existing pin writer (answer turns). Mirror its idiom in the new PUT helper.
- `backend/app/routers/recipes.py:614-675` `_apply_proposal_accepted` — existing unpin writer (advisory accept). Same idiom; sorted set semantics.
- `backend/tests/test_turns.py` — extensive coverage of answer / proposal_accepted / proposal_dismissed. The new PUT helper tests follow the same fixture patterns (see `test_turns.py:64` for recipe fixture creation).

### Out-of-scope (Phase 29 owns; do NOT touch in Phase 28)
- LLM emission of `summary` / `question` / `advisory` system turns — Phase 29 LLM-01..04. Phase 28 consumes these from `turns[]` rendered into `SystemBubble`.
- `services/llm.process_thread_turn` body — Phase 29 LLM-01. The stub from Phase 26 26-02 stays a stub. Phase 28 does NOT fill it.
- `services/llm.advisory_emission_logic` (new) — Phase 29 LLM-02. The advisory turn-emission policy is Phase 29's deliverable; Phase 28's UI just RENDERS the emitted advisories.
- Server-side `recipe-completeness` parallel — Phase 29 LLM-03 emits question turns from missing high-weight fields. Phase 28's chip/stepper handlers render whatever question turns exist, not generate them.
- `CompletenessCard` behavior — Phase 29 LLM-04 keeps it as a passive indicator. Phase 28 does NOT touch.
- Phase 27 `summary_complete` / `summary_later` button stubs in `SystemBubble.tsx` — deferred to Phase 29 (the summary contract). Stubs remain visual-only until Phase 29 wires them.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`frontend/components/RecipeThread/SystemBubble.tsx`** — Phase 27 visual stubs for chip / stepper / text answer + advisory accept/dismiss. The buttons are already in place — Phase 28 just attaches `onClick` handlers and wires the optimistic state plumbing.
- **`frontend/components/RecipeThread/index.tsx`** — orchestrator already subscribes to `turn.created` + `turn.updated` and handles deduplication by id (`recipes/[id]/page.tsx:185-203`). The advisory-resolution memo (D-19) plugs into the existing `turns[]` flow.
- **`backend/app/routers/recipes.py`** — `_apply_answer_turn` (lines 581-611) and `_apply_proposal_accepted` (lines 614-675) are the existing pin writers with the canonical set-semantics + sorted idiom. The new `_apply_put_pinning` helper mirrors their shape exactly.
- **`backend/app/schemas/recipe_turn.py:28`** `AnswerField` Literal — the 13-field whitelist. Single source consumed by the answer-turn validator (Phase 26 D-09) and now by the PUT pinning helper (D-10).
- **`frontend/lib/api.ts`** `api<T>()` helper with `credentials: 'include'` — all new POSTs (`kind=answer`, `kind=proposal_accepted`, `kind=proposal_dismissed`) use this wrapper. Phase 27's `recipes/[id]/page.tsx:212-274` is the canonical precedent for the per-kind POST handler shape.
- **`frontend/components/RealtimeProvider.tsx`** + `frontend/lib/ws.ts` — `client.onEvent<EventType>(event, handler)` subscription. The existing `turn.created` / `turn.updated` / `recipe.updated` handlers in `recipes/[id]/page.tsx` already cover everything Phase 28 needs; no new event subscriptions required.
- **`frontend/lib/recipe-completeness.ts:80` `isFieldFilled`** — the strict non-empty predicate (string trim, number `!= null`, list `length > 0`). The PUT clear-detect logic (D-09) MIRRORS this predicate on the backend to keep the "what counts as blank?" rule drift-free.
- **`docs/design-system.html`** — Caveat handwritten register for marginalia. Locked tokens consumed by the new « épinglé » / « conflit » labels.

### Established Patterns
- **Atomic same-transaction field writes + pin set mutation** (invariant #3) — `_apply_answer_turn` and `_apply_proposal_accepted` already follow this. The new PUT helper uses the same idiom: mutate the recipe ORM row + update `manually_edited_fields` BEFORE `db.commit()`.
- **Set-semantics + sorted assignment for `manually_edited_fields`** — `current: set[str] = set(recipe.manually_edited_fields or []); current.add(field); recipe.manually_edited_fields = sorted(current)`. JSONB full-reassignment idiom (Phase 26 RESEARCH §Area 4 — in-place list.append silently fails without `flag_modified`).
- **Optimistic UI + revert on catch** — already in place in the Phase 27 turn handlers (`recipes/[id]/page.tsx:212-274`) at a coarser level (the POST happens before any state update; failure shows a toast). Phase 28 EXTENDS this pattern: write local state FIRST, POST in background, revert on catch.
- **Realtime broadcast after commit** — `routers/recipes.py:378` `recipe.updated` after `db.commit()`. New PUT pinning logic produces a `recipe.updated` payload that naturally carries the new `manually_edited_fields` — no broadcast code change.
- **i18n via next-intl** — `useTranslations('recipes.thread')` and `useTranslations('recipes.pin')` consumers; key files under `frontend/lib/i18n/fr.json` (or wherever the Phase 27 keys landed).
- **Locked-vocabulary mirroring (TS ↔ Python)** — `TurnKind` and `TurnSender` already mirrored (Phase 25 D-14). Extending with `AnswerField` follows the same pattern.

### Integration Points
- **`POST /api/recipes/{id}/turns` with `kind="answer"` payload** — Phase 26 already accepts this and dispatches to `_apply_answer_turn`. Phase 28 emits this from the question-bubble Valider button.
- **`POST /api/recipes/{id}/turns` with `kind="proposal_accepted"` / `"proposal_dismissed"`** — Phase 26 already handles dispatch. Phase 28 emits from the advisory CTAs.
- **`PUT /api/recipes/{id}`** — Phase 28 adds the auto-pin mechanism. Frontend form save flow unchanged externally; the response body now carries the post-PUT `manually_edited_fields` value (already in the existing `RecipeResponse`).
- **`recipe.updated` WS event** — already carries `manually_edited_fields` in its payload (the broadcast at `routers/recipes.py:378` serializes the recipe row post-commit). Phase 28 frontend reads it without extra subscription.
- **`turn.created` WS event for answer / proposal_accepted / proposal_dismissed turns** — Phase 26 broadcasts these. Phase 28's orchestrator memo (D-19 advisory-resolution lookup) re-runs naturally on every `turns[]` update.
- **Frontend pin-marginalia render sites:**
  - Detail page sections (`/recipes/[id]/page.tsx`): hero title block, metadata pill row (cuisine/mood/protein), ingredients section, steps section, prep/servings span, description section (if rendered), seasonality section (if rendered), tags section (if rendered).
  - Edit form labeled inputs (`RecipeForm.tsx`): 11 fields per existing form structure.
- **Question/advisory bubble vertical rhythm** — `SystemBubble.tsx` already locks the bubble shell (`max-w-[90%]`, `rounded-[18px_18px_18px_4px]`, `p-3`). The new Valider button + chip/stepper handlers must fit within these bounds.

</code_context>

<specifics>
## Specific Ideas

- **The marginalia register is the brand-locked affordance for user-authored annotation.** Caveat handwritten Caveat sits next to ingredients in a cookbook — that's exactly the visual metaphor for "this field is my hand-written override of the algorithm." The escalation to « conflit » (destructive amber) uses the same font, the same register — just a different tint and lexeme. One vocabulary, two states; no new motion language.
- **The advisory bubble's post-resolution collapse (D-19) is the only place this phase deviates from ADR-0001's append-only invariant** — and even there, only at the VISUAL layer. The underlying turn rows are still append-only; the rendering treats them differently once a resolution exists. This trade-off is necessary because the thread-as-living-artifact reading benefits from de-emphasizing settled conflicts; a thread littered with unresolved-looking advisories that have already been settled would be visually exhausting.
- **The "Valider" friction (D-15) is the safety net for chip misfire** — particularly on the iPhone-shape viewport where a chip is 80-120px wide and a missed tap is easy. Setting the dial then committing is also the cooking gesture: turn the knob, then press cook.
- **Optimistic UI (D-16, D-17) is the cohesion gesture across the entire app** — Phase 26's WS broadcasts also feel "instant" (~200ms target). Adding optimistic frontends ensures the user never sees a stale field for the duration of a round-trip; the few ms after the tap before the POST confirms is the only window where local and server state could disagree, and the revert + toast path covers that.
- **Server-side diff (D-07) keeps the frontend dumb on purpose** — the form already knows what fields the user touched (those whose `<input value>` changed since mount), but transmitting that as a `fields_to_pin` array would require careful state bookkeeping in `RecipeForm.tsx` (`onChange`-time dirty-tracking, reset on initial-load merge). The backend has the previous values in the row; the diff is cheap; the policy lives in one place.
- **D-09 "clear-to-unpin" is a deliberate ergonomic asymmetry** — manually setting the field to a real value pins; manually clearing it releases the field back to the LLM. This makes the pin behavior reversible without requiring the user to find an advisory accept path. The risk: a user who clears a field intending "this should be empty forever" gets an LLM re-fill on the next refinement turn. Acceptable trade-off at couple-scale; the user can re-clear if they want, or pin via an answer turn explicitly. Productize-later if the friction surfaces.
- **The « conflit » escalation (D-06) collapses 'pinned' + 'pending advisory' into one visible signal** so the user doesn't have to mentally cross-reference the form pin set against the open thread state. Tap the « conflit » → scroll to the bubble → tap "Mettre à jour" or "Ignorer" → label returns to « épinglé » (if dismissed) or disappears (if accepted, which unpins).

</specifics>

<deferred>
## Deferred Ideas

- **Phase 27 `summary_complete` / `summary_later` stubs** — Phase 29 wires when the summary turn contract is locked. Phase 28 leaves them visual-only.
- **Per-member turn attribution** — REQUIREMENTS.md §Out of Scope, productize-later. Phase 28 treats `sender='user'` as the only user value.
- **Push notifications for post-promotion advisories** — REQUIREMENTS.md §Out of Scope. Phase 28 relies on WebSocket only.
- **"Retry" button inside the failure toast (D-22)** — out of scope for v0.6; the re-tap pattern is simpler and consistent with the existing `turn_failed` UX.
- **Pin signal animation on entrance/exit** — D-21 mentions a "subtle syncing marker" but a full entrance/exit motion language for the marginalia is post-MVP. The label appears and disappears with the React render — no AnimatePresence wrapper unless Plan-phase surfaces a clear motion need.
- **Marginalia on non-form surfaces (e.g., on `RecipeCard` thumbnails in `/recipes`)** — out of scope. Phase 28 limits pin signals to the detail page + edit form. The list view stays clean.
- **A configurable "pin policy"** — e.g., "auto-pin only when value changes by ≥ X%" or "pin only certain field categories." Not for v0.6; the always-diff-pins policy is correct for the MVP.
- **Backend-driven advisory resolution detection** — D-19 picks client-side render-time computation. A backend index from `advisory_id → resolution_turn_id` (denormalized) could be faster at scale but adds an invariant to maintain. Couple-scale doesn't need this.
- **Reordering / editing past turns** — REQUIREMENTS.md §Out of Scope (append-only per ADR-0001). Phase 28 honors this strictly except for the visual collapse on advisory resolution.
- **Multi-recipe-edit-history projection (e.g., "show me all pinned fields across all recipes")** — productize-later, post-v0.6.

</deferred>

---

*Phase: 28-recipe-detail-thread*
*Context gathered: 2026-05-17*
