# Phase 25: Backend foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 25-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 25-backend-foundation
**Areas discussed:** Backfill payload shapes · promote_draft(id) scope in P25 · NEW turn payload shapes · SQL + Pydantic typing

---

## Backfill payload shapes (THREAD-02)

### Q: For backfilled MANUAL captures, the initial `text` turn payload should be?

| Option | Description | Selected |
|--------|-------------|----------|
| text-only minimal | `{text: <original title>}`. Rest of legacy RecipeCreate body lives on `recipes.*` columns — no need to duplicate. | ✓ |
| text + legacy_body | `{text, legacy_body: <full RecipeCreate>}`. Preserves invariant #5 literally. | |
| text + manually_typed | `{text}` + every populated field added to `recipes.manually_edited_fields` so user entries are pinned. | |

**User's choice:** text-only minimal — narrow contract, recipes.* is source of truth.

### Q: For backfilled PHOTO captures, the initial `photo` turn payload should be?

| Option | Description | Selected |
|--------|-------------|----------|
| snapshot photo_paths | `{photo_paths: <copy of recipes.photo_paths>}`. Self-contained turn. | |
| count only | `{photo_count: N}`. Matches today's source_capture shape exactly. | |
| empty payload | `{}`. Pure marker; recipes.photo_paths is source of truth. | ✓ |

**User's choice:** empty payload — cleanest schema; recipes.photo_paths owns photo data for legacy.

### Q: For recipes with status='failed', backfill should?

| Option | Description | Selected |
|--------|-------------|----------|
| same rule as success | Create one initial turn matching legacy capture surface; retry stays viable. | |
| backfill + error metadata | Initial turn includes `legacy_promotion_error`. | |
| skip failed rows | Don't backfill turns for failed rows (violates invariant #5). | ✓ |

**User's choice:** skip failed rows.

### Follow-up Q: If failed rows are skipped, what does the migration actually do with them?

| Option | Description | Selected |
|--------|-------------|----------|
| delete failed rows in migration | DELETE FROM recipes WHERE status='failed'. Clean cutover. Deviates from ROADMAP success-criterion 1. | ✓ |
| leave as tombstones | Keep failed rows; retry returns 410 Gone; user must manually delete. | |
| reconsider — backfill them | Backfill failed rows like success rows. | |

**User's choice:** delete failed rows in migration. Explicit cleanup.

### Q: For backfilled URL captures, the initial `url` turn payload should be?

| Option | Description | Selected |
|--------|-------------|----------|
| minimal {url} | `{url: str}` only. Phase 26 TURN-04 adds extracted_html_path on NEW turns only. | ✓ |
| schema-stable {url, extracted_html_path:null} | Uniform read shape; null = not extracted. | |
| schema + timestamp | Fully shaped `{url, extracted_at:null, extracted_html_path:null, extraction_status:'pending'}`. | |

**User's choice:** minimal {url} — backfilled URLs stay un-extracted forever.

---

## promote_draft(id) scope in Phase 25 (THREAD-04)

### Q: Does P25's promote_draft emit a `summary` system turn after successful extract?

| Option | Description | Selected |
|--------|-------------|----------|
| wait for Phase 29 | Keep current behavior; no system turns emitted in P25. Phase 29 owns the LLM rework. | ✓ |
| emit minimal summary now | Write a `summary` turn with extracted fields; Phase 29 swaps the prompt later. | |
| emit summary + placeholder questions | Already wire recipe-completeness-driven `question` turns. | |

**User's choice:** wait for Phase 29 — clean scope split.

### Q: What's the promote_draft signature in P25?

| Option | Description | Selected |
|--------|-------------|----------|
| promote_draft(recipe_id) reads first turn | Single arg; matches REQUIREMENTS.md THREAD-04 verbatim. | ✓ |
| promote_draft(recipe_id, *, args) | Keep router-arg pattern for non-persisted data (photo bytes). | |
| promote_draft(recipe_id, first_turn_payload) | Router reads turn synchronously and passes payload. | |

**User's choice:** promote_draft(recipe_id) reads first turn — REQUIREMENTS-aligned.

### Q: How does promote_draft get photo bytes for NEW photo captures in P25?

| Option | Description | Selected |
|--------|-------------|----------|
| preserve v0.1 limitation | Router still passes bytes inline via add_task. TODO(productize) stays. | |
| upload to Supabase Storage in router | Bytes go to Storage before turn creation; promote_draft re-downloads. Closes TODO(productize). | ✓ |
| store bytes in turn payload (JSONB) | Inline base64 in JSONB. ~40MB rows. | |

**User's choice:** upload to Supabase Storage in router — closes the v0.1 productize gap.

### Q: What happens to retry_promotion in Phase 25?

| Option | Description | Selected |
|--------|-------------|----------|
| collapse into promote_draft | retry_promotion(id) becomes thin wrapper calling promote_draft(id). | ✓ |
| separate but rewritten to read turns | Stays as own function; reads first turn instead of source_capture. | |
| defer retry rewrite to Phase 26 | Not viable — P25 cutover would break retry temporarily. | |

**User's choice:** collapse into promote_draft.

---

## NEW turn payload shapes (post-cutover)

### Q: For a NEW photo capture, are storage paths in the turn payload the same paths as recipes.photo_paths?

| Option | Description | Selected |
|--------|-------------|----------|
| same paths (single source) | One Storage upload; same paths in recipes.photo_paths and turn payload. | ✓ |
| separate (input vs canonical) | turn = `{photo_input_paths}`; recipes.photo_paths is current display. | |
| turn payload {} + recipes.photo_paths | Symmetric with backfilled photo turns; recipes is source of truth. | |

**User's choice:** same paths (single source).

### Q: For a NEW url capture, the turn payload shape?

| Option | Description | Selected |
|--------|-------------|----------|
| minimal {url} now, extend in Phase 26 | P25 writes `{url: str}` only; Phase 26 TURN-04 extends with extracted_html_path. | ✓ |
| forward-compat {url, extracted_html_path:null} | Same shape for old and new url turns; null = not extracted. | |
| P25 owns extraction too | Implement URL extraction in P25's promote_draft. Out-of-scope expansion. | |

**User's choice:** minimal {url} now, extend in Phase 26.

### Q: For NEW voice/text turns, payload metadata?

| Option | Description | Selected |
|--------|-------------|----------|
| content only | `voice = {transcript}`, `text = {text}`. Minimal. | ✓ |
| content + origin tag | `{transcript, captured_via}`. Useful for analytics later. | |
| content + member attribution | `{member_id}`. Out of scope per REQUIREMENTS.md. | |

**User's choice:** content only.

---

## SQL + Pydantic typing (THREAD-01)

### Q: recipe_turns.sender / kind SQL type?

| Option | Description | Selected |
|--------|-------------|----------|
| TEXT + CHECK (RID-02 precedent) | TEXT columns with CHECK constraints listing allowed values. | ✓ |
| Native PG ENUM (recipe_status precedent) | Two new PG ENUMs `turn_sender` and `turn_kind`. Harder to evolve. | |
| TEXT no constraint | Python-only enforcement. Listed only to rule out. | |

**User's choice:** TEXT + CHECK.

### Q: Mirror the turn vocabulary in frontend/lib/enums.ts?

| Option | Description | Selected |
|--------|-------------|----------|
| yes — TurnKind + TurnSender | Both vocabularies mirrored. Strict locked-vocabulary discipline. | ✓ |
| yes for kind, no for sender | TurnKind only; sender stays inline-string (binary). | |
| defer to Phase 26 | Add frontend mirror when Phase 26 wires the endpoint. | |

**User's choice:** yes — TurnKind + TurnSender.

### Q: Pydantic Turn payload schema?

| Option | Description | Selected |
|--------|-------------|----------|
| Discriminated union on kind | Per-kind payload schemas under `Annotated[Union[...], Field(discriminator='kind')]`. | ✓ |
| Generic payload: dict + per-kind validators | Single Turn schema with `payload: dict`; service-level validation. | |
| Discriminated union for USER kinds only | Strong typing for user-emitted kinds; system kinds dict-typed. | |

**User's choice:** discriminated union on kind.

### Q: recipe_turns.position numbering?

| Option | Description | Selected |
|--------|-------------|----------|
| 0-indexed, UNIQUE(recipe_id, position) | First turn position=0. Service does max+1 on insert. | ✓ |
| 1-indexed, UNIQUE(recipe_id, position) | First turn position=1. Human-friendly. | |
| monotonic from sequence, no UNIQUE | PG sequence per recipe; race-prone. Listed only to rule out. | |

**User's choice:** 0-indexed, UNIQUE(recipe_id, position).

---

## Claude's Discretion

- Migration filename (Alembic 000N pattern; next is 0009).
- Exact upgrade() body ordering.
- Backfill SQL implementation choice (pure SQL vs Python loop).
- Index design beyond UNIQUE(recipe_id, position).
- downgrade() best-effort reverse logic.
- API shape for replacing source_capture in RecipeResponse (`initial_turn_kind` field vs full `turns` list).

## Deferred Ideas

- Per-member attribution (member_id on turns) — productize-later.
- Origin tags on voice/text — productize-later.
- LLM summary/question/advisory emission — Phase 29.
- manually_edited_fields write path — Phase 28 DETAIL-05.
- POST /recipes/{id}/turns endpoint — Phase 26 TURN-01.
- URL extraction (extracted_html_path) — Phase 26 TURN-04.
- turn.created WebSocket broadcast — Phase 26 TURN-03.
- GET /recipes/{id}/turns list endpoint — Phase 26.
</content>
</invoke>