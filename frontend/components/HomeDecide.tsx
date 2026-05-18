"use client";

// Phase 3 — top-level Home content router. Replaces the hero+CTA block in
// app/page.tsx (D-01: Home tab BECOMES today's shortlist). Owns:
//
//   • initial fetch of (today's shortlist, active cooking log)
//   • realtime updates via the three DOM CustomEvents Task 1 added to
//     RealtimeProvider (vote.created, shortlist.created, cooking.started)
//   • CTA orchestration: vote → optimistic deck advance, delegate, regenerate,
//     start-cooking, banner skip.
//
// 03-UI-SPEC.md §"Home tab content tree" + §"Interaction Patterns".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandLoader } from "@/components/BrandLoader";
import { Marginalia } from "@/components/Marginalia";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/BrandIcon";
import { EmptyState } from "@/components/EmptyState";
import { ShortlistDeck } from "@/components/ShortlistDeck";
import { VoteSummary } from "@/components/VoteSummary";
import { CookingBanner } from "@/components/CookingBanner";
import { PushPermissionBanner } from "@/components/PushPermissionBanner";
import { RegenerateSheet } from "@/components/RegenerateSheet";
import { useSession } from "@/components/SessionProvider";
import {
  VOTE_CREATED_DOM_EVENT,
  SHORTLIST_CREATED_DOM_EVENT,
  COOKING_STARTED_DOM_EVENT,
  COOKING_FINALIZED_DOM_EVENT,
  type Phase3VoteEvent,
} from "@/components/RealtimeProvider";
import {
  computeVoteState,
  delegateShortlist,
  type ShortlistVote,
} from "@/lib/votes";
import {
  fetchTodayShortlist,
  regenerateShortlist,
  type ShortlistFilters,
  type ShortlistResponse,
} from "@/lib/shortlist";
import {
  getActiveCookingLog,
  postStartCooking,
  type CookingLogResponse,
} from "@/lib/cooking";
import { useDelayedFlag } from "@/lib/hooks/useDelayedFlag";

const COOK_BANNER_SKIP_KEY = "dismissed_cooking_banner_at";

type Member = { id: string; name: string; color_hex: string };

export function HomeDecide() {
  const tShortlist = useTranslations("home.shortlist");
  const tSummary = useTranslations("home.summary");
  const tPartnerWaiting = useTranslations("home.partner_waiting");
  const tSubhead = useTranslations("home.subhead");
  const tHome = useTranslations("home");
  const tNav = useTranslations("nav");
  const { session, refresh: refreshSession } = useSession();

  const [shortlist, setShortlist] = useState<ShortlistResponse | null>(null);
  const [shortlistLoaded, setShortlistLoaded] = useState(false);
  const [activeLog, setActiveLog] = useState<CookingLogResponse | null>(null);
  const [bannerSkipped, setBannerSkipped] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenSubmitting, setRegenSubmitting] = useState(false);
  const [delegateInFlight, setDelegateInFlight] = useState(false);
  const [cookInFlight, setCookInFlight] = useState(false);
  // T-03-04-05 — once we've toasted Pressenti→Validé for a recipe, never
  // toast again this session. A ref keeps the Set stable across renders
  // without being part of the React state tree.
  const validéToastedFor = useRef<Set<string>>(new Set());

  // Suppress spinner for 250ms on mount — SW cache resolves in 5-50ms, so
  // showing the Loader2 synchronously causes a visible flash on every warm
  // nav. If data lands before the timer, the spinner block is skipped entirely.
  const showSpinner = useDelayedFlag(250);

  // ── Resolve me + partner from useSession() ───────────────────────────────
  // SessionProvider returns { status, session, refresh } where session is
  // { household_id, household_name, invite_code, me, members } | null. The
  // Plan's stub assumed a different shape; this is the actual contract.
  const me: Member | null = useMemo(() => {
    if (!session) return null;
    const { id, name, color_hex } = session.me;
    return { id, name, color_hex };
  }, [session]);
  const partner: Member | null = useMemo(() => {
    if (!session || !me) return null;
    const other = session.members.find((m) => m.id !== me.id);
    if (!other) return null;
    const { id, name, color_hex } = other;
    return { id, name, color_hex };
  }, [session, me]);

  // ── Initial fetch ────────────────────────────────────────────────────────
  // Both calls fire in parallel; either failing is non-fatal — we still want
  // the empty state to render in case the shortlist 404s but the cooking-log
  // endpoint succeeds (or vice versa).
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTodayShortlist(), getActiveCookingLog()])
      .then(([sl, log]) => {
        if (cancelled) return;
        setShortlist(sl);
        setActiveLog(log);
        try {
          if (window.sessionStorage.getItem(COOK_BANNER_SKIP_KEY)) {
            setBannerSkipped(true);
          }
        } catch {
          /* sessionStorage can throw in private-mode Safari; degrade silently */
        }
      })
      .catch(() => {
        // Either call threw — surface nothing; empty state will render.
      })
      .finally(() => {
        if (cancelled) return;
        setShortlistLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Realtime: vote.created — partner or self echo ───────────────────────
  useEffect(() => {
    function onVoteCreated(e: Event) {
      const payload = (e as CustomEvent<Phase3VoteEvent>).detail;
      if (!shortlist || payload.shortlist_id !== shortlist.shortlist_id) {
        return;
      }
      // Reconcile votes[]: replace any existing row for (recipe, member) or
      // append. The server is authoritative — this overwrites optimistic
      // entries with canonical ones.
      setShortlist((prev) => {
        if (!prev) return prev;
        const others = prev.votes.filter(
          (v) =>
            !(
              v.recipe_id === payload.recipe_id &&
              v.member_id === payload.member_id
            ),
        );
        const next: ShortlistVote = {
          shortlist_id: payload.shortlist_id,
          recipe_id: payload.recipe_id,
          member_id: payload.member_id,
          vote: payload.vote,
        };
        return { ...prev, votes: [...others, next] };
      });

      // T-03-04-07 — drift detection. Compute the local state from the
      // votes (with this payload merged in) and warn if it disagrees with
      // the server's `state` field. The displayed state mirrors the server
      // either way; this is a dev-time canary, not user-facing.
      if (me && partner) {
        const recipeVotes = [
          ...shortlist.votes.filter(
            (v) =>
              v.recipe_id === payload.recipe_id &&
              v.member_id !== payload.member_id,
          ),
          {
            shortlist_id: payload.shortlist_id,
            recipe_id: payload.recipe_id,
            member_id: payload.member_id,
            vote: payload.vote,
          },
        ];
        const local = computeVoteState(recipeVotes, session?.members.length ?? 0);
        if (local !== payload.state) {
          console.warn(
            "vote-state drift: local=%s server=%s",
            local,
            payload.state,
          );
        }
      }

      // Pressenti→Validé celebration toast. Only fires when:
      //   • the new state is "valide"
      //   • the vote that drove the transition was the PARTNER's (not mine —
      //     I already saw my own vote land on the deck)
      //   • we haven't already toasted this recipe this session.
      if (
        me &&
        payload.state === "valide" &&
        payload.member_id !== me.id &&
        !validéToastedFor.current.has(payload.recipe_id)
      ) {
        const recipe = shortlist.recipes.find(
          (r) => r.id === payload.recipe_id,
        );
        if (recipe) {
          validéToastedFor.current.add(payload.recipe_id);
          toast.success(tShortlist("toast_validé", { title: recipe.title }), {
            id: `valide-${payload.recipe_id}`,
          });
        }
      }
    }
    window.addEventListener(VOTE_CREATED_DOM_EVENT, onVoteCreated);
    return () =>
      window.removeEventListener(VOTE_CREATED_DOM_EVENT, onVoteCreated);
  }, [shortlist, me, partner, session, tShortlist]);

  // ── Realtime: shortlist.created — APScheduler / regenerate echo ─────────
  useEffect(() => {
    function onShortlistCreated() {
      fetchTodayShortlist()
        .then((sl) => {
          setShortlist(sl);
          if (sl) {
            toast(tShortlist("toast_arrived"));
          }
        })
        .catch(() => {
          /* refetch failed — keep current view; user can pull-to-refresh */
        });
    }
    window.addEventListener(SHORTLIST_CREATED_DOM_EVENT, onShortlistCreated);
    return () =>
      window.removeEventListener(
        SHORTLIST_CREATED_DOM_EVENT,
        onShortlistCreated,
      );
  }, [tShortlist]);

  // ── Realtime: cooking.started — partner started cooking ─────────────────
  useEffect(() => {
    function onCookingStarted() {
      // The payload only contains ids; refetch to get the full record (rating,
      // notes, cooked_at). Cheap call — single GET.
      getActiveCookingLog()
        .then(setActiveLog)
        .catch(() => {
          /* ignore — banner stays in its current state */
        });
    }
    window.addEventListener(COOKING_STARTED_DOM_EVENT, onCookingStarted);
    return () =>
      window.removeEventListener(COOKING_STARTED_DOM_EVENT, onCookingStarted);
  }, []);

  // ── Realtime: cooking.finalized — partner finalized the session ─────────
  useEffect(() => {
    function onCookingFinalized() {
      setActiveLog(null);
    }
    window.addEventListener(COOKING_FINALIZED_DOM_EVENT, onCookingFinalized);
    return () =>
      window.removeEventListener(COOKING_FINALIZED_DOM_EVENT, onCookingFinalized);
  }, []);

  // ── Optimistic vote application from the deck ───────────────────────────
  const handleVoteApplied = useCallback((vote: ShortlistVote) => {
    setShortlist((prev) => {
      if (!prev) return prev;
      const others = prev.votes.filter(
        (v) =>
          !(v.recipe_id === vote.recipe_id && v.member_id === vote.member_id),
      );
      return { ...prev, votes: [...others, vote] };
    });
  }, []);

  // ── Regenerate flow ─────────────────────────────────────────────────────
  const handleRegenerate = useCallback(
    async (filters: ShortlistFilters) => {
      setRegenSubmitting(true);
      try {
        const fresh = await regenerateShortlist(filters);
        setShortlist(fresh);
        setRegenOpen(false);
      } catch {
        toast.error(tSummary("regenerate_failed"));
      } finally {
        setRegenSubmitting(false);
      }
    },
    [tSummary],
  );

  // ── Delegate flow ───────────────────────────────────────────────────────
  const handleDelegate = useCallback(async () => {
    if (!shortlist) return;
    setDelegateInFlight(true);
    try {
      await delegateShortlist(shortlist.shortlist_id);
      toast.success(tSummary("toast_delegated"));
      // The 5 vote.created echoes from the bulk fan-out drive the summary
      // update; we don't need to refetch here.
    } catch {
      toast.error(tSummary("delegate_failed"));
    } finally {
      setDelegateInFlight(false);
    }
  }, [shortlist, tSummary]);

  // ── Cook-start flow ─────────────────────────────────────────────────────
  const handleCookStart = useCallback(
    async (recipeId: string) => {
      setCookInFlight(true);
      try {
        const log = await postStartCooking(recipeId);
        setActiveLog(log);
        // Clear the session-skip flag so the banner shows even if the user
        // had previously dismissed an old log.
        try {
          window.sessionStorage.removeItem(COOK_BANNER_SKIP_KEY);
        } catch {
          /* ignore */
        }
        setBannerSkipped(false);
        toast.success(tSummary("toast_cooking_started"));
      } catch {
        toast.error(tSummary("cook_failed"));
      } finally {
        setCookInFlight(false);
      }
    },
    [tSummary],
  );

  // ── Banner skip (local, non-destructive) ────────────────────────────────
  const handleBannerSkip = useCallback(() => {
    try {
      window.sessionStorage.setItem(
        COOK_BANNER_SKIP_KEY,
        new Date().toISOString(),
      );
    } catch {
      /* ignore */
    }
    setBannerSkipped(true);
  }, []);

  // ── Render guards ───────────────────────────────────────────────────────
  // First-paint loading state — session not yet resolved. OnboardingGuard
  // upstream already gates "unauthenticated", so this is purely the
  // network round-trip on cold launch.
  if (!session || !me) {
    if (!showSpinner) return null;
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-(--spacing-page-x)">
        <BrandLoader aria-label="Chargement" />
      </div>
    );
  }

  // Household has only the current member (partner has not joined yet, OR
  // member.joined realtime event missed). Don't spin forever — show the
  // invite code prominently with an "Actualiser" affordance to refetch the
  // session manually. This also serves as a useful "share-code redux" once
  // the user is past onboarding.
  if (!partner) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-(--spacing-page-x) gap-(--spacing-section-y)">
        <div className="paper-grain shadow-card border-l-[3px] border-primary/60 rounded-xl p-6 max-w-sm w-full flex flex-col gap-4 bg-card">
          <p className="font-display italic text-base text-foreground">
            {tPartnerWaiting("message")}
          </p>
          {session.invite_code ? (
            <p className="font-display italic text-3xl tracking-widest text-primary text-center">
              {session.invite_code}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="h-12"
            onClick={() => {
              void refreshSession();
            }}
          >
            {tPartnerWaiting("refresh_cta")}
          </Button>
        </div>
      </div>
    );
  }

  if (!shortlistLoaded) {
    if (!showSpinner) return null;
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-(--spacing-page-x)">
        <BrandLoader aria-label="Chargement" />
      </div>
    );
  }

  const cookingBannerVisible = activeLog !== null && !bannerSkipped;

  // No shortlist for today — render EmptyState + a "Régénérer le shortlist"
  // CTA so the user can trigger generation without having to navigate to
  // /recipes/new first.
  if (shortlist === null) {
    return (
      <div className="flex flex-col flex-1">
        <PushPermissionBanner />
        {cookingBannerVisible && activeLog && (
          <CookingBanner
            logId={activeLog.id}
            recipeTitle=""
            onSkip={handleBannerSkip}
          />
        )}
        <div className="px-(--spacing-page-x) mt-6">
          <EmptyState
            icon={BrandIcon}
            heading={tShortlist("empty_heading")}
            body={tShortlist("empty_body")}
            cta={{
              href: "/recipes/new",
              label: tShortlist("empty_cta"),
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 mt-4"
            onClick={() => setRegenOpen(true)}
          >
            {tShortlist("regenerate_cta")}
          </Button>
        </div>
        <RegenerateSheet
          open={regenOpen}
          onOpenChange={setRegenOpen}
          onApply={handleRegenerate}
          submitting={regenSubmitting}
        />
      </div>
    );
  }

  // D-06: rejete recipes never appear in the deck or the summary. Filter
  // upstream of both views so the same predicate applies.
  const dealableRecipes = shortlist.recipes.filter((r) => {
    const recipeVotes = shortlist.votes.filter((v) => v.recipe_id === r.id);
    return computeVoteState(recipeVotes, session.members.length) !== "rejete";
  });

  // The local user's voted recipes (any vote — yes or no).
  const myVotes = new Set(
    shortlist.votes.filter((v) => v.member_id === me.id).map((v) => v.recipe_id),
  );
  // Cards I haven't voted on yet — these are the ones the deck shows.
  const unvotedByMe = dealableRecipes.filter((r) => !myVotes.has(r.id));
  const allVoted = unvotedByMe.length === 0;

  // State-derived Accueil subhead (D-13 + Phase 34 LIVE-04) — scans ALL
  // shortlist recipes (not just dealable) to reflect the full vote
  // landscape. The `validated` branch requires validéCount > 0 to avoid
  // the contradiction the 260518-kba walkthrough flagged (B-09): the
  // marginalia "déjà une idée validée" used to render whenever any
  // recipe was in `valide` state — but pre-SOBER-09 the swipe-deck
  // hides the validated row, so the marginalia contradicted the view.
  // Guarding on `validéCount > 0` is correct in BOTH the current
  // dual-mode AND the SOBER-09 first-paint ledger; the guard remains
  // load-bearing after SOBER-09 lands (zero-validé seed case).
  // Invariant #2: derived from the computed vote-state map, never stored.
  const allRowStates = shortlist.recipes.map((r) => {
    const recipeVotes = shortlist.votes.filter((v) => v.recipe_id === r.id);
    return computeVoteState(recipeVotes, session.members.length ?? 2);
  });
  const validéCount = allRowStates.filter((s) => s === "valide").length;
  const pressentiCount = allRowStates.filter((s) => s === "pressenti").length;
  const subheadKey: "validated" | "tentative" | "empty" =
    validéCount > 0
      ? "validated"
      : pressentiCount > 0
        ? "tentative"
        : "empty";
  const subheadText = tSubhead(subheadKey);

  // bug 4 fix (260512-df0): explicit empty-shortlist guard. If
  // `shortlist.recipes` is empty (e.g. a regenerate produced a zero-result
  // list), the original code would fall through to `allVoted=true` and
  // render VoteSummary with empty rows — heading + nothing actionable.
  // VoteSummary now defensively short-circuits to an EmptyState when its
  // own rows[] is empty (after the rejete filter), but this guard keeps
  // the empty-state messaging consistent between the "no shortlist today"
  // path (line ~400) and the "shortlist exists but is empty" path.
  const shortlistIsEmpty = shortlist.recipes.length === 0;

  // Phase 7 / DECIDE-01 — display-serif date header above the deck.
  // Locale-aware via the standard browser Intl API (no new i18n key per
  // 07-UI-SPEC §"Surface 1" point 3). Lowercase per French convention.
  // No year — too granular for daily-decide. Example: "vendredi 8 mai".
  // Computed at render time (NOT module scope) so the date stays current
  // across a midnight boundary if the app stays open overnight.
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="flex flex-col flex-1">
      <PushPermissionBanner />
      {cookingBannerVisible && activeLog && (
        <CookingBanner
          logId={activeLog.id}
          recipeTitle={recipeTitleFor(activeLog.recipe_id, shortlist.recipes)}
          onSkip={handleBannerSkip}
        />
      )}
      {/* Accueil A header composition — docs/design-system.html #accueil lines 1481-1486 */}
      <header className="px-(--spacing-page-x) pt-8 pb-2">
        {/* Header date row: page label left + date caption right (UI-SPEC §9.1 step 1) */}
        <div className="flex items-baseline justify-between">
          <span
            className="text-foreground"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "20px",
            }}
          >
            {tNav("home")}
          </span>
          <small className="text-caption capitalize">{formattedDate}</small>
        </div>
        {/* H1 — Cormorant 500 28px upright "On mange quoi ce soir ?" (UI-SPEC §9.1 step 2) */}
        <h1
          className="text-display text-foreground mt-4"
          style={{ fontSize: "28px", fontStyle: "normal" }}
        >
          {tHome("hero_question")}
        </h1>
        {/* State-derived Caveat slant subhead (D-13 + UI-SPEC §9.1 step 3) */}
        <Marginalia size="sm" slant className="mt-[-4px]">
          {subheadText}
        </Marginalia>
      </header>

      {shortlistIsEmpty ? (
        // bug 4 fix (260512-df0): shortlist exists but has zero recipes —
        // surface the regenerate affordance directly instead of falling
        // into VoteSummary's degenerate "heading + no rows + no CTA" path.
        <div className="px-(--spacing-page-x) mt-6">
          <EmptyState
            icon={BrandIcon}
            heading={tShortlist("empty_heading")}
            body={tShortlist("empty_body")}
            cta={{
              href: "/recipes/new",
              label: tShortlist("empty_cta"),
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 mt-4"
            onClick={() => setRegenOpen(true)}
          >
            {tShortlist("regenerate_cta")}
          </Button>
        </div>
      ) : allVoted ? (
        <VoteSummary
          recipes={dealableRecipes}
          votes={shortlist.votes}
          me={me}
          partner={partner}
          onCookStart={handleCookStart}
          onDelegate={handleDelegate}
          onRegenerate={() => setRegenOpen(true)}
          cookInFlight={cookInFlight}
          delegateInFlight={delegateInFlight}
        />
      ) : (
        <ShortlistDeck
          shortlistId={shortlist.shortlist_id}
          recipes={unvotedByMe}
          votes={shortlist.votes}
          me={me}
          partner={partner}
          onVoteApplied={handleVoteApplied}
        />
      )}

      <RegenerateSheet
        open={regenOpen}
        onOpenChange={setRegenOpen}
        onApply={handleRegenerate}
        submitting={regenSubmitting}
      />
    </div>
  );
}

function recipeTitleFor(
  recipeId: string,
  recipes: { id: string; title: string }[],
): string {
  return recipes.find((r) => r.id === recipeId)?.title ?? "";
}
