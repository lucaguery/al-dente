"""Pydantic v2 request/response schemas.

Schemas are deliberately separate from SQLAlchemy ORM models (``app.models``)
so the wire format can evolve without leaking column-level details.
"""
