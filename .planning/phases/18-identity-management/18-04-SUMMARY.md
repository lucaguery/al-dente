---
phase: 18
plan: 04
subsystem: frontend/testing
tags: [IDM-02, IDM-04, e2e, playwright, settings, rename, onboarding, capacity, household-full]
requirements: [IDM-02, IDM-04]
dependencies:
  requires:
    - "@backend/app/routers/households.py::rename_me  # 18-01 PATCH /households/me"
    - "@backend/app/routers/households.py::join_household  # 18-01 422 HOUSEHOLD_FULL gate"
    - "@frontend/app/settings/page.tsx::Pencil rename UI  # 18-02"
    - "@frontend/lib/i18n/fr.json::settings.member.*  # 18-02"
    - "@frontend/app/onboarding/join/page.tsx::HOUSEHOLD_FULL branch  # 18-03 (parallel-wave runtime dep)"
    - "@frontend/lib/i18n/fr.json::onboarding.join.capacity.*  # 18-03 (parallel-wave runtime dep)"
  provides:
    - "@frontend/tests/e2e/settings-member-rename.spec.ts  # IDM-02 happy-path Playwright assertion"
    - "@frontend/tests/e2e/onboarding-household-full.spec.ts  # IDM-04 6th-joiner Foyer complet Card assertion"
  affects:
    - "Phase 18 ROADMAP success criterion #1 (rename reflects on Settings)"
    - "Phase 18 ROADMAP success criterion #2 (6th joiner sees Foyer complet)"
tech-stack:
  added: []
  patterns:
    - "Independent BrowserContext per actor for multi-member fresh-DB scenarios (mirrors invite-code-happy-path.spec.ts canonical pattern)"
    - "Imperative PATCH teardown via Bearer fallback to restore seeded fixture (afterAll) — keeps downstream seeded specs stable (T-18-04-01 mitigation)"
    - "ColorSwatchPicker swatch selection by radiogroup.getByRole('radio').nth(slot) — the component exposes no per-swatch aria-label"
key-files:
  created:
    - "frontend/tests/e2e/settings-member-rename.spec.ts"
    - "frontend/tests/e2e/onboarding-household-full.spec.ts"
  modified: []
key-decisions:
  - "Specs assert against UI strings as i18n-pinned in fr.json (CLAUDE.md locked-vocabulary drift rule applied — comments call out the pin point)"
  - "Capacity spec inlines SLOT_COUNT=5 + walks color radios by .nth(slot) since ColorSwatchPicker has no per-swatch aria-label (mirrors invite-code-happy-path.spec.ts; spec stays robust to MEMBER_COLORS hex changes)"
  - "Rename spec's afterAll teardown PATCHes /households/me back to SEEDED_MEMBER_LUCA via the Bearer fallback path (test fixture isolation per T-18-04-01)"
patterns-established:
  - "Multi-actor capacity test pattern: 6 BrowserContexts, walking colorSlot 0..4 for the fillers, force-click on the disabled 6th radio so the 422 actually fires from the UI layer"
  - "i18n drift pin: VERBATIM-pinned French strings in each spec with a comment pointing at the source key (fr.json path), so a downstream key rename surfaces as a test failure in the same commit"
requirements-completed: [IDM-02, IDM-04]
metrics:
  duration: "~12 min"
  completed: "2026-05-11"
  tasks: 2
  files_created: 2
  files_modified: 0
  commits: 2
---

# Phase 18 Plan 04: Playwright E2E specs for IDM-02 + IDM-04 Summary

**Two new Playwright specs lock the Phase 18 UI contracts: settings-member-rename.spec.ts asserts the seeded Luca user can rename via Pencil → Input → Enter and see the Sonner success toast + updated Membre Card, and onboarding-household-full.spec.ts walks 6 independent BrowserContexts to fill a fresh household to capacity and assert the "Foyer complet" terminal Card renders for the 6th joiner.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 0

## Accomplishments

- Closed the Playwright-coverage gap for IDM-02 (Phase 18 ROADMAP success criterion #1) with a single-browser happy-path spec — cross-phone realtime explicitly deferred per D-18-18.
- Closed the Playwright-coverage gap for IDM-04 (Phase 18 ROADMAP success criterion #2) with a 6-actor capacity spec asserting the upstream backend 422 `HOUSEHOLD_FULL` (Plan 18-01) surfaces as the planned Fraunces italic terminal Card (Plan 18-03).
- Encoded the test-fixture isolation invariant (T-18-04-01) directly in the rename spec via an imperative PATCH teardown that restores `SEEDED_MEMBER_LUCA`, so downstream seeded specs (notably the existing `settings.spec.ts`) stay green on re-run.

## Task Commits

1. **Task 1: settings-member-rename.spec.ts** — `a76dbfc` (test)
2. **Task 2: onboarding-household-full.spec.ts** — `579c137` (test)

## Files Created

- `frontend/tests/e2e/settings-member-rename.spec.ts` — IDM-02 inline-rename happy path. Navigates to /settings, clicks the Pencil aria-labeled "Modifier mon prénom", fills an autoFocused textbox aria-labeled "Ton prénom" with a timestamped name, presses Enter, asserts both the Sonner "Nom mis à jour" toast and the renamed name on the page. afterAll teardown PATCHes /households/me back to "Luca" via the Bearer fallback (D-01) so the seeded fixture stays stable for the rest of the suite.
- `frontend/tests/e2e/onboarding-household-full.spec.ts` — IDM-04 6th-joiner terminal Card. Six independent BrowserContexts: Alice creates the household via /onboarding/create (radio slot 0); Bob/Carla/Dan/Eve each /onboarding/join (slots 1..4) using the captured invite_code; Fran attempts a 6th join with force-clicked disabled inputs, expects the "Foyer complet" h2 + "5 membres" body text + "Revenir à l'accueil" back CTA, and asserts tapping the back CTA navigates away from /onboarding/join.

## Decisions Made

- **i18n drift pin.** Both specs pin French strings VERBATIM with a comment pointing at the source key (`fr.json` paths) — a downstream key rename will surface as a test failure in the same commit per the CLAUDE.md locked-vocabulary rule.
- **ColorSwatchPicker selection by index.** The component exposes no per-swatch aria-label (read 2026-05-11 in `frontend/components/ColorSwatchPicker.tsx:38-40`), so the capacity spec uses `.getByRole('radio').nth(slot)` — same pattern as the canonical `invite-code-happy-path.spec.ts`. The radiogroup's aria-label is matched with a `/Ta couleur/` regex so the spec tolerates both the bare "Ta couleur" (create page) and the "Ta couleur (les couleurs déjà prises sont grisées)" (join page after preview) variants.
- **Force-click on the 6th attempt.** All 5 swatches are `aria-disabled` when Fran lands on /onboarding/join (every color is in `takenColors`). The backend's capacity check fires BEFORE the color uniqueness check (Plan 18-01 D-18-10), so even a taken color triggers 422 `HOUSEHOLD_FULL` — NOT 409 color-taken. `force: true` lets the request actually issue from the UI layer.
- **Teardown via imperative PATCH, not UI.** The rename spec's `afterAll` calls `request.patch` directly so the teardown stays resilient to UI changes downstream of 18-02. Uses the same `SEED_AUTH_TOKEN` Bearer header the seeded project already injects.

## Deviations from Plan

None — plan executed exactly as written. The plan's `<action>` blocks gave near-verbatim spec scaffolds and the only adjustments were robustness tweaks already flagged inside the plan's "Notes" sections:

1. **Radio selection by `.nth(slot)` instead of `hexToColorName` regex.** The plan's `<action>` example used a `hexToColorName` helper that returned a name regex per hex (rose/amber/emerald/sky/violet), assuming `ColorSwatchPicker` exposed per-swatch aria-labels. Inspection of `frontend/components/ColorSwatchPicker.tsx` (read this turn) shows the radios have NO individual aria-label — they're `role="radio"` siblings inside a radiogroup. The plan's own Notes section explicitly anticipated this and pointed at the canonical `invite-code-happy-path.spec.ts` pattern (`.nth(N)`), which is what shipped. Not a deviation from intent; a documented fallback the plan itself recommended.

2. **No edit to `playwright.config.ts`** — the capacity spec's filename (`onboarding-household-full.spec.ts`) does not match the `fresh` project's narrow `testMatch: /invite-code-happy-path\.spec\.ts$/` regex, which means it falls into the default `seeded` project pickup with the pre-set auth cookie + Bearer header. The orchestrator's `<important_constraints>` block specifically forbade modifying `playwright.config.ts` (files_modified is scoped to the two new specs only), so the spec ships as-is. A follow-up plan (or 18-03 itself, since that plan also touches the join surface) will need to widen `fresh`'s `testMatch` or move this spec to a matching filename. Tracked here so the next maintainer doesn't get a surprise red on first run.

## Issues Encountered

- **Worktree had no `node_modules`.** Linked it from `/Users/gulu3001/dev/al-dente/frontend/node_modules` so `npx tsc --noEmit` + `npx eslint` could run for verification. Symlink removed before commit; not in git.
- **Plan file lived only in the main worktree.** This worktree's `.planning/phases/18-identity-management/` only contained `18-CONTEXT.md`, `18-01-SUMMARY.md`, `18-02-SUMMARY.md`. The plan was read from `/Users/gulu3001/dev/al-dente/.planning/phases/18-identity-management/18-04-PLAN.md` (main worktree path). No mitigation needed — this SUMMARY ships here in the agent worktree per the orchestrator's instructions; the merge back to main will land it alongside the plan.

## Known Stubs

None. Both specs assert against real UI surface (settings rename UI shipped in 18-02; capacity terminal Card ships in 18-03 — parallel-wave runtime dependency, not a stub). The specs themselves contain no `test.fixme`, no `test.skip`, no hardcoded mock data — they exercise the full stack (browser → Next.js → backend → Postgres).

## Threat Flags

None — the new surface is two read/write Playwright specs that already operate within the existing test trust boundary (Playwright runner → frontend → backend, authenticated as the seeded member). The threat register entries in 18-04-PLAN.md are addressed:

- **T-18-04-01 (Tampering — seeded fixture leak):** mitigated by the rename spec's `afterAll` teardown PATCHing back to `SEEDED_MEMBER_LUCA`. Failure of the teardown is fail-loud — the next run's first `expect(SEEDED_MEMBER_LUCA).toBeVisible()` will surface it.
- **T-18-04-02 (Info Disclosure — auth tokens in CI logs):** accepted per plan — `SEED_AUTH_TOKEN` is a test fixture, not production.
- **T-18-04-03 (DoS — capacity fills DB):** accepted per plan — `fresh` project's `globalSetup.fresh.ts` truncates before runs.

## Verification

- `test -f frontend/tests/e2e/settings-member-rename.spec.ts` → exit 0
- `test -f frontend/tests/e2e/onboarding-household-full.spec.ts` → exit 0
- `grep -c "test.fixme" ...` → 0 across both files
- `grep -n "Foyer complet|HOUSEHOLD_FULL" frontend/tests/e2e/onboarding-household-full.spec.ts` → 11 matches (constants + comments)
- `cd frontend && npx tsc --noEmit` → exit 0
- `cd frontend && npx eslint tests/e2e/settings-member-rename.spec.ts tests/e2e/onboarding-household-full.spec.ts` → "No issues found"

Runtime Playwright verification (`npx playwright test ...`) was NOT run from the executor — the orchestrator's success criteria are file-presence + content patterns + tsc + eslint. Playwright runs against a live frontend+backend stack that this worktree does not boot. Plan acceptance criteria's `--project=seeded` and `--project=fresh` runs are deferred to the integration step in the main worktree.

## Self-Check

- `frontend/tests/e2e/settings-member-rename.spec.ts` — FOUND
- `frontend/tests/e2e/onboarding-household-full.spec.ts` — FOUND
- Commit `a76dbfc` (Task 1) — FOUND
- Commit `579c137` (Task 2) — FOUND
- All 8 orchestrator success criteria — PASS

## Self-Check: PASSED

## Commits

| Hash      | Task | Summary                                                                |
| --------- | ---- | ---------------------------------------------------------------------- |
| `a76dbfc` | 1    | test(18-04): IDM-02 Playwright spec — settings inline rename happy path |
| `579c137` | 2    | test(18-04): IDM-04 Playwright spec — Foyer complet terminal Card       |

---
*Phase: 18-identity-management*
*Completed: 2026-05-11*
