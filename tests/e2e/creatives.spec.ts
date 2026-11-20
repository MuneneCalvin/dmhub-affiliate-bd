import { expect, test } from '@playwright/test';
import path from 'node:path';
import { as, seeded } from './helpers';

// Playwright runs from the repository root.
const banner = path.resolve('tests/e2e/fixtures/creative-banner.png');

test('advertiser uploads a creative, renames it and filters the library by type', async ({
    browser,
}) => {
    const page = await as(browser, 'advertiser');
    await page.goto('/advertiser/creatives/index');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Creatives' }),
    ).toBeVisible();

    // Upload through the drop zone: the file input is named by the card.
    await page.getByLabel(/Drop files to upload/).setInputFiles(banner);
    const dialog = page.getByRole('dialog', { name: 'Upload creative' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Offer' }).click();
    await page
        .getByRole('option', { name: seeded.runningOffer, exact: true })
        .click();
    await dialog.getByLabel('Material name').fill('E2E Summer Banner');
    await dialog.getByRole('button', { name: 'Upload creative' }).click();
    await expect(dialog).toBeHidden();

    const grid = page.getByRole('region', { name: 'Creatives' });
    const card = grid
        .locator('[data-slot="creative-card"]')
        .filter({ hasText: 'E2E Summer Banner' });
    await expect(card).toBeVisible();
    await expect(card.getByText('300×250')).toBeVisible();
    await expect(card.getByText(seeded.runningCampaign)).toBeVisible();

    // Edit the name; saving returns to the library.
    await card.getByRole('link', { name: 'Edit E2E Summer Banner' }).click();
    await expect(
        page.getByRole('heading', { level: 1, name: 'Edit creative' }),
    ).toBeVisible();
    await page.getByLabel('Material name').fill('E2E Summer Banner v2');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/advertiser\/creatives\/index/);
    await expect(
        grid.getByRole('link', { name: 'E2E Summer Banner v2', exact: true }),
    ).toBeVisible();

    // Filter by type: text links hide the banner, banners show it again.
    const types = page.getByRole('group', { name: 'Creative type' });
    await types.getByRole('button', { name: /Text links/ }).click();
    await expect(page).toHaveURL(/type=text/);
    await expect(
        grid.getByRole('link', { name: 'E2E Summer Banner v2', exact: true }),
    ).toBeHidden();
    await types.getByRole('button', { name: /Banners/ }).click();
    await expect(page).toHaveURL(/type=banner/);
    await expect(
        grid.getByRole('link', { name: 'E2E Summer Banner v2', exact: true }),
    ).toBeVisible();
    await expect(
        types.getByRole('button', { name: /Banners/ }),
    ).toHaveAttribute('aria-pressed', 'true');
});

test('advertiser opens a creative and sees its embed code', async ({
    browser,
}) => {
    const page = await as(browser, 'advertiser');
    await page.goto('/advertiser/creatives/index?type=banner');
    await page
        .getByRole('link', { name: 'E2E Summer Banner v2', exact: true })
        .click();
    await expect(
        page.getByRole('heading', { level: 1, name: 'E2E Summer Banner v2' }),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Copy: Embed code (click tracking)' }),
    ).toBeVisible();
    await expect(page.getByText('300×250').first()).toBeVisible();
});
