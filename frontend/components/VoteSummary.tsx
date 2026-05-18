"use client";

// Phase 36 SOBER-09 + SOBER-15 + POLISH-04 — first-paint Composition A ledger.
//
// Renders the locked-spec ledger (docs/design-system.html §15.A) from FIRST
// PAINT: 5 row states (Validé / Pressenti / Contesté / Rejeté muted / Sans
// avis), with the un-voted-by-me rows carrying an inline thumb-button vote
// affordance. The dual-mode swipe-deck-then-ledger toggle in HomeDecide is
// retired — this component is the single render path.
//
// Original Phase 32 §15.C purpose preserved: shortlist-row stack + sticky
// CTA + invariant #2 (vote state COMPUTED via computeVoteState, never stored).
//
// SOBER-15 — Rejeté row renders muted (.row-state-rejete) instead of being
// filtered out. CONTEXT decision: option (a), render muted alongside the
// other 4 states (visual gradient: Validé tint → Pressenti → Contesté →
// Rejeté muted → Sans avis neutral). The Rejeté row does NOT carry an
// inline affordance (both members already rejected — no productive vote
// remains; HomeDecide derives unvotedByMe from the rejete-filtered set).
//
// POLISH-04 — bottom CTA reads "Cuisiner ce soir" (fixed-length button copy)
// with the recipe title as Caveat-slant marginalia underneath. 320px-safe.
//
// Inline-affordance choice: option (a) from PLAN — reuse
// <ShortlistThumbButtons> from ShortlistCard.tsx. Lower complexity than
// modifying TableVote.tsx's seat-tap API, reuses an existing primitive,
// and matches the spec's "row contains affordance" composition.

import { useState, type CSSProperties, type ReactNode } from "react";
import { Flame, RotateCw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { TableVote } from "@/components/TableVote";
import { Marginalia } from "@/components/Marginalia";
import { ShortlistThumbButtons } from "@/components/ShortlistCard";
import {
  computeVoteState,
  postVote,
  type ShortlistVote,
  type VoteState,
  type VoteValue,
} from "@/lib/votes";
import { useEnumLabels } from "@/lib/enum-labels";
import type { Recipe } from "@/lib/recipes";

export type VoteSummaryMember = {
  id: string;
  name: string;
  color_hex: string;
};

export type VoteSummaryProps = {
  shortlistId: string;
  recipes: Recipe[];
  votes: ShortlistVote[];
  me: VoteSummaryMember;
  partner: VoteSummaryMember;
  /** Recipes the local user has not voted on (rejete-filtered upstream by
   *  HomeDecide). Drives which rows render the inline thumb-button
   *  affordance. */
  unvotedByMe: Recipe[];
  /** Optimistic vote propagation — mirrors the retired ShortlistDeck flow.
   *  Called synchronously with the local user's vote so HomeDecide can
   *  update its votes[] without waiting for the network round-trip. The
   *  realtime vote.created echo then overwrites canonically. */
  onVoteApplied: (vote: ShortlistVote) => void;
  onCookStart: (recipeId: string) => void;
  onDelegate: () => void;
  onRegenerate: () => void;
  cookInFlight?: boolean;
  delegateInFlight?: boolean;
};

// State-driven render order matching docs/design-system.html §15.A:
// Validé first, then Pressenti, then Contesté, then Sans avis (with inline
// affordance if un-voted), then Rejeté muted at the bottom.
const STATE_ORDER: Record<VoteState, number> = {
  valide: 0,
  pressenti: 1,
  conteste: 2,
  sans_avis: 3,
  rejete: 4,
};

export function VoteSummary({
  shortlistId,
  recipes,
  votes,
  me,
  partner,
  unvotedByMe,
  onVoteApplied,
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
  const labels = useEnumLabels();

  const members = [me, partner] as const;

  // SOBER-09 — T-36-06-02 mitigation: only one POST in flight at a time.
  // Mirrors the retired ShortlistDeck's submittingFor pattern. Spam-tap is
  // gated per-recipe so two un-voted rows can't fight over the network.
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);

  // Compute aggregate vote state for a given recipe id (invariant #2).
  function stateFor(recipeId: string): VoteState {
    return computeVoteState(
      votes
        .filter((v) => v.recipe_id === recipeId)
        .map((v) => ({ vote: v.vote })),
      members.length,
    );
  }

  // SOBER-15 — render ALL rows (no rejete filter). The Rejeté row gets the
  // muted variant via .row-state-rejete instead of being hidden.
  const rows = [...recipes].sort(
    (a, b) => STATE_ORDER[stateFor(a.id)] - STATE_ORDER[stateFor(b.id)],
  );

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

  const unvotedIds = new Set(unvotedByMe.map((r) => r.id));

  // SOBER-09 inline-affordance handler. Reuses the ShortlistDeck optimistic
  // pattern verbatim (set submittingFor → fire onVoteApplied with optimistic
  // row → POST; failure surfaces via toast, the optimistic row lingers until
  // the realtime echo or the user retries — same flow as the retired deck).
  async function handleInlineVote(recipeId: string, value: VoteValue) {
    if (submittingFor) return;
    setSubmittingFor(recipeId);
    const optimistic: ShortlistVote = {
      shortlist_id: shortlistId,
      recipe_id: recipeId,
      member_id: me.id,
      vote: value,
    };
    onVoteApplied(optimistic);
    try {
      await postVote(shortlistId, recipeId, value);
    } catch {
      toast.error(tShortlist("vote_failed"));
    } finally {
      setSubmittingFor(null);
    }
  }

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
          const isRejete = state === "rejete";
          // SOBER-09 — inline affordance only on rows the local user hasn't
          // voted on AND that aren't Rejeté (both members already rejected).
          // HomeDecide already excludes rejete from unvotedByMe, so this
          // second guard is defense-in-depth.
          const isUnvoted = unvotedIds.has(r.id) && !isRejete;

          const rowStyle: CSSProperties = isValide
            ? {
                background: "var(--valide-tint)",
                borderColor: "var(--color-valide-border-faint)",
              }
            : {
                background: "var(--card)",
                borderColor: "var(--border)",
              };

          const rowClass = [
            "shortlist-row",
            "flex items-center gap-3 rounded-xl border p-3",
            isValide ? "is-valide" : null,
            isRejete ? "row-state-rejete" : null,
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={r.id} className={rowClass} style={rowStyle}>
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
                  /* Non-valide meta — cuisine · prep-time caption, IBM Plex 12px.
                     POLISH-01 (Plan 36-07): interleave parts with a .meta-sep
                     span so the middle-dot carries NBSP both sides + no-wrap
                     (was: .join(" · ") with regular spaces). */
                  <span
                    className="text-caption truncate"
                    style={{ fontSize: "12px" }}
                  >
                    {(
                      [
                        r.cuisine ? labels.cuisine(r.cuisine) : null,
                        r.prep_time_minutes
                          ? `${r.prep_time_minutes} min`
                          : null,
                      ].filter(Boolean) as string[]
                    ).reduce<ReactNode[]>(
                      (acc, part, idx) =>
                        idx === 0
                          ? [part]
                          : [
                              ...acc,
                              <span key={`sep-${idx}`} className="meta-sep">
                                {" · "}
                              </span>,
                              part,
                            ],
                      [],
                    )}
                  </span>
                )}
                {/* SOBER-09 inline vote affordance — compact thumb buttons
                    embedded in the row for un-voted recipes. Reuses the
                    ShortlistThumbButtons primitive from ShortlistCard.tsx so
                    the aria + visual register matches the retired swipe-deck
                    flow. Renders below the meta line, inside the row, keeps
                    the row a single visual unit. */}
                {isUnvoted && (
                  <div className="mt-2">
                    <ShortlistThumbButtons
                      onVote={(value) => {
                        void handleInlineVote(r.id, value);
                      }}
                      disabled={submittingFor !== null}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom CTA — POLISH-04: fixed-length "Cuisiner ce soir" copy
          with the recipe title rendered as Caveat-slant marginalia in its own
          visual layer below. 320px-safe (button never wraps; title can
          ellipsis without clipping the button text). */}
      {ctaTarget ? (
        <div className="mt-auto pt-6 flex flex-col gap-1">
          <Button
            type="button"
            className="w-full h-12"
            onClick={() => onCookStart(ctaTarget.id)}
            disabled={cookInFlight}
          >
            <Flame size={18} className="mr-2" aria-hidden />
            {tHome("cta.cook_short")}
          </Button>
          <Marginalia
            size="sm"
            slant
            as="span"
            className="text-center truncate block"
            style={{ fontSize: "13px" }}
          >
            {ctaTarget.title}
          </Marginalia>
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
