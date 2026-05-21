// ADR-0004 §Logo — Al Dente table-à-manger logomark.
//
// Geometry mirrors `frontend/public/logo.svg` byte-for-byte at the visual
// level (same viewBox 0 0 64 64, same circles, same radii, same fill rules).
// We duplicate the SVG inline rather than `<Image src="/logo.svg" />` because
// `app/icon.tsx` + `app/apple-icon.tsx` run at the Next.js Edge runtime
// (`ImageResponse`) and cannot import React components — they keep their own
// literal-hex copy. The static asset is therefore the source of truth; any
// geometry edit must land in all three files (logo.svg / BrandIcon.tsx /
// app/icon.tsx + app/apple-icon.tsx) in the same commit.
//
// Stroke is `currentColor` so the mark inherits container ink (used as
// `text-foreground` on Accueil empty state, `text-primary` on onboarding,
// `text-muted-foreground` on quiet surfaces). The centre accent dot stays
// literal `#A8523C` because it IS the brand atom — per ADR §Logo it does not
// recolor with context.
export type BrandIconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  dotClassName?: string;
  "aria-label"?: string;
};

export function BrandIcon({
  size = 48,
  strokeWidth = 2,
  className,
  dotClassName,
  "aria-label": ariaLabel,
}: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel === undefined ? true : undefined}
      role={ariaLabel !== undefined ? "img" : undefined}
    >
      {/* Plate edge */}
      <circle cx="32" cy="32" r="27" stroke="currentColor" strokeWidth={strokeWidth} />
      {/* Inner well — subtle, omit below 32px per ADR-0004 §Logo */}
      {size >= 32 && (
        <circle cx="32" cy="32" r="19" stroke="currentColor" strokeWidth="1" opacity="0.22" />
      )}
      {/* North seat (member 1) */}
      <circle cx="32" cy="5" r="4" fill="currentColor" />
      {/* South seat (member 2) */}
      <circle cx="32" cy="59" r="4" fill="currentColor" />
      {/* Centre accent dot — terracotta brand atom (locked hex, ADR §Logo) */}
      <circle cx="32" cy="32" r="3.5" fill="#A8523C" className={dotClassName} />
    </svg>
  );
}

// ADR-aligned alias for new code. Same component, more descriptive name —
// the mark IS the table-à-manger voting scene at brand scale.
export const AlDenteMark = BrandIcon;
