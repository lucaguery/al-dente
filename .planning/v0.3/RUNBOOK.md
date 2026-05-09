# v0.3 Runbook (Phase 11)

The operator-facing runbook for the production synthetic household lives at the **repo root** for discoverability:

> [`RUNBOOK.md`](../../RUNBOOK.md)

This file exists at `.planning/v0.3/RUNBOOK.md` per ROADMAP §Phase 11 success criterion 4 ("a runbook committed under `.planning/v0.3/`"). The split (real content at root, stub here) gives operators a discoverable file at a top-level path AND satisfies the milestone's path requirement.

## What's covered in the runbook

- The four critical commands: refresh / teardown / smoke check / iPhone join.
- Pre-flight checks (5 verifications before the first invocation).
- Banner shapes for both refresh and teardown.
- Troubleshooting for the most likely failure modes.
- By-design behaviors (sliding dates, auditor wipe, token rotation).

## When to update

- The CLI shape changes (new flag, renamed command, changed env-var contract).
- A new troubleshooting case is identified by the operator.
- The synthetic household's invite code or label changes.

## See also

- `.planning/phases/11-production-synthetic-household/11-CONTEXT.md` — locked decisions (D-01..D-24).
- `.planning/phases/11-production-synthetic-household/11-RESEARCH.md` — technical research (Pitfalls 1-10, FK chain, advisory lock derivation).
- `backend/app/cli/seed.py` — the implementation.
- `backend/app/cli/synthetic_photos/README.md` — photo source/license attribution.
