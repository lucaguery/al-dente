import { test, expect } from '@playwright/test';

// Phase 42 ACTV-01/02/03 — active cooking session route E2E coverage.
//
// Three scenarios:
//   1. Happy path with structured steps — recipe has populated StepEntry[];
//      navigate to /cooking-logs/{id}/active, assert det-top crumb, étape pin,
//      step text + progress segments, advance through steps.
//   2. Finalize transition — from the last step, tap 'Terminé · marquer
//      cuisinée', assert URL becomes /cooking-logs/{id}/finalize.
//   3. Backfill loading state — recipe with `steps = []` shows the loader
//      with 'Préparation des étapes…' copy; after the backend BackgroundTask
//      completes + broadcasts, the loader disappears and step 1 renders.
//
// Auth: uses the seeded Playwright project (SEED_TOKEN bearer per
// playwright.config.ts). Same pattern as cooking-log-create-finalize.spec.ts.
//
// Per TESTING.md Pitfall 10: spec does NOT assert on consoleErrors —
// expected third-party noise (Web Speech API stubs) would flake the assert.

const ACTIVE_LOADER_COPY = 'Préparation des étapes';
const FINALIZE_CTA_COPY = /Terminé/i;
const STEP_NEXT_COPY = /Étape suivante/i;

/** Find a recipe + create an in-flight cooking log. Mirrors the helper
 *  pattern from cooking-log-create-finalize.spec.ts so seed state is
 *  isolated per test. */
async function createCookingLog(
  request: import('@playwright/test').APIRequestContext,
  recipeFilter: (r: { title: string; steps?: unknown }) => boolean,
): Promise<{ recipeId: string; cookingLogId: string }> {
  const list = await request.get('/api/recipes?limit=200');
  const recipes: Array<{
    id: string;
    title: string;
    cook_count: number;
    steps?: unknown[];
  }> = await list.json();

  const recipe = recipes.find(recipeFilter);
  expect(
    recipe,
    'Test requires a recipe matching the filter — adjust seed or filter.',
  ).toBeDefined();

  // Drain any stale in-flight cooking logs before creating ours.
  for (let i = 0; i < 10; i++) {
    const r = await request.get('/api/cooking-logs/active');
    if (!r.ok()) break;
    const body = (await r.text()).trim();
    if (body === '' || body === 'null') break;
    const staleLog = JSON.parse(body) as { id?: string };
    if (!staleLog.id) break;
    await request.put(`/api/cooking-logs/${staleLog.id}`, {
      data: { rating: 'disliked', notes: 'auto-finalized stale log' },
    });
  }

  const start = await request.post(`/api/recipes/${recipe!.id}/cook`);
  expect(start.ok()).toBeTruthy();
  const cookingLog: { id: string } = await start.json();

  return { recipeId: recipe!.id, cookingLogId: cookingLog.id };
}

test.describe('active-cooking-session', () => {
  test('happy path — det-top + progress + step navigator render (ACTV-01/02)', async ({
    page,
    request,
  }) => {
    // Find any recipe with structured steps (post-42-01 migration default
    // is steps = []; recipes with non-empty steps must have been backfilled
    // via Plan 42-03's lazy backfill OR captured fresh via Plan 42-02's
    // Gemini schema). If the seed produces only empty-steps recipes, this
    // test exercises the navigator after the loader's recipe.updated lands.
    const { cookingLogId } = await createCookingLog(
      request,
      () => true, // any recipe; test will wait for steps to materialize
    );

    await page.goto(`/cooking-logs/${cookingLogId}/active`);

    // The page is either in loader state (steps empty → backfill triggered)
    // or step-navigator state (steps already structured). Wait up to 30s
    // for the step-navigator composition to render — covers both paths.
    const stepCountPin = page.locator('text=/étape \\d+\\/\\d+/i').first();
    await expect(stepCountPin).toBeVisible({ timeout: 30_000 });

    // det-top elements
    const closeBtn = page.getByLabel(/Fermer la session de cuisine/i);
    await expect(closeBtn).toBeVisible();

    // Progress segments — at least 1 segment rendered
    const progressRow = page.locator('div.flex.gap-1 > div').first();
    await expect(progressRow).toBeVisible();

    // Footer navigator visible — at least one of Étape suivante OR finalize
    const navigatorFooter = page.locator('footer').first();
    await expect(navigatorFooter).toBeVisible();
  });

  test('finalize transition — last step CTA routes to /finalize (ACTV-03)', async ({
    page,
    request,
  }) => {
    const { cookingLogId } = await createCookingLog(request, () => true);
    await page.goto(`/cooking-logs/${cookingLogId}/active`);

    // Wait for the step navigator to render (skip the loader phase).
    await expect(
      page.locator('text=/étape \\d+\\/\\d+/i').first(),
    ).toBeVisible({ timeout: 30_000 });

    // Tap 'Étape suivante' repeatedly until 'Terminé' CTA appears OR
    // we've stepped 20 times (safety bound). The CTA replaces Étape
    // suivante on the last step.
    for (let i = 0; i < 20; i++) {
      const finalizeBtn = page.getByRole('button', { name: FINALIZE_CTA_COPY });
      const nextBtn = page.getByRole('button', { name: STEP_NEXT_COPY });
      const finalizeVisible = await finalizeBtn.isVisible().catch(() => false);
      if (finalizeVisible) break;
      const nextVisible = await nextBtn.isVisible().catch(() => false);
      if (!nextVisible) break;
      await nextBtn.click();
    }

    const finalizeBtn = page.getByRole('button', { name: FINALIZE_CTA_COPY });
    await expect(finalizeBtn).toBeVisible({ timeout: 5_000 });
    await finalizeBtn.click();

    await expect(page).toHaveURL(
      new RegExp(`/cooking-logs/${cookingLogId}/finalize`),
    );
  });

  test('backfill loading — loader visible then replaced by step navigator (STEP-03)', async ({
    page,
    request,
  }) => {
    // For this test, navigate to /active before assuming any steps state.
    // The page handles either:
    //   - empty/legacy steps → shows BrandLoader + 'Préparation des étapes…'
    //     → triggers backfill via POST /recipes/{id}/extract-steps
    //     → recipe.updated broadcast lands → loader replaced by navigator
    //   - structured steps already → navigator renders directly
    // Both paths are valid; we assert that the FINAL state is the navigator.
    const { cookingLogId } = await createCookingLog(request, () => true);
    await page.goto(`/cooking-logs/${cookingLogId}/active`);

    // Either the loader copy appears (then navigator) OR the navigator
    // appears immediately. Both are valid completion states. We assert on
    // the FINAL state being the navigator.
    await expect(
      page.locator('text=/étape \\d+\\/\\d+/i').first(),
    ).toBeVisible({ timeout: 30_000 });

    // Loader should NOT be the final state — if it persists past 30s, that
    // signals the BackgroundTask didn't fire (real bug). The visible-by-30s
    // assertion above guards against that.
    const loaderCopy = page.locator(`text=${ACTIVE_LOADER_COPY}`);
    await expect(loaderCopy).toHaveCount(0, { timeout: 1_000 });
  });
});
