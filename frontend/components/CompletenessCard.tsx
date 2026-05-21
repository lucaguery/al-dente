"use client";

// RID-03 — CompletenessCard mounts above the body of /recipes/[id]/page.tsx
// when computeCompleteness().percent < 100. Returns null at 100% — no nagging
// per CONTEXT.md D-20 and REQ RID-03.
//
// Surface: hairline div matching EmptyState.tsx shell (D-20). ADR-0004 wave 3:
// the prior texture + shadow chain is dropped (ADR §Shadows + §Texture).
// Each chip is a <Badge variant="outline" asChild><Link> to the edit page with
// ?focus=<fieldKey>. The French labels come from fr.json completeness.* namespace
// (D-21). The progressbar element is accessible (role + aria-value*).

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  computeCompleteness,
  type FieldKey,
  type RecipeForCompleteness,
} from "@/lib/recipe-completeness";

type Props = {
  recipe: RecipeForCompleteness & { id: string };
};

export function CompletenessCard({ recipe }: Props) {
  const t = useTranslations("completeness");
  const { percent, missingFields } = computeCompleteness(recipe);

  // D-20: at 100% returns null — no nagging
  if (percent >= 100) return null;

  const filledCount = 11 - missingFields.length;

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-card border border-border px-5 py-4">
      {/* Header: editorial display-serif register — "À compléter — 4/11" */}
      <h2 className="text-title">{t("header", { filled: filledCount, total: 11 })}</h2>

      {/* Progress bar — aria-* for screen readers */}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("progress_aria", { percent })}
        className="h-2 bg-muted rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary/60 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Chip row — one chip per missing field, wraps on narrow viewports */}
      {missingFields.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missingFields.map((field: FieldKey) => (
            <Badge key={field} variant="outline" asChild>
              <Link href={`/recipes/${recipe.id}/edit?focus=${field}`}>
                {t(field)}
              </Link>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
