"use client";

// Phase 3 — shortlist swipe deck. Renders up to 2 visible cards (front + peek)
// and owns:
//   1. The visible-card index (which recipe is on top of the stack).
//   2. Optimistic vote handling: the deck advances BEFORE the POST resolves.
//   3. Roll-back on POST failure: the index reverts and a Sonner toast surfaces.
//
// We delegate vote-state reconciliation to the parent (HomeDecide) by calling
// `onVoteApplied(vote)` synchronously with the optimistic vote; the parent
// updates its `votes[]` slice. The eventual `vote.created` echo from the
// backend will overwrite the optimistic row with the canonical one — that's
// the source-of-truth handshake.
//
// 03-UI-SPEC.md §"Surface 5: Shortlist deck container" + §"Interaction
// Patterns > Optimistic UI for vote → realtime path".

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ShortlistCard,
  ShortlistThumbButtons,
} from "@/components/ShortlistCard";
import { postVote, type ShortlistVote, type VoteValue } from "@/lib/votes";
import type { Recipe } from "@/lib/recipes";

/** Direction of the most-recent vote commit, used to animate the front
 *  card's `exit` regardless of whether the user swiped or tapped a thumb.
 *  Reset to `null` after the new front card mounts so subsequent renders
 *  don't accidentally re-trigger the exit transform. */
export type CommittedDirection = "left" | "right" | null;

export type DeckMember = {
  id: string;
  name: string;
  color_hex: string;
};

export type ShortlistDeckProps = {
  shortlistId: string;
  /** Recipes the local user has NOT yet voted on (rejete-filtered upstream). */
  recipes: Recipe[];
  /** All votes for this shortlist (so we can resolve the partner's dot). */
  votes: ShortlistVote[];
  me: DeckMember;
  partner: DeckMember;
  /** Called synchronously with the optimistic vote so the parent can update
   *  its votes[] without waiting for the network round-trip. */
  onVoteApplied: (vote: ShortlistVote) => void;
};

function partnerVoteFor(
  votes: ShortlistVote[],
  recipeId: string,
  partnerId: string,
): "yes" | "no" | "unvoted" {
  const v = votes.find(
    (x) => x.recipe_id === recipeId && x.member_id === partnerId,
  );
  if (!v) return "unvoted";
  return v.vote;
}

export function ShortlistDeck({
  shortlistId,
  recipes,
  votes,
  me,
  partner,
  onVoteApplied,
}: ShortlistDeckProps) {
  const t = useTranslations("home.shortlist");
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);
  // bug 1 + 3 fix: track the direction of the most-recent commit so the
  // front card can apply a directional `exit` regardless of whether the
  // vote came from a swipe or a thumb-button tap. Reset after the new
  // front card mounts (effect below) so a stale value never leaks into
  // the next render's exit variant.
  const [committedDirection, setCommittedDirection] =
    useState<CommittedDirection>(null);

  // recipes is the unvoted slice from HomeDecide (filtered each render). We
  // always read from the head — the deck advance happens via the parent's
  // filter when the optimistic vote lands in votes[]. No local index.
  const remaining = recipes;

  // NOTE: `committedDirection` is set fresh inside handleVote() at the start
  // of every vote and ONLY drives the front card's `exit` variant. The new
  // front card's `initial`/`animate` ignore it (peek-promotion is the same
  // regardless of which direction the previous card flew). We deliberately
  // don't reset it via useEffect — React 19's set-state-in-effect rule
  // flags that pattern as cascading-render, and it's unnecessary here:
  // every commit overwrites the value before the next exit reads it.

  if (remaining.length === 0) {
    // Caller renders VoteSummary in this case; the deck only owns the active
    // voting phase. Returning null keeps the layout chain honest.
    return null;
  }
  const current = remaining[0];
  const next = remaining[1];
  // Render up to two peeks for a real pile look — the deeper peek sits behind
  // the closer one and barely shows around the edges. Drives the
  // pile-of-cards feel called out in the user complaint.
  const nextNext = remaining[2];

  async function handleVote(value: VoteValue) {
    // T-03-04-08 mitigation: only one POST in flight at a time. Rapid swipes
    // / button taps are gated by `submittingFor`.
    if (submittingFor) return;
    const recipeId = current.id;
    setSubmittingFor(recipeId);
    const optimistic: ShortlistVote = {
      shortlist_id: shortlistId,
      recipe_id: recipeId,
      member_id: me.id,
      vote: value,
    };
    // Set the exit direction BEFORE the optimistic vote so the exiting card
    // sees a non-null direction in the same AnimatePresence cycle that
    // unmounts it (yes → right, no → left).
    setCommittedDirection(value === "yes" ? "right" : "left");
    // onVoteApplied updates the parent's votes[] synchronously; HomeDecide
    // then re-filters `unvotedByMe` and re-passes recipes here without the
    // just-voted card. That filter IS the deck's advance — we deliberately
    // do NOT also bump a local index, otherwise the next render slices off
    // an extra recipe and the user skips a card. On POST failure the
    // optimistic row lingers in votes[] until the vote.created event
    // overwrites it or the user retries; the deck stays on the post-vote
    // front card either way (no rollback to a previous-index state needed).
    onVoteApplied(optimistic);
    try {
      await postVote(shortlistId, recipeId, value);
    } catch {
      toast.error(t("vote_failed"));
    } finally {
      setSubmittingFor(null);
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 pt-4 pb-8 gap-6">
      <div className="relative w-full max-w-sm aspect-[3/4]">
        {nextNext && (
          <ShortlistCard
            key={`peek2-${nextNext.id}`}
            recipe={nextNext}
            partnerVote={partnerVoteFor(votes, nextNext.id, partner.id)}
            partnerName={partner.name}
            partnerColorHex={partner.color_hex}
            onVote={() => {}}
            isFront={false}
            peekDepth={2}
          />
        )}
        {next && (
          <ShortlistCard
            key={`peek-${next.id}`}
            recipe={next}
            partnerVote={partnerVoteFor(votes, next.id, partner.id)}
            partnerName={partner.name}
            partnerColorHex={partner.color_hex}
            onVote={() => {}}
            isFront={false}
            peekDepth={1}
          />
        )}
        <AnimatePresence mode="wait">
          <ShortlistCard
            key={`front-${current.id}`}
            recipe={current}
            partnerVote={partnerVoteFor(votes, current.id, partner.id)}
            partnerName={partner.name}
            partnerColorHex={partner.color_hex}
            onVote={handleVote}
            isFront={true}
            committedDirection={committedDirection}
          />
        </AnimatePresence>
      </div>
      <ShortlistThumbButtons
        onVote={handleVote}
        disabled={submittingFor !== null}
      />
    </div>
  );
}
