// Typed wire model for the recipe library API (plan 01-10 read side).
// Mirrors backend/app/schemas/recipe.py::RecipeResponse byte-for-byte; both
// HTTP responses and WebSocket frame payloads use this exact shape.
//
// Locked vocabularies (cuisine, mood, main_protein, seasonality) come back
// as plain strings (e.g. "italian", "middleEastern"); see
// frontend/lib/enums.ts for the authoritative wire-format values. v0.1
// renders them as-is in Badges; productize-later TODO is to translate via
// `t('enums.cuisine.italian')` once that namespace exists in fr.json.

import { api } from "@/lib/api";

export type IngredientItem = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

export type Recipe = {
  id: string;
  household_id: string;
  created_by_member_id: string;
  status: "draft" | "structured" | "verified";
  title: string;
  source_capture: { type: string; payload?: unknown };
  photo_paths: string[];
  ingredients?: IngredientItem[] | null;
  steps?: string[] | null;
  prep_time_minutes?: number | null;
  servings?: number | null;
  cuisine?: string | null;
  main_protein?: string | null;
  mood: string[];
  seasonality: string[];
  tags: string[];
  last_cooked_at?: string | null;
  cook_count: number;
  created_at: string;
  updated_at: string;
};

export type Member = {
  id: string;
  name: string;
  color_hex: string;
  joined_at: string;
};

/**
 * Fetch a 5-minute signed URL for a private recipe-photos object. The path
 * argument is the bucket-relative path stored on `recipes.photo_paths`
 * (e.g. `{household_id}/{recipe_id}/{uuid}.jpg`).
 *
 * Backend endpoint: GET /api/recipes/{id}/photo-url?path=...
 * (T-01-10-01 mitigation: backend verifies path is in `recipe.photo_paths`.)
 */
export async function getSignedPhotoUrl(
  recipeId: string,
  path: string,
): Promise<string> {
  const res = await api<{ url: string; expires_in: number }>(
    `/api/recipes/${recipeId}/photo-url?path=${encodeURIComponent(path)}`,
  );
  return res.url;
}
