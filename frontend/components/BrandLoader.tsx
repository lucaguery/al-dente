"use client";

// ADR-0004 §Logo + sketch SKILL.md Motion — Brand-mark loader.
//
// Wave 1 deleted the old stroke-dasharray drawLoop CSS that animated the
// pasta-strand path. Wave 4 rebuilds the loader against the new
// table-à-manger mark: the centre accent dot pulses (opacity 1 → 0.35 → 1)
// on the locked motion curve `var(--ease)` / 1.6s. The pulse rides ONLY the
// centre dot — the plate edge + seats stay static so the mark still reads as
// the brand at rest.
//
// `prefers-reduced-motion` is handled both globally (the
// `animation-duration: 0ms !important` rule in globals.css) and locally
// (the `.loader-dot-pulse` class includes its own reduced-motion guard).

import { BrandIcon } from "@/components/BrandIcon";

export type BrandLoaderSize = "default" | "sm";

export interface BrandLoaderProps {
  size?: BrandLoaderSize;
  className?: string;
  "aria-label"?: string;
}

export function BrandLoader({
  size = "default",
  className,
  "aria-label": ariaLabel = "Chargement",
}: BrandLoaderProps) {
  const svgSize = size === "sm" ? 18 : 96;
  return (
    <div className={className} role="img" aria-label={ariaLabel}>
      <BrandIcon
        size={svgSize}
        strokeWidth={2}
        dotClassName="loader-dot-pulse"
        aria-hidden
      />
    </div>
  );
}

export default BrandLoader;
