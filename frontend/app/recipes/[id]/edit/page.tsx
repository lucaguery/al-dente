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
import type { GeminiExtractedRecipe, Recipe } from "@/lib/recipes";

// CAPTURE-05 / D-11: voice-modify prefill. After POST /recipes/{id}/voice-modify
// returns, VoiceModifySheet stores the result in sessionStorage and routes here.
// We read once and clear the entry — page refresh should NOT re-apply Gemini's
// output. No diff UI in v0.1 (D-11 explicit); user just lands on a pre-filled
// edit form merged with whatever fields were already on the recipe.
const PREFILL_KEY = "voice-modify-prefill";

function readPrefill(): GeminiExtractedRecipe | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PREFILL_KEY);
  if (raw == null) return null;
  // T-02-05-01 mitigation: corrupt JSON falls back to no prefill.
  sessionStorage.removeItem(PREFILL_KEY);
  try {
    return JSON.parse(raw) as GeminiExtractedRecipe;
  } catch {
    return null;
  }
}

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
    // Read sessionStorage prefill ONCE on mount and clear it. If present,
    // we merge it onto the loaded recipe before running recipeToFormValues
    // so the form opens with Gemini's modified values pre-applied.
    const prefill = readPrefill();
    api<Recipe>(`/api/recipes/${id}`)
      .then((r) => {
        if (!alive) return;
        const merged: Recipe = prefill
          ? {
              ...r,
              ...prefill,
              // Preserve recipe arrays when prefill omits them; Gemini may
              // return an empty array intentionally, so only fall back to
              // the recipe's value when prefill's value is null/undefined.
              mood:
                prefill.mood !== undefined && prefill.mood !== null
                  ? prefill.mood
                  : r.mood,
              seasonality:
                prefill.seasonality !== undefined &&
                prefill.seasonality !== null
                  ? prefill.seasonality
                  : r.seasonality,
            }
          : r;
        setInitial(recipeToFormValues(merged));
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
