// Fetch wrapper that attaches the bearer token from localStorage and
// redirects to the onboarding welcome screen on 401 (per UI-SPEC §"Toast
// vs inline rules" — "API 401: Full-page redirect (no toast)").
//
// Auth token format and storage are pinned in SPEC.md §Onboarding +
// CONTEXT.md "Auth-token format". Stored in `localStorage` under the key
// `auth_token`.
//
// `// TODO(productize)`: localStorage XSS exposes auth_token (T-01-02-03
// in plan threat register). v0.1 audience is single-tenant household,
// no third-party scripts. Hardening (httpOnly cookie + CSRF) lands when
// Supabase Auth replaces invite-code (V2-AUTH-01).

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const AUTH_TOKEN_KEY = "auth_token";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(AUTH_TOKEN_KEY)
      : null;

  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    init?.body &&
    !headers.has("Content-Type") &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = "/onboarding/welcome";
    }
    throw new Error("unauthorized");
  }

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  if (res.headers.get("content-type")?.includes("application/json")) {
    return (await res.json()) as T;
  }
  return undefined as T;
}

export const __AUTH_TOKEN_KEY = AUTH_TOKEN_KEY;
