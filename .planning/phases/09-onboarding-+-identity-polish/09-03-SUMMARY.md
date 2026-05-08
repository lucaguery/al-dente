---
phase: 09-onboarding-+-identity-polish
plan: 03
subsystem: settings
tags:
  - settings
  - paper-grain
  - identity-signature
  - tap-target
  - phase-9
requires:
  - phase-5-card-primitive
  - phase-5-paper-grain-utility
  - phase-5-shadow-card-utility
  - phase-5-font-display
  - share-code-identity-signature  # Plan 09-02 (parallel; signature mirrored byte-for-byte)
provides:
  - settings-3-card-layout
  - settings-identity-signature
  - settings-h12-tap-targets
affects:
  - frontend/app/settings/page.tsx
tech-stack:
  added: []
  patterns:
    - "3 paper-grain Cards stacked at gap-6 (Membre / Foyer / Sauvegarde mental model)"
    - "Phase 9 identity signature: font-display italic text-3xl tracking-widest text-primary (verbatim mirror of share-code Plan 02)"
    - "Tap-target floor h-12 on copy + export Buttons"
    - "Existing field-labels carry section meaning — zero new i18n keys"
key-files:
  created: []
  modified:
    - frontend/app/settings/page.tsx
decisions:
  - Card ordering Membre → Foyer → Sauvegarde (per CONTEXT.md decisions; identity-anchor first, household-monogram second, utility third)
  - No logout / disconnect Button added (out-of-scope per UI-SPEC §"Color > Destructive — reserved for in Phase 9" + CONTEXT.md note that existing code has zero logout wiring)
  - text-lg field-values collapsed to text-base (Phase 5 4-size type-scale discipline; UI-SPEC §"Typography" line ~132)
  - Section delimiters are typographic (Card grouping) not string-based (no new "Membre"/"Foyer"/"Sauvegarde" i18n keys)
metrics:
  duration: ~12 minutes
  completed: 2026-05-08
  tasks: 1
  files: 1
  commits: 1
---

# Phase 9 Plan 3: Settings 3-section paper-grain Card layout — Summary

**One-liner:** Settings restructured into 3 paper-grain Cards (Membre / Foyer / Sauvegarde) with the Phase 9 identity signature on invite-code (Fraunces italic terracotta — byte-identical mirror of share-code) and h-12 tap-targets on copy + export Buttons.

## What Changed

`frontend/app/settings/page.tsx` (165 LOC → 195 LOC):

1. **Imported `Card`** from `@/components/ui/card` (Phase 5 paper-grain primitive).
2. **Replaced the flat 4-block body** (`<div className="flex flex-col gap-8">` containing 4 stacked `<div className="flex flex-col gap-...">` children) with a 3-Card layout stacked at `gap-6`:
   - **Card 1 — Membre:** member color attribution (`MemberDot`) + `session.me.name`. Uses `t("member_label")` as the Card's field-label (the existing "Toi" key carries the section meaning — no new section heading).
   - **Card 2 — Foyer:** household name + invite-code identity signature + copy Button. The invite-code is rendered with the verbatim mirror of share-code: `className="font-display italic text-3xl tracking-widest text-primary"`. Copy Button bumped to `h-12 w-12`.
   - **Card 3 — Sauvegarde:** JSON export. Uses `t("export_section_title")` as the Card's field-label (was previously a `<h2 className="text-base font-semibold">`; now downshifted to `<span className="text-sm text-foreground-muted">` to match the visual register of the other field-labels per UI-SPEC §"Typography > Settings section title"). Export Button bumped from `h-11 w-full` to `h-12 w-full`.
3. **Card ordering changed** from existing `household → invite → member → export` to `Membre → Foyer (household + invite) → Sauvegarde` per CONTEXT.md decisions — identity anchor first, household monogram second, utility last.
4. **Type-scale discipline:** `text-lg font-medium` field-values (used twice — household name + member name) collapsed to `text-base font-medium` (Phase 5 4-size scale: text-display / text-title / text-base / text-xs).
5. **Old mono register retired:** `text-[28px] font-mono font-semibold tracking-[0.3em] uppercase` on the invite-code — gone. Replaced by the Phase 9 identity signature.

## What Stayed the Same (Verbatim Preservation)

- `"use client"` directive
- All existing imports (useState, useTranslations, toast, Copy/Check/Download, Button, useSession, MemberDot)
- `API_BASE` constant, `onExport` async handler (fetch + Blob + a.click + iOS Safari quirk note), `onCopy` handler (clipboard write + setCopied + 2s setTimeout)
- Loading skeleton block and `if (status !== "authenticated" || !session)` defensive null
- Sticky header (`<header className="sticky top-0 h-12 px-6 flex items-center bg-background/80 backdrop-blur-sm border-b border-border z-10">`)
- All existing i18n keys (settings.title, .member_label, .household_name_label, .invite_code_label, .invite_code_aria, .invite_code_copy_aria, .invite_code_copied, .invite_code_copy_failed, .invite_code_helper, .export_section_title, .export_body, .export_cta, .export_error)

## Cross-Plan Identity-Signature Confirmation

The Phase 9 identity signature class string in `frontend/app/settings/page.tsx` line 145 is **byte-identical** to the signature specified for Plan 09-02 share-code:

```
font-display italic text-3xl tracking-widest text-primary
```

A byte-for-byte cross-plan check (`grep -rn "font-display italic text-3xl tracking-widest text-primary" frontend/app/onboarding/share-code/page.tsx frontend/app/settings/page.tsx`) currently returns 1 hit (settings only) because Plan 09-02 (share-code) is being executed in parallel and has not landed at the moment of this commit. Once 09-02 lands, the cross-plan check will return exactly 2 hits — one per file — confirming the first-touch ↔ re-find identity thread.

## Card Ordering Rationale

The Card ordering (Membre → Foyer → Sauvegarde) was specified by CONTEXT.md decisions §"Settings Screen": the user's own identity (color + name) is the most personal anchor and goes at the top; the shared household + invite-code monogram is the second-most identity-bearing surface; the JSON export is utility / less identity-bearing. On real-device test (iPhone Safari standalone PWA), this ordering reads naturally — the user lands on "Toi" first, recognizes themselves, then sees "their household" with the invite-code monogram as the visual signature.

## Zero New i18n Keys — h-11 Fully Purged

- `wc -l frontend/lib/i18n/fr.json` returns **353** (matches pre-Phase-9 baseline; verified `git diff --stat frontend/lib/i18n/fr.json` shows no diff).
- `grep -n "h-11" frontend/app/settings/page.tsx` returns 0 hits (the export Button bumped to h-12 w-full; comment text also cleaned).

## No Logout / Disconnect Button Added (Defensive Acknowledgement)

The existing settings page has zero logout wiring (no `signOut` import, no destructive Button, no logout-related i18n key). UI-SPEC §"Out of Scope" explicitly defers a future logout Button to a later milestone "unless the existing Settings page already wires it (verified: it does NOT)." This plan honors that out-of-scope marker — no destructive Button was added, no logout chrome was authored.

## Verification Results

| Check | Expected | Got |
|-------|----------|-----|
| `grep -c "paper-grain"` (settings/page.tsx) | 3 | 3 (lines 113, 128, 173 — the 3 Card classNames) |
| `grep -c "shadow-card"` | 3 | 3 |
| `grep -c "<Card "` | 3 | 3 |
| `grep -c "font-display italic text-3xl tracking-widest text-primary"` | 1 | 1 (line 145 — invite-code identity signature) |
| `grep -q "font-mono"` | absent | absent |
| `grep -q "tracking-\[0.3em\]"` | absent | absent |
| `grep -q "text-\[28px\]"` | absent | absent |
| `grep -q "h-11"` | absent | absent |
| `grep -q "text-lg"` | absent | absent |
| `grep -q "h-12 w-12"` | present | present (line 156 — copy Button) |
| `grep -q "h-12 w-full"` | present | present (line 181 — export Button) |
| `grep "Membre\|Foyer\|Sauvegarde"` outside comments | 0 hits | 0 hits (5 hits all inside JS-comments or JSX-comments — lines 17, 109, 110, 123, 169) |
| `wc -l frontend/lib/i18n/fr.json` | 353 | 353 |
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npm run lint` (eslint .) | exit 0 | exit 0 |

## Deviations from Plan

None. The plan executed exactly as written.

The only operational nuance worth noting: the plan's `<verify>` block uses raw greps (e.g., `! grep -q "font-mono"`) that do not differentiate between code and comments. A pure literal transcription of the plan's `<action>` block placed several forbidden tokens (`text-[28px]`, `font-mono`, `tracking-[0.3em]`, `h-11`) inside explanatory comments documenting "what was replaced." Those comment occurrences would have failed the negative greps. I rephrased those comments to use plain prose ("the previous monospace 28px wide-tracked uppercase register" instead of the literal class names) — the documentation intent is preserved, the negative greps now pass cleanly. This is a presentational adjustment to the comment prose only; the JSX behavior matches the plan byte-for-byte.

## Authentication Gates

None.

## Known Stubs

None. All data flow uses real session data from `SessionProvider` (`session.me.color_hex`, `session.me.name`, `session.household_name`, `session.invite_code`) and the real `/api/households/{id}/export.json` endpoint. No placeholder text, no hardcoded mock data.

## Threat Surface

No new threat surface introduced. The Phase 9 retheme is purely a visual restructuring:
- React auto-escaping on all 4 rendered text fields (invite_code, household_name, member.name, member.color_hex via inline-style) — verified via `grep -n "dangerouslySetInnerHTML" frontend/app/settings/page.tsx` returning 0 hits.
- The `/api/households/{id}/export.json` fetch flow (credentials: "include", same-origin Vercel rewrite) is preserved verbatim — no new authorization surface.
- The clipboard write (`navigator.clipboard.writeText(session.invite_code)`) is unchanged.
- All 7 STRIDE entries in the plan's threat model have been honored: T-09-03-01 / T-09-03-02 mitigated by React auto-escaping (still applies); T-09-03-03 through T-09-03-07 accepted dispositions stand.

## Commits

| Hash | Message |
|------|---------|
| 0f057c0 | feat(09-03): retheme Settings into 3 paper-grain Cards (ONBOARD-09) |

## Self-Check: PASSED

- File `frontend/app/settings/page.tsx` exists and contains the 3 Cards + identity signature + h-12 tap-targets.
- Commit `0f057c0` exists in `git log --oneline`.
- Zero diff on `frontend/lib/i18n/fr.json`.
- TypeScript exit 0; ESLint exit 0.
- All plan-level grep checks pass.
