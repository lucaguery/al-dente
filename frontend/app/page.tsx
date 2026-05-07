"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { OnboardingGuard } from "@/lib/onboarding-guard";

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

export default function Home() {
  const t = useTranslations();
  const showInstallHint = useSyncExternalStore(
    noopSubscribe,
    isIosSafariNotInstalled,
    () => false,
  );

  return (
    <OnboardingGuard>
      <div className="flex flex-col flex-1">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        {/* Full-bleed gradient: warm rose at top melting into page background.
            No rounded card — the gradient IS the hero surface.             */}
        <div className="relative flex flex-col items-center justify-center gap-5 px-6 pt-14 pb-12 text-center overflow-hidden bg-gradient-to-b from-surface-rose-100 to-background">
          {/* Subtle radial glow anchored behind the emoji */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-72 h-72 rounded-full bg-primary/10 blur-3xl"
          />

          {/* Visual anchor — large emoji sets the warm food tone */}
          <span
            className="relative z-10 text-[4.5rem] leading-none select-none"
            role="img"
            aria-label="spaghetti"
          >
            🍝
          </span>

          {/* Wordmark + tagline */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <h1 className="text-display text-foreground">{t("home.title")}</h1>
            <p className="text-body text-foreground-muted max-w-[20rem]">
              {t("home.tagline")}
            </p>
          </div>
        </div>

        {/* ── CTA section ───────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-6 px-6 pt-8 pb-8 w-full max-w-sm mx-auto">
          <h2 className="text-title text-foreground text-center">
            {t("home.hero_question")}
          </h2>

          <div className="flex flex-col gap-3 w-full">
            <Link
              href="/recipes"
              className="flex items-center justify-center h-14 rounded-2xl bg-primary text-primary-foreground font-semibold tracking-tight shadow-card active:translate-y-px active:opacity-90 transition-[transform,opacity] duration-100"
            >
              {t("home.cta_browse")}
            </Link>
            <Link
              href="/recipes/new"
              className="flex items-center justify-center h-14 rounded-2xl border border-border bg-card text-foreground font-medium tracking-tight active:translate-y-px active:bg-muted transition-[transform,background-color] duration-100"
            >
              {t("home.cta_add")}
            </Link>
          </div>

          {showInstallHint ? (
            <Card className="w-full bg-card border-border shadow-card p-4 gap-2">
              <h2 className="text-sm font-medium leading-5">
                {t("install.title")}
              </h2>
              <p className="text-sm text-foreground-muted leading-5">
                {t("install.body")}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </OnboardingGuard>
  );
}
