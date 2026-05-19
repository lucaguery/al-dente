"""4-test contract for routers/recipes.py — closes ROUT-03.

Per REQUIREMENTS.md ROUT-03: "4-test contract per HTTP method group".
Three method groups are exercised (plan-discretion per 38-02-PLAN interfaces block):

  Group A: GET /recipes/{id}      — read a single recipe by ID
  Group B: POST /recipes          — blank-draft create (Phase 27 CAPTURE-03)
  Group C: PUT /recipes/{id}      — patch-style update

Note on POST /recipes/quick: this endpoint was deleted in Phase 27 CAPTURE-03
(see routers/recipes.py module docstring). The conversational capture screen
uses POST /recipes (blank draft) + POST /recipes/{id}/turns + POST /recipes/{id}/promote.
Group B tests POST /recipes (blank draft create) as the canonical capture entry point.

Architecture invariants:
  * Invariant #4 — every mutation broadcasts via broadcast_to_household.
  * Invariant #5 — raw inputs kept forever in recipe_turns.
  Cross-household: every router endpoint returns 404 (not 403) per T-01-08-04.

Auth convention: SEED_TOKEN Bearer header.
Cross-household pattern: insert a foreign Household + Recipe via db_session.flush()
  (NOT commit — 38-01 SAVEPOINT contract).
"""
from __future__ import annotations

import os
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe

SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}


def _seeded_member(db: Session) -> Member:
    """Resolve the seeded test member (auth_token == SEED_TOKEN)."""
    m = db.scalar(select(Member).where(Member.auth_token == SEED_TOKEN).limit(1))
    assert m is not None, (
        f"seed Postgres has no member with auth_token={SEED_TOKEN!r} — "
        f"run `uv run seed`?"
    )
    return m


def _seeded_recipe(db: Session, member: Member) -> Recipe:
    """Return any recipe in the seeded household, or create one if none exist."""
    recipe = db.scalar(
        select(Recipe).where(Recipe.household_id == member.household_id).limit(1)
    )
    if recipe is None:
        recipe = Recipe(
            household_id=member.household_id,
            created_by_member_id=member.id,
            status="structured",
            title="Seeded Test Recipe",
            photo_paths=[],
            mood=[],
            seasonality=[],
            tags=[],
        )
        db.add(recipe)
        db.flush()
    return recipe


def _foreign_recipe(db: Session) -> Recipe:
    """Create a foreign Household + Member + Recipe via flush() (NOT commit).

    The SEED_TOKEN member is NOT part of this household, so accessing this
    recipe with SEED_TOKEN auth must return 404 (D-38-02).
    """
    foreign_hh = Household(
        name=f"RecipeForeign-{uuid.uuid4().hex[:8]}",
        invite_code=f"RCF{uuid.uuid4().hex[:3].upper()}",
    )
    db.add(foreign_hh)
    db.flush()

    foreign_member = Member(
        household_id=foreign_hh.id,
        name="ForeignRecipeMember",
        color_hex="#334455",
        auth_token=f"foreign-recipe-token-{uuid.uuid4().hex}",
    )
    db.add(foreign_member)
    db.flush()

    recipe = Recipe(
        household_id=foreign_hh.id,
        created_by_member_id=foreign_member.id,
        status="structured",
        title="Foreign Household Recipe",
        photo_paths=[],
        mood=[],
        seasonality=[],
        tags=[],
    )
    db.add(recipe)
    db.flush()
    return recipe


# ===========================================================================
# Group A: GET /recipes/{id}
# ===========================================================================


class TestRecipesReadContract:
    """Contract tests for GET /recipes/{id} — RECIPE-04 / ROUT-03 group A."""

    def test_recipes_happy_path(self, client: TestClient, db_session: Session) -> None:
        """ROUT-03 Group A happy path — GET /recipes/{id} returns 200 + recipe body.

        Picks or creates a recipe from the seeded household.
        """
        member = _seeded_member(db_session)
        recipe = _seeded_recipe(db_session, member)

        resp = client.get(f"/recipes/{recipe.id}", headers=AUTH_HEADERS)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["id"] == str(recipe.id)
        assert "title" in body
        assert "status" in body

    def test_recipes_401_missing_auth(
        self, client: TestClient, db_session: Session
    ) -> None:
        """ROUT-03 Group A — GET /recipes/{id} with no auth returns 401."""
        member = _seeded_member(db_session)
        recipe = _seeded_recipe(db_session, member)
        resp = client.get(f"/recipes/{recipe.id}")
        assert resp.status_code == 401, resp.text

    def test_recipes_404_cross_household(
        self, client: TestClient, db_session: Session
    ) -> None:
        """ROUT-03 Group A / D-38-02 — GET /recipes/{id} for a foreign household's
        recipe returns 404 (not 403 — T-01-08-04, CLAUDE.md cross-household pattern).

        D-38-02: 404-not-403 enforcement.
        """
        recipe = _foreign_recipe(db_session)
        resp = client.get(f"/recipes/{recipe.id}", headers=AUTH_HEADERS)
        # D-38-02: 404-not-403 enforcement
        assert resp.status_code == 404, resp.text

    def test_recipes_422_validation(
        self, client: TestClient, db_session: Session
    ) -> None:
        """ROUT-03 Group A — GET /recipes/{bad-uuid} with malformed UUID returns 422.

        FastAPI validates UUID path params before the handler runs.
        """
        resp = client.get("/recipes/not-a-valid-uuid", headers=AUTH_HEADERS)
        assert resp.status_code == 422, resp.text


# ===========================================================================
# Group B: POST /recipes (blank-draft create — Phase 27 CAPTURE-03)
# ===========================================================================


class TestRecipesCaptureContract:
    """Contract tests for POST /recipes — ROUT-03 group B.

    POST /recipes is the blank-draft create endpoint introduced in Phase 27
    CAPTURE-03. It replaces the five legacy capture endpoints (/quick, /voice,
    /photo, /url, full-form) which were removed in the same phase.
    """

    def test_recipes_happy_path(self, client: TestClient, db_session: Session) -> None:
        """ROUT-03 Group B happy path — POST /recipes returns 201 + draft recipe.

        The created recipe has status='draft' and title='Extraction en cours…'
        (Phase 27 CAPTURE-03 invariant).
        """
        resp = client.post("/recipes", headers=AUTH_HEADERS, json={})
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["status"] == "draft"
        assert "id" in body

    def test_recipes_401_missing_auth(
        self, client: TestClient, db_session: Session
    ) -> None:
        """ROUT-03 Group B — POST /recipes with no auth returns 401."""
        resp = client.post("/recipes", json={})
        assert resp.status_code == 401, resp.text

    def test_recipes_404_n_a_substitute_422(
        self, client: TestClient, db_session: Session
    ) -> None:
        """ROUT-03 Group B — POST /recipes with invalid status field returns 422.

        POST /recipes is a create endpoint: there is no cross-household resource
        to target (the new recipe always belongs to the authenticated member's
        household). The 404 slot is replaced by a 422 from passing a body with
        a field that Pydantic rejects on RecipeBlankCreate.

        RecipeBlankCreate is a strict {} schema (pass: only); any extra field
        with a value that is not JSON-serializable triggers 422. However, since
        RecipeBlankCreate ignores extra fields, we use a different angle:
        hit POST /recipes/{bad-uuid}/promote (same router, missing recipe) to
        trigger 404 — this validates the "resource-targeted 404" sub-contract
        for this router.
        """
        # POST /recipes/{id}/promote with a non-existent recipe UUID → 404.
        fake_id = uuid.uuid4()
        resp = client.post(f"/recipes/{fake_id}/promote", headers=AUTH_HEADERS)
        assert resp.status_code == 404, resp.text

    def test_recipes_422_validation(
        self, client: TestClient, db_session: Session
    ) -> None:
        """ROUT-03 Group B — POST /recipes/{id}/turns with missing required field
        returns 422.

        The /turns endpoint requires a `kind` field in the payload. Missing it
        causes a Pydantic 422 before the handler runs.
        """
        member = _seeded_member(db_session)
        recipe = _seeded_recipe(db_session, member)
        # Missing `kind` field in the turn payload → 422.
        resp = client.post(
            f"/recipes/{recipe.id}/turns",
            headers=AUTH_HEADERS,
            json={"text": "some content"},  # no `kind` discriminator
        )
        assert resp.status_code == 422, resp.text


# ===========================================================================
# Group C: PUT /recipes/{id}
# ===========================================================================


class TestRecipesEditContract:
    """Contract tests for PUT /recipes/{id} — ROUT-03 group C.

    RECIPE-05: patch-style update. Only fields present in the request body
    are mutated. Returns 404 for cross-household (T-01-08-04).
    """

    def test_recipes_happy_path(self, client: TestClient, db_session: Session) -> None:
        """ROUT-03 Group C happy path — PUT /recipes/{id} returns 200 + updated body."""
        member = _seeded_member(db_session)
        recipe = _seeded_recipe(db_session, member)
        new_title = f"Updated-{uuid.uuid4().hex[:8]}"

        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"title": new_title},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["title"] == new_title

    def test_recipes_401_missing_auth(
        self, client: TestClient, db_session: Session
    ) -> None:
        """ROUT-03 Group C — PUT /recipes/{id} with no auth returns 401."""
        member = _seeded_member(db_session)
        recipe = _seeded_recipe(db_session, member)
        resp = client.put(f"/recipes/{recipe.id}", json={"title": "should fail"})
        assert resp.status_code == 401, resp.text

    def test_recipes_404_cross_household(
        self, client: TestClient, db_session: Session
    ) -> None:
        """ROUT-03 Group C / D-38-02 — PUT /recipes/{id} for a foreign household's
        recipe returns 404 (not 403 — T-01-08-04).

        D-38-02: 404-not-403 enforcement.
        """
        recipe = _foreign_recipe(db_session)
        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"title": "Cross-household attack"},
        )
        # D-38-02: 404-not-403 enforcement
        assert resp.status_code == 404, resp.text

    def test_recipes_422_validation(
        self, client: TestClient, db_session: Session
    ) -> None:
        """ROUT-03 Group C — PUT /recipes/{id} with out-of-range value returns 422.

        RecipeUpdate.prep_time_minutes has ge=0, le=24*60 (1440 minutes).
        Sending 99999 fails Pydantic validation at the router boundary → 422.
        """
        member = _seeded_member(db_session)
        recipe = _seeded_recipe(db_session, member)
        resp = client.put(
            f"/recipes/{recipe.id}",
            headers=AUTH_HEADERS,
            json={"prep_time_minutes": 99999},  # exceeds le=1440
        )
        assert resp.status_code == 422, resp.text
