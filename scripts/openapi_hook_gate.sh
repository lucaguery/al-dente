#!/usr/bin/env sh
# openapi_hook_gate.sh — pre-commit gate for OpenAPI regen
#
# Invoked by lint-staged (via frontend/.husky/pre-commit) whenever a file
# under backend/app/routers/**/*.py is staged. Also callable manually via:
#   cd frontend && npm run openapi-dump
#
# The script ignores the positional args lint-staged passes (staged file
# paths) — it always regenerates both docs/api/openapi.json and
# docs/api/endpoints.md from scratch. Deterministic output means
# regenerating an unchanged schema is a no-op for git.

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Load env — source .env.test.example first, fall back to .env, else error
# ---------------------------------------------------------------------------
if [ -f "$REPO_ROOT/.env.test.example" ]; then
  set -a
  . "$REPO_ROOT/.env.test.example"
  set +a
elif [ -f "$REPO_ROOT/.env" ]; then
  set -a
  . "$REPO_ROOT/.env"
  set +a
else
  printf '[openapi-gate] FATAL: no env file found at .env.test.example or .env.\n' >&2
  printf 'The OpenAPI dump script needs DATABASE_URL / SUPABASE_* / GEMINI_API_KEY /\n' >&2
  printf 'VAPID_* defined. Create .env.test (copy from .env.test.example) or .env\n' >&2
  printf 'and re-commit.\n' >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Inject placeholders for any required vars still unset after sourcing env
# (pydantic-settings demands these at app import time; they are never used
# at runtime since app.openapi() does not connect to Supabase/Gemini/DB)
# ---------------------------------------------------------------------------
: "${DATABASE_URL:=postgresql://placeholder}"
: "${SUPABASE_URL:=https://placeholder.supabase.co}"
: "${SUPABASE_SERVICE_ROLE_KEY:=placeholder}"
: "${GEMINI_API_KEY:=placeholder}"
: "${VAPID_PUBLIC_KEY:=placeholder}"
: "${VAPID_PRIVATE_KEY:=placeholder}"
: "${VAPID_EMAIL:=placeholder@example.com}"
export DATABASE_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY GEMINI_API_KEY VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_EMAIL

# ---------------------------------------------------------------------------
# Run the Python dumper from backend/ so app.main imports cleanly
# ---------------------------------------------------------------------------
cd "$REPO_ROOT/backend"
uv run python scripts/dump_openapi.py

# ---------------------------------------------------------------------------
# Re-stage generated artifacts so they ride along in the triggering commit
# ---------------------------------------------------------------------------
cd "$REPO_ROOT"
git add docs/api/openapi.json docs/api/endpoints.md

exit 0
