// Phase 10 TEST-04 — fresh-project teardown: re-seed the DB so the next
// `seeded` run sees populated data again. RESEARCH "Open Question 1"
// recommendation: yes, re-seed (symmetry with setup; keeps `seeded`
// preconditions intact regardless of project ordering).
import { test as teardown } from '@playwright/test';
import { execSync } from 'child_process';

teardown('reseed test DB after invite-code spec', async () => {
  execSync(
    [
      'cd ../backend',
      `ENVIRONMENT=test`,
      `DATABASE_URL=$DATABASE_URL_TEST`,
      'uv run seed',
    ].join(' && '),
    { stdio: 'inherit', shell: '/bin/bash' },
  );
});
