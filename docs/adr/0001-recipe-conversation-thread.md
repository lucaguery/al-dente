# Recipes have a durable conversation thread

Capture and editing of a recipe are unified into a single durable **conversation thread** attached to the recipe (replacing the legacy "five capture surfaces" UI). Users emit **turns** (text, voice, photo, URL); the system replies post-promotion with extraction summaries and targeted completeness questions. **Semantic editing** = a new turn that re-interprets the thread. **Manual editing** = direct field edit via the recipe form, which *pins* the field. When a refinement turn's interpretation conflicts with a pinned field, the system emits an **advisory turn** (informational, not a modal) — manual edit wins by default; user can tap to accept the new interpretation.

## Why

1. The five capture surfaces (`quick`, full-form, `voice`, `photo`, `url`) already converge on the `draft → promote` contract (invariant #1). Unifying the UI matches the domain.
2. The recipe-completeness scorecard (issue #22) needs a frontend surface for asking targeted questions about missing fields; the chat is the natural fit.
3. A durable thread makes the recipe's history queryable for future LLM re-runs against `source_capture` (invariant #5) — re-extraction with a better model can post a new advisory turn proposing improvements without overwriting the user's work.

## Considered alternatives

- **Last-write-wins.** Every chat turn overwrites manual edits silently. Rejected: undoes careful user corrections.
- **Silent pinning.** Manual edits invisibly block LLM updates; no audit trail. Rejected: the user never sees that the LLM disagreed; no in-chat override path.
- **Interrogative confirmation (pure C).** Every conflict prompts "Mettre à jour ?". Rejected: fires on narrated values the user didn't intend as edits (*"ma mère mettait toujours 1h"*), creating friction in normal conversation.
- **Append-only proposals (D).** Every LLM interpretation surfaces as a proposal requiring acceptance. Rejected: too heavy for the common case where the LLM is right.

## Consequences

- New table `recipe_turns` (or equivalent) — ordered, append-only, typed by sender + kind. The first turns of each recipe compose the initial capture (formerly stored only in `source_capture`).
- New column on `recipes`: `manually_edited_fields` (JSONB set of field names) — populated whenever a field is mutated through the manual-edit path (`PUT /recipes/{id}`, form save, chip/stepper answer).
- New turn kinds beyond user inputs: `summary` (post-promotion extraction summary), `question` (system asks), `answer` (user replies via chip / stepper / free text), `advisory` (system flags a conflict, informational), `proposal_accepted` / `proposal_dismissed` (user resolution).
- The LLM prompt receives the pinned-field set so it can flag conflicts (emit `advisory`) rather than silently update pinned values.
- The chat component is shared between the new-recipe screen and the recipe-detail page; the thread is the recipe's living artifact.
- `recipes.source_capture` JSONB column is **dropped** in the same Alembic migration that adds `recipe_turns`. All existing readers (the 4 `promote_*` functions in `services/llm.py` and any scattered call sites) are rewritten to read from `recipe_turns` in the same change. No compat shim — MVP posture (see CLAUDE.md). Invariant #5 (raw inputs preserved) is satisfied by `recipe_turns` from this point forward.
- The 4 per-surface promotion functions (`promote_quick_draft`, `promote_full_draft`, `promote_voice_draft`, `promote_photo_draft`) collapse into one `promote_draft(recipe_id)` that reads the recipe's initial turns and dispatches on `kind`.
- Closes the implementation ambiguity flagged in issue #20 (unified capture) and provides the surface that issue #22 (completeness scorecard) needed.
