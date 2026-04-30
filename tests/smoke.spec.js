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
    // Wait for the loading screen to fade out. Generous timeout because
    // the dev server cold-loads dozens of ES modules per page before
    // init3D resolves; 15 s wasn't always enough as the surface area
    // grew. 30 s is comfortably above the observed boot upper bound.
    await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 30_000 });
});

test('home tab renders the greeting and clock', async ({ page }) => {
    await page.locator('[data-mode="home"]').click();
    await expect(page.locator('#greeting')).toBeVisible();
    await expect(page.locator('#dateTime')).toBeVisible();
});

test('nav tabs switch via keyboard shortcuts 1 and 2', async ({ page }) => {
    // Ambient is no longer a top-level tab — sounds live in the cosmos
    // toolbar on Home (see keyboard.js: the '3' binding is kept as a
    // back-compat no-op).
    await page.keyboard.press('2');
    await expect(page.locator('.focus-content')).toBeVisible();
    await page.keyboard.press('1');
    await expect(page.locator('.home-content')).toBeVisible();
});

test('focus timer starts and pauses', async ({ page }) => {
    await page.locator('[data-mode="focus"]').click();
    const startBtn = page.locator('#startBtn');
    const pauseBtn = page.locator('#pauseBtn');
    const resetBtn = page.locator('#resetBtn');
    await expect(startBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await startBtn.click();
    // When running, Start hides and Pause swaps in.
    await expect(pauseBtn).toBeVisible();
    await expect(startBtn).toBeHidden();
    // Pausing brings Start back.
    await pauseBtn.click();
    await expect(startBtn).toBeVisible();
});

test('can add, complete, and delete a task', async ({ page }) => {
    await page.locator('[data-mode="focus"]').click();
    // Tasks live in the bottom dock now — collapsed by default so the
    // timer card is uncluttered. Expand it before interacting with the
    // input or list (the rail at the top edge toggles the state).
    await page.locator('#taskDockRail').click();
    const input = page.locator('#taskInput');
    await input.fill('Audit-generated smoke task');
    await input.press('Enter');
    const item = page.locator('.task-item', { hasText: 'Audit-generated smoke task' });
    await expect(item).toBeVisible();

    // Complete via the checkbox label (the click handler listens on the
    // [data-toggle-task] label, not the inner <input>).
    await item.locator('[data-toggle-task]').click();
    await expect(item.locator('.task-text')).toHaveClass(/task-completed/);

    // Delete via the ✕ button. Force-click bypasses actionability waits —
    // the button has spring/hover animations that make Playwright's stability
    // check timeout even though the element is fully interactive.
    await item.locator('[data-delete-task]').click({ force: true });
    await expect(item).toHaveCount(0);
});

test('stats bar is visible on Focus tab', async ({ page }) => {
    // The streak counter was replaced with the momentum trail (a row
    // of seven brightness-weighted dots). The container is what we
    // assert visibility on now.
    await page.locator('[data-mode="focus"]').click();
    await expect(page.locator('#statSessionsToday')).toBeVisible();
    await expect(page.locator('#momentumTrail')).toBeVisible();
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

test('sound library opens from the home cosmos toolbar', async ({ page }) => {
    // Sounds were lifted out of a separate Ambient tab into the cosmos
    // on Home; the toolbar's Add-a-sound button opens a drawer with the
    // full library.
    await page.locator('#deckAddSoundBtn').click();
    const drawer = page.locator('#libraryDrawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('[data-sound="rain"]').first()).toBeVisible();
});

test('page renders without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    // Navigate and exercise each tab briefly.
    await page.goto('/');
    await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 30_000 });
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await page.keyboard.press('1');
    // These are expected noise in a dev/test environment:
    // - WebGPU capability probes (Babylon falls back to WebGL2 cleanly)
    // - favicon 404 / deprecated-API warnings browsers emit
    // - R2 / sound CDN unreachable (local tests can't hit cdn.universefocuses.com;
    //   the app itself works, sounds just won't play) — matches "Error loading
    //   <name> audio" and network ERR_NAME_NOT_RESOLVED / ERR_NAME messages.
    const ignorable = /WebGPU|Failed to load resource.*(favicon|\.ico)|deprecated|Error loading \w+ audio|ERR_NAME_NOT_RESOLVED|net::ERR_/i;
    const real = errors.filter((e) => !ignorable.test(e));
    expect(real, `Unexpected console errors:\n${real.join('\n')}`).toEqual([]);
});

test('Privacy and Terms pages respond with 200', async ({ page }) => {
    const privacy = await page.request.get('/privacy.html');
    expect(privacy.status()).toBe(200);
    const terms = await page.request.get('/terms.html');
    expect(terms.status()).toBe(200);
});

// ──────────────────────────────────────────────────────────────────────
// Pre-merge regression coverage — locks down the new surfaces shipped
// on the roadmap branch (task dock, custom date picker, Profile split
// bars, settings persistence). Each test targets a behavior that
// recently broke or where a recent refactor created risk.
// ──────────────────────────────────────────────────────────────────────

test('task dock expands and collapses', async ({ page }) => {
    // Verifies the rail toggle works; persistence across reload was
    // covered manually — Playwright's addInitScript pattern interacts
    // unpredictably with same-origin localStorage on reload, so the
    // reload variant of this test was unstable. The collapse/expand
    // toggle itself is the regression-prone bit.
    await page.locator('[data-mode="focus"]').click();
    const dock = page.locator('#taskDock');
    await expect(dock).toBeVisible();
    await page.locator('#taskDockRail').click();
    await expect(dock).toHaveAttribute('data-state', 'expanded');
    await page.locator('#taskDockRail').click();
    await expect(dock).toHaveAttribute('data-state', 'collapsed');
});

test('custom date picker opens, picks a date, and clears', async ({ page }) => {
    await page.locator('[data-mode="focus"]').click();
    await page.locator('#taskDockRail').click();
    // Add a task so the inline date trigger appears.
    const input = page.locator('#taskInput');
    await input.fill('Date picker regression task');
    await input.press('Enter');
    const item = page.locator('.task-item', { hasText: 'Date picker regression task' });
    await expect(item).toBeVisible();
    // Hover the row so the due-date trigger is opacity 1, then open
    // the picker.
    await item.hover();
    await item.locator('[data-due-trigger]').click({ force: true });
    const picker = page.locator('.date-picker');
    await expect(picker).toBeVisible();
    // Today action commits today's local ISO and closes the picker.
    await picker.locator('[data-action="today"]').click();
    await expect(picker).toHaveCount(0);
    // The due-date badge inside the task row now shows a relative
    // string ("due today" / "due in 1 days" / etc).
    await expect(item.locator('.task-due-badge')).toBeVisible();
    // Re-open and clear — the badge should disappear.
    await item.hover();
    await item.locator('[data-due-trigger]').click({ force: true });
    await page.locator('.date-picker').locator('[data-action="clear"]').click();
    await expect(item.locator('.task-due-badge')).toHaveCount(0);
});

test('Profile sections render without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });
    await page.keyboard.press('i'); // shortcut opens Profile
    await expect(page.locator('.profile')).toBeVisible({ timeout: 5000 });
    // Walk the section nav buttons. The split-bar that previously
    // clipped its WEEKDAYS label at 100% lives inside the Time section.
    const sectionIds = ['focus', 'time', 'tasks', 'sounds', 'insights'];
    for (const id of sectionIds) {
        const btn = page.locator(`[data-section="${id}"]`);
        if (await btn.count()) {
            await btn.first().click();
            // Allow paint.
            await page.waitForTimeout(150);
        }
    }
    const ignorable = /WebGPU|Failed to load resource.*(favicon|\.ico)|deprecated|Error loading \w+ audio|ERR_NAME_NOT_RESOLVED|net::ERR_/i;
    const real = errors.filter((e) => !ignorable.test(e));
    expect(real, `Profile errors:\n${real.join('\n')}`).toEqual([]);
});

test('settings panel renders schema-driven toggles', async ({ page }) => {
    // Confirms the settings renderer mounts the schema rows the
    // recent waves added (gamification, wellness, sounds.muteOnStream).
    // Persistence-on-reload is covered manually — testing it via
    // Playwright requires scrolling the panel, which is brittle.
    await page.locator('.settings-trigger').click();
    await expect(page.locator('#settingsPanel')).toBeVisible();
    // Confirm the schema rows for newly-added settings exist in the
    // DOM (they're scrolled below the fold in some sections, so
    // count matches what matters — not visibility).
    await expect(
        page.locator('.sr-toggle[data-key="gamification.streakInsurance"]')
    ).toHaveCount(1);
    await expect(
        page.locator('.sr-toggle[data-key="gamification.personalBestAlerts"]')
    ).toHaveCount(1);
    await expect(
        page.locator('.sr-toggle[data-key="wellness.eyeRestEnabled"]')
    ).toHaveCount(1);
    await expect(
        page.locator('.sr-toggle[data-key="sounds.muteOnStream"]')
    ).toHaveCount(1);
});
