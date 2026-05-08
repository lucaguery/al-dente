import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Pitfall 7 mitigation: Playwright runs from the `frontend/` directory, so
// resolve fixture path from CWD rather than `import.meta.url` (which is ESM-
// only and Playwright's CJS spec loader doesn't expose it — same constraint
// documented in playwright.config.ts).
const FIXTURE_PATH = path.resolve(
  process.cwd(),
  'tests',
  'e2e',
  'fixtures',
  'risotto.jpg',
);

// TEST-02 (D-07 photo) — POST /recipes/photo with multipart bytes.
// services/storage.py (test-mode guard from 10-02) returns a synthetic
// bucket path without touching Supabase. services/llm.py calls
// canned_photo_recipe which returns 'Tarte Tatin (test)'.
//
// Field-name drift from plan: backend uses `files` (see
// backend/app/routers/recipes.py:372 `files: list[UploadFile] = File(...)`),
// not `photos`. Plan said "read recipes.py first to confirm" — confirmed
// and adapted.
test.describe('capture-photo', () => {
  test('photo capture promotes via canned stub (Tarte Tatin)', async ({
    request,
  }) => {
    expect(fs.existsSync(FIXTURE_PATH)).toBeTruthy();
    const bytes = fs.readFileSync(FIXTURE_PATH);
    // First 3 bytes are the JPEG magic marker FF D8 FF — guards against a
    // text fixture sneaking in.
    expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff');

    const create = await request.post('/api/recipes/photo', {
      multipart: {
        files: {
          name: 'risotto.jpg',
          mimeType: 'image/jpeg',
          buffer: bytes,
        },
      },
    });
    expect(create.ok()).toBeTruthy();
    const draft = await create.json();
    expect(draft.status).toBe('draft');
    const recipeId: string = draft.id;

    await expect
      .poll(
        async () => {
          const r = await request.get(`/api/recipes/${recipeId}`);
          if (!r.ok()) return null;
          return (await r.json()).status;
        },
        { timeout: 5_000, intervals: [100, 250, 500, 1000] },
      )
      .toBe('structured');

    const promoted = await (
      await request.get(`/api/recipes/${recipeId}`)
    ).json();
    expect(promoted.title).toBe('Tarte Tatin (test)');
    expect(promoted.cuisine).toBe('french');
  });
});
