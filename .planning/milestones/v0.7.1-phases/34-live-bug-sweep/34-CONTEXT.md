# Phase 34: Live-bug sweep - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — punch-list-driven; decisions sourced from the 260518-kba walkthrough evidence and v0.7.1 REQUIREMENTS.md locked decisions

<domain>
## Phase Boundary

High-severity broken behavior surfaced by the 260518-kba Playwright walkthrough is silently fixed:

- `/cooking-logs` renders the cooking-log cards returned by `GET /api/cooking-logs` (LIVE-01)
- Photo signed-URL handler degrades gracefully on missing storage objects with prod-verified-first behavior (LIVE-02)
- Settings shows both household members not just Luca (LIVE-03)
- Pre-vote Accueil marginalia stops contradicting the screen below it (LIVE-04)
- VersionFooter reads a current milestone version, not stale `v0.1.0` (LIVE-05)
- Nested `<main>` landmark collision removed (LIVE-06)

**Out of phase:** the systemic `useEnumLabels` leak (Phase 35) and the Sober Kitchen §15 contract gaps (Phase 36).

</domain>

<decisions>
## Implementation Decisions

### Locked at milestone scaffold (REQUIREMENTS.md)

- **LIVE-02 prod verification is plan step 0.** Before any code touches, the executor verifies the deployed photo-url handler against a known-missing storage path. If prod returns 404 → scope is local-seed gap + UI graceful fallback only. If prod 500s → scope expands to backend handler hardening (return 404 not 500 on `FileNotFoundError`).
- **LIVE-04 marginalia branch ships in this phase**, not deferred to Phase 36. SOBER-09 (first-paint ledger) will land later and make this naturally consistent; in the meantime, Phase 34 ships the explicit `validéCount === 0` branch guard so the contradiction stops immediately. Phase 36's verifier will assert consistency holds after SOBER-09 lands.
- **MVP posture** — clean rewrites only; no compat shims for the bugs being fixed.

### LIVE-01 — `/cooking-logs` root cause

- **Root cause is unknown** until the executor reads `frontend/app/cooking-logs/page.tsx`. Punch list flags two suspicion clusters: (a) page maps `/api/cooking-logs` response into the wrong state slot (likely `recipes` not `cookingLogs`), or (b) the fetch URL is wrong. The header comment in the existing file references `fetchCookingLogs(14)` from `@/lib/cooking` — read both before fixing.
- **Empty-state copy is also wrong** even when populated correctly — the file's own comment acknowledges: "Empty-state copy: per UI-SPEC §Surface 6 the cooking-log history view reuses the existing `recipes.empty_heading` / `empty_body` keys as placeholder strings — semantic mismatch is acceptable until the Phase 20 i18n sweep adds cooking-log-specific empty copy." This phase closes that debt: add new i18n keys `cooking_logs.empty_heading` and `cooking_logs.empty_body`, point EmptyState at them.
- **Acceptance assertion:** seeded household → `/cooking-logs` → 3 cards visible grouped by date with Fraunces-italic section headers per Phase 8.

### LIVE-02 — photo signed-URL handler

- **Plan step 0** — executor runs `curl -i https://al-dente-pink.vercel.app/api/recipes/{any-uuid}/photo-url?path=does-not-exist.jpg` (or equivalent against the deployed Railway backend route) and records the HTTP status + body. Result drives whether the phase touches backend or stays frontend-only.
- **If prod 404:** scope is (a) seed data gap (acknowledged — synthetic seed inserts `recipes.photo_paths` rows without uploading bytes to Storage), and (b) UI graceful fallback — verify `useSignedPhotoUrl`'s `onError` correctly swaps to the empty pictogram fallback without console-500 noise.
- **If prod 500:** scope expands — backend handler in `backend/app/routers/photos.py` or `backend/app/services/storage.py` catches Supabase Storage's `FileNotFoundError` / `404` response and returns FastAPI `HTTPException(status_code=404, detail="not found")` instead of letting the 500 propagate. Same `useSignedPhotoUrl` `onError` verification stays in scope.

### LIVE-03 — Settings members

- **Fetch path:** Settings should read `household.members[]` not just `me`. The membership data exists (Partner renders on Accueil voting card per the punch list).
- **Display contract:** Partner block shows member dot color, name, and last-active hint per Phase 9 onboarding-identity spec — matches the "Toi" block's visual structure for symmetry.
- **Implementation discretion:** read existing Settings page to determine whether to add a new `useHousehold()` hook or extend the existing session/me fetch path. Prefer extending the existing path (lower blast radius).

### LIVE-04 — Accueil marginalia branch

- **Branch shape:** Guard the `recipes.empty_heading.validated` i18n key behind `validéCount > 0`. When the computed shortlist has zero Validé rows, do not render the "déjà une idée validée" marginalia.
- **Derivation source:** Use the existing computed vote state from `services/voting.compute_vote_state` (invariant #2 — voting state is computed, not stored). The component should derive `validéCount` from the shortlist's vote-state map already passed down.
- **Coupling with SOBER-09:** This guard is correct in dual-mode AND first-paint-ledger mode. SOBER-09 will eliminate the swipe-deck-first path entirely; until then, the guard prevents the contradiction.

### LIVE-05 — Version bump

- **Bump target:** `frontend/package.json` `"version"` field from `0.1.0` → `0.7.1` (current milestone). Single bump at milestone open; no per-phase semver moves.
- **Why 0.7.1 not 0.8.0:** This is a patch milestone closing the v0.7 contract. Semver patch (0.7.1) matches the milestone designation.

### LIVE-06 — Nested `<main>` element

- **Layout owns the landmark.** `frontend/app/layout.tsx:75` correctly wraps every page in `<main className="flex flex-col flex-1 pb-[…]">`. The fix is to find the page-level component that double-wraps and strip its inner `<main>` — likely in `HomeDecide.tsx` or `app/page.tsx`.
- **WCAG 1.3.1 compliance** — one `<main>` landmark per document, owned by the layout.

### Claude's Discretion

- File-level placement of new helpers (e.g., whether `validéCount > 0` guard lives inline in `HomeDecide.tsx` or as a derived prop from `app/page.tsx`).
- Specific i18n key naming for cooking-log empty copy (proposal: `cooking_logs.empty_heading` / `cooking_logs.empty_body`).
- Whether to add a regression test for each LIVE-* requirement or rely on the existing Playwright suite + walkthrough acceptance (executor's call per requirement complexity).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `frontend/components/EmptyState.tsx` — generic empty-state component; LIVE-01 routes through this with new i18n keys.
- `frontend/lib/cooking.ts` — `fetchCookingLogs(days: number)` is the canonical fetcher; LIVE-01 uses it.
- `frontend/lib/hooks/useSignedPhotoUrl.ts` — Phase 30 BUG-01 hook with `onError` retry budget; LIVE-02 verifies graceful fallback path.
- `frontend/components/VersionFooter.tsx` — reads `process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"` (LIVE-05 source).
- `backend/app/services/voting.py` — `compute_vote_state` is the canonical 5-state computer (invariant #2); LIVE-04 reads via the existing shortlist payload.
- Phase 9 onboarding-identity spec — defines the member-block visual structure that LIVE-03 mirrors for the partner row.

### Established Patterns

- **HttpOnly cookie auth** — all API calls flow through Next.js rewrites in `proxy.ts`; no Bearer tokens (invariant #8). LIVE-01 and LIVE-03 fetches use the existing `@/lib/api` wrapper.
- **i18n via next-intl** — all user-facing strings go through `frontend/lib/i18n/fr.json`. LIVE-01's new empty-copy keys land there.
- **Layout owns landmarks** — `<main>` belongs in `app/layout.tsx`, not page files (LIVE-06 fix direction).
- **Computed-not-stored voting state** — never derive `validéCount` from a stored column; always read the shortlist's computed state map (invariant #2).

### Integration Points

- `/cooking-logs` page mounts under the standard `app/layout.tsx` wrap; uses existing `OnboardingGuard` and EmptyState components.
- `/settings` page (`frontend/app/settings/page.tsx`) — currently consumes `session.me`; LIVE-03 extends to consume household members.
- HomeDecide / `app/page.tsx` — LIVE-04 marginalia branch lives in one of these; LIVE-06 nested `<main>` is one of these.
- `useSignedPhotoUrl` hook — LIVE-02 frontend graceful-fallback verification surface; no new hook needed.

</code_context>

<specifics>
## Specific Ideas

- **Plan step 0 for LIVE-02 is hard-required** before any code in the phase touches. The executor must record the prod handler's response status + body before opening the LIVE-02 plan.
- **LIVE-04 ships an explicit branch guard** even though SOBER-09 will structurally resolve it later. Two reasons: (1) phases ship sequentially in autonomous mode, so the contradiction would persist between Phase 34 and Phase 36 ships if deferred; (2) the guard is correct in both dual-mode and first-paint-ledger mode, so it's not throwaway work.
- **LIVE-01 closes a planned tech-debt note** — the existing cooking-logs page header comment explicitly defers the empty-copy fix to "Phase 20 i18n sweep" which never happened. This phase closes it.

</specifics>

<deferred>
## Deferred Ideas

- **Settings page redesign / member-management UX** — Phase 34 only renders the missing member block; it does not redesign Settings. Out of scope.
- **Empty-state illustration polish** — generic EmptyState component stays as-is; only the i18n keys change. Visual polish is Phase 36 territory.
- **WebSocket-driven Settings auto-refresh** when a household member is renamed remotely — orthogonal to LIVE-03; existing realtime spine carries member updates via `recipe.updated` patterns elsewhere.
- **Backend test coverage for the photo-url handler** — if LIVE-02 backend hardening lands, the test goes in scope; otherwise deferred to gh#28 (v0.8 test coverage).

</deferred>
