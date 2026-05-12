// Unit tests for computeCompleteness() — node-runnable (no vitest/jest needed).
// Run with: node --require @swc-node/register frontend/lib/recipe-completeness.test.ts
// Or simpler: compile + run via ts-node or similar.
//
// Since the project has no vitest configured, these tests are designed to run
// as a plain TypeScript module with ts-node. They use Node's built-in assert.
// All 11 fields + strict non-empty rules + percent rounding are covered.

import assert from "node:assert/strict";
import { computeCompleteness, isFieldKey } from "./recipe-completeness.ts";
import type { FieldKey } from "./recipe-completeness.ts";

// Helper: a fully complete recipe (all 11 fields filled, non-empty)
const FULL_RECIPE = {
  title: "Pâtes carbonara",
  description: "Un classique romain crémeux.",
  ingredients: [{ name: "pancetta", quantity: 150, unit: "g" }],
  steps: ["Cuire les pâtes", "Mélanger les oeufs"],
  prep_time_minutes: 10,
  cook_time_minutes: 15,
  servings: 2,
  difficulty: "medium",
  cuisine: "italian",
  mood: ["quick"],
  main_protein: "egg",
} as const;

// Helper: a recipe with only title set
const TITLE_ONLY = {
  title: "Pâtes carbonara",
  description: null,
  ingredients: null,
  steps: null,
  prep_time_minutes: null,
  cook_time_minutes: null,
  servings: null,
  difficulty: null,
  cuisine: null,
  mood: [],
  main_protein: null,
};

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error(`  FAIL: ${name}\n       ${err}`);
    failed++;
  }
}

console.log("\n=== recipe-completeness tests ===\n");

// --- 1. Fully complete recipe ---
test("100% complete recipe → percent=100, missingFields=[]", () => {
  const result = computeCompleteness(FULL_RECIPE);
  assert.equal(result.percent, 100);
  assert.deepEqual(result.missingFields, []);
});

// --- 2. Title-only recipe (only title present = 1/11 = 9.09% → 9%) ---
test("title-only recipe → percent=9, missingFields=[10 fields]", () => {
  const result = computeCompleteness(TITLE_ONLY);
  assert.equal(result.percent, 9);
  assert.equal(result.missingFields.length, 10);
  // title should NOT be in missingFields (it's filled)
  assert.ok(!result.missingFields.includes("title"));
  // all other 10 fields should be missing
  const expected: FieldKey[] = [
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
  ];
  assert.deepEqual(result.missingFields, expected);
});

// --- 3. Percent rounding: 5/11 → 45, not 45.45 ---
test("5/11 fields filled → percent=45 (rounds to nearest integer)", () => {
  const result = computeCompleteness({
    ...TITLE_ONLY,
    description: "Desc",
    ingredients: [{ name: "sel" }],
    steps: ["Cuire"],
    prep_time_minutes: 5,
  });
  assert.equal(result.percent, 45);
});

// --- 4. Percent rounding: 6/11 → 55, not 54.5454 ---
test("6/11 fields filled → percent=55 (Math.round of 54.5454...)", () => {
  const result = computeCompleteness({
    ...TITLE_ONLY,
    description: "Desc",
    ingredients: [{ name: "sel" }],
    steps: ["Cuire"],
    prep_time_minutes: 5,
    cook_time_minutes: 10,
  });
  assert.equal(result.percent, 55);
});

// --- 5. String fields: whitespace-only → MISSING ---
test("whitespace-only description → missing", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, description: "   " });
  assert.ok(result.missingFields.includes("description"));
  assert.ok(result.percent < 100);
});

test("whitespace-only difficulty → missing", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, difficulty: "  " });
  assert.ok(result.missingFields.includes("difficulty"));
});

test("whitespace-only cuisine → missing", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, cuisine: "\t" });
  assert.ok(result.missingFields.includes("cuisine"));
});

test("whitespace-only main_protein → missing", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, main_protein: " " });
  assert.ok(result.missingFields.includes("main_protein"));
});

// --- 6. Number fields: zero is VALID ---
test("prep_time_minutes=0 → NOT missing (zero is valid)", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, prep_time_minutes: 0 });
  assert.ok(!result.missingFields.includes("prep_time_minutes"));
});

test("cook_time_minutes=0 → NOT missing (zero is valid)", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, cook_time_minutes: 0 });
  assert.ok(!result.missingFields.includes("cook_time_minutes"));
});

test("servings=0 → NOT missing (zero is valid)", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, servings: 0 });
  assert.ok(!result.missingFields.includes("servings"));
});

// --- 7. Number fields: null/undefined → MISSING ---
test("prep_time_minutes=null → missing", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, prep_time_minutes: null });
  assert.ok(result.missingFields.includes("prep_time_minutes"));
});

test("cook_time_minutes=undefined → missing", () => {
  const recipe = { ...FULL_RECIPE };
  // @ts-expect-error -- intentional undefined test
  delete recipe.cook_time_minutes;
  const result = computeCompleteness(recipe);
  assert.ok(result.missingFields.includes("cook_time_minutes"));
});

// --- 8. Array fields: empty array → MISSING ---
test("empty ingredients array → missing", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, ingredients: [] });
  assert.ok(result.missingFields.includes("ingredients"));
});

test("empty steps array → missing", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, steps: [] });
  assert.ok(result.missingFields.includes("steps"));
});

test("empty mood array → missing", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, mood: [] });
  assert.ok(result.missingFields.includes("mood"));
});

// --- 9. Array fields: non-empty → PRESENT ---
test("single-item ingredients → NOT missing", () => {
  const result = computeCompleteness({
    ...FULL_RECIPE,
    ingredients: [{ name: "sel" }],
  });
  assert.ok(!result.missingFields.includes("ingredients"));
});

// --- 10. Canonical field order preserved in missingFields ---
test("missingFields preserves canonical order (D-17)", () => {
  // Only title filled — the other 10 must come out in canonical order
  const result = computeCompleteness(TITLE_ONLY);
  const expected: FieldKey[] = [
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
  ];
  assert.deepEqual(result.missingFields, expected);
});

// --- 11. isFieldKey type guard ---
test("isFieldKey: valid key → true", () => {
  assert.ok(isFieldKey("title"));
  assert.ok(isFieldKey("description"));
  assert.ok(isFieldKey("ingredients"));
  assert.ok(isFieldKey("steps"));
  assert.ok(isFieldKey("prep_time_minutes"));
  assert.ok(isFieldKey("cook_time_minutes"));
  assert.ok(isFieldKey("servings"));
  assert.ok(isFieldKey("difficulty"));
  assert.ok(isFieldKey("cuisine"));
  assert.ok(isFieldKey("mood"));
  assert.ok(isFieldKey("main_protein"));
});

test("isFieldKey: unknown key → false", () => {
  assert.ok(!isFieldKey("tags"));
  assert.ok(!isFieldKey("seasonality"));
  assert.ok(!isFieldKey("photo_paths"));
  assert.ok(!isFieldKey("source_capture"));
  assert.ok(!isFieldKey(""));
  assert.ok(!isFieldKey(null));
  assert.ok(!isFieldKey(undefined));
  assert.ok(!isFieldKey(42));
});

// --- 12. 1/11 (title) → percent=9 ---
test("1/11 fields (title only) → percent=9", () => {
  const result = computeCompleteness(TITLE_ONLY);
  assert.equal(result.percent, 9);
});

// --- 13. Null arrays treated as missing (not as empty) ---
test("null ingredients → missing (same as empty)", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, ingredients: null });
  assert.ok(result.missingFields.includes("ingredients"));
});

test("null steps → missing", () => {
  const result = computeCompleteness({ ...FULL_RECIPE, steps: null });
  assert.ok(result.missingFields.includes("steps"));
});

// --- Report ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
}
