---
phase: 03
plan: 01
subsystem: backend
tags: [algorithm, voting, alembic, migration, push, vapid, scoring]
requires:
  - backend/app/models/recipe.py (existing Recipe ORM)
  - backend/app/models/vote.py (existing Vote ORM + VoteValue enum)
  - backend/app/models/household.py (existing Household ORM)
  - backend/alembic/versions/0003_promotion_columns.py (predecessor revision "0003")
provides:
  - PushSubscription ORM (one Web Push subscription per member, UNIQUE on member_id for upsert)
  - Recipe.days_since_cooked() helper (None → 999, integer days otherwise)
  - Household.timezone column (default 'Europe/Paris', for APScheduler CronTrigger)
  - votes UNIQUE(shortlist_id, recipe_id, member_id) — required for ON CONFLICT DO UPDATE in re-vote
  - app.services.algorithm — score_recipe, select_top5_with_diversity, select_top5_soft_diversity, select_top_n_with_cold_start, ShortlistContext, ShortlistFilters
  - app.services.voting — compute_vote_state, VoteState
  - apscheduler / pywebpush / py-vapid Python deps installed in uv.lock
  - VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_EMAIL settings exposed via Settings
affects:
  - backend/app/models/__init__.py (PushSubscription registered alongside other ORM mappers)
tech-stack:
  added:
    - apscheduler>=3.11 (resolved 3.11.2)
    - pywebpush>=2.3 (resolved 2.3.0)
    - py-vapid>=1.9 (resolved 1.9.4)
  patterns:
    - Pure-function services (no DB access in algorithm.py / voting.py)
    - Computed-not-stored voting state (architecture invariant #2)
    - SPEC.md verbatim algorithm (jitter + recency + seasonality + diversification)
    - Cold-start corpus-size branching (<10 / 10–29 / 30+)
key-files:
  created:
    - backend/alembic/versions/0004_phase3_tables.py
    - backend/app/models/push_subscription.py
    - backend/app/services/algorithm.py
    - backend/app/services/voting.py
  modified:
    - backend/pyproject.toml
    - backend/uv.lock
    - backend/.env.example
    - backend/app/config.py
    - backend/app/models/recipe.py
    - backend/app/models/household.py
    - backend/app/models/__init__.py
decisions:
  - alembic revision id "0004" (plain numeric form), down_revision "0003" — matches existing convention; plan text suggested "0003_promotion_columns" but actual revision id is "0003"
  - days_since_cooked() returns 999 for never-cooked recipes (capped semantics so any value > 14 maps to 1.0 in the recency term)
  - VoteState branch order: terminal-states first (valide / rejete) → mixed (conteste) → asymmetric (pressenti) → default (sans_avis); identical order required in lib/votes.ts mirror
  - Cold-start tuning lives in select_top_n_with_cold_start, driven by corpus_size at the call site (NOT len(candidates), which is post-hard-filter)
metrics:
  duration: ~25 min
  completed: 2026-05-07
  tasks: 2
  files_changed: 9
---

# Phase 3 Plan 1: Decide-W3 Foundations Summary

Lays the pure-logic foundation for Phase 3 (W3 / Decide). Migration 0004 adds `push_subscriptions` (one row per member with UNIQUE(member_id) for upsert), the `votes` UNIQUE constraint required for `ON CONFLICT DO UPDATE` re-vote, and the `households.timezone` column needed by APScheduler's daily-shortlist CronTrigger. Three new backend dependencies (apscheduler, pywebpush, py-vapid) lock cleanly. Two new pure-function service modules — `services/algorithm.py` (SPEC.md scoring + diversification + cold-start) and `services/voting.py` (compute_vote_state + VoteState 5-state enum) — give Plan 02 (routers + cron) a single source of truth for both the daily-shortlist math and the asymmetric voting-state machine.

## What Plan 02 / Plan 03 / Plan 04 / Plan 05 can now import without exploration

```python
# Plan 02 — services/shortlist.py + routers/shortlist.py + routers/votes.py
from app.models import PushSubscription, Household, Recipe, Vote
from app.services.algorithm import (
    score_recipe,
    select_top_n_with_cold_start,
    ShortlistContext,
    ShortlistFilters,
)
from app.services.voting import compute_vote_state, VoteState
```

```ts
// Plan 03 — frontend/lib/votes.ts (mirror of services/voting.py)
// Branch order MUST match: valide → rejete → conteste → pressenti → sans_avis
```

## Tasks executed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Phase 3 backend deps + migration 0004 + PushSubscription ORM + days_since_cooked + households.timezone | `6a6f961` | backend/pyproject.toml, backend/uv.lock, backend/.env.example, backend/app/config.py, backend/app/models/recipe.py, backend/app/models/household.py, backend/app/models/push_subscription.py, backend/app/models/__init__.py, backend/alembic/versions/0004_phase3_tables.py |
| 2 | services/algorithm.py + services/voting.py — pure functions per SPEC.md | `ef2767e` | backend/app/services/algorithm.py, backend/app/services/voting.py |

## Verification

All plan acceptance criteria pass:

- `apscheduler`, `pywebpush`, `py-vapid` listed in `pyproject.toml` and locked in `uv.lock` (resolved 3.11.2 / 2.3.0 / 1.9.4)
- VAPID env vars in `.env.example` (3 lines) and exposed via `Settings` (3 fields with `""` defaults)
- Migration 0004 syntactically valid (`revision = "0004"`, `down_revision = "0003"`, both `upgrade()` + `downgrade()` callable)
- `Recipe.days_since_cooked()` returns 999 for an instance with `last_cooked_at = None`
- `Household` table has a `timezone` column
- `app.models.PushSubscription.__tablename__ == "push_subscriptions"`
- `services/algorithm.py` exports the 4 required functions + 2 dataclasses; uses `random.uniform(0, 0.2)` jitter, `days / 14.0` recency, `corpus_size < 10` and `corpus_size < 30` cold-start branches
- `services/voting.py` exports `compute_vote_state` + `VoteState` with all 5 enum values; branch order matches SPEC §Voting verbatim
- Both service modules are pure: zero matches for `from app.db | from app.routers | broadcast_to_household | async def`
- Live evaluation of all 5 vote-state branches passes asserts (valide / rejete / conteste / pressenti / sans_avis)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Migration revision id format**

- **Found during:** Task 1 step 8 (creating alembic 0004)
- **Issue:** The plan's `<interfaces>` excerpt and `<action>` step 8 both stated the predecessor revision as `"0003_promotion_columns"` and instructed the new migration to set `down_revision = "0003_promotion_columns"`. The actual revision id in `backend/alembic/versions/0003_promotion_columns.py` is `"0003"` (plain numeric). Setting `down_revision = "0003_promotion_columns"` would cause Alembic to fail with "Can't locate revision identified by '0003_promotion_columns'" on `alembic upgrade head`.
- **Fix:** Used `revision = "0004"` and `down_revision = "0003"` — matches the convention established by 0001 / 0002 / 0003.
- **Files modified:** `backend/alembic/versions/0004_phase3_tables.py`
- **Commit:** `6a6f961`
- **Rationale documented in migration docstring** so future readers see why we deviated from the plan text.

No other deviations. The two service modules and the schema artifacts match the plan exactly.

## Authentication Gates

None — this plan is backend-pure logic + schema; no external service calls.

## Architecture Invariant Compliance

- **Invariant #2 (voting state computed, not stored):** Honored. `services/voting.py` is a pure function over an iterable of Vote rows; no `state` column added; `VoteState` is an enum returned at compute-time only.
- **Invariant #3 (denormalized last_cooked_at):** Untouched (read-only access via `days_since_cooked()`).
- **Vocabulary drift (frontend ↔ backend):** No vocabulary changes in this plan; locked enums (Season, Cuisine, Mood, Protein) untouched.
- **CLAUDE.md "raw inputs kept forever":** Untouched; no source_capture changes.

## Threat Surface

The plan's `<threat_model>` covers the changes precisely (T-03-01-01..07). One mitigation note worth highlighting:

- **T-03-01-03 (Tampering — votes UNIQUE on existing rows):** Mitigated by Phase 3's greenfield position — `votes` table has zero rows before this plan ships, so the UNIQUE addition cannot conflict. Migration would raise IntegrityError and abort cleanly if duplicates somehow exist.
- **T-03-01-05 (Information disclosure — PushSubscription endpoints):** Plan 05 must enforce "do not log the full subscription endpoint" (token-grade secret per RFC 8030). Surfaced here for downstream awareness.

No new threat surfaces introduced beyond those documented in the plan's `<threat_model>`.

## Self-Check: PASSED

Files created (verified `test -f`):
- FOUND: backend/alembic/versions/0004_phase3_tables.py
- FOUND: backend/app/models/push_subscription.py
- FOUND: backend/app/services/algorithm.py
- FOUND: backend/app/services/voting.py

Files modified (verified `git log` shows commits):
- FOUND: 6a6f961 — feat(03-01): phase 3 prerequisites
- FOUND: ef2767e — feat(03-01): pure scoring + voting state machine

Live import smoke-test (DATABASE_URL stub):
- FOUND: PushSubscription, Household, Recipe import OK; Recipe().days_since_cooked() == 999
- FOUND: ShortlistContext('spring', set(), set()) constructs cleanly
- FOUND: All 5 VoteState branches return correct enum value
- FOUND: Migration 0004 module loads with revision "0004", down_revision "0003"
