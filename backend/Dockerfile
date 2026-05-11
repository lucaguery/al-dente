FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Install dependencies first for better Docker layer caching
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev

# Copy app code + Alembic config
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# Apply migrations on each boot (idempotent — alembic upgrade head is a no-op when current).
# Per CONTEXT.md "v0.1 has zero deployed users to coordinate around".
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
