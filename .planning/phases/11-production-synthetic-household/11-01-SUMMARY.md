---
phase: 11-production-synthetic-household
plan: 01
subsystem: backend-cli
tags: [seed, cli, argparse, prod-guard, synthetic-household, storage-scope]
requires:
  - .planning/phases/11-production-synthetic-household/11-CONTEXT.md
  - .planning/phases/11-production-synthetic-household/11-RESEARCH.md
provides:
  - argparse mode dispatch (--prod-synthetic, --teardown) in `backend/app/cli/seed.py`
  - `_guard_prod_environment` (D-01..D-04) + extended `_guard_environment` (D-04 symmetric)
  - `_id_synth`, `SYNTHETIC_HOUSEHOLD_ID`, `SYNTHETIC_LOCK_KEY`, `SYNTHETIC_ALLOWED_TABLES`
  - `_assert_synthetic_household`, `_merge_synthetic` (D-06 row-write scope wrapper)
  - `SYNTHETIC_PREFIX`, `_assert_synthetic_storage_path`, `upload_synthetic_photo_idempotent`,
    `list_synthetic_storage_count`, `teardown_synthetic_storage` (D-08 / D-22 / D-16)
  - `run_test_seed` (verbatim relocation of prior `main()` body, no behavior change)
  - `run_prod_synthetic_seed` (stub — Plan 02 fills)
  - `run_teardown` (stub — Plan 04 fills)
affects:
  - backend/app/cli/seed.py (286 → 565 lines)
  - backend/app/services/storage.py (252 → 328 lines)
tech-stack:
  added: []                          # zero new dependencies — stdlib argparse only
  patterns:
    - argparse mode dispatch (CLI layer)
    - dual-key opt-in (env var + flag) for destructive prod ops
    - structural scope guards via assertion wrappers (defense-in-depth, not convention)
    - distinct uuid5 namespace per environment to prevent ID collisions
key-files:
  created: []
  modified:
    - backend/app/cli/seed.py
    - backend/app/services/storage.py
decisions:
  - Honor RESEARCH Pitfall 1: bucket name is `recipe-photos`, not `recipes`. All new helpers
    reference the existing `BUCKET` constant rather than hardcoding a literal.
  - Honor RESEARCH Pattern 6 nuance: `Vote` has no `household_id` column, so
    `_assert_synthetic_household` falls back to `id` for `Household` rows and otherwise
    requires `household_id`. Vote upserts (Plan 02) will scope-check via the parent recipe.
  - Lock-key derivation: `SYNTHETIC_HOUSEHOLD_ID.int & ((1 << 63) - 1)` keeps it positive
    (avoids the asyncpg overload-resolution trap; sync psycopg2 also handled correctly).
  - Stub `run_prod_synthetic_seed` and `run_teardown` raise `NotImplementedError` with
    explicit "Plan 02 must implement" / "Plan 04 must implement" messages so misuse before
    the dependent plans land fails loudly.
metrics:
  duration: ~5 min
  completed: 2026-05-09T11:07:46Z
  tasks: 3
  files_modified: 2
---

# Phase 11 Plan 01: Foundation — argparse + guards + scope wrappers

**One-liner:** Lay the prod-synthetic seed foundation in `seed.py` and `services/storage.py`
— argparse mode dispatch, hard-refusal prod guard with D-04 symmetric inverse, synthetic-namespace
UUID helpers, row-write scope assertion (D-06), and three Storage scope helpers (D-08 / D-22 / D-16)
— without changing test-seed behavior or touching any other product code.

## Tasks Executed

### Task 1: argparse mode dispatch + prod-environment guard (`backend/app/cli/seed.py`)
**Commit:** `1b33e06`

- Added `import argparse` (alphabetical between `os` and `sys`).
- Added `_parse_args(argv)` returning a `Namespace` with `prod_synthetic` and `teardown` flags.
- Added `_guard_prod_environment()` issuing 3 distinct `REFUSING:` exits:
  1. `ALDENTE_PROD_SEED != "1"` → "Correct invocation: ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic"
  2. `"supabase.co" not in database_url` → names the offending host
  3. `"localhost" in database_url or "aldente_test" in database_url` → reproduces the URL
- Extended `_guard_environment()` with D-04 symmetric guard: refuses if `ALDENTE_PROD_SEED=1`
  is set without `--prod-synthetic` flag.
- Renamed existing `def main()` body verbatim into `def run_test_seed()` (single-line header
  swap; body unchanged — confirmed via `inspect.getsource` fragment scan).
- New `main()` dispatches: `args.prod_synthetic` → `_guard_prod_environment()` then
  `run_teardown()` or `run_prod_synthetic_seed()`; otherwise → refuse `--teardown` alone, then
  `_guard_environment()` then `run_test_seed()`.
- Added stubs `run_prod_synthetic_seed` and `run_teardown` raising `NotImplementedError`.

### Task 2: synthetic-namespace helpers + row-write scope assertion (`backend/app/cli/seed.py`)
**Commit:** `bb65801`

- `_id_synth(*parts)` — uuid5 under namespace `aldente.prod.synthetic.<...>`. Distinct from
  `_id` so test and prod-synthetic UUIDs never collide.
- `SYNTHETIC_HOUSEHOLD_ID = uuid.uuid5(NAMESPACE, "aldente.prod.synthetic.household.synthetic")`.
- `SYNTHETIC_LOCK_KEY: int = SYNTHETIC_HOUSEHOLD_ID.int & ((1 << 63) - 1)` for D-24
  `pg_advisory_xact_lock`.
- `SYNTHETIC_ALLOWED_TABLES: frozenset[str]` of the 6 D-07 tables.
- `_assert_synthetic_household(row, expected_id)` (D-06): raises if `household_id` (or `id`
  for `Household`) doesn't match `expected_id`. Documented `Vote` exception inline.
- `_merge_synthetic(db, row, *, synthetic_id=SYNTHETIC_HOUSEHOLD_ID)` wraps `db.merge` with
  the assertion.

### Task 3: Storage scope helpers (`backend/app/services/storage.py`)
**Commit:** `fe24e5c`

- Appended at end of file; no existing function modified (verified via `git diff`).
- `SYNTHETIC_PREFIX = "synthetic/"`.
- `_assert_synthetic_storage_path(path)` (D-08): raises if path doesn't start with `synthetic/`.
- `upload_synthetic_photo_idempotent(slug, content) -> str` (D-08 + D-22): scope-guarded
  HEAD-then-upload via `bucket.exists(path)` then `bucket.upload(...)`. Returns the
  bucket-relative path. Uses the existing `_supabase()` lazy-init and `BUCKET` constant.
- `list_synthetic_storage_count() -> int` (D-13 banner support).
- `teardown_synthetic_storage() -> int` (D-16 + D-08): scope-guarded prefix delete
  via `bucket.list("synthetic")` then `bucket.remove(paths)`.

## Verification — actual stdout

### Argparse (Task 1 verify block)

```
Namespace(prod_synthetic=False, teardown=False)
Namespace(prod_synthetic=True, teardown=False)
Namespace(prod_synthetic=True, teardown=True)
```

```
argparse OK
```

### Guard refusals (live)

```
=== test1: D-04 — ALDENTE_PROD_SEED=1 with no flag ===
REFUSING: ALDENTE_PROD_SEED=1 set but --prod-synthetic flag NOT passed. Either pass
--prod-synthetic to run prod-synthetic seed, or unset ALDENTE_PROD_SEED to run the test seed.
EXIT=1

=== test2: --teardown without --prod-synthetic ===
REFUSING: --teardown only valid with --prod-synthetic.
EXIT=1

=== test3: --prod-synthetic with no env ===
REFUSING: --prod-synthetic passed but ALDENTE_PROD_SEED env var not '1' (got None).
Correct invocation: ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic
EXIT=1

=== test4: --prod-synthetic with env but non-Supabase URL ===
REFUSING: database_url does not contain 'supabase.co' (got host 'example.com').
Prod seed will not run against a non-Supabase URL.
EXIT=1
```

### Stubs raise NotImplementedError

```
stub OK: Plan 02 must implement run_prod_synthetic_seed
stub OK: Plan 04 must implement run_teardown
```

### Synthetic helpers (Task 2 verify block)

```
synthetic helpers OK
```

(Determinism, distinct namespace from `_id`, lock key in 63-bit range, allowlist matches D-07,
scope assertion fires on mismatch and passes on match — all asserted.)

### Storage helpers (Task 3 verify block)

```
storage helpers OK
```

(`SYNTHETIC_PREFIX == 'synthetic/'`, `BUCKET == 'recipe-photos'` per Pitfall 1, scope guard
fires on `public/bad.jpg`, passes on `synthetic/poulet-citron.jpg`.)

### Grep acceptance criteria — all green

| Criterion | Result |
|---|---|
| `import argparse` count | 1 |
| `def _parse_args` count | 1 |
| `def _guard_prod_environment` count | 1 |
| `def run_test_seed` count | 1 |
| `def run_prod_synthetic_seed` count | 1 |
| `def run_teardown` count | 1 |
| `ALDENTE_PROD_SEED` count (≥3) | 8 |
| `REFUSING:` count (≥4) | 5 |
| `def _id_synth` count | 1 |
| `SYNTHETIC_HOUSEHOLD_ID` count (≥4) | 4 |
| `SYNTHETIC_LOCK_KEY` count (≥1) | 1 |
| `aldente.prod.synthetic` count (≥2) | 2 |
| `def _assert_synthetic_household` count | 1 |
| `def _merge_synthetic` count | 1 |
| `SYNTHETIC_ALLOWED_TABLES` is frozenset of 6 strings | confirmed |
| `SYNTHETIC_PREFIX = "synthetic/"` count | 1 |
| `def upload_synthetic_photo_idempotent` count | 1 |
| `def teardown_synthetic_storage` count | 1 |
| `def list_synthetic_storage_count` count | 1 |
| `def _assert_synthetic_storage_path` count | 1 |
| `recipe-photos` count (≥1) | 3 |
| `"recipes"` count (must be 0 — Pitfall 1) | 0 |
| `from_(BUCKET)` count (≥5) | 6 |

### Test-seed regression check

The test seed body was relocated as a literal copy-paste — the function header was changed
from `def main() -> None: _guard_environment(); ...` to `def run_test_seed() -> None: ...`,
and the new `main()` calls `_guard_environment(); run_test_seed()` for the no-flag path. A
key-fragment scan via `inspect.getsource(run_test_seed)` confirmed all 10 marker fragments
remain (`auth_token_luca = os.environ.get`, `Foyer Test`, `TEST01`, `_id("member", "luca")`,
`for spec in _recipe_specs():`, `log_specs = [`, `shortlist_recipe_slugs = [`, `vote_specs = [`,
`db.commit()`, `seed: ok household=`).

**End-to-end DB run:** Not executed — Docker / local Postgres not running in this worktree.
The orchestrator's wave-2 verifier (or a follow-up `uv run seed` against the test DB) is
the canonical regression gate. Body relocation correctness is verified structurally above.

## Deviations from Plan

**None.** The plan executed exactly as written. All three tasks, all verify blocks pass,
all acceptance criteria green, no scope creep.

### Notes on RESEARCH corrections honored

The plan explicitly called out three load-bearing corrections from RESEARCH.md vs CONTEXT.md;
all are honored:

1. **Bucket name `recipe-photos`** (not `recipes`) — all new storage helpers use the existing
   `BUCKET` constant. Zero literal `"recipes"` strings in `storage.py`.
2. **`recipes.photo_paths` population** — flagged for Plan 02 (this plan only creates the
   helper that returns the storage path; Plan 02 wires the path onto the recipe row in the
   same DB tx).
3. **PgBouncer / advisory-lock incompatibility** — flagged for Plan 02 / runbook (this plan
   only defines the lock key; Plan 02 issues `pg_advisory_xact_lock` and the runbook will
   document the direct-connection requirement).

## Authentication Gates

None encountered. All work was local file edits + Python imports; no auth surfaces touched.

## Product-Code Concerns Flagged (NOT fixed)

**None surfaced.** The two files touched (`seed.py`, `services/storage.py`) are foundation
code; the additions are pure new functions plus one extension to `_guard_environment`. No
existing logic was modified except the no-op rename of `main()`'s body to `run_test_seed()`.

## Self-Check: PASSED

- File `backend/app/cli/seed.py` exists at expected path: FOUND.
- File `backend/app/services/storage.py` exists at expected path: FOUND.
- File `.planning/phases/11-production-synthetic-household/11-01-SUMMARY.md`: this file.
- Commit `1b33e06`: FOUND (`feat(11-01): add argparse mode dispatch + prod guards to seed.py`).
- Commit `bb65801`: FOUND (`feat(11-01): add synthetic-namespace helpers + row-write scope assertion`).
- Commit `fe24e5c`: FOUND (`feat(11-01): add synthetic-storage scope helpers to services/storage.py`).

## Plan Output Spec — Confirmation

Plan 02 and Plan 04 stubs raise `NotImplementedError` with the precise messages
"Plan 02 must implement run_prod_synthetic_seed" and "Plan 04 must implement run_teardown".
Plan 02 can now write `_merge_synthetic(db, Household(...))` (asserts `id == SYNTHETIC_HOUSEHOLD_ID`
for Household; `household_id == ...` for the rest) and call
`upload_synthetic_photo_idempotent(slug=..., content=...)` returning a `synthetic/<slug>.jpg`
path that the recipe row's `photo_paths` will reference. Plan 04 can call
`teardown_synthetic_storage()` (scope-guarded prefix delete) after FK-respecting Postgres
deletes.
