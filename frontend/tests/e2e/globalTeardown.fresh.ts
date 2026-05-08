// Phase 10 TEST-04 — fresh-project teardown: re-seed the DB so the next
// `seeded` run sees populated data again. RESEARCH "Open Question 1"
// recommendation: yes, re-seed (symmetry with setup; keeps `seeded`
// preconditions intact regardless of project ordering).
import { test as teardown } from '@playwright/test';
import { execSync } from 'child_process';

teardown('reseed test DB after invite-code spec', async () => {
  // The webServer block in playwright.config.ts already exports
  // ENVIRONMENT=test + DATABASE_URL=DATABASE_URL_TEST for the backend
  // process; we mirror them here so `uv run seed` resolves the same DB.
  // Note: bash `VAR=value uv run seed` (prefix-style) is the one form
  // that DOES export to the child process — unlike `VAR=value && uv run`
  // which only sets it in the parent shell without export.
  execSync(
    'cd ../backend && ' +
      'ENVIRONMENT=test ' +
      `DATABASE_URL=${process.env.DATABASE_URL_TEST ?? 'postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test'} ` +
      `DATABASE_URL_TEST=${process.env.DATABASE_URL_TEST ?? 'postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test'} ` +
      'uv run seed',
    { stdio: 'inherit', shell: '/bin/bash' },
  );
});
