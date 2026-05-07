"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import { HomeDecide } from "@/components/HomeDecide";

// Detect "running inside an iOS Safari tab" (i.e. NOT the installed PWA).
// `navigator.standalone` is true when launched from the home-screen icon.
function isIosSafariNotInstalled(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const standalone = (navigator as Navigator & { standalone?: boolean })
    .standalone;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari && !standalone;
}

function noopSubscribe() {
  return () => {};
}

// Phase 3 — D-01: the Home tab IS today's shortlist. The Phase-1 hero +
// dual-CTA section (browse / add-recipe) is removed. The Decide layer
// (deck → summary → cooking banner → empty state) is orchestrated by
// <HomeDecide />; this component now only handles the PWA-specific iOS
// install hint and the auth guard.
export default function Home() {
  const t = useTranslations();
  const showInstallHint = useSyncExternalStore(
    noopSubscribe,
    isIosSafariNotInstalled,
    () => false,
  );

  return (
    <OnboardingGuard>
      <main className="flex flex-col flex-1">
        {/* iOS install hint — per-device PWA UX, not part of Decide content. */}
        {showInstallHint ? (
          <Card className="mx-6 mt-4 bg-card border-border shadow-card p-4 gap-2">
            <h2 className="text-sm font-medium leading-5">
              {t("install.title")}
            </h2>
            <p className="text-sm text-foreground-muted leading-5">
              {t("install.body")}
            </p>
          </Card>
        ) : null}

        {/* Decide layer (Phase 3) — replaces the former hero + CTA section. */}
        <HomeDecide />
      </main>
    </OnboardingGuard>
  );
}
