"use client";

// Onboarding welcome — La Grille wordmark-centric composition (Phase 40 ONBO-01).
// Sketch lines 2060-2076: BrandIcon + wordmark + italic-emphasis tagline +
// sub-tagline + primary filled-dark CTA + ghost hairline CTA + footer line.
// No Cards — ADR-0004 surface-temperature + hairline discipline.

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandIcon } from "@/components/BrandIcon";
import { Button } from "@/components/ui/button";

export default function OnboardingWelcomePage() {
  const t = useTranslations("onboarding.welcome");

  return (
    <section className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-12 bg-background text-center">
      <BrandIcon
        size={72}
        aria-label="al dente"
        className="text-primary"
      />

      {/* Wordmark — accent dot in terracotta is the La Grille signature. */}
      <h1 className="text-4xl font-medium tracking-tight">
        Al Dente<span className="text-primary">.</span>
      </h1>

      {/* Tagline — single italic emphasis on `ce soir`. */}
      <p className="text-lg text-muted-foreground">
        {t("tagline_lead")}
        <em className="italic font-medium text-foreground">
          {t("tagline_emphasis")}
        </em>
        {t("tagline_tail")}
      </p>

      <p className="text-base text-muted-foreground max-w-[32ch]">
        {t("sub_tagline")}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
        <Button asChild variant="default" size="lg" className="w-full">
          <Link href="/onboarding/create">{t("primary_cta")}</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/onboarding/join">{t("ghost_cta")}</Link>
        </Button>
      </div>

      <p className="text-caption text-muted-foreground mt-12">
        {t("footer")}
      </p>
    </section>
  );
}
