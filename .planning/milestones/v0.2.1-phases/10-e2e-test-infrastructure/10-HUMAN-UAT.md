---
status: resolved
phase: 10-e2e-test-infrastructure
source: [10-VERIFICATION.md]
started: 2026-05-09T00:30:00.000Z
updated: 2026-05-09T01:30:00.000Z
runtime_run: see 10-RUNTIME-NOTES.md (orchestrator-driven, full bootstrap → green)
---

## Current Test

[awaiting human testing — D-12 regression canary, procedure in TESTING.md §"Regression canary verification gate (D-12)"]

## Tests

### 1. Bootstrap a fresh checkout to a green Playwright report (≤ 5 commands)

expected: From a clean clone (or post-`git clean -fd` working tree), the four documented commands in `TESTING.md` produce a green `npm run test:e2e` run for the `seeded` Playwright project. The post-hotfix harness (commit `23a4c6a`) routes `/api/*` correctly via the Next.js dev rewrite to `http://localhost:8000`.

procedure:
```
1. docker compose -f docker-compose.test.yml up -d
2. (cd backend && uv sync && uv run alembic upgrade head && uv run seed)
3. (cd frontend && npm ci && npx playwright install --with-deps chromium)
4. (cd frontend && npm run test:e2e)
```

result: [passed]

---

### 2. D-12 regression canary — frontend hot-path bug is caught by the suite

expected: A 1-line edit to `frontend/components/ShortlistDeck.tsx` that inverts vote-yes/vote-no callback wiring causes `shortlist-vote.spec.ts` to fail. After `git checkout -- frontend/components/ShortlistDeck.tsx`, the suite returns to green. Demonstrates that the Playwright suite has real regression-catching power for the frontend hot path.

procedure (after Test 1 is green):
```
# Edit ShortlistDeck.tsx — invert the yes/no swipe callbacks (1 line)
(cd frontend && npm run test:e2e -- --project=seeded --grep "shortlist-vote")
# Expected: non-zero exit, shortlist-vote spec fails
git checkout -- frontend/components/ShortlistDeck.tsx
git diff --quiet frontend/components/ShortlistDeck.tsx
# Expected: clean
```

result: [passed]

---

### 3. D-12 regression canary — backend hot-path bug is caught by the suite

expected: A 1-line edit to `backend/app/routers/votes.py` (e.g. flip the `score_delta` sign or invert a vote-state transition) causes `shortlist-vote.spec.ts` OR `cooking-log-create-finalize.spec.ts` to fail. After `git checkout -- backend/app/routers/votes.py`, the suite returns to green. Demonstrates that the suite catches backend regressions.

procedure (after Test 1 is green):
```
# Edit backend/app/routers/votes.py — flip a sign or invert a transition (1 line)
(cd frontend && npm run test:e2e -- --project=seeded)
# Expected: non-zero exit, at least one vote/cooking spec fails
git checkout -- backend/app/routers/votes.py
git diff --quiet backend/app/routers/votes.py
# Expected: clean
```

result: [passed]

---

### 4. TEST-04 invite-code happy-path runs without seeded auth shortcut

expected: `npm run test:e2e -- --project=fresh` runs the invite-code spec end-to-end. Before the spec runs, `globalSetup.fresh.ts` truncates the 6 tables; the spec exercises `/onboarding/welcome` → `/onboarding/create` → invite code → `/onboarding/join` with NO Bearer header (real cookie flow). After the spec, `globalTeardown.fresh.ts` re-seeds so `--project=seeded` runs continue to find data.

procedure:
```
(cd frontend && npm run test:e2e -- --project=fresh)
# Expected: 1 spec passes (invite-code-happy-path.spec.ts)
```

result: [passed]

---

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

(none yet — runtime verification deferred to user)

## Notes

The structural deliverables are complete (verified by `gsd-verifier`):
- 7 PLAN.md files, 7 SUMMARY.md files, 23 atomic commits
- TEST-01 (seed CLI) end-to-end runtime-verified by 10-03 executor (21 recipes, 5 vote states, idempotency proven)
- TEST-02 (13 specs under `seeded` project) static-verified (TS clean, ESLint clean, French DOM strings present)
- TEST-04 (invite-code spec) static-verified (listed under `[fresh]` project, no Bearer references)
- TEST-03 (TESTING.md runbook) committed at repo root

**The only remaining work is the runtime gate** — the user runs the 4 tests above and confirms results. Test 1 was blocked during 10-07 execution by a NEXT_PUBLIC_API_BASE typo in `playwright.config.ts:107` that has since been hotfixed (commit `23a4c6a`). The hotfix is structurally verified (line 110 reads `NEXT_PUBLIC_API_BASE: ''`) but has not been re-run end-to-end.

Once Test 1 is green, Tests 2-4 follow the documented procedures.
