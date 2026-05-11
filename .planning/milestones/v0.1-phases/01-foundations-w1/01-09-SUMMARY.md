---
phase: 01-foundations-w1
plan: 09
subsystem: api
tags: [photos, storage, supabase, multipart, fastapi, magic-bytes, mime-validation]

# Dependency graph
requires:
  - phase: 01-foundations-w1
    provides: "RecipeResponse schema, recipe.updated event vocabulary, Recipe.photo_paths column (01-08); Settings.supabase_url + supabase_service_role_key (01-03); broadcast_to_household (01-05)"
provides:
  - "POST /recipes/{recipe_id}/photos endpoint (multipart, Bearer-auth, household-scoped)"
  - "backend/app/services/storage.py::upload_recipe_photo + detect_mime_and_ext"
  - "Magic-byte MIME sniff for JPEG/PNG/HEIC (Content-Type header is ignored)"
  - "8 MiB file-size cap + 4-photo per-recipe cap"
  - "Server-generated storage path layout: {household_id}/{recipe_id}/{uuid}.{ext} (bucket recipe-photos)"
  - "supabase>=2.0 Python SDK wired into backend deps"
affects: [01-10-recipes-frontend-read, 01-11-recipes-frontend-write, W2-capture-photo, W3-cooking-log-photos, W4-album]

# Tech tracking
tech-stack:
  added: ["supabase>=2.0 (storage3 transitive)"]
  patterns:
    - "Magic-byte MIME validation (Content-Type header ignored — defends T-01-09-01)"
    - "Server-generated UUID filename (defends T-01-09-02 path traversal)"
    - "Read MAX_BYTES + 1 to detect oversize without exhausting memory (T-01-09-03)"
    - "Lazy Supabase client init so module import stays env-free for Alembic / tests"
    - "Cross-household 404 (not 403) — consistent with 01-08, no existence probing"
    - "Append photo path + commit + broadcast in one DB tx — D-02 contract"

key-files:
  created:
    - "backend/app/services/storage.py"
    - "backend/app/routers/photos.py"
  modified:
    - "backend/pyproject.toml (add supabase>=2.0)"
    - "backend/uv.lock (regenerated)"
    - "backend/app/main.py (mount photos.router)"

key-decisions:
  - "Bucket name locked: recipe-photos. Path layout locked: {household_id}/{recipe_id}/{uuid}.{ext}, bucket prefix implicit (path stored in recipes.photo_paths is relative-to-bucket)."
  - "MIME allowlist locked for v0.1: image/jpeg, image/png, image/heic. JPEG matched on FF D8 FF; PNG on the 8-byte signature; HEIC by ftyp brand at offset 4 (heic, heix, mif1, msf1, heim, hevc)."
  - "8 MiB hard cap (MAX_BYTES). 4-photo per-recipe cap (MAX_PHOTOS_PER_RECIPE). Both locked for v0.1; tweak in W4 if Album finalization grows the photo budget."
  - "Read-side strategy DEFERRED to 01-10 (read this carefully, planner of 01-10): the bucket is private. The frontend cannot fetch photos directly. 01-10 must add either (a) GET /recipes/{id}/photo-url?path=... that mints a Supabase signed URL via client.storage.from_(BUCKET).create_signed_url(path, expires_in_seconds), OR (b) a backend proxy route that streams bytes. Pick one and lock it in 01-10's plan. Recommendation: signed URLs are cheaper on Railway (no proxy egress) and the FE can cache them per-photo for the URL's lifetime."
  - "# TODO(productize) markers in both files — D-02 revisit trigger: at W2 (CAPTURE-02 multimodal) or W4 (Album finalization), if Railway egress shows up in metrics, switch to Supabase presigned PUT URLs."

patterns-established:
  - "Photo upload pipeline: validate magic bytes → server-gen UUID path → upload to Supabase Storage → append to recipe.photo_paths in same DB tx → broadcast recipe.updated"
  - "Service-role boundary: SUPABASE_SERVICE_ROLE_KEY is referenced ONLY in backend/.env.example and backend/app/* — verified absent from frontend/ via grep"

requirements-completed: [RECIPE-07]

# Metrics
duration: ~12min
completed: 2026-05-06
---

# Phase 1 Plan 9: Photo Upload Backend Summary

**RECIPE-07 photo upload via FastAPI multipart-through-backend (D-02): magic-byte MIME sniff, 8 MiB cap, 4-photo cap, server-generated UUID path, Supabase Storage write, recipe.updated broadcast — all in one DB tx.**

## Performance

- **Duration:** ~12 minutes (Task 1 only; Task 2 is a blocking human-action checkpoint, see below)
- **Started:** 2026-05-06T12:14Z
- **Completed:** 2026-05-06T12:27Z (Task 1)
- **Tasks:** 1 of 2 executed by agent (Task 2 deferred to user)
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- `POST /recipes/{recipe_id}/photos` endpoint live, mounted in `app.main`. Accepts multipart `file=...`, returns the updated `RecipeResponse` (same shape as `GET /recipes/{id}`).
- Magic-byte MIME sniff implemented (`detect_mime_and_ext`) — JPEG/PNG/HEIC pass; non-image bytes return `None`. Smoke test (jpeg/png/heic accept, xml/empty reject) passes against the actual installed module.
- Cross-household isolation encoded: a member of household A receives 404 if they upload to a recipe in B. Same-shape 404 as a nonexistent recipe (no existence-probing leak).
- 4-photo cap returns HTTP 409 with detail `photo limit reached` (matches UI-SPEC copy `Maximum 4 photos par recette.`).
- 413 on oversize (>8 MiB), 415 on non-image MIME, 400 on empty body — all distinct codes for the FE to surface different toasts.
- Path traversal guarded by server-generated `uuid4()` filename — client filename is read but discarded.
- Service-role Supabase key boundary verified by `! grep -rq "SUPABASE_SERVICE_ROLE_KEY" frontend/` (T-01-09-04 mitigation).

## Task Commits

1. **Task 1: supabase dep + storage.py + photos router + main.py mount** — `a1cd060` (feat)

**Plan metadata:** _pending_ — orchestrator owns final-commit (per parallel-executor instructions: STATE.md / ROADMAP.md / SUMMARY-doc commit happens after all wave-7 agents complete).

## Files Created/Modified

- `backend/app/services/storage.py` — magic-byte MIME sniff, 8 MiB cap, server-gen UUID path, lazy Supabase client (D-02 productize-later marker inline)
- `backend/app/routers/photos.py` — `POST /recipes/{id}/photos`, 4-photo cap, cross-household 404, recipe.updated broadcast, `RecipeResponse` returned
- `backend/app/main.py` — added `photos` to the import line + `app.include_router(photos.router)` after recipes/exports
- `backend/pyproject.toml` — added `supabase>=2.0` (transitive: `storage3`, `supabase-auth`, `supabase-functions`, `realtime`)
- `backend/uv.lock` — regenerated by `uv add`

## Decisions Made

- **Bucket layout locked**: `recipe-photos/{household_id}/{recipe_id}/{uuid}.{ext}` per CONTEXT.md D-02. The path stored on `recipes.photo_paths` is relative-to-bucket (no `recipe-photos/` prefix), so 01-10's signed-URL handler will pass the value straight to `client.storage.from_(BUCKET).create_signed_url(path, …)`.
- **MIME allowlist locked**: JPEG, PNG, HEIC. Magic-byte sniff lives in `detect_mime_and_ext` and is the SOLE source of truth — no allowlist on the `Content-Type` header, since clients can lie about it.
- **8 MiB cap + 4-photo cap locked**: at couple-scale, 4 × 8 MiB × ~30 recipes < 1 GB Supabase free tier. Documented as residual concern T-01-09-03; revisit if W4 album feature exposes the limit.
- **`# TODO(productize): D-02` markers** placed at the top of both new files. Revisit trigger documented inline: W2 (CAPTURE-02 multimodal photo capture) or W4 (COOK-03 / Album finalization) IF Railway egress shows up in metrics — at that point switch to Supabase presigned PUT URLs.
- **Lazy Supabase client init** rather than module-level `create_client(...)`. Reason: `app.main` and Alembic both import `app.services.*` transitively at startup, and we don't want missing env vars to crash import — the error surfaces at upload time with a useful message.
- **404 (not 403) on cross-household** matches 01-08's recipes router policy; consistent FE error handling.
- **Read-side strategy explicitly deferred to 01-10** (see frontmatter `key-decisions`).

## Deviations from Plan

None — plan executed exactly as written. Two minor mechanical adjustments worth noting:

1. **`main.py` import line** — the plan's verify command (and example) assumed the import line was `from app.routers import households, pings, ws, recipes, exports, photos`. The actual `main.py` post-01-08 has `from app.routers import auth_session, exports, households, pings, recipes, ws` (alphabetized, with `auth_session` added by phase 01.1 cookie-auth work). I inserted `photos` in alphabetical order: `from app.routers import auth_session, exports, households, photos, pings, recipes, ws`. The plan's `<verify>` regex was loosened to `from app.routers import auth_session, exports, households, photos, pings, recipes, ws` for the actual check. **Functionally identical**, just respects the existing alphabetical order — not a deviation in behavior.
2. **Worktree base reset** — the worktree was initialized off an unrelated commit (`26001b25` — old MVP-spec branch) instead of the wave-7 base (`5b6e09c7` — 01-08 SUMMARY). Per the orchestrator's `<worktree_branch_check>` instructions, I ran `git reset --hard 5b6e09c7…` to align before any work; without this, the plan's references to `app.routers.recipes` and `app.schemas.recipe.RecipeResponse` would have all 404'd. No content lost (the worktree had no committed changes against the wrong base).

## Issues Encountered

- `uv run python -c "..."` initially failed with a Pydantic `ValidationError: database_url Field required` because `Settings` reads from env at module-import time. Resolved by passing a stub `DATABASE_URL='postgresql+psycopg2://x:y@localhost/z'` for the smoke-test invocations only — no code change needed (production sets `DATABASE_URL` in `.env` / Railway env). This is the existing 01-03 settings pattern, not new behavior.

## Threat Model Outcome

All `high`-severity threats from the plan's STRIDE register are addressed by the code committed in this plan:

| Threat ID | Disposition | Where mitigated |
|-----------|-------------|-----------------|
| T-01-09-01 (MIME spoof) | mitigate | `storage.detect_mime_and_ext` ignores `Content-Type` — only magic bytes |
| T-01-09-02 (path traversal) | mitigate | `storage.upload_recipe_photo` builds path from `uuid4() + ext`; client filename discarded |
| T-01-09-03 (DoS oversize) | mitigate | Router reads `MAX_BYTES + 1` then 413's; storage layer re-checks `len(content)` |
| T-01-09-04 (key leak) | mitigate | grep-verified SUPABASE_SERVICE_ROLE_KEY absent from `frontend/` |
| T-01-09-05 (cross-household elevation) | mitigate | `WHERE Recipe.household_id == member.household_id` → 404 on miss |
| T-01-09-08 (public bucket leak) | _Task 2 (human gate)_ | Bucket created with Public=OFF in Task 2 step 1 |

Two `high` items (T-01-09-04 dashboard side, T-01-09-08) are completed at the dashboard layer in Task 2 (human-action), not in code.

## Authentication / External Service Gates

This plan ships as-coded but does NOT smoke-test against a real Supabase Storage bucket — that's Task 2's `checkpoint:human-action`, which is OUTSIDE the executor's automation surface. See "User Setup Required" below.

## User Setup Required

**Task 2 of this plan is a `checkpoint:human-action` that the agent cannot automate.** Before the upload route is functional end-to-end, Luca must:

### Part A — One-time Supabase Storage bucket setup

1. **Create the `recipe-photos` bucket** in the dev Supabase dashboard:
   - Storage → "Create bucket" → name: `recipe-photos` (must match `BUCKET` constant in `storage.py`)
   - Public: **OFF** (bytes are served via signed URLs only — read-side strategy lands in 01-10)
   - File size limit: leave default (server caps at 8 MiB anyway)
2. **Confirm RLS is ON** (default). Service-role bypasses RLS, so no policies needed in v0.1.
3. **Copy the `service_role` key** from Project Settings → API. (Do NOT use the `anon` key — uploads will silently fail with 403.)
4. **Add to `backend/.env`** (local) and **Railway env** (prod):

   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

   Repeat for the prod Supabase project if separate.

### Part B — Smoke test the upload pipeline (Claude can run after Part A)

Run the full Task 2 smoke transcript from `01-09-photo-upload-backend-PLAN.md` lines ~329–379:

- Bootstrap a household, capture the auth token.
- Generate a 64×64 JPEG via `magick`, POST it → expect 201 + `photo_paths` length 1.
- Loop 4 more uploads → expect 4th to return 409 `photo limit reached`.
- Upload a `.txt` file → expect 415.
- Upload a 9 MiB file → expect 413.
- Cross-household upload → expect 404.

Verify the `recipe-photos/{household_id}/{recipe_id}/` folder shows the four 64x64 placeholders in the dashboard. Then clean up.

### Part C — Production verification

`git push` → Railway redeploys → repeat the smoke against the Railway URL with prod Supabase credentials.

### Common failure modes

- **500 on first upload** → service-role key not set in env → re-check Part A step 4.
- **403 from Supabase** → using anon key instead of service_role → re-check Part A step 3.
- **415 on a valid JPEG** → magic bytes off; check `xxd /tmp/p.jpg | head -1` shows `ffd8ff…`.

## Next Phase Readiness

- **For 01-10 (recipes-frontend-read)**: the read-side strategy MUST be picked. Recommended: add `GET /recipes/{id}/photo-url?path=...` to a router (probably `app/routers/photos.py` itself, or `app/routers/recipes.py`) that returns `{"signed_url": "...", "expires_at": "..."}` by calling `client.storage.from_(BUCKET).create_signed_url(path, expires_in=3600)`. The FE in 01-10 then renders `<img src={signedUrl} />`. The SUMMARY's `key-decisions` and `<output>` of the original plan both flag this.
- **For 01-11 (recipes-frontend-write) / W2 capture-photo / W3 cooking-log-photos**: same upload route is reusable from the FE — just `POST /recipes/{id}/photos` with `multipart/form-data` containing `file=...`. The PhotoUploader component (UI-SPEC) chains `POST /recipes/quick` → `POST /recipes/{id}/photos` for the quick-add-with-photo flow.
- **D-02 productize trigger**: leave the markers in place; revisit on Railway egress signal.

## Self-Check: PASSED

Ran on 2026-05-06T12:28Z:

- `[ -f backend/app/services/storage.py ]` → FOUND
- `[ -f backend/app/routers/photos.py ]` → FOUND
- `git log --all --oneline | grep -q a1cd060` → FOUND
- `grep -q "supabase>=2.0" backend/pyproject.toml` → FOUND
- `grep -q "app.include_router(photos.router)" backend/app/main.py` → FOUND
- `! grep -rq SUPABASE_SERVICE_ROLE_KEY frontend/` → CONFIRMED ABSENT
- Magic-byte sniff smoke (jpeg / png / heic / xml / empty / MAX_BYTES) → all assertions PASS

---
*Phase: 01-foundations-w1*
*Completed: 2026-05-06*
