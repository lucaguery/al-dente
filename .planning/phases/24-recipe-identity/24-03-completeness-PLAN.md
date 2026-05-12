---
phase: 24
plan: 03
type: execute
wave: 2
depends_on: [24-02]
files_modified:
  - frontend/lib/recipe-completeness.ts
  - frontend/lib/recipe-completeness.test.ts
  - frontend/components/CompletenessCard.tsx
  - frontend/components/RecipeForm.tsx
  - frontend/app/recipes/[id]/page.tsx
  - frontend/app/recipes/[id]/edit/page.tsx
  - frontend/lib/i18n/fr.json
autonomous: true
requirements: [RID-03]
requirements_addressed: [RID-03]
tags: [frontend, ui, completeness, next-intl, nextjs-app-router, useSearchParams, suspense]

must_haves:
  truths:
    - "computeCompleteness(recipe) returns { percent: number; missingFields: FieldKey[] } scoring the canonical 11 fields with strict non-empty rules per D-18"
    - "computeCompleteness() is pure (no React, no side effects, no network) and unit-testable in isolation"
    - "CompletenessCard renders above the body on /recipes/[id] when percent < 100; renders nothing (returns null) at 100%"
    - "Each missing-field chip is a <Badge variant=\"outline\" asChild><Link href=\"/recipes/[id]/edit?focus=<fieldKey>\">label</Link></Badge>; the FieldKey union is validated against the URL param"
    - "The edit page consumes ?focus= via useSearchParams() (wrapped in <Suspense> per Next.js 16) and scrolls + focuses the matching input via a ref map keyed by FieldKey"
    - "After firing focus, router.replace(pathname) strips the ?focus= param so a re-mount doesn't re-fire"
    - "Unknown ?focus= values are silently no-op (D-22) — never rendered into the DOM"
    - "fr.json has a completeness.* namespace with French chip labels for 10 missing-field chips (title excluded since it is NOT NULL)"
  artifacts:
    - path: "frontend/lib/recipe-completeness.ts"
      provides: "computeCompleteness(recipe) pure function + FieldKey discriminated union"
      contains: "export function computeCompleteness"
    - path: "frontend/lib/recipe-completeness.test.ts"
      provides: "Vitest/Playwright unit tests covering 11 fields + strict non-empty rules"
      contains: "computeCompleteness"
    - path: "frontend/components/CompletenessCard.tsx"
      provides: "Above-body card with header / progressbar / chip-links; returns null at 100%"
      contains: "role=\"progressbar\""
    - path: "frontend/components/RecipeForm.tsx"
      provides: "Optional focusRefs prop wiring refs to each input/textarea/select keyed by FieldKey"
      contains: "focusRefs?"
    - path: "frontend/app/recipes/[id]/page.tsx"
      provides: "Mounts <CompletenessCard recipe={recipe} /> above the body content"
      contains: "<CompletenessCard"
    - path: "frontend/app/recipes/[id]/edit/page.tsx"
      provides: "Inner component reading ?focus= via useSearchParams; <Suspense> wrapper at the page export; ref map passed to RecipeForm"
      contains: "<Suspense"
    - path: "frontend/lib/i18n/fr.json"
      provides: "completeness.* namespace with chip labels + the card's header phrase"
      contains: "\"completeness\""
  key_links:
    - from: "frontend/components/CompletenessCard.tsx"
      to: "frontend/lib/recipe-completeness.ts"
      via: "import computeCompleteness + FieldKey from \"@/lib/recipe-completeness\""
      pattern: "from \"@/lib/recipe-completeness\""
    - from: "frontend/components/CompletenessCard.tsx"
      to: "/recipes/{id}/edit?focus={fieldKey}"
      via: "<Link href={`/recipes/${recipeId}/edit?focus=${field}`}>"
      pattern: "\\?focus=\\$\\{"
    - from: "frontend/app/recipes/[id]/edit/page.tsx"
      to: "frontend/components/RecipeForm.tsx focusRefs prop"
      via: "useSearchParams().get(\"focus\") consumed, ref map constructed, passed as focusRefs prop"
      pattern: "useSearchParams\\(\\)"
    - from: "frontend/app/recipes/[id]/edit/page.tsx"
      to: "<Suspense fallback={null}>"
      via: "Inner component wrapping is required for useSearchParams() in Next.js 16 production builds"
      pattern: "<Suspense fallback={null}>"
---

<objective>
Phase 24 / RID-03 — CompletenessCard. Compute a recipe-completeness score (11 fields, equal weight, strict non-empty rules) on the client, render an above-body nudge card on `/recipes/[id]` when `percent < 100`, and wire chip-links so tapping a missing-field chip navigates to the edit page and scrolls/focuses the matching input via `?focus=<fieldKey>`.

Purpose: Give the user a glanceable, dismissable-via-completion nudge to fill out the rest of a recipe. Closes gh#22 Part B.

Output: 1 new pure helper (`recipe-completeness.ts`), 1 unit-test file, 1 new component (`CompletenessCard.tsx`), 4 modified files (RecipeForm refs + edit-page Suspense/?focus= consumption + detail-page card mount + fr.json namespace).
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
@frontend/app/onboarding/share-code/page.tsx
@frontend/components/RecipeForm.tsx
@frontend/app/recipes/[id]/page.tsx
@frontend/app/recipes/[id]/edit/page.tsx
@frontend/components/ui/badge.tsx
@frontend/lib/i18n/fr.json
@frontend/lib/recipes.ts
</context>

<interfaces>
<!-- Key types and primitives the executor needs. Extracted from codebase. No exploration required. -->

The 11 fields scored (D-17):
1. `title` — always present (NOT NULL on the model)
2. `description` — RID-02 new field
3. `ingredients` — non-empty array
4. `steps` — non-empty array
5. `prep_time_minutes`
6. `cook_time_minutes` — RID-02 new field
7. `servings`
8. `difficulty` — RID-02 new field
9. `cuisine`
10. `mood` — non-empty array
11. `main_protein`

Excluded (D-17): `tags`, `seasonality`, `photo_paths`, `source_capture`.

Strict non-empty rule (D-18):
- Strings (`title`, `description`, `difficulty`, `cuisine`, `main_protein`): not null AND `.trim() !== ""`.
- Numbers (`prep_time_minutes`, `cook_time_minutes`, `servings`): not null (zero is technically valid; do not exclude 0).
- Arrays (`ingredients`, `steps`, `mood`): `.length > 0`.

FieldKey discriminated union (D-19):
```typescript
export type FieldKey =
  | "title"
  | "description"
  | "ingredients"
  | "steps"
  | "prep_time_minutes"
  | "cook_time_minutes"
  | "servings"
  | "difficulty"
  | "cuisine"
  | "mood"
  | "main_protein";
```

Function signature (D-19):
```typescript
export function computeCompleteness(recipe: Pick<Recipe, ...the 11 fields>): {
  percent: number;       // rounded to nearest integer (so 5/11 → 45)
  missingFields: FieldKey[];
};
```

The Suspense-wrap pattern (RESEARCH.md §Pattern 4 + project precedent at `frontend/app/onboarding/share-code/page.tsx`):
```tsx
export default function RecipeEditPage() {
  return (
    <Suspense fallback={null}>
      <RecipeEditInner />
    </Suspense>
  );
}

function RecipeEditInner() {
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  // ... ref-based scroll/focus ...
}
```

The Badge asChild + Link chip pattern (RESEARCH.md §Target 7):
```tsx
<Badge variant="outline" asChild>
  <Link href={`/recipes/${recipeId}/edit?focus=${field}`}>
    {tCompleteness(field)}
  </Link>
</Badge>
```

Card surface (D-20) — `paper-grain shadow-card` div matching `EmptyState`'s shell (`frontend/components/EmptyState.tsx:23`):
```tsx
<div className="paper-grain shadow-card flex flex-col gap-3 rounded-lg bg-card border border-border px-5 py-4">
  <h2 className="text-title">À compléter — {missingCount}/11</h2>
  <div
    role="progressbar"
    aria-valuenow={percent}
    aria-valuemin={0}
    aria-valuemax={100}
    className="h-2 bg-surface-muted rounded-full overflow-hidden"
  >
    <div className="h-full bg-[var(--color-valide-foreground)]" style={{ width: `${percent}%` }} />
  </div>
  <div className="flex flex-wrap gap-2">
    {missingFields.map((field) => (
      <Badge key={field} variant="outline" asChild>
        <Link href={`/recipes/${recipeId}/edit?focus=${field}`}>
          {tCompleteness(field)}
        </Link>
      </Badge>
    ))}
  </div>
</div>
```

**Wave 2 ordering note:** This plan is Wave 2 and depends on 24-02 (the three new recipe fields must exist before they can be scored). It does NOT touch `services/llm.py` — that's RID-04's territory. The Recipe TypeScript type (in `frontend/lib/recipes.ts`) should already have `cook_time_minutes`, `difficulty`, `description` from 24-02's frontend updates; if not, this plan adds them as part of its own type updates.
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create computeCompleteness() pure function + FieldKey union (RID-03 / D-17, D-18, D-19)</name>
  <files>frontend/lib/recipe-completeness.ts, frontend/lib/recipe-completeness.test.ts</files>
  <read_first>
    - frontend/lib/recipes.ts (the Recipe TypeScript type — verify cook_time_minutes / difficulty / description are present from 24-02; if not, extend the type as part of this task)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-17 (the 11 fields), §D-18 (strict non-empty rule), §D-19 (function signature)
    - frontend/tests/e2e/ (verify how tests are run; if vitest is the unit-test runner, use that; if Playwright is the only test surface, plan a node-runnable test instead)
  </read_first>
  <behavior>
    Tests for `computeCompleteness()` MUST cover:
    - Empty recipe (only title set) → `{ percent: round(1/11*100) = 9, missingFields: [10 fields excluding title] }`.
    - Fully complete recipe → `{ percent: 100, missingFields: [] }`.
    - String fields: whitespace-only strings count as MISSING (`"   "` → `.trim() === ""` → missing).
    - Number fields: zero is VALID (`prep_time_minutes: 0` → present); null/undefined is MISSING.
    - Array fields: empty array `[]` is MISSING; non-empty `[item]` is PRESENT.
    - Percent rounds to nearest integer: 5/11 → 45 (not 45.45), 6/11 → 55 (not 54.5454).
    - Order preservation: missingFields array preserves the canonical D-17 order (title first if missing, then description, ingredients, steps, prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine, mood, main_protein).
    - Type safety: FieldKey is a discriminated union — `missingFields: FieldKey[]` enforces only the 11 strings.
  </behavior>
  <action>
    Create TWO new files.

    **FILE 1**: `frontend/lib/recipe-completeness.ts` — pure helper module (no React, no DOM, no hooks):

    ```typescript
    // RID-03 — Recipe completeness scoring.
    //
    // Pure function: takes a Recipe-shaped object, returns { percent, missingFields }.
    // No React, no DOM, no network — fully unit-testable in isolation. The detail
    // page mounts a CompletenessCard that consumes the result; the edit page
    // consumes ?focus=<fieldKey> where fieldKey is one of the FieldKey strings
    // returned in missingFields.
    //
    // The 11 fields are scored with equal weight (1/11 ≈ 9.09% each) per
    // CONTEXT.md D-17. Tags, seasonality, photo_paths, and source_capture are
    // intentionally excluded — they're system fields, defaulted fields, or not
    // part of the "recipe identity" scope. Title is in the list for completeness
    // but is NOT NULL on the model — it will never appear in missingFields in
    // practice.

    import type { Recipe } from "@/lib/recipes";

    export type FieldKey =
      | "title"
      | "description"
      | "ingredients"
      | "steps"
      | "prep_time_minutes"
      | "cook_time_minutes"
      | "servings"
      | "difficulty"
      | "cuisine"
      | "mood"
      | "main_protein";

    // Canonical evaluation order. The order is preserved in the returned
    // missingFields array so the CompletenessCard's chip layout is stable
    // across renders. (Map iteration over an object's keys would also be
    // stable in modern JS engines, but an explicit array makes the contract
    // load-bearing.)
    const FIELD_KEYS: readonly FieldKey[] = [
      "title",
      "description",
      "ingredients",
      "steps",
      "prep_time_minutes",
      "cook_time_minutes",
      "servings",
      "difficulty",
      "cuisine",
      "mood",
      "main_protein",
    ] as const;

    // Type guard for runtime validation of ?focus= URL params (RID-03 / D-22).
    // Unknown values are silently no-op'd at the edit page — never rendered
    // into the DOM and never throw.
    export function isFieldKey(value: unknown): value is FieldKey {
      return typeof value === "string" && (FIELD_KEYS as readonly string[]).includes(value);
    }

    // Strict non-empty rule per D-18:
    //   - strings: not null/undefined AND .trim() !== ""
    //   - numbers: not null/undefined (zero is valid — a 0-minute prep time is
    //     a valid user input, not an unfilled field)
    //   - arrays: .length > 0
    function isFieldFilled(recipe: Partial<Recipe>, key: FieldKey): boolean {
      switch (key) {
        // String fields
        case "title":
        case "description":
        case "difficulty":
        case "cuisine":
        case "main_protein": {
          const value = recipe[key];
          return typeof value === "string" && value.trim() !== "";
        }
        // Number fields (null/undefined → missing; zero → present)
        case "prep_time_minutes":
        case "cook_time_minutes":
        case "servings": {
          const value = recipe[key];
          return typeof value === "number" && !Number.isNaN(value);
        }
        // Array fields (empty → missing; non-empty → present)
        case "ingredients":
        case "steps":
        case "mood": {
          const value = recipe[key];
          return Array.isArray(value) && value.length > 0;
        }
      }
    }

    export interface CompletenessResult {
      percent: number;
      missingFields: FieldKey[];
    }

    export function computeCompleteness(
      recipe: Partial<Recipe>,
    ): CompletenessResult {
      const missing: FieldKey[] = [];
      for (const key of FIELD_KEYS) {
        if (!isFieldFilled(recipe, key)) {
          missing.push(key);
        }
      }
      const filled = FIELD_KEYS.length - missing.length;
      // Round to nearest integer (D-19): 5/11 → 45, 6/11 → 55.
      const percent = Math.round((filled / FIELD_KEYS.length) * 100);
      return { percent, missingFields: missing };
    }

    // Exposed for unit tests + the CompletenessCard header "{N}/11" display.
    export const COMPLETENESS_FIELD_COUNT = FIELD_KEYS.length;
    ```

    **FILE 2**: `frontend/lib/recipe-completeness.test.ts` — unit tests. The exact test runner depends on the project's tooling. If `vitest` exists (check `package.json`), use vitest. Otherwise, write a simple node-runnable test using Node's built-in `node:test` module (no extra deps required and Node 20+ supports it natively).

    Use the following test scaffold (vitest dialect — adapt to `node:test` if needed). The point is the CONTENT, not the runner:

    ```typescript
    // RID-03 unit tests — covers all 11 fields, strict non-empty rules,
    // percent rounding, and missingFields order preservation.

    import { describe, it, expect } from "vitest";
    import { computeCompleteness, isFieldKey, COMPLETENESS_FIELD_COUNT } from "./recipe-completeness";
    import type { Recipe } from "@/lib/recipes";

    function makeRecipe(overrides: Partial<Recipe> = {}): Partial<Recipe> {
      return overrides;
    }

    describe("computeCompleteness", () => {
      it("returns 100% and empty missingFields for a fully complete recipe", () => {
        const recipe = makeRecipe({
          title: "Risotto",
          description: "Crémeux et savoureux.",
          ingredients: [{ name: "riz", quantity: 300, unit: "g" }],
          steps: ["Faire revenir l'oignon.", "Ajouter le riz."],
          prep_time_minutes: 10,
          cook_time_minutes: 25,
          servings: 2,
          difficulty: "medium",
          cuisine: "italian",
          mood: ["comfort"],
          main_protein: "none",
        });
        const result = computeCompleteness(recipe);
        expect(result.percent).toBe(100);
        expect(result.missingFields).toEqual([]);
      });

      it("returns ~9% (1/11) for a recipe with only title set", () => {
        const recipe = makeRecipe({ title: "Tarte Tatin" });
        const result = computeCompleteness(recipe);
        expect(result.percent).toBe(Math.round((1 / 11) * 100)); // 9
        expect(result.missingFields).toEqual([
          "description",
          "ingredients",
          "steps",
          "prep_time_minutes",
          "cook_time_minutes",
          "servings",
          "difficulty",
          "cuisine",
          "mood",
          "main_protein",
        ]);
      });

      it("treats whitespace-only strings as missing", () => {
        const recipe = makeRecipe({
          title: "X",
          description: "   ",       // whitespace only → missing
          cuisine: "",              // empty → missing
          main_protein: "  \t  ",   // whitespace → missing
          difficulty: "medium",
        });
        const result = computeCompleteness(recipe);
        expect(result.missingFields).toContain("description");
        expect(result.missingFields).toContain("cuisine");
        expect(result.missingFields).toContain("main_protein");
        expect(result.missingFields).not.toContain("difficulty");
        expect(result.missingFields).not.toContain("title");
      });

      it("treats numeric zero as filled (not missing)", () => {
        const recipe = makeRecipe({
          title: "X",
          prep_time_minutes: 0,
          cook_time_minutes: 0,
          servings: 0,
        });
        const result = computeCompleteness(recipe);
        expect(result.missingFields).not.toContain("prep_time_minutes");
        expect(result.missingFields).not.toContain("cook_time_minutes");
        expect(result.missingFields).not.toContain("servings");
      });

      it("treats null/undefined numbers as missing", () => {
        const recipe = makeRecipe({
          title: "X",
          prep_time_minutes: null as unknown as number,
          cook_time_minutes: undefined,
          servings: null as unknown as number,
        });
        const result = computeCompleteness(recipe);
        expect(result.missingFields).toContain("prep_time_minutes");
        expect(result.missingFields).toContain("cook_time_minutes");
        expect(result.missingFields).toContain("servings");
      });

      it("treats empty arrays as missing and non-empty as filled", () => {
        const recipe = makeRecipe({
          title: "X",
          ingredients: [],
          steps: [],
          mood: [],
        });
        const result = computeCompleteness(recipe);
        expect(result.missingFields).toContain("ingredients");
        expect(result.missingFields).toContain("steps");
        expect(result.missingFields).toContain("mood");

        const recipe2 = makeRecipe({
          title: "X",
          ingredients: [{ name: "i", quantity: 1, unit: "g" }],
          steps: ["step"],
          mood: ["comfort"],
        });
        const result2 = computeCompleteness(recipe2);
        expect(result2.missingFields).not.toContain("ingredients");
        expect(result2.missingFields).not.toContain("steps");
        expect(result2.missingFields).not.toContain("mood");
      });

      it("rounds percent to nearest integer", () => {
        // 5 of 11 filled = 45.4545... → rounds to 45
        const recipe = makeRecipe({
          title: "X",
          description: "x",
          ingredients: [{ name: "i", quantity: 1, unit: "g" }],
          steps: ["step"],
          prep_time_minutes: 10,
          // 6 missing
        });
        const result = computeCompleteness(recipe);
        expect(result.percent).toBe(45);
      });

      it("preserves canonical field order in missingFields", () => {
        const recipe = makeRecipe({}); // empty — all 11 missing
        const result = computeCompleteness(recipe);
        expect(result.missingFields).toEqual([
          "title",
          "description",
          "ingredients",
          "steps",
          "prep_time_minutes",
          "cook_time_minutes",
          "servings",
          "difficulty",
          "cuisine",
          "mood",
          "main_protein",
        ]);
      });

      it("exports COMPLETENESS_FIELD_COUNT === 11", () => {
        expect(COMPLETENESS_FIELD_COUNT).toBe(11);
      });
    });

    describe("isFieldKey", () => {
      it("accepts all canonical FieldKey values", () => {
        for (const key of [
          "title", "description", "ingredients", "steps",
          "prep_time_minutes", "cook_time_minutes", "servings",
          "difficulty", "cuisine", "mood", "main_protein",
        ]) {
          expect(isFieldKey(key)).toBe(true);
        }
      });

      it("rejects unknown strings", () => {
        expect(isFieldKey("foo")).toBe(false);
        expect(isFieldKey("")).toBe(false);
        expect(isFieldKey("photo_paths")).toBe(false);
        expect(isFieldKey("seasonality")).toBe(false);
      });

      it("rejects non-strings", () => {
        expect(isFieldKey(null)).toBe(false);
        expect(isFieldKey(undefined)).toBe(false);
        expect(isFieldKey(42)).toBe(false);
        expect(isFieldKey({})).toBe(false);
      });
    });
    ```

    Specifically:
    - If vitest is NOT installed, rewrite the test using Node's `node:test` module (`import { test, describe } from "node:test"; import assert from "node:assert";`). The assertions translate one-to-one; the structure stays the same.
    - The Recipe TypeScript type (in `frontend/lib/recipes.ts`) MUST include the three new fields (cook_time_minutes, difficulty, description). 24-02 should have added them as part of its `RecipeResponse` extension; verify before this task starts by reading `frontend/lib/recipes.ts`. If they're missing, this task ALSO adds them to the Recipe type (additive, nullable: `cook_time_minutes?: number | null; difficulty?: string | null; description?: string | null;`).
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && test -f lib/recipe-completeness.ts && test -f lib/recipe-completeness.test.ts && grep -c "export function computeCompleteness" lib/recipe-completeness.ts</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /Users/gulu3001/dev/al-dente/frontend/lib/recipe-completeness.ts && echo OK` prints OK.
    - `test -f /Users/gulu3001/dev/al-dente/frontend/lib/recipe-completeness.test.ts && echo OK` prints OK.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "export function computeCompleteness" lib/recipe-completeness.ts` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "export type FieldKey" lib/recipe-completeness.ts` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "export function isFieldKey" lib/recipe-completeness.ts` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "COMPLETENESS_FIELD_COUNT" lib/recipe-completeness.ts` returns at least `1`.
    - All 11 FieldKey strings are listed: `cd /Users/gulu3001/dev/al-dente/frontend && grep -cE '"title"|"description"|"ingredients"|"steps"|"prep_time_minutes"|"cook_time_minutes"|"servings"|"difficulty"|"cuisine"|"mood"|"main_protein"' lib/recipe-completeness.ts` returns at least `11`.
    - Test file has at least 8 test cases (`describe` + `it` blocks): `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "it(" lib/recipe-completeness.test.ts` returns at least `8`.
    - Tests execute and pass. Choose ONE of:
      - If vitest is installed: `cd /Users/gulu3001/dev/al-dente/frontend && npx vitest run lib/recipe-completeness.test.ts` exits 0.
      - If using node:test: `cd /Users/gulu3001/dev/al-dente/frontend && node --import tsx --test lib/recipe-completeness.test.ts` exits 0 (operator verifies node/tsx are available).
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
  </acceptance_criteria>
  <done>
    `recipe-completeness.ts` exports `computeCompleteness`, `FieldKey`, `isFieldKey`, `COMPLETENESS_FIELD_COUNT`. Unit tests cover empty / full / whitespace-strings / zero-numbers / null-numbers / empty-arrays / non-empty-arrays / percent-rounding / field-order / isFieldKey-positive / isFieldKey-negative cases — at least 8 distinct test cases. All tests pass. The Recipe TypeScript type in `lib/recipes.ts` already has the three RID-02 fields (or is extended here).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create CompletenessCard component (RID-03 / D-20, D-21)</name>
  <files>frontend/components/CompletenessCard.tsx, frontend/lib/i18n/fr.json</files>
  <read_first>
    - frontend/components/EmptyState.tsx (paper-grain shadow-card shell pattern)
    - frontend/components/ui/badge.tsx (asChild + variant="outline" pattern; verify it accepts asChild prop)
    - frontend/lib/recipe-completeness.ts (from Task 1 — the computeCompleteness + FieldKey contracts)
    - frontend/lib/i18n/fr.json (current namespaces — add a top-level "completeness" namespace)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-20, §D-21
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §Target 7 (Badge asChild)
  </read_first>
  <action>
    Create the CompletenessCard component AND add its French strings to fr.json.

    **FILE 1**: `frontend/components/CompletenessCard.tsx` — new client component:

    ```tsx
    "use client";

    // RID-03 — Recipe completeness scorecard.
    //
    // Renders an above-body nudge card on /recipes/[id] when computeCompleteness(recipe).percent < 100.
    // Returns null at 100% — no nagging once the recipe is fully filled (REQ-mandated).
    //
    // Surface: paper-grain + shadow-card shell (matches EmptyState's visual register).
    // Header: "À compléter — {N}/11" in text-title (Cormorant Garamond display).
    // Progress bar: role="progressbar" with aria-valuenow/min/max.
    // Chips: shadcn <Badge variant="outline" asChild><Link href="..."></Link></Badge>
    //        — each chip is a tap target navigating to the edit page with ?focus=<fieldKey>.
    //
    // The chip-link href shape is `/recipes/${recipeId}/edit?focus=${field}`. The edit
    // page consumes the ?focus= param via useSearchParams() (wrapped in <Suspense>) and
    // scrolls/focuses the matching input via a ref map. Unknown ?focus= values are
    // silently no-op (D-22).

    import Link from "next/link";
    import { useTranslations } from "next-intl";
    import { Badge } from "@/components/ui/badge";
    import {
      computeCompleteness,
      COMPLETENESS_FIELD_COUNT,
      type FieldKey,
    } from "@/lib/recipe-completeness";
    import type { Recipe } from "@/lib/recipes";

    export function CompletenessCard({ recipe }: { recipe: Recipe }) {
      const t = useTranslations("completeness");
      const { percent, missingFields } = computeCompleteness(recipe);

      // At 100% (or above — defensively): render nothing. No nagging.
      if (percent >= 100) return null;

      const missingCount = missingFields.length;
      const filledCount = COMPLETENESS_FIELD_COUNT - missingCount;

      return (
        <div
          className="paper-grain shadow-card flex flex-col gap-3 rounded-lg bg-card border border-border px-5 py-4"
          aria-label={t("card_aria")}
        >
          <h2 className="text-title">
            {t("header", { filled: filledCount, total: COMPLETENESS_FIELD_COUNT })}
          </h2>
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("progress_aria", { percent })}
            className="h-2 w-full bg-surface-muted rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-[var(--color-valide-foreground)] transition-[width] duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {missingFields.map((field) => (
              <CompletenessChip key={field} recipeId={recipe.id} field={field} label={t(field)} />
            ))}
          </div>
        </div>
      );
    }

    function CompletenessChip({
      recipeId,
      field,
      label,
    }: {
      recipeId: string;
      field: FieldKey;
      label: string;
    }) {
      return (
        <Badge variant="outline" asChild>
          <Link href={`/recipes/${recipeId}/edit?focus=${field}`}>{label}</Link>
        </Badge>
      );
    }
    ```

    **FILE 2**: `frontend/lib/i18n/fr.json` — add a top-level `completeness` namespace with the chip labels + header phrasing + aria labels. Insert at an alphabetically-reasonable location (typically the executor reads the file and inserts the new namespace alongside other top-level namespaces). Required keys (D-21):

    ```json
    "completeness": {
      "header": "À compléter — {filled}/{total}",
      "card_aria": "Carte de complétude de la recette",
      "progress_aria": "{percent}% complet",
      "title": "Titre",
      "description": "Description",
      "ingredients": "Ingrédients",
      "steps": "Étapes",
      "prep_time_minutes": "Temps de préparation",
      "cook_time_minutes": "Temps de cuisson",
      "servings": "Portions",
      "difficulty": "Difficulté",
      "cuisine": "Cuisine",
      "mood": "Ambiance",
      "main_protein": "Protéine"
    }
    ```

    Specifically:
    - The `header` uses next-intl's ICU `{filled}/{total}` interpolation — the component passes both as `t("header", { filled, total })`. Output: "À compléter — 5/11".
    - The chip labels are EXACTLY per D-21 (Description, Ingrédients, Étapes, Temps de préparation, Temps de cuisson, Portions, Difficulté, Cuisine, Ambiance, Protéine). `title` is also included (its label is "Titre") even though title is NOT NULL on the model so it should never appear as a chip — defensive completeness for the type system.
    - The progress-bar color is `--color-valide-foreground` (emerald) so the visual signal aligns with vote-state "Validé" — completeness is a positive signal.
    - `transition-[width]` gives a 300ms ease-out animation when the percent changes after the user edits a field and the detail page re-renders.
    - The component takes a full `Recipe` (not a partial) — the detail page already has the full recipe object loaded.
    - Do NOT add the `prefers-reduced-motion` gate to the progress-bar transition — `transition-[width]` is a layout property change, not a movement; reduced-motion users see the same final state, just with the bounce. (If real-device testing shows this is uncomfortable, a follow-up plan adds `motion-reduce:transition-none`.)
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && test -f components/CompletenessCard.tsx && grep -c "computeCompleteness" components/CompletenessCard.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `test -f /Users/gulu3001/dev/al-dente/frontend/components/CompletenessCard.tsx && echo OK` prints OK.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "export function CompletenessCard" components/CompletenessCard.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "\"use client\"" components/CompletenessCard.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "if (percent >= 100) return null" components/CompletenessCard.tsx` returns `1` (the no-nagging gate).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "role=\"progressbar\"" components/CompletenessCard.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "aria-valuenow={percent}" components/CompletenessCard.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "variant=\"outline\" asChild" components/CompletenessCard.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "/recipes/\${recipeId}/edit?focus=\${field}" components/CompletenessCard.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "\"completeness\":" lib/i18n/fr.json` returns `1`.
    - All 11 chip labels exist: `cd /Users/gulu3001/dev/al-dente/frontend && grep -cE "\"title\": \"Titre\"|\"description\": \"Description\"|\"ingredients\": \"Ingrédients\"|\"steps\": \"Étapes\"|\"prep_time_minutes\": \"Temps de préparation\"|\"cook_time_minutes\": \"Temps de cuisson\"|\"servings\": \"Portions\"|\"difficulty\": \"Difficulté\"|\"cuisine\": \"Cuisine\"|\"mood\": \"Ambiance\"|\"main_protein\": \"Protéine\"" lib/i18n/fr.json` returns at least `11`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "À compléter — {filled}/{total}" lib/i18n/fr.json` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint components/CompletenessCard.tsx` exits 0.
  </acceptance_criteria>
  <done>
    `CompletenessCard.tsx` renders the paper-grain shell with header, accessible progress bar, and outline-Badge chip-links. Returns null at 100%. All 11 French chip labels + header phrase + aria labels added to fr.json under the `completeness` namespace.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Mount CompletenessCard above body content on /recipes/[id] detail page (RID-03 / D-20)</name>
  <files>frontend/app/recipes/[id]/page.tsx</files>
  <read_first>
    - frontend/app/recipes/[id]/page.tsx (full file — find where the body content (ingredients/steps) starts; CompletenessCard mounts ABOVE this)
    - frontend/components/CompletenessCard.tsx (from Task 2)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-20
  </read_first>
  <action>
    Two sub-edits in `frontend/app/recipes/[id]/page.tsx`:

    SUB-EDIT 3A — Add the CompletenessCard import. Place among the existing `@/components/*` imports (keep alphabetical-ish ordering):

    ```tsx
    import { CompletenessCard } from "@/components/CompletenessCard";
    ```

    SUB-EDIT 3B — Mount `<CompletenessCard recipe={recipe} />` ABOVE the body content (D-20). "Above the body content" means: AFTER the page header / hero / photo / metadata block (RID-02 Cuisson/Difficulté is part of the metadata block — that's still in the header band), BEFORE the description paragraph (RID-02 Task 7) and the ingredients/steps blocks.

    The executor reads the existing structure and identifies the right insertion point. The typical layout (post-Phase 8 + Phase 22 + RID-02):
    ```tsx
    <main>
      {/* header + photo + metadata */}
      <RecipeHeader ... />
      <PhotoCarousel ... />
      <MetadataBlock ... />

      {/* NEW: CompletenessCard mounts here, above the body */}
      <CompletenessCard recipe={recipe} />

      {/* body */}
      {recipe.description && <DescriptionParagraph .../>}
      <IngredientsList ... />
      <StepsList ... />
    </main>
    ```

    Add a wrapper div if the parent's flex/grid layout needs explicit margins:
    ```tsx
    <div className="px-(--spacing-page-x) mb-4">
      <CompletenessCard recipe={recipe} />
    </div>
    ```

    (Use the same `px-(--spacing-page-x)` page-rhythm token already in use elsewhere on the page; the `mb-4` separates the card from the description / ingredients below.)

    The component returns null at 100%, so adding it unconditionally is safe — fully-complete recipes render no DOM for the card.

    Do NOT remove or modify any other section of the detail page — title, photo carousel, metadata block (including the RID-02 Cuisson / Difficulté lines from Task 7 of 24-02), cooking-log shortcut, vote-state pills, ingredients, steps, etc.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<CompletenessCard" app/recipes/\[id\]/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import { CompletenessCard } from \"@/components/CompletenessCard\";" app/recipes/\\[id\\]/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<CompletenessCard recipe={recipe} />" app/recipes/\\[id\\]/page.tsx` returns `1`.
    - The card is mounted ABOVE the description / ingredients block (verify by reading the file post-edit; the line number of `<CompletenessCard` is less than the line number of the description paragraph or ingredients list).
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint app/recipes/\\[id\\]/page.tsx` exits 0.
  </acceptance_criteria>
  <done>
    The detail page mounts `<CompletenessCard recipe={recipe} />` once, above the body content (description / ingredients / steps). At 100% completion the component renders nothing.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Add optional focusRefs prop to RecipeForm and attach refs to inputs (RID-03 / D-22, D-23)</name>
  <files>frontend/components/RecipeForm.tsx</files>
  <read_first>
    - frontend/components/RecipeForm.tsx (current state — focus on the render body and the props signature at L220)
    - frontend/lib/recipe-completeness.ts (from Task 1 — FieldKey type to import)
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §Target 3 (React 19 ref-as-prop on shadcn Input/Textarea; SelectTrigger is the focus target for Select)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-23
  </read_first>
  <action>
    Add an OPTIONAL `focusRefs?: Partial<Record<FieldKey, RefObject<HTMLElement | null>>>` prop to `RecipeForm`. The new recipe form (`/recipes/new`) and the voice-modify sheet do NOT pass it; only the edit page does. When provided, each input/textarea/select on the form attaches its `ref` from the map keyed by FieldKey.

    Four sub-edits:

    SUB-EDIT 4A — Add the import for `FieldKey` at the top of the file:
    ```typescript
    import type { FieldKey } from "@/lib/recipe-completeness";
    import type { RefObject } from "react";
    ```

    (If `RefObject` is already imported as part of `react`'s import, extend that line instead.)

    SUB-EDIT 4B — Extend the `RecipeForm` props type at line 220 (the function signature). Find:
    ```tsx
    export function RecipeForm({
      initial,
      onSubmit,
      submitLabel,
      ...
    }: {
      initial?: RecipeFormValues;
      onSubmit: (values: RecipeBody) => Promise<void>;
      submitLabel: string;
      ...
    })
    ```

    Add a `focusRefs?` field:
    ```tsx
    export function RecipeForm({
      initial,
      onSubmit,
      submitLabel,
      focusRefs,
      ...
    }: {
      initial?: RecipeFormValues;
      onSubmit: (values: RecipeBody) => Promise<void>;
      submitLabel: string;
      focusRefs?: Partial<Record<FieldKey, RefObject<HTMLElement | null>>>;
      ...
    })
    ```

    SUB-EDIT 4C — Attach refs to each input. For each of the 10 input/textarea/select elements corresponding to a FieldKey (title, description, ingredients_text, steps_text, prep_time_minutes, cook_time_minutes, servings, difficulty, cuisine, main_protein, mood, ... — note: `ingredients` FieldKey maps to the `ingredients_text` Textarea; `steps` → `steps_text` Textarea; `mood` → the first checkbox or the wrapping fieldset since it's a multi-select), add a `ref` prop.

    The pattern for Input + Textarea (React 19 ref-as-prop):
    ```tsx
    <Input
      id="title"
      ref={focusRefs?.title as RefObject<HTMLInputElement> | undefined}
      // ... other props ...
    />
    ```

    For Select (where the actual focusable element is the trigger, not the root):
    ```tsx
    <Select ...>
      <SelectTrigger
        id="difficulty"
        ref={focusRefs?.difficulty as RefObject<HTMLButtonElement> | undefined}
      >
        <SelectValue ... />
      </SelectTrigger>
      ...
    </Select>
    ```

    For the `mood` multi-select (likely a row of Checkbox or ToggleGroup elements): attach the ref to the WRAPPING `<fieldset>` or `<div role="group">` element so `scrollIntoView` lands at the section. If no wrapping element exists, add `<div ref={focusRefs?.mood as RefObject<HTMLDivElement> | undefined}>...</div>` around the mood inputs.

    Mapping of FieldKey → focus target element in the form:
    - `title` → the title Input
    - `description` → the description Textarea (RID-02 Task 6)
    - `ingredients` → the ingredients_text Textarea
    - `steps` → the steps_text Textarea
    - `prep_time_minutes` → the prep_time_minutes Input
    - `cook_time_minutes` → the cook_time_minutes Input (RID-02 Task 6)
    - `servings` → the servings Input
    - `difficulty` → the difficulty SelectTrigger (RID-02 Task 6)
    - `cuisine` → the cuisine SelectTrigger
    - `mood` → the wrapping div/fieldset of mood checkboxes
    - `main_protein` → the main_protein SelectTrigger

    All refs are wired UNCONDITIONALLY in the JSX. The `focusRefs?.<key>` lookup returns `undefined` when the prop is not passed (new recipe form, voice-modify sheet) — `ref={undefined}` is a valid no-op in React. The `as RefObject<...>` type assertion is required because TypeScript's `Partial<Record<FieldKey, RefObject<HTMLElement | null>>>` returns `RefObject<HTMLElement | null> | undefined`; the underlying element type is narrower (HTMLInputElement / HTMLButtonElement / HTMLDivElement). The cast is safe because the focusRefs map at the edit-page level was constructed with matching element types.

    SUB-EDIT 4D — Do NOT modify `formValuesToBody` / `recipeToFormValues` / `RecipeFormValues` / `NONE_VALUE` / the submit handler / the photo uploader / any other behavioral logic. The ref additions are PURELY ADDITIVE — they have zero runtime effect when `focusRefs` is undefined.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "focusRefs" components/RecipeForm.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import type { FieldKey }" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "focusRefs?: Partial<Record<FieldKey" components/RecipeForm.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "focusRefs?.title\|focusRefs?.description\|focusRefs?.ingredients\|focusRefs?.steps\|focusRefs?.prep_time_minutes\|focusRefs?.cook_time_minutes\|focusRefs?.servings\|focusRefs?.difficulty\|focusRefs?.cuisine\|focusRefs?.mood\|focusRefs?.main_protein" components/RecipeForm.tsx` returns at least `10` (one per FieldKey except possibly `title` if title isn't a focus target in the form — but D-22 / D-23 includes it for completeness).
    - All 11 FieldKey strings appear in `focusRefs?.<key>` patterns: `cd /Users/gulu3001/dev/al-dente/frontend && for key in title description ingredients steps prep_time_minutes cook_time_minutes servings difficulty cuisine mood main_protein; do grep -c "focusRefs?.\${key}" components/RecipeForm.tsx || true; done | awk '{s+=$1} END {print s}'` returns at least 10 (allows for one of the 11 being absent if there's no natural focus target, e.g., if `title` is intentionally excluded — but the executor SHOULD wire all 11 for symmetry).
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint components/RecipeForm.tsx` exits 0.
    - Existing callers (new recipe form, voice-modify sheet) STILL compile without passing `focusRefs` — the prop is optional.
  </acceptance_criteria>
  <done>
    `RecipeForm` accepts an optional `focusRefs?: Partial<Record<FieldKey, RefObject<HTMLElement | null>>>` prop. Each input/textarea/select attaches its `ref` from the map (or no-op when the prop is undefined). All existing callers continue to compile and behave identically.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Wire ?focus= consumption + Suspense wrapping on /recipes/[id]/edit page (RID-03 / D-22)</name>
  <files>frontend/app/recipes/[id]/edit/page.tsx</files>
  <read_first>
    - frontend/app/recipes/[id]/edit/page.tsx (full file — note the current structure; OnboardingGuard wrapping, Inner pattern, fetch+RecipeForm call)
    - frontend/app/onboarding/share-code/page.tsx (CANONICAL Suspense + useSearchParams precedent — verified in RESEARCH.md §Pattern 4; lines 88-95 are the structural template)
    - frontend/lib/recipe-completeness.ts (FieldKey, isFieldKey from Task 1)
    - frontend/components/RecipeForm.tsx (the new focusRefs prop from Task 4)
    - .planning/phases/24-recipe-identity/24-CONTEXT.md §D-22
    - .planning/phases/24-recipe-identity/24-RESEARCH.md §Pattern 4 + §Pitfall 1 (Suspense is REQUIRED in production)
    - frontend/AGENTS.md (Next.js 16 has breaking changes — useSearchParams Suspense requirement is one of them)
  </read_first>
  <action>
    Refactor `frontend/app/recipes/[id]/edit/page.tsx` to:
    1. Wrap the page in `<Suspense fallback={null}>` because the inner component calls `useSearchParams()` — Next.js 16 production builds fail without this (RESEARCH.md §Pitfall 1).
    2. Read `?focus=` and run a ref-based scroll + focus effect after the form mounts.
    3. Strip the `?focus=` param via `router.replace(pathname)` after firing so a re-mount doesn't re-fire.

    Concrete shape (the executor adapts to the existing file structure — the goal is the behavior, not the line-for-line refactor):

    ```tsx
    "use client";

    import { Suspense, useEffect, useMemo, useRef } from "react";
    import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
    import { useTranslations } from "next-intl";

    import { OnboardingGuard } from "@/lib/onboarding-guard";
    import { RecipeForm } from "@/components/RecipeForm";
    import { isFieldKey, type FieldKey } from "@/lib/recipe-completeness";
    // ... other existing imports (api, putRecipe, etc.) preserved verbatim ...

    export default function RecipeEditPage() {
      // RID-03 D-22 + RESEARCH §Pitfall 1: useSearchParams MUST be wrapped in
      // <Suspense> in Next.js 16 production builds. The Inner/Outer split
      // matches the project's canonical precedent at
      // frontend/app/onboarding/share-code/page.tsx:88-95.
      return (
        <OnboardingGuard>
          <Suspense fallback={null}>
            <RecipeEditInner />
          </Suspense>
        </OnboardingGuard>
      );
    }

    function RecipeEditInner() {
      const params = useParams<{ id: string }>();
      const searchParams = useSearchParams();
      const pathname = usePathname();
      const router = useRouter();
      const recipeId = params.id;

      // ... existing fetch / state / submit logic preserved verbatim ...

      // RID-03 D-22 — focusRefs map. One entry per FieldKey; the value is a
      // ref the form attaches to the corresponding input/textarea/select.
      // useMemo so the map identity is stable across renders (the form's
      // optional focusRefs prop reads from it; React doesn't need to
      // re-attach refs on every render).
      const focusRefs = useMemo(() => ({
        title: { current: null } as React.MutableRefObject<HTMLElement | null>,
        description: { current: null } as React.MutableRefObject<HTMLElement | null>,
        ingredients: { current: null } as React.MutableRefObject<HTMLElement | null>,
        steps: { current: null } as React.MutableRefObject<HTMLElement | null>,
        prep_time_minutes: { current: null } as React.MutableRefObject<HTMLElement | null>,
        cook_time_minutes: { current: null } as React.MutableRefObject<HTMLElement | null>,
        servings: { current: null } as React.MutableRefObject<HTMLElement | null>,
        difficulty: { current: null } as React.MutableRefObject<HTMLElement | null>,
        cuisine: { current: null } as React.MutableRefObject<HTMLElement | null>,
        mood: { current: null } as React.MutableRefObject<HTMLElement | null>,
        main_protein: { current: null } as React.MutableRefObject<HTMLElement | null>,
      }), []);

      // RID-03 D-22 — read ?focus= and fire scroll/focus once.
      // Unknown values are silently no-op'd; valid values trigger scrollIntoView +
      // focus(), then router.replace(pathname) strips the query so a re-mount
      // (e.g. after the user saves the form) doesn't re-fire.
      const focusParam = searchParams.get("focus");
      const focusFiredRef = useRef(false);
      useEffect(() => {
        if (focusFiredRef.current) return;          // guard against double-fire under StrictMode
        if (!focusParam) return;
        if (!isFieldKey(focusParam)) {
          // Mistyped param: still strip it so the URL stays clean.
          router.replace(pathname);
          return;
        }
        // Wait one paint frame so the form has mounted and refs are populated.
        const handle = requestAnimationFrame(() => {
          const node = focusRefs[focusParam].current;
          if (node) {
            node.scrollIntoView({ behavior: "smooth", block: "center" });
            // Inputs/textareas focus naturally; SelectTrigger is a button and
            // focuses too. Wrapped <div> for mood is not focusable — call focus()
            // anyway; failing silently for non-focusable elements is fine.
            if (typeof (node as HTMLElement).focus === "function") {
              (node as HTMLElement).focus({ preventScroll: true });
            }
          }
          // Strip the ?focus= param after firing.
          router.replace(pathname);
          focusFiredRef.current = true;
        });
        return () => cancelAnimationFrame(handle);
      }, [focusParam, focusRefs, pathname, router]);

      // ... existing return JSX preserved, with focusRefs now passed to RecipeForm ...
      return (
        <RecipeForm
          initial={...existing...}
          onSubmit={...existing...}
          submitLabel={...existing...}
          focusRefs={focusRefs}
        />
      );
    }
    ```

    Specifically:
    - Wrap WITH `<OnboardingGuard>` outside the Suspense (so guard runs at the page level), then Suspense wraps the Inner that uses useSearchParams. If the existing structure puts OnboardingGuard inside the page export, preserve that structure but ensure Suspense is the parent of the inner component that calls useSearchParams.
    - Use `useMemo` for the focusRefs map so identity is stable.
    - Use `requestAnimationFrame` (one paint frame) instead of `setTimeout(0)` to ensure the form's refs are attached. React 19's commit phase runs refs synchronously, but if the form is wrapped in any Suspense-based data fetching, a paint frame gives the DOM a chance to settle.
    - `focusFiredRef` guards against React 19 StrictMode's double-render of effects.
    - `router.replace(pathname)` strips the query string. `pathname` from `usePathname()` is the path without query.
    - Unknown / mistyped `focus` values silently strip the param and exit — never throw, never render the value into the DOM (D-22; T-24-03-01 mitigation in threat model).
    - The `focusRefs` MutableRefObject shape is what the SelectTrigger / Input / Textarea actually accept (the wrapped Input/Textarea call `ref` directly; SelectTrigger does the same in React 19). The cast `as React.MutableRefObject<HTMLElement | null>` is to widen the type for the union.
    - Do NOT modify the existing fetch logic, the submit handler, the photo uploader integration, or the form's existing props beyond adding `focusRefs={focusRefs}`.

    Cross-reference grep: `cd /Users/gulu3001/dev/al-dente/frontend && grep -A 5 "onSubmit={" app/onboarding/share-code/page.tsx` to verify the Suspense-wrap precedent's structure before editing.
  </action>
  <verify>
    <automated>cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<Suspense fallback={null}>" app/recipes/\[id\]/edit/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "import { Suspense" app/recipes/\\[id\\]/edit/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "useSearchParams" app/recipes/\\[id\\]/edit/page.tsx` returns at least `2` (import + usage).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "<Suspense fallback={null}>" app/recipes/\\[id\\]/edit/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "isFieldKey" app/recipes/\\[id\\]/edit/page.tsx` returns at least `2` (import + usage).
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "focusRefs={focusRefs}" app/recipes/\\[id\\]/edit/page.tsx` returns `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "router.replace(pathname)" app/recipes/\\[id\\]/edit/page.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "scrollIntoView" app/recipes/\\[id\\]/edit/page.tsx` returns at least `1`.
    - `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "usePathname" app/recipes/\\[id\\]/edit/page.tsx` returns at least `1` (import + usage).
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx tsc --noEmit -p tsconfig.json` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx eslint app/recipes/\\[id\\]/edit/page.tsx` exits 0.
    - `cd /Users/gulu3001/dev/al-dente/frontend && npx next build --webpack 2>&1 | grep -c "Missing Suspense boundary"` returns `0` (production build does NOT fail on this page — the Suspense wrap is correctly placed).
    - The 11 FieldKey strings all appear as `focusRefs` map keys: `cd /Users/gulu3001/dev/al-dente/frontend && grep -c "title: { current:\|description: { current:\|ingredients: { current:\|steps: { current:\|prep_time_minutes: { current:\|cook_time_minutes: { current:\|servings: { current:\|difficulty: { current:\|cuisine: { current:\|mood: { current:\|main_protein: { current:" app/recipes/\\[id\\]/edit/page.tsx` returns at least `11`.
  </acceptance_criteria>
  <done>
    The edit page reads `?focus=` via `useSearchParams()` inside a `<Suspense>`-wrapped Inner component (matches share-code/page.tsx precedent). A ref map keyed by FieldKey is passed to `RecipeForm` via the new `focusRefs` prop. On valid focus values, an effect scrolls the matching element into view and focuses it, then `router.replace(pathname)` strips the query. Invalid values are silently no-op'd. The page survives `next build --webpack`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| URL query string `?focus=<value>` → edit page Client Component | Untrusted (anyone can craft a URL or copy/paste). The value is read via `useSearchParams().get("focus")` and gated through `isFieldKey()` before any DOM interaction. |
| computeCompleteness() → CompletenessCard render | All inputs come from the already-fetched Recipe object; no user-controlled string is rendered as HTML. Chip labels are i18n constants from fr.json. |
| Chip-link `<Link href="/recipes/${recipeId}/edit?focus=${field}">` | `field` is constrained to `FieldKey` at the TypeScript level — only the 11 canonical values can be interpolated into the URL. `recipeId` comes from the loaded Recipe (server-validated). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-24-03-01 | Tampering | `?focus=<value>` URL param | mitigate | `isFieldKey(focusParam)` discriminator gate at edit page. Unknown values are silently no-op'd AND the param is stripped via `router.replace(pathname)`. The value is NEVER rendered into the DOM as a string — only used as a key lookup against the predefined `focusRefs` map. This prevents both XSS (via JSX text rendering of the param) and unexpected behavior (mistyped values navigating to random elements). |
| T-24-03-02 | Information Disclosure | CompletenessCard render | accept | The card renders user-provided recipe data (already authorized for display on /recipes/[id]). Missing-field chip labels are i18n constants. No new disclosure surface. |
| T-24-03-03 | Tampering | computeCompleteness() purity | accept | Pure function; no DOM, no side effects. Cannot be tampered with at runtime. Unit-tested for behavior. |
| T-24-03-04 | Denial of Service | useEffect ref-focus loop | mitigate | `focusFiredRef` guards against StrictMode double-fire AND repeated re-renders triggering repeated scrollIntoView calls. The effect runs ONCE per `?focus=` param value; after firing, the param is stripped, preventing infinite loops. |
| T-24-03-05 | Elevation of Privilege | n/a | accept | No auth surface changed; the edit page is already protected by `OnboardingGuard` + the backend's household-scoped `current_member` dependency. CompletenessCard reads from already-authorized recipe data. |

**Summary:** RID-03 is a client-side completeness signal. The central security concern is the `?focus=` URL param tampering (T-24-03-01) — mitigated by the `isFieldKey` discriminator gate. The component renders only i18n constants and pre-authorized recipe data. Low severity overall.
</threat_model>

<verification>
## Phase 24 / RID-03 Verification — grep gates + unit tests + manual UI smoke

Per D-40 / D-41 / D-42.

### Grep gates (must all pass after Task 1-5 complete)

```bash
# 1. recipe-completeness.ts exports the canonical contract
test -f frontend/lib/recipe-completeness.ts
grep -c "export function computeCompleteness" frontend/lib/recipe-completeness.ts        # Expected: 1
grep -c "export type FieldKey" frontend/lib/recipe-completeness.ts                       # Expected: 1
grep -c "export function isFieldKey" frontend/lib/recipe-completeness.ts                 # Expected: 1
grep -cE '"title"|"description"|"ingredients"|"steps"|"prep_time_minutes"|"cook_time_minutes"|"servings"|"difficulty"|"cuisine"|"mood"|"main_protein"' frontend/lib/recipe-completeness.ts  # Expected: at least 11

# 2. Unit tests exist and pass
test -f frontend/lib/recipe-completeness.test.ts
# Plus: vitest or node:test invocation exits 0 (see Task 1 acceptance)

# 3. CompletenessCard component + i18n
test -f frontend/components/CompletenessCard.tsx
grep -c "if (percent >= 100) return null" frontend/components/CompletenessCard.tsx       # Expected: 1
grep -c "role=\"progressbar\"" frontend/components/CompletenessCard.tsx                  # Expected: 1
grep -c "variant=\"outline\" asChild" frontend/components/CompletenessCard.tsx           # Expected: 1
grep -c "\"completeness\":" frontend/lib/i18n/fr.json                                    # Expected: 1
grep -cE "\"description\": \"Description\"|\"prep_time_minutes\": \"Temps de préparation\"|\"cook_time_minutes\": \"Temps de cuisson\"|\"mood\": \"Ambiance\"|\"main_protein\": \"Protéine\"" frontend/lib/i18n/fr.json  # Expected: at least 5

# 4. Detail page mounts the card
grep -c "<CompletenessCard recipe={recipe} />" frontend/app/recipes/\[id\]/page.tsx      # Expected: 1

# 5. RecipeForm has the focusRefs prop and wires refs
grep -c "focusRefs?: Partial<Record<FieldKey" frontend/components/RecipeForm.tsx         # Expected: 1
grep -c "focusRefs?.title\|focusRefs?.description\|focusRefs?.ingredients\|focusRefs?.steps\|focusRefs?.prep_time_minutes\|focusRefs?.cook_time_minutes\|focusRefs?.servings\|focusRefs?.difficulty\|focusRefs?.cuisine\|focusRefs?.mood\|focusRefs?.main_protein" frontend/components/RecipeForm.tsx  # Expected: at least 10

# 6. Edit page consumes ?focus= with Suspense
grep -c "<Suspense fallback={null}>" frontend/app/recipes/\[id\]/edit/page.tsx           # Expected: 1
grep -c "useSearchParams\|isFieldKey\|router.replace(pathname)\|scrollIntoView" frontend/app/recipes/\[id\]/edit/page.tsx  # Expected: at least 4
```

### Build / test / lint gates

```bash
cd frontend && npx tsc --noEmit -p tsconfig.json   # Expected: exit 0
cd frontend && npx eslint lib/recipe-completeness.ts lib/recipe-completeness.test.ts components/CompletenessCard.tsx components/RecipeForm.tsx app/recipes/\[id\]/page.tsx app/recipes/\[id\]/edit/page.tsx  # Expected: exit 0
# Run unit tests for computeCompleteness — either:
cd frontend && npx vitest run lib/recipe-completeness.test.ts   # if vitest
# OR:
cd frontend && node --import tsx --test lib/recipe-completeness.test.ts  # if node:test
cd frontend && npx next build --webpack            # Expected: clean build; critically, NO "Missing Suspense boundary" error
```

### Manual UI smoke (D-41 — operator runs against seeded fixture)

1. **Incomplete recipe** (`/recipes/{seeded_id}` where ~4/11 fields are filled per 24-02 Task 8 seed): CompletenessCard appears above the body. Header reads "À compléter — 4/11". Progress bar at ~36% width. Chips render for 7 missing fields (using French labels).
2. **Chip navigation** (tap the "Cuisine" chip on the CompletenessCard): URL navigates to `/recipes/{id}/edit?focus=cuisine`. Edit page scrolls to the Cuisine select. The select trigger receives focus (visible focus ring). URL bar updates to `/recipes/{id}/edit` (query stripped).
3. **Each field type focuses correctly**: Tap chips for description (Textarea), prep_time_minutes (Input), difficulty (SelectTrigger button), mood (wrapping div) — each scrolls and focuses appropriately.
4. **Mistyped focus** (manually visit `/recipes/{id}/edit?focus=foobar`): page renders normally; no error; URL strips to `/recipes/{id}/edit` after one paint frame.
5. **100%-complete recipe** (manually fill ALL 11 fields and save): On revisit `/recipes/{id}`, CompletenessCard renders NOTHING — no card, no "À compléter" header, no chips.
6. **Save then revisit**: From the chip-link landing page, fill the focused field, save, revisit `/recipes/{id}`. The previously-missing chip is gone from the card; the percent has incremented; if you've filled all chips, the card disappears entirely.

### Playwright fixture updates

- No NEW Playwright specs per D-42. Existing specs touching the detail page (`/recipes/[id]`) MAY see the CompletenessCard render — they should NOT fail because the card is purely additive, sits ABOVE the body, and existing assertions target body content (ingredients/steps/title).
- 24-02 Task 8 already seeded mixed completeness levels — RID-03 verification reuses that surface.
</verification>

<success_criteria>
The plan is complete when:

1. All grep gates from §Verification pass.
2. `cd frontend && npx vitest run lib/recipe-completeness.test.ts` (or node:test equivalent) exits 0 with at least 8 distinct test cases passing.
3. `cd frontend && npx tsc --noEmit && npx eslint <touched files> && npx next build --webpack` exits 0 cleanly (notably: no "Missing Suspense boundary" error from useSearchParams).
4. Manual UI smoke (6 steps) passes on the seeded fixture.
5. RID-03 success criterion (`Recipes with computeCompleteness(recipe).percent < 100 display a CompletenessCard above the body on /recipes/[id]; recipes at 100% show nothing; the chip-links navigate to the edit page with a ?focus= param that scrolls/focuses the matching input`) is satisfied end-to-end.
6. All tasks merged in ONE atomic commit. Suggested commit message: `feat(24-03): completeness scorecard — computeCompleteness() + CompletenessCard + ?focus= edit nav (RID-03, gh#22 Part B)`.
</success_criteria>

<output>
After completion, create `.planning/phases/24-recipe-identity/24-03-completeness-SUMMARY.md` documenting:

- RID-03 closed; gh#22 fully closeable on merge (Part A done in 24-02, Part B done here).
- Files created: 3 (`recipe-completeness.ts`, `recipe-completeness.test.ts`, `CompletenessCard.tsx`).
- Files modified: 4 (`RecipeForm.tsx` focusRefs prop, `recipes/[id]/page.tsx` card mount, `recipes/[id]/edit/page.tsx` Suspense + ?focus= consumption, `fr.json` completeness namespace).
- 11 canonical fields scored, equal weight, strict non-empty rules. Title is in the FieldKey union but never appears as a chip (NOT NULL).
- Test coverage: 8+ unit-test cases covering empty / full / whitespace / zero / null / arrays / rounding / order / type-guard.
- Next.js 16 Suspense-wrap pattern: shipped per RESEARCH.md §Pattern 4 (precedent `share-code/page.tsx`).
- `?focus=` security: `isFieldKey()` discriminator gates URL-param tampering; mistyped values are silently no-op'd.
- Provides for downstream plans:
  - RID-04 (title rewrite) — orthogonal; the completeness score includes `title` but title is always filled, so the new BackgroundTask shape doesn't affect scoring.
  - RID-05 (illustration) — orthogonal; illustration is not in the 11 scored fields (D-17).
- Verification: grep gates + unit tests + manual UI smoke. No new Playwright specs; existing specs continue to pass.
</output>
