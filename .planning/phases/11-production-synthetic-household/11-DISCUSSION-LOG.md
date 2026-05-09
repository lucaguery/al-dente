# Phase 11: Production Synthetic Household — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `11-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 11-production-synthetic-household
**Areas discussed:** Hard-refusal opt-in, Labeling & scope guard, Cross-day idempotency, Invite code & teardown, Member auth_token strategy, Photos & Supabase Storage, Recipe corpus selection, Concurrency

---

## Hard-refusal opt-in

| Option | Description | Selected |
|--------|-------------|----------|
| Both flag + env var | Require BOTH `--prod-synthetic` AND `ALDENTE_PROD_SEED=1`. Belt-and-suspenders. | ✓ |
| CLI flag only | `--prod-synthetic` only. Simpler; vulnerable to typo/muscle-memory. | |
| Env var only | `ALDENTE_PROD_SEED=1` only. Risk: env vars persist across shells silently. | |

**User's choice:** Both flag + env var (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| DB URL contains 'supabase.co' | Substring match on `database_url`. Mirrors Phase 10's `aldente_test` pattern. Plus secondary refusal on `localhost`/`aldente_test`. | ✓ |
| ENVIRONMENT=prod check | Read `settings.environment == 'prod'`. Cleaner but relies on env var being set right. | |
| Combined (URL + env) | Require both URL match AND env=prod. Most defensive but harder to test. | |

**User's choice:** DB URL contains 'supabase.co' (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Loud sys.exit + sample command | Print offending state + exact correct invocation, exit non-zero. | ✓ |
| Quiet exit non-zero | One-line refusal, exit 1. | |
| Dry-run preview | Print what WOULD happen without writing. Adds a read-prod path. | |

**User's choice:** Loud sys.exit + sample command (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — mutually exclusive | Test guard ALSO refuses if prod flags are accidentally set. Closes inverse footgun. | ✓ |
| No — only guard prod | Test seed ignores prod flags. | |

**User's choice:** Yes — mutually exclusive (recommended).

---

## Labeling & scope guard

| Option | Description | Selected |
|--------|-------------|----------|
| Household name only | `[SYNTHETIC] Démo Al Dente` household name; members and recipes look normal. Audit signal undistorted. | ✓ |
| Household + members | Members named `[SYN] Luca` etc. Stronger DB-side label; leaks into UI. | |
| All rows prefixed | Every recipe title prefixed `[SYN]`. Maximum DB-side label; defeats Phase 13. | |

**User's choice:** Household name only (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Central helper + assert | `_synthetic_household_id()` helper; wrapper asserts every write scopes to that ID. | ✓ |
| Helper + post-run audit query | Above PLUS final SELECT for non-scoped rows; ROLLBACK if any. Most defensive; hard to implement. | |
| Convention + reviewer checklist | Module docstring + code review only. Lightest weight; bypassable. | |

**User's choice:** Central helper + assert (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Allowlist (6 tables) | Hardcoded set: households, members, recipes, cooking_logs, votes, daily_shortlists. New tables require explicit update. | ✓ |
| Whatever the local seed touches | Mirror local seed implicitly. Drift risk. | |

**User's choice:** Allowlist (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Same file, parameterized | Extend `backend/app/cli/seed.py` with `--prod-synthetic` mode. Shared row specs avoid drift. | ✓ |
| Separate file (seed_prod.py) | New file imports specs from seed.py. Clearer review surface; drift risk. | |

**User's choice:** Same file, parameterized (recommended).

---

## Cross-day idempotency

| Option | Description | Selected |
|--------|-------------|----------|
| Slide to 'now' on every run | Drop date from cooking_log UUID; merge UPDATE `cooked_at = now - delta` per spec. | ✓ |
| Anchor to fixed reference date | Hardcoded `SEED_REFERENCE_DATE`; offsets stable but env ages indefinitely. | |
| Slide to 'now' for log timestamps; keep slug-only UUID | Same outcome as option 1, restated. | |

**User's choice:** Slide to 'now' on every run (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| One row per day, slide on re-run | `_id('shortlist', 'today')`; UPDATEs date and recipe_ids. | ✓ |
| Append: today stays + new row per day | Phase 10 pattern; orphans pile up. | |
| Static reference date | Anchored; "today's shortlist" UI feature looks broken in audit. | |

**User's choice:** One row per day, slide on re-run (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — votes always reference current shortlist | Stable UUID; rows UPDATE in place. | ✓ |
| Votes per shortlist date | Pairs with append-shortlist; higher complexity. | |

**User's choice:** Yes — votes always reference current shortlist (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Post-seed COUNT diff | Print row counts; operator runs twice and eyeballs. | ✓ |
| Programmatic check in seed | Self-test via savepoint + rollback. Doubles runtime. | |
| Defer to Phase 12 Playwright check | Couples Phase 11 success to Phase 12. | |

**User's choice:** Post-seed COUNT diff (recommended).

---

## Invite code & teardown

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed memorable: 'DEMO01' | Hardcoded 6-char uppercase fitting existing format. Recognizable if leaked. | ✓ |
| Hash-derived deterministic | base32(uuid5(...)). Stable but opaque. | |
| Fixed but namespaced: '[SYN]00' | Outside real alphabet; requires column/endpoint change. | |

**User's choice:** Fixed memorable: 'DEMO01' (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Print to stdout on every run | Copy-pasteable line after commit. SEED-03 requirement. | ✓ |
| Print + write to a runbook file | Above PLUS write to `.planning/v0.3/RUNBOOK.md`. Drift risk. | |

**User's choice:** Print to stdout on every run (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated CLI subcommand | `uv run seed --prod-synthetic --teardown`. Reuses scope guard. | ✓ |
| Manual SQL in runbook | psql DELETE statements documented. Bypasses scope guard. | |
| Refresh-only — no teardown command | Re-run = refresh; teardown deferred. Non-conforming with SEED-04. | |

**User's choice:** Dedicated CLI subcommand (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| .planning/v0.3/RUNBOOK.md | Per ROADMAP success criterion 4 verbatim. Less discoverable. | |
| Top-level RUNBOOK.md | Repo root. More discoverable. Conflicts with ROADMAP wording. | |
| Both — doc at root, link to .planning/v0.3/ | Canonical at root + stub at `.planning/v0.3/` linking. Satisfies both. | ✓ |

**User's choice (after conflict-resolution prompt):** Both — doc at root, link to `.planning/v0.3/` (resolved against ROADMAP success criterion 4).
**Notes:** Initial pick was top-level only; flagged the conflict with the locked success criterion; user chose the bridging option.

---

## Member auth_token strategy

| Option | Description | Selected |
|--------|-------------|----------|
| None usable — random per run | `secrets.token_urlsafe(32)` per run, never printed. Smallest leakage surface. | ✓ |
| Env-var controlled (mirror local) | `PROD_SEED_AUTH_TOKEN_LUCA` etc. Persists in shell history. | |
| Static recognizable tokens | `'synthetic-member-luca'`. Recognizable if leaked but still leaks. | |

**User's choice:** None usable — random per run (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Preserved — auditor adds 3rd | Seed merges 2 deterministic members; auditor's join creates member #3 via real flow. | ✓ |
| Re-running seed deletes member #3 | Painful for iterative audits. | |
| Re-running seed preserves additions | Same as 'Preserved', restated. | |

**User's choice:** Preserved — auditor adds 3rd (recommended).

---

## Photos & Supabase Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Empty paths — audit sees the truth | `photo_paths=[]` like local seed. Audit reflects post-quick-capture state. | |
| Hero photos for ~5 recipes | Upload ~5 stock photos. Photo-bearing cards on shortlist surfaces. | |
| All 21 recipes get photos | Maximum visual fidelity for the audit. Larger Storage surface. | ✓ |

**User's choice:** All 21 recipes get photos (deviation from recommendation).
**Notes:** User explicitly chose richer audit material over smaller blast radius. Triggers downstream decisions: photo source, Storage idempotency, Storage scope guard, teardown extension.

| Option | Description | Selected |
|--------|-------------|----------|
| `synthetic/<recipe-slug>.jpg` | Top-level prefix in existing `recipes` bucket. Easy to scope. | ✓ |
| Separate bucket: `synthetic-recipes` | Dedicated bucket. Heavier (RLS, frontend awareness). | |
| Defer | Don't decide; gap for future contributors. | |

**User's choice:** `synthetic/<recipe-slug>.jpg` (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Commit JPGs to repo | 21 small JPGs at `backend/app/cli/synthetic_photos/`. Reproducible, no network dep. | ✓ |
| Download from a CDN at seed time | Network dependency; URLs may rot. | |
| AI-generate via Gemini | Non-deterministic, quota cost. | |

**User's choice:** Commit JPGs to repo (recommended for predictability).

| Option | Description | Selected |
|--------|-------------|----------|
| Skip-if-exists by path | HEAD check before upload. Re-runs are O(21 HEAD requests). | ✓ |
| Always upload (overwrite) | Simplest; ~2MB per re-run unnecessary. | |
| Hash-based: only upload if local file changed | Most defensive; over-engineered at 21-photo scale. | |

**User's choice:** Skip-if-exists by path (recommended).

---

## Recipe corpus selection

| Option | Description | Selected |
|--------|-------------|----------|
| Same 21 as local | Reuse `_recipe_specs()` unchanged. Single source of truth; SEED-05 compliance. | ✓ |
| Same 21 + edge-case probes | Add 2-3 weird specs. Bumps count past SEED-05 wording. | |
| Curated subset of best 12-15 | Hides issues a full corpus would surface. | |

**User's choice:** Same 21 as local (recommended).

| Option | Description | Selected |
|--------|-------------|----------|
| Direct import from seed.py | Prod-synthetic mode imports `_recipe_specs()` directly. | ✓ |
| Copy into a separate constant | Drift risk. | |

**User's choice:** Direct import from seed.py (recommended).

---

## Concurrency

| Option | Description | Selected |
|--------|-------------|----------|
| Postgres advisory lock | `pg_advisory_xact_lock(<hash of synthetic_household_uuid>)` at tx start. | ✓ |
| Operator-discipline only + document | Runbook says don't run concurrently; no code-level guard. | |
| Detect and abort | Marker rows; advisory locks are the right primitive. | |

**User's choice:** Postgres advisory lock (recommended).

---

## Claude's Discretion

The user said "you decide" implicitly on the items captured in `11-CONTEXT.md` §"Claude's Discretion" — exact Storage SDK call shape, JPG byte budget, argparse vs click, advisory-lock numeric key derivation, etc.

## Deferred Ideas

Captured in `11-CONTEXT.md` §"Deferred Ideas":
- Observability / audit-trail logging for prod-seed runs.
- Supabase free-tier rate-limit engineering (not needed at 21-photo scale).
- AI-generated photo regeneration tool (separate future phase).
- Curated edge-case recipe specs (would rewrite SEED-05; deferred).
- Multi-tenant fixtures (out of scope per REQUIREMENTS.md).
- CI integration of prod seed (out of scope).
- The four other v0.2.2 backlog issues (TZ-01, URL-01, CL-01, Sheet-01) — Phase 11 closes only SEED-01 *for the prod synthetic specifically*.
