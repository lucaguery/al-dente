"use client";

// Phase 17 / HIST-01 + HIST-02 — Cooking-log history view ("Mangé cette semaine").
//
// UI-SPEC §Surface 6 — list of dated cards grouped by absolute date dividers
// (Fraunces italic at body size, mirroring the HomeDecide date-header pattern
// scaled down).
//
// Phase 17 wiring: the backend list endpoint `GET /cooking-logs?days=N` (17-01)
// is live and the detail route `/cooking-logs/[id]` (17-02) is shipped. This
// page consumes `fetchCookingLogs(14)` from `@/lib/cooking` (no envelope —
// the wire shape is a bare `CookingLogResponse[]` per D-17-02), joins recipe
// titles against the existing `/api/recipes` list, and renders each row as
// a tap-target that navigates to the detail page (HIST-02 — D-17-13).
//
// Empty-state copy: per UI-SPEC §Surface 6 the cooking-log history view
// reuses the existing `recipes.empty_heading` / `empty_body` keys as
// placeholder strings — semantic mismatch is acceptable until the Phase 20
// i18n sweep adds cooking-log-specific empty copy.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChefHat } from "lucide-react";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { EmptyState } from "@/components/EmptyState";
import { type CookingLogCardData } from "@/components/CookingLogCard";
import {
  fetchCookingLogs,
  getCookingLogSignedPhotoUrl,
  type LogRating,
} from "@/lib/cooking";
import { api } from "@/lib/api";
import { formatRelativeFr } from "@/lib/datetime";

/** Format a French dated section header for grouping. Uses
 *  `Intl.DateTimeFormat('fr-FR', { weekday, day, month })` for absolute
 *  labels like "vendredi 8 mai" — pairs naturally with the Fraunces
 *  italic gesture from the HomeDecide header (Phase 7).
 */
function formatSectionHeaderFr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/** Group logs by absolute day (one section per calendar day). The grouping
 *  key is a YYYY-MM-DD bucket so logs cooked at 23:50 + 00:10 fall into
 *  separate sections (matches user mental model of "what we ate Friday vs
 *  Saturday").
 */
function groupLogsByDay(
  logs: CookingLogCardData[],
): Array<[string, CookingLogCardData[]]> {
  const groups = new Map<string, { date: Date; logs: CookingLogCardData[] }>();
  for (const log of logs) {
    const d = new Date(log.cooked_at);
    if (Number.isNaN(d.getTime())) continue;
    // YYYY-MM-DD in local time — keeps the user's day as their day.
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const existing = groups.get(key);
    if (existing) {
      existing.logs.push(log);
    } else {
      groups.set(key, { date: d, logs: [log] });
    }
  }
  // Sort buckets by date descending (most-recent day first).
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([, { date, logs }]) => [formatSectionHeaderFr(date), logs]);
}

export default function CookingLogsHistoryPage() {
  const tRecipes = useTranslations("recipes");
  const [logs, setLogs] = useState<CookingLogCardData[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rawLogs, recipes] = await Promise.all([
          fetchCookingLogs(14),
          api<Array<{ id: string; title: string }>>(
            "/api/recipes?limit=500",
          ),
        ]);
        if (!alive) return;
        const titleById = new Map(recipes.map((r) => [r.id, r.title]));
        const enriched: CookingLogCardData[] = rawLogs.map((log) => ({
          ...log,
          recipe_title:
            titleById.get(log.recipe_id) ?? "Recette supprimée",
        }));
        setLogs(enriched);
      } catch {
        // Best-effort: 401 / 500 / network errors → empty state. No toast —
        // the route still serves as the destination shell.
        if (alive) setLogs([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(
    () => (logs ? groupLogsByDay(logs) : []),
    [logs],
  );

  return (
    <OnboardingGuard>
      <section className="flex flex-col flex-1 bg-background">
        <div className="px-6 pt-8 pb-24 flex flex-col gap-6">
          {logs === null ? (
            // Loading: render nothing rather than a spinner — couple-scale
            // payloads are tiny, the fetch typically resolves in < 200ms.
            // The EmptyState below would flash if we rendered it during
            // loading, so we gate it on `logs !== null`.
            <div aria-hidden className="h-1" />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ChefHat}
              heading={tRecipes("empty_heading")}
              body={tRecipes("empty_body")}
            />
          ) : (
            grouped.map(([dateLabel, logsInGroup]) => (
              <section
                key={dateLabel}
                className="flex flex-col gap-3"
                aria-label={dateLabel}
              >
                <h2 className="font-display italic text-base text-foreground pt-6 pb-2">
                  {dateLabel}
                </h2>
                {logsInGroup.map((log) => (
                  <CookingLogHistoryRow key={log.id} log={log} />
                ))}
              </section>
            ))
          )}
        </div>
      </section>
    </OnboardingGuard>
  );
}

/** Page-level visual mirror of `CookingLogCard`, but the card-level Link
 *  routes to the detail page (`/cooking-logs/{id}`) for HIST-02 rather
 *  than the recipe page. We deliberately do NOT extend `CookingLogCard`
 *  with a `destination` prop in this plan — refactoring to a shared
 *  component is a Phase 21 polish concern. The visual chrome is
 *  duplicated; the rating-chip class string is duplicated identically.
 */
function CookingLogHistoryRow({ log }: { log: CookingLogCardData }) {
  const tRating = useTranslations("cooking_log.rating");
  const photoPath = log.photo_paths[0] ?? "";
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!photoPath) return;
    let alive = true;
    getCookingLogSignedPhotoUrl(log.id, photoPath)
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        // Silent fallback — surface stays text-only on mint failure.
      });
    return () => {
      alive = false;
    };
  }, [log.id, photoPath]);

  return (
    <Link
      href={`/cooking-logs/${log.id}`}
      className="paper-grain flex flex-col gap-3 p-4 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
        <img
          src={src}
          alt=""
          className="aspect-[4/3] w-full rounded-lg object-cover"
        />
      ) : null}
      <div className="flex flex-col gap-2">
        <h3 className="text-title line-clamp-2">{log.recipe_title}</h3>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-foreground-muted">
            {formatRelativeFr(log.cooked_at)}
          </span>
          {log.rating ? (
            <span className={ratingChipClass(log.rating)}>
              {tRating(log.rating)}
            </span>
          ) : null}
        </div>
        {log.notes ? (
          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
            {log.notes}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/** Mirror of CookingLogCard.ratingChipClass — duplicated identically so
 *  the list-page row chip matches the card chip byte-for-byte. Refactor
 *  to a shared <RatingChip /> when a third consumer emerges.
 */
function ratingChipClass(rating: LogRating): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-1 h-8 text-sm font-medium";
  switch (rating) {
    case "loved":
      return `${base} bg-surface-rose-100 text-primary border border-primary/40`;
    case "liked":
      return `${base} bg-[var(--color-valide-tint)] text-foreground border border-[var(--color-valide-border-faint)]`;
    case "disliked":
      return `${base} bg-muted text-muted-foreground border border-border`;
  }
}
