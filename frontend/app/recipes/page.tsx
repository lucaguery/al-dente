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
//
// Phase 27 D-10: /inbox is gone; failed recipes surface on this list with
// an « Échec » destructive pill rendered on the RecipeCard. draft rows
// also surface transiently here during the brief promotion window between
// « Enregistrer » and `recipe.promoted`. The `?status=draft` filter is
// preserved server-side (admin/seed use) but no longer rendered as a
// filter chip — Phase 27 ships the minimum-viable failed-pill surface;
// a richer status filter UI is post-MVP.
//
// The existing `recipe.updated` handler already handles draft→structured and
// draft→failed transitions (full row replace via prev.map) so no additional
// `recipe.promoted` subscription is needed — promote_draft broadcasts
// `recipe.updated` which covers the status flip.
//
// Phase 32 §15.C (SOBER-03) — 3-view switcher (grid / list / patina) with
// localStorage["aldente.library.view"] persistence (D-09, D-10).
// Anti-flash: SSR pre-renders grid; useEffect hydrates from storage post-mount
// with 150ms opacity transition (RESEARCH Pattern 7).

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { BrandIcon } from "@/components/BrandIcon";
import { EmptyState } from "@/components/EmptyState";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeRow } from "@/components/RecipeRow";
import { LibraryViewSwitch, type LibraryView } from "@/components/LibraryViewSwitch";
import { Marginalia } from "@/components/Marginalia";
import { SearchInput } from "@/components/SearchInput";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { api } from "@/lib/api";
import { useRealtime } from "@/components/RealtimeProvider";
import { groupByPatina, type Recipe } from "@/lib/recipes";

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

// Phase 32 §15.C (D-09/D-10) — patine view sub-components.
// Defined outside RecipesPage so they don't re-create on every render.

// SOBER-11 (Plan 36-02): all three Patine sections render unconditionally,
// including empty buckets. The section structure is part of the Bibliothèque
// visual contract — a single-bucket distribution must NOT collapse to a blank
// container (B-06 + D-08 walkthrough findings). Empty buckets render a
// Caveat-slant marginalia line in place of the empty grid.
function PatinaSection({
  label,
  count,
  recipes,
  columnClass,
  emptyLabel,
}: {
  label: string;
  count: number;
  recipes: Recipe[];
  columnClass: string;
  emptyLabel: string;
}) {
  return (
    <section>
      <header className="flex items-baseline gap-2 mt-4 mb-2">
        <h2 className="font-display" style={{ fontSize: "16px", fontWeight: 500 }}>
          {label}
        </h2>
        <Marginalia size="sm" as="span" style={{ fontSize: "15px" }}>
          <span className="meta-sep">{" · "}</span>{count}
        </Marginalia>
      </header>
      {recipes.length === 0 ? (
        <Marginalia size="sm" slant as="p">
          {emptyLabel}
        </Marginalia>
      ) : (
        <div className={columnClass}>
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function PatinaView({
  recipes,
  tPatina,
}: {
  recipes: Recipe[];
  tPatina: ReturnType<typeof useTranslations>;
}) {
  const grouped = groupByPatina(recipes);
  const emptyLabel = tPatina("empty");
  return (
    <div className="flex flex-col gap-[8px] px-(--spacing-page-x)">
      <PatinaSection
        label={tPatina("heritage")}
        count={grouped.heritage.length}
        recipes={grouped.heritage}
        columnClass="grid grid-cols-1 gap-[10px]"
        emptyLabel={emptyLabel}
      />
      <PatinaSection
        label={tPatina("habitudes")}
        count={grouped.habitudes.length}
        recipes={grouped.habitudes}
        columnClass="grid grid-cols-2 gap-[10px]"
        emptyLabel={emptyLabel}
      />
      <PatinaSection
        label={tPatina("essai")}
        count={grouped.essai.length}
        recipes={grouped.essai}
        columnClass="grid grid-cols-3 gap-[8px]"
        emptyLabel={emptyLabel}
      />
    </div>
  );
}

export default function RecipesPage() {
  const t = useTranslations("recipes");
  const tErr = useTranslations("onboarding.errors");
  const tPatina = useTranslations("home.library.patina_section");
  const realtime = useRealtime();
  const [recipes, setRecipes] = useState<Recipe[]>(recipesCache ?? []);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(recipesCache === null);

  // Phase 32 §15.C (D-10) — view choice persisted in localStorage.
  // SSR pre-renders grid (the default); useEffect hydrates from storage
  // post-mount. Anti-flash: panel opacity transitions 0→1 over 150ms.
  const [view, setView] = useState<LibraryView>("grid");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("aldente.library.view");
      // TODO(productize): refactor to lazy-init useState to avoid effect-driven render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "list" || stored === "patina") setView(stored);
    } catch {
      /* localStorage may throw in private-mode Safari; degrade silently */
    }
    setHydrated(true);
  }, []);

  const handleViewChange = useCallback((next: LibraryView) => {
    setView(next);
    try {
      window.localStorage.setItem("aldente.library.view", next);
    } catch {
      /* ignore */
    }
  }, []);

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
    const offDeleted = realtime.onEvent<{ id: string }>("recipe.deleted", (payload) => {
      setRecipes((prev) => {
        const next = prev.filter((p) => p.id !== payload.id);
        recipesCache = next;
        return next;
      });
    });
    return () => {
      offCreated();
      offUpdated();
      offDeleted();
    };
  }, [realtime]);

  return (
    <OnboardingGuard>
      <section className="flex flex-col flex-1 bg-background">
        {/* gh#33 C1 — removed the top-right `<Plus>` button; the central
            elevated CTA in BottomNav.tsx (variant: "central-cta", href: /recipes/new)
            is the single capture entry point. */}
        <header className="sticky top-0 h-12 px-(--spacing-page-x) flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-20">
          <h1 className="text-page-header">{t("tab_title")}</h1>
        </header>

        <div className="px-(--spacing-page-x) py-3 sticky top-12 z-10 bg-background/80 backdrop-blur-sm">
          <SearchInput onQueryChange={handleSearch} />
        </div>

        {!loading && recipes.length === 0 ? (
          <div className="px-(--spacing-page-x) pb-(--spacing-bottom-safe)">
            {query.trim().length > 0 ? (
              <EmptyState
                icon={Search}
                heading={t("no_results_heading", { query })}
                body={t("no_results_body")}
              />
            ) : (
              <EmptyState
                icon={BrandIcon}
                heading={t("empty_heading")}
                body={t("empty_body")}
                cta={{ label: t("empty_cta"), href: "/recipes/new" }}
              />
            )}
          </div>
        ) : (
          <>
            {/* Meta row: recipe count + view switcher */}
            <div className="flex items-center justify-between mt-2 mb-3 px-(--spacing-page-x)">
              <small className="text-caption">
                {recipes.length === 1
                  ? t("library.count_singular", { n: recipes.length })
                  : t("library.count_plural", { n: recipes.length })}
              </small>
              <LibraryViewSwitch value={view} onChange={handleViewChange} />
            </div>

            {/* Anti-flash: opacity transitions 0→1 after hydration (RESEARCH Pattern 7) */}
            <div
              className={`transition-opacity duration-150 pb-(--spacing-bottom-safe) ${hydrated ? "opacity-100" : "opacity-0"}`}
            >
              {view === "grid" ? (
                // gh#33 C2 — fixed-feel card sizing in grid: auto-fill min
                // 150px guarantees each card has a stable minimum width
                // regardless of viewport, instead of stretching across 2 or
                // 3 evenly-distributed columns (which made cards visibly
                // narrower at md+).
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[10px] px-(--spacing-page-x)">
                  {recipes.map((r) => (
                    <RecipeCard key={r.id} recipe={r} />
                  ))}
                </div>
              ) : view === "list" ? (
                <div className="flex flex-col gap-[14px] px-(--spacing-page-x)">
                  {recipes.map((r) => (
                    <RecipeRow key={r.id} recipe={r} />
                  ))}
                </div>
              ) : (
                <PatinaView recipes={recipes} tPatina={tPatina} />
              )}
            </div>
          </>
        )}
      </section>
    </OnboardingGuard>
  );
}
