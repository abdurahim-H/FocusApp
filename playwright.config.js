import { defineConfig, devices } from '@playwright/test';

// Playwright smoke tests — run against the Vite dev server.
// Run once locally: `npx playwright install chromium` to fetch the browser.
// Then: `npm test` (headless) or `npm run test:ui` (debugger).
export default defineConfig({
    testDir: './tests',
    // Tests have to wait through the loading screen + 22 audio preload
    // attempts per page load; keep a generous per-test budget.
    timeout: 60_000,
    expect: { timeout: 10_000 },
    // Tests share a single Vite dev server, so running them in parallel
    // causes flaky loading-screen timeouts. Serial is fast enough (~1 min)
    // and gives deterministic results.
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
});
4