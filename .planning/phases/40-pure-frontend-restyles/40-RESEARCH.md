---
phase: 40-pure-frontend-restyles
research_for: PROF-01, ONBO-01, LIB-01, SPLA-01, DRIFT-01 (SPLA-02 deferred per D-09)
generated: 2026-05-21
status: ready_for_planning
---

# Phase 40: Pure-Frontend Restyles — Research

## Research scope

Phase 40 is the safest phase in v0.9 — five pure-frontend surfaces brought into full La Grille · Soft warmth alignment per ADR-0004, plus ONE small backend addition (`GET /households/{id}/stats` for the Profil stats block). No schema changes. No globals.css edits.

Five surfaces:

1. **Profil page** (`/settings`) — full rewrite to literal-sketch composition (PROF-01 + stats block PROF-stats).
2. **Onboarding welcome** (`/onboarding/welcome`) — full rewrite to wordmark-centric composition (ONBO-01).
3. **Library text-only view** — new `RecipeRowMinimal` + 3rd mode in `LibraryViewSwitch` (LIB-01).
4. **Splash screen** (`app/loading.tsx`) — new Next.js loading state file (SPLA-01).
5. **`cooking-logs/[id]/page.tsx` token drift fix** — Fraunces + Sober Kitchen tokens removed (DRIFT-01).

CONTEXT.md captures all locked decisions (D-01 through D-14). This research file complements CONTEXT.md by surfacing technical landmines and verification hooks the planner needs.

## What the planner needs to know

### 1. The backend touch is exactly one endpoint

Per D-04: `GET /households/{id}/stats` returning `{recipes_count, cooking_logs_count, votes_count}`. Reads counts as defined in D-05 (filtered: structured recipes, finalized cooking logs, all votes). This is a NEW endpoint in `backend/app/routers/households.py` — no migration boundary. Adheres to the 4-test contract that has shipped in v0.8 (happy / 401 / 404-cross-household / validation).

**Verification hook:** the file `backend/app/routers/households.py` (10.9 KB today) should gain ~30-40 lines for the new route. `backend/app/schemas/household.py` (3.8 KB today) should gain a new `HouseholdStats` Pydantic model.

### 2. Splash file is a NEW file at App Router root

`frontend/app/loading.tsx` does not exist today. It's a Next.js 16 App Router feature — any `loading.tsx` at a route segment level renders during the loading state for that segment. Placed at the root, it covers all navigation loads.

**Landmine:** `loading.tsx` does NOT run on the very first page load — it runs only on client-side route transitions. For first-load coverage you would need `apple-touch-startup-image`, which is **deferred per D-09** (SPLA-02). Plan 40-04 must not promise first-load splash coverage in its `must_haves`.

**Version footer:** D-08 says read from `package.json` `version` field at build time via `next.config.ts` `env` exposure. Check `frontend/next.config.ts` for the existing pattern; if `env.NEXT_PUBLIC_APP_VERSION` is already exposed, reuse it; otherwise the plan adds it.

### 3. Library text-only mode adds a 3rd enum value to `LibraryViewSwitch`

Today the switch is likely 2-state (`"row" | "grid"`). Becomes 3-state (`"row" | "grid" | "minimal"`). View persistence is in `localStorage` — key shape should remain unchanged; only the accepted value set grows.

**Landmine:** the planner-discretion note in CONTEXT.md (line 61-62) calls out the "validé" tag pill source. Phase 40 plan should default to the **cheapest** path: read `daily_shortlists.shortlist_recipes` join filtered by `compute_vote_state == "validated"` for current member at render time. At couple-scale this is two members × ≤10 daily-shortlist recipes — query cost is negligible. Do NOT add a denorm column (D-09-equivalent: explicitly deferred per CONTEXT.md `<deferred>` line 156).

### 4. DRIFT-01 is a surgical token sweep

The file `frontend/app/cooking-logs/[id]/page.tsx` (8.2 KB) is the only file modified. Three concrete changes (D-10, D-11, D-12, D-13, D-14):

- Loved chip: `bg-surface-rose-100` → `bg-[var(--color-valide-tint)] text-primary border border-primary` (D-10).
- Liked chip: `bg-[var(--color-valide-tint)]` direct ref → `bg-card border border-border text-foreground` (D-11).
- Disliked chip: unchanged (D-12).
- Fraunces italic absolute-date header: **dropped** — header renders Geist 500 (D-13).
- File header comment lines 3-23: replaced with 5-7 line La Grille header citing ADR-0004 + Phase 40 CONTEXT.md (D-14).

**Verification hook:** `grep -c "Fraunces\|bg-surface-rose-100\|bg-\[var(--color-valide-tint)\]\|cookbook-chapter-opener\|Sober Kitchen" frontend/app/cooking-logs/\[id\]/page.tsx` must equal `0` post-fix (the legacy `bg-[var(--color-valide-tint)]` direct ref disappears because the loved chip uses the same token but via the new `text-primary border border-primary` shape, and the liked chip moves off the tint entirely).

### 5. Profil page is a near-total rewrite

`frontend/app/settings/page.tsx` is 23.9 KB today — the largest file Phase 40 touches. It already went through Phase 9 retheme + ADR-0004 wave 3 partial. The Phase 40 rewrite drops all `<Card>` usage and replaces with the literal-sketch composition: identity line + partner block + stats block + 5 numbered hairline rows. Per D-03: "no Card components anywhere."

**Verification hook:** `grep -c "Card\|card-" frontend/app/settings/page.tsx` after rewrite — should be `0` matches for Card import/usage (CSS `bg-card` token usage is fine if any).

**Stats block fetches:** D-06 says `useSession()` + a single `useEffect` fetch on mount via `api("/api/households/${id}/stats")`. No realtime subscription. Loading state: lightweight skeleton (3 dashes), no spinner.

### 6. Onboarding welcome is a clean rewrite

`frontend/app/onboarding/welcome/page.tsx` is 2.8 KB today — smallest of the rewrites. Sketch lines 2060-2076 are unambiguous: wordmark + tagline + sub-tagline + primary filled-dark button + ghost hairline button + footer marketing line. Drop Cards entirely.

**i18n keys** (per CONTEXT.md Claude's Discretion + Specifics):
- `onboarding.welcome.footer` → `"cuisine partagée · 0 frais · 0 pub"` (new key).
- `onboarding.welcome.primary_cta` → `"Créer notre foyer"` (likely exists; planner verifies).
- `onboarding.welcome.ghost_cta` → `"Rejoindre avec un code"` (likely exists; planner verifies).
- `onboarding.welcome.tagline` → `"On mange quoi *ce soir* ?"` (italic on "ce soir" via `<em>` wrap or markdown-style).
- `onboarding.welcome.sub_tagline` → `"Une app pour deux. Pour décider ensemble, sans se relancer toute la soirée."`

## Validation Architecture (Nyquist)

This research surfaces six validation requirements that the planner MUST encode in plans so Dimension 8 (Validation) is satisfied.

### V1 — Backend endpoint contract

The new `GET /households/{id}/stats` must pass the 4-test contract:

1. Happy path: authenticated member of household H gets 200 + valid `HouseholdStats` payload with three int counts.
2. 401: unauthenticated request gets 401 (no cookie / invalid cookie).
3. 404 cross-household: member of household A requesting `/households/{B}/stats` gets 404 (invariant #4 — never 403).
4. Validation: `recipes_count` only counts `status='structured'`; `cooking_logs_count` only counts `finalized_at IS NOT NULL`; `votes_count` counts all rows.

Test file: `backend/tests/test_household_stats.py` (new).

### V2 — Profil page Card-free assertion

Static check: `grep -E "<Card|from.*card\"" frontend/app/settings/page.tsx | wc -l` returns `0`.

### V3 — Onboarding welcome Card-free assertion

Static check: `grep -E "<Card|from.*card\"" frontend/app/onboarding/welcome/page.tsx | wc -l` returns `0`.

### V4 — DRIFT-01 token sweep assertion

Static check: `grep -E "Fraunces|bg-surface-rose-100|cookbook-chapter-opener|Sober Kitchen|Phase 17|D-17-05" frontend/app/cooking-logs/\[id\]/page.tsx | wc -l` returns `0`.

### V5 — Library 3-state switch persistence

Behavior check: load `/library`, click into the third mode, reload the page, the third mode is still active. Codifiable in Playwright spec `library-minimal-view.spec.ts`.

### V6 — Splash file exists with required content

Static check: `frontend/app/loading.tsx` exists AND contains `BrandIcon`, `Al Dente.`, `On mange quoi ce soir`, `v` (version prefix). Also: `grep -n "apple-touch-startup-image" frontend/app/layout.tsx` returns no new entries (deferred SPLA-02 — must not slip in).

## Test posture

Per CONTEXT.md line 102:

- New: `frontend/tests/e2e/profil-la-grille.spec.ts`, `frontend/tests/e2e/onboarding-welcome-la-grille.spec.ts`, `frontend/tests/e2e/library-minimal-view.spec.ts`.
- New (backend): `backend/tests/test_household_stats.py`.
- DRIFT-01 ride-along in an existing cooking-logs spec if one exists; otherwise grep-based static check is the verification (no need to spin up a new spec for a token sweep).

## Recommended plan slicing (from user's orchestrator directive)

The orchestrator-supplied slicing produces 5 plans that map cleanly onto file-disjoint, low-coupling work:

| Plan | Scope | Files | Wave |
|------|-------|-------|------|
| 40-01 | Stats backend endpoint + Profil page rewrite (PROF-01 + PROF stats) | `backend/app/routers/households.py`, `backend/app/schemas/household.py`, `backend/tests/test_household_stats.py`, `frontend/app/settings/page.tsx`, `frontend/messages/fr.json`, `frontend/tests/e2e/profil-la-grille.spec.ts` | 1 |
| 40-02 | Onboarding welcome rewrite (ONBO-01) | `frontend/app/onboarding/welcome/page.tsx`, `frontend/messages/fr.json`, `frontend/tests/e2e/onboarding-welcome-la-grille.spec.ts` | 1 |
| 40-03 | Library text-only mode (LIB-01) | `frontend/components/RecipeRowMinimal.tsx` (NEW), `frontend/components/LibraryViewSwitch.tsx`, `frontend/app/library/page.tsx` (or equivalent), `frontend/messages/fr.json`, `frontend/tests/e2e/library-minimal-view.spec.ts` | 1 |
| 40-04 | Splash loading.tsx (SPLA-01; SPLA-02 deferred) | `frontend/app/loading.tsx` (NEW), `frontend/next.config.ts` (maybe), `frontend/messages/fr.json` | 1 |
| 40-05 | cooking-logs DRIFT sweep (DRIFT-01) | `frontend/app/cooking-logs/[id]/page.tsx` | 1 |

All 5 plans go in Wave 1 — `frontend/messages/fr.json` is shared by 4 plans, but it's append-only at distinct namespace keys (`onboarding.welcome.*`, `settings.*`, `library.*`, `splash.*`, no overlap). The risk of merge conflict is real-but-minor; if execute-phase enforces strict file-disjoint waves, split into 2 waves (40-01 alone in Wave 1, the rest in Wave 2). Recommend leaving Wave 1 for all and resolving via `git` if a conflict arises — the keys do not collide.

## Open questions

None. CONTEXT.md is complete and the orchestrator-supplied slicing is sound.

## Validation Architecture

(see V1-V6 above — these populate VALIDATION.md)

---

## RESEARCH COMPLETE
