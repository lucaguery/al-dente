# backend/CLAUDE.md

Guidance for Claude Code working in `backend/`. Loaded when the working directory is under `backend/`.

## Gemini SDK

Uses **`google-genai`** (the new unified Google AI SDK), not the legacy `google-generativeai`. Imports look like `from google import genai`. If your training data references `google.generativeai`, that's the wrong SDK for this repo.

## Deployment

Railway runs `alembic upgrade head` before uvicorn restart on each deploy.
