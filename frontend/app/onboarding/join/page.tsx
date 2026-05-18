"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { BrandLoader } from "@/components/BrandLoader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
// Phase 9 retheme: form-body wrapped in paper-grain Card with Fraunces
// italic display title; back button bumped to h-12 w-12 + spacer to w-12;
// submit bumped to the h-12 D-08 floor. The invite-code Input keeps its
// mono uppercase wide-tracked register — that is the ENTRY-time UX
// (typing the code) and is INTENTIONALLY DIFFERENT from the read-time
// Fraunces italic register on share-code + Settings. Form state,
// debounce, validation, fetchPreview, and error handling preserved
// verbatim.
type PreviewResponse = {
  household_name: string;
  taken_colors: string[];
};

// Note: JoinResponse type was removed when onSubmit() switched from api() to
// raw fetch() (Plan 18-03 / IDM-04). The success path no longer reads the
// body — the backend sets the aldente_auth cookie + we rely on refresh().

// Use a tiny custom error so we can branch on HTTP status (api() throws a
// generic Error("<status> <statusText>") on non-2xx). Still used by
// fetchPreview's catch block below.
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
  // IDM-04 / D-18-12: terminal state when POST /api/households/join returns
  // 422 with detail.code === "HOUSEHOLD_FULL". Replaces the form with a
  // single Card + back CTA — instead of leaving the user staring at a
  // silently-disabled submit button (ASSESSMENT B-6 / Issue #7).
  const [householdFull, setHouseholdFull] = useState(false);
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
      // api() throws a generic Error("<status> <statusText>") and drops
      // the response body — so we use raw fetch() here to read the
      // structured 422 body (detail.code === "HOUSEHOLD_FULL") that
      // discriminates capacity-denial from the legacy palette-validation
      // 422. Same-origin via the Next.js rewrites (CLAUDE.md invariant #8),
      // credentials:'include' so the aldente_auth cookie is sent.
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
      const res = await fetch(`${API_BASE}/api/households/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: code,
          member_name: memberName.trim(),
          color_hex: color,
        }),
      });
      if (res.ok) {
        await refresh();
        router.replace("/");
        return;
      }
      // Non-OK: parse body to discriminate 422 HOUSEHOLD_FULL vs plain
      // 422 (legacy Pydantic palette validation) vs 409 vs 404.
      let parsed: { detail?: unknown } = {};
      try {
        parsed = (await res.json()) as { detail?: unknown };
      } catch {
        // Body wasn't JSON — fall through to network toast below.
      }
      if (res.status === 404) {
        setCodeError(tErrors("code_not_found"));
      } else if (
        res.status === 422 &&
        parsed.detail &&
        typeof parsed.detail === "object" &&
        (parsed.detail as { code?: unknown }).code === "HOUSEHOLD_FULL"
      ) {
        // IDM-04 / D-18-12: structured capacity error → terminal Card.
        setHouseholdFull(true);
      } else if (res.status === 409 || res.status === 422) {
        // Color taken (409) or palette mismatch (plain 422 — legacy
        // Pydantic validation) — refresh the preview so the now-taken
        // color shows as disabled.
        setColorError(tErrors("color_taken"));
        setColor(null);
        await fetchPreview(code);
      } else {
        toast.error(tErrors("network"));
      }
    } catch {
      // Network error (offline, DNS, etc.).
      toast.error(tErrors("network"));
    } finally {
      setSubmitting(false);
    }
  }

  if (householdFull) {
    // IDM-04 / D-18-12: terminal Card — same paper-grain shape as the
    // form below so the surface feels like a state of the same screen,
    // not a new route. Fraunces italic title = the onboarding identity
    // signature; no second CTA (D-18-12 says single neutral back).
    return (
      <section className="flex flex-col flex-1 bg-background">
        <header className="sticky top-0 h-12 px-(--spacing-page-x) flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-10">
          <Button
            size="icon"
            variant="ghost"
            className="h-12 w-12"
            aria-label={tCommon("back")}
            onClick={() => router.back()}
          >
            <ChevronLeft />
          </Button>
          <span className="text-page-header">{t("title")}</span>
          <span className="w-12" aria-hidden />
        </header>
        <div className="px-(--spacing-page-x) pt-6 pb-32">
          <Card className="paper-grain shadow-card px-6 py-6 flex flex-col gap-4">
            <h2 className="text-display">{t("capacity.title")}</h2>
            <p className="text-base text-foreground-muted">
              {t("capacity.body")}
            </p>
          </Card>
        </div>
        <div
          className="fixed bottom-0 inset-x-0 px-(--spacing-page-x) pb-6 bg-background/80 backdrop-blur-sm"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
        >
          <Button
            className="h-12 w-full"
            variant="outline"
            onClick={() => router.back()}
          >
            {t("capacity.back_cta")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col flex-1 bg-background">
      <header className="sticky top-0 h-12 px-(--spacing-page-x) flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <Button
          size="icon"
          variant="ghost"
          className="h-12 w-12"
          aria-label={tCommon("back")}
          onClick={() => router.back()}
        >
          <ChevronLeft />
        </Button>
        <span className="text-page-header">{t("title")}</span>
        <span className="w-12" aria-hidden />
      </header>

      <div className="px-(--spacing-page-x) pt-6 pb-32">
        <Card className="paper-grain shadow-card px-6 py-6 flex flex-col gap-6">
          {/* Form-body editorial title — Fraunces italic display register. */}
          <h2 className="text-display">{t("title")}</h2>
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
              className="text-center tabular-nums tracking-[0.3em] uppercase"
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
              <p className="text-sm text-foreground-muted">
                {t("code_helper")}
              </p>
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
                  <BrandLoader size="sm" aria-label="Chargement" className="text-foreground-muted" />
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
        </Card>
      </div>

      <div
        className="fixed bottom-0 inset-x-0 px-(--spacing-page-x) pb-6 bg-background/80 backdrop-blur-sm"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <Button
          className="h-12 w-full"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {submitting ? (
            <>
              <BrandLoader size="sm" className="mr-2" />
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
