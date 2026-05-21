"use client";

// Phase 41 THRD-01 — thin top-bar for the dedicated /recipes/[id]/thread route.
// Replaces the inline thread-meta strip that previously lived inside the
// structured view (deleted in Plan 41-02 Task 2, per D-17 hard-rip-out).
//
// Layout (sketch §Recette thread, lines 1866-1916):
//   ← (Lucide ArrowLeft, explicit href to /recipes/[id] per D-16)
//   {recipe.name · thread}        ← truncated at 20 chars
//   N tours                       ← Geist Mono pin, informational only
//
// La Grille register (ADR-0004):
//   - Geist + Geist Mono on off-white #FAFAF7
//   - Hairline bottom border (no shadow)
//   - h-12 row, px-4 inset, gap-3 between slots
//
// Strings all flow through next-intl (invariant #6) under recipes.thread.*.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

type ThreadTopBarProps = {
  recipeId: string;
  recipeName: string;
  toursCount: number;
};

function truncateName(name: string): string {
  return name.length > 20 ? `${name.slice(0, 19)}…` : name;
}

export default function ThreadTopBar({
  recipeId,
  recipeName,
  toursCount,
}: ThreadTopBarProps) {
  const t = useTranslations("recipes.thread");
  return (
    <header className="flex items-center gap-3 h-12 px-4 border-b border-border bg-background">
      <Link
        href={`/recipes/${recipeId}`}
        aria-label={t("back_aria")}
        className="shrink-0 inline-flex items-center justify-center"
      >
        <ArrowLeft className="size-5 text-foreground" />
      </Link>
      <span className="flex-1 truncate text-base font-medium">
        {truncateName(recipeName)}
        <span className="text-muted-foreground">
          {" "}
          · {t("crumb_suffix")}
        </span>
      </span>
      <span className="text-caption font-mono tabular-nums text-muted-foreground shrink-0">
        {toursCount} {t("tours_label")}
      </span>
    </header>
  );
}
