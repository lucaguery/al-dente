---
phase: 08-cook-polish
reviewed: 2026-05-08T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - frontend/lib/i18n/fr.json
  - frontend/components/CookingLogFinalize.tsx
  - frontend/components/CookingBanner.tsx
  - frontend/components/RatingPicker.tsx
  - frontend/app/recipes/[id]/page.tsx
  - frontend/components/RecipeCard.tsx
  - frontend/components/SearchInput.tsx
  - frontend/app/recipes/page.tsx
  - frontend/components/CookingLogCard.tsx
  - frontend/app/cooking-logs/page.tsx
findings:
  critical: 0
  warning: 1
  info: 6
  total: 7
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-08
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 8 (Cook polish, Slow Food artisanal v0.2) ships a re-themed cook-time loop spanning recipe detail, library, the new cooking-log history surface, the persistent CookingBanner, and the finalize flow. The four W4 gap closures (COOK-07/08/11/12) are all verified correct:

- **COOK-07** — `CookingBanner.tsx` line 54 uses `<Button asChild className="h-12"><Link href={...}>...</Link></Button>` (no raw `<a>`).
- **COOK-08** — `RatingPicker.tsx` line 68 includes `transition-colors transition-transform duration-100 ease-craft active:scale-95`.
- **COOK-11** — `CookingLogFinalize.tsx` line 83-86 guards `handleSubmit` with `navigator.onLine` and surfaces the new `cooking_log.finalize.offline` key.
- **COOK-12** — `CookingLogFinalize.tsx` line 142 renders the recipe sub-head via the new ICU `cooking_log.finalize.recipe_subhead` key with `{title}` interpolation.

The 2-new-key i18n budget is respected: `fr.json` adds exactly `cooking_log.finalize.offline` (line 332) and `cooking_log.finalize.recipe_subhead` (line 333) — no other strings snuck in. The 48px tap-target floor is met on every interactive control inspected (`h-12` on submit/header buttons, `h-20` on rating cards). No `dangerouslySetInnerHTML`, `eval`, `innerHTML`, debug `console.log`, or `FIXME`/`XXX` markers were detected. The XSS-RecipeContent invariant holds — all dynamic strings render as React children with default escaping.

The single Warning is a pre-existing copy-mismatch on the recipe-detail delete-failure toast (file is in scope because it was touched in Phase 8); the Info items are documented productize-later debt and minor stylistic notes.

## Warnings

### WR-01: Delete-failure toast reuses 404 not-found body copy

**File:** `frontend/app/recipes/[id]/page.tsx:52`
**Issue:** When `deleteRecipe` throws, the catch branch surfaces `toast.error(t("detail_404_body"))` — i.e., the string "Cette recette n'existe pas ou a été supprimée." This implies to the user that the recipe disappeared, when in fact the *delete request* failed (network blip, 5xx, etc.). The recipe is still present locally; misleading the user about its existence is a UX bug. This appears to be pre-existing code surfaced because Phase 8 modified the file, but it remains incorrect and is worth a follow-up. The locked 2-new-key budget for Phase 8 prevents adding a `recipes.delete_failed` key now, so the cleanest deferral is to reuse `onboarding.errors.network` (already in `fr.json` line 313: "Connexion impossible. Réessaie dans un instant.") which conveys the right semantic without a new key.
**Fix:**
```tsx
// At top, alongside the existing useTranslations call:
const tErr = useTranslations("onboarding.errors");

// In handleDelete catch:
} catch {
  toast.error(tErr("network"));
  setDeleting(false);
}
```

## Info

### IN-01: Cooking-log history empty state reuses recipe library copy

**File:** `frontend/app/cooking-logs/page.tsx:122-125`
**Issue:** The empty state passes `tRecipes("empty_heading")` ("Aucune recette pour le moment") and `tRecipes("empty_body")` ("Ajoute ta première recette pour commencer.") for an empty cooking-log history. Semantically, the user has *recipes* but hasn't *cooked* any of them — the copy doesn't fit. The leading file-header comment (line 18-22) acknowledges this is intentional under the locked 2-key budget and tags it `TODO(productize)`. No action required for v0.2 ship; flagging so it lands on the productize-later list. Consider adding inline `// TODO(productize):` near the empty-state JSX so a future grep surfaces it alongside the comment block.
**Fix:** Add an inline `TODO(productize)` near the JSX (line 122) referencing the future `cooking_logs.empty_*` keys, and document on the productize backlog.

### IN-02: 404 toast uses neutral `toast()` while 403 uses `toast.error()`

**File:** `frontend/components/CookingLogFinalize.tsx:100`
**Issue:** The error handler treats 404 as informational (`toast(t("save_404"))`) and 403 as error (`toast.error(t("save_403"))`). The asymmetry reads as intentional — 404 means the log was already finalized or deleted (informational state change, redirect after 2s), 403 means cross-household access (genuine error). Worth a one-line comment so the reasoning isn't forgotten.
**Fix:**
```tsx
// 404 == log was concurrently finalized/deleted; informational not error.
if (message.startsWith("404")) {
  toast(t("save_404"));
  setTimeout(() => router.push("/"), 2000);
}
```

### IN-03: Redundant nullish coalescing on `Error.message`

**File:** `frontend/components/CookingLogFinalize.tsx:98`
**Issue:** `(e as Error).message ?? ""` — `Error.message` is always a `string` per the Error spec; the `?? ""` branch is unreachable. Stylistic only.
**Fix:** `const message = (e as Error).message;` (or destructure: `const { message } = e as Error;`).

### IN-04: `aria-describedby` points to a heading rather than a helper

**File:** `frontend/components/CookingLogFinalize.tsx:201`
**Issue:** When the submit button is disabled (no rating), `aria-describedby={!rating ? "rating-heading" : undefined}` references the heading "Comment c'était ?". Screen readers will announce the heading text as the description, but the actual disabled-reason copy lives in `t("rating_helper")` ("Choisis une note pour pouvoir finaliser."). Pointing at the helper element instead would announce the actual reason. The current pattern is functional (sighted-user UX is unaffected; AT users still get a hint via the heading text) — flagging as a low-priority a11y refinement.
**Fix:** Add `id="rating-helper"` to the helper `<p>` (line 169-171), then use `aria-describedby={!rating ? "rating-helper" : undefined}` on the button.

### IN-05: Missing `eslint-disable-next-line react-hooks/exhaustive-deps`

**File:** `frontend/components/SearchInput.tsx:63`
**Issue:** The mount-only effect (line 55-63) uses `[]` deps but reads `callbackRef.current` — eslint's `react-hooks/exhaustive-deps` will not flag the ref read, and the empty-deps mount-only pattern is intentional (initial fetch). However, the *intent* (mount-only) is unstated. A leading comment or explicit lint-disable would document the deliberate choice and prevent a future contributor from "fixing" the deps array.
**Fix:**
```tsx
// Intentionally mount-only: initial empty-query fetch. Latest onQueryChange
// is read via callbackRef to avoid re-arming the debounce on parent re-renders.
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { /* ... */ }, []);
```

### IN-06: Hardcoded `fr-FR` locale in section-header formatter

**File:** `frontend/app/cooking-logs/page.tsx:50`
**Issue:** `new Intl.DateTimeFormat("fr-FR", { ... })` hardcodes the French locale outside the `next-intl` pipeline. The codebase elsewhere uses `formatRelativeFr` (also hardcoded fr-FR) so this is internally consistent with the v0.1 "French only" decision. Worth a `// TODO(productize)` marker so the multi-locale audit surfaces it later.
**Fix:**
```tsx
// TODO(productize): when multi-locale lands, replace fr-FR with the
// resolved next-intl locale (next-intl/server `getLocale()` in RSC, or
// useLocale() in client components).
function formatSectionHeaderFr(date: Date): string { /* ... */ }
```

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
