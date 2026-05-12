"use client";

// Phase 3 — "Tout vu" summary state. Shows after all cards are voted on.
//
// CTA logic tree (03-UI-SPEC.md §Surface 8):
//   - If ≥1 Validé: show "Je commence à cuisiner" primary
//   - Else if ≥1 Pressenti: show "Tu décides" primary
//   - Else: show "Tu décides" + "Régénérer le shortlist" both
//   - Always: regenerate ghost button at the bottom (opens RegenerateSheet)

import { useMemo } from "react";
import { ChefHat, RotateCw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { MemberDot } from "@/components/MemberDot";
import { useSession } from "@/components/SessionProvider";
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

// Phase 7 / DECIDE-03 — 5-state vote-chip pill class strings.
// Locked color mapping per 07-UI-SPEC §"Color > Vote-chip color mapping".
// Pill shape contract (all 5 states): inline-flex items-center rounded-full
// px-2.5 py-0.5 text-sm font-medium h-8. Read-only state indicators (NOT
// tap targets); the D-08 48px floor explicitly excludes non-interactive chrome.
function chipClass(state: VoteState): string {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium h-8 w-fit";
  switch (state) {
    case "valide":
      return `${base} bg-[var(--color-valide-tint)] text-foreground border border-[var(--color-valide-border-faint)]`;
    case "pressenti":
      return `${base} bg-primary/15 text-primary border border-primary/40`;
    case "conteste":
      return `${base} bg-destructive/10 text-destructive/80 border border-destructive/30`;
    case "rejete":
      return `${base} bg-muted text-muted-foreground line-through`;
    case "sans_avis":
      return `${base} bg-transparent text-muted-foreground border border-border`;
  }
}

function rowBgClass(state: VoteState): string {
  return state === "valide"
    ? "bg-valide-tint border-[var(--color-valide-border-faint)]"
    : "bg-card border-border";
}

export function VoteSummary({
  recipes,
  votes,
  me,
  partner,
  onCookStart,
  onDelegate,
  onRegenerate,
  cookInFlight,
  delegateInFlight,
}: VoteSummaryProps) {
  const t = useTranslations("home.summary");
  const tState = useTranslations("vote.state");
  // INV-01 / D-15-03: read live member count from session rather than a
  // hardcoded default. If session is null (loading), short-circuit to 0 —
  // computeVoteState then falls through to `sans_avis` for unvoted recipes
  // (15-RESEARCH §Pitfall 3). In practice this branch is dead because
  // HomeDecide's !session render guard upstream means VoteSummary mounts
  // only with a resolved session, but explicit-is-better-than-implicit.
  const { session } = useSession();
  const memberCount = session?.members.length ?? 0;

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
  // bug 5 fix (260512-df0): waiting-for-partner branch. The local user has
  // finished their review (allVoted upstream → VoteSummary mounted) but no
  // Validé exists yet AND no Pressenti is leading either AND the partner
  // still has rows they haven't weighed in on. Anchored to an i18n key —
  // no hardcoded French (CLAUDE.md invariant 6).
  const partnerHasUnvotedRows = rows.some((r) => r.partnerVote === undefined);
  const showWaitingForPartner =
    !validatedRow && !pressentiRow && partnerHasUnvotedRows;

  // bug 4 fix (260512-df0): defensive empty-rows short-circuit. If every
  // recipe in the shortlist is Rejeté (rows[] filters those out at line
  // 113), or if upstream passed an empty `recipes` prop, render an
  // EmptyState rather than an empty heading + degenerate intro_none card.
  // Reuses the existing `home.empty.all_rejected_*` keys — no new copy.
  // CTA points back to /recipes/new (regenerate is a heavier action that
  // belongs in the parent sheet; this branch covers the truly-rare
  // "nothing here" terminal state).
  const tEmpty = useTranslations("home.empty");
  if (rows.length === 0) {
    return (
      <div className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-6">
        <EmptyState
          icon={Sparkles}
          heading={tEmpty("all_rejected_heading")}
          body={tEmpty("all_rejected_body")}
          cta={{
            href: "/recipes/new",
            label: t("regenerate_cta"),
          }}
        />
      </div>
    );
  }

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
      <h2 className="text-title">{t("heading")}</h2>

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
              <span className={chipClass(row.state)}>
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
          <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-3">
            <p className="font-display italic text-base text-foreground">
              {t("intro_pressenti")}
            </p>
            <Button
              type="button"
              variant="default"
              className="h-12 w-full"
              disabled={delegateInFlight}
              onClick={onDelegate}
            >
              {t("delegate_cta")}
            </Button>
          </Card>
        ) : showWaitingForPartner ? (
          // bug 5 fix (260512-df0): the local user has finished but no
          // recipe is leading and the partner has not voted on at least
          // one. Render an explicit waiting message + delegate-cta so
          // the user always has a forward action even while they wait.
          <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-3">
            <p className="font-display italic text-base text-foreground">
              {t("intro_waiting_partner")}
            </p>
            <Button
              type="button"
              variant="default"
              className="h-12 w-full"
              disabled={delegateInFlight}
              onClick={onDelegate}
            >
              {t("delegate_cta")}
            </Button>
          </Card>
        ) : (
          <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-3">
            <p className="font-display italic text-base text-foreground">
              {t("intro_none")}
            </p>
            <Button
              type="button"
              variant="default"
              className="h-12 w-full"
              disabled={delegateInFlight}
              onClick={onDelegate}
            >
              {t("delegate_cta")}
            </Button>
          </Card>
        )}

        <Button
          type="button"
          variant="ghost"
          className="h-12"
          onClick={onRegenerate}
        >
          <RotateCw size={16} className="mr-2" />
          {t("regenerate_cta")}
        </Button>
      </div>
    </div>
  );
}
