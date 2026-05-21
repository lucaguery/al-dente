"use client";

// Phase 17 / HIST-02 — Cooking-log detail page.
//
// Per D-17-05: hairline Card chrome consistent with the Phase 8
// cookbook-chapter-opener gesture. Header is an absolute French date
// in Fraunces italic (the gesture the user explicitly named); body
// shows the cooked-by chip (member name + color from useSession), the
// photo at aspect-square, the rating chip, and the notes paragraph
// (preserves line breaks via whitespace-pre-line).
//
// The recipe-back-link routes to `/recipes/{recipe_id}` so the user
// can re-cook (D-17-05 tail).
//
// This file is the read sibling of `[id]/finalize/page.tsx` — both
// routes coexist (App Router treats `[id]/page.tsx` and
// `[id]/finalize/page.tsx` as `/:id` vs `/:id/finalize`).
//
// i18n: reuses existing keys (`cooking_log.rating.*`,
// `cooking_log.finalize.gone_heading`, `cooking_log.finalize.notes_heading`).
// A small number of strings have no existing key and are marked
// `TODO(productize): i18n — Phase 20 (FIX-03)` per invariant #6 +
// Plan 17-02 Path B (sweep deferred to the Phase 20 i18n pass).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { useSession } from "@/components/SessionProvider";
import {
  fetchCookingLog,
  getCookingLogSignedPhotoUrl,
  type CookingLogResponse,
  type LogRating,
} from "@/lib/cooking";

/** Inline pill class helper — mirrors CookingLogCard.ratingChipClass
 *  byte-for-byte so the rating chip reads identically on list and
 *  detail surfaces. If a third consumer emerges, refactor to a shared
 *  <RatingChip /> component (Phase 8 plan note carried forward).
 */
function ratingChipClass(rating: LogRating): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-1 h-8 text-sm font-medium";
  switch (rating) {
    case "loved":
      return `${base} bg-surface-rose-100 text-primary border border-primary/40`;
    case "liked":
      return `${base} bg-[var(--color-valide-tint)] text-foreground border border-[var(--color-valide-border-faint)]`;
    case "disliked":
      return `${base} bg-muted text-muted-foreground border border-border`;
  }
}

/** Absolute French date — "vendredi 8 mai 2026". Cookbook-chapter-opener
 *  gesture per D-17-05; pairs with the Phase 7 HomeDecide header.
 */
function formatAbsoluteFr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function CookingLogDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const tRating = useTranslations("cooking_log.rating");
  const tFinalize = useTranslations("cooking_log.finalize");
  const { session } = useSession();

  const [log, setLog] = useState<CookingLogResponse | null>(null);
  const [error, setError] = useState<"notfound" | "other" | null>(null);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchCookingLog(id)
      .then((data) => {
        if (alive) setLog(data);
      })
      .catch((err: Error) => {
        if (!alive) return;
        // `api<T>` throws Error("<status> <statusText>") on non-OK; no
        // structured status field, so string-match the 404 prefix.
        if (err.message.startsWith("404")) setError("notfound");
        else setError("other");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const photoPath = log?.photo_paths[0] ?? "";
    if (!log || !photoPath) return;
    let alive = true;
    getCookingLogSignedPhotoUrl(log.id, photoPath)
      .then((url) => {
        if (alive) setPhotoSrc(url);
      })
      .catch(() => {
        // Silent fallback — surface stays text-only if signed URL mint fails.
      });
    return () => {
      alive = false;
    };
  }, [log]);

  // Resolve cooked-by member from the session-level member list (D-17-07 /
  // CONTEXT Option A). No extra fetch — `useSession()` already exposes the
  // household roster. If the cook is no longer in the household, fall back
  // gracefully (member may have been removed; the log row stays valid).
  const cookedByMember = useMemo(() => {
    if (!log || !session) return null;
    return (
      session.members.find((m) => m.id === log.cooked_by_member_id) ?? null
    );
  }, [log, session]);

  if (!id) return null;

  return (
    <OnboardingGuard>
      <section className="flex flex-col flex-1 bg-background">
        <div className="px-(--spacing-page-x) pt-8 pb-(--spacing-bottom-safe) flex flex-col gap-(--spacing-section-y)">
          {error === "notfound" ? (
            // Reuse the existing `cooking_log.finalize.gone_heading` copy —
            // the user-facing affordance is the same: a recognisable
            // "not here" message, same as the stale-log path uses.
            <p className="text-center text-foreground-muted py-12">
              {tFinalize("gone_heading")}
            </p>
          ) : log === null && error === null ? (
            // Loading: render nothing rather than a spinner — couple-scale,
            // single-row read, typically < 200ms.
            <div aria-hidden className="h-1" />
          ) : log !== null ? (
            <article
              className="flex flex-col gap-4 p-6 bg-card rounded-xl border border-border"
              /* TODO(productize): i18n — Phase 20 (FIX-03) sweep. aria-label currently French. */
              aria-label="Détail de la cuisson"
            >
              <header className="flex flex-col gap-2">
                <h1 className="text-2xl text-foreground" style={{ fontWeight: 500, letterSpacing: "-0.02em" }}>
                  {formatAbsoluteFr(new Date(log.cooked_at))}
                </h1>
                {cookedByMember ? (
                  <span
                    className="inline-flex items-center gap-2 text-sm text-foreground-muted"
                    aria-label={cookedByMember.name}
                  >
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cookedByMember.color_hex }}
                    />
                    {cookedByMember.name}
                  </span>
                ) : null}
              </header>
              {photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL; matches CookingLogCard pattern
                <img
                  src={photoSrc}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover border border-border"
                />
              ) : null}
              <div className="flex items-center justify-between gap-3">
                {log.rating ? (
                  <span className={ratingChipClass(log.rating)}>
                    {tRating(log.rating)}
                  </span>
                ) : (
                  <span aria-hidden />
                )}
                <Link
                  href={`/recipes/${log.recipe_id}`}
                  className="text-sm text-primary underline underline-offset-2 active:translate-y-px"
                  /* TODO(productize): i18n — Phase 20 (FIX-03) sweep. Link label currently French. */
                >
                  Voir la recette
                </Link>
              </div>
              {log.notes ? (
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-medium text-foreground-muted">
                    {tFinalize("notes_heading")}
                  </h2>
                  <p className="text-base text-foreground leading-relaxed whitespace-pre-line">
                    {log.notes}
                  </p>
                </div>
              ) : null}
            </article>
          ) : (
            /* TODO(productize): i18n — Phase 20 (FIX-03) sweep. Fallback copy currently French. */
            <p className="text-center text-foreground-muted py-12">
              Une erreur s&rsquo;est produite. Réessaie plus tard.
            </p>
          )}
        </div>
      </section>
    </OnboardingGuard>
  );
}
