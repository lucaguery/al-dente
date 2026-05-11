import { test, expect } from '@playwright/test';
import {
  SHORTLIST_RECIPES,
  VOTE_STATE_LABELS,
} from './fixtures/seed-helpers';

// INV-01 / B-3 regression canary — verify the 5-state vote chip renders the
// correct French label for each computed state in the seeded 2-member
// household. This is the structural canary for Plan 15-03 (MEMBER_COUNT=2
// hardcode removed; live count threaded via useSession()).
//
// Scope per D-15-10: the seed has 2 members (couple-scale), so this spec
// proves the chip computes correctly when memberCount==2 — the structural
// verification surface. A true N≠2 regression awaits an INFRA-backlog seed
// with N≥3 members; the *contract* fix (Tasks 1+2) is what closes INV-01,
// this spec is the canary against future regressions.
//
// Seeded vote pattern (backend/app/cli/seed.py:506-513):
//   • Ragu bolognese (valide)     — both yes
//   • Coq au vin (pressenti)      — luca yes, partner none
//   • Butter chicken (conteste)   — luca yes, partner no
//   • Shawarma (rejete)           — both no
//   • Tacos au boeuf (sans_avis)  — neither voted
//
// Surface targeted: VoteSummary (the "all voted" home state). To reach it,
// Luca must have voted on every recipe in the shortlist — the seed has him
// unvoted on Tacos au boeuf. We POST a single vote via the API to flip
// that one and collapse the deck to the summary, where chips for all
// non-rejete states are visible at once.
//
// Coverage after the API-driven vote:
//   • valide      — Ragu bolognese        ✓ visible
//   • pressenti   — Coq au vin (and the now-voted Tacos au boeuf)  ✓ visible
//   • conteste    — Butter chicken        ✓ visible
//   • rejete      — Shawarma              FILTERED out of VoteSummary (D-06)
//   • sans_avis   — none (Luca voted all) not surfaced post-collapse
//
// 3-of-5 coverage is the seed-reachable subset (D-15-10). The drift detector
// in lib/votes.ts:78-95 covers the structural correctness of the other two
// branches at module-load via the self-check.

test.describe('vote-state-n-members', () => {
  test('VoteSummary renders correct French chip labels for seeded states', async ({
    page,
    request,
  }) => {
    // ── Step 1: collapse the deck to the VoteSummary by voting on the one
    // sans-avis recipe via the API. The Bearer header + cookie from the
    // `seeded` project auth as Luca, so this vote is attributed to him.
    //
    // We need the shortlist_id + recipe_id of Tacos au boeuf. Pull the
    // today shortlist via the API — its shape includes recipe_ids and
    // a recipes[] array with titles.
    const shortlistRes = await request.get('/api/shortlists/today');
    expect(shortlistRes.ok()).toBeTruthy();
    const shortlist = await shortlistRes.json();

    type ShortlistRecipe = { id: string; title: string };
    const tacos = (shortlist.recipes as ShortlistRecipe[]).find(
      (r) => r.title === SHORTLIST_RECIPES.sansAvis,
    );
    expect(tacos, 'seed must include the sans-avis recipe').toBeDefined();

    // Vote yes on Tacos au boeuf. After this, Luca has voted on all 5
    // shortlist recipes → HomeDecide flips from deck to summary.
    const voteRes = await request.post(
      `/api/shortlists/${shortlist.shortlist_id}/recipes/${tacos!.id}/vote`,
      { data: { vote: 'yes' } },
    );
    expect(voteRes.ok()).toBeTruthy();

    // ── Step 2: render the Home tab and assert the chip labels.
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/onboarding\//);

    // VoteSummary is the all-voted surface. The summary heading uses the
    // home.summary i18n namespace — but rather than coupling to that
    // string, we anchor on the recipes whose state is observable post-vote.

    // Ragu bolognese (valide): both members yes.
    const valideRow = page
      .getByText(SHORTLIST_RECIPES.valide, { exact: true })
      .first()
      .locator('xpath=ancestor::div[contains(@class, "rounded-xl")]')
      .first();
    await expect(valideRow).toBeVisible();
    await expect(
      valideRow.getByText(VOTE_STATE_LABELS.valide, { exact: true }),
    ).toBeVisible();

    // Coq au vin (pressenti): luca yes, partner none.
    const pressentiRow = page
      .getByText(SHORTLIST_RECIPES.pressenti, { exact: true })
      .first()
      .locator('xpath=ancestor::div[contains(@class, "rounded-xl")]')
      .first();
    await expect(pressentiRow).toBeVisible();
    await expect(
      pressentiRow.getByText(VOTE_STATE_LABELS.pressenti, { exact: true }),
    ).toBeVisible();

    // Butter chicken (conteste): luca yes, partner no.
    const contesteRow = page
      .getByText(SHORTLIST_RECIPES.conteste, { exact: true })
      .first()
      .locator('xpath=ancestor::div[contains(@class, "rounded-xl")]')
      .first();
    await expect(contesteRow).toBeVisible();
    await expect(
      contesteRow.getByText(VOTE_STATE_LABELS.conteste, { exact: true }),
    ).toBeVisible();

    // Shawarma (rejete): both no — filtered from VoteSummary per D-06.
    // Asserting absence to lock the filter contract: if someone removes the
    // filter, this spec fails (the row appears) and the test author re-reads
    // VoteSummary.tsx to understand why rejete is hidden from the summary.
    await expect(
      page.getByText(SHORTLIST_RECIPES.rejete, { exact: true }),
    ).toHaveCount(0);
  });
});
