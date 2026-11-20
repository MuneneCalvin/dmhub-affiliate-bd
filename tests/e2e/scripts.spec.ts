import { expect, test } from '@playwright/test';
import { as, seeded } from './helpers';

test('publisher opens a script, copies the snippet and reads the docs', async ({
    browser,
}) => {
    const page = await as(browser, 'publisher');
    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/publisher/scripts');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Embed scripts' }),
    ).toBeVisible();

    const card = page
        .getByRole('region', { name: 'Your scripts' })
        .getByRole('button', { name: new RegExp(seeded.runningCampaign) });
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    const panel = page.getByRole('region', { name: seeded.runningCampaign });
    await expect(panel.getByText(/Installed|Not seen/).first()).toBeVisible();

    await panel.getByRole('button', { name: 'Copy: Embed script' }).click();
    await expect(page.getByText('Embed script copied')).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('/s/');

    await panel.getByRole('link', { name: 'Documentation' }).click();
    await expect(
        page.getByRole('heading', {
            level: 1,
            name: 'Integration documentation',
        }),
    ).toBeVisible();
    const toc = page.getByRole('navigation', { name: 'On this page' });
    await toc.getByRole('link', { name: 'Reference information' }).click();
    await expect(page).toHaveURL(/#reference$/);
});
