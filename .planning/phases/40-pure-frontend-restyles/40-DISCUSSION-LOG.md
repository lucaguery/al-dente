# Phase 40: Pure-Frontend Restyles - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 40-pure-frontend-restyles
**Areas discussed:** Profil settings IA, Profil stats block source, Splash apple-touch-startup-image scope, DRIFT-01 token replacement (loved rating)

---

## Profil settings IA (PROF-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Literal sketch + drop 'Heure du décide' | 5 rows: 01 Notifications / 02 Foyer / 03 Membre / 04 Exporter / 05 Déconnexion. Drops sketch's 'Heure du décide' (no such setting exists). Keep partner block above rows. | ✓ |
| Literal sketch, no partner block | Match sketch 1:1: 5 rows + stats + identity line. Drop partner block. Maximum sketch fidelity. | |
| Keep current content, La Grille restyle only | 3 Cards become 3 numbered sections. Most conservative — closest to current. | |

**User's choice:** Literal sketch + drop 'Heure du décide' — preserves member identity block above rows; partner-color collapse already shipped on Accueil so pattern is consistent.
**Notes:** The "Heure du décide" sketch row is a productize-later setting (shortlist scheduling is fixed at 16:00 household-tz per CLAUDE.md invariant #7). Adding it would require a backend `households.shortlist_time` column + APScheduler reconciliation — out of phase scope.

---

## Profil stats block source

| Option | Description | Selected |
|--------|-------------|----------|
| All-time household, live SQL per render | Three count queries embedded in `/households/{id}` response. Trivial cost at couple-scale. | |
| All-time household, backend endpoint | New `GET /households/{id}/stats` endpoint. Adds a route but cleaner separation; easier to extend later. | ✓ |
| Per-member splits | Stats split by member. More information density but breaks the 3-stat sketch composition. | |

**User's choice:** All-time household, backend endpoint — the new endpoint is worth the small scope expansion for separation + extensibility.
**Notes:** Phase 40 was scoped as "no schema or API changes". The new endpoint is the one backend touch — explicitly called out in CONTEXT.md D-04 as a scope adjustment. No migration; no existing endpoint modified. The endpoint follows the v0.8 Phase 38 4-test contract.

---

## Splash apple-touch-startup-image scope (SPLA-01 + SPLA-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Skip iOS startup image — loading.tsx only | Rely on `app/loading.tsx` for Next.js navigation loads. iOS PWA shows blank-then-app on cold launch (acceptable couple-scale). SPLA-02 deferred. | ✓ |
| One size (iPhone Pro — 1170×2532) | Ship one PNG covering iPhone 14/15/16 Pro Max. Other devices fall back to blank. | |
| Full matrix (5–8 sizes) | Ship SE / mini / Pro / Pro Max / iPad sizes per Apple recommendation. ~6 PNG assets. | |

**User's choice:** Skip iOS startup image — `loading.tsx` only. SPLA-02 becomes a deferred follow-up.
**Notes:** Phase 40 ships SPLA-01 cleanly via `app/loading.tsx`; SPLA-02 (the iOS apple-touch-startup-image matrix) defers to a productize-later follow-up. REQUIREMENTS.md SPLA-02 will be marked deferred at phase close. The blank-then-app cold-launch experience on iOS PWA is acceptable for the couple-scale internal app (both members install via Safari "Add to Home Screen" once; cold launches are rare in daily use because PWA stays in iOS app-switcher).

---

## DRIFT-01 token replacement (loved rating)

| Option | Description | Selected |
|--------|-------------|----------|
| Terracotta tint #F5E5DD + accent border | Use the existing valide-chip token. Subtle, matches Validated state language. | ✓ |
| Plain bg + accent border + accent text | No background tint. Lighter visual weight; relies on text-color flip. | |
| Different token altogether (TBD planning) | Flag as a planning decision. | |

**User's choice:** Terracotta tint #F5E5DD + accent border (the existing valide-chip token).
**Notes:** Mirrors the Accueil validated-state language. "Loved" is the strongest cooking-log signal — aligning it visually with the strongest voting state ("validé") is intentional and consistent. Concrete CSS: `bg-[var(--color-valide-tint)] text-primary border border-primary` (CONTEXT D-10).

---

## Claude's Discretion

- **ONBO-01 (Onboarding welcome)** — Sketch composition is unambiguous; no gray areas raised for user input. Planner picks i18n key naming for the footer line and confirms the create/join button copy matches existing i18n. Implementation follows sketch literally.
- **LIB-01 (Library text-only mode)** — Tag pill "validé" source: planner picks. Default candidate is live `compute_vote_state` filtered by current member for today's shortlist; fallback to `recipes.last_voted_state` denorm if cost surfaces (it shouldn't at couple-scale).
- **`RecipeRowMinimal` component shape** — Planner picks file location and whether `LibraryViewSwitch` uses a 3-state enum or two boolean flags.

## Deferred Ideas

- **SPLA-02 iOS apple-touch-startup-image full size matrix** — Productize-later, tracked in CONTEXT.md Deferred Ideas. REQUIREMENTS.md SPLA-02 marked deferred at phase close.
- **"Heure du décide" Profil setting** — Productize-later; requires backend `households.shortlist_time` column + APScheduler reconciliation. Tracked in CONTEXT.md Deferred Ideas.
- **Per-member stats splits** — v0.10+ candidate. Backend endpoint shape (`GET /households/{id}/stats`) is extensible.
- **Last-30-day stats windows** — `?window=30d` query param could be added later without breaking frontend.
- **Profil logomark** — Could anchor above hero "Profil" word in a future polish pass at ~48px muted BrandIcon.
- **`recipes.last_voted_state` denorm column** — For Library text-only "validé" pill optimization if live computation surfaces as expensive; not needed for v0.9.
