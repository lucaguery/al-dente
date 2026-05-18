---
plan_id: 36-05
plan_name: SOBER-16 — design-system.html §15 drops Réception tab
phase: 36-sober-kitchen-finish-polish
status: complete
requirement_ids: [SOBER-16]
commits: []
files_modified:
  - docs/design-system.html
files_created:
  - .planning/phases/36-sober-kitchen-finish-polish/36-05-SUMMARY.md
key_decisions:
  - "Added a dedicated `.bottom-nav-cta` + `.cta-pill` + `.cta-label` CSS class trio (≈14 lines) right after `.bottom-nav-tab` rules — the central CTA is structurally different from a flat tab (elevated pill with translateY) and deserves its own class rather than overloading `.bottom-nav-tab` with modifiers."
  - "Renamed `Réglages` → `Profil` only inside the LIVE BottomNav mockup spans (per Phase 31 / 36 frontend convention `nav.profile` → 'Profil'). No other 'Réglages' references existed in the doc after this edit (verified via grep)."
  - "Preserved all historical-context blocks referencing 'Réception' (line ~1455 capture/réception refactor paragraph, line ~1480 reporté rows-table cell, lines ~1893 / 1971 / 1973 / 2006 / 2008 refactor-en-cours notes) per plan instruction — these describe historical truth and form the v0.5 → v0.7 milestone narrative."
  - "Used inline `box-shadow: 0 4px 14px rgba(0,0,0,0.18)` on `.cta-pill` rather than a Sober Kitchen token — `docs/design-system.html` is self-contained (it doesn't consume `frontend/app/globals.css` tokens at render time), so a hard-coded shadow value reads correctly in the browser preview without depending on the app's CSS variable scope."
duration_minutes: 4
completed: 2026-05-18
---

# Phase 36 Plan 05: SOBER-16 design-system.html §15 drops Réception tab Summary

## One-liner

Updated `docs/design-system.html` §15.A Accueil + §15.B Bibliothèque BottomNav mockups from the 4-tab pre-Phase-27 layout (Accueil / Recettes / Réception / Réglages) to the as-shipped 4-slot layout (Accueil / Recettes / central « Ajouter » CTA / Profil), and added a `.bottom-nav-cta` CSS rule trio so the mockup renders the elevated terracotta pill in a browser — closing punch-list D-02 and re-aligning design-system-as-documented with design-system-as-built post-Phase-31 + 36-01.

## Change Site

Single file `docs/design-system.html`, three edits:

1. **CSS rules added** (after line 570, the existing `.bottom-nav-tab svg, .bottom-nav-tab span` rule):
   - New `.bottom-nav-cta` block: `flex: 1` + column layout, mirrors `.bottom-nav-tab` flex behaviour so the four slots stay equal-width.
   - New `.bottom-nav-cta .cta-pill` block: 56px circle, `var(--primary)` background, `translateY(-12px)` lift, soft drop shadow.
   - New `.bottom-nav-cta .cta-label` block: `translateY(-8px)` to keep the label close to the lifted pill rather than floating below the row baseline.
2. **§15.A Accueil mockup BottomNav** (now lines 1556-1561, was 1539-1544):
   - Slot 1: `bottom-nav-tab active` Accueil (home icon) — `.active` kept since this is the Accueil mockup.
   - Slot 2: `bottom-nav-tab` Recettes (book-open icon).
   - Slot 3: `bottom-nav-cta` Ajouter (plus icon inside `.cta-pill`, label inside `.cta-label`).
   - Slot 4: `bottom-nav-tab` Profil (settings icon, renamed from "Réglages").
3. **§15.B Bibliothèque mockup BottomNav** (now lines 1748-1753, was 1731-1736):
   - Same slot order; `.active` moved from slot 1 to slot 2 (Recettes) since this is the Bibliothèque mockup.

## HTML Diff (per mockup)

```diff
- <div class="bottom-nav-tab"><i data-lucide="inbox" style="…"></i><span>Réception</span></div>
- <div class="bottom-nav-tab"><i data-lucide="settings" style="…"></i><span>Réglages</span></div>
+ <div class="bottom-nav-cta"><span class="cta-pill"><i data-lucide="plus" style="width:22px;height:22px;"></i></span><span class="cta-label">Ajouter</span></div>
+ <div class="bottom-nav-tab"><i data-lucide="settings" style="…"></i><span>Profil</span></div>
```

Two slots removed (`Réception`, `Réglages`), two slots added (central-cta `Ajouter`, flat-tab `Profil`). Net 4 slots, matching `frontend/components/BottomNav.tsx`'s `TABS` array exactly.

## Breakdown Copy Audit

Plan tasked the executor with reviewing the breakdown paragraphs below each mockup. Decisions:

| Block | Decision | Why |
|-------|----------|-----|
| §15.A breakdown "Composants impliqués" list `BottomNav.tsx — inchangé` (line 1583) | **KEEP** | "inchangé" referred to the v0.7 Sober Kitchen port's posture toward BottomNav — historical correct. Phase 36-01 (SOBER-10) is the explicit BottomNav touch, separately summarised. |
| §15.A "Hiérarchie visuelle" + "Données" lists | KEEP unchanged | No BottomNav-shape claims; only describes H1, marginalia, ledger row, CTA-to-validé. |
| §15.B "Composition" + "Le view-switcher" paragraphs | KEEP unchanged | Describes view-switcher and patine bucketing — does not enumerate BottomNav slots. |
| §15 row-table at line 1480 (`<td>Réception</td>`) | **KEEP** | Historical state row about "Capture/Réception reporté" — describes Phase 22 milestone state, not current. |
| Paragraph at line ~1455 "Capture et Réception attendent leur refactor" | **KEEP** | Historical narrative about Phase 27 work; truth-statement at the time written. |
| Paragraphs at lines 1893 / 1971 / 1973 / 2006 / 2008 "Capture & Réception — refactor en cours" | **KEEP** | Historical-state blocks describing the parallel-refactor wave; v0.7 milestone narrative anchor. |

Net result: the LIVE mockup HTML changes; the historical-context prose stays. The acceptance grep allows this (the plan's `done` criteria explicitly tolerate historical-context matches outside the live `<div class="bottom-nav">` blocks).

## Verification

### Acceptance gates (all green)

```bash
$ grep -c "bottom-nav-cta" docs/design-system.html
5     # 3 CSS rules + 2 mockup occurrences; plan required >= 2
```

```bash
$ awk '/<div class="bottom-nav">/,/<\/div>/' docs/design-system.html | grep -c 'data-lucide="inbox"'
0     # zero inbox icon refs inside live mockup blocks
```

```bash
$ grep -in "Réglages" docs/design-system.html
(zero matches — fully renamed to Profil; only the LIVE mockup carried this string)
```

```bash
$ grep -in "réception\|reception" docs/design-system.html
1455:                la liste éditoriale (B) ou le regroupement par patine (C). Capture et Réception attendent leur refactor.
1480:                <td>Réception</td>
1893:                Capture et Réception attendent leur refactor.</p>
1971:       <span class="cmt"># Dernière étape avant le refactor Capture/Réception</span>
1973:<span class="cmt"># Capture &amp; Réception : repris après le refactor parallèle.</span></div>
2006:              <h4>⏸ Capture &amp; Réception — refactor en cours</h4>
2008:                Les écrans Capture (<code>frontend/app/recipes/new/</code>) et Réception (<code>frontend/app/inbox/</code>)
```

All remaining "Réception" matches are historical-context paragraphs / row-table cells / scratch-code comments — explicitly allowed by the plan's `done` criteria (lines 137-139 of the plan).

### Visual parity with `frontend/components/BottomNav.tsx`

Live `TABS` array (lines 42-47):
```
[ tab Accueil, tab Recettes, central-cta Ajouter, tab Profil ]
```

§15.A + §15.B mockup BottomNav:
```
[ bottom-nav-tab Accueil, bottom-nav-tab Recettes, bottom-nav-cta Ajouter, bottom-nav-tab Profil ]
```

Slot order, label strings, and active-state placement match the live component. The elevated CTA visual (translateY(-12px) + shadow) mirrors the SOBER-10 implementation (`-translate-y-3` Tailwind utility = `translateY(-12px)`, `shadow-card` token = soft drop shadow).

## Deviations from Plan

None — plan executed exactly as written. The plan offered both inline-style and class-based approaches for the central-cta lift; chose class-based (a new `.bottom-nav-cta` rule trio) per the plan's "Suggested rules" snippet. The plan was explicit that historical context blocks stay; honored that.

## Known Stubs

None.

## Threat Flags

None — pure doc-only HTML/CSS edit, no executable surface, no schema/network/auth changes.

## Self-Check: PASSED

- File `docs/design-system.html` exists at `/Users/gulu3001/dev/al-dente/docs/design-system.html` and contains the new `.bottom-nav-cta` CSS rules + both updated mockup blocks (verified via Read + grep).
- File `.planning/phases/36-sober-kitchen-finish-polish/36-05-SUMMARY.md` exists at the canonical path (this file).
- Acceptance greps all green (results above).
- No commits in this plan yet — final commit is the orchestrator's responsibility per scope constraint (plan deliberately excludes STATE.md / ROADMAP.md from `files_modified`).
