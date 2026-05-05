// Onboarding auth-token storage helpers (SPEC.md §"Onboarding").
//
// Persists `auth_token` (issued by `POST /households` or
// `POST /households/join` per 01-04) plus contextual `household_id` /
// `member_id` in `localStorage` so subsequent app launches can skip
// onboarding and `lib/api.ts` can attach the `Authorization: Bearer ...`
// header to every fetch.
//
// `// TODO(productize)`: localStorage XSS exposes auth_token (T-01-06-02
// in plan threat register; mirrors T-01-02-03). v0.1 audience is single-
// tenant household, no third-party scripts. Hardening (httpOnly cookie +
// CSRF) lands when Supabase Auth replaces the invite-code flow
// (V2-AUTH-01).

const AUTH_KEY = "auth_token";
const HOUSEHOLD_KEY = "household_id";
const MEMBER_KEY = "member_id";

// Same-tab notification: the storage event only fires across tabs, but
// onboarding writes the token and immediately router.replace("/") in the
// same tab. RealtimeProvider listens for this so it can open the WS as
// soon as the token lands instead of waiting for the next page load.
export const AUTH_TOKEN_CHANGED_EVENT = "aldente:auth-token-changed";

export function saveAuthToken(
  token: string,
  householdId: string,
  memberId: string,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, token);
  window.localStorage.setItem(HOUSEHOLD_KEY, householdId);
  window.localStorage.setItem(MEMBER_KEY, memberId);
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(HOUSEHOLD_KEY);
  window.localStorage.removeItem(MEMBER_KEY);
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_KEY);
}

export function hasOnboarded(): boolean {
  return getAuthToken() !== null;
}
