---
phase: 40
slug: pure-frontend-restyles
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-21
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | pytest 8.x + pytest-asyncio (`backend/pyproject.toml`) |
| **Framework (frontend)** | Playwright 1.59.x (`frontend/playwright.config.ts`) + ESLint 9 flat (`frontend/eslint.config.mjs`) |
| **Config files** | `backend/pyproject.toml`, `frontend/playwright.config.ts`, `frontend/eslint.config.mjs` |
| **Quick run (backend)** | `cd backend && uv run pytest tests/test_household_stats.py -x` |
| **Quick run (frontend)** | `cd frontend && npm run lint` |
| **Full suite (backend)** | `cd backend && uv run pytest tests/ -x` |
| **Full suite (frontend)** | `cd frontend && npm run lint && npm run build` |
| **E2E (optional, local)** | `cd frontend && npx playwright test tests/e2e/profil-la-grille.spec.ts tests/e2e/onboarding-welcome-la-grille.spec.ts tests/e2e/library-minimal-view.spec.ts` |
| **Estimated runtime** | ~5s pytest unit, ~25s frontend lint+build, ~30s targeted Playwright suite |

---

## Sampling Rate

- **After every task commit:** Run quick command for the touched layer.
- **After every plan wave:** Run full suite for the touched layer.
- **Before `/gsd:verify-work`:** Full suite (backend + frontend) green; Playwright targeted suite green on local synthetic seed.
- **Max feedback latency:** <30 seconds for lint+build; <30s for targeted Playwright.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| 40-01-01 | 01 | 1 | PROF-01 (stats) | Stats endpoint authenticated; cross-household → 404 (not 403) | unit | `cd backend && uv run pytest tests/test_household_stats.py -x` | ⬜ pending |
| 40-01-02 | 01 | 1 | PROF-01 (stats) | Schema returns 3 int fields | unit | `cd backend && uv run pytest tests/test_household_stats.py::test_stats_schema_shape -x` | ⬜ pending |
| 40-01-03 | 01 | 1 | PROF-01 | Profil renders 5 numbered hairline rows, partner block, stats; zero `<Card>` | static + e2e | `grep -E "<Card\|from.*\\"card\\"" frontend/app/settings/page.tsx \| wc -l` returns 0 | ⬜ pending |
| 40-02-01 | 02 | 1 | ONBO-01 | Onboarding renders wordmark composition; zero `<Card>` | static + e2e | `grep -E "<Card\|from.*\\"card\\"" frontend/app/onboarding/welcome/page.tsx \| wc -l` returns 0 | ⬜ pending |
| 40-03-01 | 03 | 1 | LIB-01 | `LibraryViewSwitch` accepts 3 modes; `RecipeRowMinimal` renders no img | unit + e2e | `cd frontend && npm run lint` + Playwright spec | ⬜ pending |
| 40-04-01 | 04 | 1 | SPLA-01 | `app/loading.tsx` exists with BrandIcon + wordmark + tagline + loader + version footer | static | `test -f frontend/app/loading.tsx && grep -E "BrandIcon\|Al Dente\.\|On mange quoi" frontend/app/loading.tsx` | ⬜ pending |
| 40-04-02 | 04 | 1 | SPLA-02 (deferred) | No new `apple-touch-startup-image` entries — SPLA-02 stays deferred | static | `grep -c "apple-touch-startup-image" frontend/app/layout.tsx` returns same as pre-phase value | ⬜ pending |
| 40-05-01 | 05 | 1 | DRIFT-01 | No Fraunces / no `bg-surface-rose-100` / no Sober Kitchen refs | static | `grep -E "Fraunces\|bg-surface-rose-100\|cookbook-chapter-opener\|Sober Kitchen\|Phase 17" frontend/app/cooking-logs/\[id\]/page.tsx \| wc -l` returns 0 | ⬜ pending |
| 40-05-02 | 05 | 1 | DRIFT-01 | Loved chip uses `bg-[var(--color-valide-tint)] text-primary border border-primary` | static | `grep -F 'bg-[var(--color-valide-tint)] text-primary border border-primary' frontend/app/cooking-logs/\[id\]/page.tsx` returns ≥1 line | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All infrastructure already exists:

- Backend: `backend/pyproject.toml` has pytest + pytest-asyncio; `backend/tests/` directory has shared fixtures.
- Frontend: `frontend/playwright.config.ts` configured; `frontend/eslint.config.mjs` is the style authority.
- `backend/tests/test_household_stats.py` is a NEW file written by Plan 40-01 — counts as a task deliverable, not a Wave 0 dependency.
- `frontend/tests/e2e/profil-la-grille.spec.ts`, `onboarding-welcome-la-grille.spec.ts`, `library-minimal-view.spec.ts` are NEW files written by their respective plans.

*Existing infrastructure covers all phase requirements — no Wave 0 work needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Splash visual quality on iPhone PWA | SPLA-01 | First-load is blank-then-app per D-09; in-app navigation loads vary by device perf | Open PWA on iPhone, navigate from Accueil → Bibliothèque, observe loading.tsx renders for ≥200ms transitions |
| Profil page reads correctly in fr-FR locale | PROF-01 | Verifies `created_at.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit' })` format renders as `2026.03`, not `03/2026` | Visual check at `/settings` |
| Onboarding tagline italic emphasis | ONBO-01 | "ce soir" must be italic via `<em>` — visual confirmation that the markup renders correctly | Visual check at `/onboarding/welcome` |

---

## Validation Sign-Off

- [x] All tasks have automated verification commands or grep-verifiable assertions
- [x] Sampling continuity: every plan has at least one automated check
- [x] Wave 0 covers all references (no new fixture/framework needed)
- [x] No watch-mode flags
- [x] Feedback latency < 30 seconds
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-21
