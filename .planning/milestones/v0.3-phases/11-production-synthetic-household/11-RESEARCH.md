# Phase 11: Production Synthetic Household — Research

**Researched:** 2026-05-09
**Domain:** Python CLI extension + Postgres idempotency + Supabase Storage idempotency + operator runbook
**Confidence:** HIGH (every load-bearing claim verified against installed source files)

## Summary

Phase 11 is **not** a research phase in the discovery sense — every architectural decision is locked in CONTEXT.md (24 D-numbers). The job here is to surface the *exact mechanics* the planner needs: which storage3 SDK methods to call, how `pg_advisory_xact_lock` is invoked from SQLAlchemy 2.0 sync sessions, where the existing `seed.py` already does what we need (so we extend, not rebuild), and where it's missing things (so the plan adds them).

**Five concrete corrections** the planner MUST act on, surfaced by reading the current code rather than CONTEXT.md alone:

1. **The Supabase Storage bucket is `"recipe-photos"`, not `"recipes"`.** CONTEXT.md D-21 says "the existing `recipes` Supabase Storage bucket". The codebase uses `BUCKET = "recipe-photos"` (`backend/app/services/storage.py:34`). Use `recipe-photos` — adding a new `recipes` bucket would split storage and break the existing photo-read path. Storage path becomes `synthetic/<recipe-slug>.jpg` *under* the `recipe-photos` bucket.
2. **`storage3.SyncBucket` already exposes `.exists(path)` (a HEAD call) and `.remove(paths)` (DELETE).** No need to write a custom HEAD helper. The D-22 skip-if-exists flow is `bucket.exists(path)` → if False, `bucket.upload(...)`.
3. **Photo path on `recipes.photo_paths` will fail signed-URL reads under the existing scope guard.** `routers/photos.py:173` rejects any path not in `recipe.photo_paths` AND `routers/photos.py` 404s on cross-household. The synthetic recipe rows MUST have their `synthetic/<slug>.jpg` paths recorded in `photo_paths` for the auditor's joined session to read photos. The current Phase 10 seed sets `photo_paths=[]` (line 308) — Phase 11 must populate it.
4. **The current seed has no argparse and no command dispatch.** It's `def main() -> None: _guard_environment(); ...`. Adding `--prod-synthetic` and `--teardown` requires introducing argparse + a mode dispatch at the top of `main()`. No `click` precedent in the repo — stdlib `argparse` is the right call.
5. **`uv run seed` swallows `argv[0]`.** The `[project.scripts] seed = "app.cli.seed:main"` entry point invokes `main()` with `sys.argv` already populated by uv. Argparse reads `sys.argv[1:]` per default — works without changes. But the runbook's documented invocation must be `uv run seed --prod-synthetic` (one space, two hyphens; `--` separator is NOT needed because `seed` is the registered console script, not a `uv run python` invocation).

**Primary recommendation:** Use stdlib `argparse` for mode dispatch. Use the existing `storage3.SyncBucket` API (`exists`, `upload`, `remove`). Derive the `pg_advisory_xact_lock` key from `synthetic_household_uuid.int & ((1 << 63) - 1)`. Populate `recipes.photo_paths` with the synthetic storage paths so auditor signed-URL reads succeed. Keep the same `db.merge` / `pg_insert.on_conflict_do_update` idempotency pattern from Phase 10.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hard-refusal opt-in:**
- D-01: `--prod-synthetic` CLI flag AND `ALDENTE_PROD_SEED=1` env var both required.
- D-02: Prod detected by `database_url` containing `'supabase.co'`. Refuses if URL contains `'localhost'` or `'aldente_test'`.
- D-03: Loud `sys.exit` with offending state, correct invocation, non-zero exit code.
- D-04: Symmetric guard — test/local seed refuses if `--prod-synthetic` or `ALDENTE_PROD_SEED=1` set.

**Labeling & scope guard:**
- D-05: Household name `"[SYNTHETIC] Démo Al Dente"`. Members keep normal French names. Recipes keep normal-looking titles.
- D-06: `_synthetic_household_id()` helper returns locked uuid5; assert wrapper for every INSERT/UPDATE.
- D-07: 6-table Postgres allowlist: `households`, `members`, `recipes`, `cooking_logs`, `votes`, `daily_shortlists`.
- D-08: Storage write key prefix scope guard — `synthetic/<recipe-slug>.jpg` only.
- D-09: Same file (`seed.py`), parameterized via `--prod-synthetic` mode. ID namespace `"aldente.prod.synthetic.<entity>.<key>"`.

**Cross-day idempotency (closes SEED-01 hole):**
- D-10: Cooking_log dates slide — `_id("cooking_log", slug)` only (no date in key). On re-run, `cooked_at = now - timedelta(days=N)` UPDATEs.
- D-11: Daily_shortlist slides — `_id("shortlist", "today")`, no date in key. UPDATEs `date = today`.
- D-12: Votes reference sliding shortlist; vote rows UPDATE in place.
- D-13: Post-seed COUNT diff for idempotency verification (operator runs twice, eyeballs).

**Invite code & teardown:**
- D-14: Fixed `"DEMO01"` invite code.
- D-15: Print `Synthetic invite code: DEMO01` after commit (SEED-03).
- D-16: `--teardown` subcommand. Storage objects deleted AFTER `recipes` rows. Postgres FK order: votes → cooking_logs → daily_shortlists → recipes → members → household.
- D-17: `RUNBOOK.md` at repo root + stub at `.planning/v0.3/RUNBOOK.md`.

**Member auth & auditor flow:**
- D-18: `secrets.token_urlsafe(32)` per run, never printed, never stored outside DB.
- D-19: Auditor joins as member #3 via invite-code flow; seed only merges 2 deterministic members.

**Photos & Storage:**
- D-20: All 21 recipes get photos at `backend/app/cli/synthetic_photos/<slug>.jpg`.
- D-21: Storage path `synthetic/<recipe-slug>.jpg` under existing `recipes` bucket. **(NOTE: actual bucket name is `recipe-photos` — see Pitfall 1.)**
- D-22: Skip-if-exists upload (HEAD before PUT).

**Recipe corpus:**
- D-23: Same 21 recipe specs as local seed — import `_recipe_specs()` directly.

**Concurrency:**
- D-24: `pg_advisory_xact_lock(<hash of synthetic_household_uuid>)` at tx start.

### Claude's Discretion

The following are implementation details the executor should decide WITHOUT re-asking:
- Exact Supabase Storage SDK call shape — **resolved in this research: use `storage3.SyncBucket.exists()` and `.upload()`**
- Exact byte-budget for committed JPGs (target ~50–150 KB per photo)
- Whether HEAD check uses existing `services/storage.py` helpers or a fresh helper — **recommend: extend `services/storage.py` with two new functions, see "Architecture Patterns" below**
- Exact Python `argparse` shape — **recommend: stdlib `argparse` with subparser-style `--teardown` flag, see "Architecture Patterns"**
- Whether post-seed COUNT diff is one print line or a small table — **recommend: small bordered banner, includes household ID + invite code + counts in one block (operator-discoverable)**
- Color/order of printed invite-code line — **recommend: ANSI-bold banner, no color (terminals vary)**
- Where the assertion wrapper from D-06/D-08 lives — **recommend: top-of-file helpers, applied consistently**
- Exact pg_advisory_xact_lock numeric key derivation — **resolved: `synthetic_uuid.int & ((1 << 63) - 1)`, see Standard Stack**

### Deferred Ideas (OUT OF SCOPE)

- Observability/audit trail of who ran the prod seed when (no structured logging to external sink)
- Rate-limit handling against Supabase free tier (21 HEAD + 0–21 PUT per run is well within headroom)
- AI-generated photos via Gemini (rejected — non-deterministic, quota cost)
- Curated edge-case recipe specs (rewrites SEED-05's "21 recipes" criterion)
- Multi-tenant fixtures
- CI integration of the prod seed
- Closing the 4 v0.2.2 backlog issues beyond what naturally falls out (TZ-01, URL-01, CL-01, Sheet-01)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEED-01 | Operator can run seed against prod Supabase, creating/updating one labeled synthetic household | D-01/D-02/D-03 guard + D-05 label + storage3 SDK use (see Architecture Patterns) |
| SEED-02 | Idempotent across re-runs — same UUIDs, same invite code, no duplicate-key errors, deterministic | D-10/D-11/D-12 sliding keys + db.merge / on_conflict_do_update from Phase 10 (already verified working at `seed.py:264-418`); plus D-22 storage skip-if-exists via `storage3.SyncBucket.exists()` |
| SEED-03 | CLI prints invite code to stdout | D-15 print after commit; banner format in "Architecture Patterns" |
| SEED-04 | Hard-refusal guard + written runbook | D-01..D-04 guards + D-17 RUNBOOK.md location |
| SEED-05 | Coverage matches local seed: 2 members + 21 recipes + 3 cooking_logs + 7 votes covering 5 states | D-23 import `_recipe_specs()` directly + same vote-spec structure as Phase 10 (`seed.py:386-393`) |

## Project Constraints (from CLAUDE.md)

The planner MUST verify these before signing off:

- **Invariant #2 (voting state computed, not stored):** Phase 11 inserts rows into `votes` to drive the 5 computed states; never write a `state` column.
- **Invariant #3 (same-tx denormalization for cooking_logs):** When inserting cooking_logs, update `recipes.last_cooked_at` and `recipes.cook_count` in the same transaction. Phase 10 already does this at `seed.py:348-361`; Phase 11 reuses the pattern.
- **Invariant #5 (raw inputs preserved):** Recipes get `source_capture = {"type": "manual", "payload": {"title": ...}}` (matches Phase 10's `seed.py:304-307`).
- **Invariant #6 (French-only via next-intl):** N/A for backend seed strings; RUNBOOK.md and stdout are operator-facing English.
- **Invariant #7 (single uvicorn worker):** N/A — seed is a one-shot CLI process.
- **Locked vocabularies (`enums.py` import):** The existing seed already imports `Cuisine, Mood, Protein, Season` from `app.models.enums` (`seed.py:39`). Phase 11 inherits this; no duplication.
- **No manual deploys (`feedback_no_manual_vercel_deploy.md`):** Phase 11's runbook covers operator's local CLI invocation, NOT any deploy command.
- **Executor scope-creep guard (`feedback_executor_scope_creep.md`):** The plan MUST pass CONTEXT.md + this RESEARCH.md to the executor with a hard scope: extend `seed.py` + add photos + write runbook. NO product-code refactors. If a real bug surfaces, flag and stop.

## Standard Stack

### Core (already in `backend/pyproject.toml`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sqlalchemy` | >=2.0 | ORM + advisory lock invocation | Already used; `seed.py` works in 2.0 typed style |
| `psycopg2-binary` | >=2.9.12 | Sync Postgres driver | Already wired via `app/db.py:15`; `pool_pre_ping=True, future=True` |
| `supabase` | >=2.0 | Storage SDK (transitively pulls `storage3==2.29.0`) | Already used by `app/services/storage.py:28` |
| `argparse` | stdlib | CLI flag parsing | No `click` precedent in repo; argparse keeps the dependency surface minimal |

### Verified versions (registry as of 2026-05-09)

| Package | Lockfile version | Verified |
|---------|------------------|----------|
| `storage3` | 2.29.0 | `[VERIFIED: backend/uv.lock]` — `.exists(path)` API confirmed at `.venv/lib/python3.12/site-packages/storage3/_sync/file_api.py:395-415` (HEAD request, returns bool) |
| `supabase` | 2.29.0 | `[VERIFIED: backend/uv.lock]` |
| `psycopg2-binary` | (whatever lockfile pins) | `[VERIFIED: pyproject.toml:14]` |

**No version updates needed.** Phase 11 uses libraries already on disk.

### Don't add

- **`click`:** No precedent in the codebase; would add an import for one CLI. Stdlib `argparse` is sufficient.
- **`alembic-utils` / `pg-advisory-locker`:** Phase 11 uses one advisory_xact_lock call — direct `db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": ...})` is enough, no helper library needed.
- **`Pillow`:** D-20 photos are pre-resized JPGs committed to disk. The seed reads bytes and uploads — no runtime image processing.

### Photo source (D-20)

[CITED: pexels.com/license/, foodiesfeed.com/license] **Pexels license** (no attribution required, free for commercial use, includes free CC0 photos) and **Foodiesfeed (CC0-equivalent license)** are both free-license libraries suitable for the 21 committed JPGs. For each recipe slug, the operator (Luca) curates one image, downloads, resizes to ~50–150 KB JPEG (target longest edge 1200 px is plenty for an iPhone-shape audit), commits to `backend/app/cli/synthetic_photos/<slug>.jpg`. No runtime image processing — bytes are uploaded as-is.

## Architecture Patterns

### Recommended file structure (Phase 11 additions)

```
backend/
├── app/
│   ├── cli/
│   │   ├── seed.py                       # EXTENDED — argparse, prod-synthetic + teardown modes
│   │   └── synthetic_photos/             # NEW — 21 committed JPGs
│   │       ├── poulet-citron.jpg
│   │       ├── ragu-bolognese.jpg
│   │       └── …                         # full list in "Photo Source Curation" section below
│   └── services/
│       └── storage.py                    # EXTENDED — three new helpers (see below)
RUNBOOK.md                                # NEW — operator runbook (D-17)
.planning/v0.3/
└── RUNBOOK.md                            # NEW — stub linking to root (D-17)
```

### Pattern 1: argparse with mode dispatch

The current seed has no flags. The minimal extension:

```python
# Source: planner pattern, derived from CONTEXT.md D-09 + stdlib argparse docs
import argparse

def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="seed",
        description="Idempotent synthetic seed for the Al Dente test or prod-synthetic DB.",
    )
    parser.add_argument(
        "--prod-synthetic",
        action="store_true",
        help="Target prod Supabase (REQUIRES ALDENTE_PROD_SEED=1 in env). "
             "Without this flag, seed targets the local test DB.",
    )
    parser.add_argument(
        "--teardown",
        action="store_true",
        help="Delete the synthetic household and all scoped storage objects. "
             "Only valid with --prod-synthetic.",
    )
    return parser.parse_args(argv)


def main() -> None:
    args = _parse_args()
    if args.prod_synthetic:
        _guard_prod_environment()
        if args.teardown:
            run_teardown()
        else:
            run_prod_synthetic_seed()
    else:
        if args.teardown:
            sys.exit("REFUSING: --teardown only valid with --prod-synthetic.")
        _guard_environment()  # the existing test-mode guard, EXTENDED for D-04 symmetry
        run_test_seed()
```

**Key:** `seed = "app.cli.seed:main"` in `pyproject.toml:24` already invokes `main()` with `sys.argv`. `argparse.parse_args()` with no argument reads `sys.argv[1:]`. No entry-point change needed — the new flags Just Work via `uv run seed --prod-synthetic`.

### Pattern 2: D-04 symmetric guard (extend existing `_guard_environment`)

`seed.py:53-63` currently refuses if not test. Extend to also refuse if prod flags accidentally set:

```python
def _guard_environment() -> None:
    """T-10-01 + D-04 symmetric guard.

    Refuses to run the test seed unless ENVIRONMENT=test AND database_url
    points at the test DB AND no prod opt-in flag/env var is set (D-04).
    """
    if os.environ.get("ALDENTE_PROD_SEED") == "1":
        sys.exit(
            "REFUSING: ALDENTE_PROD_SEED=1 set but --prod-synthetic flag NOT passed. "
            "Either pass --prod-synthetic to run prod-synthetic seed, "
            "or unset ALDENTE_PROD_SEED to run the test seed."
        )
    if settings.environment != "test":
        sys.exit(...)
    if "aldente_test" not in settings.database_url:
        sys.exit(...)
```

A new `_guard_prod_environment()` mirrors the polarity:

```python
def _guard_prod_environment() -> None:
    """D-01..D-04 — refuse unless BOTH the env var AND flag are set,
    AND we're certain we're targeting prod Supabase.
    """
    if os.environ.get("ALDENTE_PROD_SEED") != "1":
        sys.exit(
            f"REFUSING: --prod-synthetic passed but ALDENTE_PROD_SEED env var not '1' "
            f"(got {os.environ.get('ALDENTE_PROD_SEED')!r}). "
            f"Correct invocation: ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic"
        )
    if "supabase.co" not in settings.database_url:
        sys.exit(
            f"REFUSING: database_url does not contain 'supabase.co' "
            f"(got host {settings.database_url.split('@')[-1].split('/')[0]!r}). "
            f"Prod seed will not run against a non-Supabase URL."
        )
    if "localhost" in settings.database_url or "aldente_test" in settings.database_url:
        sys.exit(
            f"REFUSING: database_url contains 'localhost' or 'aldente_test' "
            f"(got {settings.database_url!r}). "
            f"Cannot be both prod and test."
        )
```

**Note on D-02 substring matching:** `db.<project>.supabase.co` is the verified prod URL shape (`backend/.env.example:2`). The substring `"supabase.co"` matches. False-positive risk is essentially zero — no other Supabase deployment URL pattern exists for this app.

### Pattern 3: pg_advisory_xact_lock (D-24)

[CITED: leontrolski.github.io/postgres-advisory-locks.html, sqlalchemy docs] Pattern for SQLAlchemy 2.0 sync session:

```python
# Source: SQLAlchemy 2.0 + Postgres advisory lock idiom
from sqlalchemy import text

# Derive a stable signed bigint from the household UUID. Postgres advisory
# lock keys are bigint (signed 64-bit). Mask to 63 bits to keep it positive
# (avoiding any sign-bit edge cases in the SQLAlchemy bind layer).
SYNTHETIC_HOUSEHOLD_ID = _id("household", "synthetic")  # uuid5
LOCK_KEY: int = SYNTHETIC_HOUSEHOLD_ID.int & ((1 << 63) - 1)

with SessionLocal() as db:
    # Acquire at tx start — releases automatically on commit/rollback.
    db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": LOCK_KEY})
    # … all writes happen here …
    db.commit()
```

**Why `& ((1 << 63) - 1)` and not `uuid.int >> 64` or hashlib:** UUID5 already produces a uniformly distributed 128-bit value; truncating to 63 bits preserves uniformity. Avoiding the sign bit means we never hit the "overload resolution between bigint and integer" trap that the asyncpg dialect runs into ([sqlalchemy discussion #7814](https://github.com/sqlalchemy/sqlalchemy/discussions/7814)). For a CLI run with one synthetic household, the chance of collision with anything else holding an advisory lock on the same prod DB is effectively zero — the namespace is unstructured but cooperative.

### Pattern 4: Supabase Storage idempotent upload + scope-guarded delete

```python
# Source: storage3.SyncBucket API verified at
# backend/.venv/lib/python3.12/site-packages/storage3/_sync/file_api.py
from app.config import settings
from supabase import create_client

SYNTHETIC_PREFIX = "synthetic/"

def _assert_synthetic_storage_path(path: str) -> None:
    """D-08 scope guard. Every Storage write/delete passes through this."""
    if not path.startswith(SYNTHETIC_PREFIX):
        raise AssertionError(
            f"refusing storage operation outside synthetic/ scope: {path!r}"
        )


def upload_synthetic_photo_idempotent(
    *, slug: str, content: bytes
) -> str:
    """D-08 + D-22 — skip-if-exists, scope-guarded upload.

    Returns the bucket-relative path stored in recipes.photo_paths.
    """
    path = f"synthetic/{slug}.jpg"
    _assert_synthetic_storage_path(path)

    client = create_client(
        settings.supabase_url, settings.supabase_service_role_key
    )
    bucket = client.storage.from_("recipe-photos")  # NOTE: not "recipes" — see Pitfall 1

    # storage3.SyncBucket.exists() issues HEAD; returns True/False.
    if bucket.exists(path):
        return path  # D-22 idempotent — no re-upload

    bucket.upload(
        path=path,
        file=content,
        file_options={"content-type": "image/jpeg", "upsert": "false"},
    )
    return path


def teardown_synthetic_storage() -> int:
    """D-16 + D-08 — scope-guarded prefix delete.

    Lists every object under synthetic/, asserts each path is in scope,
    then issues a single DELETE with the list. Returns the number of
    objects removed.
    """
    client = create_client(
        settings.supabase_url, settings.supabase_service_role_key
    )
    bucket = client.storage.from_("recipe-photos")
    listed = bucket.list("synthetic")
    paths = [f"synthetic/{obj['name']}" for obj in listed]
    for p in paths:
        _assert_synthetic_storage_path(p)  # belt-and-suspenders
    if paths:
        bucket.remove(paths)
    return len(paths)
```

**Bucket name proof:** `BUCKET = "recipe-photos"` at `app/services/storage.py:34`. The existing photo-read path (`routers/photos.py:179` → `create_signed_photo_url(path)`) reads from this same bucket. CONTEXT.md D-21 says "the existing `recipes` Supabase Storage bucket" — that's a transcription error; the actual bucket is `recipe-photos`. The plan must use `recipe-photos`, not `recipes`.

### Pattern 5: Recipes must record their photo_paths

The current Phase 10 seed sets `photo_paths=[]` at `seed.py:308`. Phase 11 must:

```python
# After uploading the photo, record the path on the recipe row in the SAME tx:
photo_path = upload_synthetic_photo_idempotent(slug=spec["slug"], content=jpeg_bytes)
r = db.merge(Recipe(
    id=_id("recipe", spec["slug"]),
    # … all the existing fields from seed.py:298-322 …
    photo_paths=[photo_path],  # CHANGED — was [] in Phase 10
    # …
))
```

**Why this matters:** `routers/photos.py:173` rejects any signed-URL request whose path is not in `recipe.photo_paths`. If the seed uploads `synthetic/poulet-citron.jpg` but doesn't record it on the recipe row, the auditor's joined session sees a recipe-detail page with no photo, defeating D-20's purpose. This is a single-line change but **load-bearing for the Phase 13 visual audit**.

### Pattern 6: D-06 row-write scope assertion wrapper

```python
def _assert_synthetic_household(row, expected_id: uuid.UUID) -> None:
    """D-06 — every write to the 6 allowlisted tables passes through this.

    Pulls `household_id` off the row (every allowlisted table has the column).
    Raises if the row is for the wrong household or the column is missing.
    """
    actual = getattr(row, "household_id", None)
    if actual is None:
        raise AssertionError(
            f"refusing prod-synthetic write — {type(row).__name__} has no household_id "
            f"(table not in 6-table allowlist?)"
        )
    if actual != expected_id:
        raise AssertionError(
            f"refusing prod-synthetic write — {type(row).__name__}.household_id="
            f"{actual!r} but synthetic_household_id={expected_id!r}"
        )


def _merge(db, row, *, synthetic_id: uuid.UUID):
    """Wrap db.merge with the D-06 scope assertion."""
    _assert_synthetic_household(row, synthetic_id)
    return db.merge(row)
```

`Vote` doesn't have `household_id` directly — vote scope is implied by `shortlist_id` (which has CASCADE-tied household). The wrapper for votes asserts via the recipe's known scope:

```python
def _execute_vote(db, stmt, *, recipe_id_in_scope: bool, synthetic_id: uuid.UUID):
    """For ON CONFLICT vote upserts — enforce that the (shortlist_id, recipe_id, member_id)
    tuple is within the synthetic scope by verifying the parent recipe is in scope before
    issuing the statement. Caller pre-validates `recipes_by_slug[slug].household_id`.
    """
    if not recipe_id_in_scope:
        raise AssertionError(...)
    db.execute(stmt)
```

### Pattern 7: Post-seed COUNT-diff banner (D-13 + D-15)

```python
# Source: planner pattern from CONTEXT.md "Specific Ideas" section
def _print_post_seed_banner(*, household_id, invite_code, counts: dict[str, int]) -> None:
    border = "=" * 70
    print(border)
    print(f"  SYNTHETIC HOUSEHOLD SEEDED — {household_id}")
    print(f"  Invite code: \033[1m{invite_code}\033[0m")
    print(border)
    print(f"  recipes:    {counts['recipes']:>4d}")
    print(f"  members:    {counts['members']:>4d}")
    print(f"  cooking_logs: {counts['cooking_logs']:>2d}")
    print(f"  votes:      {counts['votes']:>4d}")
    print(f"  shortlists: {counts['shortlists']:>4d}")
    print(f"  storage objects (synthetic/): {counts['storage_objects']:>3d}")
    print(border)
    print("  Idempotency check: re-run this command and confirm counts match.")
    print(border)
```

### Anti-patterns to avoid

- **Using `TRUNCATE + INSERT`** instead of `db.merge()` / `on_conflict_do_update`. Phase 10's D-09 already locks the merge-based approach; reverting to TRUNCATE breaks the SEED-02 idempotency criterion.
- **Hand-rolling a HEAD request** instead of using `storage3.SyncBucket.exists()`. The SDK already does HEAD-via-`/object/{bucket}/{path}` and returns a bool.
- **Adding a `recipes` Supabase Storage bucket.** It does not exist — use the existing `recipe-photos` bucket.
- **Hardcoding storage paths in the recipe insert without uploading.** `recipes.photo_paths` references must point at real Storage objects or the auditor's signed-URL path 404s.
- **Using `db.commit()` mid-tx between the advisory lock and the writes.** The `_xact_` variant releases on the *same* tx commit/rollback — it's locked for the duration of one transaction. Splitting the writes across multiple transactions defeats the lock.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Storage HEAD-then-upload | Custom `requests.head()` call | `storage3.SyncBucket.exists(path)` | Already in `storage3==2.29.0`; verified at `_sync/file_api.py:395-415`; respects auth, base URL, error shape |
| Storage prefix delete | Loop of HTTP DELETE per object | `bucket.list("synthetic")` + `bucket.remove([paths])` | One round-trip; built-in scope (the `id` is the bucket UUID); `_sync/file_api.py:360-374` |
| Postgres advisory lock | psycopg2 LISTEN/NOTIFY hack | `pg_advisory_xact_lock(:key)` via `db.execute(text(...))` | Stdlib Postgres feature; auto-releases on tx end; one extra SQL call |
| Argparse for mode dispatch | Manual `sys.argv` parsing | stdlib `argparse` | Type-checked, generates `--help`, idiomatic Python |
| Random auth tokens | Custom `os.urandom` munging | `secrets.token_urlsafe(32)` | Already used by `app/auth.py:27` (`generate_auth_token`); 256 bits of entropy; URL-safe base64 (43 chars, fits `Text` column) |
| Stable IDs across runs | DB autogen + lookup-by-name | `uuid.uuid5(NAMESPACE_DNS, "aldente.prod.synthetic.<key>")` | Already proven in Phase 10's `_id()` helper; same input → same UUID across runs/machines |
| Photo regeneration | Gemini at seed time | Pre-curated JPGs in `backend/app/cli/synthetic_photos/<slug>.jpg` | D-20 explicit decision — deterministic, no network/quota dependency at seed time |
| Bucket-list pagination | Manual offset loop | `storage3.SyncBucket.list(path)` returns up to 100 by default — for 21 objects a single call suffices; passing `options={"limit": 100}` is sufficient | One call covers the synthetic prefix |

**Key insight:** Every "tool I might write from scratch" already exists in the running stack. Phase 11 is a connect-the-dots phase — the work is choosing the right method, in the right order, with the right scope guards. Resist the temptation to rewrite.

## Runtime State Inventory

> Phase 11 is a write-to-prod phase, but it's *adding* runtime state rather than renaming/refactoring existing state. Most categories are N/A.

| Category | Items | Action Required |
|----------|-------|------------------|
| Stored data | One `households` row + 2 `members` + 21 `recipes` + 3 `cooking_logs` + 1 `daily_shortlists` + 7 `votes` (D-07 allowlist) — all NEW, scoped to synthetic_household_id | Code edit only — Phase 11 inserts these via the seed CLI. The teardown subcommand removes them. |
| Live service config | None — the prod-synthetic seed does not touch APScheduler jobs, Railway settings, Vercel env, or any external service config | None |
| OS-registered state | None | None |
| Secrets/env vars | One new env var: `ALDENTE_PROD_SEED=1` — operator-set when invoking the prod seed; not stored anywhere | Document in RUNBOOK.md only |
| Build artifacts | New committed assets at `backend/app/cli/synthetic_photos/<slug>.jpg` × 21 (committed to git) | Operator commits the photos; no build step |

**Storage objects:** 21 new `synthetic/<slug>.jpg` objects under the `recipe-photos` Supabase Storage bucket (NEW prefix, no overlap with existing `{household_id}/<recipe_id>/<uuid>.<ext>` real-user paths).

**Critical:** The synthetic household's UUID5 namespace is `"aldente.prod.synthetic.<entity>.<key>"` — distinct from `"aldente.test.<entity>.<key>"` used by the local seed. This means:
- Test seed's household ID and prod-synthetic seed's household ID are **different UUIDs**.
- A single prod DB cannot accidentally have its scope checked against the test seed's UUID — they don't collide.
- The teardown only removes rows where `household_id == _id("household", "synthetic")` (i.e., the prod-synthetic UUID). It cannot accidentally delete the local-seed household if both somehow ended up in the same DB (which the guards prevent anyway).

## Common Pitfalls

### Pitfall 1: CONTEXT.md says "recipes bucket"; actual bucket is "recipe-photos"

**What goes wrong:** Plan/executor reads CONTEXT.md D-21 and writes `client.storage.from_("recipes")`. There is no `recipes` bucket. Either the call returns an error or — worse — silently creates a new bucket if the service-role key has bucket-create permissions, splitting synthetic photos away from real-user photos and breaking the existing photo-read path.

**Why it happens:** D-21 reads "under the existing `recipes` Supabase Storage bucket" — a transcription error in CONTEXT.md. The actual bucket name is `recipe-photos`, defined at `app/services/storage.py:34`.

**How to avoid:** Use the constant from `app/services/storage.py`:

```python
from app.services.storage import BUCKET  # = "recipe-photos"
client.storage.from_(BUCKET)
```

**Warning signs:** Manual `client.storage.from_("recipes")` literal in the plan or any new code. The plan should import `BUCKET` from the existing module.

### Pitfall 2: photo_paths empty → auditor sees blank photo gallery

**What goes wrong:** Seed uploads `synthetic/<slug>.jpg` to Storage successfully, prints "21 photos uploaded", but the auditor's iPhone session loads the recipe-detail page and sees no photo. The Phase 13 design audit treats this as a real product bug ("photo gallery broken").

**Why it happens:** Phase 10's seed sets `photo_paths=[]` (`seed.py:308`). The signed-URL flow at `routers/photos.py:173` rejects any path not in `recipe.photo_paths`, returning 404. So even though Storage has the bytes, the API can't sign a URL for them.

**How to avoid:** Set `photo_paths=[storage_path]` on the Recipe insert. Single-element list is fine; SPEC.md allows up to 4. The path must be the bucket-relative key (`synthetic/poulet-citron.jpg` — no bucket prefix, no leading slash).

**Warning signs:** A plan that uploads photos but doesn't modify the recipe insert's `photo_paths` argument. Verification step: run the prod-synthetic seed against a test instance, join from a phone, navigate to recipe detail — do photos render?

### Pitfall 3: pydantic-settings auto-loads `.env`, which points at prod

**What goes wrong:** Operator runs `cd backend && uv run seed --prod-synthetic` from a shell where they previously sourced `.env.test.example`. They expect the test guard to fire (since `ENVIRONMENT=test` is set). Instead, pydantic-settings loads `backend/.env` (their dev file with the prod Supabase URL) AT IMPORT TIME because `model_config = SettingsConfigDict(env_file=".env", ...)` (`config.py:24`). Process env overrides file-loaded values, so `ENVIRONMENT=test` wins, but `database_url` may still be the file's prod URL if the shell didn't export it. Result: confusing guard failures or — worse — guard passes because both test and prod URL substrings show up in different ways.

**Why it happens:** This is the same gotcha called out in `TESTING.md` for Phase 10. pydantic-settings' env-file load fires on `Settings()` construction at import time.

**How to avoid:** The runbook MUST document the exact env contract for the prod-synthetic invocation: `DATABASE_URL=<prod-supabase-url> SUPABASE_URL=<prod> SUPABASE_SERVICE_ROLE_KEY=<key> ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic`. The hard-refusal guard is the safety net but the runbook is the right interface.

**Warning signs:** A runbook that says "set the env vars" without showing them on a single command line. Operator's muscle memory of `set -a; source .env.test.example; set +a` from Phase 10 will mislead them.

### Pitfall 4: Recipe insert needs `created_by_member_id` — flush the members first

**What goes wrong:** Re-running the prod-synthetic seed against a freshly-deleted household. Members and recipes are batched in the same SQLAlchemy unit-of-work. Recipes' `created_by_member_id` FK fires before members are visible to the DB. INSERT fails with `recipes_created_by_member_id_fkey`.

**Why it happens:** Phase 10 already hit this exact bug — see `seed.py:287-290` ("Pitfall 5 mitigation"). SQLAlchemy's auto-flush ordering doesn't guarantee parent-before-child within a single `db.merge()` batch.

**How to avoid:** `db.flush()` after the members merge, BEFORE the recipes loop. Phase 11 inherits this pattern automatically by reusing the existing seed structure — but if the prod path is restructured, this guard must be preserved.

**Warning signs:** A plan that splits `_run_test_seed()` and `_run_prod_synthetic_seed()` into completely independent functions without preserving the `db.flush()` between members and recipes.

### Pitfall 5: NOT NULL columns missed on first insert

**What goes wrong:** A new column added later (post-Phase 10) is NOT NULL and has no `server_default`. The seed's `db.merge(Recipe(...))` doesn't set it. INSERT fails.

**Why it happens:** Phase 10 hit this too — see the "Pitfall 5 mitigation" comment at `seed.py:293-295`. The mitigation is "explicitly set every NOT NULL column."

**How to avoid:** Before writing the prod-synthetic insert, run `\d recipes` (or check the latest alembic migration) to enumerate every NOT NULL column. As of v0.2.1, the columns are `household_id, created_by_member_id, status, title, source_capture, photo_paths, mood, seasonality, tags, cook_count, promotion_attempts, created_at, updated_at` — all already set or defaulted in `seed.py:298-323`. If a future migration adds a NOT NULL column without `server_default`, this seed breaks.

**Warning signs:** Tests pass locally but the prod-synthetic seed fails with `null value in column "X" violates not-null constraint`. Resolution: add the missing field to the recipe spec or the insert call.

### Pitfall 6: `db.merge()` on `Household` collides with a real user holding `DEMO01`

**What goes wrong:** A real user creates a household and is randomly assigned invite_code `DEMO01` (probability ≈ 1 / 36⁶ ≈ 4.6e-10 per real signup). Operator then runs the prod-synthetic seed. `db.merge(Household(id=<synthetic_id>, invite_code="DEMO01"))` issues an UPSERT on the PK. The PK doesn't exist (synthetic household has its own UUID), so it tries an INSERT. INSERT fails on the unique constraint `households.invite_code`.

**Why it happens:** D-14 picks a fixed code; the unique index is what enforces uniqueness; merge by PK doesn't help when the conflict is on a different unique column.

**How to avoid:** Acknowledge in the runbook that this is a race only if (a) operator hasn't yet run the prod-synthetic seed and (b) a real user signs up before the operator does. Once seeded, the synthetic household OWNS `DEMO01` forever (or until teardown). Recovery: change the fixed code to `DEMO02` in `seed.py`, redeploy, re-seed. Alternatively, the runbook can specify a manual SQL recovery: `UPDATE households SET invite_code = NULL WHERE id = '<colliding-real-household-id>'` (only viable if the collision predates production users).

**Warning signs:** First-run insert fails with `duplicate key value violates unique constraint "households_invite_code_key"`. Operator sees a clear error message. Document the recovery in RUNBOOK.md "Troubleshooting" section.

### Pitfall 7: `db.merge` on Household replaces fields silently

**What goes wrong:** Operator changes the synthetic household name in the seed (e.g. "[SYNTHETIC] Démo Al Dente v2"), runs the seed. Re-merge UPDATEs the existing row's `name` field. If a third party (the auditor's joined session) had cached the old name in some screenshot or output, expectations diverge.

**Why it happens:** `db.merge` is "INSERT or UPDATE all set fields." This is the desired behavior for SEED-02 (idempotency) but means casual edits to the seed propagate to prod-synthetic.

**How to avoid:** This is by-design — log it as expected behavior in the runbook. Operator should treat the seed source-of-truth: if the spec changes, prod-synthetic eventually reflects it. The post-seed COUNT diff (D-13) doesn't catch this since counts are unchanged; field-level diffs are operator-eyeball territory.

### Pitfall 8: Storage SDK 401 if `supabase_service_role_key` not set

**What goes wrong:** Operator sources only `DATABASE_URL` and `ALDENTE_PROD_SEED=1`, forgetting `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Postgres writes succeed; Storage operations fail with the lazy-init error from `services/storage.py:77` ("Supabase URL / service-role key not configured").

**Why it happens:** The prod-synthetic seed needs BOTH a Postgres connection AND Storage credentials. The local-seed path didn't need Storage credentials because Phase 10's photo upload short-circuits when `environment == "test"` (`storage.py:117`).

**How to avoid:** The runbook documents the full env requirement. The seed can also do an early dry-run check: before any DB writes, instantiate the Storage client and call `bucket.list("synthetic", options={"limit": 1})`. If that 401s or raises, exit with a clear message before touching the DB.

**Warning signs:** `RuntimeError: Supabase URL / service-role key not configured` after the DB writes have committed (worst case — partial state). Mitigation: the early dry-run prevents partial commits.

### Pitfall 9: Order of writes matters in teardown

**What goes wrong:** Teardown deletes `households` first. CASCADE triggers on `members`, `recipes`, `cooking_logs`, `daily_shortlists`. But `votes`' FK to `recipes` is NOT `ON DELETE CASCADE` (verified at migration `0001_baseline.py:320`) — only `votes.shortlist_id → daily_shortlists.id` is CASCADE. Votes hang on dangling `recipe_id` references (or, more likely, the household-level cascade reaches `daily_shortlists` first which cascades to votes — but the order is implementation-dependent).

**Why it happens:** Mixed CASCADE/RESTRICT FK declarations across the 6 tables.

**FK chain (verified from migration 0001 + 0004):**
- `members.household_id → households.id` ON DELETE CASCADE
- `recipes.household_id → households.id` ON DELETE CASCADE
- `recipes.created_by_member_id → members.id` (no CASCADE, RESTRICT default)
- `cooking_logs.household_id → households.id` ON DELETE CASCADE
- `cooking_logs.recipe_id → recipes.id` (no CASCADE)
- `cooking_logs.cooked_by_member_id → members.id` (no CASCADE)
- `daily_shortlists.household_id → households.id` ON DELETE CASCADE
- `votes.shortlist_id → daily_shortlists.id` ON DELETE CASCADE
- `votes.recipe_id → recipes.id` (no CASCADE)
- `votes.member_id → members.id` (no CASCADE)

If you delete the household first, Postgres tries to delete `recipes` (CASCADE), but `recipes.id` is referenced by `cooking_logs.recipe_id` (no CASCADE) and `votes.recipe_id` (no CASCADE). DELETE fails with FK violation **unless** the cascading delete of `cooking_logs` (via `households` CASCADE) and `votes` (via `daily_shortlists` CASCADE) happens first. Postgres's cascade ordering generally handles this, but it's fragile.

**How to avoid:** Follow D-16's explicit FK-respecting order regardless of CASCADE — it's a belt-and-suspenders guarantee. The order:

```python
# D-16 verified order — bottom-up FK chain
db.execute(text("DELETE FROM votes WHERE shortlist_id IN (SELECT id FROM daily_shortlists WHERE household_id = :hh)"), {"hh": synthetic_id})
db.execute(text("DELETE FROM cooking_logs WHERE household_id = :hh"), {"hh": synthetic_id})
db.execute(text("DELETE FROM daily_shortlists WHERE household_id = :hh"), {"hh": synthetic_id})
db.execute(text("DELETE FROM recipes WHERE household_id = :hh"), {"hh": synthetic_id})
db.execute(text("DELETE FROM members WHERE household_id = :hh"), {"hh": synthetic_id})
db.execute(text("DELETE FROM households WHERE id = :hh"), {"hh": synthetic_id})
db.commit()
# THEN — and only then — delete Storage objects (D-16: "after recipes rows")
teardown_synthetic_storage()
```

**Warning signs:** Teardown raises FK violation; operator left with partial state. Mitigation per CONTEXT.md "Specifics": teardown is idempotent — re-run continues from where it stopped because all DELETEs are conditioned on `household_id = :synthetic_id` and the order doesn't matter on retry once partial state exists.

### Pitfall 10: Auditor (member #3) gets deleted on teardown

**What goes wrong:** Auditor joins via `DEMO01`, gets a `members` row. Operator runs `--teardown`. The `DELETE FROM members WHERE household_id = :hh` removes the auditor's row too.

**Why it happens:** Teardown is scoped by `household_id`, not by the deterministic seed UUIDs. Member #3 has the same `household_id` as members #1 and #2.

**How to avoid:** This is by-design. Teardown means "wipe the synthetic household, including the auditor." The runbook documents this — if the auditor is mid-session, they get logged out / 401'd. They re-join with `DEMO01` after the next seed run. Member #3 gets a NEW UUID + new auth_token each cycle; that's fine for an audit context.

**Warning signs:** Operator runs teardown while an audit walkthrough is in progress. Documented as expected; runbook says "teardown ends any active auditor session — coordinate with the auditor first."

## Code Examples

### Example 1: Synthetic household merge with scope guard

```python
# Source: planner pattern, derived from seed.py:262-285 + D-06 wrapper
import uuid

NAMESPACE = uuid.NAMESPACE_DNS
SYNTHETIC_HOUSEHOLD_ID = uuid.uuid5(NAMESPACE, "aldente.prod.synthetic.household.synthetic")

def _id_synth(*parts: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, "aldente.prod.synthetic." + ".".join(parts))


def run_prod_synthetic_seed() -> None:
    LOCK_KEY = SYNTHETIC_HOUSEHOLD_ID.int & ((1 << 63) - 1)

    with SessionLocal() as db:
        # D-24 — serialize concurrent seed runs.
        db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": LOCK_KEY})

        # 1. Household
        household = _merge(db, Household(
            id=SYNTHETIC_HOUSEHOLD_ID,
            name="[SYNTHETIC] Démo Al Dente",  # D-05
            invite_code="DEMO01",  # D-14
            timezone="Europe/Paris",
        ), synthetic_id=SYNTHETIC_HOUSEHOLD_ID)

        # 2. Members — D-18 random tokens, never printed
        member_luca = _merge(db, Member(
            id=_id_synth("member", "luca"),
            household_id=SYNTHETIC_HOUSEHOLD_ID,
            name="Luca",
            color_hex="#F43F5E",
            auth_token=secrets.token_urlsafe(32),  # 43 chars, fits Text column
        ), synthetic_id=SYNTHETIC_HOUSEHOLD_ID)
        # … (mirror seed.py:279-285 for Partner) …

        db.flush()  # Pitfall 4 — recipes' FK to created_by_member_id

        # 3. Recipes — import _recipe_specs() from this same module (D-23)
        recipes_by_slug: dict[str, Recipe] = {}
        for spec in _recipe_specs():
            jpeg_bytes = (Path(__file__).parent / "synthetic_photos" / f"{spec['slug']}.jpg").read_bytes()
            photo_path = upload_synthetic_photo_idempotent(slug=spec["slug"], content=jpeg_bytes)
            r = _merge(db, Recipe(
                id=_id_synth("recipe", spec["slug"]),
                household_id=SYNTHETIC_HOUSEHOLD_ID,
                created_by_member_id=member_luca.id,
                status="structured",
                title=spec["title"],
                source_capture={"type": "manual", "payload": {"title": spec["title"]}},
                photo_paths=[photo_path],  # CHANGED from Phase 10 — Pitfall 2
                # … (mirror seed.py:309-322) …
            ), synthetic_id=SYNTHETIC_HOUSEHOLD_ID)
            recipes_by_slug[spec["slug"]] = r

        db.flush()

        # 4. Cooking logs — D-10 sliding dates
        # _id key is "cooking_log", slug only — NO date component
        # cooked_at is computed from `now()` per re-run
        # … (mirror seed.py:331-361 but drop str(cooked_at.date()) from the _id call) …

        # 5. Shortlist — D-11 sliding key
        shortlist = _merge(db, DailyShortlist(
            id=_id_synth("shortlist", "today"),  # NO date — CHANGED from Phase 10
            household_id=SYNTHETIC_HOUSEHOLD_ID,
            date=date.today(),  # UPDATEs to today's date on every run
            generation=1,
            recipe_ids=[recipes_by_slug[s].id for s in ("ragu-bolognese", "coq-au-vin", "butter-chicken", "shawarma", "tacos-boeuf")],
            filters=None,
        ), synthetic_id=SYNTHETIC_HOUSEHOLD_ID)

        db.flush()

        # 6. Votes — D-12 sliding shortlist; same vote-spec structure as Phase 10
        # … (mirror seed.py:386-418) …

        db.commit()
        # Advisory lock auto-releases on commit.

        # 7. Print banner — D-13 + D-15
        counts = _gather_counts(db, household_id=SYNTHETIC_HOUSEHOLD_ID)
        _print_post_seed_banner(
            household_id=SYNTHETIC_HOUSEHOLD_ID,
            invite_code="DEMO01",
            counts=counts,
        )
```

### Example 2: Idempotent photo upload (full flow)

```python
# Source: combination of services/storage.py:69-85 (lazy client) + storage3 SDK
def upload_synthetic_photo_idempotent(*, slug: str, content: bytes) -> str:
    path = f"synthetic/{slug}.jpg"
    _assert_synthetic_storage_path(path)

    client = _supabase()  # reuse existing lazy-init from services/storage.py
    bucket = client.storage.from_(BUCKET)  # BUCKET = "recipe-photos"

    if bucket.exists(path):
        return path

    bucket.upload(
        path=path,
        file=content,
        file_options={"content-type": "image/jpeg", "upsert": "false"},
    )
    return path
```

## Photo Source Curation (D-20)

The 21 slugs (verified from `_recipe_specs()` at `seed.py:73-251`):

| # | Slug | Title | Suggested search |
|---|------|-------|------------------|
| 1 | `poulet-citron` | Poulet au citron | "lemon chicken plated" |
| 2 | `ragu-bolognese` | Ragu bolognese | "bolognese pasta" |
| 3 | `risotto-champignons` | Risotto aux champignons | "mushroom risotto" |
| 4 | `coq-au-vin` | Coq au vin | "coq au vin" |
| 5 | `loup-grille` | Loup grillé | "grilled sea bass" |
| 6 | `tarte-tatin` | Tarte Tatin | "tarte tatin" |
| 7 | `poulet-teriyaki` | Poulet teriyaki | "teriyaki chicken" |
| 8 | `sushi-saumon` | Sushi saumon | "salmon sushi" |
| 9 | `pad-thai-tofu` | Pad thai tofu | "pad thai tofu" |
| 10 | `branzino-citron` | Branzino au citron | "branzino" |
| 11 | `salade-grecque` | Salade grecque | "greek salad" |
| 12 | `shawarma` | Shawarma | "shawarma plate" |
| 13 | `houmous-maison` | Houmous maison | "hummus" |
| 14 | `dal-makhani` | Dal makhani | "dal makhani" |
| 15 | `butter-chicken` | Butter chicken | "butter chicken" |
| 16 | `tacos-boeuf` | Tacos au bœuf | "beef tacos" |
| 17 | `huevos-rancheros` | Huevos rancheros | "huevos rancheros" |
| 18 | `tajine-agneau` | Tajine d'agneau | "lamb tagine" |
| 19 | `burger-classique` | Burger classique | "classic burger" |
| 20 | `omelette-herbes` | Omelette aux herbes | "herb omelette" |
| 21 | `saumon-grille` | Saumon grillé | "grilled salmon" |

**Curation workflow (operator-driven; recommend including this as a discrete "Wave 0" plan):**

1. For each slug, search [Pexels](https://www.pexels.com/search/) or [Foodiesfeed](https://www.foodiesfeed.com/) by suggested term.
2. Pick a top-down or 3/4-angle shot, well-lit, naturalistic plating (NOT high-drama plating — D-20 specifics: "the audit measures the app's design, not the photographer's").
3. Download original.
4. Resize to longest-edge 1200 px, save as JPEG quality 80–85 (target ~50–150 KB).
5. Verify the file matches the dish (a "stylized food blogger" risotto for `risotto-champignons` is fine; an unrelated dish is not).
6. Commit to `backend/app/cli/synthetic_photos/<slug>.jpg`.

**Tooling:** `sips` on macOS or `convert` (ImageMagick) handles step 4. Example: `sips -Z 1200 -s format jpeg -s formatOptions 80 input.jpg --out poulet-citron.jpg`. The plan should NOT include batch download scripts — curation is a manual judgment task.

**License:** Pexels License (no attribution required, commercial use OK) — [pexels.com/license](https://www.pexels.com/license/). Foodiesfeed (CC0-equivalent) — [foodiesfeed.com/license](https://www.foodiesfeed.com/license). [CITED] These are the two best free sources for food photography as of 2026; both are explicit about commercial use and no-attribution-required.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `localStorage` Bearer auth | HttpOnly cookie + Bearer fallback | Phase 01.1 (v0.1) | Phase 11 unaffected — seed creates Member rows with `auth_token`; auditor's iPhone uses the cookie flow via `/onboarding/join`. The seed's `secrets.token_urlsafe(32)` per D-18 uses the same column the cookie auth reads from. |
| Phase 10 seed cross-day idempotency hole | D-10/D-11/D-12 sliding keys | Phase 11 (this phase) | Closes SEED-01 *for the prod-synthetic specifically*; local seed retains the hole until v0.2.2. |
| `BackgroundTask` promotion is async | Same | unchanged | Seed bypasses `/recipes/*` routers and writes directly with `status="structured"` — no promotion path involved. |

**Deprecated/outdated:**
- The `pings` table referenced in migration 0001 was dropped by 0002 (`drop_pings.py`). Not relevant to Phase 11.
- The Phase 10 `_id("cooking_log", slug, str(cooked_at.date()))` pattern is **explicitly being changed** by D-10 — this RESEARCH is the first place that change is documented in code-level detail.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The prod Supabase URL contains `supabase.co` (and not, e.g., a custom domain or PgBouncer connection string that masks the host) | Pattern 2 | LOW — `.env.example:2` shows the canonical shape; if a custom domain is later set, the D-02 substring check fires false-negative and the seed refuses to run prod (safe direction) |
| A2 | `secrets.token_urlsafe(32)` (43-char base64url) fits the `auth_token` Text column | Don't Hand-Roll table | LOW — `auth_token` is `Text` (unbounded), verified at `0001_baseline.py:104` and `app/auth.py:27` already uses this exact call |
| A3 | The photo source curation (Pexels/Foodiesfeed) yields enough variety for 21 distinct, accurate dishes | Photo Source Curation | LOW — both libraries have hundreds of food photos per common term; the curation is operator judgment, not infrastructure |
| A4 | A single `bucket.list("synthetic")` call returns all 21 objects without pagination | Pattern 4 (teardown) | LOW — default limit is 100; 21 < 100; if scope expands beyond 100 in a future phase, add pagination or pass `options={"limit": 1000}` |
| A5 | The `recipe-photos` bucket exists in prod Supabase Storage with the service-role key having read+write+delete permissions | Pattern 4 | MEDIUM — the bucket is created at infra setup time (not via code I can see); must be verified by operator in the Supabase dashboard before first run. RUNBOOK.md should include a one-line bucket-existence check. |
| A6 | Postgres advisory locks on the prod DB are not contended by other workloads (e.g., a Datadog sidecar with its own advisory locks) | Pattern 3 | LOW — at couple-scale + Railway-managed Postgres, no observability sidecar holds advisory locks; lock collision odds are essentially zero with a 63-bit key derived from a UUID5 |

## Open Questions

1. **Is the `recipe-photos` bucket already provisioned in prod with public=OFF?**
   - What we know: `routers/photos.py:148` says "the `recipe-photos` bucket is private (Public=OFF)"; the existing photo-read path expects this.
   - What's unclear: whether the operator has verified prod bucket exists at the same name/visibility setting (no infra-as-code in repo).
   - Recommendation: RUNBOOK.md "Pre-flight" section instructs the operator to verify in the Supabase dashboard once, before the first seed run.

2. **Does the synthetic invite code "DEMO01" conflict with the existing `households` constraint when there are zero real users yet?**
   - What we know: `households.invite_code` is `unique=True, nullable=True` (verified `0001_baseline.py:78`). First seed → INSERT of `DEMO01` succeeds. Re-runs → MERGE-by-PK reuses the row, no constraint violation.
   - What's unclear: whether v0.3 starts with zero real prod users or whether v0.1/v0.2 onboarding has already created user data (the answer determines the recovery cost in Pitfall 6).
   - Recommendation: Operator confirms current prod-DB state via `SELECT count(*) FROM households WHERE invite_code = 'DEMO01'` before running for the first time. If non-zero, escalate (Pitfall 6 recovery).

3. **Should the prod-synthetic seed log structured events somewhere (not just stdout)?**
   - What we know: CONTEXT.md "Deferred Ideas" lists "Observability/audit trail of who ran the prod seed when" as out of scope.
   - What's unclear: whether the milestone goal ("audit milestone — surface, do not repair") implicitly wants a one-time observability hook so the audit can later cite "prod-synthetic seeded on YYYY-MM-DD".
   - Recommendation: Stick with the deferred decision. Operator can `git log RUNBOOK.md` (or check timestamps on the synthetic photos commit) for a date stamp if needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `uv` | `uv run seed` invocation | ✓ (operator's laptop) | (operator-installed; project requires Python 3.12) | — |
| `psycopg2-binary` | Postgres connection | ✓ via uv lock | 2.9.x (lockfile-pinned) | — |
| `supabase` SDK | Storage operations | ✓ via uv lock | 2.29.0 | — |
| `storage3` (transitive) | `bucket.exists()` and `bucket.list()` | ✓ via uv lock | 2.29.0 | — |
| Prod Supabase Postgres | Seed writes | Confirmed by operator before run | (Supabase-managed) | None — phase blocks if unreachable |
| Prod Supabase Storage `recipe-photos` bucket | Photo upload | Operator verifies pre-flight (Open Question 1) | — | None |
| Prod `SUPABASE_SERVICE_ROLE_KEY` with bucket write/delete permissions | Photo upload + teardown | Operator-managed | — | None |
| `sips` (macOS) or `convert` (ImageMagick) | Photo resize at curation time | Operator-managed (curation is one-time) | — | Manual resize in any editor |

**Missing dependencies with no fallback:**
- Prod Supabase Postgres connection from the operator's laptop (Railway-style direct connection or via the connection-pooling URL — operator must use the direct one to support advisory locks; PgBouncer in transaction-pool mode does NOT support advisory locks across the lock-acquire/release boundary). RUNBOOK.md MUST clarify this.

**Missing dependencies with fallback:**
- None.

## Sources

### Primary (HIGH confidence — verified in this codebase)

- `backend/app/cli/seed.py` (lines 39, 48-50, 53-63, 254-425) — current seed structure, `_id` helper, `_guard_environment`, recipe specs, vote upsert pattern.
- `backend/app/services/storage.py` (lines 28, 34, 69-85, 117-152, 188-226) — Supabase client lazy-init, `BUCKET = "recipe-photos"`, upload pattern, env-test short-circuit.
- `backend/app/auth.py` (lines 21-22, 25-27) — `AUTH_COOKIE_NAME`, `generate_auth_token` using `secrets.token_urlsafe(32)`.
- `backend/app/routers/photos.py` (lines 47, 49, 137-180) — bucket assumption, MAX_PHOTOS_PER_RECIPE, signed-URL scope guard requiring `path in recipe.photo_paths`.
- `backend/app/config.py` (entire file, 31 lines) — `pydantic-settings` shape, env-file load, test-mode URL switch.
- `backend/app/db.py` (lines 12-16) — sync engine, `SessionLocal` factory.
- `backend/app/models/{household,member,recipe,cooking_log,daily_shortlist,vote}.py` — column types, FK declarations, indexes.
- `backend/alembic/versions/0001_baseline.py` (lines 99, 131, 230, 277, 314, 320, 360, 78, 104) — FK CASCADE/RESTRICT verification; `auth_token` column is `Text` unbounded; `invite_code` is `unique, nullable=True`.
- `backend/alembic/versions/0004_phase3_tables.py` (lines 64-69) — `uq_votes_shortlist_recipe_member` constraint name (used by `on_conflict_do_update`).
- `backend/.venv/lib/python3.12/site-packages/storage3/_sync/file_api.py` (lines 360-374, 395-415, 417-445, 574-594) — `remove`, `exists`, `list`, `upload` method signatures and behavior (HEAD for `exists`, POST for `upload`, DELETE for `remove`).
- `backend/uv.lock` — `storage3==2.29.0`, `supabase==2.29.0` versions confirmed.
- `backend/.env.example` (line 2) — prod URL shape `db.<project>.supabase.co`.
- `.env.test.example` (entire file) — Phase 10 env contract (drives Pitfall 3 and the runbook env-loading section).
- `frontend/tests/e2e/fixtures/risotto.jpg` — confirmed Phase 10 fixture is a 1×1 placeholder JPEG (NOT a recipe photo); Phase 11 photos must be real.

### Secondary (MEDIUM confidence — verified docs/discussion)

- [SQLAlchemy 2.0 + Postgres advisory lock pattern](https://leontrolski.github.io/postgres-advisory-locks.html) — `db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": ...})` idiom; auto-release on commit.
- [SQLAlchemy bigint coercion discussion](https://github.com/sqlalchemy/sqlalchemy/discussions/7814) — confirms `BigInteger` cast may be needed for advisory-lock numeric arguments under asyncpg; sync psycopg2 (used here) handles `int` parameter binding correctly without explicit cast.
- [Pexels License](https://www.pexels.com/license/) — free for commercial use, no attribution required.
- [Foodiesfeed License](https://www.foodiesfeed.com/license) — CC0-equivalent, free for commercial use.

### Tertiary (LOW confidence — context only)

- None — every load-bearing claim is grounded in primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in lockfile; storage3 API verified by reading installed source.
- Architecture patterns: HIGH — patterns are derived directly from Phase 10's working seed (which has shipped + been audited) plus three additions (argparse, advisory lock, Storage idempotent helpers) all backed by code/docs.
- Pitfalls: HIGH — eight of the ten pitfalls trace to specific code references (file:line); two (Pitfall 6, Pitfall 10) trace to logical reasoning about constraints + by-design behavior.
- Photo source: MEDIUM — license claims verified; whether the curation actually yields 21 accurate dishes is an operator judgment call (A3).

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (30 days; library versions stable, no breaking-change windows on storage3 / supabase-py expected)
