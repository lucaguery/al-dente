# Coding Conventions

**Analysis Date:** 2026-05-19

Snapshot: 2026-05-19

## Naming Patterns

**Files:**
- Frontend components: PascalCase `.tsx` (e.g., `PhotoUploader.tsx`, `HomeDecide.tsx`, `BrandIcon.tsx`)
- Frontend utilities/hooks: camelCase `.ts` (e.g., `useSignedPhotoUrl.ts`, `cooking.ts`, `api.ts`)
- Backend models: PascalCase `.py` (e.g., `recipe.py`, `cooking_log.py`, `household.py`)
- Backend routers: snake_case `.py` (e.g., `auth_session.py`, `cooking_logs.py`, `recipes.py`)
- Backend services: snake_case `.py` (e.g., `llm.py`, `voting.py`, `storage.py`, `shortlist.py`)
- Test files: `test_*.py` (backend) and `*.spec.ts` (frontend Playwright)

**Functions:**
- Frontend: camelCase (e.g., `useSignedPhotoUrl`, `clearLegacyLocalStorage`, `getSignedPhotoUrl`)
- Backend: snake_case (e.g., `compute_vote_state`, `acquire_position_lock`, `upload_recipe_photo`, `promote_draft`)
- Private/internal functions prefixed with underscore: `_process_thread_turn`, `_record_failure`, `_guard_environment`, `_apply_put_pinning`

**Variables:**
- Frontend: camelCase (e.g., `recipeId`, `authToken`, `cookingLogId`, `src`)
- Backend: snake_case (e.g., `promotion_error`, `manually_edited_fields`, `source_capture`, `photo_paths`)
- Constants: UPPERCASE_SNAKE_CASE (e.g., `MAX_PHOTOS = 4`, `SEED_TOKEN`, `API_BASE`, `MAX_BYTES`)

**Types:**
- Frontend: PascalCase (e.g., `RecipeResponse`, `Season`, `TurnKind`, `AnswerField`)
- Backend SQLAlchemy models: PascalCase (e.g., `Recipe`, `Member`, `Vote`, `CookingLog`)
- Backend Enums: PascalCase (e.g., `RecipeStatus`, `TurnSender`, `VoteState`, `Cuisine`)
- Python type unions/literals: lowercase native types (e.g., `str | None`, `list[str]`)

## Code Style

**Formatting:**

**Frontend:**
- ESLint flat config (`frontend/eslint.config.mjs`) is the sole authority for style enforcement
- Extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- NO Prettier — ESLint handles formatting exclusively
- Run `npm run lint` to check (no automatic fix via `--fix`)
- TypeScript strict mode enforced throughout
- Next.js 16.2.4 with breaking changes documented in `frontend/CLAUDE.md`
- Indentation: 2 spaces (Next.js default)

**Backend:**
- Python 3.12 via `uv` package manager
- No explicit formatter configured; follow existing code patterns (snake_case functions/variables, PascalCase classes)
- Type hints required throughout (SQLAlchemy 2.0 mapped-column style with `Mapped[T]`)
- Pydantic v2 for schema validation
- Async/await used for FastAPI endpoint handlers and BackgroundTask work

**Linting:**
- Frontend: ESLint only (`frontend/eslint.config.mjs`) — NOT Prettier
- Backend: No linter configured; style via convention and code review

## Import Organization

**Frontend:**

Order (enforced by eslint-config-next):
1. React/framework imports (`react`, `next/`, `next-intl`, `use client` directives)
2. Third-party libraries (`@radix-ui/`, `shadcn`, `framer-motion`, `lucide-react`, `sonner`)
3. Internal imports from `@/` path alias (`@/lib/*`, `@/components/*`, `@/hooks/*`)
4. Style imports (inline styles or utility imports)

Path aliases:
- `@/*` resolves to `frontend/` root (defined in `frontend/tsconfig.json`)
- Used throughout for absolute imports: `@/lib/api`, `@/components/ui/button`, `@/lib/hooks/useSignedPhotoUrl`
- Never use relative imports (`../../../`) — use `@/` instead

**Backend:**

Order (consistent with codebase):
1. Standard library imports (`datetime`, `enum`, `json`, `logging`, `os`)
2. Third-party imports (`sqlalchemy`, `fastapi`, `pydantic`, `google.genai`)
3. Local app imports (`from app.models`, `from app.services`, `from app.routers`)

All imports use absolute paths: `from app.models.recipe import Recipe`, never relative imports.

## Error Handling

**Frontend:**
- Errors thrown by `api()` utility (`lib/api.ts`) are caught by consumers
- 401 responses trigger automatic session clear (`DELETE /api/auth/session`) + redirect to `/onboarding/welcome`
- Network errors result in `Error` with descriptive message (e.g., `"unauthorized"`, `"404 Not Found"`)
- Components may use try/catch around async operations and surface errors via `toast()` from `sonner`
- Silent fallbacks used when appropriate (e.g., `useSignedPhotoUrl` falls back to placeholder SVG on fetch failure)

**Backend:**
- Errors raised as `HTTPException(status_code=..., detail=...)` with appropriate status codes
- Database errors surface as 500 (unrecoverable) or 400 (validation/constraint violations)
- Cross-household reads return 404 (not 403) to avoid leaking record existence (invariant #4)
- All endpoints list expected exceptions in module docstrings (see `backend/app/routers/recipes.py` top of file)
- Logging via module-level logger: `log = logging.getLogger(__name__)`

## Logging

**Framework:** Python `logging` module (backend); no centralized frontend logging

**Backend patterns:**
- Module-level logger: `log = logging.getLogger(__name__)` at top of each service/router
- Log business-logic outcomes and errors: status transitions, major decision points
- Log at WARNING or ERROR when exceptions occur; DEBUG for state details
- Log at INFO for major operations (seed startup, migration stages, scheduler job execution)
- Guard long-running operations with timing/state info (BackgroundTasks, scheduler runs)
- No PII in logs (UUIDs may be logged, but never auth tokens or email addresses)
- Example: `log.error(f"Failed to promote recipe {recipe_id}: {str(e)}")`

**Frontend:**
- Console errors/warnings arise from third-party libraries (Web Speech API stubs, animation warnings)
- Per TESTING.md Pitfall 10: no spec asserts on `consoleErrors` — expected noise is acceptable
- Use `toast()` from `sonner` for user-facing error/success messages, not `console.error()` or `console.log()`
- `console.log()` acceptable for debugging during development; remove before committing

## Comments

**When to comment:**

Explain *why*, not *what*. Code should be self-documenting via clear naming.

**When comments are required:**
- Non-obvious business logic tied to invariants or constraints (e.g., "Order matters — must be identical to the frontend mirror at frontend/lib/votes.ts")
- Architectural invariant enforcement (e.g., "Architecture invariant #2: voting state is COMPUTED from rows, never stored")
- Workarounds and known limitations (e.g., "Phase 30 BUG-01 — per-tile component so each slot can call useSignedPhotoUrl independently")
- Phase-specific decisions or deferred work (e.g., "Phase 28 DETAIL-05 owns the write path")
- References to external decision documents: "Plan 16-03 Task 1", "SPEC.md §Voting", "CLAUDE.md Architecture invariant #3", "CONTEXT.md D-12"
- Tricky algorithmic logic (e.g., vote state machine branch order)

**JSDoc/TSDoc:**
- Frontend components: rarely used; type signatures and prop interfaces are sufficient
- Frontend hooks: include brief docstring explaining contract (see `useSignedPhotoUrl.ts` for example)
- Backend services: used for functions with complex behavior or architectural significance
- Backend models: docstrings on classes explaining constraints and column defaults

Example from `backend/app/services/voting.py`:
```python
def compute_vote_state(votes: Iterable[Vote], member_count: int) -> VoteState:
    """SPEC.md §Voting state machine.

    Phase 15 (INV-01): default removed. Callers MUST pass the live
    `func.count(Member.id)` per household; relying on a "2" fallback
    silently broke architecture invariant #2 in any N≠2 household (B-3).
    """
```

Example from `frontend/lib/hooks/useSignedPhotoUrl.ts`:
```typescript
// Phase 30 BUG-01 D-03 / D-04 / D-05 — single hook consumed by all four
// photo-rendering surfaces. One source of truth for fetch + cache + retry.
// Contract: Returns { src, onError }. `src` is null until fetch resolves.
```

## Function Design

**Size:** Prefer small, focused functions. Large functions (>100 lines) should have a clear single responsibility.

**Parameters:**
- Frontend: destructured object props over positional arguments (React convention). Example: `function PhotoUploader({ recipeId, paths, onChange }: Props)`
- Backend: positional arguments for required params, keyword-only for optional (`*, optional_param=None`)
- Dependency injection used in FastAPI routes via `Depends()` (e.g., `current_member: Member = Depends(current_member)`, `db: Session = Depends(get_db)`)

**Return values:**
- Functions return data, not side effects
- Async functions (backend BackgroundTasks) return `None` after completing side effects
- Error cases: raise exceptions (HTTPException for API routes, standard exceptions for services)
- Polling/retry logic: return computed state (e.g., `VoteState` enum value, not a boolean)
- Frontend hooks return objects with clear contracts (e.g., `{ src: string | null; onError: () => void }`)

## Module Design

**Exports:**

**Frontend:**
- Components export a single React component (default or named): `export default function PhotoUploader(props) { ... }`
- Utilities export named functions and types: `export function api<T>(...) { ... }`, `export type Season = ...`
- Hooks export single hook (default): `export function useSignedPhotoUrl(...) { ... }`

**Backend:**
- Services export helper functions and classes: `def compute_vote_state(...)`, `class VoteState(enum.Enum)`
- Routers export a single `router: APIRouter` instance with prefix (e.g., `router = APIRouter(prefix="/recipes", tags=["recipes"])`)
- Models define SQLAlchemy table classes with `__tablename__` and mapped columns

**Barrel files:**

Not used in this codebase. Each file is imported directly by its path.

## Locked Vocabularies

**Critical:** Drift between frontend and backend enums is a bug category per CLAUDE.md "Locked vocabularies" section.

**Locations:**
- Frontend: `frontend/lib/enums.ts`
- Backend: `backend/app/models/enums.py`

**Vocabularies:**
- `Season` (spring, summer, autumn, winter)
- `Cuisine` (italian, french, asian, mediterranean, middleEastern, indian, mexican, northAfrican, american, other)
- `Mood` (comfort, light, quick, celebratory, adventurous)
- `Protein` (poultry, redMeat, fish, seafood, egg, legume, none)
- `Difficulty` (easy, medium, hard) — Phase 24 RID-02
- `TurnSender` (user, system) — Phase 25 THREAD-01
- `TurnKind` (text, voice, photo, url, answer, proposal_accepted, proposal_dismissed, summary, question, advisory) — Phase 25+
- `AnswerField` (13 pinnable recipe fields) — Phase 28 DETAIL-05

**Wire format:**
- String values are identical in both files (e.g., `"italian"` not `"Italian"`)
- Python uses snake_case for Python attribute names but string values match camelCase where needed (e.g., `middle_eastern = "middleEastern"`)
- When adding a new locked vocabulary, update BOTH files in the same commit

**Example drift check:**
```typescript
// frontend/lib/enums.ts
export const Difficulty = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];
```

```python
# backend/app/models/enums.py
class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
```

The string values (`"easy"`, `"medium"`, `"hard"`) must match exactly.

## Architecture Invariant Enforcement

**Invariant #1 (Capture promotion):** All five surfaces (quick, full-form, voice, photo, url) return a draft immediately via `status='draft'`. Promotion runs server-side via `BackgroundTask` in `services/llm.py`. Never promote client-side. (`backend/app/routers/recipes.py` docstring)

**Invariant #2 (Voting state computed):** `Vote` rows drive state; no `state` column on `shortlist`. Call `compute_vote_state(votes_for_recipe, member_count)` to derive one of five states: Validé / Pressenti / Contesté / Rejeté / Sans avis. (`backend/app/services/voting.py`)

**Invariant #3 (Denormalized cook stats):** `last_cooked_at` and `cook_count` update in the same DB transaction as the `cooking_logs` insert. Compute on write, not read. (`backend/app/routers/cooking_logs.py`)

**Invariant #4 (Realtime broadcast):** All household-affecting mutations broadcast via `broadcast_to_household()`. Includes: `recipe.created`, `recipe.promoted`, `recipe.updated`, `turn.created`, `turn.updated`, `vote.created`, `cooking_log.*`. (`backend/app/services/realtime.py`)

**Invariant #5 (Raw inputs persisted):** `recipe.source_capture` JSONB stores original transcript/URL/photo paths for re-prompting with better models later. (`backend/app/models/recipe.py`)

**Invariant #6 (Localization):** All user-facing strings go through `next-intl`. Hardcoded strings are productize-later debt. (`frontend/` uses `useTranslations()` from `next-intl`)

**Invariant #7 (Single uvicorn worker):** APScheduler runs in-process (one cron job per household). Multiple workers = N duplicate jobs. (`backend/app/main.py` lifespan)

**Invariant #8 (HttpOnly cookie auth):** Phase 01.1 replaced Bearer tokens with `aldente_auth` HttpOnly cookie. Frontend calls via `credentials: "include"`. API calls flow through Next.js rewrites in `frontend/next.config.ts` so cookie is same-origin in production. (`frontend/lib/api.ts`, `backend/app/main.py` CORS)

## Enum Mirroring Pattern

Two enums are defined as constants (not classes) on the frontend:

```typescript
// frontend/lib/enums.ts
export const Season = { spring: "spring", ... } as const;
export type Season = (typeof Season)[keyof typeof Season];
```

This pattern is required to:
1. Derive a type from the object keys/values
2. Enable wire-format string values that match the backend
3. Support TypeScript type narrowing in client code

Backend mirrors with Python Enum classes:

```python
# backend/app/models/enums.py
class Season(str, Enum):
    spring = "spring"
    ...
```

The `str` base ensures enum values serialize as strings (not Python enum.name).

---

*Convention analysis: 2026-05-19*
