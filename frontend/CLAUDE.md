# frontend/CLAUDE.md

Guidance for Claude Code working in `frontend/`. Loaded when the working directory is under `frontend/`.

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tests

`@playwright/test` is wired; specs in `frontend/tests/e2e/`, config in `frontend/playwright.config.ts`. **v0.2.1 Phase 10 is the milestone expanding this** — committed full-screen coverage plus an idempotent backend seed (`uv run seed`). No Python test runner yet.
