"""Phase 10 TEST-01 — idempotent backend seed CLI.

`uv run seed` populates the test database with:
- 1 household with a fixed invite_code 'TEST01'
- 2 members (Luca + Partner) with fixed auth_tokens
- 21 recipes spanning Season x Cuisine x Mood x Protein
- 3 cooking_logs covering 'loved' / 'liked' / 'disliked' (architecture invariant #3:
  same-tx update of recipes.last_cooked_at + cook_count)
- 1 daily_shortlist for today with 5 recipes
- votes covering all 5 computed states (Valide / Pressenti / Conteste / Rejete /
  Sans avis) when scored against the 2 seeded members.

Idempotency strategy (D-09):
- Stable UUIDs via uuid.uuid5(NAMESPACE_DNS, "aldente.test.<entity>.<key>")
- Session.merge() for single-PK tables
- pg_insert(...).on_conflict_do_update(...) for votes (composite uniqueness)

Threat model (T-10-01):
- Hard-refuses to run if settings.environment != "test"
- Hard-refuses to run if 'aldente_test' not in settings.database_url

Anti-drift (TEST-01 explicit): imports Enum classes directly from
app.models.enums - no duplicated literal values.
"""
from __future__ import annotations

import argparse
import os
import secrets
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.db import SessionLocal
from app.models.cooking_log import CookingLog
from app.models.daily_shortlist import DailyShortlist
from app.models.enums import Cuisine, Difficulty, Mood, Protein, Season  # NO duplicates!
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.recipe_turn import RecipeTurn
from app.models.vote import Vote

NAMESPACE = uuid.NAMESPACE_DNS

# Phase 11 — synthetic photo JPGs are committed to the repo (Plan 03, D-20).
# Path resolution mirrors `Path(__file__).parent / "synthetic_photos"`, so the
# seed reads from the same directory regardless of where `uv run seed` is invoked.
SYNTHETIC_PHOTOS_DIR = Path(__file__).parent / "synthetic_photos"

# Phase 24 RID-05 — seed canned illustration. Brand-coherent pasta-strand
# path; passes the sanitizer cleanly. Seed-only — production illustrations
# come from generate_recipe_illustration.
_SEED_ILLUSTRATION_SVG = (
    '<svg viewBox="0 0 160 160" fill="none" stroke="currentColor" '
    'xmlns="http://www.w3.org/2000/svg">'
    '<path d="M 40 80 C 40 50, 70 30, 100 40 S 130 80, 100 100 S 50 110, 40 80 Z"/>'
    '</svg>'
)


def _id(*parts: str) -> uuid.UUID:
    """Stable id from a dotted key. Same input -> same UUID across runs/machines."""
    return uuid.uuid5(NAMESPACE, "aldente.test." + ".".join(parts))


# Phase 11 — synthetic-household namespace, distinct from "aldente.test." used by run_test_seed.
def _id_synth(*parts: str) -> uuid.UUID:
    """Stable id under the prod-synthetic namespace.

    Distinct from `_id()` so test-seed and prod-synthetic UUIDs never collide
    even if both somehow ended up in the same DB.
    """
    return uuid.uuid5(NAMESPACE, "aldente.prod.synthetic." + ".".join(parts))


SYNTHETIC_HOUSEHOLD_ID: uuid.UUID = uuid.uuid5(
    NAMESPACE, "aldente.prod.synthetic.household.synthetic"
)
# 63-bit positive bigint for pg_advisory_xact_lock (D-24).
# `& ((1 << 63) - 1)` keeps it positive — avoids sign-bit edge cases in the
# SQLAlchemy bind layer (asyncpg dialect overload-resolution trap).
SYNTHETIC_LOCK_KEY: int = SYNTHETIC_HOUSEHOLD_ID.int & ((1 << 63) - 1)

# D-07 6-table allowlist (informational — used by reviewers and by
# `_assert_synthetic_household` introspection).
SYNTHETIC_ALLOWED_TABLES: frozenset[str] = frozenset({
    "households", "members", "recipes", "cooking_logs", "votes", "daily_shortlists",
})


def _assert_synthetic_household(row, expected_id: uuid.UUID) -> None:
    """D-06 — every prod-synthetic write to the 6 allowlisted tables passes
    through this. Pulls `household_id` off the row (every allowlisted table
    except `households` itself has the column; `households.id` IS the scope).
    Raises if the row is for the wrong household.
    """
    # `Household` rows are scoped by `id` itself, not `household_id`.
    if type(row).__name__ == "Household":
        actual = getattr(row, "id", None)
    else:
        actual = getattr(row, "household_id", None)
    if actual is None:
        raise AssertionError(
            f"refusing prod-synthetic write — {type(row).__name__} has no "
            f"household_id (table not in 6-table allowlist?)"
        )
    if actual != expected_id:
        raise AssertionError(
            f"refusing prod-synthetic write — {type(row).__name__}.household_id="
            f"{actual!r} but synthetic_household_id={expected_id!r}"
        )


# NOTE on votes: `Vote` has no `household_id` column directly. Scope is
# via `shortlist_id` -> `daily_shortlists.household_id`. For vote upserts,
# callers verify the *parent recipe* is in scope (its `household_id`
# matches SYNTHETIC_HOUSEHOLD_ID) before issuing the pg_insert statement.
def _merge_synthetic(db, row, *, synthetic_id: uuid.UUID = SYNTHETIC_HOUSEHOLD_ID):
    """Wrap db.merge with the D-06 scope assertion. Use this in place of
    db.merge() throughout run_prod_synthetic_seed (Plan 02).
    """
    _assert_synthetic_household(row, synthetic_id)
    return db.merge(row)


def _guard_environment() -> None:
    """T-10-01 + D-04 symmetric guard.

    Refuses to run the test seed unless ENVIRONMENT=test AND database_url
    points at the test DB AND no prod opt-in flag/env var is set (D-04).
    """
    if os.environ.get("ALDENTE_PROD_SEED") == "1":
        sys.exit(
            "REFUSING: ALDENTE_PROD_SEED=1 set but --prod-synthetic flag NOT passed. "
            "Either pass --prod-synthetic to run prod-synthetic seed, "
            "or unset ALDENTE_PROD_SEED to run the test seed."
        )
    if settings.environment != "test":
        sys.exit(
            f"REFUSING to seed: ENVIRONMENT={settings.environment!r}, expected 'test'."
        )
    if "aldente_test" not in settings.database_url:
        sys.exit(
            f"REFUSING to seed: database_url does not contain 'aldente_test'. "
            f"Got: {settings.database_url!r}"
        )


def _guard_prod_environment() -> None:
    """D-01..D-04 — refuse unless BOTH the env var AND flag are set,
    AND we're certain we're targeting prod Supabase."""
    if os.environ.get("ALDENTE_PROD_SEED") != "1":
        sys.exit(
            f"REFUSING: --prod-synthetic passed but ALDENTE_PROD_SEED env var not '1' "
            f"(got {os.environ.get('ALDENTE_PROD_SEED')!r}). "
            f"Correct invocation: ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic"
        )
    if "supabase.co" not in settings.database_url:
        host = settings.database_url.split("@")[-1].split("/")[0]
        sys.exit(
            f"REFUSING: database_url does not contain 'supabase.co' "
            f"(got host {host!r}). "
            f"Prod seed will not run against a non-Supabase URL."
        )
    if "localhost" in settings.database_url or "aldente_test" in settings.database_url:
        sys.exit(
            f"REFUSING: database_url contains 'localhost' or 'aldente_test' "
            f"(got {settings.database_url!r}). Cannot be both prod and test."
        )


# ---------------------------------------------------------------------------
# Recipe corpus - 21 entries spanning the locked enums.
# Each entry is a dict that becomes a Recipe row. The slug is the merge key
# (id = uuid5("recipe", slug)) so editing a slug creates a new row;
# editing other fields updates in-place.
# ---------------------------------------------------------------------------

def _recipe_specs() -> list[dict]:
    """Return >=20 recipe dicts spanning all 4 locked vocabularies.

    Coverage guarantees (verified by acceptance criteria):
    - At least 5 distinct Cuisine values
    - At least 3 distinct Mood values
    - At least 4 distinct Protein values
    - At least 3 distinct Season combinations
    """
    return [
        # 1. Italian / poultry / quick / spring-summer
        {"slug": "poulet-citron", "title": "Poulet au citron", "cuisine": Cuisine.italian.value,
         "mood": [Mood.quick.value], "main_protein": Protein.poultry.value,
         "seasonality": [Season.spring.value, Season.summer.value],
         "prep_time_minutes": 25, "cook_time_minutes": 20,
         "difficulty": Difficulty.easy.value,
         "description": "Un classique estival parfumé au citron et aux herbes.",
         "servings": 4,
         "ingredients": [{"name": "poulet", "quantity": 600, "unit": "g"},
                         {"name": "citron", "quantity": 2, "unit": None}],
         "steps": ["Mariner le poulet.", "Cuire a la poele."],
         "illustration_svg": _SEED_ILLUSTRATION_SVG},
        # 2. Italian / red_meat / comfort / autumn-winter
        {"slug": "ragu-bolognese", "title": "Ragu bolognese",
         "cuisine": Cuisine.italian.value, "mood": [Mood.comfort.value],
         "main_protein": Protein.red_meat.value,
         "seasonality": [Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 90, "servings": 6,
         "ingredients": [{"name": "boeuf hache", "quantity": 500, "unit": "g"}],
         "steps": ["Faire revenir.", "Mijoter 1h."]},
        # 3. Italian / none / comfort / autumn-winter - parity with canned_voice_recipe
        {"slug": "risotto-champignons", "title": "Risotto aux champignons",
         "cuisine": Cuisine.italian.value, "mood": [Mood.comfort.value],
         "main_protein": Protein.none.value,
         "seasonality": [Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 35, "cook_time_minutes": 25,
         "difficulty": Difficulty.medium.value,
         "description": "Un risotto crémeux aux champignons des bois, parfait pour l'automne.",
         "servings": 2,
         "ingredients": [{"name": "riz arborio", "quantity": 300, "unit": "g"}],
         "steps": ["Nacrer le riz.", "Mouiller au bouillon."],
         "illustration_svg": _SEED_ILLUSTRATION_SVG},
        # 4. French / poultry / celebratory / autumn
        {"slug": "coq-au-vin", "title": "Coq au vin", "cuisine": Cuisine.french.value,
         "mood": [Mood.celebratory.value, Mood.comfort.value],
         "main_protein": Protein.poultry.value, "seasonality": [Season.autumn.value],
         "prep_time_minutes": 120, "servings": 4,
         "ingredients": [{"name": "coq", "quantity": 1.5, "unit": "kg"}],
         "steps": ["Mariner.", "Mijoter."]},
        # 5. French / fish / light / summer
        {"slug": "loup-grille", "title": "Loup grille", "cuisine": Cuisine.french.value,
         "mood": [Mood.light.value], "main_protein": Protein.fish.value,
         "seasonality": [Season.summer.value], "prep_time_minutes": 20, "servings": 2,
         "ingredients": [{"name": "loup", "quantity": 1, "unit": "kg"}],
         "steps": ["Griller au four."]},
        # 6. French / none / celebratory / autumn - matches canned_photo_recipe
        {"slug": "tarte-tatin", "title": "Tarte Tatin", "cuisine": Cuisine.french.value,
         "mood": [Mood.celebratory.value, Mood.comfort.value],
         "main_protein": Protein.none.value, "seasonality": [Season.autumn.value],
         "prep_time_minutes": 60, "cook_time_minutes": 30,
         "difficulty": Difficulty.hard.value,
         "description": "La tarte tatin classique aux pommes caramélisées, renversée à la sortie du four.",
         "servings": 6,
         "ingredients": [{"name": "pommes", "quantity": 6, "unit": None}],
         "steps": ["Carameliser.", "Cuire 30 min."],
         "illustration_svg": _SEED_ILLUSTRATION_SVG},
        # 7. Asian / poultry / quick / all-seasons
        {"slug": "poulet-teriyaki", "title": "Poulet teriyaki",
         "cuisine": Cuisine.asian.value, "mood": [Mood.quick.value],
         "main_protein": Protein.poultry.value,
         "seasonality": [Season.spring.value, Season.summer.value,
                         Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 30, "servings": 2,
         "ingredients": [{"name": "poulet", "quantity": 400, "unit": "g"}],
         "steps": ["Mariner.", "Sauter."]},
        # 8. Asian / seafood / light / summer
        {"slug": "sushi-saumon", "title": "Sushi saumon", "cuisine": Cuisine.asian.value,
         "mood": [Mood.light.value], "main_protein": Protein.seafood.value,
         "seasonality": [Season.summer.value], "prep_time_minutes": 45, "servings": 2,
         "ingredients": [{"name": "saumon", "quantity": 200, "unit": "g"}],
         "steps": ["Preparer le riz.", "Rouler les makis."]},
        # 9. Asian / legume / light / spring
        {"slug": "pad-thai-tofu", "title": "Pad thai tofu", "cuisine": Cuisine.asian.value,
         "mood": [Mood.quick.value, Mood.light.value], "main_protein": Protein.legume.value,
         "seasonality": [Season.spring.value, Season.summer.value],
         "prep_time_minutes": 25, "servings": 2,
         "ingredients": [{"name": "tofu", "quantity": 200, "unit": "g"}],
         "steps": ["Sauter.", "Ajouter les nouilles."]},
        # 10. Mediterranean / fish / light / summer
        {"slug": "branzino-citron", "title": "Branzino au citron",
         "cuisine": Cuisine.mediterranean.value, "mood": [Mood.light.value],
         "main_protein": Protein.fish.value, "seasonality": [Season.summer.value],
         "prep_time_minutes": 30, "servings": 2,
         "ingredients": [{"name": "branzino", "quantity": 1, "unit": "kg"}],
         "steps": ["Cuire au four."]},
        # 11. Mediterranean / legume / light / summer
        {"slug": "salade-grecque", "title": "Salade grecque",
         "cuisine": Cuisine.mediterranean.value,
         "mood": [Mood.light.value, Mood.quick.value],
         "main_protein": Protein.legume.value, "seasonality": [Season.summer.value],
         "prep_time_minutes": 10, "servings": 4,
         "ingredients": [{"name": "tomates", "quantity": 4, "unit": None}],
         "steps": ["Couper.", "Melanger."]},
        # 12. Middle Eastern / red_meat / adventurous / all-seasons
        {"slug": "shawarma", "title": "Shawarma",
         "cuisine": Cuisine.middle_eastern.value,
         "mood": [Mood.adventurous.value], "main_protein": Protein.red_meat.value,
         "seasonality": [Season.spring.value, Season.summer.value,
                         Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 60, "servings": 4,
         "ingredients": [{"name": "agneau", "quantity": 800, "unit": "g"}],
         "steps": ["Mariner 4h.", "Griller."]},
        # 13. Middle Eastern / legume / quick / winter
        {"slug": "houmous-maison", "title": "Houmous maison",
         "cuisine": Cuisine.middle_eastern.value, "mood": [Mood.quick.value],
         "main_protein": Protein.legume.value, "seasonality": [Season.winter.value],
         "prep_time_minutes": 15, "servings": 4,
         "ingredients": [{"name": "pois chiches", "quantity": 400, "unit": "g"}],
         "steps": ["Mixer."]},
        # 14. Indian / legume / adventurous / autumn-winter
        {"slug": "dal-makhani", "title": "Dal makhani", "cuisine": Cuisine.indian.value,
         "mood": [Mood.adventurous.value, Mood.comfort.value],
         "main_protein": Protein.legume.value,
         "seasonality": [Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 90, "servings": 4,
         "ingredients": [{"name": "lentilles noires", "quantity": 250, "unit": "g"}],
         "steps": ["Tremper.", "Mijoter."]},
        # 15. Indian / poultry / adventurous / all-seasons
        {"slug": "butter-chicken", "title": "Butter chicken",
         "cuisine": Cuisine.indian.value,
         "mood": [Mood.adventurous.value], "main_protein": Protein.poultry.value,
         "seasonality": [Season.spring.value, Season.summer.value,
                         Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 50, "servings": 4,
         "ingredients": [{"name": "poulet", "quantity": 600, "unit": "g"}],
         "steps": ["Mariner.", "Cuire a la sauce."]},
        # 16. Mexican / red_meat / comfort / all-seasons
        {"slug": "tacos-boeuf", "title": "Tacos au boeuf",
         "cuisine": Cuisine.mexican.value,
         "mood": [Mood.comfort.value, Mood.quick.value],
         "main_protein": Protein.red_meat.value,
         "seasonality": [Season.spring.value, Season.summer.value,
                         Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 25, "servings": 4,
         "ingredients": [{"name": "boeuf hache", "quantity": 500, "unit": "g"}],
         "steps": ["Cuire le boeuf.", "Garnir les tortillas."]},
        # 17. Mexican / egg / quick / all-seasons
        {"slug": "huevos-rancheros", "title": "Huevos rancheros",
         "cuisine": Cuisine.mexican.value, "mood": [Mood.quick.value],
         "main_protein": Protein.egg.value,
         "seasonality": [Season.spring.value, Season.summer.value,
                         Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 15, "servings": 2,
         "ingredients": [{"name": "oeufs", "quantity": 4, "unit": None}],
         "steps": ["Cuire les oeufs.", "Servir sur tortilla."]},
        # 18. North African / red_meat / adventurous / autumn-winter
        {"slug": "tajine-agneau", "title": "Tajine d'agneau",
         "cuisine": Cuisine.north_african.value,
         "mood": [Mood.adventurous.value, Mood.celebratory.value],
         "main_protein": Protein.red_meat.value,
         "seasonality": [Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 120, "servings": 6,
         "ingredients": [{"name": "agneau", "quantity": 1, "unit": "kg"}],
         "steps": ["Mijoter avec epices."]},
        # 19. American / red_meat / comfort / all-seasons
        {"slug": "burger-classique", "title": "Burger classique",
         "cuisine": Cuisine.american.value,
         "mood": [Mood.comfort.value, Mood.quick.value],
         "main_protein": Protein.red_meat.value,
         "seasonality": [Season.spring.value, Season.summer.value,
                         Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 20, "servings": 2,
         "ingredients": [{"name": "boeuf hache", "quantity": 300, "unit": "g"}],
         "steps": ["Former les steaks.", "Griller."]},
        # 20. Other / egg / quick / all-seasons
        {"slug": "omelette-herbes", "title": "Omelette aux herbes",
         "cuisine": Cuisine.other.value, "mood": [Mood.quick.value],
         "main_protein": Protein.egg.value,
         "seasonality": [Season.spring.value, Season.summer.value,
                         Season.autumn.value, Season.winter.value],
         "prep_time_minutes": 10, "servings": 2,
         "ingredients": [{"name": "oeufs", "quantity": 4, "unit": None}],
         "steps": ["Battre.", "Cuire a la poele."]},
        # 21. American / fish / light / summer (extra to push past 20)
        {"slug": "saumon-grille", "title": "Saumon grille",
         "cuisine": Cuisine.american.value, "mood": [Mood.light.value],
         "main_protein": Protein.fish.value, "seasonality": [Season.summer.value],
         "prep_time_minutes": 20, "servings": 2,
         "ingredients": [{"name": "saumon", "quantity": 400, "unit": "g"}],
         "steps": ["Griller 8 min."]},
    ]


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="seed",
        description="Idempotent synthetic seed for the Al Dente test or prod-synthetic DB.",
    )
    parser.add_argument(
        "--prod-synthetic",
        action="store_true",
        help="Target prod Supabase (REQUIRES ALDENTE_PROD_SEED=1 in env). "
             "Without this flag, seed targets the local test DB.",
    )
    parser.add_argument(
        "--teardown",
        action="store_true",
        help="Delete the synthetic household and all scoped storage objects. "
             "Only valid with --prod-synthetic.",
    )
    return parser.parse_args(argv)


def run_test_seed() -> None:
    auth_token_luca = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
    auth_token_partner = os.environ.get("SEED_AUTH_TOKEN_PARTNER", "test-token-partner")

    today = date.today()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        # ---- 1. Household ----
        household = db.merge(Household(
            id=_id("household", "luca"),
            name="Foyer Test",
            invite_code="TEST01",
            timezone="Europe/Paris",
        ))

        # ---- 2. Members ----
        member_luca = db.merge(Member(
            id=_id("member", "luca"),
            household_id=household.id,
            name="Luca",
            color_hex="#F43F5E",
            auth_token=auth_token_luca,
        ))
        member_partner = db.merge(Member(
            id=_id("member", "partner"),
            household_id=household.id,
            name="Partner",
            color_hex="#10B981",
            auth_token=auth_token_partner,
        ))

        # Flush so recipes' FK to created_by_member_id resolves on first run.
        # Without this, SQLAlchemy may batch the recipes INSERT before the
        # members INSERT and trip recipes_created_by_member_id_fkey.
        db.flush()

        # ---- 3. Recipes (21) ----
        # Pitfall 5 mitigation: explicitly set every NOT NULL column.
        # `status` would otherwise default to 'draft' via server_default; we want
        # 'structured' so specs see populated structured fields immediately.
        #
        # bug 2 fix (260512-df0): pre-populate photo_paths for the 5
        # shortlist-recipe slugs so the seeded demo env exercises
        # ShortlistCard's signed-URL render path. Other recipes stay at [].
        # The path layout mirrors what the live capture pipeline writes
        # ({household_id}/{recipe_id}/{stable_uuid}.jpg) so the
        # `path in recipe.photo_paths` check in routers/photos.py:173 lets
        # the signed-URL endpoint authorize the request.
        # NOTE: this seed does NOT upload bytes — uploads need Supabase
        # creds which the test env intentionally lacks (playwright.config.ts
        # withholds SUPABASE_* env). If Supabase credentials are
        # present, the prod-synthetic seed (run_prod_synthetic_seed) is the
        # path that uploads JPGs end-to-end. Frontend silently falls back
        # to the UtensilsCrossed placeholder on a signed-URL fetch failure
        # (ShortlistCard.tsx catch handler), so an unconfigured test env
        # still renders cleanly — just without photos.
        shortlist_slugs_with_photos = {
            "ragu-bolognese", "coq-au-vin", "butter-chicken", "shawarma", "tacos-boeuf",
        }
        recipes_by_slug: dict[str, Recipe] = {}
        for spec in _recipe_specs():
            recipe_id = _id("recipe", spec["slug"])
            if spec["slug"] in shortlist_slugs_with_photos:
                # Stable uuid5 photo filename — re-running the seed never
                # changes the path, so signed-URL authz is stable across runs.
                photo_uuid = _id("photo", spec["slug"])
                recipe_photo_paths = [
                    f"{household.id}/{recipe_id}/{photo_uuid}.jpg"
                ]
            else:
                recipe_photo_paths = []
            r = db.merge(Recipe(
                id=recipe_id,
                household_id=household.id,
                created_by_member_id=member_luca.id,
                status="structured",
                title=spec["title"],
                photo_paths=recipe_photo_paths,
                ingredients=spec["ingredients"],
                steps=spec["steps"],
                prep_time_minutes=spec["prep_time_minutes"],
                # Phase 24 RID-02 — three new optional recipe-identity fields.
                cook_time_minutes=spec.get("cook_time_minutes"),
                difficulty=spec.get("difficulty"),
                description=spec.get("description"),
                # Phase 24 RID-05 — canned illustration for 3 seed recipes;
                # others stay NULL → BrandIcon fallback in dev/test.
                illustration_svg=spec.get("illustration_svg"),
                servings=spec["servings"],
                cuisine=spec["cuisine"],
                mood=spec["mood"],
                main_protein=spec["main_protein"],
                seasonality=spec["seasonality"],
                tags=[],
                cook_count=0,
                last_cooked_at=None,
                last_cooked_photo_path=None,
                promotion_error=None,
                promotion_attempts=0,
            ))
            recipes_by_slug[spec["slug"]] = r

        # Flush so recipe IDs are visible to the cooking-log denorm queries below.
        db.flush()

        # ---- 3b. Recipe turns (Phase 25 MIGRATION-02) ----
        # One initial user turn + one representative summary system turn per recipe.
        # Idempotent via ON CONFLICT (recipe_id, position) DO UPDATE — the
        # migration already inserted turns via gen_random_uuid() so the PK may
        # differ from our uuid5 IDs; we upsert on the UNIQUE (recipe_id, position)
        # constraint instead of the PK so re-runs converge correctly.
        for spec in _recipe_specs():
            recipe_id = _id("recipe", spec["slug"])
            for position, sender, kind, payload in [
                (0, "user", "text", {"text": spec["title"]}),
                (1, "system", "summary", {"text": f"Recette : {spec['title']}"}),
            ]:
                db.execute(
                    pg_insert(RecipeTurn)
                    .values(
                        id=_id("recipe", spec["slug"], f"turn{position}"),
                        recipe_id=recipe_id,
                        position=position,
                        sender=sender,
                        kind=kind,
                        payload=payload,
                    )
                    .on_conflict_do_update(
                        index_elements=["recipe_id", "position"],
                        set_={"kind": kind, "payload": payload, "sender": sender},
                    )
                )

        # ---- 4. Cooking logs (3, one per rating) + same-tx denorm ----
        # Architecture invariant #3: update last_cooked_at + cook_count in same commit.
        log_specs = [
            ("ragu-bolognese", "loved", "Excellent ce soir.", now - timedelta(days=2)),
            ("poulet-citron", "liked", "Bon mais sec.", now - timedelta(days=5)),
            ("burger-classique", "disliked", "Pas memorable.", now - timedelta(days=10)),
        ]
        for slug, rating, notes, cooked_at in log_specs:
            recipe = recipes_by_slug[slug]
            db.merge(CookingLog(
                id=_id("cooking_log", slug),  # SEED-01 (D-19-14): NO DATE in key — cross-day idempotent. Mirrors run_prod_synthetic_seed line 782.
                recipe_id=recipe.id,
                household_id=household.id,
                cooked_by_member_id=member_luca.id,
                cooked_at=cooked_at,
                photo_paths=[],
                rating=rating,
                notes=notes,
            ))
            # Denormalization: last_cooked_at = max, cook_count = count of logs.
            # Recompute count from rows so re-runs converge to the right value.
            db.flush()  # ensure the merged log is visible to the COUNT below
            log_count = db.scalar(
                select(func.count(CookingLog.id)).where(
                    CookingLog.recipe_id == recipe.id
                )
            ) or 0
            recipe.cook_count = int(log_count)
            recipe.last_cooked_at = (
                cooked_at
                if recipe.last_cooked_at is None or cooked_at > recipe.last_cooked_at
                else recipe.last_cooked_at
            )

        # ---- 5. Daily shortlist for today ----
        # 5 recipes spanning cuisine diversity for the shortlist-vote spec.
        shortlist_recipe_slugs = [
            "ragu-bolognese", "coq-au-vin", "butter-chicken", "shawarma", "tacos-boeuf",
        ]
        shortlist = db.merge(DailyShortlist(
            id=_id("shortlist", "today"),  # SEED-01 (D-19-15): NO DATE in key — cross-day idempotent. Mirrors run_prod_synthetic_seed line 813.
            household_id=household.id,
            date=today,
            generation=1,
            recipe_ids=[recipes_by_slug[s].id for s in shortlist_recipe_slugs],
            filters=None,
        ))

        db.flush()  # ensure shortlist.id is materialized before vote upsert

        # ---- 6. Votes covering all 5 computed states ----
        # member_count = 2 -> states for (luca_vote, partner_vote):
        #   ('yes', 'yes')      -> Valide
        #   ('yes', None)       -> Pressenti
        #   ('yes', 'no')       -> Conteste
        #   ('no', 'no')        -> Rejete
        #   (None, None)        -> Sans avis (no vote rows at all)
        vote_specs = [
            # (slug, luca_vote, partner_vote)
            ("ragu-bolognese", "yes", "yes"),       # Valide
            ("coq-au-vin",     "yes", None),        # Pressenti
            ("butter-chicken", "yes", "no"),        # Conteste
            ("shawarma",       "no",  "no"),        # Rejete
            ("tacos-boeuf",    None,  None),        # Sans avis (no rows inserted)
        ]
        for slug, luca_vote, partner_vote in vote_specs:
            recipe_id = recipes_by_slug[slug].id
            for member_id, vote_value in [
                (member_luca.id, luca_vote),
                (member_partner.id, partner_vote),
            ]:
                if vote_value is None:
                    continue
                stmt = (
                    pg_insert(Vote)
                    .values(
                        id=_id("vote", slug, str(member_id)),
                        shortlist_id=shortlist.id,
                        recipe_id=recipe_id,
                        member_id=member_id,
                        vote=vote_value,
                    )
                    .on_conflict_do_update(
                        index_elements=[
                            "shortlist_id", "recipe_id", "member_id",
                        ],
                        set_={"vote": vote_value},
                    )
                )
                db.execute(stmt)

        db.commit()
        print(
            f"seed: ok household={household.id} member={member_luca.id} "
            f"recipes={len(recipes_by_slug)} logs={len(log_specs)} "
            f"shortlist={shortlist.id}"
        )


def _gather_synthetic_counts(db) -> dict[str, int]:
    """D-13 — gather per-table row counts scoped to SYNTHETIC_HOUSEHOLD_ID,
    plus the count of `synthetic/` Storage objects.

    Used by the post-seed banner so the operator can re-run the seed and
    eyeball that counts converge (idempotency proof).
    """
    from app.services.storage import list_synthetic_storage_count

    recipes_count = db.scalar(
        select(func.count(Recipe.id)).where(
            Recipe.household_id == SYNTHETIC_HOUSEHOLD_ID
        )
    ) or 0
    members_count = db.scalar(
        select(func.count(Member.id)).where(
            Member.household_id == SYNTHETIC_HOUSEHOLD_ID
        )
    ) or 0
    cooking_logs_count = db.scalar(
        select(func.count(CookingLog.id)).where(
            CookingLog.household_id == SYNTHETIC_HOUSEHOLD_ID
        )
    ) or 0
    shortlists_count = db.scalar(
        select(func.count(DailyShortlist.id)).where(
            DailyShortlist.household_id == SYNTHETIC_HOUSEHOLD_ID
        )
    ) or 0
    # Vote scope is via shortlist_id -> daily_shortlists.household_id
    # (Vote has no household_id column).
    votes_count = db.scalar(
        select(func.count(Vote.id))
        .join(DailyShortlist, Vote.shortlist_id == DailyShortlist.id)
        .where(DailyShortlist.household_id == SYNTHETIC_HOUSEHOLD_ID)
    ) or 0
    storage_count = list_synthetic_storage_count()
    return {
        "recipes": int(recipes_count),
        "members": int(members_count),
        "cooking_logs": int(cooking_logs_count),
        "votes": int(votes_count),
        "shortlists": int(shortlists_count),
        "storage_objects": int(storage_count),
    }


def _print_post_seed_banner(
    *,
    household_id: uuid.UUID,
    invite_code: str,
    counts: dict[str, int],
) -> None:
    """D-13 + D-15 — bordered banner with household ID, invite code, counts.
    ANSI-bold for the invite code; no color (terminals vary).

    Operator runs the seed twice and eyeballs that the printed counts match —
    that's the idempotency smoke check (D-13).
    """
    border = "=" * 70
    print(border)
    print(f"  SYNTHETIC HOUSEHOLD SEEDED — {household_id}")
    print(f"  Synthetic invite code: \033[1m{invite_code}\033[0m")
    print(border)
    print(f"  recipes:                       {counts['recipes']:>4d}")
    print(f"  members:                       {counts['members']:>4d}")
    print(f"  cooking_logs:                  {counts['cooking_logs']:>4d}")
    print(f"  votes:                         {counts['votes']:>4d}")
    print(f"  shortlists:                    {counts['shortlists']:>4d}")
    print(f"  storage objects (synthetic/):  {counts['storage_objects']:>4d}")
    print(border)
    print("  Idempotency check: re-run this command and confirm counts match.")
    print(border)


def _print_teardown_banner(
    *,
    household_id: uuid.UUID,
    removed: dict[str, int],
    storage_removed: int,
) -> None:
    """Banner reporting per-table deletion counts. -1 in storage_removed
    means Postgres deletes succeeded but Storage cleanup raised — operator
    should re-run.
    """
    border = "=" * 70
    print(border)
    print(f"  SYNTHETIC HOUSEHOLD TEARDOWN — {household_id}")
    print(border)
    print(f"  votes removed:                 {removed['votes']:>4d}")
    print(f"  cooking_logs removed:          {removed['cooking_logs']:>4d}")
    print(f"  daily_shortlists removed:      {removed['daily_shortlists']:>4d}")
    print(f"  recipes removed:               {removed['recipes']:>4d}")
    print(f"  members removed:               {removed['members']:>4d}")
    print(f"  households removed:            {removed['households']:>4d}")
    if storage_removed == -1:
        print("  storage objects removed:       FAILED — see WARNING above")
    else:
        print(f"  storage objects removed:       {storage_removed:>4d}")
    print(border)
    if all(v == 0 for v in removed.values()) and storage_removed in (0, -1):
        print("  Note: nothing to remove (already torn down or never seeded).")
        print(border)


def run_prod_synthetic_seed() -> None:
    """Phase 11 — prod-synthetic seed. Idempotent across re-runs (D-10/D-11/D-12).

    Writes are scoped to SYNTHETIC_HOUSEHOLD_ID via _merge_synthetic (D-06).
    Storage uploads are scoped to `synthetic/` via upload_synthetic_photo_idempotent
    (D-08/D-22). Concurrent runs serialize on pg_advisory_xact_lock(SYNTHETIC_LOCK_KEY)
    (D-24).
    """
    from app.services.storage import (
        list_synthetic_storage_count,
        upload_synthetic_photo_idempotent,
    )

    # Pitfall 8 — fail fast if Storage creds are missing, BEFORE any DB write.
    # An empty list call is enough to trigger the lazy _supabase() init.
    try:
        _ = list_synthetic_storage_count()
    except RuntimeError as exc:
        sys.exit(
            f"REFUSING: Supabase Storage not configured ({exc}). "
            f"Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running."
        )

    # Pre-flight: every spec slug must have a committed photo on disk.
    # Plan 03 commits the 21 JPGs; without them the seed cannot satisfy D-20.
    missing = [
        spec["slug"] for spec in _recipe_specs()
        if not (SYNTHETIC_PHOTOS_DIR / f"{spec['slug']}.jpg").exists()
    ]
    if missing:
        sys.exit(
            f"REFUSING: missing photo(s) at {SYNTHETIC_PHOTOS_DIR}/<slug>.jpg "
            f"for slugs: {missing}. "
            f"Plan 03 (synthetic photo curation) must commit these JPGs first."
        )

    today = date.today()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        # D-24 — serialize concurrent seed runs. Releases on commit/rollback.
        # NOTE: Postgres advisory locks require a session-pinned connection.
        # PgBouncer in transaction-pool mode does NOT support these — the
        # operator must connect via the direct (session-mode) URL. Documented
        # in RUNBOOK.md (Plan 05).
        db.execute(
            text("SELECT pg_advisory_xact_lock(:k)"),
            {"k": SYNTHETIC_LOCK_KEY},
        )

        # ---- 1. Household (D-05 label, D-14 fixed invite code) ----
        household = _merge_synthetic(db, Household(
            id=SYNTHETIC_HOUSEHOLD_ID,
            name="[SYNTHETIC] Démo Al Dente",
            invite_code="DEMO01",
            timezone="Europe/Paris",
        ))

        # ---- 2. Members (D-18 — fresh tokens per run, NEVER printed) ----
        member_luca = _merge_synthetic(db, Member(
            id=_id_synth("member", "luca"),
            household_id=SYNTHETIC_HOUSEHOLD_ID,
            name="Luca",
            color_hex="#F43F5E",
            auth_token=secrets.token_urlsafe(32),
        ))
        member_partner = _merge_synthetic(db, Member(
            id=_id_synth("member", "partner"),
            household_id=SYNTHETIC_HOUSEHOLD_ID,
            name="Partner",
            color_hex="#10B981",
            auth_token=secrets.token_urlsafe(32),
        ))

        # Pitfall 4 — flush so recipes' FK to created_by_member_id resolves.
        db.flush()

        # ---- 3. Recipes (21) — D-23 import _recipe_specs directly ----
        # Pitfall 2 — populate photo_paths so signed-URL reads succeed.
        recipes_by_slug: dict[str, Recipe] = {}
        for spec in _recipe_specs():
            jpeg_bytes = (SYNTHETIC_PHOTOS_DIR / f"{spec['slug']}.jpg").read_bytes()
            photo_path = upload_synthetic_photo_idempotent(
                slug=spec["slug"], content=jpeg_bytes,
            )
            # Pitfall 5 — set every NOT NULL column explicitly.
            r = _merge_synthetic(db, Recipe(
                id=_id_synth("recipe", spec["slug"]),
                household_id=SYNTHETIC_HOUSEHOLD_ID,
                created_by_member_id=member_luca.id,
                status="structured",
                title=spec["title"],
                photo_paths=[photo_path],  # CRITICAL — Pitfall 2
                ingredients=spec["ingredients"],
                steps=spec["steps"],
                prep_time_minutes=spec["prep_time_minutes"],
                # Phase 24 RID-02 — three new optional recipe-identity fields.
                cook_time_minutes=spec.get("cook_time_minutes"),
                difficulty=spec.get("difficulty"),
                description=spec.get("description"),
                # Phase 24 RID-05 — canned illustration for 3 seed recipes;
                # others stay NULL → BrandIcon fallback for DEMO01 household.
                illustration_svg=spec.get("illustration_svg"),
                servings=spec["servings"],
                cuisine=spec["cuisine"],
                mood=spec["mood"],
                main_protein=spec["main_protein"],
                seasonality=spec["seasonality"],
                tags=[],
                cook_count=0,
                last_cooked_at=None,
                last_cooked_photo_path=None,
                promotion_error=None,
                promotion_attempts=0,
            ))
            recipes_by_slug[spec["slug"]] = r

        # Flush so recipe IDs are visible to the cooking-log denorm queries.
        db.flush()

        # ---- 3b. Recipe turns (Phase 25 MIGRATION-02) ----
        # One initial user turn + one representative summary system turn per recipe.
        # Idempotent via ON CONFLICT (recipe_id, position) DO UPDATE — the
        # migration may have already inserted turns via gen_random_uuid() so the PK
        # could differ from our uuid5 IDs. Upsert on the UNIQUE constraint instead.
        for spec in _recipe_specs():
            recipe_id = _id_synth("recipe", spec["slug"])
            for position, sender, kind, payload in [
                (0, "user", "text", {"text": spec["title"]}),
                (1, "system", "summary", {"text": f"Recette : {spec['title']}"}),
            ]:
                db.execute(
                    pg_insert(RecipeTurn)
                    .values(
                        id=_id_synth("recipe", spec["slug"], f"turn{position}"),
                        recipe_id=recipe_id,
                        position=position,
                        sender=sender,
                        kind=kind,
                        payload=payload,
                    )
                    .on_conflict_do_update(
                        index_elements=["recipe_id", "position"],
                        set_={"kind": kind, "payload": payload, "sender": sender},
                    )
                )

        # ---- 4. Cooking logs — D-10 SLIDING DATES ----
        # _id key is "cooking_log", slug only — NO date in the key.
        # cooked_at is recomputed from now() per run; merge UPDATEs the field.
        # This closes the v0.2.2 SEED-01 cross-day idempotency hole for prod-synthetic.
        log_specs = [
            ("ragu-bolognese", "loved", "Excellent ce soir.", now - timedelta(days=2)),
            ("poulet-citron", "liked", "Bon mais sec.", now - timedelta(days=5)),
            ("burger-classique", "disliked", "Pas memorable.", now - timedelta(days=10)),
        ]
        for slug, rating, notes, cooked_at in log_specs:
            recipe = recipes_by_slug[slug]
            _merge_synthetic(db, CookingLog(
                id=_id_synth("cooking_log", slug),  # NO DATE in key — D-10
                recipe_id=recipe.id,
                household_id=SYNTHETIC_HOUSEHOLD_ID,
                cooked_by_member_id=member_luca.id,
                cooked_at=cooked_at,
                photo_paths=[],
                rating=rating,
                notes=notes,
            ))
            # Architecture invariant #3 — same-tx denorm of recipes.last_cooked_at +
            # cook_count. Recompute count from rows so re-runs converge correctly.
            db.flush()
            log_count = db.scalar(
                select(func.count(CookingLog.id)).where(
                    CookingLog.recipe_id == recipe.id
                )
            ) or 0
            recipe.cook_count = int(log_count)
            recipe.last_cooked_at = (
                cooked_at
                if recipe.last_cooked_at is None or cooked_at > recipe.last_cooked_at
                else recipe.last_cooked_at
            )

        # ---- 5. Daily shortlist — D-11 SLIDING KEY ----
        # _id key is ("shortlist", "today") — NO date in the key.
        # `date` field UPDATEs to today on every re-run.
        shortlist_recipe_slugs = [
            "ragu-bolognese", "coq-au-vin", "butter-chicken", "shawarma", "tacos-boeuf",
        ]
        shortlist = _merge_synthetic(db, DailyShortlist(
            id=_id_synth("shortlist", "today"),  # NO DATE in key — D-11
            household_id=SYNTHETIC_HOUSEHOLD_ID,
            date=today,
            generation=1,
            recipe_ids=[recipes_by_slug[s].id for s in shortlist_recipe_slugs],
            filters=None,
        ))

        db.flush()

        # ---- 6. Votes — D-12 stable shortlist UUID, vote rows UPDATE in place ----
        # member_count = 2 -> states for (luca_vote, partner_vote):
        #   ('yes', 'yes') -> Validé   (2 rows)
        #   ('yes', None)  -> Pressenti (1 row)
        #   ('yes', 'no')  -> Contesté  (2 rows)
        #   ('no',  'no')  -> Rejeté    (2 rows)
        #   (None, None)   -> Sans avis (0 rows — no rows inserted)
        # Total: 2 + 1 + 2 + 2 + 0 = 7 vote rows producing all 5 computed states.
        vote_specs = [
            ("ragu-bolognese", "yes", "yes"),       # Validé
            ("coq-au-vin",     "yes", None),        # Pressenti
            ("butter-chicken", "yes", "no"),        # Contesté
            ("shawarma",       "no",  "no"),        # Rejeté
            ("tacos-boeuf",    None,  None),        # Sans avis
        ]
        for slug, luca_vote, partner_vote in vote_specs:
            # Vote has no household_id column. Verify the parent recipe is in
            # scope before issuing the upsert (D-06 belt-and-suspenders).
            parent_recipe = recipes_by_slug[slug]
            _assert_synthetic_household(parent_recipe, SYNTHETIC_HOUSEHOLD_ID)
            for member_id, vote_value in [
                (member_luca.id, luca_vote),
                (member_partner.id, partner_vote),
            ]:
                if vote_value is None:
                    continue
                stmt = (
                    pg_insert(Vote)
                    .values(
                        id=_id_synth("vote", slug, str(member_id)),
                        shortlist_id=shortlist.id,
                        recipe_id=parent_recipe.id,
                        member_id=member_id,
                        vote=vote_value,
                    )
                    .on_conflict_do_update(
                        index_elements=["shortlist_id", "recipe_id", "member_id"],
                        set_={"vote": vote_value},
                    )
                )
                db.execute(stmt)

        db.commit()  # Advisory lock auto-releases here.

        # ---- 7. Post-seed banner (D-13 + D-15) ----
        counts = _gather_synthetic_counts(db)
        _print_post_seed_banner(
            household_id=SYNTHETIC_HOUSEHOLD_ID,
            invite_code="DEMO01",
            counts=counts,
        )


def run_teardown() -> None:
    """Phase 11 — wipe the synthetic household and all scoped storage objects.

    Deletion order (D-16 + Pitfall 9):
      1. votes (scoped via shortlist_id -> daily_shortlists.household_id)
      2. cooking_logs
      3. daily_shortlists
      4. recipes
      5. members
      6. households (the row itself)
      7. AFTER Postgres commit: synthetic/ Storage objects.

    Idempotent — re-running after partial failure is safe because every
    DELETE is conditioned on `household_id = :hh`, so previously-deleted
    rows are already gone.

    Concurrent-safe — same `pg_advisory_xact_lock(SYNTHETIC_LOCK_KEY)` as
    the seed serializes seed-vs-teardown races.
    """
    from app.services.storage import teardown_synthetic_storage

    removed = {
        "votes": 0,
        "cooking_logs": 0,
        "daily_shortlists": 0,
        "recipes": 0,
        "members": 0,
        "households": 0,
    }

    with SessionLocal() as db:
        # D-24 — same lock key as run_prod_synthetic_seed.
        # NOTE: Postgres advisory locks require a session-pinned connection.
        # PgBouncer in transaction-pool mode does NOT support these — the
        # operator must connect via the direct (session-mode) URL. Documented
        # in RUNBOOK.md (Plan 05).
        db.execute(
            text("SELECT pg_advisory_xact_lock(:k)"),
            {"k": SYNTHETIC_LOCK_KEY},
        )

        # D-16 — votes first (CASCADE via daily_shortlists, but explicit is safer)
        r = db.execute(
            text(
                "DELETE FROM votes WHERE shortlist_id IN ("
                "SELECT id FROM daily_shortlists WHERE household_id = :hh"
                ")"
            ),
            {"hh": SYNTHETIC_HOUSEHOLD_ID},
        )
        removed["votes"] = r.rowcount or 0

        r = db.execute(
            text("DELETE FROM cooking_logs WHERE household_id = :hh"),
            {"hh": SYNTHETIC_HOUSEHOLD_ID},
        )
        removed["cooking_logs"] = r.rowcount or 0

        r = db.execute(
            text("DELETE FROM daily_shortlists WHERE household_id = :hh"),
            {"hh": SYNTHETIC_HOUSEHOLD_ID},
        )
        removed["daily_shortlists"] = r.rowcount or 0

        r = db.execute(
            text("DELETE FROM recipes WHERE household_id = :hh"),
            {"hh": SYNTHETIC_HOUSEHOLD_ID},
        )
        removed["recipes"] = r.rowcount or 0

        # Pitfall 10 — this also deletes the auditor's member #3 if joined.
        # By-design; runbook documents that teardown ends any active audit session.
        r = db.execute(
            text("DELETE FROM members WHERE household_id = :hh"),
            {"hh": SYNTHETIC_HOUSEHOLD_ID},
        )
        removed["members"] = r.rowcount or 0

        r = db.execute(
            text("DELETE FROM households WHERE id = :hh"),
            {"hh": SYNTHETIC_HOUSEHOLD_ID},
        )
        removed["households"] = r.rowcount or 0

        db.commit()  # Releases advisory lock.

    # D-16 — storage AFTER Postgres commit. This is the only place Storage
    # is touched outside the seed; the scope guard in Plan 01's
    # teardown_synthetic_storage enforces the `synthetic/` prefix.
    try:
        storage_removed = teardown_synthetic_storage()
    except RuntimeError as exc:
        print(
            f"WARNING: Postgres teardown succeeded but Storage cleanup failed: {exc}\n"
            f"Re-run `uv run seed --prod-synthetic --teardown` to retry "
            f"(idempotent — Postgres deletes are no-ops on second run).",
            file=sys.stderr,
        )
        storage_removed = -1  # sentinel for the banner

    _print_teardown_banner(
        household_id=SYNTHETIC_HOUSEHOLD_ID,
        removed=removed,
        storage_removed=storage_removed,
    )


def main() -> None:
    args = _parse_args()
    if args.prod_synthetic:
        _guard_prod_environment()
        if args.teardown:
            run_teardown()
        else:
            run_prod_synthetic_seed()
    else:
        if args.teardown:
            sys.exit("REFUSING: --teardown only valid with --prod-synthetic.")
        _guard_environment()
        run_test_seed()


if __name__ == "__main__":
    main()
