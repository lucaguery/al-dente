// Fetch wrapper for the cookie-auth era (Phase 01.1).
//
// Auth is now an HttpOnly same-origin cookie (aldente_auth) set by the backend
// on POST /households and POST /households/join. The browser attaches it
// automatically to any same-origin request when `credentials: "include"` is
// set on fetch. There is no token to read, store, or inject — JS literally
// cannot see the cookie (T-01-02-03 mitigated by HttpOnly).
//
// In production NEXT_PUBLIC_API_BASE is "" — calls use relative paths like
// `/api/households/me` which Vercel rewrites (see frontend/next.config.ts) to
// the Railway backend. For direct-to-backend local dev, set
// NEXT_PUBLIC_API_BASE=http://localhost:8000.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// Legacy localStorage keys from the Bearer era — wipe on 401 to prevent any
// stale data from confusing first-launch detection. Pure cleanup.
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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (
    init?.body &&
    !headers.has("Content-Type") &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    // Browser auto-attaches the aldente_auth cookie on same-origin requests.
    // "include" also works cross-origin (local dev → :8000) provided the
    // backend's CORS allow_credentials is True (set in 01.1-01-PLAN Task 2).
    credentials: "include",
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      // Best-effort cookie clear; proceed even if this fails.
      // In production (API_BASE=""), /api/auth/session rewrites to Railway's
      // DELETE /auth/session via next.config.ts rewrites (Plan 03).
      // In local dev (API_BASE="http://localhost:8000"), skip the /api/ prefix.
      const sessionPath =
        API_BASE === "" ? "/api/auth/session" : "/auth/session";
      void fetch(`${API_BASE}${sessionPath}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
      clearLegacyLocalStorage();
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
