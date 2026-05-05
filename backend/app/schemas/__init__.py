"""Pydantic v2 request/response schemas (separate from SQLAlchemy ORM models).

Per CONTEXT.md "Claude's Discretion" — backend folder structure mirrors
SPEC.md §"Project structure": ``app/schemas/`` holds request/response Pydantic
types; ``app/models/`` holds SQLAlchemy ORM classes. They are kept separate so
the wire format can evolve without leaking column-level details.
"""
