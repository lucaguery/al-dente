"use client";

// Phase 3 — "Tout vu" summary state. Shows after all cards are voted on.
//
// CTA logic tree (03-UI-SPEC.md §Surface 8):
//   - If ≥1 Validé: show "Je commence à cuisiner" primary
//   - Else if ≥1 Pressenti: show "Tu décides" primary
//   - Else: show "Tu décides" + "Régénérer le shortlist" both
//   - Always: regenerate ghost button at the bottom (opens RegenerateSheet)

import { useMemo } from "react";
import { ChefHat, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MemberDot } from "@/components/MemberDot";
import {
  computeVoteState,
  type ShortlistVote,
  type VoteState,
} from "@/lib/votes";
import type { Recipe } from "@/lib/recipes";

export type VoteSummaryMember = {
  id: string;
  name: string;
  color_hex: string;
};

export type VoteSummaryProps = {
  recipes: Recipe[];
  votes: ShortlistVote[];
  me: VoteSummaryMember;
  partner: VoteSummaryMember;
  memberCount?: number;
  onCookStart: (recipeId: string) => void;
  onDelegate: () => void;
  onRegenerate: () => void;
  cookInFlight?: boolean;
  delegateInFlight?: boolean;
};

type RowState = {
  recipe: Recipe;
  state: VoteState;
  myVote: "yes" | "no" | undefined;
  partnerVote: "yes" | "no" | undefined;
};

function stateClass(state: VoteState): string {
  switch (state) {
    case "valide":
      return "text-emerald-700 dark:text-emerald-300";
    case "pressenti":
      return "text-amber-700 dark:text-amber-300";
    default:
      return "text-foreground-muted";
  }
}

function rowBgClass(state: VoteState): string {
  return state === "valide"
    ? "bg-valide-tint border-emerald-500/30"
    : "bg-card border-border";
}

export function VoteSummary({
  recipes,
  votes,
  me,
  partner,
  memberCount = 2,
  onCookStart,
  onDelegate,
  onRegenerate,
  cookInFlight,
  delegateInFlight,
}: VoteSummaryProps) {
  const t = useTranslations("home.summary");
  const tState = useTranslations("vote.state");

  // D-06: rejete recipes are NOT rendered. Filter them out.
  const rows: RowState[] = useMemo(() => {
    return recipes
      .map<RowState>((recipe) => {
        const recipeVotes = votes.filter((v) => v.recipe_id === recipe.id);
        const state = computeVoteState(recipeVotes, memberCount);
        const myVote = recipeVotes.find((v) => v.member_id === me.id)?.vote;
        const partnerVote = recipeVotes.find(
          (v) => v.member_id === partner.id,
        )?.vote;
        return { recipe, state, myVote, partnerVote };
      })
      .filter((r) => r.state !== "rejete");
  }, [recipes, votes, me.id, partner.id, memberCount]);

  const validatedRow = rows.find((r) => r.state === "valide");
  const pressentiRow = rows.find((r) => r.state === "pressenti");

  function dotForVote(vote: "yes" | "no" | undefined, colorHex: string) {
    if (vote === "yes") {
      return <MemberDot colorHex={colorHex} size={10} />;
    }
    if (vote === "no") {
      return (
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
      );
    }
    return (
      <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted/40" />
    );
  }

  return (
    <div className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-6">
      <h2 className="text-xl font-semibold leading-7">{t("heading")}</h2>

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={row.recipe.id}
            className={`flex items-center gap-3 px-3 py-3 min-h-14 rounded-xl border ${rowBgClass(row.state)}`}
          >
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <span className="text-base font-semibold leading-6 line-clamp-1">
                {row.recipe.title}
              </span>
              <span
                className={`text-sm font-medium leading-5 ${stateClass(row.state)}`}
              >
                {tState(row.state)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {dotForVote(row.myVote, me.color_hex)}
              {dotForVote(row.partnerVote, partner.color_hex)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-4">
        {validatedRow ? (
          <>
            <p className="text-base font-medium text-foreground">
              {t("intro_validated")}
            </p>
            <p className="text-title line-clamp-1">
              {validatedRow.recipe.title}
            </p>
            <Button
              type="button"
              variant="default"
              className="h-14 rounded-2xl"
              disabled={cookInFlight}
              onClick={() => onCookStart(validatedRow.recipe.id)}
            >
              <ChefHat size={20} className="mr-2" />
              {t("cook_cta")}
            </Button>
          </>
        ) : pressentiRow ? (
          <>
            <p className="text-sm text-foreground-muted">
              {t("intro_pressenti")}
            </p>
            <Button
              type="button"
              variant="default"
              className="h-14 rounded-2xl"
              disabled={delegateInFlight}
              onClick={onDelegate}
            >
              {t("delegate_cta")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-foreground-muted">
              {t("intro_none")}
            </p>
            <Button
              type="button"
              variant="default"
              className="h-14 rounded-2xl"
              disabled={delegateInFlight}
              onClick={onDelegate}
            >
              {t("delegate_cta")}
            </Button>
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          className="h-11"
          onClick={onRegenerate}
        >
          <RotateCw size={16} className="mr-2" />
          {t("regenerate_cta")}
        </Button>
      </div>
    </div>
  );
}
