"use client";

// Phase 32 §15.C — Brand-mark drawing-stroke loader.
// Composes BrandIcon SVG inside .loader-brand wrapper. The
// stroke-dasharray animation lives in globals.css (added in 32-01).
// Per CONTEXT D-05, D-14, D-15 + UI-SPEC §7.4 + RESEARCH Pattern 5.
//
// prefers-reduced-motion handled by globals.css (per-loader-brand fallback
// + global animation-duration: 0ms !important rule).

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
  // BrandIcon's intrinsic SVG size; .loader-brand and .loader-brand-sm
  // CSS overrides the wrapper dimensions. SVG scales via viewBox.
  const svgSize = size === "sm" ? 18 : 96;
  const cls = [
    "loader-brand",
    size === "sm" ? "loader-brand-sm" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} role="img" aria-label={ariaLabel}>
      <BrandIcon size={svgSize} strokeWidth={6} aria-hidden />
    </div>
  );
}

export default BrandLoader;
