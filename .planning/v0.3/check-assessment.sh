#!/usr/bin/env bash
# .planning/v0.3/check-assessment.sh
# Phase 14 D-07/D-08 anti-prescription pre-commit grep gate.
# Blocks the SYNTH-02 forbidden-pattern set; allows past-phase citations (Phase 11/12/13).
set -uo pipefail

TARGET="${1:-.planning/v0.3/ASSESSMENT.md}"

if [ ! -f "$TARGET" ]; then
  echo "ERROR: $TARGET does not exist." >&2
  exit 2
fi

PATTERN='v0\.4|should (fix|add|build|implement|do|consider|address|tackle|prioritize)|\<(recommend|propose|suggest)(ed|s)?\>|must (fix|build|add|implement|do|address|prioritize)|next milestone (should|will|must|needs to)|TODO|action (item|step|plan)|next step|(roadmap|plan).{0,20}(for|of) v0|phase (1[5-9]|[2-9][0-9])'

if grep -inE "$PATTERN" "$TARGET" >&2; then
  echo "" >&2
  echo "FAIL: $TARGET contains forbidden patterns. See lines above." >&2
  echo "Anti-prescription gate (D-07/D-08) blocked the commit." >&2
  exit 1
fi

echo "OK: $TARGET passes the anti-prescription gate."
exit 0
