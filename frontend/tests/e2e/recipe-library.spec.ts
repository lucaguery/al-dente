import { test, expect } from '@playwright/test';

// TEST-02 — recipe library list + search. The seed (10-03) puts 21+
// recipes in the library; we don't assert all 21 (brittle to seed
// changes), just that several distinct titles render. Then search for
// 'Tarte' which matches only 'Tarte Tatin' in the seeded corpus.
test.describe('recipe-library', () => {
  test('library lists multiple seeded recipes', async ({ page }) => {
    await page.goto('/recipes');
    // Assert ≥ 5 distinct seeded titles render (proves grid is populated).
    await expect(
      page.getByText('Risotto aux champignons').first(),
    ).toBeVisible();
    await expect(page.getByText('Coq au vin').first()).toBeVisible();
    await expect(page.getByText('Tarte Tatin').first()).toBeVisible();
    await expect(page.getByText('Sushi saumon').first()).toBeVisible();
    await expect(page.getByText('Tacos au boeuf').first()).toBeVisible();
  });

  test('search filters results to matching title', async ({ page }) => {
    await page.goto('/recipes');

    // SearchInput renders an Input with aria-label = t('search_placeholder')
    // which resolves to "Chercher par titre ou ingrédient" in fr.json#144.
    // The component does not set role="search" on the input, so we target
    // by the accessible name rather than role='searchbox' (which would
    // require a literal type="search" attribute).
    const search = page.getByLabel(/Chercher par titre/);
    await search.fill('Tarte');

    // After search, "Tarte Tatin" still visible.
    await expect(page.getByText('Tarte Tatin').first()).toBeVisible();
    // And a recipe that doesn't match is no longer visible.
    await expect(page.getByText('Risotto aux champignons')).toHaveCount(0);
  });
});
