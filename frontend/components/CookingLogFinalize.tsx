"use client";

// UI-SPEC §"Surface 2" — single-scroll finalize page composing PhotoUploader,
// RatingPicker, and a Textarea for notes. Finaliser button is disabled until
// rating is non-null (D-03 enforced both client-side here and server-side in
// Plan 01's CookingLogFinalizeRequest).
//
// CRITICAL — voice notes (COOK-04): on iOS PWA standalone, the Web Speech
// API is broken (Phase 2 D-Voice in 02-CONTEXT.md and frontend/components/
// VoiceCaptureTab.tsx). The notes section is therefore textarea-only —
// users dictate via the iOS keyboard mic (OS-level affordance, works in
// any text field with no JS). UI-SPEC mentions a separate Mic button; we
// follow VoiceCaptureTab's reality-tested pattern instead.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { PhotoUploader } from "@/components/PhotoUploader";
import { RatingPicker } from "@/components/RatingPicker";
import {
  getActiveCookingLog,
  putFinalizeCookingLog,
  type CookingLogResponse,
  type LogRating,
} from "@/lib/cooking";
import { api } from "@/lib/api";
import type { Recipe } from "@/lib/recipes";

type Props = { logId: string };

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; log: CookingLogResponse; recipe: Recipe }
  | { kind: "gone" };

export function CookingLogFinalize({ logId }: Props) {
  const t = useTranslations("cooking_log.finalize");
  const tNotes = useTranslations("cooking_log.notes");
  const router = useRouter();

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [rating, setRating] = useState<LogRating | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load the active cooking log; if its id doesn't match the URL or it's
  // already finalized, render the EmptyState. v0.1 does not allow
  // re-finalize from the UI (CONTEXT.md "<decisions> future re-finalize" —
  // backend permits but frontend gates).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const active = await getActiveCookingLog();
        if (!alive) return;
        if (!active || active.id !== logId || active.rating !== null) {
          setState({ kind: "gone" });
          return;
        }
        const recipe = await api<Recipe>(`/api/recipes/${active.recipe_id}`);
        if (!alive) return;
        setState({ kind: "ready", log: active, recipe });
        setPhotoPaths(active.photo_paths ?? []);
        setNotes(active.notes ?? "");
      } catch {
        if (alive) setState({ kind: "gone" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [logId]);

  async function handleSubmit() {
    if (!rating || state.kind !== "ready") return;
    setSubmitting(true);
    try {
      await putFinalizeCookingLog(logId, {
        photo_paths: photoPaths,
        rating,
        notes: notes.trim() || null,
      });
      // D-04 — navigate Home; toast lands on Home post-navigation.
      router.push("/");
      toast.success(t("toast_saved"));
    } catch (e) {
      const message = (e as Error).message ?? "";
      if (message.startsWith("404")) {
        toast(t("save_404"));
        setTimeout(() => router.push("/"), 2000);
      } else if (message.startsWith("403")) {
        toast.error(t("save_403"));
        router.push("/");
      } else {
        toast.error(t("save_failed"));
      }
      setSubmitting(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <main className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-4">
        <div className="h-8 w-2/3 rounded bg-surface-muted animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-surface-muted animate-pulse" />
        <div className="h-32 w-full rounded-lg bg-surface-muted animate-pulse" />
      </main>
    );
  }

  if (state.kind === "gone") {
    return (
      <main className="flex flex-col flex-1">
        <EmptyState
          icon={Sparkles}
          heading={t("gone_heading")}
          body={t("gone_body")}
          cta={{ label: t("gone_cta"), href: "/" }}
        />
      </main>
    );
  }

  const canSubmit = !!rating && !submitting;

  return (
    <main className="flex flex-col flex-1 px-6 pt-6 pb-24 gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-title text-foreground">{t("page_title")}</h1>
        <p className="text-base text-foreground-muted line-clamp-1">
          « {state.recipe.title} »
        </p>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="photos-heading">
        <div className="flex flex-col gap-1">
          <h2 id="photos-heading" className="text-base font-semibold leading-6">
            {t("photos_heading")}
          </h2>
          <p className="text-sm text-foreground-muted leading-5">
            {t("photos_helper")}
          </p>
        </div>
        <PhotoUploader
          recipeId={null}
          cookingLogId={logId}
          paths={photoPaths}
          onChange={setPhotoPaths}
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="rating-heading">
        <div className="flex flex-col gap-1">
          <h2 id="rating-heading" className="text-base font-semibold leading-6">
            {t("rating_heading")}
          </h2>
          {!rating && (
            <p className="text-sm text-foreground-muted leading-5">
              {t("rating_helper")}
            </p>
          )}
        </div>
        <RatingPicker value={rating} onChange={setRating} />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="notes-heading">
        <div className="flex flex-col gap-1">
          <h2 id="notes-heading" className="text-base font-semibold leading-6">
            {t("notes_heading")}
          </h2>
          <p className="text-sm text-foreground-muted leading-5">
            {tNotes("helper_keyboard_mic")}
          </p>
        </div>
        <Textarea
          aria-labelledby="notes-heading"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notes_placeholder")}
          className="min-h-32"
        />
      </section>

      <div className="flex flex-col gap-3 pt-4">
        <Button
          type="button"
          size="lg"
          disabled={!canSubmit}
          onClick={handleSubmit}
          aria-describedby={!rating ? "rating-heading" : undefined}
          className="h-12"
        >
          {submitting ? t("submitting") : t("submit")}
        </Button>
      </div>
    </main>
  );
}
