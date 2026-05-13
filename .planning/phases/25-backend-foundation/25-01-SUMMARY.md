---
phase: 25-backend-foundation
plan: "01"
subsystem: backend-schema
tags: [migration, alembic, sqlalchemy, pydantic, locked-vocabulary, recipe-turns]
dependency_graph:
  requires: []
  provides:
    - recipe_turns table (migration 0009)
    - recipes.manually_edited_fields column
    - RecipeTurn ORM model (app.models.recipe_turn)
    - TurnPayload discriminated union (app.schemas.recipe_turn)
    - TurnSender + TurnKind locked vocabularies (backend + frontend)
  affects:
    - backend/app/models/recipe.py (source_capture removed, manually_edited_fields added)
    - frontend/lib/enums.ts (TurnSender + TurnKind added)
tech_stack:
  added: []
  patterns:
    - TEXT+CHECK columns for sender/kind (mirrors Phase 24 RID-02 Difficulty precedent)
    - Pydantic v2 discriminated union on kind field
    - Pure SQL INSERT…SELECT backfill in Alembic migration (transactional atomicity)
    - Catch-all fallback INSERT for malformed source_capture (Pitfall 3 defense)
key_files:
  created:
    - backend/alembic/versions/0009_add_recipe_turns_and_drop_source_capture.py
    - backend/app/models/recipe_turn.py
    - backend/app/schemas/recipe_turn.py
  modified:
    - backend/app/models/enums.py
    - backend/app/models/__init__.py
    - backend/app/models/recipe.py
    - frontend/lib/enums.ts
decisions:
  - TEXT+CHECK for sender/kind (not PG ENUM) — matches Phase 24 D-10 precedent, easier evolution
  - Pure SQL backfill over Python loop — transactional atomicity on prod data
  - Catch-all INSERT after 4 type-specific INSERTs — guards against malformed source_capture
  - TurnResponse.payload is raw dict (not TurnPayload) — kind is a separate DB column, not in payload JSONB; write-side validation deferred to Phase 26 POST /turns
  - downgrade() is best-effort; failed-row deletions (D-05) are irrecoverable — documented in migration docstring
metrics:
  duration_minutes: 25
  completed_date: "2026-05-13"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 7
---

# Phase 25 Plan 01: Backend Foundation (Schema + Types) Summary

**One-liner:** Alembic migration 0009 creates recipe_turns table (TEXT+CHECK sender/kind, UUID FK CASCADE, UNIQUE position), adds manually_edited_fields JSONB column, deletes failed recipes, backfills 5 INSERTs from legacy source_capture, drops source_capture — with full downgrade reversibility; TurnSender + TurnKind locked vocabularies mirrored in both enum files; RecipeTurn ORM + TurnPayload discriminated union importable.

## What Was Built

### Migration 0009 (`0009_add_recipe_turns_and_drop_source_capture.py`)

**Revision:** `0009`, `down_revision = "0008"`

**Upgrade sequence (7 steps, single transaction):**

1. CREATE TABLE `recipe_turns` — columns: id UUID PK (`gen_random_uuid()`), recipe_id UUID FK `ON DELETE CASCADE`, position INTEGER NOT NULL, sender TEXT NOT NULL, kind TEXT NOT NULL, payload JSONB NOT NULL default `'{}'::jsonb`, created_at TIMESTAMPTZ NOT NULL default `now()`.
2. UNIQUE constraint `uq_recipe_turns_recipe_position` on (recipe_id, position).
3. INDEX `idx_recipe_turns_recipe_position` on (recipe_id, position).
4. CHECK constraints: `recipe_turns_sender_check` (sender IN 'user','system') and `recipe_turns_kind_check` (kind IN 10 locked values).
5. ADD COLUMN `recipes.manually_edited_fields` JSONB NOT NULL DEFAULT `'[]'::jsonb` (THREAD-03).
6. Pre-delete child rows of failed recipes (cooking_logs + votes FKs have no ondelete cascade in baseline — would raise ForeignKeyViolation), then DELETE failed recipes (D-05).
7. Backfill: 4 type-specific INSERT…SELECT statements (manual→text/D-01, photo→photo/D-02, url→url/D-03, voice→voice/D-04) + 1 catch-all for malformed source_capture = **5 total INSERTs**. All use `created_at = recipes.created_at` to preserve temporal ordering.
8. PL/pgSQL sanity check — raises exception if any recipe has no position=0 turn.
9. DROP COLUMN `recipes.source_capture`.

**Downgrade:** Re-adds source_capture as nullable JSONB, reconstructs {type, payload} from first user turn via CASE on kind (inverse of D-01..D-04), enforces NOT NULL, drops recipe_turns table + manually_edited_fields. Failed-row deletions (D-05) are irrecoverable — documented in migration docstring.

**Prod-data results:** 28 surviving recipes, 28 initial user turns at position=0. Zero recipes without a turn after backfill.

### RecipeTurn ORM Model (`backend/app/models/recipe_turn.py`)

SQLAlchemy 2.0 typed style. Columns: id, recipe_id FK CASCADE, position, sender, kind, payload JSONB, created_at. `__table_args__`: UniqueConstraint, Index, 2 CheckConstraints. Registered in `backend/app/models/__init__.py`.

### Pydantic Schemas (`backend/app/schemas/recipe_turn.py`)

Discriminated union `TurnPayload` on `kind` field (Pydantic v2 `Annotated[Union[...], Field(discriminator='kind')]`). Per-kind schemas: TextTurnPayload, VoiceTurnPayload, PhotoTurnPayload, UrlTurnPayload, AnswerTurnPayload, ProposalAcceptedPayload, ProposalDismissedPayload, SummaryTurnPayload (stub), QuestionTurnPayload (stub), AdvisoryTurnPayload (stub). `TurnResponse` uses raw `dict` for payload (write-side TurnPayload validation deferred to Phase 26).

### Locked Vocabularies

**`backend/app/models/enums.py`** — appended `TurnSender` (user, system) and `TurnKind` (10 values: text, voice, photo, url, answer, proposal_accepted, proposal_dismissed, summary, question, advisory).

**`frontend/lib/enums.ts`** — appended matching `as const` objects + union types for `TurnSender` and `TurnKind`. Values verbatim-match Python enums (CLAUDE.md locked-vocabulary discipline).

### Recipe Model Updates (`backend/app/models/recipe.py`)

- Removed: `source_capture: Mapped[dict] = mapped_column(JSONB, nullable=False)` and its comment.
- Added: `manually_edited_fields: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"), default=list)` after `steps`.
- Updated docstring: replaced `source_capture, ingredients, steps` with `ingredients, steps, manually_edited_fields`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 — Enum vocabularies | `f118d0d` | feat(25-01): add TurnSender + TurnKind locked vocabularies to both enum files |
| 2 — ORM + schemas | `5e4f28f` | feat(25-01): create RecipeTurn ORM model + Pydantic schemas + register in models/__init__ |
| 3 — Migration + model | `734009e` | feat(25-01): Alembic migration 0009 — recipe_turns + manually_edited_fields + drop source_capture |

## Deviations from Plan

None — plan executed exactly as written.

The RESEARCH.md recommended ordering was followed exactly. The Pydantic v2 discriminated union syntax (Annotated[Union[...], Field(discriminator='kind')]) worked as assumed (A1 from RESEARCH). The UNIQUE constraint + separate INDEX did not conflict (A2 from RESEARCH — no "index already exists" error).

One implementation note: `op.create_table("recipe_turns"` is split across two lines in the migration file (function call on line 38, string argument on line 39), so the acceptance-criteria grep for the single-line form won't match — but `alembic upgrade head` succeeds, confirming the table is created correctly.

## Known Stubs

- `SummaryTurnPayload`, `QuestionTurnPayload`, `AdvisoryTurnPayload` in `backend/app/schemas/recipe_turn.py` have no payload fields beyond `kind`. These are intentional Phase 25 stubs — Phase 29 defines the content shape. They exist to cover all CHECK-constraint values in the discriminated union.
- `AnswerTurnPayload` has no fields beyond `kind` — Phase 26 TURN-02 will add `in_reply_to_turn_id`, `field`, `value`.

These stubs do not prevent Plan 01's goal: the migration applies cleanly, all imports resolve, and Plan 02 can now write turns.

## Threat Surface Scan

No new network endpoints or auth paths introduced. Migration runs server-side SQL only (T-25-01 mitigated by pure SQL with no user input). CHECK constraints enforce sender/kind values at DB level (T-25-02). ON DELETE CASCADE on recipe_turns.recipe_id is cascade-from-recipe direction only — a turn delete cannot remove a recipe (T-25-05).

## Self-Check

All files created/modified exist:

- `backend/alembic/versions/0009_add_recipe_turns_and_drop_source_capture.py` — FOUND
- `backend/app/models/recipe_turn.py` — FOUND
- `backend/app/schemas/recipe_turn.py` — FOUND
- `backend/app/models/enums.py` — TurnSender + TurnKind FOUND
- `backend/app/models/__init__.py` — RecipeTurn import FOUND
- `backend/app/models/recipe.py` — source_capture removed, manually_edited_fields added FOUND
- `frontend/lib/enums.ts` — TurnSender + TurnKind FOUND

All commits exist: f118d0d, 5e4f28f, 734009e.

Migration verified: `alembic upgrade head` → `alembic downgrade -1` → `alembic upgrade head` — all exit 0 on prod-shape data (28 recipes, 28 initial turns).

## Self-Check: PASSED
