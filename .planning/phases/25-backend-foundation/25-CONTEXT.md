# Phase 25: Backend foundation - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Land the `recipe_turns` table + drop `source_capture` + collapse the four `promote_*_draft` functions into one `promote_draft(recipe_id)` — all in a single reversible Alembic migration with no compat shim. All five existing capture surfaces (quick / full-form / voice / photo / url) keep promoting drafts to `status='structured'` through the new entry point. The `POST /recipes/{id}/turns` endpoint, LLM rework, capture-UI rewrite, and detail-thread UI are explicitly out of scope (Phases 26–29).

</domain>

<decisions>
## Implementation Decisions

### Backfill payload shapes (THREAD-02)

- **D-01:** Legacy MANUAL captures (`source_capture.type='manual'`, both quick and full-form) backfill to a `text` initial turn with payload `{"text": <original title from source_capture.payload.title>}`. The rest of the legacy `RecipeCreate` body stays on `recipes.*` columns — not duplicated into the turn payload. Minimal contract.
- **D-02:** Legacy PHOTO captures backfill to a `photo` initial turn with payload `{}`. `recipes.photo_paths` remains the source of truth for legacy photo data; the turn is a capture-surface marker, not a copy of paths.
- **D-03:** Legacy URL captures backfill to a `url` initial turn with payload `{"url": <original url>}`. Backfilled URLs stay un-extracted forever (no `extracted_html_path` field) — Phase 26 TURN-04 adds extraction for NEW url turns only.
- **D-04:** Legacy VOICE captures backfill to a `voice` initial turn with payload `{"transcript": <existing transcript>}` (carry forward verbatim).
- **D-05:** Recipes with `status='failed'` are **DELETED** by the migration. Explicit trade-off — deviates from ROADMAP.md Phase 25 success criterion 1 wording ("each recipe now carries one initial turn matching its legacy capture surface"). Failed rows are already broken (extraction failed, photo retry limited); cleanest cutover is removal. Update success-criterion 1 wording in the same change if a plan touches the ROADMAP.

### `promote_draft(recipe_id)` scope in Phase 25 (THREAD-04)

- **D-06:** Signature is `promote_draft(recipe_id: UUID) -> None`. The function opens its own `SessionLocal()`, reads the first user turn for `recipe_id`, dispatches on `turn.kind`. Matches REQUIREMENTS.md THREAD-04 verbatim.
- **D-07:** Phase 25's `promote_draft` does **NOT** emit `summary` system turns. It applies extracted fields to `recipes.*` (same `_apply_extracted` / `rewrite_title` paths as v0.5 RID-04) and broadcasts `recipe.promoted`. Phase 29 owns LLM emission of `summary` / `question` / `advisory` turns. Scope split is clean — Phase 25 is the pipeline shape, Phase 29 is the prompt rewrite.
- **D-08:** Photo bytes for NEW photo captures go to Supabase Storage in the **router** BEFORE the turn is created. The storage paths land in both `recipes.photo_paths` AND the photo turn payload (same paths, single upload — see D-10). `promote_draft` downloads bytes from Storage when running. Closes the `# TODO(productize)` for photo retry at `backend/app/services/llm.py:728-738` (today's "v0.1 doesn't re-download photo bytes from Supabase Storage" limitation).
- **D-09:** `retry_promotion` collapses to a thin wrapper: `def retry_promotion(recipe_id): promote_draft(recipe_id)`. The dispatch logic already reads from `recipe_turns`, so retry semantics fall out of `promote_draft` naturally. The `POST /recipes/{id}/retry-promotion` router endpoint stays in place.

### NEW turn payload shapes (post-cutover, going forward)

- **D-10:** NEW `photo` turn payload is `{"photo_paths": [<supabase storage paths>]}` — **same paths** as `recipes.photo_paths`. Router does one Storage upload, writes the same paths into both `recipes.photo_paths` and the turn payload. Single canonical reference, one Storage object per photo. Differs from the backfilled `{}` shape in D-02 — backfilled photos predate Storage-as-turn-input.
- **D-11:** NEW `url` turn payload is `{"url": str}` only. Phase 26 (TURN-04) extends to add `extracted_html_path` when the URL extraction BackgroundTask runs. Phased schema evolution; P25 does not implement extraction.
- **D-12:** NEW `text` turn payload is `{"text": str}`. NEW `voice` turn payload is `{"transcript": str}`. No origin metadata in v0.6 — per-member attribution (`member_id`), capture-via tags (`captured_via`), and source tags are explicitly productize-later (REQUIREMENTS.md §Out of Scope).

### SQL typing + Pydantic shape (THREAD-01)

- **D-13:** `recipe_turns.sender` and `recipe_turns.kind` are **TEXT + CHECK** constraints. `sender CHECK (sender IN ('user','system'))`. `kind CHECK (kind IN ('text','voice','photo','url','answer','proposal_accepted','proposal_dismissed','summary','question','advisory'))`. Matches Phase 24 RID-02 (24-CONTEXT.md D-10) precedent. Easier vocabulary evolution than `DROP TYPE` + `CREATE TYPE`.
- **D-14:** Both vocabularies mirror to **frontend/lib/enums.ts** in the same atomic change as the backend `Enum` classes in `backend/app/models/enums.py`. New types: `TurnSender` (`'user'|'system'`) and `TurnKind` (full vocabulary). Locked-vocabulary discipline (CLAUDE.md §Locked vocabularies). Drift between TS and Python is a bug category.
- **D-15:** Pydantic `TurnPayload` is a **discriminated union on `kind`** via `Annotated[Union[TextTurnPayload, VoiceTurnPayload, PhotoTurnPayload, UrlTurnPayload, AnswerTurnPayload, ...], Field(discriminator='kind')]`. Pydantic v2 validates payload shape against `kind` at the schema boundary. Strong typing locks the payload contract for Phases 26–29 to consume.
- **D-16:** `recipe_turns.position` is **0-indexed**. `UNIQUE(recipe_id, position)` is the canonical ordering constraint per REQUIREMENTS.md THREAD-01. Service code does `max(position)+1` on insert. Race-safety on rapid bubble inserts (CAPTURE-03 batched persistence) is Phase 26's problem to solve — Phase 25 only provides the schema constraint.

### Claude's Discretion

- Migration filename — follow the Alembic 000N pattern (next is `0009_add_recipe_turns_and_drop_source_capture.py` or similar).
- Exact `upgrade()` ordering. Recommend: create `recipe_turns` table → add `recipes.manually_edited_fields` column → DELETE failed rows → backfill turns from `source_capture` (pure SQL with `jsonb_extract_path` for speed/atomicity) → drop `source_capture` column.
- Indexes beyond the required `(recipe_id, position)` UNIQUE — the planner / researcher can propose extras (e.g., partial index on `sender='user'` if a hot read path emerges).
- Backfill implementation choice — pure SQL (one `INSERT ... SELECT FROM recipes` per `source_capture.type`) is recommended for atomicity; Python loop via SQLAlchemy is acceptable if it simplifies edge handling.
- `downgrade()` direction — REQUIREMENTS.md MIGRATION-01 requires reversibility. Implement best-effort reverse: recreate `source_capture` column, reconstruct `{type, payload}` from the recipe's first turn (the inverse of D-01–D-04), drop `recipe_turns` + `manually_edited_fields`. Failed-row deletion (D-05) is intentionally lossy on downgrade — document explicitly.
- Whether to expose a synthesized `initial_turn_kind: TurnKind | null` field on `RecipeResponse` (to let `RecipeDraftCard` keep its `captureType` branching with minimal change), or expose `turns: Turn[]` and let the frontend compute it. Plan-phase can decide; either way `frontend/components/RecipeDraftCard.tsx:65` must be rewritten in the same change.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner, executor) MUST read these before planning or implementing.**

### Milestone-level design
- `docs/adr/0001-recipe-conversation-thread.md` — Recipe conversation thread architecture, conflict UX rationale, rejected alternatives, consequences. Phase 25 implements the §Consequences bullets that touch backend + schema.
- `.planning/REQUIREMENTS.md` §THREAD-01..04 + §MIGRATION-01..02 — 6 reqs anchored to Phase 25.
- `.planning/ROADMAP.md` §"Phase 25: Backend foundation" — goal, 5 success criteria, invariants touched (#1, #5).
- `.planning/PROJECT.md` §"Current Milestone: v0.6" — locked decisions including MVP clean-drop posture.

### Architecture invariants
- `CLAUDE.md` §"Architecture invariants" — invariant #1 (capture pipeline shape, evolves to single `promote_draft(id)` entry point), invariant #4 (realtime — `turn.created` broadcast is Phase 26, not 25), invariant #5 (raw inputs preserved — satisfied by `recipe_turns` from this point forward).
- `CLAUDE.md` §"MVP phase posture" — no compat shim; single Alembic migration + single commit authorized.
- `CLAUDE.md` §"Locked vocabularies" — discipline for adding `TurnKind` / `TurnSender` to BOTH `frontend/lib/enums.ts` AND `backend/app/models/enums.py` in the same atomic change.

### Prior precedent (P25 should mirror)
- `.planning/milestones/v0.5-phases/24-recipe-identity/24-CONTEXT.md` §D-10 — TEXT+CHECK vs PG ENUM decision for `difficulty`; same pattern applies to `recipe_turns` vocabulary columns (D-13).
- `backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` — template for TEXT+CHECK migration, mirror in models + `Literal` types in `services/llm.py`.
- `backend/alembic/versions/0008_add_recipe_illustration_svg.py` — minimal-column-add Alembic pattern (no constraint changes).

### Cutover targets (must be rewritten in the same change as the migration)
- `backend/app/routers/recipes.py:76-79` (imports), `:89-93` (PUT field-update guard list), `:141-217` (full-form POST), `:224-247` (quick POST), `:312-400` (PUT + voice POST), `:462-509` (photo POST), `:544-617` (url POST + retry-promotion).
- `backend/app/services/llm.py:538-756` — `promote_voice_draft` / `promote_photo_draft` / `promote_quick_draft` / `promote_full_draft` / `retry_promotion` bodies. All five collapse / rewrite per D-06–D-09.
- `backend/app/cli/seed.py:475-477`, `:803-805` — `source_capture` writes in seed. Rewritten per MIGRATION-02 to insert one initial turn per seeded recipe.
- `backend/app/models/recipe.py:6` (docstring), `:71` (column definition) — `source_capture` column removed; `manually_edited_fields JSONB NOT NULL DEFAULT '[]'::jsonb` added.
- `backend/app/schemas/recipe.py:17`, `:102`, `:147` — `RecipeUpdate` / `RecipeResponse` references to `source_capture`. Decide between exposing synthesized `initial_turn_kind` or full `turns: list[TurnResponse]` (see Claude's Discretion).
- `frontend/lib/recipes.ts:25` — frontend `Recipe` type carries `source_capture: { type, payload? }`. Remove + replace with whatever shape the API exposes after the cutover.
- `frontend/components/RecipeDraftCard.tsx:11-13`, `:65` — reads `recipe.source_capture?.type`. Rewrite to read from the new field.
- `frontend/components/UrlCaptureTab.tsx:8`, `frontend/lib/recipe-completeness.ts:10`, `frontend/lib/recipe-completeness.test.ts:230` — comment / test references to `source_capture`. Cosmetic but the success-criterion grep (`grep -rn "source_capture" backend/`) explicitly targets `backend/`; frontend cleanup should be done in the same change to avoid drift.

### Locked vocabulary additions (same atomic change)
- `backend/app/models/enums.py` — add `TurnSender('user','system')` and `TurnKind` (`text','voice','photo','url','answer','proposal_accepted','proposal_dismissed','summary','question','advisory'`).
- `frontend/lib/enums.ts` — mirror `TurnSender` and `TurnKind` as `as const` arrays + `(typeof ARR)[number]` union types (matching existing `Difficulty` / `Cuisine` style).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `backend/app/services/realtime.broadcast_to_household(household_id, payload)` — already wired; `turn.created` broadcast lives in Phase 26 (out of scope here, but the pattern is ready).
- `backend/app/services/storage.py` — Supabase Storage upload helpers. Photo capture router reuses for the upload-before-turn-creation flow (D-08).
- `_record_failure` / `_record_rewrite_failure` (`services/llm.py:185-251`, `:472-507`) — failure-recording patterns reusable inside the new `promote_draft` body.
- `BackgroundTasks.add_task` pattern established across all 5 surfaces in Phase 24 RID-04 — preserved in `promote_draft` callsites.
- Alembic migration scaffolding from `0007` / `0008` — patterns for adding columns, CHECK constraints, mirroring to models.

### Established Patterns

- **Locked-vocabulary mirroring** (frontend/lib/enums.ts ↔ backend/app/models/enums.py) — Phase 24 RID-02 enforced this for `Difficulty`. Same discipline applies to `TurnKind` / `TurnSender` (D-14).
- **TEXT + CHECK** columns (Phase 24 RID-02 / 24-CONTEXT.md D-10) over PG ENUM for vocabularies likely to evolve — chosen for `recipe_turns.sender` / `.kind` (D-13).
- **Service-layer BackgroundTask body opens its own `SessionLocal()`** — invariant from `.planning/phases/02-llm-capture-w2/02-RESEARCH.md` §Pitfall 3.
- **Single uvicorn worker; APScheduler in-process** — invariant #7 (not touched by P25 but worth knowing).
- **ON DELETE CASCADE** for child rows of `recipes` (existing pattern for `cooking_logs`, `votes`). Apply to `recipe_turns.recipe_id` FK per REQUIREMENTS.md THREAD-01.

### Integration Points

- **5 POST handlers in `backend/app/routers/recipes.py`** — each rewritten to: (1) create draft `recipes` row, (2) for photo: upload bytes to Storage and capture paths, (3) insert first `recipe_turns` row (`position=0`, `sender='user'`, `kind` matching surface), (4) schedule `promote_draft(recipe.id)`, (5) return draft response. The full-form POST's `RecipeCreate` body is preserved on the `recipes.*` columns (title/ingredients/steps/etc) — no longer in source_capture.
- **`backend/app/cli/seed.py`** — rewritten to insert one initial turn per seeded recipe matching its legacy capture surface (MIGRATION-02). Idempotent `uuid5` + `Session.merge` pattern preserved. Grep gate `grep -rn "source_capture" backend/` returns zero matches after the change.
- **`frontend/lib/recipes.ts` `Recipe` type** — `source_capture` field removed. Replacement shape depends on API choice (synthesized `initial_turn_kind` vs full `turns` list).
- **`frontend/components/RecipeDraftCard.tsx`** — `captureType` derivation rewritten against the new API field.

</code_context>

<specifics>
## Specific Ideas

- **"Minimal payload" is the consistent thread** across all four areas: text-only minimal (D-01), photo empty payload backfill (D-02), photo `{photo_paths}` only for new (D-10), url `{url}` only (D-03 + D-11), voice `{transcript}` only (D-04 + D-12), text `{text}` only (D-12). Narrow contracts that downstream phases extend — not over-shaped now.
- **Failed-row delete (D-05) is a deliberate-cleanup move**, matching MVP "single Alembic migration + single commit" posture. The user is explicitly OK trading the literal ROADMAP success-criterion-1 wording for a cleaner cutover.
- **Closing the photo-retry `TODO(productize)` inside P25** (D-08, via Storage upload + paths in turn payload) is a small scope expansion that pays the v0.1 debt cleanly within the foundation work. v0.6 is the right moment because the photo turn shape is being defined fresh.

</specifics>

<deferred>
## Deferred Ideas

- **Per-member attribution on user turns** (`member_id` column on `recipe_turns`) — REQUIREMENTS.md §Out of Scope, productize-later.
- **Origin tags on voice/text turns** (`captured_via`, `source`) — small scope, low value at couple-scale; productize-later.
- **LLM emission of `summary` / `question` / `advisory` turns from `promote_draft`** — Phase 29 explicitly (D-07).
- **`manually_edited_fields` write path** (PUT /recipes/{id} mutation) — Phase 28 DETAIL-05. P25 only adds the column with default `[]`.
- **`POST /recipes/{id}/turns` endpoint surface** — Phase 26 TURN-01.
- **URL extraction implementation** (extracted_html_path on url turns) — Phase 26 TURN-04. P25's url turn payload shape (D-11) is forward-compatible: Phase 26 just adds the field.
- **`turn.created` WebSocket broadcast** — Phase 26 TURN-03. P25's backfill-inserted turns do NOT broadcast (they're database-internal cutover artifacts).
- **GET /recipes/{id}/turns list endpoint** for chat hydration — Phase 26 owns the endpoint surface.

</deferred>

---

*Phase: 25-backend-foundation*
*Context gathered: 2026-05-13*
</content>
</invoke>