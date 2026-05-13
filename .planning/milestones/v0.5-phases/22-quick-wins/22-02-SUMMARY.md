---
phase: 22
plan: 22-02-version-footer
subsystem: frontend/settings
tags: [version-footer, build-stamp, env-vars, settings, qw-02]
dependency_graph:
  requires: []
  provides: [build-stamp-footer, version-env-vars]
  affects: [frontend/app/settings/page.tsx]
tech_stack:
  added: []
  patterns: [build-time-env-re-export, client-component-env-read]
key_files:
  created:
    - frontend/components/VersionFooter.tsx
  modified:
    - frontend/next.config.ts
    - frontend/app/settings/page.tsx
decisions:
  - "Build-time env re-export via next.config.ts env block (not runtime fetch)"
  - "Branch-free component — defaults flow from next.config.ts, no conditional hiding"
  - "SHA rendered as plain text per D-09 — no GitHub link coupling"
  - "aria-label added for accessibility"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-12"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 22 Plan 02: Version Footer Summary

**One-liner:** Build-time env re-export in next.config.ts + VersionFooter client component rendering `v{version} · {sha} · {env}` at the bottom of /settings.

## What Was Built

Added a per-device build-stamp footer to the bottom of the Settings page. Three pieces: app version from `package.json` via `npm_package_version`, short 7-char git SHA from `VERCEL_GIT_COMMIT_SHA`, and Vercel environment (`production`/`preview`/`development`).

The implementation uses Next.js build-time env inlining: `next.config.ts` re-exports server-side Vercel env vars as `NEXT_PUBLIC_*` keys so they get baked into the client bundle at build time — no runtime API call, no FOUC, no blank values.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add NEXT_PUBLIC env re-export block to next.config.ts | 9192a25 | frontend/next.config.ts |
| 2 | Create VersionFooter client component | 16c6f9c | frontend/components/VersionFooter.tsx |
| 3 | Mount VersionFooter at bottom of Settings page | 6d194fe | frontend/app/settings/page.tsx |

## Decisions Made

- **Build-time env re-export:** `next.config.ts` `env` block re-exports `VERCEL_GIT_COMMIT_SHA` (sliced to 7 chars) and `VERCEL_ENV` as `NEXT_PUBLIC_*` vars. Local dev falls back to `"dev"` / `"development"` via nullish coalescing. No runtime server call needed.
- **Branch-free component:** D-08 honored — no `if (env === "production") return null`. The env label always renders for maximum diagnostic clarity per D-07.
- **Plain text SHA:** D-09 honored — no `<a href>` to GitHub, avoids coupling to `lucaguery/al-dente` repo URL.
- **Accessibility:** `aria-label="Version de l'application"` added per CONTEXT.md discretion guidance.
- **Middle dot separator:** U+00B7 (`·`) used throughout, not em-dash, pipe, or slash per D-06 / REQUIREMENTS spec.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all three env vars are wired through the `next.config.ts` re-export block. Local dev shows real `package.json` version + `"dev"` + `"development"`. Production shows real SHA + `"production"`. No placeholder text, no hardcoded empty values.

## Threat Flags

None — threat model fully reviewed. T-22-02-01 through T-22-02-03 all accepted per plan (low/none severity; no PII, no secrets, no auth tokens in the exposed env vars).

## Self-Check: PASSED

- `frontend/components/VersionFooter.tsx` — FOUND
- `9192a25` (next.config.ts env block) — FOUND
- `16c6f9c` (VersionFooter component) — FOUND
- `6d194fe` (settings page mount) — FOUND
- `grep -n "NEXT_PUBLIC_GIT_SHA" frontend/next.config.ts` — 1 match at line 94
- `grep -n "VersionFooter" frontend/app/settings/page.tsx` — 2 matches (import line 13 + render line 546)
- `grep -n "·" frontend/components/VersionFooter.tsx` — match at line 25 (render line)
- `npx tsc --noEmit` — PASSED
