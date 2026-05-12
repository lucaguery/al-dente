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
import { ChevronLeft, FileQuestion, Mic, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { VoiceModifySheet } from "@/components/VoiceModifySheet";
import { api } from "@/lib/api";
import { formatRelativeFr } from "@/lib/datetime";
import { useEnumLabels } from "@/lib/enum-labels";
import { deleteRecipe, getSignedPhotoUrl } from "@/lib/recipes";
import { useRealtime } from "@/components/RealtimeProvider";
import type { Recipe } from "@/lib/recipes";

export default function RecipeDetailPage() {
  const t = useTranslations("recipes");
  const tDetail = useTranslations("recipes.detail");
  const tVoiceModify = useTranslations("recipes.voice_modify");
  const tErr = useTranslations("onboarding.errors");
  const enumLabels = useEnumLabels();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const realtime = useRealtime();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [voiceModifyOpen, setVoiceModifyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!recipe) return;
    if (!window.confirm(t("delete_confirm"))) return;
    setDeleting(true);
    try {
      await deleteRecipe(recipe.id);
      toast.success(t("delete_success"));
      router.replace("/recipes");
    } catch {
      toast.error(tErr("network"));
      setDeleting(false);
    }
  }

  const refreshPhotoUrls = useCallback(async (r: Recipe) => {
    // TODO(productize): D-05 living image extends to the detail-page hero
    // once we surface r.last_cooked_photo_path here. The path needs the
    // cooking-log signed-URL helper (path layout cooking-logs/...). For v0.1
    // the living image surfaces on RecipeCard list view only — the detail
    // page keeps the existing recipe.photo_paths gallery. See 04-CONTEXT.md
    // and 04-02-PLAN.md objective for the scope rationale.
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
    const offUpdated = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
      if (payload.id !== id) return;
      setRecipe(payload);
      void refreshPhotoUrls(payload);
    });
    // If the partner deletes this recipe while we're viewing it, navigate away.
    const offDeleted = realtime.onEvent<{ id: string }>("recipe.deleted", (payload) => {
      if (payload.id !== id) return;
      router.replace("/recipes");
    });
    return () => {
      offUpdated();
      offDeleted();
    };
  }, [realtime, id, refreshPhotoUrls, router]);

  if (notFound) {
    return (
      <OnboardingGuard>
        <section className="flex flex-col flex-1 bg-background">
          <header className="sticky top-0 h-12 px-(--spacing-page-x) flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-10">
            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12"
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
          <header className="sticky top-0 h-12 px-(--spacing-page-x) flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-10">
            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12"
              aria-label={t("back_aria")}
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </header>
          <div className="px-(--spacing-page-x) pt-6 flex flex-col gap-3">
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
        <header className="sticky top-0 h-12 px-(--spacing-page-x) flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-10">
          <Button
            size="icon"
            variant="ghost"
            className="h-12 w-12"
            aria-label={t("back_aria")}
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12"
              aria-label={tVoiceModify("trigger_aria")}
              onClick={() => setVoiceModifyOpen(true)}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12"
              aria-label={t("edit_aria")}
              onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
            >
              <Pencil className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("delete_aria")}
              disabled={deleting}
              onClick={handleDelete}
              className="h-12 w-12 text-foreground-muted hover:text-destructive"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Hero — full-bleed photo + paper-grain overlay strip OR no-photo Card fallback */}
        {photoUrls.length > 0 ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
            <img
              src={photoUrls[0]}
              alt=""
              className="aspect-[4/3] w-full rounded-b-2xl object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-card/85 backdrop-blur-sm paper-grain px-6 py-4 rounded-b-2xl">
              <h1 className="text-display text-foreground">{recipe.title}</h1>
            </div>
          </div>
        ) : (
          <Card className="paper-grain shadow-card mx-6 my-4 px-6 py-6">
            <h1 className="text-display text-foreground">{recipe.title}</h1>
          </Card>
        )}

        <div className="px-(--spacing-page-x) flex flex-col gap-(--spacing-section-y) pb-(--spacing-bottom-safe) mt-6">
          {/* Metadata pill row — cuisine, moods, protein, prep/servings */}
          <div className="flex flex-wrap gap-2 items-center">
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
            {recipe.cook_time_minutes != null && (
              <span className="text-sm text-foreground-muted">
                {tDetail("cook_time_label")}: {recipe.cook_time_minutes} min
              </span>
            )}
            {recipe.difficulty && (
              <span className="text-sm text-foreground-muted">
                {tDetail("difficulty_label")}: {enumLabels.difficulty(recipe.difficulty)}
              </span>
            )}
          </div>

          {/* Multi-photo carousel — renders photos 2..N when multi-photo (hero already shows photo 1) */}
          {photoUrls.length > 1 && (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-6 px-6 py-4 scrollbar-none">
              {photoUrls.slice(1).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="h-64 w-64 rounded-lg object-cover snap-start flex-shrink-0"
                />
              ))}
            </div>
          )}

          {recipe.description && (
            <section className="mb-4">
              {/* sr-only heading so screen readers announce "Description" before the text */}
              <h2 className="text-title sr-only">{tDetail("description_label")}</h2>
              <p className="text-base text-foreground-muted whitespace-pre-line">
                {recipe.description}
              </p>
            </section>
          )}

          {recipe.ingredients && recipe.ingredients.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-title">{t("section_ingredients")}</h2>
              <ul className="border-l-2 border-primary/30 pl-4 flex flex-col gap-2 py-1">
                {recipe.ingredients.map((ing, i) => {
                  const qty = ing.quantity != null ? `${ing.quantity}` : "";
                  const unit = ing.unit ? ` ${ing.unit}` : "";
                  const lead = `${qty}${unit}`.trim();
                  return (
                    <li key={i} className="text-base leading-relaxed">
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
              <h2 className="text-title">{t("section_steps")}</h2>
              <ol className="flex flex-col gap-3 py-1">
                {recipe.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-display italic text-primary/80 text-base shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-base leading-relaxed">{s}</span>
                  </li>
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
