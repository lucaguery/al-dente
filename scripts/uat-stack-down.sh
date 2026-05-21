#!/usr/bin/env bash
# scripts/uat-stack-down.sh
#
# Stop the UAT stack started by scripts/uat-stack-up.sh.
#
# Strategy: prefer PID files (written by uat-stack-up.sh), fall back to
# port-based discovery so a stale PID file never leaves zombies behind.
#
# Usage:
#   scripts/uat-stack-down.sh             # stops frontend + uvicorn, leaves postgres
#   scripts/uat-stack-down.sh --postgres  # also stops the postgres container

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/.scratch/stack-logs"

kill_pid() {
  local pid="$1" label="$2"
  if [[ -z "$pid" ]]; then return; fi
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "  $label: PID $pid not running"
    return
  fi
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 10); do
    kill -0 "$pid" 2>/dev/null || { echo "  $label: PID $pid stopped"; return; }
    sleep 0.3
  done
  kill -9 "$pid" 2>/dev/null || true
  echo "  $label: PID $pid SIGKILLed"
}

# ----- frontend
echo "Stopping frontend (Next.js dev on :3000)"
PIDFILE="$LOG_DIR/frontend.pid"
if [[ -f "$PIDFILE" ]]; then
  kill_pid "$(cat "$PIDFILE")" "frontend(pidfile)"
  rm -f "$PIDFILE"
fi
# Fallback: anything still on :3000 we own
for pid in $(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null); do
  proc="$(ps -p "$pid" -o comm= 2>/dev/null | tr -d ' ')"
  if [[ "$proc" == "node" || "$proc" == *npm* ]]; then
    kill_pid "$pid" "frontend(:3000 $proc)"
  fi
done

# ----- backend (8000 + 8001)
echo "Stopping backend (uvicorn on :8000 / :8001)"
PIDFILE="$LOG_DIR/uvicorn.pid"
if [[ -f "$PIDFILE" ]]; then
  kill_pid "$(cat "$PIDFILE")" "uvicorn(pidfile)"
  rm -f "$PIDFILE"
fi
# Fallback: any uvicorn-shaped process on either port
for port in 8000 8001; do
  for pid in $(lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null); do
    proc="$(ps -p "$pid" -o comm= 2>/dev/null | tr -d ' ')"
    if [[ "$proc" == "uvicorn" || "$proc" == *python* ]]; then
      kill_pid "$pid" "uvicorn(:$port $proc)"
    fi
  done
done

# ----- postgres (opt-in)
if [[ "${1:-}" == "--postgres" ]]; then
  echo "Stopping postgres (aldente-postgres-test)"
  if docker ps --filter name=aldente-postgres-test --format '{{.Names}}' | grep -q aldente-postgres-test; then
    docker stop aldente-postgres-test >/dev/null && echo "  stopped"
  else
    echo "  not running"
  fi
fi

echo "Stack down."
