# Mirror of frontend/lib/enums.ts — drift is a category of bug per CLAUDE.md.
# Wire-format string values must match the TypeScript values verbatim.
# Source: SPEC.md §"Locked vocabularies".
from enum import Enum


class Season(str, Enum):
    spring = "spring"
    summer = "summer"
    autumn = "autumn"
    winter = "winter"


class Cuisine(str, Enum):
    italian = "italian"
    french = "french"
    asian = "asian"
    mediterranean = "mediterranean"
    middle_eastern = "middleEastern"
    indian = "indian"
    mexican = "mexican"
    north_african = "northAfrican"
    american = "american"
    other = "other"


class Mood(str, Enum):
    comfort = "comfort"
    light = "light"
    quick = "quick"
    celebratory = "celebratory"
    adventurous = "adventurous"


class Protein(str, Enum):
    poultry = "poultry"
    red_meat = "redMeat"
    fish = "fish"
    seafood = "seafood"
    egg = "egg"
    legume = "legume"
    none = "none"


# Phase 24 RID-02 — Difficulty locked vocabulary (migration 0007).
# Mirror of frontend/lib/enums.ts Difficulty const — drift is a bug category.
class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


# Phase 25 THREAD-01 — recipe_turns vocabulary (migration 0009).
# Mirror of frontend/lib/enums.ts TurnSender + TurnKind const — drift is a bug category.
class TurnSender(str, Enum):
    user = "user"
    system = "system"


class TurnKind(str, Enum):
    text = "text"
    voice = "voice"
    photo = "photo"
    url = "url"
    answer = "answer"
    proposal_accepted = "proposal_accepted"
    proposal_dismissed = "proposal_dismissed"
    summary = "summary"
    question = "question"
    advisory = "advisory"
