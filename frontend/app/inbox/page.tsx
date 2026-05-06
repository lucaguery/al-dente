"use client";

// UI-SPEC §9 — Drafts inbox. Filtered to status='draft' on the server side
// via ?status=draft. Realtime: prepend on `recipe.created` (only when the
// new recipe is itself a draft); on `recipe.updated`, REMOVE if the status
// flipped away from draft (e.g. user finished filling the form), or
// in-place replace if still draft.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { RecipeDraftCard } from "@/components/RecipeDraftCard";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { api } from "@/lib/api";
import { useRealtime } from "@/components/RealtimeProvider";
import type { Recipe } from "@/lib/recipes";

function dedupePrepend(prev: Recipe[], next: Recipe): Recipe[] {
  if (prev.some((p) => p.id === next.id)) return prev;
  return [next, ...prev];
}

export default function InboxPage() {
  const t = useTranslations("inbox");
  const tErr = useTranslations("onboarding.errors");
  const realtime = useRealtime();
  const [drafts, setDrafts] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api<Recipe[]>("/api/recipes?status=draft&limit=200")
      .then((rows) => {
        if (alive) setDrafts(rows);
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
      if (payload.status !== "draft") return;
      setDrafts((prev) => dedupePrepend(prev, payload));
    });
    const offUpdated = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
      setDrafts((prev) => {
        const exists = prev.some((p) => p.id === payload.id);
        if (payload.status !== "draft") {
          // Flipped to structured/verified → drop from drafts inbox.
          return exists ? prev.filter((p) => p.id !== payload.id) : prev;
        }
        // Still draft: in-place replace, or insert if we hadn't seen it.
        return exists
          ? prev.map((p) => (p.id === payload.id ? payload : p))
          : dedupePrepend(prev, payload);
      });
    });
    return () => {
      offCreated();
      offUpdated();
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
            drafts.map((r) => <RecipeDraftCard key={r.id} recipe={r} />)
          )}
        </div>
      </section>
    </OnboardingGuard>
  );
}
