"use client";

// Phase 8 / COOK-10 — Cooking-log history card.
//
// UI-SPEC §Surface 6 — vertical card with full-width photo on top + Fraunces
// title + cooked-on date + 3-state rating chip + optional notes. Mirrors the
// RecipeCard frame (paper-grain bg-card rounded-xl border shadow-card) but
// the photo layout is vertical (aspect-[4/3] full-width, NOT a side
// thumbnail) — this surfaces "what we ate" as the load-bearing visual.
//
// Photo signed URL is minted via the cooking-log helper
// (`getCookingLogSignedPhotoUrl`); recipe-photo helper is NOT applicable
// because the photos live under the cooking-log namespace (see
// backend/app/services/storage.py upload_cooking_log_photo path layout).
//
// `ratingChipClass(rating)` is inlined here per Phase 8 plan constraints —
// only consumer in v0.2 (rating != vote-state). Pill spacing uses
// 4-multiple Tailwind utilities (`px-2 py-1 h-8`) NOT `px-2.5 py-0.5` per
// the locked Phase 5 token discipline.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getCookingLogSignedPhotoUrl,
  type CookingLogResponse,
  type LogRating,
} from "@/lib/cooking";
import { formatRelativeFr } from "@/lib/datetime";

export type CookingLogCardData = CookingLogResponse & {
  // Recipe-title denormalization for the history view: the list endpoint
  // (when it ships) returns the recipe title alongside the log row so we
  // don't need an N+1 fetch. The `cooked_at` timestamp doubles as the
  // finalized-at timestamp because finalization is the only event that
  // surfaces logs into the history list.
  recipe_title: string;
};

/** Inline pill class helper for the 3-state cooking-log rating. Mirrors the
 *  Phase 7 vote-chip pill shape (`inline-flex items-center rounded-full
 *  text-sm font-medium`) but uses 4-multiple spacing tokens (`px-2 py-1
 *  h-8`) and rating-appropriate color washes:
 *  - loved: faint terracotta wash (primary)
 *  - liked: emerald wash mirroring the Validé state
 *  - disliked: warm-taupe muted
 *
 *  If a second consumer emerges (e.g. recipe-detail surfacing recent
 *  ratings), refactor to a shared <RatingChip rating={...} /> component.
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

export function CookingLogCard({ log }: { log: CookingLogCardData }) {
  const tRating = useTranslations("cooking_log.rating");
  const photoPath = log.photo_paths[0] ?? "";
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!photoPath) {
      // No photo on this log — `src` stays null at mount; don't setState
      // here (avoids React 19's `react-hooks/set-state-in-effect` rule).
      return;
    }
    let alive = true;
    getCookingLogSignedPhotoUrl(log.id, photoPath)
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        // Silent fallback: surface remains text-only when the signed URL
        // mint fails (expired session, network blip). The card still
        // anchors on the recipe title + rating chip.
      });
    return () => {
      alive = false;
    };
  }, [log.id, photoPath]);

  return (
    <Link
      href={`/recipes/${log.recipe_id}`}
      className="paper-grain flex flex-col gap-3 p-4 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover active:translate-y-px transition-all duration-150"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL; <Image> custom loader is overkill at couple-scale
        <img
          src={src}
          alt=""
          className="aspect-[4/3] w-full rounded-lg object-cover"
        />
      ) : null}
      <div className="flex flex-col gap-2">
        <h3 className="text-title line-clamp-2">{log.recipe_title}</h3>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-foreground-muted">
            {formatRelativeFr(log.cooked_at)}
          </span>
          {log.rating ? (
            <span className={ratingChipClass(log.rating)}>
              {tRating(log.rating)}
            </span>
          ) : null}
        </div>
        {log.notes ? (
          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
            {log.notes}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
