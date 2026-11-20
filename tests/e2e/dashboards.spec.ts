import { expect, test } from '@playwright/test';
import { as, seeded, state, submitApplication, type Persona } from './helpers';

const home: Record<
    Persona,
    { path: string; heading: string; metrics: string[] }
> = {
    admin: {
        path: '/admin/dashboard',
        heading: 'Platform overview',
        metrics: ['Networks', 'Total users', 'Publishers', 'Advertisers'],
    },
    network: {
        path: '/network/dashboard',
        heading: 'Network overview',
        metrics: [
            'Net commissions',
            'Clicks',
            'Approved conversions',
            'Active campaigns',
        ],
    },
    advertiser: {
        path: '/advertiser/dashboard',
        heading: 'Advertiser dashboard',
        metrics: [
            'Total campaigns',
            'Total clicks',
            'Approved conversions',
            'Conversion rate',
        ],
    },
    publisher: {
        path: '/publisher_dashboard/dashboard',
        heading: 'Campaign marketplace',
        metrics: [],
    },
};

for (const persona of Object.keys(home) as Persona[]) {
    test(`${persona} lands on their dashboard with its headline metrics`, async ({
        browser,
    }) => {
        const page = await as(browser, persona);
        await page.goto('/dashboard');
        await expect(page).toHaveURL(new RegExp(home[persona].path));
        await expect(
            page.getByRole('heading', {
                level: 1,
                name: home[persona].heading,
            }),
        ).toBeVisible();
        for (const label of home[persona].metrics) {
            await expect(
                page
                    .locator('[data-slot="stat-card"]')
                    .getByText(label, { exact: true }),
            ).toBeVisible();
        }
    });
}

test('publisher filters the marketplace and applies; the network approves it from its dashboard', async ({
    browser,
}) => {
    const publisher = await as(browser, 'publisher');
    await publisher.goto('/publisher_dashboard/dashboard');
    const campaigns = publisher.getByRole('region', { name: 'Campaigns' });
    await expect(campaigns.getByRole('article')).not.toHaveCount(0);

    await publisher
        .getByRole('searchbox', { name: 'Search campaigns' })
        .fill('Marketplace Campaign');
    await expect(publisher).toHaveURL(/search=Marketplace/);
    await expect(campaigns.getByRole('article')).toHaveCount(1);
    const card = campaigns.getByRole('article', {
        name: seeded.marketplaceCampaign,
    });
    await expect(card).toContainText('Not applied');

    await card
        .getByRole('link', { name: `Apply: ${seeded.marketplaceCampaign}` })
        .click();
    await publisher.waitForURL(/campaign\/application/);
    await submitApplication(publisher, seeded.marketplaceOffer);

    const campaignId = state().campaigns.find(
        (c) => c.name === seeded.marketplaceCampaign,
    )!.id;
    await publisher.goto('/publisher_dashboard/dashboard?application_status=P');
    await expect(
        publisher.getByRole('article', { name: seeded.marketplaceCampaign }),
    ).toContainText('Pending');

    const network = await as(browser, 'network');
    await network.goto('/network/dashboard');
    const pending = network.getByRole('region', {
        name: 'Pending applications',
    });
    const row = pending
        .getByRole('listitem')
        .filter({ hasText: seeded.marketplaceCampaign });
    await row.getByRole('button', { name: /^Approve / }).click();
    await expect(network).toHaveURL(/network\/dashboard/);
    await expect
        .poll(
            () =>
                state().publisher_campaigns.filter(
                    (a) => a.campaign_id === campaignId && a.status === 'A',
                ).length,
        )
        .toBe(1);
    await expect(
        pending.getByRole('listitem').filter({
            hasText: seeded.marketplaceCampaign,
        }),
    ).toHaveCount(0);

    await publisher.goto('/publisher_dashboard/dashboard');
    await expect(
        publisher
            .getByRole('article', { name: seeded.marketplaceCampaign })
            .getByRole('link', {
                name: `Get links: ${seeded.marketplaceCampaign}`,
            }),
    ).toBeVisible();
});
