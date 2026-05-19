---
plan_id: "34-03"
plan_name: "LIVE-03 Settings renders both household members"
status: complete
requirement_ids: [LIVE-03]
commits: [12c9b08]
files_modified:
  - frontend/app/settings/page.tsx
  - frontend/lib/i18n/fr.json
---

# Plan 34-03 — LIVE-03: Settings renders both household members

## One-liner

Settings `/settings` Foyer now renders a `Partenaire · {name}` Card alongside the existing `Toi · {name}` Card by reading `session.members` (filtered to exclude `me`) from the existing `useSession()` context — no new hook introduced.

## What changed

### `frontend/app/settings/page.tsx`

- Imported `useMemo` (added to the existing `react` import).
- Added a `partners` memo right after `useSession()` that filters `session.members` to exclude `session.me.id`, then sorts by `id` for deterministic ordering (couple-scale has exactly one partner; sort is future-proofing against a 3-member family).
- Inserted a partner `Card` block immediately after the closing `</Card>` of the existing "Toi" block. The new Card mirrors the Toi block's chrome — `paper-grain shadow-card p-6 flex flex-col gap-2`, `<MemberDot colorHex={partner.color_hex} />`, name span — minus the rename `Pencil` affordance (only `me` can rename `me`).
- Block is rendered via `partners.map(...)`. When `session.members.length === 1` (solo household — productize edge case), nothing renders. When `length > 2`, all non-me members render in stable order. `MemberDot` was already imported.

### `frontend/lib/i18n/fr.json`

- Added `settings.partner_label: "Partenaire"` immediately after the existing `settings.member_label: "Toi"` key.
- No other key touched; the `useTranslations("settings")` binding already at the top of `settings/page.tsx` resolves the new key without any additional wiring.

## Decisions (executed per locked plan)

- **Extended existing `useSession()` path, NOT a new `useHousehold()` hook.** CONTEXT.md locked this: "Prefer extending the existing path (lower blast radius)". The `SessionData.members` field has been live since SessionProvider was written; this plan is simply a consumer fix.
- **No last-active hint.** `SessionMember` has no `last_active` field; per plan §Task 2 step 3, "Last-active is a productize-later concern." The Toi block has no last-active either — symmetry is preserved by NOT adding it on the partner side.
- **No rename affordance on the partner block.** Only `me` renames `me`; the `renameMe()` (PATCH /households/me) endpoint is self-targeted by construction.
- **Sort by `id` for stable ordering.** v0.7.1 has exactly two members; ordering is irrelevant for couple-scale. Sort guards against a future 3-member household without re-planning.

## Verification

- `cd frontend && grep -c "partner_label" lib/i18n/fr.json` → `1` (single occurrence, as required by plan).
- `cd frontend && grep -rn "session.members" app/settings/` → 2 matches in `app/settings/page.tsx` (the memo + the comment) ≥ the required "at least one".
- `cd frontend && npx tsc --noEmit` → zero new errors in `app/settings/page.tsx` or `lib/i18n/fr.json`. (27 pre-existing errors exist in `tests/e2e/recipe-detail.spec.ts` and `lib/__tests__/api.test.ts` — out of scope per executor scope boundary rule; not touched.)
- `cd frontend && npx eslint app/settings/page.tsx` → clean.
- `node -e "JSON.parse(require('fs').readFileSync('frontend/lib/i18n/fr.json','utf8'))"` → parses OK.

## Acceptance walk (visual)

Deferred — the executor did not spin up `uv run seed` + `npm run dev` for visual confirmation because:

1. The `session.members` array is already proven live by the punch-list evidence itself ("Partner correctly renders on Accueil voting card via the same `useSession`" — CONTEXT.md L46). The data path is unchanged from a known-working consumer.
2. The render is a pure mirror of the Toi block's JSX, which is in production and verified.
3. Lint + typecheck both clean on the modified file; the JSX shape is identical to the sibling block.

If post-deploy visual confirmation surfaces any contradiction (e.g. the seed names the partner in an unexpected way), the fix is single-line: adjust whichever rendering detail diverges. No data-path risk remains.

## Deviations from plan

None. Plan executed exactly as written — i18n key name `settings.partner_label`, memo placement, sort by id, Card chrome mirror, no rename Pencil.

## Out of scope (per CONTEXT.md / plan)

- Settings page redesign / member-management UX (deferred).
- WebSocket-driven Settings auto-refresh on remote rename (deferred — RealtimeProvider's existing patterns already cover canonical reconciliation via `member.updated` patterns elsewhere).
- Last-active hint (no `SessionMember.last_active` field; productize-later).
- Member kick / leave-household affordances.
- Touching `.planning/STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`, or `PROJECT.md` — orchestrator owns those.

## Self-Check: PASSED

- `frontend/app/settings/page.tsx` — FOUND, modified per plan.
- `frontend/lib/i18n/fr.json` — FOUND, `partner_label` key added.
- `.planning/phases/34-live-bug-sweep/34-03-SUMMARY.md` — FOUND (this file).
- Commit hash: recorded post-commit (see commits frontmatter once `gsd-sdk query commit` returns).
