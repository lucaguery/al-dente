"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { Card } from "@/components/ui/card";

// UI-SPEC §"Surface-by-Surface Pinning" §1 — Onboarding Welcome.
// Wordmark + tagline + Créer/Rejoindre CTAs. No back button (root).
// Phase 9 retheme + ADR-0004 wave 3: Geist 500 wordmark + 2 hairline CTA
// Cards mirroring the Phase 6 D-Voice callout pattern (3px terracotta-60
// left border, no texture, sans CTA labels, h-12 interior tap target).
// The Card wraps a Link — the Link IS the tap target so href-based
// navigation supersedes the previous router.push.
export default function OnboardingWelcomePage() {
  const tHome = useTranslations("home");
  const t = useTranslations("onboarding.welcome");

  return (
    <section className="flex flex-col flex-1 items-center justify-center px-(--spacing-page-x) py-16 bg-background">
      <header className="flex flex-col items-center gap-2 text-center">
        <BrandIcon
          size={72}
          aria-label="al dente"
          className="text-primary mb-2"
        />
        <h1 className="text-display">{tHome("title")}</h1>
        <p className="text-base text-muted-foreground mt-2 text-center">
          {t("tagline")}
        </p>
      </header>

      <div className="flex-1" />

      {/* CTA Card pair — hairline Cards (ADR-0004 wave 3) mirroring the
          Phase 6 D-Voice callout pattern. Each Card surrounds a Link; the
          Link IS the tap target at h-12 interior. */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Card
          className="border-l-[3px] border-primary/60 p-4 transition-colors hover:bg-card/95"
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease)",
          }}
        >
          <Link
            href="/onboarding/create"
            className="flex items-center justify-between h-12"
          >
            <span className="text-base font-medium">
              {t("create_cta")}
            </span>
            <ChevronRight className="text-primary" aria-hidden />
          </Link>
        </Card>
        <Card
          className="border-l-[3px] border-primary/60 p-4 transition-colors hover:bg-card/95"
          style={{
            transitionDuration: "var(--duration-fast)",
            transitionTimingFunction: "var(--ease)",
          }}
        >
          <Link
            href="/onboarding/join"
            className="flex items-center justify-between h-12"
          >
            <span className="text-base font-medium">
              {t("join_cta")}
            </span>
            <ChevronRight className="text-primary" aria-hidden />
          </Link>
        </Card>
      </div>
    </section>
  );
}
