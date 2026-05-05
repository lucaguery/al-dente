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
});

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack stops inferring the wrong package
  // root (a stray /Users/gulu3001/package-lock.json triggers a warning).
  turbopack: {
    root: path.resolve("."),
  },
};

// Compose plugins: next-intl wraps the config first, then next-pwa.
export default withPWA(withNextIntl(nextConfig));
