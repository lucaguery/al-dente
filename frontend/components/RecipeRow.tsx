"use client";

// ADR-0004 La Grille refit (wave 3) — horizontal list row for the list
// editorial view of Bibliothèque. Mirrors RecipeCard's photo URL self-heal
// + cooking-log path detection, but laid out as a horizontal flex row with
// a 72×72 photo on the right and a Geist Mono numbered index on the left.
// Hairline border + radius only (no patina, no shadow) per ADR §Patine
// ledger card + §Shadows.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeFr } from "@/lib/datetime";
import { getCookingLogSignedPhotoUrl } from "@/lib/cooking";
import type { Recipe } from "@/lib/recipes";
import { RecipeIllustration } from "@/components/RecipeIllustration";
import { useSignedPhotoUrl } from "@/lib/hooks/useSignedPhotoUrl";
import { useEnumLabels } from "@/lib/enum-labels";

export interface RecipeRowProps {
  recipe: Recipe;
  /** ADR-0004 La Grille — Geist Mono `01`-`NN` index prefix.
   *  Computed by the parent list (recipes/page.tsx) so the index reflects
   *  position in the filtered/sorted view, not a stable recipe attribute.
   *  When undefined the row renders without an index (e.g. solo embeds). */
  index?: number;
}

export function RecipeRow({ recipe, index }: RecipeRowProps) {
  const t = useTranslations("recipes");
  const labels = useEnumLabels();

  // Photo URL resolution — mirror RecipeCard pattern exactly.
  const firstPath =
    recipe.last_cooked_photo_path ??
    recipe.photo_paths[0] ??
    "";
  const devFallbackUrl =
    process.env.NODE_ENV !== "production"
      ? `/demo-fixtures/${(recipe.cuisine ?? "default").toString()}.svg`
      : null;
  const isCookingLogPath = firstPath.startsWith("cooking-logs/");
  const recipeHook = useSignedPhotoUrl(recipe.id, isCookingLogPath ? null : firstPath);
  const [cookingLogSrc, setCookingLogSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!isCookingLogPath || !firstPath) return;
    let alive = true;
    const segs = firstPath.split("/");
    const logId = segs[2];
    if (!logId) return;
    getCookingLogSignedPhotoUrl(logId, firstPath)
      .then((url) => { if (alive) setCookingLogSrc(url); })
      .catch(() => { if (alive && devFallbackUrl) setCookingLogSrc(devFallbackUrl); });
    return () => { alive = false; };
  }, [firstPath, isCookingLogPath, devFallbackUrl]);
  const src = isCookingLogPath ? cookingLogSrc : (recipeHook.src ?? (firstPath ? null : devFallbackUrl));

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="relative block hover:opacity-95 active:translate-y-px transition-all duration-150"
    >
      <article
        className="flex gap-3 items-center rounded-lg border border-border bg-card"
        style={{ padding: "12px" }}
      >
        {typeof index === "number" ? (
          <span
            className="text-caption tabular-nums shrink-0 self-start pt-1"
            aria-hidden
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h3
            className="truncate"
            style={{ fontSize: "18px", fontWeight: 500, lineHeight: 1.2 }}
          >
            {recipe.title}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap text-caption">
            {recipe.cuisine ? (
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                {labels.cuisine(recipe.cuisine)}
              </Badge>
            ) : null}
            {recipe.cuisine ? <span aria-hidden className="meta-sep">{" · "}</span> : null}
            <span>
              {recipe.last_cooked_at
                ? formatRelativeFr(recipe.last_cooked_at)
                : t("never_cooked")}
            </span>
          </div>
        </div>
        <div
          className="relative shrink-0 overflow-hidden rounded-lg bg-muted"
          style={{ width: "72px", height: "72px" }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                if (!isCookingLogPath) recipeHook.onError();
                if (process.env.NODE_ENV === "production" || !devFallbackUrl) return;
                const currentSrc = e.currentTarget.src;
                if (!currentSrc.includes("/demo-fixtures/")) {
                  e.currentTarget.src = devFallbackUrl;
                } else if (!currentSrc.endsWith("/default.svg")) {
                  e.currentTarget.src = "/demo-fixtures/default.svg";
                }
              }}
            />
          ) : (
            <div aria-hidden className="w-full h-full flex items-center justify-center text-muted-foreground">
              <RecipeIllustration recipe={recipe} size={36} />
            </div>
          )}
        </div>
        {recipe.status === "failed" ? (
          <span
            className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold tracking-[0.03em]"
            style={{
              background: "color-mix(in oklch, var(--destructive) 15%, transparent)",
              color: "var(--destructive)",
              border: "1px solid color-mix(in oklch, var(--destructive) 40%, transparent)",
            }}
          >
            <AlertCircle size={10} aria-hidden />
            {t("promotion.failed_badge")}
          </span>
        ) : null}
      </article>
    </Link>
  );
}

export default RecipeRow;
