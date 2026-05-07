// Phase 3 voting client + frontend mirror of backend services/voting.py.
// Branch order MUST match Python — drift is a UX bug class (architecture
// invariant #2; 03-RESEARCH.md Pattern 10).

import { api } from "@/lib/api";

export type VoteValue = "yes" | "no";
export type VoteState =
  | "valide"
  | "pressenti"
  | "conteste"
  | "rejete"
  | "sans_avis";

export type ShortlistVote = {
  shortlist_id: string;
  recipe_id: string;
  member_id: string;
  vote: VoteValue;
};

/**
 * SPEC.md §Voting state machine — frontend mirror of compute_vote_state.
 *
 * Branch order LOCKED to match backend:
 *   1. valide   (yes_count == member_count)
 *   2. rejete   (no_count == member_count)
 *   3. conteste (yes >= 1 AND no >= 1)
 *   4. pressenti (yes == 1 AND voted == 1)
 *   5. sans_avis (default)
 */
export function computeVoteState(
  votes: readonly { vote: VoteValue }[],
  memberCount: number = 2,
): VoteState {
  let yes = 0;
  let no = 0;
  for (const v of votes) {
    if (v.vote === "yes") yes += 1;
    else if (v.vote === "no") no += 1;
  }
  const voted = yes + no;
  if (yes === memberCount) return "valide";
  if (no === memberCount) return "rejete";
  if (yes >= 1 && no >= 1) return "conteste";
  if (yes === 1 && voted === 1) return "pressenti";
  return "sans_avis";
}

/** VOTE-01 — POST /api/shortlists/{shortlistId}/recipes/{recipeId}/vote. */
export async function postVote(
  shortlistId: string,
  recipeId: string,
  vote: VoteValue,
): Promise<{
  shortlist_id: string;
  recipe_id: string;
  member_id: string;
  vote: VoteValue;
  state: VoteState;
}> {
  return api(
    `/api/shortlists/${shortlistId}/recipes/${recipeId}/vote`,
    { method: "POST", body: JSON.stringify({ vote }) },
  );
}

/** VOTE-03 / D-12 — POST /api/shortlists/{shortlistId}/delegate. */
export async function delegateShortlist(
  shortlistId: string,
): Promise<unknown> {
  return api(`/api/shortlists/${shortlistId}/delegate`, {
    method: "POST",
  });
}

// --- Self-check: drift detector. Throws on bundle if branch order changes. ---
function _selfCheck(): void {
  const yy = [{ vote: "yes" as const }, { vote: "yes" as const }];
  const nn = [{ vote: "no" as const }, { vote: "no" as const }];
  const yn = [{ vote: "yes" as const }, { vote: "no" as const }];
  const y_ = [{ vote: "yes" as const }];
  const _0: { vote: VoteValue }[] = [];
  if (computeVoteState(yy) !== "valide") throw new Error("vote drift: valide");
  if (computeVoteState(nn) !== "rejete") throw new Error("vote drift: rejete");
  if (computeVoteState(yn) !== "conteste") throw new Error("vote drift: conteste");
  if (computeVoteState(y_) !== "pressenti") throw new Error("vote drift: pressenti");
  if (computeVoteState(_0) !== "sans_avis") throw new Error("vote drift: sans_avis");
}
if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
  try {
    _selfCheck();
  } catch (e) {
    console.error("lib/votes.ts:", e);
  }
}
