// Phase 10 TEST-02 / TEST-03 / TEST-04 — orchestrates uvicorn (test mode)
// + Next.js dev + the two-project Playwright suite.
// Source: https://playwright.dev/docs/test-webserver (multiple servers)
//         https://playwright.dev/docs/test-projects (project dependencies)
//
// NOTE: Playwright loads this config via its CJS loader, so ESM-only idioms
// like `import.meta.url` / `fileURLToPath` are not available here even though
// tsconfig.json declares `module: "esnext"`. Keep imports CJS-compatible.
import { defineConfig, devices } from '@playwright/test';

const SEED_AUTH_TOKEN = process.env.SEED_AUTH_TOKEN ?? 'test-token-luca';
const DATABASE_URL_TEST =
  process.env.DATABASE_URL_TEST ??
  'postgresql+psycopg2://postgres:postgres@localhost:5433/aldente_test';

export default defineConfig({
  testDir: './tests/e2e',
  // Phase 10 specs only — exclude pre-existing tests that target a different
  // backend topology (diag.spec.ts, w1-gate.spec.ts). These were committed
  // before Phase 10 and may not work against the test DB; they are NOT
  // re-scoped in this milestone (executor-scope-creep guard).
  testIgnore: [/diag\.spec\.ts$/, /w1-gate\.spec\.ts$/],
  workers: 1,                   // D-05: serial, single-machine target
  fullyParallel: false,
  forbidOnly: !!process.env.CI, // local-only milestone, but harmless
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // TEST-04 setup project: truncates the 6 tables BEFORE the fresh spec runs.
    {
      name: 'fresh-setup',
      testMatch: /globalSetup\.fresh\.ts$/,
      teardown: 'fresh-teardown',
    },
    {
      name: 'fresh-teardown',
      testMatch: /globalTeardown\.fresh\.ts$/,
    },

    // Bulk: every spec EXCEPT the invite-code happy-path runs with Bearer auth.
    {
      name: 'seeded',
      testMatch: /.*\.spec\.ts$/,
      // NOTE: per-project testIgnore replaces the top-level testIgnore (it does
      // not merge), so the pre-existing diag.spec.ts / w1-gate.spec.ts must be
      // re-listed here too — otherwise the seeded project picks them up.
      testIgnore: [
        /diag\.spec\.ts$/,
        /w1-gate\.spec\.ts$/,
        /invite-code-happy-path\.spec\.ts$/,
        /globalSetup\.fresh\.ts$/,
        /globalTeardown\.fresh\.ts$/,
      ],
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          // D-01: Bearer fallback path. Backend's auth.py accepts this verbatim.
          Authorization: `Bearer ${SEED_AUTH_TOKEN}`,
        },
      },
    },

    // TEST-04: the only spec that exercises the real cookie flow.
    {
      name: 'fresh',
      testMatch: /invite-code-happy-path\.spec\.ts$/,
      dependencies: ['fresh-setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd ../backend && uv run uvicorn app.main:app --port 8000 --no-access-log',
      url: 'http://localhost:8000/healthz',
      timeout: 120_000,                      // Pitfall 1
      reuseExistingServer: !process.env.CI,
      env: {
        ENVIRONMENT: 'test',
        DATABASE_URL: DATABASE_URL_TEST,
        DATABASE_URL_TEST,
        // Intentionally no GEMINI_API_KEY — D-04 guard short-circuits before lazy client init.
        // Intentionally no SUPABASE_* — T-10-06 guard short-circuits before client init.
      },
      stdout: 'pipe',
      stderr: 'pipe',
      name: 'backend',
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      timeout: 180_000,                      // Pitfall 1: Next.js 16 cold-start
      reuseExistingServer: !process.env.CI,
      env: {
        // 01.1 D-04: api.ts uses '' in prod (same-origin via Vercel rewrite); in test
        // we point at the test backend directly.
        NEXT_PUBLIC_API_BASE: 'http://localhost:8000',
      },
      stdout: 'pipe',
      stderr: 'pipe',
      name: 'frontend',
    },
  ],
});
