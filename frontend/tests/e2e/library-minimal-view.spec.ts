import { test, expect } from '@playwright/test';

// Phase 40 LIB-01 — assert /recipes minimal mode:
//   1. Selecting the third switch button renders a text-only list (no <img>).
//   2. The choice persists across page reload via localStorage.
//
// Authenticated synthetic-seed context (no special cookies — playwright config
// supplies the SEED_TOKEN bearer for the seeded household).

test.describe('library — minimal view (la grille text-only)', () => {
  test.beforeEach(async ({ page }) => {
    // Library lives at /recipes (the recipe library page).
    await page.goto('/recipes');
    // Wait for the view switch to mount so we can interact with it.
    await expect(page.getByRole('radiogroup', { name: 'Vue de la bibliothèque' })).toBeVisible();
  });

  test('selecting minimal mode renders rows without photos', async ({ page }) => {
    // Third button in the radiogroup is the minimal/text-only mode.
    const switchGroup = page.getByRole('radiogroup', { name: 'Vue de la bibliothèque' });
    const minimalButton = switchGroup.getByRole('radio', { name: 'Vue texte' });
    await minimalButton.click();
    await expect(minimalButton).toHaveAttribute('aria-checked', 'true');

    // Once minimal is active, the recipe list region has zero <img> elements.
    // The header still contains BrandIcon as an SVG, not img, so we scope to
    // the list region by selecting the wrapping div around the rows. We
    // approximate by counting imgs in the main section.
    const section = page.locator('section').first();
    await expect(section.locator('img')).toHaveCount(0);

    // Numbered prefixes `01` and `02` are visible (assuming the seed has ≥2
    // recipes, which the synthetic seed does — 21 recipes per CLAUDE.md).
    await expect(page.getByText('01', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('02', { exact: true }).first()).toBeVisible();
  });

  test('minimal mode persists across page reload', async ({ page }) => {
    const switchGroup = page.getByRole('radiogroup', { name: 'Vue de la bibliothèque' });
    const minimalButton = switchGroup.getByRole('radio', { name: 'Vue texte' });
    await minimalButton.click();
    await expect(minimalButton).toHaveAttribute('aria-checked', 'true');

    await page.reload();

    // After reload, the minimal mode button is active again and the list
    // region still has no images.
    const switchGroupAfter = page.getByRole('radiogroup', { name: 'Vue de la bibliothèque' });
    const minimalAfter = switchGroupAfter.getByRole('radio', { name: 'Vue texte' });
    await expect(minimalAfter).toHaveAttribute('aria-checked', 'true');

    const section = page.locator('section').first();
    await expect(section.locator('img')).toHaveCount(0);
  });
});
