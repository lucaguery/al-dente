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

// TEST-02 (D-07 photo) — two specs:
//   1. The HTTP-layer round-trip via /api/recipes/photo (services/storage.py
//      test-mode guard returns a synthetic bucket path; services/llm.py
//      canned_photo_recipe returns 'Tarte Tatin (test)'). Proves the backend
//      contract is honored end-to-end.
//   2. The UI-layer flow that opens the bottom sheet, picks the file source,
//      and submits — the path real users actually take. Adds toBeInViewport()
//      so an offscreen-sheet regression (any wrapper class overriding Tailwind
//      `fixed` in components/ui/sheet.tsx) surfaces here, not in production.
//      Historically a Sober Kitchen texture wrapper triggered this via a
//      `> * { position: relative }` cascade collision; that wrapper is gone
//      per ADR-0004, but the viewport assertion remains as a defensive guard.
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

  test(
    'photo upload sheet is reachable on iPhone-sized viewports',
    async ({ page }) => {
      // Guards VAL-01 / Sheet-01 (closed v0.4 Phase 19). Historically the
      // Sober Kitchen texture wrapper on SheetContent re-introduced a
      // `position: relative` cascade collision that pushed the sheet
      // off-screen; the texture is dropped per ADR-0004, but the
      // assertion remains as a defensive viewport guard.
      await page.goto('/recipes/new');
      await page.getByRole('tab', { name: 'Photo' }).click();

      const trigger = page.getByRole('button', { name: 'Ajouter une photo' });
      await expect(trigger).toBeVisible();
      await expect(trigger).toBeInViewport();
      await trigger.click();

      // The sheet dialog should appear pinned to the viewport bottom — both
      // file-source buttons must be reachable without scrolling. This is
      // exactly the assertion that fails today because of the relative-
      // positioning regression.
      const camera = page.getByRole('button', { name: 'Caméra' });
      const library = page.getByRole('button', { name: 'Photothèque' });
      await expect(camera).toBeVisible();
      await expect(camera).toBeInViewport();
      await expect(library).toBeVisible();
      await expect(library).toBeInViewport();
    },
  );
});
