---
phase: 17-history-feature-restoration
verified: 2026-05-11T17:30:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Playwright spec — cooking-log-history.spec.ts runs green against the seeded project"
    expected: "Both tests pass: (1) /cooking-logs lists the 3 seeded recipe titles (Ragu bolognese, Poulet au citron, Burger classique); (2) clicking a card navigates to /cooking-logs/{uuid} and the rating chip (Adoré|Bien|Passable) is visible on the detail page"
    why_human: "Plan 17-03 explicitly skipped invoking npx playwright test --project=seeded — servers not running (no backend on :8000, no frontend on :3000) from worktree. Plan 17-01's 10 pytest tests DID pass live per its SUMMARY (uv run pytest tests/test_cooking_logs_history.py -q → 10 passed); the e2e leg requires CI or the manual docker compose + uv run seed + frontend runbook. Programmatic verification cannot start servers."
  - test: "Playwright spec — cooking-log-create-finalize.spec.ts runs green against the seeded project"
    expected: "The previously test.fixme'd spec passes including the Phase 15 INV-02 double-tap idempotency block: first Finaliser increments cook_count by 1 + sets last_cooked_at; second PUT returns 200 with cook_count unchanged at start+1"
    why_human: "Same reason — requires running backend + frontend + seed; this is the FIX-01 user-observable witness (the spec was gated on TZ-01 closing) and the cross-link from Phase 15 Plan 15-04 SUMMARY's 'Cross-link forward: Phase 17 TODO'. Static analysis confirms test.fixme is removed and the body is intact; runtime confirmation is the live spec run."
  - test: "Visual / responsive check — /cooking-logs/[id] detail page on iPhone-shape viewport (390×844)"
    expected: "Paper-grain Card chrome renders within viewport bounds with the Fraunces italic absolute French date header, cooked-by member chip (dot + name), aspect-square photo when present, rating chip (loved/liked/disliked French label from fr.json), notes paragraph with preserved line breaks, and 'Voir la recette' back-link routing to /recipes/{recipe_id}. Cookbook-chapter-opener gesture matches the Phase 8 design system."
    why_human: "Visual appearance + design-system fidelity is not programmatically verifiable. All structural elements grep-confirm but the 'feels Al Dente' gesture (Pillar 6) is a human eyes-on judgment per the v0.3 UI-AUDIT rubric."
---

# Phase 17: History Feature Restoration — Verification Report

**Phase Goal:** The cooking-log history loop is reachable end-to-end — list, detail, and the late-evening UTC offset edge case all work as a user expects.

**Verified:** 2026-05-11T17:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| #   | Truth                                                                                                                                                                                          | Status            | Evidence                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `GET /api/cooking-logs?days=N` returns data; `/cooking-logs` page renders cards.                                                                                                              | ✓ VERIFIED        | `backend/app/routers/cooking_logs.py:216-252` registers `@router.get("/cooking-logs")` with `days: int = Query(default=30, ge=1, le=365)`, filters `rating.is_not(None)`, sorts `cooked_at DESC`. `frontend/app/cooking-logs/page.tsx:84-89` calls `fetchCookingLogs(14)` + recipe-title join; 17-01 SUMMARY reports 10/10 pytest passing live.                                  |
| 2   | `/cooking-logs/[id]` detail page exists with paper-grain Card chrome (notes + photo + rating).                                                                                                 | ✓ VERIFIED        | `frontend/app/cooking-logs/[id]/page.tsx:144` `paper-grain flex flex-col gap-4 p-6 bg-card rounded-xl`; `:149` Fraunces italic date header (`font-display italic text-2xl`); `:171` `aspect-square` photo; `:175-178` rating chip via `useTranslations("cooking_log.rating")`; `:195-198` notes with `whitespace-pre-line`; `:182-188` back-link to `/recipes/{recipe_id}`. |
| 3   | Timezone filter uses household-tz boundary (zoneinfo); no `DateType.today()` remaining.                                                                                                       | ✓ VERIFIED        | `backend/app/routers/cooking_logs.py:44` imports `ZoneInfo, ZoneInfoNotFoundError`; `:72-94` `_household_today_in_tz(household)`; `:97-114` `_cooked_at_in_tz_date(household)`; both used at `:150,154` (start_cooking 409 guard) and `:203,207` (get_active_cooking_log). `grep -n "DateType.today()" cooking_logs.py` → 0 matches. Defensive UTC fallback with `household_invalid_timezone` warn on `ZoneInfoNotFoundError`.                |
| 4   | Both `cooking-log-history.spec.ts` and `cooking-log-create-finalize.spec.ts` no longer have `test.fixme` markers.                                                                              | ✓ VERIFIED        | `grep -c 'test.fixme' frontend/tests/e2e/cooking-log-history.spec.ts` → 0; same on `cooking-log-create-finalize.spec.ts` → 0. Paired `// eslint-disable-next-line playwright/no-skipped-test` directives also removed (0 matches on both files). History spec gains new detail-navigation test asserting URL transition + rating chip visibility.            |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact                                                       | Expected                                                                          | Status     | Details                                                                                                                                                                                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/routers/cooking_logs.py`                          | GET list + GET detail + TZ helpers + rewritten start_cooking + get_active        | ✓ VERIFIED | 515 lines. New endpoints at `:216-252` (list) + `:387-412` (detail). Helpers `_household_today_in_tz` + `_cooked_at_in_tz_date` at `:72-114`. Both consumed at `:150,154,203,207`. Phase 15 atomic-UPDATE-with-rowcount-gate at `:255-384` byte-identical (no regression). |
| `backend/tests/test_cooking_logs_history.py`                   | 10 pytest tests covering HIST-01 + HIST-02 + FIX-01                              | ✓ VERIFIED | NEW file. 10 `def test_*` (5 list + 2 detail + 3 TZ). Uses `_FrozenDatetime` test double for boundary tests, `caplog.at_level` for invalid-tz warn capture, `_drain_active_logs` helper. 17-01 SUMMARY: `uv run pytest tests/test_cooking_logs_history.py -q` → 10 passed. |
| `frontend/lib/cooking.ts`                                      | fetchCookingLogs(days?) + fetchCookingLog(id) exports                            | ✓ VERIFIED | 119 lines. Two new exports at `:103-108` + `:114-118`. Five original exports (`postStartCooking`, `getActiveCookingLog`, `putFinalizeCookingLog`, `uploadCookingLogPhoto`, `getCookingLogSignedPhotoUrl`) byte-identical per 17-02 SUMMARY verification.    |
| `frontend/app/cooking-logs/[id]/page.tsx`                      | NEW paper-grain detail Card per D-17-05                                          | ✓ VERIFIED | 212 lines. `OnboardingGuard` wrapper at `:128`. All five required patterns present: paper-grain, fetchCookingLog, getCookingLogSignedPhotoUrl, aspect-square, font-display italic. Sibling `/finalize/page.tsx` coexists (both files present).            |
| `frontend/app/cooking-logs/page.tsx`                           | Rewired to consume fetchCookingLogs(14) + tap-to-detail navigation               | ✓ VERIFIED | `:29,85` imports + calls `fetchCookingLogs(14)`; `:181` `href={\`/cooking-logs/${log.id}\`}`; `:181-211` page-local `CookingLogHistoryRow` replaces `<CookingLogCard>`; placeholder `CookingLogListResponse` envelope type removed.                          |
| `frontend/tests/e2e/cooking-log-history.spec.ts`               | No test.fixme + adds detail-navigation assertion                                  | ✓ VERIFIED | 49 lines. Header comment rewritten (Phase 17 context). Two tests: list-titles + tap-to-detail. URL regex `/\/cooking-logs\/[0-9a-f-]{36}$/` at `:37`. Rating chip regex `/Adoré\|Bien\|Passable/` narrowed to fr.json actuals per 17-03 SUMMARY.            |
| `frontend/tests/e2e/cooking-log-create-finalize.spec.ts`      | test.fixme removed; INV-02 double-tap block intact                               | ✓ VERIFIED | 137 lines. Header comment rewritten to reflect FIX-01 fix landing. Test body byte-identical including INV-02 double-tap block at `:105-134` (`startCookCount` appears 3x). `grep -c 'startCookCount'` → 3.                                                  |

### Key Link Verification

| From                                                | To                                | Via                                                                              | Status      | Details                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cooking_logs.py:start_cooking`                     | `household.timezone`              | `_household_today_in_tz(household)` + `_cooked_at_in_tz_date(household)`         | ✓ WIRED     | `:144-149` fetches household via `db.get(Household, member.household_id)`; `:150` computes today_in_tz; `:154` SQL filter via `_cooked_at_in_tz_date(household) == today`.                                                                                                  |
| `cooking_logs.py:get_active_cooking_log`            | `household.timezone`              | Same helper pair (D-17-09 — shared boundary)                                     | ✓ WIRED     | `:200-202` household fetch; `:203` today; `:207` SQL filter symmetric to `start_cooking`. Both callsites share the same boundary.                                                                                                                                          |
| `cooking_logs.py:list_cooking_logs` (NEW)           | `CookingLog` table                | household-scoped + `cooked_at >= cutoff` + `rating.is_not(None)` + `ORDER BY DESC` | ✓ WIRED     | `:242-251` SQLAlchemy query produces ordered list. `CookingLogResponse.model_validate(r) for r in rows`.                                                                                                                                                                  |
| `cooking_logs.py:get_cooking_log` (NEW)             | `CookingLog` table                | household_id filter + 404 on miss                                                | ✓ WIRED     | `:404-411` SELECT with `id == log_id AND household_id == member.household_id`; 404 not 403 on miss (T-04-01-03).                                                                                                                                                          |
| `frontend/app/cooking-logs/page.tsx`                | `/api/cooking-logs?days=14`       | `fetchCookingLogs(14)` (HIST-01 helper)                                          | ✓ WIRED     | `:84-89` `Promise.all([fetchCookingLogs(14), api(...)])`. Recipe-title join via client-side Map.                                                                                                                                                                          |
| `frontend/app/cooking-logs/page.tsx` (each row)     | `/cooking-logs/{log.id}`          | `<Link href={\`/cooking-logs/${log.id}\`}>` in `CookingLogHistoryRow`            | ✓ WIRED     | `:181` Link href routes to detail page; replaces the `CookingLogCard`'s default `/recipes/{recipe_id}` href.                                                                                                                                                              |
| `frontend/app/cooking-logs/[id]/page.tsx`           | `/api/cooking-logs/{id}`          | `fetchCookingLog(id)` (HIST-02 helper)                                           | ✓ WIRED     | `:82` `.then(setLog).catch(err=> ...)`; 404 detection via `err.message.startsWith("404")` mapping to `setError("notfound")`.                                                                                                                                              |
| `frontend/app/cooking-logs/[id]/page.tsx`           | `/recipes/{recipe_id}`            | `next/link`                                                                       | ✓ WIRED     | `:182-188` `<Link href={\`/recipes/${log.recipe_id}\`}>` — "Voir la recette" back-link.                                                                                                                                                                                     |

### Data-Flow Trace (Level 4)

| Artifact                                                | Data Variable                  | Source                                                            | Produces Real Data | Status     |
| ------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------- | ------------------ | ---------- |
| `frontend/app/cooking-logs/page.tsx`                    | `logs` state (line 78)        | `fetchCookingLogs(14)` → `GET /api/cooking-logs?days=14` (DB query) | Yes               | ✓ FLOWING |
| `frontend/app/cooking-logs/[id]/page.tsx`               | `log` state (line 75)         | `fetchCookingLog(id)` → `GET /api/cooking-logs/{id}` (DB query)    | Yes               | ✓ FLOWING |
| `frontend/app/cooking-logs/page.tsx`                    | `photoSrc` (line 162 in row)  | `getCookingLogSignedPhotoUrl(log.id, photoPath)` → signed bucket URL | Yes              | ✓ FLOWING |
| `frontend/app/cooking-logs/[id]/page.tsx`               | `cookedByMember` (line 118)   | `useSession().members.find(m => m.id === log.cooked_by_member_id)` | Yes (existing session roster) | ✓ FLOWING |

No HOLLOW props, no static fallbacks dominating, no disconnected data paths. The `"Recette supprimée"` fallback at page.tsx:95 is a legitimate runtime state (recipe row deleted, log row remains) per 17-03 SUMMARY, not a stub.

### Behavioral Spot-Checks

| Behavior                                                                     | Command                                                                            | Result            | Status     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------- | ---------- |
| No `DateType.today()` in cooking_logs.py                                     | `grep -nE "DateType\.today\(\)" backend/app/routers/cooking_logs.py \| wc -l`     | 0                 | ✓ PASS    |
| 10 tests in test_cooking_logs_history.py                                     | `grep -cE "^(async )?def test_" backend/tests/test_cooking_logs_history.py`        | 10                | ✓ PASS    |
| No test.fixme in either e2e spec                                              | `grep -cE "test\.fixme" {history,create-finalize}.spec.ts`                         | both 0            | ✓ PASS    |
| No playwright/no-skipped-test eslint-disable directives                       | `grep -cE "playwright/no-skipped-test" both files`                                 | both 0            | ✓ PASS    |
| ZoneInfo import + uses present                                                | `grep -nE "ZoneInfo\|zoneinfo" backend/app/routers/cooking_logs.py`                | 6 hits            | ✓ PASS    |
| fetchCookingLogs/fetchCookingLog wired                                        | `grep -n fetchCookingLog frontend/lib/cooking.ts + 2 consumers`                    | 6 hits across 3 files | ✓ PASS  |
| Sibling routes `[id]/page.tsx` and `[id]/finalize/page.tsx` coexist           | `ls frontend/app/cooking-logs/[id]/{page.tsx,finalize/page.tsx}`                   | both present      | ✓ PASS    |
| Recent commits present (3 plans × ~3 commits each)                            | `git log --oneline` showing 81d5561, e965abf, 57ae986, 1d77c9e, c09ce34, b2e4f96, 7830d42 | all present | ✓ PASS |
| pytest backend regression (live test run)                                     | `uv run pytest tests/test_cooking_logs_history.py -q` per 17-01 SUMMARY            | 10 passed         | ✓ PASS (per SUMMARY) |
| Playwright e2e specs runtime                                                  | `npx playwright test --project=seeded cooking-log-history cooking-log-create-finalize` | Not run this session | ? SKIP — see Human Verification |

Servers not reachable from worktree (no backend on :8000, no frontend on :3000). Per caveat #1, e2e re-validation is deferred to CI / next manual run. The static analysis (test.fixme markers removed, body byte-identical for create-finalize, new detail-nav test wired in history spec) all pass.

### Requirements Coverage

| Requirement | Source Plan      | Description                                                                                                          | Status       | Evidence                                                                                                                                                                                       |
| ----------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HIST-01     | 17-01, 17-03     | `GET /api/cooking-logs?days=N` ships; user opens `/cooking-logs` and sees recent entries.                            | ✓ SATISFIED  | Backend endpoint at `cooking_logs.py:216-252`; frontend wire at `page.tsx:85`; 5 pytest tests cover shape, days-window, unfinalized exclusion, Query clamp, cross-household isolation. |
| HIST-02     | 17-01, 17-02, 17-03 | User taps a card on `/cooking-logs` and reads full notes/photo/rating on `/cooking-logs/[id]`; paper-grain chrome.    | ✓ SATISFIED  | Backend endpoint at `:387-412`; frontend detail page at `app/cooking-logs/[id]/page.tsx` with all 5 chrome elements (paper-grain, Fraunces italic, aspect-square photo, rating chip, notes). Tap routing wired via `<Link href={\`/cooking-logs/${log.id}\`}>` in `CookingLogHistoryRow`. |
| FIX-01      | 17-01, 17-03     | Active-cook filter timezone-correct; `cooking-log-create-finalize.spec.ts` removes `test.fixme`.                     | ✓ SATISFIED  | `_household_today_in_tz` + `_cooked_at_in_tz_date` at both callsites (`:150,154,203,207`); zero `DateType.today()` remaining; defensive UTC fallback for invalid IANA names. Spec test.fixme removed (grep → 0); INV-02 double-tap block intact (`startCookCount` 3x). 3 pytest TZ tests covering same-day, next-day, invalid-tz fallback. |

No ORPHANED requirements — REQUIREMENTS.md maps exactly HIST-01, HIST-02, FIX-01 to Phase 17, all claimed by plans, all verified.

### Anti-Patterns Found

| File                                              | Line | Pattern                                                                                                          | Severity | Impact                                                                                                                                                                                                                          |
| ------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/app/cooking-logs/[id]/page.tsx`         | 145, 185, 202 | 3 `TODO(productize): i18n — Phase 20 (FIX-03) sweep` markers on inline French strings ("Détail de la cuisson", "Voir la recette", "Une erreur s'est produite. Réessaie plus tard.") | ℹ️ Info  | **Not a blocker for Phase 17.** Per caveat #2 + 17-02 SUMMARY, planner explicitly accepted Path B (TODO markers) to honor constraint #1 (files_modified scope did not include fr.json). Phase 20 FIX-03 picks these up. All strings WITH existing fr.json keys (ratings, finalize.gone_heading, finalize.notes_heading) DO route through `useTranslations`. Invariant #6 (`next-intl`) violation acknowledged and deferred — not introducing a new debt, recognizing existing pattern. |
| (no other anti-patterns flagged across modified files) | — | — | — | — |

No stubs, no `return null` placeholders, no empty arrays passed as hardcoded props, no console.log-only handlers. All data is wired to real sources.

### Architecture Invariant Check

Per CLAUDE.md, three invariants are relevant here:

- **Invariant #3 (denormalized fields, same-tx):** Untouched by Phase 17. `finalize_cooking_log` at `:255-384` is byte-identical to the Phase 15 atomic UPDATE — `last_cooked_at` / `cook_count` updates remain in same db.commit() as the `cooking_logs` row. 17-01 SUMMARY confirms `tests/test_cooking_logs.py` → 3 passed.
- **Invariant #4 (realtime broadcast contract):** Untouched. New GETs are read-only — `grep broadcast_to_household` shows 5 hits, all in existing mutation paths (start_cooking line 174, finalize lines 346/351/375). New `list_cooking_logs` and `get_cooking_log` do NOT broadcast (correct — reads, not mutations).
- **Invariant #7 (single uvicorn worker):** Untouched. No new scheduler hooks. The `household.timezone` column being used here is the same one APScheduler at 16:00 household-tz consumes.

### Human Verification Required

Three items need human / runtime verification (see frontmatter `human_verification` for the structured list):

#### 1. Playwright spec — cooking-log-history.spec.ts runs green against the seeded project

**Test:** `cd frontend && npx playwright test cooking-log-history --project=seeded` (after `docker compose up -d` + `uv run seed` + backend at `localhost:8000` + frontend at `localhost:3000` per `frontend/TESTING.md`)
**Expected:** Both tests pass — (1) `/cooking-logs` lists the 3 seeded recipe titles (Ragu bolognese, Poulet au citron, Burger classique); (2) clicking the Ragu card navigates to `/cooking-logs/{uuid}` and the rating chip (one of `Adoré`, `Bien`, `Passable`) is visible on the detail page.
**Why human:** Plan 17-03 explicitly skipped invoking `npx playwright test` — servers not running (no backend on :8000, no frontend on :3000) from this worktree. Plan 17-01's 10 pytest tests DID pass live per its SUMMARY. The e2e leg requires CI or the manual docker compose + uv run seed + frontend runbook. Programmatic verification cannot start servers.

#### 2. Playwright spec — cooking-log-create-finalize.spec.ts runs green against the seeded project

**Test:** `cd frontend && npx playwright test cooking-log-create-finalize --project=seeded`
**Expected:** The previously test.fixme'd spec passes including the Phase 15 INV-02 double-tap idempotency block — first Finaliser increments `cook_count` by 1 and sets `last_cooked_at`; the second PUT returns 200 with `cook_count` unchanged at `start+1`.
**Why human:** Same reason — requires running backend + frontend + seed. This is the FIX-01 user-observable witness (the spec was gated on TZ-01 closing) and the cross-link from Phase 15 Plan 15-04 SUMMARY's "Cross-link forward: Phase 17 TODO". Static analysis confirms `test.fixme` is removed and the test body is intact (`startCookCount` appears 3× confirming the INV-02 block is preserved); runtime confirmation is the live spec run.

#### 3. Visual / responsive check — `/cooking-logs/[id]` detail page on iPhone-shape viewport (390×844)

**Test:** Open `/cooking-logs/{seeded-log-id}` in Chromium DevTools at 390×844 with `hasTouch:true` and verify the page's design-system fidelity by eye.
**Expected:** Paper-grain Card chrome renders within viewport bounds with the Fraunces italic absolute French date header ("vendredi 8 mai 2026"), cooked-by member chip (dot + name from `useSession`), aspect-square photo when present, rating chip (loved/liked/disliked French label from `fr.json`), notes paragraph with preserved line breaks, and "Voir la recette" back-link routing to `/recipes/{recipe_id}`. The cookbook-chapter-opener gesture matches the Phase 8 design system.
**Why human:** Visual appearance + design-system fidelity is not programmatically verifiable. All structural elements grep-confirm (`paper-grain`, `aspect-square`, `font-display italic`, `useTranslations("cooking_log.rating")`, `whitespace-pre-line` notes, recipe back-link) but the "feels Al Dente" gesture (Pillar 6 of the v0.3 UI-AUDIT rubric) is a human eyes-on judgment.

### Gaps Summary

No blocking gaps. All 4 ROADMAP success criteria are satisfied by code that grep-confirms, and the only deferred work is:

1. **3 inline French strings in detail page** — explicitly acknowledged in caveat #2 and 17-02 SUMMARY's "Path B" decision; Phase 20 (FIX-03) sweep picks them up under its own roadmap mandate. Not a Phase 17 scope item per planner's explicit acceptance.
2. **Live e2e re-run** — caveat #1; spec text changes verified statically (test.fixme removed; INV-02 block intact at line 105-134; detail-nav test with URL regex + rating-chip assertion added at line 25-47).

Phase 17 delivers what its goal states: the cooking-log history loop is reachable end-to-end (list rewired + detail page shipped + tap-to-detail wired), and the late-evening UTC offset edge case is fixed (zoneinfo-based boundary at both callsites with defensive UTC fallback, validated by 3 dedicated pytest tests).

---

*Verified: 2026-05-11T17:30:00Z*
*Verifier: Claude (gsd-verifier)*
