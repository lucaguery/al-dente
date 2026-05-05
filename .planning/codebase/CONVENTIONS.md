# Coding Conventions

**Analysis Date:** 2026-05-05

## Overview

The al-dente codebase is in **W1 / pre-skeleton** state. Frontend is a fresh `create-next-app` scaffold (Next.js 16.2.4) with no custom code beyond the default template. Backend is a single-file stub with no framework scaffolding yet. Conventions documented here reflect:

1. **Frontend:** ESLint + TypeScript configuration from Next.js 16.2.4 defaults
2. **Backend:** Python 3.12 with `uv` package manager (no linting config yet)
3. **Shared:** Next.js PWA with `next-intl` for French localization (per SPEC.md §Localization)

## Frontend Conventions (Next.js 16.2.4)

### Naming Patterns

**Files:**
- React components: PascalCase (e.g., `layout.tsx`, `page.tsx`)
- App Router files: use Next.js reserved names (`layout.tsx`, `page.tsx`, `error.tsx`, `not-found.tsx`)
- Non-component modules: camelCase (e.g., `utils.ts`, `helpers.ts`)
- Path alias `@/*` maps to `frontend/` root (defined in `frontend/tsconfig.json` line 22)

**Functions:**
- React components: PascalCase function names
- Utility/helper functions: camelCase (e.g., `parseIngredients`, `formatDate`)
- Event handlers: `on` prefix (e.g., `onClick`, `onChange`)

**Variables:**
- Standard variables: camelCase
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- React state: camelCase with `set` prefix for setState (e.g., `const [isOpen, setIsOpen]`)

**Types/Interfaces:**
- PascalCase (e.g., `interface RecipeProps`, `type VoteState`)
- Import types with `type` keyword: `import type { Metadata } from "next"` (see `frontend/app/layout.tsx` line 1)

### Code Style

**Formatting:**
- ESLint runs via `npm run lint` (frontend/package.json line 9)
- No explicit Prettier config; ESLint is authority for formatting
- Indentation: 2 spaces (per Next.js default)
- Semicolons: required (ESLint enforces)
- Quotes: double quotes for strings (ESLint preset default)

**Linting:**
- ESLint config: `frontend/eslint.config.mjs` (flat config format, ESLint 9+)
- Extends: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Ignored paths: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- No custom rules added; relies on Next.js recommended presets

### Import Organization

**Order (enforced by eslint-config-next):**
1. External packages (React, Next.js, third-party)
2. Relative imports (`./`, `../`)
3. Path aliases (`@/*`)

**Example (from `frontend/app/layout.tsx`):**
```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
```

**Path Aliases:**
- `@/*` resolves to `frontend/` root (enables `import { Button } from "@/components/Button"`)

### TypeScript Settings

**Strict Mode:** Enabled (`frontend/tsconfig.json` line 7)
- `strict: true` — all strict checks active
- `noEmit: true` — TypeScript checks only, no emit
- `esModuleInterop: true` — CommonJS/ES6 interop
- `isolatedModules: true` — each file independently compilable
- `jsx: "react-jsx"` — uses React 19 new JSX transform (no `import React` needed)

**Target:** ES2017 (line 3)

### Styling

**Framework:** Tailwind CSS v4 with `@tailwindcss/postcss` (per SPEC.md §Stack)
- PostCSS config: `frontend/postcss.config.mjs`
- No `tailwind.config.ts` by default (Tailwind v4 uses defaults)
- Applied as `className` attribute on JSX elements (e.g., `frontend/app/page.tsx` lines 5-30)
- Tailwind used for layout, spacing, colors, typography

### Localization

**Framework:** `next-intl` (per CLAUDE.md §"Localization from day one")
- **Status:** Not yet integrated into scaffold (plan only)
- **Requirement:** All user-facing strings must go through `next-intl` from first feature implementation
- **French only in v0.1:** Avoid hardcoded English strings — treat as productize-later debt
- **Inline marker:** `// TODO(productize)` for out-of-v0.1 features; `// TODO` for v0.1 work

## Backend Conventions (Python 3.12, uv)

### File/Module Naming

**Python version:** 3.12 (pinned in `backend/.python-version`)

**Package manager:** `uv` (per CLAUDE.md §Backend)
- Project uses `uv`-style `pyproject.toml` (not setuptools config)

**Status:** No scaffolding yet — `backend/main.py` is a stub

**Future structure (per CLAUDE.md §Backend):**
- Main app: `app/main.py`
- Routers: `app/routers/` (households, recipes, cooking, shortlist, ws)
- Services: `services/` (llm.py, algorithm.py, shortlist.py, realtime.py)
- Models: `app/models.py` (SQLAlchemy 2.0)
- Migrations: `alembic/` (Alembic for schema)

### Naming Patterns (To Be Implemented)

**Functions:** snake_case (Python convention)

**Classes:** PascalCase (model classes, services)

**Constants:** UPPER_SNAKE_CASE

**Private/internal:** `_leading_underscore`

### Code Style (To Be Implemented)

**Linting:** Not yet configured — will be defined in W1 skeleton phase

**Type hints:** All functions must have type hints (FastAPI + Pydantic requirement)
- Example pattern (from SPEC.md §Backend):
  ```python
  async def create_recipe(
      household_id: UUID,
      payload: CreateRecipeRequest,
  ) -> Recipe:
      ...
  ```

**Error handling:** Raise `HTTPException` with appropriate status codes (FastAPI standard)

## Shared Vocabulary (Frontend ↔ Backend)

**Enum types** (per CLAUDE.md §"Shared vocabularies"):
- Season, Cuisine, Mood, Protein — defined in both `frontend/lib/enums.ts` and Python Enum classes
- **Critical:** Keep both in sync on every change (drift is a bug category)
- Status quo: Not yet implemented; will be added in W1 feature work

## Comments and Documentation

**When to Comment:**
- Explain *why*, not *what* (code is self-documenting for *what*)
- Non-obvious business logic (e.g., voting state computation, shortlist ranking)
- Workarounds and known limitations

**JSDoc/TSDoc:** Not yet required (scaffold has none)

**Future:** When implementing shared services, add docstrings to Python functions

---

*Convention analysis: 2026-05-05*
