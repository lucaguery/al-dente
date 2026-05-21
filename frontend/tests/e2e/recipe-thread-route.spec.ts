import { test, expect } from '@playwright/test';

// Phase 41 THRD-01 + THRD-02 — recipe thread route + structured-view rip-out.
//
// Locks four invariants:
//   1. /recipes/[id] (structured) no longer mounts <RecipeThread> inline.
//   2. The det-top "N tours" pin is visible on the structured view and
//      routes to /recipes/[id]/thread.
//   3. /recipes/[id]/thread renders the ThreadTopBar (back arrow + crumb +
//      tours pin) and the thread itself.
//   4. The back-arrow on /thread routes explicitly to /recipes/[id] —
//      deterministic Link (D-16), not router.back().
//
// Uses the seeded "Risotto aux champignons" recipe — known to have a
// title that renders so the crumb and N-tours-pin assertions resolve.

async function getSeededRecipeId(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
): Promise<string> {
  const list = await request.get('/api/recipes?limit=200');
  expect(list.ok()).toBeTruthy();
  const recipes: Array<{ id: string; title: string }> = await list.json();
  const seeded = recipes.find((r) => r.title === 'Risotto aux champignons');
  expect(seeded).toBeDefined();
  return seeded!.id;
}

test.describe('recipe-thread-route', () => {
  test('structured view does not mount RecipeThread inline (THRD-02 D-17)', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    await page.goto(`/recipes/${recipeId}`);

    // Wait for the title heading to confirm the page rendered.
    await expect(
      page.getByRole('heading', { name: 'Risotto aux champignons' }),
    ).toBeVisible();

    // The inline thread's composer placeholder is a distinctive marker —
    // recipes.thread.composer_placeholder_detail = "Ajouter au fil de la recette…".
    // If <RecipeThread> were mounted, this textbox would be present.
    await expect(
      page.getByPlaceholder(/Ajouter au fil de la recette/i),
    ).toHaveCount(0);

    // The composer-placeholder-capture wording (capture mode) must also be absent
    // — defensive against accidental mode regression on the structured view.
    await expect(
      page.getByPlaceholder(/Ajouter une note, dicter/i),
    ).toHaveCount(0);
  });

  test('det-top "N tours" pin is visible and routes to /thread (THRD-01)', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    await page.goto(`/recipes/${recipeId}`);

    // aria-label format: "Voir la conversation · {N} tours".
    const pin = page.getByLabel(/Voir la conversation/i);
    await expect(pin).toBeVisible();

    await pin.click();
    await expect(page).toHaveURL(/\/recipes\/[^/]+\/thread$/);
  });

  test('thread route renders back-arrow + crumb + tours pin (THRD-01)', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    await page.goto(`/recipes/${recipeId}/thread`);

    // Back-arrow aria-label.
    await expect(page.getByLabel('Retour à la recette')).toBeVisible();

    // Crumb ends with "· thread" (truncated name + suffix).
    await expect(page.getByText(/· thread/i)).toBeVisible();

    // Tours count pin — "N tours" (Geist Mono, top-bar right slot).
    // The header at the top of the thread page renders one explicit
    // "{count} tours" span; scope the matcher to a top-bar locator to
    // avoid catching any nested matches in the body.
    await expect(page.locator('header').getByText(/\d+ tours/)).toBeVisible();
  });

  test('back-arrow on /thread routes explicitly to /recipes/[id] (THRD-01 D-16)', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    await page.goto(`/recipes/${recipeId}/thread`);

    await page.getByLabel('Retour à la recette').click();

    // Deterministic Link href — must land on /recipes/[id] regardless of
    // browser history. URL is exact (no trailing slash, no /thread).
    await expect(page).toHaveURL(new RegExp(`/recipes/${recipeId}$`));
  });
});
