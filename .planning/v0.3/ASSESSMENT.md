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

<!-- 17 entries, drafted in Task 3. -->

## Inputs to next /gsd-new-milestone cycle

<!-- Composed in Plan 2 Task 3. Contains: (a) Source artifacts; (b) Open framing questions (3-5 inquiries); (c) Explicit non-prescriptions. -->
