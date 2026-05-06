"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { OnboardingGuard } from "@/lib/onboarding-guard";

// Detect "running inside an iOS Safari tab" (i.e. NOT the installed PWA).
// `navigator.standalone` is true when launched from the home-screen icon;
// undefined elsewhere (Chrome, desktop, Android). UI-SPEC §12 — install
// hint shown only when (a) iOS Safari, (b) not yet installed.
function isIosSafariNotInstalled(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua);
  // `standalone` is iOS-only; non-Safari browsers won't expose true.
  const standalone = (navigator as Navigator & { standalone?: boolean })
    .standalone;
  // Treat as Safari if it advertises "Safari" and not Chrome/CriOS/FxiOS.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari && !standalone;
}

// useSyncExternalStore avoids the lint warning about setState-in-effect
// while still rendering `false` on the server (matching SSR HTML) and the
// real value on the client after hydration.
function noopSubscribe() {
  // The detection inputs (UA, navigator.standalone) don't change while the
  // page is open, so no real subscription is needed. Returning a noop
  // unsubscribe is fine.
  return () => {};
}

// Phase-1 home placeholder — UI-SPEC §12 install hint + wordmark + tagline.
// The real W3 home content lands when the shortlist surfaces are built.
// Wrapped in <OnboardingGuard> so first-launch users (no auth_token) get
// redirected to /onboarding/welcome (ONBOARD-06).
export default function Home() {
  const t = useTranslations();
  const showInstallHint = useSyncExternalStore(
    noopSubscribe,
    isIosSafariNotInstalled,
    () => false,
  );

  return (
    <OnboardingGuard>
      <section className="flex flex-col flex-1 items-center px-6 py-12 gap-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[28px] font-semibold tracking-tight">
            {t("home.title")}
          </h1>
          <p className="text-base text-foreground-muted max-w-xs">
            {t("home.tagline")}
          </p>
        </header>

        {showInstallHint ? (
          <Card className="w-full max-w-sm bg-surface-muted border-border p-4 gap-2">
            <h2 className="text-sm font-medium leading-5">
              {t("install.title")}
            </h2>
            <p className="text-sm text-foreground-muted leading-5">
              {t("install.body")}
            </p>
          </Card>
        ) : null}
      </section>
    </OnboardingGuard>
  );
}
