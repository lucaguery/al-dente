"use client";

// Phase 32 §15.C — Patine ledger card.
// Wraps a <article> (or chosen element) with .ledger-card class and an
// inline --patina CSS var consumed by the patine overlays (::before /
// ::after / .dogear) in globals.css (added in 32-01).
// Per CONTEXT D-05, D-07 + UI-SPEC §7.1 + RESEARCH Pattern 3.
//
// Consumers must NOT add `paper-grain` class — .ledger-card::after
// provides its own dot-grid grain (RESEARCH Pitfall 1).
// Dogear renders when `dogear` prop OR when patina >= 3 (Héritage).

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
  patina,
  dogear,
  as: Tag = "article",
  className,
  style,
  children,
}: LedgerCardProps) {
  const showDogear = dogear ?? patina >= 3;
  const cls = ["ledger-card", className].filter(Boolean).join(" ");
  return (
    <Tag
      className={cls}
      style={{ ...style, ["--patina" as string]: patina } as CSSProperties}
    >
      {children}
      {showDogear ? (
        <span className="dogear" aria-hidden>
          {/* Doc line 1612: SVG corner-fold. Foreground = border-mix. */}
          <svg viewBox="0 0 26 26" width={26} height={26}>
            <path
              d="M 0 0 L 26 0 L 26 26 Z"
              fill="color-mix(in oklch, var(--border) 60%, transparent)"
            />
            <path
              d="M 0 0 L 26 0 L 14 12 Z"
              fill="var(--card)"
            />
          </svg>
        </span>
      ) : null}
    </Tag>
  );
}

export default LedgerCard;
