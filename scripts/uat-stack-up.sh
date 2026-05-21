#!/usr/bin/env bash
# scripts/uat-stack-up.sh
#
# Idempotent local-stack bring-up for UAT walkthroughs.
#
# What it does:
#   - Starts the aldente-postgres-test container (or reuses it)
#   - Detects + recovers from a hung Next.js dev server on :3000
#   - Auto-picks a free backend port (8000, falling back to 8001 when
#     VS Code's Code Helper is squatting :8000)
#   - Runs alembic upgrade head + uv run seed (both idempotent)
#   - Launches uvicorn + next dev with the correct RAILWAY_URL wiring
#   - Verifies end-to-end via the proxy probe (/api/healthz on :3000)
#
# Exit 0 if and only if curl http://localhost:3000/api/healthz returns 200.
#
# Tear down with: scripts/uat-stack-down.sh
#
# Logs + PID files: .scratch/stack-logs/

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/.scratch/stack-logs"
mkdir -p "$LOG_DIR"

# Test env contract per TESTING.md
export ENVIRONMENT=test
export DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test
export SEED_AUTH_TOKEN=test-token-luca

c_dim()  { printf "\033[2m%s\033[0m" "$*"; }
c_ok()   { printf "\033[32m%s\033[0m" "$*"; }
c_warn() { printf "\033[33m%s\033[0m" "$*"; }
c_err()  { printf "\033[31m%s\033[0m" "$*"; }
step()   { printf "\n%s %s\n" "$(c_dim "→")" "$*"; }
ok()     { printf "  %s %s\n" "$(c_ok "✓")" "$*"; }
warn()   { printf "  %s %s\n" "$(c_warn "!")" "$*"; }
err()    { printf "  %s %s\n" "$(c_err "✗")" "$*"; }

healthy_uvicorn() {
  local port="$1"
  curl -sS -m 2 "http://localhost:$port/healthz" 2>/dev/null | grep -q '"status":"ok"'
}

# ----------------------------------------------------------------------------
# 1. Postgres
# ----------------------------------------------------------------------------
step "Postgres :5433"

if docker ps --filter name=aldente-postgres-test --format '{{.Names}}' | grep -q aldente-postgres-test; then
  ok "container already running"
elif docker ps -a --filter name=aldente-postgres-test --format '{{.Names}}' | grep -q aldente-postgres-test; then
  docker start aldente-postgres-test >/dev/null
  ok "started existing container"
else
  if [[ ! -f docker-compose.test.yml ]]; then
    err "docker-compose.test.yml not found at repo root"
    exit 1
  fi
  docker compose -f docker-compose.test.yml up -d >/dev/null
  ok "container created"
fi

# Wait for pg_isready (max 30s)
for _ in $(seq 1 60); do
  if docker exec aldente-postgres-test pg_isready -q 2>/dev/null; then
    ok "ready"
    break
  fi
  sleep 0.5
done

# ----------------------------------------------------------------------------
# 2. Frontend port hygiene — recover from a hung Next.js dev
# ----------------------------------------------------------------------------
step "Frontend :3000"

FRONTEND_HEALTHY=0
NODE_PID="$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | head -1 || true)"

if [[ -n "$NODE_PID" ]]; then
  if curl -sS -m 3 -o /dev/null http://localhost:3000/ 2>/dev/null; then
    ok "responding on PID $NODE_PID — reusing"
    FRONTEND_HEALTHY=1
    echo "$NODE_PID" > "$LOG_DIR/frontend.pid"
  else
    PROC_NAME="$(ps -p "$NODE_PID" -o comm= 2>/dev/null | tr -d ' ' || echo unknown)"
    warn "PID $NODE_PID ($PROC_NAME) listening but not responding — killing"
    kill "$NODE_PID" 2>/dev/null || true
    sleep 1
    if lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | grep -q .; then
      kill -9 "$NODE_PID" 2>/dev/null || true
      sleep 1
    fi
    if lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | grep -q .; then
      err "could not free :3000 (something keeps re-binding)"
      exit 1
    fi
    ok "port freed"
  fi
else
  ok "port free"
fi

# ----------------------------------------------------------------------------
# 3. Backend port discovery (handle VS Code Helper squat on :8000)
# ----------------------------------------------------------------------------
step "Backend port discovery"

BACKEND_PORT=""
BACKEND_HEALTHY=0
for port in 8000 8001; do
  HOLDER="$(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null | head -1 || true)"
  if [[ -z "$HOLDER" ]]; then
    BACKEND_PORT="$port"
    ok ":$port free — selecting"
    break
  fi
  PROC_NAME="$(ps -p "$HOLDER" -o comm= 2>/dev/null | tr -d ' ' || true)"
  if healthy_uvicorn "$port"; then
    BACKEND_PORT="$port"
    BACKEND_HEALTHY=1
    ok ":$port already healthy ($PROC_NAME, PID $HOLDER) — reusing"
    echo "$HOLDER" > "$LOG_DIR/uvicorn.pid"
    break
  fi
  warn ":$port held by $PROC_NAME (not us) — trying next"
done

if [[ -z "$BACKEND_PORT" ]]; then
  err "no free backend port (8000 + 8001 both squatted by non-uvicorn processes)"
  exit 1
fi

# ----------------------------------------------------------------------------
# 4. Alembic + seed — skip if backend reused and healthy
# ----------------------------------------------------------------------------
if [[ "$BACKEND_HEALTHY" -ne 1 ]]; then
  step "Alembic migrations"
  if (cd backend && uv run alembic upgrade head >"$LOG_DIR/alembic.log" 2>&1); then
    ok "up to head"
  else
    err "alembic failed — see $LOG_DIR/alembic.log"
    exit 1
  fi

  step "Seed"
  if (cd backend && uv run seed >"$LOG_DIR/seed.log" 2>&1); then
    ok "$(tail -1 "$LOG_DIR/seed.log")"
  else
    err "seed failed — see $LOG_DIR/seed.log"
    exit 1
  fi
fi

# ----------------------------------------------------------------------------
# 5. Uvicorn
# ----------------------------------------------------------------------------
if [[ "$BACKEND_HEALTHY" -ne 1 ]]; then
  step "Uvicorn :$BACKEND_PORT"
  (
    cd "$ROOT/backend"
    nohup uv run uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" \
      >"$LOG_DIR/uvicorn.log" 2>&1 &
    disown
  )
  for _ in $(seq 1 60); do
    if healthy_uvicorn "$BACKEND_PORT"; then
      PID="$(lsof -tiTCP:$BACKEND_PORT -sTCP:LISTEN 2>/dev/null | head -1)"
      echo "$PID" > "$LOG_DIR/uvicorn.pid"
      ok "ready (PID $PID, log $LOG_DIR/uvicorn.log)"
      break
    fi
    sleep 1
  done
  if ! healthy_uvicorn "$BACKEND_PORT"; then
    err "uvicorn never answered healthz — see $LOG_DIR/uvicorn.log"
    exit 1
  fi
fi

# ----------------------------------------------------------------------------
# 6. Frontend dev (with correct RAILWAY_URL → backend port)
# ----------------------------------------------------------------------------
if [[ "$FRONTEND_HEALTHY" -ne 1 ]]; then
  step "Frontend dev (RAILWAY_URL=http://127.0.0.1:$BACKEND_PORT)"
  (
    cd "$ROOT/frontend"
    RAILWAY_URL="http://127.0.0.1:$BACKEND_PORT" NEXT_PUBLIC_API_BASE='' \
      nohup npm run dev >"$LOG_DIR/frontend.log" 2>&1 &
    disown
  )
  warn "first compile can take 20-30s — waiting for :3000 to respond"
  for _ in $(seq 1 120); do
    if curl -sS -m 2 -o /dev/null http://localhost:3000/ 2>/dev/null; then
      PID="$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | head -1)"
      echo "$PID" > "$LOG_DIR/frontend.pid"
      ok "ready (PID $PID, log $LOG_DIR/frontend.log)"
      break
    fi
    sleep 1
  done
  if ! curl -sS -m 2 -o /dev/null http://localhost:3000/ 2>/dev/null; then
    err "frontend never answered — see $LOG_DIR/frontend.log"
    exit 1
  fi
fi

# ----------------------------------------------------------------------------
# 7. End-to-end readiness via proxy
# ----------------------------------------------------------------------------
step "Proxy readiness (/api/healthz via :3000)"
PROXY_CODE="$(curl -sS -m 5 -o /dev/null -w '%{http_code}' http://localhost:3000/api/healthz)"
if [[ "$PROXY_CODE" == "200" ]]; then
  ok "200 — proxy → backend wired correctly"
else
  err "proxy returned $PROXY_CODE — RAILWAY_URL probably wrong"
  exit 1
fi

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
cat <<EOF

$(c_ok "Stack up.")
  Frontend     http://localhost:3000               PID $(cat "$LOG_DIR/frontend.pid" 2>/dev/null || echo ?)
  Backend      http://localhost:$BACKEND_PORT               PID $(cat "$LOG_DIR/uvicorn.pid" 2>/dev/null || echo ?)
  Postgres     127.0.0.1:5433/aldente_test          container aldente-postgres-test
  Seed token   $SEED_AUTH_TOKEN
  Logs         $LOG_DIR/

  Tear down:   scripts/uat-stack-down.sh
EOF
