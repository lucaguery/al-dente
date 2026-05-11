# Phase 18: Identity management - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Mode:** Auto (--auto)

<domain>
## Phase Boundary

Five reqs spanning backend mutations + UI affordances:

1. **IDM-01:** `PATCH /api/households/me` — member rename endpoint. Body `{name: str}` (Pydantic max_length=40, strip whitespace). Returns updated Member. Enforces uniqueness within household. Broadcasts `member.updated` per invariant #4.
2. **IDM-02:** Settings Membre Card gets inline edit affordance — tap pencil icon, name becomes input, Enter/tap-out submits via IDM-01 endpoint. Show optimistic update + toast on success/error.
3. **IDM-03:** `POST /api/households/join` returns 422 with structured error code (`HOUSEHOLD_FULL` or similar) when the 5-member `MEMBER_COLORS` palette is exhausted. Currently `POST /households/join` likely 409s on color collision but doesn't enforce overall capacity.
4. **IDM-04:** Onboarding join surface displays a paper-grain "Foyer complet" Card when 422 is returned, instead of silently disabling the submit button.
5. **FIX-04:** Settings invite-code Card gains a visible Copy button (currently the whole Card is tap-to-copy but the affordance isn't discoverable). Toast "Code copié" on success.

Out of scope: increasing the 5-member ceiling itself, OAuth-based identity, profile photos.

</domain>

<decisions>
## Implementation Decisions

### IDM-01: PATCH /api/households/me

- **D-18-01:** Route at `backend/app/routers/households.py`. Member-scoped via `current_member`. Body: `MemberRenameRequest(name: str)` Pydantic schema with `min_length=1`, `max_length=40`, `strip_whitespace=True`. Returns `MemberResponse`.
- **D-18-02:** Uniqueness check within household: `SELECT 1 FROM members WHERE household_id = :hh AND name = :new_name AND id != :me_id` — if exists, return 409 with `detail="name already taken"`.
- **D-18-03:** Broadcasts `member.updated` event with `{id, name, color_hex}` payload via `broadcast_to_household` after the DB commit. RealtimeProvider on the partner's phone refreshes member state.
- **D-18-04:** No new column. Existing `members.name` column is the storage.

### IDM-02: Settings Membre Card inline edit

- **D-18-05:** Add a small pencil icon (Lucide `Pencil`) next to the member name in the Membre Card. Tap → name becomes a `<Input>` with the current name pre-filled, autoFocus. Enter or tap-out submits.
- **D-18-06:** Frontend `frontend/lib/households.ts` adds `renameMe(name: string): Promise<void>` calling the PATCH endpoint.
- **D-18-07:** Optimistic update: flip the displayed name immediately, revert on error with toast. SessionProvider's `refresh()` reconciles canonical state.
- **D-18-08:** i18n keys under `settings.member.*`: `rename_aria` (aria-label for pencil), `rename_label` (input label, screen-reader-only), `rename_success_toast`, `rename_error_toast`.

### IDM-03: Backend capacity 422

- **D-18-09:** `POST /api/households/join` adds a pre-check: `member_count = db.scalar(select(func.count(Member.id)).where(household_id == hh.id))`. If `member_count >= len(MEMBER_COLORS)` (i.e. 5), return 422 with body `{detail: "household full", code: "HOUSEHOLD_FULL", max_members: 5}`.
- **D-18-10:** This check runs BEFORE the color uniqueness check at line 169 — capacity is the broader gate. Existing 404 on unknown invite code stays first.
- **D-18-11:** Existing tests for join must continue to pass. New test: `test_join_returns_422_when_household_full` (seed 5 members, attempt 6th, expect 422 with `code=HOUSEHOLD_FULL`).

### IDM-04: Onboarding join surface — capacity copy

- **D-18-12:** `frontend/app/onboarding/join/page.tsx` (or wherever the join form is) catches 422 with `code=HOUSEHOLD_FULL` and switches to a terminal Card: Fraunces italic paper-grain Card titled "Foyer complet" with body "Ce foyer a déjà 5 membres. Demande au foyer d'origine de créer un nouveau code." plus a single neutral button to navigate back.
- **D-18-13:** Plain HTTPError (404 invalid code, 409 color taken) keeps the existing inline-error pattern. Only the 422 `HOUSEHOLD_FULL` case triggers the terminal Card.
- **D-18-14:** i18n keys under `onboarding.join.capacity.*`: `title`, `body`, `back_cta`.

### FIX-04: Invite-code Copy button

- **D-18-15:** The existing whole-Card tap-to-copy at `frontend/app/settings/page.tsx:54` already calls `navigator.clipboard.writeText` and toasts. Phase 18 adds an explicit `<Button>` with `Copy` icon (Lucide `Copy`) at h-12 inside the Card, alongside the displayed code, so the affordance is discoverable. The whole-Card tap remains for now (single-Card-tap fallback).
- **D-18-16:** Toast key already exists at `t("invite_code_copied")` (`settings.invite_code_copied`); reuse.

### Test coverage

- **D-18-17:** Backend pytest in `backend/tests/test_households.py` (NEW): tests for IDM-01 (happy path + 409 dup + 400 too short) and IDM-03 (422 when full + happy path 5-member join).
- **D-18-18:** Frontend e2e `frontend/tests/e2e/settings-member-rename.spec.ts` (NEW): rename via inline edit, assert Settings reflects new name. (Cross-phone realtime assertion deferred — single browser test sufficient.)
- **D-18-19:** Frontend e2e `frontend/tests/e2e/onboarding-household-full.spec.ts` (NEW): seed 5 members → attempt 6th join → assert "Foyer complet" Card renders.

</decisions>

<canonical_refs>
## Canonical References

- `CLAUDE.md` §invariant #4 (broadcast on mutation) — IDM-01 must broadcast.
- `SPEC.md` §"Members" — 5-color palette is locked.
- `.planning/v0.3/ASSESSMENT.md` — entries B-7 (rename, Issue #8), B-6 (capacity, Issue #7).
- GitHub Issues #7 (capacity) and #8 (PATCH households/me).
- Code sites:
  - Backend: `backend/app/routers/households.py:160` (join endpoint), no existing PATCH /me.
  - Backend: `backend/app/colors.py:3` (MEMBER_COLORS = 5 entries).
  - Backend: `backend/app/schemas/member.py` (MemberResponse — add MemberRenameRequest).
  - Frontend: `frontend/app/settings/page.tsx:54,119` (Copy + Member Card).
  - Frontend: `frontend/app/onboarding/join/page.tsx` (join form — handle 422).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `current_member` dependency, `broadcast_to_household` service, `MemberResponse` schema.
- Settings page already has paper-grain Cards (Phase 9) + toast infrastructure (`sonner`).
- `useSession().refresh()` is the canonical reconciliation hook.
- `frontend/lib/households.ts` already has `joinHousehold` + similar — add `renameMe`.

### Established Patterns
- Member-scoped endpoints return 404 not 403 on cross-household (T-04-01-03).
- All mutations broadcast via `broadcast_to_household` with a string event name.
- Pydantic v2 schemas use `model_config = ConfigDict(str_strip_whitespace=True)`.

### Integration Points
- `RealtimeProvider` consumes `member.updated` via DOM CustomEvent bridge — needs to add the new event type to the union.

</code_context>

<specifics>
## Specific Ideas

- The "Foyer complet" Card uses the same paper-grain shape as Phase 9's onboarding screens — visual consistency with the rest of the onboarding flow.
- The pencil icon (Lucide `Pencil`) for rename matches the icon-as-affordance pattern already used elsewhere (e.g., the `Copy` icon on invite code).

</specifics>

<deferred>
## Deferred Ideas

- N>5 capacity expansion (would require a 6-color extension to `MEMBER_COLORS` + design system review of the new color tokens — v2 backlog).
- Profile photos / avatars (color-attribution is the locked choice per PROJECT.md).
- Member soft-delete / leave-household flow (no UX surface today; v2 backlog).
- Cross-phone realtime e2e test (single-browser test is sufficient for v0.4 scope).

</deferred>

---

*Phase: 18-identity-management*
*Context gathered: 2026-05-11*
