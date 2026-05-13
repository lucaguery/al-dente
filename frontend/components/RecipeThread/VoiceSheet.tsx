"use client";

// Phase 27 D-01 — voice sheet (D-Voice textarea pattern, NOT MediaRecorder).
// Internalizes frontend/components/VoiceCaptureTab.tsx's helper-card +
// textarea idiom. iOS PWA standalone has no working Web Speech API
// (D-Voice locked since Phase 2); the user dictates via the OS keyboard mic
// or types directly.

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type VoiceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (transcript: string) => void;
};

export function VoiceSheet({ open, onOpenChange, onConfirm }: VoiceSheetProps) {
  const t = useTranslations("recipes.thread");
  const [transcript, setTranscript] = useState("");

  function handleConfirm() {
    const trimmed = transcript.trim();
    if (trimmed.length === 0) return;
    onConfirm(trimmed);
    setTranscript("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-base font-medium">
            {t("voice_sheet_title")}
          </SheetTitle>
        </SheetHeader>

        {/* D-Voice helper card — mirrors VoiceCaptureTab pattern (paper-grain card, italic display-serif headline) */}
        <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-2 mx-4 mt-2">
          <span className="font-display italic text-base text-foreground">
            {t("voice_helper")}
          </span>
        </Card>

        {/* Dictation textarea — autoFocus so iOS keyboard mic activates */}
        <Textarea
          autoFocus
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={t("voice_placeholder")}
          className="min-h-32 max-h-64 mx-4 mt-2"
        />

        {/* Action row */}
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <Button
            type="button"
            variant="ghost"
            className="h-12"
            onClick={() => setTranscript("")}
            disabled={transcript.length === 0}
          >
            {t("voice_restart")}
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-12"
            onClick={handleConfirm}
            disabled={transcript.trim().length === 0}
          >
            {t("voice_add")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
