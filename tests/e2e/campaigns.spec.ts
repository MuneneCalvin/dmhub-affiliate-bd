import { expect, test, type Page } from '@playwright/test';
import { as, createCampaign, createOffer, seeded, state } from './helpers';

async function allowClipboard(page: Page) {
    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
}

test('advertiser creates a campaign through the wizard, adds an offer and finds it in the list', async ({
    browser,
}) => {
    const page = await as(browser, 'advertiser');
    const id = await createCampaign(page, 'E2E Winter Launch');

    // The workspace header shows the new campaign with its tabs.
    await expect(
        page.getByRole('heading', { level: 1, name: 'E2E Winter Launch' }),
    ).toBeVisible();
    await expect(
        page
            .getByRole('navigation', { name: 'Campaign sections' })
            .getByRole('link', { name: 'Overview' }),
    ).toHaveAttribute('aria-current', 'page');

    await createOffer(page, id, 'E2E Winter Signup');

    const campaign = state().campaigns.find((c) => c.id === id);
    expect(campaign?.name).toBe('E2E Winter Launch');
    expect(
        state().offers.some(
            (o) => o.campaign_id === id && o.name === 'E2E Winter Signup',
        ),
    ).toBe(true);

    await page.goto('/advertiser/campaigns/index');
    await expect(
        page.getByRole('link', { name: 'E2E Winter Launch', exact: true }),
    ).toBeVisible();
});

test('advertiser pauses and resumes a campaign from the header', async ({
    browser,
}) => {
    const page = await as(browser, 'advertiser');
    const campaign = state().campaigns.find(
        (c) => c.name === 'E2E Winter Launch',
    );
    expect(campaign).toBeDefined();
    await page.goto(`/advertiser/campaigns/show/${campaign!.id}`);
    const header = page.getByRole('region', { name: 'E2E Winter Launch' });

    await header.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByText('Campaign paused.')).toBeVisible();
    await expect(header.getByText('Paused', { exact: true })).toBeVisible();
    expect(
        state().campaigns.find((c) => c.id === campaign!.id)?.campaign_status,
    ).toBe('P');

    await header.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByText('Campaign resumed.')).toBeVisible();
    await expect(header.getByText('Active', { exact: true })).toBeVisible();
    expect(
        state().campaigns.find((c) => c.id === campaign!.id)?.campaign_status,
    ).toBe('A');
});

test('advertiser copies a publisher tracking link from the tracking tab', async ({
    browser,
}) => {
    const page = await as(browser, 'advertiser');
    const campaign = state().campaigns.find(
        (c) => c.name === seeded.runningCampaign,
    );
    await page.goto(`/advertiser/campaigns/show/${campaign!.id}?tab=tracking`);
    await allowClipboard(page);
    await page
        .getByRole('link', { name: new RegExp(seeded.runningOffer) })
        .first()
        .click();
    await expect(
        page.getByRole('heading', { level: 1, name: seeded.runningOffer }),
    ).toBeVisible();
    await page.getByRole('button', { name: /^Copy: .*tracking link/ }).click();
    await expect(page.getByText('Tracking link copied')).toBeVisible();
});

test('network owner sees the advertiser campaign in the directory', async ({
    browser,
}) => {
    const page = await as(browser, 'network');
    await page.goto('/advertiser/campaigns/index');
    await expect(page.getByRole('main')).toContainText(seeded.runningCampaign);
    await page
        .getByRole('button', { name: /^Paused/ })
        .first()
        .click();
    await expect(page).toHaveURL(/status=P/);
});

test('publisher opens an approved campaign and copies their link', async ({
    browser,
}) => {
    const page = await as(browser, 'publisher');
    await page.goto('/publishers/my/campaigns');
    await allowClipboard(page);
    await page
        .getByRole('link', { name: seeded.runningCampaign, exact: true })
        .click();
    await expect(
        page.getByRole('heading', { level: 1, name: seeded.runningCampaign }),
    ).toBeVisible();
    await page
        .getByRole('region', { name: 'Your tracking link' })
        .getByRole('button', { name: /Copy/ })
        .click();
    await expect(page.getByText('Tracking link copied')).toBeVisible();
});
