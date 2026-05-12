---
phase: 24
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py
  - backend/app/models/recipe.py
  - backend/app/models/enums.py
  - backend/app/schemas/recipe.py
  - backend/app/services/llm.py
  - backend/app/cli/seed.py
  - frontend/lib/enums.ts
  - frontend/lib/enum-labels.ts
  - frontend/components/RecipeForm.tsx
  - frontend/app/recipes/[id]/page.tsx
  - frontend/lib/i18n/fr.json
autonomous: true
requirements: [RID-02]
requirements_addressed: [RID-02]
tags: [backend, frontend, alembic, locked-vocabulary, llm, pydantic, recipe-model]

must_haves:
  truths:
    - "Three new optional columns exist on the recipes table: cook_time_minutes INTEGER NULL, difficulty TEXT NULL (with CHECK constraint), description TEXT NULL"
    - "Alembic head is at revision 0007 after migration runs; downgrade returns to 0006"
    - "Difficulty enum is defined in BOTH backend/app/models/enums.py (Python str-Enum) AND frontend/lib/enums.ts (TS const + type) with values exactly easy/medium/hard"
    - "RecipeFullCreate, RecipeUpdate, RecipeResponse, RecipeQuickCreate all expose the three new fields (RecipeQuickCreate accepts only title — quick capture does not collect them)"
    - "GeminiExtractedRecipe gains the three new fields; _apply_extracted writes them; both voice and photo extract prompts instruct Gemini to extract the new fields"
    - "RecipeForm.tsx renders three new inputs: Input type=number for cook_time_minutes, Select for difficulty (with NONE_VALUE sentinel), Textarea for description"
    - "/recipes/[id] page metadata block displays the three new fields when non-null (Cuisson, Difficulté metadata pills; Description as a paragraph above ingredients)"
    - "fr.json has French labels for the three new field labels AND the three difficulty values (easy/medium/hard → Facile/Moyen/Difficile)"
    - "useEnumLabels() returns a difficulty(value) translator alongside the existing cuisine/mood/protein translators"
    - "Seed script (backend/app/cli/seed.py) imports Difficulty and sets deterministic values (cook_time_minutes, difficulty, description) on at least one seeded recipe so Playwright assertions can rely on them"
    - "Existing recipes (rows that existed before the migration) get NULL for all three new columns — no backfill (D-16; intentional nudge for RID-03's CompletenessCard)"
  artifacts:
    - path: "backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py"
      provides: "Alembic migration adding 3 columns + 1 CHECK constraint; revision=0007, down_revision=0006"
      contains: "recipes_difficulty_check"
    - path: "backend/app/models/recipe.py"
      provides: "Recipe SQLAlchemy model with the 3 new mapped columns + extended __table_args__ CheckConstraint tuple"
      contains: "cook_time_minutes"
    - path: "backend/app/models/enums.py"
      provides: "Python Difficulty(str, Enum) — values easy/medium/hard"
      contains: "class Difficulty(str, Enum)"
    - path: "frontend/lib/enums.ts"
      provides: "TypeScript Difficulty const + type — values easy/medium/hard"
      contains: "export const Difficulty"
    - path: "backend/app/schemas/recipe.py"
      provides: "Pydantic schemas (RecipeFullCreate, RecipeUpdate, RecipeResponse, RecipeQuickCreate) extended with cook_time_minutes, difficulty (Literal), description"
      contains: "DifficultyLiteral"
    - path: "backend/app/services/llm.py"
      provides: "GeminiExtractedRecipe extended with 3 new fields; _apply_extracted writes them; voice/photo prompts ask Gemini to extract them"
      contains: "cook_time_minutes"
    - path: "frontend/components/RecipeForm.tsx"
      provides: "Three new inputs (Input number, Select, Textarea) wired into RecipeFormValues + recipeToFormValues + formValuesToBody"
      contains: "cook_time_minutes"
    - path: "frontend/app/recipes/[id]/page.tsx"
      provides: "Detail page rendering Cuisson/Difficulté/Description fields when non-null"
      contains: "cook_time_minutes"
    - path: "frontend/lib/i18n/fr.json"
      provides: "French labels for 3 new field names + 3 difficulty values"
      contains: "difficulty"
    - path: "backend/app/cli/seed.py"
      provides: "Seeded recipes populated with deterministic cook_time/difficulty/description on at least one row (for Playwright fixtures)"
      contains: "Difficulty"
  key_links:
    - from: "backend/app/models/recipe.py"
      to: "backend/alembic/versions/0007_*.py"
      via: "mapped_column declarations match the migration's op.add_column / op.create_check_constraint calls"
      pattern: "cook_time_minutes.*Integer.*nullable=True"
    - from: "backend/app/models/enums.py Difficulty"
      to: "frontend/lib/enums.ts Difficulty"
      via: "locked-vocabulary mirror — values must match byte-for-byte (CLAUDE.md §Locked vocabularies)"
      pattern: "(easy|medium|hard)"
    - from: "backend/app/services/llm.py _apply_extracted"
      to: "backend/app/models/recipe.py columns"
      via: "extracted.cook_time_minutes / extracted.difficulty / extracted.description written to recipe.<field>"
      pattern: "recipe\\.(cook_time_minutes|difficulty|description) = extracted\\."
    - from: "frontend/components/RecipeForm.tsx"
      to: "backend/app/schemas/recipe.py RecipeUpdate/RecipeFullCreate"
      via: "formValuesToBody returns cook_time_minutes / difficulty / description"
      pattern: "cook_time_minutes\\?:|difficulty\\?:|description\\?:"
---

<objective>
Phase 24 / RID-02 — Recipe data model. Add three optional fields to the recipe model (cook_time_minutes INTEGER, difficulty TEXT with CHECK constraint, description TEXT), thread them through the locked-vocabulary boundary (Difficulty enum on BOTH sides), Pydantic schemas, the Gemini extraction pipeline, the RecipeForm UI, the detail page metadata block, and the seed script.

Purpose: Establish the data foundation that RID-03's CompletenessCard scores, RID-04's title rewrite preserves, and RID-05's illustration draws context from. The three fields are intentionally optional — RID-03 will nudge users to fill them in. Closes gh#22 Part A.

Output: 1 new Alembic migration (0007), 10 modified files spanning backend (model, enums, schemas, llm extract, seed) and frontend (enums, enum-labels, form, detail page, fr.json).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/24-recipe-identity/24-CONTEXT.md
@.planning/phases/24-recipe-identity/24-RESEARCH.md
@CLAUDE.md
@frontend/AGENTS.md
@backend/alembic/versions/0006_recipe_status_failed.py
@backend/alembic/versions/0003_promotion_columns.py
@backend/app/models/recipe.py
@backend/app/models/enums.py
@backend/app/schemas/recipe.py
@backend/app/services/llm.py
@backend/app/services/llm_fixtures.py
@backend/app/cli/seed.py
@frontend/lib/enums.ts
@frontend/lib/enum-labels.ts
@frontend/components/RecipeForm.tsx
@frontend/app/recipes/[id]/page.tsx
@frontend/lib/i18n/fr.json
</context>

<interfaces>
<!-- Key types and primitives the executor needs. Extracted from codebase. No exploration required. -->

From `backend/alembic/versions/0006_recipe_status_failed.py` (latest revision — 0007 is next free per RESEARCH.md §Target 5):
```python
revision: str = "0006"
down_revision: Union[str, None] = "0005"
```

From `backend/alembic/versions/0003_promotion_columns.py` (canonical additive-migration template for nullable columns):
```python
def upgrade() -> None:
    op.add_column("recipes", sa.Column("promotion_error", sa.Text(), nullable=True))
    op.add_column("recipes", sa.Column("promotion_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")))

def downgrade() -> None:
    op.drop_column("recipes", "promotion_attempts")
    op.drop_column("recipes", "promotion_error")
```

From `backend/app/models/recipe.py` (current existing CHECK constraints — pattern to MATCH for difficulty):
```python
__table_args__ = (
    CheckConstraint(
        "cuisine IS NULL OR cuisine IN ("
        "'italian','french','asian','mediterranean','middleEastern',"
        "'indian','mexican','northAfrican','american','other')",
        name="recipes_cuisine_check",
    ),
    CheckConstraint(
        "main_protein IS NULL OR main_protein IN ("
        "'poultry','redMeat','fish','seafood','egg','legume','none')",
        name="recipes_main_protein_check",
    ),
    Index("idx_recipes_household_status", "household_id", "status"),
    Index("idx_recipes_last_cooked", "household_id", text("last_cooked_at DESC NULLS LAST")),
)
```
Existing prep_time_minutes shape (line 80) — `Mapped[int | None] = mapped_column(Integer, nullable=True)` — mirror for cook_time_minutes.
Existing cuisine column (line 82) — `Mapped[str | None] = mapped_column(Text, nullable=True)` — mirror for difficulty (plus the CHECK constraint).

From `backend/app/models/enums.py` (current shape; Difficulty must follow this pattern):
```python
class Cuisine(str, Enum):
    italian = "italian"
    # ... etc
```

From `frontend/lib/enums.ts` (current shape; Difficulty must follow this pattern):
```typescript
export const Mood = {
  comfort: "comfort",
  light: "light",
  // ...
} as const;
export type Mood = (typeof Mood)[keyof typeof Mood];
```

From `backend/app/schemas/recipe.py` — `Literal["draft","structured","verified"]` pattern (RecipeUpdate.status) — mirror for DifficultyLiteral.

From `backend/app/services/llm.py:117-138`:
```python
class GeminiExtractedRecipe(BaseModel):
    title: str
    ingredients: Optional[list[GeminiIngredient]] = None
    steps: Optional[list[str]] = None
    prep_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
    servings: Optional[int] = Field(default=None, ge=1, le=99)
    cuisine: Optional[CuisineLiteral] = None
    mood: list[MoodLiteral] = Field(default_factory=list)
    main_protein: Optional[ProteinLiteral] = None
    seasonality: list[SeasonLiteral] = Field(default_factory=list)
```

From `backend/app/services/llm.py:167-177` (extract prompts):
```python
_EXTRACT_PROMPT_VOICE = (
    "Extrais les champs structurés de cette recette dictée en français. "
    "Renvoie null pour les champs absents — n'invente rien. Ne mets que des "
    "valeurs des vocabulaires verrouillés pour cuisine, mood, main_protein, "
    "seasonality."
)
_EXTRACT_PROMPT_PHOTOS = (
    "Voici une recette photographiée (1 à 4 images). Extrais les champs "
    "structurés en français. Renvoie null pour les champs absents — n'invente "
    "rien."
)
```

From `backend/app/services/llm.py:297-325` (_apply_extracted — extension point):
```python
def _apply_extracted(recipe: Recipe, extracted: GeminiExtractedRecipe) -> None:
    if not extracted.title or not extracted.title.strip():
        raise ValueError("Gemini returned empty title")
    recipe.title = extracted.title
    recipe.ingredients = (...)
    recipe.steps = extracted.steps
    recipe.prep_time_minutes = extracted.prep_time_minutes
    recipe.servings = extracted.servings
    recipe.cuisine = extracted.cuisine
    recipe.mood = list(extracted.mood) if extracted.mood else []
    recipe.main_protein = extracted.main_protein
    recipe.seasonality = (...)
    recipe.status = "structured"
    recipe.promotion_error = None
```

From `frontend/components/RecipeForm.tsx` — `NONE_VALUE` sentinel pattern at line 32 + `RecipeFormValues` shape at line 77, `recipeToFormValues` at line 104, `formValuesToBody` at line 133, render function `RecipeForm` at line 220. The current optional-field block in the rendered form has Input/Select pairs for `prep_time_minutes` (Input), `servings` (Input), `cuisine` (Select with NONE_VALUE), `main_protein` (Select with NONE_VALUE). The three new inputs slot in alongside these.

From `frontend/lib/enum-labels.ts` — `useEnumLabels()` hook returning per-enum French-label translators (cuisine, mood, protein). Difficulty must be added as a fourth translator using the same shape.

**Wave 1 isolation note:** This plan does NOT touch `services/llm.py:368-414` (BackgroundTask bodies) — those are RID-04's territory. It DOES touch `services/llm.py:117-177` (Pydantic schema + extract prompts) and `:297-325` (_apply_extracted). RID-04 (Wave 2) will add `rewrite_title()` + new BackgroundTask bodies in the same file; the two plans don't share line ranges and won't conflict at the chunk level.
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Alembic migration 0007 — add 3 columns + difficulty CHECK constraint (RID-02 / D-03, D-11)</name>
  <files>backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py</files>
  <read_first>
    - backend/alembic/versions/0006_recipe_status_failed.py (confirm latest revision = 0006; new one is 0007)
    - backend/alembic/versions/0003_promotion_columns.py (canonical nullable-add-column template)
    - backend/alembic/versions/0001_baseline.py (CheckConstraint naming pattern: recipes_cuisine_check, recipes_main_protein_check → recipes_difficulty_check)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-03, §D-11
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pattern 3: Alembic additive migration with CHECK constraint"
  </read_first>
  <action>
    Create NEW file `backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` with EXACTLY the following content:

    ```python
    """Phase 24 RID-02 — add cook_time_minutes / difficulty / description.

    Three optional recipe-identity columns:
    - cook_time_minutes INTEGER NULL  (mirrors prep_time_minutes; no CHECK)
    - difficulty TEXT NULL + recipes_difficulty_check CHECK constraint
      (mirrors the cuisine/main_protein TEXT+CHECK pattern; values
      'easy' / 'medium' / 'hard' lock-stepped with backend/app/models/enums.py
      Difficulty and frontend/lib/enums.ts Difficulty)
    - description TEXT NULL  (free-form long-text)

    Backfill posture: NULL on all existing rows (no server_default). Existing
    recipes will show low CompletenessCard scores after this lands — that's
    the intended nudge per gh#22 / RID-03.
    """

    from __future__ import annotations

    from typing import Sequence, Union

    import sqlalchemy as sa
    from alembic import op


    revision: str = "0007"
    down_revision: Union[str, None] = "0006"
    branch_labels: Union[str, Sequence[str], None] = None
    depends_on: Union[str, Sequence[str], None] = None


    def upgrade() -> None:
        op.add_column(
            "recipes",
            sa.Column("cook_time_minutes", sa.Integer(), nullable=True),
        )
        op.add_column(
            "recipes",
            sa.Column("difficulty", sa.Text(), nullable=True),
        )
        op.add_column(
            "recipes",
            sa.Column("description", sa.Text(), nullable=True),
        )
        op.create_check_constraint(
            "recipes_difficulty_check",
            "recipes",
            "difficulty IS NULL OR difficulty IN ('easy','medium','hard')",
        )


    def downgrade() -> None:
        op.drop_constraint("recipes_difficulty_check", "recipes", type_="check")
        op.drop_column("recipes", "description")
        op.drop_column("recipes", "difficulty")
        op.drop_column("recipes", "cook_time_minutes")
    ```

    Specifically:
    - `revision = "0007"` and `down_revision = "0006"` — matches the existing string-revision convention from 0001..0006 (NOT the auto-generated long-hash style).
    - Three `op.add_column` calls — match the 0003 nullable-column template byte-for-byte (no server_default).
    - `op.create_check_constraint("recipes_difficulty_check", "recipes", "difficulty IS NULL OR difficulty IN ('easy','medium','hard')")` — name matches the existing `recipes_cuisine_check` / `recipes_main_protein_check` convention.
    - Downgrade drops in REVERSE order (constraint first, then columns) — required because PostgreSQL won't let you drop a column referenced by a constraint.
    - Top-of-file docstring documents the backfill posture (NULL on existing rows is intentional per D-16).
    - File ends with a trailing newline.

    Do NOT run the migration yet (Railway runs `alembic upgrade head` on deploy — see CLAUDE.md §Deployment). Local dev: the executor may run `cd backend && uv run alembic upgrade head` to verify the migration applies cleanly against the local Postgres, but the production-effective application is on push to main.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -E "revision: str = \"0007\"|down_revision.*=.*\"0006\"" alembic/versions/0007_add_recipe_difficulty_cook_time_description.py | wc -l | tr -d ' '</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /Users/gulu3001/dev/al-dente/backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py && echo OK` prints OK.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "revision: str = \"0007\"" alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "down_revision: Union\\[str, None\\] = \"0006\"" alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "op.add_column(" alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` returns `3`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "op.drop_column(" alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` returns `3`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "recipes_difficulty_check" alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` returns at least `2` (create + drop).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "difficulty IS NULL OR difficulty IN ('easy','medium','hard')" alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run alembic upgrade head` exits 0 against the local Postgres (operator can run; if local Postgres unavailable, this assertion downgrades to a manual review).
    - After upgrade: `cd /Users/gulu3001/dev/al-dente/backend && uv run alembic current` reports `0007 (head)`.
  </acceptance_criteria>
  <done>
    Migration 0007 file exists, declares revision 0007/down_revision 0006, adds three nullable columns + the `recipes_difficulty_check` CHECK constraint, and downgrades cleanly in reverse order. Local `alembic upgrade head` applies it without error (when run).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Extend Recipe SQLAlchemy model with 3 new mapped columns + CheckConstraint (RID-02 / D-11)</name>
  <files>backend/app/models/recipe.py</files>
  <read_first>
    - backend/app/models/recipe.py (full file — 163 lines)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-11
  </read_first>
  <action>
    Add three new `Mapped[...] = mapped_column(...)` declarations to the `Recipe` class in `backend/app/models/recipe.py`, AND add a new `CheckConstraint` to `__table_args__`.

    Two sub-edits:

    SUB-EDIT 2A — Add three new column declarations. Place them IMMEDIATELY AFTER the existing `prep_time_minutes` line (currently line 80, which is `prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)`). The block becomes:

    ```python
        prep_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
        # Phase 24 RID-02 (migration 0007): three optional recipe-identity columns.
        # cook_time_minutes mirrors prep_time_minutes (no CHECK). difficulty has
        # a CHECK constraint in __table_args__ enforcing easy/medium/hard. description
        # is free-form. Existing rows get NULL (no server_default).
        cook_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
        difficulty: Mapped[str | None] = mapped_column(Text, nullable=True)
        description: Mapped[str | None] = mapped_column(Text, nullable=True)
        servings: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ```

    (Note: the existing `servings` line currently follows `prep_time_minutes`; the three new declarations slot in BETWEEN them. The comment block is intentional per CLAUDE.md §Comments — explain WHY, not WHAT.)

    SUB-EDIT 2B — Add a `recipes_difficulty_check` CheckConstraint to the existing `__table_args__` tuple at line 130. Insert it AFTER `recipes_main_protein_check` and BEFORE the first `Index(...)`:

    ```python
        __table_args__ = (
            CheckConstraint(
                "cuisine IS NULL OR cuisine IN ("
                "'italian','french','asian','mediterranean','middleEastern',"
                "'indian','mexican','northAfrican','american','other')",
                name="recipes_cuisine_check",
            ),
            CheckConstraint(
                "main_protein IS NULL OR main_protein IN ("
                "'poultry','redMeat','fish','seafood','egg','legume','none')",
                name="recipes_main_protein_check",
            ),
            CheckConstraint(
                "difficulty IS NULL OR difficulty IN ('easy','medium','hard')",
                name="recipes_difficulty_check",
            ),
            Index("idx_recipes_household_status", "household_id", "status"),
            Index(
                "idx_recipes_last_cooked",
                "household_id",
                text("last_cooked_at DESC NULLS LAST"),
            ),
        )
    ```

    Do NOT modify any other column, index, method, or import. The 3 new columns and 1 new CheckConstraint are purely additive.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -cE "cook_time_minutes|^\\s+difficulty:|^\\s+description:" app/models/recipe.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "cook_time_minutes: Mapped\\[int | None\\] = mapped_column(Integer, nullable=True)" app/models/recipe.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "difficulty: Mapped\\[str | None\\] = mapped_column(Text, nullable=True)" app/models/recipe.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "description: Mapped\\[str | None\\] = mapped_column(Text, nullable=True)" app/models/recipe.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "recipes_difficulty_check" app/models/recipe.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "difficulty IS NULL OR difficulty IN ('easy','medium','hard')" app/models/recipe.py` returns `1`.
    - The 3 CheckConstraints appear in order cuisine → main_protein → difficulty in __table_args__: `cd /Users/gulu3001/dev/al-dente/backend && grep -n "recipes_cuisine_check\|recipes_main_protein_check\|recipes_difficulty_check" app/models/recipe.py` returns three lines with increasing line numbers in that order.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.models.recipe import Recipe; print(Recipe.__table__.columns.keys())"` includes 'cook_time_minutes', 'difficulty', 'description'.
  </acceptance_criteria>
  <done>
    The Recipe model declares the three new columns (cook_time_minutes Integer nullable, difficulty Text nullable, description Text nullable) and the `recipes_difficulty_check` CheckConstraint. Existing column/constraint/index declarations are byte-identical to before.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Add Difficulty enum to BOTH enums files (Python + TypeScript) (RID-02 / D-10)</name>
  <files>backend/app/models/enums.py, frontend/lib/enums.ts</files>
  <read_first>
    - backend/app/models/enums.py (full file — 43 lines)
    - frontend/lib/enums.ts (full file — 46 lines)
    - CLAUDE.md §"Locked vocabularies" (drift = bug category)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-10
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §"Pitfall 5: Difficulty enum drift"
  </read_first>
  <action>
    Add a `Difficulty` enum to BOTH `backend/app/models/enums.py` AND `frontend/lib/enums.ts` in the SAME atomic edit so they cannot drift. The two enums MUST have identical wire-format string values: exactly `"easy"`, `"medium"`, `"hard"` (lowercase, no underscores, ASCII).

    SUB-EDIT 3A — Append to `backend/app/models/enums.py` (after the existing `Protein` class — at the end of the file, preserving the existing trailing newline):

    ```python


    class Difficulty(str, Enum):
        easy = "easy"
        medium = "medium"
        hard = "hard"
    ```

    (Two blank lines before `class Difficulty` to match the PEP 8 spacing between the other Enum classes — `Season` / `Cuisine` / `Mood` / `Protein` are each separated by two blank lines in the current file.)

    SUB-EDIT 3B — Append to `frontend/lib/enums.ts` (after the existing `Protein` const + type — at the end of the file):

    ```typescript

    export const Difficulty = {
      easy: "easy",
      medium: "medium",
      hard: "hard",
    } as const;
    export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];
    ```

    Specifically:
    - Python: lowercase member names match the values (`easy = "easy"`, etc.) — consistent with `Mood` / `Season` style (NOT the `red_meat = "redMeat"` style used by `Protein.red_meat` / `Cuisine.middle_eastern` which exist only because Python identifiers cannot contain dashes; the three difficulty values are single-word lowercase, so no name-vs-value drift is possible).
    - TypeScript: keys match values byte-identically (`easy: "easy"`, etc.).
    - Use `as const` + the standard `(typeof X)[keyof typeof X]` type pattern (matches every other enum in `enums.ts`).
    - Do NOT modify any other line in either file. Do NOT reorder existing enums.

    The values are LOCKED across both files. A future executor MUST update both in the same change (CLAUDE.md). The grep gate in §Verification asserts both files mention all three values.
  </action>
  <verify>
    <automated>grep -c "class Difficulty" /Users/gulu3001/dev/al-dente/backend/app/models/enums.py && grep -c "export const Difficulty" /Users/gulu3001/dev/al-dente/frontend/lib/enums.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "class Difficulty(str, Enum)" /Users/gulu3001/dev/al-dente/backend/app/models/enums.py` returns `1`.
    - `grep -cE "easy = \"easy\"|medium = \"medium\"|hard = \"hard\"" /Users/gulu3001/dev/al-dente/backend/app/models/enums.py` returns `3`.
    - `grep -c "export const Difficulty" /Users/gulu3001/dev/al-dente/frontend/lib/enums.ts` returns `1`.
    - `grep -cE "easy: \"easy\"|medium: \"medium\"|hard: \"hard\"" /Users/gulu3001/dev/al-dente/frontend/lib/enums.ts` returns `3`.
    - `grep -c "export type Difficulty" /Users/gulu3001/dev/al-dente/frontend/lib/enums.ts` returns `1`.
    - Drift sanity: `bash -c "grep -oE 'easy|medium|hard' /Users/gulu3001/dev/al-dente/backend/app/models/enums.py | sort -u"` outputs `easy\nhard\nmedium` AND `bash -c "grep -oE 'easy|medium|hard' /Users/gulu3001/dev/al-dente/frontend/lib/enums.ts | sort -u"` outputs the same.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.models.enums import Difficulty; assert [d.value for d in Difficulty] == ['easy', 'medium', 'hard']"` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
  </acceptance_criteria>
  <done>
    Both files export `Difficulty` with values exactly `easy`/`medium`/`hard`. The drift grep returns identical sorted output across the two files. No other enum changed.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Extend Pydantic schemas with cook_time_minutes / difficulty / description (RID-02 / D-12)</name>
  <files>backend/app/schemas/recipe.py</files>
  <read_first>
    - backend/app/schemas/recipe.py (full file — 194 lines)
    - backend/app/models/enums.py (Difficulty enum from Task 3 — needed for the import; alternatively use Literal["easy","medium","hard"] per D-12 / RESEARCH §"Example 5")
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-12, §D-16
  </read_first>
  <action>
    Extend four Pydantic schemas in `backend/app/schemas/recipe.py`: `RecipeFullCreate`, `RecipeUpdate`, `RecipeResponse`. **`RecipeQuickCreate` stays unchanged** (D-12 lists it, but quick-add takes ONLY a title per the existing v0.1 contract — the three new fields are added at the full-form/edit/extract surfaces, not the quick-add path).

    Five sub-edits:

    SUB-EDIT 4A — Define `DifficultyLiteral` near the top of the file (after the existing imports block at line 29). Insert:

    ```python
    # Phase 24 RID-02 — locked difficulty vocabulary. Mirrors backend/app/models/enums.py
    # Difficulty AND frontend/lib/enums.ts Difficulty (drift is a bug category per
    # CLAUDE.md §"Locked vocabularies"). The Literal shape lets Pydantic v2 validate
    # the wire value at parse time without requiring callers to import the Enum class.
    DifficultyLiteral = Literal["easy", "medium", "hard"]
    ```

    (`Literal` is already imported on line 24: `from typing import Any, List, Literal, Optional`.)

    SUB-EDIT 4B — Extend `RecipeFullCreate` (currently lines 51-75). Add three new fields after `seasonality` and before `tags`:

    Insert between `seasonality: ...` (line 67-74 block) and `tags: List[str] = Field(default_factory=list)` (line 75):

    ```python
        # Phase 24 RID-02 — three optional recipe-identity fields.
        cook_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
        difficulty: Optional[DifficultyLiteral] = None
        description: Optional[str] = Field(default=None, max_length=2000)
    ```

    Specifically:
    - `cook_time_minutes` uses the same `ge=0, le=24*60` bounds as `prep_time_minutes` (24-hour cap is sane and matches existing precedent).
    - `difficulty` uses `Optional[DifficultyLiteral]` — Pydantic v2 validates the input is one of the three literal strings at parse time; DB CHECK constraint is the second layer of defense in depth.
    - `description` uses `max_length=2000` — generous cap (~5x the ~500 char UI textarea limit referenced in D-11) to allow longer descriptions if someone pastes from a recipe site; the DB has no length cap so this is the only enforcement point.

    SUB-EDIT 4C — Extend `RecipeUpdate` (currently lines 90-113). Add three new fields in the same location (after `tags`, before the closing of the class):

    ```python
        # Phase 24 RID-02 — three optional recipe-identity fields.
        cook_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
        difficulty: Optional[DifficultyLiteral] = None
        description: Optional[str] = Field(default=None, max_length=2000)
    ```

    SUB-EDIT 4D — Extend `RecipeResponse` (currently lines 119-159). Add three new fields just before the `last_cooked_at` line (line 145):

    ```python
        # Phase 24 RID-02 — three optional recipe-identity fields. Mirrors the
        # recipes.cook_time_minutes / difficulty / description columns. NULL on
        # rows that existed before migration 0007 (intentional per D-16).
        cook_time_minutes: Optional[int] = None
        difficulty: Optional[str] = None
        description: Optional[str] = None
    ```

    (RecipeResponse uses plain `Optional[str]` for difficulty rather than `Optional[DifficultyLiteral]` — the response side just relays whatever the DB has; write-side validation is via the create/update schemas. This matches the existing pattern at lines 140-141 where `cuisine` and `main_protein` are plain `Optional[str]` on the response.)

    SUB-EDIT 4E — `RecipeQuickCreate` is INTENTIONALLY NOT modified. Verify by greppping after edits: `grep -c "RecipeQuickCreate" backend/app/schemas/recipe.py` returns at least 1 reference but the class body (lines 78-87) is unchanged — it still has only `title: str = Field(min_length=1, max_length=200)`. Rationale: quick-add is "title-only" by design (RECIPE-02 contract). The three new fields land via PUT after the user navigates to the edit form, OR via the LLM extract path for voice/photo. (If CONTEXT.md D-12 is interpreted as requiring all four schemas, the executor should follow this plan's interpretation — quick is title-only per the RECIPE-02 invariant, and the LLM extract path is where structured fields arrive.)
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -cE "DifficultyLiteral|cook_time_minutes" app/schemas/recipe.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "DifficultyLiteral = Literal\\[\"easy\", \"medium\", \"hard\"\\]" app/schemas/recipe.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "cook_time_minutes" app/schemas/recipe.py` returns at least `3` (one per modified schema: RecipeFullCreate, RecipeUpdate, RecipeResponse).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "difficulty:" app/schemas/recipe.py` returns at least `3`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "description: Optional" app/schemas/recipe.py` returns at least `3`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "max_length=2000" app/schemas/recipe.py` returns `2` (RecipeFullCreate + RecipeUpdate).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "ge=0, le=24 \\* 60" app/schemas/recipe.py` returns at least `4` (existing 2 prep_time_minutes uses + 2 new cook_time_minutes uses).
    - RecipeQuickCreate body is unchanged: `cd /Users/gulu3001/dev/al-dente/backend && grep -A 3 "class RecipeQuickCreate(BaseModel):" app/schemas/recipe.py | grep -c "title: str = Field" returns `1` and no cook_time_minutes/difficulty/description appears in the next 5 lines after the class header.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.schemas.recipe import RecipeFullCreate, RecipeUpdate, RecipeResponse, DifficultyLiteral; r = RecipeFullCreate(title='x', difficulty='easy', cook_time_minutes=30, description='y'); assert r.difficulty == 'easy'"` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.schemas.recipe import RecipeFullCreate; import pytest; pytest.raises(Exception, lambda: RecipeFullCreate(title='x', difficulty='extreme'))"` exits 0 (invalid literal raises).
  </acceptance_criteria>
  <done>
    `DifficultyLiteral` is defined once and reused by `RecipeFullCreate` + `RecipeUpdate`. All three Pydantic schemas (Create/Update/Response) expose the three new fields. RecipeQuickCreate is unchanged (title-only by invariant).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Extend GeminiExtractedRecipe + extract prompts + _apply_extracted in services/llm.py (RID-02 / D-13)</name>
  <files>backend/app/services/llm.py</files>
  <read_first>
    - backend/app/services/llm.py lines 100-180 (GeminiExtractedRecipe + extract prompts)
    - backend/app/services/llm.py lines 290-330 (_apply_extracted)
    - backend/app/services/llm_fixtures.py (canned voice/photo recipes — may need extension if Playwright relies on the new fields appearing)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-13
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §Target 4 (prompt-injection notes)
  </read_first>
  <action>
    Three sub-edits in `backend/app/services/llm.py` plus one optional fixture extension.

    SUB-EDIT 5A — Extend `GeminiExtractedRecipe` at lines 117-138. Add three new optional fields. Insert between `servings:` and `cuisine:` (so the schema reads chronologically prep_time → cook_time → servings → difficulty → description → cuisine):

    Current schema:
    ```python
    class GeminiExtractedRecipe(BaseModel):
        title: str
        ingredients: Optional[list[GeminiIngredient]] = None
        steps: Optional[list[str]] = None
        prep_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
        servings: Optional[int] = Field(default=None, ge=1, le=99)
        cuisine: Optional[CuisineLiteral] = None
        mood: list[MoodLiteral] = Field(default_factory=list)
        main_protein: Optional[ProteinLiteral] = None
        seasonality: list[SeasonLiteral] = Field(default_factory=list)
    ```

    New schema (insert the three fields where indicated):
    ```python
    class GeminiExtractedRecipe(BaseModel):
        title: str
        ingredients: Optional[list[GeminiIngredient]] = None
        steps: Optional[list[str]] = None
        prep_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
        # Phase 24 RID-02 — cook_time_minutes mirrors prep_time_minutes shape.
        cook_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
        servings: Optional[int] = Field(default=None, ge=1, le=99)
        # Phase 24 RID-02 — difficulty + description. Literal pattern matches CuisineLiteral.
        difficulty: Optional[Literal["easy", "medium", "hard"]] = None
        description: Optional[str] = Field(default=None, max_length=2000)
        cuisine: Optional[CuisineLiteral] = None
        mood: list[MoodLiteral] = Field(default_factory=list)
        main_protein: Optional[ProteinLiteral] = None
        seasonality: list[SeasonLiteral] = Field(default_factory=list)
    ```

    Specifically:
    - Add `Literal` to the existing `from typing import ...` line at the top of the file (if not already imported — verify via `grep -n "^from typing" backend/app/services/llm.py`; if `Literal` is missing from the import list, add it).
    - The three new fields are positioned for readability (cook_time_minutes adjacent to prep_time_minutes; difficulty + description grouped) but Pydantic field order does NOT affect validation.

    SUB-EDIT 5B — Extend both extract prompts at lines 167-177. Append a single sentence per CONTEXT.md D-13: `"Extrais aussi cook_time_minutes (en minutes), difficulty ('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette)."`. Concretely:

    Current `_EXTRACT_PROMPT_VOICE`:
    ```python
    _EXTRACT_PROMPT_VOICE = (
        "Extrais les champs structurés de cette recette dictée en français. "
        "Renvoie null pour les champs absents — n'invente rien. Ne mets que des "
        "valeurs des vocabulaires verrouillés pour cuisine, mood, main_protein, "
        "seasonality."
    )
    ```

    New `_EXTRACT_PROMPT_VOICE`:
    ```python
    _EXTRACT_PROMPT_VOICE = (
        "Extrais les champs structurés de cette recette dictée en français. "
        "Renvoie null pour les champs absents — n'invente rien. Ne mets que des "
        "valeurs des vocabulaires verrouillés pour cuisine, mood, main_protein, "
        "seasonality. Extrais aussi cook_time_minutes (en minutes), difficulty "
        "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette)."
    )
    ```

    Apply the same trailing-sentence append to `_EXTRACT_PROMPT_PHOTOS`:

    New `_EXTRACT_PROMPT_PHOTOS`:
    ```python
    _EXTRACT_PROMPT_PHOTOS = (
        "Voici une recette photographiée (1 à 4 images). Extrais les champs "
        "structurés en français. Renvoie null pour les champs absents — n'invente "
        "rien. Extrais aussi cook_time_minutes (en minutes), difficulty "
        "('easy'/'medium'/'hard'), et description (1-2 phrases résumant la recette)."
    )
    ```

    Do NOT touch `_MODIFY_PROMPT` — voice-modification is an in-place edit pipeline; the new fields flow in via the same shape automatically because the schema (`GeminiExtractedRecipe`) was extended in SUB-EDIT 5A.

    SUB-EDIT 5C — Extend `_apply_extracted` at lines 297-325 to write the three new fields. Insert AFTER `recipe.prep_time_minutes = extracted.prep_time_minutes` and the corresponding `recipe.servings = extracted.servings` lines:

    Current `_apply_extracted` body:
    ```python
        recipe.title = extracted.title
        recipe.ingredients = (...)
        recipe.steps = extracted.steps
        recipe.prep_time_minutes = extracted.prep_time_minutes
        recipe.servings = extracted.servings
        recipe.cuisine = extracted.cuisine
        ...
    ```

    New `_apply_extracted` body (insert 3 lines after `recipe.servings = extracted.servings`):
    ```python
        recipe.title = extracted.title
        recipe.ingredients = (...)
        recipe.steps = extracted.steps
        recipe.prep_time_minutes = extracted.prep_time_minutes
        recipe.servings = extracted.servings
        # Phase 24 RID-02 — three optional recipe-identity fields.
        recipe.cook_time_minutes = extracted.cook_time_minutes
        recipe.difficulty = extracted.difficulty
        recipe.description = extracted.description
        recipe.cuisine = extracted.cuisine
        ...
    ```

    Specifically:
    - The three new writes happen UNCONDITIONALLY (no `if extracted.cook_time_minutes is not None:` guard) — when Gemini returns `None`, the recipe column also becomes `None`, which matches the NOT-EXTRACTED state per the prompt instruction "Renvoie null pour les champs absents". This is consistent with how `prep_time_minutes` / `servings` / `cuisine` / `main_protein` are already written.
    - Do NOT modify the `recipe.status = "structured"` or `recipe.promotion_error = None` lines at the end of the function.

    SUB-EDIT 5D (fixture extension — recommended for Playwright determinism per D-42) — Extend the canned fixtures in `backend/app/services/llm_fixtures.py` so test-mode extractions include the three new fields. Append the three fields to `canned_voice_recipe`'s return value (preserve all existing fields verbatim, just add three):

    ```python
    return GeminiExtractedRecipe(
        title="Risotto aux champignons (test)",
        ingredients=[...existing...],
        steps=[...existing...],
        prep_time_minutes=35,
        cook_time_minutes=25,                       # NEW
        servings=2,
        difficulty="medium",                         # NEW
        description="Risotto crémeux aux champignons et parmesan (test).",  # NEW
        cuisine="italian",
        mood=["comfort"],
        main_protein="none",
        seasonality=["autumn", "winter"],
    )
    ```

    And `canned_photo_recipe`:
    ```python
    return GeminiExtractedRecipe(
        title="Tarte Tatin (test)",
        ingredients=[...existing...],
        steps=[...existing...],
        prep_time_minutes=60,
        cook_time_minutes=30,                       # NEW
        servings=6,
        difficulty="medium",                         # NEW
        description="Tarte aux pommes caramélisées renversée (test).",  # NEW
        cuisine="french",
        mood=["celebratory", "comfort"],
        main_protein="none",
        seasonality=["autumn"],
    )
    ```

    (`canned_modified_recipe` echoes the input; no edit needed there — it will pick up the new fields naturally from the input dict in a future call.)
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -cE "cook_time_minutes|difficulty|description" app/services/llm.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "cook_time_minutes: Optional\\[int\\] = Field(default=None, ge=0, le=24 \\* 60)" app/services/llm.py` returns `1` (the GeminiExtractedRecipe field).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "difficulty: Optional\\[Literal\\[\"easy\", \"medium\", \"hard\"\\]\\]" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "description: Optional\\[str\\] = Field(default=None, max_length=2000)" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "recipe.cook_time_minutes = extracted.cook_time_minutes" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "recipe.difficulty = extracted.difficulty" app/services/llm.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "recipe.description = extracted.description" app/services/llm.py` returns `1`.
    - Voice prompt extension: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "Extrais aussi cook_time_minutes" app/services/llm.py` returns `2` (once in voice prompt, once in photo prompt).
    - `Literal` is imported: `cd /Users/gulu3001/dev/al-dente/backend && grep -E "^from typing" app/services/llm.py` includes `Literal` (or there is a separate `from typing import Literal` line).
    - Fixtures extended: `cd /Users/gulu3001/dev/al-dente/backend && grep -c "cook_time_minutes=" app/services/llm_fixtures.py` returns at least `2` (canned_voice + canned_photo).
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.services.llm import GeminiExtractedRecipe; e = GeminiExtractedRecipe(title='t', cook_time_minutes=20, difficulty='hard', description='d'); assert e.cook_time_minutes == 20 and e.difficulty == 'hard' and e.description == 'd'"` exits 0.
  </acceptance_criteria>
  <done>
    `GeminiExtractedRecipe` exposes the three new fields. Both extract prompts ask Gemini to return them. `_apply_extracted` writes them to the Recipe row. Canned fixtures include deterministic test values. _MODIFY_PROMPT untouched.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Add Difficulty French labels to enum-labels.ts + RecipeForm.tsx inputs (RID-02 / D-14, D-21 partial)</name>
  <files>frontend/lib/enum-labels.ts, frontend/components/RecipeForm.tsx, frontend/lib/i18n/fr.json</files>
  <read_first>
    - frontend/lib/enum-labels.ts (current useEnumLabels hook — Difficulty must slot alongside cuisine/mood/protein)
    - frontend/components/RecipeForm.tsx (focus on RecipeFormValues at L77, recipeToFormValues at L104, formValuesToBody at L133, render body at L220+, NONE_VALUE sentinel at L32, existing optional-fields block: prep_time/servings/cuisine/main_protein)
    - frontend/lib/i18n/fr.json (current namespaces — add a recipes.form namespace key for the three new field labels + a recipes.difficulty namespace for the three values)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-10 (Difficulty enum), §D-14 (form inputs), §D-21 (chip labels, but adjacent — RID-03 will add the completeness namespace)
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §Target 3 (ref forwarding: shadcn Input/Textarea/Select all accept refs in React 19; SelectTrigger is the focus target for the Select)
  </read_first>
  <action>
    Three coordinated edits adding the new fields to the UI:

    SUB-EDIT 6A — Extend `frontend/lib/i18n/fr.json` with the three new field labels + the three difficulty values. Add (or extend existing namespaces) so the following keys exist:

    Under the existing `recipes.form` namespace (or wherever `cuisine_label` / `mood_label` live — verify via `grep -n "cuisine_label\\|cuisine_any" frontend/lib/i18n/fr.json`), add:
    ```json
    "cook_time_minutes_label": "Temps de cuisson (min)",
    "cook_time_minutes_placeholder": "30",
    "difficulty_label": "Difficulté",
    "difficulty_placeholder": "Pas indiqué",
    "description_label": "Description",
    "description_placeholder": "Une phrase ou deux pour résumer…",
    ```

    Under a NEW `recipes.difficulty` namespace (sibling to existing `recipes.cuisine` enum-label namespace; planner verifies path against existing pattern via `grep -n "recipes.cuisine\\|recipes.protein" frontend/lib/i18n/fr.json`):
    ```json
    "easy": "Facile",
    "medium": "Moyen",
    "hard": "Difficile",
    ```

    Under a `recipes.detail` (or equivalent existing detail-page namespace) add:
    ```json
    "cook_time_label": "Cuisson",
    "difficulty_label": "Difficulté",
    "description_label": "Description",
    ```

    Specifically: the JSON file's exact namespacing depends on the current structure. The executor MUST read `fr.json` and place the new keys under the appropriate existing namespace (don't invent a top-level key if `recipes.form` already exists; nest accordingly). If duplicate keys would occur (e.g., `difficulty_label` already exists at the form level vs the detail level), use distinct keys (e.g., `form.difficulty_label` vs `detail.difficulty_label`). The goal: `useTranslations("recipes.form")("difficulty_label")` returns "Difficulté"; `useTranslations("recipes.difficulty")("easy")` returns "Facile".

    SUB-EDIT 6B — Extend `frontend/lib/enum-labels.ts` to add a `difficulty(value)` translator. The hook currently returns `{ cuisine, mood, protein }` translators (verify exact shape by reading the file). Add a fourth: `difficulty: (value: string | null | undefined): string`. It reads from the `recipes.difficulty` namespace via `useTranslations` and returns the French label, or returns the raw `value` (or empty string) for unknown inputs.

    Concrete implementation (the executor adapts to the file's exact shape):
    ```typescript
    // Inside useEnumLabels():
    const tDifficulty = useTranslations("recipes.difficulty");

    return {
      cuisine: /* existing */,
      mood: /* existing */,
      protein: /* existing */,
      // Phase 24 RID-02 — Difficulty enum label translator. Returns French
      // label for easy/medium/hard; returns the raw value (or empty) for nulls
      // or unknown values (defensive — DB CHECK constraint should already gate
      // this).
      difficulty: (value: string | null | undefined): string => {
        if (!value) return "";
        // Type guard: value comes from the DB or the form; constrained to
        // easy/medium/hard by Pydantic + DB CHECK + locked vocabulary.
        if (value === "easy" || value === "medium" || value === "hard") {
          return tDifficulty(value);
        }
        return value;
      },
    };
    ```

    SUB-EDIT 6C — Extend `frontend/components/RecipeForm.tsx` with three new inputs. Five concrete additions:

    1. **Import the Difficulty enum**: at the top, add `Difficulty` to the existing `import { Cuisine, Mood, Protein, Season } from "@/lib/enums";` line so it becomes `import { Cuisine, Difficulty, Mood, Protein, Season } from "@/lib/enums";`.

    2. **Extend `RecipeFormValues`** at line 77. Add three fields:
    ```typescript
    export type RecipeFormValues = {
      title: string;
      ingredients_text: string;
      steps_text: string;
      prep_time_minutes: string;
      // Phase 24 RID-02 — three optional recipe-identity fields.
      cook_time_minutes: string;
      difficulty: string;  // "" or one of easy/medium/hard
      description: string;
      servings: string;
      cuisine: string;
      mood: string[];
      main_protein: string;
      seasonality: string[];
      tags_text: string;
      photo_paths: string[];
    };
    ```

    3. **Extend `recipeToFormValues`** at line 104. Wherever existing fields like `prep_time_minutes: r.prep_time_minutes != null ? String(r.prep_time_minutes) : ""` appear, add three sibling lines for the new fields:
    ```typescript
      cook_time_minutes: r.cook_time_minutes != null ? String(r.cook_time_minutes) : "",
      difficulty: r.difficulty ?? "",
      description: r.description ?? "",
    ```

    4. **Extend `formValuesToBody`** at line 133. Wherever the existing optional-field unwrap happens (e.g., `prep_time_minutes: v.prep_time_minutes.trim() !== "" ? Number(v.prep_time_minutes) : undefined`), add three sibling lines:
    ```typescript
      cook_time_minutes:
        v.cook_time_minutes.trim() !== "" ? Number(v.cook_time_minutes) : undefined,
      difficulty:
        v.difficulty === "" || v.difficulty === NONE_VALUE ? undefined : v.difficulty,
      description:
        v.description.trim() !== "" ? v.description.trim() : undefined,
    ```

    5. **Render three new inputs in the form body** (around the existing prep_time/servings/cuisine/main_protein optional-fields block — read the file to find that block; the new inputs slot adjacent). The shapes:

    Cook time (Input number, mirrors prep_time_minutes):
    ```tsx
    <div className="flex flex-col gap-2">
      <Label htmlFor="cook_time_minutes">{tForm("cook_time_minutes_label")}</Label>
      <Input
        id="cook_time_minutes"
        type="number"
        inputMode="numeric"
        min={0}
        max={1440}
        placeholder={tForm("cook_time_minutes_placeholder")}
        value={v.cook_time_minutes}
        onChange={(e) => setV({ ...v, cook_time_minutes: e.target.value })}
      />
    </div>
    ```

    Difficulty (Select with NONE_VALUE sentinel, mirrors cuisine/main_protein):
    ```tsx
    <div className="flex flex-col gap-2">
      <Label htmlFor="difficulty">{tForm("difficulty_label")}</Label>
      <Select
        value={v.difficulty || NONE_VALUE}
        onValueChange={(val) =>
          setV({ ...v, difficulty: val === NONE_VALUE ? "" : val })
        }
      >
        <SelectTrigger id="difficulty">
          <SelectValue placeholder={tForm("difficulty_placeholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>{tForm("difficulty_placeholder")}</SelectItem>
          <SelectItem value={Difficulty.easy}>{enumLabels.difficulty(Difficulty.easy)}</SelectItem>
          <SelectItem value={Difficulty.medium}>{enumLabels.difficulty(Difficulty.medium)}</SelectItem>
          <SelectItem value={Difficulty.hard}>{enumLabels.difficulty(Difficulty.hard)}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    ```

    Description (Textarea, mirrors steps_text):
    ```tsx
    <div className="flex flex-col gap-2">
      <Label htmlFor="description">{tForm("description_label")}</Label>
      <Textarea
        id="description"
        placeholder={tForm("description_placeholder")}
        value={v.description}
        onChange={(e) => setV({ ...v, description: e.target.value })}
        maxLength={2000}
        rows={3}
      />
    </div>
    ```

    Specifically:
    - `tForm` is the `useTranslations("recipes.form")` instance — verify the existing hook usage in the file and use the same instance (it likely already exists for the existing labels).
    - `enumLabels` is the `useEnumLabels()` return — verify if RecipeForm already calls it; if not, add `const enumLabels = useEnumLabels();` at the top of the function.
    - The three new blocks sit next to the existing prep_time/servings/cuisine/main_protein block (the executor places them where it reads naturally — typically cook_time next to prep_time, difficulty between cuisine and main_protein, description as its own block above ingredients or near the title).
    - All three inputs are OPTIONAL — no `required` attribute, no validation errors on blank.
    - Do NOT modify the title input, ingredients_text textarea, steps_text textarea, photo uploader, cuisine select, mood checkboxes, main_protein select, seasonality checkboxes, or tags input.
    - Do NOT modify the submit button or the sticky bottom CTA.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -cE "cook_time_minutes|^\\s+difficulty|description:" components/RecipeForm.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import.*Difficulty.*from \"@/lib/enums\"" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "cook_time_minutes: string" components/RecipeForm.tsx` returns `1` (RecipeFormValues field).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "difficulty: string" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "description: string" components/RecipeForm.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "v.cook_time_minutes.trim() !== \"\" ? Number(v.cook_time_minutes) : undefined" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "v.difficulty === \"\" || v.difficulty === NONE_VALUE ? undefined : v.difficulty" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "v.description.trim() !== \"\" ? v.description.trim() : undefined" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "id=\"cook_time_minutes\"" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "id=\"difficulty\"" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "id=\"description\"" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "type=\"number\"" components/RecipeForm.tsx` returns at least `2` (prep_time + cook_time).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "value={Difficulty.easy}\\|value={Difficulty.medium}\\|value={Difficulty.hard}" components/RecipeForm.tsx` returns at least `3`.
    - enum-labels has a difficulty translator: `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "difficulty:" lib/enum-labels.ts` returns at least `1`.
    - fr.json has the labels: `grep -cE "cook_time_minutes_label|difficulty_label|description_label" /Users/gulu3001/dev/al-dente/frontend/lib/i18n/fr.json` returns at least `3`.
    - fr.json has the difficulty value labels: `grep -cE "\"easy\": \"Facile\"|\"medium\": \"Moyen\"|\"hard\": \"Difficile\"" /Users/gulu3001/dev/al-dente/frontend/lib/i18n/fr.json` returns `3`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint components/RecipeForm.tsx lib/enum-labels.ts` exits 0.
  </acceptance_criteria>
  <done>
    `RecipeForm.tsx` renders three new inputs (number for cook_time_minutes, NONE_VALUE-sentinel Select for difficulty, Textarea for description) with French labels via `useTranslations`. `useEnumLabels().difficulty(value)` returns "Facile" / "Moyen" / "Difficile". `RecipeFormValues` / `recipeToFormValues` / `formValuesToBody` are all extended. fr.json contains all 6 new keys (3 form labels + 3 difficulty values).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 7: Render Cuisson / Difficulté / Description on /recipes/[id] page when non-null (RID-02 / D-15)</name>
  <files>frontend/app/recipes/[id]/page.tsx</files>
  <read_first>
    - frontend/app/recipes/[id]/page.tsx (full file — focus on the metadata block where prep_time / servings / cuisine are already rendered)
    - frontend/lib/enum-labels.ts (difficulty translator from Task 6)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-15
  </read_first>
  <action>
    Three render additions in `frontend/app/recipes/[id]/page.tsx`:

    SUB-EDIT 7A — In the metadata block (find via `grep -n "prep_time_minutes\\|servings" frontend/app/recipes/[id]/page.tsx`), add a Cuisson (cook time) line adjacent to the existing prep_time line. The shape mirrors the existing prep_time rendering — if prep_time is rendered as `<span>{t("prep_time_label")}: {recipe.prep_time_minutes} min</span>` inside a metadata pill row, add the same shape for cook_time:

    ```tsx
    {recipe.cook_time_minutes != null && (
      <span>
        {t("cook_time_label")}: {recipe.cook_time_minutes} min
      </span>
    )}
    ```

    (The exact shape depends on the existing pattern. The executor reads the current metadata block and matches its style — Badge pills, spans, divs, separator dots, whatever the existing convention is. The new line ONLY renders when `cook_time_minutes != null`.)

    SUB-EDIT 7B — In the same metadata block, add a Difficulté line. Use the `useEnumLabels()` hook to translate the value (verify if the page already calls `useEnumLabels()` — if so, reuse; if not, add `const enumLabels = useEnumLabels();` near the top of the component):

    ```tsx
    {recipe.difficulty && (
      <span>
        {t("difficulty_label")}: {enumLabels.difficulty(recipe.difficulty)}
      </span>
    )}
    ```

    SUB-EDIT 7C — Render Description as a PARAGRAPH above the ingredients block (NOT a metadata pill — per D-15). Find the ingredients block (likely `recipe.ingredients?.map(...)` or similar) and insert the description block IMMEDIATELY BEFORE it:

    ```tsx
    {recipe.description && (
      <section className="mb-4">
        <h2 className="text-title sr-only">{t("description_label")}</h2>
        <p className="text-base text-foreground-muted whitespace-pre-line">
          {recipe.description}
        </p>
      </section>
    )}
    ```

    Specifically:
    - `whitespace-pre-line` preserves line breaks the user typed in the textarea.
    - `text-foreground-muted` keeps the description visually quieter than the ingredients/steps headers.
    - The heading is `sr-only` because the description's role is "intro paragraph" rather than a labeled section — screen readers still announce "Description" before the content, but sighted users see only the text.
    - All three new render blocks are conditional on the field being non-null/non-empty.
    - Do NOT modify any other part of the page (the title, the photo carousel, the ingredients list, the steps list, the cooking-log shortcut, the vote-state pills, etc.).
    - The `t("cook_time_label")` / `t("difficulty_label")` / `t("description_label")` strings come from the namespace established in Task 6 — verify the namespace matches whatever the existing `t()` instance on this page uses (likely `useTranslations("recipes.detail")` or similar; add the keys to that namespace in fr.json if Task 6's namespacing didn't already cover it).
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -cE "cook_time_minutes|recipe.difficulty|recipe.description" app/recipes/\[id\]/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "recipe.cook_time_minutes" app/recipes/\\[id\\]/page.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "recipe.difficulty" app/recipes/\\[id\\]/page.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "recipe.description" app/recipes/\\[id\\]/page.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "enumLabels.difficulty" app/recipes/\\[id\\]/page.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "whitespace-pre-line" app/recipes/\\[id\\]/page.tsx` returns at least `1` (description paragraph preserves line breaks).
    - Conditional rendering: `cd /Users/gulu3001/dev/al-dente/frontend && grep -cE "recipe.cook_time_minutes != null|recipe.cook_time_minutes &&" app/recipes/\\[id\\]/page.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint app/recipes/\\[id\\]/page.tsx` exits 0.
  </acceptance_criteria>
  <done>
    The recipe detail page renders Cuisson and Difficulté in the metadata block (only when non-null), and Description as a paragraph above the ingredients block (only when non-empty). All three blocks use French labels via `useTranslations`.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 8: Extend seed script with deterministic cook_time/difficulty/description values (RID-02 / D-42)</name>
  <files>backend/app/cli/seed.py</files>
  <read_first>
    - backend/app/cli/seed.py (current state — find the recipe dicts; they're at L183+ per earlier grep)
    - backend/app/models/enums.py (Difficulty enum from Task 3 — import path)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-42
  </read_first>
  <action>
    Two sub-edits in `backend/app/cli/seed.py`:

    SUB-EDIT 8A — Add `Difficulty` to the existing enum import block. Find the line that imports `Cuisine`, `Mood`, `Protein` from `app.models.enums` (search via `grep -n "from app.models.enums" backend/app/cli/seed.py`). Add `Difficulty` to the import list. Example before/after:

    Before:
    ```python
    from app.models.enums import Cuisine, Mood, Protein, Season
    ```

    After:
    ```python
    from app.models.enums import Cuisine, Difficulty, Mood, Protein, Season
    ```

    (Preserve alphabetical-ish ordering.)

    SUB-EDIT 8B — Add `cook_time_minutes`, `difficulty`, and `description` keys to AT LEAST ONE of the seeded recipe dicts at line 183+. The seeded recipes are a list of dicts like `{"slug": "poulet-citron", "title": "Poulet au citron", "cuisine": Cuisine.italian.value, "mood": [...], ...}` (per earlier grep). Pick the FIRST recipe dict and add the three new keys:

    ```python
    {
        "slug": "poulet-citron",
        "title": "Poulet au citron",
        "cuisine": Cuisine.italian.value,
        "mood": [Mood.comfort.value],
        # ... existing keys preserved ...
        # Phase 24 RID-02 — seed deterministic values for new fields so
        # Playwright fixtures can assert on them.
        "cook_time_minutes": 35,
        "difficulty": Difficulty.medium.value,
        "description": "Poulet rôti aux citrons confits — un classique méditerranéen (seed).",
    },
    ```

    Additionally, add the same three keys to AT LEAST TWO MORE recipe dicts so CompletenessCard testing (RID-03) has a representative spread. The executor picks any two additional recipes from the existing list (e.g., `coq-au-vin`, `tarte-tatin`) and adds the three keys with deterministic values. Use a mix of difficulty levels (`Difficulty.easy.value` / `Difficulty.medium.value` / `Difficulty.hard.value`) across the three seeded rows so RID-03's CompletenessCard tests can see all three.

    Specifically:
    - At least 3 of the seeded recipes get all three new fields populated.
    - The REMAINING seeded recipes get NULL (i.e., the keys are simply not present in their dicts) — this gives RID-03 a realistic "some recipes are complete, some need nudging" dataset.
    - Use `.value` accessors on the enum (e.g., `Difficulty.medium.value`, NOT `Difficulty.medium`) — matches the existing `Cuisine.italian.value` pattern in the file (the dict is passed as kwargs to `Recipe(**dict)` and SQLAlchemy ARRAY(Text) / Text columns want plain strings).
    - Do NOT modify the seed's idempotency logic (uuid5 + merge), the household creation block, the vote creation block, the cooking-log creation block, or any other structural element.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/backend && grep -c "Difficulty" app/cli/seed.py</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "from app.models.enums import.*Difficulty" app/cli/seed.py` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "Difficulty.easy.value\\|Difficulty.medium.value\\|Difficulty.hard.value" app/cli/seed.py` returns at least `3`.
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "\"cook_time_minutes\":" app/cli/seed.py` returns at least `3` (three recipes seeded with cook time).
    - `cd /Users/gulu3001/dev/al-dente/backend && grep -c "\"description\":" app/cli/seed.py` returns at least `3`.
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run seed` exits 0 (operator can run; if local Postgres unavailable, this assertion downgrades to manual review).
    - `cd /Users/gulu3001/dev/al-dente/backend && uv run python -c "from app.models.enums import Difficulty; print(Difficulty.medium.value)"` outputs `medium`.
  </acceptance_criteria>
  <done>
    `seed.py` imports `Difficulty` and seeds at least three recipes with deterministic values for `cook_time_minutes`, `difficulty`, `description` — covering all three difficulty levels. The remaining recipes retain NULL for the new fields (organic test surface for RID-03's CompletenessCard). `uv run seed` runs cleanly.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client form → `POST /recipes` / `PUT /recipes/{id}` | Pydantic validates `cook_time_minutes` (int 0-1440), `difficulty` (Literal "easy"/"medium"/"hard"), `description` (str max_length=2000) at parse time. |
| Backend → Postgres | DB-level CHECK constraint (`recipes_difficulty_check`) enforces difficulty value space as a second layer of defense in depth. |
| Gemini → backend | Gemini returns structured `GeminiExtractedRecipe`; the schema constrains `difficulty` to Literal["easy","medium","hard"]; invalid values cause Pydantic validation to raise inside `_apply_extracted`, which the BackgroundTask's outer try/except catches → `_record_failure`. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-24-02-01 | Tampering | difficulty column write | mitigate | TWO-LAYER ENFORCEMENT: (1) Pydantic `Literal["easy","medium","hard"]` in RecipeFullCreate / RecipeUpdate / GeminiExtractedRecipe rejects unknown values at parse time; (2) DB CHECK constraint `recipes_difficulty_check` rejects unknown values at INSERT/UPDATE time even if the Pydantic layer is bypassed (raw SQL, migration mistake, ORM detach). Both layers are required by the locked-vocabulary discipline. |
| T-24-02-02 | Tampering | description column write | mitigate | Pydantic `max_length=2000` caps input size. No DB length cap (Postgres TEXT is unbounded); the Pydantic gate is the only enforcement point. Acceptable risk per D-11 (no DB length cap is documented as intentional). |
| T-24-02-03 | Tampering | cook_time_minutes column write | mitigate | Pydantic `ge=0, le=24*60` caps the range. No DB-level numeric constraint (mirrors existing `prep_time_minutes` shape). Acceptable risk; an attacker bypassing Pydantic could store a negative number, but it has no security implication (only affects display). |
| T-24-02-04 | Information Disclosure | RecipeResponse exposing description | accept | Description is user-controlled content that they intend to display on their own household's detail page. No PII exposure path is introduced — same trust boundary as `recipes.title` and `recipes.steps`. |
| T-24-02-05 | Tampering (Prompt Injection) | Gemini extract prompt extension | accept | The catchy-title-style instruction lives in `_EXTRACT_PROMPT_VOICE` / `_EXTRACT_PROMPT_PHOTOS`; the response is constrained by `response_schema=GeminiExtractedRecipe`, so injected content cannot reshape the data model. `difficulty` is further constrained to the Literal value space. Output flows through `_apply_extracted` which writes to typed columns; no HTML interpretation. Risk: LOW (schema-constrained); blast radius limited to description-field content (max 2000 chars, rendered as text not HTML). |

**Summary:** RID-02 introduces three new content columns. Defense-in-depth (Pydantic + DB CHECK) protects the locked vocabulary (difficulty). Numeric/string size caps are at the Pydantic layer only — documented and acceptable. No high-severity threats; two `mitigate` dispositions for the validation boundaries.
</threat_model>

<verification>
## Phase 24 / RID-02 Verification — grep gates + manual UI smoke + seed-script fixture update

Per D-40 / D-41 / D-42.

### Grep gates (must all pass after Task 1-8 complete)

```bash
# 1. Alembic migration 0007 exists and declares revision/down_revision correctly
test -f backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py
grep -c "revision: str = \"0007\"" backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py    # Expected: 1
grep -c "down_revision.*= \"0006\"" backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py   # Expected: 1
grep -c "recipes_difficulty_check" backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py   # Expected: 2 (create + drop)

# 2. Recipe model has the 3 new columns + CHECK
grep -cE "cook_time_minutes|^\s+difficulty:|^\s+description:" backend/app/models/recipe.py   # Expected: at least 3
grep -c "recipes_difficulty_check" backend/app/models/recipe.py                              # Expected: 1

# 3. Difficulty enum on BOTH sides
grep -c "class Difficulty(str, Enum)" backend/app/models/enums.py                            # Expected: 1
grep -c "export const Difficulty" frontend/lib/enums.ts                                       # Expected: 1
diff <(grep -oE "easy|medium|hard" backend/app/models/enums.py | sort -u) \
     <(grep -oE "easy|medium|hard" frontend/lib/enums.ts | sort -u)                          # Expected: no diff (both files have all three values)

# 4. Pydantic schemas extended
grep -c "DifficultyLiteral" backend/app/schemas/recipe.py                                     # Expected: at least 3 (defn + 2 usages)
grep -c "cook_time_minutes" backend/app/schemas/recipe.py                                     # Expected: at least 3 (Create/Update/Response)

# 5. Gemini schema + prompts + _apply_extracted extended
grep -c "cook_time_minutes\|difficulty\|description" backend/app/services/llm.py             # Expected: many
grep -c "Extrais aussi cook_time_minutes" backend/app/services/llm.py                        # Expected: 2 (voice + photo prompts)
grep -c "recipe.cook_time_minutes = extracted.cook_time_minutes" backend/app/services/llm.py # Expected: 1
grep -c "recipe.difficulty = extracted.difficulty" backend/app/services/llm.py               # Expected: 1
grep -c "recipe.description = extracted.description" backend/app/services/llm.py             # Expected: 1

# 6. Frontend form has new inputs + i18n + enum-labels
grep -c "id=\"cook_time_minutes\"\|id=\"difficulty\"\|id=\"description\"" frontend/components/RecipeForm.tsx   # Expected: 3
grep -cE "easy: \"Facile\"|medium: \"Moyen\"|hard: \"Difficile\"" frontend/lib/i18n/fr.json  # Expected: 3
grep -c "difficulty:" frontend/lib/enum-labels.ts                                             # Expected: at least 1

# 7. Detail page renders new fields
grep -c "recipe.cook_time_minutes\|recipe.difficulty\|recipe.description" frontend/app/recipes/\[id\]/page.tsx   # Expected: at least 3

# 8. Seed script populates new fields
grep -c "Difficulty" backend/app/cli/seed.py                                                  # Expected: at least 4 (1 import + 3 usages)
```

### Build / migrate / lint gates

```bash
cd backend && uv run alembic upgrade head    # Expected: applies 0007 cleanly; `alembic current` shows 0007 (head)
cd backend && uv run python -c "from app.models.recipe import Recipe; from app.schemas.recipe import RecipeFullCreate; print('OK')"   # Expected: no ImportError
cd backend && uv run seed                     # Expected: exits 0 (idempotent)
cd frontend && npx tsc --noEmit -p tsconfig.json   # Expected: exit 0
cd frontend && npx eslint components/RecipeForm.tsx lib/enums.ts lib/enum-labels.ts app/recipes/\[id\]/page.tsx   # Expected: exit 0
cd frontend && npx next build --webpack       # Expected: clean build
```

### Manual UI smoke (D-41 — operator runs against seeded fixture after `uv run seed`)

1. **Full-form capture** (`/recipes/new` → Complète tab): The form shows three new inputs (Temps de cuisson, Difficulté, Description). Entering values, saving, and revisiting the edit page round-trips them.
2. **Edit existing recipe** (`/recipes/{seeded_id}/edit`): The seeded values from Task 8 (e.g., `cook_time_minutes=35`, `difficulty=medium`, description) appear in the form pre-filled.
3. **Detail page metadata** (`/recipes/{seeded_id}`): Shows "Cuisson: 35 min" and "Difficulté: Moyen" in the metadata block. Description appears as a paragraph above the ingredients.
4. **Detail page metadata when fields are NULL** (`/recipes/{other_seeded_id}` where the seed did NOT populate the three fields): NO "Cuisson:" line, NO "Difficulté:" line, NO description paragraph — empty fields are not rendered as placeholders (D-15).
5. **Validation error path**: Submit a full-form with `difficulty="extreme"` (e.g., via DevTools fetch override) → backend returns 422 with Pydantic literal error.

### Playwright fixture updates

- Task 5 added canned values for the 3 new fields to `canned_voice_recipe` and `canned_photo_recipe` in `llm_fixtures.py`. Verify with `grep -c "cook_time_minutes=" backend/app/services/llm_fixtures.py` returning at least 2.
- Task 8 seeded 3 recipes with the new fields. Existing Playwright specs that assert on recipe response shapes should continue to pass (RecipeResponse adds nullable fields = backward-compatible per RESEARCH.md §"Open Question 3").
- No NEW Playwright specs are added per D-42 (workflow.verifier: false; plan_checker_enabled: false).
</verification>

<success_criteria>
The plan is complete when:

1. All grep gates from §Verification pass (migration 0007 / Recipe model / Difficulty enum drift-free / Pydantic schemas / Gemini extract / RecipeForm / detail page / seed script).
2. `cd backend && uv run alembic upgrade head` applies cleanly; `alembic current` reports `0007 (head)`.
3. `cd backend && uv run seed` exits 0 against the upgraded schema; seeded recipes have the new fields populated per Task 8.
4. `cd frontend && npx tsc --noEmit && npx eslint <touched files> && npx next build --webpack` exits 0 cleanly.
5. Manual UI smoke (5 steps) passes on the seeded fixture.
6. RID-02 success criterion 1 from ROADMAP ("Three new optional fields, locked-vocabulary mirroring, extract-prompt extension, form/detail wiring") is satisfied end-to-end.
7. All tasks merged in ONE atomic commit. Suggested commit message: `feat(24-02): recipe data model — add cook_time/difficulty/description + Difficulty enum on both sides (RID-02, gh#22 Part A)`.
</success_criteria>

<output>
After completion, create `.planning/phases/24-recipe-identity/24-02-data-model-SUMMARY.md` documenting:

- RID-02 closed; gh#22 Part A done (gh#22 stays open until RID-03 ships).
- Files created: 1 (Alembic migration 0007).
- Files modified: 10 (recipe.py model, enums.py both sides, recipe.py schema, llm.py + llm_fixtures.py, seed.py, enums.ts + enum-labels.ts, RecipeForm.tsx, recipes/[id]/page.tsx, fr.json).
- Locked vocabulary: Difficulty enum mirrored byte-for-byte on backend (Python) and frontend (TS); drift gate established for future maintainers.
- Backfill posture: existing rows get NULL for all three columns — intentional nudge for RID-03's CompletenessCard.
- Gemini extract: voice + photo prompts ask for the 3 new fields in the same call (no extra round-trip; D-13 / D-27 prompt-extension model).
- Provides for downstream plans:
  - RID-03: the 11-field completeness score derives from the now-extended Recipe model. `useEnumLabels().difficulty()` translator is ready for the CompletenessCard chip rendering (though RID-03 will add its own `completeness.*` namespace).
  - RID-04: GeminiExtractedRecipe is the schema the new `promote_quick_draft` / `promote_full_draft` BackgroundTasks operate on; no further model change needed there.
  - RID-05: `RecipeResponse` already exposes a nullable string for any future column; RID-05 will add `illustration_svg` adjacent to the three new fields.
- Verification: grep gates + manual UI smoke + canned-fixture extension. Playwright suite remains green by additive nullability.
</output>
