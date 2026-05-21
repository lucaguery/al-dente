"use client";

// TODO(wave-3): delete this stub once all callers are migrated.
//
// ADR-0004 §Patine ledger card "Dropped entirely" — the patine system + dog-
// ear corner-fold + hand-stamp grammar are gone. The proper deletion is
// `git rm` of this file, BUT 4 callers (app/recipes/page.tsx,
// components/RecipeCard.tsx, components/RecipeRow.tsx,
// app/recipes/[id]/page.tsx — and the patina-view branch of recipes/page.tsx)
// still import `<LedgerCard patina={…} dogear>`. Removing the file in wave 2
// would break `next build --webpack` and force the wave-3 screen refit to
// happen in a single megacommit, against the per-wave atomic-commit contract.
//
// This stub re-exports `LedgerCard` as a thin <article> with the same
// `className` / `style` / children pass-through. The `patina` and `dogear`
// props are accepted but rendered as plain hairline borders (no overlays,
// no ::before / ::after stamps — those CSS rules were deleted in wave 1).
// Wave 3 sweeps all call sites + `git rm`s this file in the same commit.

import type { ReactNode, CSSProperties } from "react";

export type PatinaLevel = 0 | 1 | 2 | 3;

export interface LedgerCardProps {
  patina: PatinaLevel;
  dogear?: boolean;
  as?: "article" | "div";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function LedgerCard({
  // patina + dogear accepted but no-op'd — overlays are gone in wave 1.
  patina: _patina,
  dogear: _dogear,
  as: Tag = "article",
  className,
  style,
  children,
}: LedgerCardProps) {
  // Compose the new hairline-card class chain so the stub still reads as a
  // card surface against the off-white bg. No shadows, no texture, no patine.
  const cls = ["rounded-lg border border-border bg-card", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} style={style}>
      {children}
    </Tag>
  );
}

export default LedgerCard;
