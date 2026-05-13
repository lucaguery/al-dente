# Phase 24: Recipe identity — Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Five identity drops on the recipe model + capture pipeline + detail/list surfaces, shipping in load-bearing serial order across two waves:

1. **RID-01** — Extract the existing `app/icon.tsx` pasta-strand markup into a reusable `frontend/components/BrandIcon.tsx`, mount on onboarding welcome + shortlist/inbox/recipes empty states.
2. **RID-02** — Add three optional recipe columns (`cook_time_minutes`, `difficulty TEXT CHECK`, `description`); land the `Difficulty` enum (`easy`/`medium`/`hard`) on both sides of the locked-vocabulary boundary; thread the new fields through Pydantic schemas + `RecipeForm.tsx` inputs + `/recipes/[id]` metadata block + voice/photo extract prompts + `_apply_extracted`.
3. **RID-03** — `CompletenessCard` above the body of `/recipes/[id]` when `computeCompleteness().percent < 100`; 11 fields equal weight; chip-links to the edit page with `?focus=<field_key>`; hidden entirely at 100%.
4. **RID-04** — `services/llm.rewrite_title()` helper + `BackgroundTask` shape for quick + full-form (today sync); voice/photo prompt extended in-place for one-call rewrite; on rewrite failure the user title is preserved and `promotion_error` set; `CLAUDE.md` invariant #1 wording updated in the same atomic commit.
5. **RID-05** — `recipes.illustration_svg TEXT` column + `services/llm.generate_recipe_illustration()` helper + reject-and-fallback server-side sanitizer + `RecipeIllustration` component used by inbox + recipes list rows at ~40×40, falling back to `BrandIcon` when missing or rejected.

**Wave layout:** Wave 1 = RID-01 ∥ RID-02 (parallel, no shared files). Wave 2 = RID-03 → RID-04 → RID-05 (serial; all three touch `_apply_extracted` / Gemini prompts / the BackgroundTask shape — parallelizing them would force `services/llm.py` merge conflicts).

Out of scope (deferred): #20 unified capture surface (v0.6 — needs its own `/gsd-explore`); detail / shortlist illustration placements; SVG animation; cuisine-themed illustration variants; sanitizer "strip-and-keep" mode; #22 user-configurable per-field weights.

</domain>

<decisions>
## Implementation Decisions

### Plan slicing & wave order

- **D-01:** **5 plans, parallel-where-safe.** Wave 1 ships two independent plans in worktree-isolated parallel: `24-01-brand-icon-PLAN.md` (RID-01, pure frontend) and `24-02-data-model-PLAN.md` (RID-02, backend migration + extract prompt + frontend form). Wave 2 ships three plans serially because they all touch `services/llm.py` / `_apply_extracted`: `24-03-completeness-PLAN.md` (RID-03) → `24-04-title-rewrite-PLAN.md` (RID-04) → `24-05-illustration-PLAN.md` (RID-05). Deviates from REQUIREMENTS.md "serial" claim only to the extent that RID-01 (pure frontend, no LLM touchpoints) does NOT block RID-02; everything LLM-pipeline-adjacent stays serial.
- **D-02:** **Worktree per plan** (matches v0.4 / Phase 22 pattern). Five worktrees total: `24-01-brand-icon`, `24-02-data-model`, `24-03-completeness`, `24-04-title-rewrite`, `24-05-illustration`. Wave 1's two worktrees execute in parallel; Wave 2's three are serial single executor.
- **D-03:** **Two separate Alembic migrations** — `0007_add_recipe_difficulty_cook_time_description.py` ships with RID-02 (3 columns + CHECK constraint on difficulty); `0008_add_recipe_illustration_svg.py` ships with RID-05 (1 column). Railway runs `alembic upgrade head` per deploy so ordering is fine. Atomic revert per req. The CHECK constraint on `difficulty` lives in 0007 with `CHECK (difficulty IS NULL OR difficulty IN ('easy','medium','hard'))` — pattern mirrors the existing `recipes_cuisine_check` / `recipes_main_protein_check` constraints at `backend/app/models/recipe.py:131-141`.
- **D-04:** **Invariant #1 docs update lives in RID-04's atomic commit** — the code change (BackgroundTask wiring on `POST /recipes` + `POST /recipes/quick`), the `CLAUDE.md` invariant #1 rewrite, and any REQUIREMENTS.md history-note all commit together. Mirrors Phase 23's D-01 pattern. Reviewer sees the invariant shift and the code that justifies it in one diff.
- **D-05:** **No `gsd-verifier` run** — `workflow.verifier: false` (set in Phase 22 and held through Phase 23). The grep gates + manual UI smoke + Playwright fixture updates serve as the goal-achievement gates.

### RID-01 — BrandIcon

- **D-06:** **Single SVG source extracted verbatim from `frontend/app/icon.tsx:26-39`.** The new component lives at `frontend/components/BrandIcon.tsx` and re-exports the same two `<path d="...">` strings inside an `<svg viewBox="0 0 160 160" fill="none" stroke="currentColor" strokeLinecap="round">`. The `strokeWidth` defaults to `6` (matches the original) but is overridable via prop. **`stroke="currentColor"`** — the icon inherits the surrounding text color so it tints to whatever theme palette wraps it.
- **D-07:** **Props shape:** `{ size?: number; strokeWidth?: number; className?: string; "aria-label"?: string }`. `size` defaults to 48 (matches EmptyState's existing `<Icon size={48} />` call site at `frontend/components/EmptyState.tsx:24`). When `aria-label` is omitted, the SVG sets `aria-hidden="true"` (decorative). Tailwind classes pass through via `className`.
- **D-08:** **Mount points (REQ-locked):**
  - Onboarding welcome screen (find the welcome route; likely `frontend/app/onboarding/page.tsx` or `frontend/app/page.tsx` pre-auth — planner confirms).
  - Empty states: drafts inbox, recipes library, shortlist deck. All three currently use `<EmptyState icon={SomeLucideIcon} ... />`. The EmptyState API stays compatible — pass `BrandIcon` as the `icon` prop instead of a Lucide icon. Planner verifies `BrandIcon` matches the `LucideIcon` prop contract (it's a functional component that accepts `size` + `className` — Lucide's type is `ForwardRefExoticComponent<LucideProps>` but EmptyState uses it duck-typed so a plain component should slot in cleanly; if TypeScript complains, widen EmptyState's `icon` type to `ComponentType<{ size?: number; className?: string }>`).
- **D-09:** **Do NOT delete `frontend/app/icon.tsx`** — it generates the PWA app icon at the Edge runtime (`ImageResponse`) and is referenced by `manifest.ts`. Both files keep the same SVG path data verbatim; if the user wants to tweak the brand mark later, both files need a coordinated update. Add a brief comment in `BrandIcon.tsx` noting that `app/icon.tsx` is the PWA twin.

### RID-02 — Data model (Difficulty enum + 3 columns)

- **D-10:** **Difficulty enum (locked vocabulary, both sides).** Adds the third locked vocabulary alongside `Cuisine`, `Mood`, `Protein` (per CLAUDE.md §"Locked vocabularies" — drift is a bug category). In Python: `backend/app/models/enums.py` adds `class Difficulty(str, Enum): easy = "easy"; medium = "medium"; hard = "hard"`. In TS: `frontend/lib/enums.ts` adds the equivalent const + type. Both ship in the same plan (RID-02) so they cannot drift.
- **D-11:** **Three new optional columns on `recipes`:**
  - `cook_time_minutes INTEGER NULL` (no CHECK; mirrors `prep_time_minutes`'s shape).
  - `difficulty TEXT NULL` + `CHECK (difficulty IS NULL OR difficulty IN ('easy','medium','hard'))`.
  - `description TEXT NULL` (free-form long-text; no length cap at the DB layer; UI textarea caps at ~500 chars per existing form pattern).
- **D-12:** **Pydantic schemas update in lockstep:** `backend/app/schemas/recipe.py` adds the three fields to `RecipeFullCreate`, `RecipeUpdate`, `RecipeResponse`, `RecipeQuickCreate`. `cook_time_minutes` uses `Field(default=None, ge=0, le=24*60)` matching `prep_time_minutes`'s validation. `difficulty` uses a `Literal["easy","medium","hard"]` import (matching the `CuisineLiteral` pattern at `backend/app/services/llm.py`).
- **D-13:** **Gemini schema gets the same three fields.** `GeminiExtractedRecipe` at `backend/app/services/llm.py:117-138` adds `cook_time_minutes`, `difficulty`, `description`. `_apply_extracted` at `services/llm.py:297-325` writes them. Both voice/photo extract prompts pick up an instruction line: "Extrais aussi cook_time_minutes (en minutes), difficulty ('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette)."
- **D-14:** **RecipeForm.tsx adds three inputs.** `Input type="number"` for `cook_time_minutes`, `Select` for `difficulty` (three options + a "Pas indiqué" sentinel mirroring the existing cuisine/protein `NONE_VALUE` pattern at `frontend/components/RecipeForm.tsx:330`), `Textarea` for `description`. French labels via `useTranslations`. The form already does optional-field handling; the three new fields drop in next to the existing prep_time/servings/cuisine block.
- **D-15:** **`/recipes/[id]` page metadata block displays the new fields when non-null.** Renders next to the existing prep_time / servings line. French labels: "Cuisson", "Difficulté", "Description" (Description is rendered as a paragraph above the ingredients block, not a metadata pill). Empty/null fields are not rendered (no "Difficulté: —" placeholder).
- **D-16:** **Backfill posture:** existing rows get NULL for the three columns (server_default omitted). Existing recipes will show low CompletenessCard scores after this migration, which is intentional per the PROJECT.md milestone note: "Existing recipes will show low scores after RID-02 ships — that's the intended nudge per gh#22."

### RID-03 — CompletenessCard

- **D-17:** **The canonical 11 fields** (each worth 1/11 = ~9.09%):
  1. `title` (always present — title is NOT NULL on the model)
  2. `description`
  3. `ingredients` (non-empty array)
  4. `steps` (non-empty array)
  5. `prep_time_minutes`
  6. `cook_time_minutes`
  7. `servings`
  8. `difficulty`
  9. `cuisine`
  10. `mood` (non-empty array)
  11. `main_protein`
  Fields intentionally excluded: `tags` (default `[]`, freeform, not a quality signal), `seasonality` (defaults to all four seasons server-side, not user-meaningful), `photo_paths` (not in the "recipe identity" scope), `source_capture` (system field).
- **D-18:** **Strict non-empty rule** for "filled":
  - Strings (`title`, `description`, `difficulty`, `cuisine`, `main_protein`): not null AND `.trim() !== ""`.
  - Numbers (`prep_time_minutes`, `cook_time_minutes`, `servings`): not null.
  - Arrays (`ingredients`, `steps`, `mood`): `.length > 0`. Ingredient/step entries themselves are not deep-checked at this layer (planner: if a step is a whitespace-only string, that's an authoring bug, not a completeness scoring concern).
- **D-19:** **`computeCompleteness(recipe)` lives in `frontend/lib/recipe-completeness.ts`** (new file). Returns `{ percent: number; missingFields: FieldKey[] }`. `percent` is rounded to nearest integer (so 5/11 displays as 45%, not 45.45%). `FieldKey` is a discriminated union matching the 11 field names exactly — same identifiers the `?focus=` URL param consumes. The function is pure / side-effect-free — fully unit-testable in isolation.
- **D-20:** **`CompletenessCard.tsx`** mounts at the top of `frontend/app/recipes/[id]/page.tsx`, **above the body content**, when `percent < 100`. At 100% it returns null (REQ-mandated "no nagging"). Surface: `paper-grain shadow-card` div matching `EmptyState.tsx`'s shell (`frontend/components/EmptyState.tsx:23`). Header line: `"À compléter — {N}/11"` in `text-title` (display-serif). A horizontal progress bar (`<div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>`) sits below the header. Then a horizontal-wrapping row of `<Link>`-as-chip elements — one per missing field — styled as small shadcn `<Badge variant="outline">`s. Each chip's `href` is `/recipes/{id}/edit?focus={fieldKey}`.
- **D-21:** **French chip labels** live in `frontend/lib/i18n/fr.json` under a new `completeness` namespace: `description: "Description"`, `ingredients: "Ingrédients"`, `steps: "Étapes"`, `prep_time_minutes: "Temps de préparation"`, `cook_time_minutes: "Temps de cuisson"`, `servings: "Portions"`, `difficulty: "Difficulté"`, `cuisine: "Cuisine"`, `mood: "Ambiance"`, `main_protein: "Protéine"`. (`title` is in the field list but never appears as a chip because title is NOT NULL.)
- **D-22:** **`?focus=` consumption on the edit page** (`frontend/app/recipes/[id]/edit/page.tsx`). The page uses `useSearchParams()` to read `focus`. Inside `RecipeForm.tsx` (which the edit page renders), a `Record<FieldKey, RefObject<HTMLElement>>` is attached to each input/textarea/select. A single `useEffect(() => { ... }, [focus])` after first render runs: `const node = refs[focus]?.current; if (node) { node.scrollIntoView({ behavior: 'smooth', block: 'center' }); node.focus(); }`. Mistyped/unknown `focus` values are silently ignored — no error UI. Once the focus is fired, `router.replace(pathnameWithoutQuery)` strips the param so a re-mount doesn't re-fire it.
- **D-23:** **`RecipeForm` accepts an optional `focusRefs` prop** so the edit page can wire ref-targeting without leaking knowledge of field keys into other consumers (new recipe form, voice-modify sheet). Planner picks between (a) the edit page constructs the ref map and passes it down, or (b) `RecipeForm` exports a `useRecipeFormRefs()` hook the edit page calls. Either is fine; (a) is simpler and more idiomatic for a single consumer.

### RID-04 — Title rewrite + invariant #1 shift

- **D-24:** **Quick + full-form move to async `BackgroundTask` shape.** Both endpoints (`POST /recipes` and `POST /recipes/quick` in `backend/app/routers/recipes.py:125-200`) lose their synchronous `status='structured'` and gain a `BackgroundTasks` dependency. They stamp `status='draft'`, return the draft response (existing `RecipeResponse`), and queue a new `promote_quick_draft(recipe_id)` / `promote_full_draft(recipe_id)` BackgroundTask body in `services/llm.py`. The BackgroundTask calls `rewrite_title()`, applies the result to `recipe.title`, flips `status` to `structured`, broadcasts `recipe.promoted`. Mirrors the existing `promote_voice_draft` / `promote_photo_draft` structure (`services/llm.py:368-414`).
- **D-25:** **`rewrite_title()` signature and prompt.** New helper in `backend/app/services/llm.py`:
  ```python
  def rewrite_title(original_title: str, recipe_context: dict) -> str:
      """Returns the rewritten 'catchy' French title. Raises on Gemini error."""
  ```
  Prompt (from gh#10): `"Réécris ce titre de recette pour qu'il soit court et accrocheur en français. Pas plus de 60 caractères. Ne mets pas la liste des ingrédients dans le titre. Renvoie UNIQUEMENT le nouveau titre, sans guillemets, sans préfixe."`. Uses `_GEMINI_MODEL` (`gemini-2.5-flash`). Test-mode shortcut (`settings.environment == "test"`) returns a deterministic fixture from `llm_fixtures.canned_rewritten_title()` to keep the existing E2E suite reproducible (matches the pattern at `services/llm.py:200-203`).
- **D-26:** **Failure mode for quick + full-form** = `status='structured'` + `promotion_error` set (NOT `status='failed'`). REQ-04 wording: "user title preserved + `promotion_error` set, retry-endpoint compatible." Rationale: a quick capture has a meaningful user title; a full-form has the entire user-entered recipe. Burying either in the `failed` inbox because an optional LLM rewrite call timed out would surprise the user. A new helper `_record_rewrite_failure(db, recipe, exc)` lives next to `_record_failure` and:
  - Sets `recipe.status = "structured"` (success state — user has a usable recipe).
  - Sets `recipe.promotion_error = str(exc)[:500]` (so the retry endpoint can re-attempt rewrite later).
  - Increments `promotion_attempts`.
  - Broadcasts `recipe.promoted` (the recipe DID get promoted; only the rewrite step failed).
- **D-27:** **Voice/photo prompt extension (no extra round-trip).** REQ-04: "voice/photo prompts inherit the same phrasing in their existing single Gemini call." `_EXTRACT_PROMPT_VOICE` and `_EXTRACT_PROMPT_PHOTOS` at `services/llm.py:167-177` each gain a clause: `"Le champ title doit être une formule courte et accrocheuse en français (max 60 caractères, sans guillemets, sans liste d'ingrédients)."` The returned `extracted.title` IS the catchy version — no separate `rewrite_title()` call for voice/photo. Voice/photo failure path stays `status='failed'` (the whole extract failed, not just the rewrite step) — no change to `_record_failure` for these surfaces.
- **D-28:** **Rewrite runs on first promotion only.** Once a recipe lands in `status='structured'`, subsequent `PUT /recipes/{id}` calls write the user's title verbatim and never trigger rewrite. The only path that re-runs rewrite is the **existing retry endpoint** (`POST /recipes/{id}/retry-promotion` — confirm exact path in planner) when `promotion_error` is set. This protects intentional user edits from silent re-overwrites and matches the spirit of invariant #5 (raw inputs kept forever — user edits are also "raw inputs" the system shouldn't second-guess).
- **D-29:** **Edit race policy (BackgroundTask always wins).** When a user does a full-form capture, receives the draft response, navigates to the edit screen, and edits the title BEFORE the BackgroundTask completes its Gemini call — the BackgroundTask's rewrite overwrites the user's in-flight edit. Decision rationale: the milestone-level "silent overwrite" decision applies broadly; the race window is small (Gemini latency ~1-3s); adding `updated_at` change-detection adds complexity for a corner case the user explicitly accepts. If this surfaces as a UX regression on device, a follow-up phase can layer in change-detection cheaply. Note in the plan that the retry endpoint can re-run rewrite later if the user wants a different catchy title.
- **D-30:** **Invariant #1 wording update** (in `CLAUDE.md`, ships in the same atomic commit per D-04). Current wording: "Five capture surfaces, one shape. `quick`, full-form, `voice`, `photo`, `url` all `POST /recipes/<surface>`, all return a `draft` immediately, all promotion runs **server-side** in a FastAPI `BackgroundTask`." New wording: **already accurate after RID-04 ships** — the current invariant text describes the post-RID-04 state (which is why this invariant was load-bearing). Action: the wording is correct as-written, but a parenthetical clarification should be added noting that `quick` and full-form were synchronous pre-Phase-24 and became BackgroundTask-based in v0.5 RID-04. Planner: re-read invariant #1 at execution time and confirm whether any further wording change is needed; if the text already matches reality, the plan ships with only the parenthetical addition.
- **D-31:** **WebSocket broadcast pattern preservation.** Quick + full-form still broadcast `recipe.created` immediately (sync, before the BackgroundTask). The BackgroundTask broadcasts `recipe.promoted` after rewrite succeeds. Matches the existing voice/photo pattern. Architecture invariant #4 (every household-affecting mutation broadcasts) holds.

### RID-05 — Per-recipe SVG illustration

- **D-32:** **Visual style: single-color line-art (matches BrandIcon).** Prompt direction in `generate_recipe_illustration(recipe_title, recipe_context)`: `"Crée un pictogramme SVG simple représentant cette recette. Trait fin, monochrome. Utilise stroke='currentColor', fill='none', viewBox='0 0 160 160'. 1 à 3 paths maximum, pas de texte, pas de remplissage de couleur. Renvoie UNIQUEMENT le XML SVG, sans Markdown, sans préfixe."` Inherits text color via `currentColor` so it blends with BrandIcon fallback. Sanitizer allowlist (`<svg>` + `<path>` only) is trivially satisfied when Gemini follows the prompt.
- **D-33:** **Sanitizer: reject entirely + fallback to BrandIcon.** New module `backend/app/services/svg_sanitizer.py`. `sanitize_recipe_svg(raw: str) -> Optional[str]`:
  1. Parse via `xml.etree.ElementTree` (or `lxml` if already a dep — planner checks `backend/pyproject.toml`). On parse error → return None.
  2. Walk every element. Allowed tags: `{svg, path}` (namespace-stripped). Allowed attrs on `<svg>`: `{viewBox, xmlns, fill, stroke, stroke-linecap}`. Allowed attrs on `<path>`: `{d, stroke, fill, stroke-width, stroke-linecap, stroke-linejoin}`. Any disallowed tag/attr → return None.
  3. Reject any attr starting with `on` (event handlers), any `style=` attr, any `xlink:href` attr.
  4. Reject CDATA sections, comments, processing instructions.
  5. On success: return the serialized SVG.
  Unit tests cover at least: clean line-art SVG (accepts), `<script>` inside `<svg>` (rejects), `<foreignObject>` (rejects), `onclick=` attr (rejects), `style="..."` (rejects), `<text>` (rejects), `<image>` (rejects), `<use>` (rejects), `<a>` (rejects), data-URI inside `xlink:href` (rejects).
- **D-34:** **Size cap 4 KB + viewBox normalization to `0 0 160 160`.** Hard cap at 4096 bytes; if `len(raw.encode("utf-8")) > 4096` → return None before parsing. If Gemini returns a different viewBox, rewrite to `0 0 160 160` (pictograms render at 40×40 list-row slot regardless — non-square viewBoxes cause aspect-ratio surprises). The 4 KB ceiling fits a typical pictogram (<1 KB) with comfortable headroom and keeps row payload predictable.
- **D-35:** **`recipes.illustration_svg TEXT NULL` column** via Alembic 0008. NULL means "not yet generated" or "rejected by sanitizer" — frontend treats both identically (fallback to BrandIcon).
- **D-36:** **`generate_recipe_illustration()` runs inside the existing BackgroundTask pipeline** alongside `rewrite_title` (for quick + full-form) or alongside the existing extract call (for voice/photo). One extra Gemini call per promotion, regardless of surface. Acceptable at couple-scale (~5-10 captures/week). Failure mode: if `generate_recipe_illustration()` raises OR `sanitize_recipe_svg()` returns None, the BackgroundTask logs a warning, leaves `illustration_svg=NULL`, and continues with the rest of the promotion (title rewrite + status flip). Illustration failure NEVER affects the recipe's status — the recipe still lands as `structured`.
- **D-37:** **`<RecipeIllustration recipe size={40} />`** is a new client component in `frontend/components/RecipeIllustration.tsx`. Internally: if `recipe.illustration_svg` is non-null and non-empty, render `<div dangerouslySetInnerHTML={{ __html: recipe.illustration_svg }} style={{ width: size, height: size }} />`; else render `<BrandIcon size={size} aria-hidden />`. Used by:
  - The inbox row component (`frontend/components/RecipeDraftCard.tsx`-equivalent — planner identifies exact file).
  - The recipes library row component (likely a list row inside `frontend/app/recipes/page.tsx` — planner identifies).
  - Both placements use ~40×40 sizing per REQ.
  Detail page and shortlist placements are explicitly deferred per REQ.
- **D-38:** **`dangerouslySetInnerHTML` is acceptable here BECAUSE the SVG passed server-side sanitization.** This justification belongs in a code comment on the component (per CLAUDE.md §"Comments — explain WHY, not WHAT"). The trust boundary is the sanitizer; the client renders pre-validated markup.
- **D-39:** **`RecipeResponse` Pydantic schema exposes `illustration_svg`** so the frontend doesn't need a separate API call. The field appears in `RecipeResponse` (and in `_to_response_payload` so it lands on `recipe.promoted` broadcasts).

### Verification (Phase 24)

- **D-40:** **Verification template = grep gates + manual UI smoke + Playwright fixture updates.** No dedicated `gsd-verifier` agent run (`workflow.verifier: false`). Grep gates per plan:
  - **RID-01:** `grep -nE "<BrandIcon" frontend/` returns matches at onboarding welcome + 3 empty-state call sites. `grep -nE "fill=\"none\"|viewBox=\"0 0 160 160\"" frontend/components/BrandIcon.tsx` confirms the SVG source matches `app/icon.tsx`.
  - **RID-02:** `alembic current` after migration shows revision 0007. `grep -nE "cook_time_minutes|difficulty|description" backend/app/models/recipe.py` returns column mappings. `grep -nE "Difficulty" frontend/lib/enums.ts backend/app/models/enums.py` returns enum defs on both sides.
  - **RID-03:** `grep -nE "computeCompleteness|CompletenessCard" frontend/` returns matches at the component + the detail page. Unit tests for `computeCompleteness()` cover all 11 fields + the strict-non-empty rule.
  - **RID-04:** `grep -nE "rewrite_title|promote_quick_draft|promote_full_draft" backend/app/services/llm.py backend/app/routers/recipes.py` returns the new helper + the new BackgroundTask wires. `grep -nE "BackgroundTasks" backend/app/routers/recipes.py` returns dependency on the quick + full endpoints. CLAUDE.md invariant #1 wording matches D-30.
  - **RID-05:** `alembic current` shows 0008. Unit tests for `sanitize_recipe_svg()` cover the rejection cases listed in D-33. `grep -nE "RecipeIllustration" frontend/` returns matches at inbox + recipes-library list rows.
- **D-41:** **Manual UI smoke checklist** (operator runs against seeded fixtures via `uv run seed` + the dev stack):
  - Onboarding welcome screen shows the pasta-strand brand mark (RID-01).
  - Empty inbox / empty shortlist / empty recipes-library each show the brand mark (RID-01).
  - Edit form has cook_time / difficulty / description inputs; entering values persists and re-displays them (RID-02).
  - A recipe with `cook_time_minutes=NULL` shows no "Cuisson" line on the detail page (RID-02).
  - An incomplete recipe (~4/11 fields) shows the CompletenessCard above the body; clicking a chip navigates to the edit page, scrolls to the matching input, and focuses it (RID-03).
  - A 100%-complete recipe shows NO CompletenessCard (RID-03).
  - A quick capture posts, returns a draft response, and the title flips to the catchy version within ~3s (visible via WebSocket `recipe.promoted` broadcast) (RID-04).
  - A full-form capture posts, returns a draft response, status flips to structured, title is catchy (RID-04).
  - An inbox row shows the per-recipe SVG illustration; rows without `illustration_svg` show the BrandIcon (RID-05).
  - The recipes-library row shows the same illustration treatment (RID-05).
- **D-42:** **Playwright fixture updates** — the existing E2E suite seeds via `uv run seed` (Phase 10 / v0.2.1). The seed script needs to ship deterministic values for the 3 new fields (cook_time, difficulty, description) so existing assertions still pass; the seed already imports the Python enums directly (per CLAUDE.md §"Locked vocabularies") so `Difficulty.medium` is the natural seed value. Each plan ships its own seed/fixture updates if applicable.

### Claude's Discretion

- **BrandIcon `aria-label` default behavior** — D-07 says `aria-hidden` when no label is passed. If the planner finds a case (e.g., onboarding welcome) where a screen-reader announcement of "Logo al dente" makes sense, the call site can pass `aria-label="al dente"` explicitly.
- **Whether `RecipeForm` constructs its own ref map or accepts one as a prop** (D-23) — both options are fine.
- **Exact location of completeness chip rendering when fields are 10/11** — single row vs wrapped row depending on viewport. CSS-driven `flex-wrap` is fine; no JS responsive logic needed.
- **Whether to use `lxml` or `xml.etree.ElementTree` for the SVG sanitizer (D-33)** — depends on whether `lxml` is already a dep. Stdlib is fine if not.
- **Whether `_record_rewrite_failure()` is a public helper or lives inline in `promote_quick_draft` / `promote_full_draft`** — minor structural call.
- **The exact French wording of the CompletenessCard header** — "À compléter — 4/11" is the working text; planner may swap "À compléter" for "Recette à enrichir" or similar if it reads more warmly on device.

### Folded Todos

None — no separate `todo match-phase` run for this phase. v0.5 milestone explicitly maps RID-01..05 from `audit:walkthrough`-era GitHub issues #11/#22/#10/#12; no orphan todos surfaced during Phases 22 or 23.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture invariants (CLAUDE.md)
- `CLAUDE.md` §"Architecture invariants" #1 — Five capture surfaces, one shape. **THIS INVARIANT IS UPDATED IN RID-04 (D-30)** — the parenthetical clarification ships in the same atomic commit. Downstream agents should read the CURRENT wording before editing.
- `CLAUDE.md` §"Architecture invariants" #5 — Raw inputs kept forever (`source_capture` JSONB preserves the user's original title forever; RID-04 silent overwrite of `recipe.title` is fine because `source_capture.payload.title` still has the user's input).
- `CLAUDE.md` §"Architecture invariants" #4 — Realtime contract. Quick/full-form keep their existing `recipe.created` broadcast; the BackgroundTask adds `recipe.promoted` after rewrite. Pattern matches voice/photo.
- `CLAUDE.md` §"Locked vocabularies" — Drift between `frontend/lib/enums.ts` and `backend/app/models/enums.py` is a bug category. RID-02 adds the `Difficulty` enum to both files in the same plan.
- `CLAUDE.md` §"Architecture invariants" #7 — Single uvicorn worker. The new BackgroundTask wiring on quick/full-form runs in the same worker process; no scheduler/worker pool concern.

### v0.5 milestone artifacts
- `.planning/PROJECT.md` §"Current Milestone: v0.5" — milestone-locked decisions table:
  - "#10 failure mode = Keep user title + `promotion_error`" (drives D-26).
  - "Invariant #1 shift = Quick/full-form become async with #10" (drives D-04, D-24, D-30).
- `.planning/REQUIREMENTS.md` §"RID — Recipe identity (serial; shares services/llm.py / _apply_extracted)" — canonical req text for RID-01..05. Includes the load-bearing serial-order claim (relaxed to "parallel-where-safe" per D-01) and the 11-fields-equal-weight constraint (D-17).
- `.planning/ROADMAP.md` §"Phase 24: Recipe identity" — goal statement + 5 success criteria.
- `.planning/notes/v0.5-shape-mixed-sweep.md` — original `/gsd-explore` output identifying the RID cluster.
- `.planning/phases/23-deck-polish/23-CONTEXT.md` — Phase 23 verification template (grep gates + manual UI smoke + real-device pass). Phase 24 inherits the template, drops the "real-device reduced-motion pass" line (no motion changes), adds Playwright fixture updates for the new fields.
- `.planning/phases/22-quick-wins/22-CONTEXT.md` — Phase 22 "1 req → 1 plan" pattern. Phase 24 honors this for RID-01..05 (5 plans), but ships Wave 1's two plans in parallel (D-01).

### Files to modify (per req)

#### RID-01 — BrandIcon
- `frontend/components/BrandIcon.tsx` — NEW.
- `frontend/components/EmptyState.tsx` — possibly widen `icon` prop type (`ComponentType<{ size?, className? }>`) if TS complains; otherwise zero changes.
- Onboarding welcome screen — planner identifies exact path (likely `frontend/app/onboarding/page.tsx` or `frontend/app/page.tsx`).
- All empty-state call sites: `frontend/components/HomeDecide.tsx:418` (shortlist), `frontend/components/CookingLogFinalize.tsx:125` (cooking-logs, NOT in scope — keep), `frontend/app/cooking-logs/page.tsx`, plus the drafts inbox and recipes-library empty states (planner identifies exact files).

#### RID-02 — Data model
- `backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` — NEW.
- `backend/app/models/recipe.py` — add 3 columns + extend the CHECK constraint tuple.
- `backend/app/models/enums.py` — add `class Difficulty(str, Enum)`.
- `frontend/lib/enums.ts` — add `export const Difficulty = { ... } as const`.
- `backend/app/schemas/recipe.py` — extend `RecipeFullCreate`, `RecipeUpdate`, `RecipeResponse`, `RecipeQuickCreate`.
- `backend/app/services/llm.py` — extend `GeminiExtractedRecipe` (lines 117-138), `_apply_extracted` (lines 297-325), and both extract prompts (`_EXTRACT_PROMPT_VOICE` and `_EXTRACT_PROMPT_PHOTOS` at 167-177).
- `frontend/components/RecipeForm.tsx` — add 3 new inputs near the prep_time/servings block.
- `frontend/app/recipes/[id]/page.tsx` — render the 3 new fields in the metadata block when non-null.
- `frontend/lib/i18n/fr.json` — add French labels for the 3 new fields + the 3 difficulty values.
- `.planning/seeds/` (or wherever `uv run seed` reads fixtures from) — seed deterministic values for the 3 new fields.

#### RID-03 — CompletenessCard
- `frontend/lib/recipe-completeness.ts` — NEW, exports `computeCompleteness()` + `FieldKey` type.
- `frontend/lib/recipe-completeness.test.ts` (or wherever the existing test suite lives) — NEW, unit-test all 11 fields and the strict-non-empty rule.
- `frontend/components/CompletenessCard.tsx` — NEW.
- `frontend/app/recipes/[id]/page.tsx` — mount the card above the body when `percent < 100`.
- `frontend/app/recipes/[id]/edit/page.tsx` — consume `?focus=` via `useSearchParams()`, wire ref-based scroll/focus.
- `frontend/components/RecipeForm.tsx` — attach refs to each input/textarea/select keyed by `FieldKey`.
- `frontend/lib/i18n/fr.json` — add `completeness.*` namespace with the 10 chip labels (D-21).

#### RID-04 — Title rewrite
- `backend/app/services/llm.py` — NEW `rewrite_title()` helper; NEW `promote_quick_draft()` and `promote_full_draft()` BackgroundTask bodies (mirror `promote_voice_draft` at line 368); NEW `_record_rewrite_failure()` helper (mirror `_record_failure` at line 340); extend `_EXTRACT_PROMPT_VOICE`/`_EXTRACT_PROMPT_PHOTOS` with the catchy-title clause (D-27).
- `backend/app/services/llm_fixtures.py` — NEW `canned_rewritten_title()` for test-mode determinism.
- `backend/app/routers/recipes.py` — `create_quick` and `create_full` (lines 130-200) gain `background_tasks: BackgroundTasks` dependency and queue the new tasks; stamp `status='draft'` for both.
- `CLAUDE.md` — invariant #1 wording per D-30 (in the same atomic commit).

#### RID-05 — Per-recipe SVG illustration
- `backend/alembic/versions/0008_add_recipe_illustration_svg.py` — NEW.
- `backend/app/models/recipe.py` — add `illustration_svg` column.
- `backend/app/schemas/recipe.py` — add to `RecipeResponse`.
- `backend/app/services/svg_sanitizer.py` — NEW (D-33).
- `backend/app/services/svg_sanitizer_test.py` (or `tests/` if pytest exists by then) — NEW unit tests for the rejection cases.
- `backend/app/services/llm.py` — NEW `generate_recipe_illustration()` helper; extend all four BackgroundTask bodies (`promote_voice_draft`, `promote_photo_draft`, `promote_quick_draft`, `promote_full_draft`) to call generate+sanitize and write `recipe.illustration_svg` (or leave NULL on failure).
- `frontend/components/RecipeIllustration.tsx` — NEW.
- `frontend/components/RecipeDraftCard.tsx` (inbox row) — replace the leading icon slot with `<RecipeIllustration recipe size={40} />`. Planner confirms exact file.
- Recipes library row component — planner identifies, replace with `<RecipeIllustration />`.

### Files for context (read, don't modify)
- `backend/app/services/llm.py:368-414` — existing `promote_voice_draft` / `promote_photo_draft` are the structural template for `promote_quick_draft` / `promote_full_draft`.
- `backend/app/services/llm.py:340-360` — existing `_record_failure` is the template for `_record_rewrite_failure` (but D-26's helper sets `status='structured'`, NOT `status='failed'`).
- `frontend/app/icon.tsx` — pasta-strand SVG source (D-06). Two `<path>` strings copy verbatim to `BrandIcon.tsx`. **Do not delete** — it generates the PWA app icon at the edge runtime.
- `frontend/components/EmptyState.tsx` — current API; BrandIcon must be drop-in compatible.
- `frontend/components/HomeDecide.tsx:418` — shortlist empty-state call site (BrandIcon mounts here).
- `backend/app/models/recipe.py:115` — existing `promotion_error` column (RID-04 reuses; no schema change for D-26).
- `backend/app/routers/recipes.py:321-414` — existing voice/photo router shape (`BackgroundTasks` dependency, `background_tasks.add_task(...)` pattern). Quick + full-form adopt this exact shape in RID-04.

### GitHub issues being closed
- gh#11 — RID-01 (BrandIcon)
- gh#22 — RID-02 + RID-03 (data model + completeness scorecard; both in the same GH issue)
- gh#10 — RID-04 (LLM catchy titles + invariant #1 shift)
- gh#12 — RID-05 (per-recipe SVG illustration)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`backend/app/services/llm.py` BackgroundTask pattern** — `promote_voice_draft` (`services/llm.py:368-393`) and `promote_photo_draft` (`services/llm.py:395-414`) are the structural template. Each opens its own `SessionLocal()`, runs the Gemini call, applies extracted data, commits, broadcasts, and swallows exceptions via `_record_failure`. RID-04's two new tasks (`promote_quick_draft`, `promote_full_draft`) follow this template precisely.
- **`backend/app/services/llm.py` `_apply_extracted`** (lines 297-325) — already writes 8 recipe fields from `GeminiExtractedRecipe`. RID-02 extends both the schema and this function to write 3 more fields (`cook_time_minutes`, `difficulty`, `description`).
- **`backend/app/services/llm.py` `_record_failure`** (lines 340-360) — failure-recording helper for voice/photo. RID-04 adds a sibling `_record_rewrite_failure` that differs only in setting `status='structured'` instead of `status='failed'` (D-26).
- **`backend/app/services/llm.py` test-mode fixtures** (lines 200-203, 228-231, 269-273) — every Gemini-calling function has a `if settings.environment == "test": return canned_..."` shortcut. RID-04's `rewrite_title()` and RID-05's `generate_recipe_illustration()` follow the same pattern.
- **`frontend/lib/enum-labels.ts` + `useEnumLabels()` hook** — Phase 22 QW-03 introduced this for cuisine/mood/protein French rendering. RID-02 adds `difficulty` to the same translation surface; `useEnumLabels().difficulty(value)` returns the French label.
- **`frontend/components/EmptyState.tsx`** — already accepts an `icon` prop (Lucide component today); BrandIcon should slot in. If TypeScript narrowing complains, widen the prop type to `ComponentType<{ size?: number; className?: string }>`.
- **`frontend/components/RecipeForm.tsx` optional-field pattern** — `NONE_VALUE` sentinel (`frontend/components/RecipeForm.tsx:330`) for nullable Select inputs (cuisine, protein). RID-02's `difficulty` select reuses this pattern. The 3 new fields drop in next to the existing optional fields block.
- **`backend/app/schemas/recipe.py` `Literal` field pattern** — `CuisineLiteral`, `ProteinLiteral`, `MoodLiteral` already exist for Pydantic validation. RID-02 adds `DifficultyLiteral` to the same file using the same shape.
- **`frontend/app/recipes/[id]/page.tsx`** — recipe detail page already exists with prep_time / servings / cuisine metadata block (Phase 8 + Phase 22 QW-03 enum-label work). RID-02 extends the metadata block; RID-03 mounts CompletenessCard above the body.
- **`frontend/app/recipes/[id]/edit/page.tsx` + `RecipeForm.tsx`** — edit flow already exists. RID-03 wires `?focus=` consumption.

### Established Patterns
- **`source_capture` JSONB invariant** (CLAUDE.md #5) — every capture surface stores the user's original input. RID-04's title rewrite IS a silent overwrite of `recipe.title`, but `source_capture.payload.title` still has the user's original title forever. Invariant holds.
- **Locked-vocabulary mirroring** (CLAUDE.md §"Locked vocabularies") — `frontend/lib/enums.ts` and `backend/app/models/enums.py` must move in lockstep. RID-02 adds `Difficulty` to both in the SAME plan; planner asserts grep-gate that both files mention "easy" / "medium" / "hard" before commit.
- **`alembic upgrade head` runs on Railway deploy** (CLAUDE.md §"Deployment") — RID-02's 0007 migration and RID-05's 0008 migration apply automatically when the corresponding plan's commits land on `main`. No manual migration step.
- **WebSocket broadcast pattern** (`services/realtime.broadcast_to_household`) — voice/photo BackgroundTasks broadcast `recipe.promoted` (`services/llm.py:328-337`). Quick + full-form keep their existing `recipe.created` broadcast at the router; the new BackgroundTask appends `recipe.promoted` on success. Matches invariant #4.
- **Test-mode determinism via `settings.environment == "test"` shortcuts** — Playwright suites depend on canned LLM fixtures (`llm_fixtures.py`). RID-04's `rewrite_title()` and RID-05's `generate_recipe_illustration()` MUST provide canned fixtures or the E2E suite hangs on Gemini calls.
- **`useTranslations` for all user-facing strings** (CLAUDE.md invariant #6) — French-only via `next-intl`. RID-02's new field labels + RID-03's chip labels + the catchy-title prompt's response language all flow through `fr.json`.

### Integration Points
- **`backend/app/routers/recipes.py:130-200`** — `create_full` and `create_quick` are the single mount points for RID-04's BackgroundTask wiring.
- **`backend/app/services/llm.py:297-325`** — `_apply_extracted` is the single mount point for RID-02's new field writes.
- **`frontend/app/recipes/[id]/page.tsx`** — single mount point for RID-03's CompletenessCard.
- **`frontend/app/recipes/[id]/edit/page.tsx`** — single mount point for RID-03's `?focus=` consumption.
- **`frontend/components/RecipeForm.tsx`** — single mount point for RID-02's three new inputs AND RID-03's ref attachments.
- **Inbox + recipes-library list-row components** — twin mount points for RID-05's `<RecipeIllustration />` swap.

### Creative Options Constrained Out
- Could have made `Difficulty` a native PostgreSQL enum (matching the SQL ENUM approach of `recipe_status`). Constrained to TEXT + CHECK constraint per the existing pattern at `backend/app/models/recipe.py:131-141` (cuisine + main_protein use TEXT + CHECK, not native ENUMs). Consistency wins.
- Could have added retry-with-backoff for the title rewrite Gemini call. Constrained out: a single attempt with `promotion_error` set is the existing pattern (`_record_failure` increments `promotion_attempts`, retry endpoint handles re-attempts). Adds complexity for unclear benefit at couple-scale.
- Could have made `computeCompleteness()` configurable (per-household field weights, custom field lists). Constrained to 11-equal-weight per REQ. The REQ explicitly says "per gh#22 default" — configurability is a future polish, not v0.5.
- Could have generated the SVG illustration on the frontend after fetching the recipe (move the Gemini call client-side). Constrained out: trust boundary requires server-side sanitization; client-side generation breaks the "sanitized before storage" property.
- Could have rendered the illustration on the detail page and shortlist deck. Explicitly deferred per REQ — list rows only in v1.

</code_context>

<specifics>
## Specific Ideas

- **Wave 1 parallelism (D-01) is a 1-cycle win.** RID-01 ships pure-frontend in its own worktree while RID-02 ships pure-backend+frontend-form. Zero shared files. Worktree-isolation overhead is paid back by the parallel executor cycle.
- **Failure-mode asymmetry (D-26 vs voice/photo)** is deliberate. Voice/photo failure leaves the user with NOTHING (Gemini extract failed entirely); status='failed' makes sense — they need to retry or delete. Quick/full-form failure leaves the user with a complete recipe MINUS a catchy title; status='structured' makes sense — they have a usable recipe; the rewrite is a polish step. The `promotion_error` column carries the failure context either way.
- **Edit race policy (D-29) accepts a corner case** in service of simplicity. The milestone-level "silent overwrite" decision was about replacing the user's original title with the LLM version; D-29 extends that to in-flight edits during the BackgroundTask race window. If real-device testing surfaces a UX issue, a follow-up phase can add `updated_at` change-detection cheaply.
- **Sanitizer reject-and-fallback (D-33) is binary on purpose.** Strip-and-keep mode is a larger code surface, harder to unit-test exhaustively, and risks shipping partial illustrations that look broken. Reject-and-fallback is one decision, one fallback path, trivially testable.
- **`viewBox` normalization to `0 0 160 160` (D-34)** makes the BrandIcon fallback visually consistent with the per-recipe illustration. Both render at 40×40 with the same coordinate system; eye doesn't perceive a scale jump.
- **Title rewrite runs once (D-28)** because re-rewriting the user's intentional edit would be a category of bug. The retry endpoint provides the escape hatch for users who want to re-roll the LLM title.
- **`Difficulty` enum + CHECK constraint follows the existing `cuisine` / `main_protein` pattern** (TEXT + CHECK, not native ENUM) per D-10's rationale. Native ENUM migrations are pricier and Phase 24 has no other reason to introduce one.

</specifics>

<deferred>
## Deferred Ideas

- **Native PostgreSQL `difficulty` ENUM** — surfaced when designing the CHECK constraint. Sticking with TEXT+CHECK for consistency with cuisine/main_protein. Could be migrated later if cuisine/main_protein also migrate.
- **`updated_at`-based edit race detection (RID-04)** — surfaced in D-29. Decided "BackgroundTask always wins" for simplicity. If real-device testing surfaces a UX regression, a follow-up phase adds the `updated_at > created_at + 2s` guard with minimal code.
- **Strip-and-keep SVG sanitizer mode** — surfaced in D-33. Decided reject-and-fallback is simpler and safer. Could revisit if reject-rate proves high in production.
- **Per-household / per-user CompletenessCard field weights** — surfaced when designing the 11-fields-equal-weight rule. Out of scope per REQ.
- **Detail page and shortlist deck illustration placements (RID-05)** — explicitly deferred per REQ. List rows only in v1.
- **Cuisine-themed illustration variants** — surfaced in D-32. Decided single-color line-art for visual coherence + simpler sanitizer surface. Could revisit if line-art illustrations prove visually uninteresting.
- **SVG illustration animation** — REQ explicitly says "static SVG only, no animation in v1." Stays out.
- **Retry-with-backoff for title rewrite Gemini calls** — surfaced when designing D-26. Single-attempt with promotion_error matches the existing voice/photo pattern; retry endpoint handles re-attempts.
- **Client-side illustration generation** — surfaced when designing D-36. Constrained out by the trust boundary requirement.
- **gh#20 unified capture surface** — explicitly deferred to v0.6 per PROJECT.md milestone decisions table. Needs its own `/gsd-explore` cycle.

### Reviewed Todos (not folded)
None — no separate todo cross-reference run for this phase.

</deferred>

---

*Phase: 24-recipe-identity*
*Context gathered: 2026-05-13*
