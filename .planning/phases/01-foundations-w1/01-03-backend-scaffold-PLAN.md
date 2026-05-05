---
phase: 01-foundations-w1
plan: 03
plan_number: 3
slug: backend-scaffold
type: execute
wave: 2
depends_on: [shared-vocab]
files_modified:
  - backend/pyproject.toml
  - backend/uv.lock
  - backend/Dockerfile
  - backend/.env.example
  - backend/.dockerignore
  - backend/app/main.py
  - backend/app/db.py
  - backend/app/auth.py
  - backend/app/config.py
  - backend/app/models/base.py
  - backend/app/models/household.py
  - backend/app/models/member.py
  - backend/app/models/recipe.py
  - backend/app/models/cooking_log.py
  - backend/app/models/daily_shortlist.py
  - backend/app/models/vote.py
  - backend/app/models/ping.py
  - backend/alembic.ini
  - backend/alembic/env.py
  - backend/alembic/script.py.mako
  - backend/alembic/versions/0001_baseline.py
  - backend/main.py
autonomous: false
requirements: [INFRA-02, INFRA-03, INFRA-06]
must_haves:
  truths:
    - "FastAPI app runs locally and on Railway, accepting /healthz with 200"
    - "Alembic baseline migration is applied to the dev Supabase Postgres (households, members, recipes, cooking_logs, daily_shortlists, votes, pings + 3 enums all present)"
    - "Any request without a valid Bearer token to a protected route returns HTTP 401"
    - "CORS allows the Vercel production domain and localhost:3000; rejects other origins"
  artifacts:
    - path: "backend/app/main.py"
      provides: "FastAPI app with CORSMiddleware and /healthz"
    - path: "backend/app/auth.py"
      provides: "current_member dependency that returns Member or raises 401"
    - path: "backend/app/db.py"
      provides: "SQLAlchemy 2.0 engine + session factory + get_db FastAPI dependency"
    - path: "backend/alembic/versions/0001_baseline.py"
      provides: "Single migration with all SPEC.md tables incl. throwaway pings"
    - path: "backend/Dockerfile"
      provides: "Image runnable on Railway"
  key_links:
    - from: "backend/app/auth.py"
      to: "backend/app/models/member.py"
      via: "session.scalar(select(Member).where(Member.auth_token == token))"
      pattern: "auth_token"
    - from: "backend/app/main.py"
      to: "backend/app/auth.py"
      via: "app-level dependency or per-router include"
      pattern: "Depends\\(current_member\\)|Depends\\(get_current_member\\)"
---

<objective>
Wire the FastAPI backend, SQLAlchemy 2.0 models matching SPEC.md §"Data model" verbatim, the single Alembic baseline migration (including the throwaway `pings` table per D-01), bearer-token middleware (INFRA-06), explicit CORS allowlist, deploy to Railway, and apply the migration to dev Supabase Postgres. This plan delivers a *callable* but feature-empty backend — the routers (households, recipes, ping, ws) come in 01-04 / 01-05 / 01-06.

Purpose: INFRA-02 (Railway deploy), INFRA-03 (Postgres + first migration applied), INFRA-06 (bearer auth rejects 401). Honors CONTEXT.md "auth-token format = secrets.token_urlsafe(32)", "single Alembic baseline", "CORS = explicit allowlist".
Output: A live `https://<railway>.up.railway.app/healthz` responding 200; `alembic current` shows revision 0001 applied; the database has 7 tables and 3 enums.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundations-w1/01-CONTEXT.md
@.planning/phases/01-foundations-w1/01-UI-SPEC.md
@SPEC.md
@CLAUDE.md
@backend/main.py
@backend/pyproject.toml
@backend/.python-version
@backend/app/models/enums.py
@backend/app/colors.py
</context>

<interfaces>
From the prior plan (01-01 shared-vocab):
- `backend/app/models/enums.py` exports `Season`, `Cuisine`, `Mood`, `Protein` (str-Enums whose values are the wire format).
- `backend/app/colors.py` exports `MEMBER_COLORS: list[str]` and `is_valid_member_color(hex: str) -> bool`.

Existing scaffold:
- `backend/main.py` is a one-line stub. Keep the file but redirect it to call `uvicorn` against `backend/app/main:app` (or replace entirely — pick whichever Railway start command targets cleanly).
- `backend/pyproject.toml` is uv-style with `requires-python = ">=3.12"` and zero dependencies.
- `backend/.python-version` pins 3.12.

This plan creates the contracts that 01-04 / 01-05 / 01-06 / 01-09 will consume:
- `app.db.get_db` — FastAPI dependency yielding a SQLAlchemy `Session`.
- `app.auth.current_member` — FastAPI dependency yielding a `Member` ORM object or raising `HTTPException(401)`.
- `app.models.{Household, Member, Recipe, CookingLog, DailyShortlist, Vote, Ping}` — ORM classes.
- Single-process broadcast registry will be added in 01-05 at `app.services.realtime`.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add deps with uv; build FastAPI app, db.py, auth middleware, config; write Dockerfile</name>
  <files>backend/pyproject.toml, backend/uv.lock, backend/.env.example, backend/.dockerignore, backend/Dockerfile, backend/main.py, backend/app/main.py, backend/app/config.py, backend/app/db.py, backend/app/auth.py</files>
  <read_first>
    - SPEC.md §"Onboarding" (auth-token format and request flow)
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Claude's Discretion" (auth-token format, CORS allowlist, local dev DB hits Supabase)
    - SPEC.md §"Data model" (will inform Task 2; preview now to plan SQLAlchemy column types)
    - For FastAPI + SQLAlchemy 2.0 + Pydantic Settings + Alembic patterns, query Context7 (`mcp__context7__`) for the installed versions before writing config — these libs evolve. If unavailable, use the project READMEs in `.venv/lib/python3.12/site-packages/<pkg>/` after install.
  </read_first>
  <action>
    From `backend/`:

    1. Add deps via uv:
       ```bash
       uv add "fastapi[standard]" "sqlalchemy>=2.0" "alembic>=1.13" "psycopg2-binary" "pydantic>=2" "pydantic-settings>=2" "python-multipart" "uvicorn[standard]"
       ```
       Pick the latest compatible majors; if any conflict, prefer fastapi >=0.110, pydantic v2, sqlalchemy 2.x. Commit `uv.lock`.

    2. Create `backend/.env.example`:
       ```
       DATABASE_URL=postgresql+psycopg2://postgres:password@db.<project>.supabase.co:5432/postgres
       CORS_ALLOWED_ORIGINS=http://localhost:3000,https://al-dente.vercel.app
       SUPABASE_URL=
       SUPABASE_SERVICE_ROLE_KEY=
       ENVIRONMENT=development
       ```
       Add a comment at the top: `# Copy to .env (gitignored). Service-role key NEVER goes to the frontend bundle (D-02 reasoning).`

    3. Create `backend/app/config.py` using `pydantic-settings`:
       ```python
       from pydantic_settings import BaseSettings, SettingsConfigDict

       class Settings(BaseSettings):
           database_url: str
           cors_allowed_origins: str = "http://localhost:3000"
           supabase_url: str = ""
           supabase_service_role_key: str = ""
           environment: str = "development"

           model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

           @property
           def cors_origins_list(self) -> list[str]:
               return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

       settings = Settings()  # type: ignore[call-arg]
       ```

    4. Create `backend/app/db.py`:
       ```python
       from collections.abc import Generator
       from sqlalchemy import create_engine
       from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase
       from app.config import settings

       engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
       SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

       class Base(DeclarativeBase):
           pass

       def get_db() -> Generator[Session, None, None]:
           db = SessionLocal()
           try:
               yield db
           finally:
               db.close()
       ```

    5. Create `backend/app/auth.py`:
       ```python
       import secrets
       from fastapi import Depends, Header, HTTPException, status
       from sqlalchemy import select
       from sqlalchemy.orm import Session
       from app.db import get_db

       def generate_auth_token() -> str:
           # Per CONTEXT.md "Auth-token format" — opaque base64url, 32 bytes (43 chars).
           return secrets.token_urlsafe(32)

       def _extract_bearer(authorization: str | None) -> str:
           if not authorization or not authorization.lower().startswith("bearer "):
               raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
           token = authorization.split(" ", 1)[1].strip()
           if not token:
               raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="empty bearer token")
           return token

       def current_member(
           authorization: str | None = Header(default=None),
           db: Session = Depends(get_db),
       ):
           # Imported lazily to avoid circular imports during alembic env setup.
           from app.models.member import Member
           token = _extract_bearer(authorization)
           member = db.scalar(select(Member).where(Member.auth_token == token))
           if member is None:
               raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
           return member
       ```

    6. Create `backend/app/main.py`:
       ```python
       from fastapi import FastAPI
       from fastapi.middleware.cors import CORSMiddleware
       from app.config import settings

       app = FastAPI(title="Al Dente API", version="0.1.0")

       app.add_middleware(
           CORSMiddleware,
           allow_origins=settings.cors_origins_list,  # explicit allowlist; no "*"
           allow_credentials=False,                    # bearer in header, no cookies
           allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
           allow_headers=["Authorization", "Content-Type"],
       )

       @app.get("/healthz")
       def healthz() -> dict[str, str]:
           return {"status": "ok"}
       ```
       Routers (households, recipes, ping, ws) are mounted by 01-04 / 01-05 / 01-06 — leave a `# routers wired in subsequent plans` comment.

    7. Replace `backend/main.py` with a tiny entry-point so `python main.py` runs the dev server:
       ```python
       import uvicorn

       if __name__ == "__main__":
           uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
       ```

    8. Create `backend/Dockerfile`:
       ```dockerfile
       FROM python:3.12-slim

       ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
       WORKDIR /app

       # Install uv
       RUN pip install --no-cache-dir uv

       COPY pyproject.toml uv.lock ./
       RUN uv sync --frozen --no-dev

       COPY app ./app
       COPY alembic.ini ./
       COPY alembic ./alembic

       ENV PATH="/app/.venv/bin:$PATH"

       EXPOSE 8000
       CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
       ```
       The CMD applies migrations on each boot — safe because the migration is idempotent (`alembic upgrade head` is a no-op when current). Per CONTEXT.md "v0.1 has zero deployed users to coordinate around", this is fine.

    9. Create `backend/.dockerignore` ignoring `__pycache__`, `.venv`, `.env`, `*.pyc`, `.pytest_cache`.
  </action>
  <verify>
    <automated>cd backend && test -f Dockerfile && test -f .env.example && test -f app/main.py && test -f app/db.py && test -f app/auth.py && test -f app/config.py && grep -q "fastapi" pyproject.toml && grep -q "sqlalchemy" pyproject.toml && grep -q "alembic" pyproject.toml && grep -q "secrets.token_urlsafe(32)" app/auth.py && grep -q "allow_origins=settings.cors_origins_list" app/main.py && ! grep -q 'allow_origins=\["\*"\]' app/main.py && uv sync && uv run python -c "from app.main import app; from app.auth import generate_auth_token, current_member; from app.db import Base, engine, SessionLocal; t = generate_auth_token(); assert len(t) >= 40, f'token too short: {len(t)}'; print('OK:', len(t))"</automated>
  </verify>
  <done>App boots in Python (`uv run python -c 'from app.main import app'` succeeds); auth token generator returns ≥40-char string; CORS uses explicit allowlist (no `*`); Dockerfile present.</done>
</task>

<task type="auto">
  <name>Task 2: SQLAlchemy 2.0 models + Alembic baseline migration (incl. pings)</name>
  <files>backend/app/models/base.py, backend/app/models/household.py, backend/app/models/member.py, backend/app/models/recipe.py, backend/app/models/cooking_log.py, backend/app/models/daily_shortlist.py, backend/app/models/vote.py, backend/app/models/ping.py, backend/app/models/__init__.py, backend/alembic.ini, backend/alembic/env.py, backend/alembic/script.py.mako, backend/alembic/versions/0001_baseline.py</files>
  <read_first>
    - SPEC.md §"Data model (Postgres)" — the canonical schema. Field types, defaults, constraints, indices MUST match.
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"D-01 ping endpoint is throwaway" (the `pings` table goes in this baseline migration; 01-10 drops it post-gate)
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Single Alembic baseline migration"
    - For SQLAlchemy 2.0 typed Mapped[] syntax + Alembic 1.13 autogenerate vs hand-written ops, query Context7 with the exact installed versions before writing models — 2.0 typed style is recent.
  </read_first>
  <action>
    1. Initialize Alembic: `cd backend && uv run alembic init -t async alembic` then SWITCH to sync template (`uv run alembic init alembic --template generic`) — pick the generic template since we're using sync `psycopg2-binary` per task-1 deps. (If unsure which template is "generic" in installed alembic, just hand-write `alembic/env.py` and `alembic/script.py.mako` to use sync `engine_from_config`.)
    2. `backend/alembic.ini`: set `sqlalchemy.url = ` blank (we'll inject from `app.config.settings.database_url` in `env.py`); set `script_location = alembic`; set `prepend_sys_path = .`; configure log levels.
    3. `backend/alembic/env.py`: import `from app.config import settings`, set `config.set_main_option("sqlalchemy.url", settings.database_url)`. Import `from app.db import Base` and `import app.models  # noqa — registers all classes` so `target_metadata = Base.metadata` sees every table.
    4. `backend/app/models/base.py`: re-export `Base` from `app.db` for clean import paths, plus shared mixins:
       ```python
       from sqlalchemy import DateTime, func
       from sqlalchemy.orm import Mapped, mapped_column
       from datetime import datetime
       from app.db import Base

       class TimestampMixin:
           created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
       ```
    5. Create `backend/app/models/__init__.py` importing every model so Alembic sees them:
       ```python
       from app.models.household import Household
       from app.models.member import Member
       from app.models.recipe import Recipe, RecipeStatus
       from app.models.cooking_log import CookingLog, LogRating
       from app.models.daily_shortlist import DailyShortlist
       from app.models.vote import Vote, VoteValue
       from app.models.ping import Ping
       __all__ = ["Household","Member","Recipe","RecipeStatus","CookingLog","LogRating","DailyShortlist","Vote","VoteValue","Ping"]
       ```

    6. Create each model matching SPEC.md verbatim. Notes:
       - All UUIDs use `from sqlalchemy.dialects.postgresql import UUID` and `server_default=func.gen_random_uuid()`. (Supabase Postgres has `gen_random_uuid()` available without extension.)
       - `recipe_status` enum: `('draft', 'structured', 'verified')` — name the SQL type `recipe_status`.
       - `log_rating` enum: `('loved', 'liked', 'disliked')` — name `log_rating`.
       - `vote_value` enum: `('yes', 'no')` — name `vote_value`.
       - `recipes.cuisine` is `TEXT CHECK (cuisine IS NULL OR cuisine IN (...))` — emit as `CheckConstraint("cuisine IS NULL OR cuisine IN ('italian','french','asian','mediterranean','middleEastern','indian','mexican','northAfrican','american','other')", name="recipes_cuisine_check")`.
       - `recipes.main_protein` similarly.
       - `recipes.mood TEXT[]`, `recipes.seasonality TEXT[]`, `recipes.tags TEXT[]`, `recipes.photo_paths TEXT[]` use `from sqlalchemy.dialects.postgresql import ARRAY` with `ARRAY(String)`.
       - `recipes.source_capture JSONB NOT NULL` uses `from sqlalchemy.dialects.postgresql import JSONB`.
       - `recipes.seasonality DEFAULT '{spring,summer,autumn,winter}'` — set `server_default=text("'{spring,summer,autumn,winter}'")` and a Python `default=lambda: ["spring","summer","autumn","winter"]`.
       - Indices: `idx_recipes_household_status (household_id, status)`, `idx_recipes_last_cooked (household_id, last_cooked_at DESC NULLS LAST)`, `idx_logs_household_time (household_id, cooked_at DESC)`, `idx_logs_recipe (recipe_id)`, `idx_votes_shortlist (shortlist_id)`. Use `Index(...)` constructs at the bottom of each model file.
       - `members.auth_token TEXT NOT NULL UNIQUE` — long opaque string from `secrets.token_urlsafe(32)`.
       - `households.invite_code TEXT UNIQUE` — 6-char uppercase alphanumeric, regenerable; uniqueness enforced at DB.
       - `daily_shortlists.recipe_ids UUID[] NOT NULL` — `ARRAY(UUID(as_uuid=True))`.
       - `daily_shortlists` unique constraint on `(household_id, date, generation)`.

    7. **`backend/app/models/ping.py`** (D-01 throwaway):
       ```python
       from sqlalchemy import String, ForeignKey
       from sqlalchemy.dialects.postgresql import UUID
       from sqlalchemy.orm import Mapped, mapped_column
       from sqlalchemy import func
       from uuid import UUID as PyUUID
       from app.db import Base
       from app.models.base import TimestampMixin

       # TODO(productize): D-01 — this entire model + table is deleted after the W1 round-trip gate
       # passes (see plan 01-10-dogfood-cleanup). Do not add foreign keys pointing AT this table.
       class Ping(Base, TimestampMixin):
           __tablename__ = "pings"
           id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
           household_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
           sent_by_member_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=False)
           note: Mapped[str | None] = mapped_column(String(120), nullable=True)
       ```

    8. Generate the baseline migration: `uv run alembic revision -m "baseline" --rev-id 0001`. Then HAND-EDIT `backend/alembic/versions/0001_baseline.py` to author every `op.create_table`, `op.create_index`, `op.execute("CREATE TYPE ...")` call deliberately — DO NOT rely on `--autogenerate` for the first migration since enum-type creation is fiddly. Order:
       a. `op.execute("CREATE TYPE recipe_status AS ENUM ('draft', 'structured', 'verified')")`
       b. `op.execute("CREATE TYPE log_rating AS ENUM ('loved', 'liked', 'disliked')")`
       c. `op.execute("CREATE TYPE vote_value AS ENUM ('yes', 'no')")`
       d. `op.create_table('households', ...)` then `members`, `recipes` (with CheckConstraints), `cooking_logs`, `daily_shortlists` (with UNIQUE), `votes`, `pings`.
       e. `op.create_index(...)` for the 5 indices.
       Downgrade: drop in reverse order, then `DROP TYPE` statements.

  </action>
  <verify>
    <automated>cd backend && test -f alembic.ini && test -f alembic/env.py && test -f alembic/versions/0001_baseline.py && test -f app/models/household.py && test -f app/models/member.py && test -f app/models/recipe.py && test -f app/models/cooking_log.py && test -f app/models/daily_shortlist.py && test -f app/models/vote.py && test -f app/models/ping.py && grep -q "TODO(productize): D-01" app/models/ping.py && grep -q "recipe_status" alembic/versions/0001_baseline.py && grep -q "log_rating" alembic/versions/0001_baseline.py && grep -q "vote_value" alembic/versions/0001_baseline.py && grep -q "pings" alembic/versions/0001_baseline.py && grep -q "idx_recipes_household_status" alembic/versions/0001_baseline.py && grep -q "idx_recipes_last_cooked" alembic/versions/0001_baseline.py && grep -q "idx_logs_household_time" alembic/versions/0001_baseline.py && uv run python -c "from app.models import Household, Member, Recipe, RecipeStatus, CookingLog, LogRating, DailyShortlist, Vote, VoteValue, Ping; from app.db import Base; tables = sorted(Base.metadata.tables.keys()); assert tables == ['cooking_logs','daily_shortlists','households','members','pings','recipes','votes'], tables; print('OK', tables)"</automated>
  </verify>
  <done>Seven SQLAlchemy models exist; Alembic baseline migration explicitly creates 3 enum types + 7 tables + 5 indices; metadata has the expected 7 table names; ping model carries the D-01 cleanup TODO comment.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 3: Apply baseline migration to dev Supabase + deploy backend to Railway</name>
  <what-built>
    Backend is ready to deploy. Migration file 0001_baseline.py is committed. The migration applies cleanly against an empty Postgres.

    Claude can run the deploy and migration IF the executor has `DATABASE_URL` for the dev Supabase project. Otherwise this is a human-action checkpoint.
  </what-built>
  <how-to-verify>
    Two parts. Claude attempts each via CLI and falls back to asking you only if auth/dashboard steps are required.

    **Part A — Dev Supabase migration (REQUIRED before any 01-04+ verification):**

    1. If you haven't yet: create a dev Supabase project at https://supabase.com (free tier). Copy the **direct connection string** from Project Settings → Database → Connection string → "URI" → "Use connection pooling" OFF (5432, not 6543) — Alembic does not need pooling. Format: `postgresql+psycopg2://postgres:<password>@db.<ref>.supabase.co:5432/postgres`.
    2. Place it in `backend/.env` as `DATABASE_URL=...`. Do NOT commit this file.
    3. Claude runs:
       ```bash
       cd backend
       uv run alembic upgrade head
       uv run alembic current
       ```
       Expected: `alembic upgrade head` exits 0; `alembic current` prints `0001 (head)`.
    4. **You verify in the Supabase dashboard** (Table Editor): tables `households`, `members`, `recipes`, `cooking_logs`, `daily_shortlists`, `votes`, `pings` all exist; the three enum types exist (Database → Types).

    **Part B — Railway deploy:**

    5. Create a Railway project (https://railway.app) → "Deploy from GitHub" → select this monorepo → set root directory to `backend/`.
    6. In Railway service settings → Variables: paste the same `DATABASE_URL`. Add `CORS_ALLOWED_ORIGINS=http://localhost:3000,https://<your-vercel-domain>.vercel.app` using the URL produced by 01-02 Task 3. Set `ENVIRONMENT=production`.
    7. Railway auto-builds the Dockerfile + auto-deploys on push. After deploy, copy the public URL (e.g., `https://al-dente-backend.up.railway.app`).
    8. **You verify**: `curl https://<railway-url>/healthz` returns `{"status":"ok"}`. `curl https://<railway-url>/recipes` (any protected path) returns HTTP 401 (proves auth middleware works once routers are mounted in 01-04+; for now this path 404s — acceptable, since INFRA-06 is properly tested in 01-04 by hitting a protected route).
    9. Update Vercel env vars: `NEXT_PUBLIC_API_BASE=https://<railway-url>` and `NEXT_PUBLIC_WS_BASE=wss://<railway-url>/ws` (the `/ws` path is added in 01-05). Re-deploy Vercel (`vercel --prod`).

    Common failure modes:
    - Supabase requires the password URL-encoded if it contains `@`, `:`, `/`, or `#`.
    - Railway free tier may sleep; the first request takes 5-10s.
    - Migration fails with `permission denied for schema public` → Supabase requires the service-role connection string, not the pooler-anon string. Re-fetch from Project Settings.
  </how-to-verify>
  <resume-signal>Type "approved" with the Railway URL pasted in, OR describe what failed (specific error message). Note: this checkpoint is a hard gate — 01-04 / 01-05 / 01-06 cannot be verified until the migration has been applied to a real Postgres.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → Railway | All HTTP requests; CORS controls which origins can read responses |
| browser → Railway WebSocket | Wave 3 plan; foreshadowed via env var here |
| Railway → Supabase Postgres | service-role-equivalent connection string in env |
| Railway → Supabase Storage | service-role key (used in 01-09 only); env var stub here |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-03-01 | Spoofing | request without Bearer reaches a protected route | high | mitigate | `current_member` dependency raises 401 on missing/invalid Bearer (Task 1, step 5). INFRA-06. Verified end-to-end in 01-04 once a protected route exists. |
| T-01-03-02 | Spoofing | bearer token guessed via brute force | high | mitigate | `secrets.token_urlsafe(32)` → 256 bits of entropy → ~10^77 keyspace; rate limiting deferred (productize-later, no public endpoints in v0.1 except invite-code check which 01-04 owns). |
| T-01-03-03 | Information Disclosure | CORS `*` lets any origin read auth-protected responses | high | mitigate | Explicit allowlist via `CORS_ALLOWED_ORIGINS` env (Task 1 step 6); `allow_credentials=False` since we use Bearer header. Verify `! grep '"\*"' app/main.py` in Task 1 verify. |
| T-01-03-04 | Information Disclosure | Supabase service-role key leaks to frontend bundle | high | mitigate | Per D-02, photos route through backend; service-role key lives only in `backend/.env` and Railway env. `.env.example` documents the boundary; `.gitignore` excludes `.env`; Vercel env vars use only `NEXT_PUBLIC_API_BASE` / `NEXT_PUBLIC_WS_BASE`. |
| T-01-03-05 | Tampering | migration drift between dev and prod Supabase | medium | accept | "v0.1 has zero deployed users to coordinate around" (CONTEXT.md). Productize-later: prod migration runbook. Single dev project + single prod project; both apply `alembic upgrade head` on container start. |
| T-01-03-06 | Repudiation | no auth/access logs | low | accept | Railway captures stdout; FastAPI default access log enabled. Productize-later: structured logging + retention. |
| T-01-03-07 | Denial of Service | unauthenticated endpoint amplification | medium | accept | Only `/healthz` is unauthenticated; trivial response. Rate limiting = productize-later. |
| T-01-03-08 | Elevation of Privilege | bearer token of household A used to read household B data | high | mitigate | `current_member` returns the Member; per-route handlers MUST filter by `member.household_id` (enforced in 01-04 / 01-06 / 01-09). Plan-checker verifies in those plans. |
| T-01-03-09 | Information Disclosure | Postgres connection logs leak DATABASE_URL | medium | accept | psycopg2 default does not echo URL; `echo=False` in engine config (Task 1 step 4). |

`high` items (01, 02, 03, 04, 08) all have a mitigation in this plan or a downstream plan that the plan-checker can grep for.
</threat_model>

<verification>
Manual after Task 3:
- `curl <railway>/healthz` returns `{"status":"ok"}`.
- Supabase Table Editor shows 7 tables + 3 enum types.
- `uv run alembic current` prints `0001 (head)` against the dev DB.
- `curl -H "Origin: https://evil.com" -i <railway>/healthz` does not include `Access-Control-Allow-Origin: *` (since allowlist excludes evil.com, the header is omitted).
</verification>

<success_criteria>
INFRA-02 ✓ FastAPI deployed to Railway, auto-deploys on push to main.
INFRA-03 ✓ Supabase Postgres connected; `alembic upgrade head` applied; 7 tables + 3 enums confirmed.
INFRA-06 ✓ `current_member` dependency raises 401 on missing/invalid Bearer (full end-to-end verification of "protected route returns 401" happens in 01-04 once a protected route exists).
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-03-SUMMARY.md` capturing:
- Railway deploy URL.
- Pinned versions of fastapi / sqlalchemy / alembic / pydantic-settings / psycopg2-binary.
- Any deviations from the SPEC.md schema (there should be none).
- Note that 01-10 will drop the `pings` table after the round-trip gate passes (D-01).
</output>
