import { expect, test } from '@playwright/test';
import {
    applyToCampaign,
    approveApplication,
    as,
    seeded,
    state,
} from './helpers';

const reviewCampaignId = () =>
    state().campaigns.find((c) => c.name === seeded.reviewCampaign)!.id;

test('publisher applies to a campaign, network owner approves it in the drawer, publisher gets the offer', async ({
    browser,
}) => {
    const campaignId = state().campaigns.find(
        (c) => c.name === seeded.openCampaign,
    )!.id;

    const publisher = await as(browser, 'publisher');
    await publisher.goto('/publisher_dashboard/dashboard');
    await publisher
        .getByRole('button', { name: `View details: ${seeded.openCampaign}` })
        .click();
    await expect(
        publisher.getByRole('dialog', { name: seeded.openCampaign }),
    ).toContainText(seeded.openOffer);
    await publisher.keyboard.press('Escape');
    await applyToCampaign(publisher, campaignId, seeded.openOffer);

    const network = await as(browser, 'network');
    await approveApplication(network, seeded.openCampaign);
    await expect
        .poll(
            () =>
                state().publisher_campaigns.filter(
                    (a) => a.campaign_id === campaignId && a.status === 'A',
                ).length,
        )
        .toBe(1);

    await publisher.goto('/publishers/my/campaigns');
    await expect(publisher.getByRole('table')).toContainText(seeded.openOffer);
});

test('network owner rejects an application with a reason', async ({
    browser,
}) => {
    const network = await as(browser, 'network');
    await network.goto('/applications/index');
    const list = network.getByRole('region', { name: 'Applications' });
    await list
        .getByRole('button', { name: `Review ${seeded.rejectApplicant}` })
        .click();
    const drawer = network.getByRole('dialog', { name: 'Application details' });
    await expect(drawer).toContainText(seeded.reviewCampaign);
    await expect(drawer).toContainText('would feature this campaign');
    await drawer.getByRole('button', { name: 'Reject' }).click();

    const dialog = network.getByRole('dialog', { name: 'Reject application' });
    const submit = dialog.getByRole('button', { name: 'Reject application' });
    await expect(submit).toBeDisabled();
    await dialog
        .getByRole('textbox', { name: 'Rejection reason' })
        .fill('Audience does not match this campaign.');
    await submit.click();
    await expect(network.getByRole('dialog')).toHaveCount(0);
    await expect(
        list.getByRole('button', { name: `Review ${seeded.rejectApplicant}` }),
    ).toHaveCount(0);

    await network.getByRole('button', { name: /^Rejected/ }).click();
    await expect(network).toHaveURL(/status=R/);
    await expect(list).toContainText(seeded.rejectApplicant);
});

test('network owner approves two applications at once', async ({ browser }) => {
    const network = await as(browser, 'network');
    await network.goto('/applications/index');
    await expect(
        network.getByRole('region', { name: 'Bulk actions' }),
    ).toHaveCount(0);
    for (const applicant of seeded.bulkApplicants) {
        await network
            .getByRole('checkbox', { name: `Select ${applicant}` })
            .check();
    }
    const bar = network.getByRole('region', { name: 'Bulk actions' });
    await expect(bar).toContainText('2 selected');
    await bar.getByRole('button', { name: 'Approve all' }).click();
    await expect(network.getByText('2 applications approved.')).toBeVisible();
    await expect(bar).toHaveCount(0);
    await expect
        .poll(
            () =>
                state().publisher_campaigns.filter(
                    (a) =>
                        a.campaign_id === reviewCampaignId() &&
                        a.status === 'A',
                ).length,
        )
        .toBe(2);
});
