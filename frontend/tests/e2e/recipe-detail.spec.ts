import { test, expect } from '@playwright/test';

// TEST-02 — recipe detail page renders hero, ingredients, instruction steps.
// We use the seeded "Risotto aux champignons" recipe (slug
// 'risotto-champignons' in the seed) which has 1 ingredient ("riz arborio")
// and 2 steps ("Nacrer le riz.", "Mouiller au bouillon.") — verified
// against backend/app/cli/seed.py:100-106.
test.describe('recipe-detail', () => {
  test('detail page renders title, ingredients, and numbered steps', async ({
    page,
    request,
  }) => {
    // Look up the seeded recipe id by title via the library API.
    const list = await request.get('/api/recipes?limit=200');
    expect(list.ok()).toBeTruthy();
    const recipes: Array<{ id: string; title: string }> = await list.json();
    const seeded = recipes.find(
      (r) => r.title === 'Risotto aux champignons',
    );
    expect(seeded).toBeDefined();

    await page.goto(`/recipes/${seeded!.id}`);

    // Title in heading.
    await expect(
      page.getByRole('heading', { name: 'Risotto aux champignons' }),
    ).toBeVisible();

    // First seeded ingredient (from seed.py: "riz arborio").
    await expect(page.getByText(/riz arborio/i)).toBeVisible();

    // First seeded step.
    await expect(page.getByText(/Nacrer le riz/)).toBeVisible();
  });
});
