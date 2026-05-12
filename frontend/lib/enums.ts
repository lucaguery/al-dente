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

export const Difficulty = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];
