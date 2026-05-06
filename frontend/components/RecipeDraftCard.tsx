"use client";

// UI-SPEC §9 — Drafts inbox row. Same shape as RecipeCard but with a
// `Brouillon` badge instead of cuisine/last-cooked, and the row routes
// to /recipes/{id}/edit (drafts ARE the editable surface; 01-11 ships
// that route).

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Recipe } from "@/lib/recipes";

export function RecipeDraftCard({ recipe }: { recipe: Recipe }) {
  const t = useTranslations("recipes");
  return (
    <Link
      href={`/recipes/${recipe.id}/edit`}
      className="flex gap-4 p-3 bg-background rounded-lg border border-border hover:bg-surface-muted transition-colors"
    >
      <div
        aria-hidden
        className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0"
      />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <h3 className="text-base font-semibold leading-6 line-clamp-1">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{t("draft_badge")}</Badge>
        </div>
      </div>
    </Link>
  );
}
