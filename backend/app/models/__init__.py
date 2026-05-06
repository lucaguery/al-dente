"""Public model exports.

Importing this package registers every ORM class against ``Base.metadata``
so Alembic's autogenerate (and migration env) can see all tables.
"""

from app.models.cooking_log import CookingLog, LogRating
from app.models.daily_shortlist import DailyShortlist
from app.models.household import Household
from app.models.member import Member
from app.models.recipe import Recipe, RecipeStatus
from app.models.vote import Vote, VoteValue

__all__ = [
    "CookingLog",
    "DailyShortlist",
    "Household",
    "LogRating",
    "Member",
    "Recipe",
    "RecipeStatus",
    "Vote",
    "VoteValue",
]
