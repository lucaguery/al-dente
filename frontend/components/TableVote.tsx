"use client";

// Phase 32 §15.C — Table-à-manger voting scene.
// Renders the round table + per-seat states derived from individual votes.
// Per CONTEXT D-05, D-19 (invariant #2 — voting state COMPUTED, not stored).
// Per UI-SPEC §7.2 + RESEARCH Pattern 4.
//
// Per-seat state derivation rules (couple-scale, N=2):
//   - aggregate = computeVoteState(votes, members.length) from lib/votes.ts
//   - per-seat = derived from each member's individual vote:
//     - valide aggregate → both seats = seat-state-valide
//     - rejete aggregate → both seats = seat-state-rejected (with directional push)
//     - conteste aggregate (1 yes + 1 no) → yes voter = seat-state-valide,
//                                            no voter = seat-state-contested (per UI-SPEC §7.2 + A6 resolution)
//     - pressenti aggregate → yes voter = seat-state-pressenti, others = neutral
//     - sans_avis aggregate → all seats = seat-state-neutral

import type { CSSProperties } from "react";
import { computeVoteState, type ShortlistVote } from "@/lib/votes";

export type HouseholdMemberLite = {
  id: string;
  name: string;
  color_hex: string;
};

export type TableVoteSize = "ts-90" | "ts-72" | "ts-56";

export interface TableVoteProps {
  votes: readonly ShortlistVote[];
  members: readonly HouseholdMemberLite[];
  myMemberId: string;
  size?: TableVoteSize;
  className?: string;
}

type SeatPosition = "north" | "south" | "east" | "west";

type SeatPlan = {
  position: SeatPosition;
  member: HouseholdMemberLite;
};

function memberInitial(member: HouseholdMemberLite): string {
  return (member.name?.[0] ?? "?").toUpperCase();
}

function memberSlot(
  colorHex: string,
): "rose" | "amber" | "emerald" | "sky" | "violet" {
  // Cheap mapping by hex prefix; MEMBER_COLORS in lib/colors.ts is the
  // canonical map, but a direct switch keeps TableVote self-contained.
  // Order matches the desaturated sober palette from §15.A.
  const hex = colorHex.toUpperCase();
  if (hex === "#C0364A" || hex === "#F43F5E") return "rose";
  if (hex === "#C98512" || hex === "#F59E0B") return "amber";
  if (hex === "#0D8A64" || hex === "#10B981") return "emerald";
  if (hex === "#0879AD" || hex === "#0EA5E9") return "sky";
  if (hex === "#6E46C1" || hex === "#8B5CF6") return "violet";
  return "rose";
}

function seatStateClass(
  aggregate: ReturnType<typeof computeVoteState>,
  memberVote: "yes" | "no" | undefined,
  totalMembers: number,
): string {
  if (aggregate === "valide") return "seat-state-valide";
  if (aggregate === "rejete") return "seat-state-rejected";
  if (aggregate === "conteste") {
    if (memberVote === "yes") return "seat-state-valide";
    if (memberVote === "no") return "seat-state-contested";
    return "seat-state-neutral";
  }
  if (aggregate === "pressenti") {
    if (memberVote === "yes") return "seat-state-pressenti";
    return "seat-state-neutral";
  }
  // sans_avis or fallback
  void totalMembers;
  return "seat-state-neutral";
}

export function TableVote({
  votes,
  members,
  myMemberId,
  size = "ts-90",
  className,
}: TableVoteProps) {
  const me = members.find((m) => m.id === myMemberId);
  const others = members.filter((m) => m.id !== myMemberId);
  const aggregate = computeVoteState(
    votes.map((v) => ({ vote: v.vote })),
    members.length,
  );

  // Couple-scale (N=2): me = north, partner = south. Larger N: east+west used.
  const plan: SeatPlan[] = [];
  if (me) plan.push({ position: "north", member: me });
  if (others[0]) plan.push({ position: "south", member: others[0] });
  if (others[1]) plan.push({ position: "east", member: others[1] });
  if (others[2]) plan.push({ position: "west", member: others[2] });

  return (
    <div
      className={`table-scene ${size} ${className ?? ""}`.trim()}
      aria-label={`Vote: ${aggregate}`}
      role="img"
    >
      <div className="table-plate" aria-hidden />
      {plan.map(({ position, member }) => {
        const memberVote = votes.find((v) => v.member_id === member.id)?.vote;
        const stateClass = seatStateClass(aggregate, memberVote, members.length);
        const slot = memberSlot(member.color_hex);
        const seatStyle: CSSProperties = {
          background: `var(--color-member-${slot}-bg)`,
          color: `var(--color-member-${slot}-foreground)`,
        };
        return (
          <span
            key={member.id}
            className={`table-seat seat-${position} ${stateClass}`}
            style={seatStyle}
            aria-label={`${member.name}: ${memberVote ?? "sans avis"}`}
          >
            {memberInitial(member)}
          </span>
        );
      })}
    </div>
  );
}

export default TableVote;
