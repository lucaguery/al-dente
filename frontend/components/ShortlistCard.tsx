"use client";

// Phase 3 — single shortlist card on the swipe deck.
//
// - Front card: drag="x" with rotation + overlay opacity (reduced-motion: drag=false, no rotation, no overlays).
// - Peek card: drag={false}, scale 0.94, translate-y 12, opacity 0.6.
// - Vote pathway: swipe past threshold OR tap thumb buttons → onVote(value).
//   Both pathways are equally first-class (D-03).
//
// 03-UI-SPEC.md §Surface 6 + §Surface 7 + §"Interaction Patterns > Swipe deck"

import { useSyncExternalStore } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Heart, X, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberDot } from "@/components/MemberDot";
import {
  SWIPE_OVERLAY_INPUT_PX,
  SWIPE_ROTATE_RANGE_DEG,
  SWIPE_THRESHOLD_PX,
  SWIPE_VELOCITY_PX_S,
} from "@/lib/swipe-tokens";
import { transitions } from "@/lib/motion";
import type { Recipe } from "@/lib/recipes";
import type { VoteValue } from "@/lib/votes";

type PartnerVoteDot = "yes" | "no" | "unvoted";

export type ShortlistCardProps = {
  recipe: Recipe;
  partnerVote: PartnerVoteDot;
  partnerName: string;
  partnerColorHex: string;
  onVote: (value: VoteValue) => void;
  /** True when this is the front card; false for peek (drag disabled, scaled). */
  isFront: boolean;
};

// `prefers-reduced-motion` is an external state that can flip at runtime when
// the user toggles their OS-level setting. Subscribe via useSyncExternalStore
// so we don't call setState inside an effect (react-hooks/set-state-in-effect),
// mirroring the pattern in PushPermissionBanner.tsx.
function subscribePRM(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener?.("change", callback);
  return () => mq.removeEventListener?.("change", callback);
}

function getPRMSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribePRM, getPRMSnapshot, () => false);
}

export function ShortlistCard({
  recipe,
  partnerVote,
  partnerName,
  partnerColorHex,
  onVote,
  isFront,
}: ShortlistCardProps) {
  const t = useTranslations("home.shortlist");
  const reducedMotion = usePrefersReducedMotion();

  const x = useMotionValue(0);
  const rotateInput: [number, number] = [-200, 200];
  const rotateOutput: [number, number] = [
    -SWIPE_ROTATE_RANGE_DEG,
    SWIPE_ROTATE_RANGE_DEG,
  ];
  const rotate = useTransform(x, rotateInput, rotateOutput);
  const yesOpacity = useTransform(
    x,
    [0, SWIPE_OVERLAY_INPUT_PX],
    [0, 1],
  );
  const noOpacity = useTransform(
    x,
    [-SWIPE_OVERLAY_INPUT_PX, 0],
    [1, 0],
  );

  function handleDragEnd(_: unknown, info: PanInfo) {
    const swiped =
      Math.abs(info.offset.x) > SWIPE_THRESHOLD_PX ||
      Math.abs(info.velocity.x) > SWIPE_VELOCITY_PX_S;
    if (!swiped) return; // dragSnapToOrigin returns the card to center
    onVote(info.offset.x > 0 ? "yes" : "no");
  }

  const dragEnabled = isFront && !reducedMotion;
  const cuisine = recipe.cuisine;
  const moods = recipe.mood ?? [];
  const prepTime = recipe.prep_time_minutes;
  const primaryPhoto = recipe.photo_paths?.[0];

  const partnerAriaKey =
    partnerVote === "yes"
      ? "partner_yes_aria"
      : partnerVote === "no"
        ? "partner_no_aria"
        : "partner_unvoted_aria";
  const partnerAria = t(partnerAriaKey, { name: partnerName });

  return (
    <motion.div
      role="article"
      aria-labelledby={`shortlist-card-${recipe.id}-title`}
      drag={dragEnabled ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragSnapToOrigin
      dragElastic={0.6}
      style={
        reducedMotion || !isFront
          ? undefined
          : { x, rotate }
      }
      onDragEnd={dragEnabled ? handleDragEnd : undefined}
      whileTap={dragEnabled ? { cursor: "grabbing" } : undefined}
      transition={isFront && !reducedMotion ? transitions.springSnap : undefined}
      className={
        isFront
          ? "absolute inset-0 paper-grain bg-card border border-border rounded-2xl shadow-card-hover overflow-hidden flex flex-col touch-pan-y"
          : "absolute inset-0 paper-grain bg-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col scale-[0.94] translate-y-3 opacity-60 pointer-events-none"
      }
    >
      {/* Photo region */}
      <div className="relative aspect-[4/3] bg-surface-muted rounded-t-2xl overflow-hidden">
        {primaryPhoto ? (
          // Note: photo_paths are bucket-relative; consumer (Plan 04) supplies signed URLs via
          // a wrapping component if needed. For now, render directly — placeholder behavior.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryPhoto}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <UtensilsCrossed
              size={48}
              className="text-foreground-muted"
              aria-hidden
            />
          </div>
        )}

        {/* Yes / No overlays — only visible while dragging the front card */}
        {isFront && !reducedMotion && (
          <>
            <motion.div
              style={{ opacity: yesOpacity }}
              className="absolute top-6 left-6 rotate-[-15deg] origin-top-left px-3 py-1 rounded-md border-2 border-[var(--color-valide-foreground)] text-[var(--color-valide-foreground)] font-bold text-2xl tracking-wider"
              aria-hidden
            >
              OUI
            </motion.div>
            <motion.div
              style={{ opacity: noOpacity }}
              className="absolute top-6 right-6 rotate-[15deg] origin-top-right px-3 py-1 rounded-md border-2 border-destructive text-destructive font-bold text-2xl tracking-wider"
              aria-hidden
            >
              NON
            </motion.div>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col gap-3 p-5">
        <h2
          id={`shortlist-card-${recipe.id}-title`}
          className="text-title text-foreground line-clamp-2"
        >
          {recipe.title}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {cuisine && <Badge variant="secondary">{cuisine}</Badge>}
          {moods.map((m) => (
            <Badge key={m} variant="secondary">
              {m}
            </Badge>
          ))}
          {prepTime != null && (
            <span className="text-sm font-medium text-foreground-muted">
              {prepTime} min
            </span>
          )}
        </div>
      </div>

      {/* Partner-vote dot footer */}
      <div
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/70 backdrop-blur-sm"
        aria-label={partnerAria}
      >
        {partnerVote === "yes" ? (
          <MemberDot colorHex={partnerColorHex} size={10} />
        ) : partnerVote === "no" ? (
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted/40" />
        )}
        <span className="text-xs font-medium text-foreground-muted">
          {partnerName}
        </span>
      </div>

      {/* Thumb buttons row — sit OUTSIDE the card; Plan 04 places them under the deck.
          We expose ShortlistThumbButtons as a sibling component below. */}
    </motion.div>
  );
}

/** Stand-alone thumb buttons component. Used by Plan 04's deck container under the stack. */
export function ShortlistThumbButtons({
  onVote,
  disabled,
}: {
  onVote: (value: VoteValue) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("home.shortlist");
  return (
    <div className="flex items-center justify-center gap-12">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => onVote("no")}
        aria-label={t("vote_no_aria")}
        className="h-14 w-14 rounded-full border-2 border-destructive/50 hover:bg-destructive/10 active:scale-95 transition-transform"
      >
        <X size={24} className="text-destructive" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => onVote("yes")}
        aria-label={t("vote_yes_aria")}
        className="h-14 w-14 rounded-full border-2 border-[var(--color-valide-border)] hover:bg-[color-mix(in_srgb,var(--color-valide-foreground)_10%,transparent)] active:scale-95 transition-transform"
      >
        <Heart size={24} className="text-[var(--color-valide-foreground)]" />
      </Button>
    </div>
  );
}
