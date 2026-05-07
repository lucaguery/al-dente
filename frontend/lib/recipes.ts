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

// --- Phase 2 capture surfaces (W2) ----------------------------------------
//
// All helpers use the /api/* rewrite path (Phase 01.1 D-01: Vercel proxies
// /api/* to Railway). credentials: "include" carries the aldente_auth
// HttpOnly cookie automatically (Phase 01.1 D-04).

/** Wire shape returned by POST /recipes/{id}/voice-modify. Mirrors the
 *  backend's `GeminiExtractedRecipe` (services/llm.py). Used to pre-fill
 *  the edit form via sessionStorage (see Plan 05 Task 2). */
export type GeminiExtractedRecipe = {
  title: string;
  ingredients?: { name: string; quantity?: number | null; unit?: string | null }[] | null;
  steps?: string[] | null;
  prep_time_minutes?: number | null;
  servings?: number | null;
  cuisine?: string | null;
  mood: string[];
  main_protein?: string | null;
  seasonality: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** CAPTURE-01 — POST /api/recipes/voice with the transcript text body. */
export async function postVoiceCapture(transcript: string): Promise<Recipe> {
  return api<Recipe>("/api/recipes/voice", {
    method: "POST",
    body: JSON.stringify({ transcript }),
  });
}

/** CAPTURE-02 — POST /api/recipes/photo with multipart files. The backend
 *  field name is `files` (singular `file` would only accept one). */
export async function postPhotoCapture(files: File[]): Promise<Recipe> {
  const fd = new FormData();
  for (const f of files) {
    fd.append("files", f);
  }
  // FormData can't go through the api() helper because that helper sets
  // Content-Type: application/json by default. Use raw fetch with the same
  // credentials policy.
  const res = await fetch(`${API_BASE}/api/recipes/photo`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (res.status === 413) {
    // Caller maps to a French error toast via i18n (recipes.photo.error_size_total).
    throw new Error("413");
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Recipe;
}

/** CAPTURE-03 — POST /api/recipes/url. No Gemini call in v0.1; draft only. */
export async function postUrlCapture(url: string): Promise<Recipe> {
  return api<Recipe>("/api/recipes/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

/** CAPTURE-05 — POST /api/recipes/{id}/voice-modify. Returns the modified
 *  Gemini shape; caller stores in sessionStorage and navigates to /edit. */
export async function postVoiceModify(
  recipeId: string,
  transcript: string,
): Promise<GeminiExtractedRecipe> {
  return api<GeminiExtractedRecipe>(
    `/api/recipes/${recipeId}/voice-modify`,
    {
      method: "POST",
      body: JSON.stringify({ transcript }),
    },
  );
}

/** D-09 — POST /api/recipes/{id}/retry-promotion. Backend clears the error
 *  inline (so refetched drafts show the spinner state) and queues retry. */
export async function postRetryPromotion(
  recipeId: string,
): Promise<{ recipe_id: string; queued: boolean }> {
  return api<{ recipe_id: string; queued: boolean }>(
    `/api/recipes/${recipeId}/retry-promotion`,
    {
      method: "POST",
    },
  );
}
