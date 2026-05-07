"use client";

// UI-SPEC §7 — Recipe detail.
// Photo gallery uses 5-minute signed URLs (private bucket); we re-fetch
// each path on mount and on `recipe.updated` realtime frames so the
// gallery stays in sync if the partner uploads a photo while we're here.
//
// 404 branch is full-page (UI-SPEC §"Toast vs inline rules": permanent
// state lives inline, NOT a toast). 401 redirects to /onboarding/welcome
// (handled by lib/api.ts).

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, FileQuestion, Mic, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { VoiceModifySheet } from "@/components/VoiceModifySheet";
import { api } from "@/lib/api";
import { formatRelativeFr } from "@/lib/datetime";
import { getSignedPhotoUrl } from "@/lib/recipes";
import { useRealtime } from "@/components/RealtimeProvider";
import type { Recipe } from "@/lib/recipes";

export default function RecipeDetailPage() {
  const t = useTranslations("recipes");
  const tVoiceModify = useTranslations("recipes.voice_modify");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const realtime = useRealtime();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [voiceModifyOpen, setVoiceModifyOpen] = useState(false);

  const refreshPhotoUrls = useCallback(async (r: Recipe) => {
    if (r.photo_paths.length === 0) {
      setPhotoUrls([]);
      return;
    }
    const settled = await Promise.allSettled(
      r.photo_paths.map((p) => getSignedPhotoUrl(r.id, p)),
    );
    const urls = settled
      .filter((s): s is PromiseFulfilledResult<string> => s.status === "fulfilled")
      .map((s) => s.value);
    setPhotoUrls(urls);
  }, []);

  // Initial load.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    api<Recipe>(`/api/recipes/${id}`)
      .then((r) => {
        if (!alive) return;
        setRecipe(r);
        void refreshPhotoUrls(r);
      })
      .catch((err: Error) => {
        if (!alive) return;
        // api() throws "${status} ${statusText}" on non-OK; pattern-match prefix.
        // 401 is intercepted by api() (full-page redirect); we only see 404 here.
        if (err.message.startsWith("404")) {
          setNotFound(true);
        } else {
          // Any other error: also surface as not-found rather than a stale UI.
          // Couple-scale; productize-later: distinguish network from 404.
          setNotFound(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [id, refreshPhotoUrls]);

  // Realtime: replace the local recipe state when the partner edits or
  // uploads a photo to THIS recipe. Photo URL refresh is also re-driven.
  useEffect(() => {
    if (!realtime || !id) return;
    return realtime.onEvent<Recipe>("recipe.updated", (payload) => {
      if (payload.id !== id) return;
      setRecipe(payload);
      void refreshPhotoUrls(payload);
    });
  }, [realtime, id, refreshPhotoUrls]);

  if (notFound) {
    return (
      <OnboardingGuard>
        <section className="flex flex-col flex-1 bg-background">
          <header className="sticky top-0 h-12 px-6 flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-10">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("back_aria")}
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </header>
          <EmptyState
            icon={FileQuestion}
            heading={t("detail_404_heading")}
            body={t("detail_404_body")}
            cta={{ label: t("detail_404_cta"), href: "/recipes" }}
          />
        </section>
      </OnboardingGuard>
    );
  }

  if (!recipe) {
    return (
      <OnboardingGuard>
        <section className="flex flex-col flex-1 bg-background">
          <header className="sticky top-0 h-12 px-6 flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-10">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("back_aria")}
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </header>
          <div className="px-6 pt-6 flex flex-col gap-3">
            <div className="h-44 w-full rounded-lg bg-surface-muted animate-pulse" />
            <div className="h-7 w-2/3 rounded bg-surface-muted animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-surface-muted animate-pulse" />
          </div>
        </section>
      </OnboardingGuard>
    );
  }

  const hasPrep = recipe.prep_time_minutes != null;
  const hasServings = recipe.servings != null;
  const metaSpan =
    hasPrep || hasServings
      ? [
          hasPrep ? `${recipe.prep_time_minutes}min` : null,
          hasServings ? `${recipe.servings} pers.` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

  return (
    <OnboardingGuard>
      <section className="flex flex-col flex-1 bg-background">
        <header className="sticky top-0 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-10">
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("back_aria")}
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label={tVoiceModify("trigger_aria")}
              onClick={() => setVoiceModifyOpen(true)}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("edit_aria")}
              onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
            >
              <Pencil className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Hero — photo gallery or empty placeholder */}
        {photoUrls.length > 0 ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-6 py-4">
            {photoUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL
              <img
                key={i}
                src={url}
                alt=""
                className="h-64 w-64 rounded-lg object-cover snap-start flex-shrink-0"
              />
            ))}
          </div>
        ) : (
          <div className="mx-6 my-4 h-44 rounded-lg bg-surface-muted flex items-center justify-center text-sm text-foreground-muted">
            {t("no_photo")}
          </div>
        )}

        <div className="px-6 flex flex-col gap-6 pb-24">
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">
            {recipe.title}
          </h1>

          {/* Meta row: cuisine, moods, protein, prep/servings */}
          <div className="flex items-center gap-2 flex-wrap">
            {recipe.cuisine ? (
              <Badge variant="secondary">{recipe.cuisine}</Badge>
            ) : null}
            {recipe.mood.map((m) => (
              <Badge key={m} variant="secondary">
                {m}
              </Badge>
            ))}
            {recipe.main_protein ? (
              <Badge variant="secondary">{recipe.main_protein}</Badge>
            ) : null}
            {metaSpan ? (
              <span className="text-sm text-foreground-muted">{metaSpan}</span>
            ) : null}
          </div>

          {recipe.ingredients && recipe.ingredients.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">
                {t("section_ingredients")}
              </h2>
              <ul className="flex flex-col gap-2">
                {recipe.ingredients.map((ing, i) => {
                  const qty = ing.quantity != null ? `${ing.quantity}` : "";
                  const unit = ing.unit ? ` ${ing.unit}` : "";
                  const lead = `${qty}${unit}`.trim();
                  return (
                    <li key={i} className="text-base">
                      {lead ? `${lead} ` : ""}
                      {ing.name}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {recipe.steps && recipe.steps.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{t("section_steps")}</h2>
              <ol className="list-decimal list-inside flex flex-col gap-3 text-base">
                {recipe.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ) : null}

          <p className="text-sm text-foreground-muted">
            {t("footer_last_cooked", {
              when: recipe.last_cooked_at
                ? formatRelativeFr(recipe.last_cooked_at)
                : t("never_cooked"),
            })}{" "}
            ·{" "}
            {t("footer_cook_count", { count: recipe.cook_count })}
          </p>
        </div>
      </section>
      <VoiceModifySheet
        recipeId={recipe.id}
        open={voiceModifyOpen}
        onOpenChange={setVoiceModifyOpen}
      />
    </OnboardingGuard>
  );
}
