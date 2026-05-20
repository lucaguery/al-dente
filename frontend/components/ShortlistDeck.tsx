"use client";

// Variant A swipe deck container — re-enabled in quick-260520-hpz.
//
// Two-card stack (front + 1 peek per Variant A — NOT 3-deep).
// AnimatePresence keyed on the front recipe ID drives the advance.
// Internal index is derived from unvotedByMe ordering (parent computes it;
// deck just consumes the array).
//
// 03-UI-SPEC.md §Surface 6 + §Surface 7 + §"Interaction Patterns > Swipe deck"

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ShortlistCard, ShortlistThumbButtons } from "@/components/ShortlistCard";
import { ShortlistProgress } from "@/components/ShortlistProgress";
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

  const [committedDirection, setCommittedDirection] = useState<
    "left" | "right" | null
  >(null);
  const [voteInFlight, setVoteInFlight] = useState(false);
  // Quick-260520-hpz — per-position vote history. Drives BOTH the progress
  // strip's voted-yes/voted-no dot coloring AND the "remaining = total -
  // voteHistory.length" math.
  const [voteHistory, setVoteHistory] = useState<Array<"yes" | "no">>([]);
  // Snap-back hint flag — true for ~1.4s after the card shakes, then clears.
  const [snapbackHint, setSnapbackHint] = useState(false);
  // Total dots on the progress strip — captured on first render with a
  // non-zero queue via lazy useState initializer; doesn't shrink as the
  // user advances. React 19 lint forbids reading/writing refs during render.
  const [total] = useState<number>(() => unvotedByMe.length);

  // UAT round 3 — front is ALWAYS unvotedByMe[0]. The parent removes the
  // voted recipe from the array (via onVoteApplied propagating into votes
  // state → myVotes Set → filter), so the next-to-vote naturally shifts to
  // position 0. Previously we ALSO advanced an internal index, which made
  // us skip every other card and reset the progress counter after 3 votes
  // (rawIndex overflow → clamp to 0 → "5 restantes" again). Single source
  // of truth: parent owns the queue, deck just reads the head.
  const front = unvotedByMe[0];
  const peek = unvotedByMe[1];

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
    const recipeId = front.id;

    // quick-260520-hpz UAT round 2 — optimistic advance.
    // Previously we awaited postVote BEFORE setIndex; that left the user
    // staring at a static card for the network round-trip (~200-500ms) and
    // the AnimatePresence fly-off only fired AFTER the server returned.
    // Now: change the key immediately so framer-motion's exit animation
    // starts on the next frame, fire the POST in the background, and only
    // revert if the server rejects.
    setCommittedDirection(direction);
    setVoteInFlight(true);
    const optimistic: ShortlistVote = {
      shortlist_id: shortlistId,
      recipe_id: recipeId,
      member_id: me.id,
      vote: value,
    };
    onVoteApplied(optimistic);
    setVoteHistory((h) => [...h, value]);
    // No index advance — parent's unvotedByMe shrinks via onVoteApplied; the
    // next recipe is at position 0 automatically.

    try {
      const result = await postVote(shortlistId, recipeId, value);
      // Patch the canonical member_id from server if it differs (rare).
      if (result.member_id !== me.id) {
        onVoteApplied({ ...optimistic, member_id: result.member_id });
      }
    } catch {
      // Rare path: roll back local optimistic state. Parent surfaces toast.
      setVoteHistory((h) => h.slice(0, -1));
      setCommittedDirection(null);
    } finally {
      setVoteInFlight(false);
    }
  }

  // Thumb-button echo — wrap the handler to dispatch the card-listened
  // `shortlist:thumb-vote` CustomEvent BEFORE the parent's vote so the
  // ring flashes during the same animation frame as the fly-off.
  function handleThumbVote(value: "yes" | "no") {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("shortlist:thumb-vote", { detail: { value } }),
      );
    }
    void handleVote(value);
  }

  // Snap-back hint — show a marginalia caption for 1.4s when the card
  // shakes (ShortlistCard dispatches `shortlist:snapback` on release-without-commit).
  useEffect(() => {
    function onSnapback() {
      setSnapbackHint(true);
      const id = window.setTimeout(() => setSnapbackHint(false), 1400);
      // Store timer id so we can clear if another snapback arrives mid-flight.
      // We don't bother capturing in a ref — overlapping snapbacks just
      // refresh the visible window which is fine for a transient hint.
      return () => window.clearTimeout(id);
    }
    window.addEventListener("shortlist:snapback", onSnapback);
    return () => window.removeEventListener("shortlist:snapback", onSnapback);
  }, []);

  const yesCount = voteHistory.filter((v) => v === "yes").length;

  if (!front) return null;

  return (
    // quick-260520-hpz UAT round 2 — tightened gap-4 → gap-2 to keep the
    // thumb buttons within thumb's-reach of the card edge.
    <div className="flex flex-col gap-2 px-(--spacing-page-x) pb-6">
      {/* Progress strip — sits above the deck so the user always knows where
          they are in the 5-card walk. UAT round 3: index is now derived from
          voteHistory.length (single source of truth — see handleVote rewrite).
          The strip also doubles as the snap-back hint surface: when snapbackHint
          is true, the caption swaps to "encore un peu" for ~1.4s, then reverts.
          Doing it here instead of below the deck stops the hint from overlapping
          the thumb buttons. */}
      <ShortlistProgress
        total={total}
        index={voteHistory.length}
        yesCount={yesCount}
        voteHistory={voteHistory}
        transientCaption={snapbackHint ? tShortlist("snapback_hint") : null}
      />

      {/* Card stack — viewport-clamped so the thumb buttons stay above the
          BottomNav on every iPhone (UAT 260520 finding: 420px was too tall on
          tall phones, hid the thumbs below the fold).
          DOM order is peek FIRST, front LAST — DOM order = paint order, so the
          opaque front card paints on top of the translucent peek (UAT 260520
          finding: with front first, the peek's title bled through). */}
      <div
        className="relative"
        style={{ height: "clamp(280px, 48dvh, 380px)" }}
      >
        <AnimatePresence mode="popLayout">
          {/* Peek card — rendered FIRST so the front paints on top. */}
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
          {/* Front card — rendered LAST so it paints on top of the peek. */}
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
        </AnimatePresence>
      </div>

      {/* Snap-back hint moved into ShortlistProgress's caption slot (UAT
          round 3) — see transientCaption prop above. Removed the spacer that
          previously caused the hint to overlap the thumb buttons. */}

      {/* Thumb buttons below the stack — wrapped to also dispatch the
          `shortlist:thumb-vote` CustomEvent so the card flashes the ring. */}
      <ShortlistThumbButtons
        onVote={handleThumbVote}
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
