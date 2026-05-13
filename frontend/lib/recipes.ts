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
import type { TurnKind } from "@/lib/enums";

export type IngredientItem = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

export type Recipe = {
  id: string;
  household_id: string;
  created_by_member_id: string;
  status: "draft" | "structured" | "verified" | "failed";
  title: string;
  /**
   * Phase 25 — kind of the first user turn (text/voice/photo/url),
   * synthesized server-side from recipe_turns for RecipeDraftCard variant
   * logic. `null` when no first user turn exists (should not happen
   * post-migration).
   */
  initial_turn_kind: TurnKind | null;
  photo_paths: string[];
  ingredients?: IngredientItem[] | null;
  steps?: string[] | null;
  prep_time_minutes?: number | null;
  // Phase 24 RID-02 — three optional recipe-identity fields (migration 0007).
  // Restored in 24-03 after the Wave 1 HEAD commit reverted them.
  cook_time_minutes?: number | null;
  difficulty?: string | null;
  description?: string | null;
  // Phase 24 RID-05 — server-side-sanitized SVG illustration. NULL means
  // not yet generated OR rejected by the sanitizer. The frontend treats
  // both identically (BrandIcon fallback via RecipeIllustration).
  illustration_svg?: string | null;
  servings?: number | null;
  cuisine?: string | null;
  main_protein?: string | null;
  mood: string[];
  seasonality: string[];
  tags: string[];
  last_cooked_at?: string | null;
  cook_count: number;
  last_cooked_photo_path?: string | null;
  created_at: string;
  updated_at: string;
  // Phase 2 additions (CONTEXT.md D-09): null `promotion_error` means
  // no failure / never attempted; promotion_attempts increments on every try.
  promotion_error?: string | null;
  promotion_attempts?: number;
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
// In-memory signed-URL cache. The backend mints URLs with a 5-minute TTL
// (SIGNED_URL_TTL_SECONDS in backend/app/services/storage.py); cache for 4
// minutes so we keep a 1-minute safety margin before the URL would 403.
// Scope is per-tab process — the cache resets on hard reload, which is the
// correct behavior (the user wants fresh URLs when they manually refresh).
// Without this cache, every BottomNav round-trip back to /recipes refetched
// signed URLs for every visible thumbnail, producing a visible flicker and
// hammering the backend (one /photo-url per card per nav).
const PHOTO_URL_CACHE_TTL_MS = 4 * 60 * 1000;
const photoUrlCache = new Map<string, { url: string; expiresAt: number }>();

function photoUrlCacheKey(recipeId: string, path: string): string {
  return `${recipeId}::${path}`;
}

export async function getSignedPhotoUrl(
  recipeId: string,
  path: string,
): Promise<string> {
  const key = photoUrlCacheKey(recipeId, path);
  const cached = photoUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  const res = await api<{ url: string; expires_in: number }>(
    `/api/recipes/${recipeId}/photo-url?path=${encodeURIComponent(path)}`,
  );
  photoUrlCache.set(key, {
    url: res.url,
    expiresAt: Date.now() + PHOTO_URL_CACHE_TTL_MS,
  });
  return res.url;
}

/** Invalidate a single cached signed URL — call after the underlying photo
 *  changes (e.g. user uploaded a new one). Pass null `path` to drop every
 *  entry for the recipe. */
export function invalidateSignedPhotoUrl(
  recipeId: string,
  path: string | null = null,
): void {
  if (path) {
    photoUrlCache.delete(photoUrlCacheKey(recipeId, path));
    return;
  }
  for (const key of photoUrlCache.keys()) {
    if (key.startsWith(`${recipeId}::`)) photoUrlCache.delete(key);
  }
}

// --- Phase 27 capture helpers (CAPTURE-03) ---------------------------------
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

/** Phase 27 CAPTURE-03 — POST /api/recipes with empty body. Returns the new
 *  draft Recipe (status='draft', title='Extraction en cours…',
 *  initial_turn_kind=null). Used by the conversational capture flow:
 *  the frontend then POSTs each pending bubble as a /turns request before
 *  calling promoteDraft to trigger the single LLM run. */
export async function createBlankRecipe(): Promise<Recipe> {
  return api<Recipe>("/api/recipes", {
    method: "POST",
    body: "{}",
  });
}

/** Phase 27 CAPTURE-03 / CONTEXT.md D-13b — POST /api/recipes/{id}/promote.
 *  Schedules promote_draft over the full thread. Frontend calls this ONCE
 *  after all per-bubble /turns have landed (ADR-0001 "one Gemini call per
 *  Enregistrer"). */
export async function promoteDraft(
  recipeId: string,
): Promise<{ recipe_id: string; queued: boolean }> {
  return api<{ recipe_id: string; queued: boolean }>(
    `/api/recipes/${recipeId}/promote`,
    { method: "POST" },
  );
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

/** Hard-delete a recipe (and its votes/cooking logs). Returns 204 on success. */
export async function deleteRecipe(recipeId: string): Promise<void> {
  await api<void>(`/api/recipes/${recipeId}`, { method: "DELETE" });
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
