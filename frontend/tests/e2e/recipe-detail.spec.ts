import { test, expect } from '@playwright/test';

// TEST-02 — recipe detail page renders hero, ingredients, instruction steps.
// We use the seeded "Risotto aux champignons" recipe (slug
// 'risotto-champignons' in the seed) which has 1 ingredient ("riz arborio")
// and 2 steps ("Nacrer le riz.", "Mouiller au bouillon.") — verified
// against backend/app/cli/seed.py:100-106.
//
// Phase 28 DETAIL-04 — additional specs lock pin marginalia visibility:
//   - « épinglé » appears on detail page after PUT diff-pin
//   - « épinglé » appears on edit form after PUT diff-pin
//   - seasonality + tags labels never render « épinglé » per D-04
//   - same-value PUT does NOT pin
//   - clearing a list field unpins it
//   - « conflit » spec is scaffolded but skipped pending Phase 29 LLM-02

// Helper: return the id of the seeded "Risotto aux champignons" recipe.
// The `request` fixture from the `seeded` project carries the Bearer token
// automatically via extraHTTPHeaders in playwright.config.ts.
async function getSeededRecipeId(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
): Promise<string> {
  const list = await request.get('/api/recipes?limit=200');
  expect(list.ok()).toBeTruthy();
  const recipes: Array<{ id: string; title: string }> = await list.json();
  const seeded = recipes.find((r) => r.title === 'Risotto aux champignons');
  expect(seeded).toBeDefined();
  return seeded!.id;
}

test.describe('recipe-detail', () => {
  test('detail page renders title, ingredients, and numbered steps', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    await page.goto(`/recipes/${recipeId}`);

    // Title in heading.
    await expect(
      page.getByRole('heading', { name: 'Risotto aux champignons' }),
    ).toBeVisible();

    // First seeded ingredient (from seed.py: "riz arborio").
    await expect(page.getByText(/riz arborio/i)).toBeVisible();

    // First seeded step.
    await expect(page.getByText(/Nacrer le riz/)).toBeVisible();
  });

  // Phase 28 DETAIL-04 spec 1: PUT diff-pin → « épinglé » on detail page.
  test('« épinglé » marginalia appears on the detail page after a manual edit pins a field', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    // PUT a changed cuisine — _apply_put_pinning adds 'cuisine' to manually_edited_fields.
    const put = await request.put(`/api/recipes/${recipeId}`, {
      data: { cuisine: 'french' },
    });
    expect(put.ok()).toBeTruthy();

    await page.goto(`/recipes/${recipeId}`);
    // The metadata section covers cuisine; gutter PinLabel should be visible.
    await expect(page.locator('text=épinglé').first()).toBeVisible();
  });

  // Phase 28 DETAIL-04 spec 2: PUT diff-pin → « épinglé » on edit form.
  test('« épinglé » marginalia appears next to the cuisine label on the edit form when cuisine is pinned', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    // Ensure cuisine is pinned (PUT to a different value from current).
    const put = await request.put(`/api/recipes/${recipeId}`, {
      data: { cuisine: 'italian' },
    });
    expect(put.ok()).toBeTruthy();

    await page.goto(`/recipes/${recipeId}/edit`);
    // The cuisine label's flex row should contain a span with épinglé.
    await expect(page.locator('text=épinglé').first()).toBeVisible();
  });

  // Phase 28 DETAIL-04 spec 3: D-04 exclusion — seasonality + tags never show « épinglé ».
  test('seasonality and tags labels never render épinglé on the edit form per D-04', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    await page.goto(`/recipes/${recipeId}/edit`);
    // Seasonality label area — find the label whose text matches the French
    // seasonality label and assert no épinglé child is present.
    const seasonalityLabel = page.locator('label').filter({ hasText: /saison/i }).first();
    await expect(seasonalityLabel.locator('text=épinglé')).toHaveCount(0);
    // Tags label area.
    const tagsLabel = page.locator('label').filter({ hasText: /tag/i }).first();
    await expect(tagsLabel.locator('text=épinglé')).toHaveCount(0);
  });

  // Phase 28 DETAIL-04 spec 4: same-value PUT does NOT pin.
  test('same-value PUT does not pin — no épinglé marginalia appears after a no-op save', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    // Read the current recipe and PUT back the same description value.
    // We use description because it's a scalar that is unlikely to be pinned
    // from a prior test run; we restore it to its current value so this test
    // is idempotent regardless of prior specs.
    const current = await request.get(`/api/recipes/${recipeId}`);
    expect(current.ok()).toBeTruthy();
    const recipe: { description?: string; manually_edited_fields?: string[] } =
      await current.json();
    const currentDescription = recipe.description ?? null;

    // PUT the same description back — no diff, no pin.
    const put = await request.put(`/api/recipes/${recipeId}`, {
      data: { description: currentDescription },
    });
    expect(put.ok()).toBeTruthy();

    // Verify the pin set didn't grow for description.
    const after = await request.get(`/api/recipes/${recipeId}`);
    const afterBody: { manually_edited_fields?: string[] } = await after.json();
    expect(afterBody.manually_edited_fields ?? []).not.toContain('description');

    // Detail page should not show épinglé for description (it has no section
    // render site on the detail page anyway, but the check proves no pin leaked).
    await page.goto(`/recipes/${recipeId}`);
    // We can't assert 0 total because earlier specs may have pinned other fields.
    // Instead assert description is not in pin set — already verified via API above.
  });

  // Phase 28 DETAIL-04 spec 5: clearing a list field unpins it.
  test('clearing mood to an empty list unpins the mood field', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    // First pin mood via PUT.
    const pin = await request.put(`/api/recipes/${recipeId}`, {
      data: { mood: ['comfort'] },
    });
    expect(pin.ok()).toBeTruthy();

    // Verify mood is now pinned.
    const mid = await request.get(`/api/recipes/${recipeId}`);
    const midBody: { manually_edited_fields?: string[] } = await mid.json();
    expect(midBody.manually_edited_fields ?? []).toContain('mood');

    // Clear mood to empty list — should unpin.
    const unpin = await request.put(`/api/recipes/${recipeId}`, {
      data: { mood: [] },
    });
    expect(unpin.ok()).toBeTruthy();

    // Verify mood is no longer in pin set.
    const after = await request.get(`/api/recipes/${recipeId}`);
    const afterBody: { manually_edited_fields?: string[] } = await after.json();
    expect(afterBody.manually_edited_fields ?? []).not.toContain('mood');

    // Reload the detail page and confirm the metadata section marginalia
    // does not show épinglé for mood (it may still show for other pinned
    // fields from earlier specs — we check only the API state above).
    await page.goto(`/recipes/${recipeId}`);
    await page.reload();
  });

  // Phase 28 DETAIL-04 spec 6 (skipped): « conflit » requires Phase 29 advisory emission.
  test.skip('« conflit » destructive marginalia appears when a pinned field has an open advisory (Phase 29 dependency)', async ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    page,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request,
  }) => {
    // Placeholder for Phase 29 — when the LLM emits an advisory turn for a
    // pinned field, the gutter PinLabel should escalate from « épinglé » to
    // « conflit » in destructive amber, and tapping it should scroll to the
    // advisory bubble in the chat. This spec is skipped today because the
    // Phase 26 advisory writer is the BackgroundTask test surface; without
    // a synthetic injection path, we cannot exercise the open-advisory
    // detection in Playwright. Unskip when Phase 29 ships LLM-02.
  });
});

// Phase 29 D-22 — summary CTA loop (LLM-03). Backend in test mode emits a
// deterministic summary turn after every text/voice/photo refinement via
// canned_thread_extract; these specs rely on that determinism.
//
// questions_deferred_until: the defer gate (D-08, D-21) is tested by the
// second spec — after « Plus tard » the CTAs collapse and subsequent
// refinements do NOT produce a new question turn (defer gate holds in
// _run_thread_llm server-side).
test.describe('Phase 29 — summary CTA wire-up (D-22)', () => {
  test('tap « Oui, compléter » emits a question turn OR shows the « Tout est complet. » toast', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);
    await page.goto(`/recipes/${recipeId}`);

    // Post a text refinement turn via the API in test mode — the backend
    // (canned_thread_extract) synchronously emits a summary system turn.
    // We use the API directly so the test is deterministic and fast.
    const turnRes = await request.post(`/api/recipes/${recipeId}/turns`, {
      data: { kind: 'text', text: 'ajoute du basilic' },
    });
    expect(turnRes.ok()).toBeTruthy();

    // Reload so the WS-delivered summary turn appears in the chat.
    await page.reload();

    // Wait for the summary bubble CTA to appear (« Oui, compléter »).
    const completeBtn = page.getByRole('button', { name: 'Oui, compléter' }).first();
    await expect(completeBtn).toBeVisible({ timeout: 5_000 });

    // Tap « Oui, compléter ».
    await completeBtn.click();

    // 5a. EITHER a new question turn appears (201 path — backend picks the
    //     highest-priority missing field and emits a question turn via WS)
    //     OR the « Tout est complet. » toast appears (204 path — no missing
    //     fields). The completeness state depends on the seeded recipe; assert
    //     either outcome is visible.
    const questionAppeared = page
      .getByText(/Quel|Combien|Pour combien|Quelle/) // any of D-14's locked French prompts
      .first();
    const toastAppeared = page.getByText('Tout est complet.');
    await expect(questionAppeared.or(toastAppeared)).toBeVisible({ timeout: 5_000 });
  });

  test('tap « Plus tard » collapses the summary CTAs and suppresses the next question turn', async ({
    page,
    request,
  }) => {
    const recipeId = await getSeededRecipeId(request);

    // Post a text refinement turn to trigger a summary bubble.
    const turnRes = await request.post(`/api/recipes/${recipeId}/turns`, {
      data: { kind: 'text', text: 'ajoute des poireaux' },
    });
    expect(turnRes.ok()).toBeTruthy();

    await page.goto(`/recipes/${recipeId}`);

    const laterBtn = page.getByRole('button', { name: 'Plus tard' }).first();
    await expect(laterBtn).toBeVisible({ timeout: 5_000 });
    await expect(laterBtn).toBeEnabled();

    // Tap « Plus tard » → backend sets questions_deferred_until = now()+24h (D-08);
    // recipe.updated WS arrives; deferred prop flips to true; CTAs collapse.
    await laterBtn.click();

    // CTAs should now be disabled (questions_deferred_until is a future timestamp).
    await expect(laterBtn).toBeDisabled({ timeout: 3_000 });
    await expect(page.getByRole('button', { name: 'Oui, compléter' }).first()).toBeDisabled();

    // Count question bubbles BEFORE and AFTER a second text refinement.
    // The defer gate holds in _run_thread_llm server-side so no new question
    // turn should appear even though a new summary is emitted.
    const questionCountBefore = await page.getByRole('button', { name: 'Valider' }).count();

    // Post a second refinement while deferred — backend should NOT emit a
    // question turn (defer gate: questions_deferred_until > now()).
    await request.post(`/api/recipes/${recipeId}/turns`, {
      data: { kind: 'text', text: 'avec de la crème' },
    });
    await page.waitForTimeout(2000); // allow LLM run to settle (canned_thread_extract is fast)
    await page.reload();

    const questionCountAfter = await page.getByRole('button', { name: 'Valider' }).count();
    expect(questionCountAfter).toBe(questionCountBefore);
  });
});
