// Phase 10 TEST-04 — fresh-project setup: TRUNCATE the 6 tables before
// invite-code-happy-path.spec.ts runs. The teardown re-seeds so subsequent
// `seeded` runs see a populated DB again.
//
// We spawn `uv run python -c "..."` rather than installing a Node.js Postgres
// client in frontend/ — minimum dependency surface, runs against the same
// SessionLocal the backend uses.
import { test as setup } from '@playwright/test';
import { execSync } from 'child_process';

setup('truncate test DB for invite-code spec', async () => {
  // CASCADE handles FKs across the 6 tables.
  // The ENVIRONMENT=test guard in seed.py is mirrored here defensively
  // (assert "aldente_test" in settings.database_url) — if DATABASE_URL_TEST
  // is unset / wrong, the assert fires and TRUNCATE never runs.
  execSync(
    [
      'cd ../backend',
      `ENVIRONMENT=test`,
      `DATABASE_URL=$DATABASE_URL_TEST`,
      'uv run python -c "',
      'from sqlalchemy import text',
      'from app.config import settings',
      'assert \\"aldente_test\\" in settings.database_url, settings.database_url',
      'from app.db import SessionLocal',
      'with SessionLocal() as db:',
      '    db.execute(text(\\"TRUNCATE households, members, recipes, votes, cooking_logs, daily_shortlists CASCADE\\"))',
      '    db.commit()',
      '"',
    ].join(' && '),
    { stdio: 'inherit', shell: '/bin/bash' },
  );
});
