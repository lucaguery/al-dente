import { test, expect } from '@playwright/test';

// TEST-02 — drafts inbox renders, draft rows are clickable, click routes
// to the recipe detail page. We seed one draft inline (rather than relying
// on the seed CLI's draft state) so the spec is self-contained.
test.describe('drafts-inbox', () => {
  test('inbox shows new draft and navigates to detail', async ({
    page,
    request,
  }) => {
    const title = `Inbox spec ${Date.now()}`;
    const create = await request.post('/api/recipes/quick', {
      data: { title },
    });
    expect(create.ok()).toBeTruthy();

    await page.goto('/inbox');

    // Row visible by title.
    const row = page.getByText(title, { exact: true });
    await expect(row).toBeVisible();

    // Click into detail. Drafts route to the EDIT screen (not the read-only
    // detail), so the title appears as the value of the "Titre" textbox
    // instead of in an <h1>. Verified empirically at runtime — assertion
    // adapted from the original heading expectation.
    await row.click();
    await expect(page).toHaveURL(/\/recipes\/[a-f0-9-]+/);
    await expect(page.getByRole('textbox', { name: 'Titre' })).toHaveValue(
      title,
    );
  });
});
