"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { api } from "@/lib/api";
import { useSession } from "@/components/SessionProvider";

// UI-SPEC §"Surface-by-Surface Pinning" §2 — Onboarding Create.
// Sticky header (ChevronLeft + title) + 3 fields (household name, member
// name, color) + sticky bottom CTA. No live JS validation per UI-SPEC
// §"Interaction Patterns > Forms" — server validates on submit.
// Phase 9 retheme: form-body wrapped in paper-grain Card with Fraunces
// italic display title; back button bumped to h-12 w-12 + spacer to w-12;
// submit bumped to the h-12 D-08 floor. Form state, validation,
// handlers, and error toasts preserved verbatim.
type CreateResponse = {
  household_id: string;
  member_id: string;
  auth_token: string;
  invite_code: string;
};

export default function OnboardingCreatePage() {
  const router = useRouter();
  const { refresh } = useSession();
  const t = useTranslations("onboarding.create");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("onboarding.errors");

  const [householdName, setHouseholdName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    householdName.trim().length > 0 &&
    memberName.trim().length > 0 &&
    color !== null &&
    !submitting;

  async function onSubmit() {
    if (!canSubmit || !color) return;
    setSubmitting(true);
    try {
      const res = await api<CreateResponse>("/api/households", {
        method: "POST",
        body: JSON.stringify({
          household_name: householdName.trim(),
          member_name: memberName.trim(),
          color_hex: color,
        }),
      });
      await refresh();
      router.replace(
        `/onboarding/share-code?code=${encodeURIComponent(res.invite_code)}`,
      );
    } catch {
      // 5xx / network → toast (UI-SPEC §"Toast vs inline rules"). 422
      // surfaces here too; the only fields the UI controls are name+color
      // (color is constrained by the picker), so a 422 is exceptional.
      toast.error(tErrors("network"));
      setSubmitting(false);
    }
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
        <span className="text-base font-semibold">{t("title")}</span>
        <span className="w-12" aria-hidden />
      </header>

      <div className="px-(--spacing-page-x) pt-6 pb-32">
        <Card className="paper-grain shadow-card px-6 py-6 flex flex-col gap-6">
          {/* Form-body editorial title — Fraunces italic display register.
              Mirrors header chrome label one level deeper inside the form. */}
          <h2 className="text-display">{t("title")}</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-household-name">
              {t("household_name_label")}
            </Label>
            <Input
              id="create-household-name"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder={t("household_name_placeholder")}
              maxLength={60}
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-member-name">{t("member_name_label")}</Label>
            <Input
              id="create-member-name"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              maxLength={60}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("color_label")}</Label>
            <ColorSwatchPicker
              value={color}
              onChange={setColor}
              aria-label={t("color_label")}
            />
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
