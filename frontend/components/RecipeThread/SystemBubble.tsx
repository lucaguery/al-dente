"use client";

// Phase 27 CAPTURE-04 — system bubble renderer (summary / question / advisory).
//
// Phase 27 ships VISUAL STUBS for question chips + advisory CTAs per
// CONTEXT.md D-14. Phase 28 DETAIL-02 + DETAIL-03 wire the handlers — the
// JSX skeleton here is what Phase 28 attaches onClick to. DO NOT add real
// onClick to the chips/CTAs in Phase 27 — that is the Phase 28 contract.
//
// Shell per UI-SPEC §"System bubble":
// align-self: flex-start; max-width: 90%; bg-card; border + shadow-card;
// border-radius: 18px 18px 18px 4px (bottom-left corner cut = system sender);
// padding: 12px 12px; font-size: 13px; line-height: 1.5.
//
// VISUAL STUBS (no onClick — Phase 28 wires):
//   1. question chip buttons  -> Phase 28 DETAIL-02
//   2. question stepper +/-   -> Phase 28 DETAIL-02
//   3. advisory "Mettre à jour" / "Ignorer" CTAs -> Phase 28 DETAIL-03
//   4. summary "Oui, compléter" / "Plus tard"     -> Phase 28 (chip-driven completion)

import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight } from "lucide-react";

import type { PersistedTurn } from "./types";

// Shared system bubble shell classes
const SYS_BUBBLE_BASE =
  "self-start max-w-[90%] bg-card text-foreground border border-border shadow-card flex flex-col gap-2 text-[13px] leading-[1.5]";
const SYS_BUBBLE_RADIUS = "rounded-[18px_18px_18px_4px]";

// Shared CTA styles
const PRIMARY_CTA_CLASS =
  "flex-1 h-9 rounded-[10px] bg-primary text-primary-foreground font-semibold text-[13px] border-0 cursor-pointer";
const GHOST_CTA_CLASS =
  "flex-1 h-9 rounded-[10px] bg-transparent text-muted-foreground border border-border font-semibold text-[13px] cursor-pointer";

export function SystemBubble({ turn }: { turn: PersistedTurn }): JSX.Element | null {
  const t = useTranslations("recipes.thread");

  const kind = turn.kind;

  if (kind === "summary") {
    const bodyText = turn.payload.body as string | undefined;
    const chips = Array.isArray(turn.payload.chips)
      ? (turn.payload.chips as string[])
      : [];

    return (
      <div className={`${SYS_BUBBLE_BASE} ${SYS_BUBBLE_RADIUS} p-3`}>
        {/* sys-head */}
        <SysHead label={t("sys_summary_head")} />

        {/* Summary chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {chips.map((chip, i) => (
              <span
                key={i}
                className="border border-border rounded-full px-2 py-1 text-[13px] font-semibold text-foreground"
                style={{ background: "oklch(0.96 0.012 50)" }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Body text */}
        {bodyText ? (
          <p className="text-[13px] leading-[1.5]">{bodyText}</p>
        ) : null}

        {/* CTAs — VISUAL STUBS, no onClick — Phase 28 wires */}
        <div className="flex gap-2 mt-1">
          {/* Phase 28 DETAIL-02: wire onClick for summary_complete */}
          <button type="button" className={PRIMARY_CTA_CLASS}>
            {t("summary_complete")}
          </button>
          {/* Phase 28 DETAIL-02: wire onClick for summary_later */}
          <button type="button" className={GHOST_CTA_CLASS}>
            {t("summary_later")}
          </button>
        </div>
      </div>
    );
  }

  if (kind === "question") {
    const inputType = turn.payload.input_type as string | undefined;
    const options = Array.isArray(turn.payload.options)
      ? (turn.payload.options as string[])
      : [];
    const promptLabel = String(turn.payload.prompt ?? "");

    return (
      <div className={`${SYS_BUBBLE_BASE} ${SYS_BUBBLE_RADIUS} p-3`}>
        {/* sys-head: question uses the per-question prompt as the label */}
        <SysHead label={promptLabel} />

        {/* Answer inputs — VISUAL STUBS, no onClick/onChange — Phase 28 DETAIL-02 wires */}
        {inputType === "chip" && (
          <div className="flex flex-wrap gap-2 mt-1">
            {options.map((opt, i) => (
              // Phase 28 DETAIL-02: wire onClick for chip answer
              <button
                key={i}
                type="button"
                className="border-[1.5px] border-border rounded-full px-4 py-2 text-[13px] font-semibold text-foreground bg-background"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {inputType === "stepper" && (
          // Phase 28 DETAIL-02: wire +/− onClick for stepper answer
          <div
            className="inline-flex border-[1.5px] border-border rounded-full self-start mt-1"
            style={{ background: "var(--background)", alignSelf: "flex-start" }}
          >
            <button
              type="button"
              disabled
              className="h-9 w-9 flex items-center justify-center text-[16px] font-semibold text-foreground opacity-50"
            >
              −
            </button>
            <span className="min-w-[44px] font-semibold text-[14px] tabular-nums text-center flex items-center justify-center">
              0
            </span>
            <button
              type="button"
              disabled
              className="h-9 w-9 flex items-center justify-center text-[16px] font-semibold text-foreground opacity-50"
            >
              +
            </button>
          </div>
        )}

        {inputType === "text" && (
          // Phase 28 DETAIL-02: enable and wire onChange for text answer
          <input
            type="text"
            disabled
            className="border border-border rounded-[10px] px-3 py-2 text-[13px] bg-background text-foreground w-full mt-1 opacity-60"
            placeholder="…"
          />
        )}

        {/* Fallback: no known input_type — render nothing extra */}
      </div>
    );
  }

  if (kind === "advisory") {
    const currentValue = String(turn.payload.current_value ?? "");
    const proposedValue = String(turn.payload.proposed_value ?? "");
    const reasonExcerpt = String(turn.payload.reason_excerpt ?? "");

    return (
      <div className={`${SYS_BUBBLE_BASE} ${SYS_BUBBLE_RADIUS} p-3`}>
        {/* sys-head */}
        <SysHead label={t("sys_advisory_head")} />

        {/* Current → proposed value row */}
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-semibold">{currentValue}</span>
          <ArrowRight size={12} aria-hidden className="text-muted-foreground shrink-0" />
          <span className="font-semibold">{proposedValue}</span>
        </div>

        {/* Reason excerpt */}
        {reasonExcerpt ? (
          <p className="text-[13px] text-muted-foreground leading-[1.5]">
            {reasonExcerpt}
          </p>
        ) : null}

        {/* CTAs — VISUAL STUBS, no onClick — Phase 28 DETAIL-03 wires */}
        <div className="flex gap-2 mt-1">
          {/* Phase 28 DETAIL-03: wire onClick for advisory_accept → POST proposal_accepted */}
          <button type="button" className={PRIMARY_CTA_CLASS}>
            {t("advisory_accept")}
          </button>
          {/* Phase 28 DETAIL-03: wire onClick for advisory_dismiss → POST proposal_dismissed */}
          <button type="button" className={GHOST_CTA_CLASS}>
            {t("advisory_dismiss")}
          </button>
        </div>
      </div>
    );
  }

  // Defensive: unknown kind — return null
  return null;
}

// ─── Internal: sys-head ───────────────────────────────────────────────────────

function SysHead({ label }: { label: string }) {
  return (
    <div
      className="inline-flex items-center gap-2"
      style={{
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--primary)",
      }}
    >
      <Sparkles size={11} aria-hidden />
      <span>{label}</span>
    </div>
  );
}
