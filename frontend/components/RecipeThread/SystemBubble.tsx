"use client";

// Phase 27 CAPTURE-04 — system bubble renderer (summary / question / advisory).
//
// Phase 28 DETAIL-02 + DETAIL-03 wire the handlers attached as stubs in
// Phase 27. Chip/stepper/text inputs are interactive; Valider POSTs an
// answer turn; advisory CTAs accept/dismiss a proposal; collapsed resolution
// rendering replaces the advisory bubble once a resolution turn arrives.
//
// Shell per UI-SPEC §"System bubble":
// align-self: flex-start; max-width: 90%; bg-card; border + shadow-card;
// border-radius: 18px 18px 18px 4px (bottom-left corner cut = system sender);
// padding: 12px 12px; font-size: 13px; line-height: 1.5.

import type React from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight } from "lucide-react";
import { BrandLoader } from "@/components/BrandLoader";

import { useEnumLabels } from "@/lib/enum-labels";
import { formatFieldChip } from "@/lib/format-field";
import type { AnswerField } from "@/lib/enums";
import type { PersistedTurn, AnswerTurnSubmission } from "./types";

// Shared system bubble shell classes
const SYS_BUBBLE_BASE =
  "self-start max-w-[90%] bg-card text-foreground border border-border shadow-card flex flex-col gap-2 text-[13px] leading-[1.5]";
const SYS_BUBBLE_RADIUS = "rounded-[18px_18px_18px_4px]";

// Shared CTA styles
const PRIMARY_CTA_CLASS =
  "flex-1 h-9 rounded-[10px] bg-primary text-primary-foreground font-semibold text-[13px] border-0 cursor-pointer";
const GHOST_CTA_CLASS =
  "flex-1 h-9 rounded-[10px] bg-transparent text-muted-foreground border border-border font-semibold text-[13px] cursor-pointer";

interface SystemBubbleProps {
  turn: PersistedTurn;
  /** Phase 28 DETAIL-03 — when set, advisory bubble renders collapsed-line only. */
  resolution?: "accepted" | "dismissed" | null;
  /** Phase 28 DETAIL-02 — question Valider handler. */
  onPostAnswerTurn?: (submission: AnswerTurnSubmission) => Promise<void>;
  /** Phase 28 DETAIL-03 — advisory accept handler. */
  onPostProposalAccepted?: (advisoryTurnId: string) => Promise<void>;
  /** Phase 28 DETAIL-03 — advisory dismiss handler. */
  onPostProposalDismissed?: (advisoryTurnId: string) => Promise<void>;
  /** Phase 29 D-22 — when true, summary CTAs render in collapsed/dimmed deferred state. */
  deferred?: boolean;
  /** Phase 29 D-22 — POSTs /questions/trigger to emit the next missing-field question. */
  onSummaryComplete?: (turnId: string) => Promise<void>;
  /** Phase 29 D-22 — POSTs /questions/defer to silence questions for 24h. */
  onSummaryLater?: (turnId: string) => Promise<void>;
}

export function SystemBubble({
  turn,
  resolution,
  onPostAnswerTurn,
  onPostProposalAccepted,
  onPostProposalDismissed,
  deferred,
  onSummaryComplete,
  onSummaryLater,
}: SystemBubbleProps): React.JSX.Element | null {
  const t = useTranslations("recipes.thread");
  const labels = useEnumLabels();

  // Shared committing state — one at a time per bubble (T-28-04: per-bubble
  // local state prevents double-tap during in-flight POSTs without the shared
  // postingTurn guard that applies to the capture-surface handlers).
  const [committing, setCommitting] = useState(false);

  const kind = turn.kind;

  if (kind === "summary") {
    const bodyText = turn.payload.body as string | undefined;
    // Phase 35 ENUM-01 — accept both legacy string chips (pre-Plan-35-01
    // summary turns persisted with the old wire shape) and the new structured
    // ChipPayload shape. CONTEXT D-01 migration path: frontend handles both
    // during the transition; legacy chips fade out as recipes re-extract.
    const chips = Array.isArray(turn.payload.chips)
      ? (turn.payload.chips as Array<string | { field: string; value: unknown }>)
      : [];

    const handleComplete = async () => {
      if (!onSummaryComplete) return;
      setCommitting(true);
      try {
        await onSummaryComplete(turn.id);
      } catch {
        // parent toasts
      } finally {
        setCommitting(false);
      }
    };

    const handleLater = async () => {
      if (!onSummaryLater) return;
      setCommitting(true);
      try {
        await onSummaryLater(turn.id);
      } catch {
        // parent toasts
      } finally {
        setCommitting(false);
      }
    };

    return (
      <div className={`${SYS_BUBBLE_BASE} ${SYS_BUBBLE_RADIUS} p-3`}>
        {/* sys-head */}
        <SysHead label={t("sys_summary_head")} />

        {/* Summary chips — Phase 35 ENUM-01 shape-branching:
            • string chip      → render verbatim (legacy back-compat).
            • ChipPayload chip → format via formatFieldChip(field, value, labels).
            • anything else    → String(chip) defensive fallback. */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {chips.map((chip, i) => {
              let content: string;
              if (typeof chip === "string") {
                content = chip;
              } else if (
                chip &&
                typeof chip === "object" &&
                "field" in chip
              ) {
                const { label, display } = formatFieldChip(
                  chip.field,
                  chip.value,
                  labels,
                );
                // Legacy-coerced chip (field === "_legacy" from Plan 35-01
                // read-side validator) returns label === ""; render display
                // verbatim so the user never sees a "_legacy : ..." artifact.
                content = label ? `${label} : ${display}` : display;
              } else {
                // Defensive — malformed payload, never crash the bubble.
                content = String(chip);
              }
              return (
                <span
                  key={i}
                  className="border border-border rounded-full px-2 py-1 text-[13px] font-semibold text-foreground"
                  style={{ background: "oklch(0.96 0.012 50)" }}
                >
                  {content}
                </span>
              );
            })}
          </div>
        )}

        {/* Body text */}
        {bodyText ? (
          <p className="text-[13px] leading-[1.5]">{bodyText}</p>
        ) : null}

        {/* Phase 29 D-22 — CTAs wired. deferred=true collapses both into a muted disabled state
            (parallel to Phase 28 D-19 advisory resolution-collapse pattern). */}
        <div aria-busy={committing} className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={handleComplete}
            disabled={committing || deferred === true || !onSummaryComplete}
            aria-disabled={committing || deferred === true || !onSummaryComplete}
            className={`${PRIMARY_CTA_CLASS} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
          >
            {committing ? (
              <BrandLoader size="sm" aria-label="Chargement" />
            ) : (
              t("summary_complete")
            )}
          </button>
          <button
            type="button"
            onClick={handleLater}
            disabled={committing || deferred === true || !onSummaryLater}
            aria-disabled={committing || deferred === true || !onSummaryLater}
            className={`${GHOST_CTA_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {t("summary_later")}
          </button>
        </div>
      </div>
    );
  }

  if (kind === "question") {
    const payload = turn.payload as {
      field?: string;
      prompt?: string;
      input_type?: "chip" | "stepper" | "text";
      options?: string[];
      multi?: boolean;
    };
    const field = payload.field as AnswerField | undefined;
    const inputType = payload.input_type ?? "chip";
    const multi = payload.multi ?? false;
    const isServings = field === "servings";
    const stepperStep = field === "servings" ? 1 : 5;
    // Phase 27 used promptLabel as SysHead label — preserve that pattern.
    const promptLabel = String(payload.prompt ?? "");

    return (
      <QuestionBubble
        turn={turn}
        field={field}
        inputType={inputType}
        multi={multi}
        isServings={isServings}
        stepperStep={stepperStep}
        promptLabel={promptLabel}
        options={payload.options ?? []}
        committing={committing}
        setCommitting={setCommitting}
        onPostAnswerTurn={onPostAnswerTurn}
        t={t}
      />
    );
  }

  if (kind === "advisory") {
    const payload = turn.payload as {
      field?: string;
      current_value?: unknown;
      proposed_value?: unknown;
      reason_excerpt?: string;
    };

    // D-19 — collapsed resolution rendering: once a proposal_accepted or
    // proposal_dismissed turn lands in turns[] referencing this advisory,
    // replace the full bubble with a one-line muted italic summary.
    if (resolution) {
      const fieldLabel = payload.field
        ? labels.field(payload.field as AnswerField)
        : "";
      return (
        // data-advisory-id enables scroll-to-advisory from the « conflit » PinLabel
        // tap on the detail page (Phase 28 DETAIL-04) even after the bubble collapses.
        <div
          data-advisory-id={turn.id}
          className="self-start px-3 py-1 text-[13px] text-muted-foreground italic"
        >
          {t("advisory_resolved", {
            field: fieldLabel,
            from: String(payload.current_value ?? ""),
            to: String(payload.proposed_value ?? ""),
            status:
              resolution === "accepted"
                ? t("advisory_resolved_accepted")
                : t("advisory_resolved_dismissed"),
          })}
        </div>
      );
    }

    const handleAccept = async () => {
      if (!onPostProposalAccepted) return;
      setCommitting(true);
      try {
        await onPostProposalAccepted(turn.id);
      } catch {
        // parent toasts + reverts
      } finally {
        setCommitting(false);
      }
    };

    const handleDismiss = async () => {
      if (!onPostProposalDismissed) return;
      setCommitting(true);
      try {
        await onPostProposalDismissed(turn.id);
      } catch {
        // parent toasts; no local revert needed for dismiss
      } finally {
        setCommitting(false);
      }
    };

    const currentValue = String(payload.current_value ?? "");
    const proposedValue = String(payload.proposed_value ?? "");
    const reasonExcerpt = String(payload.reason_excerpt ?? "");

    return (
      // data-advisory-id enables scroll-to-advisory from the « conflit » PinLabel
      // tap on the detail page (Phase 28 DETAIL-04).
      <div data-advisory-id={turn.id} className={`${SYS_BUBBLE_BASE} ${SYS_BUBBLE_RADIUS} p-3`}>
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

        {/* CTAs — Phase 28 DETAIL-03 wired */}
        <div aria-busy={committing} className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={handleAccept}
            disabled={committing}
            aria-busy={committing}
            className="flex-1 h-9 rounded-[10px] bg-primary text-primary-foreground font-semibold text-[13px] border-0 cursor-pointer disabled:opacity-50 flex items-center justify-center"
          >
            {committing ? (
              <BrandLoader size="sm" aria-label="Chargement" />
            ) : (
              t("advisory_accept")
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={committing}
            className="flex-1 h-9 rounded-[10px] bg-background text-foreground border border-border font-semibold text-[13px] cursor-pointer disabled:opacity-50"
          >
            {t("advisory_dismiss")}
          </button>
        </div>
      </div>
    );
  }

  // Defensive: unknown kind — return null
  return null;
}

// ─── Internal: question bubble (extracted to avoid useState-in-conditional) ───
//
// React rules of hooks forbid calling useState conditionally. Since question
// branch needs per-bubble `selected` state AND `committing` is already in the
// outer component, we extract the question rendering into its own component so
// hooks are called unconditionally at the top of a well-defined component.

interface QuestionBubbleProps {
  turn: PersistedTurn;
  field: AnswerField | undefined;
  inputType: "chip" | "stepper" | "text";
  multi: boolean;
  isServings: boolean;
  stepperStep: number;
  promptLabel: string;
  options: string[];
  committing: boolean;
  setCommitting: React.Dispatch<React.SetStateAction<boolean>>;
  onPostAnswerTurn: ((submission: AnswerTurnSubmission) => Promise<void>) | undefined;
  t: ReturnType<typeof useTranslations<"recipes.thread">>;
}

function QuestionBubble({
  turn,
  field,
  inputType,
  multi,
  isServings,
  stepperStep,
  promptLabel,
  options,
  committing,
  setCommitting,
  onPostAnswerTurn,
  t,
}: QuestionBubbleProps): React.JSX.Element {
  // Local selection state per question bubble — fresh per turn (each
  // SystemBubble is keyed by turn.id in the parent map).
  const [selected, setSelected] = useState<unknown>(
    inputType === "stepper" ? 0 : multi ? [] : inputType === "text" ? "" : null
  );

  const isValiderDisabled = (() => {
    if (committing) return true;
    if (inputType === "chip") {
      if (multi) return !(Array.isArray(selected) && selected.length > 0);
      return selected === null || selected === undefined;
    }
    if (inputType === "stepper") {
      const v = typeof selected === "number" ? selected : 0;
      if (isServings) return v < 1;
      return false; // time fields allow 0
    }
    if (inputType === "text") {
      return typeof selected !== "string" || selected.trim() === "";
    }
    return true;
  })();

  const handleValider = async () => {
    if (!onPostAnswerTurn || !field) return;
    setCommitting(true);
    try {
      await onPostAnswerTurn({
        in_reply_to_turn_id: turn.id,
        field,
        value: selected,
      });
    } catch {
      // parent toasts + reverts; we just release commit state
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="self-start max-w-[90%] bg-card border border-border rounded-[18px_18px_18px_4px] p-3 flex flex-col gap-2">
      {/* sys-head: question uses the per-question prompt as the label (Phase 27 pattern) */}
      <SysHead label={promptLabel} />

      {/* Chip input */}
      {inputType === "chip" && options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isSelected = multi
              ? Array.isArray(selected) && selected.includes(opt)
              : selected === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  if (multi) {
                    setSelected((prev: unknown) => {
                      const arr = Array.isArray(prev) ? (prev as string[]) : [];
                      return arr.includes(opt)
                        ? arr.filter((x) => x !== opt)
                        : [...arr, opt];
                    });
                  } else {
                    setSelected(opt);
                  }
                }}
                className={
                  isSelected
                    ? "border-[1.5px] border-primary bg-primary text-primary-foreground rounded-full px-4 py-2 text-[13px] font-semibold"
                    : "border-[1.5px] border-border bg-background text-foreground rounded-full px-4 py-2 text-[13px] font-semibold"
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Stepper input */}
      {inputType === "stepper" && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Diminuer"
            disabled={(typeof selected === "number" ? selected : 0) <= 0}
            onClick={() =>
              setSelected((v: unknown) =>
                Math.max(0, (typeof v === "number" ? v : 0) - stepperStep)
              )
            }
            className="h-8 w-8 rounded-full border border-border bg-background text-foreground disabled:opacity-50"
          >
            −
          </button>
          <span className="text-[18px] font-semibold w-12 text-center">
            {typeof selected === "number" ? selected : 0}
          </span>
          <button
            type="button"
            aria-label="Augmenter"
            onClick={() =>
              setSelected(
                (v: unknown) => (typeof v === "number" ? v : 0) + stepperStep
              )
            }
            className="h-8 w-8 rounded-full border border-border bg-background text-foreground"
          >
            +
          </button>
          <span className="text-[13px] text-muted-foreground ml-2">
            {isServings
              ? t("stepper_unit_servings", {
                  count: typeof selected === "number" ? selected : 0,
                })
              : t("stepper_unit_minutes")}
          </span>
        </div>
      )}

      {/* Text input */}
      {inputType === "text" && (
        <input
          type="text"
          value={typeof selected === "string" ? selected : ""}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full h-9 rounded-[10px] border border-border bg-background px-3 text-[14px]"
        />
      )}

      {/* Valider button — UI-SPEC §Layout §3 locked CSS */}
      <button
        type="button"
        onClick={handleValider}
        disabled={isValiderDisabled}
        aria-busy={committing}
        aria-disabled={isValiderDisabled}
        className="w-full h-9 rounded-[10px] bg-primary text-primary-foreground font-semibold text-[13px] border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center"
      >
        {committing ? (
          <BrandLoader size="sm" aria-label="Chargement" />
        ) : (
          t("answer_valider")
        )}
      </button>
    </div>
  );
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
