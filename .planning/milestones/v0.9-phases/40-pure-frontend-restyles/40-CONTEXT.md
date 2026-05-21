# Phase 40: Pure-Frontend Restyles - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Bring 5 frontend surfaces into full La Grille · Soft warmth alignment per [ADR-0004](../../../docs/adr/0004-modern-sober-refresh.md):

1. **Profil page** (`/settings`) — replace 3-Card layout with literal-sketch composition: identity + partner block, stats block, 5 numbered hairline rows.
2. **Onboarding welcome** (`/onboarding/welcome`) — wordmark-centric composition; remove Cards; primary filled-dark + ghost hairline button pair; footer marketing line.
3. **Library text-only view** — third `LibraryViewSwitch` mode beyond grid-with-photo and row-with-thumb; new `RecipeRowMinimal` (no photo column).
4. **Splash screen** (`app/loading.tsx`) — La Grille splash composition for Next.js navigation loads. (iOS PWA boot image deferred — see Deferred Ideas.)
5. **`cooking-logs/[id]/page.tsx` token drift fix** — Fraunces italic + Sober Kitchen rose/valide tokens → Geist + La Grille tokens.

No schema changes. **One small backend addition:** `GET /households/{id}/stats` for the Profil stats block (see D-04 below).

</domain>

<decisions>
## Implementation Decisions

### PROF-01 — Profil page IA

- **D-01:** Use the **literal sketch composition** (sketch lines 1765-1809), with two adaptations:
  - **Drop "Heure du décide"** row — no such setting exists today (household timezone is fixed at onboarding; productize-later if shortlist scheduling becomes user-configurable).
  - **Keep the partner block** above the rows (`Luca` + `Marie` with ink/muted member-color collapse already shipped on Accueil per quick-260521-l8g).
- **D-02:** Final 5 numbered rows: `01 Notifications` (push state) / `02 Foyer` (invite code + name) / `03 Membre` (rename + member color identity) / `04 Exporter les données` / `05 Déconnexion`. All rows use `text-foreground` index in Geist Mono, hairline border-bottom separator, chevron-right at the end.
- **D-03:** No Card components. The whole page is hairline rows on the off-white surface — matches sketch's "space carries" discipline.

### PROF stats block + SCOPE ADJUSTMENT

- **D-04:** **Backend endpoint addition** — `GET /households/{id}/stats` returns `{recipes_count, cooking_logs_count, votes_count}` (all-time household). Justification: keeps Profil rendering decoupled from how stats are computed; cleaner than embedding three count queries in `/households/{id}` response; easier to extend with last-30d windows in a future phase. **Scope note:** This is the one backend touch in an otherwise frontend-only phase — Phase 40's "no schema or API changes" scope expands by exactly one new GET endpoint. The migration boundary remains zero.
- **D-05:** Counter definitions:
  - `recipes_count`: `SELECT count(*) FROM recipes WHERE household_id = :hh AND status = 'structured'` (drafts excluded — they're not "real" library entries yet).
  - `cooking_logs_count`: `SELECT count(*) FROM cooking_logs WHERE household_id = :hh AND finalized_at IS NOT NULL` (in-progress sessions excluded).
  - `votes_count`: `SELECT count(*) FROM votes WHERE household_id = :hh` (all-time, no filtering — votes don't have a "void" state).
- **D-06:** Frontend renders via `useSession()` + a single `useEffect` fetch on mount. No realtime subscription — stats are explicitly non-live (couple-scale; updates on next mount are fine).

### SPLA-01 — Splash via app/loading.tsx

- **D-07:** `app/loading.tsx` (root-level Next.js loading state) renders the La Grille splash composition: `BrandIcon` table-à-manger logomark at 128px center, `Al Dente.` wordmark (Geist 500, accent dot), tagline "On mange quoi ce soir ?" in muted, 3-dot Geist Mono loader, `v0.9 · 2026` version footer (faint). Surface `#FAFAF7`. No animation beyond the loader's bounce.
- **D-08:** Version footer reads from `frontend/package.json` `version` field at build time (next.config.ts can expose it via `env`), prefixed with `v` and suffixed with current year. Avoids hardcoding the year — productize-later replacement still trivial.

### SPLA-02 — iOS PWA apple-touch-startup-image

- **D-09:** **DEFERRED** — Phase 40 ships `loading.tsx` only; iOS PWA cold-launch shows blank-then-app (acceptable for couple-scale internal app). Full size matrix (5-8 PNGs across SE / mini / Pro / Pro Max / iPad) becomes a follow-up task tracked as a deferred idea (see Deferred Ideas below). SPLA-02 in REQUIREMENTS.md will be marked deferred at phase close.

### DRIFT-01 — Cooking-logs token replacement

- **D-10:** Replace `bg-surface-rose-100` (the "loved" rating chip's background) with the **valide-chip token**: `bg-[var(--color-valide-tint)]` (which resolves to `#F5E5DD` per La Grille tokens) + `border-primary` border + `text-primary` foreground. This mirrors the Accueil validated-state language — the strongest cooking-log signal ("loved") aligns visually with the strongest voting signal ("validé").
- **D-11:** Replace `bg-[var(--color-valide-tint)]` direct reference for the "liked" rating with: `bg-card border border-border text-foreground`. Liked is neutral-positive; no terracotta needed.
- **D-12:** Replace `bg-muted text-muted-foreground border border-border` for "disliked" — unchanged. Already La Grille-compliant.
- **D-13:** **Fraunces italic absolute-date header is dropped.** File header comment is updated to reference ADR-0004 La Grille + the locked decision in this CONTEXT.md. The "cookbook-chapter-opener gesture" annotation goes away. The header date renders in Geist 500 (no italic), aligned with all other detail-view headers in La Grille.
- **D-14:** File-header comment update: strike all references to Phase 8 / Phase 17 / D-17-05 / Sober Kitchen / cookbook-chapter-opener / Fraunces. New header explicitly cites ADR-0004 and PHASE 40 CONTEXT.md.

### Claude's Discretion

- **Onboarding welcome** (ONBO-01): No gray areas surfaced as worth discussing — the sketch composition is unambiguous (wordmark + tagline + sub-tagline + primary/ghost button pair + footer line). Implementation follows sketch literally. Planner picks: i18n key naming for the footer line "cuisine partagée · 0 frais · 0 pub" (probably `onboarding.welcome.footer_value_props` or similar — single key with `next-intl` interpolation if separators need to be locale-aware later). The primary button copy ("Créer notre foyer") and ghost button copy ("Rejoindre avec un code") match sketch and existing i18n.
- **Library text-only mode** (LIB-01): Tag pill content for the "validé" indicator — planner picks the source. Most likely candidate: today's `daily_shortlists.shortlist_recipes` join filtered by `compute_vote_state == "validated"` for current member. If too expensive on render, fall back to a cheap proxy (e.g., recipe.last_voted_state denorm field — but that doesn't exist yet, so the live computation is the path of least resistance for couple-scale).
- **`RecipeRowMinimal` component shape**: Planner picks file location (likely `frontend/components/RecipeRowMinimal.tsx` alongside `RecipeRow.tsx`) and whether `LibraryViewSwitch` uses a 3-state enum (`row` / `grid` / `minimal`) or two boolean flags. Either is fine — implementer's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architectural authority
- `docs/adr/0004-modern-sober-refresh.md` — La Grille · Soft warmth tokens, type stack, surface temperature decision (the single load-bearing visual decision in v0.9)
- `docs/adr/0001-recipe-conversation-thread.md` — Architecture invariant #5 (raw inputs preserved forever) — informs how DRIFT-01 file-header comments evolve

### Phase scope
- `.planning/REQUIREMENTS.md` §v1 Requirements — PROF-01, ONBO-01, LIB-01, SPLA-01, SPLA-02 (deferred), DRIFT-01
- `.planning/PROJECT.md` §Current Milestone — v0.9 locked decisions table (7 decisions, including the "Both `loading.tsx` AND `apple-touch-startup-image`" splash strategy that this CONTEXT now relaxes via D-09)

### Sketch + design system
- `.claude/skills/sketch-findings-al-dente/SKILL.md` — auto-loaded on UI work; canonical reference for token values, type, motion grammar
- `.claude/skills/sketch-findings-al-dente/sources/002-refresh-direction-explorations/index.html` lines 1765-1809 (Profil), 2060-2076 (Onboarding), 1687-1693 (Recettes liste), 1989-2013 (Splash) — pixel-level visual reference
- `.claude/skills/sketch-findings-al-dente/references/tokens.md` — token table (surface / ink / accent / mono Geist)
- `.claude/skills/sketch-findings-al-dente/references/components.md` — button / chip / nav specs
- `.claude/skills/sketch-findings-al-dente/references/migration.md` — Sober Kitchen → La Grille delta (17-row table; DRIFT-01 follows this directly)

### Existing implementations to read before touching
- `frontend/app/settings/page.tsx` — current /settings (Phase 9 retheme + ADR-0004 wave 3 partial; gets full PROF-01 rewrite)
- `frontend/app/onboarding/welcome/page.tsx` — current onboarding (Cards w/ chevron; gets full ONBO-01 rewrite)
- `frontend/components/LibraryViewSwitch.tsx` — current 2-mode switch (gains 3rd "minimal" mode)
- `frontend/components/RecipeRow.tsx` — current 72×72-photo row (NOT touched; new sibling `RecipeRowMinimal` covers LIB-01)
- `frontend/app/cooking-logs/[id]/page.tsx` — current Sober Kitchen drift (gets DRIFT-01 token sweep)
- `frontend/components/BrandIcon.tsx` — table-à-manger logomark for splash
- `frontend/app/globals.css` — La Grille token surface (read-only reference; no changes)
- `frontend/components/MemberDot.tsx` — member-color collapse (Accueil quick-260521-l8g pattern, reused on Profil partner block)

### Backend (PROF stats only — one new endpoint)
- `backend/app/routers/households.py` — gains `GET /households/{id}/stats` endpoint
- `backend/app/models/household.py` + `models/recipe.py` + `models/cooking_log.py` + `models/vote.py` — read for count query shape
- `backend/app/schemas/household.py` — gains `HouseholdStats` pydantic response model

### Test posture
- `frontend/tests/e2e/` — Playwright suite. Phase 40 adds: `profil-la-grille.spec.ts`, `onboarding-welcome-la-grille.spec.ts`, optionally `library-minimal-view.spec.ts`. DRIFT-01 ride-alongs in the existing cooking-log spec if one exists.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`BrandIcon`** (`frontend/components/BrandIcon.tsx`) — table-à-manger logomark. Used at 72px on onboarding today; reuse at 128px on splash, ~64px on Profil if logomark wanted (sketch doesn't show one on Profil; skip).
- **`MemberDot`** (`frontend/components/MemberDot.tsx`) — already collapses to ink/muted/accent per ADR-0004. Profil partner block reuses without modification.
- **`useSession`** + `SessionProvider` (`frontend/components/SessionProvider.tsx`) — provides `session.members`, `session.me`, `session.household`. Profil reads from this; no new context needed.
- **`useTranslations`** from `next-intl` — all strings flow through this per invariant #6. New i18n keys for the Profil/Onboarding/loader strings.
- **`api()` utility** (`frontend/lib/api.ts`) — handles `aldente_auth` HttpOnly cookie + 401 redirect. New GET `/households/{id}/stats` call goes through this.
- **La Grille tokens** in `frontend/app/globals.css`: `--color-valide-tint` (#F5E5DD), `--color-primary` (#A8523C), `--color-foreground` (#14110D), `--color-muted-foreground` (#6F6B62), `--color-background` (#FAFAF7), Geist + Geist Mono families.

### Established Patterns
- **Numbered indices in Geist Mono** — keystone La Grille pattern. Already shipped on Accueil shortlist rows + Bibliothèque list view + recipe-detail ingredients/steps + capture options. Profil reuses the SAME pattern (`text-caption tabular-nums shrink-0` class string).
- **Hairline borders, no shadows** — La Grille discipline. Replace Card components with `<div className="border-b border-border">` rows.
- **Self-healing photo URLs** via `useSignedPhotoUrl` — irrelevant to Phase 40 (no photo work) but Library text-only mode explicitly skips photo loading, simplifying the row component.
- **`next build --webpack`** (not Turbopack) — per `frontend/CLAUDE.md`. No change for Phase 40; just don't switch.
- **ESLint flat config is the sole style authority** — `frontend/eslint.config.mjs`. Run `npm run lint` to check; no Prettier.

### Integration Points
- `frontend/app/loading.tsx` — NEW file. Lives at App Router root; applies globally on every navigation loading state. No props.
- `frontend/components/RecipeRowMinimal.tsx` — NEW component; sibling to `RecipeRow.tsx`. Same props shape, no photo work.
- `LibraryViewSwitch` — current 2-state UI (likely `view: "row" | "grid"`) extends to 3-state (`"row" | "grid" | "minimal"`). View persistence in localStorage already exists; key shape unchanged.
- `backend/app/routers/households.py` — NEW `GET /households/{id}/stats` route. Adheres to the 4-test contract from v0.8 Phase 38 (happy / 401 / 404-cross-household / validation). Returns `HouseholdStats` schema.
- All 5 frontend surfaces use existing tokens — no globals.css edits.

</code_context>

<specifics>
## Specific Ideas

- **Profil identity line** (above partner block): "maison · MGRY-13 · depuis 2026.03" — sketch composition. Field sources: `session.household.name` (default "maison" if unset) · `session.household.invite_code` · `session.household.created_at.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit' })`.
- **Splash version footer**: format `v{version} · {year}` where version comes from `package.json` at build time. Example output (today): `v0.9.0 · 2026`. Use Geist Mono, color `text-faint`.
- **DRIFT loved rating chip class** (concrete):
  ```tsx
  case "loved":
    return `${base} bg-[var(--color-valide-tint)] text-primary border border-primary`;
  ```
- **DRIFT file header**: replace lines 3-23 of `app/cooking-logs/[id]/page.tsx` (the Phase 17 / Sober Kitchen comment block) with a 5-7 line La Grille header citing ADR-0004 and Phase 40 CONTEXT.md.
- **Onboarding footer line**: i18n key `onboarding.welcome.footer` with French value `"cuisine partagée · 0 frais · 0 pub"`. Renders in `text-faint` Geist 400.

</specifics>

<deferred>
## Deferred Ideas

- **SPLA-02 iOS apple-touch-startup-image full size matrix** — Deferred from Phase 40 (per D-09). Future follow-up: ship 5-8 PNGs across SE / mini / Pro / Pro Max / iPad with corresponding `<link rel="apple-touch-startup-image" sizes="..." media="...">` entries in `app/layout.tsx`. REQUIREMENTS.md SPLA-02 row will be marked deferred at Phase 40 close.
- **"Heure du décide" Profil setting** — Out of scope per D-01. Productize-later: if shortlist scheduling becomes user-configurable (currently fixed at 16:00 household tz per CLAUDE.md invariant #7), revisit a Profil row for it.
- **Per-member stats splits** — Considered and rejected per D-04. Productize-later: a per-member breakdown view ("Luca's contributions" tab) could ship as a v0.10+ feature. Today: single household-aggregate per row.
- **Last-30-day stats windows** — Considered and rejected for v0.9. The backend endpoint shape (`GET /households/{id}/stats`) is extensible — could add `?window=30d` query param later without breaking the frontend.
- **Profil logomark** — Sketch doesn't show one; if we want a visual anchor above the hero "Profil" word in a future polish pass, the BrandIcon at ~48px in muted would match Bibliothèque's pattern.
- **Library text-only "validé" pill source optimization** — If the live `compute_vote_state` query gets expensive (it won't at couple-scale, but might for productize), add `recipes.last_voted_state` denorm column. Tracked as v0.10+ if it ever surfaces.

</deferred>

---

*Phase: 40-pure-frontend-restyles*
*Context gathered: 2026-05-21*
