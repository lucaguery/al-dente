# Codebase Concerns

**Analysis Date:** 2026-05-19
Snapshot: 2026-05-19

Codebase is at v0.7.1 (Sober Kitchen Finish, shipped 2026-05-18). All concerns below reflect
the repo as it exists now — not anticipated risks but actual observed technical debt,
known gaps, and areas that require care when modifying.

---

## Tech Debt

### Promotion Retry Has No Cap

**Issue:** `recipes.promotion_attempts` increments on every `promote_draft` / `retry_promotion`
call. There is no ceiling — a recipe with a permanently broken Gemini response (malformed JSON,
partial model failure) can be retried indefinitely via `POST /recipes/{id}/retry-promotion`.
**Files:** `backend/app/models/recipe.py:132`, `backend/app/services/llm.py:465,490,1075,1104,1123,1134`
**Impact:** A user can spam the retry endpoint; each call fires a Gemini API request and writes
to the DB. No rate-limit, no lock-out state after N failures.
**Fix approach:** Add `MAX_PROMOTION_ATTEMPTS = 5` constant in `llm.py`. In `promote_draft`,
short-circuit with `status='failed'` and a descriptive `promotion_error` when
`recipe.promotion_attempts >= MAX_PROMOTION_ATTEMPTS`. The `TODO(productize)` comment at
`recipe.py:132` already documents this.

---

### Photo Upload Proxies All Bytes Through Railway

**Issue:** All photo uploads (recipe photos + cooking-log photos) flow as multipart through the
FastAPI backend on Railway rather than directly to Supabase Storage via presigned PUT URLs.
**Files:** `backend/app/routers/photos.py:8`, `backend/app/services/storage.py:6,303`
**Impact:** Railway egress counts for every photo byte. At couple-scale (a few photos/day) this
is within the $5/mo plan, but a spike in photo volume (cooking log photos) could push egress.
More critically, the backend is a serial bottleneck — two simultaneous uploads share the single
uvicorn worker (invariant #7).
**Fix approach:** Switch to Supabase presigned PUT URLs (D-02) at the next CAPTURE or COOK phase.
The backend would issue a short-lived PUT URL; the frontend uploads directly. Three
`TODO(productize): D-02` markers at `photos.py:8`, `storage.py:6`, and `storage.py:303`
track this.

---

### Lock Registry Breaks if Railway Scales Beyond One Container

**Issue:** `services/thread.py` uses a `WeakValueDictionary[UUID, asyncio.Lock]` to serialize
`(recipe_id, position)` turn inserts. This is in-process only.
**Files:** `backend/app/services/thread.py:14,37`
**Impact:** If Railway ever runs two uvicorn workers (e.g., a paid-tier scale-out), the per-process
lock gives no cross-process protection. Position collisions would hit the DB `UNIQUE(recipe_id,
position)` constraint and return 500s.
**Fix approach:** Swap to `pg_advisory_xact_lock(hashtext(recipe_id::text))` per the D-18 note
in `thread.py`. No API change needed — the lock acquisition is an internal helper.

---

### Pre-Phase-35 Summary Turn Chips Need Data Migration

**Issue:** Summary turns created before Phase 35 stored `chips` as `list[str]` (raw enum values).
Phase 35 changed the wire shape to `list[ChipPayload]` (structured objects with `field` + `value`).
A read-side coercion shim (`_coerce_legacy_chips`) in `backend/app/schemas/recipe_turn.py:263`
and a dual-branch renderer in `frontend/components/RecipeThread/SystemBubble.tsx:122` provide
backward compatibility.
**Files:** `backend/app/schemas/recipe_turn.py:256-264`, `frontend/components/RecipeThread/SystemBubble.tsx:122-126`
**Impact:** Both shims are permanent dead weight until all pre-Phase-35 summary turns are
regenerated or migrated. The frontend branch check (`typeof chip === "string"`) never goes away
on its own.
**Fix approach:** Either (a) write a one-shot Alembic data migration that re-serializes all
`summary` turn payloads' `chips` arrays into `ChipPayload` shape, or (b) trigger a re-promotion
for all affected recipes. After migration, remove `_coerce_legacy_chips` and the
`typeof chip === "string"` branch. Tracked as v0.8 follow-up per the comment.

---

### Pending Capture Bubbles Lost on PWA Force-Quit

**Issue:** The capture screen (`/recipes/new`) holds pending bubbles in React state only. If the
user closes the PWA or the browser tab before tapping "Enregistrer", all typed/recorded content
is silently discarded.
**Files:** `frontend/app/recipes/new/page.tsx:54-57`
**Impact:** Accidental loss of a recipe the user was building. No recovery path.
**Fix approach:** Persist pending bubbles to `IndexedDB` (keyed by a session UUID) on every
state change. On mount, rehydrate from `IndexedDB` if a session exists and show a
"Resume draft?" prompt. Tracked as `TODO(productize)` at `page.tsx:54`.

---

### Photo Delete Endpoint Missing

**Issue:** There is no `DELETE /recipes/{id}/photos/{path}` backend endpoint. The
`PhotoUploader` component disables the delete button with a silent `TODO(productize)`.
**Files:** `frontend/components/PhotoUploader.tsx:170`
**Impact:** Users cannot remove mistakenly uploaded photos. `photo_paths` array can only grow
(up to the 4-photo cap). Stale or incorrect photos stay attached to recipes permanently.
**Fix approach:** Add a `DELETE /recipes/{recipe_id}/photos` endpoint that accepts a path in
the request body, removes it from `photo_paths`, deletes the Supabase Storage object, and
broadcasts `recipe.updated`.

---

### WR-02: Seed Misses Phase 24 / Phase 35 Fields on Most Recipes

**Issue:** The dev seed (`backend/app/cli/seed.py`) sets `cook_count=0` and `promotion_attempts=0`
for the 21 seed recipes but does not populate Phase 24 structured fields (`difficulty`,
`manually_edited_fields`) or Phase 35 `ChipPayload`-shaped chips on their summary turns.
The WR-02 warning (acknowledged at v0.5 close) remains open.
**Files:** `backend/app/cli/seed.py:511-515`
**Impact:** Playwright E2E tests and local dev see a degenerate dataset: no difficulty badges,
no dogear chips using the new shape (only the one explicitly patched recipe at `cook_count=12`
has the patina). Test assertions that depend on these fields exercising the full path are
unreliable.
**Fix approach:** Update the seed script to populate `difficulty`, `season`, `mood`, and
`manually_edited_fields` for a representative sample of recipes. Re-serialize summary turn
`chips` fields to `ChipPayload` shape so the E2E tests exercise the production code path.

---

### `cooking-logs/[id]/page.tsx` Has Hardcoded French aria-labels

**Issue:** Three `aria-label` values and one fallback string in
`frontend/app/cooking-logs/[id]/page.tsx` are hardcoded in French, bypassing `next-intl`
(invariant #6).
**Files:** `frontend/app/cooking-logs/[id]/page.tsx:22,145,185,202`
**Impact:** Violates the i18n-from-day-one rule. If the app is ever localized, these strings
require a manual sweep. Screen readers on non-French devices (or future English locale) get
hardcoded French.
**Fix approach:** Add `t("aria_back")`, `t("aria_link_recipe")`, and `t("fallback_no_recipe")`
keys to `fr.json` under the `cooking_logs` namespace and replace the hardcoded strings.
Four `TODO(productize)` markers already flag the exact lines.

---

### `BottomNav` aria-label Hardcoded

**Issue:** One `aria-label` on the central CTA in `frontend/components/BottomNav.tsx:73` is
hardcoded and not routed through `next-intl`.
**Files:** `frontend/components/BottomNav.tsx:73`
**Impact:** Same as above — accessibility label bypasses the i18n layer.
**Fix approach:** Add a `nav.aria_label` key to `fr.json` and replace the hardcoded string.
The `TODO(productize)` comment notes this is pending a new i18n key.

---

### `proxy.ts` Missing `createIntlMiddleware`

**Issue:** `frontend/proxy.ts` contains a `TODO(productize)` noting that it should use
`createIntlMiddleware` from `next-intl` instead of the current manual approach.
**Files:** `frontend/proxy.ts:14`
**Impact:** Locale routing / middleware is not fully integrated with `next-intl`'s recommended
middleware pattern. Low impact at single-locale (French-only), but will require refactor before
adding a second locale.
**Fix approach:** Replace the current proxy middleware with `createIntlMiddleware` from
`next-intl`. No user-visible change; purely structural prep for multi-locale support.

---

## Known Bugs

### URL Capture Never Schedules Promotion BackgroundTask

**Issue:** `POST /recipes/url` creates a draft with `initial_turn_kind='url'` but does not
schedule a `promote_draft` BackgroundTask. URL-captured recipes remain in `draft` status
permanently unless the user manually triggers `POST /recipes/{id}/promote`.
**Files:** `backend/app/routers/recipes.py:237-254`, `frontend/tests/e2e/capture-url.spec.ts:24`
**Impact:** URL captures are the only capture surface that requires an explicit promote step.
The E2E test for promotion is `test.fixme`-marked as permanently disabled until this is resolved.
From a UX perspective, a URL capture that never auto-promotes is silently broken.
**Fix approach:** After `POST /recipes/url` creates the blank recipe and the initial URL turn,
add the `BackgroundTasks.add_task(extract_and_process_url_turn, ...)` + `promote_draft` call
analogous to the other capture surfaces. The `TODO(productize)` at `recipes.py:251-254`
documents the deferred intent.

---

## Security Considerations

### SSRF Protection Incomplete for 6to4 and Deprecated Site-Local IPv6

**Issue:** `_is_safe_url` in `backend/app/services/thread.py` blocks RFC1918, loopback,
link-local, `169.254.169.254`, IPv6 ULA (`fc00::/7`), `::1`, and IPv4-mapped IPv6
(`::ffff:10.x`). It does NOT block 6to4 (`2002::/16`) or deprecated site-local
(`fec0::/10`) IPv6 prefixes.
**Files:** `backend/app/services/thread.py:1254-1258`
**Impact:** A URL containing a 6to4 address encoding an RFC1918 target (e.g.,
`2002:c0a8:0101::` encoding `192.168.1.1`) would pass the SSRF gate. Couple-scale risk
accepted per the in-code comment, but worth noting if the app is ever exposed to untrusted
input at larger scale.
**Fix approach:** Add `2002::/16` and `fec0::/10` to the blocked prefix list in
`_is_safe_url`. One-line change.

---

### CORS `allow_credentials=True` with Wildcard Risk if Config Drifts

**Issue:** `backend/app/main.py` configures `CORSMiddleware` with `allow_credentials=True` and
`allow_origins=settings.cors_origins_list`. The origins list is driven by the
`CORS_ALLOWED_ORIGINS` env var (default: `http://localhost:3000`).
**Files:** `backend/app/main.py:101-107`, `backend/app/config.py:15,27-28`
**Impact:** If `CORS_ALLOWED_ORIGINS` is accidentally set to `*` in a Railway env var (e.g.,
during debugging), `allow_credentials=True` + `*` origin is a browser-rejected combination
that silently breaks cross-origin cookie auth — but also means any origin could theoretically
send credentialed requests if the browser were misconfigured. The default value is safe;
the risk is operator misconfiguration.
**Fix approach:** Add a startup assertion in `main.py` that validates
`settings.cors_origins_list` does not contain `"*"` when `environment != "test"`.

---

### Service-Role Key Loaded at First Call (Module-Level Singleton)

**Issue:** `_supabase()` in `backend/app/services/storage.py` creates a module-level
`_client: Client | None` singleton on first call. The Supabase service-role key is read from
`settings.supabase_service_role_key` at that point. This is correct for production (single
process), but means the key is cached in the module's `_client` indefinitely — key rotation
requires a process restart.
**Files:** `backend/app/services/storage.py:100-106`
**Impact:** Key rotation (e.g., a compromised key) requires a Railway redeploy to take effect,
not just an env-var update. Acceptable at couple-scale; worth documenting.
**Fix approach:** Document the "redeploy required on key rotation" contract in `storage.py`.
No code change needed unless key rotation frequency increases.

---

## Performance Considerations

### `llm.py` and `recipes.py` Are Approaching Maintenance-Limit Size

**Issue:** `backend/app/services/llm.py` is 1,345 lines and `backend/app/routers/recipes.py`
is 1,261 lines. Both mix multiple distinct responsibilities.
**Files:** `backend/app/services/llm.py`, `backend/app/routers/recipes.py`
**Impact:** High cognitive load when navigating. `llm.py` contains the Gemini schema, three
LLM call functions, `promote_draft`, `retry_promotion`, `process_thread_turn`, and
`extract_and_process_url_turn`. `recipes.py` covers five capture surfaces, thread endpoints,
advisory endpoints, and retry-promotion. Any change to one concern risks touching
another inadvertently.
**Fix approach:** At v0.8, split `llm.py` into `services/llm_promote.py` (initial promotion),
`services/llm_thread.py` (thread enrichment), and `services/llm_url.py` (URL extraction).
Split `recipes.py` thread/advisory endpoints into a `routers/turns.py` module. No behavior
change; pure extraction.

---

### Recipe Detail Page Is 1,051 Lines of a Single Client Component

**Issue:** `frontend/app/recipes/[id]/page.tsx` at 1,051 lines is the largest file in the
frontend. It is a single `"use client"` component owning hero photo, thread, sticky CTA,
ingredient list, instructions, vote display, and voice-modify sheet.
**Files:** `frontend/app/recipes/[id]/page.tsx`
**Impact:** Any render regression (state update, hook ordering) in any sub-feature requires
scanning the entire file. The component re-renders on every WebSocket message that touches
the recipe.
**Fix approach:** Extract `RecipeHero`, `RecipeIngredientsBlock`, and `RecipeInstructionsBlock`
into sub-components under `frontend/components/RecipeDetail/`. Each sub-component can be
memoized independently.

---

### APScheduler Runs 16:00 Shortlist Cron In-Process

**Issue:** APScheduler is registered in `app/main.py`'s lifespan and runs one cron job per
household at 16:00 household-tz. This is intentional (invariant #7: single worker) but means
the shortlist generation runs on the same thread pool as request handling.
**Files:** `backend/app/main.py:80-92`, `backend/app/services/algorithm.py`
**Impact:** At two-household scale this is negligible. At 10+ households, simultaneous
16:00 cron jobs (if households are in the same timezone) could stall API responses.
**Fix approach:** Move shortlist generation to a separate Railway cron job (or a Railway
background worker) if household count grows beyond ~20. No code change needed until then.

---

## Fragile Areas

### Single Uvicorn Worker Invariant (#7) Is Easy to Break on Railway

**Issue:** Architecture invariant #7 requires exactly one uvicorn worker. APScheduler's
per-household cron jobs and the in-process `WeakValueDictionary` turn lock both depend on this.
Railway's paid tier supports `numReplicas` scaling.
**Files:** `backend/app/main.py`, `backend/app/services/thread.py:37`, `backend/app/services/push.py`
**Impact:** Accidentally setting `numReplicas > 1` in Railway config would cause duplicate
APScheduler cron jobs (N shortlists generated per household at 16:00) and invalid turn-position
locking. No code-level guard prevents this.
**Fix approach:** Add a `RAILWAY_REPLICA_INDEX` env var assertion in the lifespan that logs a
`CRITICAL` warning (but does not abort) if `numReplicas > 1` is detected. Also document in
`backend/CLAUDE.md` that Railway replicas must stay at 1.

---

### `RealtimeProvider` Holds Household-Scoped WebSocket State Globally

**Issue:** `frontend/components/RealtimeProvider.tsx` (331 lines) manages the WebSocket
connection, event fan-out, and reconnect logic. All pages share a single WS connection via
React context.
**Files:** `frontend/components/RealtimeProvider.tsx`
**Impact:** A bug in the reconnect logic or an unhandled WS event silently drops realtime
updates for all pages simultaneously. The component is difficult to unit-test because it
depends on a live WS connection.
**Fix approach:** Extract the reconnect-backoff logic into a standalone `useWebSocket` hook
(`frontend/lib/use-websocket.ts`) that can be tested with a mock WS server. The provider
then becomes thin wiring.

---

### Enum Drift Between `frontend/lib/enums.ts` and `backend/app/models/enums.py`

**Issue:** Locked vocabularies (`Season`, `Cuisine`, `Mood`, `Protein`, `Difficulty`) are
defined in both `frontend/lib/enums.ts` and `backend/app/models/enums.py`. The ENUM-04 grep
gate (`scripts/check-enum-leak.sh`) catches raw vocab in user-facing copy, but does NOT assert
that the two enum files are in sync.
**Files:** `frontend/lib/enums.ts`, `backend/app/models/enums.py`, `scripts/check-enum-leak.sh`
**Impact:** Adding a new value (e.g., a new cuisine) to one file without the other causes 400s
on capture (backend rejects unknown value) or broken rendering (frontend cannot map it to a label).
**Fix approach:** Extend `scripts/check-enum-leak.sh` (or add a new CI check) to extract both
enum value sets and assert they are identical. This mirrors the v0.5 D-18 grep gate discipline.

---

## Test Coverage Gaps

### Skipped: URL Capture Promotion E2E Test

**Issue:** The E2E test `'url draft promotes to structured via canned LLM stub'` in
`frontend/tests/e2e/capture-url.spec.ts:24` is permanently `test.fixme`-marked because
`create_url` in `routers/recipes.py` does not schedule a BackgroundTask.
**Files:** `frontend/tests/e2e/capture-url.spec.ts:23-32`
**Impact:** The URL capture's full promotion loop (draft → structured via
`extract_and_process_url_turn`) is untested end-to-end at the Playwright layer.
**Fix approach:** Fix the underlying bug (see Known Bugs above), then re-enable the test.

---

### Skipped: Two Shortlist-Vote E2E Tests

**Issue:** Two tests in `frontend/tests/e2e/shortlist-vote.spec.ts` are `test.fixme`-marked:
one for HomeDecide not rendering summary state, one for seeded Rejeté state with Shawarma.
**Files:** `frontend/tests/e2e/shortlist-vote.spec.ts:48,123`
**Impact:** The vote summary path and Rejeté state rendering in Accueil are not covered by
Playwright assertions.
**Fix approach:** Investigate whether these fail due to seed data issues or component regressions,
fix the root cause, and un-fixme.

---

### Skipped: Conflit Marginalia E2E Test

**Issue:** `frontend/tests/e2e/recipe-detail.spec.ts:171` has a `test.skip` for the
"conflit" destructive marginalia that appears when a pinned field has an open advisory.
The comment marks it as a Phase 29 dependency.
**Files:** `frontend/tests/e2e/recipe-detail.spec.ts:171`
**Impact:** The advisory conflict rendering path (Phase 29 DETAIL feature) has no automated
coverage.
**Fix approach:** Verify whether Phase 29 shipped the dependency, un-skip the test, and
confirm it passes.

---

### No Playwright Coverage for MediaRecorder or Photo Upload

**Issue:** Voice capture (MediaRecorder API) and photo upload flows have no Playwright E2E
coverage. Deferred to v0.8 with a `uat-tester` agent per the v0.7.1 milestone scope.
**Files:** `frontend/tests/e2e/` (no file covers these paths)
**Impact:** Any regression in `ChatComposer`'s voice recording path or `PhotoUploader` goes
undetected by CI.
**Fix approach:** Add Playwright mocks for `MediaRecorder` (use `page.evaluate` to mock the
API) and for the photo `<input type="file">`. Add one happy-path test per surface.

---

### No Playwright Coverage for Onboarding Flow

**Issue:** The onboarding / join flow (`frontend/app/onboarding/join/page.tsx`, 353 lines)
is not covered by any E2E test.
**Files:** `frontend/app/onboarding/join/page.tsx`
**Impact:** Invite-code validation, household join, and the redirect-to-home path are untested.
Regressions in auth (invariant #8: HttpOnly cookie set) would go undetected.
**Fix approach:** Add an E2E test that seeds an invite code, walks through the join flow,
and asserts the cookie is set and the home page renders.

---

## Human UAT Gaps (Physical-Device Required)

**Issue:** Several verification items cannot be confirmed in code and require physical iPhone
testing. These are tracked in `.planning/` HUMAN-UAT files and surface via `/gsd-audit-uat`.
**Files:**
- `.planning/phases/30-sober-kitchen-port/30-HUMAN-UAT.md` (3 open items)
- `.planning/phases/32-sober-kitchen-finish/32-HUMAN-UAT.md` (4 open items)
**Open items include:**
- iPhone PWA self-heal after force-quit (Phase 30)
- Fresh pictogram render on physical device (Phase 30)
- Post-deploy Alembic migration heal of in-prod `ns0:` SVG rows (Phase 30)
- Live Sober Kitchen visual regression on iPhone Safari (Phase 32, 4 items)
**Impact:** The deployed app may have visual or behavioral regressions on iOS Safari that are
not caught by Playwright (which runs in Chromium).
**Fix approach:** Run `/gsd-audit-uat` and close items during a physical-device session.

---

## Behavioral Validation Gate Pending

**Issue:** The v0.1 definition-of-done included "≥ 2 weeks daily use by both household members"
as a behavioral validation gate. This gate is still pending as of v0.7.1.
**Files:** `.planning/STATE.md:87`
**Impact:** The app has not been validated under real daily-use conditions (both phones, real
recipes, real voting cadence). Edge cases in the voting state machine, shortlist algorithm,
and WebSocket sync may only appear under sustained use.
**Fix approach:** Operate the app in daily use for 2 weeks before declaring the behavioral
gate closed. No code change required.

---

*Concerns audit: 2026-05-19*
