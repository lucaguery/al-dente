#!/usr/bin/env python3
"""docs-audit — Freshness audit for load-bearing reference docs.

Reads `last_verified: YYYY-MM-DD` from YAML front-matter (T1/T4 docs + ADRs)
and `Snapshot: YYYY-MM-DD` lines from intel files (T5 codebase intel), then
prints a table sorted by age. Per-doc YAML convention is defined in the Doc
lifecycle section of root CLAUDE.md.

Reachable as `python3 scripts/docs-audit` (or `./scripts/docs-audit` if the
file is executable) from the repo root.

Usage:
  scripts/docs-audit                # print table; exit 0
  scripts/docs-audit --stale 30     # warn threshold in days (default 30)
  scripts/docs-audit --fail 60      # failure-exit threshold (default 60)
  scripts/docs-audit --quiet        # no table; exit 1 if any doc exceeds --fail

Designed to be cheap (pure stdlib, no API spend) and informative — surfaces
which docs Claude is reading that haven't been re-verified against reality
in a while. Run before milestone close, before retros, or whenever the repo
state has shifted noticeably since the last commit.
"""

import argparse
import re
import sys
from datetime import date, datetime
from pathlib import Path

T1_T4_DOCS = ["SPEC.md", "CONTEXT.md", "RUNBOOK.md", "TESTING.md", "README.md"]
ADR_GLOB = "docs/adr/*.md"
INTEL_GLOB = ".planning/codebase/*.md"

LAST_VERIFIED_RE = re.compile(r"^last_verified:\s*(\d{4}-\d{2}-\d{2})", re.MULTILINE)
SNAPSHOT_RE = re.compile(r"^Snapshot:\s*(\d{4}-\d{2}-\d{2})", re.MULTILINE)


def extract_date(path, regex):
    try:
        text = path.read_text()
    except OSError:
        return None
    m = regex.search(text)
    if not m:
        return None
    try:
        return datetime.strptime(m.group(1), "%Y-%m-%d").date()
    except ValueError:
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Audit doc freshness (last_verified / Snapshot dates).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--stale", type=int, default=30,
                        help="Days threshold for 'warn' status (default 30)")
    parser.add_argument("--fail", type=int, default=60,
                        help="Days threshold for 'stale' status + nonzero exit (default 60)")
    parser.add_argument("--quiet", action="store_true",
                        help="Suppress table; exit code only (1 if any doc >= --fail)")
    args = parser.parse_args()

    repo = Path(__file__).resolve().parent.parent
    today = date.today()
    rows = []

    for name in T1_T4_DOCS:
        p = repo / name
        if p.exists():
            rows.append((name, "last_verified", extract_date(p, LAST_VERIFIED_RE)))
    for p in sorted(repo.glob(ADR_GLOB)):
        rows.append((str(p.relative_to(repo)), "last_verified",
                     extract_date(p, LAST_VERIFIED_RE)))
    for p in sorted(repo.glob(INTEL_GLOB)):
        rows.append((str(p.relative_to(repo)), "Snapshot",
                     extract_date(p, SNAPSHOT_RE)))

    rows.sort(key=lambda r: r[2] or date(1970, 1, 1))

    any_failing = False

    if not args.quiet:
        print(f"\nDoc freshness audit — {today}\n")
        print(f"{'Path':<60} {'Field':<14} {'Date':<12} {'Age':<6} {'Status'}")
        print("-" * 100)

    for path, field, d in rows:
        if d is None:
            age_str, status = "—", "MISSING"
            any_failing = True
        else:
            age = (today - d).days
            age_str = f"{age}d"
            if age >= args.fail:
                status = "STALE"
                any_failing = True
            elif age >= args.stale:
                status = "warn"
            else:
                status = "ok"
        if not args.quiet:
            print(f"{path:<60} {field:<14} {str(d) if d else 'missing':<12} {age_str:<6} {status}")

    if not args.quiet:
        print(f"\nThresholds: warn ≥ {args.stale}d, stale ≥ {args.fail}d "
              f"(--stale / --fail to override).")

    sys.exit(1 if any_failing else 0)


if __name__ == "__main__":
    main()
