import { test, expect } from '@playwright/test';
import {
  SEEDED_INVITE_CODE,
  SEEDED_HOUSEHOLD_NAME,
  SEEDED_MEMBER_LUCA,
} from './fixtures/seed-helpers';

// TEST-02 — settings page shows invite code, member name, household name
// (read-only per 01.1 D-08).
test.describe('settings', () => {
  test('settings shows seeded invite code, member, and household', async ({
    page,
  }) => {
    await page.goto('/settings');

    const inviteCode = page.getByText(SEEDED_INVITE_CODE /* "TEST01" */);
    await expect(inviteCode).toBeVisible();
    // The invite code is the load-bearing surface for second-member onboarding;
    // a layout regression that pushes it below the viewport (or behind sticky
    // chrome) would silently break the join flow without throwing. Pin it.
    await expect(inviteCode).toBeInViewport();
    await expect(
      page.getByText(SEEDED_MEMBER_LUCA /* "Luca" */),
    ).toBeVisible();
    await expect(
      page.getByText(SEEDED_HOUSEHOLD_NAME /* "Foyer Test" */),
    ).toBeVisible();
  });
});
