"use client";

// TODO(wave-3): delete this stub once all callers are migrated.
//
// ADR-0004 §Marginalia register "Dropped entirely" — Caveat + the
// `.marginalia` / `.marginalia.slant` CSS rules + the `--font-marginalia`
// token are all gone (deleted in wave 1). The proper deletion is `git rm`
// of this file, BUT 6 callers still import `<Marginalia size slant>`:
//   - app/recipes/[id]/page.tsx
//   - app/recipes/page.tsx
//   - components/HomeDecide.tsx
//   - components/ShortlistProgress.tsx
//   - components/VoteSummary.tsx
//   - (+ the historic AnswerField label sites Wave 3 will sweep)
//
// Per ADR §Marginalia register: "Everywhere marginalia was used, the
// replacement is Geist Mono — small, structured, data-like rather than
// hand-written." The wave-3 sweep does `<Marginalia …>` → `<span
// className="text-caption">` (which resolves to Geist Mono 11px via the
// wave-1 utility-class rewrite).
//
// In the interim, this stub renders the children inside a `<span>` /
// `<p>` / `<div>` with the `text-caption` utility class so the Geist Mono
// substitution happens automatically at call sites — no visual fallback to
// the dropped Caveat font, no missing-font flash. The `size` + `slant`
// props are accepted but no-op'd; size differences are not preserved.
// Wave 3 sweeps and deletes the file.

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
  size: _size = "sm",
  slant: _slant = false,
  as: Tag = "p",
  className,
  style,
  children,
}: MarginaliaProps) {
  // text-caption resolves to Geist Mono 11px var(--muted-foreground) per the
  // wave-1 utility-class rewrite — the ADR-mandated substitution.
  const cls = ["text-caption", className].filter(Boolean).join(" ");
  return (
    <Tag className={cls} style={style}>
      {children}
    </Tag>
  );
}

export default Marginalia;
