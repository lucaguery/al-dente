"use client";

// Phase 41 THRD-01 — dedicated /recipes/[id]/thread route.
// Mounts <RecipeThread mode="detail" /> under a thin ThreadTopBar
// (back-arrow + truncated crumb + N tours pin). Per D-14: the component
// contract is unchanged; only the surface that hosts it changes.
//
// The structured view (/recipes/[id]/page.tsx) lost its inline thread mount
// in Plan 41-02 Task 2 (D-17 hard rip-out, no shim per MVP no-shim posture).
// The "N tours" pin in det-top is the entry point to this route.
//
// Realtime: <RecipeThread> already subscribes to turn.created / turn.updated
// via the RealtimeProvider context — invariant #4 carries the broadcast spine,
// no new wiring needed.

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { api } from "@/lib/api";
import { useRealtime } from "@/components/RealtimeProvider";
import RecipeThread from "@/components/RecipeThread";
import ThreadTopBar from "@/components/RecipeThread/ThreadTopBar";
import type {
  PersistedTurn,
  RecipeStatus,
  AnswerTurnSubmission,
} from "@/components/RecipeThread/types";
import type { Recipe } from "@/lib/recipes";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function RecipeThreadPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const realtime = useRealtime();
  const tThread = useTranslations("recipes.thread");

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [turns, setTurns] = useState<PersistedTurn[]>([]);
  const [postingTurn, setPostingTurn] = useState(false);

  // Initial recipe fetch — same pattern as /recipes/[id]/page.tsx.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    api<Recipe>(`/api/recipes/${id}`)
      .then((r) => {
        if (!alive) return;
        setRecipe(r);
      })
      .catch(() => {
        if (alive) setNotFound(true);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // Initial turns fetch — D-15: count derives from turns.length (no denorm
  // column exposed on Recipe today; planner decision deferred to executor —
  // taking the live array length path).
  useEffect(() => {
    if (!id) return;
    let alive = true;
    api<PersistedTurn[]>(`/api/recipes/${id}/turns`)
      .then((rows) => {
        if (alive) setTurns(rows);
      })
      .catch(() => {
        if (alive) setTurns([]);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // Realtime: recipe.updated (in case the partner edits while we're on /thread)
  // + turn.created / turn.updated (the live counter and the bubble list both
  // re-render automatically — invariant #4).
  useEffect(() => {
    if (!realtime || !id) return;
    const offUpdated = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
      if (payload.id !== id) return;
      setRecipe(payload);
    });
    return () => {
      offUpdated();
    };
  }, [realtime, id]);

  useEffect(() => {
    if (!realtime || !id) return;
    const offCreated = realtime.onEvent<PersistedTurn>(
      "turn.created",
      (payload) => {
        if (payload.recipe_id !== id) return;
        setTurns((prev) => {
          if (prev.some((t) => t.id === payload.id)) return prev;
          return [...prev, payload].sort((a, b) => a.position - b.position);
        });
      },
    );
    const offUpdated = realtime.onEvent<PersistedTurn>(
      "turn.updated",
      (payload) => {
        if (payload.recipe_id !== id) return;
        setTurns((prev) =>
          prev.map((t) => (t.id === payload.id ? payload : t)),
        );
      },
    );
    return () => {
      offCreated();
      offUpdated();
    };
  }, [realtime, id]);

  // Turn POST handlers — same shape as /recipes/[id]/page.tsx. We keep the
  // thread route self-contained so the structured view's hard-rip-out
  // doesn't impose a prop-drill across two route boundaries.
  const handlePostTextTurn = useCallback(
    async (text: string) => {
      if (!id || postingTurn) return;
      setPostingTurn(true);
      try {
        await api(`/api/recipes/${id}/turns`, {
          method: "POST",
          body: JSON.stringify({ kind: "text", text }),
        });
      } catch {
        toast.error(tThread("turn_failed"));
      } finally {
        setPostingTurn(false);
      }
    },
    [id, postingTurn, tThread],
  );

  const handlePostVoiceTurn = useCallback(
    async (transcript: string) => {
      if (!id || postingTurn) return;
      setPostingTurn(true);
      try {
        await api(`/api/recipes/${id}/turns`, {
          method: "POST",
          body: JSON.stringify({ kind: "voice", transcript }),
        });
      } catch {
        toast.error(tThread("turn_failed"));
      } finally {
        setPostingTurn(false);
      }
    },
    [id, postingTurn, tThread],
  );

  const handlePostUrlTurn = useCallback(
    async (url: string) => {
      if (!id || postingTurn) return;
      setPostingTurn(true);
      try {
        await api(`/api/recipes/${id}/turns`, {
          method: "POST",
          body: JSON.stringify({ kind: "url", url }),
        });
      } catch {
        toast.error(tThread("turn_failed"));
      } finally {
        setPostingTurn(false);
      }
    },
    [id, postingTurn, tThread],
  );

  const handlePostPhotoTurn = useCallback(
    async (file: File) => {
      if (!id || postingTurn) return;
      setPostingTurn(true);
      try {
        const fd = new FormData();
        fd.append("files", file);
        const res = await fetch(`${API_BASE}/api/recipes/${id}/turns/photo`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!res.ok) throw new Error(`photo turn ${res.status}`);
      } catch {
        toast.error(tThread("turn_failed"));
      } finally {
        setPostingTurn(false);
      }
    },
    [id, postingTurn, tThread],
  );

  const handlePostAnswerTurn = useCallback(
    async (submission: AnswerTurnSubmission) => {
      if (!id) return;
      try {
        await api(`/api/recipes/${id}/turns`, {
          method: "POST",
          body: JSON.stringify({
            kind: "answer",
            in_reply_to_turn_id: submission.in_reply_to_turn_id,
            field: submission.field,
            value: submission.value,
          }),
        });
      } catch (err) {
        console.error("answer turn failed", err);
        toast.error(tThread("action_failed"));
        throw err;
      }
    },
    [id, tThread],
  );

  const handlePostProposalAccepted = useCallback(
    async (advisoryTurnId: string) => {
      if (!id) return;
      try {
        await api(`/api/recipes/${id}/turns`, {
          method: "POST",
          body: JSON.stringify({
            kind: "proposal_accepted",
            in_reply_to_turn_id: advisoryTurnId,
          }),
        });
      } catch (err) {
        console.error("proposal_accepted failed", err);
        toast.error(tThread("action_failed"));
        throw err;
      }
    },
    [id, tThread],
  );

  const handlePostProposalDismissed = useCallback(
    async (advisoryTurnId: string) => {
      if (!id) return;
      try {
        await api(`/api/recipes/${id}/turns`, {
          method: "POST",
          body: JSON.stringify({
            kind: "proposal_dismissed",
            in_reply_to_turn_id: advisoryTurnId,
          }),
        });
      } catch (err) {
        console.error("proposal_dismissed failed", err);
        toast.error(tThread("action_failed"));
        throw err;
      }
    },
    [id, tThread],
  );

  const handleSummaryComplete = useCallback(
    async (_turnId: string) => {
      if (!id) return;
      try {
        const result = await api(`/api/recipes/${id}/questions/trigger`, {
          method: "POST",
        });
        if (result === null) {
          toast.success(tThread("all_complete"));
        }
      } catch (err) {
        console.error("questions/trigger failed", err);
        toast.error(tThread("action_failed"));
        throw err;
      }
    },
    [id, tThread],
  );

  const handleSummaryLater = useCallback(
    async (_turnId: string) => {
      if (!id) return;
      try {
        await api(`/api/recipes/${id}/questions/defer`, { method: "POST" });
      } catch (err) {
        console.error("questions/defer failed", err);
        toast.error(tThread("action_failed"));
        throw err;
      }
    },
    [id, tThread],
  );

  // Stub for ThreadTopBar's onManualEditLinkClick — not relevant on this
  // route (the manual-edit link inside the thread routes back to the
  // structured view via the back-arrow; no in-page scroll target here).
  const manualLinkStubRef = useRef<HTMLDivElement | null>(null);
  const handleManualEditLinkClick = useCallback(() => {
    manualLinkStubRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  if (notFound) {
    return (
      <OnboardingGuard>
        <main className="min-h-dvh flex flex-col bg-background">
          <ThreadTopBar recipeId={id ?? ""} recipeName="" toursCount={0} />
        </main>
      </OnboardingGuard>
    );
  }

  if (!recipe) {
    return (
      <OnboardingGuard>
        <main className="min-h-dvh flex flex-col bg-background">
          <ThreadTopBar recipeId={id ?? ""} recipeName="" toursCount={0} />
          <div className="px-4 pt-6 flex flex-col gap-3">
            <div className="h-7 w-2/3 rounded bg-surface-muted animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-surface-muted animate-pulse" />
          </div>
        </main>
      </OnboardingGuard>
    );
  }

  const deferred = recipe.questions_deferred_until
    ? new Date(recipe.questions_deferred_until) > new Date()
    : false;

  return (
    <OnboardingGuard>
      <main className="min-h-dvh flex flex-col bg-background">
        <ThreadTopBar
          recipeId={recipe.id}
          recipeName={recipe.title}
          toursCount={turns.length}
        />
        <div ref={manualLinkStubRef} className="flex-1 flex flex-col">
          <RecipeThread
            mode="detail"
            recipeId={recipe.id}
            title={recipe.title}
            turns={turns}
            recipeStatus={recipe.status as RecipeStatus}
            manuallyEditedFields={recipe.manually_edited_fields ?? []}
            onPostTextTurn={handlePostTextTurn}
            onPostVoiceTurn={handlePostVoiceTurn}
            onPostUrlTurn={handlePostUrlTurn}
            onPostPhotoTurn={handlePostPhotoTurn}
            onPostAnswerTurn={handlePostAnswerTurn}
            onPostProposalAccepted={handlePostProposalAccepted}
            onPostProposalDismissed={handlePostProposalDismissed}
            deferred={deferred}
            onSummaryComplete={handleSummaryComplete}
            onSummaryLater={handleSummaryLater}
            onManualEditLinkClick={handleManualEditLinkClick}
          />
        </div>
      </main>
    </OnboardingGuard>
  );
}
