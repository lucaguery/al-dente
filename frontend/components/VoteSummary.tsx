"use client";

// Phase 32 §15.C — Sober Kitchen Accueil A shortlist composition.
// Redesigned from the Phase 3 chip-based summary to the table-à-manger
// shortlist-row stack per docs/design-system.html #accueil (lines 1489-1536).
//
// Per CONTEXT D-06 + D-13 + D-19 (invariant #2 — voting state computed, not stored).
// Per UI-SPEC §9.1 (Accueil composition contract).
//
// Props interface preserved for HomeDecide.tsx compatibility.
// onDelegate / delegateInFlight remain in the interface even though the Sober
// Kitchen Accueil design surfaces them only via the regenerate-sheet (triggered
// from HomeDecide) rather than inline CTA buttons. Retained to avoid breaking
// HomeDecide's prop-passing; removable in a future cleanup plan.

import type { CSSProperties } from "react";
import { Flame, RotateCw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { TableVote } from "@/components/TableVote";
import { Marginalia } from "@/components/Marginalia";
import { computeVoteState, type ShortlistVote } from "@/lib/votes";
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

export function VoteSummary({
  recipes,
  votes,
  me,
  partner,
  onCookStart,
  onDelegate: _onDelegate,
  onRegenerate,
  cookInFlight,
  delegateInFlight: _delegateInFlight,
}: VoteSummaryProps) {
  const tShortlist = useTranslations("home.shortlist");
  const tHome = useTranslations("home");
  const tSummary = useTranslations("home.summary");
  const tEmpty = useTranslations("home.empty");

  const members = [me, partner] as const;

  // Compute aggregate vote state for a given recipe id.
  function stateFor(recipeId: string) {
    return computeVoteState(
      votes
        .filter((v) => v.recipe_id === recipeId)
        .map((v) => ({ vote: v.vote })),
      members.length,
    );
  }

  // Non-rejete rows only — HomeDecide already filters dealableRecipes but
  // VoteSummary defensively re-filters so its own "empty rows" guard works.
  const rows = recipes.filter((r) => stateFor(r.id) !== "rejete");

  if (rows.length === 0) {
    return (
      <div className="flex flex-col flex-1 px-(--spacing-page-x) pt-6 pb-(--spacing-bottom-safe) gap-(--spacing-section-y)">
        <EmptyState
          icon={Sparkles}
          heading={tEmpty("all_rejected_heading")}
          body={tEmpty("all_rejected_body")}
          cta={{
            href: "/recipes/new",
            label: tSummary("regenerate_cta"),
          }}
        />
      </div>
    );
  }

  // Sticky CTA target: first valide, fallback first pressenti, otherwise null.
  const valideRecipe = rows.find((r) => stateFor(r.id) === "valide") ?? null;
  const pressentiRecipe =
    rows.find((r) => stateFor(r.id) === "pressenti") ?? null;
  const ctaTarget = valideRecipe ?? pressentiRecipe ?? null;

  return (
    <div className="flex flex-col flex-1 px-(--spacing-page-x) pb-(--spacing-bottom-safe)">
      {/* Shortlist stack — 10px gap per UI-SPEC §3 */}
      <div className="flex flex-col" style={{ gap: "10px", marginTop: "4px" }}>
        {rows.map((r) => {
          const recipeVotes = votes.filter(
            (v) => v.recipe_id === r.id,
          ) as ShortlistVote[];
          const state = stateFor(r.id);
          const isValide = state === "valide";

          const rowStyle: CSSProperties = isValide
            ? {
                background: "var(--valide-tint)",
                borderColor: "var(--color-valide-border-faint)",
              }
            : {
                background: "var(--card)",
                borderColor: "var(--border)",
              };

          return (
            <div
              key={r.id}
              className={`shortlist-row flex items-center gap-3 rounded-xl border p-3${isValide ? " is-valide" : ""}`}
              style={rowStyle}
            >
              <TableVote
                votes={recipeVotes}
                members={members}
                myMemberId={me.id}
                size="ts-56"
              />
              <div className="shortlist-info flex flex-col gap-0.5 min-w-0 flex-1">
                {/* Shortlist row title — Cormorant 500 17px per UI-SPEC §4 */}
                <h4
                  className="font-display truncate"
                  style={{
                    fontSize: "17px",
                    fontWeight: 500,
                    letterSpacing: "-0.005em",
                    fontStyle: "normal",
                  }}
                >
                  {r.title}
                </h4>
                {isValide ? (
                  /* Valide row: Caveat 16px in emerald-700 — UI-SPEC §4 + §9.1 */
                  <Marginalia
                    size="sm"
                    as="span"
                    style={{ color: "var(--color-valide-emphasis)" }}
                  >
                    {tShortlist("valide_meta")}
                  </Marginalia>
                ) : (
                  /* Non-valide meta — cuisine · prep-time caption, IBM Plex 12px */
                  <span
                    className="text-caption truncate"
                    style={{ fontSize: "12px" }}
                  >
                    {[
                      r.cuisine,
                      r.prep_time_minutes
                        ? `${r.prep_time_minutes} min`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom CTA — margin-top: auto anchors to bottom of phone-content */}
      {ctaTarget ? (
        <div className="mt-auto pt-6">
          <Button
            type="button"
            className="w-full h-12"
            onClick={() => onCookStart(ctaTarget.id)}
            disabled={cookInFlight}
          >
            <Flame size={18} className="mr-2" aria-hidden />
            {tHome("cta.cook_named", { title: ctaTarget.title })}
          </Button>
        </div>
      ) : (
        /* No valide / pressenti — offer regenerate as fallback action */
        <div className="mt-auto pt-6">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onClick={onRegenerate}
          >
            <RotateCw size={16} className="mr-2" aria-hidden />
            {tSummary("regenerate_cta")}
          </Button>
        </div>
      )}
    </div>
  );
}
