"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
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
      <section className="flex flex-col flex-1 px-6 py-6 gap-6">
        {/* Brand-tinted hero card. Builds gravity for the wordmark + tagline
            without introducing a second hue: rose-50 surface + a single
            decorative blur blob (aria-hidden) tinted with brand at 10% alpha. */}
        <div className="relative overflow-hidden rounded-3xl bg-surface-rose-50 px-6 py-10 -mx-2">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          />
          <header className="relative flex flex-col items-center gap-3 text-center">
            <h1 className="text-display">{t("home.title")}</h1>
            <p className="text-base text-foreground-muted max-w-xs">
              {t("home.tagline")}
            </p>
          </header>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-title text-foreground">
            {t("home.hero_question")}
          </h2>
        </div>

        <div className="flex flex-col gap-3 max-w-sm w-full mx-auto">
          <Link
            href="/recipes"
            className="flex items-center justify-center h-[3.25rem] rounded-2xl bg-primary text-primary-foreground font-medium tracking-tight shadow-card active:translate-y-px active:opacity-90 transition-[transform,opacity] duration-100"
          >
            {t("home.cta_browse")}
          </Link>
          <Link
            href="/recipes/new"
            className="flex items-center justify-center h-[3.25rem] rounded-2xl border border-border bg-card text-foreground font-medium tracking-tight active:translate-y-px active:bg-surface-muted transition-[transform,background-color] duration-100"
          >
            {t("home.cta_add")}
          </Link>
        </div>

        {showInstallHint ? (
          <Card className="w-full max-w-sm bg-card border-border shadow-card p-4 gap-2 mx-auto">
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
