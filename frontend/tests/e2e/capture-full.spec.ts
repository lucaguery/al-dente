import { test, expect } from '@playwright/test';

// TEST-02 (D-07 full) — POST /recipes with full structured payload returns
// status='structured' (no BackgroundTask promotion needed; the full form
// IS the structured shape). Spec asserts the recipe lands in the library.
test.describe('capture-full', () => {
  test('full capture creates structured recipe visible in library', async ({
    page,
    request,
  }) => {
    const title = `Full spec ${Date.now()}`;
    const create = await request.post('/api/recipes', {
      data: {
        title,
        ingredients: [
          { name: 'tomate', quantity: 4, unit: null },
          { name: 'mozzarella', quantity: 200, unit: 'g' },
        ],
        steps: [
          'Couper les tomates.',
          'Disposer la mozzarella.',
          'Assaisonner.',
        ],
        prep_time_minutes: 10,
        servings: 2,
        // Locked vocabulary literals — verbatim from app/models/enums.py:
        cuisine: 'italian',
        mood: ['light', 'quick'],
        main_protein: 'none',
        seasonality: ['summer'],
        source_capture: { type: 'manual', payload: { title } },
      },
    });
    expect(create.ok()).toBeTruthy();
    const created = await create.json();
    expect(created.status).toBe('structured');

    await page.goto('/recipes');
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  });
});
