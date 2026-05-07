// Phase 3 shortlist client. Wire shapes mirror backend/app/schemas/shortlist.py.

import { api } from "@/lib/api";
import type { Recipe } from "@/lib/recipes";
import type { ShortlistVote } from "@/lib/votes";

export type ShortlistFilters = {
  cuisine?: string;
  max_prep_time?: number;
  exclude_protein?: string;
  required_moods?: string[];
};

export type ShortlistResponse = {
  shortlist_id: string;
  date: string; // YYYY-MM-DD
  generation: number;
  recipes: Recipe[];
  votes: ShortlistVote[];
};

/** SHORTLIST-05 — GET /api/shortlists/today. Null if no row exists. */
export async function fetchTodayShortlist(): Promise<ShortlistResponse | null> {
  return api<ShortlistResponse | null>("/api/shortlists/today");
}

/** SHORTLIST-02 — POST /api/shortlists/regenerate with optional filters. */
export async function regenerateShortlist(
  filters?: ShortlistFilters,
): Promise<ShortlistResponse> {
  const body: Record<string, unknown> = {};
  if (filters?.cuisine) body.cuisine = filters.cuisine;
  if (filters?.max_prep_time != null) body.max_prep_time = filters.max_prep_time;
  if (filters?.exclude_protein) body.exclude_protein = filters.exclude_protein;
  if (filters?.required_moods?.length) body.required_moods = filters.required_moods;
  return api<ShortlistResponse>("/api/shortlists/regenerate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
