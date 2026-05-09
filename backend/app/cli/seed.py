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
import sys
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.db import SessionLocal
from app.models.cooking_log import CookingLog
from app.models.daily_shortlist import DailyShortlist
from app.models.enums import Cuisine, Mood, Protein, Season  # NO duplicates!
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe
from app.models.vote import Vote

NAMESPACE = uuid.NAMESPACE_DNS


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
         "prep_time_minutes": 25, "servings": 4,
         "ingredients": [{"name": "poulet", "quantity": 600, "unit": "g"},
                         {"name": "citron", "quantity": 2, "unit": None}],
         "steps": ["Mariner le poulet.", "Cuire a la poele."]},
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
         "prep_time_minutes": 35, "servings": 2,
         "ingredients": [{"name": "riz arborio", "quantity": 300, "unit": "g"}],
         "steps": ["Nacrer le riz.", "Mouiller au bouillon."]},
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
         "prep_time_minutes": 60, "servings": 6,
         "ingredients": [{"name": "pommes", "quantity": 6, "unit": None}],
         "steps": ["Carameliser.", "Cuire 30 min."]},
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
        recipes_by_slug: dict[str, Recipe] = {}
        for spec in _recipe_specs():
            r = db.merge(Recipe(
                id=_id("recipe", spec["slug"]),
                household_id=household.id,
                created_by_member_id=member_luca.id,
                status="structured",
                title=spec["title"],
                source_capture={
                    "type": "manual",
                    "payload": {"title": spec["title"]},
                },
                photo_paths=[],
                ingredients=spec["ingredients"],
                steps=spec["steps"],
                prep_time_minutes=spec["prep_time_minutes"],
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
                id=_id("cooking_log", slug, str(cooked_at.date())),
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
            id=_id("shortlist", today.isoformat()),
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


def run_prod_synthetic_seed() -> None:
    raise NotImplementedError("Plan 02 must implement run_prod_synthetic_seed")


def run_teardown() -> None:
    raise NotImplementedError("Plan 04 must implement run_teardown")


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
