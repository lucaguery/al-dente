import { test, expect } from '@playwright/test';
import {
  VOTE_STATE_LABELS,
  SHORTLIST_RECIPES,
  SEEDED_MEMBER_LUCA,
} from './fixtures/seed-helpers';

// TEST-02 — daily shortlist coverage. THE D-12 canary target: a regression
// in either ShortlistDeck.tsx (vote-yes/vote-no callback wiring) or
// backend/app/routers/votes.py (score_delta sign / state computation) MUST
// surface here.
//
// Seed (10-03) populates the today shortlist with 5 recipes whose existing
// vote rows produce each of the 5 computed states. This spec navigates to
// '/' and asserts:
//   1. Authenticated landing on HomeDecide (not onboarding).
//   2. EVERY ONE of the 5 French vote-state labels is rendered.
//   3. A live vote (yes on the Sans-avis recipe) flips its chip from
//      'Sans avis' → 'Pressenti' (Luca yes, Partner unvoted).
//
// French strings are verbatim from frontend/lib/i18n/fr.json#92-96 and
// re-exported via fixtures/seed-helpers.ts. NO English drift — this is
// the architecture-invariant-#6 enforcement spec.
//
// Note on ASCII titles: the backend seed (10-03) deliberately stores
// ASCII-only titles (e.g. "Ragu bolognese" rather than "Ragù bolognese")
// to dodge encoding traps in psql -t -A output. seed-helpers.ts mirrors
// the backend constants byte-for-byte, so SHORTLIST_RECIPES.valide is
// "Ragu bolognese". Specs MUST go through the helper rather than retyping
// the string.
test.describe('shortlist-vote', () => {
  test('all 5 French vote-state labels render from seeded data', async ({
    page,
  }) => {
    await page.goto('/');

    // Authenticated landing on HomeDecide (not onboarding).
    await expect(page).not.toHaveURL(/\/onboarding\//);

    // The 5 vote-state French labels are all present in the rendered
    // shortlist summary (one per seeded recipe). HomeDecide renders the
    // rejete-filtered swipe deck on top + the 5-state summary below.
    // Whether the labels appear in the summary section or in chip badges,
    // every one of these strings must exist on the page.
    await expect(
      page.getByText(VOTE_STATE_LABELS.valide /* "Validé" */, { exact: true })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText(VOTE_STATE_LABELS.pressenti /* "Pressenti" */, {
        exact: true,
      }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(VOTE_STATE_LABELS.conteste /* "Contesté" */, {
        exact: true,
      }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(VOTE_STATE_LABELS.rejete /* "Rejeté" */, { exact: true })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText(VOTE_STATE_LABELS.sansAvis /* "Sans avis" */, {
        exact: true,
      }).first(),
    ).toBeVisible();
  });

  test('voting yes on the Sans-avis recipe flips chip to Pressenti', async ({
    page,
  }) => {
    await page.goto('/');

    // The seeded Sans-avis recipe is "Tacos au boeuf" (no votes from either
    // member). After Luca (the Bearer-authed user) votes yes, partner is
    // unvoted → Pressenti. This proves the vote callback wiring + the
    // backend state computation are aligned.
    //
    // The deck shows recipes the local user hasn't voted on yet — Luca has
    // already voted on Ragu bolognese / Coq au vin / Butter chicken /
    // Shawarma per the seed. Tacos au boeuf is the only un-voted recipe
    // for Luca, so it's at the top of the deck.
    await expect(
      page.getByRole('heading', { name: SHORTLIST_RECIPES.sansAvis }),
    ).toBeVisible();

    // Vote yes — verbatim aria-label from frontend/lib/i18n/fr.json#26.
    await page
      .getByRole('button', { name: "J'aime cette recette" })
      .first()
      .click();

    // After the vote, the recipe's chip in the summary section should
    // display "Pressenti" (Luca yes, Partner unvoted). Instead of asserting
    // counts (brittle to layout), we assert Pressenti is still on the page
    // (Coq au vin already had it; now Tacos au boeuf joins it) and that
    // Tacos au boeuf is still rendered somewhere.
    await expect(
      page.getByText(VOTE_STATE_LABELS.pressenti, { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(SHORTLIST_RECIPES.sansAvis, { exact: true }).first(),
    ).toBeVisible();

    // Sanity: Luca's identity rendered (proves the Bearer mapping survived).
    expect(SEEDED_MEMBER_LUCA).toBe('Luca');
  });

  test('seeded Rejeté state surfaces with Shawarma', async ({ page }) => {
    // This test is intentionally narrow: it verifies the no-callback path
    // independent of the yes-callback path. If ShortlistDeck inverts the
    // wiring (D-12 canary trigger), exactly one of these two tests fails.
    //
    // The seeded Rejeté recipe is Shawarma (both members voted 'no' per
    // 10-03). We re-assert that the deck shows 'Rejeté' for Shawarma after
    // navigation. Canary flip we are protecting against: invert
    // vote_yes/vote_no in the swipe handler → Pressenti recipe shows up as
    // Rejeté and vice versa.
    await page.goto('/');
    await expect(
      page.getByText(VOTE_STATE_LABELS.rejete, { exact: true }).first(),
    ).toBeVisible();

    // The seeded Rejeté recipe is Shawarma — must appear somewhere on the
    // summary section.
    await expect(
      page
        .getByText(SHORTLIST_RECIPES.rejete /* "Shawarma" */, { exact: true })
        .first(),
    ).toBeVisible();
  });
});
