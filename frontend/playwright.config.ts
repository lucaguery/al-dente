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

    // Bulk: every spec EXCEPT the invite-code happy-path runs with Bearer auth
    // AND a pre-set `aldente_auth` cookie. The Bearer header authenticates HTTP
    // routes (D-01 fallback, see backend/app/auth.py), but the WS upgrade
    // (backend/app/routers/ws.py) reads ONLY the cookie or `?token=` query —
    // never the Authorization header. Without the cookie, the WS closes with
    // 1008 → frontend/lib/ws.ts:113 fires DELETE /api/auth/session and
    // window.location.href = '/onboarding/welcome', racing every page.goto
    // assertion to a redirect. The cookie value mirrors SEED_AUTH_TOKEN, so
    // the backend's current_member finds the seeded member by either path.
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
        // iPhone-shape viewport on Chromium. Why not `devices['iPhone 14']`?
        // That device descriptor defaults to WebKit (Mobile Safari) and we
        // are Chromium-only per CONTEXT D-06 (no cross-browser coverage in
        // v0.2.1) — installing WebKit would add ~150MB to the bootstrap.
        // The 390x844 viewport + isMobile + hasTouch combo is what surfaces
        // the layout bugs that bite users on the actual production phones.
        // Concrete example diagnosed via Playwright MCP on 2026-05-09: the
        // bottom-sheet `position: relative` regression in
        // `frontend/components/ui/sheet.tsx` (paper-grain class overrides
        // Tailwind `fixed`) leaves the Caméra/Photothèque sheet entirely
        // off-screen on a 390x844 viewport. iPhone-size viewport + an
        // explicit `toBeInViewport()` on critical interactive elements is
        // the minimum bar to catch this class of bug going forward.
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        extraHTTPHeaders: {
          // D-01: Bearer fallback path. Backend's auth.py accepts this verbatim.
          Authorization: `Bearer ${SEED_AUTH_TOKEN}`,
        },
        storageState: {
          cookies: [
            {
              name: 'aldente_auth',
              value: SEED_AUTH_TOKEN,
              domain: 'localhost',
              path: '/',
              expires: -1,
              httpOnly: false,
              secure: false,
              sameSite: 'Lax',
            },
          ],
          origins: [],
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
        // 01.1 D-04: api.ts uses '' in prod (same-origin via Vercel rewrite). In test
        // the same '' value lets next.config.ts rewrite `/api/*` → RAILWAY_BASE
        // (defaults to http://localhost:8000 when RAILWAY_URL is unset). Pointing
        // this at a bare backend URL bypasses the rewrite, so /api/-prefixed
        // calls 404 against the backend (which mounts routes WITHOUT /api/).
        NEXT_PUBLIC_API_BASE: '',
      },
      stdout: 'pipe',
      stderr: 'pipe',
      name: 'frontend',
    },
  ],
});
