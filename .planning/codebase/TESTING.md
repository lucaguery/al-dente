# Testing Patterns

**Analysis Date:** 2026-05-19

Snapshot: 2026-05-19

## Test Framework Overview

**Frontend:**
- Runner: Playwright v1.59.1 (`@playwright/test`)
- Config: `frontend/playwright.config.ts` — orchestrates uvicorn (test mode) + Next.js dev + Playwright suite
- Execution: Two projects (seeded + fresh) with 14 specs total
- Headless Chromium only (Chromium 390×844 viewport, not WebKit/Firefox per CONTEXT D-06)

**Backend:**
- Runner: pytest 8.0+ with pytest-asyncio
- Config: `backend/pyproject.toml` specifies `testpaths = ["tests"]`, `python_files = ["test_*.py"]`, `asyncio_mode = "auto"`
- Fixture management: Connection-scoped transactions via conftest.py (Phase 15)
- Database: Test Postgres on localhost:5433 (`aldente_test`)

**Run Commands:**
```bash
# Frontend E2E (full suite)
(cd frontend && npm run test:e2e)

# Frontend E2E (single project)
(cd frontend && npm run test:e2e -- --project=seeded)
(cd frontend && npm run test:e2e -- --project=fresh)

# Frontend E2E (UI mode — interactive debugging)
(cd frontend && npm run test:e2e:ui)

# Backend unit tests
(cd backend && uv run pytest)
(cd backend && uv run pytest -v)
(cd backend && uv run pytest --cov=app)
```

## Frontend: Playwright E2E Tests

### Test File Organization

**Location:** `frontend/tests/e2e/`

**File structure:**
- Spec files: `*.spec.ts` (one file per feature)
- Fixtures: `fixtures/` directory with test data (`risotto.jpg`, `seed-helpers.ts`)
- Setup/teardown: `globalSetup.fresh.ts`, `globalTeardown.fresh.ts`

**Naming convention:**
- Feature test: `<feature>.spec.ts` (e.g., `capture-quick.spec.ts`, `recipe-detail.spec.ts`)
- Global setup/teardown: `globalSetup.<project>.ts`, `globalTeardown.<project>.ts`

### Test Projects

Two Playwright projects defined in `frontend/playwright.config.ts`:

**Project 1: seeded (13 specs)**
- Uses pre-seeded test data via `uv run seed`
- Bearer header auto-injected: `Authorization: Bearer ${SEED_AUTH_TOKEN}`
- Household: "Foyer Test" (invite code TEST01, members Luca + Partner)
- Specs: `auth.skip-onboarding.spec.ts`, `capture-*.spec.ts`, `drafts-inbox.spec.ts`, `shortlist-vote.spec.ts`, `recipe-detail.spec.ts`, `cooking-log-*.spec.ts`, `recipe-library.spec.ts`, `settings-member-rename.spec.ts`

**Project 2: fresh (1 spec)**
- No auth header (exercises real onboarding flow)
- Runs only after `globalSetup.fresh.ts` truncates tables
- Single spec: `invite-code-happy-path.spec.ts` (two browser contexts: Alice creates, Bob joins)
- Teardown: `globalTeardown.fresh.ts` re-seeds for subsequent seeded runs

### Test Structure

**Playwright test pattern:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('capture-quick', () => {
  test('quick capture creates draft visible in inbox', async ({ page, request }) => {
    const title = `Quick spec ${Date.now()}`;  // Unique to avoid collisions
    
    const create = await request.post('/api/recipes/quick', {
      data: { title },
    });
    expect(create.ok()).toBeTruthy();
    const created = await create.json();
    expect(created.status).toBe('draft');

    await page.goto('/inbox');
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  });
});
```

**Key characteristics:**
- Uses `test.describe()` for grouping
- Async test functions with fixtures: `{ page, request }`
- Arrange → Act → Assert pattern
- Unique test data to avoid re-run collisions (e.g., `Date.now()` in title)

### Fixture Pattern

**Seed-based fixtures:**
- `SEED_AUTH_TOKEN` = `"test-token-luca"` (environment variable, seeded member)
- Pre-populated household: "Foyer Test" with 2 members and 21 recipes
- Bearer header auto-attached by Playwright project config

**Test data helpers:**
- `frontend/tests/e2e/fixtures/risotto.jpg` — 157 bytes JPEG for photo capture test
- `frontend/tests/e2e/fixtures/seed-helpers.ts` — shared utility functions (if any)

### Polling Pattern

For async backend operations (BackgroundTask promotion), use `expect.poll()`:

```typescript
await expect
  .poll(
    async () => {
      const r = await request.get(`/api/recipes/${recipeId}`);
      if (!r.ok()) return null;
      const body = await r.json();
      return body.status;
    },
    { timeout: 5_000, intervals: [100, 250, 500, 1000] },
  )
  .toBe('structured');
```

## Backend: pytest Tests

### Test File Organization

**Location:** `backend/tests/`

**Files:**
- `conftest.py` — shared fixtures (db_session, client)
- `test_recipes.py` — recipe capture, promotion, pinning
- `test_cooking_logs.py` — cooking log creation, finalization, denormalized fields
- `test_turns.py` — recipe turn append, history, thread state
- `test_households.py` — household creation, member management
- `test_votes.py` (if present) — vote upsert, state computation
- `test_*` — one file per router/service

### Fixture Pattern

**`conftest.py` provides per-test isolation:**

```python
@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Per-test connection-scoped transaction; rolled back at teardown."""
    connection = _engine.connect()
    transaction = connection.begin()
    session = _TestSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()

@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient with `get_db` overridden to the rolled-back session."""
    def _override_get_db() -> Generator[Session, None, None]:
        yield db_session
    
    app.dependency_overrides[get_db] = _override_get_db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)
```

**Why this design:**
- Connection-scoped transaction (faster than DROP/CREATE per test)
- Schema persists; only data rolled back
- `finally` block clears overrides to prevent leakage between tests
- Satisfies row-level locking semantics (no SQLite)

### Test Structure

**Authentication in tests:**
```python
SEED_TOKEN = os.environ.get("SEED_AUTH_TOKEN", "test-token-luca")
AUTH_HEADERS = {"Authorization": f"Bearer {SEED_TOKEN}"}

def test_promotion_failure_sets_failed_state(db_session: Session) -> None:
    # Test uses seeded member via SEED_TOKEN
    member = _seeded_member(db_session)
    assert member.auth_token == SEED_TOKEN
```

**HTTP test pattern (TestClient):**
```python
def test_create_recipe(client: TestClient) -> None:
    response = client.post(
        "/recipes",
        json={"title": "Pasta"},
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "draft"
```

**Async pattern (BackgroundTask mocking):**
```python
def test_promotion_via_background_task(db_session: Session) -> None:
    # Monkeypatch extract_from_transcript to raise an exception
    with mock.patch("app.services.llm.extract_from_transcript", side_effect=Exception("API failed")):
        # Call endpoint that triggers BackgroundTask
        response = client.post(
            "/recipes/voice",
            json={"transcript": "..."},
            headers=AUTH_HEADERS,
        )
        # Assertion: recipe row transitions to status='failed' with error
```

### Mocking Strategy

**What to mock:**
- Gemini API calls: `mock.patch("google.genai.GenerativeModel", ...)` or use `llm_fixtures.py` stubs
- External HTTP calls: requests to example.test URLs
- APScheduler jobs: disable or mock in test mode via `settings.environment == "test"`

**What NOT to mock:**
- SQLAlchemy ORM operations (use real test DB with transactions)
- Business logic (voting state machine, completeness algorithm)
- FastAPI routing (test via TestClient)
- Database models (test with real schema)

**Example from `test_recipes.py`:**
```python
from unittest import mock
import pytest

def test_promotion_failure_sets_failed_state(db_session: Session) -> None:
    # Monkeypatch the LLM service to raise an exception
    with mock.patch(
        "app.services.llm.extract_from_transcript",
        side_effect=Exception("Gemini API error"),
    ):
        # Verify the draft transitions to status='failed'
        ...
```

## Test Coverage

**Frontend:**
- No coverage target enforced
- Specs are functional/integration tests, not unit tests
- Covers hot paths: capture (5 surfaces), voting (5 states), cooking, onboarding

**Backend:**
- No coverage target enforced
- Phase 15+ kicks off systematic unit test coverage
- Focus on: state transitions, vote computation, data consistency

**View backend coverage:**
```bash
(cd backend && uv run pytest --cov=app --cov-report=html)
# View: htmlcov/index.html
```

## Test Data Management

### Seed Script

**Location:** `backend/app/cli/seed.py`

**Purpose:** Idempotent population of test database

**Two modes:**
1. **Test seed** (`uv run seed test`) — Phase 10, populates seeded household for E2E
2. **Prod-synthetic seed** (`uv run seed --prod-synthetic`) — Phase 11, synthetic data for prod validation

**Key functions:**
- `run_test_seed()` — inserts Foyer Test, Luca + Partner, 21 recipes, daily shortlist
- `run_prod_synthetic_seed()` — same shape, idempotent across re-runs
- Guards: refuses to run unless `ENVIRONMENT=test` AND `aldente_test` in DB URL (T-10-01)

### Test Data Shape

**Seeded household:**
```
Household: "Foyer Test" (invite code TEST01)
├── Member: "Luca" (auth_token=test-token-luca)
└── Member: "Partner"

Recipes: 21 recipes with locked vocabularies
├── Tarte Tatin (canned photo-capture result)
├── Risotto aux champignons (canned voice-capture result)
└── 19 others (italian, french, asian, etc.)

DailyShortlist: 1 shortlist with 5 recipes (for vote state testing)
```

## E2E Test Execution Flow

### 1. Setup Phase

```bash
# Step 0: Load test env contract
set -a; source .env.test.example; set +a

# Step 1: Start test Postgres
docker compose -f docker-compose.test.yml up -d

# Step 2: Run schema migration + seed
(cd backend && uv sync && uv run alembic upgrade head && uv run seed)

# Step 3: Install frontend deps
(cd frontend && npm ci && npx playwright install --with-deps chromium)
```

### 2. Playwright Orchestration

When `npm run test:e2e` runs:
1. `playwright.config.ts` spins up webServer: uvicorn (backend) + Next.js (frontend)
2. Playwright projects execute in order: `fresh-setup` → `seeded` → `fresh-teardown`
3. Each project runs specs via Chromium headless (390×844 iPhone viewport)
4. HTML report generated: `frontend/playwright-report/index.html`

### 3. Test Isolation

**Frontend:**
- Each spec is independent
- `page.goto()` resets context
- Unique test data (Date.now()) prevents collisions

**Backend:**
- Each test runs in isolated connection-scoped transaction
- Data rolled back at teardown
- Seed state persistent between tests

## Common Test Patterns

### Assertion Patterns

**Frontend:**
```typescript
// Wait for visibility
await expect(page.getByText(title)).toBeVisible();

// Check element property
await expect(page.locator('button')).toHaveText('Cook');

// Polling for async state changes
await expect.poll(() => getStatus()).toBe('structured');
```

**Backend:**
```python
# Status code
assert response.status_code == 201

# JSON response
data = response.json()
assert data['status'] == 'draft'

# Database state
recipe = db.scalar(select(Recipe).where(Recipe.id == recipe_id))
assert recipe.status == RecipeStatus.structured
assert recipe.cook_count == 1
```

### Error Testing

**Frontend:**
```typescript
const response = await request.post('/api/invalid', { data: {} });
expect(response.status()).toBe(400);
```

**Backend:**
```python
def test_cross_household_read_returns_404(client: TestClient, db_session: Session) -> None:
    # Create recipe in household A
    # Try to read from household B
    response = client.get(
        f"/recipes/{recipe_id}",
        headers={"Authorization": f"Bearer {other_member_token}"},
    )
    assert response.status_code == 404  # Not 403 — avoids leaking existence
```

### Async Test Pattern

**Backend (pytest-asyncio):**
```python
@pytest.mark.asyncio
async def test_async_operation(client: TestClient) -> None:
    response = client.post("/recipes/voice", json={"transcript": "..."})
    # If the endpoint uses BackgroundTask, the task runs after response
```

**Frontend (Playwright):**
```typescript
test('async operation completes', async ({ request }) => {
  const create = await request.post('/api/recipes/voice', { data: { transcript: '...' } });
  const recipe = await create.json();
  
  // Poll for async completion
  await expect.poll(async () => {
    const r = await request.get(`/api/recipes/${recipe.id}`);
    return (await r.json()).status;
  }).toBe('structured');
});
```

## Test Environment Setup

### Environment Variables

**`.env.test.example` (committed, loaded once per shell):**
```
ENVIRONMENT=test
DATABASE_URL_TEST=postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test
SEED_AUTH_TOKEN=test-token-luca
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

**Load once per shell session:**
```bash
set -a; source .env.test.example; set +a
```

**Verify:**
```bash
echo $ENVIRONMENT    # Should print: test
echo $SEED_AUTH_TOKEN  # Should print: test-token-luca
```

### Docker Postgres Setup

**Start test DB:**
```bash
docker compose -f docker-compose.test.yml up -d
```

**Inspect test DB:**
```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d aldente_test
```

**Reset test DB (full wipe):**
```bash
(cd frontend && npm run test:e2e:reset)
# Then re-run schema + seed from step 2
```

## Test Maintenance

### Running Subsets

```bash
# Seeded project only
npm run test:e2e -- --project=seeded

# Single spec
npm run test:e2e -- capture-quick

# Grep pattern
npm run test:e2e -- --grep "cooking-log"

# UI mode (interactive)
npm run test:e2e:ui
```

### Debugging

**HTML report:**
```bash
(cd frontend && npx playwright show-report)
```

**Screenshots/videos:**
- Retained on failure in `frontend/playwright-report/`
- Trace files for detailed playback

**Common issues:**
1. **ENVIRONMENT not set** → alembic/seed tries to hit production Supabase
2. **Port 5433 in use** → docker compose fails; use `lsof -i :5433` to find owner
3. **Playwright Chromium download stalls** → retry with `--with-deps` flag
4. **Next.js cold-start exceeds timeout** → run `npm run dev` once manually first

## Reference

- Playwright docs: https://playwright.dev/docs/intro
- pytest docs: https://docs.pytest.org/
- Test environment: `.env.test.example` (committed)
- Seed script: `backend/app/cli/seed.py`
- Full testing guide: `/Users/gulu3001/dev/al-dente/TESTING.md` (root repo)

---

*Testing analysis: 2026-05-19*
