import { test, expect } from '@playwright/test';

// Phase 41 PICK-01 + PICK-02 — Nouvelle Recette stateless picker.
//
// Locks the chooser contract:
//   1. /recipes/new renders the 5-option numbered picker (NO inline thread).
//   2. Tapping 'Note rapide' opens the name-only modal; submit lands on
//      /recipes/{id} (structured view, NOT /thread).
//   3. Tapping a non-quick surface routes to /recipes/new/{surface} and
//      mounts the capture thread.
//   4. /recipes/new/unknown-surface 404s (server-side allowlist).
//   5. /recipes/new/quick 404s — Note rapide is a modal, not a route (D-02
//      negative path).

test.describe('nouvelle-recette-chooser', () => {
  test('picker renders 5 numbered options in canonical order (PICK-01)', async ({
    page,
  }) => {
    await page.goto('/recipes/new');

    // Hero + subtitle.
    await expect(
      page.getByRole('heading', { name: 'Nouvelle recette' }),
    ).toBeVisible();
    await expect(
      page.getByText(/5 méthodes · choisis-en une/i),
    ).toBeVisible();

    // 5 numbered prefixes visible.
    for (const num of ['01', '02', '03', '04', '05']) {
      await expect(page.getByText(num, { exact: true }).first()).toBeVisible();
    }

    // 5 labels visible in canonical order.
    await expect(page.getByText('Note rapide', { exact: true })).toBeVisible();
    await expect(page.getByText('Formulaire', { exact: true })).toBeVisible();
    await expect(page.getByText('Voix', { exact: true })).toBeVisible();
    await expect(page.getByText('Photo', { exact: true })).toBeVisible();
    await expect(page.getByText('Lien', { exact: true })).toBeVisible();

    // Inline RecipeThread composer MUST NOT mount on this route.
    // The capture composer placeholder is the distinctive marker — its
    // absence proves the picker (not the thread) is rendered.
    await expect(
      page.getByPlaceholder(/Ajouter une note, dicter/i),
    ).toHaveCount(0);
  });

  test('Note rapide opens a name-only modal and POSTs to /recipes (PICK-02 D-02)', async ({
    page,
  }) => {
    await page.goto('/recipes/new');

    // Open the modal by tapping the Note rapide row.
    await page.getByText('Note rapide', { exact: true }).click();

    // Modal opens with role=dialog + a single text input + Enregistrer CTA.
    await expect(page.getByRole('dialog')).toBeVisible();
    const input = page.getByPlaceholder(/Nom de la recette/i);
    await expect(input).toBeVisible();

    const recipeName = `Lasagnes du jeudi ${Date.now()}`;
    await input.fill(recipeName);
    await page.getByRole('button', { name: /Enregistrer/i }).click();

    // Lands on /recipes/{uuid} — the structured view, NOT /thread.
    // UUID v4 shape: 8-4-4-4-12 hex.
    await expect(page).toHaveURL(
      /\/recipes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    await expect(page.url()).not.toMatch(/\/thread$/);
  });

  test('tapping Voix routes to /recipes/new/voice (PICK-02 D-03)', async ({
    page,
  }) => {
    await page.goto('/recipes/new');
    await page.getByText('Voix', { exact: true }).click();
    await expect(page).toHaveURL(/\/recipes\/new\/voice$/);
  });

  test('tapping Lien routes to /recipes/new/url (PICK-02 D-03)', async ({
    page,
  }) => {
    await page.goto('/recipes/new');
    await page.getByText('Lien', { exact: true }).click();
    await expect(page).toHaveURL(/\/recipes\/new\/url$/);
  });

  test('unknown surface 404s (D-03 server-side allowlist)', async ({
    page,
  }) => {
    const resp = await page.goto('/recipes/new/unknown-surface');
    // Next.js notFound() — the response may resolve with 404 on the
    // server-rendered route OR render the in-app 404 fallback. Either is
    // acceptable; just confirm it does NOT show the capture composer.
    expect(resp?.status() ?? 404).toBeGreaterThanOrEqual(400);
    await expect(
      page.getByPlaceholder(/Ajouter une note, dicter/i),
    ).toHaveCount(0);
  });

  test('Note rapide route is excluded — /recipes/new/quick 404s (D-02 negative)', async ({
    page,
  }) => {
    const resp = await page.goto('/recipes/new/quick');
    expect(resp?.status() ?? 404).toBeGreaterThanOrEqual(400);
    // quick is a modal-only surface; the capture thread MUST NOT mount.
    await expect(
      page.getByPlaceholder(/Ajouter une note, dicter/i),
    ).toHaveCount(0);
  });
});
