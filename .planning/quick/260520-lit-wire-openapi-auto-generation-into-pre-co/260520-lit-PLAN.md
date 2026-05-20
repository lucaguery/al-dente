---
quick_id: 260520-lit
description: Wire OpenAPI auto-generation into pre-commit (husky + lint-staged + dump_openapi.py + hook)
status: ready
created: 2026-05-20
mode: quick
tasks: 6
---

# Plan — Wire OpenAPI auto-generation into pre-commit

Establish a pre-commit gate that regenerates `docs/api/openapi.json` and
`docs/api/endpoints.md` whenever a backend router or its dependency graph
changes. Mechanism: **husky** (git hooks) + **lint-staged** (file-glob
dispatch) + a new stdlib-only `backend/scripts/dump_openapi.py` Python script
that imports `app.main` and serializes `app.openapi()` deterministically.
The `uat-tester` agent skill is then re-pointed at the auto-generated
endpoints reference so its cheat sheet never drifts again.

**Why pre-commit (not PostToolUse hook):** universal — works regardless of
which editor/agent runs `git commit`. Husky's `prepare` script makes the
hook self-installing for any contributor (or future agent) cloning the repo.

**Sequencing:** Tasks 1 → 2 → 3 → 4 → 5 → 6. Each commit is atomic; do NOT
batch. Commit messages are pre-written below — use verbatim.

---

## Task 1: Install husky + lint-staged; register prepare script; add manual-regen npm alias

**Files:** `frontend/package.json`, `frontend/package-lock.json` (regenerated)
**Type:** chore

### Action
Add `husky` and `lint-staged` as `devDependencies` in `frontend/package.json`.
Use latest stable majors (husky ^9, lint-staged ^16 — versions current as of
2026-05-20; pin exact resolved versions via `npm install --save-dev`). Add a
`"prepare": "cd .. && husky frontend/.husky"` script entry so that any
contributor running `npm install` in `frontend/` auto-installs the hooks at
the repo root. NOTE: husky v9+ no longer needs `husky install` — just naming
the hooks directory via `husky <dir>` is enough.

Adjust the `prepare` invocation so it runs from the **repo root** (because
the `.git` directory lives at `/Users/gulu3001/dev/al-dente/.git`, not inside
`frontend/`). The `cd ..` form above is the simplest reliable path; husky
will write hooks into `frontend/.husky/` and configure `core.hooksPath`
accordingly.

**Also add a manual-regen npm script** in the same `package.json` edit
(rides along with this commit, not its own):

```json
"openapi-dump": "cd .. && bash scripts/openapi_hook_gate.sh"
```

Purpose: give developers (and future agents) a memorable
`npm run openapi-dump` command for manual regen — e.g. after editing a
Pydantic schema in `backend/app/schemas/` that isn't covered by the
router-file trigger. The alias reuses the gate script (Task 4) rather than
the bare Python dumper so manual runs go through the same env-loading +
re-staging path as the hook. This avoids drift between "what the hook
does" and "what the manual command does." NOTE: the gate script doesn't
exist yet at this commit — running the alias will fail until Task 4 lands.
That's fine; the alias is a forward declaration.

Run `npm install` once to (a) populate `node_modules`, (b) regenerate
`package-lock.json` with the new entries, (c) trigger the prepare script
which scaffolds `frontend/.husky/`. Confirm `git config --get core.hooksPath`
returns `frontend/.husky` (or equivalent) after install.

Do NOT add Prettier — `frontend/CLAUDE.md` enforces ESLint as the sole
formatter. Do NOT add any other dev dependency.

### Verify
`grep -E '"husky"|"lint-staged"' frontend/package.json` returns 2 matches in
the `devDependencies` block. `grep -E '"prepare"|"openapi-dump"'
frontend/package.json` returns 2 matches in the `scripts` block.
`cd frontend && npm install` exits 0. `git config --get core.hooksPath`
returns a path under `frontend/.husky` (or husky's default). `ls
frontend/.husky/` shows the scaffolded directory.

### Done
Two new devDeps + two new script entries in `package.json`, lockfile
updated, husky directory scaffolded at `frontend/.husky/`. No other files
touched.

### Commit
`chore(deps): add husky + lint-staged + openapi-dump alias`

---

## Task 2: lint-staged config — dispatch by file glob

**Files:** `frontend/package.json`, `frontend/.lintstagedrc.json` (NEW — preferred form to keep package.json lean)
**Type:** chore

### Action
Create `frontend/.lintstagedrc.json` with two top-level globs:

```json
{
  "*.{ts,tsx,js,jsx,mjs,cjs}": "eslint --max-warnings=0",
  "../backend/app/routers/**/*.py": "../scripts/openapi_hook_gate.sh"
}
```

- The first glob runs ESLint on staged frontend source. `--max-warnings=0`
  matches the project posture (ESLint is the sole authority — see
  `frontend/CLAUDE.md`).
- The second glob is the trigger for the OpenAPI regen path; the gate script
  (created in Task 4) decides whether to actually invoke the Python dumper,
  re-stage outputs, and append to the commit.

DO NOT add Prettier, stylelint, or any other formatter. DO NOT add globs for
`backend/app/models/`, `backend/app/services/`, or `backend/app/schemas/` —
those changes may affect the schema indirectly, but the gate stays scoped
to router files for the MVP. Schema-affecting model changes will simply ride
along with the router edit that exposes them, or surface as a follow-up.

In `frontend/package.json`, do NOT add a top-level `"lint-staged"` config
block — keep configuration in the dedicated dotfile so future config growth
doesn't pollute the manifest. Confirm husky knows where to find the config
(default: it reads `.lintstagedrc*` from the directory it runs in).

### Verify
`cat frontend/.lintstagedrc.json` shows valid JSON with both globs.
`node -e "JSON.parse(require('fs').readFileSync('frontend/.lintstagedrc.json','utf8'))"`
exits 0. `grep '"lint-staged"' frontend/package.json` returns ZERO matches
(no inline block).

### Done
Single new file `frontend/.lintstagedrc.json`. `package.json` untouched
beyond Task 1's edits. No script file invoked yet — Task 4 wires the gate.

### Commit
`chore(lint-staged): config — ESLint on TS, OpenAPI gate on backend routers`

---

## Task 3: `backend/scripts/dump_openapi.py` — deterministic OpenAPI dumper

**Files:** `backend/scripts/dump_openapi.py` (NEW), `docs/api/openapi.json` (NEW — initial generated artifact), `docs/api/endpoints.md` (NEW — initial generated artifact)
**Type:** feat

### Action
Create a Python 3.12 stdlib-only script (FastAPI already covers everything —
no new packages). Lives under `backend/scripts/` so that `app.main` imports
work cleanly when invoked from inside `backend/` as
`uv run python scripts/dump_openapi.py` — no `../` import gymnastics
required. Behavior:

1. **Environment guard (loud failure):** Before importing `app.main`, verify
   `os.environ` contains the variables `pydantic_settings.BaseSettings`
   requires: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `GEMINI_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`.
   If ANY is missing, print to stderr:

   ```
   [dump_openapi] FATAL: required env vars missing: <list>.
   Source .env.test.example (or .env) before running, e.g.:
     set -a && source ../.env.test.example && set +a && uv run python scripts/dump_openapi.py
   ```

   …then `sys.exit(2)`. Do NOT silently produce a broken output.

   **Note on `.env.test.example` contents (verified 2026-05-20):** it only
   contains `ENVIRONMENT`, `DATABASE_URL_TEST`, `SEED_AUTH_TOKEN`,
   `NEXT_PUBLIC_API_BASE`. The Supabase/Gemini/VAPID vars are NOT in the
   example file. For CLI usage the script accepts placeholder values — any
   non-empty string satisfies `BaseSettings`. The gate script in Task 4
   exports placeholders if the calling shell hasn't set them, so the hook
   is always functional.

2. **App import:** `from app.main import app`. Wrap in try/except — if
   import fails, print the underlying error and exit 2.

3. **Schema extraction:** `schema = app.openapi()` (returns the dict
   FastAPI auto-builds from routers + dependencies + Pydantic models).

4. **Determinism:**
   - Sort `schema["paths"]` by key.
   - For each path, sort the HTTP-method dict by key
     (`get` < `patch` < `post` < `put` < `delete`).
   - Sort `schema["tags"]` list by `name`.
   - Sort `schema["components"]["schemas"]` by key if present.
   - JSON dump with `sort_keys=True, indent=2, ensure_ascii=False`,
     trailing newline.

5. **Output paths:** The script resolves the repo root via
   `Path(__file__).resolve().parents[2]` (`backend/scripts/dump_openapi.py`
   → repo root two levels up). Writes go to `<repo_root>/docs/api/openapi.json`
   and `<repo_root>/docs/api/endpoints.md`.

6. **Atomic write:** Write to `docs/api/openapi.json.tmp`, then
   `os.replace(...)` to `docs/api/openapi.json`. Same dance for the
   markdown file. This protects against concurrent pre-commit runs
   corrupting the artifacts.

7. **Markdown summary (`docs/api/endpoints.md`):**
   - Header: `# Al Dente API — endpoint reference\n\nGenerated by \`backend/scripts/dump_openapi.py\`. Do not edit by hand.\n`
   - NO timestamps (determinism). NO "generated at <date>" line.
   - One section per **tag** (sorted alphabetically), then per **path** (sorted),
     then per **method** (sorted). For each endpoint, render:
     - `### {METHOD} {path}` heading
     - The first sentence of the docstring as a one-liner summary
       (read from `schema["paths"][path][method]["description"]` —
       FastAPI puts the docstring there by default; take everything up to
       the first `.` or `\n\n`).
     - `**Auth:** required` if the endpoint's dependencies include
       `current_member` (detect by inspecting the `parameters` array for an
       `Authorization` header param OR by checking the dependency tree —
       simplest heuristic: scan `schema["paths"][path][method]["security"]`
       or the `parameters` list for any param sourced from
       `app.auth.current_member`. **Fallback heuristic if introspection is
       brittle:** assume auth-required unless the path is `/healthz` or
       lives under `/auth/` (login/session endpoints) — and document the
       heuristic in a comment at the top of the markdown emitter function).
     - `**Request body:** {schema name}` if `requestBody` present.
     - `**Responses:** {status codes, comma-joined}`.

8. **CLI:** `if __name__ == "__main__":` runs the full pipeline. No CLI
   flags. Exit 0 on success.

9. **Module-level docstring:** explain that this script is invoked by
   `.husky/pre-commit` via `scripts/openapi_hook_gate.sh` (Task 4) and that
   its output must be deterministic across runs. Note the canonical
   invocation: `cd backend && uv run python scripts/dump_openapi.py`.

Run the script ONCE in this task with env loaded
(`cd backend && set -a && source ../.env.test.example && export DATABASE_URL=postgresql://x SUPABASE_URL=x SUPABASE_SERVICE_ROLE_KEY=x GEMINI_API_KEY=x VAPID_PUBLIC_KEY=x VAPID_PRIVATE_KEY=x VAPID_EMAIL=x@x && set +a && uv run python scripts/dump_openapi.py`)
to produce the initial `docs/api/openapi.json` + `docs/api/endpoints.md`
artifacts. These ship in this same commit so the baseline is established
before the hook goes live in Task 4.

### Verify
`cd backend && uv run python scripts/dump_openapi.py` (with env loaded)
exits 0. `docs/api/openapi.json` exists, is valid JSON
(`python -c "import json; json.load(open('docs/api/openapi.json'))"` exits 0),
and contains a non-empty `paths` object with all current routers
(households, ws, auth_session, recipes, exports, photos, shortlist, votes,
cooking_logs, push). `docs/api/endpoints.md` exists with one section per
tag. Running the script twice produces byte-identical output
(`md5sum docs/api/openapi.json` matches across runs). Missing env vars test:
`unset DATABASE_URL && uv run python scripts/dump_openapi.py` exits 2 with
the loud stderr message.

### Done
Three new files: the script + two generated artifacts. No backend code
modified. No new Python packages. Deterministic output verified.

### Commit
`feat(scripts): dump_openapi.py — deterministic FastAPI schema dumper + initial baseline`

---

## Task 4: `.husky/pre-commit` + gate script — wire the pipeline

**Files:** `frontend/.husky/pre-commit` (NEW), `scripts/openapi_hook_gate.sh` (NEW)
**Type:** feat

### Action

**`frontend/.husky/pre-commit`** (executable, `chmod +x`):

```sh
#!/usr/bin/env sh
cd frontend && npx lint-staged
```

(Husky v9+ no longer needs the `. "$(dirname -- "$0")/_/husky.sh"` shim —
the hooks directory is configured via `core.hooksPath` directly. Keep the
file minimal.)

**`scripts/openapi_hook_gate.sh`** (executable, `chmod +x`):

The script is invoked by `lint-staged` whenever any file under
`backend/app/routers/**/*.py` is staged. lint-staged passes the staged file
paths as positional args — the gate ignores them (it always regenerates
both artifacts; it's the existence of the trigger that matters, not the
specific file list). Lives at repo-root `scripts/` (not `backend/scripts/`)
because it's the cross-cutting orchestrator, not Python source.

Behavior:

1. **Resolve repo root:** `REPO_ROOT="$(git rev-parse --show-toplevel)"`.
   `cd "$REPO_ROOT"`.

2. **Load env:** Source `.env.test.example` if it exists; otherwise
   source `.env` if it exists; otherwise print a clear error to stderr
   and exit non-zero:

   ```
   [openapi-gate] FATAL: no env file found at .env.test.example or .env.
   The OpenAPI dump script needs DATABASE_URL / SUPABASE_* / GEMINI_API_KEY /
   VAPID_* defined. Create .env.test (copy from .env.test.example) or .env
   and re-commit.
   ```

   Use `set -a; . "$REPO_ROOT/.env.test.example"; set +a` (or `.env` fallback)
   so the vars export into the script's environment.

3. **Inject placeholders for missing Supabase/Gemini/VAPID vars:** Since
   `.env.test.example` only contains the test-mode subset, the gate
   exports harmless placeholder strings for any of the seven required vars
   that remain unset after sourcing. This makes the hook work for any
   contributor without forcing them to maintain a full `.env`:

   ```sh
   : "${DATABASE_URL:=postgresql://placeholder}"
   : "${SUPABASE_URL:=https://placeholder.supabase.co}"
   : "${SUPABASE_SERVICE_ROLE_KEY:=placeholder}"
   : "${GEMINI_API_KEY:=placeholder}"
   : "${VAPID_PUBLIC_KEY:=placeholder}"
   : "${VAPID_PRIVATE_KEY:=placeholder}"
   : "${VAPID_EMAIL:=placeholder@example.com}"
   export DATABASE_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY GEMINI_API_KEY VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_EMAIL
   ```

4. **Run the dumper from `backend/`:** `cd "$REPO_ROOT/backend" && uv run
   python scripts/dump_openapi.py`. The `uv run` form ensures the backend's
   pinned interpreter + dependencies are on PATH. The script lives at
   `backend/scripts/` (per Task 3) so the import path is clean — no `../`
   gymnastics. If the dumper exits non-zero, the gate exits non-zero too —
   `lint-staged` will abort the commit with the dumper's stderr surfaced.

5. **Re-stage outputs:** After successful generation,
   `cd "$REPO_ROOT" && git add docs/api/openapi.json docs/api/endpoints.md`
   so the regenerated artifacts ride along in the same commit that
   triggered the gate.

6. **Exit 0** on success.

**Shell discipline:** use `#!/usr/bin/env sh` with `set -eu` at the top.
No bash-isms. Quote all variable expansions. The script must work on
both macOS BSD utilities (the developer's Mac) and Linux GNU utilities
(future CI).

### Verify
`ls -la frontend/.husky/pre-commit scripts/openapi_hook_gate.sh` shows both
files with execute bit set. `git config --get core.hooksPath` points at
husky's directory. Smoke test: touch `backend/app/routers/photos.py`
(add a trailing newline — non-semantic), `git add backend/app/routers/photos.py`,
then `git commit -m "test: hook smoke"` — the commit should fire the gate,
regenerate the artifacts, and include them in the commit. `git log -1
--stat` shows `docs/api/openapi.json` and `docs/api/endpoints.md` in the
commit even though they weren't manually staged. Then `git reset --soft
HEAD~1 && git reset HEAD .` to back out the smoke commit before proceeding.

### Done
Two new executable script files. The pre-commit pipeline is live: routers
change → gate fires → dumper regenerates → artifacts re-stage. No backend
or frontend source modified.

### Commit
`feat(hooks): pre-commit OpenAPI regen gate (husky + lint-staged + dumper)`

---

## Task 5: Re-point uat-tester agent at canonical endpoints reference

**Files:** `.claude/agents/uat-tester.md` (modified — Endpoint cheat sheet section only)
**Type:** chore

### Action
The `uat-tester` agent skill currently ships an inline endpoint cheat sheet
table inside its `<environment_prerequisites>` block. That table drifts
the moment any router signature changes — it's exactly the kind of
hand-maintained reference the new pre-commit hook eliminates.

Replace the static cheat sheet with a 3-line intro pointing at
`docs/api/endpoints.md` as the canonical source, then keep a short
fallback table (~5 rows) for the endpoints UAT-tester invokes most often,
so offline reading still works when the agent runs without filesystem
access to the docs tree.

**Intro replacement (3 lines, verbatim):**

```markdown
The canonical endpoint reference is `docs/api/endpoints.md` — regenerated
automatically by the pre-commit hook (`scripts/openapi_hook_gate.sh`)
whenever a backend router changes. Read that file first; the table below
is a fallback for the endpoints UAT touches most often.
```

**Fallback table (keep exactly these 5 rows, in this order):**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/healthz` | Liveness probe (no auth) — sanity check before any UAT scenario |
| GET | `/api/households/by-code/{code}` | Resolve invite code → household preview (onboarding join flow) |
| POST | `/api/households/join` | Join household with invite code + chosen color |
| DELETE | `/api/auth/session` | Sign out — clears `aldente_auth` HttpOnly cookie |
| GET | `/api/shortlists/today` | Daily shortlist for the current household (primary deck surface) |

Delete every other row from the previous cheat sheet. Do NOT touch any
other section of `uat-tester.md` (its scenarios, voice/persona rules,
toolkit references, etc.). Do NOT delete the entire
`<environment_prerequisites>` block — just rewrite the cheat-sheet
subsection within it.

### Verify
`grep -n 'docs/api/endpoints.md' .claude/agents/uat-tester.md` returns at
least one match in the `<environment_prerequisites>` block.
`grep -cE '^\| (GET|POST|DELETE|PUT|PATCH) ' .claude/agents/uat-tester.md`
returns exactly `5` (the fallback rows; counts table rows by leading
`| METHOD ` prefix). Visual scan: the intro paragraph reads as a redirect,
not a complete reference.

### Done
One file modified. Endpoint cheat sheet shrunk from inline table to
intro-plus-5-row fallback. All other agent content untouched.

### Commit
`chore(uat-tester): point endpoint cheat sheet at docs/api/endpoints.md`

---

## Task 6: Document the auto-generated artifacts in CLAUDE.md `Doc lifecycle`

**Files:** `CLAUDE.md`, `scripts/docs-audit` (only IF the audit's ignore list needs to learn the new generated paths — inspect first; skip the file entirely if its existing logic already handles `docs/api/*` cleanly)
**Type:** docs

### Action

**In `CLAUDE.md` `## Doc lifecycle` section,** insert a new bullet after the
existing `graphify-out/` bullet (which is the closest analog — also
auto-generated, also not hand-edited):

```
- `docs/api/openapi.json` + `docs/api/endpoints.md` — auto-generated by `backend/scripts/dump_openapi.py`, invoked by the pre-commit hook (`frontend/.husky/pre-commit` → `scripts/openapi_hook_gate.sh`) whenever any file under `backend/app/routers/` is staged. Deterministic output (sorted keys, no timestamps). NEVER hand-edit — the next router commit will clobber your changes. For manual regen run `cd frontend && npm run openapi-dump`. The script is stdlib-only Python and requires the same `BaseSettings` env vars as the FastAPI app at import time; the gate script auto-loads `.env.test.example` (or `.env`) and falls back to placeholder values for Supabase/Gemini/VAPID secrets when unset. The `uat-tester` agent skill (`.claude/agents/uat-tester.md`) points at `docs/api/endpoints.md` as its canonical endpoint reference.
```

**In `scripts/docs-audit`:** Inspect first
(`grep -n 'openapi\|docs/api' scripts/docs-audit.py`). If the audit already
walks `docs/` and would flag the new files as missing `last_verified`
front-matter, add `docs/api/openapi.json` and `docs/api/endpoints.md` to
its ignore list (the same way it ignores other auto-generated outputs).
If the audit's existing logic already skips JSON files or only inspects
specific filename patterns that don't match, SKIP this file entirely —
do NOT make defensive edits.

### Verify
`grep -n 'endpoints.md' CLAUDE.md` returns at least one match in the Doc
lifecycle section. The bullet sits adjacent to the `graphify-out/` bullet
(or wherever the auto-generated docs cluster is). If `scripts/docs-audit`
was modified, `scripts/docs-audit` (run from repo root) exits 0 and does
NOT report `docs/api/openapi.json` or `docs/api/endpoints.md` as stale.

### Done
One bullet added to CLAUDE.md. Optionally one ignore-list entry in
`scripts/docs-audit` (only if audit logic required it). No other docs
touched.

### Commit
`docs(claude): document OpenAPI auto-generation in Doc lifecycle`

---

## Env-var requirement for the dump_openapi.py script

The script imports `app.main` which uses `pydantic_settings.BaseSettings`.
In a fresh shell with no env loaded, the import will fail because required
vars (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`GEMINI_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`)
are missing. For BOTH the initial generation (Task 3) AND every pre-commit
hook run (Task 4), the env contract is:

```bash
source .env.test.example  # ENVIRONMENT=test + DATABASE_URL_TEST + minimal vars
```

The hook gate script (Task 4) MUST source this file before invoking the
Python script, otherwise router-change commits will fail for any developer
who hasn't pre-loaded their shell env. Add a fallback: if `.env.test.example`
doesn't exist (e.g. in a future restructure), source `.env` instead, and if
neither exists print a clear error and exit non-zero.

**Verified 2026-05-20:** `.env.test.example` ships with only the test-mode
subset (`ENVIRONMENT`, `DATABASE_URL_TEST`, `SEED_AUTH_TOKEN`,
`NEXT_PUBLIC_API_BASE`). The gate script (Task 4) therefore ALSO exports
harmless placeholder strings for any of the seven required vars that
remain unset after sourcing, so the hook works for contributors without a
full `.env`. This is safe because the script never actually connects to
Supabase, Gemini, or the database — it only calls `app.openapi()` which
reads the in-memory FastAPI app metadata.

---

## End-of-plan verification (NOT a commit — for SUMMARY)

After Task 6 commits, run a real smoke test:

```bash
# 1. Confirm hooks are installed
git config --get core.hooksPath   # → frontend/.husky (or husky's path)

# 2. Touch a router and commit — gate must fire
echo "# trigger openapi regen" >> backend/app/routers/photos.py
git add backend/app/routers/photos.py
git commit -m "chore: smoke test openapi hook"

# 3. Inspect the commit
git log -1 --stat
# → should list backend/app/routers/photos.py
#    AND docs/api/openapi.json
#    AND docs/api/endpoints.md

# 4. Back out the smoke commit
git reset --hard HEAD~1

# 5. Manual regen path
cd frontend && npm run openapi-dump
# → exits 0; if no router changed, `git status` is clean (deterministic)
```

---

## Hard scope rules — files NOT to touch

- `backend/app/routers/**` — read only. No `summary=...` retrofitting,
  no docstring rewrites, no new endpoints, no decorator changes.
- `backend/app/models/**`, `backend/app/services/**`,
  `backend/app/schemas/**` — zero changes. Schema-affecting refactors are
  out of scope for this quick.
- `backend/alembic/**` — no migrations.
- `backend/pyproject.toml` — no new Python deps. The dumper is stdlib-only;
  FastAPI is already present.
- `frontend/components/**`, `frontend/lib/**`, `frontend/app/**` — zero
  product code changes.
- `frontend/next.config.ts` and `frontend/proxy.ts` — read only. No env
  changes, no rewrite changes. The OpenAPI artifacts are static files;
  they don't need a rewrite route.
- `frontend/eslint.config.mjs` — read only. The lint-staged config invokes
  ESLint via CLI; no config-file edit is needed.
- `frontend/playwright.config.ts`, `frontend/tests/e2e/**` — out of scope.
  Hook smoke testing is a one-shot manual walk, not an E2E spec.
- `.github/workflows/**` — out of scope. CI doesn't need a separate
  OpenAPI check yet; the pre-commit gate is sufficient until artifacts
  diverge in practice.
- `.claude/agents/**` except `uat-tester.md` (Task 5) — do NOT touch
  other agent skills.
- Vercel / Railway deploy configs — zero changes. Push-to-main remains
  the only deploy path.
- `SPEC.md`, `CONTEXT.md`, `RUNBOOK.md`, `TESTING.md`, `README.md`,
  `docs/adr/**`, `docs/design-system.html` — out of scope. Only
  `CLAUDE.md` Doc lifecycle section gets the new bullet (Task 6).
- `.planning/**` — orchestrator handles status / STATE.md updates.
- `graphify-out/**` — separate auto-generated tree; don't touch.

### Scope-creep guardrails (executor must obey)

1. If a file is not in the current task's `Files:` list, do NOT edit it —
   even for a "drive-by improvement." Surface it as a follow-up note in
   SUMMARY.md instead.
2. The dumper MUST be stdlib-only Python (plus FastAPI which is already
   installed). If you find yourself reaching for `pyyaml`, `jinja2`,
   `markdown`, or any other helper — STOP. Manual JSON + string concat
   is the contract.
3. The lint-staged config MUST NOT add Prettier or any non-ESLint
   formatter. `frontend/CLAUDE.md` is explicit on this.
4. Commit AFTER EACH TASK. Do not batch. The commit messages are
   pre-written above; use them verbatim.
5. If a pre-existing lint warning surfaces during Task 1's `npm install`
   verification, note it in SUMMARY.md and skip — do not fix unrelated
   lint debt in this quick.
6. The hook must NEVER run network I/O or hit a real database. The
   placeholder env-var pattern (Task 4) guarantees this — do not "improve"
   it by attempting to connect to anything during the dump.
7. Task 5 must edit ONLY the endpoint cheat sheet section of
   `uat-tester.md`. Do not retitle, restructure, or "modernize" the
   surrounding agent prose — it's working as intended.
