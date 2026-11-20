import { BulkBar } from '@/components/app';
import ApplicationsPage from '@/pages/applications/index';
import { router } from '@/test/inertia';
import { renderWithApp } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationDrawer } from './application-drawer';
import type { ApplicationRow } from './types';

const application = (
    overrides: Partial<ApplicationRow> = {},
): ApplicationRow => ({
    id: 7,
    status: 'P',
    first_name: 'Dana',
    last_name: 'Visser',
    email: 'dana@brightside.test',
    business_name: 'Brightside Media',
    website_url: 'https://brightside.test',
    campaign_name: 'Winter Getaways',
    offer_id: null,
    offer_name: null,
    requested_offer_id: 3,
    requested_offer_name: 'Winter CPL',
    applied_notes: 'We run a travel newsletter.',
    applied_at: '2026-11-17T14:20:00Z',
    created_at: '2026-11-17T14:20:00Z',
    terms_accepted_at: '2026-11-17T14:20:00Z',
    rejection_reason: null,
    traffic_sources: ['content', 'email'],
    monthly_visitors: 120000,
    publisher_id: 4,
    campaign_id: 2,
    partner_summary: { campaigns: 7, pending: 1, approval_rate: 94 },
    ...overrides,
});

describe('ApplicationDrawer', () => {
    it('shows the partner summary, details and message', () => {
        renderWithApp(
            <ApplicationDrawer
                application={application()}
                onOpenChange={() => {}}
                onApprove={() => {}}
                onReject={() => {}}
            />,
        );
        const drawer = screen.getByRole('dialog');
        expect(
            within(drawer).getByRole('heading', { name: 'Brightside Media' }),
        ).toBeInTheDocument();
        const summary = within(drawer).getByRole('group', {
            name: 'Partner summary',
        });
        expect(summary).toHaveTextContent('7');
        expect(summary).toHaveTextContent('94%');
        expect(drawer).toHaveTextContent('Winter Getaways');
        expect(drawer).toHaveTextContent('Winter CPL');
        expect(drawer).toHaveTextContent('content, email');
        expect(drawer).toHaveTextContent('120,000');
        expect(drawer).toHaveTextContent('We run a travel newsletter.');
        expect(within(drawer).getByText('Pending review')).toBeInTheDocument();
    });

    it('fires approve and reject for a pending application', async () => {
        const onApprove = vi.fn();
        const onReject = vi.fn();
        const row = application();
        const { user } = renderWithApp(
            <ApplicationDrawer
                application={row}
                onOpenChange={() => {}}
                onApprove={onApprove}
                onReject={onReject}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Approve publisher' }),
        );
        expect(onApprove).toHaveBeenCalledWith(row);
        await user.click(screen.getByRole('button', { name: 'Reject' }));
        expect(onReject).toHaveBeenCalledWith(row);
    });

    it('hides review buttons for reviewed applications and without permission', () => {
        const { rerender } = renderWithApp(
            <ApplicationDrawer
                application={application({ status: 'A' })}
                onOpenChange={() => {}}
                onApprove={() => {}}
                onReject={() => {}}
            />,
        );
        expect(
            screen.queryByRole('button', { name: 'Approve publisher' }),
        ).toBeNull();
        rerender(
            <ApplicationDrawer
                application={application()}
                onOpenChange={() => {}}
                onApprove={() => {}}
                onReject={() => {}}
                canApprove={false}
            />,
        );
        expect(
            screen.queryByRole('button', { name: 'Approve publisher' }),
        ).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Reject' }),
        ).toBeInTheDocument();
    });

    it('cannot approve without a requested offer', () => {
        renderWithApp(
            <ApplicationDrawer
                application={application({ requested_offer_id: null })}
                onOpenChange={() => {}}
                onApprove={() => {}}
                onReject={() => {}}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Approve publisher' }),
        ).toBeDisabled();
    });
});

describe('BulkBar', () => {
    it('renders only with a selection', () => {
        const { rerender } = renderWithApp(
            <BulkBar count={0} actions={<button>Go</button>} />,
        );
        expect(
            screen.queryByRole('region', { name: 'Bulk actions' }),
        ).toBeNull();
        rerender(<BulkBar count={2} actions={<button>Go</button>} />);
        expect(
            screen.getByRole('region', { name: 'Bulk actions' }),
        ).toHaveTextContent('2 selected');
    });
});

describe('Applications page', () => {
    const pageProps = {
        applications: {
            data: [
                application(),
                application({
                    id: 8,
                    business_name: 'CouponLab',
                    requested_offer_id: 3,
                }),
            ],
            current_page: 1,
            last_page: 1,
            total: 2,
            from: 1,
            to: 2,
        },
        currentStatus: 'P',
        statusCounts: { P: 2, A: 186, R: 23 },
        can: { approve: true, reject: true },
    };

    beforeEach(() => vi.mocked(router.post).mockClear());

    it('shows the status counts and the bulk bar only after selecting', async () => {
        const { user } = renderWithApp(<ApplicationsPage />, {
            pageProps,
            url: '/applications/index',
        });
        expect(
            screen.getByRole('button', { name: /Pending\s*·?\s*2/ }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('button', { name: /Approved\s*·?\s*186/ }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Bulk actions' }),
        ).toBeNull();

        await user.click(
            screen.getByRole('checkbox', { name: 'Select Brightside Media' }),
        );
        await user.click(
            screen.getByRole('checkbox', { name: 'Select CouponLab' }),
        );
        const bar = screen.getByRole('region', { name: 'Bulk actions' });
        expect(bar).toHaveTextContent('2 selected');

        await user.click(
            within(bar).getByRole('button', { name: 'Approve all' }),
        );
        expect(router.post).toHaveBeenCalledWith(
            '/applications/bulk-review',
            { ids: [7, 8], decision: 'approve' },
            expect.anything(),
        );

        await user.click(
            within(bar).getByRole('button', { name: 'Clear selection' }),
        );
        expect(
            screen.queryByRole('region', { name: 'Bulk actions' }),
        ).toBeNull();
    });

    it('opens the drawer and approves with the requested offer', async () => {
        const { user } = renderWithApp(<ApplicationsPage />, {
            pageProps,
            url: '/applications/index',
        });
        await user.click(
            screen.getByRole('button', { name: /^Review Brightside Media/ }),
        );
        const drawer = screen.getByRole('dialog');
        await user.click(
            within(drawer).getByRole('button', { name: 'Approve publisher' }),
        );
        expect(router.post).toHaveBeenCalledWith(
            '/applications/approve/7',
            { offer_id: 3 },
            expect.anything(),
        );
    });
});
