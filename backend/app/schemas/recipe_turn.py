"""Pydantic schemas for recipe_turns (Phase 25 THREAD-01, D-15).

TurnPayload is a discriminated union on `kind` per Pydantic v2.
System-turn payloads (summary/question/advisory) are stubs in Phase 25 —
Phase 29 owns their content shape. Stubs exist so the union covers every
value the DB CHECK constraint allows.
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, List, Literal, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# User-turn payloads (D-10, D-11, D-12)
class TextTurnPayload(BaseModel):
    kind: Literal["text"]
    text: str


class VoiceTurnPayload(BaseModel):
    kind: Literal["voice"]
    transcript: str


class PhotoTurnPayload(BaseModel):
    kind: Literal["photo"]
    photo_paths: List[str] = Field(default_factory=list)


class UrlTurnPayload(BaseModel):
    kind: Literal["url"]
    url: str


class AnswerTurnPayload(BaseModel):
    kind: Literal["answer"]
    # Phase 26 TURN-02 will extend with in_reply_to_turn_id, field, value


class ProposalAcceptedPayload(BaseModel):
    kind: Literal["proposal_accepted"]


class ProposalDismissedPayload(BaseModel):
    kind: Literal["proposal_dismissed"]


# System-turn payload stubs (Phase 29 defines content)
class SummaryTurnPayload(BaseModel):
    kind: Literal["summary"]


class QuestionTurnPayload(BaseModel):
    kind: Literal["question"]


class AdvisoryTurnPayload(BaseModel):
    kind: Literal["advisory"]


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
    """Read-side schema for a single turn.

    payload is raw dict here (not TurnPayload) — the DB stores kind
    as a separate column, so re-validating via discriminated union on
    read requires merging {kind} into payload first. Phase 26 owns
    write-side TurnPayload validation at POST /recipes/{id}/turns.
    """

    id: UUID
    recipe_id: UUID
    position: int
    sender: str
    kind: str
    payload: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
