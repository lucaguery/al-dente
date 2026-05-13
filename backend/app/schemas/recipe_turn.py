"""Pydantic schemas for recipe_turns (Phase 26 TURN-01, TURN-02, TURN-04).

Phase 26 graduates the Phase 25 stubs into typed models:
  - AnswerTurnPayload: D-08/D-09 — 13-field whitelist + per-field value validation
  - UrlTurnPayload: D-25 — adds optional extracted_html_path
  - AdvisoryTurnPayload: D-17 — read-side contract for proposal_accepted handler
  - ProposalAcceptedPayload / ProposalDismissedPayload: D-15/D-16 — in_reply_to_turn_id added

TurnPayload discriminated union on `kind` per Pydantic v2.
System-turn payloads (summary/question) remain stubs — Phase 29 owns their shape.

R-6 (RESEARCH §Area 6): _VALID_* frozensets are at MODULE LEVEL, not inside any class.
Pydantic v2 raises PydanticUserError for unannotated class attributes.
No imports from app.services.llm — this file is dependency-free of services
(vocabulary lists are duplicated here per locked-vocabulary discipline in CLAUDE.md).
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, List, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Phase 26 D-08 — named Literal type for AnswerTurnPayload.field, grep-able per
# CLAUDE.md locked-vocabulary discipline.
# Mirrors the 11-field set in frontend/lib/recipe-completeness.ts + 'tags' + 'description'.
AnswerField = Literal[
    "title",
    "description",
    "ingredients",
    "steps",
    "prep_time_minutes",
    "cook_time_minutes",
    "difficulty",
    "servings",
    "cuisine",
    "mood",
    "main_protein",
    "seasonality",
    "tags",
]

# Phase 26 D-09 — value-type whitelist by field.
# Module-level frozensets; class-level attrs would raise PydanticUserError (R-6).
# Values mirror services/llm.py:73-103 and models/enums.py — drift is a bug category per CLAUDE.md.
_VALID_DIFFICULTIES: frozenset[str] = frozenset({"easy", "medium", "hard"})
_VALID_CUISINES: frozenset[str] = frozenset({
    "italian", "french", "asian", "mediterranean", "middleEastern",
    "indian", "mexican", "northAfrican", "american", "other",
})
_VALID_PROTEINS: frozenset[str] = frozenset({
    "poultry", "redMeat", "fish", "seafood", "egg", "legume", "none",
})
_VALID_MOODS: frozenset[str] = frozenset({
    "comfort", "light", "quick", "celebratory", "adventurous",
})
_VALID_SEASONS: frozenset[str] = frozenset({"spring", "summer", "autumn", "winter"})


# ---------------------------------------------------------------------------
# User-turn payloads
# ---------------------------------------------------------------------------

class TextTurnPayload(BaseModel):
    kind: Literal["text"]
    text: str


class VoiceTurnPayload(BaseModel):
    kind: Literal["voice"]
    transcript: str


class PhotoTurnPayload(BaseModel):
    kind: Literal["photo"]
    photo_paths: List[str] = Field(default_factory=list)


# Phase 26 D-25 — extends Phase 25 stub additively with optional extracted_html_path.
# Backfilled legacy url turns have extracted_html_path=None forever (Phase 25 D-03).
# Phase 26 extract_and_process_url_turn (D-28) sets the path on new url turns.
class UrlTurnPayload(BaseModel):
    kind: Literal["url"]
    url: str
    extracted_html_path: Optional[str] = None


class AnswerTurnPayload(BaseModel):
    """Phase 26 D-08/D-09 — chip/stepper/text answer turn.

    Applied directly to recipes.<field> by the router handler (D-10) and pins
    the field by appending to recipes.manually_edited_fields. Never triggers
    the LLM (D-11). The router validates that in_reply_to_turn_id points to
    a question turn in the same recipe (D-12).

    photo_paths is intentionally excluded from AnswerField (D-08) — photo
    follow-ups go through POST /turns/photo multipart, not answer turns.
    """

    kind: Literal["answer"]
    in_reply_to_turn_id: UUID
    field: AnswerField
    # value is typed Any here — the @model_validator below enforces per-field shape.
    # Pydantic v2 Field(discriminator=...) cannot discriminate on a sibling field,
    # so cross-field type checking must live in a model_validator (RESEARCH §Area 6).
    value: Any

    @model_validator(mode="after")
    def _validate_value_for_field(self) -> "AnswerTurnPayload":
        f, v = self.field, self.value
        # String fields
        if f == "title":
            if not isinstance(v, str):
                raise ValueError("title value must be str")
            if len(v) > 200:
                raise ValueError("title exceeds 200 chars (column max_length)")
        elif f == "description":
            if not isinstance(v, str):
                raise ValueError("description value must be str")
        # Bounded integer fields — bounds mirror GeminiExtractedRecipe in services/llm.py
        elif f in ("prep_time_minutes", "cook_time_minutes"):
            if not isinstance(v, int) or isinstance(v, bool):
                raise ValueError(f"{f} must be int")
            if not (0 <= v <= 1440):
                raise ValueError(f"{f} must be in [0, 1440]")
        elif f == "servings":
            if not isinstance(v, int) or isinstance(v, bool):
                raise ValueError("servings must be int")
            if not (1 <= v <= 99):
                raise ValueError("servings must be in [1, 99]")
        # Enum-typed scalar fields (vocabularies mirror services/llm.py:73-103)
        elif f == "difficulty":
            if v not in _VALID_DIFFICULTIES:
                raise ValueError(f"difficulty must be one of easy/medium/hard, got {v!r}")
        elif f == "cuisine":
            if v not in _VALID_CUISINES:
                raise ValueError(f"invalid cuisine: {v!r}")
        elif f == "main_protein":
            if v not in _VALID_PROTEINS:
                raise ValueError(f"invalid main_protein: {v!r}")
        # List-of-Literal fields
        elif f == "mood":
            if not isinstance(v, list):
                raise ValueError("mood must be list")
            for item in v:
                if item not in _VALID_MOODS:
                    raise ValueError(f"invalid mood item: {item!r}")
        elif f == "seasonality":
            if not isinstance(v, list):
                raise ValueError("seasonality must be list")
            for item in v:
                if item not in _VALID_SEASONS:
                    raise ValueError(f"invalid seasonality item: {item!r}")
        # Plain list-of-str fields
        elif f in ("steps", "tags"):
            if not isinstance(v, list):
                raise ValueError(f"{f} must be list")
            for item in v:
                if not isinstance(item, str):
                    raise ValueError(f"{f} items must be str")
        # Ingredients — list of GeminiIngredient-shaped dicts {name, quantity?, unit?}
        elif f == "ingredients":
            if not isinstance(v, list):
                raise ValueError("ingredients must be list")
            for item in v:
                if not isinstance(item, dict) or "name" not in item:
                    raise ValueError("ingredients items must be {name, quantity?, unit?}")
        return self


# ---------------------------------------------------------------------------
# Proposal handler payloads (D-15 / D-16)
# ---------------------------------------------------------------------------

class ProposalAcceptedPayload(BaseModel):
    """Phase 26 D-16 — user taps 'Mettre a jour' on an advisory bubble.

    Router handler reads the referenced advisory turn's payload (field +
    proposed_value), applies proposed_value to recipes.<field>, and REMOVES
    field from recipes.manually_edited_fields. Atomic transaction.
    """

    kind: Literal["proposal_accepted"]
    in_reply_to_turn_id: UUID


class ProposalDismissedPayload(BaseModel):
    """Phase 26 D-15 — user taps 'Ignorer' on an advisory bubble.

    PURE no-op state change — no LLM run, no field mutation, no
    manually_edited_fields touch. Router validates in_reply_to_turn_id
    points to an advisory turn in the same recipe (422 otherwise).
    """

    kind: Literal["proposal_dismissed"]
    in_reply_to_turn_id: UUID


# ---------------------------------------------------------------------------
# System-turn payloads — Phase 29 owns summary/question; Phase 26 graduates advisory (D-17).
# ---------------------------------------------------------------------------

class SummaryTurnPayload(BaseModel):
    kind: Literal["summary"]
    # Phase 29 LLM-01 defines content


class QuestionTurnPayload(BaseModel):
    kind: Literal["question"]
    # Phase 29 LLM-03 defines content (input_type chip/stepper/text + field + options)


class AdvisoryTurnPayload(BaseModel):
    """Phase 26 D-17 — read-side contract.

    Phase 29 LLM-02 emits these; Phase 26's proposal_accepted handler reads
    payload.field + payload.proposed_value to apply the value when the user
    accepts the proposal. All four fields are required so the read-side never
    has to defend against missing keys.
    """

    kind: Literal["advisory"]
    field: AnswerField
    current_value: Any
    proposed_value: Any
    reason_excerpt: str


# ---------------------------------------------------------------------------
# Outer discriminated union
# ---------------------------------------------------------------------------

TurnPayload = Annotated[
    Union[
        TextTurnPayload,
        VoiceTurnPayload,
        PhotoTurnPayload,
        UrlTurnPayload,
        AnswerTurnPayload,
        ProposalAcceptedPayload,
        ProposalDismissedPayload,
        SummaryTurnPayload,
        QuestionTurnPayload,
        AdvisoryTurnPayload,
    ],
    Field(discriminator="kind"),
]


class TurnResponse(BaseModel):
    """Read-side schema for a single turn — payload stays raw dict (see Phase 25 stub doc)."""

    id: UUID
    recipe_id: UUID
    position: int
    sender: str
    kind: str
    payload: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
