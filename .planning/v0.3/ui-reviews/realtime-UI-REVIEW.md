# UI Review — Realtime Sync

**Audited:** 2026-05-10
**Auditor:** Claude (Phase 13, manual scoring per CONTEXT.md D-06)
**Synthetic env:** [SYNTHETIC] Démo Al Dente @ https://al-dente-pink.vercel.app
**Viewport:** iPhone-shape Chromium 390×844 (isMobile, hasTouch)
**Reach status:** Reached (cross-cutting). Realtime is not a single screen; it's the visual surface that re-renders when household-scoped events arrive over the WebSocket. Per CONTEXT D-15 specifics, this review audits **3 visual loci**: (1) inbox badge in `BottomNav`, (2) drafts list at `/inbox`, (3) cooking banner on `/` HomeDecide. Loci 1 + 2 captured live this audit day. Locus 3 captured live in Plan 13-02 (`shortlist-canonical.png`) when an active cook was in flight; on Plan 13-03 audit day no active cook was open in the synthetic household so locus 3 is documented via prior screenshot + `frontend/components/CookingBanner.tsx` source review. Per WALKTHROUGH §Realtime Sync, all 6 broadcast event classes verified end-to-end (latencies 1.3s–4s, all under D-17's ~3s qualitative threshold modulo the Gemini-bound `recipe.promoted` 4s).

## Originality Verdict

**Verdict:** Feels Al Dente ✅

Realtime is the third surface in this milestone to earn the ✅ verdict (after capture-voice and shortlist) — and uniquely so, because the surface itself is *invisible* (a WebSocket connection) and what users see is its *consequences*: a badge incrementing, a draft card appearing, a cooking banner sliding into the home stack. Each consequence is rendered in a system-cohesive Slow Food expression rather than a generic "new notification" toast or a forced page-refresh. The inbox badge is a `bg-primary/15 text-primary border-primary/40` Pressenti-style pill (`BottomNav.tsx:117-127`) — the SAME color recipe as the vote chip vocabulary, deliberately reusing the chip register so the badge reads as "household status moved" rather than "you have unread items". The drafts list at `/inbox` updates with `RecipeDraftCard` items in the system-cohesive paper-grain card chrome — additions arrive as proper React reconciliation re-renders, not a loading spinner + manual refresh. The cooking banner pulls in via `CookingBanner` with `bg-primary/8 paper-grain shadow-card` chrome and a green-emerald ChefHat icon at the leading edge (the one Pillar 3 dock target on this surface — see below). The architecture invariant #4 spine (`services/realtime.broadcast_to_household`) was verified live per 7 WALKTHROUGH probes (latencies 1.3s–4s); all 6 documented event classes work end-to-end, plus a 7th `cooking.finalized` discovered in code review. Where the verdict could have slipped: the ChefHat emerald-Tailwind-literal recurrence (4th surface where palette literal appears instead of a custom `--color-cooking-foreground` token) IS docked on Pillar 3 but not enough to displace the verdict — the structural realtime UX (event arriving + system re-rendering) is too cohesive to dock to ⚠ on a token-completeness paper cut.

| Boilerplate elements | Earned elements |
|----------------------|-----------------|
| `text-emerald-700 dark:text-emerald-300` Tailwind palette literal on the cooking-banner ChefHat icon (`CookingBanner.tsx:25-28`) — recurring pattern across shortlist OUI / vote validé / cooking-log icon / now realtime-cooking-banner; single token-completeness fix scope identified across 4 surfaces | `bg-primary/15 text-primary border-primary/40` inbox badge (`BottomNav.tsx:122-126`) — REUSES the vote-chip Pressenti pill color recipe, marking the badge as "household state shifted" rather than the generic "you have unread"; the chip-vocabulary reuse is the load-bearing system cohesion |
| Numeric badge content (just an integer count) — refuses any state-aware copy (no "9 nouveaux", no time-since-last); the surface trades expressiveness for nav-bar density | Three distinct visual loci (badge increment, draft card append, cooking banner mount/dismount) cohere into a single household-mood broadcast — no toasts, no "1 new notification" generic patterns, no page-refresh prompts |
| `cooking.started` vs documented `cooking_log.created` vocabulary drift (CONTEXT D-16 says `cooking_log.created` / `cooking_log.finalized`; `services/realtime.py:9-19` docstring + actual emit say `cooking.started`; `cooking.finalized` exists in code at `cooking_logs.py:219` but is NOT in the canonical-6 list) — not user-visible, but documentation rot | `aria-labelledby="cooking-banner-title"` on `role="region"` (`CookingBanner.tsx:21-23`) — proper SR semantics; refuses the boilerplate `<div>`-only banner that screen readers fall through |
| Icon-as-state-marker pattern is conventional (Inbox icon → "À compléter"; ChefHat → "En train de cuisiner") — not earned, just consistently applied | `paper-grain bg-primary/8 shadow-card border border-border` cooking-banner chrome — the `paper-grain` texture IS the Slow Food signature, and the `bg-primary/8` is a deliberate desaturated terracotta wash that places the banner at "household-scoped state moved" register |

## 6-Pillar Score: 21/24

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| Copywriting | 4/4 | Inbox label `À compléter` (next-intl `home.nav.drafts`) names the user's job, not the technical state ("drafts" / "items"). Cooking banner `En train de cuisiner` + `Finaliser` / `Passer` — situation-named verbs at the moment of decision. Recipe titles flow through unchanged from the structured payload. Full next-intl on chrome; recipe titles are user-content (correctly excluded from i18n). |
| Visuals | 4/4 | Three loci cohere. Inbox badge sits at top-right-quarter of the nav slot, breaking out of the icon-and-label rhythm just enough to read as "alert" without dominating. Drafts list cards have proper paper-grain chrome with leading icon-bg-empty placeholder + title + draft chip + delete-trash-icon. Cooking banner uses ChefHat lucide icon in green-emerald (Pillar 3 dock — see below) but the placement and stacking with the deck is deliberate per 03-UI-SPEC. |
| Color | 3/4 | DOCKED -1 — `text-emerald-700 dark:text-emerald-300` Tailwind palette literal on the ChefHat icon in CookingBanner (`CookingBanner.tsx:26`) — same recurring gap pattern from Plan 13-02 findings (shortlist OUI button, vote validé chip, cooking-log icon). The semantic intent (emerald = active cook = "happening now") is right; the implementation reaches for `text-emerald-700` instead of `--color-cooking-foreground` or similar custom token. Inbox badge uses pure semantic tokens (`bg-primary/15 text-primary border-primary/40`) — those ARE clean; the dock applies only to the cooking-banner ChefHat. |
| Typography | 4/4 | Badge `text-xs font-medium tabular-nums` (`BottomNav.tsx:123`) — `tabular-nums` is the deliberate detail that keeps the badge stable as the count rolls 9 → 10 → 11; refuses the proportional-width digit jiggle of generic badges. Cooking banner heading `text-base font-semibold leading-6` + recipe title `text-sm text-foreground-muted leading-5 line-clamp-1`. Drafts list cards use the standard Card typography. Within scale. |
| Spacing | 4/4 | Badge `h-5 min-w-5 px-2` — small enough to read as nav-bar chrome, generous enough to host 1-3 digits comfortably. Cooking banner `min-h-16 mx-6 mt-4` matches the page rhythm of HomeDecide; drafts list `gap-3 / gap-2` Card stack. `top-0 right-1/4` badge anchor — the `right-1/4` (vs `right-0`) deliberately shifts the badge to overlap the icon's top-right corner instead of floating off the slot. Tailwind scale only. |
| Experience Design | 2/4 | DOCKED -2. Two structural items stack: (a) **TZ-01 timezone bug** — Active-cook filter at `backend/app/routers/cooking_logs.py:72-78,118-126` uses Python local-tz date vs UTC DB date; late-evening cooks fall through across the UTC offset boundary, meaning the cooking banner can fail to display for an active cook simply because the date arithmetic disagreed (this is also why locus 3 was empty on Plan 13-03 audit day — TZ-01 is exactly this class of bug). (b) **`cooking.finalized` is the 7th broadcast event class but isn't enumerated** in `services/realtime.py:9-19` canonical docstring — works in code (`cooking_logs.py:219`) but invisible to anyone reading the realtime contract. Not user-visible directly; recurring documentation rot that breaks future audits' invariant-counts. The other 4 visible event classes (`recipe.created`, `recipe.promoted`, `recipe.updated`, `vote.created`) all worked end-to-end per WALKTHROUGH probes — that's why the dock is -2 not -3. |

## Detailed Findings

### Locus 1 — Inbox Badge

- Mounted in `BottomNav.tsx:117-127` as the only badge in the nav. Renders only when `draftCount >= 1` (the `showBadge ? <span>...</span> : null` gate at line 120) — at zero, no badge slot exists. The N=0 → N=1 transition therefore introduces a new element, not just a content change; the eye picks it up.
- Color recipe `bg-primary/15 text-primary border-primary/40` (`BottomNav.tsx:123`) — explicit reuse of the vote-chip Pressenti register from `VoteSummary.tsx`. This semantic-token reuse means the badge reads as "household state shifted" rather than "you have unread", and the in-app vocabulary is one register tighter for it.
- `text-xs font-medium tabular-nums` — `tabular-nums` is the precision detail that keeps the badge layout stable as the count rolls. Without it, 9 → 10 jumps width visibly because `9` and `1` are different proportional widths in the Slow Food typeface.
- `top-0 right-1/4 h-5 min-w-5 rounded-full px-2` — the badge anchor at `right-1/4` (a quarter of the slot width from the right edge) deliberately overlaps the icon's top-right corner instead of floating outside. The icon stays the focal point; the badge is a marker on it, not adjacent to it.
- Live audit-day evidence: badge shows `9` per the inbox-snapshot at audit time; the count incremented from `7` to `8` live during WALKTHROUGH RT-1 (B's `POST /recipes/quick` reached A in ~3s).
- (See WALKTHROUGH.md §Realtime Sync — P-12-RT-1)

### Locus 2 — Drafts List at `/inbox`

- Mounted at `/inbox`; renders a stack of `RecipeDraftCard` items (one per draft recipe in the household). Audit-day evidence shows ~10 drafts including:
  - "RT reconnect probe" (from WALKTHROUGH RT-7)
  - "RT probe — recipe.created" (from RT-1)
  - URLs (`https://en.wikipedia.org/...`, `https://www.marmit...`) — pollution from URL extraction probes
  - Two `(extraction en cours…)` cards with `Échec` chip + `Réessayer` CTA — failed-promotion state surfaces in-place per invariant #1
  - Quiche lorraine / Tarte aux poireaux — older drafts
- Each card has paper-grain Card chrome, leading icon-bg-empty placeholder (the empty `<UtensilsCrossed>` style square — same pattern as shortlist's empty-photo placeholder), title with line-clamp, `Brouillon` badge (the v0.2 draft chip vocabulary), and a trash-icon affordance.
- The realtime arrival pattern: a `recipe.created` event mounts a new `RecipeDraftCard` in the list; a `recipe.promoted` event flips the card's status pill from `Brouillon` to `structured` (or unmounts it if the route filters drafts only). `recipe.updated` re-renders the title in place. Verified live per WALKTHROUGH RT-1 + RT-2 + RT-3.
- The `Échec` + `Réessayer` state on extraction-failure is the right level of in-list surface — the user doesn't need to leave the inbox to retry; the affordance is at the card level. Pillar 6 pass-style observation.
- (See WALKTHROUGH.md §Realtime Sync — P-12-RT-1, P-12-RT-2, P-12-RT-3 + WALKTHROUGH §Inbox if scored separately in 13-01)

### Locus 3 — Cooking Banner on `/` HomeDecide

- Mounted in `HomeDecide.tsx:405, 462` (twice — once for the deck-active state, once for the deck-exhausted recap state), only when an active `cooking_log` is in flight for the household-tz today.
- Implemented in `frontend/components/CookingBanner.tsx`:
  - Container: `mx-6 mt-4 flex items-center gap-3 px-4 py-3 min-h-16 rounded-2xl bg-primary/8 paper-grain shadow-card border border-border` — desaturated terracotta wash + paper-grain texture + system shadow. The chrome IS the Slow Food expression.
  - Leading: `<ChefHat size={24} className="text-emerald-700 dark:text-emerald-300 shrink-0" />` — the emerald-Tailwind-literal dock target (Pillar 3 -1; cross-link Plan 13-02 cooking-log-UI-REVIEW finding).
  - Body: `text("title")` heading (`En train de cuisiner` per next-intl) + `recipeTitle` line-clamped sub-heading.
  - Trailing: primary `Finaliser` Button (`<Sparkles>` icon + i18n CTA) + ghost `Passer` Button (skip-for-now affordance).
- **Audit-day status:** locus 3 was inactive on Plan 13-03 audit day because no active cook was in flight in the synthetic household at audit time. Cross-link: Plan 13-02 captured the live cooking banner in `shortlist-canonical.png` ("En train de cuisiner" / "Pad thai tofu" / Finaliser + Passer). The locus is verified live across the milestone, just not on this specific session.
- **TZ-01 cross-cut:** the same backend filter that decides whether to render this banner (`backend/app/routers/cooking_logs.py:72-78,118-126`) is the v0.2.2-backlog TZ-01 bug — Python local-tz date vs UTC DB date. Late-evening cooks fall through; the cooking banner can fail to render for a genuinely-active cook simply because the day-arithmetic disagreed. This is structurally why locus 3 visibility is fragile across audits and why Pillar 6 takes a -1 dock for it.
- (See WALKTHROUGH.md §Realtime Sync — P-12-RT-6 + Plan 13-02 cooking-log-UI-REVIEW.md cross-reference)

### Pillar 6: Experience Design (2/4)

- **TZ-01 timezone bug compromises locus 3 visibility.** The cooking banner mount gate uses Python local-tz date arithmetic compared to UTC database dates (`backend/app/routers/cooking_logs.py:72-78,118-126`). Late-evening cooks created near the UTC offset boundary fall through. User impact: an active cook may simply not surface its banner — the realtime broadcast (`cooking.started`) fires correctly per WALKTHROUGH RT-6, but the GET filter that backs the home query returns the empty state. Filed for v0.2.2 backlog. (See PROJECT.md §Surfaced for follow-up — TZ-01)
- **`cooking.finalized` is a 7th broadcast event class missing from canonical docs.** `backend/app/services/realtime.py:9-19` docstring enumerates the canonical 6 (`recipe.created`, `recipe.promoted`, `recipe.updated`, `vote.created`, `shortlist.created`, `cooking.started`); `backend/app/routers/cooking_logs.py:219` emits a 7th `cooking.finalized` that exists end-to-end but is invisible to anyone reading the realtime contract. Not user-visible directly; recurring documentation rot that breaks future audits' invariant-counts and creates downstream confusion when a refactor needs to know the full broadcast surface. (See WALKTHROUGH.md §Realtime Sync — P-12-RT-6 sub-finding)
- **Pass-style: 6 of 6 documented event classes work end-to-end.** Latencies all under D-17's ~3s qualitative threshold (1.3s for `vote.created`, `cooking.started`; ~3s for `recipe.created`, `shortlist.created`; 1.5s for `recipe.updated`; 4s for `recipe.promoted` — Gemini-bound, observed within the BackgroundTask budget). WS reconnect after offline → online → reload completes in 1.8s and resumes listening on the new connection (RT-7).
- **Pass-style: cookie-isolation infrastructure intact.** Two-context separate-`chromium.launch()` pattern verified isolated cookie jars; auditor identity preserved through 7 cross-client probes. (See WALKTHROUGH.md §Realtime Sync — P-12-RT-CookieIsolation)

### Pillar 1: Copywriting (4/4)

- Inbox label `À compléter` (next-intl `home.nav.drafts`) — names the user's *job* (the act of completing the draft) rather than the technical state (`drafts` / `items`). Refuses the boilerplate.
- Cooking banner heading `En train de cuisiner` (next-intl `home.cooking_banner.title`) — present-progressive French, situation-named, refuses both the verb-only `Cuisson` and the technical `Cooking log`.
- CTAs `Finaliser` (terracotta primary, with `<Sparkles>` icon) + `Passer` (ghost variant) — verbs at the moment of decision. The Sparkles icon on Finaliser ties the affordance to the cook-completion ritual (vs. a generic check icon).
- Drafts list `Brouillon` chip + extraction-failure `Échec` + `Réessayer` chip — chip vocabulary stable, retries surface in-list.
- Recipe titles flow through from the structured payload — user-content, correctly outside next-intl.
- No drift between rendered chrome strings and `lib/i18n/fr.json` keys.

### Pillar 2: Visuals (4/4)

- The badge anchor at `top-0 right-1/4` (`BottomNav.tsx:123`) — the `right-1/4` placement (vs the lazy `right-0`) overlaps the icon's top-right corner so the badge reads as a marker *on* the icon rather than floating *next to* it. Small precision detail; load-bearing for the "alert without dominating" register.
- Drafts list card construction matches the system Card chrome elsewhere — leading icon-empty placeholder, title, chip, trailing trash icon. Refuses a unique-snowflake "draft list" presentation in favor of the universal Slow Food card register.
- Cooking banner stacks above the deck on HomeDecide — the layout is deliberate per 03-UI-SPEC §"Surface ordering" (banner → cold-start chip → samedi date → swipe deck). The visual hierarchy is "you're in the middle of something" → "system status" → "what to decide today".
- ChefHat emerald color is the dock target (Pillar 3 -1) but the size + placement (`size={24}` shrink-0, leading edge) is right.

### Pillar 3: Color (3/4)

- DOCKED -1: `text-emerald-700 dark:text-emerald-300` Tailwind palette literal on the cooking-banner ChefHat (`CookingBanner.tsx:26`) — fourth surface where the emerald-literal pattern recurs (shortlist OUI button, vote validé chip border, cooking-log ChefHat icon, this banner). The `globals.css` comments document emerald (h≈145) as intentional Slow Food per Phase 7 UI-SPEC; the implementation just hasn't been refactored to a custom `--color-cooking-foreground` token yet. Fix is one-token-set; impact spans 4 surfaces.
- Inbox badge `bg-primary/15 text-primary border-primary/40` — pure semantic tokens. Clean.
- Cooking banner chrome `bg-primary/8 paper-grain shadow-card border border-border` — pure semantic tokens. Clean.
- The dock applies ONLY to the ChefHat icon, not the banner chrome.
- Cross-link: this surface confirms the 4-surface emerald-token-completeness gap identified in Plan 13-02 — single fix scope for v0.4.

### Pillar 4: Typography (4/4)

- Badge `text-xs font-medium tabular-nums` — `tabular-nums` is the deliberate detail.
- Cooking banner heading `text-base font-semibold leading-6`, recipe title `text-sm text-foreground-muted leading-5 line-clamp-1`. The `line-clamp-1` is correct for a banner that has to fit a long recipe title at iPhone widths.
- Drafts list uses standard Card typography from the system kit.
- Within Slow Food scale.

### Pillar 5: Spacing (4/4)

- Badge `h-5 min-w-5 px-2` and `top-0 right-1/4` placement.
- Cooking banner `min-h-16 mx-6 mt-4 px-4 py-3 gap-3` — matches the page rhythm and gives the action-row breathing room.
- Drafts list standard `gap-3 / gap-2` Card stack.
- All Tailwind scale.

## Screenshots

- `./screenshots/realtime-home-loci.png` — full `/` page on audit day showing **locus 1 (inbox badge `9` in BottomNav)** plus the page context (PushPermissionBanner at top, ColdStartChip, "Pas encore de shortlist" empty state). Captures the badge in its rendered nav-bar position with the Pressenti-pill color recipe visible. Empty home is incidental to audit day; the badge locus is what's load-bearing here.
- `./screenshots/realtime-inbox-drafts.png` — full `/inbox` page showing **locus 2 (drafts list)** with ~10 RecipeDraftCard items including 2 `(extraction en cours…)` cards with `Échec` + `Réessayer` chips (the in-list extraction-failure recovery affordance). Demonstrates that realtime additions render as proper React reconciliation, not loading-spinner + manual refresh.
- `./screenshots/shortlist-canonical.png` (cross-reference from Plan 13-02 — NOT a new asset added by this plan) — captures **locus 3 (cooking banner)** in its live state when an active cook was in flight: "En train de cuisiner" / "Pad thai tofu" / `Finaliser` (terracotta primary) + `Passer` (ghost). Proves locus 3 chrome ships correctly; on Plan 13-03 audit day the locus was inactive (no active cook in synthetic household — likely TZ-01 adjacent).

## WALKTHROUGH cross-links (context inherited per D-11)

- WALKTHROUGH.md §Realtime Sync: 7 probes (P-12-RT-CookieIsolation through P-12-RT-7) — all pass-style or near-pass; one architectural finding (`cooking.finalized` 7th event class).
- 6 documented event classes verified end-to-end live; 1 additional class (`cooking.finalized`) discovered via code review.
- Latencies all sub-D-17 threshold modulo Gemini-bound `recipe.promoted` 4s.
- Cross-link cooking-log-UI-REVIEW.md (Plan 13-02): TZ-01 bug compromises both the cooking-log history and the realtime locus 3 visibility — single backend fix scope.
- Cross-link vote-UI-REVIEW.md (Plan 13-02): `vote.created` broadcast contains the same `MEMBER_COUNT=2` mis-computed `state` field that the rendered chip shows — the bug ships at the wire, not just at the UI.
- Cross-link shortlist-UI-REVIEW.md (Plan 13-02): `shortlist.created` broadcast verifies regenerate path works (RT-5 reconciled Plan 12-03 P-12-Sh-02 from blocker → friction).
- 1 Gemini call across all 7 probes (RT-2 voice promotion only). Realtime broadcasts themselves are non-AI.
