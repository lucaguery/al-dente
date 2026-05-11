---
phase: 11-production-synthetic-household
phase_name: Production Synthetic Household
verified_at: 2026-05-09T14:30:00Z
status: human_needed
score: 12/12
must_haves_total: 12
must_haves_passed: 12
must_haves_failed: 0
human_verification_count: 3
---

# Phase 11: Production Synthetic Household — Verification Report

**Phase Goal:** Operator can run the seed CLI against prod Supabase and create/refresh a clearly-labeled synthetic household — same shape as the local seed (2 members + 21 recipes + 3 cooking_logs + 7 votes covering all 5 computed states: Validé / Pressenti / Contesté / Rejeté / Sans avis) — without touching real user data, with idempotent re-runs and a documented refresh / teardown path.

**Verified:** 2026-05-09T14:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Summary

Phase 11 is structurally complete. All code artifacts exist, are substantive (not stubs), are wired correctly, and honor every design decision locked in CONTEXT.md and RESEARCH.md. The five SEED requirements are satisfied by the implementation in `backend/app/cli/seed.py` and `backend/app/services/storage.py`, plus 21 committed JPGs and two operator runbook files. Three items cannot be verified without running the seed against real prod Supabase credentials: the end-to-end idempotency smoke check against prod, the Storage upload round-trip (including signed-URL photo rendering for the auditor), and the teardown full-cycle confirmation. These are explicitly documented human verification gates. No code gaps, no stubs, no blocker anti-patterns found.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Operator can run `uv run seed --prod-synthetic` with `ALDENTE_PROD_SEED=1` against prod Supabase and create a synthetic household labeled `[SYNTHETIC] Démo Al Dente` | VERIFIED | `seed.py:706` — `name="[SYNTHETIC] Démo Al Dente"` in `run_prod_synthetic_seed`; `_guard_prod_environment` accepts both conditions |
| 2 | Household is clearly labeled and distinct from real-user households | VERIFIED | `seed.py:706` household name contains literal `[SYNTHETIC] Démo Al Dente`; stable UUID under `aldente.prod.synthetic.` namespace distinct from real-user UUIDs |
| 3 | Seed produces exactly 2 members, 21 recipes, 3 cooking_logs, 7 votes, 1 shortlist, 21 storage objects | VERIFIED | `_recipe_specs()` returns 21 dicts (grep confirms 21 `"slug":` entries); 3 `log_specs`; 5 `vote_specs` producing 2+1+2+2+0=7 vote rows (independently calculated); `_print_post_seed_banner` prints `votes=7` |
| 4 | All 5 computed vote states covered (Validé/Pressenti/Contesté/Rejeté/Sans avis) | VERIFIED | `seed.py:831-836` — 5 vote_specs: `(yes,yes)=Validé`, `(yes,None)=Pressenti`, `(yes,no)=Contesté`, `(no,no)=Rejeté`, `(None,None)=Sans avis`; no `state` column written (invariant #2 honored) |
| 5 | Seed is idempotent across re-runs and across calendar days | VERIFIED | D-10: `_id_synth("cooking_log", slug)` — no date component (line 782); D-11: `_id_synth("shortlist", "today")` — no date (line 813); D-12: `on_conflict_do_update` for votes; `db.merge`/`_merge_synthetic` for all other rows |
| 6 | Hard-refusal guard prevents running against prod without explicit dual-key opt-in | VERIFIED | `_guard_prod_environment()` exits non-zero if `ALDENTE_PROD_SEED != "1"` OR URL lacks `supabase.co` OR URL contains `localhost`/`aldente_test`; D-04 symmetric guard in `_guard_environment()` refuses test seed if `ALDENTE_PROD_SEED=1` set without flag |
| 7 | No real user data can be touched — Postgres writes structurally scoped | VERIFIED | `_merge_synthetic()` wraps every `db.merge()` call in `_assert_synthetic_household()` (lines 704, 712, 719, 739, 781, 812); vote scope via `_assert_synthetic_household(parent_recipe, SYNTHETIC_HOUSEHOLD_ID)` before pg_insert (line 842) |
| 8 | No real user data can be touched — Storage writes structurally scoped | VERIFIED | `_assert_synthetic_storage_path()` called in `upload_synthetic_photo_idempotent` and `teardown_synthetic_storage`; raises `AssertionError` for any path not starting with `synthetic/` |
| 9 | Seed CLI prints the invite code to stdout | VERIFIED | `_print_post_seed_banner` at line 609-620: prints `Synthetic invite code: DEMO01` (ANSI-bold) after commit (D-15) |
| 10 | Teardown command wipes the synthetic household without touching other data | VERIFIED | `run_teardown()` lines 917-960: 6 DELETEs scoped to `SYNTHETIC_HOUSEHOLD_ID`, FK-respecting order (votes→cooking_logs→daily_shortlists→recipes→members→households), storage cleanup AFTER `db.commit()` (line 960→966) |
| 11 | Runbook documents refresh, teardown, smoke check, troubleshooting | VERIFIED | `RUNBOOK.md` (241 lines) at repo root: 4 copy-pasteable commands above the fold, 5 pre-flight checks, both banner shapes, 10 troubleshooting cases. `.planning/v0.3/RUNBOOK.md` (28 lines) stub linking to canonical |
| 12 | Phase 10 test seed (`uv run seed` no flags) is unaffected | VERIFIED | `run_test_seed()` uses `_id()` (not `_id_synth()`), `db.merge()` (not `_merge_synthetic()`), `photo_paths=[]`, date-based cooking_log and shortlist keys — structurally separate from prod-synthetic path; 10 marker fragments confirmed in SUMMARY-02 |

**Score:** 12/12 truths verified

---

## Deferred Items

None. All Phase 11 success criteria are addressed within Phase 11. No later-phase coverage applies.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `backend/app/cli/seed.py` | argparse dispatch, guards, `run_prod_synthetic_seed`, `run_teardown`, scope helpers | VERIFIED | 999 lines; all required functions present and substantive |
| `backend/app/services/storage.py` | `SYNTHETIC_PREFIX`, `_assert_synthetic_storage_path`, `upload_synthetic_photo_idempotent`, `list_synthetic_storage_count`, `teardown_synthetic_storage` | VERIFIED | Lines 254-328; all 5 helpers present using existing `BUCKET` constant |
| `backend/app/cli/synthetic_photos/<slug>.jpg` x 21 | One JPEG per recipe slug (42-194 KB each, total ~2.19 MB) | VERIFIED | 21 JPGs confirmed; all pass JPEG magic-byte sniff per 11-03-SUMMARY |
| `backend/app/cli/synthetic_photos/README.md` | License attribution per photo | VERIFIED | Present; per 11-03-SUMMARY `grep -c '<fill>' README.md` returns 0 |
| `RUNBOOK.md` (repo root) | Operator runbook (D-17) | VERIFIED | 241 lines; all required sections present |
| `.planning/v0.3/RUNBOOK.md` | Stub linking to canonical | VERIFIED | 28 lines; link `../../RUNBOOK.md` verified resolves to canonical |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `seed.py main()` | `_guard_prod_environment()` then `run_prod_synthetic_seed()` or `run_teardown()` | `argparse._parse_args()` → branch on `args.prod_synthetic`/`args.teardown` | VERIFIED | Lines 983-995; `_parse_args()` returns `Namespace` with both flags |
| `seed.py _guard_prod_environment()` | `settings.database_url` substring check | `"supabase.co" in settings.database_url` | VERIFIED | Line 153; also checks `localhost` and `aldente_test` (lines 160-164) |
| `seed.py _guard_environment()` | D-04 symmetric refusal | `os.environ.get("ALDENTE_PROD_SEED") == "1"` check | VERIFIED | Lines 127-131; refuses test seed if prod env var set without flag |
| `seed.py run_prod_synthetic_seed()` | `upload_synthetic_photo_idempotent` | lazy import from `app.services.storage`; called in recipes loop | VERIFIED | Lines 661-662; called at line 735; `photo_paths=[photo_path]` at line 749 |
| `storage.py upload_synthetic_photo_idempotent` | `client.storage.from_(BUCKET)` where `BUCKET = "recipe-photos"` | existing `_supabase()` lazy-init + `BUCKET` constant | VERIFIED | Line 286: `client.storage.from_(BUCKET)` — uses constant, not literal |
| `seed.py run_teardown()` | `teardown_synthetic_storage()` AFTER `db.commit()` | line order: commit at 960, storage at 966 | VERIFIED | Correct order confirmed; storage cleanup is outside the `with SessionLocal()` block |
| `_merge_synthetic()` | `_assert_synthetic_household()` | direct call at line 117 | VERIFIED | Every `_merge_synthetic` call passes through scope assertion |

---

## Data-Flow Trace (Level 4)

This phase does not produce rendering components — it is a write-side CLI. Level 4 (data flowing to render) applies to the auditor's iPhone session reading from the seeded data, which requires a human to verify (see Human Verification below).

What can be verified statically:

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `run_prod_synthetic_seed` → `recipes.photo_paths` | `photo_path` | `upload_synthetic_photo_idempotent(slug, content)` returns bucket-relative path | Yes — JPG bytes read from disk (line 734), uploaded to Storage, path returned | FLOWING |
| `_gather_synthetic_counts` → banner | `counts` dict | 5 SQLAlchemy `select(func.count(...))` queries + Storage list | Yes — DB queries scoped to `SYNTHETIC_HOUSEHOLD_ID` | FLOWING |
| Vote rows → `compute_vote_state` (at read-time) | vote rows | `pg_insert(Vote).on_conflict_do_update(...)` | Yes — 7 rows with explicit values covering 5 states | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| argparse parses `--prod-synthetic` and `--teardown` | `python3 -c "from app.cli.seed import _parse_args; ns=_parse_args(['--prod-synthetic','--teardown']); assert ns.prod_synthetic and ns.teardown"` | Passes (confirmed in 11-01-SUMMARY) | PASS |
| D-04 symmetric guard fires: `ALDENTE_PROD_SEED=1` without flag exits non-zero | `ALDENTE_PROD_SEED=1 uv run seed` | REFUSING banner + exit 1 (confirmed in 11-01-SUMMARY) | PASS |
| `--teardown` without `--prod-synthetic` exits non-zero | `uv run seed --teardown` | "REFUSING: --teardown only valid with --prod-synthetic." + exit 1 | PASS |
| `--prod-synthetic` without env var exits non-zero | `uv run seed --prod-synthetic` | "REFUSING: --prod-synthetic passed but ALDENTE_PROD_SEED env var not '1'" + exit 1 | PASS |
| `_assert_synthetic_storage_path` raises on out-of-scope path | `python3 -c "from app.services.storage import _assert_synthetic_storage_path; _assert_synthetic_storage_path('public/bad.jpg')"` | `AssertionError` (confirmed in 11-01-SUMMARY) | PASS |
| `BUCKET == "recipe-photos"` (not wrong bucket) | `grep -c '"recipes"' storage.py seed.py` | Returns 0 — no wrong literal present | PASS |
| Vote count = 7 (not 4) | Arithmetic: 5 vote_specs → 2+1+2+2+0 = 7 | 7 (calculated independently; matches banner dry-run in 11-02-SUMMARY) | PASS |
| End-to-end seed against prod Supabase | `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic` | Cannot run without prod creds | SKIP |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEED-01 | 11-01, 11-02 | Operator can run seed against prod Supabase, creating a clearly-labeled synthetic household without touching real user data | SATISFIED | `[SYNTHETIC] Démo Al Dente` label (line 706); dual-key guard; `_assert_synthetic_household` + `_assert_synthetic_storage_path` scope guards |
| SEED-02 | 11-01, 11-02 | Idempotent across re-runs — same UUIDs, no duplicate-key errors, deterministic, closes cross-day hole | SATISFIED | D-10 sliding cooking_log key (no date); D-11 sliding shortlist key (no date); D-12 votes `on_conflict_do_update`; `_merge_synthetic`/`db.merge` for all other rows |
| SEED-03 | 11-02 | CLI prints invite code to stdout | SATISFIED | `_print_post_seed_banner` prints `Synthetic invite code: DEMO01` (ANSI-bold) after commit |
| SEED-04 | 11-01, 11-05 | Hard-refusal guard + written runbook | SATISFIED | `_guard_prod_environment()` with 3 distinct exits; D-04 symmetric guard; `RUNBOOK.md` (241 lines) at root + `.planning/v0.3/RUNBOOK.md` stub |
| SEED-05 | 11-02, 11-03 | Coverage matches local seed: 2 members + 21 recipes + 3 cooking_logs + 7 votes covering all 5 states | SATISFIED | 2 members (Luca + Partner); 21 recipe specs; 3 `log_specs`; 7 vote rows from 5 `vote_specs` covering all 5 computed states |

---

## Threat Model Coverage

| Threat | Mitigation | Evidence |
|--------|-----------|---------|
| (a) Running against prod without intent | Dual-key opt-in: BOTH `--prod-synthetic` flag AND `ALDENTE_PROD_SEED=1` env var required; `_guard_prod_environment()` checks `supabase.co` in URL, rejects `localhost`/`aldente_test` | `seed.py:144-165`; D-04 symmetric guard at `seed.py:127-131` |
| (a) Inverse: stale env var triggers prod codepath when running test seed | D-04 symmetric guard in `_guard_environment()` refuses test seed if `ALDENTE_PROD_SEED=1` set without `--prod-synthetic` | `seed.py:127-131` |
| (b) Ambiguous synthetic-vs-real labeling | Household name is literally `[SYNTHETIC] Démo Al Dente`; invite code `DEMO01` is recognizable; members have normal names (by design — audit needs realistic feel) | `seed.py:706-707` |
| (c) Out-of-scope Postgres writes | `_merge_synthetic()` calls `_assert_synthetic_household()` before every `db.merge()`; Vote upserts pre-check parent recipe scope; `_assert_synthetic_household` raises `AssertionError` on mismatch | `seed.py:86-118`; vote guard at line 842 |
| (c) Out-of-scope Storage writes | `_assert_synthetic_storage_path()` raises if path does not start with `synthetic/`; called in `upload_synthetic_photo_idempotent` and `teardown_synthetic_storage` | `storage.py:264-272`; called at lines 283, 324 |
| (d) Cross-day idempotency bugs / orphaned rows | No date in cooking_log UUID key (D-10); no date in shortlist UUID key (D-11); votes upsert against stable shortlist UUID (D-12); `_merge_synthetic` for all other rows | `seed.py:782, 813`; `on_conflict_do_update` at line 855-862 |
| (d) Concurrent seed runs leaving partial state | `pg_advisory_xact_lock(SYNTHETIC_LOCK_KEY)` at start of both `run_prod_synthetic_seed` and `run_teardown` transactions (D-24) | `seed.py:699-700, 913-914` |
| (e) Synthetic invite code leakage | `DEMO01` is fixed, recognizable, documented; printed only to stdout (never stored separately); RUNBOOK documents collision recovery | `seed.py:707`; RUNBOOK "DEMO01 already taken" troubleshooting entry |
| (e) Storage cleanup leaving orphans | Storage DELETE happens AFTER `db.commit()` in teardown (D-16) — no window where `photo_paths` references exist without corresponding DB rows; Storage failure is caught, sentinel returned, banner shows FAILED, retry is safe | `seed.py:960, 966`; try/except at lines 965-974 |

---

## Architecture Invariant Compliance

| Invariant | Description | Status | Evidence |
|-----------|------------|--------|---------|
| #2 Voting state computed, not stored | No `state` column written; 5 states derive from vote row presence + value | VERIFIED | `vote_specs` only write `vote="yes"/"no"` values; no `state` field in `pg_insert(Vote).values(...)` |
| #3 Same-tx denormalization | `recipes.last_cooked_at` and `cook_count` updated in same tx as cooking_log INSERT | VERIFIED | `seed.py:791-803`: `db.flush()` after each log merge; recompute count; update recipe fields; all before `db.commit()` |
| #5 Raw inputs preserved | `source_capture={"type": "manual", "payload": {"title": ...}}` on all synthetic recipes | VERIFIED | `seed.py:745-747` in `run_prod_synthetic_seed`; matches Phase 10 pattern |
| #6 French-only via next-intl | Not applicable to backend CLI; runbook and stdout are operator-facing English (correct) | N/A | Phase 11 is backend-only; user-facing strings unaffected |
| #7 Single uvicorn worker | Not applicable; seed is a one-shot CLI process | N/A | No APScheduler, no uvicorn interaction |
| Locked vocabularies | `Cuisine`, `Mood`, `Protein`, `Season` imported from `app.models.enums`; no duplicated literals | VERIFIED | `seed.py:42`: `from app.models.enums import Cuisine, Mood, Protein, Season # NO duplicates!` |

---

## Research-Correction Compliance

| Correction | Required | Evidence |
|------------|---------|---------|
| Bucket name `recipe-photos` (NOT `recipes`) | `grep -c '"recipes"'` storage.py seed.py returns 0; all new helpers use `BUCKET` constant | VERIFIED — 0 occurrences of `"recipes"` literal; `BUCKET = "recipe-photos"` used throughout |
| `recipes.photo_paths` populated | `photo_paths=[photo_path]` in prod-synthetic recipe merge | VERIFIED — `seed.py:749`; test seed retains `photo_paths=[]` (correct) |
| PgBouncer/advisory-lock `:5432` vs `:6543` | RUNBOOK.md Pre-flight check #1 documents direct URL requirement | VERIFIED — RUNBOOK lines 55-65; 7 occurrences of `:5432`/`:6543`/`PgBouncer` in runbook |

---

## Vote Count Accuracy

The post-seed banner prints `votes: 7`. The teardown banner prints `votes removed: 7`. The RUNBOOK smoke check specifies `votes=7`. The `votes=4` figure that appeared in Plan 02 task text was a drafting error — it was corrected in Plan 02 SUMMARY and honored in all subsequent artifacts. Independently verified: 5 `vote_specs` produce 2+1+2+2+0 = 7 rows.

| Location | Value | Correct? |
|----------|-------|---------|
| `_print_post_seed_banner` output | `votes: 7` | YES |
| `_print_teardown_banner` output | `votes removed: 7` | YES |
| RUNBOOK smoke check | `votes=7` | YES |
| RUNBOOK reference table | `7` | YES |
| `votes=4` anywhere | 0 occurrences | YES (absent) |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|---------|--------|
| `seed.py:459` | `_id("cooking_log", slug, str(cooked_at.date()))` — date in test seed cooking_log key | INFO | This is intentional and correct for the TEST seed (cross-day hole deferred to v0.2.2 for local seed per CONTEXT.md). The prod-synthetic path uses `_id_synth("cooking_log", slug)` without date. Not a bug. |
| `seed.py:489` | `_id("shortlist", today.isoformat())` — date in test seed shortlist key | INFO | Same as above — intentional for the test seed. Prod-synthetic path uses `_id_synth("shortlist", "today")`. Not a bug. |
| `backend/app/cli/synthetic_photos/` | 21 JPGs not matched to recipe titles (per 11-03-SUMMARY) | INFO | Operator-approved deviation. Photos are real food photos but not curated per dish. See Deviations section. |

No blockers. No genuine stubs (the `run_prod_synthetic_seed` and `run_teardown` stubs from Plan 01 were fully replaced in Plans 02 and 04 respectively).

---

## Human Verification Required

### 1. End-to-End Prod Seed Smoke Check

**Test:** Set all four env vars (`DATABASE_URL` pointing to `:5432` direct URL, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALDENTE_PROD_SEED=1`) and run `cd backend && uv run seed --prod-synthetic`. Re-run a second time.

**Expected:** Both runs print the banner with identical counts: `recipes: 21 / members: 2 / cooking_logs: 3 / votes: 7 / shortlists: 1 / storage objects (synthetic/): 21`. No errors.

**Why human:** Requires real prod Supabase credentials (`DATABASE_URL` with `supabase.co`, `SUPABASE_SERVICE_ROLE_KEY`). Cannot be verified without live prod access. Advisory lock and Storage SDK calls require a live Postgres + Supabase Storage connection.

### 2. Auditor Photo Rendering (Signed-URL Round-Trip)

**Test:** After running the prod seed, join the synthetic household from an iPhone via invite code `DEMO01`. Navigate to any recipe's detail page.

**Expected:** Recipe photos render (not blank). Each recipe shows a photo because `recipes.photo_paths = ["synthetic/<slug>.jpg"]` is populated and the Storage bucket has the corresponding object.

**Why human:** Requires a real device, real Supabase Storage `recipe-photos` bucket, signed-URL generation via the backend API, and an active auth session. The code correctly populates `photo_paths` (line 749) and the storage helpers are correctly implemented — but end-to-end rendering requires the full stack running with real credentials.

### 3. Teardown Full Cycle

**Test:** After a successful seed, run `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic --teardown`. Then re-run teardown a second time.

**Expected:** First teardown prints `votes removed: 7 / cooking_logs removed: 3 / daily_shortlists removed: 1 / recipes removed: 21 / members removed: 2 / households removed: 1 / storage objects removed: 21`. Second teardown prints all zeros plus "Note: nothing to remove."

**Why human:** Requires real prod Supabase credentials and a seeded synthetic household to tear down. FK-respecting DELETE order and Storage cleanup correctness requires live execution to confirm.

---

## Deviations

### Operator-Approved: Photo-to-Dish Accuracy Relaxed

**CONTEXT.md must_have truth #5** ("each photo visually matches its slug's recipe title") was explicitly relaxed by the operator: "no need to have photo perfectly related to the recipe."

Photos at `backend/app/cli/synthetic_photos/<slug>.jpg` are real food photos sourced from Pexels (CC0 license, no attribution required) but are not curated per dish. `salade-grecque.jpg` may not depict a Greek salad specifically.

**Implication for Phase 13:** The design audit should treat photos as layout-proving filler, not content-audit material. Any per-recipe visual mismatch is by design and is NOT a Phase 11 finding.

**Documented in:** `backend/app/cli/synthetic_photos/README.md`, commit `77c017e` message, `11-03-SUMMARY.md`.

---

## Gaps Summary

No gaps. All 12 must-haves verified. All 5 SEED requirements satisfied. Three items require human verification (prod credentials gated) but represent expected operator-run gate-checks, not code defects.

---

_Verified: 2026-05-09T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
