---
phase: 11-production-synthetic-household
plan: 04
subsystem: backend-cli
tags: [seed, teardown, fk-respecting-delete, advisory-lock, supabase-storage, idempotency]
requires:
  - .planning/phases/11-production-synthetic-household/11-CONTEXT.md
  - .planning/phases/11-production-synthetic-household/11-RESEARCH.md
  - .planning/phases/11-production-synthetic-household/11-01-SUMMARY.md
  - .planning/phases/11-production-synthetic-household/11-02-SUMMARY.md
provides:
  - run_teardown body (was NotImplementedError stub) — advisory lock + 6 FK-ordered
    DELETEs + storage cleanup + post-teardown banner
  - _print_teardown_banner(household_id, removed, storage_removed) — bordered banner
    with per-table removal counts; "nothing to remove" note on empty re-run; FAILED
    sentinel for storage RuntimeError
affects:
  - backend/app/cli/seed.py (866 -> 999 lines; +133 net)
tech-stack:
  added: []                                  # zero new dependencies
  patterns:
    - pg_advisory_xact_lock at tx start (D-24 — same key as seed; serializes seed-vs-teardown)
    - explicit FK-respecting DELETE order regardless of CASCADE (Pitfall 9 — belt-and-suspenders)
    - storage cleanup AFTER db.commit() (D-16 — no orphaned photo_paths mid-cascade)
    - try/except RuntimeError around storage delete -> sentinel for banner (T-11-04-07)
    - text() with bound parameters for raw SQL DELETEs (typed-safe scope guard)
key-files:
  created: []
  modified:
    - backend/app/cli/seed.py
decisions:
  - Honor RESEARCH Pitfall 9 verified FK chain — DELETE order
    votes -> cooking_logs -> daily_shortlists -> recipes -> members -> households
    is hand-verified against migration 0001_baseline.py CASCADE/RESTRICT declarations.
  - Honor D-16 — db.commit() releases advisory lock BEFORE the Storage cleanup call.
    Storage failure raises RuntimeError that's caught and surfaced via WARNING +
    sentinel -1 in the banner; Postgres state remains clean for the operator's
    idempotent retry.
  - Storage delete is the only Storage operation outside the seed; it goes through
    Plan 01's `teardown_synthetic_storage` which enforces the `synthetic/` prefix
    via `_assert_synthetic_storage_path` (defense-in-depth — D-08).
  - Banner placement (per plan): _print_teardown_banner sits between
    _print_post_seed_banner and run_prod_synthetic_seed (banners together;
    functions that call them below).
  - The 7-vote count from Plan 02's vote_specs (2+1+2+2+0=7) is what the teardown
    banner will report via `votes removed: 7` on the operator runbook walkthrough,
    NOT the plan-text's stale "votes=4" figure (Plan 02 SUMMARY already documented
    this correction).
  - PgBouncer / advisory-lock incompatibility — surfaced inline via comment in
    run_teardown matching the comment in run_prod_synthetic_seed; runbook concern
    deferred to Plan 05 (no product-code change).
metrics:
  duration: ~6 min
  completed: 2026-05-09T12:30:00Z
  tasks: 1
  files_modified: 1
---

# Phase 11 Plan 04: run_teardown body — FK-respecting DELETEs + storage cleanup

**One-liner:** Replace the `NotImplementedError` stub of `run_teardown()` with the full
teardown body — `pg_advisory_xact_lock(SYNTHETIC_LOCK_KEY)` + 6 FK-respecting DELETEs
scoped to `household_id = SYNTHETIC_HOUSEHOLD_ID` + `db.commit()` + scope-guarded
`teardown_synthetic_storage()` + bordered post-teardown banner — without touching
`run_test_seed`, `run_prod_synthetic_seed`, or any product code.

## Tasks Executed

### Task 1: Implement run_teardown body — advisory lock + FK-ordered deletes + storage cleanup + banner

**Commit:** `95a9c60`

- Replaced the 1-line `raise NotImplementedError(...)` stub with a 105-line
  `run_teardown()` body that:
  1. Lazy-imports `teardown_synthetic_storage` from `app.services.storage` (kept
     module-level import surface unchanged — same boundary Plan 01/02 chose).
  2. Initializes a `removed` dict with zero counts for all 6 tables.
  3. Opens `SessionLocal()` and acquires `pg_advisory_xact_lock(SYNTHETIC_LOCK_KEY)`
     as the very first statement (D-24 — same key as `run_prod_synthetic_seed`,
     so concurrent seed-vs-teardown serializes).
  4. Issues 6 raw-SQL DELETEs via `text()` with bound parameter `:hh` =
     `SYNTHETIC_HOUSEHOLD_ID`, in the verified FK-respecting order:
     - `DELETE FROM votes WHERE shortlist_id IN (SELECT id FROM daily_shortlists WHERE household_id = :hh)`
     - `DELETE FROM cooking_logs WHERE household_id = :hh`
     - `DELETE FROM daily_shortlists WHERE household_id = :hh`
     - `DELETE FROM recipes WHERE household_id = :hh`
     - `DELETE FROM members WHERE household_id = :hh`
     - `DELETE FROM households WHERE id = :hh`  (households is keyed by `id`, not
       `household_id` — exact form per acceptance criterion)
  5. Records `r.rowcount or 0` per layer into `removed`.
  6. `db.commit()` — advisory lock auto-releases.
  7. Calls `teardown_synthetic_storage()` (Plan 01) wrapped in `try/except
     RuntimeError` — on failure, prints WARNING to stderr with retry instructions
     and sets `storage_removed = -1` sentinel.
  8. Calls `_print_teardown_banner(...)` with the per-table counts and storage count.

- Added `_print_teardown_banner` helper (28 lines) placed between
  `_print_post_seed_banner` and `run_prod_synthetic_seed` (per plan instruction —
  banners together; callers below). Banner:
  - 70-char `=` border (matches post-seed banner style)
  - "SYNTHETIC HOUSEHOLD TEARDOWN — {household_id}" header
  - 6 right-aligned removal-count rows (`{count:>4d}` for visual alignment)
  - 7th row: storage objects removed (or `FAILED — see WARNING above` on -1)
  - When all 6 Postgres counts are 0 AND storage_removed is in (0, -1):
    "Note: nothing to remove (already torn down or never seeded)." closing line
    (idempotent-re-run signal for the operator).

## Verification — actual stdout

### Final line count

| Function                  | Lines |
|---------------------------|-------|
| `run_teardown`            | 105 (was 2 — pure stub)        |
| `_print_teardown_banner`  | 28                              |
| `seed.py` total           | 999 (was 866 after Plan 02)     |

### Static AST + ordered-fragment verification (Task 1 verify block)

```
teardown checks pass
run_teardown :hh count: 7
run_teardown lines: 42
```

Ordered fragment positions in `ast.unparse(run_teardown)` body:

```
  602  pg_advisory_xact_lock
 1030  DELETE FROM votes
 1236  DELETE FROM cooking_logs
 1400  DELETE FROM daily_shortlists
 1572  DELETE FROM recipes
 1726  DELETE FROM members
 1880  DELETE FROM households
 2009  db.commit()
 2056  teardown_synthetic_storage()
 2373  _print_teardown_banner(
ORDER: OK
```

All 10 acceptance fragments present in the exact specified order.

### Grep acceptance criteria — all green

| Criterion                                               | Result |
|---------------------------------------------------------|--------|
| `def run_teardown` count                                | 1      |
| `NotImplementedError` count (must be 0)                 | 0      |
| `def _print_teardown_banner` count                      | 1      |
| `:hh` count (>=7 expected)                              | 7      |
| `household_id = :hh` count (>=5 expected)               | 6 (5 DELETEs + 1 docstring reference) |
| `households WHERE id = :hh` count (>=1 expected)        | 1      |
| `DELETE FROM (votes\|cooking_logs\|daily_shortlists\|recipes\|members\|households)` | 6 lines |

(The 6 `household_id = :hh` occurrences include the 5 raw DELETE statements +
the votes-subquery `WHERE household_id = :hh` form. The 7th `:hh` is the
`households WHERE id = :hh` form which uses `id` not `household_id`. Plus 1
docstring mention of `household_id = :hh`.)

### Banner dry-run — three modes

**Mode 1: expected post-teardown (full counts)**

```
======================================================================
  SYNTHETIC HOUSEHOLD TEARDOWN — 9f3b1902-8a8d-5a5a-a9e4-a7202de26998
======================================================================
  votes removed:                    7
  cooking_logs removed:             3
  daily_shortlists removed:         1
  recipes removed:                 21
  members removed:                  2
  households removed:               1
  storage objects removed:         21
======================================================================
```

(Note: `votes removed: 7`, NOT 4 — matches Plan 02 SUMMARY's vote_specs
producing 2+1+2+2+0=7 rows.)

**Mode 2: idempotent re-run (already empty)**

```
======================================================================
  SYNTHETIC HOUSEHOLD TEARDOWN — 9f3b1902-8a8d-5a5a-a9e4-a7202de26998
======================================================================
  votes removed:                    0
  cooking_logs removed:             0
  daily_shortlists removed:         0
  recipes removed:                  0
  members removed:                  0
  households removed:               0
  storage objects removed:          0
======================================================================
  Note: nothing to remove (already torn down or never seeded).
======================================================================
```

**Mode 3: Postgres OK, Storage failed (sentinel)**

```
======================================================================
  SYNTHETIC HOUSEHOLD TEARDOWN — 9f3b1902-8a8d-5a5a-a9e4-a7202de26998
======================================================================
  votes removed:                    7
  cooking_logs removed:             3
  daily_shortlists removed:         1
  recipes removed:                 21
  members removed:                  2
  households removed:               1
  storage objects removed:       FAILED — see WARNING above
======================================================================
```

### Phase 10 test-seed regression check

```
run_test_seed 10/10 markers: OK
run_teardown body lines: 105
imports OK; module loads
```

The 10 marker fragments (`auth_token_luca = os.environ.get`, `Foyer Test`,
`TEST01`, `_id("member", "luca")`, `for spec in _recipe_specs():`,
`log_specs = [`, `shortlist_recipe_slugs = [`, `vote_specs = [`,
`db.commit()`, `seed: ok household=`) confirm `run_test_seed` body is
byte-for-byte unchanged. The seed module imports cleanly with no edits to
`run_prod_synthetic_seed` or any other function.

### Refusal paths still hold

```
=== test1: --teardown without --prod-synthetic ===
REFUSING: --teardown only valid with --prod-synthetic.
EXIT=1

=== test2: --prod-synthetic --teardown without env ===
REFUSING: --prod-synthetic passed but ALDENTE_PROD_SEED env var not '1' (got None).
Correct invocation: ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic
EXIT=1
```

Plan 01's `_guard_prod_environment` and the `--teardown` argparse-level refusal
gate are inherited unchanged.

### FK-respecting DELETE order — confirmation against RESEARCH §Pitfall 9

The 6 DELETEs in `run_teardown` match the verified FK chain (RESEARCH lines 560-571):

| # | Delete                | Scope clause                     | FK rationale                        |
|---|-----------------------|----------------------------------|-------------------------------------|
| 1 | votes                 | `shortlist_id IN (SELECT … :hh)` | RESTRICT to recipes/members         |
| 2 | cooking_logs          | `household_id = :hh`             | RESTRICT to recipes/members         |
| 3 | daily_shortlists      | `household_id = :hh`             | (votes already gone — CASCADE moot) |
| 4 | recipes               | `household_id = :hh`             | (cooking_logs/votes already gone)   |
| 5 | members               | `household_id = :hh`             | (recipes already gone — RESTRICT moot) |
| 6 | households            | `id = :hh`                       | (cascades empty — defensive)        |

Storage delete happens AFTER `db.commit()` (verified position 2009 < 2056 in
the AST unparse) — D-16 invariant: no orphaned `recipes.photo_paths` references
mid-teardown.

**End-to-end DB run NOT executed.** Plan 05's runbook walkthrough is the
canonical end-to-end gate (matches Plan 02 SUMMARY's deferral pattern). The
operator will:

1. `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic`            (full seed)
2. `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic --teardown` (full teardown)
   - Expected banner: votes=7, cooking_logs=3, daily_shortlists=1, recipes=21,
     members=2, households=1, storage_objects=21
3. `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic --teardown` (idempotency
   re-run — all zeros + "nothing to remove" note)

## Deviations from Plan

**None.** Plan 04 executed exactly as written. The single task, the verify block,
all acceptance criteria green, no scope creep.

### Notes on RESEARCH corrections honored

The 3 RESEARCH corrections still apply at this stage:

1. **Bucket name `recipe-photos`** (not `recipes`) — `teardown_synthetic_storage`
   in `services/storage.py` (Plan 01) uses the `BUCKET` constant; this plan
   does not touch `storage.py`. No literal `"recipes"` strings introduced.
2. **`recipes.photo_paths` populated** — Plan 02 already wires this; teardown
   simply deletes the rows (no concern at this layer).
3. **PgBouncer / advisory-lock incompatibility** — surfaced inline via comment
   in `run_teardown` mirroring `run_prod_synthetic_seed`; runbook concern
   deferred to Plan 05.

## Authentication Gates

None. All work was local file edits + AST/import checks. The prod Supabase
DB and Storage are not touched by this plan — Plan 05's runbook walkthrough
will be the first time `run_teardown` runs against real prod creds.

## Pending Operator Verification (deferred to Plan 05 runbook)

The static checks above prove the function compiles, imports, matches all
structural acceptance criteria, and that all 3 banner modes render. The
end-to-end DB+Storage smoke test is explicitly deferred per the plan's
`<verification>` operator-side block.

Plan 05's RUNBOOK walkthrough will:

1. Document the direct-connection (session-mode) requirement for advisory locks.
2. Walk the operator through seed → teardown → re-teardown idempotency check.
3. Document Pitfall 10 (auditor's member #3 wiped on teardown — by-design).
4. Cover troubleshooting: Storage failure mid-teardown ("re-run, it's idempotent").

## Product-Code Concerns Flagged (NOT fixed)

**None surfaced.** The only file modified is `backend/app/cli/seed.py` (within
plan scope). Per the executor scope-creep memory and the orchestrator's hard
scope boundary, no other files were touched. `services/storage.py` was read
to confirm `teardown_synthetic_storage` exists and is scope-guarded (it is —
Plan 01 already verified this); not modified.

## Self-Check: PASSED

- File `backend/app/cli/seed.py` exists at expected path: FOUND.
- File `.planning/phases/11-production-synthetic-household/11-04-SUMMARY.md`: this file.
- Commit `95a9c60`: FOUND (`feat(11-04): implement run_teardown body — advisory lock + FK-ordered DELETEs + storage cleanup`).
- `run_teardown` no longer raises `NotImplementedError`: VERIFIED via AST + import check.
- All 10 ordered fragments present in exact spec order: VERIFIED.
- 7 `:hh` occurrences (>=7 acceptance threshold): VERIFIED.
- Static AST + grep + import + banner-dry-run checks: ALL GREEN.
- `run_test_seed` 10-marker regression: ALL 10 PRESENT.
- Refusal paths from Plan 01: BOTH STILL HOLD.

## Plan Output Spec — Confirmation

After this plan:

- `run_teardown()` is end-to-end: hard-refusal guards (Plan 01) inherited via
  `main()` dispatch + advisory lock + 6-table FK-ordered DELETEs (D-16) +
  scope-guarded Storage cleanup + post-teardown banner (D-13 style).
- Both `run_prod_synthetic_seed` (Plan 02) and `run_teardown` (this plan) are
  fully implemented; the seed CLI is functionally complete for v0.3 Phase 11.
- Plan 05 will write `RUNBOOK.md` and walk the operator through the first
  end-to-end seed + teardown round-trip against prod Supabase, completing
  Phase 11.
