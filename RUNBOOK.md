---
status: accepted
last_verified: 2026-05-19
audience: operator
---

# Production Synthetic Household — Operator Runbook

**Phase:** v0.3 Phase 11 (SEED-01..05)
**Audience:** Operator (Luca) on macOS with `uv` and prod Supabase credentials.
**Status:** Synthetic household is named **`[SYNTHETIC] Démo Al Dente`** with fixed invite code **`DEMO01`**.

## TL;DR — The four commands

Refresh the synthetic household (idempotent — safe to re-run any time):

```bash
cd backend
DATABASE_URL=<direct-supabase-postgres-url> \
SUPABASE_URL=<https://<project>.supabase.co> \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
ALDENTE_PROD_SEED=1 \
uv run seed --prod-synthetic
```

Tear down the synthetic household (deletes all rows + storage objects):

```bash
cd backend
DATABASE_URL=<direct-supabase-postgres-url> \
SUPABASE_URL=<https://<project>.supabase.co> \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
ALDENTE_PROD_SEED=1 \
uv run seed --prod-synthetic --teardown
```

Smoke check (idempotency proof — D-13):

```bash
# Run the refresh command twice in a row.
# Both runs MUST print identical row counts in the banner:
#   recipes=21 members=2 cooking_logs=3 votes=7 shortlists=1 storage_objects=21
# Anything else means the seed is non-idempotent — file an issue.
```

Join from your iPhone:

```
1. Open the app on your iPhone (PWA or browser).
2. On onboarding, choose "Rejoindre un foyer existant" / "Join existing household".
3. Enter the invite code: DEMO01
4. Pick a member name (you become member #3 — the 2 seeded members are immutable).
```

---

## Pre-flight (verify ONCE, before the first invocation)

Five checks the operator runs before the first prod-synthetic seed. Skip any of these and the seed will either refuse or fail mid-run.

1. **Direct (non-PgBouncer) `DATABASE_URL`.** Supabase offers a pooled URL (port `6543`) and a direct URL (port `5432`). The seed uses Postgres advisory locks (D-24 concurrency guard); PgBouncer in transaction-pool mode does NOT support `pg_advisory_xact_lock` across the lock-acquire/release boundary. Use the direct URL. Verify:
   ```bash
   echo "$DATABASE_URL" | grep -E ':5432|:6543'
   # Expected match: :5432  (direct)
   # If you see :6543, switch to the direct URL from the Supabase Dashboard
   #   -> Project Settings -> Database -> Connection string -> "URI"
   #   (NOT "Connection pooler").
   ```
   Examples:
   - Direct (use this):  `postgresql://postgres:<pw>@db.<project>.supabase.co:5432/postgres`
   - Pooled (do NOT use): `postgresql://postgres:<pw>@db.<project>.supabase.co:6543/postgres`

2. **Env-var contract.** All four are required for prod-synthetic; missing any will produce a clear `REFUSING:` message but it's faster to check before invoking:
   ```bash
   for v in DATABASE_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY ALDENTE_PROD_SEED; do
     [ -n "${!v}" ] && echo "$v set" || echo "$v MISSING"
   done
   ```

3. **`recipe-photos` Supabase Storage bucket exists with Public=OFF.** The seed uploads to this bucket (its name is `recipe-photos`, NOT `recipes` — a CONTEXT.md transcription error caught during research; see Troubleshooting below). Verify in the Supabase Dashboard -> Storage -> Buckets. The bucket is created at infra setup time, not by this CLI. If missing, create it as Public=OFF (the existing photo-read flow expects private + signed URLs).

4. **`ALDENTE_PROD_SEED` is unset in your normal dev shell.** The test seed (`uv run seed` no flags) refuses to run if `ALDENTE_PROD_SEED=1` is set in your env (D-04 symmetric guard). This catches the inverse footgun where you forgot to `unset` after a prod run. Either run prod-synthetic in a one-shot inline-env invocation (the TL;DR pattern above) OR `unset ALDENTE_PROD_SEED` before running the test seed.

5. **`DEMO01` not already in use.** First-time only — the synthetic household claims `DEMO01` permanently once seeded. If a real-user household has been issued `DEMO01` somehow (random collision is ~4.6e-10 per signup), the first seed run fails with `duplicate key value violates unique constraint "households_invite_code_key"`. To check before the first run:
   ```sql
   -- In the Supabase SQL editor:
   SELECT id, name FROM households WHERE invite_code = 'DEMO01';
   -- Expected: 0 rows. If non-zero, see Troubleshooting -> "DEMO01 already taken".
   ```

---

## After every refresh — the banner

A successful `uv run seed --prod-synthetic` ends with:

```
======================================================================
  SYNTHETIC HOUSEHOLD SEEDED — <uuid>
  Synthetic invite code: DEMO01
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

Copy the `Synthetic invite code: DEMO01` line — that's how an auditor (or your iPhone) joins.

The 5 vote states (Validé / Pressenti / Contesté / Rejeté / Sans avis) are computed at read-time from 7 vote rows + 5 shortlist recipes (the 5th has no vote rows = "Sans avis"). The 5 vote_specs produce 2+1+2+2+0 = 7 rows total — `votes=7` is correct.

---

## After every teardown — the banner

A successful `uv run seed --prod-synthetic --teardown` ends with:

```
======================================================================
  SYNTHETIC HOUSEHOLD TEARDOWN — <uuid>
======================================================================
  votes removed:                    7
  cooking_logs removed:             3
  daily_shortlists removed:         1
  recipes removed:                 21
  members removed:                  2    (or 3 if auditor had joined)
  households removed:               1
  storage objects removed:         21
======================================================================
```

Re-running the teardown on already-empty state prints all zeros plus `Note: nothing to remove (already torn down or never seeded).` — that's expected and idempotent.

---

## Troubleshooting

### "REFUSING: ALDENTE_PROD_SEED=1 set but --prod-synthetic flag NOT passed"
You ran `uv run seed` (test mode) with `ALDENTE_PROD_SEED=1` still set in env. Fix: either pass `--prod-synthetic` or `unset ALDENTE_PROD_SEED` (D-04 symmetric guard). This is intentional — it prevents the inverse footgun where stale env vars convince the operator they're seeding test but the test guard's behavior diverges silently.

### "REFUSING: --prod-synthetic passed but ALDENTE_PROD_SEED env var not '1'"
You passed `--prod-synthetic` but didn't set `ALDENTE_PROD_SEED=1`. Use the TL;DR pattern: prefix the env var on the same line as the command. The dual-key opt-in (flag AND env var) is by design — single key persists silently across shells; dual key requires deliberate invocation per run.

### "REFUSING: --teardown only valid with --prod-synthetic"
`--teardown` alone is rejected — teardown only ever applies to the synthetic household and requires the same dual-key opt-in as the seed. Use `--prod-synthetic --teardown` together.

### "REFUSING: database_url does not contain 'supabase.co'"
Your `DATABASE_URL` doesn't look like prod. Either you're pointing at localhost / test (good — but use the test seed, no flag) or your `DATABASE_URL` is unset and pydantic-settings is loading from `backend/.env` instead (Pitfall 3). Inline the env var on the command line as in the TL;DR — do NOT rely on `set -a; source .env` muscle memory.

### "REFUSING: missing photo(s) at app/cli/synthetic_photos/<slug>.jpg"
The 21 committed JPGs (Plan 03) are missing from your working tree. Either `git pull` to fetch them or check that `backend/app/cli/synthetic_photos/` is not in your local `.gitignore`. Each slug listed in the error message must have a matching `<slug>.jpg` file.

### "REFUSING: Supabase Storage not configured"
`SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. The seed checks Storage credentials BEFORE any DB write (Pitfall 8 — fail-fast prevents partial state). Inline both on the command line.

### `duplicate key value violates unique constraint "households_invite_code_key"`
A real-user household holds `DEMO01`. Either:
- **Pre-seed (no real users yet):** run the SQL `SELECT id FROM households WHERE invite_code = 'DEMO01'`, then if you can confirm that row is a stale test artifact: `UPDATE households SET invite_code = NULL WHERE id = '<that-id>'` and re-run the seed.
- **Real user collision (~4.6e-10 probability):** change the fixed code in `backend/app/cli/seed.py` (search for `"DEMO01"`) to e.g. `"DEMO02"`, push to main (Railway auto-deploys), re-run the seed. Update this RUNBOOK.md to reflect the new code.

### "Bucket recipe-photos not found" / Storage 404 on upload
The bucket name is **`recipe-photos`** (with a hyphen), not `recipes`. Verify in the Supabase Dashboard -> Storage -> Buckets. If missing, create it Public=OFF (the existing photo-read flow expects private + signed URLs). This is the single most common typo because CONTEXT.md initially said "recipes bucket" — the actual name is in `backend/app/services/storage.py` (the `BUCKET` constant).

### Teardown raises FK violation mid-cascade
The CLI does the deletes in explicit FK-respecting order (votes -> cooking_logs -> daily_shortlists -> recipes -> members -> households per D-16) — this should not happen with the shipped code. If it does, it means the data shape diverged from the seeded shape (e.g. someone manually inserted rows referencing the synthetic household). Recovery: re-run the teardown — every DELETE is conditioned on `household_id`, so partial state is safe to retry.

### Storage cleanup raises after Postgres deletes succeeded
The teardown banner shows `storage objects removed: FAILED — see WARNING above` and a WARNING above. Postgres state is clean; the Storage prefix delete failed (likely transient — network, Supabase outage). Re-run the same teardown command — Postgres deletes are no-ops on second run; Storage delete retries the prefix list. The synthetic-household scope guards mean retry is safe.

### "Joining from iPhone" but the recipe cards show no photos
The seed populates `recipes.photo_paths = ["synthetic/<slug>.jpg"]` (Pitfall 2 mitigation) so signed-URL reads should work. If photos still don't render: check that the `recipe-photos` bucket has the `synthetic/` prefix populated (Storage banner reported `storage objects: 21`); verify your iPhone's auth cookie isn't stale (re-onboard via DEMO01); check the browser console for 401 / 404 from the photos route.

### Seed hangs forever on "SELECT pg_advisory_xact_lock(...)"
You connected via PgBouncer (port `6543`). Switch to the direct URL (port `5432`) — see Pre-flight check #1. If the seed already started against a pooled URL and is stuck, kill the process; advisory locks acquired in transaction mode release on connection drop, so no DB cleanup is needed.

---

## Operator workflow patterns

**Refreshing the audit env before a session:**
```bash
# Wipe and re-seed in one shell:
cd backend
EXPORT_BLOCK="DATABASE_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ALDENTE_PROD_SEED=1"
eval "$EXPORT_BLOCK uv run seed --prod-synthetic --teardown"
eval "$EXPORT_BLOCK uv run seed --prod-synthetic"
# Banner from the second invocation prints the invite code DEMO01.
```

**Testing changes to the seed without touching prod:**
```bash
# The local test seed is unaffected by Phase 11 — same as Phase 10.
cd backend && uv run seed
# Output ends with: seed: ok household=... member=... recipes=21 logs=3 shortlist=...
```

---

## By-design behavior (NOT bugs)

- **Auditor (member #3) is wiped on teardown.** Teardown deletes all members of the synthetic household, including any member that joined via `DEMO01`. The auditor re-joins after the next seed. If an audit walkthrough is in progress, coordinate with the auditor before tearing down.
- **Re-running the seed shifts cooking_log dates forward (D-10).** A log seeded "2 days ago" today is "2 days ago" again tomorrow — the date slides. Same for the shortlist's `date` field (D-11). Cooking history always looks fresh.
- **Member auth tokens rotate on every run (D-18).** The seeded members never have a usable login session for a human; they exist as historical authors of the seeded recipes and votes. Joining as member #3 via DEMO01 is the only way a human authenticates against the synthetic household.
- **The synthetic household's UUID is stable across runs but distinct from the test seed's UUID.** Different namespaces (`aldente.test.*` vs `aldente.prod.synthetic.*`) — they cannot collide.
- **`db.merge` propagates seed-source edits.** If you edit a recipe spec or the household name in `seed.py` and re-run, the prod-synthetic row UPDATEs in place. Counts don't change; field-level diffs are operator-eyeball territory.

---

## Reference: what the seed actually writes

| Table | Rows | Scope |
|-------|------|-------|
| households | 1 | The synthetic household — name `[SYNTHETIC] Démo Al Dente`, invite_code `DEMO01` |
| members | 2 | Luca (color #F43F5E) + Partner (color #10B981) — fresh tokens per run, not printed |
| recipes | 21 | Same specs as the local test seed — single source of truth in `_recipe_specs()` |
| cooking_logs | 3 | ragu-bolognese (loved, -2d), poulet-citron (liked, -5d), burger-classique (disliked, -10d) |
| daily_shortlists | 1 | Today's shortlist — 5 recipes (ragu-bolognese, coq-au-vin, butter-chicken, shawarma, tacos-boeuf) |
| votes | 7 | 5 vote_specs producing 2+1+2+2+0 = 7 rows; cover all 5 computed states |
| Storage `synthetic/` | 21 | One JPG per recipe slug under `recipe-photos` bucket |

Vote states (computed by `services/voting.compute_vote_state` — invariant #2):
- **Validé:** ragu-bolognese (Luca yes, Partner yes) — 2 rows
- **Pressenti:** coq-au-vin (Luca yes, Partner none) — 1 row
- **Contesté:** butter-chicken (Luca yes, Partner no) — 2 rows
- **Rejeté:** shawarma (Luca no, Partner no) — 2 rows
- **Sans avis:** tacos-boeuf (no vote rows) — 0 rows

Total: 2+1+2+2+0 = **7** vote rows.

---

## File map

- `backend/app/cli/seed.py` — the CLI itself (mode dispatch, guards, `run_test_seed`, `run_prod_synthetic_seed`, `run_teardown`).
- `backend/app/services/storage.py` — Supabase Storage helpers (`upload_synthetic_photo_idempotent`, `teardown_synthetic_storage`).
- `backend/app/cli/synthetic_photos/<slug>.jpg` × 21 — committed JPG corpus.
- `backend/app/cli/synthetic_photos/README.md` — license/source attribution per photo.
- `.planning/v0.3/RUNBOOK.md` — stub link to this file (satisfies ROADMAP §Phase 11 SC #4).

---

*Phase 11 — Production Synthetic Household. Last updated when the runbook was committed; refresh on any CLI shape change.*
