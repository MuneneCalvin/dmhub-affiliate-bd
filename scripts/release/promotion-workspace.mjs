// Run against a disposable seeded database; never use a production account.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.PROMOTION_PREVIEW_URL || 'http://127.0.0.1:8879';
const browser = await chromium.launch({ headless: true });
try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
    });
    await page
        .context()
        .addCookies([{ name: 'locale', value: 'en', url: base }]);
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/login`);
    await page.locator('[name=email]').fill('promotion-preview@example.test');
    await page.locator('[name=password]').fill('preview-password');
    await page.locator('button[type=submit]').click();
    await page.waitForURL((url) => !url.pathname.includes('login'));
    await page.goto(`${base}/advertiser/campaigns/show/1?tab=offers`);
    await page
        .getByText('Customer promotions & stores', { exact: true })
        .click();
    await page.getByLabel('Discount value', { exact: true }).fill('17.35');
    await page
        .getByLabel('Starts at', { exact: true })
        .fill('2026-11-01T00:00');
    await page
        .getByLabel('Validity after referral (hours)', { exact: true })
        .fill('24');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Promotion draft saved.', { exact: true }).waitFor();
    await page.reload();
    await page
        .getByText('Customer promotions & stores', { exact: true })
        .click();
    assert.equal(
        await page.getByLabel('Discount value', { exact: true }).inputValue(),
        '17.35',
    );
    await fs.mkdir('release-evidence', { recursive: true });
    await page.screenshot({
        path: 'release-evidence/customer-promotions-desktop.png',
        fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
    );
    await page.screenshot({
        path: 'release-evidence/customer-promotions-mobile.png',
        fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
        'PASS: campaign promotion editor saves and reloads configured values on desktop and mobile.',
    );
} catch (error) {
    for (const context of browser.contexts())
        for (const page of context.pages()) {
            console.error(
                (await page.locator('body').innerText()).slice(0, 5000),
            );
            await page.screenshot({
                path: 'release-evidence/promotion-workspace-failure.png',
                fullPage: true,
            });
        }
    throw error;
} finally {
    await browser.close();
}
