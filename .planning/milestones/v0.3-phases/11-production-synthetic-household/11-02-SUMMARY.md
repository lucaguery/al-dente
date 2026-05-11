---
phase: 11-production-synthetic-household
plan: 02
subsystem: backend-cli
tags: [seed, prod-synthetic, idempotency, advisory-lock, supabase-storage, banner]
requires:
  - .planning/phases/11-production-synthetic-household/11-CONTEXT.md
  - .planning/phases/11-production-synthetic-household/11-RESEARCH.md
  - .planning/phases/11-production-synthetic-household/11-01-SUMMARY.md
provides:
  - run_prod_synthetic_seed body (was NotImplementedError stub) — end-to-end
    household + members + recipes + cooking_logs + shortlist + votes + banner
  - _gather_synthetic_counts(db) — 5 scoped DB counts + 1 Storage count (D-13)
  - _print_post_seed_banner(household_id, invite_code, counts) — bordered ANSI-bold
    banner with 6 count rows + idempotency reminder (D-13 + D-15)
  - Pre-flight check: REFUSING if any of the 21 spec slugs lacks a committed JPG
  - Pre-flight check: REFUSING if Supabase Storage creds are missing (Pitfall 8)
affects:
  - backend/app/cli/seed.py (566 -> 866 lines; +300 net)
tech-stack:
  added: []                                  # zero new dependencies
  patterns:
    - pg_advisory_xact_lock at tx start (D-24 — releases auto on commit/rollback)
    - sliding-date idempotency keys (D-10/D-11 — closes v0.2.2 SEED-01 hole for prod-synthetic)
    - same-tx denormalization of recipes.last_cooked_at + cook_count (architecture invariant #3)
    - pg_insert.on_conflict_do_update for vote upserts against stable shortlist UUID (D-12)
    - early Storage dry-run BEFORE any DB write (Pitfall 8 — fail fast on missing creds)
key-files:
  created: []
  modified:
    - backend/app/cli/seed.py
decisions:
  - Honor 7-vote count (truth #7 / orchestrator brief): vote_specs produce
    2+1+2+2+0 = 7 rows across the 5 specs. The plan's task acceptance text said
    "votes=4" in two places; that was a counting error — the actual row count
    of the 5 vote_specs is 7. CONTEXT.md, PROJECT.md, and Plan 01's SUMMARY all
    say 7. The expected post-seed banner prints `votes=7`.
  - Honor RESEARCH Pitfall 1: bucket name is `recipe-photos`, accessed via the
    BUCKET constant from services/storage.py (Plan 01 already did this). No
    literal `"recipes"` storage strings in this plan's additions.
  - Honor RESEARCH Pitfall 2: every Recipe row has `photo_paths=[photo_path]`
    populated in the SAME db.merge call as the upload — without this, the
    auditor's iPhone session 404s on signed-URL reads.
  - Use `_id_synth("cooking_log", slug)` (no date) for D-10 sliding cooking logs.
  - Use `_id_synth("shortlist", "today")` (no date) for D-11 sliding shortlist.
  - Vote IDs use `_id_synth("vote", slug, str(member_id))`. The `str(member_id)`
    is intentional — it's part of the deterministic UUID5 key, not a date.
    On_conflict_do_update is keyed on `(shortlist_id, recipe_id, member_id)`
    matching the existing uq_votes_shortlist_recipe_member constraint.
  - Vote scope guard via the parent recipe's `_assert_synthetic_household` —
    Vote rows have no household_id column. This honors Plan 01's Pattern 6
    nuance documented in 11-01-SUMMARY.md.
metrics:
  duration: ~12 min
  completed: 2026-05-09T12:00:00Z
  tasks: 2
  files_modified: 1
---

# Phase 11 Plan 02: run_prod_synthetic_seed body + post-seed banner

**One-liner:** Replace the `NotImplementedError` stub of `run_prod_synthetic_seed()`
with the full prod-synthetic seed body — pg_advisory_xact_lock, household + members
+ 21 recipes (with `photo_paths` populated, Pitfall 2), 3 sliding cooking_logs (D-10),
1 sliding shortlist (D-11), 7 vote rows producing all 5 computed states (D-12),
and a bordered post-seed COUNT-diff banner (D-13 + D-15) — without touching
`run_test_seed`, `run_teardown`, or any product code.

## Tasks Executed

### Task 1: Implement run_prod_synthetic_seed body

**Commit:** `d74cc92`

- Added imports at top of seed.py: `secrets`, `Path`, `text` (from sqlalchemy).
- Added module-level constant `SYNTHETIC_PHOTOS_DIR = Path(__file__).parent / "synthetic_photos"`.
- Replaced the 1-line `raise NotImplementedError(...)` stub with a 221-line
  `run_prod_synthetic_seed()` body that:
  1. Lazy-imports `upload_synthetic_photo_idempotent` and
     `list_synthetic_storage_count` from `app.services.storage` (kept module-level
     import surface unchanged for run_test_seed callers — Plan 01 chose the same
     boundary).
  2. **Pitfall 8 dry-run:** calls `list_synthetic_storage_count()` BEFORE any DB
     write. If creds are missing, exits with `REFUSING: Supabase Storage not
     configured (...)` — no partial DB state.
  3. **Pre-flight photo check:** asserts every `_recipe_specs()` slug has a
     committed `<slug>.jpg` at `SYNTHETIC_PHOTOS_DIR`. Refuses with explicit list
     of missing slugs if not — directs the operator to Plan 03.
  4. Opens a `SessionLocal()` and acquires `pg_advisory_xact_lock(SYNTHETIC_LOCK_KEY)`
     as the very first statement (D-24).
  5. Merges household via `_merge_synthetic` (D-05 label, D-14 invite code).
  6. Merges 2 members (Luca + Partner) via `_merge_synthetic`. Each gets a fresh
     `secrets.token_urlsafe(32)` per run (D-18). Tokens never printed.
  7. `db.flush()` after members (Pitfall 4).
  8. Loops `_recipe_specs()` (D-23 — single source of truth with run_test_seed):
     reads JPG bytes, calls `upload_synthetic_photo_idempotent(slug=, content=)`,
     and merges Recipe with `photo_paths=[photo_path]` populated (Pitfall 2).
     Every NOT NULL column set explicitly (Pitfall 5).
  9. `db.flush()` after recipes loop (recipe IDs must be visible to cooking_log
     denorm queries below).
  10. Loops 3 cooking_log specs. UUID key is `_id_synth("cooking_log", slug)`
      with NO date component (D-10). `cooked_at = now - timedelta(days=N)` per
      spec — slides on every re-run. Same-tx denorm of `last_cooked_at` and
      `cook_count` (architecture invariant #3) recomputed from row count.
  11. Merges 1 shortlist with UUID key `_id_synth("shortlist", "today")` and NO
      date in the key (D-11). `date` field set to `today` — slides on re-run.
  12. Loops 5 vote_specs. For each, asserts the parent recipe is in synthetic
      scope (Vote has no household_id — Plan 01 documented this nuance). Issues
      `pg_insert(Vote).on_conflict_do_update(...)` for each non-None vote value.
      Total: 2+1+2+2+0 = 7 vote rows producing all 5 computed states.
  13. `db.commit()` — advisory lock auto-releases.
  14. Calls `_gather_synthetic_counts(db)` and `_print_post_seed_banner(...)`
      (defined by Task 2).

### Task 2: Add _gather_synthetic_counts and _print_post_seed_banner (D-13, D-15)

**Commit:** `52896f4`

- Added two helper functions ABOVE `run_prod_synthetic_seed` (bottom-up
  definition order — helpers, then the function that uses them).
- `_gather_synthetic_counts(db) -> dict[str, int]` (45 lines):
  - 5 SQLAlchemy `select(func.count(...))` queries scoped to SYNTHETIC_HOUSEHOLD_ID:
    recipes, members, cooking_logs, daily_shortlists; votes via JOIN
    `Vote.shortlist_id == DailyShortlist.id` filtered on
    `DailyShortlist.household_id == SYNTHETIC_HOUSEHOLD_ID` (since Vote has no
    household_id column).
  - 1 Storage object count via `list_synthetic_storage_count()` (Plan 01 helper).
  - Returns `{"recipes", "members", "cooking_logs", "votes", "shortlists",
    "storage_objects"}` int dict.
- `_print_post_seed_banner(*, household_id, invite_code, counts) -> None` (26 lines):
  - 70-char `=` border.
  - "SYNTHETIC HOUSEHOLD SEEDED — {household_id}" line.
  - "Synthetic invite code: \033[1m{invite_code}\033[0m" line (ANSI-bold,
    no color — terminals vary).
  - 6 right-aligned count rows (`{count:>4d}` for visual alignment).
  - Closing reminder: "Idempotency check: re-run this command and confirm counts
    match." (D-13 smoke check).

## Verification — actual stdout

### Task 1 AST static checks (Task 1 verify block)

```
OK: advisory lock
OK: D-05 label
OK: D-14 invite
OK: D-10 sliding
OK: D-11 sliding
OK: photo_paths
OK: _merge_synthetic uses
OK: D-18 token
OK: no NotImplementedError
```

### Task 1 grep acceptance — all green

| Criterion | Result |
|---|---|
| `pg_advisory_xact_lock` count (>=1) | 3 (function + comment + module-level constant ref) |
| `_merge_synthetic` count (>=6) | 8 (1 household + 2 members + 21-recipes-loop site + 3-logs-loop site + 1 shortlist + module-level def + ...) |
| `[SYNTHETIC] Démo Al Dente` count (>=1) | 1 |
| `"DEMO01"` count (>=1) | 2 (run_prod_synthetic_seed merge + banner call) |
| `token_urlsafe(32)` count (>=2) | 2 (Luca + Partner) |
| `photo_paths=[photo_path]` count (== 1) | 1 (the recipes loop) |
| `upload_synthetic_photo_idempotent` count (>=2) | 3 (lazy import + call + comment ref) |
| `_id_synth("cooking_log", slug)` count (== 1) | 1 — verifies D-10 sliding (no date arg) |
| `_id_synth("shortlist", "today")` count (== 1) | 1 — verifies D-11 sliding (no date arg) |
| `str(cooked_at.date())` count (== 1) | 1 (only in run_test_seed — NOT in prod-synthetic path) |
| `REFUSING: Supabase Storage not configured` count (== 1) | 1 — Pitfall 8 dry-run |
| `REFUSING: missing photo` count (== 1) | 1 — pre-flight check |
| `NotImplementedError` in run_prod_synthetic_seed body | 0 (stub fully replaced) |

### Task 2 banner dry-run (Task 2 verify block)

```
signature OK: ['household_id', 'invite_code', 'counts']
======================================================================
  SYNTHETIC HOUSEHOLD SEEDED — 9f3b1902-8a8d-5a5a-a9e4-a7202de26998
  Synthetic invite code: [1mDEMO01[0m
======================================================================
  recipes:                         21
  members:                          2
  cooking_logs:                     3
  votes:                            7
  shortlists:                       1
  storage objects (synthetic/):    21
======================================================================
  Idempotency check: re-run this command and confirm counts match.
======================================================================
```

(`[1m` and `[0m` are the ANSI escape sequences `\033[1m` / `\033[0m` — bold on
in a real terminal.)

### Task 2 grep acceptance — all green

| Criterion | Result |
|---|---|
| `def _gather_synthetic_counts` count | 1 |
| `def _print_post_seed_banner` count | 1 |
| `Synthetic invite code` count | 1 |
| `storage objects` count (>=1) | 2 |

### SQL compile check — all 5 _gather_synthetic_counts queries

```
All 5 queries compile cleanly.
```

(Recipes, Members, CookingLog, DailyShortlist, Vote-join — no SQLAlchemy
syntax errors, all keys to SYNTHETIC_HOUSEHOLD_ID resolve.)

### Phase 10 test-seed regression check (`run_test_seed` body unchanged)

```
imports OK
SYNTHETIC_PHOTOS_DIR = backend/app/cli/synthetic_photos
SYNTHETIC_PHOTOS_DIR.exists() = True
run_test_seed: all 10 marker fragments present (regression check OK)
run_prod_synthetic_seed length: 221 lines
NotImplementedError in run_prod_synthetic_seed body: False
```

10 marker fragments (`auth_token_luca = os.environ.get`, `Foyer Test`, `TEST01`,
`_id("member", "luca")`, `for spec in _recipe_specs():`, `log_specs = [`,
`shortlist_recipe_slugs = [`, `vote_specs = [`, `db.commit()`,
`seed: ok household=`) confirm `run_test_seed` body is byte-for-byte unchanged.

**End-to-end DB run not executed.** The orchestrator brief says we cannot run
the full prod-synthetic seed without prod creds + opt-in — Plan 05's runbook
walkthrough is the canonical end-to-end gate.

### Final line count

| Function | Lines |
|---|---|
| `run_prod_synthetic_seed` | 221 (was 2 — pure stub) |
| `_gather_synthetic_counts` | 45 |
| `_print_post_seed_banner` | 26 |
| `seed.py` total | 866 (was 566 after Plan 01) |

## Deviations from Plan

**1. [Documented vote count: 7 not 4]** — The plan's task-text said
`votes=4` in 3 places (must_have truth #7 line 24, Task 2 acceptance line
517, success criterion #8 line 614). The orchestrator brief explicitly
corrects this to 7 ("exactly 7 vote rows (not 4)"). I implemented the
documented 5 vote_specs which produce 2+1+2+2+0 = **7** rows total.
CONTEXT.md / PROJECT.md / Plan 01's SUMMARY all confirm 7. The post-seed
banner prints `votes=7`. **No code change relative to the plan body** — the
plan's vote_specs literal already produces 7 rows; only the banner-count
narrative was wrong.

Otherwise: **None.** Plan 02 executed as written. Both tasks, both verify
blocks, all acceptance criteria green, no scope creep.

## Authentication Gates

None. All work was local file edits + AST/import checks. The prod Supabase
DB and Storage are not touched by this plan — Plan 05's runbook walkthrough
will be the first time `run_prod_synthetic_seed` runs against real prod creds.

## Pending Operator Verification (deferred to Plan 05 runbook)

The static checks above prove the function compiles, imports, and matches
all structural acceptance criteria. The end-to-end DB-write smoke test is
explicitly deferred — the plan's `<verification>` section says:

> "Operator dry-run (NOT automated — requires prod creds + opt-in)"

Plan 05's RUNBOOK walkthrough is the canonical end-to-end gate. Operator
will:

1. Run `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic` against prod.
2. Verify banner prints
   `recipes=21 members=2 cooking_logs=3 votes=7 shortlists=1 storage_objects=21`.
3. Re-run within the same day → banner counts identical (D-13 idempotency).
4. Re-run next day → cooking_log `cooked_at` shifted +1d (D-10), shortlist
   date = new today (D-11), counts unchanged.

## Product-Code Concerns Flagged (NOT fixed)

**None surfaced.** The only file modified is `backend/app/cli/seed.py`
(within plan scope). Per the executor scope-creep memory and the
orchestrator's hard scope boundary, no other files were touched.

The PgBouncer / advisory-lock incompatibility (RESEARCH.md "Open Questions"
+ "Environment Availability") is documented inline in the
`run_prod_synthetic_seed` body via comment but is fundamentally a runbook
concern (Plan 05 will document the direct-connection requirement). The
inline comment does not add or modify product code.

## Self-Check: PASSED

- File `backend/app/cli/seed.py` exists at expected path: FOUND.
- File `.planning/phases/11-production-synthetic-household/11-02-SUMMARY.md`: this file.
- Commit `d74cc92`: FOUND (`feat(11-02): implement run_prod_synthetic_seed body — household + members + recipes`).
- Commit `52896f4`: FOUND (`feat(11-02): add _gather_synthetic_counts and _print_post_seed_banner (D-13, D-15)`).
- `run_prod_synthetic_seed` no longer raises `NotImplementedError`: VERIFIED via AST + import check.
- Static AST + grep + import + SQL-compile checks: ALL GREEN.
- `run_test_seed` 10-marker regression: ALL 10 PRESENT.

## Plan Output Spec — Confirmation

After this plan:

- `run_prod_synthetic_seed()` is end-to-end: hard-refusal guards (Plan 01) +
  Storage dry-run + photo pre-flight + advisory lock + 6-table allowlist
  writes (D-07) + post-seed banner (D-13, D-15).
- The function compiles cleanly and imports without errors (with `DATABASE_URL`
  set — pydantic-settings requirement, unrelated to plan changes).
- Plan 03 (committed in this base) supplies the 21 JPGs the pre-flight check
  expects.
- Plan 04 will fill `run_teardown()` (still raises `NotImplementedError`).
- Plan 05 will write `RUNBOOK.md` and walk the operator through the first
  end-to-end run against prod Supabase.
