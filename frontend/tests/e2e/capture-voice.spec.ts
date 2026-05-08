import { test, expect } from '@playwright/test';

// TEST-02 (D-07 voice) — POST /recipes/voice returns a draft, the
// BackgroundTask in services/llm.py invokes extract_from_transcript which
// short-circuits to canned_voice_recipe (D-04 stub) and promotes to
// 'structured'. We poll the recipe endpoint rather than asserting via
// WebSocket per D-06 (realtime deferred to a follow-up phase).
//
// Web Speech API is NOT invoked — production posts a transcript as JSON
// from iOS keyboard dictation (CAPTURE-04). Headless Chromium has no Web
// Speech anyway, so this is the only realistic path.
test.describe('capture-voice', () => {
  test('voice draft promotes to structured via canned LLM stub', async ({
    request,
  }) => {
    const transcript =
      'Risotto aux champignons, pour deux personnes, riz arborio, parmesan.';

    const create = await request.post('/api/recipes/voice', {
      data: { transcript },
    });
    expect(create.ok()).toBeTruthy();
    const draft = await create.json();
    expect(draft.status).toBe('draft');
    const recipeId: string = draft.id;

    // Poll until BackgroundTask flips status. The stub is synchronous
    // inside the task body, so promotion lands in well under a second;
    // 5s ceiling is comfortable headroom for slow-laptop scheduler ticks.
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
      .toBe('structured');

    // Confirm the canned-fixture title landed (asserts the stub actually
    // ran — not just any structured promotion).
    const promoted = await (
      await request.get(`/api/recipes/${recipeId}`)
    ).json();
    expect(promoted.title).toBe('Risotto aux champignons (test)');
    expect(promoted.cuisine).toBe('italian');
  });
});
