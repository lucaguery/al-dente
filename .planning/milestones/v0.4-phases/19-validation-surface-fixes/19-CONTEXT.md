# Phase 19: Validation surface fixes - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Mode:** Auto (--auto)

<domain>
## Phase Boundary

Three independent reliability fixes closing v0.3 validation gaps:

1. **VAL-01 (B-1 / Sheet-01 / Issue #1):** Bottom sheets render off-screen on iPhone-shape viewports because the `paper-grain` class on `frontend/components/ui/sheet.tsx:65` triggers a global CSS rule `.paper-grain > * { position: relative }` that overrides Radix Sheet's `fixed` positioning. Affects PhotoUploader source picker, VoiceModifySheet, RegenerateSheet. Same root cause as Phase 9's SearchInput fix.
2. **VAL-02:** Settings recovery surface for Web Push — user who tapped "Pas maintenant" on `PushPermissionBanner` can re-enable from Settings without clearing session storage.
3. **VAL-03 + VAL-04:** New `POST /api/push/test` admin endpoint (reachable from `/styleguide` in dev) fires a deterministic test push. Lets operator verify Web Push end-to-end on both iPhones without waiting for the 16:00 cron. Round-trip observation lands in `.planning/v0.4/PUSH-ROUNDTRIP.md`.
4. **FIX-02 (SEED-01):** Seed CLI is cross-day idempotent. Currently `cli/seed.py:451-481` generates `CookingLog._id("cooking_log", slug, str(cooked_at.date()))` where `cooked_at` is `now - timedelta(days=N)` — so on a new calendar day, NEW UUIDs are generated and previous-day rows accumulate. Same issue for `DailyShortlist._id("shortlist", today.isoformat())` at line 489. Fix: drop the date component from these UUID inputs so the merge upserts cleanly across days.

Out of scope: increasing the 5-color palette (Phase 18 already closed the affordance, not the ceiling); native push (PWA Web Push only).

</domain>

<decisions>
## Implementation Decisions

### VAL-01: Sheet-01 viewport fix

- **D-19-01:** Remove `paper-grain` from `frontend/components/ui/sheet.tsx:65` Sheet content wrapper. The global rule `.paper-grain > * { position: relative }` in `frontend/app/globals.css` is the root cause — it overrides Radix's `fixed` positioning, shoving the sheet content off-screen by the viewport offset.
- **D-19-02:** Replace the paper-grain texture by applying it on an inner wrapper that doesn't have any descendants needing `position: fixed`. The Sheet content itself stays unstyled by paper-grain; the visual texture moves to a nested `<div className="paper-grain ...">` if the user wants it back. Or — simpler — drop the paper-grain on the Sheet entirely and use a plain `bg-popover` surface (matches Phase 5's drawer/dialog patterns).
- **D-19-03:** Recommend: drop paper-grain entirely on Sheet content (D-19-02 simpler path). Sheets are short-lived modal surfaces; the texture isn't load-bearing for design identity. Phase 21 may revisit if Pillar 6 audit flags it.
- **D-19-04:** Remove `test.fixme` from `frontend/tests/e2e/capture-photo.spec.ts` (the photo upload sheet spec). Add a `toBeInViewport()` assertion to verify the fix structurally.

### VAL-02: Settings Web Push recovery

- **D-19-05:** Add a "Notifications" Card to `frontend/app/settings/page.tsx` (alongside existing Membre / Foyer / Sauvegarde sections — would become a 4th Card or absorbed into Foyer per planner's call).
- **D-19-06:** The Card shows current push state: `granted` → "Notifications activées" with a disable button (clears subscription); `denied` → French copy explaining the user must reset via OS settings; `default` (or `denied-but-dismissed`) → "Activer les notifications" button that re-triggers the existing permission flow.
- **D-19-07:** Reuse the existing `requestPushPermission` / `subscribePush` helpers from `PushPermissionBanner.tsx` — extract them to `frontend/lib/push.ts` if not already shared. No new endpoints required for this UX.

### VAL-03: Admin test push endpoint

- **D-19-08:** New `POST /api/push/test` route (no params). Member-scoped via `current_member`. Fires a deterministic push notification to ALL subscriptions owned by the calling member. Body: `{ "fired_to": int, "delivery_failures": int }`. Logs delivery attempts with subscription endpoint truncated.
- **D-19-09:** The endpoint title + body of the test push: title "Test al dente", body "Notification de test depuis /styleguide" — non-localized (admin tool, French staying for consistency).
- **D-19-10:** Add a "Tester le Web Push" button at the bottom of `/styleguide` (dev-only — gated by `process.env.NODE_ENV === "development"`).
- **D-19-11:** Endpoint does NOT broadcast via `services/realtime` (admin-test, not a product event). Document this explicitly in the route docstring.

### VAL-04: Round-trip documentation

- **D-19-12:** Create `.planning/v0.4/PUSH-ROUNDTRIP.md` documenting: dev-mode admin-test flow steps, observed delivery on each iPhone, latency from button tap to OS notification, screenshot evidence of the notification on lock screen. This is the explicit closure of P-12-Pu-05's "operator deferral".
- **D-19-13:** Planner authors a TEMPLATE for `PUSH-ROUNDTRIP.md` with `[pending: operator]` placeholders for each evidence section. The actual operator round-trip is human verification, surfaced via HUMAN-UAT.

### FIX-02: Seed cross-day idempotency

- **D-19-14:** Drop the date component from CookingLog UUIDs at `cli/seed.py:459`. Change `_id("cooking_log", slug, str(cooked_at.date()))` → `_id("cooking_log", slug)` so the 3 seeded cooking logs each have a STABLE UUID across re-runs regardless of day.
- **D-19-15:** Drop the date component from DailyShortlist UUID at `cli/seed.py:489`. Change `_id("shortlist", today.isoformat())` → `_id("shortlist", "today")` or similar stable key. The shortlist's `date` column updates on merge so the row points to today.
- **D-19-16:** The 3 cooking-log `cooked_at` timestamps still compute as `now - timedelta(days=2/5/10)` — they roll forward each day, but the UUID is stable so it's a merge update, not an insert. `last_cooked_at` recomputes correctly via the existing `max(cooked_at)` logic at line 477.
- **D-19-17:** Verification: run `uv run seed`, then run again, assert row counts are unchanged. New backend test: `backend/tests/test_seed_idempotency.py::test_seed_cross_day_no_duplicates`.

### Test coverage

- **D-19-18:** Backend: `test_seed_cross_day_no_duplicates` (FIX-02). Backend: `test_push_test_endpoint_fires` (VAL-03 — uses a stub pywebpush adapter).
- **D-19-19:** Frontend e2e: `capture-photo.spec.ts` un-fixme + `toBeInViewport()` assertion (VAL-01). Frontend e2e: `settings-push-recovery.spec.ts` (NEW) — simulates "Pas maintenant" dismiss, opens Settings, re-summons the permission prompt (Notification permission needs Playwright `context.grantPermissions`).
- **D-19-20:** Frontend manual: HUMAN-UAT items for VAL-02 + VAL-04 (real iPhone testing required for push verification — Playwright doesn't reach iOS Safari).

</decisions>

<canonical_refs>
## Canonical References

- `CLAUDE.md` §invariant #4 (broadcast) — VAL-03 admin endpoint does NOT broadcast (documented exception).
- `SPEC.md` §"Web Push" — Web Push design + subscription lifecycle.
- `.planning/v0.3/ASSESSMENT.md` — entries B-1 (Sheet-01), B-13 (Push three-gap), and SEED-01 (v0.2.2 backlog).
- `.planning/v0.3/UI-AUDIT.md` — Phase 8 cooking-log surface notes referencing Sheet rendering.
- GitHub Issue #1 (Sheet-01).
- Code sites:
  - `frontend/components/ui/sheet.tsx:65` (Sheet-01 root cause)
  - `frontend/app/globals.css` (`.paper-grain > *` CSS rule — verify exact line)
  - `frontend/tests/e2e/capture-photo.spec.ts` (test.fixme to remove)
  - `frontend/app/settings/page.tsx` (Settings sections)
  - `frontend/components/PushPermissionBanner.tsx` (push request flow)
  - `backend/app/routers/push.py` (add /test endpoint)
  - `backend/app/services/push.py` (existing pywebpush usage)
  - `backend/app/cli/seed.py:459,489` (SEED-01 bug sites)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pywebpush` already in pyproject + `services/push.py` already wraps subscription delivery.
- `PushPermissionBanner` already implements request-permission UX (lines TBD by planner).
- `_id(...)` helper in `cli/seed.py:107` is the existing uuid5 wrapper — drop date arg = no signature change.
- Phase 5 design system (paper-grain Card, Fraunces italic) for the Settings Notifications Card.

### Established Patterns
- Member-scoped endpoints return 404 not 403 cross-household (T-04-01-03).
- Dev-only UI gated by `process.env.NODE_ENV === "development"` (existing pattern in /styleguide).
- `db.merge()` upsert pattern in seed.py uses stable uuid5 keys (D-09 from v0.2.1).
- `toBeInViewport()` Playwright pattern from v0.2.1 (Sheet-01 was the bug that surfaced it).

### Integration Points
- Settings page already has the paper-grain Card grid — VAL-02 adds one more Card.
- /styleguide page already imports dev-only components — VAL-03's button slots in.

</code_context>

<specifics>
## Specific Ideas

- Drop paper-grain on Sheet entirely (D-19-03) — the texture isn't doing visual work on a modal that animates in/out.
- Stable-key UUID approach for SEED-01 (D-19-14, D-19-15) matches the D-09 v0.2.1 idempotency design — date component was the regression vector.

</specifics>

<deferred>
## Deferred Ideas

- Sheet visual identity polish (paper-grain reintroduced on an inner wrapper that doesn't break Radix) — Phase 21 Pillar 6 candidate.
- Push notification grouping / iOS badge counts — v2 backlog.
- Operator dashboard for fleet-wide push delivery metrics — way out of scope.
- Cross-phone push smoke test in Playwright (iOS Safari unreachable from Chromium) — manual HUMAN-UAT only.

</deferred>

---

*Phase: 19-validation-surface-fixes*
*Context gathered: 2026-05-11*
