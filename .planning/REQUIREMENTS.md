# Requirements — v0.7 Sober Kitchen + Polish

**Milestone:** v0.7
**Status:** Active (roadmap approved)
**Source:** 8 open GitHub issues scoped through `/gsd-new-milestone` 2026-05-17. In-scope: gh#23, gh#24, gh#25, gh#27, gh#29. Deferred: gh#26 (« Suggérer » tab → backlog, needs product design); gh#28 (test-coverage expansion → v0.8, after visual contract locks). To close: gh#20 (shipped in v0.6).
**Goal:** Clear the live-bug backlog, ship the missing capture entry point, port the locked screens to the Sober Kitchen design system per `docs/design-system.html` §15, and split CLAUDE.md so the root file's per-turn context cost shrinks.

---

## v0.7 Requirements

### Bug sweep

- [x] **BUG-01** — Recipe photos self-heal when their signed URL expires after a backgrounded PWA resumes (gh#23). Backend `SIGNED_URL_TTL_SECONDS` raised to 1h in `backend/app/services/storage.py`; frontend `PHOTO_URL_CACHE_TTL_MS` raised to 50min in `frontend/lib/recipes.ts`; production `<img onError>` invalidates the frontend signed-URL cache and refetches the URL exactly once before giving up. Applies to `RecipeCard`, `ShortlistCard`, `PhotoUploader`, and `frontend/app/recipes/[id]/page.tsx`. Dev-only 3-stage fallback path stays gated to non-prod. Acceptance: iPhone PWA, load household → lock 10 min → unlock → photos render (or self-recover within one frame).
- [x] **BUG-02** — Recipe SVG illustrations render as visible pictograms instead of empty muted squares (gh#24). `sanitize_recipe_svg` output uses unprefixed `<svg>` / `<path>` markup with the SVG namespace as the default on the root only — no synthetic `ns0:` prefix anywhere. Existing `recipes.illustration_svg` rows whose payload starts with `ns0:` are remediated (re-sanitize in place, strip prefixes, or NULL for regeneration — decision during planning). All existing sanitizer guarantees preserved (strict allowlist, event-handler / `style=` / `href` rejection, CDATA / comment / PI / XXE rejection, 4 KB cap, D-34 normalization, reject-and-fallback). New unit test asserts no `ns0:` substring + bare `<svg` root. Acceptance: capture a fresh recipe without a photo → library card + inbox row render a visible pictogram.

### Bottom nav

- [ ] **NAV-01** — User reaches the recipe capture flow via a central elevated « Ajouter » CTA in the bottom nav on every authenticated, non-onboarding screen (gh#25). Filled primary circle with white `+`, visibly elevated above the four flat sibling tabs, label `Ajouter` beneath. Active routing semantics (`aria-current="page"`) honored when the user is on the capture entry route. Drafts-tab badge, safe-area inset, and `/onboarding/*` hiding preserved. Per-tab visual variant discriminator (`variant: "tab" | "central-cta"`) introduced to avoid sprinkling conditionals. Out-of-scope here: « Suggérer » tab (gh#26 — deferred); icon swaps on the other four tabs. Acceptance: visual match to `.scratch/capture-mockups/1-smart-paste.html`; keyboard + screen-reader reachable.

### Sober Kitchen design-system port (gh#29 — executes `docs/design-system.html` §15 "Mise en code" A→E)

- [ ] **SOBER-01** — Locked Sober Kitchen tokens land in `frontend/app/globals.css` per §15.A (terracotta sober palette + type scale). Caveat font registered alongside Cormorant per §15.B. New patine + marginalia utility classes available. Parallel cleanup per §15.D removes the ad-hoc CSS that the new system replaces. Acceptance: grep gates confirm no ad-hoc duplicates of the locked tokens remain in any `frontend/{app,components}` file.
- [x] **SOBER-02** — Accueil (home) screen ports to the locked Sober Kitchen layout per the doc's locked-screen reference — shortlist au centre.
- [x] **SOBER-03** — Bibliothèque (recipe library) screen ports to the locked Sober Kitchen layout — A par défaut, B/C accessibles per the doc.
- [x] **SOBER-04** — Recette — Détail (recipe detail) screen ports to the locked Sober Kitchen layout — cookbook page register per the doc.
- [x] **SOBER-05** — Recipe cards across the app render the patine treatment driven by `cook_count → patina` mapping. Cross-cutting register applied wherever recipe cards appear (Accueil, Bibliothèque, Recette détail at minimum).
- [x] **SOBER-06** — Voting surfaces render as the table-à-manger scene — the 5 computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis) read as one unified visual scene per the locked design. Cross-cutting voting register; underlying state machine (invariant #2 — computed, not stored) unchanged.
- [ ] **SOBER-07** — Marginalia register applied — Caveat handwriting carries the human-voice annotations (manual-edit pin labels, system asides, register cues) consistently across the locked screens. Phase 28's `PinLabel.tsx` is the precedent.
- [ ] **SOBER-08** — Brand-mark loader replaces ad-hoc spinners on slow-path surfaces. Loading states route through the locked brand-mark animation per the doc.

### Developer experience

- [ ] **DX-01** — Root `CLAUDE.md` shrinks to (a) architecture invariants, (b) locked vocabularies, (c) MVP posture, (d) source-of-truth pointers (PROJECT.md / SPEC.md / design-system.html / frontend/AGENTS.md). Backend-specific guidance (SQLAlchemy 2.0 typed style, Alembic conventions, `uv` workflow, single-uvicorn-worker reasoning, APScheduler in-process pattern) moves to `backend/CLAUDE.md`. Frontend-specific guidance (Next.js 16 breaking changes, ESLint-as-formatter, `@/*` alias, `--webpack` build flag rationale) moves to `frontend/CLAUDE.md` while `frontend/AGENTS.md` stays in place (cross-tool — Cursor / Aider read it). GSD workflow enforcement moves to `.planning/CLAUDE.md`. Acceptance: root `CLAUDE.md` line count drops materially; every moved rule is verifiably present in exactly one scoped file (no duplication, no drop).

---

## Out of Scope (v0.7)

<!-- Explicit cuts. Reasons attached. -->

- **Test-coverage expansion (gh#28)** — deferred to v0.8. Tests are foundational and benefit from a locked visual contract (issue itself flags this). Running them against the Sober-Kitchen-ported surfaces avoids re-baselining mid-port.
- **« Suggérer » tab (gh#26)** — deferred to backlog. Issue itself flags `needs-triage`; the destination surface and behavior are undefined. Run `/grill-with-docs` on the issue first; route to `ready-for-agent` only after a product design pass.
- **Bottom-nav icon swaps for the other four tabs (Accueil / Recettes / drafts / Profil)** — gh#25 agent brief explicitly carves these out. Today's lucide-react icon set stays.
- **« Smart Paste » capture-screen redesign** from the same mockup — v0.6 already shipped the chat-based capture surface (CAPTURE-01..04); the mockup's `Smart Paste` field is a separate idea that competes with the v0.6 design lock. Not in scope.
- **SW cache tuning for `/api/recipes/*/photo-url`** — gh#23 carves this out into "Phase 4 owns cache strategy tuning"; the right fix, wrong phase. The in-issue prescription handles the user-visible breakage without touching SW config.
- **Refetch-on-`visibilitychange`** — same reason as SW cache tuning. Reserved for the cache-strategy phase.
- **Deferred screens from `docs/design-system.html` §15.E** — the design system itself flags these as out-of-scope for the porting pass. Honored here.
- **Changes to the design system itself** — this is a port, not a redesign. Edits to `docs/design-system.html` only land if a discrepancy with the implementation forces a clarification (treat as a planning deviation per D-01-style discipline).
- **Push notifications for any of the above** — orthogonal; v0.7 stays on the existing realtime WebSocket spine (invariant #4).

---

## Traceability

_Filled by the roadmapper 2026-05-17. Each REQ-ID maps to exactly one phase._

| REQ-ID | Phase | Plan(s) |
|--------|-------|---------|
| BUG-01 | Phase 30 | 30-01 |
| BUG-02 | Phase 30 | 30-02 |
| NAV-01 | Phase 31 | TBD (plan-phase) |
| SOBER-01 | Phase 32 | TBD (plan-phase) |
| SOBER-02 | Phase 32 | TBD (plan-phase) |
| SOBER-03 | Phase 32 | TBD (plan-phase) |
| SOBER-04 | Phase 32 | TBD (plan-phase) |
| SOBER-05 | Phase 32 | TBD (plan-phase) |
| SOBER-06 | Phase 32 | TBD (plan-phase) |
| SOBER-07 | Phase 32 | TBD (plan-phase) |
| SOBER-08 | Phase 32 | TBD (plan-phase) |
| DX-01 | Phase 33 | TBD (plan-phase) |

**Coverage:** 12/12 v0.7 requirements mapped. No orphans.

---

*Last updated: 2026-05-17 — v0.7 REQUIREMENTS.md traceability filled by roadmapper. All 12 REQ-IDs mapped: BUG × 2 → Phase 30, NAV × 1 → Phase 31, SOBER × 8 → Phase 32, DX × 1 → Phase 33. Plans written by `/gsd-plan-phase`.*
