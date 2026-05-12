"use client";

// CAPTURE-01 — Voice tab body for /recipes/new.
//
// CRITICAL Phase 2 decision (D-Voice / 02-CONTEXT.md): the Web Speech API
// is broken in iOS PWA standalone mode (no result event ever fires after
// Add to Home Screen). This component is intentionally a TEXTAREA-ONLY
// surface — users dictate via the iOS keyboard mic (OS-level, works in
// any text field with no JS) or simply type. Do NOT introduce any
// browser speech-recognition or audio-recording APIs here; see the plan's
// "must_haves.truths" for the exact symbol list to avoid.
//
// On submit we POST the transcript to /api/recipes/voice via
// `postVoiceCapture` (Plan 03's helper, which goes through the Vercel
// rewrite + cookie auth). Backend immediately returns a draft and queues
// the Gemini extraction in a BackgroundTask; we route the user to /inbox
// so they see the spinner card (Plan 05's RecipeDraftCard variants) flip
// to `structured` once Gemini lands.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { postVoiceCapture } from "@/lib/recipes";

export function VoiceCaptureTab() {
  const router = useRouter();
  const t = useTranslations("recipes.voice");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("onboarding.errors");

  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmed = transcript.trim();
  const canSend = trimmed.length > 0 && !submitting;
  const canRestart = transcript.length > 0 && !submitting;

  async function handleSend() {
    if (!trimmed) {
      toast.error(t("empty_transcript"));
      return;
    }
    setSubmitting(true);
    try {
      await postVoiceCapture(trimmed);
      toast.success(t("submitted_toast"));
      router.replace("/inbox");
    } catch {
      toast.error(tErr("network"));
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setTranscript("");
  }

  return (
    <div className="px-(--spacing-page-x) pt-6 pb-32 flex flex-col gap-(--spacing-section-y)">
      {/* D-Voice deviation callout (CAPTURE-10): the keyboard-mic affordance
          IS this card. iOS PWA standalone has no working browser speech-recognition
          (D-Voice locked since Phase 2), so we do NOT render an in-app mic
          button — the user dictates via the OS keyboard mic. The display-serif
          italic headline at body size sits in the cookbook margin-note register
          per Phase 6 UI-SPEC §Typography. */}
      <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 px-4 py-3 flex flex-col gap-1.5">
        <span className="font-display italic text-base text-foreground">
          {t("idle_helper")}
        </span>
      </Card>

      <Textarea
        aria-label={t("transcript_aria")}
        placeholder={t("transcript_placeholder")}
        className="min-h-32 max-h-64"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        autoFocus
        disabled={submitting}
      />

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="h-12"
          onClick={handleRestart}
          disabled={!canRestart}
        >
          {t("restart")}
        </Button>
        <Button
          type="button"
          variant="default"
          className="h-12"
          onClick={handleSend}
          disabled={!canSend}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tCommon("sending")}
            </>
          ) : (
            t("send")
          )}
        </Button>
      </div>
    </div>
  );
}
