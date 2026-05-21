"use client";

// ADR-0004 La Grille (wave 3) — Geist Mono pin label for « épinglé » /
// « conflit » per ADR §Marginalia register: "Everywhere marginalia was used,
// the replacement is Geist Mono — small, structured, data-like rather than
// hand-written." The prior handwriting register (font + slant) is dropped
// entirely per ADR §Marginalia register.
//
// Used at two mount sites:
//   1. Detail page sections (gutter=true — absolute-positioned by parent)
//   2. Edit form inputs (gutter=false — inline next to <Label>)
//
// The previous rotate(-1.2deg) slant is dropped (no handwriting affordance);
// color is the only state-distinguishing signal: var(--primary) for épinglé,
// var(--destructive) for conflit.

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { useEnumLabels } from "@/lib/enum-labels";
import type { AnswerField } from "@/lib/enums";

export interface PinLabelProps {
  /** The AnswerField this pin represents. Used in conflict aria-label. */
  field: AnswerField;
  /** When true, render the escalated « conflit » destructive variant as a button. */
  hasConflict: boolean;
  /** Required when hasConflict is true — tap handler scrolls to advisory bubble. */
  onConflictTap?: () => void;
  /** Kept on the API surface for caller compatibility; ADR-0004 drops the
   *  rotate(-1.2deg) slant so the value no longer changes rendering. */
  gutter?: boolean;
}

export function PinLabel({
  field,
  hasConflict,
  onConflictTap,
  gutter: _gutter = false,
}: PinLabelProps) {
  const t = useTranslations("recipes.pin");
  const labels = useEnumLabels();

  // Geist Mono via the text-caption utility; weight bumped to 600 so the
  // pin label sits visually heavier than ambient text-caption meta lines.
  const baseStyle: CSSProperties = {
    fontFamily: "var(--font-mono), ui-monospace, monospace",
    fontSize: "11px",
    fontWeight: 600,
    lineHeight: 1,
    display: "inline-block",
    whiteSpace: "nowrap",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  };

  if (hasConflict) {
    return (
      <button
        type="button"
        onClick={onConflictTap}
        aria-label={t("conflict_aria", { field: labels.field(field) })}
        style={{
          ...baseStyle,
          color: "var(--destructive)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        {t("conflict")}
      </button>
    );
  }

  return (
    <span
      style={{
        ...baseStyle,
        color: "var(--primary)",
      }}
    >
      {t("label")}
    </span>
  );
}

export default PinLabel;
