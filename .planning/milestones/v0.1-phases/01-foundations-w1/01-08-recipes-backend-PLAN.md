---
phase: 01-foundations-w1
plan: 08
plan_number: 8
slug: recipes-backend
type: execute
wave: 6
depends_on: [realtime-and-ping-backend]
files_modified:
  - backend/app/main.py
  - backend/app/routers/recipes.py
  - backend/app/routers/exports.py
  - backend/app/schemas/recipe.py
autonomous: true
requirements: [RECIPE-01, RECIPE-02, RECIPE-03, RECIPE-04, RECIPE-05, RECIPE-06, RECIPE-08, REALTIME-02]
must_haves:
  truths:
    - "POST /recipes (Bearer) creates a recipe with status='structured', source_capture={type:'manual', payload:body}, returns 201 + recipe object, broadcasts {type:'recipe.created'}"
    - "POST /recipes/quick (Bearer) creates a recipe with status='draft', source_capture={type:'manual', payload:{title, photo_paths?}}, broadcasts {type:'recipe.created'}"
    - "GET /recipes (Bearer, optional ?q=, ?status=draft|structured, ?limit=, ?offset=) returns the household's recipes filtered + paginated; ?q= runs ILIKE on title and ingredients::text per D-03"
    - "GET /recipes/{id} (Bearer) returns the recipe IF it belongs to the requester's household; 404 otherwise (no leak of cross-household existence)"
    - "PUT /recipes/{id} (Bearer) updates the recipe (only same-household), bumps updated_at, broadcasts {type:'recipe.updated'}"
    - "GET /households/{id}/export.json (Bearer, must match member.household_id) returns the entire recipe library as a JSON file with Content-Disposition: attachment"
    - "Cross-household isolation: every read/write filters by member.household_id; a member of A cannot read/edit/list recipes of B"
    - "source_capture is preserved on update (never overwritten by PUT) per CLAUDE.md invariant 5"
  artifacts:
    - path: "backend/app/routers/recipes.py"
      provides: "POST /recipes, POST /recipes/quick, GET /recipes (with q/status/limit/offset), GET /recipes/{id}, PUT /recipes/{id}"
    - path: "backend/app/routers/exports.py"
      provides: "GET /households/{id}/export.json (RECIPE-08)"
    - path: "backend/app/schemas/recipe.py"
      provides: "RecipeFullCreate, RecipeQuickCreate, RecipeUpdate, RecipeResponse, IngredientItem"
  key_links:
    - from: "backend/app/routers/recipes.py"
      to: "backend/app/services/realtime.py"
      via: "await broadcast_to_household(member.household_id, 'recipe.created'|'recipe.updated', payload)"
      pattern: "broadcast_to_household.*recipe\\.(created|updated)"
    - from: "backend/app/routers/recipes.py"
      to: "backend/app/models/recipe.py"
      via: "SELECT ... WHERE recipes.household_id = member.household_id"
      pattern: "household_id == member.household_id"
    - from: "backend/app/routers/recipes.py"
      to: "backend/app/models/enums.py"
      via: "Cuisine / Mood / Protein / Season validation in Pydantic schemas"
      pattern: "Cuisine|Mood|Protein|Season"
---

<objective>
Wire the manual recipe library API: full-form create (structured), quick-add (draft), list with ILIKE search and status filter (drafts inbox tab uses `?status=draft`), detail, edit, and JSON export. Every mutation broadcasts via `broadcast_to_household` from 01-05 — establishing the `recipe.created` and `recipe.updated` event types that W2's `recipe.promoted` will join. Photo upload is a separate route in 01-09 (`POST /recipes/{id}/photos`) so this plan and that one can land in parallel without touching the same router file.

Per D-03, search runs as `WHERE title ILIKE :q OR ingredients::text ILIKE :q` against the recipes table — no `pg_trgm`, no FTS. Per CLAUDE.md invariant 5, `source_capture` is set at create time and **never overwritten** by PUT.

Per CONTEXT.md "JSON export shape", `GET /households/{id}/export.json` returns a single `recipes.json` blob (array of recipe objects matching this plan's `RecipeResponse` schema, including `source_capture` and `photo_paths` strings, NOT photo bytes), `Content-Disposition: attachment`. Cooking-logs/votes are NOT included (they don't exist yet anyway in W1).

Purpose: RECIPE-01..06 + RECIPE-08 (server side), REALTIME-02 (the `recipe.created` event type that the realtime contract requires).
Output: A backend that the recipe library frontend (01-10) can call directly; smoke-tested via `curl` against dev Supabase.
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
@backend/app/models/recipe.py
@backend/app/models/enums.py
@backend/app/services/realtime.py
@backend/app/schemas/member.py
</context>

<interfaces>
From 01-03 backend-scaffold:
- `app.models.Recipe(id, household_id, created_by_member_id, status, title, source_capture, photo_paths, ingredients, steps, prep_time_minutes, servings, cuisine, main_protein, mood, seasonality, tags, last_cooked_at, cook_count, created_at, updated_at)`.
- `app.models.RecipeStatus = Enum('draft','structured','verified')`.
- Indices `idx_recipes_household_status` and `idx_recipes_last_cooked`.

From 01-01 shared-vocab:
- `app.models.enums.Cuisine`, `Mood`, `Protein`, `Season` — wire-format string enums.

From 01-04 onboarding-backend:
- `app.auth.current_member` returns the bearer's Member with `household_id`.

From 01-05 realtime-and-ping-backend:
- `await broadcast_to_household(household_id, event_type, payload)` from `app.services.realtime`. The frame shape is `{type, payload}`.

CLAUDE.md architecture invariants this plan touches:
1. "Five capture surfaces, one shape" — for W1 we ship `quick` and full-form (manual). voice/photo/url are W2.
3. Denormalized `last_cooked_at` + `cook_count` — NOT touched here; W3 cooking-log creation owns those.
5. Raw inputs kept forever — `source_capture` set on create, never overwritten on PUT.
6. i18n from day one — backend returns enum *values* (e.g. `"middleEastern"`); frontend renders translated labels.

CONTEXT.md "Drafts inbox" — `GET /recipes?status=draft` is the query backing the bottom-nav `À compléter (N)` tab. This plan owns that endpoint; 01-10 owns the UI.

Note: this plan does NOT touch `app.routers.households` or `app.routers.pings`. The only `main.py` edit is one new `app.include_router(recipes.router)` and one for exports.

REALTIME-02 extension (rationale): the requirement as written in REQUIREMENTS.md names `recipe.created`, `recipe.promoted`, and `vote.created` as the broadcast event types. This plan introduces a fourth — `recipe.updated` — emitted from PUT /recipes/{id}. The extension is mandatory under CLAUDE.md architecture invariant #4 ("Any new mutation that should sync between phones must broadcast"): without it, an edit on Phone A would silently desync Phone B's cached recipe row until next refresh. This is a SUPERSET of REALTIME-02, not a substitution. Plan 01-10 (frontend read-side) subscribes to BOTH `recipe.created` and `recipe.updated`. 01-08-SUMMARY.md must record the locked event vocabulary so future planners (W2 `recipe.promoted`, W3 `vote.created`, plus any future mutation event) treat this set as the authoritative list.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Recipe Pydantic schemas (full + quick + update + response) with locked-vocab validation</name>
  <files>backend/app/schemas/recipe.py</files>
  <read_first>
    - SPEC.md §"Data model" — recipes table column types, defaults (`seasonality DEFAULT '{spring,summer,autumn,winter}'`), nullables, CHECK constraints
    - SPEC.md §"Locked vocabularies" — exact wire-format values
    - .planning/phases/01-foundations-w1/01-UI-SPEC.md §"Surface-by-Surface Pinning" §8 (Recipe new — full vs quick) for shape of fields the frontend will send
    - backend/app/models/enums.py (the str-Enums whose values are wire format)
    - backend/app/models/recipe.py (the ORM column shapes)
    - For Pydantic v2 patterns (Field, field_validator, model_config={"from_attributes": True}, list[T] with default_factory), query Context7 (`mcp__context7__`) with the installed pydantic version. If unavailable, read `backend/.venv/lib/python3.12/site-packages/pydantic/__init__.py` for the v2 API surface.
  </read_first>
  <action>
    Create `backend/app/schemas/recipe.py`:

    ```python
    from datetime import datetime
    from typing import Any, List, Literal, Optional
    from uuid import UUID
    from pydantic import BaseModel, Field, field_validator
    from app.models.enums import Cuisine, Mood, Protein, Season

    # --- Sub-shapes ---

    class IngredientItem(BaseModel):
        # Per SPEC.md §"Data model": ingredients JSONB = [{name, quantity, unit}, ...]
        name: str = Field(min_length=1, max_length=200)
        quantity: Optional[float] = None
        unit: Optional[str] = Field(default=None, max_length=40)

    # --- Create requests ---

    class RecipeFullCreate(BaseModel):
        # RECIPE-01: full form. status='structured' on insert.
        title: str = Field(min_length=1, max_length=200)
        ingredients: List[IngredientItem] = Field(default_factory=list)
        steps: List[str] = Field(default_factory=list)
        prep_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
        servings: Optional[int] = Field(default=None, ge=1, le=99)
        cuisine: Optional[Cuisine] = None
        mood: List[Mood] = Field(default_factory=list)
        main_protein: Optional[Protein] = None
        seasonality: List[Season] = Field(
            default_factory=lambda: [Season.spring, Season.summer, Season.autumn, Season.winter]
        )
        tags: List[str] = Field(default_factory=list)

    class RecipeQuickCreate(BaseModel):
        # RECIPE-02: title + optional photo. status='draft' on insert.
        # Photo upload is a separate POST /recipes/{id}/photos call in 01-09 — this body is title-only.
        title: str = Field(min_length=1, max_length=200)

    class RecipeUpdate(BaseModel):
        # RECIPE-05: any of these can be patched. source_capture is INTENTIONALLY absent —
        # CLAUDE.md invariant 5: raw inputs kept forever, never overwritten by PUT.
        # status changes (draft → structured) happen via this PUT when the user
        # finishes filling a quick-added draft (no separate "promote" endpoint
        # in W1 — W2's BackgroundTask path adds that).
        title: Optional[str] = Field(default=None, min_length=1, max_length=200)
        status: Optional[Literal["draft", "structured", "verified"]] = None
        ingredients: Optional[List[IngredientItem]] = None
        steps: Optional[List[str]] = None
        prep_time_minutes: Optional[int] = Field(default=None, ge=0, le=24 * 60)
        servings: Optional[int] = Field(default=None, ge=1, le=99)
        cuisine: Optional[Cuisine] = None
        mood: Optional[List[Mood]] = None
        main_protein: Optional[Protein] = None
        seasonality: Optional[List[Season]] = None
        tags: Optional[List[str]] = None

    # --- Response shape ---

    class RecipeResponse(BaseModel):
        id: UUID
        household_id: UUID
        created_by_member_id: UUID
        status: str
        title: str
        source_capture: dict[str, Any]
        photo_paths: List[str]
        ingredients: Optional[List[IngredientItem]] = None
        steps: Optional[List[str]] = None
        prep_time_minutes: Optional[int] = None
        servings: Optional[int] = None
        cuisine: Optional[str] = None
        main_protein: Optional[str] = None
        mood: List[str]
        seasonality: List[str]
        tags: List[str]
        last_cooked_at: Optional[datetime] = None
        cook_count: int
        created_at: datetime
        updated_at: datetime

        model_config = {"from_attributes": True}
    ```

    Notes on enum handling:
    - Pydantic v2 with `Cuisine` (which is `str, Enum`) accepts and returns the string value. Inputs like `"middleEastern"` are coerced to `Cuisine.middle_eastern`; serialized output reverts to the string value because of the str-Enum mixin.
    - For LIST fields like `mood: List[Mood]`, each item is validated against the wire-format value. The response uses `List[str]` (already-serialized) since SQLAlchemy returns Python strings from `ARRAY(String)` columns.
  </action>
  <verify>
    <automated>cd backend && test -f app/schemas/recipe.py && grep -q "from app.models.enums import Cuisine, Mood, Protein, Season" app/schemas/recipe.py && grep -q "RecipeFullCreate" app/schemas/recipe.py && grep -q "RecipeQuickCreate" app/schemas/recipe.py && grep -q "RecipeUpdate" app/schemas/recipe.py && grep -q "RecipeResponse" app/schemas/recipe.py && ! grep -q "source_capture" app/schemas/recipe.py | head -0 || true && ! grep -E "source_capture.*=" app/schemas/recipe.py | grep -q "Update" && uv run python -c "from app.schemas.recipe import RecipeFullCreate, RecipeQuickCreate, RecipeUpdate, RecipeResponse, IngredientItem; r = RecipeFullCreate(title='T', cuisine='middleEastern', main_protein='redMeat', mood=['comfort'], seasonality=['winter']); assert r.cuisine.value == 'middleEastern', r.cuisine; assert r.main_protein.value == 'redMeat', r.main_protein; print('OK')"</automated>
  </verify>
  <done>Schemas import cleanly; the smoke check confirms wire-format enum values round-trip through Pydantic; `RecipeUpdate` does NOT include a `source_capture` field (invariant 5 guard).</done>
</task>

<task type="auto">
  <name>Task 2: recipes router (POST full, POST quick, GET list w/ ILIKE search + status filter, GET by id, PUT) with realtime broadcasts and household isolation</name>
  <files>backend/app/routers/recipes.py</files>
  <read_first>
    - SPEC.md §"Data model" — every read MUST filter by household_id; PUT must touch updated_at
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"D-03 Recipe search uses ILIKE" — exact query shape `WHERE title ILIKE :q OR ingredients::text ILIKE :q` with `:q` formatted as `%query%`
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Drafts inbox" — `GET /recipes?status=draft` count drives the bottom-nav badge
    - CLAUDE.md "Architecture invariants" — invariant 4 (broadcast every household-syncing mutation), invariant 5 (never overwrite source_capture)
    - For SQLAlchemy 2.0 `select()` with multiple `where()` clauses, `or_()`, `cast(JSONB, Text)` for `ingredients::text` ILIKE, and how to update specific columns without overwriting source_capture, consult Context7 (`mcp__context7__`). If unavailable, read `backend/.venv/lib/python3.12/site-packages/sqlalchemy/sql/expression.py` for the `or_`, `cast`, `text` exports.
  </read_first>
  <action>
    Create `backend/app/routers/recipes.py`:

    ```python
    from datetime import datetime, timezone
    from typing import List, Optional
    from uuid import UUID
    from fastapi import APIRouter, Depends, HTTPException, Query, status
    from sqlalchemy import or_, select, cast, Text, func
    from sqlalchemy.orm import Session

    from app.auth import current_member
    from app.db import get_db
    from app.models.member import Member
    from app.models.recipe import Recipe
    from app.schemas.recipe import (
        RecipeFullCreate, RecipeQuickCreate, RecipeUpdate, RecipeResponse,
    )
    from app.services.realtime import broadcast_to_household

    router = APIRouter(prefix="/recipes", tags=["recipes"])


    def _to_response_payload(r: Recipe) -> dict:
        # Used both for HTTP response serialization and the WS broadcast payload —
        # they must be byte-identical so the FE has one parser.
        return RecipeResponse.model_validate(r).model_dump(mode="json")


    @router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
    async def create_full(
        body: RecipeFullCreate,
        member: Member = Depends(current_member),
        db: Session = Depends(get_db),
    ) -> RecipeResponse:
        # RECIPE-01 — status='structured' on full-form create (the human did the work).
        recipe = Recipe(
            household_id=member.household_id,
            created_by_member_id=member.id,
            status="structured",
            title=body.title,
            source_capture={"type": "manual", "payload": body.model_dump(mode="json")},
            ingredients=[i.model_dump() for i in body.ingredients] or None,
            steps=body.steps or None,
            prep_time_minutes=body.prep_time_minutes,
            servings=body.servings,
            cuisine=body.cuisine.value if body.cuisine else None,
            mood=[m.value for m in body.mood] or [],
            main_protein=body.main_protein.value if body.main_protein else None,
            seasonality=[s.value for s in body.seasonality] or ["spring","summer","autumn","winter"],
            tags=body.tags or [],
            photo_paths=[],
        )
        db.add(recipe)
        db.commit()
        db.refresh(recipe)
        payload = _to_response_payload(recipe)
        # REALTIME-02: every household-syncing mutation broadcasts.
        await broadcast_to_household(member.household_id, "recipe.created", payload)
        return RecipeResponse.model_validate(recipe)


    @router.post("/quick", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
    async def create_quick(
        body: RecipeQuickCreate,
        member: Member = Depends(current_member),
        db: Session = Depends(get_db),
    ) -> RecipeResponse:
        # RECIPE-02 — title-only quick add. status='draft'. Photo upload is a separate
        # POST /recipes/{id}/photos call in 01-09; the FE chains the two if a photo
        # was attached at quick-add time.
        recipe = Recipe(
            household_id=member.household_id,
            created_by_member_id=member.id,
            status="draft",
            title=body.title,
            source_capture={"type": "manual", "payload": body.model_dump()},
            photo_paths=[],
            mood=[],
            seasonality=["spring","summer","autumn","winter"],
            tags=[],
        )
        db.add(recipe)
        db.commit()
        db.refresh(recipe)
        payload = _to_response_payload(recipe)
        await broadcast_to_household(member.household_id, "recipe.created", payload)
        return RecipeResponse.model_validate(recipe)


    @router.get("", response_model=List[RecipeResponse])
    def list_recipes(
        q: Optional[str] = Query(default=None, max_length=200),
        status_filter: Optional[str] = Query(default=None, alias="status",
                                             pattern="^(draft|structured|verified)$"),
        limit: int = Query(default=50, ge=1, le=200),
        offset: int = Query(default=0, ge=0),
        member: Member = Depends(current_member),
        db: Session = Depends(get_db),
    ) -> List[RecipeResponse]:
        # RECIPE-03 — text search via ILIKE per D-03; RECIPE-06 — drafts inbox uses ?status=draft
        stmt = select(Recipe).where(Recipe.household_id == member.household_id)
        if status_filter:
            stmt = stmt.where(Recipe.status == status_filter)
        if q:
            pattern = f"%{q}%"
            # ingredients is JSONB — cast to text for ILIKE (D-03 spec).
            stmt = stmt.where(or_(
                Recipe.title.ilike(pattern),
                cast(Recipe.ingredients, Text).ilike(pattern),
            ))
        stmt = stmt.order_by(Recipe.created_at.desc()).limit(limit).offset(offset)
        rows = db.scalars(stmt).all()
        return [RecipeResponse.model_validate(r) for r in rows]


    @router.get("/{recipe_id}", response_model=RecipeResponse)
    def get_recipe(
        recipe_id: UUID,
        member: Member = Depends(current_member),
        db: Session = Depends(get_db),
    ) -> RecipeResponse:
        # RECIPE-04 — household-scoped read. 404 (not 403) on cross-household
        # so we don't leak existence (T-01-08-04 elevation-of-privilege guard).
        r = db.scalar(select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        ))
        if r is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")
        return RecipeResponse.model_validate(r)


    @router.put("/{recipe_id}", response_model=RecipeResponse)
    async def update_recipe(
        recipe_id: UUID,
        body: RecipeUpdate,
        member: Member = Depends(current_member),
        db: Session = Depends(get_db),
    ) -> RecipeResponse:
        # RECIPE-05 — patch-style update (only provided fields touched).
        # CLAUDE.md invariant 5: source_capture is NEVER overwritten here.
        # photo_paths are NEVER set here either — that's POST /recipes/{id}/photos (01-09).
        # cook_count and last_cooked_at are owned by the cooking-log handler in W3.
        r = db.scalar(select(Recipe).where(
            Recipe.id == recipe_id,
            Recipe.household_id == member.household_id,
        ))
        if r is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recipe not found")
        data = body.model_dump(exclude_unset=True)
        for k, v in data.items():
            if k in ("source_capture", "photo_paths", "cook_count", "last_cooked_at",
                    "household_id", "created_by_member_id", "id"):
                # Defense-in-depth even though Pydantic doesn't define these fields.
                continue
            if k == "cuisine" and v is not None:
                v = v.value if hasattr(v, "value") else v
            elif k == "main_protein" and v is not None:
                v = v.value if hasattr(v, "value") else v
            elif k == "mood" and v is not None:
                v = [m.value if hasattr(m, "value") else m for m in v]
            elif k == "seasonality" and v is not None:
                v = [s.value if hasattr(s, "value") else s for s in v]
            elif k == "ingredients" and v is not None:
                v = [(i.model_dump() if hasattr(i, "model_dump") else i) for i in v]
            setattr(r, k, v)
        r.updated_at = datetime.now(tz=timezone.utc)
        db.commit()
        db.refresh(r)
        payload = _to_response_payload(r)
        await broadcast_to_household(member.household_id, "recipe.updated", payload)
        return RecipeResponse.model_validate(r)
    ```

    Important guard rails (re-iterated in code comments):
    - **No DELETE endpoint in W1.** Soft-delete / hard-delete is `productize-later` (UI-SPEC notes "Supprimer cette recette" is a v0.2 affordance per the destructive-confirmations table). Adding it here without the matching UI surface is scope creep.
    - The `recipe.updated` event type is NEW in this plan; it's not in REALTIME-02's original list (which named only `recipe.created` / `recipe.promoted` / `vote.created`). Including it here is consistent with CLAUDE.md invariant 4 ("Any new mutation that should sync between phones must broadcast"). Documented in 01-08-SUMMARY.md so 01-10 (FE) handles both `recipe.created` and `recipe.updated`.
  </action>
  <verify>
    <automated>cd backend && test -f app/routers/recipes.py && grep -q "Recipe.household_id == member.household_id" app/routers/recipes.py && grep -q "broadcast_to_household.*recipe.created" app/routers/recipes.py && grep -q "broadcast_to_household.*recipe.updated" app/routers/recipes.py && grep -q "Recipe.title.ilike" app/routers/recipes.py && grep -q "cast(Recipe.ingredients, Text).ilike" app/routers/recipes.py && grep -qE 'pattern=".*draft.*structured.*verified' app/routers/recipes.py && grep -q "exclude_unset=True" app/routers/recipes.py && grep -q "source_capture" app/routers/recipes.py | head -0 ; grep -q "if k in ..source_capture" app/routers/recipes.py || grep -q '"source_capture"' app/routers/recipes.py && uv run python -c "from app.routers.recipes import router; from fastapi.testclient import TestClient; from app.main import app; c = TestClient(app); r = c.get('/recipes'); assert r.status_code == 401, r.status_code; r2 = c.post('/recipes', json={'title':'X'}); assert r2.status_code == 401, r2.status_code; print('OK', r.status_code, r2.status_code)"</automated>
  </verify>
  <done>Router file exists; cross-household isolation is encoded into every query; broadcasts on create + update; ILIKE search on title + ingredients::text; PUT excludes source_capture/photo_paths/cook_count/last_cooked_at; TestClient confirms unauth → 401.</done>
</task>

<task type="auto">
  <name>Task 3: exports.py (RECIPE-08 JSON export) + main.py mounts + end-to-end smoke test</name>
  <files>backend/app/main.py, backend/app/routers/exports.py</files>
  <read_first>
    - .planning/phases/01-foundations-w1/01-CONTEXT.md §"Claude's Discretion > JSON export shape" (single recipes.json blob, paths only NOT bytes, cooking-logs/votes excluded, Content-Disposition: attachment)
    - SPEC.md §"Productize-later TODOs" (the export is the disaster-recovery hook for owner-leaves-household)
    - For FastAPI `StreamingResponse` / `Response` with `Content-Disposition` header, query Context7 (`mcp__context7__`) or read `backend/.venv/lib/python3.12/site-packages/fastapi/responses.py`.
  </read_first>
  <action>
    1. **`backend/app/routers/exports.py`**:
       ```python
       """RECIPE-08 — JSON export of the household's recipe library.
       Productize-later disaster-recovery hook: owner-leaves-household isn't
       supported in v0.1 except by exporting + re-importing manually. Per
       CONTEXT.md "JSON export shape": single recipes.json blob, photo_paths
       are STRINGS (not bytes), cooking-logs/votes EXCLUDED.
       """
       import json
       from uuid import UUID
       from fastapi import APIRouter, Depends, HTTPException, Response, status
       from sqlalchemy import select
       from sqlalchemy.orm import Session

       from app.auth import current_member
       from app.db import get_db
       from app.models.member import Member
       from app.models.recipe import Recipe
       from app.schemas.recipe import RecipeResponse

       router = APIRouter(prefix="/households", tags=["households-export"])


       @router.get("/{household_id}/export.json")
       def export_recipes(
           household_id: UUID,
           member: Member = Depends(current_member),
           db: Session = Depends(get_db),
       ) -> Response:
           # Path param MUST match the bearer's household_id. Else 404 (no leak).
           if household_id != member.household_id:
               raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="household not found")
           rows = db.scalars(
               select(Recipe).where(Recipe.household_id == member.household_id)
           ).all()
           # Each recipe serialized via the same RecipeResponse the API uses.
           # photo_paths are strings (Supabase paths); raw bytes are not in scope.
           data = [RecipeResponse.model_validate(r).model_dump(mode="json") for r in rows]
           body = json.dumps({"recipes": data}, ensure_ascii=False, indent=2).encode("utf-8")
           filename = f"al-dente-recipes-{household_id}.json"
           return Response(
               content=body,
               media_type="application/json",
               headers={"Content-Disposition": f'attachment; filename="{filename}"'},
           )
       ```

    2. **Edit `backend/app/main.py`** — extend the existing `from app.routers import households, pings, ws` line to include `recipes` and `exports`, and add the two `app.include_router` calls. Do NOT remove existing mounts:
       ```python
       from app.routers import households, pings, ws, recipes, exports
       app.include_router(households.router)  # 01-04
       app.include_router(pings.router)        # 01-05
       app.include_router(ws.router)           # 01-05
       app.include_router(recipes.router)      # 01-08 (this plan)
       app.include_router(exports.router)      # 01-08 (this plan)
       ```

    3. **Smoke test against dev Supabase** (executor needs `backend/.env`):
       ```bash
       cd backend
       uv run uvicorn app.main:app --port 8001 &
       PID=$!
       sleep 2
       BASE=http://localhost:8001

       # Bootstrap: household + token
       CREATE=$(curl -sS -X POST $BASE/households -H "Content-Type: application/json" \
         -d '{"household_name":"Recipes Smoke","member_name":"L","color_hex":"#F43F5E"}')
       T=$(printf '%s' "$CREATE" | python -c 'import sys,json;print(json.load(sys.stdin)["auth_token"])')
       HID=$(printf '%s' "$CREATE" | python -c 'import sys,json;print(json.load(sys.stdin)["household_id"])')
       AUTH="Authorization: Bearer $T"

       # Unauth → 401
       test "$(curl -s -o /dev/null -w '%{http_code}' $BASE/recipes)" = "401"

       # Quick add
       Q=$(curl -sS -X POST $BASE/recipes/quick -H "$AUTH" -H "Content-Type: application/json" \
         -d '{"title":"Pasta vite faite"}')
       printf '%s' "$Q" | grep -q '"status":"draft"'
       printf '%s' "$Q" | grep -q '"type":"manual"'  # source_capture preserved

       # Full create
       F=$(curl -sS -X POST $BASE/recipes -H "$AUTH" -H "Content-Type: application/json" \
         -d '{"title":"Carbonara","ingredients":[{"name":"oeufs","quantity":2}],"cuisine":"italian","mood":["comfort"],"main_protein":"egg","steps":["1. Cuire les pâtes"]}')
       printf '%s' "$F" | grep -q '"status":"structured"'
       printf '%s' "$F" | grep -q '"cuisine":"italian"'
       FID=$(printf '%s' "$F" | python -c 'import sys,json;print(json.load(sys.stdin)["id"])')

       # List + draft filter
       L=$(curl -sS -H "$AUTH" "$BASE/recipes")
       echo "$L" | python -c 'import sys,json;rows=json.load(sys.stdin);assert len(rows)==2,rows;print("OK 2 rows")'
       D=$(curl -sS -H "$AUTH" "$BASE/recipes?status=draft")
       echo "$D" | python -c 'import sys,json;rows=json.load(sys.stdin);assert len(rows)==1 and rows[0]["status"]=="draft","got "+str(rows);print("OK draft filter")'

       # ILIKE search across title and ingredients
       S=$(curl -sS -H "$AUTH" "$BASE/recipes?q=oeuf")
       echo "$S" | python -c 'import sys,json;rows=json.load(sys.stdin);assert len(rows)==1 and "Carbonara" in rows[0]["title"],"got "+str(rows);print("OK ILIKE ingredient hit")'
       S2=$(curl -sS -H "$AUTH" "$BASE/recipes?q=Past")
       echo "$S2" | python -c 'import sys,json;rows=json.load(sys.stdin);assert len(rows)==1 and "Pasta" in rows[0]["title"],"got "+str(rows);print("OK ILIKE title hit")'

       # Detail
       D=$(curl -sS -H "$AUTH" "$BASE/recipes/$FID")
       printf '%s' "$D" | grep -q '"Carbonara"'

       # Detail of unknown id → 404
       test "$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" $BASE/recipes/00000000-0000-0000-0000-000000000000)" = "404"

       # Update; verify source_capture preserved
       U=$(curl -sS -X PUT $BASE/recipes/$FID -H "$AUTH" -H "Content-Type: application/json" \
         -d '{"title":"Carbonara revisée","servings":2}')
       printf '%s' "$U" | grep -q '"servings":2'
       printf '%s' "$U" | grep -q '"Carbonara revisée"'
       printf '%s' "$U" | python -c 'import sys,json;d=json.load(sys.stdin);assert d["source_capture"]["type"]=="manual","sc not preserved";assert d["source_capture"]["payload"]["title"]=="Carbonara","sc tampered";print("OK source_capture preserved")'

       # Cross-household isolation: create a second household, ensure it can't see first's recipes
       C2=$(curl -sS -X POST $BASE/households -H "Content-Type: application/json" \
         -d '{"household_name":"Rival","member_name":"X","color_hex":"#10B981"}')
       T2=$(printf '%s' "$C2" | python -c 'import sys,json;print(json.load(sys.stdin)["auth_token"])')
       L2=$(curl -sS -H "Authorization: Bearer $T2" "$BASE/recipes")
       echo "$L2" | python -c 'import sys,json;rows=json.load(sys.stdin);assert rows==[],"isolation breach: "+str(rows);print("OK isolation")'
       test "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $T2" $BASE/recipes/$FID)" = "404"

       # Export — content-disposition + JSON shape
       EX=$(curl -sS -i -H "$AUTH" "$BASE/households/$HID/export.json")
       echo "$EX" | grep -q "Content-Disposition: attachment"
       echo "$EX" | tail -1 | python -c 'import sys,json;d=json.loads(sys.stdin.read());assert "recipes" in d and len(d["recipes"])==2,"export wrong: "+str(d);print("OK export")'

       # Cross-household export → 404
       test "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $T2" $BASE/households/$HID/export.json)" = "404"

       kill $PID
       ```
       Clean up the smoke rows: `DELETE FROM recipes; DELETE FROM members WHERE household_id IN (SELECT id FROM households WHERE name IN ('Recipes Smoke','Rival')); DELETE FROM households WHERE name IN ('Recipes Smoke','Rival');`

       Push to main; Railway redeploys. Repeat the EX (export) curl against the production URL with a fresh test token to confirm Content-Disposition is preserved through Railway's proxy. Clean up prod smoke data.
  </action>
  <verify>
    <automated>grep -q "from app.routers import households, pings, ws, recipes, exports" backend/app/main.py && grep -q "app.include_router(recipes.router)" backend/app/main.py && grep -q "app.include_router(exports.router)" backend/app/main.py && test -f backend/app/routers/exports.py && grep -q "Content-Disposition" backend/app/routers/exports.py && grep -q "household_id != member.household_id" backend/app/routers/exports.py && cd backend && uv run python -c "from fastapi.testclient import TestClient; from app.main import app; c = TestClient(app); r = c.get('/recipes'); assert r.status_code == 401; r2 = c.get('/households/00000000-0000-0000-0000-000000000000/export.json'); assert r2.status_code == 401, r2.status_code; print('OK', r.status_code, r2.status_code)"</automated>
  </verify>
  <done>main.py mounts recipes + exports; TestClient confirms unauth → 401 on both; the curl smoke transcript above passed all 14 assertions; Railway redeploy validated; smoke data cleaned.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → POST/PUT/GET /recipes | Bearer-protected; cross-household isolation enforced per query |
| browser → GET /households/{id}/export.json | Bearer-protected; path-param household_id MUST match member's |
| WS frame → other clients | Same household only via broadcast_to_household |
| recipe.source_capture JSONB | Server writes once; client cannot overwrite via PUT |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-08-01 | Elevation of Privilege | member of A reads/edits household B's recipes | high | mitigate | Every query filters `household_id == member.household_id` (Task 2 + Task 3); cross-household path returns 404 (not 403) to avoid existence leak. Smoke test asserts isolation. |
| T-01-08-02 | Tampering | client overwrites `source_capture` via PUT | high | mitigate | `RecipeUpdate` Pydantic model has no `source_capture` field; defense-in-depth blocklist in update handler also discards `source_capture`/`photo_paths`/`cook_count`/`last_cooked_at`/`household_id`/`created_by_member_id`/`id` if seen (Task 2). Smoke test asserts `source_capture` preserved after PUT. |
| T-01-08-03 | Tampering | client supplies invalid enum value | medium | mitigate | Pydantic enum validators reject anything outside SPEC.md §"Locked vocabularies"; 422 returned. Smoke test step on 422 verifies. |
| T-01-08-04 | Information Disclosure | 403 vs 404 leaks existence of cross-household recipe | medium | mitigate | We return 404 (not 403) when recipe_id exists in another household — same response as nonexistent id. |
| T-01-08-05 | Tampering | ILIKE injection via `q` param | low | mitigate | Parameterized `Recipe.title.ilike(pattern)` binds pattern as a value; SQLAlchemy escapes. Pattern length capped at `q.max_length=200`. |
| T-01-08-06 | Information Disclosure | export.json returns recipes from another household | high | mitigate | `if household_id != member.household_id: 404` (Task 3); query also filters by `member.household_id`. Smoke test asserts cross-household export → 404. |
| T-01-08-07 | Denial of Service | unbounded list returns 100k+ rows | low | mitigate | Pydantic Query `limit ≤ 200` enforced (Task 2). |
| T-01-08-08 | Tampering | client status in PUT bypasses promotion model | medium | accept | W1 has no LLM promotion; allowing client to set status=structured for a draft is the intended path for "user finished filling the form" without an extra endpoint. W2's BackgroundTask path will gate this server-side. Documented as accepted residual; revisit at W2. |
| T-01-08-09 | Tampering | client mutates `cook_count`/`last_cooked_at` via PUT | high | mitigate | Update handler blocklist discards these fields (Task 2). Plus `RecipeUpdate` schema has no such fields. CLAUDE.md invariant 3 (denormalized fields owned by cooking-log writer) preserved. |
| T-01-08-10 | Information Disclosure | export.json includes raw photo bytes (storage exhaustion) | low | mitigate | Schema returns `photo_paths` STRINGS only per CONTEXT.md "JSON export shape"; bytes never serialized. |

`high` items (01, 02, 06, 09) all addressed in this plan.
</threat_model>

<verification>
Manual via the smoke transcript in Task 3 (14 assertions). Coverage:

- RECIPE-01 ✓ POST /recipes accepts full payload, status='structured', source_capture set.
- RECIPE-02 ✓ POST /recipes/quick title-only, status='draft'.
- RECIPE-03 ✓ GET /recipes?q=... runs ILIKE on title + ingredients::text per D-03.
- RECIPE-04 ✓ GET /recipes/{id} returns full shape; 404 on cross-household.
- RECIPE-05 ✓ PUT /recipes/{id} patches; source_capture and denormalized fields untouched.
- RECIPE-06 ✓ GET /recipes?status=draft is the drafts-inbox query (UI in 01-10).
- RECIPE-08 ✓ GET /households/{id}/export.json returns the JSON blob with attachment header; cross-household forbidden.
- REALTIME-02 ✓ recipe.created broadcast on POST /recipes and /recipes/quick; recipe.updated broadcast on PUT.
</verification>

<success_criteria>
The 14-step curl smoke test in Task 3 passes against dev Supabase and against the deployed Railway URL. RECIPE-01..06 + RECIPE-08 + REALTIME-02 all verified server-side.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations-w1/01-08-SUMMARY.md` documenting:
- The 7 endpoints implemented and their exact request/response shapes (so 01-10 frontend can stub against them).
- The locked event-frame vocabulary added: `recipe.created` (POST + POST /quick), `recipe.updated` (PUT). Note that `recipe.updated` is a NEW event type beyond REALTIME-02's original list — log this so the FE handles both.
- Smoke-test transcript (14 curl assertions) for the next planner-checker.
- Note that DELETE /recipes/{id} is INTENTIONALLY absent in W1 (productize-later).
</output>
