# v0.3 Phase 13 — UI Audit (Milestone Aggregator)

**Audited:** 2026-05-09 → 2026-05-10 (3 plan sessions: 13-01 / 13-02 / 13-03)
**Auditor:** Claude (Phase 13 manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Sibling artifacts:** [WALKTHROUGH.md](./WALKTHROUGH.md) (Phase 12), [RUNBOOK.md](./RUNBOOK.md) (Phase 11)
**Per-surface UI-REVIEWs:** [.planning/v0.3/ui-reviews/](./ui-reviews/) (14 files)

## How to read this document

This aggregator combines 14 per-surface UI-REVIEW files produced in Plans 13-01 / 13-02 / 13-03 into a single readable summary. Each surface was scored against the 6-pillar `/gsd-ui-review` rubric (Copywriting / Visuals / Color / Typography / Spacing / Experience Design — each 0-4) and assigned an originality verdict from a fixed enum: `Feels Al Dente ✅` / `Mixed ⚠` / `Feels Generic ❌`.

Phase 14 (Synthesis & Handoff) consumes this document alongside `WALKTHROUGH.md` to produce the final `ASSESSMENT.md`. **This document is descriptive — it lists patterns, not remediation actions.** Cross-cutting observations describe what was observed; Phase 14 ranks; the next milestone acts.

## Aggregator Table (one row per surface — AUDIT-04)

| Surface | Verdict | 6-pillar score (/24) | Pillar lows (/4) | Top finding |
|---------|---------|----------------------|------------------|-------------|
| [capture-quick](./ui-reviews/capture-quick-UI-REVIEW.md) | Mixed ⚠ | 21/24 | Experience Design 2/4 | P-12-Q02 validation→connectivity copy + P-12-Q03 no submit debounce |
| [capture-full](./ui-reviews/capture-full-UI-REVIEW.md) | Mixed ⚠ | 19/24 | Experience Design 2/4; Copywriting 3/4 | P-12-F01 [Issue #2] ingredient parser corrupts `<int> <noun>` lines |
| [capture-voice](./ui-reviews/capture-voice-UI-REVIEW.md) | Feels Al Dente ✅ | 22/24 | Experience Design 2/4 | P-12-V01 [Issue #3] garbage transcripts permanently stuck at `(extraction en cours…)` |
| [capture-photo](./ui-reviews/capture-photo-UI-REVIEW.md) | Mixed ⚠ | 20/24 | Experience Design 1/4; Visuals 3/4 | Sheet-01 [Issue #1] Photothèque button 35px-clipped past viewport |
| [capture-url](./ui-reviews/capture-url-UI-REVIEW.md) | Mixed ⚠ | 21/24 | Experience Design 1/4 | P-12-U01 URL-01 backlog — surface gated on `# TODO(productize)` extraction |
| [shortlist](./ui-reviews/shortlist-UI-REVIEW.md) | Feels Al Dente ✅ | 21/24 | Experience Design 2/4; Color 3/4 | 4 stacking frictions Sh-01..Sh-04; emerald-Tailwind-literal on OUI button |
| [vote](./ui-reviews/vote-UI-REVIEW.md) | Mixed ⚠ | 20/24 | Experience Design 1/4; Color 3/4 | P-12-Vt-01 [Issue #4] MEMBER_COUNT=2 hardcoded — invariant #2 broken |
| [cooking-log](./ui-reviews/cooking-log-UI-REVIEW.md) | Mixed ⚠ | 20/24 | Experience Design 1/4; Color 3/4 | P-12-CL-01 [Issue #5] re-finalize doubles cook_count — invariant #3 violated |
| [history](./ui-reviews/history-UI-REVIEW.md) | Mixed ⚠ | 18/24 | Experience Design 1/4; Visuals 2/4; Copywriting 3/4 | P-12-H-01 [CL-01] GET endpoint missing + P-12-H-02 [Issue #6] detail route absent |
| [exports](./ui-reviews/exports-UI-REVIEW.md) | Mixed ⚠ | 19/24 | Experience Design 1/4; Visuals 3/4; Color 3/4 | P-12-E02 offline button + P-12-E03 double-fetch race + iOS-tab annotation |
| [push](./ui-reviews/push-UI-REVIEW.md) | Mixed ⚠ | 19/24 | Experience Design 0/4; Visuals 3/4 | P-12-Pu-02 no Settings recovery + Pu-04 no admin-test fire + Pu-05 round-trip deferred |
| [realtime](./ui-reviews/realtime-UI-REVIEW.md) | Feels Al Dente ✅ | 21/24 | Experience Design 2/4; Color 3/4 | TZ-01 timezone bug + `cooking.finalized` 7th broadcast event undocumented |
| [onboarding](./ui-reviews/onboarding-UI-REVIEW.md) | Feels Al Dente ✅ | 21/24 | Experience Design 2/4; Color 3/4 | P-12-O01 missing route guard + P-12-O04 [Issue #7] capacity ceiling |
| [settings](./ui-reviews/settings-UI-REVIEW.md) | Feels Al Dente ✅ | 21/24 | Experience Design 2/4; Copywriting 3/4 | P-12-S02 [Issue #8] PATCH 405 — member name unchangeable post-onboarding |

**Average score:** **20.21/24** across 14 surfaces (calibration anchor: v0.2 Phases 5-9 averaged 22.4/24 per CONTEXT D-15)
**Verdict distribution:** **5 Feels Al Dente ✅** / **9 Mixed ⚠** / **0 Feels Generic ❌**
**D-16 Partially reached:** 2 surfaces — push (OS notification UI not auditable as frontend surface; round-trip operator-deferred) and history (page renders empty for valid data per CL-01 missing GET endpoint).

## Per-surface abstracts

### capture-quick
**Verdict:** Mixed ⚠ — Score: 21/24
The thinnest capture surface — a sticky-CTA single-input form with an optional photo Card. Token compliance and typography are clean; the verdict driver is Pillar 6, where two real user-impact bugs stack: the 422 validation error is re-toasted as a network-loss `Connexion impossible` (P-12-Q02), and the submit affordance has no debounce / idempotency token so a fast double-tap sends two requests (P-12-Q03 — recurring no-debounce-on-submit pattern across capture surfaces).
**Full review:** [./ui-reviews/capture-quick-UI-REVIEW.md](./ui-reviews/capture-quick-UI-REVIEW.md)

### capture-full
**Verdict:** Mixed ⚠ — Score: 19/24
The fullest capture form — title + ingredients + steps + Mood / Saisons toggle chips. Visuals + spacing are confident (toggle-chip rendering is a tactile touch-first detail). The verdict driver is the ingredient parser blocker [Issue #2] — `4 tomates` round-trips as `4 tomates 4 tomates` because the regex at `RecipeForm.tsx:98-100` misclassifies the noun as the unit; `1 oignon rouge` becomes `name="rouge", quantity=1, unit="oignon"`. Compound docks: title-only submits create orphan `structured` recipes (P-12-F02), submit-debounce gap propagates from Quick (P-12-Q03), `?tab=full&prefilled=…` deep-link is ignored (P-12-F04).
**Full review:** [./ui-reviews/capture-full-UI-REVIEW.md](./ui-reviews/capture-full-UI-REVIEW.md)

### capture-voice
**Verdict:** Feels Al Dente ✅ — Score: 22/24
The highest-scoring surface in the milestone (above 21/24 anchor). Single-page voice transcript editor with a margin-note Card (`primary/60` left border, italic display copy `On la met en forme automatiquement.`) — the "annotated cookbook" reading lands. Two-button row keeps focal hierarchy on the primary `Envoyer` CTA. Pillar 6 -2 docked hard for [Issue #3]: garbage transcripts leave drafts permanently `(extraction en cours…)` with no recovery path other than delete-and-retry — same Gemini-failed-silently pattern that recurs on Photo (P-12-Ph02).
**Full review:** [./ui-reviews/capture-voice-UI-REVIEW.md](./ui-reviews/capture-voice-UI-REVIEW.md)

### capture-photo
**Verdict:** Mixed ⚠ — Score: 20/24
Photo grid affordance is genuinely earned (the 4-tile grid with dashed `border-primary/30` add-tile and `before:-inset-2.5` hit-target expansion on the X button is real Slow Food work). Two simultaneous Pillar 6 blockers: (a) **Sheet-01 [Issue #1]** — the photo-source bottom sheet ends 95px past the 844px viewport, Photothèque button clipped 35px; primary tap path requires Safari URL-bar auto-hide. (b) cross-surface [Issue #3] non-recipe photo upload leaves draft permanently `(extraction en cours…)`. Visuals -1 for the sheet positioning bug visually compromising an otherwise-clean grid.
**Full review:** [./ui-reviews/capture-photo-UI-REVIEW.md](./ui-reviews/capture-photo-UI-REVIEW.md)

### capture-url
**Verdict:** Mixed ⚠ — Score: 21/24
A surface that scores well visually because the implementation is honest about its limitation. Helper copy `font-mono text-sm` URL-paste field, `bg-muted/60` info panel with leading `Info` icon — production-grade visual chrome. Pillar 6 -3 because the surface's primary intended action is gated by URL-01: `backend/app/routers/recipes.py:481-490` is `# TODO(productize)`, so submitting a URL creates a draft titled with the raw URL, no Gemini extraction happens, the user must complete manually. The surface ships a CTA whose contract is "we'll structure this for you" but doesn't deliver — friction-class because the helper copy DOES surface the limitation, but the moment that copy is dropped the surface becomes a true blocker.
**Full review:** [./ui-reviews/capture-url-UI-REVIEW.md](./ui-reviews/capture-url-UI-REVIEW.md)

### shortlist
**Verdict:** Feels Al Dente ✅ — Score: 21/24
The framer-motion swipe deck with rotation + opacity-revealed `OUI`/`NON` overlays is the most distinctive interaction in the entire app — drag-to-vote OR tap-to-vote both first-class per 03-UI-SPEC. Front card vs peek card differentiation (`scale-[0.94] translate-y-3 opacity-60`) creates a real card-stack-on-the-counter reading. Pillar 3 -1 for the `text-emerald-500` Tailwind palette literal on the OUI thumb button (cross-cutting recurrence — see below). Pillar 6 -2 for 4 stacking frictions: install-banner occludes deck on first load (Sh-01), regenerate 422 missing-body friction (Sh-02 reconciled), framer-motion gesture-gated handler (Sh-03 a11y), decorative `<img>` traps pointer events (Sh-04).
**Full review:** [./ui-reviews/shortlist-UI-REVIEW.md](./ui-reviews/shortlist-UI-REVIEW.md)

### vote
**Verdict:** Mixed ⚠ — Score: 20/24
The 5-state chip pill (`Validé / Pressenti / Contesté / Rejeté / Sans avis`) is one of the most visually-distinctive Slow Food artifacts in the app — different `bg`/`border`/`foreground` per state, partner-vote dot footer with `bg-card/70 backdrop-blur-sm` frosted overlay. Pillar 6 -3 docked HARD by [Issue #4]: in non-2-member households (the synthetic env has 4), the chip rendering is *semantically wrong* because `compute_vote_state` defaults `member_count=2` at the wire layer (verified live via WebSocket frame inspection — RT-4). Architecture invariant #2 is broken at the wire AND at the UI. Pillar 3 -1 for the same emerald-literal pattern as shortlist on the validé chip border.
**Full review:** [./ui-reviews/vote-UI-REVIEW.md](./ui-reviews/vote-UI-REVIEW.md)

### cooking-log
**Verdict:** Mixed ⚠ — Score: 20/24
CookingBanner with terracotta wash + paper-grain reads as "the kitchen-paper ticket on top of your inbox"; finalize page sections separated by `gap-8` give breathing room; skeleton loaders match content-shape. Pillar 6 -3 docked HARD by [Issue #5]: re-finalize bumps `cook_count` (architecture invariant #3 — denormalized fields update in same transaction — is violated; data corruption). Plus 4000-char raw 422 surfaces as generic toast (CL-02), TZ-01 cross-link (CL-04 — the same backend filter that compromises history + realtime locus 3), offline listener no-op (CL-05). Pillar 3 -1 for the `text-emerald-700` ChefHat icon — third recurrence of the emerald-Tailwind-literal pattern.
**Full review:** [./ui-reviews/cooking-log-UI-REVIEW.md](./ui-reviews/cooking-log-UI-REVIEW.md)

### history
**Verdict:** Mixed ⚠ — Score: 18/24 (lowest in milestone — flagged per D-15 calibration)
The most decommissioned surface in the audit — page renders empty for valid data because `GET /api/cooking-logs?days=14` returns 404 (CL-01 backlog), and the per-log detail route `/cooking-logs/{id}` renders the in-app `404 / This page could not be found` because no `[id]/page.tsx` exists (P-12-H-02 [Issue #6]). What renders uses semantic tokens correctly (`text-foreground-muted` empty-state body) — Color 4/4 is clean — but the audit unit is the *surface*, and the surface ships an empty state for valid data plus a write-without-read path for the 5KB notes feature. D-16 Partially reached.
**Full review:** [./ui-reviews/history-UI-REVIEW.md](./ui-reviews/history-UI-REVIEW.md)

### exports
**Verdict:** Mixed ⚠ — Score: 19/24
Bottom Sauvegarde Card on `/settings`. Copy is the strongest dimension — `Télécharge toutes tes recettes au format JSON. Utile en cas de pépin.` does real editorial work (`pépin` = "snag", colloquial French). Three Pillar 6 frictions stack: P-12-E02 button stays clickable when `navigator.onLine === false` (the `disabled={exporting}` guard tracks in-flight only, not connectivity); P-12-E03 rapid double-call triggers two full 97KB exports (no debounce, no idempotency); the iOS-Safari PWA "may open in new tab" annotation ships as a code comment (`page.tsx:92-94`) instead of a user hint. Visuals + Color -1 each for the off-the-shelf lucide `Download` icon + mono-token surface treatment — the chrome rescues from pure boilerplate but the surface itself is icon + button + body shape.
**Full review:** [./ui-reviews/exports-UI-REVIEW.md](./ui-reviews/exports-UI-REVIEW.md)

### push
**Verdict:** Mixed ⚠ — Score: 19/24
The PushPermissionBanner ships a genuinely warm Slow Food micro-surface — `bg-surface-rose-100` rose tint, lucide `Bell` in `text-primary` terracotta, French heading `Active les notifications`, body that names the moment (`Pour savoir quand ton shortlist du jour est prêt.`), stacked CTA pair. Pillar 3 4/4 — uniquely avoids the emerald-Tailwind-literal recurrence. Pillar 6 = **0/4** — three structural frictions stack: P-12-Pu-02 no Settings recovery path (banner is one-shot affordance, dismiss-once = lost-rest-of-session, no in-Settings re-entry), P-12-Pu-04 no admin-test fire endpoint (no observability for users or auditors), P-12-Pu-05 round-trip deferred to v0.3-ship operator sign-off. The visible artifact is correct; the system *around it* is structurally broken under any failure path. **D-16 Partially reached** (OS notification UI not a frontend surface; iOS-PWA-only gate cannot be exercised in headless Chromium).
**Full review:** [./ui-reviews/push-UI-REVIEW.md](./ui-reviews/push-UI-REVIEW.md)

### realtime
**Verdict:** Feels Al Dente ✅ — Score: 21/24
The cross-cutting surface — invisible WebSocket connection whose visual consequences are: (1) inbox badge in `BottomNav` with `bg-primary/15 text-primary border-primary/40` Pressenti-pill color recipe (deliberate reuse of vote-chip vocabulary), (2) drafts list at `/inbox` updating with proper React reconciliation, (3) cooking banner mount/dismount on `/`. All 6 documented broadcast event classes verified end-to-end live (latencies 1.3s-4s, all under D-17's ~3s threshold modulo Gemini-bound `recipe.promoted` 4s). Pillar 3 -1 for the `text-emerald-700` ChefHat (4th recurrence of the emerald-literal pattern). Pillar 6 -2 for TZ-01 timezone bug compromising locus 3 visibility + `cooking.finalized` 7th broadcast event class missing from `services/realtime.py:9-19` canonical docstring (documentation rot).
**Full review:** [./ui-reviews/realtime-UI-REVIEW.md](./ui-reviews/realtime-UI-REVIEW.md)

### onboarding
**Verdict:** Feels Al Dente ✅ — Score: 21/24
The entry point — and the 4 screens (welcome / create / join / share-code) carry the strongest identity signature in the app: `Al Dente` wordmark in Fraunces italic display on welcome + the share-code invite-code in `font-display italic text-3xl tracking-widest text-primary` (the same display register, deliberately treating the code as identity artifact). Color picker uses `<Lock>` icon overlay on taken swatches (real "system says no" affordance). Pillar 3 -1 for `MEMBER_COLORS` palette in `frontend/lib/colors.ts` shipping as raw Tailwind hex literals (same recurring token-completeness pattern as the emerald-literal cluster). Pillar 6 -2 for P-12-O01 missing route guard on welcome/create/join (only share-code self-protects) + P-12-O04 [Issue #7] 5-member capacity ceiling with silent failure (audit-time delta — WALKTHROUGH stated 4 swatches; live code shows 5).
**Full review:** [./ui-reviews/onboarding-UI-REVIEW.md](./ui-reviews/onboarding-UI-REVIEW.md)

### settings
**Verdict:** Feels Al Dente ✅ — Score: 21/24
Surprising ✅ on a typically utility-shaped surface. The 4-Card stack (Membre / Foyer / Historique / Sauvegarde) refuses the boilerplate Settings-list pattern (no toggle row, no version-number filler). The Foyer Card carries the **single most identity-bearing class string in v0.2** — `font-display italic text-3xl tracking-widest text-primary` invite-code rendering, byte-for-byte mirror of share-code per Phase 9 D-08. Field-label-as-section-title pattern refuses to invent H2 chrome. Pillar 1 -1 for hardcoded `Historique` + `Voir les cuissons récentes` strings on the Historique Card (POLISH-01 cluster — TODO marked in source). Pillar 6 -2 for P-12-S02 [Issue #8] PATCH 405 (member name unchangeable post-onboarding — silent privilege loss; architecture-invariant gap) + P-12-S03 no Quitter le foyer affordance.
**Full review:** [./ui-reviews/settings-UI-REVIEW.md](./ui-reviews/settings-UI-REVIEW.md)

## Cross-cutting observations

The patterns surfacing across multiple surfaces — load-bearing input to Phase 14 ranking.

- **Token-completeness gap: 5 surfaces share a Tailwind-palette-literal pattern where custom CSS variables would close the system.** The recurrence is consistent — emerald (h≈145) is documented as Slow Food in `globals.css` but the implementation reaches for `text-emerald-500` / `text-emerald-700` / `border-emerald-500/50` instead of `--color-valide-foreground` / `--color-cooking-foreground`. Surfaces affected: shortlist OUI thumb button (Pillar 3 -1), vote validé chip border (Pillar 3 -1), cooking-log ChefHat icon (Pillar 3 -1), realtime cooking-banner ChefHat (Pillar 3 -1). The same pattern recurs at `frontend/lib/colors.ts` where `MEMBER_COLORS` ships as raw hex literals (`#F43F5E` / `#F59E0B` / `#10B981` / `#0EA5E9` / `#8B5CF6`) instead of `--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground}` semantic tokens (Pillar 3 -1 on onboarding). **Single coordinated fix scope spanning 5+ JSX call sites.**
- **Where the design system shines: typography is uniformly strong.** 13 of 14 surfaces score 4/4 on Pillar 4 (only history's empty-state defaults dock by association, not by failure). The Slow Food scale (text-base / text-sm / text-xs + Fraunces italic display moments + IBM Plex Sans default body) is honored consistently. Display moments are used sparingly and load-bearing (wordmark, share-code/Settings invite code, voice helper italic, shortlist `text-title`, cooking-log `text-title`, capture-photo `text-xl font-semibold` heading).
- **Where the design system shines: spacing discipline is uniformly strong.** All 14 surfaces score 4/4 on Pillar 5. Tailwind scale only across the milestone. `h-12` tap floor (D-08) honored across primary CTAs. The `gap-{2,3,4,6,8,12}` rhythm is consistent. One arbitrary value (`scale-[0.94]` peek card in shortlist) is annotated as load-bearing per UI-SPEC.
- **Where the design system shines: copy editorial register is consistent.** 11 of 14 surfaces score 4/4 on Pillar 1. Second-person familiar (`tu` / `te` / `ton` / `ta`) is unbroken; warm specifics (`pépin`, `J'ai prévenu ma partenaire`, `On la met en forme automatiquement.`, `6 caractères donnés par ta partenaire`) refuse generic SaaS register. Full next-intl on chrome; recipe titles flow through as user content (correctly outside i18n). Three -1 docks: capture-quick (validation→connectivity copy mismatch), capture-full (functional vs delightful field labels), settings (hardcoded `Historique` strings — POLISH-01 cluster).
- **Where the design system breaks down: Pillar 6 is the audit's load-bearing dimension.** **0 of 14 surfaces score 4/4 on Experience Design.** The score distribution is 0/4 (push), 1/4 (capture-photo, capture-url, vote, cooking-log, history, exports), 2/4 (capture-quick, capture-full, capture-voice, shortlist, realtime, onboarding, settings). This is where WALKTHROUGH-surfaced findings (architecture-invariant violations, missing routes, no-debounce-on-submit cluster, race conditions, structural recovery-path gaps) consistently dock — and where the v0.4 milestone's load-bearing remediation work would land if v0.4 ranks toward correctness.
- **Where shadcn defaults survived re-themeing.** Two patterns recur: (a) lucide icons themed via `text-primary` / `text-foreground-muted` color tokens but not customized for the Al Dente vocabulary — `Download` on exports, `Bell` on push, `ChefHat` on cooking-log + realtime banner all carry their off-the-shelf glyphs (Pillar 2 -1 for exports + push specifically; rescued by chrome on cooking-log + realtime). (b) Sonner toast as the sole failure surface in async actions — same `toast.error` for network-loss, auth, and 5xx alike on exports + capture-quick + onboarding flows; per-cause copy would close the system but ships as one mono-cause toast.
- **Verdict-driving pattern: ✅ verdicts correlate with editorial discipline + system cohesion, NOT absence of bugs.** All 5 surfaces earning Feels Al Dente ✅ (capture-voice, shortlist, realtime, onboarding, settings) ALSO have Pillar 6 ≤ 2/4 — the verdict criteria explicitly distinguish "the rendered pixels respect the design system" (token compliance + visual moments + cohesive composition) from "user-impact-over-time has no friction". Per CONTEXT D-01, ❌ requires *token compliance fails*; the audit found 0 surfaces where token compliance fully fails, so 0 ❌ verdicts. The 9 ⚠ surfaces all have at least one structural blocker compromising user-impact while keeping rendering clean.
- **Verdict-driving pattern: identity signatures earn ✅ disproportionately.** The two surfaces that carry a Fraunces-italic-display identity moment (onboarding wordmark + share-code/Settings invite code) both earned ✅. The voice surface's italic margin-note Card with `primary/60` left border earned ✅. Shortlist's framer-motion swipe deck earned ✅. The pattern is consistent — surfaces with at least one *signature interaction or signature display moment* earn the verdict; utility-shaped surfaces (exports, push, capture-quick) score well on chrome but trip on Pillar 6 frictions and land in ⚠.
- **Architecture-invariant violations surface user-visibly at 5 surfaces.** Vote chip semantics broken (#2 — Plan 13-02 [#4] MEMBER_COUNT=2 hardcoded), cooking-log re-finalize doubles cook_count (#3 — Plan 13-02 [#5]), history surface decommissioned (Plan 13-02 CL-01 + [#6]), settings member-name unchangeable (#8 implication of "members own their identity"), realtime `cooking.finalized` 7th broadcast event missing from canonical docs (#4 spine documentation rot). The audit value of v0.3 is consistently surfacing correctness issues that the original implementation guarded conceptually but did not enforce at the spine.
- **No-debounce-on-submit cluster spans 4 surfaces.** capture-quick (P-12-Q03), capture-full (propagated from Quick), capture-photo (Sheet-01-adjacent submit handler), exports (P-12-E03 rapid double-fetch). Pattern: `setSubmitting(true)` is not synchronously visible to a fast double-tap before React batches the re-render; the `disabled={submitting}` UI guard only blocks the second click after the first call resolves the state update. Direct API races bypass the UI guard entirely. Single coordinated fix would land an idempotency-token primitive at the form-submit layer.
- **next-intl invariant #6 violation cluster.** POLISH-01 backlog item: hardcoded French strings in HomeDecide partner-waiting (per PROJECT.md backlog) + settings Historique Card (`page.tsx:176-179`). Single coordinated v0.2.1 i18n sweep scope. The TODOs are marked honestly in source but the user-visible drift remains until the sweep lands.
- **POLISH-02 RESOLVED at 2 live surfaces.** Audit confirmed Copy button on invite code shipped at both `/onboarding/share-code` (source review) and `/settings` Card 2 (live snapshot — `button "Copier le code d'invitation" [ref=e44]`). The v0.2.2 backlog item appears closed-but-not-struck-off. Backlog hygiene reconciliation finding.
- **Audit-time delta from WALKTHROUGH §O-04.** WALKTHROUGH stated `MEMBER_COLORS` palette has 4 swatches; live `frontend/lib/colors.ts` (read 2026-05-10) shows 5 swatches: rose / amber / emerald / sky / violet. Either the WALKTHROUGH miscounted or the palette was extended between 2026-05-09 (Phase 12) and 2026-05-10 (Phase 13). The capacity blocker [Issue #7] stands but at N=5 instead of N=4. Issue text reconciliation needed.
- **D-16 partial-reach surfaces.** **2 surfaces** marked Partially reached. (a) **push** — OS-rendered notification UI + iOS-PWA-only gate (cannot be exercised in headless Chromium) + end-to-end delivery round-trip (operator-deferred to v0.3-ship sign-off per P-12-Pu-05). (b) **history** — page renders empty for valid data because the GET endpoint is missing (CL-01); per-log detail route renders 404 because no `[id]/page.tsx` exists (#6). Both surfaces score the visible chrome that IS reachable; the rubric handles "external system isn't a frontend surface" cleanly without docking innocently.

## Calibration notes (CONTEXT D-15 sanity check)

- **v0.2 calibration anchor:** Phases 5-9 averaged 22.4/24 across whole-phases (best 23/24). Phase 13 scores per-surface (finer-grained); individual surfaces may legitimately fall below or above this band.
- **Phase 13 cumulative mean (14 surfaces):** **20.21/24** — below the v0.2 anchor by ~2 points. The gap is concentrated in Pillar 6 (Experience Design) where 0 surfaces hit 4/4; if Pillar 6 averaged 4/4 across the 14 surfaces (i.e. no WALKTHROUGH-surfaced friction docking), the milestone average would land at ~22/24 — within the v0.2 band. The audit value of v0.3 is exactly this gap: surfacing the Pillar 6 deficit that whole-phase v0.2 scoring did not isolate.
- **Score outliers below 18/24 threshold:** **1 surface** — history (18/24). Flagged per D-15 — driven by the structural decommissioning (CL-01 GET endpoint missing + #6 detail route absent) rather than visual failure. The Color + Typography + Spacing scores are clean (4/4 each); the surface is rendering-correct but functionally broken.
- **Score outliers above 22/24:** **1 surface** — capture-voice (22/24). Defensible — the WALKTHROUGH §Capture-Voice findings are 1 blocker ([#3] stuck-extraction) and 1 friction, but the visible artifact (italic margin-note Card + transcript editor + warm copy `On la met en forme automatiquement.`) is genuinely earned across all 5 visible-quality pillars. No score docking on Visuals / Color / Typography / Spacing / Copywriting; the single Pillar 6 -2 dock reflects the [#3] blocker proportionally.
- **Calibration stability across 3 plans:** Plan 13-01 mean 20.6 (5 surfaces), Plan 13-02 mean 19.75 (4 surfaces), Plan 13-03 mean 20.2 (5 surfaces). Each plan landed within 0.5 points of the cumulative mean — strong calibration; the rubric is not drifting under different surface families. D-13 docking discipline produced consistent "1-2 pillar dock per WALKTHROUGH-blocker, 1 pillar dock per friction" across all 14 surfaces.
- **Verdict-tag distribution:** 5✅ / 9⚠ / 0❌. The absence of any ❌ confirms that token compliance never fully fails at v0.3 — the design system is robust at the rendering layer. The 9 ⚠ surfaces all have at least one structural backend issue compromising user-impact while keeping rendering clean.

## Inputs to Phase 14 (Synthesis & Handoff)

This document plus [WALKTHROUGH.md](./WALKTHROUGH.md) are the two load-bearing inputs to Phase 14's `ASSESSMENT.md`.

- **WALKTHROUGH.md** provides: probe-level findings (75 probes across 14 surfaces with severity tags + cross-links + GitHub issue references where filed), audit-process notes, and the original Phase 12 design contract for what "tested" means at the visual+behavioral level.
- **UI-AUDIT.md** (this document) provides: the visual-quality dimension and originality verdict per surface (one-row aggregator + per-surface abstracts), the cross-cutting pattern observations across the 14 surfaces (token-completeness clusters, design-system strong/weak axes, verdict-driving patterns, architecture-invariant violation cluster), and the calibration-anchor framing so Phase 14 can rank without re-deriving the rubric baseline.

Phase 14 ranks findings by impact on the "feels Al Dente" question; v0.3 audit milestone produces ASSESSMENT.md as the ranked output that v0.4 will act on. Per CONTEXT and PHASE 14 separation: this document does not propose remediation actions. Phase 14 ranks; v0.4 acts.
