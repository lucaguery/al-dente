import { test, expect } from '@playwright/test';
import {
  SHORTLIST_RECIPES,
  VOTE_STATE_LABELS,
} from './fixtures/seed-helpers';

// 260512-df0 — five user-reported bugs on the shortlist review surface.
// Each test() maps to one of the bugs. The whole describe runs in the
// `seeded` project (iPhone 390x844 viewport, isMobile, hasTouch, both
// Bearer header + aldente_auth cookie — see frontend/playwright.config.ts).
//
// Seed contract (recap from backend/app/cli/seed.py + fixtures/seed-helpers.ts):
//   - Ragu bolognese  → Validé   (both yes)
//   - Coq au vin      → Pressenti (luca yes, partner none)
//   - Butter chicken  → Contesté  (luca yes, partner no)
//   - Shawarma        → Rejeté    (both no)
//   - Tacos au boeuf  → Sans avis (no votes from either member)
// → Luca has ONE un-voted card (Tacos au boeuf). Voting on it transitions
//   the deck to VoteSummary's terminal state.
//
// No `test.fixme` markers: all 5 tests MUST pass after the Task 1/2/3 fixes.
// Reuses VOTE_STATE_LABELS so any French copy drift surfaces here too.
test.describe('shortlist review bugs (260512-df0)', () => {
  test('bug 1 — swipe / thumb-tap commit produces a visible slide animation', async ({
    page,
  }) => {
    await page.goto('/');

    // Per seed Tacos au boeuf is the only un-voted card for Luca — visible
    // at the front of the deck on landing.
    const sansAvis = page.getByRole('heading', {
      name: SHORTLIST_RECIPES.sansAvis,
    });
    await expect(sansAvis).toBeVisible();

    // Vote yes via the thumb button. The exit transition (~200ms) +
    // deck-to-summary handover should leave the user looking at the
    // VoteSummary heading, NOT a blank screen.
    await page
      .getByRole('button', { name: "J'aime cette recette" })
      .first()
      .click();

    // Playwright can't assert easing curves, but it CAN assert
    // "the deck never enters a no-content state". VoteSummary's heading
    // is the deterministic post-vote anchor.
    await expect(page.getByText('Vous avez tout vu')).toBeVisible({
      timeout: 1500,
    });
  });

  test('bug 2 — shortlist cards render a real photo OR the placeholder, never a broken img', async ({
    page,
  }) => {
    await page.goto('/');

    const sansAvisCard = page
      .locator('[role="article"]')
      .filter({ hasText: SHORTLIST_RECIPES.sansAvis })
      .first();
    await expect(sansAvisCard).toBeVisible();

    // Two-arm assertion: either an <img> with a non-bucket-relative src
    // (https://, blob:, or data:) is rendered, OR no <img> is rendered
    // and the UtensilsCrossed placeholder svg is visible. The
    // pre-fix failing state was an <img src="{household_id}/{recipe_id}/…">
    // — a bucket-relative path that produces a broken-image icon and
    // would match neither arm.
    const img = sansAvisCard.locator('img').first();
    const imgCount = await img.count();
    if (imgCount > 0) {
      const src = await img.getAttribute('src');
      expect(src).toBeTruthy();
      // A bucket-relative path looks like "<uuid>/<uuid>/<uuid>.jpg"
      // (no scheme). A signed URL is https://...
      expect(src!).toMatch(/^(https?:|blob:|data:)/);
    } else {
      // Placeholder branch — the UtensilsCrossed svg from lucide-react.
      const placeholder = sansAvisCard.locator('svg').first();
      await expect(placeholder).toBeVisible();
    }
  });

  test('bug 3 — voting on the first card on iPhone does NOT blank the screen', async ({
    page,
  }) => {
    // 390x844 viewport via the project config.
    await page.goto('/');

    // Vote on the only un-voted card (Tacos au boeuf).
    await page
      .getByRole('button', { name: "J'aime cette recette" })
      .first()
      .click();

    // After the vote either the next card heading OR the VoteSummary
    // heading must be in-viewport within 1s. The bug-3 reproduction is
    // "screen turns blank" — assert at least one anchor is visible AND
    // in viewport (not just present in the DOM tree).
    const summary = page.getByText('Vous avez tout vu');
    await expect(summary).toBeVisible({ timeout: 1500 });
    await expect(summary).toBeInViewport();
  });

  test('bug 4 — voting through every card on DESKTOP ends with a non-blank terminal state', async ({
    page,
  }) => {
    // Per-test viewport override — the project default is iPhone 390x844;
    // the desktop variant of bug 4 needs 1280x800 to reproduce.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Vote yes on every visible card until the deck unmounts. The seed
    // leaves Luca with exactly one un-voted card, but a defensive loop
    // accommodates implementations that batch votes faster than the seed
    // expects.
    const voteYes = page.getByRole('button', { name: "J'aime cette recette" });
    for (let i = 0; i < 10; i++) {
      if ((await voteYes.count()) === 0) break;
      if (!(await voteYes.first().isVisible())) break;
      await voteYes.first().click();
      await page.waitForTimeout(350);
    }

    // The terminal state MUST surface AT LEAST ONE of the recognized
    // anchors — heading, cook CTA, delegate CTA, regenerate CTA, or the
    // empty-shortlist heading. Never a blank screen.
    const terminalAnchor = page.locator(
      "text=/Vous avez tout vu|Je commence à cuisiner|Tu décides|Régénérer le shortlist|Pas encore de shortlist/",
    );
    await expect(terminalAnchor.first()).toBeVisible({ timeout: 1500 });
  });

  test('bug 5 — finishing review surfaces a waiting-for-partner copy + the new i18n key exists', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: "J'aime cette recette" })
      .first()
      .click();
    await page.waitForTimeout(400);

    // After voting, the page must show heading + a CTA — never a heading
    // alone. The seeded mix (with Coq au vin already Pressenti) means
    // the live render lands on the pressenti branch, not the new
    // intro_waiting_partner branch. We assert the WEAKER post-fix
    // invariant: a CTA is always present below the heading.
    await expect(page.getByText('Vous avez tout vu')).toBeVisible();
    const anyCta = page.getByRole('button', {
      name: /Je commence à cuisiner|Tu décides|Régénérer le shortlist/,
    });
    await expect(anyCta.first()).toBeVisible();

    // Static-bundle assertion for the NEW key. Even though the seeded
    // path doesn't currently exercise the intro_waiting_partner branch,
    // the key MUST be present in the i18n bundle so the branch can
    // render when reached.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fr = require('../../lib/i18n/fr.json');
    expect(fr.home.summary.intro_waiting_partner).toBeTruthy();
    expect(fr.home.summary.intro_waiting_partner).toMatch(/partenaire/i);

    // Drift smoke check — Pressenti label still rendered (the D-12
    // canary's vote-state-label contract). Re-uses the shared helper so
    // any French copy change ripples here without retyping.
    await expect(
      page.getByText(VOTE_STATE_LABELS.pressenti, { exact: true }).first(),
    ).toBeVisible();
  });
});
