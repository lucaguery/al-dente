"use client";

// Phase 8 / COOK-10 — Cooking-log history view ("Mangé cette semaine").
//
// UI-SPEC §Surface 6 — list of dated CookingLogCard rows grouped by relative
// date dividers (Fraunces italic at body size, mirroring the HomeDecide
// date-header pattern scaled down).
//
// Best-effort data shape per UI-SPEC §"Phase 8 budget reality": this is the
// largest greenfield work in Phase 8 and the backend list endpoint is not
// yet wired (only POST /recipes/{id}/cook, GET /cooking-logs/active, and
// PUT /cooking-logs/{id} exist today — see backend/app/routers/
// cooking_logs.py). The route ships the shell + EmptyState fallback now;
// the CookingLogCard component renders correctly when the list endpoint
// lands.
//
// Empty-state copy: per UI-SPEC §Surface 6 the cooking-log history view
// reuses the existing `recipes.empty_heading` / `empty_body` keys as
// placeholder strings — semantic mismatch is acceptable until the backend
// ships and v0.2 string budget is locked at TWO new keys (offline +
// recipe_subhead, both in plan 08-01). Cooking-log-specific empty copy is
// TODO(productize).

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChefHat } from "lucide-react";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { EmptyState } from "@/components/EmptyState";
import {
  CookingLogCard,
  type CookingLogCardData,
} from "@/components/CookingLogCard";
import { api } from "@/lib/api";

// Best-effort list-endpoint shape. The actual list endpoint is not yet on
// the backend (Phase 8 is frontend polish only); when it lands the shape
// will likely be `{ logs: CookingLogResponse[] }` with the recipe_title
// joined server-side. The frontend is forward-compatible: if the endpoint
// 404s today, we render the EmptyState; when it ships, the rows show.
type CookingLogListResponse = {
  logs: CookingLogCardData[];
};

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
    // Best-effort fetch: if the list endpoint isn't wired yet, fall through
    // to empty state silently (no error toast — the route still serves as
    // the destination shell).
    api<CookingLogListResponse>("/api/cooking-logs?days=14")
      .then((data) => {
        if (alive) setLogs(data.logs ?? []);
      })
      .catch(() => {
        if (alive) setLogs([]);
      });
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
                  <CookingLogCard key={log.id} log={log} />
                ))}
              </section>
            ))
          )}
        </div>
      </section>
    </OnboardingGuard>
  );
}
