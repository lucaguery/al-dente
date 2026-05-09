# UI Review — History

**Audited:** 2026-05-09
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** **Partially reached** (per D-16) — `/cooking-logs` renders an empty state because `GET /api/cooking-logs?days=14` returns 404 (CL-01 backlog). The per-log detail route (`/cooking-logs/{id}`) renders the in-app `404 / This page could not be found` because no `[id]/page.tsx` exists. Surface effectively decommissioned in v0.2.1 prod despite shipping.

## Originality Verdict

**Verdict:** Mixed ⚠

This is the lowest-scoring surface of the audit. Token compliance technically *passes* in the limited surface that exists (the empty-state EmptyState component is on-system: lucide icon, semantic foreground colors, default heading/paragraph typography), but editorial cohesion *fails* because the surface's intended emotional beat — "look back at your meals together" — doesn't ship at all. The empty-state copy `Aucune recette pour le moment / Ajoute ta première recette pour commencer` is wrong-domain (it's about recipes, not cooking logs); the per-log detail page renders a framework-default 404; the entry point is buried two taps deep behind Settings. Verdict stays **Mixed** rather than **Feels Generic ❌** because what *is* visible respects the design system; the issue is structural absence, not visual drift.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| Empty-state copy reuses "Aucune recette pour le moment / Ajoute ta première recette pour commencer" — wrong-domain string lifted from another empty state (`frontend/app/cooking-logs/page.tsx`) — sub-finding of P-12-H-01 | EmptyState component itself is on-system: lucide icon at appropriate size + heading + paragraph, no boilerplate "Loading..." spinner-fallthrough — the structure is right, the *content* is wrong |
| `/cooking-logs/{id}` returns the in-app `404 / This page could not be found` heading-pair — Next.js's framework default rendered without app-specific 404 chrome | None observed — the surface has no Slow Food earned elements because it never renders content-shaped artifacts |
| Discoverability via `/settings → Voir les cuissons récentes` — buried 2 taps deep behind a chrome path | None observed — no main-nav surfacing, no widget on `/`, no badge counter |

## 6-Pillar Score: 18/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 3/4 | DOCKED — wrong-domain empty-state copy: `Aucune recette pour le moment / Ajoute ta première recette` displays on `/cooking-logs` despite the synthetic env having multiple finalized logs. A 21-recipe + 4-cook user would read this and think the inventory is gone. (See WALKTHROUGH.md §History — P-12-H-01 sub-finding) |
| Visuals | 2/4 | DOCKED — surface effectively renders nothing content-shaped. EmptyState is fine in isolation but the audit unit is the *surface*, and the surface ships an empty state for valid data because the GET endpoint is missing. Plus the per-log detail at `/cooking-logs/{id}` renders the in-app `404 / This page could not be found` — a framework default heading where a Slow Food not-found copy would fit. |
| Color | 4/4 | What renders uses semantic tokens correctly (`text-foreground-muted` for the empty-state body). No raw colors. |
| Typography | 4/4 | Default heading + paragraph; nothing exceptional but nothing broken. |
| Spacing | 4/4 | Empty-state spacing per shadcn defaults. |
| Experience Design | 1/4 | DOCKED HARD — three blockers: P-12-H-01 [CL-01 cross-link] (GET endpoint missing), P-12-H-02 [[Issue #6](https://github.com/lucaguery/al-dente/issues/6)] (per-log detail route absent — write-without-read path for the 5KB notes feature), P-12-H-03 (buried behind Settings — 2 taps + cognitive overhead). |

## Detailed Findings

### Pillar 6: Experience Design (1/4)

- **`GET /api/cooking-logs` (list) endpoint missing — CL-01 confirmed live** — page fires `GET /api/cooking-logs?days=14` → `404 Not Found`. Frontend's wrapper presumably catches and falls back to an empty-state view. Cross-link to CL-01 backlog only per D-06; do NOT file new. (See WALKTHROUGH.md §History — P-12-H-01) [CL-01 backlog]
- **Per-log detail route absent** — navigating to `/cooking-logs/{id}` for a real log id renders `404 / This page could not be found` inside the app shell. No `frontend/app/cooking-logs/[id]/page.tsx` file exists. The 5KB notes feature has a UI write path with no read path. Combined with H-01 (list missing) the History UX is fully gone in v0.2.1 prod. (See WALKTHROUGH.md §History — P-12-H-02) [[Issue #6](https://github.com/lucaguery/al-dente/issues/6)]
  - **Audit-time delta:** Phase 12 reported H-02 as "framework default 404 stripped of the chrome"; live re-probe shows the chrome IS preserved (bottom nav visible). The blocker stands; only the chrome-discrepancy detail differs from Phase 12. Possibly a Next.js routing-resolution change since Phase 12; not a regression of the underlying bug.
- **Buried behind Settings** — main nav: `[/, /recipes, /inbox, /settings]`. History only reachable via `Plus → Voir les cuissons récentes` (2 taps + cognitive overhead). Phase 12 plan describes History as part of the daily-use loop; should be one tap away. Friction stacking with H-01 + H-02. (See WALKTHROUGH.md §History — P-12-H-03)
- **Bad UUIDs render in-app 404 with chrome — pass-style** — `/cooking-logs/00000000-0000-0000-0000-000000000000` renders the same `404 / This page could not be found` inside the app shell. Boundary handling solid for malformed inputs. (See WALKTHROUGH.md §History — P-12-H-04)

### Pillar 1: Copywriting (3/4)

- DOCKED -1 — wrong-domain empty-state copy. The string `Aucune recette pour le moment / Ajoute ta première recette pour commencer` is shared with another empty state and displays unchanged on `/cooking-logs`. A user with 4 finalized logs sees this and is misled. The Slow Food editorial voice would write `Aucune cuisson enregistrée pour le moment / Cuisinez quelque chose et notez-le ici`.
- Otherwise — what renders is grammatically clean French; no orthographic drift.

### Pillar 2: Visuals (2/4)

- DOCKED HARD — the surface renders no content-shaped artifacts. EmptyState component itself is on-system but the *audit unit is the surface* (per CONTEXT D-05); a surface that ships an empty state for valid data fails the visual contract.
- Per-log detail page renders a framework-default 404 heading-pair where a Slow Food not-found copy ("Cette cuisson est introuvable / Retour aux cuissons") would fit. Token compliance vacuous because the page's body is `<h1>404</h1><h2>This page could not be found.</h2>`.

### Pillar 3: Color (4/4)

- The visible empty state uses `text-foreground-muted` for the body paragraph — semantic token. No raw colors anywhere.

### Pillar 4: Typography (4/4)

- Default `<h2>` and `<p>` typography from shadcn EmptyState. Nothing exceptional, nothing broken.

### Pillar 5: Spacing (4/4)

- EmptyState shadcn defaults — Tailwind scale.

## Screenshots

- `./screenshots/history-canonical.png` — `/cooking-logs` list page rendering the wrong-domain empty state ("Aucune recette pour le moment / Ajoute ta première recette pour commencer") despite the synthetic env having multiple finalized logs. Reproduces P-12-H-01 sub-finding live.
- `./screenshots/history-detail-404.png` — `/cooking-logs/{valid_log_id}` renders `404 / This page could not be found` (in-app shell with bottom nav visible). Reproduces P-12-H-02 with the audit-time chrome-preservation note.

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §History: 4 probes (P-12-H-01..H-04). P-12-H-01 + P-12-H-02 are blockers; H-03 is friction; H-04 is pass-style.
- 0 Gemini calls — History is read-only.
- Per CONTEXT D-16, this surface gets a "Partially reached" tag rather than a "Cannot Reach" — the page DOES render (the empty state), it just renders the wrong content. AUDIT-04's "one row per surface" requirement satisfied via this UI-REVIEW.
- The History surface combined with v0.2.2 backlog item CL-01 is the strongest argument in the audit for a v0.4 polish phase: write+read path symmetry is broken end-to-end (the 5KB notes from P-12-CL-02 + the per-log detail route from P-12-H-02 mean a feature shipped without a read affordance).
