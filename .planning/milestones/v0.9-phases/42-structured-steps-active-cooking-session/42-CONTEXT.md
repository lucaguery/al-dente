# Phase 42: Structured Steps + Active Cooking Session - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship structured cooking steps end-to-end:

1. **`recipes.steps` JSONB column** (STEP-01): Alembic migration adds the column. Default empty array; new captures populate via Gemini; existing recipes get backfilled lazily.
2. **Gemini prompt-schema update** (STEP-02): The structured-extraction prompt now requests `steps[]` with `text` + `ingredient_refs[]` cross-referencing ingredient names.
3. **Lazy backfill on first /active visit** (STEP-03): When a user opens `/cooking-logs/[id]/active` for a recipe with empty steps, backend fires Gemini in a BackgroundTask + returns immediately; `recipe.updated` broadcast triggers UI to render steps once extraction completes.
4. **Active cooking session route** (ACTV-01/02/03): NEW `app/cooking-logs/[id]/active/page.tsx`. Progress segments, step navigator (prev/next), ingredient cross-ref line, "Terminé · marquer cuisinée" CTA → existing `/cooking-logs/[id]/finalize`.

Touches invariant #1 (server-side BackgroundTask + broadcast pattern), invariant #4 (`recipe.updated` event extended), invariant #5 (raw inputs in `recipe_turns` are the durable source for backfill).

</domain>

<decisions>
## Implementation Decisions

### STEP-01 — `recipes.steps` JSONB shape (REFINEMENT vs PROJECT.md)

- **D-01:** `recipes.steps JSONB NOT NULL DEFAULT '[]'::jsonb`. Refines PROJECT.md's "nullable column" lock — the user explicitly picked `NOT NULL DEFAULT '[]'` during discuss after weighing tradeoffs. Recipe never has `steps = NULL`; the "needs backfill" condition is `jsonb_array_length(steps) = 0`.
- **D-02:** Alembic migration `0013_add_recipes_steps.py`:
  - `op.add_column('recipes', sa.Column('steps', JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")))` — server_default ensures the eager backfill of existing rows in the same migration.
  - Downgrade: `op.drop_column('recipes', 'steps')` — clean.
- **D-03:** Schema shape per step entry: `{"text": string, "ingredient_refs": string[]}`. `text` is the human-readable step instruction; `ingredient_refs` is an array of ingredient name strings (string match against `ingredients[].name`, see D-08).

### STEP-03 — Lazy backfill timing

- **D-04:** **Trigger:** First visit to `/cooking-logs/[id]/active` for a recipe where `jsonb_array_length(recipe.steps) = 0`. Matches PROJECT.md locked decision.
- **D-05:** **Implementation pattern:** mirror v0.6 invariant #1 server-side promotion — endpoint receives request, schedules a FastAPI BackgroundTask running `services.llm.extract_and_persist_steps(recipe_id)`, returns the existing recipe immediately. Frontend listens for `recipe.updated` broadcast (already subscribed via `RealtimeProvider`) and re-renders when `steps` arrives.
- **D-06:** **Frontend loading state on /active during backfill:** show a `BrandLoader` (existing component) with copy "Préparation des étapes…" until `recipe.steps.length > 0`. Once backfill completes, transition to step 1 view.
- **D-07:** **Backfill input is the first user turn** (position 0) of `recipe_turns` — the raw capture payload. Per ADR-0001 + invariant #5, this is preserved forever; LLM gets fresh access to the original transcript/url/photo/etc. The extraction prompt also receives the structured `ingredients[]` and `name` so steps can reference them.

### STEP-02 — Gemini schema + ingredient cross-refs

- **D-08:** **Cross-ref by ingredient name string match.** `ingredient_refs: string[]` contains e.g. `["riz arborio", "bouillon de volaille"]`. Frontend renders the cross-ref line by joining the ref strings to the ingredients table:
  ```ts
  function renderRefs(refs: string[], ingredients: Ingredient[]) {
    return refs.map(ref => {
      const ing = ingredients.find(i => i.name === ref);
      return ing ? `${ing.quantity} ${ing.name}` : ref;  // graceful fallback to ref text
    }).join(' · ');
  }
  ```
- **D-09:** **Gemini prompt update** (`backend/app/services/llm.py`): extend the existing `STRUCTURED_RECIPE_SCHEMA` Pydantic model with a `steps: list[StepEntry]` field. Each `StepEntry` is `{text: str, ingredient_refs: list[str]}`. Constrain Gemini's response to reuse the exact strings already in the `ingredients` array (instruct in prompt: "Use ingredient names verbatim from the ingredients you've already extracted").
- **D-10:** **Prompt versioning concern:** The structured-extraction prompt now produces a strictly larger payload (adds `steps` field). Backward compatibility: existing Gemini responses without `steps` (legacy seed data, test fixtures) must continue to deserialize. Pydantic schema sets `steps: list[StepEntry] = []` default so the field is optional in deserialization.
- **D-11:** **Test posture:** unit test for the Gemini prompt schema asserts the new `steps` field is present in the request. Integration test runs a canned thread fixture through `_run_thread_llm` and asserts the response includes structured steps.

### ACTV-01/02 — Active cooking session route

- **D-12:** `app/cooking-logs/[id]/active/page.tsx` is the NEW route. Server component fetches the cooking_log + parent recipe by ID. Client component renders the step navigator with `useState(currentStepIndex)` local state.
- **D-13:** **Step index is UI-state only.** No `cooking_logs.current_step` column. The session is "where the user has tapped to" not "what the system has committed." If the user closes /active mid-cook and reopens, they restart at step 1 (acceptable for couple-scale + sketch shows no resume-position affordance).
- **D-14:** **Progress segments:** `M` segments rendered as flex divs with conditional classes — index < currentStepIndex → filled (terracotta tint), index === currentStepIndex → colored (terracotta accent), index > currentStepIndex → hollow (border + transparent fill).
- **D-15:** **det-top crumb:** `"démarrée à HH:MM · N min"` computed from `cookingLog.started_at` and `Date.now()` with a 60s `useInterval` refresh. The `étape N/M` pin tracks `currentStepIndex + 1` / `steps.length`.
- **D-16:** **Step text rendering:** Geist body weight 400, `text-lg` size, max-width container so long instructions wrap cleanly on iPhone width. Ingredient-ref line below in Geist Mono, faint color: `utilise: 200g riz arborio · 1L bouillon`.

### ACTV-03 — Finalize wiring

- **D-17:** "Terminé · marquer cuisinée" CTA → `router.push('/cooking-logs/[id]/finalize')`. Existing `[id]/finalize/page.tsx` handles rating + notes + photo capture unchanged. No new finalization API.
- **D-18:** CTA only appears when `currentStepIndex === steps.length - 1` (user has reached the last step). Earlier in the session, the right-hand action is "Étape suivante" (next button). Matches sketch lines 2043-2049.
- **D-19:** Back-button (X close) on /active routes to `/cooking-logs/[id]` (the in-progress log detail view). NOT to /recipes/[id]. Rationale: user is inside the cooking session, not viewing the recipe library.

### Claude's Discretion

- **`startedAt → elapsed` formatting** — Planner picks the Intl.NumberFormat / dateFn pattern for "14 min écoulées" + "21 min restantes". Sketch shows both elapsed and estimated remaining; remaining is `recipe.estimated_minutes - elapsed`, planner picks clamp behavior (negative if user goes over, show "+5 min" etc.).
- **Step navigator keyboard handling** — Optional. If user has a Bluetooth keyboard, arrow keys could advance steps. Sketch doesn't specify; planner-discretion polish.
- **Wake-lock API** — Phase 42 is purely "tap-to-advance" per the requirements. `navigator.wakeLock.request('screen')` would keep the screen on during cooking — productize-later polish, planner can flag in 42-RESEARCH.md as a v0.10 candidate.
- **`recipe.updated` broadcast already exists** — Planner verifies it fires when `services.llm.extract_and_persist_steps` commits; if not, add the broadcast call. The frontend `RealtimeProvider` already subscribes to it.
- **Storage of in-progress cooking logs** — Existing `cooking_logs` table has `started_at` set on session start. `/active` reads from this. No new model fields.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architectural authority
- `CLAUDE.md` architecture invariants — **#1** (server-side BackgroundTask pattern for promotion; STEP-03 backfill mirrors this), **#4** (realtime broadcast contract — `recipe.updated` extends naturally; no new event needed), **#5** (raw inputs in `recipe_turns` preserved — STEP-03 backfill reads turn 0)
- `docs/adr/0001-recipe-conversation-thread.md` — thread + turn semantics; STEP-03 input source
- `docs/adr/0004-modern-sober-refresh.md` — La Grille visual register

### Phase scope + lock
- `.planning/REQUIREMENTS.md` §v1 Requirements — STEP-01, STEP-02, STEP-03, ACTV-01, ACTV-02, ACTV-03
- `.planning/PROJECT.md` §Current Milestone — v0.9 locked decisions table (STEP-01 shape note: PROJECT.md said "nullable column", refined to NOT NULL DEFAULT '[]' per discuss D-01)

### Migration safety baseline (v0.8 Phase 39 carries forward)
- `backend/tests/migrations/conftest.py` — throwaway-DB fixture
- `backend/tests/migrations/test_migrations.py` — parametrized upgrade+downgrade test (auto-picks up `0013_add_recipes_steps.py`)
- `backend/pyproject.toml` §[tool.coverage.report] — `fail_under = 85` repo floor + per-file 100% gates

### Sketch
- `.claude/skills/sketch-findings-al-dente/sources/002-refresh-direction-explorations/index.html` lines **2015-2058** — sketch §Cuisine session active
- `.claude/skills/sketch-findings-al-dente/references/components.md` — progress segments, det-top patterns

### Backend existing patterns to mirror
- `backend/app/services/llm.py` — `STRUCTURED_RECIPE_SCHEMA` Pydantic model, `_run_thread_llm` orchestration, `extract_and_process_url_turn` BackgroundTask pattern (D-29 broadcast on update)
- `backend/app/services/realtime.py` — `broadcast_to_household`; `recipe.updated` event type
- `backend/app/routers/recipes.py` — POST `/promote` endpoint pattern; the new "trigger backfill" endpoint can mirror this shape
- `backend/app/models/recipe.py` — Recipe model; add `steps` Mapped[list[dict]] (or `Mapped[dict]` with discriminated structure)
- `backend/app/schemas/recipe.py` — RecipeResponse Pydantic; expose `steps` field
- `backend/alembic/versions/` — existing 12 revisions show the pattern; new one is `0013_*`

### Frontend existing patterns to mirror
- `frontend/app/cooking-logs/[id]/page.tsx` — sibling to /active; existing structure for /active to mirror
- `frontend/app/cooking-logs/[id]/finalize/page.tsx` — destination of D-17 finalize CTA
- `frontend/components/RealtimeProvider.tsx` — `recipe.updated` subscription point
- `frontend/components/BrandLoader.tsx` — existing loader; D-06 backfill loading state
- `frontend/lib/cooking.ts` — `fetchCookingLog`, `getCookingLogSignedPhotoUrl` existing helpers
- `frontend/lib/recipes.ts` — Recipe type; needs `steps` field added

### Test posture
- `backend/tests/test_llm.py` (probably exists) — extends with STEP-02 prompt + STEP-03 backfill tests
- `backend/tests/test_router_recipes.py` — extends with new "trigger backfill" endpoint contract (5-test pattern from v0.8 Phase 38)
- `backend/tests/migrations/test_migrations.py` — 0013 upgrade+downgrade auto-included
- `frontend/tests/e2e/active-cooking-session.spec.ts` — NEW Playwright spec covering /active happy path + backfill loading state
- `backend/tests/test_invariants.py` — extend invariant #5 regression test: backfilled recipes still have turn-0 preserved verbatim after STEP-03 runs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`services.llm.extract_and_process_url_turn`** (existing BackgroundTask pattern with D-29 `turn.updated` broadcast) — STEP-03 backfill mirrors this shape (BackgroundTask + recipe.updated broadcast)
- **`broadcast_to_household` + `recipe.updated`** — already wired; STEP-03 reuses without modification
- **`RealtimeProvider` recipe.updated handler** — already updates local recipe cache; STEP-03 inherits the existing wiring (steps appear when cache updates)
- **`BrandLoader`** — La Grille 3-dot loader; D-06 backfill loading state
- **`useCookingLog(id)`** hook (probably exists) — D-12 server-side fetch on /active
- **`Intl.DateTimeFormat` + `Intl.RelativeTimeFormat`** — D-15 elapsed/remaining time rendering (French locale already configured via next-intl)

### Established Patterns
- **Invariant #1: server-side promotion via BackgroundTask** — backfill mirrors. Never run Gemini inline on the request thread.
- **`recipe.updated` broadcast on any recipe mutation** — STEP-03 must fire after persisting `steps`. Plan must verify this happens in the BackgroundTask code path.
- **Pydantic Field default-empty-list pattern** — `steps: list[StepEntry] = Field(default_factory=list)` ensures backward-compatible deserialization of legacy LLM responses
- **PROJECT.md locked-decisions update on refinement** — STEP-01 shape was refined during discuss (NOT NULL vs nullable). PROJECT.md is updated post-phase by /gsd-complete-milestone; not edited inline mid-phase.
- **Single uvicorn worker** — APScheduler stays in-process per invariant #7. STEP-03 backfill runs in a FastAPI BackgroundTask (same process), not via APScheduler.

### Integration Points
- `backend/app/models/recipe.py` — add `steps: Mapped[list[dict]]` column (SQLAlchemy 2.0 mapped style)
- `backend/app/schemas/recipe.py` — add `StepEntry` BaseModel + `steps: list[StepEntry] = Field(default_factory=list)` field on RecipeResponse
- `backend/app/services/llm.py` — extend `STRUCTURED_RECIPE_SCHEMA`; extract+persist function for backfill
- `backend/app/routers/cooking_logs.py` — NEW endpoint or extension: trigger backfill on /active visit (planner picks endpoint shape — most natural: `POST /recipes/{id}/extract-steps` matching existing /promote pattern)
- `backend/alembic/versions/0013_add_recipes_steps.py` — NEW migration
- `frontend/app/cooking-logs/[id]/active/page.tsx` — NEW client route
- `frontend/lib/recipes.ts` — Recipe TS type gains `steps: StepEntry[]`
- `frontend/lib/cooking.ts` — possibly add `triggerStepsExtraction(recipe_id)` helper

</code_context>

<specifics>
## Specific Ideas

- **Alembic migration 0013 body:**
  ```python
  def upgrade() -> None:
      op.add_column(
          'recipes',
          sa.Column('steps', postgresql.JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
      )

  def downgrade() -> None:
      op.drop_column('recipes', 'steps')
  ```

- **Pydantic schema (`backend/app/schemas/recipe.py`):**
  ```python
  class StepEntry(BaseModel):
      text: str
      ingredient_refs: list[str] = Field(default_factory=list)

  class RecipeResponse(BaseModel):
      # ... existing fields
      steps: list[StepEntry] = Field(default_factory=list)
  ```

- **Gemini prompt addition:** "Then list the steps to cook the recipe. Each step is an object with `text` (the instruction in French, imperative voice) and `ingredient_refs` (an array of ingredient names — use the EXACT names from the ingredients you've extracted above). Steps should be ordered, concise (≤2 sentences), and reference only ingredients that exist in the ingredients list."

- **Backfill endpoint shape (planner-discretion):** `POST /recipes/{id}/extract-steps` — auth via existing cookie, returns 202 Accepted, schedules BackgroundTask. Frontend hits it on /active mount if `recipe.steps.length === 0`. Conservative; mirrors POST /promote.

- **Active-session route shape:**
  ```tsx
  // frontend/app/cooking-logs/[id]/active/page.tsx
  export default function ActiveCookingSessionPage() {
    const { id } = useParams<{ id: string }>();
    const cookingLog = useCookingLog(id);
    const recipe = useRecipe(cookingLog?.recipe_id);
    const [stepIndex, setStepIndex] = useState(0);

    // Trigger backfill if needed
    useEffect(() => {
      if (recipe && recipe.steps.length === 0) {
        triggerStepsExtraction(recipe.id);
      }
    }, [recipe?.id]);

    if (!recipe || recipe.steps.length === 0) return <BrandLoader label="Préparation des étapes…" />;

    const step = recipe.steps[stepIndex];
    return <ActiveCookingSessionLayout {...} />;
  }
  ```

- **Sketch CTA copy:** Step navigator buttons read "Étape N" (Geist Mono numeric); final step's right action reads "Terminé · marquer cuisinée" with `↵` glyph at the right. i18n keys: `cooking.active.step_next`, `cooking.active.step_prev`, `cooking.active.finalize_cta`.

- **Backfill loading copy (i18n):** `cooking.active.steps_extracting`: `"Préparation des étapes…"`

</specifics>

<deferred>
## Deferred Ideas

- **Resume cooking position** — D-13 says step index is UI-state only (no `cooking_logs.current_step`). If a user-research signal surfaces that mid-cook interruptions are common, add a persistent column in v0.10+.
- **Step images** — Sketch shows text + ingredient ref only; per-step images would extend Gemini schema with image generation/extraction. v0.10+ candidate.
- **Wake-lock during /active** — `navigator.wakeLock.request('screen')` would prevent screen sleep during cooking. Productize-later polish per D-19 Claude-discretion note.
- **Voice-controlled step navigation** — "Suivant" voice command to advance steps hands-free. Out of scope; productize-later.
- **Step timer per step** — Some recipes have timed steps ("sauté 5 minutes"). Could surface a timer chip on /active. Gemini would need to extract the time. v0.10+ candidate.
- **Step skip / scratch** — Long-press to skip a step (e.g., user has ingredients pre-prepped). UI affordance not in sketch; productize-later.
- **Multi-recipe parallel cooking** — Two recipes being cooked simultaneously (couple, two pans). Would require multi-session state. Out of scope.
- **Eager migration vs lazy backfill** — D-04 chose lazy. If load patterns favor eager (e.g., user habit is "view library → cook"), revisit by running an eager Gemini sweep migration in v0.10+. The backend pattern is ready for either.

</deferred>

---

*Phase: 42-structured-steps-active-cooking-session*
*Context gathered: 2026-05-21*
