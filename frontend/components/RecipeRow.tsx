"use client";

// Phase 32 §15.C (SOBER-03) — horizontal LedgerCard row for the list
// editorial view of Bibliothèque. Mirrors RecipeCard's photo URL self-heal
// + cooking-log path detection, but laid out as a horizontal flex row with
// a 72×72 photo on the right.
// Per CONTEXT D-07 + UI-SPEC §9.2.
// Per implementation_notes: list-view marginalia OMITTED for Phase 32 (Open Q3 resolution).

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { LedgerCard } from "@/components/LedgerCard";
import { Badge } from "@/components/ui/badge";
import { formatRelativeFr } from "@/lib/datetime";
import { getCookingLogSignedPhotoUrl } from "@/lib/cooking";
import { cookCountToPatina, type Recipe } from "@/lib/recipes";
import { RecipeIllustration } from "@/components/RecipeIllustration";
import { useSignedPhotoUrl } from "@/lib/hooks/useSignedPhotoUrl";

export interface RecipeRowProps {
  recipe: Recipe;
}

export function RecipeRow({ recipe }: RecipeRowProps) {
  const t = useTranslations("recipes");
  const patina = cookCountToPatina(recipe.cook_count);

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
      <LedgerCard
        patina={patina}
        className="flex gap-3 items-center"
        style={{ padding: "12px" }}
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h3
            className="font-display truncate"
            style={{ fontSize: "18px", fontWeight: 500, lineHeight: 1.2 }}
          >
            {recipe.title}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap text-caption">
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
        <div
          className="relative shrink-0 overflow-hidden rounded-lg bg-surface-muted"
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
            <div aria-hidden className="w-full h-full flex items-center justify-center text-foreground-muted">
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
      </LedgerCard>
    </Link>
  );
}

export default RecipeRow;
