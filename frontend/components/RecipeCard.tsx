"use client";

// UI-SPEC §6 — RecipeCard list-row. Photo thumbnail (16x16) + title +
// meta row (cuisine Badge + relative-last-cooked).
//
// The photo path is fetched as a 5-minute signed URL on mount; if the
// recipe has no photos OR the request fails, we render the zinc-100
// placeholder per UI-SPEC §6 line "or zinc-100 placeholder".

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatRelativeFr } from "@/lib/datetime";
import { getSignedPhotoUrl } from "@/lib/recipes";
import { getCookingLogSignedPhotoUrl } from "@/lib/cooking";
import type { Recipe } from "@/lib/recipes";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const t = useTranslations("recipes");
  // Derive the photo-path key from props; effect runs only when it changes.
  // D-05 living image: prefer the most recent cooking-log photo over the
  // canonical recipe photo so the library list reflects "your own food".
  const firstPath =
    recipe.last_cooked_photo_path ??
    recipe.photo_paths[0] ??
    "";
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!firstPath) {
      // No photo on this recipe — `src` is already null at mount; don't
      // setState here (would trigger a cascading render and trip React
      // 19's `react-hooks/set-state-in-effect` rule).
      return;
    }
    let alive = true;
    // D-05: living image — the path may be either a recipe photo
    // (recipes/{id}/{uuid}.ext) or a cooking-log photo
    // (cooking-logs/{household_id}/{log_id}/{uuid}.ext). The cooking-log
    // path needs the cooking-log signed-URL endpoint because the
    // recipe-photo endpoint validates path-on-recipe (T-04-01-02).
    // We don't have logId in props, so we extract it from the path itself —
    // safe because the path layout is server-controlled (see
    // backend/app/services/storage.py upload_cooking_log_photo). Layout:
    // cooking-logs/{household_id}/{log_id}/{uuid}.{ext} — segs[2] = log_id.
    const isCookingLogPath = firstPath.startsWith("cooking-logs/");
    const urlPromise = isCookingLogPath
      ? (async () => {
          const segs = firstPath.split("/");
          // segs[0] = "cooking-logs", segs[1] = household_id, segs[2] = log_id
          const logId = segs[2];
          if (!logId) throw new Error("malformed cooking-log path");
          return getCookingLogSignedPhotoUrl(logId, firstPath);
        })()
      : getSignedPhotoUrl(recipe.id, firstPath);
    urlPromise
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        // Silent fallback to zinc-100 placeholder; URL state stays null.
      });
    return () => {
      alive = false;
    };
  }, [recipe.id, firstPath]);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex gap-4 p-3 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL is short-lived; <Image> with custom loader is overkill
        <img
          src={src}
          alt=""
          className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div
          aria-hidden
          className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0"
        />
      )}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <h3 className="text-base font-semibold leading-6 tracking-tight line-clamp-1">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {recipe.cuisine ? (
            <Badge variant="secondary">{recipe.cuisine}</Badge>
          ) : null}
          <span className="text-sm text-foreground-muted">
            {recipe.last_cooked_at
              ? formatRelativeFr(recipe.last_cooked_at)
              : t("never_cooked")}
          </span>
        </div>
      </div>
    </Link>
  );
}
