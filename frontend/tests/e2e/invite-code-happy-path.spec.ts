import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// TEST-04 — invite-code happy path. Runs in the `fresh` Playwright project
// only (testMatch in playwright.config.ts). The fresh-setup dependency
// project TRUNCATEs the 6 tables BEFORE this spec runs, so we can assume
// the DB starts empty.
//
// Two browser contexts:
//   1. `creator` — Alice creates a household, captures the invite code
//      from the share-code page DOM, asserts the aldente_auth cookie was
//      set on her context.
//   2. `joiner` — Bob opens a SECOND context (independent cookie jar),
//      submits the captured invite code via /onboarding/join, asserts
//      his cookie was set, and lands on HomeDecide (BottomNav visible).
//
// NO extraHTTPHeaders.Authorization — we want the real cookie path to be
// the only authentication. Per Pitfall 4 (RESEARCH.md), Chromium accepts
// the Secure+HttpOnly aldente_auth cookie on http://localhost.
//
// Architecture invariant #1: server is single source of truth for state
// transitions. We do NOT poke localStorage or set cookies manually — only
// the backend's Set-Cookie response triggers session establishment.
//
// French strings below are pinned VERBATIM from frontend/lib/i18n/fr.json
// `onboarding.*` keys (read 2026-05-08). If those keys move, this spec
// must be updated in the same commit (CLAUDE.md drift rule).

const HOUSEHOLD_NAME = `Foyer ${Date.now()}`;
const ALICE_NAME = 'Alice';
const BOB_NAME = 'Bob';

// MEMBER_COLORS from frontend/lib/colors.ts — 5 locked palette slots.
// Alice picks rose (slot 1), Bob picks amber (slot 2). Must differ:
// the join endpoint rejects duplicate colors with 409 (households.py#171).
const ALICE_COLOR_HEX = '#F43F5E'; // rose
const BOB_COLOR_HEX = '#F59E0B';   // amber

test.describe('invite-code-happy-path (fresh project — cookie auth)', () => {
  test('Alice creates household, Bob joins via invite code', async ({
    browser,
  }) => {
    // ---- 1. Alice creates the household ----
    const creator: BrowserContext = await browser.newContext();
    const alicePage: Page = await creator.newPage();

    await alicePage.goto('/onboarding/welcome');

    // Welcome page renders create + join entries as <Link> (not buttons).
    // Verbatim label from i18n: onboarding.welcome.create_cta = "Créer un foyer".
    await alicePage
      .getByRole('link', { name: 'Créer un foyer', exact: true })
      .click();

    // /onboarding/create form: household_name + member_name + color.
    await expect(alicePage).toHaveURL(/\/onboarding\/create/);
    await alicePage.getByLabel('Nom du foyer').fill(HOUSEHOLD_NAME);
    await alicePage.getByLabel('Ton prénom').fill(ALICE_NAME);

    // ColorSwatchPicker is a radiogroup with aria-label "Ta couleur"
    // (onboarding.create.color_label). Each swatch is a <button role="radio">
    // styled with backgroundColor=hex. Use first matching radio in the
    // group; rose is slot 1 = first child.
    const aliceColorGroup = alicePage.getByRole('radiogroup', {
      name: 'Ta couleur',
    });
    await aliceColorGroup.getByRole('radio').first().click();

    await alicePage
      .getByRole('button', { name: 'Créer le foyer', exact: true })
      .click();

    // Backend issued Set-Cookie aldente_auth + redirect to /onboarding/share-code
    // (router.replace in create/page.tsx#62-64).
    await expect(alicePage).toHaveURL(/\/onboarding\/share-code/);

    // Cookie was set on the creator context (HttpOnly so we read via
    // BrowserContext.cookies(), not document.cookie).
    const aliceCookies = await creator.cookies();
    const aliceAuth = aliceCookies.find((c) => c.name === 'aldente_auth');
    expect(aliceAuth).toBeDefined();
    expect(aliceAuth!.httpOnly).toBe(true);
    expect(aliceAuth!.secure).toBe(true);
    expect(aliceAuth!.value.length).toBeGreaterThan(0);

    // Extract the invite code from the share-code page DOM. The code is
    // 6 alphanumeric chars rendered inside the Fraunces-italic monogram
    // <div> (share-code/page.tsx#60-62). It is also the only `code=...`
    // search-param the page reads — read from the URL for robustness
    // against future DOM-shape tweaks, then verify the rendered text
    // matches.
    const shareUrl = new URL(alicePage.url());
    const inviteCode = shareUrl.searchParams.get('code') ?? '';
    expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    // Also assert the rendered DOM contains it verbatim (catches a render
    // regression where the page extracts the param but fails to display).
    await expect(
      alicePage.getByText(inviteCode, { exact: true }),
    ).toBeVisible();

    // ---- 2. Bob joins via a SECOND context (own cookie jar) ----
    const joiner: BrowserContext = await browser.newContext();
    const bobPage: Page = await joiner.newPage();

    await bobPage.goto('/onboarding/welcome');
    // Welcome's join entry is also a <Link>. Verbatim label:
    // onboarding.welcome.join_cta = "Rejoindre un foyer".
    await bobPage
      .getByRole('link', { name: 'Rejoindre un foyer', exact: true })
      .click();

    await expect(bobPage).toHaveURL(/\/onboarding\/join/);
    // Code label from i18n: onboarding.join.code_label = "Code d'invitation".
    // The Input uppercases + filters to [A-Z0-9] on each keystroke
    // (join/page.tsx#177-181), so we feed the already-uppercase code we
    // captured from Alice's URL.
    await bobPage.getByLabel("Code d'invitation").fill(inviteCode);
    await bobPage.getByLabel('Ton prénom').fill(BOB_NAME);

    // Bob's color picker label is the longer string (taken-colors hint).
    // Bob MUST pick a different color than Alice — the backend rejects
    // duplicate colors with 409 (households.py#171). The frontend also
    // greys out Alice's rose swatch via the by-code preview, so Bob
    // picks amber (slot 2 = second radio in the group).
    const bobColorGroup = bobPage.getByRole('radiogroup', {
      name: 'Ta couleur (les couleurs déjà prises sont grisées)',
    });
    await bobColorGroup.getByRole('radio').nth(1).click();

    await bobPage
      .getByRole('button', { name: 'Rejoindre', exact: true })
      .click();

    // Backend issued Set-Cookie for Bob and redirected to "/" (HomeDecide)
    // via router.replace("/") in join/page.tsx#133. Assert we are NOT on
    // /onboarding/* anymore — robust to future home-route changes.
    await expect(bobPage).not.toHaveURL(/\/onboarding\//);

    // Bob's cookie was set independently of Alice's.
    const bobCookies = await joiner.cookies();
    const bobAuth = bobCookies.find((c) => c.name === 'aldente_auth');
    expect(bobAuth).toBeDefined();
    expect(bobAuth!.httpOnly).toBe(true);
    expect(bobAuth!.secure).toBe(true);
    // Distinct token per member — proves the second context did NOT
    // accidentally reuse Alice's session.
    expect(bobAuth!.value).not.toBe(aliceAuth!.value);

    // BottomNav landmark visible — the post-auth landing-page probe per
    // BottomNav.tsx#76-77 (hidden on /onboarding/*). aria-label is
    // verbatim "Navigation principale" (BottomNav.tsx#85).
    await expect(
      bobPage.getByRole('navigation', { name: 'Navigation principale' }),
    ).toBeVisible();

    // Sanity: assert ALICE_COLOR_HEX != BOB_COLOR_HEX so the constants
    // stay honest if someone edits them. Not a runtime probe — purely
    // belt-and-suspenders for the next maintainer.
    expect(ALICE_COLOR_HEX).not.toBe(BOB_COLOR_HEX);

    // ---- Cleanup ----
    await creator.close();
    await joiner.close();
  });
});
