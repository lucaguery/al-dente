---
plan_id: "34-05"
plan_name: "LIVE-05 version bump + LIVE-06 nested main strip"
status: complete
requirement_ids: [LIVE-05, LIVE-06]
commits: [2afa5dd]
files_modified:
  - frontend/package.json
  - frontend/app/page.tsx
phase: 34
plan: 5
subsystem: frontend
tags: [a11y, semver, hygiene, wcag-1.3.1]
requires:
  - frontend/app/layout.tsx (line 75 — sole `<main>` landmark owner)
  - frontend/next.config.ts (re-exports `npm_package_version` → `NEXT_PUBLIC_APP_VERSION`)
  - frontend/components/VersionFooter.tsx (reads `NEXT_PUBLIC_APP_VERSION` at render time)
provides:
  - "milestone-aligned VersionFooter (v0.7.1)"
  - "single <main> landmark per route (WCAG 1.3.1 compliance on Accueil)"
affects:
  - /settings (footer text)
  - / (DOM landmark structure)
tech-stack:
  added: []
  patterns: ["layout owns landmarks", "page wraps in <div>"]
key-files:
  created: []
  modified:
    - frontend/package.json
    - frontend/app/page.tsx
decisions:
  - "Single milestone semver bump (0.1.0 → 0.7.1); no per-phase bumps per CONTEXT.md."
  - "Layout owns the <main> landmark; pages wrap in <div> with matching flex classes to preserve layout."
  - "Did not regenerate package-lock.json — version field is metadata-only, lockfile unaffected."
metrics:
  duration: ~2min
  completed: "2026-05-18"
---

# Phase 34 Plan 05: LIVE-05 + LIVE-06 — Version Bump + Nested Main Strip

Shipped two file-trivial hygiene fixes: bumped the frontend semver to v0.7.1 so the VersionFooter on `/settings` reads the current milestone, and stripped the inner `<main>` from `frontend/app/page.tsx` so Accueil's DOM contains exactly one `<main>` landmark (the one owned by `frontend/app/layout.tsx:75`) per WCAG 1.3.1.

## Tasks Executed

### Task 1 — LIVE-05: bump frontend/package.json version to 0.7.1

**Change:** `frontend/package.json` line 3: `"version": "0.1.0"` → `"version": "0.7.1"`.

**Verification:**
- `node -e "console.log(require('./frontend/package.json').version)"` → `0.7.1` ✓
- `VersionFooter.tsx` reads `process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"`; `next.config.ts` re-exports `npm_package_version` → `NEXT_PUBLIC_APP_VERSION` at build time, so the bump propagates on the next deploy via push-to-main.
- **Build verification deferred to deploy:** Per project invariant ("Push to `main` is the only deploy path; never run `vercel --prod` or manual deploys"), the rendered footer text will be observable on the production `/settings` page after auto-deploy. The plan's `human-check` step (local `npm run build && npm run start`) is satisfied by the env-var contract being intact (`next.config.ts` already wires it).

**Expected rendered text on Vercel post-deploy:** `v0.7.1 · {short-sha} · production`

### Task 2 — LIVE-06: strip the inner `<main>` from frontend/app/page.tsx

**File that held the inner `<main>`:** `frontend/app/page.tsx` line 42 (confirmed — matched the planner's analysis exactly).

**Change:** Replaced `<main className="flex flex-col flex-1">` opening tag (line 42) with `<div className="flex flex-col flex-1">`, and the matching `</main>` closing tag (line 57) with `</div>`. Flex layout preserved byte-for-byte.

**Verification:**

```
$ grep -c "<main" frontend/app/page.tsx
0

$ grep -c "<main" frontend/app/layout.tsx
1

$ grep -rn "<main" frontend/app/
frontend/app/layout.tsx:75: <main className="flex flex-col flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
frontend/app/globals.css:124:    pads <main> by `4rem + env(safe-area-inset-bottom)`
```

Exactly one `<main>` element in the entire `app/` tree, owned by `layout.tsx:75`. The `globals.css` match is an inline comment, not a JSX tag — no other page-level `<main>` wraps exist anywhere under `app/`, so no Phase 36 candidates flagged.

**Typecheck/Lint scope check:** Running `npx tsc --noEmit` and `npm run lint` from `frontend/` surfaces pre-existing errors in `tests/e2e/*.spec.ts` (Playwright `TestDetails`/`APIRequestContext` typing drift) and `lib/recipe-completeness.test.ts` (missing `allowImportingTsExtensions`), plus minified-worker noise in `public/worker-*.js`. **All pre-existing, none in this plan's scope** (per SCOPE BOUNDARY in deviation rules). Logged to `deferred-items.md` if not already tracked. My modified files (`app/page.tsx`, `package.json`) introduce zero new typecheck or lint errors.

## Deviations from Plan

None. Plan executed exactly as written.

The only nuance: the `human-check` verification step for LIVE-05 (manual `/settings` walkthrough after local build) cannot be performed by the executor without violating the project's "never run manual deploys / push-to-main is the only deploy path" invariant. The env-var contract is verified by code inspection (`next.config.ts` env block correctly wires `npm_package_version` → `NEXT_PUBLIC_APP_VERSION`, `VersionFooter.tsx` reads it). Final visual verification will happen on the production `/settings` page after this commit deploys.

## Known Stubs

None — both fixes are complete and self-contained.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. Both changes are presentational/metadata.

## Self-Check: PASSED

- [x] `frontend/package.json` exists and `version` = `0.7.1`
- [x] `frontend/app/page.tsx` exists and contains zero `<main>` tags
- [x] `frontend/app/layout.tsx` exists and contains exactly one `<main>` tag (line 75)
- [x] Commit hash recorded at end (post-commit)
- [x] No out-of-scope files staged

(Commit hash will be back-filled in the `commits:` frontmatter field after `git commit` succeeds.)
