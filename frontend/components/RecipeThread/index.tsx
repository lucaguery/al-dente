"use client";

// Phase 27 CAPTURE-01 + CAPTURE-04 — shared chat thread.
//
// Component boundary (CONTEXT.md §"Reusable component contract"):
//   - Composer state (text + open-sheet) lives IN this component tree.
//   - Pending bubbles / persisted turns / saving / recipeId live in the
//     PARENT page (capture mode = /recipes/new; detail mode = /recipes/[id]).
//
// Layout (UI-SPEC.md §"Layout — Page Structure"):
//   Capture mode: chat-body (flex-1, scroll) -> save-bar (>=1 pending) -> composer
//   Detail mode:  thread-meta -> chat-body (flex-1, scroll) -> manual-link -> composer
//
// Visual tokens come from docs/design-system.html (Sober Kitchen):
// var(--primary), var(--card), var(--background), var(--border),
// var(--muted-foreground), var(--shadow-card). The state-pill colors are
// component-scoped (UI-SPEC.md §"New Token Requests").

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { variants, transitions } from "@/lib/motion";
import type { RecipeThreadProps, PendingBubble } from "./types";
import { Bubble } from "./Bubble";
import { SystemBubble } from "./SystemBubble";
import { Composer } from "./Composer";

// State pill: component-scoped arbitrary Tailwind values per UI-SPEC §"New Token Requests"
// Implementation guidance: do not add to globals.css for phase-27-scoped values.
const STATE_PILL = {
  structured: {
    bg: "oklch(0.92_0.10_130)",
    fg: "oklch(0.30_0.10_130)",
    border: "oklch(0.78_0.10_130)",
    label: "state_structured",
  },
  draft: {
    bg: "oklch(0.94_0.018_35)",
    fg: "oklch(0.42_0.10_35)",
    border: "oklch(0.82_0.06_35)",
    label: "state_draft",
  },
  failed: {
    bg: "color-mix(in_oklch,var(--destructive)_15%,transparent)",
    fg: "var(--destructive)",
    border: "color-mix(in_oklch,var(--destructive)_40%,transparent)",
    label: "state_failed",
  },
  verified: {
    bg: "oklch(0.92_0.10_130)",
    fg: "oklch(0.30_0.10_130)",
    border: "oklch(0.78_0.10_130)",
    label: "state_structured",
  },
} as const;

const PHOTO_MAX_COUNT = 4;
const PHOTO_TOTAL_BYTES_CAP = 18 * 1024 * 1024; // 18 MB — matches backend GEMINI_PHOTO_TOTAL_BYTES_CAP

export function RecipeThread(props: RecipeThreadProps) {
  const t = useTranslations("recipes.thread");
  const tCommon = useTranslations("common");
  const lastBubbleRef = useRef<HTMLLIElement | null>(null);

  // UI-SPEC §"Chat body > Scroll behavior"
  const listLength =
    props.mode === "capture"
      ? props.pendingBubbles.length
      : props.turns.length;

  useEffect(() => {
    if (lastBubbleRef.current) {
      lastBubbleRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [listLength]);

  // Photo cap enforcement (capture mode) — done before calling onAddPendingBubble
  function handleAddPendingBubble(bubble: PendingBubble) {
    if (props.mode !== "capture") return;

    if (bubble.kind === "photo") {
      const currentPhotoCount = props.pendingBubbles.filter(
        (b) => b.kind === "photo"
      ).length;
      if (currentPhotoCount >= PHOTO_MAX_COUNT) {
        toast.error(t("photo_cap_exceeded"));
        return;
      }
      if (props.photoTotalBytes + bubble.sizeBytes > PHOTO_TOTAL_BYTES_CAP) {
        toast.error(t("photo_cap_exceeded"));
        return;
      }
    }

    props.onAddPendingBubble(bubble);
  }

  // Composer callbacks — wired based on mode
  function onSubmitText(text: string) {
    if (props.mode === "capture") {
      handleAddPendingBubble({
        id: crypto.randomUUID(),
        kind: "text",
        text,
      });
    } else {
      props.onPostTextTurn(text);
    }
  }

  function onSubmitVoice(transcript: string) {
    if (props.mode === "capture") {
      handleAddPendingBubble({
        id: crypto.randomUUID(),
        kind: "voice",
        transcript,
      });
    } else {
      props.onPostVoiceTurn(transcript);
    }
  }

  function onSubmitUrl(url: string) {
    if (props.mode === "capture") {
      handleAddPendingBubble({
        id: crypto.randomUUID(),
        kind: "url",
        url,
      });
    } else {
      props.onPostUrlTurn(url);
    }
  }

  function onSubmitPhoto(file: File) {
    if (props.mode === "capture") {
      const previewUrl = URL.createObjectURL(file);
      handleAddPendingBubble({
        id: crypto.randomUUID(),
        kind: "photo",
        file,
        previewUrl,
        sizeBytes: file.size,
      });
    } else {
      props.onPostPhotoTurn(file);
    }
  }

  const composerDisabled =
    props.mode === "capture" ? props.saving : false;

  const photoCountInThread =
    props.mode === "capture"
      ? props.pendingBubbles.filter((b) => b.kind === "photo").length
      : 0;

  return (
    <section className="flex flex-col flex-1 min-h-0">
      {/* Thread-meta strip (detail mode only) */}
      {props.mode === "detail" && (
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-card border-b border-border"
          style={{ minHeight: "36px" }}
        >
          {/* State pill */}
          {(() => {
            const pill = STATE_PILL[props.recipeStatus] ?? STATE_PILL.draft;
            const labelKey = pill.label as keyof ReturnType<typeof t>;
            return (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-1"
                style={{
                  background: `var(--tw-${pill.bg}, ${pill.bg})`,
                  color: pill.fg,
                  border: `1px solid ${pill.border}`,
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  backgroundColor: pill.bg.startsWith("oklch") ? pill.bg : undefined,
                  borderColor: pill.border.startsWith("oklch") ? pill.border : undefined,
                }}
                aria-label={`Statut : ${t(labelKey as string)}`}
              >
                <Sparkles size={9} aria-hidden />
                {t(labelKey as string)}
              </span>
            );
          })()}
          {/* Title meta */}
          <span
            className={`flex-1 font-display text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap leading-[1.2] ${
              props.recipeStatus === "draft" ? "italic" : ""
            }`}
          >
            {props.title || t("draft_title_placeholder")}
          </span>
        </div>
      )}

      {/* Empty-state hint (capture mode, no bubbles yet) */}
      {props.mode === "capture" && props.pendingBubbles.length === 0 && (
        <p className="self-center text-muted-foreground text-[13px] italic px-3 py-2 text-center mx-4">
          {t("empty_capture_hint")}
        </p>
      )}

      {/* Chat body */}
      <ol
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto px-4 pt-4 pb-2 flex flex-col gap-2 bg-background min-h-0"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {props.mode === "capture"
            ? props.pendingBubbles.map((bubble, idx) => {
                const isLast = idx === props.pendingBubbles.length - 1;
                return (
                  <motion.li
                    key={bubble.id}
                    layout
                    variants={variants.slideUp}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, transition: transitions.fast }}
                    ref={isLast ? lastBubbleRef : null}
                  >
                    <Bubble
                      variant="pending"
                      bubble={bubble}
                      onDismiss={props.onDismissPendingBubble}
                    />
                  </motion.li>
                );
              })
            : props.turns.map((turn, idx) => {
                const isLast = idx === props.turns.length - 1;
                return (
                  <motion.li
                    key={turn.id}
                    layout
                    variants={variants.slideUp}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, transition: transitions.fast }}
                    ref={isLast ? lastBubbleRef : null}
                  >
                    {turn.sender === "user" ? (
                      <Bubble variant="persisted" turn={turn} />
                    ) : (
                      <SystemBubble turn={turn} />
                    )}
                  </motion.li>
                );
              })}
        </AnimatePresence>

        {/* Extraction-in-progress row (detail mode, status=draft) */}
        {props.mode === "detail" && props.recipeStatus === "draft" && (
          <li
            className="self-center text-muted-foreground text-[13px] italic px-3 py-2 text-center list-none"
            aria-live="polite"
          >
            {t("extracting")}
          </li>
        )}
      </ol>

      {/* Save bar (capture mode only, visible when >= 1 pending bubble) */}
      {props.mode === "capture" && (
        <AnimatePresence>
          {props.pendingBubbles.length >= 1 && (
            <motion.div
              variants={variants.slideUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, transition: transitions.fast }}
              className="shrink-0 px-4 pt-2 bg-background"
            >
              <button
                type="button"
                disabled={props.pendingBubbles.length === 0 || props.saving}
                aria-disabled={props.pendingBubbles.length === 0 || props.saving}
                onClick={props.onSave}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold text-[14px] disabled:opacity-35 disabled:cursor-not-allowed"
                style={{
                  boxShadow: "0 2px 6px oklch(0.595 0.135 35 / 0.25)",
                  transition: "opacity 150ms var(--ease-craft)",
                }}
              >
                {props.saving ? (
                  tCommon("saving")
                ) : (
                  <>
                    <Check size={16} strokeWidth={2.4} aria-hidden />
                    {t("save_cta")}
                    <span
                      className="rounded-full px-2 py-1 text-[10px] opacity-75"
                      style={{ background: "rgba(255,255,255,0.18)" }}
                    >
                      {t("bubble_count", { count: props.pendingBubbles.length })}
                    </span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Manual-edit link (detail mode only) */}
      {props.mode === "detail" && (
        <div className="shrink-0 px-4 pt-2 text-center">
          <button
            type="button"
            onClick={props.onManualEditLinkClick}
            className="text-muted-foreground text-[10px]"
            style={{
              textDecoration: "underline",
              textDecorationStyle: "dashed",
              textUnderlineOffset: "3px",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t("manual_edit_link")}
          </button>
        </div>
      )}

      {/* Composer */}
      <Composer
        mode={props.mode}
        disabled={composerDisabled}
        onSubmitText={onSubmitText}
        onSubmitVoice={onSubmitVoice}
        onSubmitPhoto={onSubmitPhoto}
        onSubmitUrl={onSubmitUrl}
        photoTotalBytes={props.mode === "capture" ? props.photoTotalBytes : 0}
        photoCountInThread={photoCountInThread}
      />
    </section>
  );
}

export default RecipeThread;
