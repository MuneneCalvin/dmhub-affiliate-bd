import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
});
const configuration = {
    name: 'Partner offer',
    type: 'percentage',
    value: '12.35',
    currency: 'USD',
    display: 'bar',
    message: '{benefit} from {offer_name} is active.',
    applied_message: '{saving} saved with {offer_name}.',
    combines_with_other_discounts: true,
    background_color: '#ffffff',
    text_color: '#17202a',
};
const grant = {
    id: 'grant-a',
    referral_id: 'referral-a',
    code: 'DMH-CODE',
    clicked_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    configuration,
};
try {
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
    });
    let current = {
        grant,
        saving: 0,
        currency: 'USD',
        eligible: false,
        empty: true,
        applied: false,
    };
    await page.route('https://woo.test/**', async (route) => {
        if (route.request().method() === 'POST')
            return route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: current }),
            });
        return route.fulfill({
            contentType: 'text/html',
            body: '<html lang="en"><body><h1>Test shop</h1></body></html>',
        });
    });
    await page.goto('https://woo.test/?referral_id=referral-a');
    await page.evaluate(() => {
        window.dmhubOffer = {
            url: '/?wc-ajax=dmhub_offer',
            dismiss: 'Dismiss',
        };
    });
    await page.addScriptTag({
        path: 'integrations/woocommerce/dmhub-promotions/assets/offer.js',
    });
    await page.locator('#dmhub-offer-notice').waitFor();
    assert.match(
        await page.locator('#dmhub-offer-notice').innerText(),
        /12.35%/,
    );
    current = {
        ...current,
        saving: 12.35,
        empty: false,
        eligible: true,
        applied: true,
    };
    await page.evaluate(() =>
        document.dispatchEvent(new Event('wc-blocks_added_to_cart')),
    );
    await page.waitForFunction(() =>
        document
            .querySelector('#dmhub-offer-notice')
            ?.textContent.includes('$12.35 saved'),
    );
    current = { ...current, saving: 0, eligible: false, applied: false };
    await page.evaluate(() =>
        document.dispatchEvent(new Event('wc-blocks_removed_from_cart')),
    );
    await page.locator('#dmhub-offer-notice').waitFor({ state: 'detached' });
    await page.close();

    const shopify = await browser.newPage();
    let discountRequest;
    const cart = {
        item_count: 1,
        currency: 'USD',
        discount_codes: [
            { code: 'OTHER', applicable: true },
            { code: grant.code, applicable: true },
        ],
        cart_level_discount_applications: [
            { title: grant.code, total_allocated_amount: 1235 },
        ],
        items: [],
    };
    await shopify.route('https://shop.test/**', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/apps/dmhub')
            return route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify(grant),
            });
        if (url.pathname.startsWith('/cart')) {
            if (route.request().method() === 'POST')
                discountRequest = route.request().postDataJSON();
            return route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify(cart),
            });
        }
        return route.fulfill({
            contentType: 'text/html',
            body: '<html lang="en"><body><div id="dmhub-offer-config" data-proxy="/apps/dmhub"></div></body></html>',
        });
    });
    await shopify.goto('https://shop.test/?referral_id=referral-a');
    await shopify.evaluate(() => {
        window.Shopify = { routes: { root: '/' } };
    });
    await shopify.addScriptTag({
        path: 'integrations/shopify/extensions/dmhub-offer/assets/dmhub-offer.js',
    });
    await shopify.locator('#dmhub-offer-notice').waitFor();
    assert.match(
        await shopify.locator('#dmhub-offer-notice').innerText(),
        /\$12.35 saved/,
    );
    assert.equal(discountRequest.attributes.dmhub_promotion_grant, grant.id);
    assert.ok(discountRequest.discount.includes('OTHER'));
    await shopify.getByRole('button', { name: 'Dismiss' }).click();
    await shopify.locator('#dmhub-offer-notice').waitFor({ state: 'detached' });
    assert.equal(
        await shopify.evaluate(
            () => JSON.parse(localStorage.getItem('dmhub-promotion')).id,
        ),
        grant.id,
    );
    await fs.mkdir('release-evidence', { recursive: true });
    await fs.writeFile(
        'release-evidence/promotion-storefronts.json',
        JSON.stringify(
            {
                passed: true,
                checks: [
                    'Woo empty-cart offer',
                    'Woo actual saving',
                    'Woo ineligible cart hides message',
                    'Shopify native discount application',
                    'Shopify combinations',
                    'Dismiss preserves grant',
                ],
                externalCommerceServices: 'mocked',
            },
            null,
            2,
        ),
    );
    console.log(
        'PASS: WooCommerce and Shopify storefront contract checks (mocked commerce responses).',
    );
} finally {
    await browser.close();
}
