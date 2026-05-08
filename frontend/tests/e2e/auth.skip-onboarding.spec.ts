import { test, expect } from '@playwright/test';

// TEST-02 — sanity check: Bearer auto-injected by playwright.config.ts
// (D-01 fallback path) authenticates Luca, so navigating to '/' lands on
// HomeDecide rather than the onboarding redirect. If this spec fails,
// every other spec in the `seeded` project will also fail — keep it first
// in alphabetical order so its failure surfaces fastest.
test.describe('auth.skip-onboarding', () => {
  test('Bearer header bypasses onboarding redirect', async ({ page }) => {
    await page.goto('/');
    // We must NOT have been redirected to onboarding.
    await expect(page).not.toHaveURL(/\/onboarding\//);
    // Render-positive assertion: the BottomNav landmark is visible (it is
    // hidden on /onboarding/* per BottomNav.tsx#76-77, so its presence is
    // the cleanest authenticated-state probe that doesn't rely on backend
    // data). aria-label "Navigation principale" is verbatim from
    // BottomNav.tsx#85 (no new aria-label added in Phase 10).
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav).toBeVisible();
    // Catches "BottomNav rendered but pushed offscreen / hidden behind safe-
    // area inset" regressions — toBeVisible() alone passes on display:block
    // elements regardless of viewport position.
    await expect(nav).toBeInViewport();
  });
});
