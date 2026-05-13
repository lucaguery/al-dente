"use client";

// UI-SPEC §9 — Drafts inbox row, extended in Phase 2 with three variants
// (CONTEXT.md D-07/D-08/D-09):
//
//   1. Manual draft  → existing `Brouillon` badge, taps through to edit form
//   2. Processing    → spinner + "Extraction en cours…"; row is NOT tappable
//   3. Failed        → `Échec` badge + Réessayer button kicks retry-promotion
//
// Variant selection looks at `recipe.status`, `recipe.promotion_error`, and
// `recipe.initial_turn_kind` together because URL drafts (CAPTURE-03) are
// user-completed, not Gemini-promoted — they render the manual variant even
// though their `initial_turn_kind !== 'text'`. Phase 25 replaces source_capture.type.

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { variants } from "@/lib/motion";
import { deleteRecipe, postRetryPromotion } from "@/lib/recipes";
import type { Recipe } from "@/lib/recipes";
import { RecipeIllustration } from "@/components/RecipeIllustration";

export function RecipeDraftCard({ recipe }: { recipe: Recipe }) {
  const t = useTranslations("recipes");
  const tPromo = useTranslations("recipes.promotion");
  const tErr = useTranslations("onboarding.errors");
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    // Phase 16 CAP-02 / D-16-06: confirmation is provided by the AlertDialog
    // wrapping the failed-variant Supprimer button. The manual variant's
    // trailing-icon delete routes through this same function — its small
    // tap target affords less misclick risk than an inline labeled button,
    // so we intentionally keep it confirm-less. (Pre-Plan-16-04 we gated
    // both paths with window.confirm; that path is replaced by AlertDialog
    // for the failed variant.)
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

  const captureType = recipe.initial_turn_kind;
  // Phase 16 CAP-01 / D-16-04: status='failed' is the canonical terminal
  // state. The legacy `promotion_error != null` workaround used pre-Plan-16-03
  // is removed — Plan 16-03's _record_failure now writes status alongside
  // the error, so the two conditions converge. We key off status for
  // clarity at the variant-selection layer.
  const isProcessing =
    recipe.status === "draft" &&
    recipe.promotion_error == null &&
    captureType !== "text" && // was "manual" pre-Phase 25; D-01 maps manual → text
    captureType !== "url"; // URL drafts are user-completed (CAPTURE-03 deferral)
  const isFailed = recipe.status === "failed";
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
      <div className="h-16 w-16 rounded-lg bg-surface-muted flex-shrink-0 flex items-center justify-center text-foreground-muted">
        <RecipeIllustration recipe={recipe} size={48} />
      </div>
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
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-col gap-0.5">
                <span className="font-display italic text-base text-destructive">
                  {tPromo("failed_label")}
                </span>
                <p className="text-sm text-foreground-muted line-clamp-2">
                  {recipe.promotion_error || tPromo("failed_context_fallback")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  className="h-12 flex-1"
                  onClick={handleRetry}
                  disabled={retrying}
                  aria-label={tPromo("retry_aria")}
                >
                  {retrying ? (
                    <Loader2 size={14} className="animate-spin mr-1.5" />
                  ) : (
                    <RefreshCw size={14} className="mr-1.5" />
                  )}
                  {tPromo("retry")}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-12 flex-1 text-destructive hover:text-destructive"
                      disabled={deleting}
                      aria-label={tPromo("delete_aria")}
                    >
                      {deleting ? (
                        <Loader2 size={14} className="animate-spin mr-1.5" />
                      ) : (
                        <Trash2 size={14} className="mr-1.5" />
                      )}
                      {tPromo("delete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {tPromo("delete_confirm_title")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {tPromo("delete_confirm_body")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {tPromo("delete_confirm_cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {tPromo("delete_confirm_confirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {!isProcessing && !isFailed ? (
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

  if (isProcessing || isFailed) {
    // Failed and processing variants are non-navigable — the row's CTA buttons
    // are the only tap targets. Failed variant: Réessayer + Supprimer (with
    // AlertDialog). Processing variant: nothing (D-07 in-flight rows are
    // non-tappable). Wrapping in a Link would conflict with the AlertDialog
    // portal in the failed variant.
    return <div className={containerClass}>{inner}</div>;
  }

  return (
    <Link href={`/recipes/${recipe.id}/edit`} className={containerClass}>
      {inner}
    </Link>
  );
}
