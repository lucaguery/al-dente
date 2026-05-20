"use client";

// Variant A swipe deck container — re-enabled in quick-260520-hpz.
//
// Two-card stack (front + 1 peek per Variant A — NOT 3-deep).
// AnimatePresence keyed on the front recipe ID drives the advance.
// Internal index is derived from unvotedByMe ordering (parent computes it;
// deck just consumes the array).
//
// 03-UI-SPEC.md §Surface 6 + §Surface 7 + §"Interaction Patterns > Swipe deck"

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ShortlistCard, ShortlistThumbButtons } from "@/components/ShortlistCard";
import { postVote, type ShortlistVote } from "@/lib/votes";
import type { Recipe } from "@/lib/recipes";

type Member = { id: string; name: string; color_hex: string };

export type ShortlistDeckProps = {
  shortlistId: string;
  unvotedByMe: Recipe[];         // ordered queue; head = front card
  votes: ShortlistVote[];         // for partner-vote-dot lookup on each card
  me: Member;
  partner: Member;
  onVoteApplied: (vote: ShortlistVote) => void; // optimistic propagation up
};

export function ShortlistDeck({
  shortlistId,
  unvotedByMe,
  votes,
  me,
  partner,
  onVoteApplied,
}: ShortlistDeckProps) {
  const tShortlist = useTranslations("home.shortlist");

  const [rawIndex, setIndex] = useState(0);
  const [committedDirection, setCommittedDirection] = useState<
    "left" | "right" | null
  >(null);
  const [voteInFlight, setVoteInFlight] = useState(false);

  // Clamp index against unvotedByMe.length on every render — no effect needed.
  // (e.g. partner's vote rejected the front card before we voted, shrinking
  // the queue.) This avoids the react-hooks/set-state-in-effect lint rule and
  // mirrors the pattern in React's "you might not need an effect" guide:
  // derive on render rather than syncing state.
  const index =
    rawIndex >= unvotedByMe.length && unvotedByMe.length > 0
      ? 0
      : rawIndex;

  const front = unvotedByMe[index];
  const peek = unvotedByMe[index + 1];

  function getPartnerVote(recipeId: string): "yes" | "no" | "unvoted" {
    const v = votes.find(
      (v) => v.recipe_id === recipeId && v.member_id === partner.id,
    );
    if (!v) return "unvoted";
    return v.vote;
  }

  async function handleVote(value: "yes" | "no") {
    if (!front || voteInFlight) return;
    const direction = value === "yes" ? "right" : "left";
    setCommittedDirection(direction);
    setVoteInFlight(true);
    try {
      const result = await postVote(shortlistId, front.id, value);
      const optimistic: ShortlistVote = {
        shortlist_id: shortlistId,
        recipe_id: front.id,
        member_id: me.id,
        vote: value,
      };
      // Use canonical member_id from server response if available.
      onVoteApplied({ ...optimistic, member_id: result.member_id });
      setIndex((i) => i + 1);
    } catch {
      // Vote failed — snap back; parent surfaces errors via existing toast.
      setCommittedDirection(null);
    } finally {
      setVoteInFlight(false);
    }
  }

  if (!front) return null;

  return (
    <div className="flex flex-col gap-4 px-(--spacing-page-x) pb-6">
      {/* Card stack */}
      <div
        className="relative"
        // Aspect ratio matches 4/3 photo + body content; peek card needs this
        // container to establish stacking context.
        style={{ height: "420px" }}
      >
        <AnimatePresence mode="popLayout">
          {/* Front card */}
          <ShortlistCard
            key={front.id}
            recipe={front}
            partnerVote={getPartnerVote(front.id)}
            partnerName={partner.name}
            partnerColorHex={partner.color_hex}
            onVote={handleVote}
            isFront={true}
            committedDirection={committedDirection}
            peekDepth={1}
          />
          {/* Peek card */}
          {peek && (
            <ShortlistCard
              key={peek.id}
              recipe={peek}
              partnerVote={getPartnerVote(peek.id)}
              partnerName={partner.name}
              partnerColorHex={partner.color_hex}
              onVote={() => {
                /* peek card is not interactive */
              }}
              isFront={false}
              peekDepth={1}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Thumb buttons below the stack */}
      <ShortlistThumbButtons
        onVote={(value) => {
          void handleVote(value);
        }}
        disabled={voteInFlight || !front}
      />

      {/* Aria live region for screen readers */}
      <p className="sr-only" aria-live="polite">
        {front
          ? tShortlist("partner_unvoted_aria", { name: front.title })
          : ""}
      </p>
    </div>
  );
}
