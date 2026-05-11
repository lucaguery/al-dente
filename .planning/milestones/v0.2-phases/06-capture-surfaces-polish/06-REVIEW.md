---
phase: 06-capture-surfaces-polish
reviewed: 2026-05-08T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - frontend/components/ui/alert-dialog.tsx
  - frontend/components/ui/card.tsx
  - frontend/components/ui/dialog.tsx
  - frontend/components/ui/sheet.tsx
  - frontend/app/globals.css
  - frontend/app/styleguide/page.tsx
  - frontend/components/RecipeDraftCard.tsx
  - frontend/app/inbox/page.tsx
  - frontend/components/EmptyState.tsx
  - frontend/app/recipes/new/page.tsx
  - frontend/components/RecipeForm.tsx
  - frontend/components/VoiceCaptureTab.tsx
  - frontend/components/PhotoUploader.tsx
  - frontend/components/PhotoCaptureTab.tsx
  - frontend/components/UrlCaptureTab.tsx
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-05-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 6 cleanly re-themes the five capture surfaces and the drafts inbox to the Phase 5 Slow Food design system. Core acceptance items verified:

- **D-Voice deviation HONORED.** No `webkitSpeechRecognition`, `getUserMedia`, `MediaRecorder`, or `SpeechRecognition` references introduced in `VoiceCaptureTab.tsx` or any other reviewed surface — the textarea-only approach with the OS keyboard-mic helper card is correct per CONTEXT D-Voice locked decision.
- **`font-heading` sweep complete.** All four shadcn Title primitives (`alert-dialog`, `card`, `dialog`, `sheet`) now use `font-display`. Repo-wide grep returns zero `font-heading` remnants.
- **Styleguide imports `transitions`.** Phase 5 deferral cleanup acknowledged at line 14 — but see WR-02 below: the imported symbol is never *used*, so the cleanup is symbolic rather than functional.
- **CAPTURE-11 W4 tap-target gap closed.** PhotoUploader's X-overlay uses `before:-inset-2.5` (28px button + 10px each side ≈ 48px effective hit-slop) on line 203, matching the same pattern in `PhotoCaptureTab.tsx:143`.
- **Paper-grain applied to capture surfaces** (RECIPE-02 quick-card, voice helper card, photo "+" tile, URL helper) and locked at the Card primitive level via `frontend/components/ui/card.tsx:15`.
- **Motion language** tokens (`--ease-craft`, `--duration-fast`, `--duration-normal`) wired through `globals.css` and re-exported in `lib/motion.ts`; reduced-motion media query enforces zero-duration override globally.

The findings below are all non-blocking polish issues. No critical issues. Three warnings cover correctness concerns (unused imports tripping `no-unused-vars`, an undefined Tailwind utility silently no-op'ing, and a small typing concern in the inbox `recipe.deleted` realtime handler). Five info items cover minor inconsistencies and productize-later cleanup opportunities.

## Warnings

### WR-01: `scrollbar-none` is an undefined Tailwind utility — silent no-op

**File:** `frontend/app/recipes/new/page.tsx:154`
**Issue:** `<TabsList className="mx-6 mt-4 w-auto overflow-x-auto scrollbar-none flex">` uses the class `scrollbar-none`, which is not part of Tailwind v4's built-in utilities and is not defined anywhere in the project (`globals.css`, `postcss.config.mjs`, no `tailwind-scrollbar` / `tailwind-scrollbar-hide` plugin in `package.json`). Tailwind silently emits an empty rule, so the horizontal scrollbar on the 5-tab capture row will still be visible on browsers that paint one (desktop Safari, most Linux browsers, some Android Chromium configs). On iOS Safari the scrollbar is auto-hidden, so the bug is invisible during the primary acceptance test — but the styleguide and any desktop-DevTools session will show a visible scrollbar under the 5-tab strip.

**Fix:** Either drop the class (the iOS-only target makes it cosmetically inert) or wire the utility via `globals.css`:

```css
@layer utilities {
  .scrollbar-none {
    scrollbar-width: none;
  }
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
}
```

If kept, audit the rest of the codebase for the same typo — Tailwind's official utility plugin name is `scrollbar-hide`, and the canonical spelling for tools that vendor it is `scrollbar-none` *or* `no-scrollbar`. Pick one and document it.

### WR-02: `transitions` imported but unused in styleguide

**File:** `frontend/app/styleguide/page.tsx:14`
**Issue:** `import { variants, transitions } from "@/lib/motion";` brings in `transitions`, but a `grep` for `transitions.` against the file returns zero matches. The CONTEXT.md Phase 5 deferral cleanup item asked the styleguide to *demonstrate* `transitions` (not just import the symbol). This will fail `eslint-config-next/typescript`'s `@typescript-eslint/no-unused-vars` rule on a clean lint run if strict-unused is enabled — it currently passes only because Next.js's preset defaults `args: "after-used"` and `varsIgnorePattern` to be lenient. More importantly, the cleanup is symbolic: the styleguide's "Slide up (duration-normal)" section uses `variants.slideUp` (which has `transition: transitions.normal` baked in) but doesn't show any `transition={transitions.fast}` override that would justify the bare import.

**Fix:** Either:

1. Remove `transitions` from the import — the cleanup item is then "false advertising" relative to CONTEXT.md and should be re-scoped, OR
2. Use `transitions` somewhere visible — a natural fit is the dark-mode toggle button or the "Slide up" example which currently relies on the bundled-in transition:

```tsx
<motion.div
  variants={variants.slideUp}
  initial="hidden"
  animate={slideVisible ? "visible" : "hidden"}
  transition={slideVisible ? transitions.normal : transitions.fast}
>
```

Recommended: option 2 — it teaches readers that `transitions.*` are composable presets, which is the actual point of the export.

### WR-03: `recipe.deleted` realtime handler payload type is too narrow

**File:** `frontend/app/inbox/page.tsx:100`
**Issue:** `realtime.onEvent<{ id: string }>("recipe.deleted", (payload) => { ... })` declares the payload as `{ id: string }`, but the canonical `Recipe` shape is what the server emits for `recipe.created` / `recipe.updated` / `recipe.promoted`. If the backend ever broadcasts a fuller payload for `recipe.deleted` (likely, since other handlers in the codebase typically receive the full row for symmetry), the narrower type will mask future drift between client/server. The functional code only reads `payload.id` so the bug is dormant — but TS won't warn if backend starts including, e.g., `{ id, household_id }` and a future handler depends on `household_id`.

**Fix:** Align the type with the rest of the file (or with the realtime contract documented in the backend `services/realtime.py`). At minimum, mark it explicit:

```ts
// Backend `recipe.deleted` payload is the full Recipe row (per realtime contract).
const offDeleted = realtime.onEvent<Recipe>("recipe.deleted", (payload) => {
  setDrafts((prev) => {
    const next = prev.filter((p) => p.id !== payload.id);
    draftsCache = next;
    return next;
  });
});
```

If the backend genuinely emits only `{ id }`, leave a comment justifying the asymmetry — otherwise this is a "maybe-bug" that costs nothing to align.

## Info

### IN-01: Mixed Phase 5 type-scale and ad-hoc Tailwind type classes

**File:** `frontend/components/RecipeDraftCard.tsx:89`, `frontend/app/inbox/page.tsx:119`, `frontend/components/PhotoCaptureTab.tsx:116-117`, `frontend/components/EmptyState.tsx:26`
**Issue:** Phase 5 defined four canonical type classes (`text-display`, `text-title`, `text-body`, `text-caption` in `globals.css:271-314`). The new capture surfaces still use raw Tailwind sizes (`text-base font-semibold`, `text-xl font-semibold`, `text-sm text-muted-foreground`, `text-base text-foreground-muted`) instead of the canonical scale. UI-SPEC §Typography says "every screen should converge on" the four-class scale; mixing them here is the same drift Phase 5 tried to eliminate in the first place.

**Fix:** Sweep these four sites to the canonical scale where appropriate:

- `RecipeDraftCard.tsx:89`: `text-base font-semibold leading-6 line-clamp-1` → consider `text-body font-semibold line-clamp-1` (the `text-body` class already encodes `font-family` and `line-height`; `line-clamp-1` is independent).
- `inbox/page.tsx:119` (header): `text-xl font-semibold` → `text-title` (page heading is the canonical use-case for `.text-title`).
- `PhotoCaptureTab.tsx:116-117`: `text-xl font-semibold` / `text-sm text-muted-foreground` → `text-title` / `text-caption`.
- `EmptyState.tsx:26`: `text-base text-foreground-muted` → `text-body text-foreground-muted` (or just `text-body` since `EmptyState` body copy is intentionally muted — folding the muted color into a class variant could simplify further).

Not blocking — purely a "Phase 5 convergence" item.

### IN-02: Hardcoded user-facing strings on dev-only styleguide bypass `next-intl`

**File:** `frontend/app/styleguide/page.tsx:154-160, 186-192, 257-260, 376-389, 400-403, 416-419, 588-602` (multiple)
**Issue:** The styleguide renders many French-language strings inline (`"Mode clair"`, `"Mode sombre"`, `"« Tagliatelles aux cèpes »"`, etc.) without going through `useTranslations`. The file's top comment justifies this with "Strings on this page intentionally bypass next-intl — see UI-SPEC §Copywriting Contract" and a `notFound()` guard in production. This is fine — but worth flagging because `next-intl` has historically caught untranslated strings via a CI lint rule (if one exists), and this file would be a noisy false-positive source. Confirm CI lint rules exclude `app/styleguide/**`.

**Fix:** No code change required. Optionally add `app/styleguide/**` to any `next-intl` lint rule's ignore list, and double-check the production `notFound()` guard ships with the Vercel build (it does today via `process.env.NODE_ENV === "production"` at line 133). This is a "watch this if a CI rule lands" note, not a current bug.

### IN-03: TODO(productize) for `?tab=` deep-link is fine to defer, but worth surfacing

**File:** `frontend/app/recipes/new/page.tsx:52`
**Issue:** `// TODO(productize): support ?tab= URL param to deep-link a tab (UI-SPEC §"5-tab capture surface").` — this is correctly tagged per CLAUDE.md conventions (`TODO(productize)` distinguishes from intra-v0.1 work). No issue. The note is here only so the reviewer signals awareness; a Phase 7+ pass can pick this up. Likely 5–10 lines: parse `useSearchParams()` once on mount, set initial `tab` state from `searchParams.get("tab")` if it matches the tuple.

**Fix:** No action this phase.

### IN-04: `quick-photo` Card uses paper-grain twice (parent + Card primitive)

**File:** `frontend/app/recipes/new/page.tsx:190`
**Issue:** `<Card className="paper-grain shadow-card p-4 flex flex-col gap-1.5">` adds `paper-grain` explicitly, but `Card` already applies `paper-grain` via `frontend/components/ui/card.tsx:15`. The CSS is idempotent (`.paper-grain { position: relative }` and the `::before` pseudo-element is set once per element regardless of how many times the class appears), so this is a no-op rather than a bug. Same for `shadow-card` — Card doesn't include shadow by default, so that one is intentional.

**Fix:** Remove the redundant `paper-grain` from the className for clarity:

```tsx
<Card className="shadow-card p-4 flex flex-col gap-1.5">
```

The same pattern exists at `VoiceCaptureTab.tsx:72` (`<Card className="paper-grain shadow-card border-l-[3px] border-primary/60 ...">`). Both are cosmetically harmless but signal "we don't trust the primitive" to readers.

### IN-05: `recipes.url` `Info` icon helper has no semantic role/aria

**File:** `frontend/components/UrlCaptureTab.tsx:84`
**Issue:** The `<Info>` icon has `aria-hidden`, but the surrounding `<div>` is a styled note rather than an `<aside>` / `role="note"`. Screen readers will announce the helper text as part of the form flow without a regional landmark. The PhotoUploader's `<Loader2>` and similar icons follow the same pattern, so this is consistent — but for a French-only audience that may include screen-reader users, wrapping helper-callout patterns in a semantic role is a small a11y polish.

**Fix:** Optional — `<aside role="note">` or `<div role="note">` on the helper container. Worth a one-line pass across all three new helper-style callouts (URL helper, voice idle helper card, photo empty heading). Defer to a Phase 7+ a11y sweep if there isn't budget here.

---

_Reviewed: 2026-05-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
