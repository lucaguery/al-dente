# Milestones

_Source-of-truth for milestone outcomes. Cross-references: `.planning/PROJECT.md` for locked decisions per milestone, `.planning/ROADMAP.md` for the rolled-up index._

## v0.7 Sober Kitchen + Polish (Shipped: 2026-05-18)

**Phases completed:** 4 phases (30–33), 9 plans, 12/12 requirements validated

**Stats:**

- Timeline: 2026-05-17 → 2026-05-18 (2 calendar days)
- Closes: gh#23 (BUG-01 photo signed-URL self-heal), gh#24 (BUG-02 SVG sanitizer `ns0:` fix), gh#25 (NAV-01 central « Ajouter » CTA), gh#27 (DX-01 CLAUDE.md split), gh#29 (SOBER-01..08 Sober Kitchen port §15.A→E)
- Deferred to v0.8 / backlog: gh#26 (« Suggérer » tab — needs product design first), gh#28 (test coverage — better defended against locked visual contract from v0.7)

**Key accomplishments:**

- **Phase 30 — Live-bug sweep:** Recipe photos self-heal on PWA resume — backend `SIGNED_URL_TTL_SECONDS = 86400` (24h) + frontend `PHOTO_URL_CACHE_TTL_MS = 82_800_000` (23h, 1h safety margin) + NEW `useSignedPhotoUrl` hook returning `{ src, onError }` with one-shot retry budget per `<img>` mount; consumed by `RecipeCard`, `ShortlistCard`, `PhotoUploader`, recipe detail. Recipe SVG illustrations render as visible pictograms — two-layer fix: `ET.register_namespace("", "http://www.w3.org/2000/svg")` at module load + belt-and-suspenders `re.sub(r"\bns\d+:", "", serialized)` defense. Alembic 0012 re-sanitizes existing `ns0:`-poisoned rows on next deploy.
- **Phase 31 — Bottom nav restructure:** Central elevated « Ajouter » CTA tab lands in `BottomNav.tsx` on every authenticated, non-onboarding screen — filled primary circle with white `+` glyph, visibly elevated above the four flat sibling tabs. Per-tab `variant: "tab" | "central-cta"` discriminator avoids sprinkling conditionals. Drafts-tab badge + safe-area inset + `/onboarding/*` hiding all preserved. NEW `nav.add` / `nav.profile` i18n keys.
- **Phase 32 — Sober Kitchen port (5 plans):** Sober OKLCH palette (14 value swaps, 3 new tokens, 5 desaturated member hexes) in `globals.css`; Caveat registered as `--font-marginalia`; 4 CSS primitive libraries (marginalia + ledger-card + table-scene + loader-brand) added. Four React primitives shipped: `Marginalia`, `BrandLoader`, `LedgerCard`, `TableVote`. **SOBER-08 grep gate: 0 `animate-spin` outside `BrandLoader.tsx`** (12 spinner call-sites atomically swept). Accueil ported (HomeDecide + TableVote per shortlist row, Caveat slant subhead, valide-tint row treatment, sticky Flame CTA); Bibliothèque ported (3-view switcher grid/list-editorial/patine-grouped with `cookCountToPatina` + `groupByPatina` helpers + localStorage view persistence with 150ms anti-flash hydration); Recette détail ported (sticky topbar + hero 16:10 -38px bleed + Caveat identity subhead from `cook_count` + terracotta ingredient quantities + terracotta step numerals + conditional step-1 marginalia from `cooking_logs[].notes` + sticky « Cuisiner maintenant » CTA). Worktree base drift twice caused globals.css/layout.tsx to be reverted mid-execution; commit `1872d2b` restored Wave 1 artifacts; verifier `score: 6/6` with post-verify fix recorded.
- **Phase 33 — CLAUDE.md split:** Root `CLAUDE.md` pruned from 114 lines → **34 lines of guidance** outside `<!-- GSD:* -->` blocks (D-13 line-count gate, target ≤ 60). NEW `backend/CLAUDE.md` (Gemini SDK correction + alembic deploy contract). NEW `frontend/CLAUDE.md` (Next.js 16 framework-version warning folded verbatim from the deleted `frontend/AGENTS.md` with `<!-- BEGIN:nextjs-agent-rules -->` markers preserved). NEW `.planning/CLAUDE.md` (GSD workflow enforcement block relocated). `frontend/AGENTS.md` deleted per the D-12 override (Claude Code is the only AI assistant in active use; cross-tool AGENTS.md convention is dead weight today, revisit gate: second AI assistant added). **D-04 empirical verification: FAIL** — `gsd-tools generate-claude-md` is hard-wired to the full 6-block root template; scoped marker blocks would be clobbered. Fallback contract applied: `GSD:stack` + `GSD:conventions` stay at root unchanged. Architecture invariants #1–#8 preserved byte-for-byte at root; #2 and #7 NOT duplicated into `backend/CLAUDE.md` (D-11).

**Known deferred items at close:** 13 (see STATE.md §Deferred Items) — 4 UAT/verification `human_needed` items (Phase 30 + 32) tracked via `/gsd-audit-uat`, plus 9 stale pre-v0.7 quick-task tracking entries.

---

## v0.6 Conversation Capture (Shipped: 2026-05-17)

**Phases completed:** 5 phases (25–29), 22 plans, 23/23 requirements validated

**Stats:**

- Timeline: 2026-05-13 → 2026-05-17 (5 calendar days, 143 commits, 34 `feat`)
- Code: 139 files changed, +37,649 / −2,141
- Closes: gh#20 (Recipe Conversation Thread), ADR-0001 implementation

**Key accomplishments:**

- **Phase 25 — Backend foundation:** Introduced `recipe_turns` table (Alembic 0009) and dropped `recipes.source_capture` in the same migration; collapsed the four per-surface `promote_*_draft` functions into a single `promote_draft(recipe_id)` entry point dispatching on the first user turn's `kind`. Frontend cutover removed `source_capture` from `Recipe`, added `initial_turn_kind`. Satisfies invariant #5 via `recipe_turns` going forward.
- **Phase 26 — Thread API & realtime:** One append-only `POST /recipes/{id}/turns` endpoint persists every user-emitted turn (text / voice / photo / url / answer / proposal_*) and broadcasts `turn.created` / `turn.updated` over WebSocket. URL extraction is no longer a stub — `extract_and_process_url_turn` runs in a `BackgroundTask` behind a real SSRF gate (`_is_safe_url`), uploads extracted HTML to Storage, and broadcasts the backfill. Pinning is invariant from this phase.
- **Phase 27 — Conversational capture screen:** Rebuilt `/recipes/new` as a single chat thread — title above, scrollable thread, multi-input composer (text / voice / photo / url) at the bottom — backed by the shared `RecipeThread` component. Blank-draft create + `POST /recipes/{id}/promote` coalescing trigger replaces the five tabbed capture surfaces. Bottom nav collapsed to 3 tabs; failed-pill on `RecipeCard`.
- **Phase 28 — Recipe-detail thread:** Mounted the same `RecipeThread` component on `/recipes/[id]` (not rebuilt — CAPTURE-04 contract honored). Answer-turn UI renders `question` turns as chip / stepper / text inputs; advisory turns render as informational bubbles (option C — manual edit wins). `manually_edited_fields` is on the wire and visible as Caveat marginalia on detail page + edit form. PUT auto-pin via `_apply_put_pinning`.
- **Phase 29 — LLM prompt rework + completeness wire-up:** Rebuilt the Gemini call to read the full thread + pinned-field set every run (idempotent by extraction-hash). LLM now emits `advisory` turns on conflict (never silently overwrites) and `question` turns driven by `recipe-completeness.ts` (Python port). New endpoints `POST /recipes/{id}/questions/trigger` / `defer` wire the summary CTA + 7-day defer flow. `CompletenessCard` stays passive.

**Architecture invariant evolution:**

- **Invariant #1** (five capture surfaces, one shape) further evolved — all five surfaces now flow through `promote_draft(recipe_id)` dispatching on first-turn `kind` instead of four per-surface promotion functions.
- **Invariant #5** (raw inputs kept forever) now satisfied by `recipe_turns` rather than the deprecated `source_capture` JSONB column.
- **CLAUDE.md invariant #4** (realtime contract) extended with `turn.created` + `turn.updated` semantics — `turn.created` fires at POST time; `turn.updated` fires from the BackgroundTask when URL extraction backfills `extracted_html_path` (D-29 — no re-broadcast of `turn.created` for the same turn).

**Known carry-forward:**

- v0.4 / v0.5 HUMAN-UAT items still tracked via `/gsd-audit-uat` — orthogonal to feature milestones.
- 4 Phase 29 UAT items persisted to next milestone (per `/gsd-verify-work` output 2026-05-17).
- Behavioral validation gate (≥ 2 weeks daily use by both members, v0.1 DoD) still pending — orthogonal.

---

## v0.5 Mixed Sweep (Shipped: 2026-05-13)

**Phases completed:** 3 phases (22-24), 9 plans, 12 requirements (QW × 3 / DECK × 4 / RID × 5)

**Stats:** Timeline 2026-05-12 → 2026-05-13 (~2 calendar days / ~10 hours wall-clock). 84 commits. 75 files changed, +13,491 / −142 lines. Closed 12 GitHub issues (#10, #11, #12, #13, #14, #15, #16, #17, #18, #21, #22 Part A + Part B).

**Key accomplishments:**

- **Invariant #1 has shifted** — quick + full-form captures moved from sync `structured`-on-return to async `draft → BackgroundTask → structured` shape. `CLAUDE.md` invariant #1 updated in the same atomic commit (`5e6a2ff`) that shipped `rewrite_title()` (RID-04, gh#10). All 5 capture surfaces now share the same async pipeline.
- **Recipe identity layer** — every recipe acquires an LLM-rewritten "catchy" French title across all capture surfaces (silent overwrite; user title preserved in `source_capture`; `status='structured'` even on rewrite failure per D-26), plus 3 new optional fields (`cook_time_minutes`, `difficulty` with CHECK constraint locked on both sides of the vocabulary boundary, `description`) via Alembic 0007, plus a per-recipe LLM-generated SVG illustration sanitized via stdlib `xml.etree.ElementTree` allowlist (28 unit tests, reject-and-fallback only) and rendered through `dangerouslySetInnerHTML` with `BrandIcon` fallback.
- **Brand identity surfaces** — new `frontend/components/BrandIcon.tsx` extracted from `app/icon.tsx` pasta-strand SVG with `currentColor` stroke + `ComponentType` structural prop typing, mounted on onboarding welcome (size=72) + drafts inbox + recipes library + both shortlist empty states. PWA Edge-runtime twin (`app/icon.tsx`) preserved.
- **Recipe completeness nudge** — pure `computeCompleteness()` helper (11 fields, equal weight, strict non-empty rule, 23 Node 24 `--experimental-strip-types` unit tests) + `CompletenessCard.tsx` mounted above body on `/recipes/[id]` when `<100%` with paper-grain shell + chip-links carrying `?focus=<fieldKey>` to the edit page (Suspense-wrapped `useSearchParams()` per Next.js 16 production-build requirement).
- **Swipe deck polish (one atomic commit per D-23)** — OUI/NON text overlays replaced by `ring-2 ring-inset` color-tinted strokes (Tailwind `overflow-hidden` clipping plain `ring-*` forced the design deviation; REQUIREMENTS.md updated in-commit per D-01); thresholds retuned (`SWIPE_THRESHOLD_PX` 100→140, `SWIPE_VELOCITY_PX_S` 500→750, `SWIPE_FLYOFF_DURATION_S` 0.2s→0.28s; legacy `SWIPE_SPRING` constant deleted); thumbs-up/down icons replaced with filled/outline Hearts (emerald filled, neutral outline); tap-to-detail via `useRouter` + `panRef = useRef(false)` discrimination (`setTimeout(0)` clear path per W-02 iOS Safari research). All four behaviors gated by `prefers-reduced-motion`.
- **Quick-wins polish** — Geist Mono font dependency dropped entirely (import, `--font-mono` variable, both render call sites swapped to `tabular-nums`); per-device build-stamp `VersionFooter` (`v{version} · {sha} · {env}` from build-time env re-export in `next.config.ts`); `useEnumLabels()` wired into `ShortlistCard` + recipe detail page for cuisine/mood/protein.
- **Code review at standard depth** — 0 critical / 3 warnings / 3 info findings across Phase 22 / 23 / 24. All 3 Phase 24 warnings (WR-01 idempotent `db.close()` in `retry_promotion`, WR-02 prod-synthetic seed misses Phase 24 fields on 18 of 21 recipes per intended nudge D-16, WR-03 BackgroundTask reads `recipe.title` not `source_capture.payload.title`) acknowledged at couple-scale; all 3 Info fixes (IN-01/02/03) applied via `/gsd-code-review-fix` iteration 2.

---

## v0.4 Audit Remediation & Identity Polish (Shipped: 2026-05-11)

**Phases completed:** 7 phases, 26 plans, 41 tasks

**Key accomplishments:**

- 1. [Rule 1 — Bug] `result.rowcount` returns `AttributeError` on `update().returning()` against an ORM-mapped entity
- Plan:
- Phase 17 plan-phase MUST schedule a task
- Extended `RecipeStatus` across all three locked-vocabulary sites (Python enum, Postgres ENUM via idempotent Alembic 0006, TypeScript literal union) — terminal-state set transitioned from `{structured}` to `{structured, failed}`.
- 1. `FRENCH_UNIT_WHITELIST` (module-level constant)
- Closed the asymmetry between `_apply_extracted` (success path writes `status='structured'`) and `_record_failure` (was: only wrote `promotion_error`; now writes `status='failed'` alongside). Widened the list endpoint's status filter to accept `failed`, added a guarded `failed→draft` synchronous reset to the retry endpoint, and pinned both contracts with pytest regression coverage.
- Landed the user-visible half of CAP-01 + CAP-02: failed drafts now surface a complete French recovery affordance in /inbox — Fraunces-italic "Extraction échouée" label, truncated error context, 48px Réessayer + Supprimer (with Radix AlertDialog confirm). The `isFailed` predicate switched from the legacy `promotion_error != null` workaround to the canonical `recipe.status === "failed"` now that Plan 16-03 writes status alongside the error.
- Closed Phase 16 with two new Playwright specs under the seeded project that lock the Phase 16 contract at the E2E layer. `capture-voice-failed-recovery.spec.ts` proves CAP-01 + CAP-02 via a forced-fail seed → /inbox failed-state Card → Réessayer endpoint reset → Supprimer AlertDialog hard-delete. `recipe-form-ingredient-parser.spec.ts` proves CAP-03 via a full-form round-trip of the 4 D-16-09 French ingredient lines with a negative regression canary against the historical '4 tomates 4 tomates' duplication. The only backend change is a one-branch test-only prefix (`__TEST_FORCE_FAIL__`) added to `canned_voice_recipe` — env-flag gated and unreachable in production.
- GET /cooking-logs list + GET /cooking-logs/{log_id} detail land in the FastAPI router, and the active-cook 409 + lookup now compute "today" in household.timezone via zoneinfo so the 22:00 Europe/Paris cook stops falling through the UTC offset.
- Paper-grain `/cooking-logs/[id]` detail route with Fraunces italic French date header, useSession-resolved member chip, and the typed `fetchCookingLog(s)` API clients backing it.
- `/cooking-logs` list page now consumes `fetchCookingLogs(14)` + joins recipe titles + taps through to the new HIST-02 detail page; both previously-fixme'd e2e specs (`cooking-log-history`, `cooking-log-create-finalize`) are unblocked, with the Phase 15 INV-02 double-tap idempotency assertion now load-bearing.
- Onboarding join surface now renders a Fraunces-italic paper-grain "Foyer complet" Card with a single back CTA when the backend returns 422 with `detail.code === "HOUSEHOLD_FULL"` — replacing the silently-disabled submit button (ASSESSMENT B-6 / Issue #7).
- Two new Playwright specs lock the Phase 18 UI contracts: settings-member-rename.spec.ts asserts the seeded Luca user can rename via Pencil → Input → Enter and see the Sonner success toast + updated Membre Card, and onboarding-household-full.spec.ts walks 6 independent BrowserContexts to fill a fresh household to capacity and assert the "Foyer complet" terminal Card renders for the 6th joiner.
- Test-seed `CookingLog` + `DailyShortlist` UUIDs no longer encode the calendar date — `uv run seed` is now idempotent across day boundaries via `db.merge()` on stable uuid5 keys, mirroring the prod-synthetic D-10/D-11 pattern.
- Member-scoped admin fire-test endpoint that delivers a deterministic Web Push to the caller's subscription via pywebpush, with a structurally-enforced no-realtime-broadcast invariant (D-19-11).
- Frontend half of VAL-03 — `firePushTest` + `unsubscribePush` helpers in `frontend/lib/push.ts` and a dev-only "Tester le Web Push" button at the bottom of `/styleguide`. Backend (plan 19-03) ships the endpoint; this plan wires the operator UI.
- Closes VAL-02 — a user who tapped "Pas maintenant" on PushPermissionBanner can now re-enable Web Push from `/settings` without clearing session storage. New paper-grain Card between Foyer and Historique renders all 4 push states (unsupported / default / granted / denied) and wires to the existing `registerPushSubscription` / `unsubscribePush` helpers from `frontend/lib/push.ts`.
- Plan:
- 1. [Rule 3 — Blocker] Worktree had no `node_modules`
- 1. [Rule 1 — Doc-comment regression] RatingPicker header doc-block referenced removed literals
- Plan:

---

## v0.3 Audit & Uniqueness Foundation (Shipped: 2026-05-11)

**Phases completed:** 4 phases (11–14), 16 plans, all 16 requirements validated (SEED × 5 + WALK × 4 + AUDIT × 4 + SYNTH × 3)

**Stats:** Timeline 2026-05-09 → 2026-05-11 (3 days). 50 phase-commits. 180 files changed, +19,075 / −37 lines. **Zero product-code drift** — every line landed under `.planning/` (audit-only milestone discipline held throughout per `feedback_executor_scope_creep`).

**Key accomplishments:**

- **Production-accessible synthetic household** live at `https://al-dente-pink.vercel.app` (`[SYNTHETIC] Démo Al Dente`, invite code `DEMO01`). `uv run seed --prod-synthetic` runs idempotently against prod Supabase with a hard-refusal guard (uuid5 + Session.merge upsert; no duplicate-key errors across re-runs). Coverage: 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes covering all 5 computed states (Validé / Pressenti / Contesté / Rejeté / Sans avis). Operator-facing `RUNBOOK.md` documents refresh and teardown paths.
- **Exploratory feature walkthrough** — `.planning/v0.3/WALKTHROUGH.md` (1,276 lines, 14 surfaces, ~64 severity-tagged findings) produced via Playwright MCP against the prod synthetic env. ~48 screenshots committed. 8 GitHub issues filed under `audit:walkthrough` label: `#1` (Sheet-01 inherited), `#2` (ingredient parser corrupts `<int> <noun>`), `#3` (stuck extraction on Gemini failure across 3 surfaces), `#4` (`MEMBER_COUNT=2` hardcoded — invariant #2 broken), `#5` (`cook_count` re-finalize idempotency — invariant #3 broken), `#6` (missing `/cooking-logs/{id}` detail route), `#7` (5-member capacity ceiling), `#8` (`PATCH /api/households/me` 405).
- **Design quality & originality audit** — `.planning/v0.3/UI-AUDIT.md` aggregates 14 per-surface UI-REVIEWs scored under the 6-pillar rubric + new "feels generic vs feels Al Dente" originality verdict. Cumulative mean **20.21/24** across 14 surfaces (~2 below the v0.2 anchor of 22.4/24); verdict distribution **5 Feels Al Dente ✅ / 9 Mixed ⚠ / 0 Feels Generic ❌**. 13 cross-cutting observations surfaced — notably the token-completeness gap (5 surfaces share the Tailwind-palette-literal pattern where custom CSS variables would close the system) and the Pillar 6 (Experience Design) deficit (**0 of 14 surfaces score 4/4**).
- **Synthesis & handoff** — `.planning/v0.3/ASSESSMENT.md` (510 lines, 12,582 words) combines WALK + AUDIT into a tiered ranked findings list ordered by impact on the "feels Al Dente" question. **27 ranked entries** under a locked 3-axis composite rubric (identity-signature impact / invariant-violation visible / primary-path friction; each 0-2): **2 Tier 1** (B-3 MEMBER_COUNT=2 + B-4 cook_count idempotency — both architecture-invariant violations user-visible), **8 Tier 2**, **17 Tier 3**. Closes with explicit "Inputs to next /gsd-new-milestone cycle" section (artifacts + 5 inquiry-form framing questions + 5 explicit non-prescriptions).
- **Anti-prescription discipline enforced structurally** — `.planning/v0.3/check-assessment.sh` (24-line executable script) implements the D-08 forward-only grep gate blocking `v0.4`, prescriptive verbs (should/recommend/propose/must X), TODO/action-item, and future phase numbers (Phase 15+) while explicitly allowing past-phase citations (Phase 11/12/13). Final ASSESSMENT.md passes the gate; SYNTH-02's grep-verifiability success criterion is mechanically satisfied.
- **Clean separation between assessment and roadmap** — ASSESSMENT.md is descriptive-only; v0.4 scoping is deliberately deferred to a separate `/gsd-new-milestone` cycle that consumes the synthesis without being authored by it.

---

## v0.2.1 E2E test infrastructure (Shipped: 2026-05-09)

**Phases completed:** 11 phases, 64 plans, 99 tasks

**Key accomplishments:**

- Locked Season/Cuisine/Mood/Protein enums and 5-slot Tailwind-500 member-color palette mirrored verbatim across `frontend/lib/` (TS const-object pattern) and `backend/app/` (Python str-Enum), with guard functions for member-color validation.
- Replaced the create-next-app boilerplate with a deployed installable PWA shell at https://al-dente-pink.vercel.app/ — next-intl French catalog wired, 15 shadcn/ui primitives committed, manifest + service worker generated, both household iPhones can Add to Home Screen and launch fullscreen with the app shell loading offline on second launch.
- Live FastAPI backend at https://al-dente-production.up.railway.app/ with `/healthz` returning 200, the dev Supabase Postgres holding the SPEC.md §Data-model schema verbatim (7 tables + 3 enums applied via single Alembic baseline migration), bearer-token auth dependency wired but not yet exercised against a router, and an explicit CORS allowlist for the Vercel prod domain + localhost.
- Four-route household onboarding API (`POST /households`, `POST /households/join`, `GET /households/by-code/{code}`, `GET /households/me`) with Pydantic-validated palette enforcement, server-side invite-code generation, and Bearer-token gating that closes INFRA-06's protected-route verification loop.
- Household-scoped WebSocket spine (`/ws?token=...` with 1008-on-bad-token close) plus the `broadcast_to_household` helper every later mutation router will reuse, validated by an in-process round-trip ping test.
- partysocket-backed WebSocket client with locked 250ms→5s exponential reconnect, household-scoped React context, and a throwaway PingPanel UI that closes the W1 dogfood gate (round-trip ping in ~500ms across both phones).
- Manual recipe library API: full-form + quick-add CRUD with cross-household isolation, ILIKE search per D-03, WS broadcasts on every mutation, and JSON export for disaster recovery.
- RECIPE-07 photo upload via FastAPI multipart-through-backend (D-02): magic-byte MIME sniff, 8 MiB cap, 4-photo cap, server-generated UUID path, Supabase Storage write, recipe.updated broadcast — all in one DB tx.
- Recipe library read-side: searchable list with 300ms debounce + ILIKE backend, detail page with private-bucket signed URLs (5-min TTL, path-on-recipe authorized), drafts inbox tab with live `(N)` badge driven by realtime, settings JSON export button — all wired with cookie-auth (no Bearer/localStorage), all copy via next-intl.
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- `frontend/app/settings/page.tsx`
- Gemini 2.5 Flash service module with structured-output schema, three pure call functions, and three BackgroundTask bodies wiring fresh SessionLocal + recipe.promoted broadcast — plus Alembic 0003 adding promotion_error / promotion_attempts to recipes.
- One-liner:
- 1. [Rule 3 — Blocking issue] React 19 set-state-in-effect lint error in PhotoCaptureTab
- 1. [Rule 1 — Lint] react-hooks/set-state-in-effect on VoiceModifySheet open-reset
- 1. [Rule 1 — Bug] Migration revision id format
- One-liner:
- 1. [Rule 3 — Blocking] Radix Select forbids empty-string SelectItem values
- 1. [Rule 1 — Bug] Token name `--color-validé-tint` broke Tailwind v4 utility generation
- Backend (Task 1 — `d37d5d1`):
- File:
- ShortlistCard's prefers-reduced-motion hook migrated to useSyncExternalStore, three dead eslint-disable directives removed, and ROADMAP/REQUIREMENTS reconciled with the album cut and OS-keyboard-mic voice-notes reality.
- Status:
- Migrated `frontend/app/globals.css` to terracotta+warm-cream+warm-taupe OKLCH tokens, two-layer warm-brown shadows, motion CSS tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`), and a `.paper-grain` utility class — full v0.1 token-name preservation, zero component churn.
- One-liner:
- Before
- Created `frontend/lib/motion.ts` — the JS half of DESIGN-06. Exports `easeCraft`, `durations`, `transitions`, and `variants` (fadeIn / slideUp / pressFeedback / swipeCommit) per UI-SPEC §Motion verbatim, in numeric lockstep with the CSS motion tokens in globals.css.
- Sweep `font-heading` → `font-display` across 4 shadcn Title primitives, delete the deprecated `--font-heading` / `--font-sans` `@theme` aliases, and stage `transitions` import on the styleguide page so Phase 5 closes with a clean token surface.
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- Edit 1 — `transitions` import
- 5-state vote-chip pill render with LOCKED color story + paper-grain Tu-décides delegation Card mirroring Phase 6 D-Voice pattern, in a single 28-line surgical edit to VoteSummary.tsx (no new files, no new i18n keys, no architectural change).
- One-liner:
- CookingBanner re-themed to a paper-grain Card with a subtle terracotta wash (bg-primary/8) and Finaliser converted from a raw `<Link>` with hand-rolled inline-flex classes to `<Button asChild>` wrapping `<Link>` — both action buttons cleared to the 48px tap-target floor, closing W4 UI-REVIEW gap COOK-07.
- COOK-08 closed: RatingPicker press feedback upgraded from instant transition-all snap to 100ms ease-craft paper-physics depression, paper-grain anchor added to each rating card surface, and helper-line typography folded into the Phase 8 4-size type-scale.
- RecipeCard joins the kitchen-counter card system (paper-grain frame), SearchInput field rises to 48px D-08 floor with terracotta-30 focus ring on a paper-grain wrapper, and the recipe library converts from a flex-stack to a responsive 2-col mobile-first grid (md:3 / lg:4) — closing COOK-09 in 3 surgical edits, ~15 lines total.
- Next.js 16 ImageResponse-driven app icon (terracotta + cream pasta-strand) replaces static PNGs; manifest + viewport migrated to Slow Food terracotta; Phase 5 deferral CLOSED.
- One-liner:
- One-liner:
- One-liner:
- Test Postgres on :5433/aldente_test plus a single-field in-place URL switch in config.py that flips db.py and alembic/env.py to the test DB when ENVIRONMENT=test — with zero diff to either file.
- Three surgical env-flag guards in services/llm.py + two in services/storage.py + a 89-line llm_fixtures.py exporting canned GeminiExtractedRecipe values, so when ENVIRONMENT=test every recipe-capture surface returns deterministic data instantly without invoking Gemini or Supabase Storage.
- `uv run seed` populates the test DB with 1 household + 2 members + 21 recipes + 3 cooking logs + 7 votes producing all 5 computed states; a hard-refusal guard rejects any non-test environment (or wrong DB name); the seed re-runs as a no-op via uuid5 + Session.merge + composite-key ON CONFLICT DO UPDATE.
- Two-server / three-project Playwright orchestration: workers=1, webServer pair (uvicorn ENVIRONMENT=test on :8000 + next dev on :3000), seeded project with Bearer extraHTTPHeaders, fresh project chained off fresh-setup (TRUNCATE 6 tables CASCADE) → fresh-teardown (uv run seed). Plus a 157-byte baseline JPEG fixture, a single-source-of-truth seed-helpers.ts, and the truncate/reseed scripts that gate TEST-04.
- Thirteen Playwright specs land under frontend/tests/e2e/ covering every shipped screen and user action against the seeded test DB. ZERO product-code edits. The shortlist-vote spec asserts all 5 French vote-state labels (Validé / Pressenti / Contesté / Rejeté / Sans avis) verbatim, satisfying D-12 (the regression-test hot-path canary target). Each spec asserts at least one user-visible French DOM string or known seeded value — never an absence-of-error pattern.
- Single Playwright spec under the `fresh` project: Alice creates a household, Bob joins via the invite code, both contexts get distinct HttpOnly+Secure aldente_auth cookies, and Bob lands on HomeDecide with the BottomNav landmark visible. No Bearer header, no SEED_AUTH_TOKEN shortcut — the real cookie flow is the only auth path.
- TESTING.md ships at repo root (205 lines) with the 4-command bootstrap, full env-var contract, 14-spec matrix, 7-entry troubleshooting section, D-12 canary procedure, and explicit "NOT covered" list. The D-12 canary execution gate could NOT be run end-to-end this plan: the seeded shortlist-vote suite fails 3/3 at baseline due to a `/api/`-prefix mismatch in 10-04's harness, not due to the canary candidate files themselves. Both canary candidate files (`frontend/components/ShortlistDeck.tsx` and `backend/app/routers/votes.py`) are verified `git diff --quiet` at plan close — invariant honored.

---

## v0.2 Polish: Slow Food artisanal identity (Shipped: 2026-05-08)

**Phases completed:** 5 phases, 26 plans, 36 tasks

**Key accomplishments:**

- Migrated `frontend/app/globals.css` to terracotta+warm-cream+warm-taupe OKLCH tokens, two-layer warm-brown shadows, motion CSS tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`), and a `.paper-grain` utility class — full v0.1 token-name preservation, zero component churn.
- One-liner:
- Before
- Created `frontend/lib/motion.ts` — the JS half of DESIGN-06. Exports `easeCraft`, `durations`, `transitions`, and `variants` (fadeIn / slideUp / pressFeedback / swipeCommit) per UI-SPEC §Motion verbatim, in numeric lockstep with the CSS motion tokens in globals.css.
- Sweep `font-heading` → `font-display` across 4 shadcn Title primitives, delete the deprecated `--font-heading` / `--font-sans` `@theme` aliases, and stage `transitions` import on the styleguide page so Phase 5 closes with a clean token surface.
- One-liner:
- One-liner:
- One-liner:
- One-liner:
- Edit 1 — `transitions` import
- 5-state vote-chip pill render with LOCKED color story + paper-grain Tu-décides delegation Card mirroring Phase 6 D-Voice pattern, in a single 28-line surgical edit to VoteSummary.tsx (no new files, no new i18n keys, no architectural change).
- One-liner:
- CookingBanner re-themed to a paper-grain Card with a subtle terracotta wash (bg-primary/8) and Finaliser converted from a raw `<Link>` with hand-rolled inline-flex classes to `<Button asChild>` wrapping `<Link>` — both action buttons cleared to the 48px tap-target floor, closing W4 UI-REVIEW gap COOK-07.
- COOK-08 closed: RatingPicker press feedback upgraded from instant transition-all snap to 100ms ease-craft paper-physics depression, paper-grain anchor added to each rating card surface, and helper-line typography folded into the Phase 8 4-size type-scale.
- RecipeCard joins the kitchen-counter card system (paper-grain frame), SearchInput field rises to 48px D-08 floor with terracotta-30 focus ring on a paper-grain wrapper, and the recipe library converts from a flex-stack to a responsive 2-col mobile-first grid (md:3 / lg:4) — closing COOK-09 in 3 surgical edits, ~15 lines total.
- Next.js 16 ImageResponse-driven app icon (terracotta + cream pasta-strand) replaces static PNGs; manifest + viewport migrated to Slow Food terracotta; Phase 5 deferral CLOSED.
- One-liner:
- One-liner:
- One-liner:

---
