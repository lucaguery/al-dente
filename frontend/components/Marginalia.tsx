"use client";

// Phase 32 §15.B — Caveat marginalia wrapper.
// Composes the .marginalia / .marginalia-sm|md|lg / .marginalia.slant
// utility classes from globals.css (added in 32-01 §15.B).
// Per CONTEXT D-05 + UI-SPEC §7.3.
//
// Sub-16px sites (PinLabel at 12px) do NOT use this primitive — they
// inline `var(--font-marginalia)` directly. <Marginalia> starts at sm=1rem.

import type { ReactNode, CSSProperties } from "react";

export type MarginaliaSize = "sm" | "md" | "lg";

export interface MarginaliaProps {
  size?: MarginaliaSize;
  slant?: boolean;
  as?: "p" | "span" | "div";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Marginalia({
  size = "sm",
  slant = false,
  as: Tag = "p",
  className,
  style,
  children,
}: MarginaliaProps) {
  const cls = [
    "marginalia",
    `marginalia-${size}`,
    slant ? "slant" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} style={style}>
      {children}
    </Tag>
  );
}

export default Marginalia;
