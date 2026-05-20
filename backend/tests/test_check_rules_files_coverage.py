"""Tests for scripts/check_rules_files_coverage.py — CI-02, D-39-03.

Exercises:
- PASS path: all 4 rules files at 100%
- FAIL path: one file below 100%
- Missing file key in coverage.json
- Missing coverage.json entirely
- Missing "files" key in coverage.json
"""

import json
from pathlib import Path

# The script lives at scripts/ (repo root), 2 levels above backend/
SCRIPT_DIR = Path(__file__).parent.parent.parent / "scripts"
SCRIPT_PATH = SCRIPT_DIR / "check_rules_files_coverage.py"


def _load_main():
    """Dynamically import main() from the script without executing __main__."""
    import importlib.util

    spec = importlib.util.spec_from_file_location("check_rules_files_coverage", SCRIPT_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.main


def _make_coverage_json(tmp_path: Path, overrides: dict | None = None) -> Path:
    """Write a minimal valid coverage.json with all 4 rules files at 100%."""
    data: dict = {
        "files": {
            "app/services/voting.py": {"summary": {"percent_covered": 100.0}},
            "app/services/algorithm.py": {"summary": {"percent_covered": 100.0}},
            "app/services/shortlist.py": {"summary": {"percent_covered": 100.0}},
            "app/auth.py": {"summary": {"percent_covered": 100.0}},
        },
        "totals": {"percent_covered": 88.5},
    }
    if overrides:
        data.update(overrides)
    p = tmp_path / "coverage.json"
    p.write_text(json.dumps(data))
    return p


class TestCheckRulesFilesCoverage:
    """Behavioural tests for the gate script."""

    def test_script_file_exists(self):
        """Script must be committed at scripts/check_rules_files_coverage.py."""
        assert SCRIPT_PATH.exists(), f"Script not found at {SCRIPT_PATH}"

    def test_pass_all_100(self, tmp_path):
        """All 4 rules files at 100% → exit 0."""
        main = _load_main()
        cov = _make_coverage_json(tmp_path)
        result = main(["check_rules_files_coverage.py", str(cov)])
        assert result == 0

    def test_fail_one_file_below_100(self, tmp_path):
        """One rules file at 83.3% → exit 1 with FAIL line naming the file."""
        main = _load_main()
        data = {
            "files": {
                "app/services/voting.py": {"summary": {"percent_covered": 100.0}},
                "app/services/algorithm.py": {"summary": {"percent_covered": 100.0}},
                "app/services/shortlist.py": {"summary": {"percent_covered": 100.0}},
                "app/auth.py": {"summary": {"percent_covered": 83.3}},
            },
        }
        cov = tmp_path / "coverage.json"
        cov.write_text(json.dumps(data))
        result = main(["check_rules_files_coverage.py", str(cov)])
        assert result == 1

    def test_fail_missing_file_key(self, tmp_path):
        """A rules file absent from coverage.json → exit 1 with 'not present' diagnostic."""
        main = _load_main()
        data = {
            "files": {
                "app/services/voting.py": {"summary": {"percent_covered": 100.0}},
                # algorithm.py missing entirely
                "app/services/shortlist.py": {"summary": {"percent_covered": 100.0}},
                "app/auth.py": {"summary": {"percent_covered": 100.0}},
            },
        }
        cov = tmp_path / "coverage.json"
        cov.write_text(json.dumps(data))
        result = main(["check_rules_files_coverage.py", str(cov)])
        assert result == 1

    def test_fail_missing_coverage_json(self, tmp_path):
        """Non-existent coverage.json path → exit 1 (no crash)."""
        main = _load_main()
        result = main(["check_rules_files_coverage.py", str(tmp_path / "nonexistent.json")])
        assert result == 1

    def test_fail_missing_files_key(self, tmp_path):
        """coverage.json with no 'files' key → exit 1 with diagnostic."""
        main = _load_main()
        data = {"totals": {"percent_covered": 90.0}}
        cov = tmp_path / "coverage.json"
        cov.write_text(json.dumps(data))
        result = main(["check_rules_files_coverage.py", str(cov)])
        assert result == 1

    def test_default_path_arg(self, tmp_path, monkeypatch):
        """No argv[1] → defaults to backend/coverage.json relative to CWD."""
        main = _load_main()
        # Call with argv containing only the script name (no path argument)
        # The script should return 1 if the default path doesn't exist
        # (we just verify it doesn't crash with IndexError)
        result = main(["check_rules_files_coverage.py"])
        assert result in (0, 1)  # exits cleanly regardless
