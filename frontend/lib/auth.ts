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

export function saveAuthToken(
  token: string,
  householdId: string,
  memberId: string,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, token);
  window.localStorage.setItem(HOUSEHOLD_KEY, householdId);
  window.localStorage.setItem(MEMBER_KEY, memberId);
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(HOUSEHOLD_KEY);
  window.localStorage.removeItem(MEMBER_KEY);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_KEY);
}

export function hasOnboarded(): boolean {
  return getAuthToken() !== null;
}
