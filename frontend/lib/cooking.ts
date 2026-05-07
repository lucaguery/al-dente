// Phase 3 cooking-log client. Mirrors backend/app/schemas/cooking_log.py.

import { api } from "@/lib/api";

export type CookingLogResponse = {
  id: string;
  recipe_id: string;
  household_id: string;
  cooked_by_member_id: string;
  cooked_at: string;
  rating: "loved" | "liked" | "disliked" | null;
  notes: string | null;
};

/** COOK-01 — POST /api/recipes/{recipeId}/cook. Returns the new immutable log. */
export async function postStartCooking(
  recipeId: string,
): Promise<CookingLogResponse> {
  return api<CookingLogResponse>(`/api/recipes/${recipeId}/cook`, {
    method: "POST",
  });
}

/** COOK-02 — GET /api/cooking-logs/active. Null if no active session today. */
export async function getActiveCookingLog(): Promise<CookingLogResponse | null> {
  return api<CookingLogResponse | null>("/api/cooking-logs/active");
}
