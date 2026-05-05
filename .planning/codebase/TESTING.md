# Testing Patterns

**Analysis Date:** 2026-05-05

## Overall Status

**No tests currently exist.** The codebase is in **W1 / pre-skeleton** state:
- Frontend: Fresh `create-next-app` scaffold with no test infrastructure
- Backend: Single-file Python stub with no test framework configured

This document describes the baseline configuration and will be updated as tests are added.

## Frontend Testing

### Test Framework

**Runner:**
- Not configured yet
- Recommended: Jest (Next.js standard) or Vitest (faster, modern)
- Status: `frontend/package.json` has no test-related dependencies

**Run Commands:**
- No test command exists in `frontend/package.json`
- To configure: Will need to add Jest/Vitest config file and test script

### Test File Organization

**Future pattern (when tests are added):**
- **Location:** Co-located with source files (e.g., `app/components/Button.test.tsx` next to `Button.tsx`)
- **Naming:** `*.test.tsx` or `*.spec.tsx` extension
- **Structure:**
  ```
  frontend/
  ├── app/
  │   ├── page.tsx
  │   └── page.test.tsx          # Tests for page component
  └── components/
      ├── Button.tsx
      └── Button.test.tsx        # Tests for Button component
  ```

### TypeScript Configuration for Tests

- `frontend/tsconfig.json` (line 26-30) includes `**/*.ts` and `**/*.tsx` in compilation
- Test files will be picked up automatically once test runner is added
- No separate `tsconfig.test.json` currently needed

### Recommended Test Structure (When Implemented)

**Assertion pattern:**
```typescript
// Using common pattern with describe/it blocks:
describe('Button', () => {
  it('renders with correct text', () => {
    // Arrange, Act, Assert pattern
  });
});
```

### What to Test (Future Guidance)

**Priority areas (per SPEC.md):**
- Capture surfaces (quick, voice, photo, URL) — verify draft creation
- Voting UI — state machine transitions (Validé/Pressenti/Contesté/Rejeté/Sans avis)
- Shortlist filtering and display
- Voice transcription (Web Speech API)
- WebSocket reconnection logic

**What NOT to test (mocking/stubbing recommended):**
- Gemini API calls (mock responses)
- Supabase database operations (use fixtures/mocks)
- File uploads to storage

## Backend Testing

### Test Framework

**Runner:**
- Not configured yet
- Recommended: pytest (Python standard for FastAPI)
- Status: `backend/pyproject.toml` has empty `dependencies = []`

### Project Structure

**Current:**
- `backend/main.py` — one-line stub
- `backend/pyproject.toml` — no dependencies
- `backend/.python-version` — Python 3.12

**Future structure (per CLAUDE.md §Backend):**
```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── models.py            # SQLAlchemy models
│   └── routers/             # API endpoints
│       ├── households.py
│       ├── recipes.py
│       ├── cooking.py
│       ├── shortlist.py
│       └── ws.py
├── services/                # Business logic
│   ├── llm.py              # Gemini integration
│   ├── algorithm.py        # Scoring logic
│   ├── shortlist.py        # APScheduler jobs
│   └── realtime.py         # WebSocket broadcast
├── tests/                  # Test suite (to be created)
│   ├── test_recipes.py
│   ├── test_voting.py
│   └── fixtures/
└── alembic/               # Database migrations
```

### Test File Organization

**Future pattern:**
- **Location:** `backend/tests/` directory (separate from source)
- **Naming:** `test_*.py` files (pytest discovery convention)
- **Structure by domain:**
  - `test_recipes.py` — recipe capture & promotion
  - `test_voting.py` — vote state transitions
  - `test_shortlist.py` — daily shortlist generation
  - `test_ws.py` — WebSocket broadcast logic
  - `fixtures/` — reusable test data

### Running Tests (To Be Configured)

**Add to pyproject.toml:**
```toml
[project.optional-dependencies]
dev = ["pytest", "pytest-asyncio", "httpx"]  # httpx for testing FastAPI

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**Commands (once configured):**
```bash
uv pip install -e ".[dev]"  # Install with dev deps
pytest                       # Run all tests
pytest -v                    # Verbose
pytest --cov               # Coverage report
pytest -k test_recipes      # Run specific test file
```

### Fixtures and Test Data

**Pattern to establish (when implementing):**
```python
# fixtures/conftest.py or in test file
@pytest.fixture
def sample_household():
    return {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Test Household",
        "invite_code": "ABC123",
    }

@pytest.fixture
def sample_recipe(sample_household):
    return {
        "household_id": sample_household["id"],
        "title": "Risotto",
        "status": "structured",
        "cuisine": "italian",
        ...
    }
```

### Async Testing Pattern (For FastAPI Endpoints)

**When implementing:**
```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_recipe():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/recipes/quick",
            json={"title": "Pasta", "cuisine": "italian"}
        )
        assert response.status_code == 201
```

### Mocking Strategy

**What to mock:**
- **Gemini API:** Use fixtures with pre-canned responses (avoid real API calls in tests)
- **Supabase:** Mock database queries with test fixtures
- **File storage:** Mock upload endpoints
- **APScheduler jobs:** Mock or disable in test mode

**What NOT to mock:**
- Business logic (algorithm.py scoring) — test directly
- State transitions (vote logic) — test state machine directly
- FastAPI routing — test via client

### Coverage

**Target:** Will be determined in W1 planning

**View coverage (once configured):**
```bash
pytest --cov=app --cov-report=html
# View report: htmlcov/index.html
```

## Shared Test Patterns

### Test Data / Fixtures

Per SPEC.md §Data model, ensure test fixtures match schema:

**Example household + members:**
```python
FIXTURE_HOUSEHOLD = {
    "id": UUID("550e8400-e29b-41d4-a716-446655440000"),
    "name": "Test Household",
    "invite_code": "ABC123",
}

FIXTURE_MEMBERS = [
    {
        "id": UUID("550e8400-e29b-41d4-a716-446655440001"),
        "household_id": FIXTURE_HOUSEHOLD["id"],
        "name": "Luca",
        "color_hex": "#FF5733",
        "auth_token": "test-token-luca",
    },
    {
        "id": UUID("550e8400-e29b-41d4-a716-446655440002"),
        "household_id": FIXTURE_HOUSEHOLD["id"],
        "name": "Partner",
        "color_hex": "#33FF57",
        "auth_token": "test-token-partner",
    },
]
```

### Critical Test Areas (From Architecture)

Per CLAUDE.md §"Architecture invariants":

1. **Draft → Structured Promotion:**
   - Verify draft created immediately on `/recipes/<surface>` POST
   - Verify promotion happens server-side in BackgroundTask
   - Verify WebSocket broadcast on status change to `structured`
   - **Do NOT test client-side promotion** (it doesn't exist)

2. **Voting State Computation:**
   - Verify vote state (Validé/Pressenti/Contesté/Rejeté/Sans avis) derived from votes table
   - Do NOT query a `state` column (doesn't exist)

3. **Denormalized Fields:**
   - Verify `last_cooked_at` and `cook_count` updated atomically with `cooking_logs` insertion
   - Do NOT compute on read

4. **Realtime Broadcast:**
   - Verify `recipe.created`, `recipe.promoted`, `vote.created` events broadcast to both household members
   - Test WebSocket subscription mechanism

---

*Testing analysis: 2026-05-05*
