# Phase 4: Polish (W4) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 04-polish-w4
**Areas discussed:** Album nav placement, Finalization screen UX, Offline cache depth, Polish scope & priority

---

## Album nav placement

| Option | Description | Selected |
|--------|-------------|----------|
| 5th BottomNav tab | Add Album tab alongside existing 4 tabs — maximally discoverable | ✓ |
| Under Settings / More | Nest Album under the Settings tab — keeps 4-tab structure | |
| Accessible from Home only | Album shortcut on Home screen — least discoverable | |

**User's choice:** 5th BottomNav tab

---

| Option | Description | Selected |
|--------|-------------|----------|
| Replace the Inbox tab | Album replaces Inbox in BottomNav — Inbox moves to Recipes header | ✓ |
| Replace the Settings/Plus tab | Move Settings to modal, free up slot for Album | |
| Keep all 4, add Album as 5th | Extend to 5 tabs total: Home / Recettes / Inbox / Album / Plus | |

**User's choice:** Replace the Inbox tab (drafts inbox moves to Recipes page header as badge/button)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Link from Recipes page header | À compléter badge/button in Recipes header, navigates to /inbox | ✓ |
| Under Settings / Plus | Move drafts link to Settings tab | |
| Keep Inbox tab, Album goes elsewhere | Don't replace Inbox, add Album as 5th tab | |

**User's choice:** Link from Recipes page header

---

## Finalization screen UX

| Option | Description | Selected |
|--------|-------------|----------|
| Recipe card shows last cooking-log photo | After finalizing with photos, recipe card shows the cooked photo | ✓ |
| Take photo from recipe detail inline | Finalization inline on recipe detail, no separate /finalize page | |
| Both | Inline finalization + photo surfaces on card | |

**User's choice:** Recipe card shows last cooking-log photo
**Notes:** User reframed the question entirely — the primary UX win is the recipe card becoming a living record of cooked meals, showing the last cooking-log photo. This drives the `last_cooked_photo_path` denormalized field decision.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Rating required | Must pick loved/liked/disliked before finalizing | ✓ |
| Rating optional | Can finalize with only photo/notes | |
| Photo required, rating optional | Must attach at least one photo, rating optional | |

**User's choice:** Rating required

---

| Option | Description | Selected |
|--------|-------------|----------|
| Back to Home | Navigate to / after finalizing | ✓ |
| To the recipe detail | Navigate to recipe detail showing new photo | |
| To the Album | Navigate to Album to see the new entry | |

**User's choice:** Back to Home

---

## Offline cache depth

| Option | Description | Selected |
|--------|-------------|----------|
| App shell only | Precache static shell; API routes show loading without network | ✓ |
| Shell + stale-while-revalidate for recipes | Cache GET /recipes and GET /shortlists/today | |
| Full offline read | Cache recipes + shortlist + album photos | |

**User's choice:** App shell only

---

## Polish scope & priority

| Option | Description | Selected |
|--------|-------------|----------|
| Mobile-first visual polish | Contrast, touch targets ≥ 48px, focus rings | ✓ |
| Full ARIA + screen reader pass | aria-labels, roles, VoiceOver testing | |
| Skip — fix only deferred lint errors | No dedicated accessibility work | |

**User's choice:** Mobile-first visual polish

---

| Option | Description | Selected |
|--------|-------------|----------|
| Opportunistic — note TODOs while working | No dedicated plan for productize-later sweep | ✓ |
| Dedicated final plan | Audit all // TODO(productize) markers and catalog them | |

**User's choice:** Opportunistic — noted in SUMMARY.md while touching files

---

## Claude's Discretion

- Finalization screen layout: single scroll (photos → rating → notes) — not explicitly asked, simplest interpretation
- Album masonry implementation: CSS columns vs JS library — left to planner
- PhotoUploader adaptation: `cookingLogId` prop vs extracted base component — left to planner
- `cooking.finalized` broadcast: optional nice-to-have, left to planner

## Deferred Ideas

- `cooking.finalized` WebSocket broadcast for partner Home sync
- Per-recipe cooking history timeline on recipe detail
- Album filtering (by rating, cook, date)
- Wildcard shortlist slot (productize-later)
