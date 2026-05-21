"use client";

// ADR-0004 (La Grille · Soft warmth) Recette composition.
// Sticky topbar + hero 16:10 -38px bleed + body block (title + Geist Mono
// caption identity subhead from cook_count + badges + ingredients with
// terracotta qty + steps with terracotta numerals + step-1 caption from
// most recent cooking_logs[].notes) + sticky bottom CTA.
// Per CONTEXT D-08 + D-13 + ADR-0004 §Marginalia register + sketch 002.
//
// Preserves:
//   - Phase 27 CAPTURE-04 — RecipeThread in detail mode below
//   - Phase 28 DETAIL-04 — PinLabel gutter labels on manually-edited fields
//   - Phase 30 BUG-01 — RecipePhotoImg / useSignedPhotoUrl self-heal
//   - Phase 29 D-22 — summary CTA wire-up (complete / defer)
//
// Security: cooking_logs[].notes is user-authored content — rendered as
// React text children only inside a <span className="text-caption">. React
// default-escapes text. (T-32-05-01 mitigation — see 32-05-PLAN.md threat_model.)

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  FileQuestion,
  Flame,
  Mic,
  Pencil,
  Trash2,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { VoiceModifySheet } from "@/components/VoiceModifySheet";
import { api } from "@/lib/api";
import { formatRelativeFr } from "@/lib/datetime";
import { useEnumLabels } from "@/lib/enum-labels";
import { deleteRecipe } from "@/lib/recipes";
import {
  fetchCookingLogs,
  postStartCooking,
  type CookingLogResponse,
} from "@/lib/cooking";
import { useSignedPhotoUrl } from "@/lib/hooks/useSignedPhotoUrl";
import { useRealtime } from "@/components/RealtimeProvider";
import type { PersistedTurn } from "@/components/RecipeThread/types";
import type { Recipe } from "@/lib/recipes";
import { PinLabel } from "@/components/RecipeThread/PinLabel";
import {
  isSectionPinned,
  firstPinnedFieldInSection,
  type PinSection,
} from "@/lib/pin-sections";
import type { AnswerField } from "@/lib/enums";

// Phase 41 THRD-01 — API_BASE was used for the multipart photo turn POST;
// the per-turn handlers moved to /recipes/[id]/thread/page.tsx along with
// that constant. Nothing on this page needs API_BASE anymore.

// Phase 30 BUG-01 — per-path image component so each photo in the hero /
// carousel calls useSignedPhotoUrl independently with its own retry budget.
function RecipePhotoImg({
  recipeId,
  path,
  className,
  alt,
}: {
  recipeId: string;
  path: string;
  className: string;
  alt: string;
}) {
  const hook = useSignedPhotoUrl(recipeId, path);
  if (!hook.src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- signed URL
  return <img src={hook.src} alt={alt} className={className} onError={hook.onError} />;
}

export default function RecipeDetailPage() {
  const t = useTranslations("recipes");
  const tDetail = useTranslations("recipes.detail");
  const tSubhead = useTranslations("recipes.detail.subhead");
  const tVoiceModify = useTranslations("recipes.voice_modify");
  const tErr = useTranslations("onboarding.errors");
  // Phase 41 THRD-01 — tThread now only used for the det-top pin aria-label
  // (the inline RecipeThread mount was hard-deleted per D-17; the
  // turn-POST handlers moved to /recipes/[id]/thread/page.tsx).
  const tThread = useTranslations("recipes.thread");
  const labels = useEnumLabels();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const realtime = useRealtime();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [voiceModifyOpen, setVoiceModifyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Phase 32 SOBER-04 (D-13) — step-1 marginalia data source.
  // Cheap reuse of existing /api/cooking-logs?days=365 endpoint;
  // client-side filter by recipe_id, find most recent with notes (logs are
  // cooked_at DESC from backend). Render only when truthy — no fallback copy per D-13.
  const [recipeLog, setRecipeLog] = useState<CookingLogResponse | null>(null);

  // Phase 32 SOBER-04 — cooking-start in-flight state for the sticky CTA.
  const [cookInFlight, setCookInFlight] = useState(false);

  // Phase 41 THRD-01 / D-15 — turns array drives the "N tours" det-top pin
  // count. The full thread (and its turn-POST handlers) moved to the
  // dedicated /recipes/[id]/thread route; this page only needs the count.
  // turn.created realtime updates keep the counter live (invariant #4).
  const [turns, setTurns] = useState<PersistedTurn[]>([]);
  // Open-advisory detection still needs turn payloads; openAdvisoryByField
  // memo reads from this array.

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

  // Phase 32 SOBER-04 — sticky bottom CTA handler.
  // Mirrors the handleCookStart in HomeDecide for couple-scale parity.
  const handleStartCooking = useCallback(async () => {
    if (!recipe) return;
    setCookInFlight(true);
    try {
      await postStartCooking(recipe.id);
      toast.success(t("summary.toast_cooking_started"));
    } catch {
      toast.error(t("summary.cook_failed"));
    } finally {
      setCookInFlight(false);
    }
  }, [recipe, t]);

  // Initial load.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    api<Recipe>(`/api/recipes/${id}`)
      .then((r) => {
        if (!alive) return;
        setRecipe(r);
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
  }, [id]);

  // Phase 32 SOBER-04 (D-13) — fetch cooking logs for step-1 marginalia.
  // Separate from the recipe fetch; non-fatal (step-1 marginalia is optional).
  // Per RESEARCH Pattern 8 + Pitfall 8 (field is `notes`, not `note`).
  useEffect(() => {
    let cancelled = false;
    if (!recipe?.id) return;
    fetchCookingLogs(365)
      .then((logs) => {
        if (cancelled) return;
        const match = logs.find(
          (l) => l.recipe_id === recipe.id && l.notes && l.notes.trim().length > 0,
        );
        setRecipeLog(match ?? null);
      })
      .catch(() => {
        /* non-fatal — step-1 marginalia is optional */
      });
    return () => {
      cancelled = true;
    };
  }, [recipe?.id]);

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
  // uploads a photo to THIS recipe. Phase 30 BUG-01 — photo URLs are now
  // fetched reactively per-path via RecipePhotoImg / useSignedPhotoUrl;
  // we only need to update recipe state and the hook refetches when
  // recipe.photo_paths changes.
  useEffect(() => {
    if (!realtime || !id) return;
    const offUpdated = realtime.onEvent<Recipe>("recipe.updated", (payload) => {
      if (payload.id !== id) return;
      setRecipe(payload);
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
  }, [realtime, id, router]);

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

  // Phase 41 THRD-01 / D-17 — the per-turn POST handlers (handlePostTextTurn,
  // handlePostVoiceTurn, handlePostUrlTurn, handlePostPhotoTurn,
  // handlePostAnswerTurn, handlePostProposalAccepted,
  // handlePostProposalDismissed, handleSummaryComplete, handleSummaryLater,
  // handleManualEditLinkClick) all moved to /recipes/[id]/thread/page.tsx
  // alongside the RecipeThread mount. The structured view no longer hosts a
  // thread, so the dead code is gone (MVP no-shim posture).

  // Phase 28 DETAIL-04 — Open-advisory lookup for « conflit » escalation.
  // Maps each AnswerField to the id of its OLDEST open advisory turn (no
  // later proposal_accepted/dismissed referencing it). Used to:
  //   1. Decide whether a section's PinLabel renders « conflit » instead of « épinglé »
  //   2. Scroll to that advisory bubble when the « conflit » label is tapped
  const openAdvisoryByField = useMemo(() => {
    const resolved = new Set<string>();
    for (const t of turns) {
      if (t.kind === "proposal_accepted" || t.kind === "proposal_dismissed") {
        const refId = (t.payload as { in_reply_to_turn_id?: string })
          .in_reply_to_turn_id;
        if (refId) resolved.add(refId);
      }
    }
    const map = new Map<string, string>(); // AnswerField -> advisoryTurnId
    for (const t of turns) {
      if (t.kind !== "advisory") continue;
      if (resolved.has(t.id)) continue;
      const field = (t.payload as { field?: string }).field;
      if (field && !map.has(field)) {
        map.set(field, t.id);
      }
    }
    return map;
  }, [turns]);

  // Phase 28 DETAIL-04 — scroll target for « conflit » tap. We mark each
  // advisory SystemBubble with a data-advisory-id attribute (added in
  // SystemBubble.tsx as part of this plan); document.querySelector resolves
  // the scroll target without prop-drilling refs through RecipeThread.
  const scrollToAdvisory = useCallback((advisoryTurnId: string) => {
    const el = document.querySelector<HTMLElement>(
      `[data-advisory-id="${advisoryTurnId}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Phase 28 DETAIL-04 — render a gutter PinLabel for a given PIN_SECTIONS
  // section. Returns null when the section has no pinned fields. The span
  // wrapper applies the absolute-position / translateX offset so the label
  // sits in the left gutter beside the section header (UI-SPEC §Spacing).
  const renderSectionPin = (section: PinSection) => {
    const pins = recipe?.manually_edited_fields ?? [];
    if (!isSectionPinned(section, pins)) return null;
    const pinnedField = firstPinnedFieldInSection(section, pins);
    if (!pinnedField) return null;
    const advisoryId = openAdvisoryByField.get(pinnedField);
    const hasConflict = !!advisoryId;
    return (
      <span
        style={{
          position: "absolute",
          left: "-4px",
          transform: "translateX(-100%)",
          top: "2px",
        }}
      >
        <PinLabel
          field={pinnedField as AnswerField}
          hasConflict={hasConflict}
          onConflictTap={
            advisoryId ? () => scrollToAdvisory(advisoryId) : undefined
          }
          gutter
        />
      </span>
    );
  };

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

  // Phase 41 THRD-01 — the `deferred` derived prop only fed RecipeThread
  // (now hosted at /recipes/[id]/thread); that route owns its own deferred
  // computation. Nothing on this page consumes it anymore.

  return (
    <OnboardingGuard>
      <section className="flex flex-col flex-1 bg-background">
        {/*
          Phase 32 §15.C — Sticky floating topbar.
          backdrop-blur over the hero photo which bleeds -38px into this bar.
          Per design-system.html #recette line 1782.
        */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between"
          style={{
            padding: "14px 18px 8px",
            backdropFilter: "blur(12px)",
            background: "color-mix(in oklch, var(--background) 80%, transparent)",
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t("back_aria")}
            className="inline-flex items-center justify-center rounded-full border"
            style={{
              width: "36px",
              height: "36px",
              background: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          {/* Right-side menu: voice modify + edit + delete */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setVoiceModifyOpen(true)}
              aria-label={tVoiceModify("trigger_aria")}
              className="inline-flex items-center justify-center rounded-full border"
              style={{
                width: "36px",
                height: "36px",
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <Mic size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
              aria-label={t("edit_aria")}
              className="inline-flex items-center justify-center rounded-full border"
              style={{
                width: "36px",
                height: "36px",
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <Pencil size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              aria-label={t("delete_aria")}
              disabled={deleting}
              className="inline-flex items-center justify-center rounded-full border"
              style={{
                width: "36px",
                height: "36px",
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <Trash2 size={16} aria-hidden />
            </button>
            {/* gh#35 E2 — kebab "..." menu removed (it had no onClick wired).
                If a structured action menu is needed later, reintroduce here. */}
          </div>
        </div>

        {/*
          Phase 32 §15.C — Hero photo 16:10, -38px bleed into topbar.
          Per design-system.html #recette line 1786: margin-top: -38px; border-radius: 0.
          useSignedPhotoUrl (Phase 30 BUG-01) drives the URL via RecipePhotoImg.
        */}
        <div
          className="relative"
          style={{
            aspectRatio: "16 / 10",
            marginTop: "-38px",
            borderRadius: "0",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--primary) 30%, var(--background)), color-mix(in oklch, var(--primary) 8%, var(--background)))",
          }}
        >
          {recipe.photo_paths.length > 0 ? (
            <RecipePhotoImg
              recipeId={recipe.id}
              path={recipe.photo_paths[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-30">
              <Utensils size={48} aria-hidden />
            </div>
          )}
        </div>

        {/*
          Phase 32 §15.C — Body block.
          padding: 18px 20px 24px; gap: 14px between sections.
          Per design-system.html #recette line 1789.

          gh#35 E1 — body is click-to-edit: tap anywhere inside this block
          routes to /recipes/[id]/edit (structured edit mode). The body
          contains no interactive children (badges + ingredients + steps are
          read-only), so a single block-level handler is enough. The Pencil
          icon in the topbar above is kept as the canonical edit affordance;
          this click handler is the secondary "tap a field" path.
        */}
        <div
          role="button"
          tabIndex={0}
          className="flex flex-col flex-1 cursor-pointer"
          style={{ padding: "18px 20px 24px", gap: "14px" }}
          onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/recipes/${recipe.id}/edit`);
            }
          }}
        >
          {/* Title + identity subhead (D-13)
              Phase 41 THRD-01 — title row hosts the "N tours" det-top pin on
              the right slot. Full-row height tap target (h-12-equivalent
              via padding); Link uses an explicit href so a shared/deep URL
              still routes to /thread (D-16). The Link sits inside the
              click-to-edit wrapper, so stopPropagation prevents the body's
              edit-navigation handler from firing when the pin is tapped. */}
          <div className="relative overflow-visible flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {renderSectionPin("title")}
              <h1
                className="text-foreground"
                style={{
                  fontSize: "26px",
                  fontWeight: 500,
                  letterSpacing: "-0.015em",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                {recipe.title}
              </h1>
              {/* ADR-0004 §Marginalia register — Geist Mono caption subhead from cook_count */}
              <span className="text-caption block" style={{ marginTop: "4px" }}>
                {recipe.cook_count > 0
                  ? tSubhead("cooked", { count: recipe.cook_count })
                  : tSubhead("never")}
              </span>
            </div>
            <Link
              href={`/recipes/${recipe.id}/thread`}
              aria-label={`${tThread("see_conversation_aria")} · ${turns.length} ${tThread("tours_label")}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center h-12 px-3 -my-3 text-caption font-mono tabular-nums text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {turns.length} {tThread("tours_label")}
            </Link>
          </div>

          {/*
            Badge row — prep time, difficulty, cuisine, mood.
            Phase 36 POLISH-03 (all-text-pills): meta row is HOMOGENEOUS — all
            four pills render text-only per Sober Kitchen editorial register
            (CONTEXT.md POLISH-03 resolution). The leading Timer + Flame icons
            on the prep / difficulty pills were dropped to match the cuisine
            + mood pills which were already text-only. The « min » unit and
            the « Moyen » / « Difficile » label carry the semantic; the icons
            were decorative-redundant.
          */}
          <div className="flex flex-wrap" style={{ gap: "6px" }}>
            {recipe.prep_time_minutes != null ? (
              <span className="badge">{recipe.prep_time_minutes} min</span>
            ) : null}
            {recipe.difficulty ? (
              <span className="badge">{labels.difficulty(recipe.difficulty)}</span>
            ) : null}
            {recipe.cuisine ? (
              <span className="badge">{labels.cuisine(recipe.cuisine)}</span>
            ) : null}
            {recipe.mood.length > 0 ? (
              <span className="badge">{labels.mood(recipe.mood[0])}</span>
            ) : null}
          </div>

          {/* Multi-photo carousel — photos 2..N when multi-photo */}
          {recipe.photo_paths.length > 1 && (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-5 px-5 py-2 scrollbar-none">
              {recipe.photo_paths.slice(1).map((p) => (
                <RecipePhotoImg
                  key={p}
                  recipeId={recipe.id}
                  path={p}
                  alt=""
                  className="h-48 w-48 rounded-lg object-cover snap-start flex-shrink-0"
                />
              ))}
            </div>
          )}

          {/*
            Ingredients section.
            PUNCH-LIST D-02 (quick 260521-l8g): the prior Sober Kitchen
            cookbook-page gesture (a 3px terracotta-30 left margin-rule with
            12px inset) is dropped per ADR-0004 — the numbered Mono indices
            carry enough structural pressure; the card hairline is the only
            border that remains.
          */}
          {recipe.ingredients && recipe.ingredients.length > 0 ? (
            <section>
              <div className="relative overflow-visible" style={{ marginBottom: "8px" }}>
                {renderSectionPin("ingredients")}
                <h2 style={{ fontSize: "17px", fontWeight: 500, margin: 0 }}>
                  {t("section_ingredients")}
                  {recipe.servings != null ? (
                    <small
                      className="text-caption"
                      style={{ marginLeft: "6px" }}
                    >
                      <span className="meta-sep">{" · "}</span>{recipe.servings} personnes
                    </small>
                  ) : null}
                </h2>
              </div>
              <div className="flex flex-col" style={{ gap: "6px" }}>
                {recipe.ingredients.map((ing, idx) => {
                  const qty = ing.quantity != null ? `${ing.quantity}` : "";
                  const unit = ing.unit ? ` ${ing.unit}` : "";
                  const lead = `${qty}${unit}`.trim();
                  return (
                    <div
                      key={idx}
                      className="flex items-baseline"
                      style={{ gap: "10px" }}
                    >
                      {/* ADR-0004 La Grille — Geist Mono `01`-`NN` index prefix */}
                      <span
                        className="text-caption tabular-nums shrink-0"
                        aria-hidden
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 500,
                          color: "var(--primary)",
                          flexShrink: 0,
                        }}
                      >
                        {lead || "—"}
                      </span>
                      <span style={{ fontSize: "13.5px" }}>{ing.name}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Steps section */}
          {recipe.steps && recipe.steps.length > 0 ? (
            <section>
              <div className="relative overflow-visible" style={{ marginBottom: "6px" }}>
                {renderSectionPin("steps")}
                <h2 style={{ fontSize: "17px", fontWeight: 500, margin: 0 }}>
                  {t("section_steps")}
                </h2>
              </div>
              <div className="flex flex-col" style={{ gap: "4px" }}>
                {recipe.steps.map((step, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "8px 0",
                        // PUNCH-LIST P-04 (260521-l8g) — the prior 1px dashed-horizontal
                        // continuation line between step rows is dropped per ADR-0004.
                        // The numbered Mono indices carry the row separation; marginalia
                        // children (when present) render with a left vertical hairline,
                        // not a dashed-horizontal continuation.
                      }}
                    >
                      <div className="flex items-baseline">
                        {/* ADR-0004 La Grille — Geist Mono `01`-`NN` index */}
                        <span
                          className="text-caption tabular-nums shrink-0"
                          style={{ marginRight: "8px" }}
                          aria-hidden
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: "13.5px", lineHeight: 1.55 }}>{step}</span>
                      </div>
                      {/*
                        Phase 32 D-13 — step-1 marginalia (conditional).
                        Renders ONLY when the most recent cooking log for this recipe
                        has a non-empty `notes` field. No fallback copy per D-13.
                        Security: recipeLog.notes is user-authored; rendered as React
                        text child inside Marginalia; React escapes HTML by default.
                        Per RESEARCH Pitfall 8: field is `notes` (plural), not `note`.

                        Phase 36 SOBER-12 (gesture 4, §15.C cookbook page +
                        punch-list P-05): upgraded from flat-caption (the original
                        `margin: 4px 0 0 12px` read as a regular caption per the
                        2026-05-18 walkthrough) to a proper margin-gutter
                        affordance — a dotted terracotta-25 left border with a
                        16px paddingLeft inset reads as a handwritten paper-margin
                        annotation against the printed step, matching the Sober
                        Kitchen marginalia register (design-system §13).
                      */}
                      {isFirst && recipeLog?.notes ? (
                        /* PUNCH-LIST P-04 (260521-l8g) — solid faint-ink left
                           hairline + 12px padding-left per
                           .claude/skills/sketch-findings-al-dente/references/components.md
                           §Data lists. Replaces the prior dotted-terracotta
                           gesture (which read as a printed paper-margin
                           annotation — wrong register for La Grille). */
                        <span
                          className="text-caption block"
                          style={{
                            margin: "4px 0 0 0",
                            paddingLeft: "12px",
                            borderLeft:
                              "1px solid color-mix(in oklab, var(--foreground) 30%, transparent)",
                          }}
                        >
                          {recipeLog.notes}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Footer — last cooked + cook count */}
          <p className="text-sm text-muted-foreground">
            {t("footer_last_cooked", {
              when: recipe.last_cooked_at
                ? formatRelativeFr(recipe.last_cooked_at)
                : t("never_cooked"),
            })}<span className="meta-sep">{" · "}</span>{t("footer_cook_count", { count: recipe.cook_count })}
          </p>
        </div>

        {/*
          Phase 41 THRD-01 / D-17 — inline RecipeThread mount HARD-DELETED
          per MVP no-shim posture. The thread now lives at its own route
          /recipes/[id]/thread, reached via the "N tours" pin in the title row.
        */}

        {/*
          Phase 32 §15.C — Sticky bottom CTA: "Cuisiner maintenant".
          Sits above BottomNav (which is mounted in app/layout.tsx globally).
          z-30 (below topbar z-40, above content). Backdrop blur + border-top.
          Per design-system.html #recette line 1825.
        */}
        <div
          className="sticky bottom-0 z-30"
          style={{
            padding: "12px 20px calc(12px + env(safe-area-inset-bottom))",
            background: "color-mix(in oklch, var(--background) 92%, transparent)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <Button
            type="button"
            className="w-full h-12"
            onClick={handleStartCooking}
            disabled={cookInFlight}
          >
            <Flame size={18} className="mr-2" aria-hidden />
            {tDetail("cook_cta")}
          </Button>
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
