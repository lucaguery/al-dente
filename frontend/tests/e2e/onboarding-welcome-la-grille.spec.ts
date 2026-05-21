import { test, expect } from '@playwright/test';

// Phase 40 ONBO-01 — assert /onboarding/welcome renders the La Grille
// wordmark-centric composition: BrandIcon + wordmark + italic-emphasis
// tagline + sub-tagline + primary filled-dark CTA + ghost hairline CTA +
// footer marketing line. Zero <Card> components.
//
// Unauthenticated context — no seed cookie needed; OnboardingGuard renders
// /onboarding/welcome directly when the session is missing.

test.describe('onboarding welcome — la grille composition', () => {
  test.beforeEach(async ({ context, page }) => {
    // Clear the aldente_auth cookie so the OnboardingGuard renders the
    // welcome page instead of routing to /onboarding/welcome from a
    // post-onboarding hop.
    await context.clearCookies();
    await page.goto('/onboarding/welcome');
  });

  test('page has no <Card> components', async ({ page }) => {
    await expect(page.locator('[data-slot="card"]')).toHaveCount(0);
  });

  test('renders the Al Dente. wordmark as h1', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: /Al Dente/i }),
    ).toBeVisible();
  });

  test('tagline has italic emphasis on "ce soir"', async ({ page }) => {
    const em = page.locator('em').filter({ hasText: 'ce soir' });
    await expect(em).toHaveCount(1);
    await expect(em).toBeVisible();
  });

  test('sub-tagline is visible', async ({ page }) => {
    await expect(page.getByText(/Une app pour deux/i)).toBeVisible();
  });

  test('primary CTA links to /onboarding/create', async ({ page }) => {
    const create = page.getByRole('link', { name: /Créer notre foyer/i });
    await expect(create).toBeVisible();
    await expect(create).toHaveAttribute('href', '/onboarding/create');
  });

  test('ghost CTA links to /onboarding/join', async ({ page }) => {
    const join = page.getByRole('link', { name: /Rejoindre avec un code/i });
    await expect(join).toBeVisible();
    await expect(join).toHaveAttribute('href', '/onboarding/join');
  });

  test('footer marketing line is visible', async ({ page }) => {
    await expect(
      page.getByText(/cuisine partagée.*0 frais.*0 pub/i),
    ).toBeVisible();
  });
});
