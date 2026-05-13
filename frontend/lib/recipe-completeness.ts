// RID-03 — Recipe completeness scoring.
//
// Pure function: takes a Recipe-shaped object, returns { percent, missingFields }.
// No React, no DOM, no network — fully unit-testable in isolation. The detail
// page mounts a CompletenessCard that consumes the result; the edit page
// consumes ?focus=<fieldKey> where fieldKey is one of the FieldKey strings
// returned in missingFields.
//
// The 11 fields are scored with equal weight (1/11 ≈ 9.09% each) per
// CONTEXT.md D-17. Tags, seasonality, photo_paths, and thread metadata
// (initial_turn_kind, recipe_turns) are intentionally excluded — they're
// system fields, defaulted fields, or not part of the "recipe identity"
// scope. Title is in the list for completeness but is NOT NULL on the
// model — it will never appear in missingFields in practice.

// The Recipe type from recipes.ts is augmented here with the RID-02 fields
// (cook_time_minutes, difficulty, description). These fields were added in
// Wave 1 (24-02) but the HEAD commit on this worktree reverted the type
// extension; we re-declare the minimal shape we need here so this module
// compiles without touching recipes.ts (which is done in Task 4 / edit page).
export type RecipeForCompleteness = {
  title: string;
  description?: string | null;
  ingredients?: Array<unknown> | null;
  steps?: Array<unknown> | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  servings?: number | null;
  difficulty?: string | null;
  cuisine?: string | null;
  mood: string[];
  main_protein?: string | null;
};

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
// across renders.
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
  return (
    typeof value === "string" &&
    (FIELD_KEYS as readonly string[]).includes(value)
  );
}

// Strict non-empty rule per D-18:
//   - strings: not null/undefined AND .trim() !== ""
//   - numbers: not null/undefined (zero is valid — a 0-minute prep time is
//     a valid user input, not an unfilled field)
//   - arrays: .length > 0 (null treated as empty)
function isFieldFilled(recipe: RecipeForCompleteness, key: FieldKey): boolean {
  switch (key) {
    // String fields
    case "title":
    case "description":
    case "difficulty":
    case "cuisine":
    case "main_protein": {
      const value = recipe[key];
      return value != null && String(value).trim() !== "";
    }

    // Number fields (zero is valid)
    case "prep_time_minutes":
    case "cook_time_minutes":
    case "servings": {
      const value = recipe[key];
      return value != null;
    }

    // Array fields
    case "ingredients":
    case "steps":
    case "mood": {
      const value = recipe[key];
      return Array.isArray(value) && value.length > 0;
    }
  }
}

export function computeCompleteness(recipe: RecipeForCompleteness): {
  percent: number;
  missingFields: FieldKey[];
} {
  const missingFields: FieldKey[] = [];

  for (const key of FIELD_KEYS) {
    if (!isFieldFilled(recipe, key)) {
      missingFields.push(key);
    }
  }

  const filledCount = FIELD_KEYS.length - missingFields.length;
  const percent = Math.round((filledCount / FIELD_KEYS.length) * 100);

  return { percent, missingFields };
}
