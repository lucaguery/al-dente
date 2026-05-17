# Phase 29: LLM prompt rework + completeness wire-up - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 29-llm-prompt-rework-completeness-wire-up
**Areas discussed:** Full-thread Gemini prompt + idempotency · Summary turn shape + emission timing · Question turns: shape, policy, server-side completeness · Advisory emission rules (LLM-02)

---

## Full-thread Gemini prompt + idempotency

### Q1: How should advisories be produced from the single Gemini call?

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side diff after Gemini extraction | Gemini returns standard `GeminiExtractedRecipe`. After parsing, BackgroundTask diffs each AnswerField against `manually_edited_fields`. Deterministic, single call, no schema extension. | ✓ |
| Extended Gemini structured output | Extend schema with `advisories: list[{field, proposed_value, reason_excerpt}]` and instruct Gemini to emit advisories instead of writing pinned fields. Single call but reliability bet on Gemini respecting pinned-field instruction. | |
| Hybrid: server diff for detection, Gemini text for rationale | Server diff + N short Gemini calls for rationales. Highest quality. Violates "one call per Enregistrer". | |

**User's choice:** Server-side diff after Gemini extraction
**Notes:** Recommended — keeps the LLM trigger table from PROJECT.md inviolate and makes conflict detection deterministic.

### Q2: How should the thread be serialized into the Gemini prompt?

| Option | Description | Selected |
|--------|-------------|----------|
| Role-labeled French prose | `USER (text): ...` / `SYSTEM (summary): ...` etc. Pinned-field set appended as parenthetical. Natural for Gemini's chat-tuned mode. | ✓ |
| Structured JSON of the full thread | JSON array of `{position, sender, kind, payload}`. Precise but ~2x token cost. | |
| Hybrid: prose for user turns, JSON for system turns | Mixed format. Adds builder complexity. | |

**User's choice:** Role-labeled French prose
**Notes:** Recommended — richer signal than JSON; greppable for debugging.

### Q3: What does "same thread → same summary" (idempotency, SC-1) mean concretely?

| Option | Description | Selected |
|--------|-------------|----------|
| Same extracted fields, summary body may vary | Re-runs Gemini; if extracted-recipe hash matches previous run, no new summary turn. Verifies SC-1 via "no new turns on re-save". | ✓ |
| Always emit a summary; idempotency = no field changes | Every LLM run emits summary; idempotency only on `recipes.*` columns. | |
| Set `temperature=0` for deterministic Gemini output | Deterministic but hurts the catchy-title clause from RID-04. | |

**User's choice:** Same extracted fields, summary body may vary
**Notes:** Recommended — extraction-hash de-dup keeps the chat clean without sacrificing prose creativity.

### Q4: Keep `gemini-2.5-flash` or upgrade?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `gemini-2.5-flash` | Same model as today; ~10x cheaper than Pro; ~1M context plenty for couple-scale corpus. | ✓ |
| Upgrade to `gemini-2.5-pro` for refinement turns only | Quality bump uncertain; 10x cost. | |

**User's choice:** Keep `gemini-2.5-flash`
**Notes:** Recommended — cost matters at couple-scale daily use; quality re-evaluated post-ship.

---

## Summary turn shape + emission timing

### Q1: What goes in `summary.payload.body` (the French sentence under the 'résumé' head)?

| Option | Description | Selected |
|--------|-------------|----------|
| Conversational diff: what changed this turn | Gemini generates a 1-2 sentence French recap as part of structured output via new `summary_body: str` field. | ✓ |
| Snapshot: what the recipe currently is | Always describe the current state. Feels repetitive on refinement turns. | |
| Body empty; rely on chips only | Minimalist. Loses the narrative "I heard you" beat. | |

**User's choice:** Conversational diff
**Notes:** Recommended — natural conversation rhythm; Gemini handles the prose.

### Q2: What goes in `summary.payload.chips` (the pill row)?

| Option | Description | Selected |
|--------|-------------|----------|
| Field names that were CHANGED this turn | Initial promote shows all extracted scalars; refinement shows only changed fields (advisory-blocked fields excluded). | ✓ |
| All extracted scalar fields (current snapshot) | Predictable shape; less informative on refinement. | |
| Empty chips | Loses visual scannability. | |

**User's choice:** Field names that were CHANGED this turn
**Notes:** Recommended.

### Q3: When does a `summary` turn get emitted?

| Option | Description | Selected |
|--------|-------------|----------|
| Every LLM-triggering turn that produces new extraction | De-dup by extraction hash from Area 1; stochastic re-saves emit no new summary. | ✓ |
| Only on initial promote_draft; refinement silent | Cleaner chat on power-user editing; loses the "I heard you" beat. | |
| Every LLM call regardless of idempotency hash | Adds chat noise on retries; conflicts with Area 1 decision. | |

**User's choice:** Every LLM-triggering turn that produces new extraction
**Notes:** Recommended.

### Q4: What do the deferred Phase 27 `summary_complete` / `summary_later` CTAs DO?

| Option | Description | Selected |
|--------|-------------|----------|
| Gate question emission per recipe | "Oui, compléter" → trigger next question; "Plus tard" → set 24h defer flag. | ✓ |
| Pure UI navigation: open form, dismiss bubble | "Oui, compléter" → `?focus=<field>` deep-link; "Plus tard" → collapse. No server state. | |
| Defer the CTAs to a later phase | Keep as Phase 27 visual stubs. | |

**User's choice:** Gate question emission per recipe
**Notes:** Recommended — couples summary CTAs cleanly to the question-emission loop.

---

## Question turns: shape, policy, server-side completeness

### Q1: Which fields are eligible for question-turn emission?

| Option | Description | Selected |
|--------|-------------|----------|
| Match RID-03 11-field set | Aligns 1:1 with `CompletenessCard` per LLM-04. Excludes seasonality/tags. | ✓ |
| Full 13-field AnswerField set | Includes seasonality + tags. Increases scope; updates CompletenessCard contract. | |
| Subset: high-signal only | 7 fields; smallest chat footprint; two divergent "what's missing" lists. | |

**User's choice:** Match RID-03 11-field set
**Notes:** Recommended — keeps the chat and CompletenessCard surfaces aligned.

### Q2: What's the `input_type` per eligible field?

| Option | Description | Selected |
|--------|-------------|----------|
| Mapped per field, skip list fields | chip-single: cuisine/difficulty/main_protein; chip-multi: mood; stepper: prep_time/cook_time/servings; text: title/description; SKIP ingredients/steps. | ✓ |
| Chip for all enums, stepper for numbers, text for everything else | Also text for ingredients/steps. Risk: long lists in chat input are worse than the form. | |
| Let Gemini decide the input_type per emission | Flexibility but no contract validation. | |

**User's choice:** Mapped per field, skip list fields
**Notes:** Recommended — keeps the chat aligned with what each input type is actually good at.

### Q3: When and how many question turns to emit at once?

| Option | Description | Selected |
|--------|-------------|----------|
| One question per LLM run, highest-priority missing field | Priority = `FIELD_KEYS` order; de-dup against unanswered questions. | ✓ |
| All missing fields at once | Fast triage but visually overwhelming on a barely-started recipe. | |
| Batched per session, gated by summary CTAs | Tightly coupled to user intent via Area 2 D-04. Suppresses auto-emission. | |

**User's choice:** One question per LLM run, highest-priority missing field
**Notes:** Recommended — conversational pacing; combined with D-08 defer gate keeps friction low.

### Q4: How to implement the server-side completeness helper?

| Option | Description | Selected |
|--------|-------------|----------|
| New Python module `backend/app/services/completeness.py` | Parallel port of `frontend/lib/recipe-completeness.ts`; ~50 LOC; locked-vocabulary discipline. | ✓ |
| Call frontend helper via internal API | Adds Node subprocess or embedded JS runtime. Rejected for couple-scale. | |
| Inline the predicate inside `process_thread_turn` | Smallest diff; no reuse; less testable. | |

**User's choice:** New Python module `backend/app/services/completeness.py`
**Notes:** Recommended — symmetric with other locked-vocabulary mirrors.

---

## Advisory emission rules (LLM-02)

### Q1: What counts as a "conflict" between the LLM's extracted value and a pinned value?

| Option | Description | Selected |
|--------|-------------|----------|
| Strict equality after type-normalize | Strings trimmed, case-sensitive; enums literal; integers strict; lists set/positional equality. | ✓ |
| Tolerant: case-fold strings, round time fields to 5-min | Reduces noise but silently overwrites user-chosen capitalization. | |
| Per-field-type policy: tolerant for cosmetic, strict for semantic | Most defensible but most code. | |

**User's choice:** Strict equality after type-normalize
**Notes:** Recommended — predictable, mirrors Phase 28 D-09 "is_filled" philosophy.

### Q2: What does `advisory.payload.reason_excerpt` literally contain?

| Option | Description | Selected |
|--------|-------------|----------|
| Short literal slice of the most recent user turn | Walk turns[] backward, extract per kind, truncate to 120 chars. Zero extra Gemini calls. | ✓ |
| Generated by Gemini in the same structured-output call | Extend schema with `field_rationales: dict[AnswerField, str]`. Wasted tokens on non-emitted fields. | |
| Generated by separate Gemini call per conflict | Highest quality; violates "one call per Enregistrer". | |

**User's choice:** Short literal slice of the most recent user turn
**Notes:** Recommended — the user reads their own words quoted back; very natural.

### Q3: De-dup policy when re-running Gemini on the same recipe?

| Option | Description | Selected |
|--------|-------------|----------|
| Suppress if an OPEN advisory for the same field exists | Mirror Phase 28 D-19 resolution-lookup; allow re-emit only on new proposed value after resolution. | ✓ |
| Always emit, frontend collapses duplicates | Simpler backend; messier data. | |
| Suppress all duplicates within a 24h window | Spam protection but loses signal after user dismissal. | |

**User's choice:** Suppress if an OPEN advisory for the same field exists
**Notes:** Recommended.

### Q4: Are there field types where advisories should be skipped entirely?

| Option | Description | Selected |
|--------|-------------|----------|
| Emit for all 13 AnswerField keys | Pin is sacred; user always sees disagreement. Manage noise via D-18 de-dup. | ✓ |
| Skip lists (ingredients, steps, mood, seasonality, tags) | Reduces noise on small re-orderings. | |
| Skip free-text fields (title, description) | Reduces noise on common prose rewording. | |

**User's choice:** Emit for all 13 AnswerField keys
**Notes:** Recommended.

---

## Claude's Discretion

The following implementation choices were intentionally left to the planner / researcher:

- Prompt builder location (inline vs new module)
- Test mode bypass shape (`canned_thread_extract` fixture details)
- Backend French label dict duplication strategy
- Photo content multi-turn budget cap
- Alembic migration filename
- Test surface scope (parity tests, prompt-builder tests, de-dup tests, e2e summary CTA wire-up)
- `process_thread_turn` sync vs async signature decision
- Hash storage location (turn payload vs new column)
- Failure-mode error surface on summary turn
- Shared `_run_thread_llm` body extraction pattern

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Highlights:

- Question turns for seasonality / tags / ingredients / steps (productize-later)
- Per-field and indefinite defer settings
- Gemini-generated `reason_excerpt`
- Tolerant conflict comparison
- Skipping advisories on free-text fields
- gemini-2.5-pro upgrade for refinement turns
- "Questions paused" UI surface with reset button
- De-normalized extraction hash / resolution lookups
- Push notifications + per-member attribution (REQUIREMENTS.md §Out of Scope)
