"use client";

// RecipeRowMinimal — La Grille text-only row for the third Bibliothèque view
// (Phase 40 LIB-01, sketch lines 1687-1693). Numbered index + name + cuisine
// meta + optional `validé` pill. NO photo column — no photo URL hook is
// imported here. Pure hairline rows on the off-white surface — the
// "space carries" discipline applied to the library list.

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Recipe } from "@/lib/recipes";
import { useEnumLabels } from "@/lib/enum-labels";

export interface RecipeRowMinimalProps {
  recipe: Recipe;
  /** Position in the rendered list — drives the `01`-`NN` Geist Mono prefix.
   *  Computed by the parent so the index reflects sort/filter order. */
  index: number;
  /** Whether the recipe is on today's validated state (both members yes).
   *  Optional — parent decides whether to surface this. Defaults to false. */
  validated?: boolean;
}

export function RecipeRowMinimal({
  recipe,
  index,
  validated = false,
}: RecipeRowMinimalProps) {
  const t = useTranslations("library.minimal");
  const labels = useEnumLabels();
  const meta = recipe.cuisine ? labels.cuisine(recipe.cuisine) : "";

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex items-center gap-4 w-full py-3 border-b border-border hover:bg-muted/30 transition-colors"
    >
      <span
        className="text-caption tabular-nums shrink-0 text-muted-foreground font-mono"
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="flex-1 text-base font-medium text-foreground truncate">
        {recipe.title}
      </span>
      {meta ? (
        <span className="text-caption text-muted-foreground shrink-0">
          {meta}
        </span>
      ) : null}
      {validated ? (
        <span className="text-caption tabular-nums px-2 py-0.5 rounded-sm bg-[var(--color-valide-tint)] text-primary border border-primary shrink-0">
          {t("validated_pill")}
        </span>
      ) : null}
    </Link>
  );
}

export default RecipeRowMinimal;
