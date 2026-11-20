import { expect, test } from '@playwright/test';
import { as } from './helpers';

const bodyBackground = (page: import('@playwright/test').Page) =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('dashboard uses the light canvas and switches to dark', async ({
    browser,
}) => {
    const page = await as(browser, 'network');
    await page.goto('/dashboard');
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    expect(await bodyBackground(page)).toBe('rgb(246, 245, 255)');

    // Top bar toggle (phase 03): one button that flips light/dark.
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();

    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await expect.poll(() => bodyBackground(page)).toBe('rgb(15, 12, 36)');

    // Restore light so the stored preference does not leak into later tests.
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
});
