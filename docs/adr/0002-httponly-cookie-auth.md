---
status: accepted
last_verified: 2026-05-19
superseded_by: null
audience: developer
---

# HttpOnly cookie auth (supersedes SPEC.md § Onboarding)

Authentication moves from `Authorization: Bearer <token>` with the opaque `auth_token` stored in `localStorage` (the v0.1 SPEC.md scheme) to a same-origin `aldente_auth` HttpOnly cookie set by the backend on `POST /households` and `POST /households/join`. API calls in production are same-origin via Next.js rewrites in `frontend/proxy.ts`; in cross-origin local dev, CORS in `backend/app/main.py` allows credentials. The invite-code flow itself (Create / Join via 6-char code) is unchanged; only token storage + transmission shifts.

## Why

1. **iOS Safari evicts `localStorage` on PWA force-quit.** Bearer tokens stored client-side were silently lost when either partner force-quit the home-screen app, forcing a re-invite. This violated the v0.1 dogfood gate (both members using daily for ≥ 2 weeks).
2. **HttpOnly cookies survive PWA lifecycle.** Same-origin cookies persist across PWA install / kill / relaunch on iOS 17+; they're also unreachable from JavaScript, removing the XSS exfiltration surface.
3. **Same-origin rewrites are already in the stack.** Next.js 16 supports rewrites that proxy `/api/*` to the FastAPI backend, making cookies effectively same-origin without a custom edge.

## Considered alternatives

- **Keep Bearer + `localStorage` (the SPEC.md scheme).** Rejected: iOS PWA eviction is the load-bearing failure mode and there's no workaround on the client side.
- **Bearer + `IndexedDB`.** Rejected: no automatic transmission with requests, requires explicit attach-header plumbing on every fetch, and PWA eviction policies treat `IndexedDB` similarly to `localStorage`.
- **Bearer + `sessionStorage`.** Rejected: cleared on tab close, which is worse than the SPEC.md baseline (PWA force-quit also closes tabs).
- **Supabase Auth (OAuth / magic link).** Rejected at this milestone — the productize-later TODO in SPEC.md still applies, but solves a different problem (provider-managed identity), not the storage durability one. Cookie auth is orthogonal and lighter.

## Consequences

- New backend behavior: `POST /households` and `POST /households/join` set the `aldente_auth` HttpOnly cookie (`SameSite=Lax`, `Secure` in prod, `HttpOnly`, domain scoped to the app origin). Response body no longer includes the raw token; clients never see it.
- Frontend stops reading or writing `localStorage.aldente_auth`; the `useAuth` hook reads `member_id` from a separate (non-sensitive) cookie or from a server-side render boundary.
- `frontend/proxy.ts` rewrites `/api/*` to the FastAPI origin so the cookie is same-origin in production. Local dev uses CORS-with-credentials.
- CORS config in `backend/app/main.py` allows credentials for the local-dev cross-origin case only; production is same-origin and does not need CORS at all.
- `SPEC.md` §Onboarding auth section is superseded; an inline banner at L309+ points here.
- `CLAUDE.md` invariant 8 documents the contract.
- No database schema change. The `auth_token` column on `members` remains; only its transport changes.
- No backward-compat shim. MVP posture (CLAUDE.md §MVP phase posture) — old localStorage readers were removed in the same change that added cookie writes.

## Relates to

- SPEC.md § Onboarding (L309+) — superseded
- CLAUDE.md invariant 8
- `frontend/proxy.ts`
- `backend/app/main.py` CORS config
- Phase 01.1 (`.planning/milestones/v0.1-phases/01.1-cookie-auth-and-recovery/`) — implementation phase
