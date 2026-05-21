// Phase 40 SPLA-01 — Root App Router loading state.
// La Grille splash composition per sketch lines 1989-2013:
//   BrandIcon 128px → "Al Dente." wordmark → tagline → 3-dot loader → version footer.
// Renders during navigation transitions only (NOT first-load; iOS PWA cold-launch
// shows blank-then-app per D-09 — SPLA-02 boot-image asset matrix is deferred).
// No animation beyond the loader's bounce.

import { getTranslations } from "next-intl/server";
import { BrandIcon } from "@/components/BrandIcon";

export default async function Loading() {
  const t = await getTranslations("splash");
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <BrandIcon size={128} className="text-primary" aria-label="al dente" />

      {/* Wordmark — accent dot stays in terracotta. */}
      <h1 className="text-3xl font-medium tracking-tight">
        Al Dente<span className="text-primary">.</span>
      </h1>

      {/* Tagline — no italic emphasis on the splash per sketch. */}
      <p className="text-base text-muted-foreground">{t("tagline")}</p>

      {/* 3-dot Geist Mono loader — the single animated element. */}
      <div
        className="flex items-center gap-1 mt-2"
        aria-live="polite"
        aria-label="loading"
      >
        <span
          className="font-mono text-muted-foreground animate-bounce"
          style={{ animationDelay: "0ms" }}
        >
          .
        </span>
        <span
          className="font-mono text-muted-foreground animate-bounce"
          style={{ animationDelay: "100ms" }}
        >
          .
        </span>
        <span
          className="font-mono text-muted-foreground animate-bounce"
          style={{ animationDelay: "200ms" }}
        >
          .
        </span>
      </div>

      {/* Version footer — Geist Mono in faint ink. */}
      <p className="text-caption font-mono text-foreground/40 mt-12">
        v{version} · {year}
      </p>
    </div>
  );
}
