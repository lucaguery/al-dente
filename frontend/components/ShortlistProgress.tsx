"use client";

// Quick-260520-hpz — progress strip above the swipe deck.
// Five dots in a horizontal flex row + marginalia caption below.
//
// Dot states:
//   - Voted (index < current) → solid bg-muted-foreground/40 (rejete tokens
//     are NOT introduced by this plan; the partner-unvoted dot uses the same
//     muted token, so reuse it for both yes/no voted dots — the strip carries
//     "position in queue," not "what I voted")
//   - Voted-yes (index < current AND yes) → solid var(--color-valide) (mono-terracotta saturated)
//   - Current (index === current) → pill (wider, rounded-full, bg-primary)
//   - Future (index > current) → empty ring (border border-border)
//
// Caption (Marginalia size="sm" slant): "progress_initial" before any vote,
// "progress_partial" mid-flight. Never the "progress_complete" variant here —
// the terminal state is the VoteSummary panel.

import { useTranslations } from "next-intl";

export type ShortlistProgressProps = {
  /** Total dots to render (typically 5 = the shortlist size). */
  total: number;
  /** Zero-based count of votes recorded; dots 0..index-1 are voted, dot index is current. */
  index: number;
  /** Number of yes-votes accumulated so far (drives caption text). */
  yesCount: number;
  /** Per-position vote outcome ("yes" | "no" | undefined) for dots already voted. */
  voteHistory?: ReadonlyArray<"yes" | "no">;
  /**
   * Transient caption override (UAT-260520-hpz round 3). When non-null, replaces
   * the progress caption for the duration of a transient event — e.g. the
   * snap-back hint after a release-without-commit. Reverts to the derived
   * caption when the parent clears the prop.
   */
  transientCaption?: string | null;
};

export function ShortlistProgress({
  total,
  index,
  yesCount,
  voteHistory = [],
  transientCaption = null,
}: ShortlistProgressProps) {
  const tShortlist = useTranslations("home.shortlist");

  const remaining = Math.max(0, total - index);

  // Caption — initial (no votes yet) vs partial (mid-flight) vs transient.
  const derivedCaption =
    index === 0 && yesCount === 0
      ? tShortlist("progress_initial")
      : tShortlist("progress_partial", { remaining, yes: yesCount });
  const caption = transientCaption ?? derivedCaption;

  // Render `total` dots; we render at least 1 even if total === 0 to avoid
  // an empty flex row collapsing the layout.
  const dotCount = Math.max(1, total);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex items-center gap-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(index, total)}
      >
        {Array.from({ length: dotCount }).map((_, i) => {
          if (i < index) {
            // Voted slot — solid dot. Yes votes use the terracotta valide hue;
            // no votes use the muted token (rejete-equivalent without
            // introducing a new token in this plan).
            const wasYes = voteHistory[i] === "yes";
            return (
              <span
                key={i}
                aria-hidden
                className={
                  wasYes
                    ? "h-2 w-2 rounded-full bg-[var(--color-valide-foreground)]"
                    : "h-2 w-2 rounded-full bg-muted-foreground/40"
                }
              />
            );
          }
          if (i === index) {
            // Current slot — pill.
            return (
              <span
                key={i}
                aria-hidden
                className="h-2 w-6 rounded-full bg-primary"
              />
            );
          }
          // Future slot — empty ring.
          return (
            <span
              key={i}
              aria-hidden
              className="h-2 w-2 rounded-full border border-border"
            />
          );
        })}
      </div>
      <span className="text-caption">{caption}</span>
    </div>
  );
}
