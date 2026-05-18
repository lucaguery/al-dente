#!/usr/bin/env bash
# Phase 35 ENUM-04 — repo-wide grep gate against raw locked-vocabulary
# values leaking into user-facing frontend code. Mirrors v0.5 Phase 22 D-18
# discipline. CI-runnable; non-zero exit blocks the build.
#
# Reachable as `npm run enum-leak-check` (frontend/package.json) or directly
# via `bash scripts/check-enum-leak.sh` from the repo root.
#
# Excludes the canonical translator surface (lib/enums.ts, lib/enum-labels.ts),
# tests, .next build artifacts, and the i18n source file fr.json (which MUST
# contain the keys — they are the translation mapping source, not a leak).
#
# Detection scope:
#   The gate only catches enum-key leaks where the value appears as a
#   STRING LITERAL in source — either inside quotes ("italian", 'italian')
#   or as JSX text between tags (>italian<). Leaks via variable reference
#   ({recipe.cuisine}) cannot be detected by grep (the runtime value isn't
#   in source); those are caught at the rendering call site by code review
#   and by the convention of wrapping all enum-typed renders via
#   `useEnumLabels()` (see frontend/lib/enum-labels.ts).
#
#   This intentional scope means the gate has good precision (low false-
#   positive rate) but limited recall (only catches the "hardcoded string"
#   class). The complementary discipline is: every `{recipe.cuisine}` /
#   `{recipe.mood}` / etc. in JSX must be `{labels.cuisine(recipe.cuisine)}`.
#
# Filter strategy:
#   1. Capture only tokens inside double-quotes, single-quotes, or as JSX
#      text between `>` and `<`.
#   2. Exclude:
#      - Imports / from clauses (legitimate enum-type imports).
#      - Single-line comments.
#      - TS/JS type-literal positions (`: "italian" |`, `as "italian"`).
#      - Wire-shape array defaults (`["spring", "summer", "autumn", "winter"]`
#        passed to typed APIs — these are wire values, not user copy).
#   3. Favor recall over precision within scope: if a legitimate use is
#      blocked, tighten regex token-by-token or add a targeted file
#      exclusion. Do NOT disable the gate wholesale.
#
# Deliberately excluded tokens (CONTEXT D-04, plan §interfaces note):
#   - 'american' / 'other' (cuisine) — common English words.
#   - 'light' / 'quick' / 'celebratory' / 'adventurous' (mood) — common
#     code words; the three primary mood leaks (comfort, festive, fresh)
#     are caught.
#   - 'poultry' / 'redMeat' / 'seafood' / 'egg' / 'legume' / 'none'
#     (protein) — 'none' is too common; the rest are unlikely. The four
#     primary protein leaks (beef, chicken, fish, pork) are caught.

set -euo pipefail

cd "$(dirname "$0")/.."

# Locked-vocab union — keep in sync with frontend/lib/enums.ts.
TOKENS='italian|indian|mexican|french|asian|mediterranean|middleEastern|northAfrican|comfort|festive|fresh|easy|medium|hard|beef|chicken|fish|pork|spring|summer|autumn|winter'

# Match patterns:
#   (a) "token" or 'token' — string literal positions
#   (b) >token< — JSX text content
PATTERN_QUOTED="[\"']($TOKENS)[\"']"
PATTERN_JSX=">[[:space:]]*($TOKENS)[[:space:]]*<"

EXCLUDES=(
  --exclude-dir=.next
  --exclude-dir=node_modules
  --exclude-dir=tests
  --exclude=enums.ts
  --exclude=enum-labels.ts
  --exclude=fr.json
  --exclude='*.spec.ts'
  --exclude='*.spec.tsx'
  --exclude='*.test.ts'
  --exclude='*.test.tsx'
)

OFFENDERS_QUOTED=$(grep -rnE "${EXCLUDES[@]}" "$PATTERN_QUOTED" frontend/app frontend/components 2>/dev/null || true)
OFFENDERS_JSX=$(grep -rnE "${EXCLUDES[@]}" "$PATTERN_JSX" frontend/app frontend/components 2>/dev/null || true)
OFFENDERS=$(printf '%s\n%s\n' "$OFFENDERS_QUOTED" "$OFFENDERS_JSX" | sort -u | grep -v '^$' || true)

# Post-filter passes:
#   1. Drop import / from lines (legitimate enum-type imports).
#   2. Drop single-line comment-only lines (// ...).
#   3. Drop TS type-literal positions (`: "italian" |`, `as "italian"`).
#   4. Drop wire-shape array defaults (e.g. `["spring", "summer", ...]`).
#   5. Drop JSX attribute wire values (`<SelectItem value="italian">`).
#      WR-03 — these are legitimate controlled-component wire values, not
#      user-facing copy. Require both `<TagName` (capitalized — JSX) earlier
#      on the line AND `attr="TOKEN"` so `const x = "italian"` (a real leak)
#      is not silently dropped.
FILTERED=$(printf '%s\n' "$OFFENDERS" \
  | grep -v -E '^[^:]+:[0-9]+:[[:space:]]*(import |from |//|\*|[[:space:]]*\*)' \
  | grep -v -E '^[^:]+:[0-9]+:[[:space:]]*$' \
  | grep -v -E '(:[[:space:]]*"('"$TOKENS"')"[[:space:]]*[,|)]|as[[:space:]]+"('"$TOKENS"')")' \
  | grep -v -E '\[([[:space:]]*"('"$TOKENS"')",?[[:space:]]*){2,}' \
  | grep -v -E '<[A-Za-z][^>]*[[:space:]][a-z][a-zA-Z]*=["'"'"']('"$TOKENS"')["'"'"']' \
  || true)

if [ -n "$FILTERED" ]; then
  echo "FAIL: enum-leak detected in frontend/{app,components}:"
  echo "$FILTERED"
  echo ""
  echo "Wrap raw enum keys via useEnumLabels() (see frontend/lib/enum-labels.ts)."
  echo "If an offender is a legitimate type literal or false-positive,"
  echo "narrow the regex or add a path/file exclusion in this script."
  exit 1
fi

echo "OK: no enum-leak detected in frontend/{app,components}"
exit 0
