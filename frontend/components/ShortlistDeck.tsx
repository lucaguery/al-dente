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
import { toast } from "sonner";
import { ShortlistCard, ShortlistThumbButtons } from "@/components/ShortlistCard";
import { ShortlistProgress } from "@/components/ShortlistProgress";
import { deleteVote, postVote, type ShortlistVote } from "@/lib/votes";
import { fetchCookingLogs, type CookingLogResponse } from "@/lib/cooking";
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
  const tUndo = useTranslations("home.shortlist.undo");

  const [committedDirection, setCommittedDirection] = useState<
    "left" | "right" | null
  >(null);
  const [voteInFlight, setVoteInFlight] = useState(false);
  // Quick-260520-hpz — per-position vote history. Drives BOTH the progress
  // strip's voted-yes/voted-no dot coloring AND the "remaining = total -
  // voteHistory.length" math.
  const [voteHistory, setVoteHistory] = useState<Array<"yes" | "no">>([]);
  // Phase 41 UNDO-03 — local copy of today's cooking_logs so the deck can
  // compute vetoWindowOpen without prop-drilling from HomeDecide. If any
  // CookingLog exists for today's shortlist, the veto window is closed
  // (D-12 — the frontend tooltip is preemptive; the backend 409 is
  // defense-in-depth).
  const [cookingLogs, setCookingLogs] = useState<CookingLogResponse[]>([]);
  // Phase 41 UNDO-02 — track the last vote id we POSTed so the undo
  // button has something to DELETE. Indexed by recipe_id (one vote per
  // current member per recipe). Populated from postVote() response and
  // mirrored optimistically when a vote lands.
  const [voteIdByRecipe, setVoteIdByRecipe] = useState<
    Record<string, string>
  >({});
  // Last recipe the local user just voted on this session — drives the undo
  // affordance independently of which card is currently front. Without this,
  // undo always targeted `front.id`, which is the NEXT card (queue advanced
  // optimistically), so the button was effectively dead.
  const [lastVotedRecipeId, setLastVotedRecipeId] = useState<string | null>(
    null,
  );
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
      // Phase 41 UNDO-02 — capture vote_id so the undo button has a target.
      if (result.vote_id) {
        setVoteIdByRecipe((prev) => ({ ...prev, [recipeId]: result.vote_id }));
      }
      // Promote this recipe to the undo target. Done AFTER the server returns
      // so we don't surface an undo button for a vote that never landed.
      setLastVotedRecipeId(recipeId);
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

  // Phase 41 UNDO-03 — initial cooking-log fetch + listen for cooking.started
  // window events so the veto-window state updates without a page refresh.
  // The existing RealtimeProvider re-fires WS frames as window CustomEvents
  // for cross-component sync (similar to shortlist:thumb-vote).
  useEffect(() => {
    let alive = true;
    fetchCookingLogs(1)
      .then((logs) => {
        if (alive) setCookingLogs(logs);
      })
      .catch(() => {
        if (alive) setCookingLogs([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Undo target — the recipe the user most recently voted on (regardless of
  // which card is currently front). Previously this looked at `front.id`,
  // but the queue advances optimistically on vote so the front is always the
  // NEXT card; undo never had anything to delete in practice.
  const undoVoteId = lastVotedRecipeId
    ? voteIdByRecipe[lastVotedRecipeId]
    : undefined;
  const vetoWindowOpen = cookingLogs.length === 0;
  const canUndo =
    !!lastVotedRecipeId && !!undoVoteId && vetoWindowOpen && !voteInFlight;

  async function handleUndo() {
    if (!lastVotedRecipeId || !undoVoteId || !canUndo) return;
    const recipeId = lastVotedRecipeId;
    setVoteInFlight(true);
    try {
      await deleteVote(undoVoteId);
      // Optimistic local cleanup: pop voteHistory, drop the vote_id mapping,
      // clear the undo target.
      setVoteHistory((h) => h.slice(0, -1));
      setVoteIdByRecipe((prev) => {
        const next = { ...prev };
        delete next[recipeId];
        return next;
      });
      setLastVotedRecipeId(null);
      // Tell the parent to drop the vote from its state. The parent reads the
      // `deleted` flag and filters the row out instead of re-appending it.
      // Once the vote is gone from shortlist.votes, the derived `unvotedByMe`
      // re-includes the recipe at its original position → it becomes the new
      // front card automatically.
      onVoteApplied({
        shortlist_id: shortlistId,
        recipe_id: recipeId,
        member_id: me.id,
        vote: "yes",
        deleted: true,
      } as ShortlistVote & { deleted: true });
      // Cross-component sync hook (mirrors the realtime path).
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("shortlist:vote-undo", {
            detail: {
              vote_id: undoVoteId,
              recipe_id: recipeId,
              member_id: me.id,
            },
          }),
        );
      }
    } catch (err) {
      // D-12 race: backend 409 fires when a partner finalized a CookingLog
      // between page load and undo tap. Re-fetch cookingLogs so the button
      // disables on next render, then surface the localized toast.
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("409")) {
        toast.error(tUndo("race_toast"));
        try {
          const logs = await fetchCookingLogs(1);
          setCookingLogs(logs);
        } catch {
          /* defensive — if the refetch fails the user will reload */
        }
      } else {
        toast.error(tUndo("generic_error"));
      }
    } finally {
      setVoteInFlight(false);
    }
  }

  const yesCount = voteHistory.filter((v) => v === "yes").length;

  if (!front) return null;

  return (
    // `flex-1 min-h-0` makes the deck fill all available vertical space below
    // the header so the card grows with the viewport instead of leaving a
    // dead band of off-white above the BottomNav.
    <div className="flex flex-col flex-1 min-h-0 gap-2 px-(--spacing-page-x) pb-4">
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
      <div className="relative flex-1 min-h-0">
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
          `shortlist:thumb-vote` CustomEvent so the card flashes the ring.
          Phase 41 UNDO-02 — 3-button layout now; middle button is the undo. */}
      <ShortlistThumbButtons
        onVote={handleThumbVote}
        onUndo={handleUndo}
        canUndo={canUndo}
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
