# frontend/CLAUDE.md

Guidance for Claude Code working in `frontend/`. Loaded when the working directory is under `frontend/`.

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tests

`@playwright/test` is wired; specs in `frontend/tests/e2e/`, config in `frontend/playwright.config.ts`. **v0.2.1 Phase 10 is the milestone expanding this** — committed full-screen coverage plus an idempotent backend seed (`uv run seed`). No Python test runner yet.

## Local dev / test env

`uv run seed` populates `recipes.photo_paths` but does **not** upload bytes — Supabase Storage isn't configured in the test env (`playwright.config.ts` withholds `SUPABASE_*` for hermeticity). Every `<img>` for a seeded recipe therefore 404s on the signed-URL fetch; `useSignedPhotoUrl` then falls back to `/demo-fixtures/{cuisine}.svg` (or `default.svg`). Console noise from these 404s is expected and not a regression — the Patine view is the worst case (all 21 recipes mount at once). The prod-synthetic seed (`run_prod_synthetic_seed`) is the path that uploads real JPGs end-to-end when Storage creds are present (gh#44).
