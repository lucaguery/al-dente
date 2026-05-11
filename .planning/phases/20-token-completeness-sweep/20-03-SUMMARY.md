---
phase: 20
plan: 03
subsystem: i18n
tags: [i18n, next-intl, invariant-6, fix-03]
requires: []
provides:
  - "settings.history.title (i18n key)"
  - "settings.history.cta_label (i18n key)"
  - "home.partner_waiting.message (i18n key)"
  - "home.partner_waiting.refresh_cta (i18n key)"
affects:
  - frontend/app/settings/page.tsx
  - frontend/components/HomeDecide.tsx
  - frontend/lib/i18n/fr.json
tech_stack:
  added: []
  patterns:
    - "next-intl useTranslations() hook scoped per namespace"
key_files:
  created: []
  modified:
    - frontend/app/settings/page.tsx
    - frontend/components/HomeDecide.tsx
    - frontend/lib/i18n/fr.json
key_decisions:
  - "Group settings nav-history keys under `settings.history.*` (sibling to `settings.notifications.*`) rather than a top-level `nav.cooking_history.*` namespace — keeps the consumer (settings/page.tsx) and the keys colocated semantically."
  - "Group HomeDecide partner-waiting copy under `home.partner_waiting.*` — a new sibling of `home.shortlist` / `home.summary`, scoped to a dedicated `tPartnerWaiting` translator so the existing translators retain narrow scopes."
metrics:
  duration: ~6 min
  tasks_completed: 1
  files_modified: 3
completed: 2026-05-11
requirements: [FIX-03]
---

# Phase 20 Plan 03: FIX-03 i18n sweep — settings Historique + HomeDecide partner-waiting Summary

Routed the last two surfaces of audit-cited hardcoded French (settings Historique Card + HomeDecide partner-waiting Card) through `next-intl`, closing invariant #6's code-layer break for the v0.4 design-system completeness milestone.

## What changed

- **`frontend/lib/i18n/fr.json`:**
  - New `home.partner_waiting` namespace with `message` ("En attente de ton/ta partenaire…") and `refresh_cta` ("Actualiser").
  - New `settings.history` namespace with `title` ("Historique") and `cta_label` ("Voir les cuissons récentes").
- **`frontend/app/settings/page.tsx`:**
  - Line 437: `<span>Historique</span>` → `<span>{t("history.title")}</span>`.
  - Line 440: `<span>Voir les cuissons récentes</span>` → `<span>{t("history.cta_label")}</span>`.
  - Card comment updated from "TODO(productize) — move to nav.cooking_history.* keys in v0.2.1 i18n sweep" to a closure note pointing at Phase 20 FIX-03.
- **`frontend/components/HomeDecide.tsx`:**
  - New `tPartnerWaiting = useTranslations("home.partner_waiting")` translator alongside the existing `tShortlist` / `tSummary`.
  - Line 361 hardcoded "En attente de ton/ta partenaire…" → `{tPartnerWaiting("message")}`.
  - Line 375 hardcoded "Actualiser" → `{tPartnerWaiting("refresh_cta")}`.

## Acceptance criteria status

| Check                                                                            | Result                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------- |
| `grep "Historique\|Voir les cuissons" settings/page.tsx` — only comments         | PASS (lines 380, 431 only — both comments)  |
| `grep "settings.history\|history.title\|history.cta_label" fr.json` ≥ 2 matches  | PASS (`title` line 313, `cta_label` line 314 under `settings.history`) |
| No hardcoded French in HomeDecide outside comments                               | PASS (`En attente` only in comment line 353) |
| `cd frontend && npx tsc --noEmit` exits 0                                        | PASS                                        |
| `cd frontend && npx eslint app/settings/page.tsx components/HomeDecide.tsx` 0    | PASS (no issues)                            |

## Deviations from Plan

None — plan executed exactly as written. The plan allowed the planner discretion on HomeDecide namespace choice; selected `home.partner_waiting.*` as documented above.

## Commit

- `9d0f2a1` — fix(20-03): migrate hardcoded French to next-intl (FIX-03)

## Self-Check: PASSED

- File `frontend/app/settings/page.tsx`: FOUND (modified)
- File `frontend/components/HomeDecide.tsx`: FOUND (modified)
- File `frontend/lib/i18n/fr.json`: FOUND (modified)
- Commit `9d0f2a1`: FOUND
- `Historique` / `Voir les cuissons récentes` no longer rendered as JSX text in settings/page.tsx (verified via grep — only inside `/* ... */` comments)
- `En attente`, `Actualiser` no longer rendered as JSX text in HomeDecide.tsx (verified via grep — only inside `//` comment)
- `tsc --noEmit` clean
- ESLint clean on both touched component files
