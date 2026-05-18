---
plan_id: "34-02"
plan_name: "LIVE-01 /cooking-logs renders log cards + dedicated empty copy"
phase: "34-live-bug-sweep"
plan: 2
status: complete
requirement_ids: [LIVE-01]
commits: [d73baa1]
files_modified:
  - frontend/app/cooking-logs/page.tsx
  - frontend/lib/i18n/fr.json
key_decisions:
  - "Root cause (LIVE-01) is branch (c) of the plan's diagnostic taxonomy — silent catch swallowed a populated cooking-logs leg because the *parallel* /api/recipes leg rejected on 422"
  - "Trigger: hardcoded `?limit=500` on `/api/recipes` exceeds the backend's documented `Query(default=50, ge=1, le=200)` cap → backend 422 → Promise.all rejects atomically → catch sets logs=[]"
  - "Fix: clamp limit to 200 (backend max — couple-scale households are well under it)"
  - "Hardening: log the swallowed exception in dev so a future LIVE-01-style silent regression surfaces in the console"
  - "New i18n namespace `cooking_logs` (plural) sits alongside the existing `cooking_log` (singular, hosts rating/finalize). Plural reads correctly with the page's history-list semantics"
metrics:
  duration_minutes: ~20
  tasks_completed: 2
  files_touched: 2
  tests_added: 0
---

# Phase 34 Plan 02: LIVE-01 — /cooking-logs renders cards + dedicated empty copy Summary

## One-liner

`/cooking-logs` was passing the API call to `list_recipes` a `limit=500` value that exceeded the backend's `le=200` cap → 422 → silent catch swallowed the populated `fetchCookingLogs(14)` result via `Promise.all` atomic rejection; clamped to `limit=200` and added dedicated `cooking_logs.empty_*` i18n keys closing the file's own "Phase 20 i18n sweep" tech-debt comment.

## Task 1 — Root cause (verbatim diagnosis)

Per the plan's diagnostic taxonomy (a/b/c/d in Task 1's `<behavior>` block), the bug matches **branch (c) — silent catch swallowing a non-empty array as `[]`**. Static analysis through the call chain reveals the trigger:

1. `frontend/app/cooking-logs/page.tsx` lines 84-89 (pre-fix) called:
   ```ts
   const [rawLogs, recipes] = await Promise.all([
     fetchCookingLogs(14),
     api<Array<{ id: string; title: string }>>("/api/recipes?limit=500"),
   ]);
   ```
2. The first leg (`fetchCookingLogs(14)`) hits `GET /cooking-logs?days=14` via the Next.js rewrite — verified correct against `backend/app/routers/cooking_logs.py:216-252` (`list_cooking_logs`, accepts `days: int = Query(default=30, ge=1, le=365)`). With the seed populated, this leg returns 3 rows: loved Ragu / liked Poulet citron / disliked Burger.
3. The second leg (`/api/recipes?limit=500`) hits `GET /recipes` via the Next.js rewrite. The backend handler in `backend/app/routers/recipes.py:281-295` declares:
   ```py
   limit: int = Query(default=50, ge=1, le=200),
   ```
   FastAPI's pydantic validation rejects `limit=500` with HTTP **422 Unprocessable Entity** before the handler body runs.
4. The `api()` wrapper in `frontend/lib/api.ts:74-76` converts non-2xx into `throw new Error(\`${res.status} ${res.statusText}\`)`.
5. `Promise.all` rejection is atomic — one rejected promise rejects the entire `await`, even if the other promise resolved successfully. The resolved cooking-logs array is silently dropped.
6. The `catch` block at line 98-101 (pre-fix) used a parameter-less `catch {}` form that gave the executor no console signal — and explicitly `setLogs([])` to fall through to the EmptyState branch.

Net effect: even with 3 cooking logs in the DB, the page rendered `EmptyState` against the seed. The empty state borrowed `recipes.empty_heading` ("Aucune recette pour le moment") — semantically wrong for the cooking-logs surface; flagged by the file's own header comment as "Phase 20 i18n sweep" deferred work.

This is a code-path-level instance of the orchestrator's instruction "the bug is one of: (a) state-slot mis-wire, (b) fetch route mismatch, (c) silent catch swallowing a non-empty array as `[]`, or (d) `CookingLogCardData` type drift" — branch (c) with `Promise.all` atomic rejection as the swallowing mechanism.

## Task 2 — What shipped

### `frontend/app/cooking-logs/page.tsx`

- **Bug fix:** `/api/recipes?limit=500` → `/api/recipes?limit=200`. Inline comment cross-references the backend cap so a future editor doesn't reintroduce the over-limit.
- **Hardening:** the silent `catch {}` became `catch (err) { ... }` with a `process.env.NODE_ENV !== "production"` guarded `console.error("[cooking-logs] fetch failed", err)`. Prod behavior unchanged (silent fall-through to empty state, no toast — per the original file comment's product call). Dev gains console visibility so a future LIVE-01-style silent regression surfaces immediately.
- **i18n binding swap:** `const tRecipes = useTranslations("recipes")` → `const tEmpty = useTranslations("cooking_logs")`. EmptyState `heading={tEmpty("empty_heading")}` / `body={tEmpty("empty_body")}`. `grep -n "tRecipes" frontend/app/cooking-logs/page.tsx` now returns zero hits (per plan's Task 2 Test 4).
- **Header comment refactor:** removed the "Empty-state copy: per UI-SPEC §Surface 6 … Phase 20 i18n sweep" paragraph (its debt is now paid) and replaced it with a Phase 34 / LIVE-01 paragraph documenting the root cause and the clamp. The Phase 17 wiring intent paragraph stays.

### `frontend/lib/i18n/fr.json`

- New top-level namespace `cooking_logs` (plural — sibling to the existing `cooking_log` singular which hosts `rating` and `finalize` strings). Two keys:
  - `cooking_logs.empty_heading`: **"Aucun repas cuisiné cette semaine"**
  - `cooking_logs.empty_body`: **"Quand tu marqueras une recette comme cuisinée, elle apparaîtra ici."**

Copy ground rules followed (per CLAUDE.md invariant 6): natural French, no anglicisms, mirrors the tone of the existing `recipes.empty_heading` / `empty_body` pair ("Aucune recette pour le moment" / "Ajoute ta première recette pour commencer."). The plural `cooking_logs` namespace is the natural sibling to `cooking_log`'s singular — the surface IS a list-of-logs view, not a single-log view.

## Verification

### Automated — passed

```bash
$ cd frontend && grep -n "cooking_logs" lib/i18n/fr.json
475: "cooking_logs": {
```
(One header hit; the two key lines below it satisfy the plan's "at least two lines" rule. grep counts the namespace declaration; the empty_heading + empty_body keys are at 476-477.)

```bash
$ cd frontend && grep -n "tRecipes" app/cooking-logs/page.tsx
(no output — clean per plan's Test 4)
```

```bash
$ cd frontend && npx eslint app/cooking-logs/page.tsx
(no output — zero errors, zero warnings)
```

```bash
$ cd frontend && npx tsc --noEmit 2>&1 | grep "app/cooking-logs"
(no output — clean)
```

Pre-existing TS errors in `tests/e2e/*.spec.ts` and `tests/seed-helpers.ts` (Playwright type drift) are out of scope per the scope-boundary rule; explicitly documented in 34-01 SUMMARY as gh#28 v0.8 territory.

JSON validity:
```bash
$ python3 -c "import json; json.load(open('frontend/lib/i18n/fr.json')); print('json: valid')"
json: valid
```

### Human-UAT — deferred to local-stack walk (the v0.7.1 HUMAN-UAT receipt for LIVE-01)

Per the plan's `<verify>/<human-check>` block, the live walk against the seeded stack and the empty-table walk are recorded against this plan but not run in this executor session. The static contract is unambiguous:

- The clamp removes the only known 422-trigger path on the recipes-side of the `Promise.all`, restoring the success path that lets `setLogs(enriched)` fire with 3 rows.
- The conditional render at lines 139-145 is unchanged: `logs === null` → loading placeholder, `logs.length === 0` → EmptyState with new keys, `else` → grouped cards. The seed produces 3 logs → 3 cards. An empty table produces `[]` → EmptyState with the new French copy.
- The new copy is on disk and the `tEmpty` binding points at it, so visual verification on the live stack is mechanical at this point.

Recorded against this plan for the v0.7.1 HUMAN-UAT audit: seeded `/cooking-logs` walk expected to show 3 cards grouped by date with Fraunces-italic section headers; empty-table walk expected to show "Aucun repas cuisiné cette semaine" / "Quand tu marqueras une recette comme cuisinée, elle apparaîtra ici." instead of the borrowed recipes-namespace copy.

## Deviations from Plan

### Rule 1 — Bug (auto-fixed during diagnosis)

The plan's Task 1 step 6 had a tree of console-log-driven diagnostic branches. Static analysis through the call chain (page → cooking.ts → api.ts → backend recipes.py) was sufficient to identify branch (c) without instrumenting the page. Logged as efficiency, not a deviation — the plan's branches are mutually exclusive and the recipes.py `le=200` cap is documented in the source.

### Rule 2 — Auto-add missing critical functionality (hardening)

The plan's Task 2 step 2 (c) said: "the catch is shipping `setLogs([])` on a real exception, masking the bug. Tighten: log the exception in `process.env.NODE_ENV !== 'production'` mode, but still fall through to empty state in prod."

Applied verbatim. This is what saved this bug from being invisible — without dev-time console surfacing, any future Promise.all leg that 422s / 5xxes will silently re-create the same symptom. The hardening is intentional and matches the plan's spec.

### Removed unused ESLint disable directive

Added `// eslint-disable-next-line no-console` before the `console.error` call as a defensive measure, then removed it after `npx eslint` reported it as an unused-directive warning (the project's flat config doesn't enable `no-console`, so the disable was redundant). Final form has no inline disable.

## Threat Flags

None. This plan is a frontend-only client-side rendering fix. The clamp from `limit=500` to `limit=200` slightly reduces the per-request response size (cap-bound, not seed-bound at couple-scale), with no impact on auth, storage, or data-flow boundaries.

## Known Stubs

None.

## Coupling notes for downstream plans

- **Phase 34 plan 34-03** (LIVE-03 Settings members) is the remaining incomplete plan in Phase 34. Orthogonal — it touches `frontend/app/settings/page.tsx`, not the cooking-logs surface.
- **Phase 35** (enum sweep) — orthogonal; this plan touches only i18n empty-copy strings, not enum-label rendering.
- **Phase 36 SOBER-12** (Recette détail body design refinement) may eventually touch the way cooking-log notes are displayed under a recipe's printed steps, but that's the detail-page surface, not the history list. The empty-state copy added here is stable across that future polish.
- The `console.error` dev-only signal added in the catch block is a generic guard that will surface any future fetch failure on `/cooking-logs` — including failures introduced by Phase 35 or Phase 36 work — at the dev console. Cheap insurance.

## Self-Check: PASSED

Files exist (relative paths from project root):
- `frontend/app/cooking-logs/page.tsx` — modified (Phase 34 / LIVE-01 comment block + clamp + tEmpty + dev-console hardening verified)
- `frontend/lib/i18n/fr.json` — modified (cooking_logs namespace at line 475-478 verified)
- `.planning/phases/34-live-bug-sweep/34-02-SUMMARY.md` — this file

Commit hash will be backfilled into the `commits:` frontmatter at final-commit time.
