"use client";

// Phase 01.1 cookie-auth: this module no longer manages auth tokens.
// Identity comes from <SessionProvider>; HttpOnly cookies handle the secret.
//
// Two surface-area exports remain:
// - SESSION_CHANGED_EVENT: re-exported for callers that need the literal
//   string. Defined in SessionProvider.tsx; this file re-exports for
//   import-stability with existing call sites.
// - clearLegacyLocalStorage: one-shot cleanup of pre-cookie localStorage
//   keys; called by lib/api.ts on 401 and by the WS 1008 handler.

export { SESSION_CHANGED_EVENT } from "@/components/SessionProvider";

const LEGACY_KEYS = ["auth_token", "household_id", "member_id"] as const;

export function clearLegacyLocalStorage(): void {
  if (typeof window === "undefined") return;
  for (const k of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // localStorage can throw in private-mode Safari; ignore.
    }
  }
}

// Backward compat: AUTH_TOKEN_CHANGED_EVENT alias (deprecated, prefer
// SESSION_CHANGED_EVENT). One-release window before removal.
export { SESSION_CHANGED_EVENT as AUTH_TOKEN_CHANGED_EVENT } from "@/components/SessionProvider";
