---
phase: 11-production-synthetic-household
plan: 05
subsystem: docs-runbook
tags: [runbook, operator, prod-synthetic, seed, teardown, troubleshooting]
requires:
  - .planning/phases/11-production-synthetic-household/11-CONTEXT.md
  - .planning/phases/11-production-synthetic-household/11-RESEARCH.md
  - .planning/phases/11-production-synthetic-household/11-01-SUMMARY.md
  - .planning/phases/11-production-synthetic-household/11-02-SUMMARY.md
  - .planning/phases/11-production-synthetic-household/11-03-SUMMARY.md
  - .planning/phases/11-production-synthetic-household/11-04-SUMMARY.md
provides:
  - RUNBOOK.md (repo root) — canonical operator-facing runbook
  - .planning/v0.3/RUNBOOK.md — milestone-path stub linking to canonical
affects:
  - RUNBOOK.md (NEW, 14,996 bytes / 241 lines)
  - .planning/v0.3/RUNBOOK.md (NEW, 1,434 bytes / 28 lines)
tech-stack:
  added: []
  patterns:
    - 4-commands-above-the-fold (Phase 10 TESTING.md shape)
    - canonical-at-root + stub-at-milestone-path (D-17 split)
    - troubleshooting tied to RESEARCH.md Pitfalls 1, 3, 6, 8, 9
key-files:
  created:
    - RUNBOOK.md
    - .planning/v0.3/RUNBOOK.md
  modified: []
decisions:
  - Document `votes=7` everywhere (NOT `votes=4`) — the 5 vote_specs produce
    2+1+2+2+0 = 7 rows total. Plan 02 SUMMARY corrected the same arithmetic
    in the planning text; this runbook reflects the implementation.
  - Document the bucket name as `recipe-photos` (the actual constant in
    services/storage.py), NOT `recipes` (the CONTEXT.md transcription error).
  - Pre-flight check #1 calls out PgBouncer / `:5432` direct-URL requirement
    (advisory locks need a session-pinned connection — the inline comments
    in run_prod_synthetic_seed and run_teardown defer to this runbook for the
    operator-facing explanation).
  - Stub at .planning/v0.3/RUNBOOK.md is intentionally minimal — operational
    content lives at the repo root (D-17), the stub merely satisfies the
    ROADMAP §Phase 11 success criterion 4 path requirement.
  - Verification block in plan used basic-regex `\|`; switched to extended
    regex during self-check; underlying content matches all acceptance
    criteria (PgBouncer/5432 covered 5x; vote-state mapping covered 5x).
metrics:
  duration: ~6 min
  completed: 2026-05-09T13:30:00Z
  tasks: 2
  files_modified: 0
  files_created: 2
---

# Phase 11 Plan 05: Operator Runbook

**One-liner:** Two-file runbook — canonical `RUNBOOK.md` at the repo root
(241 lines, copy-pasteable commands above the fold + 5 pre-flight checks +
banner shapes + troubleshooting + by-design notes + reference table) and a
`.planning/v0.3/RUNBOOK.md` stub linking to it (28 lines, satisfies ROADMAP
§Phase 11 success criterion 4) — every documented command verified against
the shipped CLI from Plans 01-04.

## Tasks Executed

### Task 1: Write RUNBOOK.md at repo root

**Commit:** `48eb009`

Wrote `RUNBOOK.md` at the repo root with the structure prescribed by the
plan:

- **TL;DR — The four commands** (refresh / teardown / smoke check / iPhone
  join), each in copy-pasteable code blocks with the exact 4-env-var
  prefix (`DATABASE_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
  ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic[--teardown]`).
- **Pre-flight (5 checks):**
  1. Direct (non-PgBouncer) `DATABASE_URL` — port `:5432` not `:6543`,
     with a worked grep example and direct-URL pasteable example
     (`postgresql://postgres:<pw>@db.<project>.supabase.co:5432/postgres`).
  2. Env-var contract — 4-var existence loop.
  3. `recipe-photos` Supabase Storage bucket exists with Public=OFF.
  4. `ALDENTE_PROD_SEED` unset in normal dev shell (D-04 symmetric guard).
  5. `DEMO01` not already in use — pre-seed SQL check.
- **After every refresh — the banner:** the exact post-seed banner shape
  (printed by `_print_post_seed_banner`) including all 6 right-aligned
  count rows. Documents `votes=7` (the 5 vote_specs produce 2+1+2+2+0 = 7
  rows). Closes with the D-13 idempotency-check reminder.
- **After every teardown — the banner:** the exact post-teardown banner
  shape (printed by `_print_teardown_banner`) showing `votes removed: 7`,
  `cooking_logs removed: 3`, `daily_shortlists removed: 1`,
  `recipes removed: 21`, `members removed: 2 (or 3 if auditor had joined)`,
  `households removed: 1`, `storage objects removed: 21`. Documents the
  idempotent-empty-rerun signal.
- **Troubleshooting (10 named cases):**
  - REFUSING: ALDENTE_PROD_SEED=1 set but --prod-synthetic flag NOT passed
    (D-04 / Pitfall 3).
  - REFUSING: --prod-synthetic passed but ALDENTE_PROD_SEED env var not '1'.
  - REFUSING: --teardown only valid with --prod-synthetic.
  - REFUSING: database_url does not contain 'supabase.co' (Pitfall 3 — env
    file load trap).
  - REFUSING: missing photo(s) ... (Plan 03 photos missing).
  - REFUSING: Supabase Storage not configured (Pitfall 8 — fail-fast).
  - duplicate key value violates unique constraint households_invite_code_key
    (Pitfall 6 — DEMO01 collision).
  - Bucket recipe-photos not found / Storage 404 (Pitfall 1 — bucket name
    transcription error).
  - Teardown raises FK violation mid-cascade (Pitfall 9 — FK chain documented).
  - Storage cleanup raises after Postgres deletes succeeded.
  - Joining from iPhone but recipe cards show no photos (Pitfall 2).
  - Seed hangs forever on pg_advisory_xact_lock (PgBouncer trap).
- **Operator workflow patterns:** wipe-then-reseed eval pattern; test seed
  unaffected.
- **By-design behavior (NOT bugs):** auditor wipe on teardown (Pitfall 10),
  sliding cooking_log dates (D-10), sliding shortlist (D-11), token rotation
  (D-18), namespace separation (test vs prod-synthetic), `db.merge`
  propagation (Pitfall 7).
- **Reference table:** what the seed actually writes (1 household + 2 members
  + 21 recipes + 3 cooking_logs + 1 shortlist + 7 votes + 21 storage objects)
  with the explicit per-state vote breakdown (Validé:2, Pressenti:1,
  Contesté:2, Rejeté:2, Sans avis:0; total = 7).
- **File map:** pointers to seed.py, services/storage.py, synthetic_photos/,
  and the .planning/v0.3/ stub.

### Task 2: Write .planning/v0.3/RUNBOOK.md stub

**Commit:** `9237e11`

Wrote a 28-line stub that:

- Links to the canonical via `[RUNBOOK.md](../../RUNBOOK.md)` (verified
  to resolve correctly: `ls -la .planning/v0.3/../../RUNBOOK.md` shows
  the 14,996-byte root file).
- Cites ROADMAP §Phase 11 success criterion 4 verbatim.
- Lists what's covered (4 commands, pre-flight, banners, troubleshooting,
  by-design).
- Lists when to update (CLI shape change, new troubleshooting case, invite
  code/label change).
- Lists 3 source-of-truth files for further reading: 11-CONTEXT.md,
  11-RESEARCH.md, backend/app/cli/seed.py, plus the synthetic_photos/README.md.

## File sizes

| File | Bytes | Lines |
|---|---|---|
| `RUNBOOK.md` (canonical) | 14,996 | 241 |
| `.planning/v0.3/RUNBOOK.md` (stub) | 1,434 | 28 |

## Verification — actual stdout

### Acceptance grep block (Task 1)

```
exists: yes
DEMO01 count: 15                   (>= 5 required)
uv run seed --prod-synthetic count: 6
uv run seed --prod-synthetic --teardown count: 3
ALDENTE_PROD_SEED=1 count: 7
Pre-flight section: 1
Troubleshooting section: 1
iPhone joining: 2                  (header + body section)
recipe-photos count: 5
PgBouncer/advisory/5432 count: 5
vercel/railway count (must be 0): 0
votes=7 count: 2
votes=4 count (must be 0): 0
[SYNTHETIC] Démo: 2
votes removed 7: 1
```

### Stub acceptance grep block (Task 2)

```
exists
RUNBOOK.md count: 2
../../RUNBOOK.md link: 1
Phase 11 ref: 2
stub link resolves to: -rw-r--r--@ ... 14996 May 9 13:29 RUNBOOK.md
```

### Plan-level verification block

```
=== Both files exist ===
files OK

=== Required sections in root RUNBOOK ===
TL;DR: OK
Pre-flight: OK
Troubleshooting: OK
By-design: OK
## Reference: OK

=== Documented flags exist in seed.py ===
--prod-synthetic: in seed.py
--teardown: in seed.py

=== No deploy commands ===
deploy command count: 0

=== Pitfall coverage (corrected regex) ===
PgBouncer|:5432: 5 hits
ALDENTE_PROD_SEED: covered
DEMO01: covered
Storage: covered
FK: covered

=== Vote-state mapping ===
5 hits (one per state, listed in the Reference table — each line
is "**State:** slug (Luca x, Partner y) — N rows")
```

## Confirmation that every documented flag exists in seed.py

Verified via `grep -c "\"--prod-synthetic\"" backend/app/cli/seed.py` (= 1)
and `grep -c "\"--teardown\"" backend/app/cli/seed.py` (= 1). Both flag
literals are defined in `_parse_args` (lines 360-371 of seed.py at HEAD).

## Confirmation that no deploy commands appear

`grep -cE "vercel --prod|vercel deploy|railway up|railway deploy" RUNBOOK.md`
returns **0**. Honors memory `feedback_no_manual_vercel_deploy`.

## Pitfalls covered in Troubleshooting

| RESEARCH Pitfall | Covered? | RUNBOOK location |
|---|---|---|
| #1 — Bucket name `recipe-photos` not `recipes` | YES | "Bucket recipe-photos not found" entry + Pre-flight check #3 |
| #2 — `recipes.photo_paths` empty -> blank gallery | YES | "Joining from iPhone but the recipe cards show no photos" entry |
| #3 — pydantic-settings `.env` auto-load | YES | "REFUSING: database_url does not contain 'supabase.co'" entry (with explicit "do NOT rely on `set -a; source .env` muscle memory" guidance) |
| #6 — DEMO01 collision with real-user household | YES | `duplicate key value` entry with two recovery paths (pre-seed SQL fix vs. real-user collision: change code in seed.py + redeploy) |
| #8 — Storage SDK 401 with missing creds | YES | "REFUSING: Supabase Storage not configured" entry + Pre-flight check #2 |
| #9 — Teardown FK chain | YES | "Teardown raises FK violation mid-cascade" entry referencing D-16 explicit ordering |
| #10 — Auditor wiped on teardown | YES | By-design behavior section (first bullet) |
| PgBouncer / advisory-lock | YES | Pre-flight check #1 (with `:5432` vs `:6543` ports) + "Seed hangs forever on `SELECT pg_advisory_xact_lock(...)`" Troubleshooting entry |

Pitfalls #4 (FK flush ordering), #5 (NOT NULL columns), and #7 (`db.merge`
propagation) are implementation-internal — they live in the seed code as
comments and are not operator-actionable. #7 is briefly mentioned under
"By-design behavior" as the `db.merge` propagation note.

## Drift between runbook and implementation discovered during writing

**None.** The shipped CLI exactly matches what the plan's `<interfaces>`
block specified, and Plan 02's vote-count correction (4 -> 7) was already
absorbed by Plans 02 and 04 SUMMARYs and the orchestrator's hard scope
constraint. Specifically verified:

- `--prod-synthetic` and `--teardown` flag names match the runbook (Plan 01).
- The 4-env-var contract (`DATABASE_URL`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ALDENTE_PROD_SEED`) is enforced exactly as
  documented (Plans 01 + 02).
- The post-seed banner labels and ordering match `_print_post_seed_banner`
  (Plan 02), including the right-aligned 4-digit counts (`{count:>4d}`) and
  the literal label `storage objects (synthetic/):`.
- The post-teardown banner labels match `_print_teardown_banner` (Plan 04),
  including the literal labels `votes removed:`, `cooking_logs removed:`,
  `daily_shortlists removed:`, `recipes removed:`, `members removed:`,
  `households removed:`, `storage objects removed:`.
- The `REFUSING:` error messages in Troubleshooting are quoted verbatim from
  the seed.py guard functions (`_guard_environment`, `_guard_prod_environment`,
  pre-flight Storage check, pre-flight photo check).
- The teardown FK-respecting DELETE order
  (votes -> cooking_logs -> daily_shortlists -> recipes -> members ->
  households) matches `run_teardown` (Plan 04).

No CLI-shape edits were proposed or made — the runbook is documentation only.

## Authentication Gates

None. The plan only created markdown files; no auth surfaces touched. The
runbook itself documents the operator-facing auth gate (4 env vars +
`ALDENTE_PROD_SEED=1` opt-in), but that's a content concern, not an
execution-time gate.

## Product-Code Concerns Flagged (NOT fixed)

**None surfaced.** Per the orchestrator's hard scope constraint and the
executor scope-creep memory, only the two markdown files were modified. The
seed.py and services/storage.py files were read to verify CLI shape,
banner labels, and refusal messages — not modified.

## Self-Check: PASSED

- File `RUNBOOK.md` exists at repo root: FOUND (14,996 bytes).
- File `.planning/v0.3/RUNBOOK.md` exists: FOUND (1,434 bytes).
- File `.planning/phases/11-production-synthetic-household/11-05-SUMMARY.md`:
  this file.
- Commit `48eb009` (Task 1 — RUNBOOK.md): FOUND
  (`docs(11-05): add operator runbook for prod-synthetic seed`).
- Commit `9237e11` (Task 2 — stub): FOUND
  (`docs(11-05): add v0.3 runbook stub linking to root RUNBOOK.md`).
- Stub link `../../RUNBOOK.md` resolves to the canonical file: VERIFIED.
- Documented flags `--prod-synthetic` and `--teardown` both exist as string
  literals in `backend/app/cli/seed.py`: VERIFIED.
- `grep -cE "vercel --prod|railway up|railway deploy"` against RUNBOOK.md
  returns 0: VERIFIED.
- `votes=7` (and `votes removed: 7`) appear; `votes=4` does NOT appear:
  VERIFIED.
- Bucket name `recipe-photos` appears 5 times in the runbook (Pre-flight,
  Troubleshooting, photo-rendering troubleshooting, reference table, file
  map): VERIFIED.

## Plan Output Spec — Confirmation

All 9 success criteria from `<success_criteria>` met:

1. RUNBOOK.md at repo root with TL;DR (4 commands), Pre-flight (5 checks),
   banner shapes, Troubleshooting, By-design, Reference, File map: ✓
2. Every documented CLI flag exists in `backend/app/cli/seed.py`: ✓
3. `recipe-photos` bucket name appears; `"recipes"` as a bucket name does
   not: ✓
4. Pre-flight section calls out PgBouncer / `:5432` direct-connection
   requirement (Pitfall — advisory locks): ✓
5. Troubleshooting covers Pitfalls 1, 3, 6, 8, 9 from RESEARCH.md with
   concrete recovery steps: ✓
6. The `Joining from iPhone` section explains DEMO01 -> auditor as
   member #3 flow: ✓
7. NO `vercel --prod` / Railway deploy commands anywhere: ✓
8. `.planning/v0.3/RUNBOOK.md` is a stub linking to `../../RUNBOOK.md`;
   satisfies ROADMAP §Phase 11 success criterion 4 verbatim path
   requirement: ✓
9. Both files committable (no broken markdown, no `<placeholder>` for
   content that should be literal): ✓

Phase 11 is now functionally complete: Plans 01-04 ship the CLI; Plan 05
ships the operator-facing documentation that lets the operator (Luca) run
the first end-to-end seed against prod Supabase.
