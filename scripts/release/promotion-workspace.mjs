// Run against a disposable seeded database; never use a production account.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.PROMOTION_PREVIEW_URL || 'http://127.0.0.1:8879';
const evidence = process.env.PROMOTION_EVIDENCE_DIR || 'release-evidence';
await fs.mkdir(evidence, { recursive: true });
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
    const setup = page
        .getByRole('link', { name: /Set up promotion|Edit promotion/ })
        .first();
    await setup.click();
    await page.waitForURL(/\/promotions\?offer=\d+/);
    await page
        .getByRole('heading', { name: 'Customer promotion', exact: true })
        .waitFor();
    const discount = page.getByLabel('Discount value', { exact: true });
    await discount.fill('');
    await page.getByRole('button', { name: 'Publish promotion' }).click();
    const validation = page
        .getByRole('alert')
        .filter({ hasText: 'Review these items before publishing' });
    await validation.waitFor();
    await validation
        .getByRole('link', { name: /Enter a positive discount/ })
        .click();
    assert.equal(
        await discount.evaluate(
            (element) => element === document.activeElement,
        ),
        true,
    );
    await page
        .getByRole('combobox', { name: 'Eligible catalogue', exact: true })
        .click();
    await page
        .getByRole('option', { name: 'Selected products', exact: true })
        .click();
    await page
        .getByLabel('Product IDs (comma separated)', { exact: true })
        .pressSequentially('11,22');
    await page
        .getByRole('combobox', { name: 'Eligible catalogue', exact: true })
        .click();
    await page
        .getByRole('option', { name: 'Entire catalogue', exact: true })
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
    await page.getByRole('link', { name: 'Back to offers' }).click();
    await page.getByText('17.35%', { exact: false }).first().waitFor();
    await page.screenshot({
        path: `${evidence}/customer-promotions-hub.png`,
        fullPage: true,
    });
    await page
        .getByRole('link', { name: /Edit promotion/ })
        .first()
        .click();
    await page.waitForURL(/\/promotions\?offer=\d+/);
    await page.reload();
    assert.equal(
        await page.getByLabel('Discount value', { exact: true }).inputValue(),
        '17.35',
    );
    await page.screenshot({
        path: `${evidence}/customer-promotions-desktop.png`,
        fullPage: true,
    });
    await page.setViewportSize({ width: 768, height: 1024 });
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
    );
    await page.screenshot({
        path: `${evidence}/customer-promotions-mobile.png`,
        fullPage: true,
    });
    await page.getByRole('link', { name: 'Manage stores' }).click();
    await page.getByRole('combobox', { name: 'Platform', exact: true }).click();
    await page.getByRole('option', { name: 'Shopify', exact: true }).click();
    await page
        .getByLabel('Store name', { exact: true })
        .fill('Promotion preview');
    const domain = page.getByLabel('Store domain (without https://)', {
        exact: true,
    });
    await domain.fill('shop.example.com');
    await page.getByRole('button', { name: 'Add store', exact: true }).click();
    await page
        .getByText('Use the myshopify.com store domain.', { exact: true })
        .waitFor();
    assert.equal(await domain.getAttribute('aria-invalid'), 'true');
    assert.equal(await discount.inputValue(), '17.35');
    // Activate the disposable WooCommerce fixture through the same handshake as the plugin.
    await page.getByRole('combobox', { name: 'Platform', exact: true }).click();
    await page
        .getByRole('option', { name: 'WooCommerce', exact: true })
        .click();
    const storeDomain = `preview-${Date.now()}.example`;
    await domain.fill(storeDomain);
    await page.getByRole('button', { name: 'Add store', exact: true }).click();
    const token = await page
        .getByLabel('Connection key', { exact: true })
        .inputValue();
    const currency = await page
        .locator('#store-connections > p')
        .first()
        .innerText();
    const connected = await page.request.post(`${base}/api/v1/stores/connect`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
            domain: storeDomain,
            currency: currency.match(/([A-Z]{3})\./)[1],
        },
    });
    assert.equal(connected.ok(), true);
    await page.reload();
    await page.getByRole('checkbox', { name: new RegExp(storeDomain) }).check();
    await page.getByText('5 of 5 sections complete').waitFor();
    await page
        .getByRole('button', { name: 'Publish promotion', exact: true })
        .click();
    await page
        .getByText('Customer promotion published.', { exact: true })
        .waitFor();
    await discount.fill('19');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await page.getByText('Promotion draft saved.', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Back to offers' }).click();
    await page.getByText('17.35%', { exact: false }).first().waitFor();
    await page
        .getByRole('link', { name: /Edit promotion/ })
        .first()
        .click();
    assert.equal(await discount.inputValue(), '19');
    await page.getByRole('button', { name: 'Pause new grants' }).click();
    await page.getByText('paused · v1', { exact: true }).waitFor();
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
                path: `${evidence}/promotion-workspace-failure.png`,
                fullPage: true,
                mask: [page.locator('input[readonly]')],
            });
        }
    throw error;
} finally {
    await browser.close();
}
