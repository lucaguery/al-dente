"use client";

// Phase 42 ACTV-01/02/03 — active cooking session route.
//
// Visual register: La Grille · Soft warmth (ADR-0004). Tokens from
// frontend/app/globals.css. Locked decisions live in 42-CONTEXT.md (D-12..D-19).
//
// Architecture invariants honoured here:
//
// * #6 (French-only via next-intl) — every visible string flows through
//   `useTranslations("cooking_active")`; no hardcoded French.
// * #8 (HttpOnly cookie auth) — every fetch goes through `api()` and the
//   `/api/*` Vercel rewrite, carrying `aldente_auth` same-origin.
//
// Realtime contract:
// * The page subscribes to `recipe.updated` via `useRealtime().onEvent`. When
//   the Phase 42 STEP-03 BackgroundTask commits structured steps, this
//   subscription swaps in the populated recipe and flips the UI from
//   `<BrandLoader />` to the step navigator.
//
// State posture (D-13): step index is UI-state only — no server column, no
// persistence across reload. Couple-scale acceptable.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { OnboardingGuard } from "@/lib/onboarding-guard";
import { useRealtime } from "@/components/RealtimeProvider";
import { BrandLoader } from "@/components/BrandLoader";
import { api } from "@/lib/api";
import {
  fetchCookingLog,
  triggerStepsExtraction,
  type CookingLogResponse,
} from "@/lib/cooking";
import type { Recipe, StepEntry } from "@/lib/recipes";

// ---------------------------------------------------------------------------
// Step-shape detection — recipe.steps may be: structured StepEntry[] (post
// 42-01 backfill), legacy `string[]` (pre-migration rows the lazy backfill
// hasn't touched yet), or `[]` (never had steps). Empty + legacy both route
// to the loader + trigger the backend BackgroundTask.
// ---------------------------------------------------------------------------

type StepsState = "empty" | "legacy" | "structured";

function detectStepsState(steps: unknown): StepsState {
  if (!Array.isArray(steps) || steps.length === 0) return "empty";
  const first = steps[0];
  if (typeof first === "string") return "legacy";
  if (
    first &&
    typeof first === "object" &&
    "text" in first &&
    "ingredient_refs" in first
  ) {
    return "structured";
  }
  return "legacy";
}

export default function ActiveCookingSessionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const t = useTranslations("cooking_active");
  const router = useRouter();
  const realtime = useRealtime();

  const [log, setLog] = useState<CookingLogResponse | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Fetch cookingLog + recipe on mount.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const cl = await fetchCookingLog(id);
        if (!alive) return;
        setLog(cl);
        const r = await api<Recipe>(`/api/recipes/${cl.recipe_id}`);
        if (!alive) return;
        setRecipe(r);
      } catch (err) {
        // Silent log — the UI stays in the loader; user can close and reopen.
        console.error("ActiveCookingSession: fetch failed", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const stepsState: StepsState = recipe ? detectStepsState(recipe.steps) : "empty";

  // First-mount backfill trigger — only when needed. Deps intentionally
  // narrowed to `recipe?.id` (not the full recipe object) so realtime
  // updates to other recipe fields don't re-fire the backend BackgroundTask.
  useEffect(() => {
    if (!recipe) return;
    if (stepsState === "structured") return;
    triggerStepsExtraction(recipe.id).catch((err) => {
      console.error("triggerStepsExtraction failed", err);
    });
  }, [recipe?.id, stepsState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to recipe.updated — swap in the populated recipe when the
  // BackgroundTask commits and broadcasts. Deps narrowed to `recipe?.id`
  // so re-subscribing only happens when the recipe identity changes
  // (otherwise every payload-driven setRecipe re-fires the effect and
  // double-subscribes).
  useEffect(() => {
    if (!realtime || !recipe) return;
    const off = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
      if (payload.id !== recipe.id) return;
      setRecipe(payload);
    });
    return off;
  }, [realtime, recipe?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 60s elapsed-time refresh.
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // 42-RESEARCH §R-02 — field name is `cooked_at`, not `started_at`.
  // Deps narrowed to `log?.cooked_at` so unrelated log field changes don't
  // recompute the timer (couple-scale; nothing else on log changes mid-session).
  const elapsedMin = useMemo(() => {
    if (!log) return 0;
    const startedMs = new Date(log.cooked_at).getTime();
    return Math.max(0, Math.floor((nowTick - startedMs) / 60_000));
  }, [log?.cooked_at, nowTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const startedAtHHMM = useMemo(() => {
    if (!log) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(log.cooked_at));
  }, [log?.cooked_at]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- Loading state ----------------
  if (!recipe || !log || stepsState !== "structured") {
    return (
      <OnboardingGuard>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
          <BrandLoader aria-label={t("steps_extracting")} />
          <p className="text-sm text-muted-foreground">{t("steps_extracting")}</p>
        </div>
      </OnboardingGuard>
    );
  }

  // ---------------- Navigator state ----------------
  const steps: StepEntry[] = recipe.steps;
  const totalSteps = steps.length;
  // Clamp stepIndex defensively in case Gemini extraction lands a shorter
  // step list than the user has already navigated through.
  const safeStepIndex = Math.min(stepIndex, totalSteps - 1);
  const currentStep = steps[safeStepIndex];
  const isLastStep = safeStepIndex === totalSteps - 1;
  const isFirstStep = safeStepIndex === 0;

  // Ingredient ref line — match `ingredient_refs[i]` to
  // `recipe.ingredients[].name` exactly; fall back to the raw ref text on
  // no-match (per CONTEXT.md D-08 — graceful fallback).
  const refLine = currentStep.ingredient_refs
    .map((ref) => {
      const ing = recipe.ingredients?.find((i) => i.name === ref);
      if (!ing) return ref;
      return [
        ing.quantity != null ? String(ing.quantity) : null,
        ing.unit ?? null,
        ing.name,
      ]
        .filter(Boolean)
        .join(" ");
    })
    .join(" · ");

  return (
    <OnboardingGuard>
      <div className="min-h-screen bg-background flex flex-col">
        {/* det-top: close · crumb · step pin */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            type="button"
            onClick={() => router.push(`/cooking-logs/${id}`)}
            aria-label={t("close_aria")}
            className="size-9 flex items-center justify-center rounded-full text-foreground hover:bg-muted"
          >
            <X size={20} aria-hidden />
          </button>
          <span className="text-caption text-muted-foreground tabular-nums">
            {t("crumb_started_at", {
              time: startedAtHHMM,
              elapsed: elapsedMin,
            })}
          </span>
          <span className="text-caption tabular-nums text-foreground">
            {t("step_count_pin", {
              current: safeStepIndex + 1,
              total: totalSteps,
            })}
          </span>
        </header>

        {/* Progress segments — prior filled, current colored, future hollow */}
        <div className="flex gap-1 px-4 py-3">
          {steps.map((_, ix) => {
            const cls =
              ix < safeStepIndex
                ? "bg-[color-mix(in_oklab,var(--color-primary)_15%,transparent)]"
                : ix === safeStepIndex
                  ? "bg-primary"
                  : "border border-border bg-transparent";
            return (
              <div
                key={ix}
                className={`flex-1 h-1 rounded-full ${cls}`}
                aria-hidden
              />
            );
          })}
        </div>

        {/* Step text + ingredient-ref line */}
        <main className="flex-1 flex flex-col px-6 py-8 gap-4 max-w-md mx-auto w-full">
          <p className="text-lg font-normal text-foreground">{currentStep.text}</p>
          {refLine && (
            <p className="font-mono text-sm text-muted-foreground">
              {t("uses_ingredients_label")}: {refLine}
            </p>
          )}
        </main>

        {/* Navigator footer */}
        <footer className="flex items-center justify-between px-4 py-4 border-t border-border gap-3">
          <button
            type="button"
            disabled={isFirstStep}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="flex-1 h-12 rounded-md border border-border text-foreground disabled:opacity-40"
          >
            {t("step_prev")}
          </button>
          {isLastStep ? (
            <button
              type="button"
              onClick={() => router.push(`/cooking-logs/${id}/finalize`)}
              className="flex-1 h-12 rounded-md bg-primary text-primary-foreground font-medium"
            >
              {t("finalize_cta")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(totalSteps - 1, i + 1))}
              className="flex-1 h-12 rounded-md bg-primary text-primary-foreground font-medium"
            >
              {t("step_next")}
            </button>
          )}
        </footer>
      </div>
    </OnboardingGuard>
  );
}
