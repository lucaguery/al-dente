"use client";

// QW-02 (gh#15) — per-device build-stamp footer at the bottom of /settings.
// Reads three NEXT_PUBLIC_ env vars injected at build time via
// frontend/next.config.ts `env` block. Pure render — no state, no effects.
// Branch-free per D-08: defaults flow from next.config.ts re-export, so a
// missing Vercel env falls back to `v0.x.y · dev · development`.
//
// Format string: `v{APP_VERSION} · {GIT_SHA} · {VERCEL_ENV}` — middle dot
// U+00B7 (not em-dash, not pipe, not slash). Always renders the env label
// per D-07 for maximum diagnostic clarity across both phones.
//
// Plain text SHA per D-09 — no <a href> to GitHub to avoid coupling to the
// lucaguery/al-dente repo URL (productize-later debt).

export function VersionFooter() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const sha = process.env.NEXT_PUBLIC_GIT_SHA ?? "dev";
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development";
  return (
    <p
      className="text-xs text-foreground-muted text-center pt-2"
      aria-label="Version de l'application"
    >
      v{version} · {sha} · {env}
    </p>
  );
}
