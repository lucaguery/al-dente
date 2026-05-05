"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// UI-SPEC §"Surface-by-Surface Pinning" §1 — Onboarding Welcome.
// Wordmark + tagline + Créer/Rejoindre CTAs. No back button (root).
export default function OnboardingWelcomePage() {
  const router = useRouter();
  const tHome = useTranslations("home");
  const t = useTranslations("onboarding.welcome");

  return (
    <section className="flex flex-col flex-1 items-center justify-center px-6 py-16 bg-background">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight">
          {tHome("title")}
        </h1>
        <p className="text-base text-foreground-muted mt-2 text-center">
          {t("tagline")}
        </p>
      </header>

      <div className="flex-1" />

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          variant="default"
          className="h-11 w-full"
          onClick={() => router.push("/onboarding/create")}
        >
          {t("create_cta")}
        </Button>
        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={() => router.push("/onboarding/join")}
        >
          {t("join_cta")}
        </Button>
      </div>
    </section>
  );
}
