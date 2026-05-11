---
phase: 16-capture-pipeline-correctness
plan: 04
subsystem: frontend
tags: [next-intl, tailwind, radix-ui, alert-dialog, inbox, failed-state, recovery]

# Dependency graph
requires:
  - phase: 16-capture-pipeline-correctness
    plan: 01
    provides: TypeScript Recipe.status literal union accepts "failed" — the canonical predicate `recipe.status === "failed"` requires this.
  - phase: 02-llm-capture-w2
    provides: recipes.promotion namespace in fr.json (in_flight / failed_badge / retry / retry_aria / success_toast) — extended here.
provides:
  - Inbox card failed-state UI (Fraunces-italic label + truncated context + Réessayer + Supprimer-with-AlertDialog) at 48px tap target.
  - Canonical `isFailed = recipe.status === "failed"` predicate replacing the legacy `promotion_error != null` workaround.
  - Inbox refetch widened to include `?status=failed` rows alongside drafts.
  - Realtime branches that keep failed rows visible (no drop on draft→failed transition).
  - 7 new French i18n keys under recipes.promotion.* (failed_label, failed_context_fallback, delete, delete_aria, delete_confirm_{title,body,cancel,confirm}).
affects: [16-05 e2e specs — the AlertDialog and dual-fetch UI shape is the surface the Playwright spec drives]

# Tech tracking
tech-stack:
  added: []  # pure UI extension — AlertDialog primitive was already available
  patterns:
    - "Radix AlertDialog (asChild Trigger + portal Content) replaces window.confirm for destructive flows — D-16-06"
    - "Dual parallel fetch + client-side merge for multi-status inbox lists (backend regex accepts one ?status= value at a time per Plan 16-03)"
    - "Canonical-status predicate refactor (recipe.status === 'failed') swaps in for promotion_error nullability workaround now that backend writes status alongside the error (Plan 16-03)"

key-files:
  created: []
  modified:
    - frontend/components/RecipeDraftCard.tsx
    - frontend/app/inbox/page.tsx
    - frontend/lib/i18n/fr.json

key-decisions:
  - "Two-GET-merge over a backend regex change. Plan 16-03 already widened the backend list regex to accept ?status=failed, but the regex still accepts only ONE value per request. Issuing parallel `Promise.all([draft, failed])` and merging client-side is faster to ship than re-doing the backend regex to accept comma-separated values; couple-scale workload means parallel-fetch latency is negligible."
  - "Trailing-icon Supprimer suppressed for the failed variant. The inline labeled Supprimer wrapped in AlertDialog is the canonical CTA per D-16-06. Two Supprimer affordances on the same row would be visually noisy and confusing."
  - "Failed variant rendered in <div>, not <Link>. The row is non-navigable in this variant — there's no extractable shape to view/edit yet. Wrapping in Link would also conflict with the AlertDialog's portaled content (the Link click would race the dialog open)."
  - "handleDelete loses its event parameter. AlertDialogAction's onClick doesn't need preventDefault/stopPropagation because the Radix portal handles its own click isolation; the function signature is simpler without it. The manual variant's trailing-icon delete still calls handleDelete directly and ignores the event React passes — TypeScript-safe."
  - "i18n keys live under recipes.promotion, NOT a new inbox.failed namespace. CONTEXT.md D-16-06 initially suggested inbox.failed.* keys; the planner chose recipes.promotion.* in the PLAN to extend the existing Phase 2 namespace (in_flight / failed_badge / retry / retry_aria / success_toast). Single namespace = clearer ownership of promotion-state strings."

patterns-established:
  - "Pattern 1: Radix AlertDialog as the canonical destructive-confirm primitive. Replaces window.confirm for any Phase 16+ destructive flow."
  - "Pattern 2: Dual-fetch multi-status pattern for /inbox-style endpoints — issue Promise.all of single-status GETs and merge client-side until/unless backend gains multi-value support."
  - "Pattern 3: Canonical-status predicate refactor — when an enum value has been added across all locked-vocabulary sites (Plan 16-01), legacy ancillary-column workarounds (e.g. nullness checks on promotion_error) should be replaced with the canonical status === literal."

requirements-completed: [CAP-01, CAP-02]

# Metrics
duration: ~3.5min
completed: 2026-05-11
---

# Phase 16 Plan 04: Inbox failed-state Card + AlertDialog Summary

**Landed the user-visible half of CAP-01 + CAP-02: failed drafts now surface a complete French recovery affordance in /inbox — Fraunces-italic "Extraction échouée" label, truncated error context, 48px Réessayer + Supprimer (with Radix AlertDialog confirm). The `isFailed` predicate switched from the legacy `promotion_error != null` workaround to the canonical `recipe.status === "failed"` now that Plan 16-03 writes status alongside the error.**

## Performance

- **Duration:** ~3.5 min
- **Started:** 2026-05-11T14:33:52Z
- **Completed:** 2026-05-11T14:37:17Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- 7 new French i18n keys under `recipes.promotion.*` (failed_label, failed_context_fallback, delete, delete_aria, delete_confirm_title/body/cancel/confirm). All 5 pre-existing keys preserved (in_flight, failed_badge, retry, retry_aria, success_toast).
- `RecipeDraftCard.tsx` failed variant now renders the full D-16-06 layout: Fraunces-italic destructive-tinted "Extraction échouée" label, `line-clamp-2`-truncated `promotion_error` body, 48px Réessayer (default) + 48px Supprimer (ghost destructive) inline with `flex-1` each.
- Supprimer button wrapped in Radix AlertDialog (`AlertDialogTrigger asChild` → `AlertDialogContent` with header/description/footer); `window.confirm()` call site removed entirely from `handleDelete`.
- Failed variant rendered in a non-navigable `<div>` wrapper (vs the manual variant's `<Link>`), preventing Link/AlertDialog portal click conflicts.
- Trailing-icon Supprimer suppressed for failed variant via `!isProcessing && !isFailed` condition — manual variant still has its trailing icon.
- `isFailed` predicate refactored from `recipe.promotion_error != null` to canonical `recipe.status === "failed"`.
- `/inbox` initial fetch widened to `Promise.all([?status=draft, ?status=failed])` with client-side dedupe + sort by created_at DESC.
- Realtime `recipe.updated` branch widened: drops only on transition to structured/verified (not on draft→failed).
- Realtime `recipe.created` branch widened defensively to accept `failed`-status payloads.
- `tsc --noEmit` exits 0; `eslint` exits 0 on both touched component files.

## Task Commits

Each task committed atomically with `--no-verify` (parallel worktree):

1. **Task 1: Add failed-state i18n keys under recipes.promotion in fr.json** — `f5a87cf` (feat)
2. **Task 2: Failed-state Card layout with AlertDialog in RecipeDraftCard** — `8e50276` (feat)
3. **Task 3: Dual-fetch + realtime branches in /inbox page** — `a2705e3` (feat)

## Files Created/Modified

- `frontend/lib/i18n/fr.json` — extended `recipes.promotion` namespace with 7 new keys; all pre-existing keys preserved; valid JSON confirmed via `jq`.
- `frontend/components/RecipeDraftCard.tsx` — added AlertDialog imports, refactored `handleDelete` (removed event param + window.confirm), switched `isFailed` predicate to canonical status check, replaced failed-variant JSX with the full D-16-06 layout, suppressed trailing-icon delete for failed variant, wrapped failed variant in `<div>` instead of `<Link>`.
- `frontend/app/inbox/page.tsx` — widened initial fetch to `Promise.all` over draft + failed, added client-side dedupe + sort by created_at DESC, widened both realtime branches (`recipe.created` and `recipe.updated`) to treat `failed` as an inbox-resident status.

## Decisions Made

- **Two-GET-merge for the inbox refetch.** Plan 16-03 widened the backend `?status=` regex to accept `failed`, but the regex still accepts ONE value per request. Issuing `Promise.all` of two single-status GETs and merging client-side avoids a third backend edit; couple-scale workload makes the second GET's ~50-100ms negligible.
- **Canonical-status predicate refactor.** Pre-Plan-16-03 the FE relied on `recipe.promotion_error != null` as a proxy for the failed state because the backend never wrote `status='failed'`. Plan 16-03 fixed that. This plan removes the workaround — `isFailed` now reads `recipe.status === "failed"` for clarity at the variant-selection layer. The `isProcessing` predicate still references `promotion_error == null` (correctly — it's a "no failure yet seen" guard, not a state synonym).
- **AlertDialog replaces window.confirm for destructive flows.** Per D-16-06, the inline labeled Supprimer is a large tap target, so a native confirm prompt would be jarring on iOS Safari (PWA). Radix AlertDialog with localized French copy is the canonical pattern going forward.
- **Trailing-icon Supprimer hidden for failed variant.** Two Supprimer buttons on the same row would be visually noisy. The manual variant keeps the trailing icon because its primary action is taps-through-to-edit, not delete.
- **handleDelete loses its event param.** With AlertDialog gating the destructive action, there's no parent `<Link>` to `preventDefault` against (the failed variant is wrapped in `<div>`, not `<Link>`). Simpler signature; the manual variant's trailing icon still calls `handleDelete` directly — TypeScript-safe because React passes an event but the function just ignores it.
- **i18n under recipes.promotion, NOT inbox.failed.** CONTEXT.md D-16-06 suggested `inbox.failed.*` keys; the planner overrode that to extend the existing `recipes.promotion` namespace (line 60 of the plan). Single ownership for promotion-state strings; the existing keys live alongside the new ones.

## Forward Links

- **Plan 16-05** will add E2E Playwright specs that exercise the full failed-state flow end-to-end via the env-flag Gemini stub (Phase 10 D-04). The Plan 16-05 spec drives the exact UI shape this plan ships: AlertDialog open → confirm → row disappears via `recipe.deleted` broadcast.
- **`failed_badge` i18n key is now legacy.** The old failed-variant JSX used `<Badge variant="destructive">{tPromo("failed_badge")}</Badge>`; the new D-16-06 layout uses a Fraunces-italic label instead. The key stays in `fr.json` (not removed defensively in case any other surface uses it) but a future cleanup plan may remove it once `grep -r "failed_badge" frontend/` returns zero hits.

## Deviations from Plan

None — plan executed exactly as written. All three tasks landed without modifying any out-of-scope file. The TypeScript and ESLint checks passed on first run after each edit.

The only minor surface to flag: the prompt's `<success_criteria>` block listed `grep -n "inbox.failed" frontend/lib/i18n/fr.json` returning ≥ 2 matches. The PLAN's authoritative namespace decision (line 60 of 16-04-PLAN.md) overrode the original CONTEXT.md suggestion and placed keys under `recipes.promotion.*` instead. Effective coverage is equivalent — 7 failed-state keys live in fr.json under the correct semantic namespace, "Extraction échouée" is present, and the AlertDialog/h-12/retry-promotion criteria all pass.

## Issues Encountered

- None. Both pre-existing files were read once at the start of the session; subsequent Edit operations triggered "READ-BEFORE-EDIT REMINDER" PreToolUse hooks but the edits succeeded because the read-state was satisfied per the runtime.

## User Setup Required

None — no external service configuration required. The new i18n keys are loaded automatically via next-intl on the next page render; the AlertDialog primitive was already available in the codebase (used by other surfaces in Phase 5+).

## Threat Flags

None — no new threat surface introduced. The AlertDialog is a UI gate, not a security gate (the backend's household-scoped 404 on DELETE remains the actual auth boundary, accepted per T-16-04-01). `promotion_error` rendered to React is auto-escaped (T-16-04-02 mitigated). The merged draft+failed list cannot cross the household boundary because both `?status=draft` and `?status=failed` are backend-filtered on `Recipe.household_id == member.household_id` (T-16-04-04 mitigated).

## Next Phase Readiness

- CAP-01 + CAP-02 user-visible halves complete. End-to-end flow now reachable: backend writes `status='failed'` + `promotion_error` (Plan 16-03), the inbox fetch sees it (`?status=failed`), the card renders the D-16-06 layout, Réessayer kicks `retry-promotion`, Supprimer opens AlertDialog and hard-deletes on confirm.
- Plan 16-05 can now write Playwright specs against a stable UI shape. The Gemini env-flag stub from Phase 10 D-04 provides the deterministic failure path; the spec asserts the label, the truncated error, the AlertDialog open, and the post-delete row removal via realtime broadcast.

## Self-Check: PASSED

Verified after writing SUMMARY.md:

- `frontend/lib/i18n/fr.json` contains `failed_label: "Extraction échouée"` and 6 sibling new keys (`jq` confirmed valid JSON + all 13 keys present in `recipes.promotion`).
- `frontend/components/RecipeDraftCard.tsx` imports AlertDialog primitives, uses `recipe.status === "failed"` (FOUND), uses `tPromo("failed_label")` / `tPromo("failed_context_fallback")` / `tPromo("delete_confirm_title")` (FOUND), uses `line-clamp-2` for error text truncation (FOUND), has no active `window.confirm(` call site (FOUND), wraps failed variant in `<div>` via `isProcessing || isFailed` condition (FOUND), uses three `h-12` tap-target classes (FOUND).
- `frontend/app/inbox/page.tsx` contains `Promise.all`, `?status=failed`, and `payload.status !== "draft" && payload.status !== "failed"` in both realtime branches (FOUND).
- `cd frontend && npx tsc --noEmit --project tsconfig.json` exited 0.
- `cd frontend && npx eslint --no-error-on-unmatched-pattern components/RecipeDraftCard.tsx app/inbox/page.tsx` exited 0.
- Commit `f5a87cf` (Task 1) — FOUND in git log.
- Commit `8e50276` (Task 2) — FOUND in git log.
- Commit `a2705e3` (Task 3) — FOUND in git log.

---
*Phase: 16-capture-pipeline-correctness*
*Completed: 2026-05-11*
