# Phase 22: Quick wins — Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Three independent polish drops that close `audit:walkthrough`-era backlog issues #13/#15/#21:

1. **QW-01** — Remove the Geist Mono font from the bundle and its two render call sites.
2. **QW-02** — Add a build-stamp footer (version · short SHA · env) at the bottom of `/settings` so each device shows which build is running.
3. **QW-03** — Wrap the cuisine/mood/protein tags on the deck card and recipe detail page in `useEnumLabels()` so they render French labels, not raw enum values.

Out of scope (deferred): a full font audit, an inbox tag-display feature, a CI grep guard for raw enum leaks, a `/version` page, a GitHub-commit link on the SHA.

</domain>

<decisions>
## Implementation Decisions

### QW-01 — Geist Mono removal & fallback

- **D-01:** Invite-code input at `frontend/app/onboarding/join/page.tsx:276` switches from `font-mono` to `tabular-nums`. Preserve `tracking-[0.3em] uppercase`. Final class: `text-center tabular-nums tracking-[0.3em] uppercase`. Letter-spacing carries the "code" signal; IBM Plex Sans body font with `tabular-nums` gives equal-width digits.
- **D-02:** URL input at `frontend/components/UrlCaptureTab.tsx:71` (a second `font-mono` call site not named in REQUIREMENTS.md) gets the same fallback in this phase: `tabular-nums text-sm`. Required for the success-criterion grep to actually return zero.
- **D-03:** Drop the `Geist_Mono` import and `geistMono` variable in `frontend/app/layout.tsx:2,27-28`. Remove `geistMono.variable` from the body className.
- **D-04:** Remove the `--font-mono: var(--font-mono);` self-reference in `frontend/app/globals.css:12` (the alias has nothing to alias once the Geist load is gone).
- **D-05:** Do NOT match the Settings invite-code Fraunces italic class string for the join screen. Phase 9's byte-identical signature is between share-code screen ↔ Settings re-find display, not the typed-input field.

### QW-02 — VersionFooter component

- **D-06:** New `frontend/components/VersionFooter.tsx`. Single muted line, centered, `text-xs text-foreground-muted`. Format: `v{NEXT_PUBLIC_APP_VERSION} · {NEXT_PUBLIC_GIT_SHA} · {NEXT_PUBLIC_VERCEL_ENV}`. No paper-grain wrapper, no labeled rows, no GitHub link.
- **D-07:** Always render the env label — `production`, `preview`, or `development`. No conditional hiding on prod. Maximum diagnostic clarity per device.
- **D-08:** Component is branch-free. Local-dev fallback: `v0.5.0 · dev · development`. Falls out of the env re-export defaults — the component itself just reads the three NEXT_PUBLIC vars.
- **D-09:** SHA renders as plain text, no `<a>`. Avoids coupling to the `lucaguery/al-dente` GitHub URL and prevents productize-later debt.
- **D-10:** Build-time env re-export in `frontend/next.config.ts`:
  - `NEXT_PUBLIC_APP_VERSION` ← `process.env.npm_package_version`
  - `NEXT_PUBLIC_GIT_SHA` ← `process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev"`
  - `NEXT_PUBLIC_VERCEL_ENV` ← `process.env.VERCEL_ENV ?? "development"`
- **D-11:** Mount the footer at the bottom of `frontend/app/settings/page.tsx`, below the last section (`Sauvegarde`), before any closing layout wrappers.

### QW-03 — French tag labels

- **D-12:** Surgical fix. Only the two locked call sites: `frontend/components/ShortlistCard.tsx:307-310` and `frontend/app/recipes/[id]/page.tsx:256,259-261,264`. Each component adds `const labels = useEnumLabels();` and wraps:
  - `{cuisine}` → `{labels.cuisine(cuisine)}`
  - `{m}` → `{labels.mood(m)}`
  - `{recipe.main_protein}` → `{labels.protein(recipe.main_protein)}`
- **D-13:** No new infrastructure. `frontend/lib/enum-labels.ts:10` `useEnumLabels()` is the canonical translator (invariant 9). Don't add a wrapper, don't refactor the hook.
- **D-14:** Drafts inbox success criterion (mentioned in ROADMAP.md but not REQUIREMENTS.md) holds trivially — `frontend/app/inbox/page.tsx` and `frontend/components/RecipeDraftCard.tsx` do not render cuisine/mood/protein at all today. **No code change needed for the inbox.** Document this in the verifier so it isn't accidentally added.
- **D-15:** `season` enum — invariant 6 demands all enums route through `useEnumLabels()`, and the hook already exposes `season`. Grep `frontend/{app,components}` for `recipe.season` raw renders during the plan; if any user-facing surface displays it without going through `labels.season(...)`, fix in the same plan as QW-03. If grep is empty, no action.

### Plan slicing & ordering

- **D-16:** Three plans, one per req — `22-01-geist-mono-removal`, `22-02-version-footer`, `22-03-french-tag-labels`. Atomic, independently revertable, mirrors the three separate gh issues.
- **D-17:** Any execution order; files do not overlap. Suggested wave order for `/gsd-execute-phase`: 22-01 (smallest, fastest grep verification) → 22-02 → 22-03. Parallelizable if the executor supports it.
- **D-18:** Verification: grep gates + manual UI smoke on the seeded fixture. Specifically:
  - 22-01: `grep -rn "font-mono\|--font-mono\|Geist_Mono" frontend/{app,components,lib}` returns zero; invite-code input on `/onboarding/join` still reads clearly with terracotta tracking; URL input on the capture-URL tab still readable.
  - 22-02: `npm run dev` shows `v0.5.0 · dev · development` at the bottom of `/settings`; after a Vercel preview deploy, the footer shows the real 7-char SHA and `preview`.
  - 22-03: Deck card and `/recipes/[id]` show `Méditerranéen` / `Italien` / `Boeuf` etc., not English enum keys, on seeded data.
- **D-19:** No new Playwright specs in this phase. v0.2.1 seeded suite stays as-is; quick wins shouldn't expand the test surface.

### Claude's Discretion

- Exact final class strings (e.g. `text-xs text-foreground-muted` line vs. `text-[11px]`) — researcher/planner pick what reads best alongside the Phase 9 Settings layout.
- Whether the VersionFooter is its own client component or inlined directly in `settings/page.tsx` — depends on Server Component constraints in Next.js 16.2.4. Default to a small client component for cleanliness; the planner can collapse if no client-side logic is needed.
- Exact placement of `const labels = useEnumLabels();` inside `ShortlistCard.tsx` and `recipes/[id]/page.tsx` (top of function vs near render block).
- Whether to add an `aria-label` on the VersionFooter line — probably yes, e.g. `aria-label="Version de l'application"` for accessibility; planner's call.

### Folded Todos

None — todo cross-reference run separately would have surfaced any; the v0.5 milestone explicitly maps these three reqs from the v0.4 walkthrough audit, no orphan todos.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture invariants (CLAUDE.md)
- `CLAUDE.md` §"Architecture invariants" #6 — French-only via `next-intl`, day one. All user-facing strings through `next-intl`. Raw enum strings on user-facing surfaces are bugs (anchors QW-03).
- `CLAUDE.md` §"Locked vocabularies" — `Season`, `Cuisine`, `Mood`, `Protein` defined in both `frontend/lib/enums.ts` and `backend/app/models/enums.py`; drift is a bug category. QW-03 does NOT change either file; it only wires the existing values through `useEnumLabels()`.
- `CLAUDE.md` §"Deployment" — Push to `main` is the only deploy path; Vercel auto-deploys in ~60s. Anchors QW-02 build-time env-var availability.

### v0.5 milestone artifacts
- `.planning/PROJECT.md` §"Active" — v0.5 Mixed Sweep description and locked-decision summary.
- `.planning/REQUIREMENTS.md` — search for `QW-01`, `QW-02`, `QW-03` for the canonical req text (locks call-site paths, env-var names, hook reuse).
- `.planning/ROADMAP.md` §"Phase 22: Quick wins" — goal statement and success criteria (note: ROADMAP mentions "drafts inbox" for QW-03; per D-14 this holds trivially).

### QW-01 call sites & files to modify
- `frontend/app/layout.tsx:2,27-28` — `Geist_Mono` import + `geistMono` declaration (remove).
- `frontend/app/globals.css:12` — `--font-mono` self-reference (remove).
- `frontend/app/onboarding/join/page.tsx:276` — invite-code input call site (change `font-mono` → `tabular-nums`).
- `frontend/components/UrlCaptureTab.tsx:71` — URL input second call site (change `font-mono` → `tabular-nums`).
- `frontend/app/settings/page.tsx:362-369` — Phase 9 invite-code Fraunces signature (do NOT match for join screen; cross-reference only).

### QW-02 files to add/modify
- `frontend/next.config.ts` — add `env: { ... }` re-export block (D-10).
- `frontend/components/VersionFooter.tsx` — NEW component (D-06).
- `frontend/app/settings/page.tsx` (end of page) — mount the footer (D-11).
- Vercel platform docs §"System Environment Variables" — `VERCEL_GIT_COMMIT_SHA` and `VERCEL_ENV` are auto-injected at build time; no project-level env-var config needed.

### QW-03 files to modify
- `frontend/lib/enum-labels.ts:10` — `useEnumLabels()` hook (canonical translator; do not modify).
- `frontend/components/ShortlistCard.tsx:307-310` — cuisine/mood/protein Badge renders.
- `frontend/app/recipes/[id]/page.tsx:256,259-261,264` — same on recipe detail page.
- `frontend/components/RecipeForm.tsx:25,231` — existing correct usage pattern (reference for how to call `useEnumLabels()` from a component).
- `frontend/messages/fr.json` `enums.cuisine.*` / `enums.mood.*` / `enums.protein.*` keys — translation source (already populated; no edits expected).

### GitHub issues being closed
- gh#13 — QW-01 (drop Geist Mono).
- gh#15 — QW-02 (version footer).
- gh#21 — QW-03 (French tag labels).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useEnumLabels()` hook** at `frontend/lib/enum-labels.ts:10` — already exposes `cuisine`, `mood`, `protein`, `season` translators with a try/catch fallback to the raw value (forward-compat). RecipeForm.tsx is the existing call-site pattern.
- **Settings page invite-code class** at `frontend/app/settings/page.tsx:366` — Phase 9 signature (`font-display italic text-3xl tracking-widest text-primary`). Cross-reference only; do not reuse for the join input per D-05.
- **IBM Plex Sans body font** — already loaded in `app/layout.tsx`; supports `tabular-nums` natively. Zero new font requests.

### Established Patterns
- **`next-intl` with locked vocabularies** — invariant 6 + 9. Every enum render on a user-facing surface routes through `useEnumLabels()`; raw `{recipe.cuisine}` in JSX is a bug.
- **Settings page layout** — three paper-grain Card sections (`Membre` / `Foyer` / `Sauvegarde`). VersionFooter sits OUTSIDE these cards, as a quiet centered line below.
- **Build-time env vars** — Next.js 16 + Vercel: `NEXT_PUBLIC_*` vars must be set at build time, not runtime. The `env: {}` block in `next.config.ts` re-exports server-side `VERCEL_*` vars into the client bundle.
- **`tabular-nums` for code/number alignment** — Tailwind utility maps to `font-variant-numeric: tabular-nums`. Works with IBM Plex Sans without loading a new font.

### Integration Points
- **`app/layout.tsx`** — single point where fonts are imported and CSS variables are mounted on `<body>`. QW-01 surgery happens here.
- **`next.config.ts`** — single point for build-time env re-exports. QW-02 wiring happens here.
- **Settings page bottom** — single mount point for VersionFooter. No router/middleware changes.

### Creative Options Constrained Out
- Could have added a tap-the-version-to-copy-diagnostic-info feature on VersionFooter. Not in this phase — adds UI behavior, not a quick win.
- Could have done a font audit pass (which fonts are loaded, which are actually used). Not in this phase — that's a productize-later cleanup.

</code_context>

<specifics>
## Specific Ideas

- **Invariant 6 enforcement style is "fix it when found, document the rule in CLAUDE.md, no CI guard yet."** D-15 reflects this — grep for `season` in this phase if convenient, but no automated guard against future raw-enum drift. v0.6 can revisit if drift recurs.
- **Phase 22 sets the pattern for "polish phases" in v0.5+:** 1 req → 1 plan → 1 atomic commit → grep + manual smoke verify. Mirrors the v0.4 review feedback about cross-req commits being hard to revert.
- **Build-stamp text is space-separated `·` U+00B7 (middle dot)**, matching the format string in REQUIREMENTS.md. Not `—`, not `|`, not `/`.

</specifics>

<deferred>
## Deferred Ideas

- **CI grep guard for raw enum leaks** — surfaced during QW-03 scope discussion. Would lint-fail any JSX expression matching `\{[^}]*recipe\.(cuisine|mood|main_protein|season)[^}]*\}` without `labels\.` nearby. Deferred to a future "invariant enforcement" phase if drift recurs.
- **GitHub-commit link on the SHA** — surfaced during QW-02 discussion. Would give one-tap access to the commit diff from Settings. Deferred: couples to the lucaguery/al-dente repo URL; would have to be ripped out for productize.
- **Tap-version-to-copy-diagnostic-info feature** — surfaced during QW-02 visual discussion. Could copy `v0.5.0 · a1b2c3d · production` to clipboard, useful when reporting bugs from a phone. Deferred: adds UI behavior beyond the quick-win scope.
- **Match Settings Fraunces signature on the join screen** — surfaced during QW-01 fallback discussion. Would unify the invite-code visual across share-code/join/Settings re-find. Deferred: bigger visual change than this phase warrants; can be picked up in a future identity-polish pass.
- **Full font audit pass** — surfaced during QW-01 scope discussion. Would catalog every `next/font` import and verify each is actually used somewhere. Deferred: productize-later cleanup, not a quick win.
- **Playwright specs for the three quick-win reqs** — surfaced during plan-slicing discussion. v0.2.1 seeded suite could host them. Deferred per D-19 — quick wins shouldn't expand the test surface.
- **Drafts inbox enriched with cuisine/mood/protein tags** — surfaced during QW-03 sweep discussion. Today the inbox just shows title + status badge. Adding tags would be a new capability (its own phase), not part of QW-03's "fix raw English labels" scope.

### Reviewed Todos (not folded)
None — no separate todo cross-reference run for this phase.

</deferred>

---

*Phase: 22-quick-wins*
*Context gathered: 2026-05-12*
