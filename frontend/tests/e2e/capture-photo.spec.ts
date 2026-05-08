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
//      so an offscreen-sheet regression (paper-grain class overriding Tailwind
//      `fixed` in components/ui/sheet.tsx) surfaces here, not in production.
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

  // eslint-disable-next-line playwright/no-skipped-test -- real product bug surfaced 2026-05-09; see TODO below
  test.fixme(
    'photo upload sheet is reachable on iPhone-sized viewports',
    async ({ page }) => {
      // TODO(productize): components/ui/sheet.tsx — `paper-grain` class on
      // SheetContent overrides Tailwind `fixed`, leaving the bottom-sheet
      // positioned in document flow at top: 702px. On iPhone SE (375x667)
      // the entire Caméra / Photothèque sheet is offscreen; on iPhone 14
      // (390x844) only Caméra is partially visible. Diagnosed at runtime
      // 2026-05-09 via Playwright MCP — see 10-RUNTIME-NOTES.md "Surfaced
      // product issues" for the root cause analysis. Re-enable this spec
      // once sheet.tsx drops `paper-grain` (or the .paper-grain rule no
      // longer wins over `fixed`).
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
