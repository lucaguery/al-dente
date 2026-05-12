// RID-01 — Reusable brand mark extracted from frontend/app/icon.tsx.
//
// Why a duplicate of the two <path d="..."> strings: app/icon.tsx runs at
// the Next.js Edge runtime (`ImageResponse`) and rasterizes the SVG to a
// PNG for the PWA `apple-icon.tsx` / manifest pipeline. It cannot be
// imported by React components because its export is an ImageResponse,
// not a JSX element. So both files keep the same two path strings; per
// 24-CONTEXT.md D-09, both must update together if the brand mark ever
// changes. The viewBox / paths are byte-identical to app/icon.tsx:26-39.
//
// Why stroke is currentColor instead of the literal `#FAF7F2`: BrandIcon
// inherits the text color of its container so it tints into whatever
// palette wraps it (foreground-muted on EmptyState, primary on onboarding
// welcome, etc.). The PWA twin keeps the literal because the Edge runtime
// cannot resolve CSS variables.
export function BrandIcon({
  size = 48,
  strokeWidth = 6,
  className,
  "aria-label": ariaLabel,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel === undefined ? true : undefined}
      role={ariaLabel !== undefined ? "img" : undefined}
    >
      {/* Outer pasta-strand spiral (closed Bézier whorl) — verbatim from app/icon.tsx */}
      <path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z" />
      {/* Inner whorl — single curve reading as the pasta unfurling — verbatim from app/icon.tsx */}
      <path d="M 60 80 C 60 65, 80 55, 95 65" />
    </svg>
  );
}
