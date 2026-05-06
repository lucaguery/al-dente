"use client";

// UI-SPEC §"Surface-by-Surface Pinning" §10 (edit) + §"Copywriting Contract"
// (edit submit verb). Pre-fills RecipeForm from GET /api/recipes/{id} and
// PUTs the form body. If the recipe was a draft and the form is being saved
// with title + ingredients, we promote it to `structured` in the SAME PUT
// (status field on RecipeUpdate, accepted threat T-01-08-08 in 01-08-PLAN).

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { api } from "@/lib/api";
import {
  RecipeForm,
  recipeToFormValues,
  type RecipeFormValues,
  type RecipeBody,
} from "@/components/RecipeForm";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import type { Recipe } from "@/lib/recipes";

export default function RecipeEditPage() {
  return (
    <OnboardingGuard>
      <Inner />
    </OnboardingGuard>
  );
}

function Inner() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const t = useTranslations("recipes.edit");
  const tErr = useTranslations("onboarding.errors");
  const [initial, setInitial] = useState<RecipeFormValues | null>(null);
  const [origStatus, setOrigStatus] = useState<string>("structured");

  useEffect(() => {
    if (!id) return;
    let alive = true;
    api<Recipe>(`/api/recipes/${id}`)
      .then((r) => {
        if (!alive) return;
        setInitial(recipeToFormValues(r));
        setOrigStatus(r.status);
      })
      .catch(() => {
        if (alive) toast.error(tErr("network"));
      });
    return () => {
      alive = false;
    };
  }, [id, tErr]);

  async function onSubmit(body: RecipeBody) {
    if (!id) return;
    try {
      // Promote draft → structured if the form is being saved with title +
      // ingredients. This is the W1 path that lets users finish a quick-add
      // via the edit form (W2 layers Gemini promotion via BackgroundTask on
      // top, overwriting the same column with extracted fields).
      const promote =
        origStatus === "draft" &&
        body.title.trim().length > 0 &&
        (body.ingredients?.length ?? 0) > 0;
      const payload = promote
        ? { ...body, status: "structured" as const }
        : body;
      const r = await api<Recipe>(`/api/recipes/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success(t("saved_toast"));
      router.replace(`/recipes/${r.id}`);
    } catch {
      toast.error(tErr("network"));
    }
  }

  if (!initial || !id) return null;
  return (
    <RecipeForm
      recipeId={id}
      initial={initial}
      onSubmit={onSubmit}
      submitLabel={t("submit")}
      backHref={`/recipes/${id}`}
      title={t("title")}
    />
  );
}
