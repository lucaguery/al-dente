"""Phase 25 THREAD-01 — create recipe_turns + add manually_edited_fields + drop source_capture.

Upgrade sequence (single transaction):
  1. CREATE TABLE recipe_turns (id, recipe_id FK CASCADE, position, sender TEXT+CHECK,
     kind TEXT+CHECK, payload JSONB, created_at) with UNIQUE(recipe_id, position) and
     INDEX(recipe_id, position).
  2. ALTER TABLE recipes ADD COLUMN manually_edited_fields JSONB NOT NULL DEFAULT '[]'.
  3. Pre-delete child rows of failed recipes (cooking_logs + votes FKs have NO ondelete
     cascade in 0001_baseline.py — would raise ForeignKeyViolation without pre-delete).
     Then DELETE failed recipes (D-05: irrecoverable, intentional clean-cutover trade-off).
  4. Backfill one initial user turn per surviving recipe via 4 type-specific INSERT…SELECT
     statements + 1 catch-all fallback (Pitfall 3 defense). Pure SQL, single transaction.
  5. DROP COLUMN recipes.source_capture (all readers rewritten in same commit — Plan 02).

Downgrade is best-effort:
  - Re-adds source_capture as JSONB nullable, reconstructs from first user turn
    (inverse of D-01..D-04), then enforces NOT NULL.
  - Failed-row deletion (D-05) is irrecoverable on downgrade — those rows are permanently gone.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Create recipe_turns table with all constraints and indexes.
    op.create_table(
        "recipe_turns",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "recipe_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("sender", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_unique_constraint(
        "uq_recipe_turns_recipe_position",
        "recipe_turns",
        ["recipe_id", "position"],
    )
    op.create_index(
        "idx_recipe_turns_recipe_position",
        "recipe_turns",
        ["recipe_id", "position"],
    )
    op.create_check_constraint(
        "recipe_turns_sender_check",
        "recipe_turns",
        "sender IN ('user','system')",
    )
    op.create_check_constraint(
        "recipe_turns_kind_check",
        "recipe_turns",
        "kind IN ('text','voice','photo','url','answer','proposal_accepted',"
        "'proposal_dismissed','summary','question','advisory')",
    )

    # Step 2: Add manually_edited_fields column to recipes (THREAD-03).
    # Write path is Phase 28 DETAIL-05 — column added here with safe default.
    op.add_column(
        "recipes",
        sa.Column(
            "manually_edited_fields",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )

    # Step 3: Pre-delete child rows of failed recipes before deleting failed recipes.
    # cooking_logs.recipe_id and votes.recipe_id FKs in 0001_baseline.py have no
    # ondelete cascade — a direct DELETE FROM recipes would raise ForeignKeyViolation.
    op.execute(
        "DELETE FROM cooking_logs"
        " WHERE recipe_id IN (SELECT id FROM recipes WHERE status = 'failed')"
    )
    op.execute(
        "DELETE FROM votes"
        " WHERE recipe_id IN (SELECT id FROM recipes WHERE status = 'failed')"
    )
    # D-05: Recipes with status='failed' are deleted (intentional clean-cutover trade-off;
    # failed rows are broken — extraction failed and photo retry is limited).
    op.execute("DELETE FROM recipes WHERE status = 'failed'")

    # Step 4: Backfill one initial user turn per surviving recipe.
    # Pure SQL INSERT…SELECT per source_capture.type — transactional atomicity.
    # jsonb_extract_path_text is NULL-safe; WHERE guards are type-specific.
    # created_at mirrors recipes.created_at to preserve temporal ordering.

    # 4a. manual captures → text turn (D-01)
    op.execute("""
        INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload, created_at)
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
            ),
            created_at
        FROM recipes
        WHERE source_capture->>'type' = 'manual'
    """)

    # 4b. photo captures → photo turn with empty payload (D-02)
    # recipes.photo_paths remains the source of truth for legacy photo paths.
    op.execute("""
        INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload, created_at)
        SELECT id, 0, 'user', 'photo', '{}'::jsonb, created_at
        FROM recipes
        WHERE source_capture->>'type' = 'photo'
    """)

    # 4c. url captures → url turn (D-03)
    op.execute("""
        INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload, created_at)
        SELECT
            id,
            0,
            'user',
            'url',
            jsonb_build_object(
                'url',
                jsonb_extract_path_text(source_capture, 'payload', 'url')
            ),
            created_at
        FROM recipes
        WHERE source_capture->>'type' = 'url'
    """)

    # 4d. voice captures → voice turn (D-04)
    op.execute("""
        INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload, created_at)
        SELECT
            id,
            0,
            'user',
            'voice',
            jsonb_build_object(
                'transcript',
                jsonb_extract_path_text(source_capture, 'payload', 'transcript')
            ),
            created_at
        FROM recipes
        WHERE source_capture->>'type' = 'voice'
    """)

    # 4e. Catch-all: any recipe whose source_capture.type didn't match above
    # (malformed JSONB, NULL type, unknown type) gets a text turn using the title.
    # Prevents recipes from being left with no initial turn (Pitfall 3).
    op.execute("""
        INSERT INTO recipe_turns (recipe_id, position, sender, kind, payload, created_at)
        SELECT id, 0, 'user', 'text',
               jsonb_build_object('text', title),
               created_at
        FROM recipes r
        WHERE NOT EXISTS (
            SELECT 1 FROM recipe_turns t WHERE t.recipe_id = r.id
        )
    """)

    # Step 5: Sanity check — every remaining recipe has exactly one turn at position 0.
    # (Runs inside the same transaction; will rollback on violation.)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM recipes r
                WHERE NOT EXISTS (
                    SELECT 1 FROM recipe_turns t
                    WHERE t.recipe_id = r.id AND t.position = 0
                )
            ) THEN
                RAISE EXCEPTION 'migration 0009: recipe(s) missing position=0 turn after backfill';
            END IF;
        END;
        $$
    """)

    # Step 6: Drop source_capture — all readers rewritten in Plans 02+03.
    op.drop_column("recipes", "source_capture")


def downgrade() -> None:
    # Failed-row deletion (upgrade D-05) is irrecoverable on downgrade — those rows are permanently gone.

    # Re-add source_capture as nullable first (can't add NOT NULL without a default
    # when rows already exist).
    op.add_column(
        "recipes",
        sa.Column("source_capture", postgresql.JSONB(), nullable=True),
    )

    # Reconstruct source_capture from the first user turn (inverse of D-01..D-04).
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

    # Defensive fallback: any recipe with no first user turn gets a minimal manual shape.
    op.execute("""
        UPDATE recipes
        SET source_capture = '{"type": "manual", "payload": {}}'::jsonb
        WHERE source_capture IS NULL
    """)

    # Enforce NOT NULL now that all rows are populated.
    op.alter_column("recipes", "source_capture", nullable=False)

    # Drop recipe_turns constraints, index, and table.
    op.drop_constraint("recipe_turns_kind_check", "recipe_turns", type_="check")
    op.drop_constraint("recipe_turns_sender_check", "recipe_turns", type_="check")
    op.drop_index("idx_recipe_turns_recipe_position")
    op.drop_constraint(
        "uq_recipe_turns_recipe_position", "recipe_turns", type_="unique"
    )
    op.drop_table("recipe_turns")

    # Drop manually_edited_fields column (THREAD-03 reverse).
    op.drop_column("recipes", "manually_edited_fields")
