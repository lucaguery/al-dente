"use client";

// UI-SPEC §7 — Recipe detail.
// Photo gallery uses 5-minute signed URLs (private bucket); we re-fetch
// each path on mount and on `recipe.updated` realtime frames so the
// gallery stays in sync if the partner uploads a photo while we're here.
//
// 404 branch is full-page (UI-SPEC §"Toast vs inline rules": permanent
// state lives inline, NOT a toast). 401 redirects to /onboarding/welcome
// (handled by lib/api.ts).
//
// Phase 27 CAPTURE-04 — RecipeThread in detail mode mounted below the form.
// The existing form (hero, CompletenessCard, metadata, ingredients, steps,
// VoiceModifySheet) is untouched per D-15. The chat thread sits below it;
// the manual-link inside the thread scrolls back up to the form.
//
// Note on layout: the thread-meta strip rendered by RecipeThread appears
// ABOVE the chat body (i.e., BELOW the form section), which deviates from
// the mockup's ordering (strip between appheader and form). UI-SPEC §"Layout
// > /recipes/[id]" resolves this as the accepted "chat below the recipe form"
// layout — the thread-meta strip acts as a visual header for the chat section.
//
// Note on title style: the existing hero title strip renders recipe.title in
// upright Cormorant Garamond regardless of status. The thread-meta strip
// (rendered by RecipeThread) shows the italic draft placeholder when
// status='draft'. Both are intentional: the hero is the "this is the recipe"
// header; the thread-meta is the "what state is this in?" indicator.

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, FileQuestion, Mic, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CompletenessCard } from "@/components/CompletenessCard";
import { EmptyState } from "@/components/EmptyState";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { VoiceModifySheet } from "@/components/VoiceModifySheet";
import { api } from "@/lib/api";
import { formatRelativeFr } from "@/lib/datetime";
import { useEnumLabels } from "@/lib/enum-labels";
import { deleteRecipe, getSignedPhotoUrl } from "@/lib/recipes";
import { useRealtime } from "@/components/RealtimeProvider";
import RecipeThread from "@/components/RecipeThread";
import type { PersistedTurn, RecipeStatus, AnswerTurnSubmission } from "@/components/RecipeThread/types";
import type { Recipe } from "@/lib/recipes";

// API_BASE needed for the multipart photo turn POST (Phase 26 D-01 — FormData
// bypasses the api() helper which would set Content-Type: application/json).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function RecipeDetailPage() {
  const t = useTranslations("recipes");
  const tVoiceModify = useTranslations("recipes.voice_modify");
  const tErr = useTranslations("onboarding.errors");
  // Phase 27 CAPTURE-04 — tThread for turn-POST error toast (recipes.thread.turn_failed)
  const tThread = useTranslations("recipes.thread");
  const labels = useEnumLabels();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const realtime = useRealtime();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [voiceModifyOpen, setVoiceModifyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Phase 27 CAPTURE-04 — thread state
  const [turns, setTurns] = useState<PersistedTurn[]>([]);
  const [postingTurn, setPostingTurn] = useState(false);
  // formRef: target for the manual-edit link's scrollIntoView (D-15).
  const formRef = useRef<HTMLDivElement | null>(null);

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

  // Phase 27 CAPTURE-04 — initial fetch of the persisted thread.
  // One-shot on mount; realtime updates land via the WS subscription below.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    api<PersistedTurn[]>(`/api/recipes/${id}/turns`)
      .then((rows) => {
        if (alive) setTurns(rows);
      })
      .catch(() => {
        // Non-fatal: empty thread is recoverable when the user posts the
        // next turn; the WS subscription will populate on the next event.
        if (alive) setTurns([]);
      });
    return () => {
      alive = false;
    };
  }, [id]);

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

  // Phase 27 CAPTURE-04 — realtime turn appends.
  // Phase 26 D-03 / D-06: `turn.created` fires for every persisted user OR
  // system turn (broadcast happens AFTER the DB commit, no phantom-turn race).
  // Phase 26 D-29: `turn.updated` fires when extract_and_process_url_turn
  // lands the extracted_html_path on a url turn — replace in place by turn.id.
  useEffect(() => {
    if (!realtime || !id) return;
    const offCreated = realtime.onEvent<PersistedTurn>("turn.created", (payload) => {
      if (payload.recipe_id !== id) return;
      setTurns((prev) => {
        // Dedup by id (defensive — the WS frame may arrive before or after
        // the POST /turns response resolves on the same tab; whichever wins,
        // the row appears exactly once).
        if (prev.some((t) => t.id === payload.id)) return prev;
        return [...prev, payload].sort((a, b) => a.position - b.position);
      });
    });
    const offUpdated = realtime.onEvent<PersistedTurn>("turn.updated", (payload) => {
      if (payload.recipe_id !== id) return;
      setTurns((prev) => prev.map((t) => (t.id === payload.id ? payload : t)));
    });
    return () => {
      offCreated();
      offUpdated();
    };
  }, [realtime, id]);

  // Phase 27 CAPTURE-04 — per-turn POST handlers.
  // Each handler is guarded by `postingTurn` (T-27-05-02 spam mitigation).
  // Text / voice / url use api() (HttpOnly cookie via Next.js rewrite,
  // invariant #8). Photo uses raw fetch with FormData + credentials: include
  // (Phase 26 D-01 multipart endpoint — api() would inject Content-Type:
  // application/json which would corrupt the FormData boundary).

  const handlePostTextTurn = useCallback(async (text: string) => {
    if (!id || postingTurn) return;
    setPostingTurn(true);
    try {
      await api(`/api/recipes/${id}/turns`, {
        method: "POST",
        body: JSON.stringify({ kind: "text", text }),
      });
    } catch {
      toast.error(tThread("turn_failed"));
    } finally {
      setPostingTurn(false);
    }
  }, [id, postingTurn, tThread]);

  const handlePostVoiceTurn = useCallback(async (transcript: string) => {
    if (!id || postingTurn) return;
    setPostingTurn(true);
    try {
      await api(`/api/recipes/${id}/turns`, {
        method: "POST",
        body: JSON.stringify({ kind: "voice", transcript }),
      });
    } catch {
      toast.error(tThread("turn_failed"));
    } finally {
      setPostingTurn(false);
    }
  }, [id, postingTurn, tThread]);

  const handlePostUrlTurn = useCallback(async (url: string) => {
    if (!id || postingTurn) return;
    setPostingTurn(true);
    try {
      await api(`/api/recipes/${id}/turns`, {
        method: "POST",
        body: JSON.stringify({ kind: "url", url }),
      });
    } catch {
      toast.error(tThread("turn_failed"));
    } finally {
      setPostingTurn(false);
    }
  }, [id, postingTurn, tThread]);

  const handlePostPhotoTurn = useCallback(async (file: File) => {
    if (!id || postingTurn) return;
    setPostingTurn(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch(`${API_BASE}/api/recipes/${id}/turns/photo`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error(`photo turn ${res.status}`);
    } catch {
      toast.error(tThread("turn_failed"));
    } finally {
      setPostingTurn(false);
    }
  }, [id, postingTurn, tThread]);

  // Phase 28 DETAIL-02 — answer turn handler with optimistic state update.
  // On Valider tap: write local recipe state FIRST (the form field updates
  // instantly; the « épinglé » marginalia appears instantly), then POST.
  // On 201 + recipe.updated WS event: state aligns. On POST failure: revert
  // local state, fire toast.error.
  const handlePostAnswerTurn = useCallback(
    async (submission: AnswerTurnSubmission) => {
      if (!id || !recipe) return;
      const prevRecipe = recipe;
      // Apply optimistic state: set the field + add it to pin set.
      setRecipe((r) =>
        r
          ? {
              ...r,
              [submission.field]: submission.value,
              manually_edited_fields: Array.from(
                new Set([...(r.manually_edited_fields ?? []), submission.field])
              ).sort(),
            }
          : null
      );
      try {
        await api(`/api/recipes/${id}/turns`, {
          method: "POST",
          body: JSON.stringify({
            kind: "answer",
            payload: {
              in_reply_to_turn_id: submission.in_reply_to_turn_id,
              field: submission.field,
              value: submission.value,
            },
          }),
        });
      } catch (err) {
        console.error("answer turn failed", err);
        setRecipe(prevRecipe);
        toast.error(tThread("action_failed"));
        throw err; // let SystemBubble release committing state and not assume success
      }
    },
    [id, recipe, tThread]
  );

  // Phase 28 DETAIL-03 — proposal_accepted handler with optimistic apply
  // proposed_value + remove pin. Reads the advisory turn from turns[] to
  // extract field + proposed_value (D-17).
  const handlePostProposalAccepted = useCallback(
    async (advisoryTurnId: string) => {
      if (!id || !recipe) return;
      const advisoryTurn = turns.find(
        (t) => t.id === advisoryTurnId && t.kind === "advisory"
      );
      if (!advisoryTurn) {
        console.warn("advisory not found", advisoryTurnId);
        return;
      }
      const advisoryPayload = advisoryTurn.payload as {
        field?: string;
        proposed_value?: unknown;
      };
      const field = advisoryPayload.field;
      if (!field) {
        console.warn("advisory missing field", advisoryTurnId);
        return;
      }
      const prevRecipe = recipe;
      setRecipe((r) =>
        r
          ? {
              ...r,
              [field]: advisoryPayload.proposed_value,
              manually_edited_fields: (r.manually_edited_fields ?? []).filter(
                (f) => f !== field
              ),
            }
          : null
      );
      try {
        await api(`/api/recipes/${id}/turns`, {
          method: "POST",
          body: JSON.stringify({
            kind: "proposal_accepted",
            payload: { in_reply_to_turn_id: advisoryTurnId },
          }),
        });
      } catch (err) {
        console.error("proposal_accepted failed", err);
        setRecipe(prevRecipe);
        toast.error(tThread("action_failed"));
        throw err;
      }
    },
    [id, recipe, turns, tThread]
  );

  // Phase 28 DETAIL-03 — proposal_dismissed handler. Pure no-op on the recipe
  // row (D-18); just POST. The advisory bubble collapses when the resulting
  // turn.created WS event lands and advisoryResolutions memo picks up the
  // new dismissed entry.
  const handlePostProposalDismissed = useCallback(
    async (advisoryTurnId: string) => {
      if (!id) return;
      try {
        await api(`/api/recipes/${id}/turns`, {
          method: "POST",
          body: JSON.stringify({
            kind: "proposal_dismissed",
            payload: { in_reply_to_turn_id: advisoryTurnId },
          }),
        });
      } catch (err) {
        console.error("proposal_dismissed failed", err);
        toast.error(tThread("action_failed"));
        throw err;
      }
    },
    [id, tThread]
  );

  // Phase 27 CAPTURE-04 — manual-edit link scrolls up to the recipe form.
  // formRef is attached to a <div className="contents"> wrapper around the
  // hero + form chunk so scrollIntoView targets the top of the form section.
  const handleManualEditLinkClick = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

        {/*
          Phase 27 CAPTURE-04 — form ref wrapper.
          `className="contents"` makes this div transparent to flex layout so
          the children render as direct children of the outer <section>. The
          ref is the scroll target for the manual-edit link (D-15 + UI-SPEC
          §"Manual-edit link").
        */}
        <div ref={formRef} className="contents">
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
            {/* RID-03 — CompletenessCard above body content when percent < 100 (D-20) */}
            <CompletenessCard recipe={recipe} />

            {/* Metadata pill row — cuisine, moods, protein, prep/servings */}
            <div className="flex flex-wrap gap-2 items-center">
              {recipe.cuisine ? (
                <Badge variant="secondary">{labels.cuisine(recipe.cuisine)}</Badge>
              ) : null}
              {recipe.mood.map((m) => (
                <Badge key={m} variant="secondary">
                  {labels.mood(m)}
                </Badge>
              ))}
              {recipe.main_protein ? (
                <Badge variant="secondary">{labels.protein(recipe.main_protein)}</Badge>
              ) : null}
              {metaSpan ? (
                <span className="text-sm text-foreground-muted">{metaSpan}</span>
              ) : null}
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
        </div>

        {/*
          Phase 27 CAPTURE-04 — RecipeThread in detail mode, mounted BELOW the
          existing form per D-15 + UI-SPEC §"Layout > /recipes/[id]".
          The thread-meta strip (rendered inside RecipeThread when mode=detail)
          sits above the chat body, acting as a visual "this section is the
          thread" header. The manual-link inside the thread calls
          handleManualEditLinkClick which scrolls up to formRef.
        */}
        <RecipeThread
          mode="detail"
          recipeId={recipe.id}
          title={recipe.title}
          turns={turns}
          recipeStatus={recipe.status as RecipeStatus}
          manuallyEditedFields={recipe.manually_edited_fields ?? []}
          onPostTextTurn={handlePostTextTurn}
          onPostVoiceTurn={handlePostVoiceTurn}
          onPostUrlTurn={handlePostUrlTurn}
          onPostPhotoTurn={handlePostPhotoTurn}
          onPostAnswerTurn={handlePostAnswerTurn}
          onPostProposalAccepted={handlePostProposalAccepted}
          onPostProposalDismissed={handlePostProposalDismissed}
          onManualEditLinkClick={handleManualEditLinkClick}
        />
      </section>
      <VoiceModifySheet
        recipeId={recipe.id}
        open={voiceModifyOpen}
        onOpenChange={setVoiceModifyOpen}
      />
    </OnboardingGuard>
  );
}
