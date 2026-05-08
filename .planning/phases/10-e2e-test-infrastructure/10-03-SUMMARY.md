---
phase: 10-e2e-test-infrastructure
plan: 03
subsystem: testing
tags: [seed, cli, uuid5, idempotency, threat-mitigation, pyproject, hatchling, anti-drift]

# Dependency graph
requires:
  - 10-01 (settings.environment == "test" switch + DATABASE_URL_TEST flow)
  - 10-02 (LLM/storage stubs — seed itself doesn't invoke them, but the
    canned-recipe titles "Risotto aux champignons" and "Tarte Tatin" appear in
    the seeded corpus so capture-voice / capture-photo specs and the seed
    converge on the same shapes)
provides:
  - `uv run seed` console script (registered via [project.scripts] +
    tool.uv.package=true + hatchling build-system)
  - 1 household / 2 members / 21 recipes / 1 daily shortlist / 3 cooking logs /
    7 votes producing all 5 computed states
  - Stable UUIDs across runs and machines via uuid.uuid5(NAMESPACE_DNS,
    "aldente.test.<entity>.<key>")
  - T-10-01 hard refusal guard (env != "test" OR url missing "aldente_test")
affects:
  - 10-04+ (every Playwright spec gets a fully-populated test DB on first run;
    re-runs mid-session are no-ops, no DB reset required between specs unless
    the spec mutates seeded rows beyond the seed's idempotent rewrite)
  - The auth shortcut (D-01): seeded Luca's `auth_token` is
    `os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")`, which Playwright
    will mount as Bearer in `extraHTTPHeaders` per 10-01 D-01

# Tech tracking
tech-stack:
  added:
    - hatchling (build-backend declared in pyproject.toml; required for uv to
      install the console-script entry point)
  patterns:
    - "Stable-UUID idempotency: uuid.uuid5(NAMESPACE_DNS, 'aldente.test.<...>')
      gives the same id across machines and runs, so Session.merge() upserts
      cleanly without TRUNCATE."
    - "Composite-key upsert mirrors routers/votes.py verbatim:
      pg_insert(Vote).values(...).on_conflict_do_update(
        index_elements=['shortlist_id','recipe_id','member_id'], set_={...})."
    - "Same-tx denorm: insert CookingLog → flush → SELECT count(*) → write
      recipe.cook_count + recipe.last_cooked_at → single db.commit() at end of
      main(). Mirrors the production /cooking-logs PUT path's intent (CLAUDE.md
      invariant #3)."
    - "Anti-drift via direct enum import: `from app.models.enums import
      Cuisine, Mood, Protein, Season` and use `.value` for wire strings — no
      duplicated literal lists in seed.py."

key-files:
  created:
    - backend/app/cli/__init__.py
    - backend/app/cli/seed.py
  modified:
    - backend/pyproject.toml ([project.scripts] + tool.uv.package + hatch
      build-system + wheel packages)
    - backend/uv.lock (auto-rewritten by `uv sync` from `virtual` →
      `editable`; no version bumps, no new deps)

key-decisions:
  - "Add `tool.uv.package = true` + a hatchling build-system rather than
    leave the project as a `uv.workspace.virtual` package. Without this, `uv
    sync` skips entry-point installation and `uv run seed` 404s. The hatch
    block is minimal (build-backend + a single wheel-package directive) — no
    impact on uvicorn / alembic invocations, which all keep using
    module-import paths (`app.main:app`)."
  - "Add `db.flush()` after merging members but before the recipe loop. Without
    it, SQLAlchemy's flush ordering raised a recipes_created_by_member_id_fkey
    violation on the first run (recipes batch landed before the member rows).
    Documented inline in seed.py."
  - "Skip the Sans-avis recipe (tacos-boeuf) — write zero vote rows for it
    rather than emitting a 'sentinel' vote. The compute_vote_state helper
    returns sans_avis when both yes_count and no_count are 0; seeding zero
    rows is the correct, schema-consistent way to express it."
  - "Set status='structured' explicitly in the merge() call rather than rely
    on the recipe_status server_default of 'draft'. Mitigates Pitfall 5
    (Session.merge does not invoke column-level Python defaults, only client-
    side ones; server_defaults only land when the column is omitted from the
    INSERT statement, and we want every recipe to be promoted-and-visible
    from row one)."
  - "Set NOT-NULL columns with server defaults explicitly (`photo_paths=[]`,
    `tags=[]`, `cook_count=0`, `promotion_attempts=0`,
    `last_cooked_photo_path=None`). Pitfall 5 mitigation."

patterns-established:
  - "Idempotent seed: the same `uv run seed` invocation can run mid-suite
    without TRUNCATE — re-runs converge to the same row set. Drives a faster
    bootstrap loop than the alternative (`docker compose down -v` + alembic
    upgrade + seed) and keeps the dev/test cycle to a single command."
  - "Hard-refuse pattern for destructive CLIs: combine an explicit
    `ENVIRONMENT == 'test'` check AND a substring guard on the resolved
    `database_url`. Either misconfiguration alone refuses execution. The
    pattern is now available for re-use in any future test-DB CLIs."

requirements-completed: [TEST-01]

# Metrics
duration: ~15min
completed: 2026-05-08
---

# Phase 10 Plan 03: Idempotent Seed CLI Summary

**`uv run seed` populates the test DB with 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes producing all 5 computed states; a hard-refusal guard rejects any non-test environment (or wrong DB name); the seed re-runs as a no-op via uuid5 + Session.merge + composite-key ON CONFLICT DO UPDATE.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-08
- **Completed:** 2026-05-08
- **Tasks:** 1 / 1 (per PLAN.md — single multi-step task)
- **Files modified:** 4 (2 created, 2 patched — all in scope)

## Accomplishments

- `backend/app/cli/__init__.py` shipped (1-line package marker).
- `backend/app/cli/seed.py` shipped at 429 lines:
  - `_guard_environment()` — T-10-01 hard refusal (env check + URL substring check).
  - `_recipe_specs()` — 21-row recipe corpus spanning 10 cuisines / 5 moods / 6 proteins / 4 season patterns.
  - `main()` — household → members → recipes → cooking-logs (with same-tx denorm) → daily-shortlist → votes (with `pg_insert.on_conflict_do_update`).
- `backend/pyproject.toml` patched: `[project.scripts] seed = "app.cli.seed:main"`, `[tool.uv] package = true`, `[build-system]` with hatchling, `[tool.hatch.build.targets.wheel] packages = ["app"]`.
- `backend/uv.lock` auto-rewritten by `uv sync` (virtual → editable; no version bumps).

## Task Commits

1. **Task 1: backend/app/cli package + seed.py + console script + uv.lock refresh** — `c4e519a` (feat)

## Files Created/Modified

- `backend/app/cli/__init__.py` (NEW, 1 line) — package marker.
- `backend/app/cli/seed.py` (NEW, 429 lines) — full seed implementation.
- `backend/pyproject.toml` (MODIFIED, +13 lines) — `[project.scripts]`, `[tool.uv]`, `[build-system]`, `[tool.hatch.build.targets.wheel]`.
- `backend/uv.lock` (MODIFIED, +1 / -1 line) — `source = { virtual = "." }` → `source = { editable = "." }` (auto-rewrite by `uv sync`).

## Acceptance Run-Through

### Negative path — T-10-01 guards

```
$ DATABASE_URL='postgresql+psycopg2://x/y' ENVIRONMENT=development uv run seed
REFUSING to seed: ENVIRONMENT='development', expected 'test'.
EXIT=1

$ DATABASE_URL='postgresql+psycopg2://x/y' \
  DATABASE_URL_TEST='postgresql+psycopg2://postgres:postgres@localhost:5433/wrong_db' \
  ENVIRONMENT=test uv run seed
REFUSING to seed: database_url does not contain 'aldente_test'.
Got: 'postgresql+psycopg2://postgres:postgres@localhost:5433/wrong_db'
EXIT=1
```

Both belt-and-braces branches of `_guard_environment()` fire as designed.

### Happy path — first run

```
$ docker compose -f ../docker-compose.test.yml up -d
$ DATABASE_URL='postgresql+psycopg2://x/y' \
  DATABASE_URL_TEST='postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test' \
  ENVIRONMENT=test uv run alembic upgrade head
INFO  [alembic.runtime.migration] Running upgrade 0004 -> 0005, last_cooked_photo_path...

$ ENVIRONMENT=test DATABASE_URL_TEST=... uv run seed
seed: ok household=48355202-4a28-56ef-9202-a69161e88f5e
       member=5a59ca7d-5c23-526e-a80a-e663b0049d97
       recipes=21 logs=3 shortlist=54f8b0f4-788d-5dde-94f4-397ab2838e25
EXIT=0
```

### Idempotency — second run

```
$ ENVIRONMENT=test DATABASE_URL_TEST=... uv run seed
seed: ok household=48355202-4a28-56ef-9202-a69161e88f5e
       member=5a59ca7d-5c23-526e-a80a-e663b0049d97
       recipes=21 logs=3 shortlist=54f8b0f4-788d-5dde-94f4-397ab2838e25
EXIT=0
```

Same UUIDs across runs (uuid5 invariance proof). No `IntegrityError`, no duplicate rows.

### Row counts — psql verification

| Query | Expected | Actual |
|-------|----------|--------|
| `SELECT count(*) FROM recipes` | ≥ 20 | **21** |
| `SELECT count(DISTINCT cuisine) FROM recipes` | ≥ 5 | **10** |
| `SELECT count(*) FROM cooking_logs` | 3 | **3** |
| `SELECT count(DISTINCT rating) FROM cooking_logs` | 3 | **3** |
| `SELECT count(*) FROM votes` | ≥ 4 | **7** |
| `SELECT count(*) FROM daily_shortlists` | 1 | **1** |
| `SELECT count(*) FROM households` | 1 | **1** |
| `SELECT count(*) FROM members` | 2 | **2** |

### Same-tx denormalization — invariant #3

```
$ docker exec aldente-postgres-test psql -U postgres -d aldente_test -t -A -F'|' \
    -c "SELECT title, cook_count, last_cooked_at IS NOT NULL FROM recipes \
        WHERE title IN ('Ragu bolognese', 'Poulet au citron', 'Burger classique') \
        ORDER BY title;"
Burger classique|1|t
Poulet au citron|1|t
Ragu bolognese|1|t
```

All three logged recipes have `cook_count=1` and `last_cooked_at IS NOT NULL`, recomputed inside the same `db.commit()` as the `CookingLog` insert.

### 5-state vote coverage — `compute_vote_state` against the canonical helper

```
$ uv run python -c "..."
OK Ragu bolognese: state=valide expected=valide
OK Coq au vin: state=pressenti expected=pressenti
OK Butter chicken: state=conteste expected=conteste
OK Shawarma: state=rejete expected=rejete
OK Tacos au boeuf: state=sans_avis expected=sans_avis
distinct states reached: ['conteste', 'pressenti', 'rejete', 'sans_avis', 'valide']
ALL 5 STATES COVERED
```

All five computed states are reachable from the seeded data, verified against the canonical `app.services.voting.compute_vote_state` helper (the same helper the production `/shortlists/{...}/recipes/{...}/vote` endpoint uses for the response payload).

## Stable uuid5 Namespace Strings

| Entity | Key | Resulting UUID (uuid5) |
|--------|-----|------------------------|
| household | `aldente.test.household.luca` | `48355202-4a28-56ef-9202-a69161e88f5e` |
| member (Luca) | `aldente.test.member.luca` | `5a59ca7d-5c23-526e-a80a-e663b0049d97` |
| member (Partner) | `aldente.test.member.partner` | (computed at runtime) |
| recipe | `aldente.test.recipe.<slug>` (21 slugs) | one per recipe |
| cooking_log | `aldente.test.cooking_log.<slug>.<YYYY-MM-DD>` | one per log |
| daily_shortlist | `aldente.test.shortlist.<YYYY-MM-DD>` | `54f8b0f4-788d-5dde-94f4-397ab2838e25` (today) |
| vote | `aldente.test.vote.<recipe_slug>.<member_uuid>` | one per Luca/Partner pair |

The shortlist UUID rotates by date — re-running on a different day creates a new shortlist; same-day re-runs hit the existing one via `merge()`.

## Field-Name Drift Discovered

| Plan-template field | Actual model field | Action |
|--------------------|-------------------|--------|
| `Household.timezone` | `Household.timezone` | matches — kept |
| `Member.color_hex` | `Member.color_hex` | matches — kept |
| `Recipe.status` (default `'draft'::recipe_status`) | same | explicitly set to `'structured'` per Pitfall 5 |
| `Recipe.last_cooked_photo_path` | exists, nullable | explicitly set `None` per Pitfall 5 |
| `Recipe.promotion_error` / `promotion_attempts` | exist (Phase 2 D-09) | explicitly set `None` / `0` per Pitfall 5 |
| `CookingLog.rating` | `String` column → SQL `log_rating` enum | raw strings (`'loved'` / `'liked'` / `'disliked'`) accepted via SQL enum cast |
| `Vote.vote` | `String` column → SQL `vote_value` enum | raw `'yes'` / `'no'` strings accepted |
| `DailyShortlist.recipe_ids` | `ARRAY(UUID)` | passed list of `recipe.id` UUIDs |

No field-name drift — the model files matched the names assumed in the PLAN.md skeleton.

## Final stdout (for traceability)

```
seed: ok household=48355202-4a28-56ef-9202-a69161e88f5e member=5a59ca7d-5c23-526e-a80a-e663b0049d97 recipes=21 logs=3 shortlist=54f8b0f4-788d-5dde-94f4-397ab2838e25
```

## Decisions Made

- **Add `tool.uv.package = true` + hatchling build-system instead of leaving the project unpackaged.** `uv sync` was emitting `warning: Skipping installation of entry points (\`project.scripts\`) because this project is not packaged` until the build-system was declared. The minimal hatchling stanza (`build-backend = "hatchling.build"` + `[tool.hatch.build.targets.wheel] packages = ["app"]`) is the lowest-impact way to enable console scripts without disrupting uvicorn / alembic invocations (which use module-import paths and don't care about the wheel layout).
- **`db.flush()` between member-merge and recipe-merge to satisfy FK ordering.** First-run revealed SQLAlchemy's batch-insert ordering placed the recipes INSERT before the members INSERT, tripping `recipes_created_by_member_id_fkey`. The flush forces the household + members rows to land before the recipe loop runs. Documented inline.
- **Two `auth_token` env vars (`SEED_AUTH_TOKEN`, `SEED_AUTH_TOKEN_PARTNER`) instead of one.** The plan's truth list specifies `SEED_AUTH_TOKEN` for Luca only. Partner gets a fixed `'test-token-partner'` default; an env-var override (`SEED_AUTH_TOKEN_PARTNER`) is available for parity but not required by D-10.

## Deviations from Plan

- **[Rule 3 — Blocking issue] Added build-system declaration to pyproject.toml.** Without it, `uv sync` did not install the `seed` entry point (warning on stdout). The PLAN.md `<action>` Step B specified only `[project.scripts]`; in practice that's necessary but not sufficient. Added `tool.uv.package = true`, `[build-system]` with hatchling, and `[tool.hatch.build.targets.wheel]` to make `uv run seed` resolve. No impact on existing uvicorn / alembic paths.
- **[Rule 1 — Bug] Added `db.flush()` between member-merge and recipe-merge.** SQLAlchemy's flush ordering tripped `recipes_created_by_member_id_fkey` on first run. Inline comment documents why.
- **[Rule 2 — Critical correctness] `db.flush()` between cooking-log merge and the COUNT query.** Without it, the SELECT count(*) for `cook_count` denorm returned the pre-merge count (zero on first run, off-by-one on subsequent runs). Aligns the result with the production /cooking-logs PUT semantic.

## Issues Encountered

- **PreToolUse:Edit hook surfaced READ-BEFORE-EDIT reminders three times** during the surgical pyproject.toml passes (each follow-up `[build-system]` / `tool.uv` addition). The file had been Read earlier in the session, so each Edit landed cleanly — the reminders were soft, not rejections. Confirmed by post-edit `Read` of `pyproject.toml` and the passing acceptance grep block.

## Threat Model Coverage

| Threat ID | Status | How |
|-----------|--------|-----|
| T-10-01 (seed targets prod DB) | mitigated | `_guard_environment()` does both `settings.environment == "test"` AND `"aldente_test" in settings.database_url`. Either failure → `sys.exit(<error>)`. Negative-path probes confirmed both branches fire and the seed exits non-zero. Belt-and-braces: even if env vars are misconfigured one way, the URL substring guard catches the case. |
| T-10-03 (seed `auth_token=test-token-luca` on prod) | mitigated | The token is fixed and well-known. T-10-01's guard refuses to seed against any non-test DB. Production deploy paths (Railway → Supabase) never invoke the `seed` console script. |
| Drift (vocabulary skew between seed.py / models/enums.py / lib/enums.ts) | mitigated | Seed imports `from app.models.enums import Cuisine, Mood, Protein, Season` and uses `.value` for wire strings. NO duplicated literal lists. Verified by `grep -q "from app.models.enums import Cuisine, Mood, Protein, Season" backend/app/cli/seed.py` (PASS). |

## Self-Check: PASSED

- `backend/app/cli/__init__.py`: FOUND.
- `backend/app/cli/seed.py`: FOUND (429 lines).
- `grep -q "from app.models.enums import Cuisine, Mood, Protein, Season" backend/app/cli/seed.py`: PASS.
- `grep -q "from sqlalchemy.dialects.postgresql import insert as pg_insert" backend/app/cli/seed.py`: PASS.
- `grep -q "_guard_environment" backend/app/cli/seed.py`: PASS.
- `grep -q "REFUSING to seed" backend/app/cli/seed.py`: PASS.
- `grep -q '\[project.scripts\]' backend/pyproject.toml`: PASS.
- `grep -q 'seed = "app.cli.seed:main"' backend/pyproject.toml`: PASS.
- `ENVIRONMENT=development uv run seed` exits non-zero: PASS.
- `ENVIRONMENT=test ... DATABASE_URL_TEST=...wrong_db uv run seed` exits non-zero: PASS.
- First-run seed exits 0 with `seed: ok ...` line: PASS.
- Second-run seed (idempotency) exits 0 with the same household/member/shortlist UUIDs: PASS.
- `SELECT count(*) FROM recipes` ≥ 20: PASS (21).
- `SELECT count(DISTINCT cuisine) FROM recipes` ≥ 5: PASS (10).
- `SELECT count(*) FROM cooking_logs` == 3: PASS.
- `SELECT count(DISTINCT rating) FROM cooking_logs` == 3: PASS.
- `SELECT count(*) FROM votes` ≥ 4: PASS (7).
- `compute_vote_state(...)` returns all 5 distinct VoteState values when called against the seeded shortlist: PASS.
- Commit `c4e519a` exists: FOUND.
- `git diff --name-only HEAD~1..HEAD` returns exactly the 4 in-scope files: PASS (no scope creep).

## Next Plan Readiness

- Plan 10-04 (Playwright spec scaffolding) can now invoke `uv run seed` from a globalSetup (or rely on it being run as part of the bootstrap) and trust that:
  - 1 household with `invite_code='TEST01'` is present.
  - Member "Luca" has `auth_token = SEED_AUTH_TOKEN` (env-overridable; default `'test-token-luca'`) — directly consumable by `playwright.config.ts` as `extraHTTPHeaders.Authorization = "Bearer ${SEED_AUTH_TOKEN}"`.
  - The library spec sees 21 recipes spanning 10 cuisines.
  - The shortlist-vote spec can scrub through all 5 vote-state colors using the today-dated shortlist's 5 recipes.
  - The cooking-log history spec sees 3 logs (one per rating).
- The "fresh" Playwright project (D-05 second project) can run `globalSetup.fresh.ts` that truncates + reseeds via the same `uv run seed` — no new tooling needed beyond what this plan ships.

---
*Phase: 10-e2e-test-infrastructure*
*Plan: 03*
*Completed: 2026-05-08*
