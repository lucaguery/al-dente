"use client";

// Voice-modify entry surface (Phase 2 D-10/D-11; CAPTURE-05).
// Bottom sheet with a TEXTAREA — NO Web Speech API. The user dictates
// via the iOS keyboard mic (OS-level, works inside any text field
// including PWA standalone) or types. On submit we call
// POST /api/recipes/{id}/voice-modify, store the Gemini result in
// sessionStorage under `voice-modify-prefill`, and route to the edit
// page which consumes (and clears) the entry once on mount.
//
// No diff UI in v0.1 (D-11 explicit); the user simply lands on a
// pre-filled edit form and can keep editing or save.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { postVoiceModify } from "@/lib/recipes";

type Props = {
  recipeId: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
};

export function VoiceModifySheet({ recipeId, open, onOpenChange }: Props) {
  const t = useTranslations("recipes.voice_modify");
  const tVoice = useTranslations("recipes.voice");
  const router = useRouter();

  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset the textarea on close via the Sheet's open-change callback rather
  // than a useEffect (avoids cascading-render lint rule).
  function handleOpenChange(next: boolean) {
    if (!next) {
      setTranscript("");
      setSubmitting(false);
    }
    onOpenChange(next);
  }

  async function submit() {
    const trimmed = transcript.trim();
    if (trimmed.length === 0) return;
    setSubmitting(true);
    try {
      const result = await postVoiceModify(recipeId, trimmed);
      // sessionStorage is per-tab, ephemeral. Edit page reads + clears once.
      sessionStorage.setItem("voice-modify-prefill", JSON.stringify(result));
      handleOpenChange(false);
      router.push(`/recipes/${recipeId}/edit`);
    } catch {
      toast.error(t("failed"));
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[80svh] flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("sheet_title")}</SheetTitle>
          <SheetDescription className="text-sm text-foreground-muted">
            {t("sheet_description")}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-6 py-4">
          <Textarea
            aria-label={tVoice("transcript_aria")}
            placeholder={tVoice("transcript_placeholder")}
            className="min-h-32 max-h-64"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={submitting}
            autoFocus
          />
        </div>
        <SheetFooter className="px-6 pb-6 pt-0 flex flex-row gap-3">
          <Button
            variant="ghost"
            className="flex-1 h-11"
            disabled={submitting || transcript.length === 0}
            onClick={() => setTranscript("")}
          >
            {t("restart")}
          </Button>
          <Button
            variant="default"
            className="flex-1 h-11"
            disabled={submitting || transcript.trim().length === 0}
            onClick={submit}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("send")
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
