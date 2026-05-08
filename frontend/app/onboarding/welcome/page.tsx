"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

// UI-SPEC §"Surface-by-Surface Pinning" §1 — Onboarding Welcome.
// Wordmark + tagline + Créer/Rejoindre CTAs. No back button (root).
// Phase 9 retheme: Fraunces italic display wordmark + 2 paper-grain CTA
// Cards mirroring the Phase 6 D-Voice callout pattern (3px terracotta-60
// left border, paper-grain texture, Fraunces italic CTA labels, h-12
// interior tap target). The Card wraps a Link — the Link IS the tap
// target so href-based navigation supersedes the previous router.push.
export default function OnboardingWelcomePage() {
  const tHome = useTranslations("home");
  const t = useTranslations("onboarding.welcome");

  return (
    <section className="flex flex-col flex-1 items-center justify-center px-6 py-16 bg-background">
      <header className="flex flex-col items-center gap-2 text-center">
        {/* Wordmark — Fraunces italic display register (mirrors Phase 7
            daily date header + Phase 8 recipe-detail hero). */}
        <h1 className="text-display">{tHome("title")}</h1>
        {/* Tagline — IBM Plex Sans body. */}
        <p className="text-base text-foreground-muted mt-2 text-center">
          {t("tagline")}
        </p>
      </header>

      <div className="flex-1" />

      {/* CTA Card pair — paper-grain Cards mirroring Phase 6 D-Voice
          callout pattern. Each Card surrounds a Link; the Link IS the
          tap target at h-12 interior. */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 p-4 transition-colors duration-fast ease-craft hover:bg-card/95">
          <Link
            href="/onboarding/create"
            className="flex items-center justify-between h-12"
          >
            <span className="font-display italic text-base">
              {t("create_cta")}
            </span>
            <ChevronRight className="text-primary" aria-hidden />
          </Link>
        </Card>
        <Card className="paper-grain shadow-card border-l-[3px] border-primary/60 p-4 transition-colors duration-fast ease-craft hover:bg-card/95">
          <Link
            href="/onboarding/join"
            className="flex items-center justify-between h-12"
          >
            <span className="font-display italic text-base">
              {t("join_cta")}
            </span>
            <ChevronRight className="text-primary" aria-hidden />
          </Link>
        </Card>
      </div>
    </section>
  );
}
