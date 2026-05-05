import { getRequestConfig } from "next-intl/server";

// French-only in v0.1 per CLAUDE.md invariant 6 + CONTEXT.md.
// All visible strings in `frontend/lib/i18n/fr.json`.
// Locked locale; no detection logic.
export default getRequestConfig(async () => {
  const messages = (await import("./lib/i18n/fr.json")).default;
  return {
    locale: "fr",
    messages,
    // Pin Europe/Paris so server- and client-rendered relative times agree
    // and `next-intl` doesn't warn about ENVIRONMENT_FALLBACK during build.
    // Both household phones live in France in v0.1; revisit if the household
    // ever travels (productize-later).
    timeZone: "Europe/Paris",
    // `now` is sourced per request so SSR and CSR render the same instant
    // for relative-time formatting.
    now: new Date(),
  };
});
