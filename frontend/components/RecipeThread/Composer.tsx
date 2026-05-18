"use client";

// Phase 27 CAPTURE-01 + D-04 — multi-input composer.
//
// 3-slot footprint per UI-SPEC §"Composer":
//   [+ button 36×36 circle] [textarea input-wrap flex-1] [mic-or-send 36×36 circle]
//
// D-04: trailing button morphs based on textarea content.
//   - Empty input  → mic icon (Lucide Mic 18×18); tap opens VoiceSheet.
//   - Non-empty    → send icon (Lucide ArrowUp 18×18); tap submits text bubble.
// Morph uses AnimatePresence + variants.fadeIn (150ms ease-craft) per UI-SPEC §Motion.
//
// + button always opens PhotoMenu sheet. The PhotoMenu in turn can open UrlSheet
// (when the user picks "Coller un lien"). VoiceSheet is opened ONLY by the mic button.
//
// Photo cap (D-03 + UI-SPEC Photo-bytes cap discretion):
//   props.photoCountInThread < 4 AND props.photoTotalBytes + selectedFile.size <= 18MB
// Enforced by the parent (Plan 27-03) AFTER onSubmitPhoto fires — Composer does NOT
// reject. This keeps the morph logic simple. Toast surfaces in the parent / orchestrator.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Mic, ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { variants, transitions } from "@/lib/motion";
import { PhotoMenu } from "./PhotoMenu";
import { VoiceSheet } from "./VoiceSheet";
import { UrlSheet } from "./UrlSheet";
import type { ComposerProps } from "./types";

export function Composer({
  mode,
  disabled,
  onSubmitText,
  onSubmitVoice,
  onSubmitPhoto,
  onSubmitUrl,
}: ComposerProps) {
  const t = useTranslations("recipes.thread");

  // Local state: text content + which sheet is open
  const [text, setText] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);

  const isEmpty = text.trim().length === 0;

  function handleTrailingTap() {
    if (isEmpty) {
      setVoiceOpen(true);
    } else {
      onSubmitText(text.trim());
      setText("");
    }
  }

  return (
    <>
      {/* Composer bar */}
      <div className="shrink-0 bg-background border-t border-border flex items-end gap-2 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        {/* + (attach) button */}
        <button
          type="button"
          onClick={() => setPhotoMenuOpen(true)}
          aria-label={t("plus_menu_title")}
          disabled={disabled}
          className="shrink-0 w-9 h-9 rounded-full bg-secondary text-foreground flex items-center justify-center disabled:opacity-50"
        >
          <Plus size={18} aria-hidden />
        </button>

        {/* Auto-grow textarea.
            gh#34 D1 — `style.color = var(--foreground)` defends against CSS
            specificity from globals.css (paper-grain / .text-page-header
            layers occasionally won over the Tailwind text-foreground utility,
            leaving typed text near-invisible on the capture page).
            gh#36 — font-size 16px on mobile kills iOS Safari focus auto-zoom;
            14px restored at sm+ for desktop density. */}
        <textarea
          rows={1}
          placeholder={
            mode === "capture"
              ? t("composer_placeholder_capture")
              : t("composer_placeholder_detail")
          }
          aria-label={
            mode === "capture"
              ? t("composer_placeholder_capture")
              : t("composer_placeholder_detail")
          }
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            // Auto-grow to max ~120px, then scroll within
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          style={{ color: "var(--foreground)" }}
          className="flex-1 bg-card border-[1.5px] border-border rounded-[20px] px-3 py-2 min-h-9 max-h-[120px] text-[16px] sm:text-[14px] leading-[1.4] resize-none focus:outline-none focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_25%,transparent)] text-foreground placeholder:text-muted-foreground disabled:opacity-50"
        />

        {/* Mic-or-send button (D-04 morph) */}
        <button
          type="button"
          onClick={handleTrailingTap}
          aria-label={isEmpty ? t("mic_aria") : t("send_aria")}
          disabled={disabled}
          className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isEmpty ? (
              <motion.span
                key="mic"
                variants={variants.fadeIn}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, transition: transitions.fast }}
                className="flex items-center justify-center"
              >
                <Mic size={18} aria-hidden />
              </motion.span>
            ) : (
              <motion.span
                key="send"
                variants={variants.fadeIn}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, transition: transitions.fast }}
                className="flex items-center justify-center"
              >
                <ArrowUp size={18} aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Sheets rendered outside the composer bar so they can portal correctly */}
      <PhotoMenu
        open={photoMenuOpen}
        onOpenChange={setPhotoMenuOpen}
        onPickPhoto={onSubmitPhoto}
        onPickUrl={() => {
          setPhotoMenuOpen(false);
          setUrlOpen(true);
        }}
      />
      <VoiceSheet
        open={voiceOpen}
        onOpenChange={setVoiceOpen}
        onConfirm={(transcript) => {
          onSubmitVoice(transcript);
          setVoiceOpen(false);
        }}
      />
      <UrlSheet
        open={urlOpen}
        onOpenChange={setUrlOpen}
        onConfirm={(url) => {
          onSubmitUrl(url);
          setUrlOpen(false);
        }}
      />
    </>
  );
}
