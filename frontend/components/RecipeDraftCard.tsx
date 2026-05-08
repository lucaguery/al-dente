"use client";

// UI-SPEC §9 — Drafts inbox row, extended in Phase 2 with three variants
// (CONTEXT.md D-07/D-08/D-09):
//
//   1. Manual draft  → existing `Brouillon` badge, taps through to edit form
//   2. Processing    → spinner + "Extraction en cours…"; row is NOT tappable
//   3. Failed        → `Échec` badge + Réessayer button kicks retry-promotion
//
// Variant selection looks at `recipe.status`, `recipe.promotion_error`, and
// `recipe.source_capture.type` together because URL drafts (CAPTURE-03) are
// user-completed, not Gemini-promoted — they render the manual variant even
// though their `source_capture.type !== 'manual'`.

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { variants } from "@/lib/motion";
import { deleteRecipe, postRetryPromotion } from "@/lib/recipes";
import type { Recipe } from "@/lib/recipes";

export function RecipeDraftCard({ recipe }: { recipe: Recipe }) {
  const t = useTranslations("recipes");
  const tPromo = useTranslations("recipes.promotion");
  const tErr = useTranslations("onboarding.errors");
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(t("delete_confirm"))) return;
    setDeleting(true);
    try {
      await deleteRecipe(recipe.id);
      toast.success(t("delete_success"));
      // recipe.deleted realtime event removes this card from the inbox list.
    } catch {
      toast.error(tErr("network"));
      setDeleting(false);
    }
  }

  const captureType = recipe.source_capture?.type;
  const isProcessing =
    recipe.status === "draft" &&
    recipe.promotion_error == null &&
    captureType !== "manual" &&
    captureType !== "url"; // URL drafts are user-completed (CAPTURE-03 deferral)
  const isFailed = recipe.promotion_error != null;
  const isManual = !isProcessing && !isFailed;

  async function handleRetry(event: React.MouseEvent<HTMLButtonElement>) {
    // Stop the click from bubbling up to the parent <Link> wrapper. This
    // matters when the failed-variant row is wrapped in a Link (it is — see
    // the wrapper choice below: only the processing variant uses a <div>).
    event.preventDefault();
    event.stopPropagation();
    setRetrying(true);
    try {
      await postRetryPromotion(recipe.id);
      // Leave `retrying` true so the Réessayer button stays disabled until
      // the websocket / refetch surfaces the new server state (which will
      // typically swap this row to the processing variant).
    } catch {
      toast.error(tErr("network"));
      setRetrying(false);
    }
  }

  // Container chrome shared across all three variants. The processing variant
  // wraps the inner content in a <div> instead of a <Link> so taps don't
  // navigate away (D-07: in-flight rows are non-tappable).
  const containerClass =
    "paper-grain flex gap-4 p-3 bg-background rounded-lg border border-border hover:bg-surface-muted transition-colors";

  const inner = (
    <>
      <div
        aria-hidden
        className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0"
      />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <h3 className="text-base font-semibold leading-6 line-clamp-1">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <AnimatePresence mode="wait" initial={false}>
            {isManual ? (
              <motion.span
                key="brouillon"
                variants={variants.fadeIn}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <Badge variant="secondary">{t("draft_badge")}</Badge>
              </motion.span>
            ) : null}
          </AnimatePresence>
          {isProcessing ? (
            <span
              className="flex items-center gap-2 text-sm font-medium text-foreground-muted"
              aria-label="Recette en cours d'extraction"
              role="status"
            >
              <Loader2 size={16} className="animate-spin" aria-hidden />
              {tPromo("in_flight")}
            </span>
          ) : null}
          {isFailed ? (
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{tPromo("failed_badge")}</Badge>
              <Button
                variant="ghost"
                className="h-12"
                onClick={handleRetry}
                disabled={retrying}
                aria-label={tPromo("retry_aria")}
              >
                <RefreshCw size={14} className="mr-1.5" />
                {tPromo("retry")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {!isProcessing ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-12 w-12 flex-shrink-0 text-foreground-muted hover:text-destructive"
          disabled={deleting}
          onClick={handleDelete}
          aria-label={t("delete_aria")}
        >
          {deleting ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : (
            <Trash2 size={16} aria-hidden />
          )}
        </Button>
      ) : null}
    </>
  );

  if (isProcessing) {
    return <div className={containerClass}>{inner}</div>;
  }

  return (
    <Link href={`/recipes/${recipe.id}/edit`} className={containerClass}>
      {inner}
    </Link>
  );
}
