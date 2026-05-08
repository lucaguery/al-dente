import { test, expect } from '@playwright/test';

// TEST-02 — /cooking-logs history view. The page is shipped (Phase 8 COOK-10)
// but its data source — GET /cooking-logs (list) — is NOT wired backend-side.
// frontend/app/cooking-logs/page.tsx:11-13 explicitly notes: "(only POST
// /recipes/{id}/cook, GET /cooking-logs/active, and PUT /cooking-logs/{id}
// exist today...). The route ships the shell + EmptyState fallback now".
// At runtime the page renders "Aucune recette pour le moment" → seed titles
// are not visible because they're never fetched. Re-enable once the list
// endpoint ships.
test.describe('cooking-log-history', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- backend list endpoint deferred (see frontend/app/cooking-logs/page.tsx:11-13)
  test.fixme(
    'history page lists all 3 seeded logs by recipe title',
    async ({ page }) => {
      await page.goto('/cooking-logs');
      await expect(
        page.getByText('Ragu bolognese', { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText('Poulet au citron', { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText('Burger classique', { exact: true }).first(),
      ).toBeVisible();
    },
  );

  test('history page renders shell + empty-state fallback (until list endpoint ships)', async ({
    page,
  }) => {
    await page.goto('/cooking-logs');
    // Page renders without redirecting to onboarding. Empty-state copy is
    // the "no cooked recipes yet" message until GET /cooking-logs lands.
    await expect(
      page.getByText('Aucune recette pour le moment'),
    ).toBeVisible();
  });
});
