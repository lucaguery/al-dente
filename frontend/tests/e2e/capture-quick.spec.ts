import { test, expect } from '@playwright/test';

// TEST-02 (D-07 quick) — POST /recipes/quick returns a 'draft' immediately
// (no LLM promotion for quick — quick is just a stash). Spec asserts the
// draft appears in /inbox. Architecture invariant #1: server is single
// source of truth for promotion.
//
// Path note: Playwright's `request` fixture uses the project's baseURL
// (http://localhost:3000), and the Next.js dev server rewrites /api/* to
// the backend on :8000 (see frontend/next.config.ts beforeFiles). The
// Bearer header from extraHTTPHeaders survives the rewrite.
test.describe('capture-quick', () => {
  test('quick capture creates draft visible in inbox', async ({
    page,
    request,
  }) => {
    // Unique title so re-runs don't collide with leftover drafts from a
    // previous attempt (the seed itself doesn't seed any quick drafts).
    const title = `Quick spec ${Date.now()}`;

    const create = await request.post('/api/recipes/quick', {
      data: { title },
    });
    expect(create.ok()).toBeTruthy();
    const created = await create.json();
    expect(created.status).toBe('draft');
    expect(created.initial_turn_kind).toBe('text');

    await page.goto('/inbox');
    // Drafts inbox renders the title verbatim.
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  });
});
