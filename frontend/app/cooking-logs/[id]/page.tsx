"use client";

// Cooking-log detail page.
//
// Visual register: La Grille · Soft warmth per ADR-0004
// (docs/adr/0004-modern-sober-refresh.md). Token sources:
// frontend/app/globals.css. Locked decisions for this file
// ship in .planning/phases/40-pure-frontend-restyles/40-CONTEXT.md
// (D-10 through D-14).

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
      return `${base} bg-[var(--color-valide-tint)] text-primary border border-primary`;
    case "liked":
      return `${base} bg-card border border-border text-foreground`;
    case "disliked":
      return `${base} bg-muted text-muted-foreground border border-border`;
  }
}

/** Absolute French date — "vendredi 8 mai 2026". Renders in Geist 500
 *  (no italic) per Phase 40 D-13; aligned with the other La Grille
 *  detail-view headers.
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
