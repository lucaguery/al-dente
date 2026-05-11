import { test, expect } from '@playwright/test';
import {
  SEEDED_MEMBER_LUCA,
  SEED_AUTH_TOKEN,
  getApiBase,
} from './fixtures/seed-helpers';

// Phase 18 IDM-02 — Settings inline rename happy path (single-browser).
//
// Cross-phone realtime is deferred per D-18-18 (CONTEXT.md). The Playwright
// assertion is the same-phone half: tap the Pencil affordance on the Membre
// Card, type a new name, press Enter, expect the displayed name + Sonner
// success toast.
//
// i18n strings asserted below are PINNED VERBATIM from
// frontend/lib/i18n/fr.json `settings.member.*` (read 2026-05-11, post 18-02).
// If those keys move, this spec must update in the same commit
// (CLAUDE.md locked-vocabulary drift rule).
//
// Plan 18-02 §Task 2 wires the UI:
//   - Pencil <Button aria-label={t("member.rename_aria")}>
//       → "Modifier mon prénom"
//   - <Input aria-label={t("member.rename_label")}, autoFocus>
//       → "Ton prénom"
//   - Submit on Enter via onSubmitRename() → renameMe() → toast.success
//       → "Nom mis à jour"
//
// Spec runs under the `seeded` Playwright project (storageState pre-sets the
// aldente_auth cookie + Bearer header is injected — see playwright.config.ts).
// Filename follows the existing settings.spec.ts convention.
const RENAME_PENCIL_ARIA = 'Modifier mon prénom';
const RENAME_INPUT_ARIA = 'Ton prénom';
const RENAME_SUCCESS_TOAST = 'Nom mis à jour';

// Random per-run suffix so reruns within the same DB don't trip the 409
// uniqueness check. The seeded household has 2 members: SEEDED_MEMBER_LUCA
// ("Luca") and SEEDED_MEMBER_PARTNER ("Partner"). The suffix is timestamp-based
// so it cannot collide with either.
const RENAMED_NAME = `Luca-test-${Date.now()}`;

test.describe('settings — IDM-02 member rename', () => {
  test('rename via inline edit reflects on the Settings surface', async ({
    page,
  }) => {
    await page.goto('/settings');

    // Sanity: starting state is the seeded fixture ("Luca" is rendered on the
    // Membre Card).
    await expect(
      page.getByText(SEEDED_MEMBER_LUCA, { exact: true }),
    ).toBeVisible();

    // Tap the Pencil affordance to enter rename mode. The Button is the only
    // element on the page with this aria-label — `getByRole('button', { name })`
    // resolves uniquely.
    const pencil = page.getByRole('button', { name: RENAME_PENCIL_ARIA });
    await expect(pencil).toBeVisible();
    await pencil.click();

    // The Input now replaces the name <span>; autoFocus → focused on mount.
    // The Input is the only textbox with this aria-label on the Settings page.
    const input = page.getByRole('textbox', { name: RENAME_INPUT_ARIA });
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    // Replace the value atomically. Playwright's .fill() clears first so the
    // pre-filled "Luca" doesn't get concatenated. Then submit via Enter
    // (matches the keyboard path users will most often hit).
    await input.fill(RENAMED_NAME);
    await input.press('Enter');

    // Sonner toast region announces "Nom mis à jour" — the success branch in
    // onSubmitRename() (Plan 18-02 §Task 2). Toast text is verbatim from
    // fr.json settings.member.rename_success_toast.
    await expect(
      page.getByText(RENAME_SUCCESS_TOAST),
    ).toBeVisible({ timeout: 5000 });

    // After refresh() reconciles, the displayed name in the Membre Card is
    // the new value. Use { exact: true } so we don't false-match the toast
    // text or any other "Luca" substring that could be lingering.
    await expect(
      page.getByText(RENAMED_NAME, { exact: true }),
    ).toBeVisible({ timeout: 5000 });
  });

  // Teardown: restore the seeded name via direct PATCH so the next test in
  // the suite sees the fixture in its expected shape. The PATCH endpoint is
  // member-scoped via `current_member` (D-18-01) and accepts the Bearer token
  // fallback path (backend/app/auth.py D-01) — same SEED_AUTH_TOKEN used by
  // the seeded project's extraHTTPHeaders. Done imperatively (not through the
  // UI) so it stays resilient to UI changes downstream of 18-02.
  //
  // Per Plan 18-04 threat T-18-04-01: if this teardown fails, the next
  // run's `expect(SEEDED_MEMBER_LUCA).toBeVisible()` surfaces the leak
  // immediately — no silent state drift.
  test.afterAll(async ({ request }) => {
    const apiBase = getApiBase();
    await request.patch(`${apiBase}/households/me`, {
      headers: { Authorization: `Bearer ${SEED_AUTH_TOKEN}` },
      data: { name: SEEDED_MEMBER_LUCA },
    });
  });
});
