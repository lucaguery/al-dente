# Phase 25: Backend Foundation — Research

**Researched:** 2026-05-13
**Domain:** Alembic migrations (PostgreSQL JSONB backfill + table create + column drop), SQLAlchemy 2.0 model authoring, Pydantic v2 discriminated unions, Supabase Storage SDK, locked-vocabulary mirroring
**Confidence:** HIGH — all claims verified against live codebase files; no third-party docs needed beyond what is encoded in the project itself.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Backfill payload shapes (THREAD-02)**
- D-01: Legacy MANUAL captures backfill to `text` initial turn with payload `{"text": <source_capture.payload.title>}`.
- D-02: Legacy PHOTO captures backfill to `photo` initial turn with payload `{}`.
- D-03: Legacy URL captures backfill to `url` initial turn with payload `{"url": <source_capture.payload.url>}`.
- D-04: Legacy VOICE captures backfill to `voice` initial turn with payload `{"transcript": <source_capture.payload.transcript>}`.
- D-05: Recipes with `status='failed'` are DELETED by the migration (before backfill).

**`promote_draft(recipe_id)` scope (THREAD-04)**
- D-06: Signature `promote_draft(recipe_id: UUID) -> None`. Opens its own `SessionLocal()`, reads first user turn, dispatches on `turn.kind`.
- D-07: Phase 25 does NOT emit `summary` system turns. `_apply_extracted` / `rewrite_title` paths preserved. Phase 29 owns LLM system-turn emission.
- D-08: Photo bytes for NEW captures: router uploads to Storage BEFORE turn insert. Storage paths land in both `recipes.photo_paths` AND photo turn payload. `promote_draft` downloads from Storage. Closes `TODO(productize)` at `llm.py:728-738`.
- D-09: `retry_promotion` collapses to `def retry_promotion(recipe_id): promote_draft(recipe_id)`.

**NEW turn payload shapes**
- D-10: NEW `photo` turn payload `{"photo_paths": [<storage paths>]}` — same as `recipes.photo_paths`.
- D-11: NEW `url` turn payload `{"url": str}` only.
- D-12: NEW `text` payload `{"text": str}`, `voice` payload `{"transcript": str}`.

**SQL typing + Pydantic shape (THREAD-01)**
- D-13: `recipe_turns.sender` and `.kind` are TEXT + CHECK. `sender CHECK (sender IN ('user','system'))`. `kind CHECK (kind IN ('text','voice','photo','url','answer','proposal_accepted','proposal_dismissed','summary','question','advisory'))`.
- D-14: Both vocabularies mirror to `frontend/lib/enums.ts` AND `backend/app/models/enums.py` in the same atomic change.
- D-15: Pydantic `TurnPayload` is discriminated union on `kind` (Pydantic v2 `Annotated[Union[...], Field(discriminator='kind')]`).
- D-16: `recipe_turns.position` is 0-indexed. `UNIQUE(recipe_id, position)` constraint. Service code does `max(position)+1` on insert.

### Claude's Discretion
- Migration filename: `0009_add_recipe_turns_and_drop_source_capture.py`
- Exact `upgrade()` ordering (see Architecture Patterns §Recommended upgrade order)
- Indexes beyond required UNIQUE — researcher proposes one additional index
- Backfill implementation: pure SQL (recommended) vs Python loop
- `downgrade()` best-effort reverse approach
- Whether to expose `initial_turn_kind: TurnKind | null` on `RecipeResponse` (synthesized) vs `turns: list[TurnResponse]`. Research recommends synthesized scalar (see §Architecture Patterns §API Shape Decision).

### Deferred Ideas (OUT OF SCOPE)
- Per-member attribution on user turns (`member_id`)
- Origin tags on voice/text turns
- LLM emission of `summary`/`question`/`advisory` turns (Phase 29)
- `manually_edited_fields` write path on PUT (Phase 28 DETAIL-05)
- `POST /recipes/{id}/turns` endpoint (Phase 26)
- URL extraction (Phase 26 TURN-04)
- `turn.created` WebSocket broadcast (Phase 26 TURN-03)
- GET /recipes/{id}/turns endpoint (Phase 26)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THREAD-01 | `recipe_turns` table with columns, UNIQUE constraint, index | §Alembic migration mechanics: table DDL, UNIQUE, index patterns |
| THREAD-02 | `source_capture` dropped in same migration; deterministic backfill; all readers rewritten | §Backfill SQL patterns, §Frontend cutover |
| THREAD-03 | `recipes.manually_edited_fields JSONB NOT NULL DEFAULT '[]'::jsonb` | §Column add pattern (0007/0008 precedent) |
| THREAD-04 | Four promote functions collapse into `promote_draft(recipe_id)` | §promote_draft implementation, §Photo bytes download |
| MIGRATION-01 | Migration runs cleanly on prod shape; reversible via `alembic downgrade -1` | §Reversibility, §Downgrade gotchas |
| MIGRATION-02 | `uv run seed` updated; one initial turn per recipe; `grep source_capture backend/` = 0 | §seed.py rewrite, §Grep gates |
</phase_requirements>

---

## Summary

Phase 25 is a database cutover and service-layer consolidation. The migration is architecturally straightforward but requires careful sequencing: (1) create `recipe_turns` table, (2) add `manually_edited_fields` column, (3) DELETE failed-status rows, (4) backfill one turn per surviving recipe from `source_capture` JSONB, (5) drop `source_capture`. All five operations run in a single Alembic `upgrade()` transaction.

The four `promote_*_draft` functions collapse into `promote_draft(recipe_id: UUID)` which reads `recipe_turns` via its own `SessionLocal` (established BackgroundTask pattern). Photo capture changes from passing raw bytes to the BackgroundTask to uploading to Storage in the router and downloading in the BackgroundTask — storage3's `SyncBucket.download(path)` method exists and returns `bytes` directly. [VERIFIED: live storage3 install at `.venv/lib/python3.12/site-packages/storage3/_sync/file_api.py:459`]

The frontend cutover is surgical: `source_capture` removed from `Recipe` type in `frontend/lib/recipes.ts`, replaced by `initial_turn_kind: TurnKind | null`. `RecipeDraftCard.tsx` line 65 rewrites from `recipe.source_capture?.type` to `recipe.initial_turn_kind`. E2E tests in `frontend/tests/e2e/capture-full.spec.ts` and `capture-quick.spec.ts` reference `source_capture` and must be updated.

**Primary recommendation:** Implement the migration as pure SQL backfill (four `INSERT … SELECT` statements, one per `source_capture.type` value) for atomicity and speed on prod data. Use `jsonb_extract_path_text` for defensive NULL-safe extraction. The `downgrade()` should reconstruct `source_capture` from the first user turn and explicitly document that failed-row deletions (D-05) are irrecoverable on downgrade.

---

## Standard Stack

All libraries already present in the project. No new dependencies.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Alembic | `>=1.13` | Migration orchestration | Already wired; Railway runs `alembic upgrade head` on deploy |
| SQLAlchemy | `>=2.0` | ORM + typed mapped_column | Established pattern throughout `backend/app/models/` |
| Pydantic | `>=2` | Schema validation + discriminated union | Already used for all recipe schemas |
| supabase-py | `>=2.0` | Storage upload + download | Already wired in `services/storage.py`; `SyncBucket.download()` confirmed |

[VERIFIED: `backend/pyproject.toml` dependencies]

### No New Packages Needed

The entire phase is implemented with existing dependencies. `storage3.SyncBucket.download(path: str) -> bytes` is the only capability addition needed (reading from Storage in the BackgroundTask), and it is already available in the installed `storage3` package. [VERIFIED: `storage3/_sync/file_api.py:459`]

---

## Architecture Patterns

### Recommended upgrade() Ordering

The sequence matters. Dropping `source_capture` must come AFTER backfill; deleting failed rows must come BEFORE backfill (so we don't try to infer a turn kind from a failed row's malformed JSONB).

```python
# Source: derived from established patterns in 0007 and 0001_baseline.py
def upgrade() -> None:
    # Step 1: create recipe_turns table
    op.create_table(
        "recipe_turns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("recipe_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("recipes.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("sender", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False,
                  server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint(
        "uq_recipe_turns_recipe_position", "recipe_turns",
        ["recipe_id", "position"],
    )
    op.create_index(
        "idx_recipe_turns_recipe_position", "recipe_turns",
        ["recipe_id", "position"],
    )
    op.create_check_constraint(
        "recipe_turns_sender_check", "recipe_turns",
        "sender IN ('user','system')",
    )
    op.create_check_constraint(
        "recipe_turns_kind_check", "recipe_turns",
        "kind IN ('text','voice','photo','url','answer','proposal_accepted',"
        "'proposal_dismissed','summary','question','advisory')",
    )

    # Step 2: add manually_edited_fields to recipes
    op.add_column(
        "recipes",
        sa.Column("manually_edited_fields", postgresql.JSONB(),
                  nullable=False, server_default=sa.text("'[]'::jsonb")),
    )

    # Step 3: DELETE failed rows (D-05) — before backfill, ON DELETE CASCADE
    # removes any cooking_logs/votes rows that reference these recipe IDs.
    op.execute("DELETE FROM recipes WHERE status = 'failed'")

    # Step 4: Backfill one initial turn per surviving recipe
    # Pure SQL — four INSERT … SELECT statements, one per source_capture.type.
    # jsonb_extract_path_text is NULL-safe; WHERE guards are defensive.

    # 4a. manual captures → text turn (D-01)
    op.execute("""
        INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload)
        SELECT
            id,
            0,
            'user',
            'text',
            jsonb_build_object(
                'text',
                COALESCE(
                    jsonb_extract_path_text(source_capture, 'payload', 'title'),
                    title
                )
            )
        FROM recipes
        WHERE source_capture->>'type' = 'manual'
    """)

    # 4b. photo captures → photo turn with empty payload (D-02)
    op.execute("""
        INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload)
        SELECT id, 0, 'user', 'photo', '{}'::jsonb
        FROM recipes
        WHERE source_capture->>'type' = 'photo'
    """)

    # 4c. url captures → url turn (D-03)
    op.execute("""
        INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload)
        SELECT
            id,
            0,
            'user',
            'url',
            jsonb_build_object(
                'url',
                jsonb_extract_path_text(source_capture, 'payload', 'url')
            )
        FROM recipes
        WHERE source_capture->>'type' = 'url'
    """)

    # 4d. voice captures → voice turn (D-04)
    op.execute("""
        INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload)
        SELECT
            id,
            0,
            'user',
            'voice',
            jsonb_build_object(
                'transcript',
                jsonb_extract_path_text(source_capture, 'payload', 'transcript')
            )
        FROM recipes
        WHERE source_capture->>'type' = 'voice'
    """)

    # Step 5: Drop source_capture (all readers already rewritten in same commit)
    op.drop_column("recipes", "source_capture")
```

[VERIFIED: `jsonb_extract_path_text` syntax confirmed from PostgreSQL pattern; `jsonb_build_object` is standard PG 9.4+; migration style mirrors `0007_add_recipe_difficulty_cook_time_description.py`]

### Recommended downgrade() Pattern

```python
def downgrade() -> None:
    # Re-add source_capture NOT NULL — we have to allow NULL temporarily
    # to add the column, backfill, then set NOT NULL.
    op.add_column(
        "recipes",
        sa.Column("source_capture", postgresql.JSONB(), nullable=True),
    )

    # Reconstruct source_capture from the first user turn (inverse of D-01..D-04).
    # Failed-row deletion (D-05) is irrecoverable on downgrade — those rows are gone.
    op.execute("""
        UPDATE recipes r
        SET source_capture = (
            SELECT
                CASE t.kind
                    WHEN 'text' THEN
                        jsonb_build_object('type', 'manual',
                            'payload', jsonb_build_object('title',
                                t.payload->>'text'))
                    WHEN 'photo' THEN
                        jsonb_build_object('type', 'photo',
                            'payload', jsonb_build_object('photo_paths',
                                COALESCE(t.payload->'photo_paths', '[]'::jsonb)))
                    WHEN 'url' THEN
                        jsonb_build_object('type', 'url',
                            'payload', jsonb_build_object('url',
                                t.payload->>'url'))
                    WHEN 'voice' THEN
                        jsonb_build_object('type', 'voice',
                            'payload', jsonb_build_object('transcript',
                                t.payload->>'transcript'))
                    ELSE
                        jsonb_build_object('type', t.kind, 'payload', t.payload)
                END
            FROM recipe_turns t
            WHERE t.recipe_id = r.id
              AND t.sender = 'user'
              AND t.position = 0
            LIMIT 1
        )
        WHERE r.source_capture IS NULL
    """)

    # Any recipe with no first user turn (should not exist after a clean upgrade,
    # but defensive fallback prevents NOT NULL violation).
    op.execute("""
        UPDATE recipes
        SET source_capture = '{"type": "manual", "payload": {}}'::jsonb
        WHERE source_capture IS NULL
    """)

    # Now enforce NOT NULL.
    op.alter_column("recipes", "source_capture", nullable=False)

    # Drop recipe_turns and manually_edited_fields
    op.drop_constraint("recipe_turns_kind_check", "recipe_turns", type_="check")
    op.drop_constraint("recipe_turns_sender_check", "recipe_turns", type_="check")
    op.drop_index("idx_recipe_turns_recipe_position")
    op.drop_constraint("uq_recipe_turns_recipe_position", "recipe_turns",
                       type_="unique")
    op.drop_table("recipe_turns")
    op.drop_column("recipes", "manually_edited_fields")
```

**Downgrade is best-effort.** Failed rows deleted by D-05 are permanently gone. The first-turn CASE reconstruction faithfully inverts D-01 through D-04 for surviving rows.

### RecipeTurn SQLAlchemy Model

New file: `backend/app/models/recipe_turn.py`

```python
from __future__ import annotations
from datetime import datetime
from uuid import UUID as PyUUID
from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class RecipeTurn(Base):
    __tablename__ = "recipe_turns"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True,
        server_default=func.gen_random_uuid(),
    )
    recipe_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recipes.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    sender: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("recipe_id", "position",
                         name="uq_recipe_turns_recipe_position"),
        Index("idx_recipe_turns_recipe_position", "recipe_id", "position"),
        CheckConstraint("sender IN ('user','system')",
                        name="recipe_turns_sender_check"),
        CheckConstraint(
            "kind IN ('text','voice','photo','url','answer',"
            "'proposal_accepted','proposal_dismissed','summary',"
            "'question','advisory')",
            name="recipe_turns_kind_check",
        ),
    )
```

[VERIFIED: mirrors `Recipe` model pattern in `backend/app/models/recipe.py`; ON DELETE CASCADE matches `cooking_logs.recipe_id` precedent in `0001_baseline.py:224`]

### Locked-Vocabulary Enum Pattern

**Python (`backend/app/models/enums.py`)** — append at bottom, mirroring `Difficulty`:

```python
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
```

**TypeScript (`frontend/lib/enums.ts`)** — append at bottom, mirroring `Difficulty`:

```typescript
export const TurnSender = {
  user: "user",
  system: "system",
} as const;
export type TurnSender = (typeof TurnSender)[keyof typeof TurnSender];

export const TurnKind = {
  text: "text",
  voice: "voice",
  photo: "photo",
  url: "url",
  answer: "answer",
  proposal_accepted: "proposal_accepted",
  proposal_dismissed: "proposal_dismissed",
  summary: "summary",
  question: "question",
  advisory: "advisory",
} as const;
export type TurnKind = (typeof TurnKind)[keyof typeof TurnKind];
```

[VERIFIED: matches `Difficulty` pattern in `frontend/lib/enums.ts:50-55` and `backend/app/models/enums.py:47-50` exactly]

### Pydantic v2 Discriminated Union for TurnPayload

New schemas in `backend/app/schemas/recipe_turn.py`:

```python
from __future__ import annotations
from datetime import datetime
from typing import Annotated, List, Literal, Optional, Union
from uuid import UUID
from pydantic import BaseModel, Field

# Per-kind payload schemas (D-15)
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
    # Phase 26 will add in_reply_to_turn_id, field, value

# System turn payloads — Phase 29 defines content shape; P25 needs stubs
# so the discriminated union covers all CHECK-constraint values.
class ProposalAcceptedPayload(BaseModel):
    kind: Literal["proposal_accepted"]

class ProposalDismissedPayload(BaseModel):
    kind: Literal["proposal_dismissed"]

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
    id: UUID
    recipe_id: UUID
    position: int
    sender: str
    kind: str
    payload: dict  # raw JSONB; TurnPayload used for write-side validation
    created_at: datetime

    model_config = {"from_attributes": True}
```

**Key insight on discriminator field:** Pydantic v2 discriminated unions require the `kind` Literal to appear as a field INSIDE each member model (not just as a type annotation). The `kind` field must be present in the stored `payload` JSONB for this to validate cleanly on read — but `recipe_turns.kind` is a separate column. For Phase 25, keep `TurnPayload` for write-side validation at `POST /turns` (Phase 26). The read-side `TurnResponse` can use raw `dict` for `payload` since Phase 25 does not expose a `/turns` endpoint.

[ASSUMED: Pydantic v2 discriminated union syntax — training knowledge. Should be verified against Pydantic v2 docs if any runtime errors appear. The pattern is widely established.]

### promote_draft(recipe_id) Implementation

```python
from app.models.recipe_turn import RecipeTurn
from app.services import storage as storage_service

def promote_draft(recipe_id: UUID) -> None:
    """Single promote entry point — reads first user turn, dispatches on kind.

    Opens its own SessionLocal (RESEARCH §Pitfall 3 — BackgroundTask sessions).
    NEVER raises — exceptions route through _record_failure / _record_rewrite_failure.
    """
    db = SessionLocal()
    try:
        recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
        if recipe is None:
            log.warning("promote_draft: recipe %s vanished", recipe_id)
            return

        # Read first user turn — must exist (created by router before task queued).
        first_turn = db.scalar(
            select(RecipeTurn)
            .where(
                RecipeTurn.recipe_id == recipe_id,
                RecipeTurn.sender == "user",
                RecipeTurn.position == 0,
            )
        )
        if first_turn is None:
            log.warning("promote_draft: no first user turn for recipe %s", recipe_id)
            return

        try:
            if first_turn.kind in ("text", "manual"):
                # Quick/full-form: rewrite title from turn payload
                original_title = (
                    (first_turn.payload or {}).get("text") or recipe.title
                )
                new_title = rewrite_title(original_title, {})
                recipe.title = new_title
                recipe.illustration_svg = _generate_and_sanitize_illustration(recipe.title)
                recipe.status = "structured"
                recipe.promotion_error = None
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)

            elif first_turn.kind == "voice":
                transcript = (first_turn.payload or {}).get("transcript") or ""
                if not transcript.strip():
                    raise ValueError("promote_draft voice: empty transcript")
                extracted = extract_from_transcript(transcript)
                _apply_extracted(recipe, extracted)
                recipe.illustration_svg = _generate_and_sanitize_illustration(recipe.title)
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)

            elif first_turn.kind == "photo":
                photo_paths = (first_turn.payload or {}).get("photo_paths") or []
                if not photo_paths:
                    # Legacy backfill turn (D-02) has empty payload — fall back
                    # to recipe.photo_paths which is set by the router.
                    photo_paths = list(recipe.photo_paths or [])
                if not photo_paths:
                    raise ValueError("promote_draft photo: no photo paths")
                # Download bytes from Supabase Storage (D-08)
                photo_bytes_list = [
                    storage_service.download_recipe_photo(path)
                    for path in photo_paths
                ]
                extracted = extract_from_photos(photo_bytes_list)
                _apply_extracted(recipe, extracted)
                recipe.illustration_svg = _generate_and_sanitize_illustration(recipe.title)
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)

            elif first_turn.kind == "url":
                # URL: no Gemini in Phase 25 (TURN-04 is Phase 26).
                # Stamp structured so the draft card leaves the inbox.
                recipe.status = "structured"
                recipe.promotion_error = None
                recipe.promotion_attempts = (recipe.promotion_attempts or 0) + 1
                db.commit()
                db.refresh(recipe)
                _broadcast_promoted(recipe)

            else:
                raise ValueError(f"promote_draft: unknown turn kind {first_turn.kind!r}")

        except Exception as exc:  # noqa: BLE001
            _record_failure(db, recipe, exc)
    finally:
        db.close()
```

**Race-condition safety:** The BackgroundTask is queued AFTER the turn is inserted and the request session is committed (`db.commit()` + `db.refresh()` in the router, then `background_tasks.add_task(...)`). By the time the BackgroundTask's own `SessionLocal` reads, the turn row is visible. [VERIFIED: existing router pattern at `recipes.py:176-186` — `db.commit()` → `db.refresh()` → `await broadcast_to_household()` → `background_tasks.add_task(promote_full_draft, recipe.id)`. Same order preserved in all five POST handlers.]

### Storage Download Helper

`storage_service` must gain a `download_recipe_photo(path: str) -> bytes` function:

```python
def download_recipe_photo(path: str) -> bytes:
    """Download bytes from Supabase Storage by bucket-relative path.

    Returns raw bytes. Raises on Supabase error (caller wraps in try/except
    via _record_failure). Used by promote_draft for photo captures (D-08).
    """
    if settings.environment == "test":
        # Test mode: return minimal valid JPEG bytes (for FFD8FF header).
        return b"\xff\xd8\xff\xe0" + b"\x00" * 100

    client = _supabase()
    return client.storage.from_(BUCKET).download(path)
```

[VERIFIED: `storage3.SyncBucket.download(path: str) -> bytes` exists at `_sync/file_api.py:459`. No additional imports needed — `BUCKET` and `_supabase()` already defined in `storage.py`.]

### API Shape Decision: synthesized `initial_turn_kind`

**Recommendation:** Expose `initial_turn_kind: str | None` on `RecipeResponse` (synthesized server-side from the first user turn) rather than full `turns: list[TurnResponse]`.

**Rationale:**
- `RecipeDraftCard.tsx:65` needs exactly one value: `recipe.source_capture?.type` → `recipe.initial_turn_kind`. Replacing one scalar with another is a one-line diff.
- Avoiding a full turns join on every `GET /recipes` list call (21+ recipes) prevents a per-recipe N+1 query.
- Phase 26 adds the dedicated `GET /recipes/{id}/turns` endpoint for full thread hydration. Phase 28 consumes it. Exposing the full turns list on `RecipeResponse` now would duplicate future work.
- `RecipeDraftCard` only needs to distinguish `'photo'` | `'voice'` | `'url'` | `'text'` | `null` for its variant logic — a scalar is sufficient.

**Implementation:** Add a `initial_turn_kind: Optional[str] = None` field to `RecipeResponse`. In `_to_response_payload` (or a new `RecipeWithTurnResponse` variant), query `recipe_turns` for the first user turn and populate this field. Alternatively, add a `@property` or SQLAlchemy `relationship` on `Recipe` to the first turn — but a separate explicit query in the response serializer is simpler and avoids ORM relationship complexity.

**Simpler approach:** Add `initial_turn_kind` as an extra kwarg passed from the router. Each router that creates/reads a recipe can also read `SELECT kind FROM recipe_turns WHERE recipe_id=? AND sender='user' AND position=0 LIMIT 1` in the same session. This is a single indexed lookup (UNIQUE on `recipe_id, position`) — negligible cost.

### Router Rewrite Pattern (one of five POST handlers)

The key changes per router surface:

```python
# Before (quick capture, illustrative):
recipe = Recipe(
    ...
    source_capture={"type": "manual", "payload": body.model_dump()},
    ...
)
db.add(recipe)
db.commit()
db.refresh(recipe)
background_tasks.add_task(promote_quick_draft, recipe.id)

# After (quick capture):
recipe = Recipe(
    ...
    # No source_capture field
    ...
)
db.add(recipe)
db.flush()  # need recipe.id for turn FK

turn = RecipeTurn(
    recipe_id=recipe.id,
    position=0,
    sender="user",
    kind="text",
    payload={"text": body.title},  # D-12
)
db.add(turn)
db.commit()
db.refresh(recipe)
background_tasks.add_task(promote_draft, recipe.id)
```

**Photo router special case (D-08):** Upload to Storage BEFORE creating the turn. Paths go into BOTH `recipe.photo_paths` AND the turn payload:

```python
recipe.photo_paths = paths
turn = RecipeTurn(
    recipe_id=recipe.id,
    position=0,
    sender="user",
    kind="photo",
    payload={"photo_paths": paths},  # D-10
)
db.add(turn)
db.commit()
```

**URL router:** URL capture currently returns without queuing a BackgroundTask (no Gemini in v0.1). After cutover, no BackgroundTask is queued (URL extraction is Phase 26). `status='draft'` stays as-is. The `initial_turn_kind` field on the response will show `'url'` so `RecipeDraftCard` correctly renders the manual/user-completed variant (current logic: `captureType !== 'url'` is a processing signal — this logic flips to `initial_turn_kind !== 'url'`).

### seed.py Rewrite Pattern

The seed must insert one `RecipeTurn` per seeded recipe with a deterministic uuid5 ID:

```python
# uuid5 namespace for turn IDs — deterministic across runs (D-09 carried forward)
def _turn_id(*parts: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, "aldente.test.turn." + ".".join(parts))

# Inside the recipe seed loop, after db.merge(Recipe(...)):
turn_id = _turn_id("recipe", spec["slug"])
db.merge(RecipeTurn(
    id=turn_id,
    recipe_id=recipe_id,
    position=0,
    sender="user",
    kind="text",  # all seeded recipes are manual captures → text turn (D-01)
    payload={"text": spec["title"]},
))
```

The MIGRATION-02 requirement also mandates a representative `summary` system turn per seeded recipe. That is a second `RecipeTurn` at `position=1`:

```python
summary_turn_id = _turn_id("summary", spec["slug"])
db.merge(RecipeTurn(
    id=summary_turn_id,
    recipe_id=recipe_id,
    position=1,
    sender="system",
    kind="summary",
    payload={"text": f"Recette : {spec['title']}"},  # representative placeholder
))
```

The `_id_synth` / `_id` distinction already in `seed.py` applies here — use `_id` for test-seed turns and `_id_synth` for prod-synthetic turns (two separate seed paths in the file at lines 469-501 and 797-830).

### _UPDATE_FORBIDDEN_FIELDS Guard

`recipes.py:92-101` has `_UPDATE_FORBIDDEN_FIELDS`. After the cutover:
- Remove `"source_capture"` from the frozenset.
- `"manually_edited_fields"` should be added IF the Phase 25 plan adds the column but defers write-path to Phase 28 (DETAIL-05). The guard prevents an accidental PUT /recipes/{id} from writing it until Phase 28 wires the logic. **Recommendation: add `"manually_edited_fields"` to `_UPDATE_FORBIDDEN_FIELDS` in Phase 25.**

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSONB extraction in migration | Python row-by-row loop with SQLAlchemy | Pure SQL `INSERT … SELECT` with `jsonb_extract_path_text` | Transactional atomicity; faster on 21+ rows; no ORM session needed in migration context |
| Photo download in BackgroundTask | Custom HTTP client or presigned URL redirect | `storage3.SyncBucket.download(path)` from existing `_supabase()` client | Already wired, returns `bytes`, one function call |
| Discriminated union routing | `if/elif/elif` chain with manual payload parsing | Pydantic v2 `Annotated[Union[...], Field(discriminator='kind')]` | Validates at schema boundary; type-safe for Phase 26 callers |
| Turn UUID generation in seed | `uuid4()` (random, breaks idempotency) | `uuid5(NAMESPACE, "aldente.test.turn.<slug>")` | Matches established `_id()` pattern; re-runs are no-ops |

---

## Common Pitfalls

### Pitfall 1: BackgroundTask Race — Turn Not Visible When Task Reads

**What goes wrong:** Router commits turn insert and immediately calls `background_tasks.add_task(promote_draft, recipe.id)`. If the BackgroundTask's `SessionLocal` opens before the router's commit is flushed to Postgres, `first_turn` returns `None`.

**Why it happens:** FastAPI BackgroundTasks run after the response is sent. The router commit (`db.commit()`) happens before `background_tasks.add_task(...)` in the current code (verified at `recipes.py:176-186`). The task cannot start until the response has been sent, which is after the commit. In practice this race does not exist — the response is sent only after `return RecipeResponse.model_validate(recipe)`, which is after `db.commit()`.

**How to avoid:** Keep the existing order: `db.add(turn)` → `db.commit()` → `db.refresh(recipe)` → `await broadcast_to_household(...)` → `background_tasks.add_task(promote_draft, recipe.id)` → `return`. Never call `add_task` before the commit.

**Warning signs:** `promote_draft: no first user turn for recipe X` log messages.

### Pitfall 2: cooking_logs + votes CASCADE on Failed Row DELETE

**What goes wrong:** Step 3 of `upgrade()` (`DELETE FROM recipes WHERE status='failed'`) will CASCADE-delete `cooking_logs` and `votes` rows that reference the failed recipe IDs — if any exist.

**Why it happens:** `cooking_logs.recipe_id` FK has no `ON DELETE CASCADE` in `0001_baseline.py:224` (no `ondelete` specified — defaults to RESTRICT in PG, but the actual behavior is `NO ACTION` which at commit time would fail, not cascade). Actually: baseline has `sa.ForeignKey("recipes.id")` with no `ondelete` parameter. In PostgreSQL this defaults to `NO ACTION` / `RESTRICT`.

**Critical finding:** [VERIFIED from `0001_baseline.py:222-224`] `cooking_logs.recipe_id` FK does NOT have `ondelete="CASCADE"`. This means a raw `DELETE FROM recipes WHERE status='failed'` would FAIL with a FK violation if any `cooking_logs` rows exist for failed recipes.

**How to avoid:** The migration must delete cooking_logs and votes referencing failed recipes BEFORE deleting the recipes themselves:

```python
op.execute("""
    DELETE FROM cooking_logs
    WHERE recipe_id IN (SELECT id FROM recipes WHERE status = 'failed')
""")
op.execute("""
    DELETE FROM votes
    WHERE recipe_id IN (SELECT id FROM recipes WHERE status = 'failed')
""")
op.execute("DELETE FROM recipes WHERE status = 'failed'")
```

**Votes table:** `0001_baseline.py:318-320` has `sa.ForeignKey("recipes.id")` with no `ondelete` either — confirmed by inspection. Must also be pre-deleted.

**Warning signs:** Alembic migration fails with `ForeignKeyViolation` on the DELETE step.

### Pitfall 3: source_capture NOT NULL Before Backfill Is Complete

**What goes wrong:** If any `source_capture` value is NULL or has a `type` field that doesn't match any of the four INSERT … SELECT WHERE clauses, those recipes get no initial turn. The turn table is empty for them; `promote_draft` would log "no first user turn".

**Why it happens:** Legacy data could have a malformed `source_capture` JSONB (e.g., `{"type": null}` or `{"type": "unknown"}`).

**How to avoid:** Add a defensive fallback INSERT after the four type-specific ones:

```python
op.execute("""
    INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload)
    SELECT id, 0, 'user', 'text',
           jsonb_build_object('text', title)
    FROM recipes r
    WHERE NOT EXISTS (
        SELECT 1 FROM recipe_turns t WHERE t.recipe_id = r.id
    )
""")
```

This catch-all gives any stray recipe a text turn using its title.

**Warning signs:** After migration, `SELECT COUNT(*) FROM recipes r WHERE NOT EXISTS (SELECT 1 FROM recipe_turns t WHERE t.recipe_id = r.id)` returns non-zero.

### Pitfall 4: Photo Branch — Empty Payload for Legacy Backfilled Turns

**What goes wrong:** `promote_draft` for a backfilled photo turn (D-02) calls `(first_turn.payload or {}).get("photo_paths")` which returns `None` (payload is `{}`). The code must fall back to `recipe.photo_paths`.

**Why it happens:** D-02 explicitly backfills photo turns with `{}` empty payload because the paths are already on `recipe.photo_paths` and the turn is just a capture-surface marker.

**How to avoid:** Implement the explicit fallback in `promote_draft` (shown in §Architecture Patterns §promote_draft):

```python
photo_paths = (first_turn.payload or {}).get("photo_paths") or []
if not photo_paths:
    photo_paths = list(recipe.photo_paths or [])
```

### Pitfall 5: _UPDATE_FORBIDDEN_FIELDS Still References source_capture

**What goes wrong:** After removing `source_capture` from the model, the `_UPDATE_FORBIDDEN_FIELDS` frozenset at `recipes.py:93` still contains `"source_capture"`. This is harmless (a non-existent field name in a frozenset is a no-op) but is dead code that should be cleaned up. More importantly, `manually_edited_fields` must be ADDED to the frozenset to prevent Phase 28 write-path from being accidentally short-circuited.

**How to avoid:** In the same change as the router rewrite, update `_UPDATE_FORBIDDEN_FIELDS`:
```python
_UPDATE_FORBIDDEN_FIELDS = frozenset({
    # "source_capture" REMOVED — column dropped in migration 0009
    "manually_edited_fields",  # ADDED — write path owned by Phase 28 DETAIL-05
    "photo_paths",
    "cook_count",
    ...
})
```

### Pitfall 6: E2E Tests Reference source_capture on API Response

**What goes wrong:** `frontend/tests/e2e/capture-full.spec.ts:31` asserts `source_capture: { type: 'manual', payload: { title } }` on the API response. After cutover, the field no longer exists on `RecipeResponse`. Tests will fail.

**How to avoid:** Update the E2E test assertion in the same atomic commit. Replace `source_capture` assertion with `initial_turn_kind` assertion (or remove it if the test goal is only to verify recipe creation, not field shape).

Other frontend test files to update:
- `frontend/tests/e2e/capture-quick.spec.ts:22` — `source_capture` on response mock
- `frontend/tests/e2e/capture-url.spec.ts:19-21` — asserts `source_capture` shape
- `frontend/tests/e2e/capture-voice-failed-recovery.spec.ts:99` — comment reference

### Pitfall 7: Backend Tests Create Recipe with source_capture Column

**What goes wrong:** `backend/tests/test_recipes.py:83` and `:146` create `Recipe` objects with `source_capture={...}`. After the column is removed from the SQLAlchemy model, these will fail with `TypeError: unexpected keyword argument 'source_capture'` or SQLAlchemy will raise on flush.

**How to avoid:** Update test fixtures in the same change. Replace `source_capture` column writes with a corresponding `RecipeTurn` insert. The test's `RecipeTurn` can use a plain `uuid4()` (tests roll back anyway). Similarly `backend/tests/test_cooking_logs_history.py:185`.

### Pitfall 8: Pydantic v2 Discriminated Union — `kind` Must Be in Payload JSONB

**What goes wrong:** The discriminated union on `kind` requires each member's `kind` field to be present in the input dict. When reading from the DB, `recipe_turns.payload` is a raw JSONB dict that does NOT contain `kind` (kind is a separate column). If you try to instantiate `TurnPayload` from `row.payload` alone, Pydantic will fail because `kind` is missing from the dict.

**How to avoid:** On read, merge `kind` into the payload dict before validation:

```python
payload_with_kind = {**turn.payload, "kind": turn.kind}
validated = TurnPayload.model_validate(payload_with_kind)
```

Or use `TurnPayload` only at the write boundary (Phase 26's `POST /turns`) and keep `TurnResponse.payload` as raw `dict` for Phase 25.

---

## Frontend Cutover Map

All frontend files touching `source_capture` — exact locations verified:

| File | Current reference | Required change |
|------|------------------|-----------------|
| `frontend/lib/recipes.ts:25` | `source_capture: { type: string; payload?: unknown }` | Remove; add `initial_turn_kind?: string \| null` |
| `frontend/components/RecipeDraftCard.tsx:65` | `const captureType = recipe.source_capture?.type` | `const captureType = recipe.initial_turn_kind` |
| `frontend/components/RecipeDraftCard.tsx:13` | Comment references `source_capture.type` | Update comment |
| `frontend/components/RecipeDraftCard.tsx:11` | Comment describes `source_capture` behavior | Update comment |
| `frontend/components/UrlCaptureTab.tsx:8` | Comment says URL stored in `source_capture` | Update comment |
| `frontend/lib/recipe-completeness.ts:10` | Comment: `source_capture` excluded from scoring | Update comment |
| `frontend/lib/recipe-completeness.test.ts:230` | `isFieldKey("source_capture")` → expects `false` | This test remains valid (source_capture is not a recipe field key) — no change needed; the assertion still correctly returns false for a non-existent key |
| `frontend/tests/e2e/capture-full.spec.ts:31` | Response assertion `source_capture` | Replace with `initial_turn_kind: 'text'` |
| `frontend/tests/e2e/capture-quick.spec.ts:22` | Response mock `source_capture` | Replace with `initial_turn_kind: 'text'` |
| `frontend/tests/e2e/capture-url.spec.ts:19-21` | Asserts `source_capture` shape | Replace with `initial_turn_kind: 'url'` |
| `frontend/tests/e2e/capture-voice-failed-recovery.spec.ts:99` | Comment only | Update comment |

[VERIFIED: all file locations confirmed by grep against live codebase]

**RecipeDraftCard variant logic rewrite:**

Current logic (line 71-77) uses `captureType !== 'manual'` and `captureType !== 'url'` to determine `isProcessing`. After cutover, `initial_turn_kind` replaces `source_capture.type`. The mapping is 1:1: `'manual'` → `'text'`. Update:

```typescript
const captureType = recipe.initial_turn_kind;
const isProcessing =
  recipe.status === "draft" &&
  recipe.promotion_error == null &&
  captureType !== "text" &&   // was: 'manual'
  captureType !== "url";
```

---

## Runtime State Inventory

**Trigger:** This phase modifies the database schema and drops a column — not a rename/refactor of string literals. Runtime state audit applies to: does anything outside git store or cache `source_capture`?

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `recipes.source_capture` JSONB column in Supabase Postgres — prod has ~21+ seeded recipes + user-created recipes | Handled by Alembic migration `upgrade()` — backfill then drop |
| Live service config | None — `source_capture` is not referenced in n8n, Datadog, or any external service config | None |
| OS-registered state | None | None |
| Secrets/env vars | None — `source_capture` is a column name, not a secret key | None |
| Build artifacts | None — no compiled artifacts reference `source_capture` | None |

**Nothing found outside migration scope:** Verified by grep — all `source_capture` references are in Python source files and frontend TypeScript. No external service caches this field name. [VERIFIED: grep output above]

---

## Grep Gates (Verification Commands)

The planner should bake these into task verification steps:

```bash
# Success criterion 2 — backend zero matches
grep -rn "source_capture" backend/ | grep -v __pycache__ | grep -v ".pyc"
# Expected: 0 matches (zero output)

# Success criterion 2 — schema check
grep -rn "source_capture" backend/app/ | grep -v __pycache__
# Expected: 0 matches

# Locked vocabulary drift check
grep -n "TurnKind\|TurnSender" backend/app/models/enums.py
grep -n "TurnKind\|TurnSender" frontend/lib/enums.ts
# Expected: both return matching vocabulary blocks

# Turn count matches recipe count after migration
# (run via psql or alembic execute — confirms backfill)
# SELECT COUNT(*) FROM recipes WHERE status != 'failed';
# SELECT COUNT(*) FROM recipe_turns WHERE position = 0 AND sender = 'user';
# Expected: both equal

# No frontend source_capture references in component/lib code
grep -rn "source_capture" frontend/lib/ frontend/components/ | grep -v ".test."
# Expected: 0 matches (test files may keep "source_capture" as a negative assertion)
```

---

## Environment Availability

Step 2.6: External dependencies for this phase are all already available. No new tools required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (Supabase) | Migration execution | ✓ | Supabase managed PG | Railway env has DATABASE_URL |
| Alembic | Migration runner | ✓ | `>=1.13` (pyproject.toml) | — |
| supabase-py | Photo download in promote_draft | ✓ | `>=2.0` (pyproject.toml) | — |
| storage3 SyncBucket.download | Photo bytes download | ✓ | Installed at `.venv/lib/python3.12/site-packages/storage3/` | — |

---

## Code Examples

### jsonb_extract_path_text NULL safety

```sql
-- NULL-safe path extraction — returns NULL if source_capture is NULL
-- or if the nested key doesn't exist. COALESCE handles both.
SELECT
    id,
    jsonb_extract_path_text(source_capture, 'payload', 'title') AS extracted_title,
    COALESCE(
        jsonb_extract_path_text(source_capture, 'payload', 'title'),
        title
    ) AS safe_title
FROM recipes
WHERE source_capture->>'type' = 'manual';
```

[VERIFIED: standard PostgreSQL JSONB functions; `->>'type'` extracts as text, `jsonb_extract_path_text` navigates nested paths]

### Adding NOT NULL JSONB column with default (migration precedent)

```python
# Mirrors the manually_edited_fields addition (THREAD-03)
# server_default must use sa.text() to pass a literal SQL expression.
op.add_column(
    "recipes",
    sa.Column(
        "manually_edited_fields",
        postgresql.JSONB(),
        nullable=False,
        server_default=sa.text("'[]'::jsonb"),
    ),
)
```

[VERIFIED: `sa.text()` wrapper is required for server-side SQL expressions; matches `cook_count` pattern in `0001_baseline.py` and `promotion_attempts` in `0003_promotion_columns.py`]

### Alembic op.execute for raw SQL in migration

```python
# Raw SQL in Alembic upgrade() — preferred for data manipulation
op.execute("DELETE FROM cooking_logs WHERE recipe_id IN (...)")
op.execute("""
    INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload)
    SELECT ...
    FROM recipes
    WHERE source_capture->>'type' = 'manual'
""")
```

[VERIFIED: `op.execute()` is the established Alembic pattern for raw SQL; used in `0006_recipe_status_failed.py` which runs raw DDL/DML]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pydantic v2 discriminated union syntax (Annotated[Union[...], Field(discriminator='kind')]) | Architecture Patterns §Pydantic Discriminated Union | If wrong: runtime validation error at schema import; fix: consult Pydantic v2 docs |
| A2 | `op.create_unique_constraint` followed by `op.create_index` on same columns does not fail — Alembic treats UNIQUE and INDEX as separate objects | Architecture Patterns §upgrade() ordering | If wrong: Alembic error "index already exists"; fix: use `unique=True` on `op.create_index` instead of separate UNIQUE constraint |
| A3 | `backend/tests/test_recipes.py` and `test_cooking_logs_history.py` test fixtures that create `Recipe(source_capture=...)` directly will break (not just fail assertion) after model column removal | Common Pitfalls §Pitfall 7 | Low risk — SQLAlchemy will raise at flush; easy to find and fix |
| A4 | The `summary` system turn required by MIGRATION-02 in `seed.py` is a placeholder shape (no structured payload needed in Phase 25) | seed.py rewrite pattern | If wrong (MIGRATION-02 requires a specific shape): update payload to match whatever Phase 29 defines |

**If this table is empty of HIGH-risk items:** The only assumption with meaningful risk is A2 (UNIQUE + INDEX duplication). The executor should verify by running `alembic upgrade head` against a test DB before shipping.

---

## Open Questions

1. **Does `cooking_logs.recipe_id` FK default to RESTRICT or NO ACTION in Postgres?**
   - What we know: `0001_baseline.py:224` has `sa.ForeignKey("recipes.id")` with no `ondelete`. PostgreSQL default is `NO ACTION` (equivalent to `RESTRICT` at end of statement, checked at commit time).
   - What's clear from code: The migration MUST pre-delete `cooking_logs` and `votes` rows referencing failed recipes before `DELETE FROM recipes`. Pitfall 2 covers this.
   - Recommendation: Treat as RESTRICT, always pre-delete child rows. No user confirmation needed.

2. **Should `initial_turn_kind` be populated by a JOIN in the list endpoint, or a separate property?**
   - What we know: `GET /recipes` list returns 50+ recipes. A JOIN on `recipe_turns` with `WHERE position=0 AND sender='user'` using the UNIQUE index is O(1) per recipe lookup.
   - What's unclear: Whether to use SQLAlchemy `relationship` or explicit query in serialization.
   - Recommendation: Explicit `SELECT kind FROM recipe_turns WHERE recipe_id=? AND position=0 AND sender='user'` in the `_to_response_payload` helper, or a `LEFT JOIN` on the `GET /recipes` list query. Avoid adding an ORM `relationship` to `Recipe` for Phase 25 since Phase 26 will add a proper `GET /recipes/{id}/turns` endpoint.

---

## Sources

### Primary (HIGH confidence — verified from live codebase)
- `backend/app/models/recipe.py` — current Recipe model, source_capture column shape
- `backend/app/services/llm.py:538-756` — four promote_* function bodies to collapse
- `backend/app/routers/recipes.py:76-617` — all five POST handlers + router guard pattern
- `backend/app/schemas/recipe.py` — RecipeResponse and RecipeUpdate shapes
- `backend/app/models/enums.py` — Difficulty pattern to mirror for TurnSender/TurnKind
- `frontend/lib/enums.ts` — TS enum pattern to mirror
- `backend/alembic/versions/0007_add_recipe_difficulty_cook_time_description.py` — TEXT+CHECK migration template
- `backend/alembic/versions/0008_add_recipe_illustration_svg.py` — minimal column-add pattern
- `backend/alembic/versions/0001_baseline.py` — FK patterns for cooking_logs/votes
- `backend/app/services/storage.py` — upload helpers + `_supabase()` client factory
- `backend/.venv/lib/python3.12/site-packages/storage3/_sync/file_api.py:459` — `download()` method signature
- `backend/app/cli/seed.py` — `uuid5` + `Session.merge` idempotency pattern
- `frontend/components/RecipeDraftCard.tsx:65` — exact line of source_capture read
- `frontend/tests/e2e/capture-*.spec.ts` — four E2E test files referencing source_capture

### Tertiary (LOW confidence — not independently verified)
- Pydantic v2 discriminated union `Annotated[Union[...], Field(discriminator='kind')]` syntax [ASSUMED — training knowledge; project uses Pydantic >=2]

---

## Metadata

**Confidence breakdown:**
- Migration mechanics: HIGH — all patterns verified against live alembic files and source
- promote_draft implementation: HIGH — verified against existing promote_* bodies and storage3
- Locked-vocabulary mirroring: HIGH — exact pattern verified from Phase 24 RID-02 precedent
- Frontend cutover: HIGH — all source_capture references grepped from live codebase
- Pydantic discriminated union syntax: MEDIUM/LOW — assumed from training; testable at import time

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (library versions stable; only risk is supabase-py API change)
