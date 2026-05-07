---
phase: 04-polish-w4
plan: 04
status: awaiting-human-uat
completed_at: null
---

# Summary — 04-04: UAT Checkpoint

## Task 1: Automated Pre-Flight Results

All checks passed. Date: 2026-05-07. Commit at push: `018481c`.

### Backend

| Check | Result |
|---|---|
| `alembic heads` | `0005 (head)` ✅ |
| Endpoint registration | `OK` — all 5 required routes present ✅ |

Registered routes verified:
- `PUT /cooking-logs/{log_id}` (COOK-03 finalize)
- `POST /cooking-logs/{log_id}/photos` (COOK-03 photo upload)
- `GET /cooking-logs/{log_id}/photo-url` (signed URL)
- `POST /recipes/{recipe_id}/cook` (COOK-01)
- `GET /cooking-logs/active` (COOK-02)

### Frontend

| Check | Result |
|---|---|
| `npm run lint` | Exit 0 — 0 errors, 2 warnings (in pre-built worker file, not our code) ✅ |
| `npx tsc --noEmit` | Clean — no errors ✅ |
| `npm run build` | Exit 0 — compiled successfully, 13 static pages generated ✅ |
| i18n cross-check | `cooking_log.finalize.page_title = "Finaliser la cuisson"`, `home.finalize_stub` absent ✅ |
| D-05 living image | `recipe.last_cooked_photo_path ??` present in `RecipeCard.tsx` ✅ |

Note: build logs `ENVIRONMENT_FALLBACK` for `RAILWAY_URL not set` — expected in local build; resolves on Vercel where env vars are set.

### D-09 Lint deferred items — CLOSED

Two items deferred from Phase 3 were fixed during pre-flight:
- `ColdStartChip.tsx` — `react-hooks/set-state-in-effect`: rewrote with `useSyncExternalStore` + custom DOM event (`aldente:chip-dismissed`). No more `useState`/`useEffect`. Commit `018481c`.
- `HomeDecide.tsx` — unused `Phase3CookingStartedEvent` import removed. Commit `018481c`.

### Doc Consistency

| Check | Result |
|---|---|
| ALBUM-0 mentions in Phase 4 ROADMAP section | 0 ✅ |
| V2-ALBUM mentions in REQUIREMENTS.md | 12 ✅ |
| `04-01-PLAN.md` in ROADMAP | 1 ref ✅ |
| `04-02-PLAN.md` in ROADMAP | 1 ref ✅ |
| `04-03-PLAN.md` in ROADMAP | 1 ref ✅ |
| `04-04-PLAN.md` in ROADMAP | 1 ref ✅ |

### Deploy

Pushed `018481c` to `main` at 2026-05-07. Vercel + Railway auto-deploy triggered. The UAT below requires the new build to be live on both devices.

---

## Task 2: Human UAT — Status

**Status:** PENDING USER VERIFICATION

**Resume signal:** Type `approved` if all 23 checks pass. Otherwise paste failing check numbers with observed behavior.

---

## UAT Results (to be filled in by user)

| Check | Section | Status | Notes |
|---|---|---|---|
| 1 | End-to-end loop | — | — |
| 2 | End-to-end loop | — | — |
| 3 | End-to-end loop | — | — |
| 4 | End-to-end loop | — | — |
| 5 | End-to-end loop | — | — |
| 6 | End-to-end loop | — | — |
| 7 | End-to-end loop | — | — |
| 8 | End-to-end loop | — | — |
| 9 | End-to-end loop | — | — |
| 10 | End-to-end loop | — | — |
| 11 | End-to-end loop | — | — |
| 12 | Mobile a11y | — | — |
| 13 | Mobile a11y | — | — |
| 14 | Mobile a11y | — | — |
| 15 | Mobile a11y (optional) | — | — |
| 16 | Mobile a11y (optional) | — | — |
| 17 | Offline | — | — |
| 18 | Offline | — | — |
| 19 | Offline | — | — |
| 20 | Offline | — | — |
| 21 | Offline | — | — |
| 22 | Sanity smoke | — | — |
| 23 | Sanity smoke | — | — |

---

## Deferred Items

See `.planning/phases/04-polish-w4/deferred-items.md` for non-blocking items logged during execution.

Notable productize-later item: detail-page hero (`/recipes/[id]`) does NOT yet surface `last_cooked_photo_path` — RecipeCard list view only. `TODO(productize)` marker in `frontend/app/recipes/[id]/page.tsx`.
