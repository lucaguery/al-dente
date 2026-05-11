"use client";

// UI-SPEC §9 — Drafts inbox. Filtered to status='draft' on the server side
// via ?status=draft. Realtime: prepend on `recipe.created` (only when the
// new recipe is itself a draft); on `recipe.updated`, REMOVE if the status
// flipped away from draft (e.g. user finished filling the form), or
// in-place replace if still draft.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Inbox } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { RecipeDraftCard } from "@/components/RecipeDraftCard";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { api } from "@/lib/api";
import { useRealtime } from "@/components/RealtimeProvider";
import { variants, transitions } from "@/lib/motion";
import type { Recipe } from "@/lib/recipes";

function dedupePrepend(prev: Recipe[], next: Recipe): Recipe[] {
  if (prev.some((p) => p.id === next.id)) return prev;
  return [next, ...prev];
}

// Module-level cache — survives client-side navigations because Next.js App
// Router keeps JS modules alive in memory. Stale-while-revalidate: seed
// initial state from this cache so the second visit paints instantly, then
// the existing fetch silently overwrites with fresh data. Realtime updates
// must keep this cache in sync, including dropping recipes whose status
// flips out of 'draft'.
let draftsCache: Recipe[] | null = null;

export default function InboxPage() {
  const t = useTranslations("inbox");
  const tErr = useTranslations("onboarding.errors");
  const realtime = useRealtime();
  const [drafts, setDrafts] = useState<Recipe[]>(draftsCache ?? []);
  const [loading, setLoading] = useState(draftsCache === null);

  useEffect(() => {
    let alive = true;
    // Phase 16 CAP-02 / D-16-06: refetch BOTH draft and failed rows so failed
    // cards remain visible in /inbox (the user resolves them via Réessayer or
    // Supprimer; the row stays until one of those completes). The backend list
    // endpoint accepts one status value at a time, so we issue two parallel
    // GETs and merge by created_at DESC (matches the backend's ORDER BY).
    Promise.all([
      api<Recipe[]>("/api/recipes?status=draft&limit=200"),
      api<Recipe[]>("/api/recipes?status=failed&limit=200"),
    ])
      .then(([draftRows, failedRows]) => {
        if (!alive) return;
        // Merge + dedupe (defensive — no overlap expected, but a race window
        // could plausibly surface the same id in both lists during a
        // status transition).
        const seen = new Set<string>();
        const merged: Recipe[] = [];
        for (const r of [...draftRows, ...failedRows]) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          merged.push(r);
        }
        merged.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        draftsCache = merged;
        setDrafts(merged);
      })
      .catch(() => {
        if (alive) toast.error(tErr("network"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tErr]);

  // Realtime: drafts inbox stays in sync without polling.
  useEffect(() => {
    if (!realtime) return;
    const offCreated = realtime.onEvent<Recipe>("recipe.created", (payload) => {
      // Phase 16 CAP-02 / D-16-06: accept both draft and failed status in the
      // realtime add branch. Plan 16-03's retry endpoint resets failed→draft
      // and broadcasts recipe.created with status='draft', which the existing
      // branch handled. The 'failed' branch here is defense-in-depth for any
      // future path that emits recipe.created on a row in the failed state.
      if (payload.status !== "draft" && payload.status !== "failed") return;
      setDrafts((prev) => {
        const next = dedupePrepend(prev, payload);
        draftsCache = next;
        return next;
      });
    });
    const offUpdated = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
      setDrafts((prev) => {
        const exists = prev.some((p) => p.id === payload.id);
        let next: Recipe[];
        // Phase 16 CAP-02 / D-16-06: keep `failed` rows in /inbox alongside
        // `draft`. Drop only on transition to structured/verified — those are
        // the "done" terminal states from the inbox's perspective.
        if (payload.status !== "draft" && payload.status !== "failed") {
          // Flipped to structured/verified → drop from drafts inbox.
          next = exists ? prev.filter((p) => p.id !== payload.id) : prev;
        } else {
          // draft or failed: in-place replace, or insert if we hadn't seen it.
          next = exists
            ? prev.map((p) => (p.id === payload.id ? payload : p))
            : dedupePrepend(prev, payload);
        }
        draftsCache = next;
        return next;
      });
    });
    // Promotion complete → drop from drafts inbox immediately (RealtimeProvider
    // already shows the success toast; we just need to clean up the local list).
    const offPromoted = realtime.onEvent<Recipe>("recipe.promoted", (payload) => {
      setDrafts((prev) => {
        const next = prev.filter((p) => p.id !== payload.id);
        draftsCache = next;
        return next;
      });
    });
    // recipe.deleted broadcast → remove from drafts list if present.
    // Backend emits the full Recipe row per the realtime contract (services/realtime.py),
    // matching the symmetry of recipe.created / recipe.updated / recipe.promoted. Typing
    // this as Recipe (rather than `{ id: string }`) keeps client/server in lockstep so a
    // future handler that depends on, e.g., `household_id` won't silently break.
    const offDeleted = realtime.onEvent<Recipe>("recipe.deleted", (payload) => {
      setDrafts((prev) => {
        const next = prev.filter((p) => p.id !== payload.id);
        draftsCache = next;
        return next;
      });
    });
    return () => {
      offCreated();
      offUpdated();
      offPromoted();
      offDeleted();
    };
  }, [realtime]);

  return (
    <OnboardingGuard>
      <section className="flex flex-col flex-1 bg-background">
        <header className="sticky top-0 h-12 px-6 flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-10">
          <h1 className="text-xl font-semibold">{t("tab_title")}</h1>
        </header>

        <div className="px-6 pt-3 flex flex-col gap-3 pb-24">
          {!loading && drafts.length === 0 ? (
            <EmptyState
              icon={Inbox}
              heading={t("empty_heading")}
              body={t("empty_body")}
            />
          ) : (
            <AnimatePresence initial={false}>
              {drafts.map((r) => (
                <motion.div
                  key={r.id}
                  variants={variants.slideUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, transition: transitions.fast }}
                >
                  <RecipeDraftCard recipe={r} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </section>
    </OnboardingGuard>
  );
}
