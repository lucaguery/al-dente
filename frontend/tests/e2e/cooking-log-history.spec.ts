import { test, expect } from '@playwright/test';

// TEST-02 — /cooking-logs history view (Phase 17 / HIST-01 + HIST-02).
// The list endpoint GET /cooking-logs?days=N + the detail route
// /cooking-logs/[id] are both live as of Phase 17 (17-01 backend +
// 17-02 frontend). This spec asserts the 3 seeded logs surface by
// recipe title AND that tapping a card navigates to the detail page.
test.describe('cooking-log-history', () => {
  test(
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

  test('tapping a cooking-log card navigates to the detail page', async ({
    page,
  }) => {
    await page.goto('/cooking-logs');
    // Wait for at least one card to be on the page — list-page fetch must
    // resolve before the click target exists.
    const ragu = page.getByText('Ragu bolognese', { exact: true }).first();
    await expect(ragu).toBeVisible();
    await ragu.click();
    // URL transitions to /cooking-logs/{uuid} — assert via regex so we
    // don't have to know the seeded id. The detail route is distinct from
    // the /finalize child path (won't false-match because $ anchors).
    await expect(page).toHaveURL(/\/cooking-logs\/[0-9a-f-]{36}$/);
    // Detail page renders the rating chip — French label from fr.json
    // cooking_log.rating.* keys. The seed plants "ragu-bolognese" → loved
    // (backend/app/cli/seed.py:452), which maps to "Adoré". Use a regex
    // tolerant to the loved/liked/disliked trio so the assertion doesn't
    // break if seed.py re-shuffles ratings — but we drop the alternates
    // not present in fr.json (per Plan 17-03 explicit instruction).
    await expect(
      page.getByText(/Adoré|Bien|Passable/).first(),
    ).toBeVisible();
  });
});
