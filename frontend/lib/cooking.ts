// Phase 3 cooking-log client. Mirrors backend/app/schemas/cooking_log.py.

import { api } from "@/lib/api";

export type CookingLogResponse = {
  id: string;
  recipe_id: string;
  household_id: string;
  cooked_by_member_id: string;
  cooked_at: string;
  photo_paths: string[];
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

// --- Phase 4 — finalize + photo helpers (COOK-03 / COOK-04) ----------------
//
// Backend contract (Plan 04-01):
//   PUT  /api/cooking-logs/{id}              — finalize log (rating REQUIRED)
//   POST /api/cooking-logs/{id}/photos       — multipart upload (max 4)
//   GET  /api/cooking-logs/{id}/photo-url    — 5-min signed URL scoped to log

export type LogRating = "loved" | "liked" | "disliked";

export type CookingLogFinalizeRequest = {
  photo_paths: string[]; // server validates subset of paths uploaded to this log
  rating: LogRating; // REQUIRED — D-03 + Plan 01 backend gate
  notes: string | null;
};

/** COOK-03 — PUT /api/cooking-logs/{id}. Returns the finalized log. */
export async function putFinalizeCookingLog(
  logId: string,
  body: CookingLogFinalizeRequest,
): Promise<CookingLogResponse> {
  return api<CookingLogResponse>(`/api/cooking-logs/${logId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** Upload a single photo to a cooking log. Throws an Error with `.status`
 *  attached on non-2xx so callers can map status -> i18n key. */
export async function uploadCookingLogPhoto(
  logId: string,
  file: File,
): Promise<CookingLogResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const res = await fetch(`${API_BASE}/api/cooking-logs/${logId}/photos`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    const e = new Error(`${res.status}`);
    (e as Error & { status: number }).status = res.status;
    throw e;
  }
  return (await res.json()) as CookingLogResponse;
}

/** Mint a 5-minute signed URL for a cooking-log photo path. */
export async function getCookingLogSignedPhotoUrl(
  logId: string,
  path: string,
): Promise<string> {
  const data = await api<{ url: string; expires_in: number }>(
    `/api/cooking-logs/${logId}/photo-url?path=${encodeURIComponent(path)}`,
  );
  return data.url;
}
