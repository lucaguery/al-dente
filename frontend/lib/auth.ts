// Auth helpers — cookie-auth era (Phase 01.1).
//
// `auth_token` is now an HttpOnly `aldente_auth` cookie managed entirely by
// the backend. JS cannot read it. The localStorage-based functions below are
// reduced to no-op stubs so existing call sites (onboarding/create/page.tsx,
// onboarding/join/page.tsx) continue to compile until Plan 05 removes them.
//
// AUTH_TOKEN_CHANGED_EVENT is preserved: RealtimeProvider still dispatches on
// this event as a same-tab trigger. Plan 05 will refactor RealtimeProvider to
// derive identity from GET /households/me instead of getAuthToken().

// Same-tab notification: kept for RealtimeProvider compatibility.
// Plan 05 will replace the RealtimeProvider's use of getAuthToken() with a
// SessionProvider that calls GET /households/me.
export const AUTH_TOKEN_CHANGED_EVENT = "aldente:auth-token-changed";

/**
 * Wipe any legacy localStorage keys left over from the Bearer era.
 * Called by lib/api.ts on 401 and by Plan 05's onboarding pages after
 * the cookie is set server-side.
 */
export function clearLocalStorageRemnants(): void {
  if (typeof window === "undefined") return;
  const LEGACY_KEYS = ["auth_token", "household_id", "member_id"] as const;
  for (const k of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // localStorage can throw in private-mode Safari; ignore.
    }
  }
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

// ---------------------------------------------------------------------------
// Deprecated stubs — kept for compile-time compatibility with call sites in
// onboarding/create/page.tsx and onboarding/join/page.tsx.
// Plan 05 will remove these call sites and delete these functions.
// ---------------------------------------------------------------------------

/** @deprecated Cookie auth — token no longer stored in localStorage. No-op. */
export function saveAuthToken(
  _token: string,
  _householdId: string,
  _memberId: string,
): void {
  // No-op: the aldente_auth cookie is set by the backend Set-Cookie header.
  // Dispatch the event so RealtimeProvider's tryConnect() runs after
  // onboarding (pre-Plan-05 compatibility only).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
  }
}

/** @deprecated Cookie auth — token no longer stored in localStorage. No-op. */
export function clearAuth(): void {
  // No-op: cookie deletion is handled server-side via DELETE /api/auth/session.
  // Use clearLocalStorageRemnants() to wipe any stale Bearer-era keys.
}

/** @deprecated Cookie auth — always returns null. Use GET /households/me. */
export function getAuthToken(): string | null {
  // Returns null so RealtimeProvider's tryConnect() skips the WS open.
  // Plan 05 replaces this with a SessionProvider that calls /households/me.
  return null;
}

/** @deprecated Use cookie presence check (GET /households/me) instead. */
export function hasOnboarded(): boolean {
  // Always returns false; onboarding guard is replaced by SessionProvider
  // in Plan 05 which performs a server-side cookie check.
  return false;
}
