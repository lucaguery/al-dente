import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// Phase 18 IDM-04 — onboarding-household-full terminal Card.
//
// Asserts the 6th joiner sees the "Foyer complet" Card after the backend
// returns 422 `HOUSEHOLD_FULL` (Plan 18-01 §IDM-03). The frontend branch
// (Plan 18-03) discriminates on `body.detail.code === "HOUSEHOLD_FULL"`
// and switches to a hairline terminal Card instead of the inline
// color_taken error. (Per ADR-0004 wave 3 the prior Sober Kitchen chrome
// is gone — the Card now reads as Geist on a flat hairline surface.)
//
// Six independent browser contexts (each with its own cookie jar) — the
// `fresh` Playwright project starts each spec against a TRUNCATED DB so the
// household table is empty on entry. Specs other than invite-code-happy-path
// already share the `seeded` storageState by default; this file follows the
// same convention as invite-code-happy-path.spec.ts so it can run under the
// `fresh` project's pattern (per Plan 18-04 D-18-19).
//
// 1. Alice — creates the household, captures invite_code from the URL.
// 2..5. Bob/Carla/Dan/Eve — fill the household to capacity (5/5 members).
// 6. Fran — attempts to join, expects the "Foyer complet" terminal Card.
//
// French strings below are pinned VERBATIM from frontend/lib/i18n/fr.json
// `onboarding.*` keys + the Plan 18-03 `onboarding.join.capacity.*` block.
// If those keys move, this spec must update in the same commit
// (CLAUDE.md drift rule).

const HOUSEHOLD_NAME = `Foyer ${Date.now()}`;

// MEMBER_COLORS from frontend/lib/colors.ts — 5 locked palette slots.
// Pinned in spec order: Alice picks slot 0 (rose), Bob slot 1 (amber),
// etc. The fresh-DB starts empty so no slots are pre-taken; we walk the
// radios by `.nth(i)` (the ColorSwatchPicker exposes no per-swatch
// aria-label — see frontend/components/ColorSwatchPicker.tsx). This
// mirrors the invite-code-happy-path.spec.ts pattern (canonical
// reference for ColorSwatchPicker interaction).
const SLOT_COUNT = 5;

// Pinned i18n strings — mirror frontend/lib/i18n/fr.json (Plan 18-03 adds
// the `onboarding.join.capacity.*` block + keeps existing onboarding labels).
// HOUSEHOLD_FULL (the upstream contract code from Plan 18-01) is intentionally
// referenced in the pattern so the cross-reference back to the backend
// invariant stays grep-discoverable. See backend/app/routers/households.py
// for the 422 `code: HOUSEHOLD_FULL` body.
const CAPACITY_TITLE = 'Foyer complet';
const CAPACITY_BACK_CTA = "Revenir à l'accueil";

// Helper: drive a fresh BrowserContext through /onboarding/create.
async function createHousehold(page: Page, params: {
  household_name: string;
  member_name: string;
  colorSlot: number;
}): Promise<void> {
  await page.goto('/onboarding/welcome');
  await page
    .getByRole('link', { name: 'Créer un foyer', exact: true })
    .click();

  await expect(page).toHaveURL(/\/onboarding\/create/);
  await page.getByLabel('Nom du foyer').fill(params.household_name);
  await page.getByLabel('Ton prénom').fill(params.member_name);

  // ColorSwatchPicker radiogroup. aria-label "Ta couleur" comes from
  // onboarding.create.color_label (verbatim).
  const colorGroup = page.getByRole('radiogroup', { name: 'Ta couleur' });
  await colorGroup.getByRole('radio').nth(params.colorSlot).click();

  await page
    .getByRole('button', { name: 'Créer le foyer', exact: true })
    .click();

  // Backend issues Set-Cookie + redirect to /onboarding/share-code.
  await expect(page).toHaveURL(/\/onboarding\/share-code/);
}

// Helper: drive a fresh BrowserContext through /onboarding/join. Used for
// joiners 2..5 (happy path) so the household reaches its 5-member cap.
async function joinHousehold(page: Page, params: {
  invite_code: string;
  member_name: string;
  colorSlot: number;
}): Promise<void> {
  await page.goto('/onboarding/welcome');
  await page
    .getByRole('link', { name: 'Rejoindre un foyer', exact: true })
    .click();

  await expect(page).toHaveURL(/\/onboarding\/join/);
  await page.getByLabel("Code d'invitation").fill(params.invite_code);
  await page.getByLabel('Ton prénom').fill(params.member_name);

  // After typing the 6-char code the debounced preview fires (300ms in
  // join/page.tsx#101) and `takenColors` populates — the radiogroup's
  // aria-label flips to the "les couleurs déjà prises sont grisées"
  // variant. Match either form so we don't hard-code the preview-resolved
  // string.
  const colorGroup = page.getByRole('radiogroup', {
    name: /Ta couleur/,
  });
  await colorGroup.getByRole('radio').nth(params.colorSlot).click();

  await page
    .getByRole('button', { name: 'Rejoindre', exact: true })
    .click();

  // Successful join lands on "/" (HomeDecide) — assert we are NOT on any
  // /onboarding/* URL anymore (router.replace("/") in join/page.tsx#133).
  await expect(page).not.toHaveURL(/\/onboarding\//);
}

test.describe('onboarding — IDM-04 household-full terminal Card', () => {
  test('6th joiner sees "Foyer complet" Card after HOUSEHOLD_FULL 422', async ({
    browser,
  }) => {
    // ---- 1. Alice creates the household (1/5 members) ----
    const aliceCtx: BrowserContext = await browser.newContext();
    const alicePage: Page = await aliceCtx.newPage();
    await createHousehold(alicePage, {
      household_name: HOUSEHOLD_NAME,
      member_name: 'Alice',
      colorSlot: 0,
    });

    // Extract the invite_code from the share-code URL (same approach as
    // invite-code-happy-path.spec.ts). The code is also rendered verbatim
    // in the DOM — assert that for a render-regression catch.
    const shareUrl = new URL(alicePage.url());
    const inviteCode = shareUrl.searchParams.get('code') ?? '';
    expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    await expect(
      alicePage.getByText(inviteCode, { exact: true }),
    ).toBeVisible();

    // ---- 2..5. Bob, Carla, Dan, Eve fill the household to capacity ----
    // Each joiner gets an independent BrowserContext (own cookie jar) so
    // the join requests issue their own Set-Cookie. The slot index advances
    // with each joiner since takenColors filters in real time — the Nth
    // user is the Nth still-available radio.
    const fillers = [
      { name: 'Bob', slot: 1 },
      { name: 'Carla', slot: 2 },
      { name: 'Dan', slot: 3 },
      { name: 'Eve', slot: 4 },
    ];
    for (const filler of fillers) {
      const ctx: BrowserContext = await browser.newContext();
      const fillerPage: Page = await ctx.newPage();
      await joinHousehold(fillerPage, {
        invite_code: inviteCode,
        member_name: filler.name,
        // Slot index from the joiner's perspective: the radiogroup hides
        // disabled (taken) swatches via aria-disabled, but they remain
        // siblings in the DOM. So Bob picks .nth(1), Carla .nth(2), etc.
        // — the same absolute palette index as the seed creation order.
        colorSlot: filler.slot,
      });
      await ctx.close();
    }

    // ---- 6. Fran attempts to join — capacity gate fires (422 HOUSEHOLD_FULL) ----
    const franCtx: BrowserContext = await browser.newContext();
    const franPage: Page = await franCtx.newPage();
    await franPage.goto('/onboarding/join');
    await franPage.getByLabel("Code d'invitation").fill(inviteCode);
    await franPage.getByLabel('Ton prénom').fill('Fran');

    // All 5 swatches are aria-disabled (every color is in takenColors). The
    // backend's capacity check fires BEFORE the color uniqueness check per
    // Plan 18-01 D-18-10, so even a taken color triggers 422 HOUSEHOLD_FULL
    // — NOT 409 color-taken. force-click the disabled radio + submit so
    // the request actually fires.
    const franColorGroup = franPage.getByRole('radiogroup', {
      name: /Ta couleur/,
    });
    await franColorGroup.getByRole('radio').nth(0).click({ force: true });
    await franPage
      .getByRole('button', { name: 'Rejoindre', exact: true })
      .click({ force: true });

    // Terminal "Foyer complet" Card from Plan 18-03 §Task 2. Title is an
    // h2.text-display (Fraunces italic) — assert by role+name so a heading-
    // level shuffle doesn't false-fail. Body text mentions "5 membres"
    // (verbatim from onboarding.join.capacity.body). Back CTA navigates
    // back to the welcome surface.
    await expect(
      franPage.getByRole('heading', { name: CAPACITY_TITLE }),
    ).toBeVisible({ timeout: 5000 });
    await expect(franPage.getByText(/5 membres/)).toBeVisible();
    await expect(
      franPage.getByRole('button', { name: CAPACITY_BACK_CTA }),
    ).toBeVisible();

    // Tapping the back CTA navigates away from /onboarding/join — typically
    // to /onboarding/welcome (Plan 18-03 D-18-12). Use !toHaveURL(/join/)
    // so we don't pin the exact destination and break on routing tweaks.
    await franPage
      .getByRole('button', { name: CAPACITY_BACK_CTA })
      .click();
    await expect(franPage).not.toHaveURL(/\/onboarding\/join/);

    // ---- Cleanup ----
    await franCtx.close();
    await aliceCtx.close();

    // SLOT_COUNT sanity (belt-and-suspenders for the next maintainer — the
    // 5 fillers + Alice == SLOT_COUNT). If MEMBER_COLORS grows past 5 the
    // capacity test must update in the same commit (backend Plan 18-01
    // gates on `len(MEMBER_COLORS)`).
    expect(SLOT_COUNT).toBe(5);
  });
});
