import { renderWithApp, router } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CampaignHealth } from './campaign-health';
import { PendingApplications } from './pending-applications';
import { RecentActivity } from './recent-activity';

describe('CampaignHealth', () => {
    it('renders an empty state when the network has no campaigns', () => {
        renderWithApp(
            <CampaignHealth
                statusCounts={{}}
                budgets={[]}
                activeOffers={0}
                totalOffers={0}
            />,
        );
        expect(
            screen.getByRole('heading', { name: 'No campaigns yet' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('describes the status split in text and keeps currencies apart', () => {
        renderWithApp(
            <CampaignHealth
                statusCounts={{ A: 3, I: 1 }}
                budgets={[
                    { currency: 'EUR', total: 1000, spent: 250 },
                    { currency: 'USD', total: 500, spent: 100 },
                ]}
                activeOffers={2}
                totalOffers={4}
            />,
        );
        expect(
            screen.getByRole('img', {
                name: 'Campaigns by status: 3 Active, 1 Inactive',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('progressbar', {
                name: 'Advertiser budget used (EUR)',
            }),
        ).toHaveAttribute('aria-valuenow', '250');
        expect(
            screen.getByRole('progressbar', {
                name: 'Advertiser budget used (USD)',
            }),
        ).toHaveAttribute('aria-valuenow', '100');
    });
});

const application = {
    id: 7,
    first_name: 'Dana',
    last_name: 'Visser',
    email: 'dana@example.test',
    campaign_name: 'Summer Sale',
    requested_offer_id: 12,
    applied_at: null,
    created_at: null,
};

describe('PendingApplications', () => {
    beforeEach(() => router.post.mockClear());

    it('approves onto the requested offer and returns to the dashboard', async () => {
        const { user } = renderWithApp(
            <PendingApplications
                items={[application]}
                total={1}
                canReview
                canApprove
                canReject
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Approve Dana Visser' }),
        );
        expect(router.post).toHaveBeenCalledWith(
            '/applications/approve/7',
            { offer_id: 12, return_to: 'dashboard' },
            expect.any(Object),
        );
    });

    it('asks for a reason before rejecting', async () => {
        const { user } = renderWithApp(
            <PendingApplications
                items={[application]}
                total={1}
                canReview
                canApprove
                canReject
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Reject Dana Visser' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Reject application',
        });
        const submit = within(dialog).getByRole('button', {
            name: 'Reject application',
        });
        expect(submit).toBeDisabled();
        await user.type(
            within(dialog).getByLabelText('Rejection Reason'),
            'Not a fit',
        );
        await user.click(submit);
        expect(router.post).toHaveBeenCalledWith(
            '/applications/reject/7',
            { rejection_reason: 'Not a fit', return_to: 'dashboard' },
            expect.any(Object),
        );
    });

    it('links to the review page when no offer was requested', () => {
        renderWithApp(
            <PendingApplications
                items={[{ ...application, requested_offer_id: null }]}
                total={1}
                canReview
                canApprove
                canReject={false}
            />,
        );
        expect(
            screen.queryByRole('button', { name: /Approve/ }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Review Dana Visser' }),
        ).toHaveAttribute('href', '/applications/show/7');
    });

    it('shows an empty state with no applications', () => {
        renderWithApp(
            <PendingApplications
                items={[]}
                total={0}
                canReview
                canApprove
                canReject
            />,
        );
        expect(
            screen.getByRole('heading', { name: 'You’re all caught up' }),
        ).toBeInTheDocument();
    });
});

describe('RecentActivity', () => {
    it('lists only real notifications and falls back to an empty state', () => {
        const { unmount } = renderWithApp(<RecentActivity />);
        expect(
            screen.getByRole('heading', { name: 'No recent activity' }),
        ).toBeInTheDocument();
        unmount();

        renderWithApp(<RecentActivity />, {
            pageProps: {
                auth: {
                    user: {
                        id: 1,
                        notifications: [
                            {
                                id: 'a',
                                data: { message: 'New application received' },
                                read_at: null,
                                created_at: new Date().toISOString(),
                            },
                        ],
                    },
                    permissions: [],
                },
            },
        });
        expect(
            screen.getByText('New application received'),
        ).toBeInTheDocument();
    });
});
