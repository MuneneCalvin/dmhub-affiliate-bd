import { expect, test } from '@playwright/test';
import { as } from './helpers';

test('network owner filters and searches advertisers, then edits a partner card', async ({
    browser,
}) => {
    const page = await as(browser, 'network');
    await page.goto('/advertisers/index');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Advertisers' }),
    ).toBeVisible();

    const tiles = page.getByRole('region', { name: 'Filter by status' });
    const all = tiles.getByRole('button', { name: /^All advertisers/ });
    await expect(all).toHaveAttribute('aria-pressed', 'true');

    // Inactive: the server filters the list.
    await tiles.getByRole('button', { name: /^Inactive/ }).click();
    await expect(page).toHaveURL(/status=inactive/);
    await expect(
        tiles.getByRole('button', { name: /^Inactive/ }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Back to active advertisers; the demo advertiser is one of them.
    await tiles.getByRole('button', { name: /^Active/ }).click();
    await expect(page).toHaveURL(/status=active/);
    const list = page.getByRole('region', { name: 'Advertiser list' });
    const rows = list.getByRole('row');
    await expect(rows).not.toHaveCount(1);

    // Local search narrows the page and shows the empty state when nothing matches.
    const search = list.getByRole('searchbox', { name: 'Search this page' });
    await search.fill('zz-no-such-advertiser');
    await expect(
        list.getByRole('heading', { name: 'No matches' }),
    ).toBeVisible();
    await search.fill('');

    const details = list.getByRole('link', { name: /^Details for / }).first();
    const name = (await details.getAttribute('aria-label'))!.replace(
        'Details for ',
        '',
    );
    await search.fill(name);
    await expect(list.getByRole('link', { name: /^Details for / })).toHaveCount(
        1,
    );
    await list.getByRole('link', { name: `Details for ${name}` }).click();

    // The partner profile.
    await expect(page).toHaveURL(/advertisers\/show/);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(
        page.getByRole('navigation', { name: 'Advertiser navigation' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Edit Company details' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Business details' });
    const industry = dialog.getByRole('textbox', { name: 'Industry' });
    const updated = `E2E Industry ${Date.now()}`;
    await industry.fill(updated);
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
        page.getByRole('region', { name: 'Company details' }),
    ).toContainText(updated);
});
