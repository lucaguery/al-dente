# Phase 22: Quick wins — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 22-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 22-quick-wins
**Areas discussed:** QW-01 fallback + 2nd site, QW-02 footer behavior, QW-03 sweep scope, Plan slicing & ordering

---

## QW-01 fallback + 2nd site

### Q1 — Invite-code input fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Body + tabular-nums | Keep IBM Plex Sans body font; add `tabular-nums` for equal-width digits; preserve `tracking-[0.3em] uppercase`. Closest visual to current. Letter-spacing carries the 'code' signal. (Recommended — req calls this option out by name) | ✓ |
| Match Settings (Fraunces italic terracotta) | Reuse the Phase 9 invite-code class string verbatim (`font-display italic text-3xl tracking-widest text-primary`). Strongest 'invite-code is one thing' signal across join + Settings. Bigger visual change to the join screen. | |
| System monospace stack | Use Tailwind's default mono stack via `font-mono` after removing the `--font-mono` Geist override (relies on `ui-monospace, SF Mono, ...`). Zero visual change on iOS Safari but inconsistent across Android/desktop dev. | |

**User's choice:** Body + tabular-nums
**Notes:** Closest to current visual; tracking-[0.3em] uppercase preserved; equal-width digits from `tabular-nums` on IBM Plex Sans body font.

### Q2 — Second `font-mono` call site at UrlCaptureTab.tsx:71

| Option | Description | Selected |
|--------|-------------|----------|
| Include — same fallback | Apply the chosen fallback to both call sites in this phase. URLs benefit from monospace-ish digit alignment too. Makes the `grep -rn 'font-mono'` success criterion actually return zero. (Recommended — the grep guard is in the req) | ✓ |
| Include — different treatment | Keep URL input distinct: drop `font-mono`, use body font with `text-sm` only (URLs are not codes, no need for special letter-spacing). Decide what `UrlCaptureTab.tsx:71` becomes separately. | |
| Defer to a later phase | Leave `UrlCaptureTab.tsx:71` as-is. The grep success criterion then fails — would need to be rewritten or weakened. | |

**User's choice:** Include — same fallback
**Notes:** Required so the success-criterion grep returns zero. Same `tabular-nums text-sm` swap on both inputs.

---

## QW-02 footer behavior

### Q1 — Env label on production

| Option | Description | Selected |
|--------|-------------|----------|
| Always show env | `v0.5.0 · a1b2c3d · production` on prod, `· preview` on preview, `· development` on local. Maximum diagnostic clarity. (Recommended — req lists VERCEL_ENV as part of the locked format) | ✓ |
| Show only when non-prod | `v0.5.0 · a1b2c3d` on prod (no env label), `· preview` only when not prod. Quieter UI for prod users; loses the 'definitely on prod' signal. | |
| Show only when non-prod, plus colored badge | Same as above, with `preview` rendered in a subtle accent color. More UI to maintain. | |

**User's choice:** Always show env
**Notes:** Locked-format string from the req is honored. Same three fields on every build.

### Q2 — Local dev fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Show `v0.5.0 · dev · development` | VERSION from `npm_package_version` (always present); SHA falls back to literal `dev`; env falls back to `development`. Footer always renders — simplest mental model. (Recommended — keeps component branch-free) | ✓ |
| Show version only, hide rest | `v0.5.0` alone when SHA/env are missing. Cleaner-looking footer in local dev, but a missing SHA in prod (bug) would be invisible. | |
| Hide entire footer in dev | Render nothing when `NEXT_PUBLIC_GIT_SHA` is unset. No noise locally; but footer never gets tested in dev. | |

**User's choice:** Show `v0.5.0 · dev · development`
**Notes:** Branch-free VersionFooter. Defaults baked into `next.config.ts` env re-export, not into the component.

### Q3 — SHA as plain text or GitHub link

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text | Just renders `a1b2c3d`. No GitHub URL coupling, no `target=_blank`, no productize-later debt. (Recommended) | ✓ |
| Link to GitHub commit | `<a href='https://github.com/lucaguery/al-dente/commit/{sha}' target='_blank'>a1b2c3d</a>`. Couples to specific GitHub URL. | |

**User's choice:** Plain text
**Notes:** Avoids productize coupling.

### Q4 — Visual treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Single muted line | One small centered line in `text-xs text-foreground-muted` below the last section. Minimal, off to the side, doesn't compete with content. (Recommended — matches al-dente's restraint) | ✓ |
| Labeled rows | Three rows: `Version: 0.5.0`, `Build: a1b2c3d`, `Env: production`. More legible but heavier UI. | |
| Centered with paper-grain micro-card | Same line wrapped in a tiny `paper-grain` Card. Adds weight a 'version stamp' doesn't need. | |

**User's choice:** Single muted line
**Notes:** Quiet, restrained, doesn't compete with Settings content.

---

## QW-03 sweep scope

### Q1 — Surgical or defensive sweep

| Option | Description | Selected |
|--------|-------------|----------|
| Surgical — 2 locked call sites only | Touch only `ShortlistCard.tsx:307-310` and `recipes/[id]/page.tsx:256,259-261,264`. Smallest diff, zero new infra. (Recommended) | ✓ |
| Surgical + manual sweep | Surgical fix plus one grep audit for any other place rendering enums raw. No CI guard. | |
| Surgical + CI grep guard | Adds lint/test that fails on raw enum JSX. Hardens invariant 6 long-term; risk of false positives. | |
| Defer the inbox question | (Annotation, not exclusive) Drafts inbox doesn't render tags today — success criterion holds trivially. | |

**User's choice:** Surgical — 2 locked call sites only
**Notes:** Drafts inbox holds trivially (grep confirmed no enum renders). No new infra. CI grep guard captured as deferred idea.

### Q2 — Season tag treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Same treatment if displayed | Grep `frontend/{app,components}` for `recipe.season` raw renders; if found on user-facing surface, fix with `labels.season(...)`. (Recommended — invariant 6 says all enums) | ✓ |
| Out of scope | Req only names cuisine/mood/protein. Leave season alone. | |
| Always wrap season too | Speculative; no current call sites. | |

**User's choice:** Same treatment if displayed
**Notes:** Defensive only if grep finds something. No effort if grep is empty.

---

## Plan slicing & ordering

### Q1 — Slicing

| Option | Description | Selected |
|--------|-------------|----------|
| 3 plans, 1 per req | `22-01-geist-mono-removal`, `22-02-version-footer`, `22-03-french-tag-labels`. Atomic, independently revertable. (Recommended — matches v0.4 reviewer feedback) | ✓ |
| 2 plans (front polish + infra) | Plan A: QW-01 + QW-03. Plan B: QW-02. Fewer commits. | |
| 1 mega-plan | Single commit; smallest blast radius for revert. | |

**User's choice:** 3 plans, 1 per req
**Notes:** Mirrors the 3 separate gh issues (#13/#15/#21).

### Q2 — Execution order

| Option | Description | Selected |
|--------|-------------|----------|
| Any order, parallelizable | Files don't overlap. Suggested 22-01 → 22-02 → 22-03 by grep-speed. (Recommended) | ✓ |
| QW-02 first to unblock device QA | Ship footer first to tell builds apart during testing. | |
| QW-03 first — most user-visible | Ship the French-label fix first for maximum demo impact. | |

**User's choice:** Any order, parallelizable
**Notes:** Suggested wave order 22-01 → 22-02 → 22-03.

### Q3 — Verification gate

| Option | Description | Selected |
|--------|-------------|----------|
| Grep + manual UI smoke | Grep gates + load relevant page on seeded fixture. Light-touch. (Recommended for a quick-wins phase) | ✓ |
| Grep + Playwright spec per req | New Playwright specs in `frontend/tests/e2e/`. Higher coverage, more time. | |
| Grep + Playwright + UI audit re-score | Re-score affected surfaces on 6-pillar rubric. Heaviest, likely overkill. | |

**User's choice:** Grep + manual UI smoke
**Notes:** No new Playwright specs in this phase (D-19). Re-score deferred — pure cosmetic polish.

---

## Claude's Discretion

- Exact final class strings for VersionFooter (between `text-xs text-foreground-muted` and similar variations).
- VersionFooter as a client component vs inlined in `settings/page.tsx` (planner decides based on Next.js 16 Server Component constraints).
- Placement of `const labels = useEnumLabels();` inside the two QW-03 components.
- `aria-label` on VersionFooter.

## Deferred Ideas

- CI grep guard for raw enum leaks (would harden invariant 6).
- GitHub-commit link on the SHA (productize-later coupling).
- Tap-version-to-copy-diagnostic-info on VersionFooter.
- Match Settings Fraunces signature on the join screen (bigger identity polish).
- Full font audit pass.
- Playwright specs for the three quick-win reqs.
- Drafts inbox enriched with cuisine/mood/protein tags (new capability, not QW-03 scope).
