"use client";

// Recipe library card — Direction B (quick-260512-gpl).
// Vertical photo-grid card: 4:3 photo on top + body below with Cormorant
// Garamond title (font-display, upright, line-clamp-2) and a meta row
// (cuisine Badge · relative last-cooked).
//
// The photo path is fetched as a 5-minute signed URL on mount; if the
// recipe has no photos OR the request fails, we render a surface-muted
// placeholder sized to the same 4:3 aspect-ratio container.
//
// D-05 living image: the photo path prefers the most recent cooking-log
// photo over the canonical recipe photo, so the library list reflects
// "your own food". The cooking-log path needs a different signed-URL
// endpoint (path-on-recipe validation T-04-01-02 rejects it on the
// recipe endpoint); we detect it by the `cooking-logs/` prefix and
// extract the log_id from the path layout
// `cooking-logs/{household_id}/{log_id}/{uuid}.{ext}` (segs[2] = log_id).

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
        // Silent fallback to surface-muted placeholder; URL state stays null.
      });
    return () => {
      alive = false;
    };
  }, [recipe.id, firstPath]);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="paper-grain flex flex-col bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150 overflow-hidden"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL is short-lived; <Image> with custom loader is overkill
        <img
          src={src}
          alt=""
          className="w-full aspect-[4/3] object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="w-full aspect-[4/3] bg-surface-muted"
        />
      )}
      <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5 min-w-0">
        <h3 className="font-display text-lg font-medium leading-tight tracking-tight line-clamp-2">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-foreground-muted">
          {recipe.cuisine ? (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
              {recipe.cuisine}
            </Badge>
          ) : null}
          {recipe.cuisine ? <span aria-hidden>·</span> : null}
          <span>
            {recipe.last_cooked_at
              ? formatRelativeFr(recipe.last_cooked_at)
              : t("never_cooked")}
          </span>
        </div>
      </div>
    </Link>
  );
}
