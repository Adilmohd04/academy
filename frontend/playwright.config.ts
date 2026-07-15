import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Certificate Designer Studio E2E and visual
 * regression tests.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §13.5.
 *
 * Tests live in `frontend/e2e/` (created in Phase 2). The "designer-visual"
 * project covers the preview-vs-PDF pixel parity check (Property 6 / Req 12.1)
 * with `pixelmatch`. The "designer-e2e" project covers drag-and-drop,
 * keyboard nudge, and the approval flow.
 *
 * Run locally:
 *   npx playwright test
 *   npx playwright test --project=designer-visual
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Honor the same dev TLS opt-out as `npm run dev`.
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'designer-e2e',
      testMatch: /designer\..*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'designer-visual',
      // Pixel-parity tests: render the same template in browser preview and via
      // server PDF, then diff with pixelmatch (Property 6, Req 12.1).
      testMatch: /visual\..*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1754, height: 1240 } },
    },
    {
      name: 'verify-portal',
      // Public verification portal happy-path (Req 11) — no auth.
      testMatch: /verify\..*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Reuse a running dev server when present; otherwise spin one up.
  webServer: process.env.CI
    ? {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : undefined,
});
