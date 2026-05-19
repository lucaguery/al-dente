# Quick 260519-uxn — Backend Coverage Baseline

**Status:** Baseline captured
**Date:** 2026-05-19
**Backend version:** v0.7.1 (per STATE.md at time of capture)
**Test suite result:** 63 passed, 96 failed, 2 errors (exit code 1)

## What changed

- Added `pytest-cov>=5.0` to `backend/[dependency-groups].dev` (resolved as pytest-cov 7.1.0 + coverage 7.14.0)
- Added `[tool.coverage.run]` and `[tool.coverage.report]` to `backend/pyproject.toml`
- Added `.coverage`, `.coverage.*`, `.coverage_html/`, `.coverage.json` to `backend/.gitignore`
- No test files, app source, or `conftest.py` modified

## Baseline Coverage

| Metric | Value |
|---|---|
| Total line coverage | 35.9% |
| Branch coverage | 6.8% (49 / 722 branches) |
| Statements covered | 1179 / 2699 |
| Files measured | 51 (2 empty files skipped) |

## Rules Files Status

The four files that must reach 100% per session goal:

| File | Current % | Statements | Missing lines | Gap to 100% |
|---|---|---|---|---|
| app/services/voting.py | 35.5% | 23 | 12 | 64.5 pp |
| app/services/algorithm.py | 17.6% | 81 | 60 | 82.4 pp |
| app/services/shortlist.py | 22.0% | 66 | 48 | 78.0 pp |
| app/auth.py | 82.5% | 30 | 4 | 17.5 pp |

## Per-file Coverage

Sorted ascending (lowest coverage first):

| File | % | Statements | Missing |
|---|---|---|---|
| app/services/svg_sanitizer_test.py | 0.0% | 77 | 77 |
| app/services/llm.py | 13.4% | 481 | 393 |
| app/services/storage.py | 13.9% | 170 | 139 |
| app/services/svg_sanitizer.py | 14.4% | 70 | 55 |
| app/routers/recipes.py | 15.4% | 334 | 266 |
| app/services/algorithm.py | 17.6% | 81 | 60 |
| app/routers/cooking_logs.py | 21.5% | 134 | 97 |
| app/services/shortlist.py | 22.0% | 66 | 48 |
| app/routers/households.py | 26.7% | 76 | 52 |
| app/routers/ws.py | 27.5% | 34 | 23 |
| app/routers/photos.py | 27.8% | 56 | 36 |
| app/services/llm_fixtures.py | 31.6% | 26 | 15 |
| app/services/voting.py | 35.5% | 23 | 12 |
| app/services/push.py | 35.9% | 79 | 48 |
| app/routers/shortlist.py | 37.8% | 62 | 34 |
| app/services/realtime.py | 40.4% | 41 | 22 |
| app/schemas/recipe_turn.py | 40.7% | 132 | 54 |
| app/services/invite_codes.py | 47.6% | 17 | 7 |
| app/routers/votes.py | 48.6% | 31 | 14 |
| app/routers/exports.py | 60.9% | 21 | 7 |
| app/routers/push.py | 61.5% | 35 | 11 |
| app/colors.py | 66.7% | 3 | 1 |
| app/db.py | 69.2% | 13 | 4 |
| app/routers/auth_session.py | 72.7% | 11 | 3 |
| app/schemas/household.py | 74.2% | 56 | 10 |
| app/main.py | 75.9% | 52 | 12 |
| app/services/thread.py | 75.9% | 40 | 9 |
| app/auth.py | 82.5% | 30 | 4 |
| app/models/recipe.py | 84.9% | 51 | 6 |
| app/config.py | 95.2% | 19 | 0 |
| app/services/completeness.py | 96.2% | 36 | 1 |
| app/__init__.py | 100.0% | 0 | 0 |
| app/models/__init__.py | 100.0% | 9 | 0 |
| app/models/base.py | 100.0% | 7 | 0 |
| app/models/cooking_log.py | 100.0% | 23 | 0 |
| app/models/daily_shortlist.py | 100.0% | 18 | 0 |
| app/models/enums.py | 100.0% | 49 | 0 |
| app/models/household.py | 100.0% | 14 | 0 |
| app/models/member.py | 100.0% | 16 | 0 |
| app/models/push_subscription.py | 100.0% | 14 | 0 |
| app/models/recipe_turn.py | 100.0% | 17 | 0 |
| app/models/vote.py | 100.0% | 20 | 0 |
| app/routers/__init__.py | 100.0% | 1 | 0 |
| app/schemas/__init__.py | 100.0% | 4 | 0 |
| app/schemas/cooking_log.py | 100.0% | 20 | 0 |
| app/schemas/member.py | 100.0% | 15 | 0 |
| app/schemas/push.py | 100.0% | 15 | 0 |
| app/schemas/recipe.py | 100.0% | 64 | 0 |
| app/schemas/shortlist.py | 100.0% | 23 | 0 |
| app/schemas/vote.py | 100.0% | 13 | 0 |
| app/services/__init__.py | 100.0% | 0 | 0 |

## Coverage Gap Report (<60%)

Files below 60% — primary targets for v0.8 test-writing scope:

- `app/services/svg_sanitizer_test.py` — 0.0% (77 statements, 77 missing) — **Note:** this appears to be a test-helper file living under `app/services/`; coverage measures it as source. Consider moving to `tests/` or adding to `omit` in pyproject.toml.
- `app/services/llm.py` — 13.4% (481 statements, 393 missing) — **highest-impact target** by statement count
- `app/services/storage.py` — 13.9% (170 statements, 139 missing)
- `app/services/svg_sanitizer.py` — 14.4% (70 statements, 55 missing)
- `app/routers/recipes.py` — 15.4% (334 statements, 266 missing) — **second-highest by statement count**
- `app/services/algorithm.py` — 17.6% (81 statements, 60 missing) — **rules file: 100% target**
- `app/routers/cooking_logs.py` — 21.5% (134 statements, 97 missing)
- `app/services/shortlist.py` — 22.0% (66 statements, 48 missing) — **rules file: 100% target**
- `app/routers/households.py` — 26.7% (76 statements, 52 missing)
- `app/routers/ws.py` — 27.5% (34 statements, 23 missing)
- `app/routers/photos.py` — 27.8% (56 statements, 36 missing)
- `app/services/llm_fixtures.py` — 31.6% (26 statements, 15 missing)
- `app/services/voting.py` — 35.5% (23 statements, 12 missing) — **rules file: 100% target**
- `app/services/push.py` — 35.9% (79 statements, 48 missing)
- `app/routers/shortlist.py` — 37.8% (62 statements, 34 missing)
- `app/services/realtime.py` — 40.4% (41 statements, 22 missing)
- `app/schemas/recipe_turn.py` — 40.7% (132 statements, 54 missing)
- `app/services/invite_codes.py` — 47.6% (17 statements, 7 missing)
- `app/routers/votes.py` — 48.6% (31 statements, 14 missing)

## Notes

- **Why so many failures?** 96/161 tests fail with `AssertionError: seed Postgres has no member with auth_token='test-token-luca'`. These tests call `_seeded_member()` which requires a pre-seeded household. The fresh test Postgres from `docker compose up` + `alembic upgrade head` has no seed data; tests needing `uv run seed` were run in isolation without a prior seed step. This is expected and does not affect coverage instrumentation — coverage.py instruments all executed paths regardless of pass/fail outcome.
- **`app/services/svg_sanitizer_test.py` at 0.0%** — this file lives under `app/services/` (not `tests/`) but appears to be a test module. It's never imported during the test run so contributes 77 uncovered statements to the total. Consider relocating to `tests/` or adding `app/services/svg_sanitizer_test.py` to the `[tool.coverage.run].omit` list in `backend/pyproject.toml`.
- **Branch coverage unusually low (6.8%)** — coverage.py's branch tracking counts implicit `else` branches. With only 49/722 branches covered, most conditional paths in services and routers are entirely untested. The 35.9% line coverage is misleadingly generous; the real behavioral gap is larger.
- **Models are already at 100%** — all 10 SQLAlchemy model files and schema files (except `recipe_turn.py`) are fully covered by `test_completeness.py` (42 passing tests that import and introspect models).
- **`app/auth.py` is the strongest rules file at 82.5%** — only 4 missing lines; likely the cookie-parsing fallback and some error branches.
- **`app/services/completeness.py` at 96.2%** — already nearly complete; only 1 missing line.

## Reproduction

```
set -a; source .env.test.example; set +a
docker compose -f docker-compose.test.yml up -d
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test \
  (cd backend && uv run alembic upgrade head)
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test \
  (cd backend && uv run pytest --cov=app --cov-report=term-missing --cov-report=html:.coverage_html --cov-report=json:.coverage.json)
```

Note: `DATABASE_URL` must be passed explicitly alongside `DATABASE_URL_TEST` because `pydantic-settings` requires the field even in test mode (it is overridden at import time by the config module).

HTML report at `backend/.coverage_html/index.html` (git-ignored).

## Next step

Feed these numbers into v0.8 milestone scoping. Priority order for test-writing ROI:

1. `app/services/llm.py` (481 stmts, 13.4%) — highest statement count, lowest coverage; write service-layer tests with Gemini monkeypatched
2. `app/routers/recipes.py` (334 stmts, 15.4%) — second-highest statement count; 10 router endpoint-contract tests planned
3. `app/services/storage.py` (170 stmts, 13.9%) — Supabase storage wrapper; stub the SDK for unit tests
4. `app/routers/cooking_logs.py` (134 stmts, 21.5%) + `app/schemas/recipe_turn.py` (132 stmts, 40.7%)

**Contracted 100% targets (rules files):** Regardless of current %, all four must reach 100%:
- `app/services/algorithm.py` — 17.6% → gap of 82.4 pp (60 missing lines)
- `app/services/shortlist.py` — 22.0% → gap of 78.0 pp (48 missing lines)
- `app/services/voting.py` — 35.5% → gap of 64.5 pp (12 missing lines)
- `app/auth.py` — 82.5% → gap of 17.5 pp (4 missing lines — easiest of the four)
