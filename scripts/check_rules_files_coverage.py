#!/usr/bin/env python3
"""Per-file 100% coverage gate for the 4 rules files — CI-02, D-39-03.

Rules files that must stay at 100% line coverage:
  - app/services/voting.py    (COV-02)
  - app/services/algorithm.py (COV-03)
  - app/services/shortlist.py (COV-04)
  - app/auth.py               (COV-05)

Reads the JSON report emitted by:
  pytest --cov=app --cov-report=json:coverage.json

Usage:
  python scripts/check_rules_files_coverage.py backend/coverage.json

Exit codes:
  0 — all 4 rules files at 100%
  1 — any rules file below 100%, file missing from report, or report not found
"""

import json
import sys
from pathlib import Path

# Order matches REQUIREMENTS.md COV-02..05 — do not sort alphabetically.
RULES_FILES: tuple[str, ...] = (
    "app/services/voting.py",
    "app/services/algorithm.py",
    "app/services/shortlist.py",
    "app/auth.py",
)

MIN_PERCENT: float = 100.0


def main(argv: list[str]) -> int:
    """Read coverage.json and assert each rules file is at 100% line coverage.

    Args:
        argv: sys.argv-style list; argv[1] is path to coverage.json.
              Defaults to 'backend/coverage.json' if not provided.

    Returns:
        0 on success, 1 on any failure.
    """
    cov_path_str = argv[1] if len(argv) > 1 else "backend/coverage.json"
    cov_path = Path(cov_path_str).resolve()

    if not cov_path.exists():
        print(
            f"FAIL: coverage.json not found at {cov_path}\n"
            "  Run: cd backend && uv run pytest tests/ --cov=app --cov-report=json:coverage.json\n"
            "  See TESTING.md for the full local bootstrap sequence."
        )
        return 1

    try:
        data = json.loads(cov_path.read_text())
    except json.JSONDecodeError as exc:
        print(f"FAIL: coverage.json is not valid JSON: {exc}")
        return 1

    if "files" not in data:
        print(
            "FAIL: coverage.json has no \"files\" key "
            "(was pytest-cov run with --cov and --cov-report=json?)"
        )
        return 1

    files_data: dict = data["files"]
    exit_code = 0
    n_fail = 0

    for filename in RULES_FILES:
        if filename not in files_data:
            print(
                f"FAIL: {filename} not present in coverage.json "
                "(test suite did not import it — check omit patterns in pyproject.toml)"
            )
            exit_code = 1
            n_fail += 1
            continue

        try:
            pct: float = files_data[filename]["summary"]["percent_covered"]
        except (KeyError, TypeError) as exc:
            print(f"FAIL: {filename} — could not read percent_covered: {exc}")
            exit_code = 1
            n_fail += 1
            continue

        if pct >= MIN_PERCENT:
            print(f"  OK: {filename} at {pct:.1f}%")
        else:
            print(f"FAIL: {filename} at {pct:.1f}% (required: 100%)")
            exit_code = 1
            n_fail += 1

    n_pass = len(RULES_FILES) - n_fail
    if exit_code == 0:
        print(f"PASS: {n_pass}/{len(RULES_FILES)} rules files at 100%")
    else:
        print(f"FAIL: {n_fail}/{len(RULES_FILES)} rules files below 100%")

    return exit_code


if __name__ == "__main__":
    sys.exit(main(sys.argv))
