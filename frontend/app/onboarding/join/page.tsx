"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { api } from "@/lib/api";
import { useSession } from "@/components/SessionProvider";

// UI-SPEC §"Surface-by-Surface Pinning" §3 — Onboarding Join.
// Code input drives a debounced GET /households/by-code/{code} preview
// to render the creator's color as a disabled swatch BEFORE submission
// (ONBOARD-05 client half). T-01-06-06 mitigation: 300ms debounce + only
// fires when code length === 6.
type PreviewResponse = {
  household_name: string;
  taken_colors: string[];
};

type JoinResponse = {
  household_id: string;
  member_id: string;
  auth_token: string;
  invite_code: string;
};

// Use a tiny custom error so we can branch on HTTP status (api() throws a
// generic Error("<status> <statusText>") on non-2xx).
function statusOf(err: unknown): number | null {
  if (err instanceof Error) {
    const match = err.message.match(/^(\d{3})\s/);
    if (match) return Number(match[1]);
  }
  return null;
}

export default function OnboardingJoinPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const t = useTranslations("onboarding.join");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("onboarding.errors");

  const [code, setCode] = useState("");
  const [memberName, setMemberName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [takenColors, setTakenColors] = useState<ReadonlyArray<string>>([]);
  const [previewPending, setPreviewPending] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [colorError, setColorError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-fetch the preview (used after a 409/422 to refresh disabled
  // swatches if the server's truth diverged from the cached copy).
  async function fetchPreview(currentCode: string) {
    if (currentCode.length !== 6) return;
    setPreviewPending(true);
    try {
      const preview = await api<PreviewResponse>(
        `/api/households/by-code/${encodeURIComponent(currentCode)}`,
      );
      setTakenColors(preview.taken_colors);
      setCodeError(null);
    } catch (err) {
      const status = statusOf(err);
      if (status === 404) {
        setTakenColors([]);
        setCodeError(tErrors("code_not_found"));
      } else {
        toast.error(tErrors("network"));
      }
    } finally {
      setPreviewPending(false);
    }
  }

  // Debounce the preview lookup so each keystroke past length-6 doesn't
  // hammer the backend (T-01-06-06). State clearing for length<6 happens
  // in the input onChange handler to avoid the React-19 set-state-in-
  // effect lint rule.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (code.length !== 6) return;
    debounceRef.current = setTimeout(() => {
      void fetchPreview(code);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Submit button disabled while preview pending or any field empty.
  const canSubmit =
    code.length === 6 &&
    !codeError &&
    memberName.trim().length > 0 &&
    color !== null &&
    !previewPending &&
    !submitting;

  async function onSubmit() {
    if (!canSubmit || !color) return;
    setSubmitting(true);
    setColorError(null);
    try {
      const res = await api<JoinResponse>("/api/households/join", {
        method: "POST",
        body: JSON.stringify({
          invite_code: code,
          member_name: memberName.trim(),
          color_hex: color,
        }),
      });
      // res fields available for forward compat but cookie is set by backend
      void res;
      await refresh();
      router.replace("/");
    } catch (err) {
      const status = statusOf(err);
      if (status === 404) {
        setCodeError(tErrors("code_not_found"));
      } else if (status === 409 || status === 422) {
        // Color taken (409) or palette mismatch (422) — refresh the
        // preview so the now-taken color shows as disabled.
        setColorError(tErrors("color_taken"));
        setColor(null);
        await fetchPreview(code);
      } else {
        toast.error(tErrors("network"));
      }
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col flex-1 bg-background">
      <header className="sticky top-0 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <Button
          size="icon"
          variant="ghost"
          aria-label={tCommon("back")}
          onClick={() => router.back()}
        >
          <ChevronLeft />
        </Button>
        <span className="text-base font-semibold">{t("title")}</span>
        <span className="w-8" aria-hidden />
      </header>

      <div className="flex flex-col gap-6 px-6 pt-6 pb-32">
        <div className="flex flex-col gap-2">
          <Label htmlFor="join-code">{t("code_label")}</Label>
          <Input
            id="join-code"
            value={code}
            onChange={(e) => {
              const next = e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6);
              setCode(next);
              // Clear preview-derived UI synchronously when the code
              // is no longer 6 chars; the debounced effect re-fetches
              // when the user types back to length 6.
              if (next.length !== 6) {
                setTakenColors([]);
                setCodeError(null);
              }
            }}
            placeholder={t("code_placeholder")}
            maxLength={6}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            required
            aria-invalid={codeError !== null}
            aria-describedby={codeError ? "join-code-error" : undefined}
            className="text-center font-mono tracking-[0.3em] uppercase"
          />
          {codeError ? (
            <p
              id="join-code-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {codeError}
            </p>
          ) : (
            <p className="text-sm text-foreground-muted">{t("code_helper")}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="join-member-name">{t("member_name_label")}</Label>
          <Input
            id="join-member-name"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            maxLength={60}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>
            <span className="flex items-center gap-2">
              {t("color_label")}
              {previewPending ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-foreground-muted"
                  aria-hidden
                />
              ) : null}
            </span>
          </Label>
          <ColorSwatchPicker
            value={color}
            onChange={(hex) => {
              setColor(hex);
              setColorError(null);
            }}
            takenColors={takenColors}
            aria-label={t("color_label")}
          />
          {colorError ? (
            <p role="alert" className="text-sm text-destructive">
              {colorError}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="fixed bottom-0 inset-x-0 px-6 pb-6 bg-background/80 backdrop-blur-sm"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <Button
          className="h-11 w-full"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" aria-hidden />
              {tCommon("saving")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </div>
    </section>
  );
}
