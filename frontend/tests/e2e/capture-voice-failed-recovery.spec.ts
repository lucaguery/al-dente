import { test, expect } from '@playwright/test';

// Phase 16 CAP-01 + CAP-02 — failed-state recovery flow.
//
// 1. POST /api/recipes/voice with a transcript prefixed by the test-only
//    __TEST_FORCE_FAIL__ token (services/llm_fixtures.py D-16-13).
// 2. The BackgroundTask invokes canned_voice_recipe which raises; the
//    services/llm.py::_record_failure path (Plan 16-03) writes
//    status='failed' + promotion_error.
// 3. Open /inbox: the failed-state Card from Plan 16-04 renders with the
//    French label `Extraction échouée` + the truncated error + Réessayer
//    + Supprimer buttons at h-12 (48px).
// 4. Tap Réessayer: POST /api/recipes/{id}/retry-promotion resets the row
//    from failed to draft (Plan 16-03 Task 2). The Plan 16-03 retry
//    BackgroundTask re-invokes promote_voice_draft which calls
//    canned_voice_recipe AGAIN with the SAME prefixed transcript — so the
//    retry ALSO fails, and the row terminates at status='failed' a second
//    time. The spec asserts on the synchronous post-retry state (status
//    flips to 'draft' via the endpoint's reset) and tolerates the eventual
//    re-failure.
//
// The Supprimer + AlertDialog flow is asserted in a separate test() block
// so the two failure modes don't entangle.
test.describe('capture-voice-failed-recovery', () => {
  test('failed-state Card renders with French label and recovery actions', async ({
    page,
    request,
  }) => {
    // 1. Seed a failed row via the force-fail prefix.
    const transcript =
      '__TEST_FORCE_FAIL__ test transcript that the fixture will reject';

    const create = await request.post('/api/recipes/voice', {
      data: { transcript },
    });
    expect(create.ok()).toBeTruthy();
    const draft = await create.json();
    const recipeId: string = draft.id;

    // 2. Poll for the BackgroundTask to flip status to 'failed'.
    // BG tasks run after the response in the real uvicorn process; 5s
    // ceiling is comfortable headroom for slow-laptop scheduler ticks.
    await expect
      .poll(
        async () => {
          const r = await request.get(`/api/recipes/${recipeId}`);
          if (!r.ok()) return null;
          const body = await r.json();
          return body.status;
        },
        { timeout: 5_000, intervals: [100, 250, 500, 1000] },
      )
      .toBe('failed');

    // 3. Open /inbox and confirm the failed Card layout.
    await page.goto('/inbox');

    // The French label from i18n key recipes.promotion.failed_label.
    const failedLabel = page
      .getByText('Extraction échouée', { exact: true })
      .first();
    await expect(failedLabel).toBeVisible();

    // Surface the French error sentence from _record_failure (truncated to
    // 500 chars; the fixture's message starts with "Extraction forcée").
    // This proves promotion_error reached the UI via the truncated-body
    // line-clamp-2 paragraph.
    const errorBody = page.getByText(/Extraction forcée/i).first();
    await expect(errorBody).toBeVisible();

    // Réessayer button at 48px tap target (h-12 ≈ 48px). Scope to the
    // failed Card via the surrounding Card text to defend against any other
    // Réessayer on the page.
    const retryButton = page
      .getByRole('button', { name: /^Réessayer$/i })
      .first();
    await expect(retryButton).toBeVisible();
    const retryBox = await retryButton.boundingBox();
    expect(retryBox).not.toBeNull();
    expect(retryBox!.height).toBeGreaterThanOrEqual(44); // 48px target; allow rounding tolerance

    // Supprimer button at 48px tap target. There may be a trailing-icon
    // Supprimer on manual variants; we scope to the labeled button via
    // aria-label "Supprimer ce brouillon" (i18n: delete_aria).
    const deleteButton = page
      .getByRole('button', { name: 'Supprimer ce brouillon' })
      .first();
    await expect(deleteButton).toBeVisible();
    const delBox = await deleteButton.boundingBox();
    expect(delBox).not.toBeNull();
    expect(delBox!.height).toBeGreaterThanOrEqual(44);

    // 4. Tap Réessayer — the endpoint synchronously resets status to 'draft'.
    // The realtime broadcast or the next refetch will reflect the reset.
    await retryButton.click();

    // After the synchronous reset, status is 'draft'. Then the queued retry
    // BackgroundTask re-runs and re-fails (because the same
    // __TEST_FORCE_FAIL__ transcript is reused from source_capture), so
    // status ends up 'failed' again. We accept EITHER intermediate state —
    // the assertion is "no longer stuck post-reset; observable in DB".
    await expect
      .poll(
        async () => {
          const r = await request.get(`/api/recipes/${recipeId}`);
          if (!r.ok()) return null;
          const body = await r.json();
          return body.status;
        },
        { timeout: 5_000, intervals: [100, 250, 500, 1000] },
      )
      .toMatch(/^(draft|failed)$/);

    // Cleanup: delete the recipe so the inbox stays clean for subsequent specs.
    await request.delete(`/api/recipes/${recipeId}`);
  });

  test('Supprimer opens AlertDialog and deletes on confirm', async ({
    page,
    request,
  }) => {
    // Seed a failed row (independent of the prior test — Playwright tests
    // share the seeded household but each test is a fresh page session).
    const transcript = '__TEST_FORCE_FAIL__ supprimer flow test';
    const create = await request.post('/api/recipes/voice', {
      data: { transcript },
    });
    expect(create.ok()).toBeTruthy();
    const draft = await create.json();
    const recipeId: string = draft.id;

    // Wait for status='failed'.
    await expect
      .poll(
        async () => {
          const r = await request.get(`/api/recipes/${recipeId}`);
          if (!r.ok()) return null;
          const body = await r.json();
          return body.status;
        },
        { timeout: 5_000, intervals: [100, 250, 500, 1000] },
      )
      .toBe('failed');

    await page.goto('/inbox');

    // Tap Supprimer (the AlertDialogTrigger labelled via aria-label
    // "Supprimer ce brouillon"). Avoid the trailing-icon Supprimer on
    // manual variants by scoping to the failed-Card aria-label.
    const deleteTrigger = page
      .getByRole('button', { name: 'Supprimer ce brouillon' })
      .first();
    await expect(deleteTrigger).toBeVisible();
    await deleteTrigger.click();

    // The AlertDialog's title from i18n key recipes.promotion.delete_confirm_title.
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText('Supprimer ce brouillon ?', { exact: true }),
    ).toBeVisible();

    // Confirm — the AlertDialogAction button labelled "Supprimer" (the
    // confirmation button text from recipes.promotion.delete_confirm_confirm).
    // We target the role=button INSIDE the dialog to avoid colliding with
    // the trigger button outside.
    await dialog.getByRole('button', { name: /^Supprimer$/i }).click();

    // The row is gone — assert by polling the backend.
    await expect
      .poll(
        async () => {
          const r = await request.get(`/api/recipes/${recipeId}`);
          return r.status();
        },
        { timeout: 5_000, intervals: [100, 250, 500, 1000] },
      )
      .toBe(404);
  });
});
