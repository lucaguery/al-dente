---
phase: quick-260519-uxn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/pyproject.toml
  - backend/uv.lock
  - backend/.gitignore
  - .planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md
autonomous: true
requirements:
  - QUICK-260519-UXN
user_setup: []

must_haves:
  truths:
    - "Running `uv sync` in backend resolves pytest-cov and writes it into uv.lock"
    - "`uv run pytest --cov=app` produces a coverage report against the test Postgres on :5433"
    - "Baseline total coverage % and per-file breakdown are recorded in the SUMMARY"
    - "Coverage artifacts (.coverage, .coverage_html/, .coverage.json) are git-ignored"
    - "No test files, app source files, or conftest.py are modified"
  artifacts:
    - path: "backend/pyproject.toml"
      provides: "pytest-cov dev dep + coverage config"
      contains: "pytest-cov"
    - path: "backend/pyproject.toml"
      provides: "coverage run + report tool config"
      contains: "[tool.coverage.run]"
    - path: "backend/uv.lock"
      provides: "Locked pytest-cov pin"
      contains: "pytest-cov"
    - path: "backend/.gitignore"
      provides: "Ignore rules for coverage artifacts"
      contains: ".coverage"
    - path: ".planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md"
      provides: "Baseline coverage report with totals, per-file table, rules-file status, and gap report"
      contains: "Baseline Coverage"
  key_links:
    - from: "backend/pyproject.toml"
      to: "backend/uv.lock"
      via: "uv sync"
      pattern: "pytest-cov"
    - from: "uv run pytest --cov=app"
      to: "backend/.coverage.json"
      via: "coverage.py JSON reporter"
      pattern: "--cov-report=json:\\.coverage\\.json"
    - from: "backend/.coverage.json"
      to: "SUMMARY.md tables"
      via: "python -m json parse during summary write"
      pattern: "totals.percent_covered"
---

<objective>
Bring `pytest-cov` online in the backend test suite and capture a one-shot **baseline coverage report** that quantifies where v0.7.1 actually stands.

Purpose: The session goal is to push backend coverage to ≥85% repo / 100% on four rules files (`services/voting.py`, `services/algorithm.py`, `services/shortlist.py`, `auth.py`). Before any of that work can be scoped into a v0.8 milestone, we need ground truth. This plan produces that ground truth — and only that. No new tests, no thresholds, no CI.

Output: A SUMMARY.md containing the total %, branch %, per-file table sorted ascending, explicit status of the four rules files, and a gap report of files below 60%. The numbers in the SUMMARY are the input artifact for the next planning step (milestone scoping).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@backend/CLAUDE.md
@.planning/STATE.md
@backend/pyproject.toml
@backend/.gitignore
@TESTING.md
@docker-compose.test.yml

<interfaces>
<!-- Current backend/pyproject.toml shape (extracted so the executor edits in place, not from scratch). -->

The file already has these sections in this order:
  [project]
  [project.scripts]
  [tool.uv]
  [build-system]
  [tool.hatch.build.targets.wheel]
  [tool.pytest.ini_options]
  [dependency-groups]

Edit targets:
  - `[dependency-groups].dev` — append `"pytest-cov>=5.0"` to the existing list
    (currently: graphifyy, pytest, pytest-asyncio).
  - APPEND two new top-level sections at the end of the file:
      [tool.coverage.run]
      source = ["app"]
      omit = ["app/cli/*", "tests/*", "alembic/*"]
      branch = true

      [tool.coverage.report]
      show_missing = true
      skip_empty = true
      precision = 1

  Do NOT reorder existing sections. Do NOT touch [tool.pytest.ini_options].

Current backend/.gitignore already covers `.pytest_cache/`. APPEND a new block:
  # Coverage artifacts (Phase quick-260519-uxn — backend coverage baseline)
  .coverage
  .coverage.*
  .coverage_html/
  .coverage.json

Note: `.coverage.*` covers parallel-run files like `.coverage.<hostname>.<pid>`; explicit `.coverage.json` line is redundant but kept for human readability of intent.

Test infra contract (DO NOT MODIFY):
  - backend/tests/conftest.py uses a connection-scoped transaction rolled back at teardown.
  - Test Postgres runs on 127.0.0.1:5433 (NOT 5432) via docker-compose.test.yml.
  - The env file `.env.test.example` at repo root provides ENVIRONMENT=test and DATABASE_URL_TEST.
  - Coverage instrumentation hooks into the Python process via `--cov=app`; it does NOT touch fixtures or DB sessions, so the connection-scoped rollback is unaffected.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire pytest-cov + coverage config into backend/pyproject.toml and .gitignore, then lock</name>
  <files>backend/pyproject.toml, backend/.gitignore, backend/uv.lock</files>
  <action>
    1. Edit `backend/pyproject.toml`:
       - In `[dependency-groups].dev` list, add a new entry `"pytest-cov>=5.0"` after `"pytest-asyncio>=0.24"`. Keep alphabetical-ish convention as-is (the existing list is loosely ordered: graphifyy, pytest, pytest-asyncio — append pytest-cov at the end of the list).
       - At the END of the file (after `[dependency-groups]`), append two new top-level tables exactly as specified in the `<interfaces>` block: `[tool.coverage.run]` with `source`, `omit`, `branch`; and `[tool.coverage.report]` with `show_missing`, `skip_empty`, `precision`. Use TOML array syntax for `source` and `omit`; `branch`, `show_missing`, `skip_empty` are bare booleans; `precision` is bare integer.
       - Do NOT modify `[project]`, `[project.scripts]`, `[tool.uv]`, `[build-system]`, `[tool.hatch.build.targets.wheel]`, or `[tool.pytest.ini_options]`.

    2. Edit `backend/.gitignore`: append a new block at the end of the file (after the OS section) — exact content per the `<interfaces>` block (header comment + `.coverage`, `.coverage.*`, `.coverage_html/`, `.coverage.json`).

    3. Run `(cd backend && uv sync)` to resolve pytest-cov and update `backend/uv.lock`. This must succeed without warnings about conflicting deps; if it fails, surface the full uv error verbatim and stop — do NOT attempt to pin a different version of pytest-cov without an explicit go-ahead.
  </action>
  <verify>
    <automated>cd backend &amp;&amp; grep -q 'pytest-cov' pyproject.toml &amp;&amp; grep -q '\[tool.coverage.run\]' pyproject.toml &amp;&amp; grep -q '\[tool.coverage.report\]' pyproject.toml &amp;&amp; grep -q '^\.coverage$' .gitignore &amp;&amp; grep -q 'pytest-cov' uv.lock</automated>
  </verify>
  <done>
    - pyproject.toml contains pytest-cov dep AND both `[tool.coverage.*]` tables
    - .gitignore contains `.coverage`, `.coverage.*`, `.coverage_html/`, `.coverage.json` lines
    - uv.lock contains a pinned pytest-cov entry
    - No other files modified
  </done>
</task>

<task type="auto">
  <name>Task 2: Stand up test Postgres, run baseline coverage, parse JSON, and write SUMMARY</name>
  <files>.planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md</files>
  <action>
    Execute the following sequence from the repo root. Each step is a separate Bash invocation so stderr is observable; do NOT chain them into a single mega-pipeline.

    1. Load test env contract (per TESTING.md §Quick start):
       `set -a; source .env.test.example; set +a`
       This sets `ENVIRONMENT=test`, `DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test`, `SEED_AUTH_TOKEN`, `NEXT_PUBLIC_API_BASE`.

    2. Bring up the test Postgres:
       `docker compose -f docker-compose.test.yml up -d`
       Then wait for healthy. Prefer the compose healthcheck; if `docker compose ps` does not report status within 30s, fall back to polling `pg_isready -h localhost -p 5433 -U postgres` every 2s up to 30s total. If still not ready after 30s, fail loudly with the docker logs (`docker compose -f docker-compose.test.yml logs postgres-test`) and stop.

    3. Apply schema from the backend dir:
       `(cd backend && ENVIRONMENT=test DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test uv run alembic upgrade head)`
       Re-passing the env vars explicitly belt-and-suspenders defends against shell-export drift if step 1 sourced into a parent shell that doesn't propagate.

    4. Run baseline coverage:
       `(cd backend && ENVIRONMENT=test DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test uv run pytest --cov=app --cov-report=term-missing --cov-report=html:.coverage_html --cov-report=json:.coverage.json)`
       Existing test failures are NOT a blocker for this plan — coverage reporting runs regardless of pass/fail. Capture the exit code but do NOT abort on non-zero pytest exit; record the pass/fail count in the SUMMARY so the next milestone scoping knows what's red. (If pytest cannot even collect tests — exit code 2 or higher with no tests run — that IS a blocker; stop and surface the error.)

    5. Parse `backend/.coverage.json` with `uv run python -c '...'` (one-liner is fine, OR a tiny inline script) to extract:
       - `totals.percent_covered` (overall line %)
       - `totals.percent_covered_display` if present
       - branch coverage % (compute from `totals.covered_branches / totals.num_branches * 100` since coverage.json doesn't surface a single `branch_percent` field directly)
       - per-file `files` dict → list of `(filename, summary.percent_covered, summary.num_statements, summary.missing_lines count)` sorted ascending by percent_covered
       - The four rules files specifically: `app/services/voting.py`, `app/services/algorithm.py`, `app/services/shortlist.py`, `app/auth.py` — capture each one's percent_covered and missing_lines (note: `auth.py` is at `app/auth.py`, NOT `app/services/auth.py`; verify path before reading).
       - Files with `summary.percent_covered < 60.0` → gap-report list

    6. Write `.planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md` using the Write tool (NOT heredoc) with this structure:

       ```
       # Quick 260519-uxn — Backend Coverage Baseline

       **Status:** ✅ Baseline captured
       **Date:** <YYYY-MM-DD from `date +%Y-%m-%d`>
       **Backend version:** v0.7.1 (per STATE.md at time of capture)
       **Test suite result:** <X passed, Y failed, Z errors> (exit code <N>)

       ## What changed
       - Added `pytest-cov>=5.0` to `backend/[dependency-groups].dev`
       - Added `[tool.coverage.run]` and `[tool.coverage.report]` to `backend/pyproject.toml`
       - Added `.coverage`, `.coverage.*`, `.coverage_html/`, `.coverage.json` to `backend/.gitignore`
       - No test files, app source, or `conftest.py` modified

       ## Baseline Coverage

       | Metric | Value |
       |---|---|
       | Total line coverage | XX.X% |
       | Branch coverage | XX.X% (NNN / MMM branches) |
       | Statements covered | NNNN / MMMM |
       | Files measured | NN |

       ## Rules Files Status

       The four files that must reach 100% per session goal:

       | File | Current % | Statements | Missing lines | Gap to 100% |
       |---|---|---|---|---|
       | app/services/voting.py | XX.X% | NN | NN | NN.N pp |
       | app/services/algorithm.py | XX.X% | NN | NN | NN.N pp |
       | app/services/shortlist.py | XX.X% | NN | NN | NN.N pp |
       | app/auth.py | XX.X% | NN | NN | NN.N pp |

       ## Per-file Coverage

       Sorted ascending (lowest coverage first):

       | File | % | Statements | Missing |
       |---|---|---|---|
       | <file> | XX.X% | NN | NN |
       | ... | | | |

       ## Coverage Gap Report (<60%)

       Files below 60% — primary targets for v0.8 test-writing scope:

       - `app/...` — XX.X% (NN statements, NN missing)
       - ...

       (If no files are below 60%, write: "None — all measured files ≥ 60%.")

       ## Reproduction

       ```
       set -a; source .env.test.example; set +a
       docker compose -f docker-compose.test.yml up -d
       (cd backend && uv run alembic upgrade head)
       (cd backend && uv run pytest --cov=app --cov-report=term-missing --cov-report=html:.coverage_html --cov-report=json:.coverage.json)
       ```

       HTML report at `backend/.coverage_html/index.html` (git-ignored).

       ## Next step

       Feed these numbers into v0.8 milestone scoping. Files at <60% with high statement counts are the highest ROI targets. The four rules files in the table above are the contracted 100% targets regardless of current %.
       ```

    7. Tear down test Postgres (clean-up, NOT mandatory for the plan to be "done" but courteous):
       `docker compose -f docker-compose.test.yml down`
       Coverage artifacts in `backend/.coverage*` and `backend/.coverage_html/` are left in place (git-ignored) so the developer can browse the HTML report if they want.

    8. Verify `backend/.coverage.json` was NOT committed (it's in .gitignore from Task 1) by running `git status backend/.coverage.json` — should show nothing or "untracked".

    9. Single atomic commit:
       `git add backend/pyproject.toml backend/uv.lock backend/.gitignore .planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md`
       `git commit -m "chore(quick-260519-uxn): add pytest-cov + capture backend coverage baseline"` (use HEREDOC form per repo convention with Co-Authored-By trailer).
       Confirm with `git status` that the commit succeeded and no stray coverage artifacts are staged.

    NOTE on conftest.py interaction: Coverage.py instruments by hooking sys.settrace at process start (via `--cov=app`). The connection-scoped transaction rollback in `backend/tests/conftest.py` operates at the SQLAlchemy session layer and is invisible to coverage instrumentation. There is no integration risk. If pytest exits successfully and `.coverage.json` is produced, the existing fixture infra is unaffected.
  </action>
  <verify>
    <automated>test -f .planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md &amp;&amp; grep -q '## Baseline Coverage' .planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md &amp;&amp; grep -q '## Rules Files Status' .planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md &amp;&amp; grep -q '## Per-file Coverage' .planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md &amp;&amp; grep -q '## Coverage Gap Report' .planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md &amp;&amp; test -f backend/.coverage.json &amp;&amp; git log -1 --pretty=%s | grep -q 'quick-260519-uxn'</automated>
  </verify>
  <done>
    - Test Postgres came up on :5433 and Alembic migrations applied cleanly
    - `uv run pytest --cov=app` produced `backend/.coverage.json` with a non-zero `totals.percent_covered`
    - SUMMARY.md exists with all four required sections (Baseline Coverage, Rules Files Status, Per-file Coverage, Coverage Gap Report) populated with real numbers
    - The four rules files (services/voting.py, services/algorithm.py, services/shortlist.py, auth.py) are explicitly called out with current %
    - Files <60% are listed in the gap report (or section explicitly states "None")
    - Single commit `chore(quick-260519-uxn): add pytest-cov + capture backend coverage baseline` landed on the working branch
    - No coverage artifacts (`.coverage`, `.coverage.json`, `.coverage_html/`) are tracked by git
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

1. **pytest-cov is installed and locked:**
   `(cd backend && uv run pytest --cov=app --collect-only 2>&1 | head -5)` — should not error on the `--cov` flag.

2. **Coverage config is read by coverage.py:**
   `(cd backend && uv run python -c "import coverage; c = coverage.Coverage(); c.load(); print(c.config.source, c.config.branch)")` — should print `['app'] True`.

3. **SUMMARY has real numbers, not placeholders:**
   `grep -E 'XX\.X|NN ' .planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md` — should return nothing (all placeholders replaced with real digits).

4. **conftest.py untouched:**
   `git log -1 --name-only | grep -q 'backend/tests/conftest.py'` — should return non-zero (file NOT in this commit).

5. **No test files or app sources in commit:**
   `git log -1 --name-only | grep -E '^(backend/tests/|backend/app/)' | grep -v '^backend/app/$'` — should return nothing (only pyproject.toml, uv.lock, .gitignore, and the SUMMARY are touched).

6. **Coverage artifacts are git-ignored:**
   `git check-ignore backend/.coverage.json backend/.coverage_html/index.html backend/.coverage` — all three paths should be reported as ignored.
</verification>

<success_criteria>
- `backend/pyproject.toml` has `pytest-cov>=5.0` in dev deps + `[tool.coverage.run]` + `[tool.coverage.report]` sections
- `backend/uv.lock` pins a concrete pytest-cov version
- `backend/.gitignore` excludes all coverage artifact paths
- `backend/.coverage.json` exists locally with a measured `totals.percent_covered > 0`
- SUMMARY.md contains: Baseline Coverage table (total %, branch %), Rules Files Status table (4 files with current % + gap-to-100), Per-file Coverage table (sorted ascending), Coverage Gap Report (files <60% or explicit "None")
- Single atomic commit landed: `chore(quick-260519-uxn): add pytest-cov + capture backend coverage baseline`
- Zero modifications to `backend/tests/`, `backend/app/`, or `backend/tests/conftest.py`
- Zero changes deployed to Railway or Vercel (this is local-only per memory `feedback_no_manual_vercel_deploy.md`)
</success_criteria>

<output>
Create `.planning/quick/260519-uxn-add-pytest-cov-to-backend-run-baseline-c/260519-uxn-SUMMARY.md` containing the baseline coverage report (this is the deliverable artifact — not just an execution log). The numbers in this file are the input to v0.8 milestone scoping.
</output>
