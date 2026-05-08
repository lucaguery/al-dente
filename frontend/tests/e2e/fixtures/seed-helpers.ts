// Phase 10 TEST-02 — helpers shared by every spec.
// Single source of truth for the seeded auth token + API base URL.
// Specs import from here so changing the seed conventions doesn't ripple
// through 14 spec files.

export const SEED_AUTH_TOKEN =
  process.env.SEED_AUTH_TOKEN ?? 'test-token-luca';

export const PARTNER_AUTH_TOKEN = 'test-token-partner';

export const SEEDED_INVITE_CODE = 'TEST01';

export const SEEDED_HOUSEHOLD_NAME = 'Foyer Test';
export const SEEDED_MEMBER_LUCA = 'Luca';
export const SEEDED_MEMBER_PARTNER = 'Partner';

// Recipe titles that appear in the seeded shortlist (matches backend seed.py shortlist_recipe_slugs).
// NOTE: The backend seed uses ASCII-only titles ("Ragu bolognese", not "Ragù")
// to dodge encoding traps in psql -t -A output. Keep this helper byte-aligned
// with backend/app/cli/seed.py _recipe_specs() title fields.
export const SHORTLIST_RECIPES = {
  valide: 'Ragu bolognese',         // both members yes
  pressenti: 'Coq au vin',          // luca yes, partner none
  conteste: 'Butter chicken',       // luca yes, partner no
  rejete: 'Shawarma',               // both no
  sansAvis: 'Tacos au boeuf',       // neither
} as const;

// French vote-state labels (mirror of frontend/lib/i18n/fr.json).
// Specs assert these labels appear in the DOM after voting.
export const VOTE_STATE_LABELS = {
  valide: 'Validé',
  pressenti: 'Pressenti',
  conteste: 'Contesté',
  rejete: 'Rejeté',
  sansAvis: 'Sans avis',
} as const;

// Cooking log ratings actually present in the seed.
export const SEEDED_LOG_RATINGS = ['loved', 'liked', 'disliked'] as const;

// Helper accessors — preferred call shape for specs (vs. reading process.env directly).
export function getSeedAuthToken(): string {
  return SEED_AUTH_TOKEN;
}

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';
}
