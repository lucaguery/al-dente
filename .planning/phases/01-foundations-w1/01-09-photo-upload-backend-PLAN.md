---
phase: 01-foundations-w1
plan: 09
plan_number: 9
slug: photo-upload-backend
type: execute
wave: 7
depends_on: [recipes-backend]
files_modified:
  - backend/pyproject.toml
  - backend/uv.lock
  - backend/app/main.py
  - backend/app/services/storage.py
  - backend/app/routers/photos.py
autonomous: false
requirements: [RECIPE-07]
must_haves:
  truths:
    - "POST /recipes/{id}/photos (Bearer, multipart) uploads a JPEG/PNG/HEIC ≤ 8 MiB, validates MIME by sniffing magic bytes (NOT trusting Content-Type), streams to Supabase Storage at recipe-photos/{household_id}/{recipe_id}/{uuid}.{ext}, appends the path to recipes.photo_paths in the same DB transaction, broadcasts recipe.updated, returns the updated recipe"
    - "Cross-household isolation: a member of A cannot upload to a recipe in B (404)"
    - "4-photo cap: a 5th upload attempt returns HTTP 409 with detail 'photo limit reached'"
    - "Oversize uploads (> 8 MiB) return HTTP 413; non-image MIMEs return HTTP 415"
    - "Path traversal in the on-disk filename is impossible — server generates uuid4 + extension; client filename is discarded"
    - "Service-role Supabase key never appears in any frontend bundle (it lives only in backend/.env / Railway env)"
  artifacts:
    - path: "backend/app/services/storage.py"
      provides: "upload_recipe_photo(household_id, recipe_id, content, content_type) → storage_path"
    - path: "backend/app/routers/photos.py"
      provides: "POST /recipes/{id}/photos (multipart)"
  key_links:
    - from: "backend/app/routers/photos.py"
      to: "backend/app/services/storage.py"
      via: "upload_recipe_photo() — backend-only Supabase write"
      pattern: "upload_recipe_photo"
    - from: "backend/app/routers/photos.py"
      to: "backend/app/services/realtime.py"
      via: "broadcast_to_household(member.household_id, 'recipe.updated', payload)"
      pattern: "broadcast_to_household.*recipe.updated"
---

<objective>
Wire RECIPE-07 — multipart photo upload through the FastAPI backend to Supabase Storage, per CONTEXT.md D-02. No presigned URLs in v0.1; the service-role Supabase key never reaches the browser bundle. The backend validates MIME by magic bytes (defends against MIME-spoofing), caps file size at 8 MiB, enforces the 4-photo limit, generates the on-disk filename server-side (defends against path traversal), appends to `recipes.photo_paths` in the same DB transaction as the upload, and broadcasts `recipe.updated` so the partner's phone re-renders the photo gallery.

Per D-02, the upload handler carries a `# TODO(productize)` marker: revisit if Railway egress shows up in metrics during W2 (CAPTURE-02 multimodal photo capture lands then) or W4 (Album finalization adds another photo channel). Until then, multipart-through-backend is the simpler debug story.

Purpose: RECIPE-07. Honors D-02, CLAUDE.md invariant 4 (broadcast on every household-syncing mutation — `recipe.updated` here piggybacks on the event vocabulary 01-08 added).
Output: A working `POST /recipes/{id}/photos` endpoint exercised end-to-end against dev Supabase Storage; a recipe row that has accumulated 1–4 storage paths after upload; a Supabase Storage bucket layout `recipe-photos/{household_id}/{recipe_id}/{uuid}.jpg`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundations-w1/01-CONTEXT.md
@.planning/phases/01-foundations-w1/01-UI-SPEC.md
@SPEC.md
@CLAUDE.md
@backend/app/main.py
@backend/app/auth.py
@backend/app/db.py
@backend/app/config.py
@backend/app/models/recipe.py
@backend/app/services/realtime.py
@backend/app/schemas/recipe.py
</context>

<interfaces>
From 01-03 backend-scaffold:
- `app.config.settings.supabase_url` and `supabase_service_role_key` env vars (already in .env.example; values supplied by Luca during the 01-03 Task 3 checkpoint).
- `app.models.Recipe.photo_paths: ARRAY(String)` column.

From 01-08 recipes-backend:
- `RecipeResponse` schema for the response shape.
- `recipe.updated` event vocabulary; we emit one of those after appending the path.

CONTEXT.md locked decisions consumed:
- D-02: "Photos travel through the FastAPI backend as multipart form-data (`POST /recipes/{id}/photos`), backend streams to Supabase Storage, returns the storage path, recipe row's `photo_paths` array is appended in the same request handler."
- "Bucket layout: `recipe-photos/{household_id}/{recipe_id}/{uuid}.jpg`" (from CONTEXT.md `<code_context>` §"Backend ↔ Supabase Storage").
- "`# TODO(productize)` marker on the upload handler" (D-02).

This plan creates a new router at a new path (`backend/app/routers/photos.py`) so it doesn't conflict with `recipes.py`. The route is mounted with prefix `/recipes` and a `{recipe_id}/photos` suffix to match SPEC.md's contract. The plan is autonomous=false because Task 2 needs Luca to create the Supabase Storage bucket once (one-time dashboard click; no CLI in v0.1 to bootstrap a fresh bucket — the supabase-py SDK can read/write but not create-bucket without RLS configuration the user must approve).
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add supabase-py dep + storage.py service (magic-byte MIME sniff + size guard + uuid filename) + photos router</name>
  <files>backend/pyproject.toml, backend/uv.lock, backend/app/services/storage.py, backend/app/routers/photos.py</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"D-02 Photo upload pipeline" (multipart through backend, bucket layout, productize-later marker)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Component Inventory > PhotoUploader.tsx" + §"Surface-by-Surface Pinning" §10 (UI sends multipart; expects path back)
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Copywriting > Error states" — 4-limit copy `Maximum 4 photos par recette.`, oversize copy `Photo non envoyée. Vérifie la taille et réessaie.`
    - SPEC.md §Risks (Supabase free tier limits — 1 GB storage; couple-scale assumed; W4 monitor)
    - For supabase-py SDK upload calls (`storage.from_(bucket).upload(path, file, file_options)`), query Context7 (`mcp__context7__`) with the installed `supabase` package version. The Python SDK's API has shifted across releases — read `backend/.venv/lib/python3.12/site-packages/supabase/__init__.py` for the current export surface if Context7 is unavailable.
    - For FastAPI `UploadFile` + multipart parsing (incl. `python-multipart` already added in 01-03), read `frontend/.venv/lib/python3.12/site-packages/fastapi/datastructures.py` if needed.
  </read_first>
  <action>
    1. **Add Supabase Python SDK**: from `backend/`, `uv add "supabase>=2.0"`. Commit the updated `uv.lock`.

    2. **`backend/app/services/storage.py`** — magic-byte MIME validation + Supabase upload:
       ```python
       """Photo upload to Supabase Storage.

       Per CONTEXT.md D-02, all v0.1 photo bytes traverse the backend (no presigned URLs).
       Service-role key lives only here — never in any frontend bundle.

       # TODO(productize): D-02 — revisit at W2 (CAPTURE-02 multimodal) or W4 (COOK-03 / Album)
       # if Railway egress shows up in metrics. Switch to Supabase presigned PUT URLs at that point.
       """
       from __future__ import annotations
       import logging
       from uuid import UUID, uuid4
       from supabase import Client, create_client
       from app.config import settings

       log = logging.getLogger(__name__)

       BUCKET = "recipe-photos"
       MAX_BYTES = 8 * 1024 * 1024  # 8 MiB hard cap
       ALLOWED_MAGIC: dict[bytes, tuple[str, str]] = {
           # JPEG variants — first 3 bytes are FF D8 FF
           b"\xff\xd8\xff": ("image/jpeg", "jpg"),
           # PNG — 89 50 4E 47 0D 0A 1A 0A
           b"\x89PNG\r\n\x1a\n": ("image/png", "png"),
           # HEIC/HEIF — variable header but 'ftypheic' / 'ftypheix' / 'ftypmif1' / 'ftypmsf1' at offset 4
           # We sniff by checking offset 4-12 in detect_mime() rather than this dict.
       }


       def detect_mime_and_ext(content: bytes) -> tuple[str, str] | None:
           """Sniffs magic bytes. Returns (mime, ext) or None if unrecognized.
           Does NOT trust Content-Type — clients can lie about that.
           """
           if not content:
               return None
           # JPEG
           if content[:3] == b"\xff\xd8\xff":
               return ("image/jpeg", "jpg")
           # PNG
           if content[:8] == b"\x89PNG\r\n\x1a\n":
               return ("image/png", "png")
           # HEIC/HEIF (iOS native)
           if len(content) >= 12 and content[4:8] == b"ftyp":
               brand = content[8:12]
               if brand in (b"heic", b"heix", b"mif1", b"msf1", b"heim", b"hevc"):
                   return ("image/heic", "heic")
           return None


       _client: Client | None = None

       def _supabase() -> Client:
           global _client
           if _client is None:
               if not settings.supabase_url or not settings.supabase_service_role_key:
                   raise RuntimeError("Supabase URL / service-role key not configured")
               _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
           return _client


       def upload_recipe_photo(
           *, household_id: UUID, recipe_id: UUID, content: bytes,
       ) -> str:
           """Validate, generate server-side filename, upload, return the storage path.

           Raises:
               ValueError("oversize") if > MAX_BYTES.
               ValueError("unsupported") if magic bytes don't match an allowed image type.
           Returns:
               The storage path (relative to bucket root): "{household_id}/{recipe_id}/{uuid}.{ext}".
               (NB: bucket name is NOT in the path; the path is what we store in recipes.photo_paths.)
           """
           if len(content) > MAX_BYTES:
               raise ValueError("oversize")
           sniffed = detect_mime_and_ext(content)
           if sniffed is None:
               raise ValueError("unsupported")
           mime, ext = sniffed

           # Server-generated UUID — client-supplied filename is discarded (path-traversal guard).
           # household_id and recipe_id are UUIDs validated by FastAPI's path coercion already.
           path = f"{household_id}/{recipe_id}/{uuid4()}.{ext}"

           client = _supabase()
           # supabase-py upload: client.storage.from_(BUCKET).upload(path, content, file_options={'content-type': mime})
           # The SDK API may differ — consult Context7 / installed README. The behavior we need:
           #   - upload bytes
           #   - set Content-Type to `mime`
           #   - return success or raise on failure
           try:
               client.storage.from_(BUCKET).upload(
                   path=path,
                   file=content,
                   file_options={"content-type": mime, "upsert": "false"},
               )
           except Exception as exc:  # noqa: BLE001
               log.exception("supabase upload failed path=%s err=%s", path, exc)
               raise
           log.info("photo.uploaded household=%s recipe=%s path=%s bytes=%d",
                    household_id, recipe_id, path, len(content))
           return path
       ```

    3. **`backend/app/routers/photos.py`** — the route:
       ```python
       """RECIPE-07 — Photo upload via multipart-through-backend.

       # TODO(productize): D-02 revisit trigger — switch to presigned Supabase PUT URLs
       # at W2 or W4 if Railway egress shows up in metrics.
       """
       from uuid import UUID
       from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
       from sqlalchemy import select
       from sqlalchemy.orm import Session

       from app.auth import current_member
       from app.db import get_db
       from app.models.member import Member
       from app.models.recipe import Recipe
       from app.schemas.recipe import RecipeResponse
       from app.services.realtime import broadcast_to_household
       from app.services.storage import MAX_BYTES, upload_recipe_photo

       router = APIRouter(prefix="/recipes", tags=["recipes-photos"])

       MAX_PHOTOS_PER_RECIPE = 4  # SPEC.md ≤ 4


       @router.post(
           "/{recipe_id}/photos",
           response_model=RecipeResponse,
           status_code=status.HTTP_201_CREATED,
       )
       async def upload_photo(
           recipe_id: UUID,
           file: UploadFile = File(...),
           member: Member = Depends(current_member),
           db: Session = Depends(get_db),
       ) -> RecipeResponse:
           # 1. Recipe MUST belong to the requester's household. 404 (not 403) on cross-household.
           recipe = db.scalar(select(Recipe).where(
               Recipe.id == recipe_id,
               Recipe.household_id == member.household_id,
           ))
           if recipe is None:
               raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")

           # 2. 4-photo cap.
           current_paths = list(recipe.photo_paths or [])
           if len(current_paths) >= MAX_PHOTOS_PER_RECIPE:
               raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="photo limit reached")

           # 3. Read with the size cap. If FastAPI's UploadFile lazily streams, we still
           # cap at MAX_BYTES + 1 to detect oversize without exhausting memory on huge files.
           content = await file.read(MAX_BYTES + 1)
           if len(content) > MAX_BYTES:
               raise HTTPException(
                   status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                   detail=f"file exceeds {MAX_BYTES} bytes",
               )
           if not content:
               raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty upload")

           # 4. Validate magic bytes + upload.
           try:
               path = upload_recipe_photo(
                   household_id=member.household_id,
                   recipe_id=recipe.id,
                   content=content,
               )
           except ValueError as exc:
               if str(exc) == "oversize":
                   raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="oversize")
               if str(exc) == "unsupported":
                   raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="unsupported media")
               raise

           # 5. Append to photo_paths in the same DB tx as the upload (D-02 contract).
           recipe.photo_paths = current_paths + [path]
           db.commit()
           db.refresh(recipe)

           # 6. Broadcast — partner's phone re-renders the gallery.
           payload = RecipeResponse.model_validate(recipe).model_dump(mode="json")
           await broadcast_to_household(member.household_id, "recipe.updated", payload)
           return RecipeResponse.model_validate(recipe)
       ```

    4. **Edit `backend/app/main.py`** — extend the existing `from app.routers import ...` line to include `photos`, and add the include line. Do NOT remove existing mounts:
       ```python
       from app.routers import households, pings, ws, recipes, exports, photos
       ...
       app.include_router(photos.router)  # 01-09 (this plan) — POST /recipes/{id}/photos
       ```
  </action>
  <verify>
    <automated>cd backend && grep -q "supabase" pyproject.toml && test -f app/services/storage.py && test -f app/routers/photos.py && grep -q "TODO(productize): D-02" app/services/storage.py && grep -q "TODO(productize): D-02" app/routers/photos.py && ! grep -rq "SUPABASE_SERVICE_ROLE_KEY" ../frontend/ && grep -q "MAX_PHOTOS_PER_RECIPE = 4" app/routers/photos.py && grep -q "photo limit reached" app/routers/photos.py && grep -q "detect_mime_and_ext" app/services/storage.py && grep -q "household_id == member.household_id" app/routers/photos.py && grep -q "from app.routers import households, pings, ws, recipes, exports, photos" app/main.py && grep -q "app.include_router(photos.router)" app/main.py && uv run python -c "from app.services.storage import detect_mime_and_ext, MAX_BYTES; assert detect_mime_and_ext(b'\xff\xd8\xff\xe0junk') == ('image/jpeg', 'jpg'); assert detect_mime_and_ext(b'\x89PNG\r\n\x1a\nrest') == ('image/png', 'png'); assert detect_mime_and_ext(b'\x00\x00\x00\x18ftypheic\x00\x00\x00\x00') == ('image/heic', 'heic'); assert detect_mime_and_ext(b'<?xml hello') is None; assert MAX_BYTES == 8*1024*1024; print('OK mime sniff')"</automated>
  </verify>
  <done>Storage service + router exist; magic-byte sniff smoke-test passes (jpeg, png, heic accepted; non-image rejected); productize-later markers in place; main.py mount line added; cross-household isolation encoded.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: Create Supabase Storage bucket + RLS off + smoke-test the upload route</name>
  <what-built>
    Backend code is committed and Railway is auto-deploying. The upload route exists; what's missing is the Supabase Storage bucket itself (one-time dashboard click) and the service-role key in Railway env.
  </what-built>
  <how-to-verify>
    Two parts. Claude can do Part B once Part A is done.

    **Part A — Supabase Storage bucket setup (one-time, you do this):**

    1. In your dev Supabase dashboard → Storage → "Create bucket".
       - Name: `recipe-photos` (must match `BUCKET` constant in storage.py)
       - Public: **OFF** (we'll serve via signed URLs in 01-10; bytes are never public).
       - File size limit: leave default (we cap server-side at 8 MiB anyway).
    2. In the bucket → Configuration → make sure RLS is ON (default). For v0.1, since uploads come from the backend with the service-role key, we don't need to author SELECT/INSERT policies — the service-role bypasses RLS. (Productize-later: if we ever switch to presigned URLs (D-02 revisit) we'll need RLS policies; until then the service-role does it all.)
    3. Open Project Settings → API → copy the **service_role** key (it starts with `eyJ...`, longer than the anon key). DO NOT use the anon key — uploads will silently fail.
    4. Add to **backend/.env** (local) and **Railway env** (prod):
       ```
       SUPABASE_URL=https://<project-ref>.supabase.co
       SUPABASE_SERVICE_ROLE_KEY=eyJ...
       ```
       Repeat for the prod Supabase project too if separate.
    5. Confirm: in your dev Supabase Storage dashboard, the `recipe-photos` bucket appears with 0 objects.

    **Part B — Smoke test the upload (Claude runs):**

    6. Restart the local uvicorn (Claude runs `cd backend && uv run uvicorn app.main:app --port 8001 &`) so the new env vars are picked up.
    7. Run this end-to-end script (executor, after Part A is done):
       ```bash
       BASE=http://localhost:8001
       # Bootstrap household + recipe
       CR=$(curl -sS -X POST $BASE/households -H "Content-Type: application/json" \
         -d '{"household_name":"Photo Smoke","member_name":"L","color_hex":"#F43F5E"}')
       T=$(printf '%s' "$CR" | python -c 'import sys,json;print(json.load(sys.stdin)["auth_token"])')
       AUTH="Authorization: Bearer $T"
       R=$(curl -sS -X POST $BASE/recipes -H "$AUTH" -H "Content-Type: application/json" \
         -d '{"title":"Avec photo"}')
       RID=$(printf '%s' "$R" | python -c 'import sys,json;print(json.load(sys.stdin)["id"])')

       # Generate a tiny valid JPEG (use ImageMagick or a checked-in test fixture)
       magick -size 64x64 xc:lightblue /tmp/p.jpg
       # Upload
       UP=$(curl -sS -X POST $BASE/recipes/$RID/photos -H "$AUTH" -F "file=@/tmp/p.jpg")
       printf '%s' "$UP" | python -c 'import sys,json;d=json.load(sys.stdin);assert len(d["photo_paths"])==1,"expected 1 path";assert d["photo_paths"][0].endswith(".jpg"),"path: "+str(d["photo_paths"]);print("OK 1 path:", d["photo_paths"][0])'

       # 4 more uploads should reach the cap on the 5th
       for i in 1 2 3 4; do
         UP=$(curl -sS -w '\n%{http_code}' -X POST $BASE/recipes/$RID/photos -H "$AUTH" -F "file=@/tmp/p.jpg")
         CODE=$(printf '%s' "$UP" | tail -1)
         if [ $i -lt 4 ]; then test "$CODE" = "201" || (echo "expected 201 got $CODE"; exit 1); fi
         if [ $i -eq 4 ]; then test "$CODE" = "409" || (echo "expected 409 got $CODE"; exit 1); fi
       done
       echo "OK 4-photo cap works"

       # Wrong MIME → 415
       echo "this is text not an image" > /tmp/p.txt
       CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/recipes/$RID/photos -H "$AUTH" -F "file=@/tmp/p.txt")
       test "$CODE" = "415" || (echo "expected 415 got $CODE"; exit 1)
       echo "OK 415"

       # Oversize (>8 MiB) → 413
       dd if=/dev/zero bs=1M count=9 of=/tmp/big.jpg 2>/dev/null
       # Make sure it has a JPEG header so MIME passes; then trim+overflow size
       printf '\xff\xd8\xff' | dd of=/tmp/big.jpg bs=3 count=1 conv=notrunc 2>/dev/null
       CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/recipes/$RID/photos -H "$AUTH" -F "file=@/tmp/big.jpg")
       test "$CODE" = "413" || (echo "expected 413 got $CODE"; exit 1)
       echo "OK 413"

       # Cross-household → 404
       CR2=$(curl -sS -X POST $BASE/households -H "Content-Type: application/json" \
         -d '{"household_name":"Other","member_name":"X","color_hex":"#10B981"}')
       T2=$(printf '%s' "$CR2" | python -c 'import sys,json;print(json.load(sys.stdin)["auth_token"])')
       CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/recipes/$RID/photos -H "Authorization: Bearer $T2" -F "file=@/tmp/p.jpg")
       test "$CODE" = "404" || (echo "expected 404 got $CODE"; exit 1)
       echo "OK isolation"
       ```
    8. **You verify in the Supabase dashboard:** the `recipe-photos` bucket now contains a folder structure `{household_id}/{recipe_id}/{4 uuid.jpg files}`. Click one to preview — it should be the lightblue 64x64 placeholder.

    9. Clean up: delete the `recipe-photos/{household_id}/...` folder via dashboard, and `DELETE FROM recipes WHERE title='Avec photo'; DELETE FROM members WHERE household_id IN (SELECT id FROM households WHERE name IN ('Photo Smoke','Other')); DELETE FROM households WHERE name IN ('Photo Smoke','Other');`.

    10. Push to main → Railway redeploys. Repeat the smoke against the Railway URL with prod Supabase credentials.

    Common failure modes:
    - 500 on first upload → service-role key not set in env → re-check Step 4.
    - 403 from Supabase upload → using anon key instead of service_role → re-check Step 3.
    - 415 even on valid JPEG → magic bytes off → check the test fixture has `\xff\xd8\xff` header (`xxd /tmp/p.jpg | head -1`).
  </how-to-verify>
  <resume-signal>Type "approved" with confirmation that the bucket exists and the smoke test passed all 5 assertions (1 path, cap, 415, 413, isolation), or describe what failed.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → POST /recipes/{id}/photos | Bearer-protected; multipart form-data; backend validates everything |
| Railway backend → Supabase Storage | service-role key on backend ONLY; bucket has RLS on (service-role bypasses) |
| recipe.photo_paths column | Server-controlled; PUT /recipes blocklists this field (01-08 T-01-08-02) |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-09-01 | Tampering | MIME-spoofed file (.exe renamed to .jpg with text/plain Content-Type) | high | mitigate | Magic-byte sniff in `detect_mime_and_ext()` (Task 1) — Content-Type is ignored. Smoke test step "Wrong MIME → 415" verifies. |
| T-01-09-02 | Tampering | path traversal via crafted filename (`../../etc/passwd`) | high | mitigate | Server generates `{household_id}/{recipe_id}/{uuid4}.{ext}` (Task 1). Client filename is read but never used in the storage path. |
| T-01-09-03 | Denial of Service | unbounded upload exhausts memory or storage quota | high | mitigate | `MAX_BYTES = 8 MiB` enforced at read time via `await file.read(MAX_BYTES + 1)` then size check (Task 1). At 4 photos × 8 MiB × N recipes the 1 GB Supabase free tier supports ~30 recipes-with-max-photos which is fine for couple-scale. Smoke test "Oversize → 413" verifies. |
| T-01-09-04 | Information Disclosure | service-role Supabase key leaks via env exposure | high | mitigate | Per D-02: key lives only in `backend/.env` (gitignored) and Railway env. `.env.example` documents the boundary. Frontend bundle never has access (only `NEXT_PUBLIC_*` env vars are exposed). |
| T-01-09-05 | Elevation of Privilege | upload to a recipe in another household | high | mitigate | First query `WHERE Recipe.household_id == member.household_id`; cross-household → 404 (Task 1). Smoke test "Cross-household → 404" verifies. |
| T-01-09-06 | Tampering | client bypasses 4-photo cap by parallel concurrent uploads | medium | accept | At couple-scale concurrent uploads from one user are vanishingly rare; the worst case is 5 photos when 4 was the cap, which is not a security issue. Productize-later: row-level lock on `recipes` during upload. Documented as residual risk. |
| T-01-09-07 | Denial of Service | image bomb (16 MB compressed → GBs decompressed) | medium | accept | We do NOT decompress in v0.1 (no thumbnailing — productize-later per CONCERNS.md §"Supabase Free Tier"). The 8 MiB byte cap on upload is sufficient. |
| T-01-09-08 | Information Disclosure | bucket misconfigured public → photos browsable by URL | high | mitigate | Task 2 step 1 explicitly sets bucket to non-public. Photos served via signed URLs (UI-side helper in 01-10 to call `client.storage.from_().create_signed_url()` from the backend if needed — actually the simplest path: 01-10's recipe detail page makes a backend call `GET /recipes/{id}/photo-url?path=...` which returns a signed URL. In W1 we can also just serve via `<img src=` to a backend proxy route, but that's beyond this plan's scope — defer the read-side URL strategy to 01-10). For NOW: bucket is private; reads come later. |
| T-01-09-09 | Information Disclosure | error message leaks Supabase internal path | low | mitigate | We raise generic HTTPException with curated `detail` strings; Supabase exceptions are caught and logged but not surfaced (Task 1 storage.py `except Exception: raise` re-raises but 500 with no detail leak — FastAPI's default 500 body is `{"detail": "Internal Server Error"}`). |

`high` items (01, 02, 03, 04, 05, 08) all addressed in this plan or Task 2's bucket setup.
</threat_model>

<verification>
Manual via the Task 2 checkpoint smoke test (5 assertions: 1 path, cap, 415, 413, isolation). Coverage:

- RECIPE-07 ✓ POST /recipes/{id}/photos accepts multipart, validates magic bytes (JPEG/PNG/HEIC), enforces 8 MiB + 4-photo caps, generates server-side filename, stores to Supabase Storage at `recipe-photos/{household_id}/{recipe_id}/{uuid}.{ext}`, appends to `recipes.photo_paths` in the same DB tx, broadcasts `recipe.updated`.

After this plan passes, 01-10 (frontend) wires the PhotoUploader UI to call this endpoint and the recipe detail page to render the photos via signed URLs.
</verification>

<success_criteria>
The Task 2 checkpoint passes: bucket created, env vars set on local + Railway, smoke transcript clean, dashboard shows the uploaded files in the expected folder structure.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-09-SUMMARY.md` documenting:
- The bucket name `recipe-photos` (locked) and the path layout `{household_id}/{recipe_id}/{uuid}.{ext}`.
- The 8 MiB hard cap and the 4-photo per-recipe cap (locked).
- The MIME allowlist: JPEG, PNG, HEIC (locked for v0.1; tweak in W4).
- A note pointing 01-10 toward the read-side strategy: backend MUST mint signed URLs for the FE because the bucket is private. 01-10 should add a `GET /recipes/{id}/photo-url?path=...` route OR proxy reads via the backend; pick one. Lock the choice in 01-10's plan.
- Productize-later trigger reminder for D-02 (presigned URLs revisit at W2/W4 if egress shows up).
</output>
