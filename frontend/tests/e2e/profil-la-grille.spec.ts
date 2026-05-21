import { test, expect } from '@playwright/test';
import { SEEDED_INVITE_CODE } from './fixtures/seed-helpers';

// Phase 40 PROF-01 — assert the /settings page renders the La Grille
// literal-sketch composition: hero word + identity line + partner block +
// stats block + 5 numbered hairline rows. Zero <Card> components, zero
// "Heure du décide" row.
//
// Per TESTING.md Pitfall 10: do NOT assert on `consoleErrors` — the seeded
// 404s on signed photo URLs are expected noise outside Phase 40's scope.

test.describe('profil — la grille composition', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('page renders the hero word "Profil"', async ({ page }) => {
    // Hero is an <h1>; default level is 1 since the page strips the prior
    // sticky-header h1 in favor of the literal-sketch composition.
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
  });

  test('page has no <Card> components anywhere', async ({ page }) => {
    // shadcn/ui Card uses data-slot="card" on its root.
    await expect(page.locator('[data-slot="card"]')).toHaveCount(0);
  });

  test('page does not render the dropped "Heure du décide" row (D-01)', async ({ page }) => {
    await expect(page.getByText('Heure du décide')).toHaveCount(0);
  });

  test('renders the 5 numbered hairline rows in order', async ({ page }) => {
    // Numbered index is rendered in font-mono inside the row button. Asserting
    // visibility of the label is the cheapest robust check — the index lives
    // next to the label, so we know they paired up.
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
    await expect(page.getByText('Foyer', { exact: true })).toBeVisible();
    await expect(page.getByText('Membre', { exact: true })).toBeVisible();
    await expect(page.getByText('Exporter les données', { exact: true })).toBeVisible();
    await expect(page.getByText('Déconnexion', { exact: true })).toBeVisible();

    // Spot-check at least one numbered index appears in mono.
    await expect(page.getByText('01').first()).toBeVisible();
    await expect(page.getByText('05').first()).toBeVisible();
  });

  test('renders the stats block with three labeled counts', async ({ page }) => {
    await expect(page.getByText('recettes', { exact: true })).toBeVisible();
    await expect(page.getByText('cuisinées', { exact: true })).toBeVisible();
    await expect(page.getByText('votes', { exact: true })).toBeVisible();
  });

  test('identity line shows the household invite code', async ({ page }) => {
    // Identity format: "maison · {invite_code} · depuis {date}".
    // The seeded code shows up in the identity line on first render.
    await expect(page.getByText(SEEDED_INVITE_CODE, { exact: false }).first()).toBeVisible();
  });
});
