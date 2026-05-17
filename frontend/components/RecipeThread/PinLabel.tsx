"use client";

// Phase 28 DETAIL-04 — Caveat marginalia label for the « épinglé » /
// « conflit » pin signal. UI-SPEC §Component Specifications locks the
// visual contract:
//   - Font: var(--font-marginalia) (Caveat handwritten)
//   - Size: 12px (inline; sub-register of design system's marginalia-sm 16px)
//   - Weight: 600 (Phase 27 two-weight system lock — NOT 500)
//   - Line-height: 1.0
//   - Color: var(--primary) (épinglé) or var(--destructive) (conflit)
//   - Slant: rotate(-1.2deg) ONLY when `gutter` prop true (detail-page mount)
//
// Used at two mount sites:
//   1. Detail page sections (gutter=true, absolute-positioned by parent)
//   2. Edit form inputs (gutter=false, inline next to <Label>)

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
  /** When true, apply the cookbook-style rotate(-1.2deg) slant. Detail page only. */
  gutter?: boolean;
}

/**
 * Marginalia pin label. Renders as either:
 *   - non-interactive <span> for « épinglé » (default state)
 *   - <button type="button"> for « conflit » with onConflictTap handler
 *
 * Locked-styling: inline CSS to consume var(--font-marginalia) /
 * var(--primary) / var(--destructive) per UI-SPEC §Color §Typography.
 */
export function PinLabel({
  field,
  hasConflict,
  onConflictTap,
  gutter = false,
}: PinLabelProps) {
  const t = useTranslations("recipes.pin");
  const labels = useEnumLabels();

  const baseStyle: CSSProperties = {
    fontFamily: "var(--font-marginalia)",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: 1,
    display: "inline-block",
    whiteSpace: "nowrap",
    ...(gutter ? { transform: "rotate(-1.2deg)" } : {}),
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
