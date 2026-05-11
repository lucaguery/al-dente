import { test, expect } from '@playwright/test';

// Phase 16 CAP-03 / D-16-14 — ingredient parser round-trip.
//
// The full-form ingredients textarea accepts free-text lines, one per line.
// The formValuesToBody parser at frontend/components/RecipeForm.tsx (fixed
// in Plan 16-02) uses a unit whitelist:
//   - "4 tomates" → {name: "tomates", quantity: 4, unit: null}
//   - "1 oignon rouge" → {name: "oignon rouge", quantity: 1, unit: null}
//   - "500 g de farine" → {name: "de farine", quantity: 500, unit: "g"}
//   - "2 c.s. d'huile" → {name: "d'huile", quantity: 2, unit: "c.s."}
//
// The recipe-detail page renders each entry as `${qty}${unit} ${name}` (see
// frontend/app/recipes/[id]/page.tsx:290-300). The pre-fix bug rendered
// "4 tomates 4 tomates" because the greedy regex captured "tomates" as both
// unit AND fell back to the original line as name.
//
// This spec drives the form via the UI (textarea + submit) and asserts the
// detail page renders each line ONCE — with a negative assertion against
// the duplication pattern as the regression canary.
test.describe('recipe-form-ingredient-parser', () => {
  test('four French ingredient lines round-trip without duplication', async ({
    page,
  }) => {
    const title = `Parser spec ${Date.now()}`;
    const ingredientsText = [
      '4 tomates',
      '1 oignon rouge',
      '500 g de farine',
      "2 c.s. d'huile",
    ].join('\n');

    // 1. Open /recipes/new and switch to the "Complète" tab.
    await page.goto('/recipes/new');

    // The full-form tab is labelled "Complète" (i18n key recipes.new.tab_full).
    const completeTab = page.getByRole('tab', { name: /^Complète$/i });
    await expect(completeTab).toBeVisible();
    await completeTab.click();

    // Fill in the title (required). The RecipeForm input has htmlFor="rf-title"
    // bound to the "Titre" Label (i18n key recipes.new.title_label).
    const titleInput = page.getByLabel(/^Titre$/i);
    await titleInput.fill(title);

    // Fill the ingredients textarea. The Label is "Ingrédients (un par ligne)"
    // (i18n key recipes.new.ingredients_label).
    const ingredientsTextarea = page.getByLabel(/Ingrédients \(un par ligne\)/i);
    await ingredientsTextarea.fill(ingredientsText);

    // 2. Submit via the sticky CTA. The full-form submit label is
    // "Enregistrer la recette" (i18n key recipes.new.submit_full); the
    // RecipeForm renders the button at h-12 inside the fixed submitBar.
    const submitButton = page.getByRole('button', {
      name: /^Enregistrer la recette$/i,
    });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // 3. submitFull (frontend/app/recipes/new/page.tsx:119-130) calls
    //    router.replace(`/recipes/${r.id}`) on success — we land directly
    //    on the recipe-detail page.
    await page.waitForURL(/\/recipes\/[a-f0-9-]+$/, { timeout: 10_000 });

    // 4. Confirm the Ingrédients list renders each entry ONCE with no
    //    duplication. The detail page's Ingrédients section uses the
    //    "Ingrédients" heading (i18n key recipes.detail.section_ingredients).
    const ingredientsHeading = page.getByRole('heading', {
      name: /^Ingrédients$/i,
    });
    await expect(ingredientsHeading).toBeVisible();

    // CAP-03 bug regression canary: the pre-fix detail page rendered
    // "4 tomates 4 tomates" for the first line. Must NOT be visible.
    await expect(page.getByText('4 tomates 4 tomates')).toHaveCount(0);

    // Positive assertions — each line renders ONCE.
    //
    // Per the detail-page format `${qty}${unit} ${name}` (note: unit is
    // prefixed with a leading space when present):
    //   - "4 tomates" → qty="4", unit=null, lead="4", name="tomates" → "4 tomates"
    //   - "1 oignon rouge" → qty="1", unit=null, lead="1", name="oignon rouge" → "1 oignon rouge"
    //   - "500 g de farine" → qty="500", unit="g", lead="500 g", name="de farine" → "500 g de farine"
    //   - "2 c.s. d'huile" → qty="2", unit="c.s.", lead="2 c.s.", name="d'huile" → "2 c.s. d'huile"
    //
    // getByText with exact:false (default) accommodates the JSX template's
    // trailing space in `{lead ? `${lead} ` : ''}{ing.name}`.
    await expect(page.getByText('4 tomates', { exact: false })).toHaveCount(1);
    await expect(
      page.getByText('1 oignon rouge', { exact: false }),
    ).toHaveCount(1);
    await expect(
      page.getByText('500 g de farine', { exact: false }),
    ).toHaveCount(1);
    await expect(
      page.getByText("2 c.s. d'huile", { exact: false }),
    ).toHaveCount(1);

    // Cleanup: hard-delete the recipe via the API so the seeded household
    // stays clean for subsequent specs.
    const recipeIdMatch = page.url().match(/\/recipes\/([a-f0-9-]+)/);
    if (recipeIdMatch) {
      const recipeId = recipeIdMatch[1];
      await page.request.delete(`/api/recipes/${recipeId}`);
    }
  });
});
