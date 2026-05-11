---
phase: 01-foundations-w1
plan: 12
plan_number: 12
slug: dogfood-cleanup
type: execute
wave: 10
depends_on: [recipes-frontend-write, ping-frontend-and-ws-client]
files_modified:
  - backend/app/main.py
  - backend/app/routers/pings.py
  - backend/app/schemas/ping.py
  - backend/app/models/ping.py
  - backend/app/models/__init__.py
  - backend/alembic/versions/0002_drop_pings.py
  - frontend/components/PingPanel.tsx
  - frontend/app/page.tsx
  - frontend/lib/i18n/fr.json
autonomous: false
requirements: []
must_haves:
  truths:
    - "POST /pings and GET /pings return HTTP 404 (route removed entirely; no stub)"
    - "The pings table no longer exists in dev or prod Supabase Postgres after `alembic upgrade head` (revision 0002)"
    - "Frontend home page no longer renders the ping panel; the route + WS client + recipe pipeline still work end-to-end"
    - "No file in backend/ or frontend/ contains the string 'ping' except in this plan's downgrade migration body and any historical SUMMARY documents"
    - "Realtime fan-out still works for recipe.created and recipe.updated (regression check; the WS path itself is NOT being deleted)"
  artifacts:
    - path: "backend/alembic/versions/0002_drop_pings.py"
      provides: "Alembic down-migration that DROP TABLE pings (irreversible in v0.1; downgrade restores empty table without data)"
  key_links:
    - from: "backend/app/main.py"
      to: "backend/app/routers/pings.py"
      via: "REMOVED — pings.router import + include_router line deleted"
      pattern: "pings.router"
---

<objective>
Honor D-01: now that the W1 round-trip gate has passed (signal: user typed "approved — gate passed" at the end of 01-07), delete the entire ping surface — backend route + Pydantic schema + SQLAlchemy model + Alembic drop-pings migration + frontend PingPanel component + home-page mount + i18n keys. The realtime spine (`services/realtime.py`, `routers/ws.py`, `broadcast_to_household`) STAYS — it's already serving `recipe.created` and `recipe.updated` and will serve `recipe.promoted` (W2) + `vote.created` (W3).

This plan is `autonomous: false` because:
1. The user must confirm the gate has passed (per the explicit gate signal at end of 01-07).
2. The user runs `alembic upgrade head` against prod Supabase (the dev migration runs locally).

Per CONTEXT.md D-01: "delete the endpoint, table, and migration as soon as the round-trip gate passes." The original baseline migration (0001_baseline.py) is NOT touched — that file stays as historical record. We add a forward migration 0002_drop_pings.py that drops the table.

Purpose: D-01 honored, Phase 1 surface area cleaned, no `# TODO(productize): D-01` comments remaining.
Output: A codebase with zero `pings` references in source (excluding migrations and SUMMARY documents); zero `pings` tables in dev + prod Supabase.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundations-w1/01-CONTEXT.md
@.planning/phases/01-foundations-w1/01-07-SUMMARY.md
@CLAUDE.md
@backend/app/main.py
@backend/app/routers/pings.py
@backend/app/schemas/ping.py
@backend/app/models/ping.py
@backend/app/models/__init__.py
@backend/alembic/versions/0001_baseline.py
@frontend/components/PingPanel.tsx
@frontend/app/page.tsx
@frontend/lib/i18n/fr.json
</context>

<interfaces>
This plan only deletes/edits — it adds nothing new to the contract surface.

Files being deleted entirely:
- `backend/app/routers/pings.py`
- `backend/app/schemas/ping.py`
- `backend/app/models/ping.py`
- `frontend/components/PingPanel.tsx`

Files being edited:
- `backend/app/main.py` — remove `pings` from the imports line and the `include_router(pings.router)` line.
- `backend/app/models/__init__.py` — remove `Ping` from imports + __all__.
- `frontend/app/page.tsx` — remove the `<PingPanel />` import + render.
- `frontend/lib/i18n/fr.json` — remove the `ping` block (the realtime block STAYS — that one is shared with future capture/vote events).

Files being added:
- `backend/alembic/versions/0002_drop_pings.py` — `op.drop_table('pings')` and `op.create_table` in downgrade as a stub.
</interfaces>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 1: Confirm the W1 dogfood gate has passed before deletion</name>
  <what-built>
    Nothing yet — this task asks the user to confirm before destructive cleanup runs.
  </what-built>
  <how-to-verify>
    Per CONTEXT.md D-01 and 01-07 Task 3 resume-signal: this cleanup runs ONLY after Luca has typed "approved — gate passed" at the end of plan 01-07.

    Confirm:
    1. Both phones installed the PWA via Add to Home Screen.
    2. Both phones round-trip pings within ~500ms (the SPEC.md "First concrete action" gate).
    3. Reconnect-with-backoff worked when Railway was paused/resumed (REALTIME-03).
    4. There are no open issues blocking 01-07's success criteria.

    If any of those are NOT clean — STOP and fix in a follow-up plan. The ping surface stays until the gate is unambiguously closed.
  </how-to-verify>
  <resume-signal>Type "gate confirmed, cleanup approved" to proceed. Type "hold" to abort and fix the gate first.</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Delete frontend ping code (PingPanel component, home-page mount, ping i18n block)</name>
  <files>frontend/components/PingPanel.tsx, frontend/app/page.tsx, frontend/lib/i18n/fr.json</files>
  <read_first>
    - frontend/app/page.tsx (current state — to identify the PingPanel import + render to remove)
    - frontend/lib/i18n/fr.json (find the `ping` block — the `realtime` block STAYS)
    - .planning/phases/01-foundations-w1/01-07-SUMMARY.md (the gate-passed confirmation)
  </read_first>
  <action>
    1. **Delete `frontend/components/PingPanel.tsx`** entirely (`rm frontend/components/PingPanel.tsx`).

    2. **Edit `frontend/app/page.tsx`**:
       - Remove the `import { PingPanel } from "@/components/PingPanel"` line.
       - Remove the `<PingPanel selfMemberId={memberId} />` render.
       - Remove the surrounding `// TODO(productize): D-01 ...` comment.
       - Remove the `useState`/`useEffect` for `memberId` if it's no longer used elsewhere on the page (it was only there to feed PingPanel). The page reverts to: wordmark `<h1>` + tagline `<p>` + iOS install hint card (the install hint pre-dates the ping panel and STAYS).

    3. **Edit `frontend/lib/i18n/fr.json`** — delete the entire `"ping": { ... }` block. Do NOT touch `"realtime": { ... }` (that block is reused by W2's `recipe.promoted` toast and beyond).

    4. **Sanity check** — no lingering `ping` references except the legitimate `realtime.reconnect_lost` string. From `frontend/`:
       ```bash
       grep -RIn "ping" app components lib --include='*.ts' --include='*.tsx' --include='*.json' \
         | grep -v 'realtime\|reconnect_lost' | grep -v 'mapping\|stepping\|stripping' || echo "clean"
       ```
       Expected: `clean` (the `grep -v` excludes innocent substrings like "mapping").
  </action>
  <verify>
    <automated>cd frontend && ! test -f components/PingPanel.tsx && ! grep -q "PingPanel" app/page.tsx && ! grep -q "TODO(productize): D-01" app/page.tsx && ! grep -q '"ping"' lib/i18n/fr.json && grep -q '"realtime"' lib/i18n/fr.json && grep -q '"reconnect_lost"' lib/i18n/fr.json && npm run lint && npm run build</automated>
  </verify>
  <done>PingPanel deleted; page.tsx clean; ping i18n block removed; realtime block preserved; build passes; sanity grep returns no leftover ping references.</done>
</task>

<task type="auto">
  <name>Task 3: Delete backend ping code (router, schema, model, main.py mount, models/__init__) and write 0002_drop_pings migration</name>
  <files>backend/app/main.py, backend/app/routers/pings.py, backend/app/schemas/ping.py, backend/app/models/ping.py, backend/app/models/__init__.py, backend/alembic/versions/0002_drop_pings.py</files>
  <read_first>
    - backend/alembic/versions/0001_baseline.py (the `op.create_table('pings', ...)` block — copy it verbatim into 0002's downgrade for round-trip safety, even though we'll never downgrade in practice)
    - backend/app/models/__init__.py (current state — to identify the Ping import line to remove)
    - backend/app/main.py (current state — to identify the import + include_router line)
    - For Alembic op.drop_table + op.create_table in a single migration file (with the precise ForeignKey to households + members in the recreate path), consult Context7 (`mcp__context7__`) or read `backend/.venv/lib/python3.12/site-packages/alembic/op.py` if unsure of the API.
  </read_first>
  <action>
    1. **Delete the three backend ping files entirely**:
       ```bash
       rm backend/app/routers/pings.py
       rm backend/app/schemas/ping.py
       rm backend/app/models/ping.py
       ```

    2. **Edit `backend/app/main.py`**:
       - Change the imports line from
         `from app.routers import households, pings, ws, recipes, exports, photos`
         to
         `from app.routers import households, ws, recipes, exports, photos`
       - Remove the `app.include_router(pings.router)` line.
       - Other mounts (households, ws, recipes, exports, photos) UNCHANGED.

    3. **Edit `backend/app/models/__init__.py`**:
       - Remove `from app.models.ping import Ping`.
       - Remove `"Ping"` from the `__all__` tuple.
       - Other imports + __all__ entries UNCHANGED.

    4. **Create `backend/alembic/versions/0002_drop_pings.py`** — forward-only DROP migration with a stub recreate in the downgrade (data IS lost on downgrade — acceptable for v0.1 throwaway data):
       ```python
       """drop pings table (D-01 cleanup post round-trip gate)

       Revision ID: 0002
       Revises: 0001
       Create Date: <auto>

       Per CONTEXT.md D-01, the pings table was throwaway scaffolding to validate
       the W1 round-trip gate (Vercel + Railway + Supabase + WebSocket). Once the
       gate passed (01-07 dogfood signal), this migration drops the table. The
       downgrade is a stub recreate with no rows — there is no data restore path
       in v0.1 because there were no users producing pings worth preserving.
       """
       from alembic import op
       import sqlalchemy as sa
       from sqlalchemy.dialects.postgresql import UUID

       # revision identifiers, used by Alembic.
       revision = "0002"
       down_revision = "0001"
       branch_labels = None
       depends_on = None


       def upgrade() -> None:
           op.drop_table("pings")


       def downgrade() -> None:
           # Best-effort recreate to keep the migration round-trip-safe; rows are lost.
           op.create_table(
               "pings",
               sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
               sa.Column("household_id", UUID(as_uuid=True),
                         sa.ForeignKey("households.id", ondelete="CASCADE"), nullable=False),
               sa.Column("sent_by_member_id", UUID(as_uuid=True),
                         sa.ForeignKey("members.id"), nullable=False),
               sa.Column("note", sa.String(length=120), nullable=True),
               sa.Column("created_at", sa.DateTime(timezone=True),
                         server_default=sa.text("now()"), nullable=False),
           )
       ```

    5. **Verify SQLAlchemy metadata is clean** before applying the migration:
       ```bash
       cd backend
       uv run python -c "from app.db import Base; import app.models; tables = sorted(Base.metadata.tables.keys()); assert 'pings' not in tables, tables; print('OK', tables)"
       ```
       Expected output: `OK ['cooking_logs', 'daily_shortlists', 'households', 'members', 'recipes', 'votes']` (six tables, no pings).

    6. **Apply migration to dev Supabase**:
       ```bash
       cd backend
       uv run alembic upgrade head
       uv run alembic current  # should print '0002 (head)'
       ```
       Then verify in the Supabase dashboard that the `pings` table is gone.

    7. **Run a regression smoke** to confirm `recipe.created` broadcast still works (the realtime spine itself was NOT touched, but a quick belt-and-braces check is cheap):
       ```bash
       cd backend
       uv run uvicorn app.main:app --port 8001 &
       PID=$!; sleep 2
       BASE=http://localhost:8001
       # Confirm /pings is gone:
       test "$(curl -s -o /dev/null -w '%{http_code}' $BASE/pings)" = "404"
       test "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/pings)" = "404"
       # Confirm /recipes still alive:
       test "$(curl -s -o /dev/null -w '%{http_code}' $BASE/recipes)" = "401"
       kill $PID
       ```

    8. **Push to main**. Railway picks up the new revision. The Dockerfile's `CMD` runs `alembic upgrade head` on container start — production Supabase auto-applies 0002. Watch Railway deploy logs for the migration line.

    9. **You verify** in prod Supabase dashboard: `pings` table is gone there too.
  </action>
  <verify>
    <automated>cd backend && ! test -f app/routers/pings.py && ! test -f app/schemas/ping.py && ! test -f app/models/ping.py && ! grep -q "pings" app/main.py && ! grep -q "Ping" app/models/__init__.py && test -f alembic/versions/0002_drop_pings.py && grep -q 'op.drop_table("pings")' alembic/versions/0002_drop_pings.py && grep -q 'down_revision = "0001"' alembic/versions/0002_drop_pings.py && grep -q 'revision = "0002"' alembic/versions/0002_drop_pings.py && uv run python -c "from app.db import Base; import app.models; tables = sorted(Base.metadata.tables.keys()); assert 'pings' not in tables, tables; assert tables == ['cooking_logs', 'daily_shortlists', 'households', 'members', 'recipes', 'votes'], tables; print('OK', tables)" && uv run python -c "from fastapi.testclient import TestClient; from app.main import app; c = TestClient(app); r = c.get('/pings'); assert r.status_code == 404, r.status_code; r2 = c.post('/pings', json={}); assert r2.status_code == 404, r2.status_code; r3 = c.get('/recipes'); assert r3.status_code == 401, r3.status_code; print('OK', r.status_code, r2.status_code, r3.status_code)"</automated>
  </verify>
  <done>Three backend ping files removed; main.py + models/__init__.py cleaned; 0002 migration committed with proper revision linkage; dev Supabase migration applied + verified; prod Supabase migration auto-applied via Railway redeploy; regression smoke confirms recipes flow still works.</done>
</task>

<task type="auto">
  <name>Task 4: Final repo-wide grep — no ping references in source (sanity)</name>
  <files></files>
  <read_first>
    - The current state of frontend/ and backend/ source trees after Tasks 2 + 3
  </read_first>
  <action>
    Run a final repo-wide grep to confirm no `ping` references remain in source code (migrations and SUMMARY docs are allowed historical mentions):

    ```bash
    # Frontend
    cd frontend
    grep -RIin "ping" app components lib --include='*.ts' --include='*.tsx' --include='*.json' \
      | grep -vE 'realtime|reconnect_lost|mapping|stepping|stripping|skipping|tipping|wrapping|topping' \
      || echo "frontend clean"

    cd ../backend
    grep -RIin "ping" app --include='*.py' \
      | grep -vE 'mapping|stepping|stripping|skipping|tipping|wrapping' \
      || echo "backend clean"
    ```
    Expected output for both: `clean` (only innocent substrings appear, all excluded by `grep -v`). If anything else appears, hand-edit it out.

    Also confirm the migration history is correct:
    ```bash
    cd backend
    uv run alembic history --verbose | head -40
    ```
    Should show: `0002 (head) → 0001 (baseline) → <base>`.

    No commit/push step here — Tasks 2 and 3 already pushed; this is a verification-only task.
  </action>
  <verify>
    <automated>cd frontend && ! grep -RIin "PingPanel\|/pings\|ping_panel\|ping.created" app components lib --include='*.ts' --include='*.tsx' --include='*.json' && cd ../backend && ! grep -RIin "from app.models.ping\|from app.routers.pings\|from app.schemas.ping\|app.include_router(pings\|class Ping(" app --include='*.py' && uv run alembic history | grep -q "0002" && uv run alembic history | grep -q "0001"</automated>
  </verify>
  <done>Repo-wide greps return no source-tree ping references; alembic history shows both 0001 and 0002.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

This plan REMOVES surface area; it doesn't add any. The realtime spine (token-on-connect, channel keying, broadcast helper) is unchanged.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-12-01 | Tampering | migration applied to prod before code is deployed → /pings 500s | medium | mitigate | Railway free-tier deploy is a rolling restart (NOT blue-green): the old container stops, then the new container starts, `alembic upgrade head` runs, then uvicorn binds. There is a 5-30s 503 window for in-flight requests during the swap, which is acceptable at couple-scale (also tracked as T-01-12-04). The migration applies BEFORE the new code is serving traffic, so by the time `/pings` 404s, the table is already gone — no 500s, just 404s on the deleted route. |
| T-01-12-02 | Tampering | downgrade restores empty pings table; if W1 SUMMARYs reference ping IDs, those become dangling | low | accept | Downgrade in v0.1 is a debug-only operation; data loss is documented in the migration docstring. SUMMARYs don't reference live ping IDs. |
| T-01-12-03 | Information Disclosure | leftover `# TODO(productize): D-01` comments on deleted files would mislead future readers | low | mitigate | Tasks 2 + 3 + 4 grep for lingering references; all D-01 markers were on the deleted files themselves, so deletion eliminates them. |
| T-01-12-04 | Denial of Service | concurrent migration + new code deploy collision | low | accept | At couple-scale (Luca + partner, no traffic), the ~30s window of "/pings 404s" while Railway swaps containers is invisible to users. |

No `high` items. Cleanup plans inherently have low threat surface.
</threat_model>

<verification>
Manual after Tasks 2 and 3:
- Both Supabase databases (dev + prod) have NO `pings` table.
- Frontend home page shows wordmark + tagline + install hint only — no ping panel.
- `curl <railway>/pings` returns 404; `curl <railway>/recipes` returns 401 (proves recipes still served).
- Two phones still receive `recipe.created` events when one creates a new recipe (regression check; the WS path itself wasn't touched).
- Final repo grep reports `clean` for both backend and frontend.
</verification>

<success_criteria>
The repo has zero `pings`/`Ping`/`PingPanel` references in source. Both Supabase projects have the table dropped. The realtime spine continues to work for `recipe.created` / `recipe.updated`. D-01 is honored.

This plan closes Phase 1. The 2-week dogfood gate begins after this is committed; Phase 2 (LLM Capture) does not start until Luca + partner have actually been using the app daily.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-12-SUMMARY.md` documenting:
- Confirmation that 0002 was applied to dev + prod.
- A short note about what STAYED (realtime spine, ws.py, services/realtime.py, broadcast_to_household) vs what WENT (pings router/schema/model/UI/i18n).
- Phase 1 dogfood gate marker: "Phase 1 complete — entering 2-week dogfood. Phase 2 planning blocked until ≥ 2 weeks of daily use observed (per SPEC.md W1 dogfood gate)."
- A pointer to the 5 success-criteria coverage map (across the 12 plans in this phase) for the next planner-checker.
</output>
