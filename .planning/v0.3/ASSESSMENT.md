# v0.3 Assessment — Synthesis & Handoff

> Phase 14 of v0.3 (Audit & Uniqueness Foundation). This document combines `WALKTHROUGH.md` (Phase 12) and `UI-AUDIT.md` (Phase 13) into a single ranked-findings list ordered by impact on the "feels Al Dente" question. Descriptive — does not name future phases or remediation paths.

## Executive summary

<!-- Composed in Plan 2 Task 1. Contains: 2-3 paragraphs (milestone-level conclusion, axis-(ii)-drives-Tier-1 observation, verdict-correlation finding from N-5), "How to read this document" subsection, "Calibration notes" subsection, "Limits of this assessment" subsection (T-6 P-12-Pu-01 + N-4 prod-data anomalies + iPhone-shape-Chromium scope + D-16 partial-reach push/history). -->

## Ranking method

<!-- Composed in Plan 2 Task 2. Contains: D-03 3-axis rubric exposed (axis i / ii / iii definitions); 0-2 scale; tier mapping (≥4 / 2-3 / 0-1); tie-breaker rule (axis i → axis ii → axis iii); reference table. -->

## Ranked findings

> 27 entries grouped into three tiers by total impact score per the Ranking method. Within tier, entries ordered by total descending then axis (i) descending. Tier ordering reflects impact on "feels Al Dente", not implementation priority — these are not the same axis.

### Tier 1 — total impact score ≥ 4

<!-- 2 entries, drafted below in this task. -->

#### B-3 — Architecture invariant #2 broken: `MEMBER_COUNT=2` hardcoded; vote-state mis-computed in households whose member count is not 2

- **Tier:** 1
- **Impact axes:** (i:2 / ii:2 / iii:1, total 5)
- **Observed:** The 5-state vote chip pill (`Validé / Pressenti / Contesté / Rejeté / Sans avis`) is the user-visible artifact of the household voting contract. In the 4-member synthetic household used across the audit, the chip rendering for the audit-day shortlist resolves as `Ragu (4 yes) → Sans avis` (the architecturally-correct state is `Validé`), `Coq (2y, 1n) → Validé` (architecturally `Contesté`), `Butter (2y, 2n) → Validé` (architecturally `Contesté`), and `Shawarma (3 no) → Sans avis` (architecturally `Rejeté`). The break has two layers: the frontend `MEMBER_COUNT = 2` constant at `frontend/components/HomeDecide.tsx:52` and `frontend/components/VoteSummary.tsx:83` defaults the chip-deriving call, AND the backend `compute_vote_state(...)` defaults the `member_count` argument to `2` at the wire layer (verified live via WebSocket frame inspection during Phase 12 §Realtime P-12-RT-4 cross-surface confirmation). The same anomaly therefore surfaces on the post-deck recap chip AND on any client subscribing to `vote.created` broadcasts. The `// v0.1: hard-coded household size; multi-tenant clean.` comment at `HomeDecide.tsx:52` acknowledges the limitation but ships without a productize-deferred source marker — the productize-deferred status is implicit, not source-tagged.
- **Where:** `frontend/components/HomeDecide.tsx:52` (`MEMBER_COUNT = 2` constant); `frontend/components/VoteSummary.tsx:83` (chip-derivation call site); backend `compute_vote_state(...)` default `member_count=2` at the wire layer (verified at `vote.created` WS frames per Phase 12 §Realtime P-12-RT-4). Surface footprint: vote (chip rendering on the post-deck recap) + realtime (broadcast frames carrying the same default).
- **Why this impacts feels-Al-Dente:** Axis (i): 2. The 5-state chip pill is described in `ui-reviews/vote-UI-REVIEW.md` as one of the most visually-distinctive Slow Food artifacts in the app — distinct background tint, foreground role, and border accent per state, with the custom `--color-valide-tint` token rendered correctly per the 07-UI-SPEC pill recipe. When the chip displays the wrong state, the identity-bearing visual moment is intact but the *meaning* it carries is inverted — the moment that defines the voting product semantically misfires. Axis (ii): 2. Architecture invariant #2 (CLAUDE.md "Voting state is computed, not stored") breaks at the user-visible layer: the very contract the invariant exists to enforce (5 states derive from rows in `votes` for `(shortlist_id, recipe_id)`) silently fails because `member_count` is hardcoded to a household-size assumption that does not hold in the audited household. Axis (iii): 1. The primary tap-path completes (tapping a recipe submits a vote, the chip updates) but the displayed result is wrong — friction-class because the user can finish the action, but the visible feedback misrepresents the household's actual decision state.
- **Sources:**
  - `WALKTHROUGH.md §Vote — P-12-Vt-01` (per-recipe chip mis-rendering observed live in 4-member synthetic env)
  - `WALKTHROUGH.md §Realtime — P-12-RT-4` (cross-surface confirmation at the WS frame layer)
  - `ui-reviews/vote-UI-REVIEW.md Pillar 6` (1/4 dock; "blocker class" docking applied)
  - `UI-AUDIT.md "Cross-cutting observations" bullet 9` (architecture-invariant violation cluster)
  - `Issue #4` (https://github.com/lucaguery/al-dente/issues/4)

#### B-4 — Cooking log re-finalize doubles `cook_count` — invariant #3 violated

- **Tier:** 1
- **Impact axes:** (i:0 / ii:2 / iii:2, total 4)
- **Observed:** A double-finalize of the same `cooking_log` row (a couple finalizing then re-tapping `Finaliser` on the same day to fix a typo in notes) increments `recipes.cook_count` twice. The Phase 12 probe verified the behavior live: 2× PUT to the same cooking-log id produces `cook_count = 2` rather than `1`, and the user-visible recipe-detail line `Dernière fois : aujourd'hui · Cuisinée 2 fois` reflects the doubled count. The router docstring at `backend/app/routers/cooking_logs.py:136-160` documents idempotency (`re-PUT of an already-finalized log does NOT double-count cook_count`) but the `is_first_finalize` guard does not gate the increment. The denormalized columns (`recipes.cook_count` + `recipes.last_cooked_at`) are part of the same row updated by the cooking-logs insert, so the observable state directly contradicts the contract.
- **Where:** `backend/app/routers/cooking_logs.py:136-160` (idempotency contract documented in docstring; `is_first_finalize` guard not gating the bump). User-visible surface: recipe-detail page `Dernière fois : aujourd'hui · Cuisinée N fois` line where `N` doubles after re-finalize. Downstream propagation: `backend/app/services/algorithm.py` consumes `cook_count` as a recency input to shortlist scoring; an inflated count corrupts that input.
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised — `ui-reviews/cooking-log-UI-REVIEW.md` notes the CookingBanner with terracotta wash and `paper-grain` chrome reads as Slow Food, and that visual register is intact regardless of whether `cook_count` increments correctly. Axis (ii): 2. Architecture invariant #3 (CLAUDE.md "Denormalized fields update in the same DB transaction as the cooking_logs insert") breaks at the user-visible layer: the row whose entire purpose is to keep `cook_count` honest writes the wrong value, and the user reads it back on the recipe-detail surface. Axis (iii): 2. The primary tap-path (tap `Finaliser`, see the cook recorded) completes, but the resulting state is corrupt — the user reads `Cuisinée 2 fois` after a single cook, AND the corruption propagates silently to the scoring algorithm via the `cook_count` recency input, so future shortlists are computed against falsified history. The data-corruption shape — invisible during the action, visible afterwards, and propagating downstream — is the load-bearing reason the entry sits in Tier 1 alongside the chip-semantics break.
- **Sources:**
  - `WALKTHROUGH.md §Cooking-Log — P-12-CL-01` (live 2× PUT reproduction; docstring vs behavior)
  - `ui-reviews/cooking-log-UI-REVIEW.md Pillar 6` (1/4 dock; "blocker per D-01" rationale)
  - `UI-AUDIT.md "Cross-cutting observations" bullet 9` (invariant cluster)
  - `Issue #5` (https://github.com/lucaguery/al-dente/issues/5)

### Tier 2 — total impact score 2-3

<!-- 8 entries, drafted below in this task. -->

#### C-4 — Capture-pipeline missing terminal state (Gemini-failed-silently)

- **Tier:** 2
- **Impact axes:** (i:0 / ii:1 / iii:2, total 3)
- **Observed:** Three of the five capture surfaces share an identical observable state when promotion fails: the draft persists indefinitely with title `(extraction en cours…)` and no recovery affordance other than delete-and-retry. On capture-voice, garbled French audio transcripts uploaded as text bodies leave drafts stuck in this state for 3+ minutes (the Phase 12 reproduction left them stuck across the entire audit session). On capture-photo, uploading a non-recipe image (the audit used a 4×4 PNG and a generic photograph) produces the same terminal state. On capture-url, the productize-deferred extraction stub leaves URL-submitted drafts permanently in the same state by construction — same observable behavior, different root cause. The `recipes` table model carries `draft` and `structured` statuses but no `failed` terminal state, and the BackgroundTask promotion path emits no escalation event when Gemini returns garbage or when the URL extraction stub no-ops. The visible result for the user is the same across all three: a card in `/inbox` titled `(extraction en cours…)` that never resolves.
- **Where:** `backend/app/services/llm` (Gemini extraction; no `failed` terminal state on the `recipes` model); `backend/app/api/recipes.py:481-490` (URL extraction productize-deferred stub; drafts never promote by construction). Surface footprint: capture-voice, capture-photo, capture-url. UI render site: `/inbox` cards stuck at `(extraction en cours…)`.
- **Pattern:** 3 surfaces — capture-voice (garbage transcript stuck `(extraction en cours…)` 3+ minutes per P-12-V01) / capture-photo (non-recipe photo upload stuck same state per P-12-Ph02) / capture-url (URL extraction stub leaves drafts un-promoted per URL-01 backlog).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. The capture surfaces themselves render correctly (the voice surface's italic margin-note Card with `primary/60` left border is a Slow Food display moment per `ui-reviews/capture-voice-UI-REVIEW.md`); the missing terminal state surfaces in `/inbox`, not at the capture moment. Axis (ii): 1. Architecture invariant #1 ("Five capture surfaces, one shape … all promotion runs server-side in a FastAPI BackgroundTask") holds at the code layer — promotion does run server-side — but the model of capture promotion implicit in the invariant (a draft transitions to `structured` or to a terminal failed state) is incomplete: the failed branch is unmodelled, so the contract holds at the code layer while the user-visible artifact spins indefinitely. Axis (iii): 2. The primary tap-path (capture a recipe, see it become structured) produces the wrong result on three of five capture surfaces under realistic failure conditions; the user has no actionable affordance other than `Supprimer la recette`. Single-fix-multi-surface footprint at the promotion layer.
- **Sources:**
  - `WALKTHROUGH.md "Inputs to Phase 14" bullet 2` (capture-pipeline missing terminal state cluster)
  - `WALKTHROUGH.md §Capture-Voice — P-12-V01` (garbage transcript stuck)
  - `WALKTHROUGH.md §Capture-Photo — P-12-Ph02` (non-recipe photo stuck)
  - `WALKTHROUGH.md §Capture-URL — P-12-U01` (URL extraction stub)
  - `ui-reviews/capture-voice-UI-REVIEW.md Pillar 6`, `ui-reviews/capture-photo-UI-REVIEW.md Pillar 6`, `ui-reviews/capture-url-UI-REVIEW.md Pillar 6`
  - `Issue #3` (https://github.com/lucaguery/al-dente/issues/3) (Voice/Photo cross-surface dedupe; URL not yet filed per Phase 12 D-06 backlog cross-link rule)

#### B-2 — Ingredient parser corrupts `<int> <noun>` lines

- **Tier:** 2
- **Impact axes:** (i:1 / ii:0 / iii:2, total 3)
- **Observed:** The ingredient-line parser at `frontend/components/RecipeForm.tsx:98-100` greedily binds the head noun as the unit on common French shopping-list patterns. The Phase 12 probe submitted a Salade niçoise via the Complète tab containing the line `4 tomates`; the round-tripped record returned `{quantity: 4, unit: "tomates", name: "4 tomates"}`, and the recipe-detail page rendered the line as `4 tomates 4 tomates` because the renderer concatenates `{quantity} {unit} {name}`. The same parser misclassifies `1 oignon rouge` as `{name: "rouge", quantity: 1, unit: "oignon"}` — the noun head is consumed as the unit and the qualifier becomes the name. The fallback at line 104 (`name: m[3] || line`) returns the entire input line when the third capture group is empty, which is what produces the duplication on the rendered side. The `Ingrédients` list is the primary readable artifact of the recipe-detail surface, so the corruption surfaces on every captured recipe whose ingredient lines follow the simple `<int> <noun>` pattern — which is the dominant shape for French shopping-list inputs. Likely propagation: capture-voice, capture-photo, and capture-url share the same downstream parser path once their drafts promote.
- **Where:** `frontend/components/RecipeForm.tsx:98-100` (regex), `frontend/components/RecipeForm.tsx:104` (fallback). Surface anchor: capture-full. Likely propagation: capture-voice, capture-photo, capture-url via the shared parser path. User-visible render site: recipe-detail `Ingrédients` list.
- **Why this impacts feels-Al-Dente:** Axis (i): 1. The recipe-detail `Ingrédients` list is the primary readable artifact of the structured-recipe view — corruption like `4 tomates 4 tomates` undermines the editorial polish that the surrounding chrome (Fraunces display title, paper-grain Card, terracotta accents) earns. The identity register survives at the surface chrome level but is degraded peripherally where the ingredient text renders. Axis (ii): 0. No documented architecture invariant covers parser correctness. Axis (iii): 2. The primary tap-path (capture a Salade niçoise via the Complète form) completes, but the resulting recipe detail page displays corrupted ingredient lines on the most common French input pattern — the user must manually re-edit or re-enter the recipe. The `disabled={!v.title.trim() || submitting}` gate at `RecipeForm.tsx:364` does not protect against this because the parser runs server-side post-submit.
- **Sources:**
  - `WALKTHROUGH.md §Capture-Full — P-12-F01` (live reproduction; recipe sample `131ce526-6bbc-4a9e-8a34-0ad0760e3bb4`)
  - `ui-reviews/capture-full-UI-REVIEW.md Pillar 6` (2/4 dock; blocker per WALKTHROUGH D-01)
  - `Issue #2` (https://github.com/lucaguery/al-dente/issues/2)

#### B-5 — Per-log detail route `/cooking-logs/{id}` missing in Next.js

- **Tier:** 2
- **Impact axes:** (i:0 / ii:1 / iii:2, total 3)
- **Observed:** The history surface ships a write path for the 5KB notes feature (the cooking-log finalize page accepts up to 4000 characters of free-text notes via `CookingLogFinalize.tsx:186-192`) without a corresponding read path. Navigating to `/cooking-logs/{id}` for any real cooking-log id renders the in-app `404 / This page could not be found` heading-pair because no `frontend/app/cooking-logs/[id]/page.tsx` file exists in the route tree. The Phase 12 probe verified the absence live, and the Phase 13 audit re-probe confirmed the framework-default 404 is now wrapped in the app shell (the bottom nav remains visible) — the underlying route absence is unchanged from Phase 12; only the chrome-rendering detail differs. The notes the user types during finalize are persisted (the `cooking_logs.notes` column accepts the input and the row is created) but cannot be read back from any UI route in v0.2.1 prod.
- **Where:** Missing file `frontend/app/cooking-logs/[id]/page.tsx` (no `[id]/page.tsx` exists in the route tree). User-visible render site: in-app `404 / This page could not be found` heading-pair under the app shell when navigating to `/cooking-logs/{id}` for any valid cooking-log id.
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised by the route absence — the framework-default 404 chrome that surfaces in its place is generic, but the surface is not one of the identity-bearing display moments (`onboarding-UI-REVIEW.md` and `settings-UI-REVIEW.md` carry those). Axis (ii): 1. The "members own their identity / write paths have read paths" principle is not one of the 8 documented architecture invariants in CLAUDE.md, so the break is invariant-adjacent rather than invariant-explicit. The break sits at the route layer (no `[id]/page.tsx`) and is invisible in the data layer (the row is created correctly), which is the "code-layer-but-UI-visible" shape that scores axis (ii):1. Axis (iii): 2. The primary tap-path (finalize a cook with notes, recall the notes later) produces the wrong result — the framework default 404 stripped of Slow Food chrome where a per-log detail surface would render. Combined with the missing GET endpoint (B-10), the history feature ships a write path with no read path.
- **Sources:**
  - `WALKTHROUGH.md §History — P-12-H-02` (live navigation reproduction)
  - `ui-reviews/history-UI-REVIEW.md Pillar 6` (1/4 dock; "write-without-read path for the 5KB notes feature")
  - `Issue #6` (https://github.com/lucaguery/al-dente/issues/6)

#### B-6 — 5-member household at color-palette capacity ceiling — silent failure

- **Tier:** 2
- **Impact axes:** (i:1 / ii:0 / iii:2, total 3)
- **Observed:** The onboarding `MEMBER_COLORS` palette caps the household at the size of the swatch set. When all swatches are taken (every existing member has claimed one), the join surface renders all swatches in the locked state via the `<Lock>` icon overlay (`ColorSwatchPicker.tsx:42-46`), the submit button stays disabled because no color can be picked, and no surface communicates "this household is at capacity." The onboarding flow ends in a silent terminal state where the joining user sees the same color picker they would see mid-flow with all options unavailable, with no copy explaining why or what to do next. The `<Lock>` overlay handles the per-color "this swatch is taken" affordance well in isolation; what is missing is the household-level terminal state. (Audit-time delta: WALKTHROUGH §Onboarding O-04 stated the palette has 4 swatches; live `frontend/lib/colors.ts:1-7` read on 2026-05-10 shows 5 swatches — `rose / amber / emerald / sky / violet`. The ceiling is at N=5 in the live code; entry B-21 captures the WALKTHROUGH-vs-live-code delta.)
- **Where:** `frontend/lib/colors.ts:1-7` (palette of 5 hex swatches: `#F43F5E` rose / `#F59E0B` amber / `#10B981` emerald / `#0EA5E9` sky / `#8B5CF6` violet). `frontend/components/ColorSwatchPicker.tsx:42-46` (`<Lock>` overlay on taken swatches). Backend lacks a distinct 422 / max-members enforcement for the join endpoint, so the failure mode is purely surfaced via the UI's exhausted-picker state. (See B-21 for the WALKTHROUGH-vs-live-code 4-vs-5 swatch reconciliation.)
- **Why this impacts feels-Al-Dente:** Axis (i): 1. The `<Lock>` icon overlay is described in `ui-reviews/onboarding-UI-REVIEW.md` as a real "system says no" affordance — refusing the lazy `opacity-40` disabled-only treatment. The per-swatch level holds the editorial-care identity. The household-capacity terminal state, however, leaves the joining user staring at a fully-locked picker with no explanation, which peripherally degrades the warm onboarding identity (entry-point Cards in Fraunces italic, `6 caractères donnés par ta partenaire` helper copy that addresses real mental model) earned upstream. Axis (ii): 0. No documented architecture invariant covers household capacity. Axis (iii): 2. The primary intended action (`join the household`) is non-functional once the palette is exhausted — submit stays disabled, no copy explains "this household is full," no error surfaces. For a household at capacity, the join surface ends in a dead-end without a path forward.
- **Sources:**
  - `WALKTHROUGH.md §Onboarding — P-12-O04` (capacity ceiling reproduction)
  - `ui-reviews/onboarding-UI-REVIEW.md Pillar 6` (2/4 dock; audit-time delta noted)
  - `UI-AUDIT.md "Cross-cutting observations" bullet 12` (4-vs-5 swatch reconciliation)
  - `Issue #7` (https://github.com/lucaguery/al-dente/issues/7)

#### B-7 — `PATCH /api/households/me` returns 405 — member name unchangeable post-onboarding

- **Tier:** 2
- **Impact axes:** (i:0 / ii:1 / iii:2, total 3)
- **Observed:** The settings surface ships a Membre Card that displays the user's chosen name (`Toi` field-label + `<MemberDot>` color dot + name in `text-base font-medium`), but no UI affordance — no edit pencil, no `Modifier` button, no inline editor — exists for changing the name. The Phase 12 probe confirmed the absence at the API layer: `PATCH /api/households/me` returns `405 Method Not Allowed`. A user who onboarded with a typo'd name has no in-app recovery path for renaming themselves. The Membre Card is silent about the absence — there is no `(non-modifiable)` annotation, no productize-deferred hint, no disabled-with-tooltip `Modifier` button — so the constraint is invisible until the user attempts to act on it and discovers nothing happens. The `MemberDot` and member name combine into the single most-frequent identity artifact on the surface (also rendered on partner-vote indicators across shortlist + vote chips), so the name being permanent compounds across every surface that displays member identity.
- **Where:** Missing PATCH route on `backend/app/routers/households.py`. Missing UI affordance on `frontend/app/settings/page.tsx` (Membre Card rendered without an edit handle). User-visible render site: the read-only Membre Card on `/settings`.
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised by the absence — `ui-reviews/settings-UI-REVIEW.md` notes the Membre Card itself respects the design system (paper-grain Card, `<MemberDot>` Slow Food primitive, field-label-as-section-title pattern). Axis (ii): 1. The "members own their identity" principle is invariant-adjacent in the same shape as B-5 — implicit-not-documented; the 8 documented invariants in CLAUDE.md do not enumerate it explicitly, so the break sits at the code layer (missing PATCH route, missing UI handle) without rendering the visible Card incorrectly. Axis (iii): 2. The primary intended action (edit my member name after I notice the typo) produces the wrong result — no path completes the action. This compounds with B-6: a user who onboarded with a typo'd name into a household that subsequently reaches capacity has neither a rename path nor a re-onboarding path; the constraint stacks across the two entries. (Per the N-3 resolution this compounding observation lives in this entry's `Why this impacts feels-Al-Dente` field rather than as a third cluster entry.)
- **Sources:**
  - `WALKTHROUGH.md §Settings — P-12-S02` (live PATCH 405 reproduction)
  - `ui-reviews/settings-UI-REVIEW.md Pillar 6` (2/4 dock; cross-link to B-6 compounding)
  - `Issue #8` (https://github.com/lucaguery/al-dente/issues/8)

#### B-10 — CL-01: `GET /api/cooking-logs?days=14` endpoint missing; history page renders empty

- **Tier:** 2
- **Impact axes:** (i:0 / ii:1 / iii:2, total 3)
- **Observed:** The history surface fires `GET /api/cooking-logs?days=14` on mount and the request returns `404 Not Found`. The frontend wrapper falls back to an empty-state view, so the page renders the EmptyState component with copy `Aucune recette pour le moment / Ajoute ta première recette pour commencer`. The synthetic household has 4 finalized cooking logs at audit time, so the empty state is wrong-domain in two ways: (a) the rendered copy talks about recipes rather than cooking-logs, and (b) the user reads "no entries" for valid populated data. The endpoint absence is tracked as the CL-01 backlog item per `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)". Combined with B-5 (missing `/cooking-logs/{id}` detail route), the history feature ships in v0.2.1 prod with neither a list endpoint nor a detail route — the surface is observationally decommissioned even though `ui-reviews/history-UI-REVIEW.md` notes the visible chrome (`text-foreground-muted` empty-state body) renders to specification.
- **Where:** Missing endpoint on the backend (no `GET /api/cooking-logs?days=14` route). Surface render site: `frontend/app/cooking-logs/page.tsx` empty-state branch firing on the `404` response. Backlog entry: `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" CL-01.
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised — the EmptyState component is on-system in isolation (lucide icon, `text-foreground-muted` body, semantic typography). Axis (ii): 1. As with B-5, "write paths have read paths" is invariant-adjacent rather than invariant-explicit, and the break sits at the endpoint layer rather than at the rendering layer. Axis (iii): 2. The primary intended action (open history, see what we cooked) produces the wrong result — the user sees `Aucune recette pour le moment` for valid populated data, with copy that refers to recipes rather than cooks. Combined with B-5 the history surface is observationally decommissioned: write path persists notes, but no list and no detail route surface them. Per Phase 13 D-16 the history surface was annotated `Partially reached` for exactly this reason.
- **Sources:**
  - `WALKTHROUGH.md §History — P-12-H-01` (live `GET ?days=14 → 404` reproduction)
  - `ui-reviews/history-UI-REVIEW.md Pillar 6` (1/4 dock; surface "effectively decommissioned")
  - `UI-AUDIT.md §history` ("the most decommissioned surface in the audit")
  - `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" CL-01

#### B-1 — Sheet-01: `paper-grain` overrides Tailwind `fixed` on bottom sheets

- **Tier:** 2
- **Impact axes:** (i:0 / ii:0 / iii:2, total 2)
- **Observed:** On the iPhone-shape Chromium viewport (390×844), the photo-source bottom sheet on capture-photo ends 95px past the viewport. Live measurements during Phase 12: the dialog at `top=702 bottom=939 height=237`, the Caméra button at `top=775 bottom=823` (in viewport), the Photothèque button at `top=831 bottom=879` — 35px clipped past the 844px viewport bottom. Computed style on the dialog resolves `position: relative` despite the className including the `fixed` token; `paper-grain` declares `position: relative` and wins by source order over the Tailwind `fixed` class on the Radix Sheet primitive. Photothèque is the higher-frequency tap path of the two (camera-roll vs camera capture), so the clipped affordance is the more-tapped one. Tap requires either Safari URL-bar auto-hide (which collapses chrome when scroll begins) or vertical scrolling inside the dialog, neither of which is signalled by the surface.
- **Where:** `frontend/components/PhotoCaptureTab.tsx:152-212` (Radix Sheet `side="bottom"` with `paper-grain` class). CSS source-order conflict: `paper-grain` defines `position: relative` which wins over Tailwind's `fixed` on the Sheet primitive. Surface anchor: capture-photo. Backlog entry: `PROJECT.md` Sheet-01.
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised — `ui-reviews/capture-photo-UI-REVIEW.md` notes the photo grid affordance (2×2 with paper-grain dashed `+` add-tile) is genuinely earned, and that surface chrome is intact when the sheet is closed. The visual identity is undamaged; the affordance simply ends up off-screen when the sheet opens. Axis (ii): 0. No documented architecture invariant is broken. Axis (iii): 2. The primary tap-path (open the photo source sheet, pick `Photothèque`, attach a photo) is gated — the Photothèque button is 35px past the viewport bottom, requiring Safari URL-bar auto-hide or scrolling-inside-the-dialog (which Radix does not always surface) to reach. The primary intended action does not complete on the canonical iPhone-shape rendering without an undocumented workaround.
- **Sources:**
  - `WALKTHROUGH.md §Capture-Photo — P-12-Ph01` (live measurements; computed-style verification)
  - `ui-reviews/capture-photo-UI-REVIEW.md Pillar 6` (1/4 dock; "primary tap path requires Safari URL-bar auto-hide")
  - `Issue #1` (https://github.com/lucaguery/al-dente/issues/1)
  - `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" Sheet-01

#### B-13 — Push UX three-gap cluster

- **Tier:** 2
- **Impact axes:** (i:0 / ii:0 / iii:2, total 2)
- **Observed:** Three structural frictions stack on the push surface, all at the system-around-the-banner layer rather than at the visible PushPermissionBanner itself. (a) The banner is a one-shot session-storage affordance — a user who taps `Pas maintenant` writes `sessionStorage["dismissed_push_banner_at"]` and the banner returns `null` for the rest of the session, AND no `/settings` Card explains how to re-summon or re-enable; the banner mounts only on `/` HomeDecide so there is no in-Settings entry path back into the activation flow. (b) No admin-test fire endpoint exists — `POST /api/push/test`, `POST /api/push/send`, and `POST /api/push/fire-test` all return 404, so neither users nor auditors have a diagnostic path to verify their own delivery; the operator must trigger a real product event (the cron at 16:00 household-tz, partner cooking-started) on a real iPhone to confirm. (c) End-to-end push delivery round-trip was operator-deferred to v0.3-ship sign-off per `WALKTHROUGH.md §Push — P-12-Pu-05`, so the final delivery loop remained unverified at audit time. The visible PushPermissionBanner is correct (`bg-surface-rose-100` rose tint, lucide `Bell` in `text-primary` terracotta, French body `Pour savoir quand ton shortlist du jour est prêt.`, stacked `Activer` + `Pas maintenant` CTAs); the system *around it* leaves the user without a recovery path under any failure condition.
- **Where:** `frontend/components/PushPermissionBanner.tsx:74` (`SESSION_KEY = "dismissed_push_banner_at"` one-shot pattern); `frontend/components/HomeDecide.tsx:403, 460` (banner mount points; only on `/`). Missing `/settings` Card explaining re-enable path. Missing admin-test fire endpoint on the backend. Cross-link to operator-deferred round-trip per Phase 12 P-12-Pu-05.
- **Pattern:** 3 friction-stacking gaps on the push surface — banner-only entry (no Settings recovery surface) / no admin-test affordance (no diagnostic round-trip for users or auditors) / round-trip operator-deferred (end-to-end loop unverified at audit time). All three sit at the system-around-the-banner layer; the visible banner itself scores Pillar 3 4/4 per `ui-reviews/push-UI-REVIEW.md` (the only surface in the milestone to fully avoid the emerald-Tailwind-literal recurrence).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. The PushPermissionBanner is described in `ui-reviews/push-UI-REVIEW.md` as a "genuinely warm Slow Food micro-surface" — rose tint, terracotta Bell, French body that names the moment ("today's shortlist arriving"). The visible identity is intact and earns a Pillar 6 dock-target paradox: the surface scores Pillar 6 = 0/4 not because the visible artifact is wrong but because the system around it is structurally broken. Axis (ii): 0. No documented architecture invariant is broken. Axis (iii): 2. The primary tap-path (activate notifications, receive a shortlist push, fall back to Settings if the activation fails) is structurally gated under any failure condition — dismiss-once locks for the session, no Settings recovery, no diagnostic, no verified round-trip. Per the T-3 resolution this is one cluster entry rather than three standalone entries (P-12-Pu-04 audit-environment-only AND P-12-Pu-05 operator-deferred fold under the P-12-Pu-02 friction in this single entry).
- **Sources:**
  - `WALKTHROUGH.md §Push — P-12-Pu-02` (no Settings recovery)
  - `WALKTHROUGH.md §Push — P-12-Pu-04` (no admin-test fire endpoint)
  - `WALKTHROUGH.md §Push — P-12-Pu-05` (round-trip operator-deferred)
  - `WALKTHROUGH.md "Inputs to Phase 14" bullet 6` (Push UX three-gap framing)
  - `UI-AUDIT.md §push` (three structural frictions stacking)
  - `ui-reviews/push-UI-REVIEW.md Pillar 6` (0/4 dock; D-13 "blocker class" docking applied to a clean visible artifact)

### Tier 3 — total impact score 0-1

#### C-1 — Token-completeness gap — Tailwind-palette-literal cluster

- **Tier:** 3
- **Impact axes:** (i:1 / ii:0 / iii:0, total 1)
- **Observed:** Five surfaces reach for Tailwind palette literals where custom CSS variables would close the system. The literal pattern surfaces as `text-emerald-500` on the OUI thumb button on the shortlist deck, `border-emerald-500/50` on the validé chip border in the post-deck recap, `text-emerald-700` on the ChefHat icon in the cooking-log finalize page, the same `text-emerald-700` ChefHat on the realtime cooking-banner mounted on `/`, and the raw hex literals in the `MEMBER_COLORS` array used by the onboarding swatch picker (and reused by `<MemberDot>` across partner-vote indicators on shortlist cards and vote chips). The `globals.css` documentation marks emerald (h≈145) as part of the Slow Food palette, but the system has not yet exposed it as semantic tokens like `--color-valide-foreground` / `--color-cooking-foreground` / `--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground}`. The rendered colors land within the Slow Food register; the gap is structural rather than visible.
- **Where:** `frontend/components/ShortlistCard.tsx:256-258` (OUI thumb `text-emerald-500`); `frontend/components/VoteSummary.tsx:60` (validé chip border `border-emerald-500/50`); `frontend/app/cooking-logs/[id]/finalize/page.tsx` and `frontend/components/CookingBanner.tsx:25-28` (`text-emerald-700` ChefHat icon); `frontend/lib/colors.ts:1-7` (`MEMBER_COLORS` raw hex literals: `#F43F5E` / `#F59E0B` / `#10B981` / `#0EA5E9` / `#8B5CF6`).
- **Pattern:** 5 surfaces — shortlist OUI thumb (`text-emerald-500`) / vote validé chip border (`border-emerald-500/50`) / cooking-log ChefHat (`text-emerald-700`) / realtime cooking-banner ChefHat (`text-emerald-700`) / onboarding `MEMBER_COLORS` raw hex.
- **Why this impacts feels-Al-Dente:** Axis (i): 1. Token-completeness is part of Phase 13 D-02's "feels Al Dente" hybrid definition (token compliance + editorial cohesion). The rendered colors ARE Slow Food — the gap is internal: `globals.css` documents emerald as intentional, but the implementation reaches for the palette literal at the JSX call sites. Identity-signature impact is peripheral because the user reads the right color; the system gap is at the token layer, not the pixel layer. Axis (ii): 0. No documented architecture invariant covers token-completeness. Axis (iii): 0. No primary-path friction; the user-visible artifact is correct.
- **Sources:**
  - `UI-AUDIT.md "Cross-cutting observations" bullet 1` (token-completeness gap, 5-surface footprint)
  - `ui-reviews/shortlist-UI-REVIEW.md Pillar 3` (OUI thumb literal)
  - `ui-reviews/vote-UI-REVIEW.md Pillar 3` (validé chip border literal)
  - `ui-reviews/cooking-log-UI-REVIEW.md Pillar 3` (ChefHat literal)
  - `ui-reviews/realtime-UI-REVIEW.md Pillar 3` (cooking-banner ChefHat literal)
  - `ui-reviews/onboarding-UI-REVIEW.md Pillar 3` (`MEMBER_COLORS` raw hex)

#### C-6 — shadcn-default icons survived re-themeing

- **Tier:** 3
- **Impact axes:** (i:1 / ii:0 / iii:0, total 1)
- **Observed:** Four surfaces ship lucide icons that are themed via `text-primary` / `text-foreground-muted` color tokens but not customized for the Al Dente vocabulary. Exports uses the off-the-shelf `Download` icon for the JSON-as-recipe-archive CTA; push uses the off-the-shelf `Bell` icon for the activate-notifications affordance; cooking-log uses the lucide `ChefHat` for the active-cook surface; the realtime cooking banner mirrors the same `ChefHat` glyph. The chrome around each icon (rose-tinted region on push, paper-grain Card on exports, bg-primary/8 paper-grain on the cooking banner) rescues the surfaces from pure boilerplate, but the icons themselves carry no Slow Food custom register — a clock-shaped or paper-recipe-shaped glyph for push (matching the cron's 16:00-household-tz delivery moment), a kitchen-paper-ticket glyph for the cooking banner, or a JSON-as-recipe-archive glyph for exports would tie each into the editorial vocabulary the rest of the system earns.
- **Where:** `frontend/app/settings/page.tsx` (exports `Download` icon in Sauvegarde Card); `frontend/components/PushPermissionBanner.tsx` (push `Bell` icon); `frontend/app/cooking-logs/[id]/finalize/page.tsx` and `frontend/components/CookingBanner.tsx` (`ChefHat` icon).
- **Pattern:** 4 surfaces — exports (`Download`) / push (`Bell`) / cooking-log (`ChefHat`) / realtime cooking-banner (`ChefHat`).
- **Why this impacts feels-Al-Dente:** Axis (i): 1. The icons are themed correctly (no raw colors), but the glyphs themselves do not carry custom Slow Food register — `ui-reviews/exports-UI-REVIEW.md` and `ui-reviews/push-UI-REVIEW.md` both dock Pillar 2 -1 for exactly this reason; on cooking-log and realtime the surrounding chrome (paper-grain texture, terracotta wash) rescues the surface from a verdict shift. Identity-signature impact is peripheral. Axis (ii): 0. No documented invariant covers icon design. Axis (iii): 0. No primary-path friction.
- **Sources:**
  - `UI-AUDIT.md "Cross-cutting observations" bullet 6` (shadcn-default icons cluster)
  - `ui-reviews/exports-UI-REVIEW.md Pillar 2`
  - `ui-reviews/push-UI-REVIEW.md Pillar 2`
  - `ui-reviews/cooking-log-UI-REVIEW.md Pillar 2`
  - `ui-reviews/realtime-UI-REVIEW.md Pillar 2`

#### C-8 — i18n drift — next-intl invariant #6

- **Tier:** 3
- **Impact axes:** (i:0 / ii:1 / iii:0, total 1)
- **Observed:** Three surfaces ship hardcoded French strings instead of routing them through `next-intl`. The settings Historique Card renders `<span>Historique</span>` and `<span>Voir les cuissons récentes</span>` directly in JSX at `frontend/app/settings/page.tsx:175-183`. The HomeDecide partner-waiting strings are tracked as the POLISH-01 backlog item per `PROJECT.md` "Surfaced for follow-up". The cooking-log offline state on `CookingLogFinalize.tsx:83-86` checks `navigator.onLine` and surfaces an offline toast that is partially i18n-keyed but not exercised in the audit's Phase 12 reproduction (P-12-CL-05) — the listener wiring leaves at least one path producing untranslated content under degraded conditions. The rendered French strings ARE on-register (the settings copy is the same warm vocabulary as the rest of the page), so the user-visible artifact is correct; the invariant break is at the code layer where `next-intl` is bypassed.
- **Where:** `frontend/app/settings/page.tsx:175-183` (hardcoded `Historique` / `Voir les cuissons récentes`). `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" POLISH-01 (HomeDecide partner-waiting strings). `frontend/components/CookingLogFinalize.tsx:83-86` (offline state listener path; partial i18n coverage per P-12-CL-05).
- **Pattern:** 3 surfaces — settings hardcoded `Historique` / `Voir les cuissons récentes` (`page.tsx:175-183`) / HomeDecide partner-waiting strings (POLISH-01 cross-link) / cooking-log offline toast (P-12-CL-05).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. The rendered French is on-register and the user reads the warm vocabulary the rest of the page earns. Axis (ii): 1. Architecture invariant #6 ("French-only via `next-intl`, day one") breaks at the code layer — the strings ship outside the i18n table — but the user-visible drift is masked because the hardcoded French happens to match the locked Slow Food vocabulary. Code-layer break, user-layer correct. Axis (iii): 0. No primary-path friction.
- **Sources:**
  - `UI-AUDIT.md "Cross-cutting observations" bullet 11` (i18n drift cluster)
  - `WALKTHROUGH.md §Settings — P-12-S05` (settings hardcoded strings)
  - `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" POLISH-01
  - `ui-reviews/settings-UI-REVIEW.md Pillar 1` (3/4 dock; honest source-comment marker)

#### B-12 — `cooking.finalized` 7th broadcast event missing from canonical docstring (doc rot)

- **Tier:** 3
- **Impact axes:** (i:0 / ii:1 / iii:0, total 1)
- **Observed:** The realtime contract docstring at `backend/app/services/realtime.py:9-19` enumerates the 6 documented broadcast event classes (`recipe.created`, `recipe.promoted`, `recipe.updated`, `vote.created`, `cooking_log.created`, `cooking_log.finalized` per the docstring vocabulary). The actual code path emits a 7th class — `cooking.finalized` (note the dotted-namespace drift: `cooking.finalized` rather than the docstring's `cooking_log.finalized`) — at `backend/app/routers/cooking_logs.py:219` when a finalize PUT lands. The Phase 12 §Realtime probes verified all 6 enumerated classes end-to-end (latencies 1.3s–4s under D-17's qualitative threshold), and the Phase 13 audit re-discovered the 7th class via code review. The user-visible behavior is correct (finalize broadcasts arrive; subscribed clients re-render the cooking banner), but the canonical contract documentation is out of sync with the implementation, AND the namespace drift (`cooking.` vs `cooking_log.`) means future invariant-counts based on the docstring undercount. Pure documentation rot — not user-visible, but compounds for downstream auditors.
- **Where:** `backend/app/services/realtime.py:9-19` (canonical docstring listing 6 event classes). `backend/app/routers/cooking_logs.py:219` (emission site of the 7th class `cooking.finalized` not enumerated in the docstring; namespace differs from `cooking_log.finalized` documentation vocabulary).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised; the broadcast IS emitted correctly and the realtime cooking-banner re-renders on schedule. Axis (ii): 1. Architecture invariant #4 (realtime broadcast contract — `services/realtime.broadcast_to_household` for all household-affecting mutations) holds at the code layer; only the docstring enumeration is out of sync. Code-layer doc rot, masked from the user. Axis (iii): 0. No primary-path friction; the broadcast works.
- **Sources:**
  - `WALKTHROUGH.md §Realtime — P-12-RT-6` (sub-finding: 7th event class discovered via code review)
  - `ui-reviews/realtime-UI-REVIEW.md Pillar 6` (2/4 dock; "recurring documentation rot that breaks future audits' invariant-counts")
  - `UI-AUDIT.md "Cross-cutting observations" bullet 9` (architecture-invariant violation cluster — code-layer member)

#### C-2 — No-debounce-on-submit cluster

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** Four surfaces share a non-idempotent submit pattern. On capture-quick, a fast double-tap on `Ajouter` (mimicked via `submitButton.click(); submitButton.click()` in a single synchronous JS task) fires `POST /api/recipes/quick` twice and both calls return `201` with distinct UUIDs — two duplicate `Brouillon` cards land in `/inbox`. On capture-full, the same root cause propagates because `setSubmitting(true)` at `RecipeForm.tsx:178` is not synchronously visible to a fast double-tap before React batches the re-render; the form's `disabled={!v.title.trim() || submitting}` only blocks the second click after the first call resolves the state update. On capture-photo, the `setSubmitting(true)` at `PhotoCaptureTab.tsx:90` carries the same gap. On exports, `Promise.all([fetch(exportUrl), fetch(exportUrl)])` against the household export endpoint returns `200, 200` with 194KB total payload over the wire (97KB × 2). Direct API races bypass the UI-only guard entirely. The `disabled={submitting}` UI guard is the wrong primitive for the failure mode — synchronous-double-tap and direct-API-race both land before the React state update completes. The friction class is "primary tap-path completes but with friction" rather than "primary tap-path is blocked", because the user does get their recipe / their export — they just sometimes get two of them.
- **Where:** `frontend/components/RecipeForm.tsx:178` (capture-full `setSubmitting`). `frontend/components/PhotoCaptureTab.tsx:90` (capture-photo `setSubmitting`). Capture-quick submit handler (no idempotency token; double-201 verified live per P-12-Q03). Exports endpoint `/api/households/{hh}/export.json` (no server-side coalescing; `Promise.all` race produces 2× full payload per P-12-E03).
- **Pattern:** 4 surfaces — capture-quick (P-12-Q03 double-tap creates 2 drafts) / capture-full (cross-link; same root cause propagated via shared form-submit pattern) / capture-photo (Sheet-01-adjacent submit handler) / exports (P-12-E03 rapid double-fetch produces 2× 97KB exports).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised; the visible chrome (Sticky CTA, `disabled={submitting}` styling) is correct. Axis (ii): 0. No documented architecture invariant covers form-submit idempotency. Axis (iii): 1. Primary tap-path completes but with friction — the user gets their recipe / their export, but sometimes gets two; the disambiguation cost (manually deleting the duplicate) is the user-visible friction. Single-fix-multi-surface footprint at the form-submit layer.
- **Sources:**
  - `UI-AUDIT.md "Cross-cutting observations" bullet 10` (no-debounce-on-submit cluster)
  - `WALKTHROUGH.md §Capture-Quick — P-12-Q03`
  - `WALKTHROUGH.md §Capture-Full` (propagated submit-debounce gap; cross-linked to P-12-Q03)
  - `WALKTHROUGH.md §Exports — P-12-E03`
  - `ui-reviews/capture-quick-UI-REVIEW.md Pillar 6`, `ui-reviews/capture-full-UI-REVIEW.md Pillar 6`, `ui-reviews/capture-photo-UI-REVIEW.md Pillar 6`, `ui-reviews/exports-UI-REVIEW.md Pillar 6`

#### C-3 — Validation-error UX cluster (5 surfaces)

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** Five surfaces share a validation-error UX gap where backend 422s and missing-recovery-copy paths surface to the user as either a wrong-domain toast (`Connexion impossible. Réessaie dans un instant.` for what is actually a length-cap rejection or an offline state) or no toast at all. On capture-quick, a 5KB title submission returns `POST /api/recipes/quick → 422 Unprocessable Entity` and the frontend toast says `Connexion impossible. Réessaie dans un instant.` — the user has no signal that the title is the cause. On capture-full, the same toast pattern propagates from the same wrapper. On cooking-log, a 4000-character notes payload triggers a Pydantic `String should have at most 4000 characters` 422 that the `lib/api.ts` wrapper swallows; the user reads the generic save-failed toast. On exports, the Sauvegarde button stays clickable when `navigator.onLine === false` because `disabled={exporting}` only tracks in-flight state, not connectivity — the user only learns they are offline after tapping. On onboarding, the color-collision race produces a `409 Conflict` when two users join the same household and pick the same color in the same race window, with no recovery copy explaining what happened (per N-1 resolution this entry merges the C-3 toast cluster and the C-5 missing-recovery-copy cluster into one ranked entry — the underlying pattern is the same: backend cause-class is not visible to the user, leaving a confused mental model). The mono-cause toast pattern surfaces in three distinct cause classes (validation, network, conflict) but only the connectivity copy is shown.
- **Where:** `frontend/lib/api.ts` wrapper (swallows Pydantic 422 details). `frontend/app/recipes/new/page.tsx` (capture-quick + capture-full toast routing). `frontend/components/CookingLogFinalize.tsx:106` (`save_failed` generic). `frontend/app/settings/page.tsx` and exports CTA (`disabled={exporting}` only tracks in-flight, not connectivity). Onboarding join handler (race-409 missing recovery copy). 
- **Pattern:** 5 surfaces — capture-quick `Connexion impossible` for 422 (P-12-Q02) / capture-full propagated / cooking-log raw Pydantic 4000-char cap (P-12-CL-02) / exports offline-clickable button (P-12-E02) / onboarding race-409 missing recovery copy (P-12-O05). Per N-1 resolution, this entry merges the C-3 toast cluster and the C-5 missing-recovery-copy cluster into one ranked entry; the underlying friction class is the same.
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised. Axis (ii): 0. No documented architecture invariant covers validation-error UX. Axis (iii): 1. Primary tap-path completes — the user submits, gets a toast, retries with a confused mental model ("did I lose my connection?") when the actual cause is a length cap or an offline state. The friction is the disambiguation cost between cause classes that the toast does not surface.
- **Sources:**
  - `WALKTHROUGH.md "Inputs to Phase 14" bullet 5` (validation-error UX uniformly weak)
  - `WALKTHROUGH.md §Capture-Quick — P-12-Q02`
  - `WALKTHROUGH.md §Cooking-Log — P-12-CL-02`
  - `WALKTHROUGH.md §Exports — P-12-E02`
  - `WALKTHROUGH.md §Onboarding — P-12-O05`
  - `ui-reviews/capture-quick-UI-REVIEW.md Pillar 6`, `ui-reviews/cooking-log-UI-REVIEW.md Pillar 6`, `ui-reviews/exports-UI-REVIEW.md Pillar 6`

#### B-8 — TZ-01: `func.date(cooked_at) == DateType.today()` UTC vs local-tz mismatch

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** The cooking-logs active-filter at `backend/app/routers/cooking_logs.py:72-78` and `:118-126` compares `func.date(cooked_at)` (the UTC date of the column) against `DateType.today()` (the server-local date). For users in timezones ahead of UTC near local midnight, the two dates disagree: a cook started at 23:50 local time in CEST (UTC+2) writes `cooked_at` as the next UTC day, so the `cooking_logs.py` filter classifies the cook as "yesterday" while the user reads "today" on their device clock. The user-visible artifact is the `Cette cuisson n'est plus disponible` empty-state copy on the cooking-log finalize page when the user re-opens the surface to add notes after a cross-midnight cook. The Phase 12 reproduction at §Cooking-Log P-12-CL-04 inferred the bug from code inspection because the auditor's CEST cook at UTC 18:10 had aligned dates (the offset case did not surface live in the audit corpus). Per the T-4 resolution this entry stays at axis (iii):1 strictly per rubric; cross-surface footprint (cooking-log + realtime locus 3 visibility + history-implicit) is captured in `Where`/`Sources` rather than via axis bumping.
- **Where:** `backend/app/routers/cooking_logs.py:72-78` and `:118-126` (UTC-vs-local-tz date comparison in the active-filter). Surface footprint: cooking-log (the empty-state surface for cross-midnight cooks); realtime (locus 3 cooking-banner visibility cross-link, since the same active-filter gates banner mount); history (implicit — the same filter shape is the CL-01 endpoint's design pattern). Backlog entry: `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" TZ-01.
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised. Axis (ii): 0. Timezone handling is not enumerated in the 8 documented architecture invariants in CLAUDE.md. Axis (iii): 1. Primary tap-path completes (the cook lands; the cooking-log row exists with `cooked_at` populated), but the user-visible result is friction-class — for users in TZs ahead of UTC near local midnight, the surface re-opens to `Cette cuisson n'est plus disponible` instead of the finalize editor, and the active-cook banner on `/` does not mount on the day-of expectation.
- **Sources:**
  - `WALKTHROUGH.md §Cooking-Log — P-12-CL-04` (code-inspection reproduction; TZ-01 backlog cross-link)
  - `UI-AUDIT.md "Cross-cutting observations" bullet 9` (architecture-invariant violation cluster — partial member)
  - `ui-reviews/realtime-UI-REVIEW.md Pillar 6` (TZ-01 cross-link as locus 3 cooking-banner gate)
  - `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" TZ-01

#### B-9 — URL-01: URL extraction is productize-deferred; drafts never promote

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** The capture-url surface ships a CTA whose contract is "we'll structure this for you" but does not deliver. Submitting a URL via `POST /api/recipes/url` creates a draft titled with the raw URL string and sets `status='draft'`; no Gemini extraction runs because the endpoint at `backend/app/api/recipes.py:481-490` is tagged for productize and ships as a no-op stub. The user must complete the recipe manually after submitting. The surface mitigates the gap with helper copy `arrive bientôt` ("coming soon") in the surface chrome, marking the limitation transparently — `ui-reviews/capture-url-UI-REVIEW.md` characterizes this as "the surface ships a CTA whose contract is 'we'll structure this for you' but doesn't deliver — friction-class because the helper copy DOES surface the limitation, but the moment that copy is dropped the surface becomes a true blocker". The surface's primary intended action does not deliver, but the editorial honesty of the helper copy keeps the entry at friction-class rather than blocker.
- **Where:** `backend/app/api/recipes.py:481-490` (productize-deferred endpoint stub). User-visible render site: `/inbox` cards with the raw URL as title, status `draft`, never transitioning to `structured`. Backlog entry: `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" URL-01. Helper copy mitigation: `arrive bientôt` in the capture-url surface chrome.
- **Why this impacts feels-Al-Dente:** Axis (i): 0. The capture-url surface's helper copy is editorial-honest and sits within the warm Slow Food register; identity is intact. Axis (ii): 0. No documented architecture invariant covers URL extraction. Axis (iii): 1. Primary intended action ("structure a URL") does not deliver, but the helper copy mitigates the friction by surfacing the limitation transparently. The entry would shift to a true blocker if the helper copy were dropped without delivering the extraction; the editorial honesty is what holds the score at 1.
- **Sources:**
  - `WALKTHROUGH.md §Capture-URL — P-12-U01` (productize-deferred stub; raw URL as draft title)
  - `ui-reviews/capture-url-UI-REVIEW.md Pillar 6` (1/4 dock; "the moment that copy is dropped the surface becomes a true blocker")
  - `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" URL-01

#### B-11 — History feature buried + decommissioned (cross-cutting friction)

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** The history surface lives at `/cooking-logs` but has no main-nav link in the bottom navigation (`[/, /recipes, /inbox, /settings]` are the 4 main-nav slots). Discovery of the history surface requires navigating to `/settings → Voir les cuissons récentes` (the navigation row in the Settings Historique Card), a 2-tap path with cognitive overhead — the user must form the mental model that "past cooks live behind Settings" rather than alongside the daily-use loop. Per `WALKTHROUGH.md §History — P-12-H-03` the original Phase 12 framing places history as part of the daily-use loop ("look back at this week's meals together"), so the buried position is friction independent of the route + endpoint absences. Per the N-2 resolution this entry stays distinct from B-5 (missing detail route) and B-10 (missing GET endpoint): combined the surface is observationally decommissioned, but the IA-only finding is the standalone friction independent of the route + endpoint, and an Executive-Summary-level umbrella observation captures the combined decommissioning shape rather than collapsing the three entries into one.
- **Where:** Bottom navigation slot configuration (4 slots: `/, /recipes, /inbox, /settings`) — history not in the main nav. Discovery path: `frontend/app/settings/page.tsx:175-183` (Historique Card navigation row to `/cooking-logs`). Cross-link: B-5 (`/cooking-logs/{id}` detail route absent), B-10 (`GET /api/cooking-logs?days=14` endpoint absent).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised by the IA placement. Axis (ii): 0. No documented architecture invariant covers main-nav configuration. Axis (iii): 1. Primary tap-path (open history, see what we cooked) requires 2 taps + cognitive overhead instead of 1 tap. Combined with B-5 and B-10 the history surface is observationally decommissioned, but the IA-only finding is the standalone friction the cross-link captures here — per N-2 the umbrella observation surfaces in the Executive Summary rather than as a fourth ranked entry.
- **Sources:**
  - `WALKTHROUGH.md §History — P-12-H-03` (buried-nav finding)
  - `ui-reviews/history-UI-REVIEW.md` ("buried 2 taps deep behind a chrome path")
  - Cross-links: B-5 (this document) and B-10 (this document) for the combined decommissioning shape

#### B-14 — capture-full title-only submit creates orphan `structured` recipe with null ingredients

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** On the capture-full surface, the only client-side gate before the `Enregistrer la recette` submit is `disabled={!v.title.trim() || submitting}` at `RecipeForm.tsx:364`. Submitting with a title only — no ingredients, no steps, no metadata — produces a recipe with `status='structured'`, `ingredients=null`, `steps=null` and redirects the user to the recipe-detail page that renders an empty body (only `Dernière fois : Jamais cuisinée · Cuisinée 0 fois` survives). The recipe is now eligible for shortlist scoring with no ingredients to score against; the algorithm at `backend/app/services/algorithm.py` consumes a populated structured-recipe row in the same shape regardless of whether the ingredient list is present. The behavior is asymmetric versus capture-quick (which would put the same payload in `/inbox` as a `Brouillon` draft awaiting completion) — the asymmetry shows the capture-full client trusts the title as a sufficient gate, while capture-quick treats every captured payload as a draft until completion.
- **Where:** `frontend/components/RecipeForm.tsx:364` (only the title gates submit). User-visible render site: `/recipes/{id}` detail page with empty body. Sample row from Phase 12: `e80a248c-1184-498d-a5d5-d0816d971aa0`.
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised. Axis (ii): 0. No documented architecture invariant covers capture-full submission gating; invariant #1 ("five capture surfaces, one shape") covers the capture-full → `structured` transition shape but does not constrain the ingredient/steps presence. Axis (iii): 1. Primary tap-path completes but produces a friction-class artifact — an orphan `structured` recipe in the household library that subsequently affects shortlist scoring inputs silently. Could shift higher if the scoring impact were judged user-visible; the rubric per Phase 13 D-13 anchors axis (iii) on user-visible-friction at the surface anchor (capture-full here), so the score holds at 1.
- **Sources:**
  - `WALKTHROUGH.md §Capture-Full — P-12-F02` (live reproduction; sample recipe id)
  - `ui-reviews/capture-full-UI-REVIEW.md Pillar 6` (2/4 dock; "asymmetric vs Quick")

#### B-15 — Install-PWA banner occludes vote affordances on first load

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** On the shortlist surface during the first session before the user has dismissed the install-PWA prompt, the install banner stacks above the deck and compresses the OUI/NON thumb buttons toward the bottom edge of the iPhone-shape viewport. The Phase 12 audit measured: with the banner visible, the OUI button at `y=743.59 bottom=799.59` on 390×844, leaving 44.41px of breathing room above the viewport bottom — usable but compressed. After dismissing via the banner's `×` button, the deck reflows ~90px upward and sits at a comfortable tap distance. The friction is first-session-only and self-resolves on dismissal; it surfaces during the user's introduction to the swipe-deck interaction (the moment the framer-motion physics is supposed to feel earned) rather than at every visit.
- **Where:** Install-PWA prompt stack on `/` HomeDecide (banner positioning above the shortlist deck on first session). Surface anchor: shortlist (the framer-motion swipe deck per `frontend/components/ShortlistCard.tsx:117-178`).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. The framer-motion swipe deck is the most distinctive interaction in the app per `ui-reviews/shortlist-UI-REVIEW.md`, but the banner stacking does not break the visual register — the deck still renders correctly; it just sits lower on the viewport. Axis (ii): 0. No documented architecture invariant. Axis (iii): 1. Primary tap-path completes but with friction during the first-session introduction to the deck — the OUI/NON tap targets are compressed but reachable. Self-resolves on banner dismiss.
- **Sources:**
  - `WALKTHROUGH.md §Shortlist — P-12-Sh-01` (live measurements; first-session-only)
  - `ui-reviews/shortlist-UI-REVIEW.md Pillar 6` (2/4 dock; one of four stacking frictions)

#### B-16 — Decorative `<img>` traps pointer events on shortlist deck card

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** The decorative recipe photo on the front shortlist card renders as `<img>` with `absolute inset-0 w-full h-full object-cover` at `frontend/components/ShortlistCard.tsx:144-149` and lacks `pointer-events: none`. Real iOS touches resolve correctly because the framer-motion gesture context handles the touch event chain; Playwright `force click` reports the img subtree intercepts the click, and assistive-input methods (switch control, VoiceOver double-tap, automation) trip on the same trapped path because they do not traverse the gesture context the way real touches do. Per the T-5 resolution this entry holds axis (iii):1 because assistive-tech users are real users; the friction is invisible to the audit's iPhone-shape Chromium scope but surfaces in real assistive-input scenarios.
- **Where:** `frontend/components/ShortlistCard.tsx:144-149` (decorative `<img>` without `pointer-events: none`). Compounds with P-12-Sh-03 (handler gated on framer-motion drag context — programmatic click events do not traverse the `motion.button` event chain).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. The decorative photo placement is on-system; the pointer-event trap is a behavioral gap, not a visual one. Axis (ii): 0. No documented architecture invariant. Axis (iii): 1. Primary tap-path completes for real iOS users via gesture-context resolution, but assistive-tech users hit the trapped subtree — the friction surfaces only via assistive-input methods. Per Phase 13 D-03 the rubric measures user-visible friction, and assistive-tech users are users.
- **Sources:**
  - `WALKTHROUGH.md §Shortlist — P-12-Sh-04` (`<img>` trap)
  - `WALKTHROUGH.md §Shortlist — P-12-Sh-03` (handler gated on gesture context; compounds)
  - `ui-reviews/shortlist-UI-REVIEW.md Pillar 6` (2/4 dock; a11y/automation-only friction)

#### B-17 — `/onboarding/welcome` reachable for authenticated user; no redirect guard

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** Three of the four onboarding routes (`/onboarding/welcome`, `/onboarding/create`, `/onboarding/join`) lack a redirect-home guard for authenticated users. A user who lands on these routes via a stale browser tab or a deep link can start the onboarding flow as if they were a new user. If the user completes the flow with a different name, the cookie rotates and the original member-#4 session is overwritten without confirmation — destructive re-onboarding is possible. The fourth onboarding route (`/onboarding/share-code`) does have the redirect guard via a client-side `useEffect` redirect on missing `?code=` parameter (`frontend/app/onboarding/share-code/page.tsx:19-23`), so the inconsistency itself is the structural gap: some onboarding routes self-protect, others do not. The visible step (the user reads the onboarding chrome they have seen before) mitigates the friction class to "completes-with-friction" rather than "blocks-or-corrupts-silently" — but the destructive path exists without a confirmation.
- **Where:** `frontend/app/onboarding/welcome/page.tsx`, `frontend/app/onboarding/create/page.tsx`, `frontend/app/onboarding/join/page.tsx` (no redirect-home guard for authenticated users). Contrast: `frontend/app/onboarding/share-code/page.tsx:19-23` (has `useEffect`-based guard for missing `?code=`).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised. Axis (ii): 0. No documented architecture invariant covers onboarding-route guarding. Axis (iii): 1. Primary tap-path completes but with friction — destructive re-onboarding is reachable without confirmation. The visible step (recognizable onboarding chrome) mitigates the friction class to 1 rather than 2.
- **Sources:**
  - `WALKTHROUGH.md §Onboarding — P-12-O01` (route-guard absence; stale-tab destructive flow)
  - `ui-reviews/onboarding-UI-REVIEW.md Pillar 6` (2/4 dock; "the inconsistency with welcome/create/join is the bigger UX gap")

#### B-18 — Recipe-detail page has no vote affordance

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** The recipe-detail page at `/recipes/{id}` ships four chrome actions — `Modifier par la voix` / `Modifier la recette` / `Supprimer` / `Retour` — and no vote affordance. A user who exhausts the daily shortlist deck and wants to revisit a specific recipe in detail mode to change a vote has no path within the detail surface; they must navigate back to `/` and re-enter the deck, which is locked-out for the day once exhausted (the regenerate path is gated and the Sh-02 friction can fail the retry). Combined with the Sh-02 regenerate friction reconciled in the Phase 12 closing sweep, the user who exhausts the deck is locked into the day's vote state without a recovery handle from the detail surface.
- **Where:** `frontend/app/recipes/[id]/page.tsx` (chrome actions: `Modifier par la voix` / `Modifier la recette` / `Supprimer` / `Retour` only; no vote control). Cross-link to shortlist Sh-02 regenerate friction (the alternate recovery path).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised on the detail surface itself. Axis (ii): 0. No documented architecture invariant covers vote-entry-point placement. Axis (iii): 1. Primary tap-path (re-read a recipe in detail mode, change my vote) does not complete from the detail surface — the user must re-enter the deck, which can be exhausted for the day. Friction-class because the alternate path (regenerate) sometimes works.
- **Sources:**
  - `WALKTHROUGH.md §Vote — P-12-Vt-05` (recipe-detail vote-affordance absence)

#### B-19 — No "Quitter le foyer" path; leaving requires backend intervention

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:1, total 1)
- **Observed:** The settings surface ships no "Quitter le foyer" affordance — no Card, no button, no productize-deferred annotation. The backend has no `DELETE /api/households/me` route to leave a household; once the cookie binds the user to a household, the only paths off are clearing browser data (which on iOS Safari requires multi-step clear-history navigation outside the app) or backend intervention. Couple-scale (the v0.1 product target) rarely exercises this path — the primary use case is "two people sharing a household" and the leaving event is rare — but the absence is undocumented (no productize-deferred surface marker exists), so the user faces the constraint silently when they need it.
- **Where:** Missing UI affordance on `frontend/app/settings/page.tsx`. Missing DELETE route on `backend/app/routers/households.py`. Recovery path: iOS Safari `Settings → Clear History and Website Data` (multi-step, outside the app).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised. Axis (ii): 0. No documented architecture invariant covers household offboarding. Axis (iii): 1. Primary tap-path (leave the household, start fresh) does not complete in-app; requires browser-level intervention. Couple-scale rarely exercises this; the friction surfaces only when the user needs it.
- **Sources:**
  - `WALKTHROUGH.md §Settings — P-12-S03` (no leave-household path)
  - `ui-reviews/settings-UI-REVIEW.md Pillar 6` (2/4 dock; "couple-scale rarely exercises this, but the absence is undocumented")

#### B-20 — Capture tab/button copy drift from documentation

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:0, total 0)
- **Observed:** Across the five capture surfaces, the rendered French strings drift from the documentation in `CLAUDE.md` and the original plan/spec. Tab labels are `Rapide / Complète / Voix / Photo / URL` (the documentation references `Quick`); the submit button on the Quick tab is `Ajouter` (the plan referenced `Créer` / `Valider`); the draft badge is bare `Brouillon` (the spec referenced `Brouillon en attente d'analyse`). The rendered strings ARE on-register and editorially correct — the drift is documentation-vs-implementation rather than implementation-vs-correctness — so the user reads the right warm vocabulary regardless. Pure documentation drift; the audit value is recording the delta so future reads of `CLAUDE.md` can reconcile rather than misalign.
- **Where:** Surface anchor: capture-quick (tab label + submit button + draft badge text). Cluster: all 5 capture surfaces share the documentation drift (per WALKTHROUGH §Capture-Quick P-12-Q01 the finding is described as a documentation alignment probe, not a bug). `CLAUDE.md` Locked vocabularies §"Tab labels" (the documentation source).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. The rendered French strings ARE Slow Food register; documentation drift does not affect the user's read. Axis (ii): 0. No documented architecture invariant covers documentation-vs-implementation alignment. Axis (iii): 0. No primary-path friction; the user reads correct copy and acts on it correctly.
- **Sources:**
  - `WALKTHROUGH.md §Capture-Quick — P-12-Q01` (documentation alignment probe)

#### B-21 — POLISH-02 backlog hygiene + `MEMBER_COLORS` 4→5 swatch audit-time delta

- **Tier:** 3
- **Impact axes:** (i:0 / ii:0 / iii:0, total 0)
- **Observed:** Two backlog-hygiene observations combine in this entry per the T-1 resolution. (a) POLISH-02 backlog item is observationally resolved: the Copy button on the invite code shipped during Phase 9 work and is live at both `/onboarding/share-code` (source review per `ui-reviews/onboarding-UI-REVIEW.md`) and `/settings` Card 2 (`page.tsx:154-162` — `<Button size="icon" variant="ghost" className="h-12 w-12">` with lucide `Copy` icon → `Check` icon swap via `setCopied(true) + setTimeout`). The `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" section still lists POLISH-02 as open; the backlog and the live state disagree. (b) The `MEMBER_COLORS` palette delta: `WALKTHROUGH.md §Onboarding O-04` states the palette has 4 swatches; live `frontend/lib/colors.ts:1-7` (read on 2026-05-10) shows 5 swatches (`rose / amber / emerald / sky / violet`). The capacity ceiling captured in B-6 stands at N=5 in the live code, not N=4 as the WALKTHROUGH text states; `Issue #7` text reconciliation is observationally pending. Pure backlog-hygiene + documentation-vs-live-code delta — zero impact on any axis.
- **Where:** POLISH-02: `frontend/app/settings/page.tsx:154-162` (Copy button shipped) AND `frontend/app/onboarding/share-code/page.tsx` (Copy button shipped). `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" still lists POLISH-02 as open. `MEMBER_COLORS` delta: `frontend/lib/colors.ts:1-7` (5-swatch live state) vs `WALKTHROUGH.md §Onboarding O-04` (4-swatch claim).
- **Why this impacts feels-Al-Dente:** Axis (i): 0. No identity-bearing visual moment is compromised; the Copy button is shipped and on-system, the palette is rendered correctly at N=5. Axis (ii): 0. No documented architecture invariant covers backlog hygiene. Axis (iii): 0. No primary-path friction; the user-visible artifact matches what they want (working Copy button; rendered palette respects the design system).
- **Sources:**
  - `WALKTHROUGH.md §Settings — P-12-S01` (POLISH-02 confirmed shipped)
  - `WALKTHROUGH.md §Onboarding — O-04` (4-swatch claim)
  - `UI-AUDIT.md "Cross-cutting observations" bullet 12` (4→5 swatch reconciliation, audit-time delta)
  - `frontend/lib/colors.ts:1-7` (live-code 5-swatch state; `rose / amber / emerald / sky / violet`)
  - `PROJECT.md` "Surfaced for follow-up (v0.2.2 backlog)" POLISH-02 still listed

## Inputs to next /gsd-new-milestone cycle

<!-- Composed in Plan 2 Task 3. Contains: (a) Source artifacts; (b) Open framing questions (3-5 inquiries); (c) Explicit non-prescriptions. -->
