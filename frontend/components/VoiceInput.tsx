"use client";

// Generic textarea wrapper for the cooking-log notes field (CAPTURE-07)
// and any other "user dictates or types" surface in the app.
//
// Phase 2 critical decision: NO Web Speech API. The placeholder hint
// tells the user to use the iOS keyboard microphone (which works in any
// text field at the OS level, including PWA standalone mode). This is
// the entire "voice input" mechanism in v0.1.
//
// Phase 4 wires this into the cooking-log finalization screen. Phase 2
// ships the component file so the type contract is locked.

import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** i18n key resolved from the root namespace. Defaults to the cooking-log
   *  copy; callers (e.g. /recipes/new Voice tab) can pass any dotted key
   *  like "recipes.voice.transcript_placeholder" to reuse. */
  placeholderKey?: string;
  ariaLabelKey?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
};

export function VoiceInput({
  value,
  onChange,
  placeholderKey = "cooking_log.voice_input.placeholder",
  ariaLabelKey = "cooking_log.voice_input.aria_label",
  className,
  disabled,
  rows = 4,
}: Props) {
  // Root translator: accepts dotted keys directly. Avoids a per-component
  // namespace split helper (the next-intl API in this version takes any
  // valid nested key off the root namespace).
  const t = useTranslations();
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t(placeholderKey)}
      aria-label={t(ariaLabelKey)}
      className={className}
      rows={rows}
      disabled={disabled}
    />
  );
}
