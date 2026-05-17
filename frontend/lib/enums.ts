// Mirror of backend/app/models/enums.py — drift is a category of bug per CLAUDE.md.
// Wire-format string values must match the Python Enum values verbatim.
// Source: SPEC.md §"Locked vocabularies".

export const Season = {
  spring: "spring",
  summer: "summer",
  autumn: "autumn",
  winter: "winter",
} as const;
export type Season = (typeof Season)[keyof typeof Season];

export const Cuisine = {
  italian: "italian",
  french: "french",
  asian: "asian",
  mediterranean: "mediterranean",
  middleEastern: "middleEastern",
  indian: "indian",
  mexican: "mexican",
  northAfrican: "northAfrican",
  american: "american",
  other: "other",
} as const;
export type Cuisine = (typeof Cuisine)[keyof typeof Cuisine];

export const Mood = {
  comfort: "comfort",
  light: "light",
  quick: "quick",
  celebratory: "celebratory",
  adventurous: "adventurous",
} as const;
export type Mood = (typeof Mood)[keyof typeof Mood];

export const Protein = {
  poultry: "poultry",
  redMeat: "redMeat",
  fish: "fish",
  seafood: "seafood",
  egg: "egg",
  legume: "legume",
  none: "none",
} as const;
export type Protein = (typeof Protein)[keyof typeof Protein];

// Phase 24 RID-02 — Difficulty locked vocabulary (migration 0007).
// Mirror of backend/app/models/enums.py class Difficulty — both must stay in sync.
// Restored in 24-03 after the Wave 1 HEAD commit reverted this block.
export const Difficulty = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

// Phase 25 THREAD-01 — recipe_turns vocabulary (migration 0009).
// Mirror of backend/app/models/enums.py classes TurnSender + TurnKind — drift is a bug category.
export const TurnSender = {
  user: "user",
  system: "system",
} as const;
export type TurnSender = (typeof TurnSender)[keyof typeof TurnSender];

export const TurnKind = {
  text: "text",
  voice: "voice",
  photo: "photo",
  url: "url",
  answer: "answer",
  proposal_accepted: "proposal_accepted",
  proposal_dismissed: "proposal_dismissed",
  summary: "summary",
  question: "question",
  advisory: "advisory",
} as const;
export type TurnKind = (typeof TurnKind)[keyof typeof TurnKind];

/**
 * Phase 28 DETAIL-04 / DETAIL-05 — locked-vocabulary mirror of
 * backend/app/schemas/recipe_turn.py:28 `AnswerField` Literal.
 *
 * 13 recipe fields eligible for pinning via either:
 *   (a) chip/stepper `answer` turns (Phase 26), or
 *   (b) direct PUT /recipes/{id} field edits (Phase 28 DETAIL-05).
 *
 * Drift between this list and the backend Literal = bug category
 * (CLAUDE.md "Locked vocabularies"). When adding a new pinnable field,
 * update BOTH this const AND the backend AnswerField in the same change.
 */
export const ANSWER_FIELDS = [
  "title",
  "description",
  "ingredients",
  "steps",
  "prep_time_minutes",
  "cook_time_minutes",
  "difficulty",
  "servings",
  "cuisine",
  "mood",
  "main_protein",
  "seasonality",
  "tags",
] as const;

export type AnswerField = (typeof ANSWER_FIELDS)[number];
