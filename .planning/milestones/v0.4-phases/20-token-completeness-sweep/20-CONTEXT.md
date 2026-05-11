# Phase 20: Token-completeness sweep - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning
**Mode:** Auto (--auto)

<domain>
## Phase Boundary

Three design-system completeness fixes + one i18n sweep:

1. **TOK-01:** Add semantic emerald-replacement tokens to `globals.css` — `--color-valide-foreground`, `--color-cooking-foreground` (plus border variants if needed). Existing `--color-valide-tint` already lives there.
2. **TOK-02:** Add member-color tokens — `--color-member-{rose,amber,emerald,sky,violet}-{bg,foreground}` (10 tokens). `MEMBER_COLORS` in `frontend/lib/colors.ts` and `MemberDot` component reach for these tokens instead of inline hex.
3. **TOK-03:** Migrate audit-cited surfaces:
   - `ShortlistCard.tsx:165, 256, 258` (`text-emerald-500`, `border-emerald-500`)
   - `VoteSummary.tsx:60, 74` (`border-emerald-500/30`, `border-emerald-500/30`)
   - `CookingBanner.tsx:39` (`text-emerald-700 dark:text-emerald-300`)
   - `CookingLogCard.tsx:58`, `cooking-logs/page.tsx:225`, `cooking-logs/[id]/page.tsx:50` (`border border-emerald-500/30`)
   - `RatingPicker.tsx:36` (`border-emerald-500 text-emerald-700`)
   - Plus `/styleguide` page renders both new token groups with swatches.
4. **FIX-03:** Replace hardcoded `Historique` (line 437) and `Voir les cuissons récentes` (line 440) in `settings/page.tsx` with `next-intl` keys. Also any HomeDecide partner-waiting strings still hardcoded.

Out of scope: terracotta foreground tints, neutral palette migration, shadow tokens (v2 design-system backlog).

</domain>

<decisions>
## Implementation Decisions

### TOK-01: Emerald-replacement semantic tokens

- **D-20-01:** Add to `frontend/app/globals.css` `:root` block:
  - `--color-valide-foreground: #10B981` (emerald-500 — light mode primary)
  - `--color-valide-border: #10B98180` (emerald-500/50 — for the Heart button border)
  - `--color-valide-emphasis: #047857` (emerald-700 — for darker accent text)
  - `--color-cooking-foreground: #047857` (emerald-700) for the cooking-banner icon
  - Dark-mode overrides under `[data-theme=dark]` selector (mirror tints).
- **D-20-02:** Twin Tailwind utilities aren't needed — the CSS variable is consumed via inline `style={{color: 'var(--color-valide-foreground)'}}` OR via existing arbitrary-value Tailwind class `text-[var(--color-valide-foreground)]` (the codebase already uses `bg-[var(--color-valide-tint)]` so the pattern is established).
- **D-20-03:** Keep existing `--color-valide-tint` token unchanged. The new tokens are siblings.

### TOK-02: Member-color tokens

- **D-20-04:** Add 10 tokens to `:root`:
  - `--color-member-rose-bg: #F43F5E` / `--color-member-rose-foreground: #FFFFFF`
  - `--color-member-amber-bg: #F59E0B` / `--color-member-amber-foreground: #1F1311`
  - `--color-member-emerald-bg: #10B981` / `--color-member-emerald-foreground: #FFFFFF`
  - `--color-member-sky-bg: #0EA5E9` / `--color-member-sky-foreground: #FFFFFF`
  - `--color-member-violet-bg: #8B5CF6` / `--color-member-violet-foreground: #FFFFFF`
- **D-20-05:** Update `frontend/lib/colors.ts` `MEMBER_COLORS` entries to add a `bgVar: string` and `fgVar: string` field referencing the new tokens. `MemberDot` reads `style={{ background: bgVar, color: fgVar }}` instead of inline hex.
- **D-20-06:** Keep the `hex` field for backwards-compat (backend `Member.color_hex` storage still uses raw hex). The tokens are the new RENDER source.

### TOK-03: Audit-cited surface migration

- **D-20-07:** Replace literal Tailwind classes at the 8 audit-cited locations:
  - `text-emerald-500` → `text-[var(--color-valide-foreground)]`
  - `border-emerald-500` → `border-[var(--color-valide-foreground)]`
  - `border-emerald-500/30` → `border-[color-mix(in_srgb,var(--color-valide-foreground)_30%,transparent)]` (use Tailwind arbitrary-value `color-mix` for the alpha — verify Next.js 16 + Tailwind v4 support this; fallback to a dedicated `--color-valide-border-faint` token if not)
  - `border-emerald-500/50` → similar pattern
  - `text-emerald-700` → `text-[var(--color-valide-emphasis)]`
  - `text-emerald-700 dark:text-emerald-300` → reduce to single token expression since the token already swaps via the `[data-theme=dark]` block in globals.css
- **D-20-08:** RatingPicker uses tokens AND keeps its semantic "liked" branch — no UX change.
- **D-20-09:** `/styleguide` page gets a new "Phase 20 tokens" section showing swatches for the new emerald-replacement and member-color groups, with hex + token-name labels.

### FIX-03: i18n sweep

- **D-20-10:** Add new i18n keys under `settings.history.*`:
  - `title` → "Historique"
  - `cta_label` → "Voir les cuissons récentes"
- **D-20-11:** Update `settings/page.tsx:437, 440` to use `t("history.title")` and `t("history.cta_label")`.
- **D-20-12:** Grep HomeDecide.tsx for any remaining hardcoded French strings (partner-waiting, error states). Catalogue them and migrate alongside.

### Test coverage

- **D-20-13:** No new pytest needed (pure CSS / i18n changes).
- **D-20-14:** Frontend tests: extend existing `/styleguide` Playwright spec (if exists) OR add `styleguide-tokens.spec.ts` asserting the swatch elements render with correct computed colors (uses Playwright's `evaluate` to read `getComputedStyle`).
- **D-20-15:** Frontend lint guard: add a custom check (or just a stylelint rule if cheap) that fails if `text-emerald-500` / `border-emerald-500` literals re-appear in `components/` or `app/`. Out of scope if too heavy — falls back to grep-based acceptance criteria.

</decisions>

<canonical_refs>
## Canonical References

- `CLAUDE.md` §invariant #6 (next-intl, French only).
- `SPEC.md` §"Voting" (the 5-state color story — emerald reserved for Validé).
- `.planning/v0.3/UI-AUDIT.md` §C-1 (token-completeness gap, 14 surfaces scored).
- `.planning/milestones/v0.2-ROADMAP.md` Phase 5 (the original token system that Phase 20 extends).
- Code sites: 8 emerald literals enumerated in CONTEXT §domain above; `frontend/app/globals.css` (`:root` block ~lines 67-90); `frontend/app/settings/page.tsx:437,440` (FIX-03 sites); `frontend/app/styleguide/page.tsx` (acceptance gate).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `--color-valide-tint` token already lives in globals.css with an explicit invariant-lock comment — pattern for the new tokens.
- `[data-theme=dark]` selector pattern exists for dark-mode overrides (Phase 5).
- `bg-[var(--color-valide-tint)]` inline-variable Tailwind syntax already in use → pattern for the migration.
- `/styleguide` page already renders swatches for the Phase 5 palette — pattern for the new sections.
- `next-intl` `useTranslations` hook is the i18n primitive (used throughout Phase 9 onboarding).

### Established Patterns
- Token names: `--color-{role}-{variant}` (e.g., `--color-valide-tint`).
- Dark mode: `[data-theme=dark] { --token: value }` blocks.
- Tailwind arbitrary values: `text-[var(--token)]` and `bg-[var(--token)]`.
- i18n: all keys under `frontend/lib/i18n/fr.json` namespaces matching component paths.

### Integration Points
- Phase 21 (Pillar 6 polish) CONSUMES these tokens — must land first.
- `/styleguide` is the design-system acceptance gate.

</code_context>

<specifics>
## Specific Ideas

- The `--color-valide-tint` token has an "invariant-lock comment" (per Phase 7 DECIDE-03). New tokens get similar invariant-lock comments explaining the role: emerald reserved for Validé / cooking-success state.
- Phase 9 SUMMARY notes "all cool-grays purged" in BottomNav — token-completeness sweep can verify no residual cool-gray literals remain in the audit-cited 8 sites.

</specifics>

<deferred>
## Deferred Ideas

- Terracotta token completeness (foreground tints, dark-mode variants) — v2 design-system backlog.
- Neutral palette migration (`warm-cream`, `warm-taupe`, `ink-*`) — locked per Phase 5; out of scope.
- Lint rule (stylelint) preventing future emerald-literal regressions — nice-to-have; grep-based acceptance is sufficient for v0.4.
- Backend `Member.color_hex` storage migration to a `color_slug` enum — out of scope; client renders from token, server still stores hex (storage shape stable).

</deferred>

---

*Phase: 20-token-completeness-sweep*
*Context gathered: 2026-05-11*
