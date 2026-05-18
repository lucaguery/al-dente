"use client";

// Recipe library card — Direction B (quick-260512-gpl).
// Vertical photo-grid card: 4:3 photo on top + body below with Cormorant
// Garamond title (font-display, upright, line-clamp-2) and a meta row
// (cuisine Badge · relative last-cooked).
//
// Photo fallback chain (round-2): real signed-URL photo → dev cuisine
// fixture SVG → default.svg → surface-muted placeholder div. Mirrors
// ShortlistCard.tsx photo fallback (the seed populates `photo_paths`
// but never uploads bytes in dev; without the fixture path the <img>
// 404s and Safari paints its broken-image icon).
//
// D-05 living image: the photo path prefers the most recent cooking-log
// photo over the canonical recipe photo, so the library list reflects
// "your own food". The cooking-log path needs a different signed-URL
// endpoint (path-on-recipe validation T-04-01-02 rejects it on the
// recipe endpoint); we detect it by the `cooking-logs/` prefix and
// extract the log_id from the path layout
// `cooking-logs/{household_id}/{log_id}/{uuid}.{ext}` (segs[2] = log_id).

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeFr } from "@/lib/datetime";
import { getCookingLogSignedPhotoUrl } from "@/lib/cooking";
import { cookCountToPatina, type PatinaLevel } from "@/lib/recipes";
import type { Recipe } from "@/lib/recipes";
import { RecipeIllustration } from "@/components/RecipeIllustration";
import { useSignedPhotoUrl } from "@/lib/hooks/useSignedPhotoUrl";
import { LedgerCard } from "@/components/LedgerCard";
import { useEnumLabels } from "@/lib/enum-labels";

export function RecipeCard({ recipe, patina }: { recipe: Recipe; patina?: PatinaLevel }) {
  const resolvedPatina: PatinaLevel = patina ?? cookCountToPatina(recipe.cook_count);
  const t = useTranslations("recipes");
  const labels = useEnumLabels();
  // Derive the photo-path key from props; effect runs only when it changes.
  // D-05 living image: prefer the most recent cooking-log photo over the
  // canonical recipe photo so the library list reflects "your own food".
  const firstPath =
    recipe.last_cooked_photo_path ??
    recipe.photo_paths[0] ??
    "";

  // Dev fallback (round-2): when the seed populates photo_paths but doesn't
  // upload bytes (typical dev setup), the signed-URL fetch resolves to a
  // missing-object URL and <img> 404s. Fall through to a bundled cuisine
  // fixture so the library renders real-looking cards in dev. Production:
  // null — surface-muted div is the only fallback.
  const devFallbackUrl =
    process.env.NODE_ENV !== "production"
      ? `/demo-fixtures/${(recipe.cuisine ?? "default").toString()}.svg`
      : null;

  // D-05: living image — the path may be either a recipe photo
  // (recipes/{id}/{uuid}.ext) or a cooking-log photo
  // (cooking-logs/{household_id}/{log_id}/{uuid}.ext). The cooking-log
  // path needs the cooking-log signed-URL endpoint because the
  // recipe-photo endpoint validates path-on-recipe (T-04-01-02).
  // We don't have logId in props, so we extract it from the path itself —
  // safe because the path layout is server-controlled (see
  // backend/app/services/storage.py upload_cooking_log_photo). Layout:
  // cooking-logs/{household_id}/{log_id}/{uuid}.{ext} — segs[2] = log_id.
  const isCookingLogPath = firstPath.startsWith("cooking-logs/");
  // Recipe-photo branch — uses the shared hook with one-shot self-heal (Phase 30 BUG-01).
  const recipeHook = useSignedPhotoUrl(recipe.id, isCookingLogPath ? null : firstPath);
  // Cooking-log branch — keeps the existing inline fetch (Phase 30 scope = recipe photos only).
  const [cookingLogSrc, setCookingLogSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!isCookingLogPath || !firstPath) return;
    let alive = true;
    const segs = firstPath.split("/");
    const logId = segs[2];
    if (!logId) return;
    getCookingLogSignedPhotoUrl(logId, firstPath)
      .then((url) => { if (alive) setCookingLogSrc(url); })
      .catch(() => { if (alive && devFallbackUrl) setCookingLogSrc(devFallbackUrl); });
    return () => { alive = false; };
  }, [firstPath, isCookingLogPath, devFallbackUrl]);
  const src = isCookingLogPath ? cookingLogSrc : (recipeHook.src ?? (firstPath ? null : devFallbackUrl));

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="relative block hover:opacity-95 active:translate-y-px transition-all duration-150"
    >
      <LedgerCard patina={resolvedPatina} className="flex flex-col overflow-hidden p-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL is short-lived; <Image> with custom loader is overkill
        <img
          src={src}
          alt=""
          className="w-full aspect-[4/3] object-cover bg-surface-muted"
          onError={(e) => {
            // Production self-heal — fire the hook's one-shot refetch on the
            // recipe-photo branch. The hook tracks the retry budget per mount.
            if (!isCookingLogPath) recipeHook.onError();
            // Three-stage dev fallback (round-3 260512-gpl):
            //   1. Signed URL 404 (typical seed: photo_paths populated but no
            //      bytes uploaded) → swap to cuisine fixture.
            //   2. Cuisine fixture missing (e.g. asian.svg not authored) →
            //      swap to generic default.svg.
            //   3. Everything failed → leave broken; browser default icon.
            if (process.env.NODE_ENV === "production" || !devFallbackUrl) return;
            const currentSrc = e.currentTarget.src;
            if (!currentSrc.includes("/demo-fixtures/")) {
              e.currentTarget.src = devFallbackUrl;
            } else if (!currentSrc.endsWith("/default.svg")) {
              e.currentTarget.src = "/demo-fixtures/default.svg";
            }
          }}
        />
      ) : (
        <div
          aria-hidden
          className="w-full aspect-[4/3] bg-surface-muted flex items-center justify-center text-foreground-muted"
        >
          <RecipeIllustration recipe={recipe} size={64} />
        </div>
      )}
      {/* Phase 27 D-10 — « Échec » destructive pill for status='failed' rows.
          Uses color-mix() per UI-SPEC §"RecipeCard « Échec » pill (D-10)".
          Positioned absolute top-right over the photo thumbnail; the <Link>
          has `relative` to establish the stacking context. */}
      {recipe.status === "failed" ? (
        <span
          className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold tracking-[0.03em]"
          style={{
            background: "color-mix(in oklch, var(--destructive) 15%, transparent)",
            color: "var(--destructive)",
            border: "1px solid color-mix(in oklch, var(--destructive) 40%, transparent)",
          }}
        >
          <AlertCircle size={10} aria-hidden />
          {t("promotion.failed_badge")}
        </span>
      ) : null}
      <div className="flex flex-col gap-1 px-2.5 pt-2 pb-2.5 min-w-0">
        <h3 className="font-display text-base font-medium leading-tight tracking-tight line-clamp-2">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-foreground-muted">
          {recipe.cuisine ? (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
              {labels.cuisine(recipe.cuisine)}
            </Badge>
          ) : null}
          {recipe.cuisine ? <span aria-hidden>·</span> : null}
          <span>
            {recipe.last_cooked_at
              ? formatRelativeFr(recipe.last_cooked_at)
              : t("never_cooked")}
          </span>
        </div>
      </div>
      </LedgerCard>
    </Link>
  );
}
