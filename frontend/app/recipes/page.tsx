"use client";

// UI-SPEC §6 — Recipe library list with debounced ILIKE search.
// Realtime: subscribe to `recipe.created` (prepend, dedup by id) and
// `recipe.updated` (in-place replace) so partner-side mutations land here
// silently — UI-SPEC §"Realtime indicators": no toast, the row appearance
// IS the notification.
//
// Search runs in two phases: empty query refetches the full list (default
// 50, server-side pagination not yet exercised in v0.1); non-empty query
// hits ?q=... which runs ILIKE on title + ingredients per D-03.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { RecipeCard } from "@/components/RecipeCard";
import { SearchInput } from "@/components/SearchInput";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { api } from "@/lib/api";
import { useRealtime } from "@/components/RealtimeProvider";
import type { Recipe } from "@/lib/recipes";

function dedupeReplace(prev: Recipe[], next: Recipe): Recipe[] {
  const idx = prev.findIndex((p) => p.id === next.id);
  if (idx === -1) return [next, ...prev];
  const copy = prev.slice();
  copy[idx] = next;
  return copy;
}

// Module-level cache — survives client-side navigations because Next.js App
// Router keeps JS modules alive in memory. Stale-while-revalidate: seed
// initial state from this cache so the second visit paints instantly, then
// the existing fetch silently overwrites with fresh data.
// IMPORTANT: only the unfiltered full list is cached (query === ""); search
// results never touch this variable.
let recipesCache: Recipe[] | null = null;

export default function RecipesPage() {
  const t = useTranslations("recipes");
  const tErr = useTranslations("onboarding.errors");
  const router = useRouter();
  const realtime = useRealtime();
  const [recipes, setRecipes] = useState<Recipe[]>(recipesCache ?? []);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(recipesCache === null);

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      const path = q.trim().length > 0
        ? `/api/recipes?q=${encodeURIComponent(q)}`
        : `/api/recipes`;
      try {
        const rows = await api<Recipe[]>(path);
        if (q.trim() === "") {
          recipesCache = rows;
        }
        setRecipes(rows);
      } catch {
        toast.error(tErr("network"));
      } finally {
        setLoading(false);
      }
    },
    [tErr],
  );

  // Initial load — handleSearch with empty string covers the "fetch all" path.
  // The SearchInput debounce will fire on mount with value="" and run this.
  // (No separate initial fetch needed; SearchInput's first effect runs immediately.)

  // Realtime: prepend on created, replace on updated. The list is non-status-
  // filtered (RECIPE-03 lists everything), so drafts also flow in here; the
  // Drafts inbox /inbox surface filters by ?status=draft separately.
  useEffect(() => {
    if (!realtime) return;
    const offCreated = realtime.onEvent<Recipe>("recipe.created", (payload) => {
      setRecipes((prev) => {
        const next = dedupeReplace(prev, payload);
        recipesCache = next;
        return next;
      });
    });
    const offUpdated = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
      setRecipes((prev) => {
        const next = prev.map((p) => (p.id === payload.id ? payload : p));
        recipesCache = next;
        return next;
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
        <header className="sticky top-0 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-20">
          <h1 className="text-xl font-semibold">{t("tab_title")}</h1>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("add_cta_aria")}
            onClick={() => router.push("/recipes/new")}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </header>

        <div className="px-6 py-3 sticky top-12 z-10 bg-background/80 backdrop-blur-sm">
          <SearchInput onQueryChange={handleSearch} />
        </div>

        <div className="px-6 flex flex-col gap-3 pb-24">
          {!loading && recipes.length === 0 ? (
            query.trim().length > 0 ? (
              <EmptyState
                icon={Search}
                heading={t("no_results_heading", { query })}
                body={t("no_results_body")}
              />
            ) : (
              <EmptyState
                icon={BookOpen}
                heading={t("empty_heading")}
                body={t("empty_body")}
                cta={{ label: t("empty_cta"), href: "/recipes/new" }}
              />
            )
          ) : (
            recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)
          )}
        </div>
      </section>
    </OnboardingGuard>
  );
}
