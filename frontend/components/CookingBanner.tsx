"use client";

// Phase 3 — "En train de cuisiner" persistent banner (D-08, COOK-02).
//
// The banner appears whenever an unfinalized cooking log exists for today on
// either phone (driven by getActiveCookingLog() on mount + the cooking.started
// realtime echo). "Finaliser" navigates to the Phase-4 stub at
// /cooking-logs/{id}/finalize. "Passer" hides the banner for the session
// without deleting the log — so it reappears next session if the log is still
// unfinalized.
//
// 03-UI-SPEC.md §"Surface 4: En train de cuisiner banner".

import { ChefHat, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type CookingBannerProps = {
  logId: string;
  recipeTitle: string;
  onSkip: () => void;
};

export function CookingBanner({
  logId,
  recipeTitle,
  onSkip,
}: CookingBannerProps) {
  const t = useTranslations("home.cooking_banner");
  return (
    <div
      role="region"
      aria-labelledby="cooking-banner-title"
      className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 min-h-16 rounded-2xl bg-valide-tint border border-border"
    >
      <ChefHat
        size={24}
        className="text-emerald-700 dark:text-emerald-300 shrink-0"
        aria-hidden
      />
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span
          id="cooking-banner-title"
          className="text-base font-semibold leading-6"
        >
          {t("title")}
        </span>
        <span className="text-sm text-foreground-muted leading-5 line-clamp-1">
          {recipeTitle}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/cooking-logs/${logId}/finalize`}
          className="inline-flex items-center justify-center h-12 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium gap-1"
        >
          <Sparkles size={16} aria-hidden />
          {t("finalize")}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-12 px-3"
          onClick={onSkip}
        >
          {t("skip")}
        </Button>
      </div>
    </div>
  );
}
