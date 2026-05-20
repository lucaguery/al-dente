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
import { Marginalia } from "@/components/Marginalia";
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
  // Quick-260520-hpz — per-position vote history (drives the progress strip's
  // voted-yes vs voted-no dot color). The strip is decorative; we don't need
  // to reconcile this with `votes` because the server propagates back on
  // vote.created and we'd already have advanced the index optimistically.
  const [voteHistory, setVoteHistory] = useState<Array<"yes" | "no">>([]);
  // Snap-back hint flag — true for ~1.4s after the card shakes, then clears.
  const [snapbackHint, setSnapbackHint] = useState(false);
  // Total dots on the progress strip — captured on first render with a
  // non-zero queue via lazy useState initializer; doesn't shrink as the
  // user advances. Using state (not ref) because React 19's react-hooks/refs
  // rule forbids reading/writing refs during render.
  const [total] = useState<number>(() => unvotedByMe.length);

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
    setIndex((i) => i + 1);

    try {
      const result = await postVote(shortlistId, recipeId, value);
      // Patch the canonical member_id from server if it differs (rare).
      if (result.member_id !== me.id) {
        onVoteApplied({ ...optimistic, member_id: result.member_id });
      }
    } catch {
      // Rare path: surface a soft revert. The toast component is owned
      // by the parent (HomeDecide already surfaces vote errors), so here
      // we just roll back the local optimistic state.
      setVoteHistory((h) => h.slice(0, -1));
      setIndex((i) => Math.max(0, i - 1));
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
          they are in the 5-card walk. */}
      <ShortlistProgress
        total={total}
        index={index}
        yesCount={yesCount}
        voteHistory={voteHistory}
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

      {/* Snap-back hint — transient marginalia caption ~1.4s after a
          release-without-commit shake. quick-260520-hpz UAT round 2:
          absolute-positioned so it does NOT reserve vertical space when
          empty (previously the min-h-[1.5rem] container pushed the thumbs
          further from the card). */}
      <div className="relative h-0">
        {snapbackHint && (
          <div className="absolute left-0 right-0 top-1 flex justify-center pointer-events-none">
            <Marginalia size="sm" slant>
              {tShortlist("snapback_hint")}
            </Marginalia>
          </div>
        )}
      </div>

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
