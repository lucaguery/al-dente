// Phase 10 TEST-04 — fresh-project setup: TRUNCATE the 6 tables before
// invite-code-happy-path.spec.ts runs. The teardown re-seeds so subsequent
// `seeded` runs see a populated DB again.
//
// Uses `docker exec` against the same postgres-test container the suite
// already brings up (docker-compose.test.yml) — minimum dependency surface,
// no Node.js postgres client needed in frontend/.
import { test as setup } from '@playwright/test';
import { execSync } from 'child_process';

setup('truncate test DB for invite-code spec', async () => {
  // Sanity guard mirroring the seed CLI's T-10-01 hard-refusal — if the
  // container points anywhere other than `aldente_test`, abort.
  const dbName = execSync(
    'docker exec aldente-postgres-test psql -U postgres -d aldente_test -tAc "SELECT current_database()"',
    { encoding: 'utf-8' },
  ).trim();
  if (dbName !== 'aldente_test') {
    throw new Error(
      `globalSetup.fresh.ts refused: expected aldente_test, got ${dbName}`,
    );
  }

  // CASCADE handles FKs across the 6 tables. push_subscriptions is included
  // for completeness even though no spec touches it (TRUNCATE is idempotent).
  execSync(
    'docker exec aldente-postgres-test psql -U postgres -d aldente_test -c ' +
      '"TRUNCATE households, members, recipes, votes, cooking_logs, ' +
      'daily_shortlists, push_subscriptions CASCADE"',
    { stdio: 'inherit' },
  );
});
