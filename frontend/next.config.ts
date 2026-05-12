import type { NextConfig } from "next";
import path from "node:path";
import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

// next-pwa@5 (the original) is webpack-only and silently no-ops under
// Next.js 16's default Turbopack build. We use the maintained fork
// `@ducanh2912/next-pwa` which is API-compatible AND supports Next 16.
// Documented as a Rule 3 deviation in 01-02-SUMMARY.md.
const withPWA = withPWAInit({
  dest: "public",
  // Disable in dev so HMR + service-worker don't fight each other.
  disable: process.env.NODE_ENV === "development",
  // Default workbox runtime caching: precache the app shell + NetworkFirst
  // for everything else (including /api/*). Per CONTEXT.md: "Service worker
  // cache: next-pwa defaults only in W1." Do NOT tune further here — Phase 4
  // owns cache strategy tuning.
  register: true,
  // Activate new SW immediately on next navigation rather than waiting for
  // all tabs to close — without this, standalone PWA mode on iOS never
  // picks up updates until Safari is manually cleared.
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
  // Phase 3 (PWA-03): bundle the custom worker that handles `push` and
  // `notificationclick` events. The main sw.js auto-imports it via
  // importScripts. Source dir is frontend/worker (TypeScript is fine).
  customWorkerSrc: "worker",
  customWorkerDest: "public",
});

const withNextIntl = createNextIntlPlugin("./i18n.ts");

// D-01: RAILWAY_URL is a server-only env var (no NEXT_PUBLIC_ prefix) so it
// never ships in the browser bundle. It is used solely to configure the
// rewrites() proxy at build/request time. Threat T-01.1-03-01 mitigated.
const RAILWAY_URL = process.env.RAILWAY_URL;
if (!RAILWAY_URL) {
  if (process.env.VERCEL) {
    // T-01.1-03-03: Fail fast on Vercel — without RAILWAY_URL the rewrites
    // silently 404 and cookie auth breaks. Set in Vercel Project Settings.
    throw new Error(
      "RAILWAY_URL env var is required in Vercel Project Settings.",
    );
  }
  // Local builds: proxy to localhost backend. Set RAILWAY_URL in .env.local
  // to target a real Railway instance for end-to-end cookie testing.
  console.warn("RAILWAY_URL not set — rewrites will proxy to http://localhost:8000");
}
const RAILWAY_BASE = (RAILWAY_URL ?? "http://localhost:8000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack stops inferring the wrong package
  // root (a stray /Users/gulu3001/package-lock.json triggers a warning).
  turbopack: {
    root: path.resolve("."),
  },
  async rewrites() {
    // Use beforeFiles so these rewrites are evaluated BEFORE Next.js checks
    // the filesystem (including app/api Route Handlers). This guarantees that
    // any Route Handler at app/api/* is never reached — Railway owns /api/*.
    // See: next.config.ts rewrites docs, App Router order step 4 vs step 5.
    return {
      beforeFiles: [
        // D-01: HTTP API calls. Browser sees /api/* (same-origin Vercel),
        // request goes to Railway. Set-Cookie from Railway lands on the Vercel
        // origin → cookie persists across iOS PWA restarts (ITP safe).
        // T-01.1-03-02 mitigated: destination is a fixed template, no
        // user-controlled redirect target.
        {
          source: "/api/:path*",
          destination: `${RAILWAY_BASE}/:path*`,
        },
        // D-01: WebSocket upgrade. Next.js rewrites forward Upgrade headers.
        // Frontend constructs `${location.origin.replace('https','wss')}/ws`
        // → Vercel proxies the upgrade to Railway. Cookies travel on the
        // upgrade request via document cookie (same-origin).
        {
          source: "/ws",
          destination: `${RAILWAY_BASE}/ws`,
        },
      ],
    };
  },
  // QW-02 (gh#15) — build-time env re-export so the VersionFooter can read
  // the app version, short git SHA, and Vercel environment at runtime
  // without a server call. Vercel auto-injects VERCEL_GIT_COMMIT_SHA and
  // VERCEL_ENV at build time; npm_package_version is always available.
  // Slice SHA to 7 chars (matches `git rev-parse --short`). Local dev
  // (no Vercel env) falls back to "dev" / "development".
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.0.0",
    NEXT_PUBLIC_GIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "development",
  },
};

// Compose plugins: next-intl wraps the config first, then next-pwa.
export default withPWA(withNextIntl(nextConfig));
