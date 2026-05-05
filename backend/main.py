"""Local dev entry-point. Run ``python main.py`` or ``uv run python main.py``.

Production (Railway) uses the Dockerfile CMD which invokes ``uvicorn app.main:app``
directly after applying migrations.
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
