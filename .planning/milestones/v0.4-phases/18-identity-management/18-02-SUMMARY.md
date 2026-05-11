---
phase: 18
plan: 02
subsystem: frontend/settings
tags: [IDM-02, FIX-04, frontend, settings, rename, copy-button, realtime, i18n]
requirements: [IDM-02, FIX-04]
dependencies:
  requires:
    - "frontend/lib/api.ts:api<T>() — cookie-auth fetch wrapper"
    - "frontend/components/SessionProvider.tsx:useSession, SESSION_CHANGED_EVENT, SessionMember"
    - "Plan 18-01 (parallel): backend PATCH /api/households/me — runtime dependency, not compile dependency"
  provides:
    - "frontend/lib/households.ts:renameMe(name) — PATCH /api/households/me client"
    - "frontend/components/RealtimeProvider.tsx:MemberUpdatedEvent, MEMBER_UPDATED_DOM_EVENT — DOM event surface for partner-phone reconciliation"
    - "frontend/app/settings/page.tsx — Pencil-driven inline rename + explicit Copy button affordances"
  affects:
    - "Membre Card user flow (settings page)"
    - "Invite-code Copy affordance (settings page) — FIX-04 audit closure"
    - "Realtime sync surface for member rename"
tech-stack:
  added: []
  patterns:
    - "Lucide Pencil/X swap + autoFocused <Input> for inline edit"
    - "Optimistic UI confirmed via SessionProvider.refresh() canonical re-fetch"
    - "onMouseDown (not onClick) on cancel-X so cancel fires before Input.blur → onSubmitRename"
    - "DOM CustomEvent bridge + SESSION_CHANGED_EVENT dispatch from RealtimeProvider (mirrors existing Phase 3/4 patterns)"
key-files:
  created:
    - "frontend/lib/households.ts"
    - ".planning/phases/18-identity-management/18-02-SUMMARY.md"
  modified:
    - "frontend/app/settings/page.tsx"
    - "frontend/components/RealtimeProvider.tsx"
    - "frontend/lib/i18n/fr.json"
decisions:
  - "Optimistic display only confirmed after refresh() resolves — on error the Input stays open with the rejected value, no UI divergence from server truth (T-18-02-06)"
  - "Both the icon-only Copy Button (keyboard alias + inline visual pair with invite code) AND the explicit text Copier le code Button kept — they share onCopy and the `copied` state so the toast stays unified"
  - "RealtimeProvider dispatches BOTH the aldente:member.updated CustomEvent AND SESSION_CHANGED_EVENT — the CustomEvent is future-use for per-member-id subscribers, the SESSION_CHANGED_EVENT dispatch is the load-bearing path that drives the partner-phone reconciliation"
metrics:
  duration: "~25 min"
  completed: "2026-05-11"
  tasks: 3
  files_created: 1
  files_modified: 3
  commits: 3
---

# Phase 18 Plan 02: Settings Identity Affordances Summary

Settings ships an inline Pencil → Input rename affordance on the Membre Card (driven by a new `renameMe()` API helper hitting PATCH /households/me with optimistic+canonical reconciliation through `useSession().refresh()`), an explicit h-12 outline "Copier le code" Button on the Foyer Card alongside the existing icon-only alias (FIX-04 audit closure), and a `member.updated` WS subscription in RealtimeProvider that bridges into SessionProvider's re-fetch path so the partner's phone converges within ~200ms — all wired through next-intl with eight new French keys under `settings.member.*` + `settings.invite_code_copy_cta`.

## What Was Built

### Task 1 — `frontend/lib/households.ts` + i18n keys (commit f2dedc9)

- **New file** `frontend/lib/households.ts` exporting `renameMe(name: string): Promise<RenameMeResponse>`. Wraps `api<T>()` from `lib/api.ts` so cookie auth (`credentials:"include"`), JSON Content-Type, and the 401-redirect-to-onboarding contract are all inherited. `RenameMeResponse = SessionMember & { joined_at?: string }` — the renamer's frontend only consumes the SessionMember subset (id/name/color_hex); backend may include `joined_at` and we tolerate it without typing as strict.
- **Extended** `frontend/lib/i18n/fr.json` with one top-level key `settings.invite_code_copy_cta = "Copier le code"` and the nested `settings.member.*` block containing 7 keys: `rename_aria`, `rename_label`, `rename_placeholder`, `save_cta`, `cancel_aria`, `rename_success_toast`, `rename_error_toast`, `rename_409_toast`. All French strings; no existing keys removed or renamed.

### Task 2 — Settings Membre Card inline rename + Foyer Card explicit Copy Button (commit 84ac3e0)

- **Imports** added: Lucide `Pencil`, `X`; `Input` from `@/components/ui/input`; `renameMe` from `@/lib/households`.
- **State** added inside `SettingsPage`: `renaming` (boolean), `renameValue` (string), `renameSubmitting` (boolean). Extended the existing `useSession()` destructure to include `refresh`.
- **`statusOf()` helper** parses the leading 3-digit status code out of `api()`'s `Error("<status> <statusText>")` shape so 409 (name taken) and other non-200 errors can branch to different toasts.
- **`onSubmitRename()`** trims the input, no-ops on empty, treats unchanged values as cancel, calls `renameMe()`, and on success fires `toast.success(t("member.rename_success_toast"))` + `await refresh()` to reconcile canonical state. On 409 → `rename_409_toast`; on other non-200 → `rename_error_toast`. In both error paths the Input stays open with the rejected value for retry (T-18-02-06: optimistic display only confirmed AFTER `refresh()` resolves).
- **Card 1 (Membre)** name `<span>` now toggles to an autoFocused `<Input>` with `maxLength={40}`, Enter/blur submitting, Escape/cancel-X reverting. The cancel-X uses `onMouseDown` (not `onClick`) so the cancel fires BEFORE the Input's blur handler would trigger `onSubmitRename`.
- **Card 2 (Foyer)** gains a second `<Button variant="outline" className="h-12 w-full">` with a leading `Copy` icon labeled `t("invite_code_copy_cta")` (`"Copier le code"`). Disabled state flips to `t("invite_code_copied")` (`"Code copié"`) while `copied === true`. The existing icon-only `<Button size="icon" className="h-12 w-12">` is preserved as the keyboard / screen-reader alias and the inline visual pair with the invite-code monogram — both Buttons share `onCopy` so the toast + 2-second `setCopied(false)` timer stay unified.

### Task 3 — RealtimeProvider `member.updated` subscription (commit d2a60e1)

- **Extended** the existing SessionProvider import line to also pull `SESSION_CHANGED_EVENT`.
- **New `useEffect`** alongside the existing five (recipe.promoted, vote.created, shortlist.created, cooking.started, cooking.finalized): subscribes to `client.onEvent<MemberUpdatedEvent>("member.updated", …)` and on each frame dispatches BOTH `new CustomEvent(MEMBER_UPDATED_DOM_EVENT, { detail })` AND `new Event(SESSION_CHANGED_EVENT)`. The CustomEvent is for any future component that wants to react to a specific member id; the SESSION_CHANGED_EVENT dispatch is the load-bearing call that drives the partner's phone to re-fetch `/households/me` through SessionProvider's existing `fetchSession()` listener.
- **Exported** the new event surface: `export type MemberUpdatedEvent = { id; name; color_hex }` and `export const MEMBER_UPDATED_DOM_EVENT = "aldente:member.updated"`.

## Deviations from Plan

None — plan executed exactly as written. The action blocks specified the imports, state, handlers, JSX shape, and DOM event constants; all three tasks landed on their first attempt with no deviation rules triggered.

## Verification

- `cd frontend && npx tsc --noEmit -p tsconfig.json` → exit 0 (clean)
- `cd frontend && npx eslint app/settings/page.tsx lib/households.ts components/RealtimeProvider.tsx` → exit 0 (no issues)
- `grep -n "renameMe\b" frontend/lib/households.ts` → 1 match (the function definition)
- `grep -n "Pencil\b" frontend/app/settings/page.tsx` → 3 matches (import, comment, JSX)
- `grep -n "Copy\b" frontend/app/settings/page.tsx` → 10 matches (icon import, handlers, both Buttons, comments)
- `grep -n "member.updated\|MemberUpdated" frontend/components/RealtimeProvider.tsx` → 6 matches (subscription, type, constant, comments)
- `grep -c` for the 8 new i18n keys + `invite_code_copy_cta` → 8 hits in `fr.json`
- JSON validity: `node -e "JSON.parse(...)"` succeeds; all `settings.member.*` keys present.

## Known Stubs

None. The `renameMe()` helper assumes Plan 18-01's PATCH /households/me backend route. At runtime that endpoint must exist for rename to succeed (Plan 18-01 is parallel-safe and ships in the same wave); at compile time the helper has no dependency beyond `api<T>()`, so 18-02 builds and lints cleanly against the current backend. This is a documented runtime-dependency, not a stub — the plan's "files_modified" boundary is respected.

## Threat Flags

None — the new surface is a single PATCH client wired into existing cookie-auth + an existing WS event-type union. The threat register entries in 18-02-PLAN.md (T-18-02-01 through T-18-02-06) are addressed:

- **T-18-02-01 (Tampering — Input bound):** `maxLength={40}` set on the Input + trim before submit; backend Pydantic 1..40 strip lives in 18-01 (defense in depth).
- **T-18-02-02 (XSS):** React JSX text interpolation auto-escapes `session.me.name` and the WS payload; no `dangerouslySetInnerHTML`.
- **T-18-02-03 (Info Disclosure):** Toast strings are fixed French (`rename_409_toast` etc.) — no echoing of conflicting names.
- **T-18-02-04 (DoS):** `renameSubmitting` flag guards double-submit; couple-scale, no rate limit needed.
- **T-18-02-05 (WS injection):** WS upgrade requires the `aldente_auth` cookie; server-only broadcast path.
- **T-18-02-06 (Repudiation):** Error path keeps Input open with rejected value, does NOT call `refresh()` — UI never diverges from server truth.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| f2dedc9 | feat | add renameMe API helper and settings.member.* i18n keys |
| 84ac3e0 | feat | inline rename on Membre Card + explicit Copy button on Foyer Card |
| d2a60e1 | feat | subscribe to member.updated → SessionProvider re-fetch |

## Self-Check: PASSED

- `frontend/lib/households.ts` — FOUND
- `frontend/app/settings/page.tsx` (modified) — FOUND
- `frontend/components/RealtimeProvider.tsx` (modified) — FOUND
- `frontend/lib/i18n/fr.json` (modified) — FOUND
- Commit f2dedc9 — FOUND
- Commit 84ac3e0 — FOUND
- Commit d2a60e1 — FOUND
