---
phase: 01-foundations-w1
plan: 06
subsystem: frontend
tags: [onboarding, next-intl, localstorage, color-swatch, first-launch-guard, vercel]

# Dependency graph
requires:
  - 01-02-frontend-scaffold (LocaleProvider, BottomNav with /onboarding/* path-guard, shadcn primitives, fr.json base, lib/api.ts, lib/colors.ts MEMBER_COLORS)
  - 01-04-onboarding-backend (POST /households, POST /households/join, GET /households/by-code/{code}, GET /households/me)
provides:
  - Live 3-screen onboarding flow at https://al-dente-pink.vercel.app/onboarding/{welcome,create,join,share-code}
  - lib/auth.ts — saveAuthToken / getAuthToken / clearAuthToken / hasOnboarded localStorage helpers (key: al_dente_auth_token, plus household_id and member_id)
  - lib/onboarding-guard.tsx — first-launch redirect from / to /onboarding/welcome when no auth_token
  - components/ColorSwatchPicker.tsx — 5-swatch picker reading MEMBER_COLORS, disabled-with-Lock-icon state for taken colors
  - frontend/lib/i18n/fr.json extended with onboarding.* keys
affects:
  - 01-07-ping-frontend-and-ws-client (depends on auth_token in localStorage to authenticate the WS connection)
  - 01-10-recipes-frontend-read (depends on auth_token for /recipes API calls)
  - 01-11-recipes-frontend-write (same)
  - All Phase 2/3/4 frontend plans that hit authenticated endpoints

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server component + client component split: pages are server components, forms are 'use client'"
    - "First-launch guard runs in app/page.tsx (server) and redirects via redirect() from next/navigation when localStorage is unavailable... no, that's wrong — actually runs as a client component because localStorage is browser-only"
    - "Debounced GET /households/by-code/{code} (~300ms) drives swatch-disable preview before the user submits the join form, avoiding the race where two members pick the same color and one gets a 409"
    - "auth_token + household_id + member_id all stored in localStorage so the home page can render the member's name without a round-trip"

key-files:
  created:
    - frontend/lib/auth.ts
    - frontend/lib/onboarding-guard.tsx
    - frontend/components/ColorSwatchPicker.tsx
    - frontend/app/onboarding/layout.tsx
    - frontend/app/onboarding/welcome/page.tsx
    - frontend/app/onboarding/create/page.tsx
    - frontend/app/onboarding/join/page.tsx
    - frontend/app/onboarding/share-code/page.tsx
  modified:
    - frontend/app/page.tsx (now uses onboarding-guard)
    - frontend/lib/i18n/fr.json (extended with onboarding.welcome.*, onboarding.create.*, onboarding.join.*, onboarding.shareCode.*, onboarding.errors.*)

key-decisions:
  - "First-launch guard is a client component, not server middleware. Reason: localStorage is browser-only; SSR can't tell if the user has onboarded. Tradeoff: a brief flash of the home page may render before redirect on slow connections — acceptable for v0.1."
  - "auth_token stored as localStorage value (not cookie) — no SSR auth, no XHR Same-Origin checks needed. Productize-later if SSR-rendered authenticated pages become a thing."
  - "Color preview uses GET /households/by-code/{code} debounced at 300ms after the 6th character is entered — fast enough to feel live, slow enough not to spam the backend on each keystroke."
  - "Share-code screen has a Copy button that uses navigator.clipboard.writeText with a sonner toast; falls back gracefully if clipboard API isn't available (e.g. older iOS Safari)."

patterns-established:
  - "Pre-submission validation via dependent backend lookup (the join flow's color-preview)" — generalizes to other 'check before commit' UX (e.g., recipe-name dedup before save in W1+)
  - "Onboarding-section layout (frontend/app/onboarding/layout.tsx) deliberately omits BottomNav so the path-guard pattern in BottomNav.tsx becomes a soft fallback rather than the only mechanism"
  - "localStorage helpers in one file (lib/auth.ts) so a future swap to e.g. Web Crypto-encrypted token storage is one-file"

requirements-completed: [ONBOARD-01, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06]

# Metrics
duration: 13min
completed: 2026-05-05
---

# Phase 1 Plan 6: Onboarding Frontend Summary

**3-screen French onboarding flow (Welcome → Create-or-Join → Share-code) live at https://al-dente-pink.vercel.app/, with auth_token persisted to localStorage on success, first-launch guard redirecting from / to /onboarding/welcome until onboarded, color-swatch picker that pre-disables the creator's color via a debounced GET /households/by-code/{code} preview, and bottom-nav hidden on /onboarding/* (closing the deferred 01-02 verify).**

## Performance

- **Duration:** ~13 min (executor 2 tasks + user-driven Vercel re-deploy + dual-iPhone onboarding verify)
- **Tasks:** 3 (Tasks 1–2 by executor; Task 3 = Vercel re-deploy + on-device flow verified by user)
- **Files modified:** 8 created, 2 modified

## Accomplishments

- **Live onboarding flow on both phones**: user attested that Phone A (creator) and Phone B (joiner) round-tripped successfully — household creation, invite-code share, join with disabled-color preview, force-quit-relaunch goes straight to `/`.
- **Closes the deferred 01-02 verify**: bottom-nav is correctly hidden on `/onboarding/*` paths and visible on `/`. The `BottomNav.tsx` path-guard from 01-02 + the `onboarding/layout.tsx` deliberately-empty layout both contribute.
- **Closes ONBOARD-01..06**: end-to-end create + join flows work against the live Railway backend, including the error paths (404 unknown code → French inline error, 409 color-taken prevented client-side via the disabled-swatch preview).
- **i18n discipline maintained**: zero hardcoded JSX strings — all copy lives in `frontend/lib/i18n/fr.json` under the `onboarding.*` namespace. Verified by grep for uppercase JSX literals.
- **Build artefacts**: `npm run lint` clean, `npm run build` exits 0, all 6 onboarding routes pre-rendered as static (the dynamic data fetches happen client-side).

## Task Commits

1. **Task 1: i18n keys + auth.ts helpers + ColorSwatchPicker + onboarding layout** — `d280629` (feat)
   - `frontend/lib/i18n/fr.json`, `frontend/lib/auth.ts`, `frontend/lib/onboarding-guard.tsx`, `frontend/components/ColorSwatchPicker.tsx`, `frontend/app/onboarding/layout.tsx`
2. **Task 2: 4 onboarding pages + first-launch guard on home** — `541f5ae` (feat)
   - `frontend/app/onboarding/{welcome,create,join,share-code}/page.tsx`, `frontend/app/page.tsx`, `frontend/lib/onboarding-guard.tsx` (Rule 3 lint refactor)
3. **Task 3 (human-verify checkpoint): Vercel re-deploy + dual-iPhone flow verification** — performed by user; no commit (deploy is external state).

_Note: this SUMMARY commit is the plan-completion marker._

## Files Created/Modified

See `key-files.created` + `key-files.modified` in the frontmatter. Highlights:

- `frontend/lib/auth.ts` — `saveAuthToken({auth_token, household_id, member_id})`, `getAuthToken() -> string | null`, `clearAuthToken()`, `hasOnboarded() -> boolean`. localStorage keys: `al_dente_auth_token`, `al_dente_household_id`, `al_dente_member_id`.
- `frontend/lib/onboarding-guard.tsx` — `<OnboardingGuard>` client component that reads `hasOnboarded()` from `lib/auth.ts` and uses `redirect()` from `next/navigation` (or `useRouter().replace`) to route to `/onboarding/welcome` when not onboarded. Renders children otherwise.
- `frontend/components/ColorSwatchPicker.tsx` — receives `disabledColors: string[]` (a list of hex codes) plus `value`/`onChange`, renders 5 swatches from `MEMBER_COLORS`. Disabled swatches show a Lock icon over a faded version of the swatch and ignore clicks.
- `frontend/app/onboarding/layout.tsx` — minimal layout, no BottomNav, no header — keeps onboarding visually distinct from the main app.
- `frontend/app/onboarding/welcome/page.tsx` — wordmark + tagline + two CTAs (Créer un foyer / Rejoindre un foyer).
- `frontend/app/onboarding/create/page.tsx` — form with `Nom du foyer`, `Ton prénom`, `<ColorSwatchPicker>` (no disabled colors). On submit: `POST /households` → `saveAuthToken(response)` → `router.push('/onboarding/share-code?code=' + response.invite_code)`.
- `frontend/app/onboarding/join/page.tsx` — form with `Code d'invitation` (6-char input), `Ton prénom`, `<ColorSwatchPicker>`. After 6 chars typed, debounced 300ms `GET /households/by-code/{code}`. On 200, populate `disabledColors=[creator_color_hex]`. On 404, inline French error `Ce code n'existe pas, vérifie auprès de ta partenaire`. On submit: `POST /households/join` → `saveAuthToken(response)` → `router.push('/')`.
- `frontend/app/onboarding/share-code/page.tsx` — reads `?code=ABC123` from URL, displays in monospace + wide tracking. Has `Copier le code` button (navigator.clipboard.writeText + sonner toast `Copié dans le presse-papier`) and `J'ai prévenu ma partenaire` CTA → `router.push('/')`.
- `frontend/app/page.tsx` — wraps content in `<OnboardingGuard>`. The actual home content is whatever was there before (BottomNav + an EmptyState placeholder; replaced by the recipe-list rendering in 01-10).
- `frontend/lib/i18n/fr.json` — extended with `onboarding.welcome.{title,tagline,createCta,joinCta}`, `onboarding.create.{title,householdNameLabel,memberNameLabel,colorLabel,submitCta}`, `onboarding.join.{title,codeLabel,memberNameLabel,colorLabel,submitCta,errors.unknownCode,errors.colorTaken}`, `onboarding.shareCode.{title,instruction,copyCta,confirmCta,toastCopied}`.

## Decisions Made

- **First-launch guard is a client component** — localStorage is unavailable at SSR. The brief render-then-redirect flash on slow connections is acceptable for v0.1; can be replaced by an SSR-cookie pattern later if onboarding becomes shareable.
- **auth_token storage in localStorage** — no SSR auth means no need for HttpOnly cookies. Tradeoff: vulnerable to XSS-driven token exfiltration, but the v0.1 frontend has no third-party scripts and no user-supplied HTML rendering. Productize-later if recipe descriptions ever render user-controlled HTML.
- **Color-preview debounce at 300ms** — fast enough that the user sees the swatch update "live", slow enough that backspace+retype on the invite code doesn't spam the backend with 6 lookups in a second.
- **Onboarding layout is deliberately barren** — no BottomNav, no header, no footer. Reduces visual surface area during an already-formal flow and means the path-guard in BottomNav.tsx becomes redundant defense (good — defense in depth).
- **Stored auth_token in localStorage, NOT IndexedDB or sessionStorage** — localStorage persists across browser restarts (matches "force-quit + relaunch goes straight to /"); IndexedDB is async, awkward for sync hydration; sessionStorage clears on tab close, breaks the "installed PWA reopens to home" UX.

## Deviations from Plan

### [Rule 3 - Auto-fixed] Lint/refactor in onboarding-guard.tsx

- **Found during:** Task 2's `npm run lint`.
- **Issue:** Initial onboarding-guard implementation flagged a hooks-rules violation (effect dependency array missed `router`).
- **Fix:** Added `router` to the dependency array; verified the redirect doesn't loop (the guard is mounted exactly once at `/`, not on `/onboarding/*` routes).
- **Files modified:** `frontend/lib/onboarding-guard.tsx`.
- **Verification:** `npm run lint` clean post-fix; flow tested end-to-end on both phones; no infinite redirect.
- **Committed in:** `541f5ae` (Task 2 commit).

---

**Total deviations:** 1 auto-fixed (1 lint).
**Impact on plan:** None functionally; the fix matches react/eslint best practice.

## Issues Encountered

- The original plan put both the localStorage helpers and the guard in `lib/auth.ts`. Executor split them into `lib/auth.ts` (helpers) + `lib/onboarding-guard.tsx` (the client component) — better separation, the JSX-bearing file gets `.tsx` and the pure-helpers stays `.ts`.

## Threat Flags

- **localStorage-token XSS exposure**: noted in Decisions. v0.1 risk acceptable; revisit when user-supplied content (recipe descriptions, voice transcripts) is rendered.
- **Color-collision race**: two members joining within 300ms could each see the other's color as available, both submit, one gets 409. The 01-04 backend handles 409 cleanly but the UX is a generic error toast. Acceptable — the "race" requires both members staring at the same screen simultaneously and pressing Submit within 300ms, which doesn't happen in real onboarding.

## User Setup Required

Done by user during Task 3:
- `cd frontend && vercel --prod` — re-deployed Vercel with the new onboarding routes.
- `git push origin main` — Railway auto-redeployed the backend with /ws + /pings (Wave 4 backend half).
- Phone A: created household "Cuisine" as Luca, picked `<phoneA_color>`, copied invite code, confirmed shared.
- Phone B: joined with the code, observed Phone A's color disabled, picked `<phoneB_color>`, completed flow.
- Both phones: force-quit + relaunch goes directly to `/` (NOT onboarding) — confirms localStorage persists across PWA restarts.

Outstanding (deferred):
- None within this plan.

## Next Phase Readiness

Wave 5 (`01-07-ping-frontend-and-ws-client`) can:
- Read `getAuthToken()` from `lib/auth.ts` and pass it as `wss://<railway>/ws?token=<auth_token>` to authenticate the WS connection (per 01-05's WS auth contract).
- Wire `<RealtimeProvider>` at the root layout to maintain a single shared WS connection. Use partysocket or reconnecting-websocket for reconnect-with-backoff (REALTIME-03).
- Mount a `<PingPanel>` on `/` (the home page) that POSTs `/pings` and observes `ping.created` events arriving on the WS — the W1 round-trip gate.

After Wave 5 lands and the user verifies on both phones, all of Phase 1's foundation is proven end-to-end, and Waves 6–10 are pure recipe-library work.

### Deferred verification (NOT confirmed in this plan)

- **Two members in different time zones receive each other's `recipe.created` events in real time** — n/a here (no recipes yet); arrives in 01-08 + 01-10 once the recipe library lands.

## Self-Check: PASSED

- `frontend/lib/auth.ts` exists and exports the 4 helpers.
- `frontend/lib/onboarding-guard.tsx` exists and exports `<OnboardingGuard>`.
- `frontend/components/ColorSwatchPicker.tsx` exists and accepts `disabledColors` prop.
- 5 onboarding files exist under `frontend/app/onboarding/`.
- `frontend/app/page.tsx` wraps content in `<OnboardingGuard>`.
- `frontend/lib/i18n/fr.json` includes the `onboarding.*` namespace.
- Commits `d280629` and `541f5ae` reachable from `main`.
- User attested: dual-phone flow works including disabled-swatch preview, copy-to-clipboard toast, force-quit-relaunch goes straight to /.

---
*Phase: 01-foundations-w1*
*Completed: 2026-05-05*
