---
phase: 20
plan: 01
subsystem: design-system
tags: [tokens, css-variables, member-colors, emerald, dark-mode]
requirements: [TOK-01, TOK-02]
status: complete
completed: 2026-05-11
dependency-graph:
  requires: []
  provides:
    - emerald-replacement semantic tokens (--color-valide-{foreground,emphasis,border,border-faint}, --color-cooking-foreground)
    - member-color token pairs (--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground})
    - getMemberColorVars(hex) resolver in @/lib/colors
    - MemberDot now paints via token vars instead of raw hex
  affects:
    - Plan 20-02 (audit-cited emerald-literal migration) consumes the new tokens
    - Plan 20-03 (/styleguide swatches) renders the new token groups
tech-stack:
  added: []
  patterns:
    - CSS-variable tokens with light/dark mode pairs (extends Phase 5 pattern)
    - Token-resolver helper preserving legacy hex storage (D-20-05/06)
key-files:
  created: []
  modified:
    - frontend/app/globals.css
    - frontend/lib/colors.ts
    - frontend/components/MemberDot.tsx
decisions:
  - "Followed plan's 5-token emerald-replacement set (added --color-valide-border-faint for 30% alpha row-border surface) — keeps audit Plan 20-02 from needing color-mix() arbitrary values."
  - "Used existing .dark class selector (not [data-theme=dark] as plan wording implied) to match the established Phase 5 pattern in globals.css. Dark-mode emerald foregrounds use emerald-300/200 hex literals; member chips stay identical bg in both modes (foreground readability is encoded in the fg token, with amber's dark fg as the AA-contrast exception)."
  - "getMemberColorVars falls back to raw-hex bg + #FFFFFF fg for unknown colors so legacy/non-canonical stored hex values still render."
metrics:
  tasks: 2
  files-modified: 3
  commits: 2
---

# Phase 20 Plan 01: Token foundation (emerald-replacement + member-color) Summary

Added 15 design-system tokens (5 emerald-replacement + 10 member-color) to `globals.css` with full light/dark pairs, then threaded the member tokens through `MEMBER_COLORS` and `MemberDot` so dynamic per-member rendering goes through CSS variables instead of raw hex. Foundation for Plans 20-02 (audit migration) and 20-03 (styleguide swatches).

## What Shipped

### TOK-01 — Emerald-replacement tokens (`:root` + `.dark`)

| Token                          | Light    | Dark     | Role                                |
| ------------------------------ | -------- | -------- | ----------------------------------- |
| `--color-valide-foreground`    | #10B981  | #6EE7B7  | Primary Validé accent (text/icon)   |
| `--color-valide-emphasis`      | #047857  | #A7F3D0  | Darker accent text                  |
| `--color-valide-border`        | #10B9814D (50% alpha) | #6EE7B780 | Heart button border          |
| `--color-valide-border-faint`  | #10B9814D (30% alpha) | #6EE7B74D | Row borders (CookingLogCard, etc.) |
| `--color-cooking-foreground`   | #047857  | #A7F3D0  | Cooking-banner icon                 |

Sibling to existing `--color-valide-tint` (unchanged). Invariant-lock comment notes the emerald hue is reserved for the Validé / cooking-success semantic role.

### TOK-02 — Member-color tokens (5 × bg/fg = 10 tokens)

Five chip slots (`rose`, `amber`, `emerald`, `sky`, `violet`) each get a `-bg` and `-foreground` token. Chip hexes identical in light/dark — readability lives in the fg token. Amber uses `#1F1311` foreground in both modes (AA contrast vs. amber-500). All other slots use white fg.

### colors.ts + MemberDot wiring

`MEMBER_COLORS` entries now carry `bgVar` + `fgVar` strings pointing at the new tokens. New `getMemberColorVars(hex)` helper resolves a stored `Member.color_hex` to the matching `{bgVar, fgVar}` pair (fallback emits raw hex + white fg). `MemberDot` renders `style={{ background: bgVar, color: fgVar, ... }}` instead of the raw `colorHex`. Storage shape (backend `Member.color_hex`) is unchanged — these tokens are purely the new render layer (D-20-06).

## Deviations from Plan

**1. [Rule 3 — Blocker] Worktree had no `node_modules`**
- **Found during:** Final verification (Task 2 tsc/eslint runs).
- **Issue:** `frontend/node_modules` is absent in the worktree, so `npx tsc` and `npx eslint` couldn't resolve packages.
- **Fix:** Symlinked `frontend/node_modules` from the main checkout (`/Users/gulu3001/dev/al-dente/frontend/node_modules`) only for verification, then removed the symlink before committing. No file changes; symlink not included in the commit.
- **Outcome:** Both `npx tsc --noEmit` and `npx eslint lib/colors.ts components/MemberDot.tsx` exit 0.

**2. [Clarification, not a deviation] Dark-mode selector**
- The plan body referenced `[data-theme=dark]`, but the canonical pattern in `frontend/app/globals.css` (Phase 5) is the `.dark` class (applied via `prefers-color-scheme: dark` media query + shadcn primitives). Tokens were added under the existing `.dark` block — no new selector introduced. Behavior is identical to what the plan intended.

No bugs, no missing critical functionality, no architectural changes. The only "deviation" is the environmental fix above.

## Verification

Acceptance grep counts (all met):

| Check                                                                                            | Required | Got |
| ------------------------------------------------------------------------------------------------ | -------- | --- |
| `grep -c "color-valide-foreground\|color-valide-emphasis\|color-valide-border\|color-cooking-foreground" globals.css` | ≥ 4      | 10  |
| `grep -c "color-member-" globals.css`                                                            | ≥ 10     | 21  |
| `grep -n "bgVar" lib/colors.ts`                                                                  | ≥ 5      | 6   |
| `grep -n "getMemberColorVars" lib/colors.ts components/MemberDot.tsx`                            | ≥ 2      | 2   |
| `npx tsc --noEmit`                                                                               | exit 0   | 0   |
| `npx eslint lib/colors.ts components/MemberDot.tsx`                                              | exit 0   | 0   |

## Commits

| Hash      | Message                                                                          | Files                                                |
| --------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `a681add` | feat(20-01): add emerald-replacement + member-color tokens to globals.css        | frontend/app/globals.css                             |
| `1591191` | feat(20-01): thread member-color tokens through MEMBER_COLORS + MemberDot        | frontend/lib/colors.ts, frontend/components/MemberDot.tsx |

## Known Stubs

None — no UI surfaces consume the new tokens yet (Plans 20-02 / 20-03 will wire them).

## Threat Flags

None — pure-CSS / render-layer change. Backend storage and validation
(`isValidMemberColor`, `Member.color_hex`) are unchanged.

## Self-Check

- [x] `frontend/app/globals.css` modified — FOUND
- [x] `frontend/lib/colors.ts` modified — FOUND
- [x] `frontend/components/MemberDot.tsx` modified — FOUND
- [x] Commit `a681add` — FOUND
- [x] Commit `1591191` — FOUND

## Self-Check: PASSED
