import { test, expect } from '@playwright/test';

// TEST-02 — cooking log create + finalize. Architecture invariant #3:
// last_cooked_at and cook_count are updated in the same db.commit() as
// the cooking_logs row. We assert both fields move after finalize.
//
// Per CONTEXT D-06, no WS assertions — we poll the recipe endpoint.
// Per CLAUDE.md COOK-11 (offline toast on navigator.onLine === false),
// this spec does NOT exercise the offline path — that's a manual UAT.
//
// Endpoint shape (from backend/app/routers/cooking_logs.py):
//   POST /recipes/{recipe_id}/cook   → start (returns CookingLogResponse)
//   PUT  /cooking-logs/{log_id}      → finalize
// (Plan template said `/cooking_logs` snake_case; the actual router uses
// `/cooking-logs` hyphenated. Adapted accordingly.)
test.describe('cooking-log-create-finalize', () => {
  test('cook flow updates last_cooked_at and cook_count', async ({
    page,
    request,
  }) => {
    // Find Coq au vin (seeded, NOT pre-cooked, so cook_count starts at 0).
    const list = await request.get('/api/recipes?limit=200');
    const recipes: Array<{
      id: string;
      title: string;
      cook_count: number;
    }> = await list.json();
    const recipe = recipes.find((r) => r.title === 'Coq au vin');
    expect(recipe).toBeDefined();
    const startCookCount = recipe!.cook_count;

    // Start the cook via API. Endpoint is POST /recipes/{id}/cook (not
    // /cooking_logs as the plan template suggested — verified at
    // backend/app/routers/cooking_logs.py:60).
    const start = await request.post(`/api/recipes/${recipe!.id}/cook`);
    expect(start.ok()).toBeTruthy();
    const cookingLog: { id: string } = await start.json();

    // Navigate to the finalize page.
    await page.goto(`/cooking-logs/${cookingLog.id}/finalize`);

    // Pick the 'liked' rating. RatingPicker renders 3 cards with
    // aria-pressed; per fr.json:344 the 'liked' label is 'Bien'.
    await page.getByRole('button', { name: /Bien/ }).click();
    await expect(
      page.getByRole('button', { name: /Bien/ }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Notes textarea — aria-labelledby="notes-heading" whose text is
    // "Notes" (fr.json#329 cooking_log.finalize.notes_heading). Use
    // getByLabel which resolves aria-labelledby.
    const notes = page.getByLabel(/Notes/);
    await notes.fill('Excellent ce soir.');

    // Finaliser button (fr.json:323 cooking_log.finalize.submit).
    await page.getByRole('button', { name: /Finaliser|Terminer/ }).click();

    // After finalize, the user is routed somewhere (recipe detail, history,
    // or home). Don't assert on the destination URL (brittle); poll the
    // recipe row instead — the truth source is the DB.
    await expect
      .poll(
        async () => {
          const r = await request.get(`/api/recipes/${recipe!.id}`);
          if (!r.ok()) return null;
          const body = await r.json();
          return {
            cook_count: body.cook_count,
            has_last_cooked: body.last_cooked_at !== null,
          };
        },
        { timeout: 5_000, intervals: [200, 500, 1000] },
      )
      .toEqual({
        cook_count: startCookCount + 1,
        has_last_cooked: true,
      });
  });
});
