import { expect, test } from '@playwright/test';

// Smoke tests — prove the core user journeys still work end-to-end.
// These run against `npm run dev` (Vite) and don't mock anything.
// Each test starts with a fresh context so localStorage doesn't bleed across.

test.beforeEach(async ({ page }) => {
    // Pre-seed the tour flag so the welcome overlay doesn't intercept clicks.
    await page.addInitScript(() => {
        localStorage.setItem('fu_tour_seen', '1');
    });
    await page.goto('/');
    // Wait for the loading screen to fade out.
    await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 15_000 });
});

test('home tab renders the greeting and clock', async ({ page }) => {
    await page.locator('[data-mode="home"]').click();
    await expect(page.locator('#greeting')).toBeVisible();
    await expect(page.locator('#dateTime')).toBeVisible();
});

test('nav tabs switch via keyboard shortcuts 1 / 2 / 3', async ({ page }) => {
    await page.keyboard.press('2');
    await expect(page.locator('.focus-content')).toBeVisible();
    await page.keyboard.press('3');
    await expect(page.locator('.ambient-content')).toBeVisible();
    await page.keyboard.press('1');
    await expect(page.locator('.home-content')).toBeVisible();
});

test('focus timer starts, pauses, and resets', async ({ page }) => {
    await page.locator('[data-mode="focus"]').click();
    const startBtn = page.locator('#startBtn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    // Running state flips the button label to Pause.
    await expect(page.locator('#startBtn')).toContainText(/pause/i);
    // Pause returns to Start.
    await page.locator('#startBtn').click();
    await expect(page.locator('#startBtn')).toContainText(/start/i);
    // Reset button exists and is clickable.
    await page.locator('#resetBtn').click();
});

test('can add, complete, and delete a task', async ({ page }) => {
    await page.locator('[data-mode="focus"]').click();
    const input = page.locator('#taskInput');
    await input.fill('Audit-generated smoke task');
    await input.press('Enter');
    const item = page.locator('.task-item', { hasText: 'Audit-generated smoke task' });
    await expect(item).toBeVisible();

    // Complete via the checkbox.
    await item.locator('input[type="checkbox"]').check();
    await expect(item.locator('.task-text')).toHaveClass(/task-completed/);

    // Delete via the ✕ button.
    await item.locator('[data-delete-task]').click();
    await expect(item).toHaveCount(0);
});

test('stats bar is visible on Focus tab', async ({ page }) => {
    await page.locator('[data-mode="focus"]').click();
    await expect(page.locator('#statSessionsToday')).toBeVisible();
    await expect(page.locator('#statStreak')).toBeVisible();
});

test('Settings modal opens and closes', async ({ page }) => {
    await page.locator('.settings-trigger').click();
    await expect(page.locator('#settingsPanel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsPanel')).toBeHidden();
});

test('Help Center opens via "?" shortcut', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('.help-center-overlay, [aria-label="Help Center"]')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Escape');
});

test('Ambient sound browser opens', async ({ page }) => {
    await page.locator('[data-mode="ambient"]').click();
    // Open the sound library modal.
    const openBtn = page.locator('#openSoundLibraryBtn, button:has-text("Browse Sound Library")').first();
    await openBtn.click();
    // A sound card for rain should be present.
    await expect(page.locator('[data-sound="rain"]').first()).toBeVisible();
});

test('page renders without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    // Navigate and exercise each tab briefly.
    await page.goto('/');
    await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 15_000 });
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await page.keyboard.press('1');
    // Allow known-noisy Babylon/WebGL warnings to be skipped — filter obvious
    // browser capability messages rather than real failures.
    const ignorable = /WebGPU|Failed to load resource.*(favicon|\.ico)|deprecated/i;
    const real = errors.filter((e) => !ignorable.test(e));
    expect(real, `Console errors:\n${real.join('\n')}`).toEqual([]);
});

test('Privacy and Terms pages respond with 200', async ({ page }) => {
    const privacy = await page.request.get('/privacy.html');
    expect(privacy.status()).toBe(200);
    const terms = await page.request.get('/terms.html');
    expect(terms.status()).toBe(200);
});
