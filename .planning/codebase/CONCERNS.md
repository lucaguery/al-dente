# Codebase Concerns

**Analysis Date:** 2026-05-05

## Forward-Looking Risks (Pre-Skeleton State)

The codebase is in W1 pre-skeleton state (frontend: fresh `create-next-app`, backend: one-line stub). All concerns below are *anticipated* risks from SPEC.md and CLAUDE.md that will manifest during feature wiring. They are not bugs yet, but systematic failures waiting to happen.

---

## Enum Drift Between Frontend and Backend

**Issue:** Frontend and backend share locked vocabularies (Season, Cuisine, Mood, Protein) defined in SPEC.md §"Locked vocabularies". Frontend stores them in TypeScript, backend in Python Enum classes.

**Files:**
- `frontend/lib/enums.ts` (does not yet exist)
- `backend/app/models/` or `backend/app/schemas/` (to be created with Pydantic Enums)

**Impact:** When adding a new value (e.g., a cuisine category), forgetting to update both sides causes:
- Frontend sends invalid enum value → backend rejects with 400
- Backend stores value → frontend cannot deserialize, breaks rendering
- Silent data corruption if one side is lenient

**Fix approach:** 
- Create both enum files in W1 (before any capture/voting wiring)
- Add a pre-commit hook or test that validates enum definitions match (e.g., Python script that reads both files and asserts equal sets)
- Document in CLAUDE.md: "Always update `frontend/lib/enums.ts` and backend Enum class in the same commit"
- Consider code generator (e.g., schema-codegen) for W2+ if enum mutation becomes frequent

**Priority:** High — blocks W2 safely.

---

## Next.js Breaking Changes Not in Training Data

**Issue:** SPEC.md pins Next.js 16.2.4 (post-15), which has breaking changes vs. older versions. Frontend AGENTS.md warns: "This version has breaking changes — APIs, conventions, and file structure may all differ from your training data."

**Files:**
- `frontend/next.config.ts`
- `frontend/app/` (entire App Router structure)
- `frontend/AGENTS.md` (warning already in place)

**Impact:**
- Writing code with pre-15 patterns (e.g., `getServerSideProps`, `pages/api/`) will fail silently or behave unexpectedly
- Using deprecated APIs breaks on next deploy
- Service worker integration (`next-pwa`) may have undocumented incompatibilities

**Fix approach:**
- Before wiring any feature, check `frontend/node_modules/next/dist/docs/` for current API docs
- When in doubt about a Next.js API, read the type definitions in `node_modules/next/` directly
- Keep AGENTS.md visible in IDE when writing frontend code
- Test PWA install on both iOS Safari and Android Chrome during W1 skeleton test

**Priority:** High — blocks W1 skeleton validation.

---

## Backend Framework Not Yet Wired

**Issue:** SPEC.md describes a full FastAPI stack with SQLAlchemy, Alembic, bearer-token auth, WebSocket, and background tasks. Backend is currently a one-line print statement.

**Files:**
- `backend/main.py` (stub)
- `backend/pyproject.toml` (no dependencies)
- `backend/app/` (does not exist)
- `backend/alembic/` (does not exist)

**Impact:**
- Wiring FastAPI, SQLAlchemy, and Alembic mid-project is high-friction; late discovery of version conflicts or API mismatches
- No bearer-token auth means unsecured endpoints during development → potential data leak if left in place
- W1 skeleton deployment will fail; WebSocket round-trip test cannot pass

**Fix approach:**
- Complete backend scaffolding (dependencies, app structure, DB connection) before W1 is "done"
- Use `uv` for dependency locking (project already pinned to uv-style pyproject)
- Scaffold Alembic with a baseline migration before adding models
- Test `POST /pings` and `WS /ws` endpoints on Railway before proceeding to feature routers
- Follow SPEC.md's "First concrete action: deploy the skeleton + ping test" *before* any recipe/voting logic

**Priority:** Critical — blocks W1 completion.

---

## Raw Input Preservation (`source_capture`)

**Issue:** SPEC.md §Data model specifies that recipes store `source_capture JSONB NOT NULL` — the original transcript, photo blob paths, or URL. These are kept forever to enable prompt re-runs with improved Gemini instructions.

**Files:**
- `backend/app/models/recipe.py` (to be created)
- Backend endpoints: `POST /recipes/voice`, `POST /recipes/photo`, `POST /recipes/url`

**Impact:**
- If code discards `source_capture` during capture endpoint responses, re-prompting becomes impossible
- No storage strategy → `source_capture` grows unbounded; Supabase free tier (500 MB DB) fills in weeks at scale
- If photo paths in `source_capture` diverge from actual files in Supabase storage, verification fails

**Fix approach:**
- Document the contract: "Never discard `source_capture`, even after successful promotion"
- For photo captures, store both the original blob path AND the cleaned/resized path separately
- Add a retention policy at W4 (productize-later): e.g., compress old source_capture or move to archive storage
- Test that re-prompting works (e.g., load old recipe with original source_capture, call Gemini again, verify result differs from stale structured data)

**Priority:** Medium — becomes urgent at W2 when voice/photo capture wires up.

---

## Localization Debt if Not Wired from Day One

**Issue:** SPEC.md mandates French-only in v0.1, but "all strings via `next-intl` from day 1 (productize-clean tax)." CLAUDE.md warns: "Hardcoded strings are productize-later debt — avoid."

**Files:**
- `frontend/lib/i18n/fr.json` (does not exist; should be created in W1)
- Frontend components: `app/`, `components/`, any JSX with user-facing text

**Impact:**
- If components hardcode French strings, extracting them to i18n files later is tedious and error-prone
- Productize-later (real product with English) requires rework of every component
- User-facing error messages scattered across UI remain untranslated

**Fix approach:**
- Set up `next-intl` in W1 (before any UI is built)
- Create `frontend/lib/i18n/fr.json` with all strings needed for skeleton (welcome, onboarding buttons, menu labels)
- Use `useTranslations()` hook in every component from first commit
- Add a lint rule or ESLint config to warn on hardcoded strings (if tooling permits)
- Document in CLAUDE.md: "Always use `next-intl` even for French-only text"

**Priority:** High — increases W1 setup time, but saves W3+ rework.

---

## Productize-Later TODO Discipline

**Issue:** SPEC.md lists ~12 productize-later features (magic-link auth, English localization, native iOS wrapper, etc.). CLAUDE.md instructs: 'Mark inline as `# TODO(productize)` ... Distinguish from `# TODO` (intra-v0.1 work).'

**Files:**
- Anywhere inline TODOs are written: `backend/`, `frontend/`

**Impact:**
- Without discipline, v0.1 code accumulates shortcuts that read like "TODO: implement real auth" → confusion about what's done
- Productize-later list in SPEC.md becomes stale; hard to prioritize for real product launch
- Code comments drift from SPEC.md; new contributors don't know which shortcuts are intentional

**Fix approach:**
- Agree on a regex for inline markers: `# TODO(productize)` (Python) and `// TODO(productize)` (TypeScript)
- At W4 completion, run `grep -r "TODO(productize)" .` and cross-check against SPEC.md §Productize-later TODOs
- Document in CLAUDE.md: "Every shortcut cut from v0.1 must have a `TODO(productize)` comment with reference to SPEC.md section"
- Optional: add a pre-commit hook that warns if inline `TODO(productize)` is not in SPEC.md (productize-cleanup task for v0.2)

**Priority:** Medium — administrative, but prevents future confusion.

---

## Voting State Machine Requires Computed State

**Issue:** SPEC.md §Voting specifies that recipe vote states (Validé / Pressenti / Contesté / Rejeté / Sans avis) are *computed* from rows in the `votes` table, not stored. CLAUDE.md architecture invariant #2: "Don't add a `state` column."

**Files:**
- `backend/app/models/vote.py` (to be created with no `state` column)
- `backend/app/schemas/shortlist.py` (to be created; must include state-derivation logic)
- `backend/app/routers/shortlist.py` (to be created)

**Impact:**
- If a `state` column is added for convenience, it drifts out of sync with votes (race condition between vote creation and state update)
- Veto window (closes on first `CookingLog`) is a temporal constraint; computed state requires querying logs in the same transaction as vote reads
- Frontend rendering of state (color badges, visibility) depends on correct server-side computation

**Fix approach:**
- Define a `@staticmethod` or pure function in backend service: `def compute_vote_state(shortlist_id: UUID, recipe_id: UUID, votes: list[Vote], logs: list[CookingLog]) -> VoteState`
- Never store `state` on the votes table
- Test that state flips to Rejeté when both members vote no; flips to Pressenti when one votes yes and logs exist
- Document in CLAUDE.md: "Vote state is always derived on read; never add a stored state column"

**Priority:** Medium — architectural, but manifests as bugs in W3 if missed.

---

## Denormalized Fields Require Transactional Updates

**Issue:** SPEC.md specifies that `recipes.last_cooked_at` and `recipes.cook_count` are denormalized (updated in the same transaction as `cooking_logs` insertion). CLAUDE.md invariant #3: "Don't compute on read."

**Files:**
- `backend/app/models/recipe.py` (denormalized fields)
- `backend/app/routers/cooking.py` (cooking log creation)

**Impact:**
- If code computes `cook_count` on read (e.g., `COUNT(*) FROM cooking_logs WHERE recipe_id = ?`), stale shortcuts like "show cached cook_count" create inconsistency
- If `last_cooked_at` is updated separately from log creation, network failure mid-transaction leaves them out of sync
- Performance: computing on read defeats the point of denormalization; shortlist queries slow down

**Fix approach:**
- Use SQLAlchemy's session atomicity to ensure both updates happen in one transaction
- Test: insert cooking log → read recipe.cook_count in same session → assert equals log count
- Audit W3 shortlist queries to ensure they read denormalized fields, not compute counts
- Document in CLAUDE.md: "Denormalized fields are updated in the same DB transaction as their source"

**Priority:** Medium — performance/consistency, appears in W3.

---

## WebSocket Reliability on Railway Free Tier

**Issue:** SPEC.md §Risks budgeted notes: "WebSocket reliability on Railway free tier — Railway sometimes restarts free instances; clients need reconnect-with-backoff."

**Files:**
- `backend/app/routers/ws.py` (to be created)
- `frontend/lib/ws.ts` (to be created)

**Impact:**
- Without reconnect-with-backoff, any Railway restart disconnects all clients; realtime sync stops; app appears frozen
- Users see stale votes, stale recipe list; no error message; silent data inconsistency

**Fix approach:**
- Use a reconnecting WebSocket client library (e.g., `reconnecting-websocket` for TypeScript)
- Implement exponential backoff on client-side reconnect (1s → 2s → 4s → 8s up to ~60s)
- Test W1 skeleton: deliberately stop Railway container, verify clients reconnect within ~10s
- Log reconnect events and failures for debugging
- Document in SPEC.md (or test plan): "Railway free tier restarts are expected; test with intentional disconnect"

**Priority:** Medium — discovered in W1 skeleton deployment test.

---

## Realtime Contract Enforcement

**Issue:** SPEC.md §Architecture invariants #4: "Both clients in a household receive `recipe.created`, `recipe.promoted`, and `vote.created` events. Any new mutation that should sync between phones must broadcast via the realtime helper."

**Files:**
- `backend/app/services/realtime.py` (to be created)
- Backend routers: `households.py`, `recipes.py`, `cooking.py`, `shortlist.py` (must call realtime helper)

**Impact:**
- If a new endpoint (e.g., recipe edit) is added without a broadcast call, one partner's phone doesn't see the change until refresh
- Inconsistent UX: partner A edits recipe, partner B's view stale; app feels broken
- Hard to detect in testing (requires two phones + manual inspection)

**Fix approach:**
- Create a realtime helper function: `async def broadcast_event(household_id: UUID, event_type: str, payload: dict)`
- Add a TODO(productize) comment in each mutation endpoint reminding to call broadcast
- Test W1 skeleton: verify `recipe.created` broadcasts; W3: verify `vote.created` broadcasts
- Add a pre-commit or PR checklist: "Did you broadcast realtime events for this mutation?"

**Priority:** Medium — W1 skeleton should test one broadcast; full validation in W3.

---

## Source Capture Storage and Retrieval

**Issue:** SPEC.md requires storing raw source_capture (transcript, photo blobs, URLs) for re-prompting. But the schema stores photo_paths as Supabase storage paths, not raw blobs.

**Files:**
- `backend/app/models/recipe.py` (source_capture JSONB)
- Backend endpoints: `POST /recipes/photo`, `POST /recipes/voice`, `POST /recipes/url`

**Impact:**
- Photo capture: do we store the raw image blob in source_capture, or just the final Supabase path?
- If blob: source_capture grows; Supabase storage quota exhausts
- If path only: can't re-run if photo is deleted; can't improve extraction if original image is lost
- Voice: transcript lives in source_capture, but if re-prompting with Gemini, do we send the transcript or audio file?

**Fix approach:**
- Document the contract: "source_capture stores the minimal reproducible input. For photos: Supabase path. For voice: transcript. For URL: URL string."
- Test re-prompting: load old recipe, re-run Gemini with source_capture, verify new structured data
- At W2 or W4: consider storing compressed originals (e.g., low-res JPEG for photo) if re-prompting quality becomes a concern
- Document in CLAUDE.md or code comment

**Priority:** Medium — impacts W2 voice/photo capture design.

---

## Missing Test Infrastructure

**Issue:** Backend has no test framework; frontend has no test runner configured. SPEC.md build plan allocates ~7-9 weeks for W1, but does not explicitly budget test wiring.

**Files:**
- `backend/tests/` (does not exist)
- `frontend/` (no jest, vitest, or other runner configured)

**Impact:**
- W1 skeleton validation relies on manual two-phone testing; no regression suite
- W2–W4 features (LLM, voting state machine, algorithm) are hard to verify without automated tests
- Enum drift, WebSocket bugs, denormalized field inconsistencies slip through manual testing

**Fix approach:**
- Add `pytest` to backend `pyproject.toml` in W1 (after FastAPI scaffold)
- Add a test runner to frontend (vitest or jest) in W1
- Create skeleton tests: `test_ping_create()`, `test_ws_broadcast()` for W1 validation
- Allocate W2 start: add tests for Gemini calls (mock), capture endpoints
- Document in CLAUDE.md: "Tests are required for algorithm, auth, vote state machine, and realtime"

**Priority:** Medium — deferred to W1 setup, but blocks W2 cleanly.

---

## Next.js PWA Integration Uncertainty

**Issue:** SPEC.md uses `next-pwa` plugin for service worker + manifest. SPEC.md §Risks notes: "iOS Safari PWA quirks (e.g., aggressive cache, occasional service worker bugs)."

**Files:**
- `frontend/next.config.ts` (must configure next-pwa)
- `frontend/public/manifest.json` (to be created)
- `frontend/public/icons/{192,512}.png` (to be created)

**Impact:**
- iOS Safari caches aggressively; API calls may return stale data; refresh doesn't clear cache
- Service worker fails to update; users stuck on old code
- Manifest missing or misconfigured; app doesn't install to home screen
- W1 skeleton test (both phones ping via WebSocket) fails due to PWA/cache issues

**Fix approach:**
- Set up `next-pwa` with no-cache for API routes in W1: `cacheHandler: { routes: [{ pattern: '/api/*', strategy: 'network-first' }] }`
- Test PWA install on iOS Safari: open app, close, reopen, verify fresh data
- If cache aggressiveness persists, fall back to runtime cache-busting (query params `?t=<timestamp>`)
- Create manifest.json with icons in W1 skeleton
- Document in SPEC.md §Risks: "If iOS PWA cache breaks, use ?t=<timestamp> cache buster or disable service worker"

**Priority:** High — discovered during W1 skeleton test.

---

## Supabase Free Tier Storage Limits

**Issue:** SPEC.md §Risks notes: "Supabase free tier limits (500 MB DB, 1 GB storage) — couple-scale for years. Monitor at W4."

**Files:**
- Backend endpoints storing files: `POST /recipes/photo`, `PUT /cooking-logs/{id}` (photo upload)
- Photos stored in Supabase storage bucket

**Impact:**
- Recipe photos (≤ 4 per recipe) + cooking log photos (≤ 4 per log) accumulate
- At 2 people × 1 shortlist/day × 1 log/day × 2 MB/photo = ~4 GB/year (exceeds 1 GB free tier)
- Uploads silently fail; users frustrated; no error handling

**Fix approach:**
- Implement server-side image compression (e.g., `Pillow` in Python) before upload
- Store thumbnails (200x200) and full-size (1024x1024) separately
- Estimate storage usage: at W4, calculate GB/month and warn if exceeding budget
- Document in SPEC.md: "Monitor Supabase storage at W4; upgrade or compress if >750 MB used"
- Optional: add a productize-later feature (CDN, external storage) for real product

**Priority:** Low — becomes urgent only at scale (months of heavy use).

---

## Veto Window Edge Case

**Issue:** SPEC.md specifies "Veto window closes on first `CookingLog` for the day. After that, partner can append `.no` votes (signal for v0.2 weighting) but cannot un-cook."

**Files:**
- `backend/app/routers/cooking.py` (create CookingLog)
- `backend/app/routers/shortlist.py` (cast vote)
- Vote state machine logic

**Impact:**
- If vote validation doesn't check log timestamp, partner can vote after cook starts; state machine breaks
- If first log creation doesn't set a window-close flag, subsequent votes aren't gated correctly
- UI must hide vote buttons after log created; if frontend assumes votes always allowed, incorrect UX

**Fix approach:**
- In cooking log creation, query if any log exists for (household, today) before allowing votes to change state
- Add a function: `is_veto_window_open(household_id: UUID, shortlist_date: DATE) -> bool`
- Test: create log for recipe A → attempt vote on recipe A after → assert vote is recorded but state doesn't change to Rejeté
- Document in SPEC.md or code: "Veto window closes on first log of the day, not per-recipe"

**Priority:** Medium — appears in W3 cooking log wiring.

---

## Algorithm Cold-Start Awareness

**Issue:** SPEC.md specifies different shortlist logic for corpus sizes: <10 recipes (no diversification), 10–29 (soft), 30+ (full). The UI should show a "Add more recipes" banner when corpus is small.

**Files:**
- `backend/app/services/algorithm.py` (to be created)
- Frontend: `app/shortlist/page.tsx` (to be created)

**Impact:**
- If algorithm doesn't account for cold-start, first 2 weeks of app use show poor diversification (e.g., all Italian recipes)
- UI doesn't warn user; they think algorithm is bad
- Behavior varies between households with different recipe counts; hard to debug

**Fix approach:**
- Implement `score_recipe()` with corpus-size branching as per SPEC.md
- Return metadata from shortlist endpoint: `{ recipes: [...], corpus_size: N, note: "Add X more for better suggestions" }`
- Frontend displays banner when corpus < 10
- Test: seed 5, 15, 35 recipes → verify diversification increases as per spec

**Priority:** Low — impacts UX quality in W3, not correctness.

---

## Summary Table

| Concern | Files | Priority | Appears in Wave |
|---------|-------|----------|-----------------|
| Enum drift | `frontend/lib/enums.ts`, `backend/app/models` | High | W1 setup |
| Next.js breaking changes | `frontend/app/`, `frontend/AGENTS.md` | High | W1–W2 |
| Backend not scaffolded | `backend/main.py`, `backend/app/` | Critical | W1 completion |
| Raw input preservation | `backend/app/models/recipe.py` | Medium | W2 capture |
| Localization debt | `frontend/lib/i18n/fr.json` | High | W1 setup |
| Productize-later discipline | All files | Medium | Ongoing |
| Vote state machine | `backend/app/schemas/shortlist.py` | Medium | W3 voting |
| Denormalized fields | `backend/app/routers/cooking.py` | Medium | W3 cooking |
| WebSocket reliability | `backend/app/routers/ws.py` | Medium | W1 skeleton test |
| Realtime contract | `backend/app/services/realtime.py` | Medium | W1–W3 |
| Source capture design | `backend/app/models/recipe.py` | Medium | W2 design |
| Test infrastructure | `backend/tests/`, `frontend/` | Medium | W1 setup |
| PWA integration | `frontend/next.config.ts` | High | W1 skeleton test |
| Supabase storage limits | Backend photo endpoints | Low | W4 monitoring |
| Veto window edge case | `backend/app/routers/cooking.py` | Medium | W3 implementation |
| Cold-start algorithm | `backend/app/services/algorithm.py` | Low | W3 UX |

---

*Concerns audit: 2026-05-05*
