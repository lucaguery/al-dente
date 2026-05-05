import { getRequestConfig } from "next-intl/server";

// French-only in v0.1 per CLAUDE.md invariant 6 + CONTEXT.md.
// All visible strings in `frontend/lib/i18n/fr.json`.
// Locked locale; no detection logic.
export default getRequestConfig(async () => {
  const messages = (await import("./lib/i18n/fr.json")).default;
  return {
    locale: "fr",
    messages,
  };
});
