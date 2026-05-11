# Phase 17: History feature restoration - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Mode:** Auto (--auto) — Claude picked recommended defaults

<domain>
## Phase Boundary

Three independent fixes closing the cooking-log history loop:

1. **HIST-01 — List endpoint:** `GET /api/cooking-logs?days=N` returns the household's finalized cooking logs for the past N days (default 30). Existing list page `/cooking-logs` calls this and renders cards (author + recipe + date + rating + photo thumbnail). Today the endpoint doesn't exist — page renders empty.
2. **HIST-02 — Detail route:** `frontend/app/cooking-logs/[id]/page.tsx` renders a paper-grain Card detail view (full notes + photo + rating + cooked-by + cooked-at). The route currently has only `[id]/finalize/` (write path); the read path is missing — tapping a card from the list 404s.
3. **FIX-01 (TZ-01) — Timezone filter:** `backend/app/routers/cooking_logs.py:78,123` uses `DateType.today()` (Python local-tz date) against UTC-stored `cooked_at`. At household-tz 22:00 on day D, `cooked_at` is stored as the next-day UTC, and the filter looks for "today in local-tz". Fix: use `household.timezone` (already a column at `models/household.py:32`) to compute "today in household-tz" via `zoneinfo.ZoneInfo`, then compare to `cooked_at AT TIME ZONE` SQL expression.

Out of scope: any new mutation endpoints on cooking logs (notes edit, photo append after finalize); pagination cursors (couple-scale; days=N filter is sufficient); URL-01 capture stub.

</domain>

<decisions>
## Implementation Decisions

### HIST-01: GET /api/cooking-logs list

- **D-17-01:** New endpoint `GET /cooking-logs` (no `/{log_id}` suffix) returns `list[CookingLogResponse]` filtered by:
  - `household_id == member.household_id` (T-04-01-03 contract)
  - `cooked_at >= now() - interval 'N days'` where N comes from `days: int = 30` query param (clamp `1 <= days <= 365`)
  - `rating IS NOT NULL` (finalized only — drafts of active sessions are out via `/cooking-logs/active`)
  - Sort: `ORDER BY cooked_at DESC` (most recent first — the user wants to see what they cooked yesterday at the top).
- **D-17-02:** Response shape: reuse existing `CookingLogResponse` from `schemas/cooking_log.py` — includes recipe FK (frontend resolves title via existing recipes endpoint or via `recipe: RecipeResponse` join). Planner decides whether to add eager-loaded recipe data to the response (cleaner) or have the frontend do N+1 fetches (cheaper to ship).
- **D-17-03:** No realtime broadcast (read-only endpoint, invariant #4 unaffected).
- **D-17-04:** Frontend `frontend/lib/cooking.ts` adds `fetchCookingLogs(days?: number): Promise<CookingLogResponse[]>` mirror. Existing list page `frontend/app/cooking-logs/page.tsx` already calls something — the planner verifies and rewires.

### HIST-02: /cooking-logs/[id]/page.tsx detail route

- **D-17-05:** New file `frontend/app/cooking-logs/[id]/page.tsx` — paper-grain Card chrome consistent with Phase 8's cookbook-chapter-opener gesture. Renders:
  - Header: cooked-at date (Fraunces italic, locale-aware via `Intl.DateTimeFormat('fr-FR')`); cooked-by member name + color chip.
  - Body: full photo (or photo gallery if multiple) at `aspect-square`, terracotta-30 frame; rating chip (loved / liked / disliked French labels); notes paragraph (preserves line breaks).
  - Recipe link: tap-target to `/recipes/{recipe_id}` so the user can re-cook.
- **D-17-06:** Backend GET `/api/cooking-logs/{id}` already exists? — planner verifies. If not, add a single-row GET (member-scoped, household-scoped 404).
- **D-17-07:** No new component — extend existing `CookingLogCard` component (or create a `CookingLogDetail` if the surface diverges enough). Planner picks.

### FIX-01 / TZ-01: timezone-correct date filter

- **D-17-08:** Replace `DateType.today()` at lines 78 and 123 with a household-tz-aware "today" computation:
  ```python
  from zoneinfo import ZoneInfo
  tz = ZoneInfo(household.timezone)  # e.g. "Europe/Paris"
  today_in_tz = datetime.now(tz).date()
  ```
  Then update the SQL filter to compare `cooked_at AT TIME ZONE 'UTC' AT TIME ZONE :tz_name` to `today_in_tz`:
  ```python
  func.date(func.timezone(household.timezone, CookingLog.cooked_at)) == today_in_tz
  ```
- **D-17-09:** This affects 2 callsites: `start_cooking` (line 78 — "another cooking session is active today" 409 guard) and `get_active_cooking_log` (line 123 — "today's unfinalized log" lookup). Both must use the same household-tz boundary.
- **D-17-10:** The HIST-01 list endpoint uses a different filter (`cooked_at >= now() - interval 'N days'`) — no household-tz issue there because it's a relative window, not a day boundary.
- **D-17-11:** Phase 15 Plan 15-04's `cooking-log-create-finalize.spec.ts` is currently `test.fixme` because the double-tap assertion fails when the active-cook lookup returns null due to TZ-01. After FIX-01 lands, the `test.fixme` marker is removed and the spec runs green.

### Test coverage

- **D-17-12:** Backend: add `backend/tests/test_cooking_logs_history.py::test_list_returns_recent_logs` (asserts the list endpoint returns the seeded 3 cooking logs filtered to recent days) and `test_timezone_boundary_late_evening` (creates a log via direct insert at a UTC moment that's "tomorrow" in household-tz, asserts the active-log lookup correctly identifies it under the household-tz boundary).
- **D-17-13:** Frontend e2e: extend the existing `cooking-log-history.spec.ts` (currently `test.fixme` for missing list endpoint per `SURFACED FOR FOLLOW-UP CL-01`) with assertions for both the list page and the detail page navigation. Remove its `test.fixme` marker.
- **D-17-14:** Remove `test.fixme` from `frontend/tests/e2e/cooking-log-create-finalize.spec.ts` (Phase 15's double-tap assertion becomes load-bearing).

### Claude's Discretion

- Whether the list endpoint eager-loads recipe data or accepts N+1 frontend fetches — planner picks.
- Whether the detail page reuses `CookingLogCard` with a `variant="detail"` prop or creates a separate `CookingLogDetail` component.
- Exact zoneinfo error handling for invalid `household.timezone` values (`ZoneInfo` raises `ZoneInfoNotFoundError`) — default to UTC fallback with a warn log.

</decisions>

<canonical_refs>
## Canonical References

- `CLAUDE.md` §Architecture invariants — invariant #3 (denormalized fields) untouched; invariant #4 (broadcast contract) untouched (read-only endpoint); invariant #7 (single uvicorn worker — household.timezone already used by APScheduler at 16:00 daily).
- `SPEC.md` §"Cooking logs" — finalize semantics + photo storage.
- `.planning/v0.3/ASSESSMENT.md` — entries B-5 (Issue #6 missing detail route), B-10 (CL-01 missing list endpoint), and the TZ-01 entry under "Surfaced for follow-up (v0.2.2 backlog)".
- GitHub Issue #6 (detail route 404) — closed-by labels apply.
- `.planning/phases/15-tier-1-invariant-fixes/15-04-SUMMARY.md` §"Phase 17 forward-link" — explicit removal of `test.fixme(` from cooking-log-create-finalize.spec.ts.
- Code sites:
  - `backend/app/routers/cooking_logs.py:78, 123` (TZ-01 bug sites).
  - `backend/app/models/household.py:30-32` (`household.timezone` column).
  - `backend/app/schemas/cooking_log.py` (`CookingLogResponse`).
  - `frontend/app/cooking-logs/page.tsx` (current empty list).
  - `frontend/app/cooking-logs/[id]/finalize/page.tsx` (existing write path, do NOT modify).
  - `frontend/lib/cooking.ts` (frontend API client — add `fetchCookingLogs`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `household.timezone: str` column already exists (Phase 3 — APScheduler 16:00 household-tz cron). Same source of truth for the date-filter boundary.
- `CookingLogResponse` schema already exists at `schemas/cooking_log.py`.
- `CookingLogCard` component already exists at `frontend/components/CookingLogCard.tsx` (Phase 8 — paper-grain, terracotta, Fraunces italic).
- `Intl.DateTimeFormat('fr-FR')` locale-aware date rendering pattern from Phase 7 HomeDecide date header.
- Frontend `/cooking-logs/page.tsx` exists with `useEffect` data fetch shape — planner rewires the fetch URL.

### Established Patterns
- Backend list endpoints use `Query` params with explicit bounds (e.g., `days: int = Query(default=30, ge=1, le=365)`).
- All household-scoped reads return 404 not 403 on cross-household (T-04-01-03).
- `zoneinfo.ZoneInfo` is the canonical Python timezone primitive (Python 3.12 stdlib).

### Integration Points
- Existing recipes list endpoint and `useSession()` are reused; no new auth wire.
- Realtime: NONE — both list and detail are read-only.

</code_context>

<specifics>
## Specific Ideas

- Phase 8's `paper-grain` Card + Fraunces italic date header is the design anchor for the detail page — the user explicitly named cookbook-chapter-opener as the gesture they want.
- `cooking-log-history.spec.ts` and `cooking-log-create-finalize.spec.ts` BOTH have `test.fixme` markers today — both should be removed in Phase 17.

</specifics>

<deferred>
## Deferred Ideas

- Cooking-log notes EDIT after finalize (single mutation path; not on the path to closing CL-01 / B-5). v2 backlog.
- Pagination cursors for >N-days history (couple-scale doesn't justify; days=N is sufficient).
- Multi-photo gallery component (Phase 8 ships single-photo; gallery is v2).
- ICS export of cooking logs (out of scope for v0.4 milestone).

</deferred>

---

*Phase: 17-history-feature-restoration*
*Context gathered: 2026-05-11*
