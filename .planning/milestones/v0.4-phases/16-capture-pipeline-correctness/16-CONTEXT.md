# Phase 16: Capture pipeline correctness - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Mode:** Auto (--auto) — Claude picked recommended defaults

<domain>
## Phase Boundary

Three independent fixes against the capture pipeline:

1. **CAP-01 (C-4) — Failed-state recovery:** Today, when Gemini extraction fails (parse error, schema mismatch, garbage response), the draft stays at `status='draft'` with `(extraction en cours…)` displayed forever — invariant #1's "promotion runs to terminal state" contract is broken. Phase 16 adds a `failed` terminal state to `RecipeStatus`, persists the failure cause in the existing `recipes.promotion_error` text column (already nullable, see `models/recipe.py:114`), and surfaces it in the inbox.
2. **CAP-02 — Inbox failed-state UI:** `/inbox` renders a French failed-state label + inline `Réessayer` and `Supprimer` actions at 48px tap target. Réessayer re-runs the BackgroundTask via a new `POST /api/recipes/{id}/retry-promotion` endpoint that resets `status='draft'`, clears `promotion_error`, and re-fires the same `promote_recipe_in_background` path the capture surfaces use today.
3. **CAP-03 (B-2 / Issue #2) — Ingredient parser fix:** The regex at `frontend/components/RecipeForm.tsx:98-100` greedily captures any letter sequence as `unit`, so `4 tomates` becomes `{name: "4 tomates", quantity: 4, unit: "tomates"}` and renders as "4 tomates 4 tomates". Fix is a unit whitelist (g, kg, ml, l, cl, dl, c., c.s., c.c., pcs, etc.) — non-whitelisted second token falls into `name`.

Out of scope: URL extraction stub (URL-01, stays `# TODO(productize)`); any change to the LLM prompt itself; any change to the photo/voice/quick capture surfaces themselves (we only change what happens AFTER promotion fails).

</domain>

<decisions>
## Implementation Decisions

### CAP-01: failed-state enum + persistence

- **D-16-01:** Add `failed = "failed"` to `backend/app/models/recipe.py:RecipeStatus` (after `structured`, before any later additions). Mirror in `frontend/lib/recipes.ts:23` `status` type literal `"draft" | "structured" | "verified" | "failed"`. **Per invariant locked-vocabulary contract in CLAUDE.md, both enum sites change in the SAME commit.**
- **D-16-02:** Alembic migration `0006_recipe_status_failed.py` adds the value to the Postgres enum via `ALTER TYPE recipe_status ADD VALUE 'failed'`. SQLite test path is untouched because no SQLite test runner exists. Migration is idempotent via `IF NOT EXISTS` guard.
- **D-16-03:** `recipes.promotion_error` column already exists (`models/recipe.py:114` — nullable Text, added in `0003_promotion_columns.py`). No new column needed. The BackgroundTask catches Gemini parse failures + schema-validation errors and stores a human-readable French sentence (max 500 chars, truncated with `…` suffix if longer) — e.g., "L'IA n'a pas pu extraire la recette. Vérifie l'audio ou la photo et réessaie."
- **D-16-04:** `recipes.status` transitions: `draft` → `structured` (success) | `draft` → `failed` (any Gemini parse failure, schema mismatch, network timeout > 30s). The `verified` state stays unused for v0.4 (was reserved for human-confirmed post-edit). `structured` and `failed` are terminal states for v0.4; only `Réessayer` resets `failed` → `draft`.
- **D-16-05:** Retry endpoint: `POST /api/recipes/{id}/retry-promotion` (member-scoped, household-scoped 404 contract). Returns the freshly-reset draft (status=draft, promotion_error=null) and fires `promote_recipe_in_background` immediately. Idempotent — retrying a draft that's already in `structured` is a no-op 200; retrying a `failed` draft re-runs promotion.

### CAP-02: failed-state UI in /inbox

- **D-16-06:** Inbox card surface — for drafts with `status='failed'`:
  - Replace the "extraction en cours…" placeholder with a French failed-state label (i18n key `inbox.failed.label`, value "Extraction échouée").
  - Below the label, show the truncated `promotion_error` (i18n: `inbox.failed.context`).
  - Inline `Réessayer` (primary) + `Supprimer` (ghost/destructive) buttons, both at `h-12` (48px tap target per W4 polish convention from Phase 6).
  - On `Réessayer` tap: POST `/api/recipes/{id}/retry-promotion`, optimistically flip the local status to `draft`, show a brief toast on success/error.
  - On `Supprimer` tap: `DELETE /api/recipes/{id}` (existing endpoint), AlertDialog confirmation prompt for the destructive action.
- **D-16-07:** No new component file — extend `frontend/components/InboxCard.tsx` (or wherever the inbox card lives; planner verifies) with a `failed`-state branch. Reuse the existing `Card` primitive, `Button` primitive, and `AlertDialog` primitive.
- **D-16-08:** Realtime: `recipe.updated` already broadcasts on status transitions — frontend listens via existing CustomEvent bridge. No new event type.

### CAP-03 / Ingredient parser fix

- **D-16-09:** Replace the regex at `frontend/components/RecipeForm.tsx:98-100` with a unit-whitelist approach. The whitelist (case-insensitive, accent-tolerant): `g, gr, kg, mg, ml, cl, dl, l, oz, lb, c, c.s., c.c., cs, cc, càs, càc, c. à s., c. à c., tasse, tasses, pcs, pièce, pièces, gousse, gousses, pincée, branche, brin`. If the second token after the quantity matches the whitelist, it's a unit; otherwise it's part of the name. The qty stays as-is.
- **D-16-10:** Fix applied frontend-only (RecipeForm is the parsing surface). Backend `recipes.ingredients` JSONB stays as-is — the bug is in the JS regex, not the DB shape. Backfilling already-broken rows is out of scope (couple-scale, ~21 seeded recipes; manual correction is acceptable).
- **D-16-11:** The Gemini extraction path at `services/llm.py:131` (`ingredients: list[GeminiIngredient]`) already returns structured `{name, quantity, unit}` from the LLM — no parser involved. CAP-02 only affects the manual full-form path through `RecipeForm.tsx`. Voice/photo paths don't hit this regex.

### Test coverage

- **D-16-12:** Backend: add `backend/tests/test_recipes.py::test_promotion_failure_sets_failed_state` — mocks the Gemini service to raise a parse error, asserts the draft transitions to `status='failed'` with a non-null `promotion_error`. Add `test_retry_promotion_resets_to_draft` — asserts the retry endpoint resets the state and fires the background task.
- **D-16-13:** Frontend e2e: extend `frontend/tests/e2e/capture-voice.spec.ts` (currently `test.fixme` for stub coverage) with a happy-path that exercises the failed-state UI: stub Gemini to fail, observe inbox surfaces the `Extraction échouée` label, tap `Réessayer`, observe state flip back to draft. **The spec stays in the seeded project; it does not require a real Gemini call (the env-flag stub from v0.2.1 D-04 already short-circuits in test env).**
- **D-16-14:** Frontend unit-ish test (Playwright spec): `frontend/tests/e2e/recipe-form-ingredient-parser.spec.ts` — enters `4 tomates`, `1 oignon rouge`, `500 g de farine`, `2 c.s. d'huile` in the full-form ingredients textarea, submits, opens the resulting recipe, asserts each ingredient line renders without duplication.

### Claude's Discretion

- Exact Alembic migration shape (use `op.execute("ALTER TYPE recipe_status ADD VALUE IF NOT EXISTS 'failed'")` vs SQLAlchemy enum reflection) — planner picks the standard Postgres pattern.
- Exact unit whitelist scope — start narrow (the 4 success-criteria examples + a baseline 10-15 entries), expand later if user reports false negatives.
- Whether `Supprimer` should have an undo or be hard-delete — current `DELETE /api/recipes/{id}` is hard-delete, no soft-delete column exists. Stay hard-delete with AlertDialog confirmation.
- Inbox card layout — planner reuses Phase 6's `paper-grain` + `font-display` shape.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & invariants
- `CLAUDE.md` §Architecture invariants — invariant #1 (five capture surfaces, one shape) — extended terminal-state set goes from `{structured}` to `{structured, failed}`.
- `CLAUDE.md` §Locked vocabularies — `RecipeStatus` is in BOTH `frontend/lib/recipes.ts` (was: status type literal) and `backend/app/models/recipe.py` `RecipeStatus` Enum. Drift is a bug category — both change in the same commit.
- `SPEC.md` §Capture pipeline — the 5-surface shape; promotion via `BackgroundTask`.

### Audit corpus (source of these bugs)
- `.planning/v0.3/ASSESSMENT.md` — entries B-2 (Issue #2, ingredient parser) and C-4 (failed-state recovery).
- `.planning/v0.3/WALKTHROUGH.md` §"Stuck (extraction en cours…)" cluster.
- GitHub Issue #2 (ingredient duplication) — closed-by labels apply when shipping CAP-02 fix.
- GitHub Issue #3 (extraction stuck) — closed-by labels apply when shipping CAP-01 + CAP-02.

### Code sites to modify
- Backend (CAP-01): `backend/app/models/recipe.py:35` (RecipeStatus enum); `backend/app/models/recipe.py:63,114` (status + promotion_error columns — promotion_error already exists); `backend/app/routers/recipes.py:111` (capture entry points, currently 5 surfaces); `backend/app/services/llm.py` (Gemini extraction — needs try/except around parse to set `failed`).
- Backend (CAP-01 migration): `backend/alembic/versions/0006_recipe_status_failed.py` (NEW).
- Backend (CAP-01 retry endpoint): `backend/app/routers/recipes.py` (NEW endpoint at top-level).
- Frontend (CAP-01 mirror): `frontend/lib/recipes.ts:23` (status type literal).
- Frontend (CAP-02 UI): the inbox card component — planner verifies whether it's `frontend/components/InboxCard.tsx` or wired directly into `frontend/app/inbox/page.tsx`. Also adds i18n keys to `frontend/lib/i18n/fr.json` under `inbox.failed.*`.
- Frontend (CAP-03 parser): `frontend/components/RecipeForm.tsx:90-108` (`formValuesToBody` function).

### Prior phase context (carried forward — not re-decided)
- Phase 6 §"CAPTURE-11 W4 tap-target gap closed" — 48px tap target convention for all capture-flow buttons. Réessayer + Supprimer must honor this.
- Phase 8 §"Recipe detail surface" — `Ingrédients` list rendering shape (margin-rule, terracotta-30); CAP-03 fix manifests on this surface.
- Phase 10 (v0.2.1) §"Env-flag stub for Gemini" (D-04) — `if settings.environment == "test":` short-circuit gives deterministic canned data. CAP-01 backend test uses this same gate to make Gemini fail deterministically.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `recipes.promotion_error: str | None` column already exists at `backend/app/models/recipe.py:114` — no new migration needed for this column; only the enum value.
- `Card`, `Button`, `AlertDialog`, paper-grain styling — all from Phase 5 design system, ready to use.
- `recipe.updated` WebSocket broadcast already covers status transitions via `services/realtime.broadcast_to_household` — no new event type.
- `DELETE /api/recipes/{id}` already exists for the Supprimer action.
- `promote_recipe_in_background` (the BackgroundTask) is the shared promotion entry — the retry endpoint re-fires it without re-implementing.

### Established Patterns
- **Locked-vocabulary parity:** both enum sites change in the same commit (CLAUDE.md). Drift detector pattern from `lib/votes.ts:78-95` is the model — Phase 16 may or may not add a similar drift detector for RecipeStatus (planner decides; not strictly required by ROADMAP success criteria).
- **i18n via next-intl:** all new strings go through `frontend/lib/i18n/fr.json` — never hardcoded.
- **48px tap target** for all post-onboarding action buttons (CAPTURE-11 W4 convention).
- **Env-flag stub for Gemini** at the service boundary (`if settings.environment == "test":`) — Phase 16 backend tests use this to force failure deterministically.

### Integration Points
- `BackgroundTask` promotion path is in `backend/app/routers/recipes.py` — the try/except for `failed` state lives at the outer boundary of `promote_recipe_in_background`.
- Inbox surfaces drafts via `GET /api/recipes?status=draft` (verify with planner); the `failed` state needs to be returned by this list filter too (or surfaced via a separate `status in (draft, failed)` query).
- Recipe-detail `Ingrédients` rendering — planner verifies the render shape to confirm the parser fix observably affects display.

</code_context>

<specifics>
## Specific Ideas

- User explicitly named the duplication symptom: `4 tomates 4 tomates` (ASSESSMENT.md B-2 entry). The fix is rendering-correct WITHOUT changing the JSONB shape — the regex output is what's wrong, not the storage.
- The retry endpoint name `retry-promotion` reads cleanly in French log lines; the alternative `repromote` is rejected because it's ambiguous (could mean "promote again from the structured state").

</specifics>

<deferred>
## Deferred Ideas

- **URL extraction (URL-01):** stays `# TODO(productize)` per PROJECT.md milestone scope. The CAP-01 work surfaces the deferred stub via the new `failed` state when URL drafts fail; we don't resolve the extraction itself.
- **Soft-delete column on recipes:** Supprimer stays hard-delete (couple-scale; no recovery surface needed).
- **`verified` state activation:** the `verified` enum value remains unused in v0.4. Future v2 enables it for human-confirmed post-edit drafts.
- **Backfill broken ingredient rows:** ~21 seeded recipes may have garbled `{name, quantity, unit}` from the old parser. Manual correction acceptable at couple-scale. Backfill script is out of scope.
- **RecipeStatus drift detector** on the frontend (mirror of Phase 15's `lib/votes.ts:78-95` pattern). Nice-to-have but not in success criteria.

</deferred>

---

*Phase: 16-capture-pipeline-correctness*
*Context gathered: 2026-05-11*
