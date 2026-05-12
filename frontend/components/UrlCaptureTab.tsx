"use client";

// CAPTURE-03 — URL paste tab body for /recipes/new.
//
// v0.1 ships a deliberately minimal flow: the user pastes a recipe URL, we
// validate it client-side (`new URL(...)` + http/https scheme), then POST
// it via `postUrlCapture`. The backend creates a draft with the URL stored
// in `source_capture` and routes the user to /inbox. There is no Gemini
// scrape in v0.1 — the helper notice (recipes.url.helper) sets that
// expectation with the user. Auto-extraction is a productize-later
// enhancement (T-02-04-03 mitigation: client validates the scheme,
// backend re-validates with stricter rules).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postUrlCapture } from "@/lib/recipes";

export function UrlCaptureTab() {
  const router = useRouter();
  const t = useTranslations("recipes.url");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("onboarding.errors");

  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(() => {
    const v = value.trim();
    if (v.length === 0) return false;
    try {
      const parsed = new URL(v);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, [value]);

  const showInlineError = touched && value.length > 0 && !isValid;

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await postUrlCapture(value.trim());
      toast.success(t("submitted_toast"));
      router.replace("/inbox");
    } catch {
      toast.error(tErr("network"));
      setSubmitting(false);
    }
  }

  return (
    <div className="px-(--spacing-page-x) pt-6 pb-32 flex flex-col gap-(--spacing-section-y)">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="url-input">{t("field_label")}</Label>
        <Input
          id="url-input"
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          className="font-mono text-sm"
          placeholder={t("field_placeholder")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={submitting}
        />
        {showInlineError && (
          <p className="text-sm text-destructive mt-1">{t("invalid")}</p>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
        <p>{t("helper")}</p>
      </div>

      <Button
        type="button"
        className="h-12 w-full"
        onClick={handleSubmit}
        disabled={!isValid || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tCommon("sending")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
    </div>
  );
}
