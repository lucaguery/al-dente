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
import type { Recipe } from "@/lib/recipes";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const t = useTranslations("recipes");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const first = recipe.photo_paths[0];
    if (!first) {
      setSrc(null);
      return;
    }
    getSignedPhotoUrl(recipe.id, first)
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [recipe.id, recipe.photo_paths]);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex gap-4 p-3 bg-background rounded-lg border border-border hover:bg-surface-muted transition-colors"
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
        <h3 className="text-base font-semibold leading-6 line-clamp-1">
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
