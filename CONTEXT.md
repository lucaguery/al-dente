# Domain context — al-dente

This file locks the vocabulary that domain conversations use. Terms here have
precise meanings; alternatives are flagged when overloaded. Update inline as
new terms get pinned through `/grill-with-docs` or design discussions.

## Capture

The act of telling the app about a recipe. Always produces a `draft` recipe row
(invariant #1). One capture can include multiple **input pieces** of different
types (text, voice, photo, URL) — they all attach to the same draft.

## Conversation thread (or just "thread")

The durable, append-only sequence of **turns** attached to a recipe. The first
turns are the initial capture; subsequent turns refine the recipe over time.
The thread is the canonical record of how the recipe came to be what it is.

Not "chat" — "chat" connotes ephemerality, and we explicitly want the thread
to be permanent and queryable later (e.g., LLM re-runs against the full
history per invariant #5).

## Turn

One element in the conversation thread. Always has:
- a **sender** (`user` or `system`)
- a **kind** — one of:
  - User-emitted: `text`, `voice`, `photo`, `url`, `answer`
  - System-emitted: `summary`, `question`, `advisory`
  - User resolution of an advisory: `proposal_accepted`, `proposal_dismissed`
- a **payload** (kind-specific JSON)
- an **ordering** position within the thread

The first N turns of a thread compose the initial **capture**. Subsequent
turns are **refinement turns**.

### Advisory turn

System-emitted turn flagging that a refinement turn's LLM interpretation
conflicts with a pinned (manually-edited) field. Informational, not modal:
the manual edit wins by default; the user can tap "Mettre à jour" to accept
the new value, or "Ignorer" to dismiss. See ADR-0001.

## Semantic editing

Editing the recipe by emitting a new conversation turn. The system re-interprets
the thread end-to-end (or incrementally) and updates structured fields
accordingly. Example: user types "en fait c'est 30 min pas 45" → cook_time
field updates.

Distinct from **manual editing**.

## Manual editing

Direct mutation of structured fields via the existing recipe form UI
(`PUT /recipes/{id}`), or via chip / stepper answers to a system question.
Every manual edit *pins* the field — recorded in `recipes.manually_edited_fields`
(JSONB set of field names).

When a later refinement turn's LLM interpretation conflicts with a pinned
field, the system emits an **advisory turn** (informational, not modal).
The manual edit wins by default; the user can tap to accept the new value
or dismiss. See ADR-0001.

## source_capture (deprecated by ADR-0001)

JSONB column on `recipes` in the **legacy design** — held the raw capture
payload per surface (`{type: 'voice'|'photo'|'url'|'manual', payload: ...}`).
Assumed one input type per capture, which the new thread model breaks.

**Removed** in the same Alembic migration that adds `recipe_turns`. All
existing readers are rewritten to read from `recipe_turns` instead. No
compat shim (MVP posture, see CLAUDE.md). Invariant #5 (raw inputs kept
forever) is satisfied by `recipe_turns` going forward.
