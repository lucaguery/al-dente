import { test, expect } from '@playwright/test';

// TEST-02 — /cooking-logs history view. The seed (10-03) populates 3 logs
// covering the 3 ratings (loved / liked / disliked) on Ragu bolognese,
// Poulet au citron, and Burger classique. Each at a different past date.
//
// Note on titles: the backend seed (10-03) stores ASCII-only titles
// ("Ragu bolognese", not "Ragù bolognese") to dodge encoding traps in
// psql output — verified at backend/app/cli/seed.py:92.
test.describe('cooking-log-history', () => {
  test('history page lists all 3 seeded logs by recipe title', async ({
    page,
  }) => {
    await page.goto('/cooking-logs');

    // All 3 seeded recipe titles render.
    await expect(
      page.getByText('Ragu bolognese', { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('Poulet au citron', { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('Burger classique', { exact: true }).first(),
    ).toBeVisible();
  });
});
