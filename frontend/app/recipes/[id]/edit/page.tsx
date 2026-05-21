"use client";

// UI-SPEC §"Surface-by-Surface Pinning" §10 (edit) + §"Copywriting Contract"
// (edit submit verb). Pre-fills RecipeForm from GET /api/recipes/{id} and
// PUTs the form body. If the recipe was a draft and the form is being saved
// with title + ingredients, we promote it to `structured` in the SAME PUT
// (status field on RecipeUpdate, accepted threat T-01-08-08 in 01-08-PLAN).
//
// RID-03 — ?focus= consumption (D-22, D-23):
// useSearchParams() requires a <Suspense> boundary in Next.js 16 production
// builds (production static prerendering cannot know query params at build
// time). Pattern follows the live project precedent at
// frontend/app/onboarding/share-code/page.tsx. The Inner component reads
// focus, constructs a ref map keyed by FieldKey, passes it to RecipeForm,
// and after firing scroll/focus strips the param via router.replace(pathname)
// so a re-mount doesn't re-fire.

import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { api } from "@/lib/api";
import {
  RecipeForm,
  recipeToFormValues,
  type RecipeFormValues,
  type RecipeBody,
  type RecipeFormRefs,
} from "@/components/RecipeForm";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { isFieldKey } from "@/lib/recipe-completeness";
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

// useSearchParams must be wrapped in <Suspense> in Next.js App Router so
// the page can be statically rendered while client-side params hydrate.
// See RESEARCH.md §Pitfall 1 and Pattern 4.
export default function RecipeEditPage() {
  return (
    <OnboardingGuard>
      <Suspense fallback={null}>
        <EditInner />
      </Suspense>
    </OnboardingGuard>
  );
}

function EditInner() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("recipes.edit");
  const tErr = useTranslations("onboarding.errors");
  const [initial, setInitial] = useState<RecipeFormValues | null>(null);
  const [origStatus, setOrigStatus] = useState<string>("structured");
  // Phase 28 DETAIL-04 — pin set for per-input marginalia on the edit form.
  const [manuallyEditedFields, setManuallyEditedFields] = useState<string[]>([]);

  // RID-03 — build ref map for all 11 FieldKey targets (D-22, D-23).
  // Refs are stable objects; only the focusRefs object itself is recreated
  // on mount (once). RecipeForm attaches each ref to the matching DOM node.
  const focusRefs: RecipeFormRefs = {
    title: useRef<HTMLInputElement>(null),
    description: useRef<HTMLTextAreaElement>(null),
    ingredients: useRef<HTMLTextAreaElement>(null),
    steps: useRef<HTMLTextAreaElement>(null),
    prep_time_minutes: useRef<HTMLInputElement>(null),
    cook_time_minutes: useRef<HTMLInputElement>(null),
    servings: useRef<HTMLInputElement>(null),
    difficulty: useRef<HTMLButtonElement>(null),
    cuisine: useRef<HTMLButtonElement>(null),
    mood: useRef<HTMLDivElement>(null),
    main_protein: useRef<HTMLButtonElement>(null),
  };

  // Read the ?focus= param once. isFieldKey() validates it — unknown values
  // are silently ignored (D-22).
  const focusParam = searchParams.get("focus");
  const focus = focusParam && isFieldKey(focusParam) ? focusParam : null;

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const prefill = readPrefill();
    api<Recipe>(`/api/recipes/${id}`)
      .then((r) => {
        if (!alive) return;
        const merged: Recipe = prefill
          ? {
              ...r,
              ...prefill,
              mood:
                prefill.mood !== undefined && prefill.mood !== null
                  ? prefill.mood
                  : r.mood,
              seasonality:
                prefill.seasonality !== undefined &&
                prefill.seasonality !== null
                  ? prefill.seasonality
                  : r.seasonality,
              // Phase 42 STEP-02 — prefill.steps is `StepEntry[] | null` (the
              // Gemini-modified shape may omit steps); the persisted Recipe
              // shape is non-nullable `StepEntry[]`. Fall back to the
              // server-fetched recipe steps when prefill carries null.
              steps:
                prefill.steps !== undefined && prefill.steps !== null
                  ? prefill.steps
                  : r.steps,
            }
          : r;
        setInitial(recipeToFormValues(merged));
        setOrigStatus(r.status);
        setManuallyEditedFields(r.manually_edited_fields ?? []);
      })
      .catch(() => {
        if (alive) toast.error(tErr("network"));
      });
    return () => {
      alive = false;
    };
  }, [id, tErr]);

  // RID-03 — fire scroll/focus after the form mounts and initial data loads.
  // Runs when focus + initial both become non-null (form is rendered).
  // After firing, strips ?focus= from the URL so a re-mount doesn't re-fire.
  useEffect(() => {
    if (!focus || !initial) return;
    // Small tick to let React finish painting the form inputs into the DOM.
    const timer = setTimeout(() => {
      const node = focusRefs[focus]?.current;
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        node.focus();
      }
      // Strip the ?focus= param — router.replace(pathname) removes all query
      // params cleanly (usePathname returns pathname without query string).
      router.replace(pathname);
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, initial]);

  async function onSubmit(body: RecipeBody, _photoPaths: string[]) {
    if (!id) return;
    try {
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
      focusRefs={focusRefs}
      manuallyEditedFields={manuallyEditedFields}
    />
  );
}
