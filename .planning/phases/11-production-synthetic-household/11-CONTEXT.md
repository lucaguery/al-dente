# Phase 11: Production Synthetic Household — Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 extends `uv run seed` to run safely against **production Supabase**, producing one clearly-labeled synthetic household — same shape as the local seed (2 members + 21 recipes + 3 cooking_logs + 7 votes covering all 5 computed states: Validé / Pressenti / Contesté / Rejeté / Sans avis) — without touching real user data, with idempotent re-runs across days, with a documented refresh / teardown path, and with photos so Phase 13's design audit has visual material.

**Not in this phase:**
- No fixes to product code (audit-only milestone; `feedback_executor_scope_creep`).
- No multi-tenant fixtures, no real-user seed data, no synthetic households beyond the single labeled one (per `REQUIREMENTS.md` Out of Scope).
- No CI integration of the prod seed (operator runs it on their laptop with explicit opt-in).
- No closing of v0.2.2 backlog issues (TZ-01, URL-01, CL-01, Sheet-01, etc.) beyond what naturally falls out of building this seed.

</domain>

<decisions>
## Implementation Decisions

### Hard-refusal opt-in (threat model: (a) running against prod unintentionally)

- **D-01:** The seed requires **both** `--prod-synthetic` CLI flag **and** `ALDENTE_PROD_SEED=1` env var to write to prod. Belt-and-suspenders: env vars alone persist across shells and create silent footguns; flags alone are vulnerable to muscle-memory invocation. Both = deliberate.
- **D-02:** Prod is detected by `database_url` containing `'supabase.co'`. Secondary refusal if URL contains `'localhost'` or `'aldente_test'`. The check matches the Phase 10 guard pattern (which keys on `'aldente_test'`) but inverts polarity.
- **D-03:** Guard refusal is **loud**: `sys.exit` with the offending state (which guard tripped, current DB host, current `ENVIRONMENT`), the exact correct invocation including both flag and env var, and a non-zero exit code. Matches the Phase 10 D-09 actionable-failure style.
- **D-04:** **Symmetric guard:** when targeting test or local DB, the seed ALSO refuses if `--prod-synthetic` or `ALDENTE_PROD_SEED=1` is set. Closes the inverse footgun (operator with stale env var thinks they're seeding prod, actually seeds test). Cheap symmetry; covers a real failure mode.

### Labeling & scope guard (threat model: (b) ambiguous label, (c) out-of-scope writes)

- **D-05:** Synthetic household name is `"[SYNTHETIC] Démo Al Dente"`. Members keep normal French names ("Luca", "Partner") and recipes keep normal-looking titles ("Risotto aux champignons" etc.). Rationale: the design audit (Phase 13) needs the app to feel real; prefixing every recipe or member with `[SYN]` would distort the audit's signal. The household-level label is sufficient for any DB-side inspector to identify the synthetic rows immediately.
- **D-06:** Structural scope guard via a `_synthetic_household_id()` helper that returns the locked uuid5 for the synthetic household. **Every** INSERT/UPDATE in the prod-synthetic path goes through a wrapper that asserts `household_id == synthetic_id` (raises if missing or mismatched). This is a structural mechanism, not a comment or convention — a future contributor adding a row type that bypasses the wrapper trips the assert.
- **D-07:** **Postgres write allowlist (6 tables):** `households`, `members`, `recipes`, `cooking_logs`, `votes`, `daily_shortlists`. Tables outside this set have no code path in the prod-synthetic seed. New tables added to the schema require an explicit seed update + review — closes a future-drift footgun.
- **D-08:** **Supabase Storage write allowlist:** every Storage write must use a key starting with `synthetic/` (e.g. `synthetic/<recipe-slug>.jpg`). Symmetric to the Postgres scope guard but for object storage. Same wrapper pattern: helper that asserts the key prefix before any upload.
- **D-09:** **Same file, parameterized.** Extend `backend/app/cli/seed.py` with a `--prod-synthetic` mode that selects a different env guard, household label, ID namespace (`"aldente.prod.synthetic.<entity>.<key>"`), and recipe-spec source. Shared row specs (the 21 recipes) are imported directly to avoid drift. The prod path must remain visually distinct in code review (clearly-named functions, top-of-file mode dispatch).

### Cross-day idempotency (threat model: (d) orphaned rows; closes v0.2.2 SEED-01 hole)

- **D-10:** **Cooking_log dates slide to "now" on every run.** Drop the date from the UUID key (`_id("cooking_log", slug)` only — no `cooked_at.date()` component). On re-run, `db.merge()` UPDATEs `cooked_at = now - timedelta(days=N)` per spec. Cooking history always looks fresh (e.g. "last cook 2 days ago") regardless of when the seed was last run. `recipes.last_cooked_at` and `cook_count` denormalization continue to recompute in the same transaction (architecture invariant #3).
- **D-11:** **Daily_shortlist slides too** — `_id("shortlist", "today")` with no date in the key. Re-running on any day UPDATEs the existing row's `date = today` and `recipe_ids` list. The audit always sees a shortlist "for today."
- **D-12:** **Votes reference the sliding shortlist** — vote rows are upserted against the (sliding) shortlist's stable UUID. Re-runs: same shortlist UUID, same vote UUIDs, vote rows UPDATE in place. The 5 computed states render correctly because they derive from current rows. No orphans.
- **D-13:** **Idempotency verification = post-seed COUNT diff.** After commit, the seed prints row counts (e.g. `recipes=21 logs=3 votes=4 shortlists=1 storage_objects=21`). Operator runs the seed twice in a row and eyeballs that the counts match. Documented in the runbook as the smoke check. Cheap, makes idempotency observable without doubling seed runtime.

### Invite code & teardown (threat model: (e) leakage)

- **D-14:** **Fixed memorable invite code: `"DEMO01"`.** Fits the existing 6-char uppercase alphanumeric format (`backend/app/services/invite_codes.py:23-24`). Predictable, easy for the operator to type on iPhone. Recognizable as synthetic if it ever leaks. Once seeded, the unique index on `households.invite_code` "owns" it — no real household can ever be issued the same code.
- **D-15:** **Surface via stdout on every run** (SEED-03 requirement). Seed prints a copy-pasteable line `Synthetic invite code: DEMO01` after commit. Print-only — no separate doc keeps the code (avoids drift if it ever changes).
- **D-16:** **Dedicated teardown CLI subcommand:** `uv run seed --prod-synthetic --teardown` (with the same `ALDENTE_PROD_SEED=1` env var). Reuses the synthetic household scope guard. Order: (1) Storage objects under `synthetic/` deleted **after** the `recipes` rows are deleted (so no orphaned references in `recipes.photo_paths` mid-teardown); (2) Postgres rows deleted in FK-respecting order: `votes` → `cooking_logs` → `daily_shortlists` → `recipes` → `members` → `household`. All scoped to `household_id = synthetic_id`. Storage deletes scoped to keys matching `synthetic/%`.
- **D-17:** **Runbook lives at top-level `RUNBOOK.md`** (operator discoverability) **with a stub at `.planning/v0.3/RUNBOOK.md`** that links to it (satisfies ROADMAP §Phase 11 success criterion 4 verbatim). Runbook covers: refresh invocation, teardown invocation, troubleshooting (guard fires unexpectedly; invite code already taken; teardown interrupted mid-cascade), and the post-seed COUNT-diff smoke check from D-13.

### Member auth_token strategy

- **D-18:** **Seeded members get NO usable auth_token.** Each gets `secrets.token_urlsafe(32)` generated fresh per run, never printed, never stored outside the DB. The members exist as "historical" identities so cooking_logs and votes have authors; nobody can authenticate as them. Smallest leakage surface; matches threat-model framing.
- **D-19:** **Auditor joins via invite code as member #3.** The seed only `db.merge()`s the 2 deterministic members; never deletes additional members. SEED-05's "2 members" baseline is the post-seed shape; once the auditor joins, the household has 3. The 5 vote states still compute correctly because they derive from the 2 seeded members' votes (member #3 hasn't voted). Re-runs preserve the auditor's member row.

### Photos & Supabase Storage

- **D-20:** **All 21 recipes get photos** (deviation from recommended "empty paths"; explicit decision for a richer Phase 13 visual audit). Photos are committed to the repo at `backend/app/cli/synthetic_photos/<slug>.jpg` — small JPGs (~50-150KB each, ~2-3MB total). Source: free-license library (Unsplash CC0 / Pexels) curated and reviewed for accuracy to the recipe title. Fully reproducible at seed time (no network dependency).
- **D-21:** **Storage path convention: `synthetic/<recipe-slug>.jpg`** under the existing `recipes` Supabase Storage bucket. Top-level `synthetic/` prefix is the structural marker for the scope guard from D-08 and the teardown scope from D-16. Easy to grep and easy to scope DELETE.
- **D-22:** **Skip-if-exists upload idempotency.** Before uploading each photo, the seed checks Supabase Storage for the path and skips if present. Re-runs do O(21 HEAD requests) — fast. New photos added to the corpus get uploaded; existing ones don't get re-uploaded. Minimal Storage write traffic.

### Recipe corpus

- **D-23:** **Same 21 recipe specs as the local seed** — no additions, no curation. The prod-synthetic mode imports `_recipe_specs()` from `backend/app/cli/seed.py` directly (single source of truth). SEED-05 says "matches the local seed shape: 21 recipes" — this is the literal compliance answer. Future corpus changes touch one place.

### Concurrency

- **D-24:** **Postgres advisory lock** at the start of the seed transaction: `pg_advisory_xact_lock(<hash of synthetic_household_uuid>)`. If another seed run holds it, the second blocks until commit/rollback. Cheap (one extra SQL call), guarantees serialization, releases automatically on tx end. At couple-scale the risk of concurrent invocations is essentially zero, but the cost is so low that "free safety" beats "documented discipline."

### Claude's Discretion

The following are implementation details the planner / executor should decide WITHOUT re-asking the user:

- Exact Supabase Storage SDK call (REST vs `supabase-py` client) for the HEAD-then-upload flow in D-22.
- Exact byte-budget for the 21 committed JPGs (target ~50-150KB; planner picks the encoder/quality).
- Whether the Supabase Storage HEAD check uses the project's existing `services/storage.py` or a fresh helper (recommend reusing).
- Exact Python click/argparse shape for the new flags (`--prod-synthetic`, `--teardown`).
- Whether the post-seed COUNT diff (D-13) is one print line or a small table.
- Color/order of the printed invite-code stdout line (recommend: bold green or unmissable banner).
- Where the assertion wrapper from D-06/D-08 lives in `seed.py` (top-of-file helper vs nested in main).
- Exact Postgres advisory-lock numeric key derivation from the household UUID.

### Folded Todos

None — the cross-reference yielded no matches relevant to SEED-01..05.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source of truth & milestone scope
- `.planning/REQUIREMENTS.md` §"SEED — Production Synthetic Household" — SEED-01..05 acceptance criteria (authoritative; every detail in this CONTEXT.md derives from REQUIREMENTS.md, NOT the reverse).
- `.planning/ROADMAP.md` §"Phase 11" — goal, success criteria, threat-model paragraph.
- `.planning/PROJECT.md` — Current Milestone v0.3 section + Key Decisions table.
- `SPEC.md` (repo root) — locked vocabularies (Season / Cuisine / Mood / Protein), voting state machine, capture pipeline, data model.
- `CLAUDE.md` (repo root) — Architecture invariants 1-8 (especially #2 voting computed-not-stored, #3 same-tx denorm, #5 raw inputs kept forever, #6 French-only via next-intl).

### Prior-phase context (Phase 10 / v0.2.1 — directly extended)
- `.planning/milestones/v0.2.1-phases/10-e2e-test-infrastructure/10-CONTEXT.md` — D-09 idempotency mechanism (uuid5, db.merge, on_conflict_do_update, NO TRUNCATE+INSERT), D-10 env vars pattern.
- `backend/app/cli/seed.py` — current Phase 10 seed (test-only). The cross-day hole lives at line 339 (`_id("cooking_log", slug, str(cooked_at.date()))`) and line 369 (shortlist date in key). D-10/D-11 fix both. Recipe specs to import live in `_recipe_specs()`.

### Backend code touched by Phase 11
- `backend/app/cli/seed.py` — extended with `--prod-synthetic` and `--teardown` modes (D-09).
- `backend/app/config.py` — `settings.environment`, `settings.database_url` consumed by guards (D-02).
- `backend/app/services/invite_codes.py` — line 23-24 defines the alphabet/length the `DEMO01` code must conform to (D-14).
- `backend/app/services/storage.py` — likely reused for Supabase Storage HEAD/upload calls (D-22).
- `backend/app/models/enums.py` — Python `Enum` classes the seed MUST import directly (no duplicated literal values per locked-vocabularies invariant).
- `backend/app/models/household.py`, `member.py`, `recipe.py`, `cooking_log.py`, `daily_shortlist.py`, `vote.py` — the 6 allowlisted tables (D-07).
- `backend/pyproject.toml` `[project.scripts]` — `seed` console-script entry registered in Phase 10; needs to accept the new flags.

### New files Phase 11 will create
- `backend/app/cli/synthetic_photos/<slug>.jpg` × 21 — committed photos (D-20).
- `RUNBOOK.md` (repo root) — refresh + teardown procedure (D-17).
- `.planning/v0.3/RUNBOOK.md` — stub linking to the root runbook (D-17, satisfies ROADMAP success criterion 4).

### Anti-pattern guards
- Memory: `feedback_no_manual_vercel_deploy.md` — push to `main` only. Phase 11 must NOT touch deploy commands.
- Memory: `feedback_executor_scope_creep.md` — gsd-executor previously modified files outside plan scope. The plan for Phase 11 MUST pass this CONTEXT.md (and the eventual SUMMARY.md) to the executor with a hard scope constraint: seed CLI extension + photos + runbook ONLY, no product-code refactors. If the seed surfaces a real bug in product code, the executor flags it and stops — does not fix.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`backend/app/cli/seed.py`** — entire Phase 10 seed including stable uuid5, `db.merge()` / `on_conflict_do_update`, hard-refusal guard pattern, recipe specs (`_recipe_specs()`). Phase 11 extends this file rather than forking it.
- **`backend/app/services/invite_codes.py`** — alphabet and length constants. Phase 11's fixed `"DEMO01"` conforms to these so no schema or service changes are needed.
- **`backend/app/services/storage.py`** (assumed; verify path during research) — Supabase Storage helper(s) reused for D-22's HEAD-then-upload flow.
- **`backend/app/auth.py`** — invite-code → member auth flow already supports the auditor's iPhone join (no new auth code needed).
- **Architecture invariant #3 same-tx denormalization** — already implemented for cooking_logs in `seed.py:348-361`. Phase 11's sliding cooking_log dates reuse this exact pattern.

### Established Patterns
- **`pydantic-settings` Settings class** at `backend/app/config.py` — D-02 prod detection adds at most a one-line property (e.g. `is_prod: bool` derived from `database_url` substring) or a guard helper, no settings refactor.
- **Voting state is computed, NEVER stored** (invariant #2) — D-12's vote upserts produce the 5 states by combining vote-row presence and `vote.value`; no `state` column to write.
- **Raw inputs preserved** (invariant #5) — recipes' `source_capture` JSONB is set to `{"type": "manual", "payload": {"title": ...}}` in the local seed (line 304-307); prod synthetic mirrors this shape.
- **French-only via `next-intl`** (invariant #6) — Phase 11 is backend-only, but `RUNBOOK.md` and stdout strings should be operator-facing English (operator/auditor language; user-facing app strings are unaffected by this phase).
- **Single uvicorn worker + APScheduler in-process** (invariant #7) — Phase 11 doesn't touch this; the seed CLI is a one-shot process, not the running uvicorn worker.

### Integration Points
- `backend/app/cli/seed.py` — the file gets a mode dispatch at the top of `main()` and a new `_guard_prod_environment()` companion to `_guard_environment()`.
- `backend/pyproject.toml` `[project.scripts]` — `seed` already registered; new flags are argparse-level, no entry-point change.
- Supabase Storage `recipes` bucket — receives the `synthetic/` prefix tree.
- Postgres `households`, `members`, `recipes`, `cooking_logs`, `votes`, `daily_shortlists` — the 6 allowlisted tables.

</code_context>

<specifics>
## Specific Ideas

- The 21 committed JPGs (D-20) should match the recipe titles closely enough that the design audit doesn't flag a "photo doesn't match dish" mismatch as a finding (that would be noise). Prefer simple, well-lit, top-down shots — not dramatic plating — so the audit measures the app's design, not the photographer's.
- The post-seed stdout (D-13, D-15) should be a single un-missable block (boxed or with a banner) showing: synthetic household ID, invite code, row counts, storage object count. Operator-discoverable at a glance.
- The runbook (D-17) should open with the 4 critical commands (refresh / teardown / smoke check / how-to-join-from-iPhone) in copy-pasteable form, then put rationale and troubleshooting below the fold — same shape as Phase 10's `TESTING.md`.
- The teardown's "interrupted mid-cascade" recovery (D-17) should boil down to "re-run teardown — it's idempotent because the scope guard plus FK-respecting order makes partial state safe to retry."

</specifics>

<deferred>
## Deferred Ideas

These came up implicitly during analysis but belong outside this phase:

- **Observability / audit trail of who ran the prod seed when** — could be a structured log line to a Supabase table or external sink. Out of scope for v0.3 (no new product features); revisit if the audit milestone surfaces a need.
- **Rate-limit handling against Supabase free tier on photo uploads** — at 21 photos / re-run with skip-if-exists, the practical hit is 21 HEAD calls + 0-21 PUT calls. Within free-tier headroom for couple-scale operator runs. Not engineered.
- **AI-generated photos via Gemini** — considered for D-20 but rejected (non-determinism, quota cost, complexity). Could be a future "regenerate the synthetic photo set" tool, separate phase.
- **Curated edge-case recipe specs** (long titles, weird prep times) — would increase audit coverage but rewrites SEED-05's "21 recipes" criterion. Out of scope; revisit in a future synth-data milestone if the audit identifies UI states the current 21 don't exercise.
- **Multi-tenant fixtures** (more than one synthetic household, e.g. for testing cross-household isolation) — explicitly out of scope per `REQUIREMENTS.md` Out of Scope.
- **CI integration of the prod seed** — explicitly out of scope (operator runs it on their laptop with explicit opt-in; CI must never have those credentials).
- **The five v0.2.2 backlog issues** (TZ-01, URL-01, CL-01, Sheet-01, SEED-01 local) — tracked in PROJECT.md "Surfaced for follow-up". Phase 11 closes SEED-01 *for the prod synthetic specifically* (D-10/D-11/D-12); the other four remain backlog.

### Reviewed Todos (not folded)
None — todo cross-reference yielded no matches.

</deferred>

---

*Phase: 11-production-synthetic-household*
*Context gathered: 2026-05-09*
