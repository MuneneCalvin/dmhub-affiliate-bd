import { SidebarProvider } from '@/components/ui/sidebar';
import { PermissionProvider } from '@/context/permission-context';
import { buildNavigation } from '@/navigation/config';
import { renderWithApp } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppSidebar } from './app-sidebar';
import { NavMain } from './nav-main';

const networkPermissions = [
    'access_network_dashboard',
    'view_campaigns',
    'review_applications',
    'view_publishers',
    'review_commissions',
];
const groups = buildNavigation({ is_network: true }, networkPermissions);

const renderNav = (url: string, counts = {}) =>
    renderWithApp(
        <SidebarProvider>
            <NavMain groups={groups} counts={counts} />
        </SidebarProvider>,
        { url },
    );

describe('NavMain', () => {
    it('renders grouped links inside the main navigation landmark', () => {
        renderNav('/network/dashboard');
        const nav = screen.getByRole('navigation', { name: 'Main navigation' });
        expect(nav).toHaveTextContent('Campaigns');
        expect(nav).toHaveTextContent('Partners');
        expect(
            within(nav).getByRole('link', { name: 'Publishers' }),
        ).toHaveAttribute('href', '/publishers/index');
    });

    it('marks the list item current on its detail pages', () => {
        renderNav('/advertiser/campaigns/show/12');
        expect(screen.getByRole('link', { name: 'Campaigns' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(
            screen.getByRole('link', { name: 'Overview' }),
        ).not.toHaveAttribute('aria-current');
    });

    it('prefers the most specific item', () => {
        renderNav('/finance/earnings/4/fraud', {});
        // Fraud rules is not granted here, so the review page owns it.
        expect(
            screen.getByRole('link', { name: 'Financial review' }),
        ).toHaveAttribute('aria-current', 'page');
    });

    it('shows waiting counts as a badge with an accessible label', () => {
        renderNav('/network/dashboard', {
            pendingApplications: 12,
            fraudFlags: 0,
        });
        const link = screen.getByRole('link', { name: /Applications/ });
        expect(link).toHaveAccessibleName('Applications 12 waiting');
        // Zero hides the badge.
        expect(
            screen.getByRole('link', { name: 'Financial review' }),
        ).toBeInTheDocument();
    });
});

describe('NavMain pending partners', () => {
    it('badges the partner pool with the partners waiting for approval', () => {
        const poolGroups = buildNavigation({ is_network: true }, [
            ...networkPermissions,
            'access_pool',
        ]);
        renderWithApp(
            <SidebarProvider>
                <NavMain groups={poolGroups} counts={{ pendingPartners: 4 }} />
            </SidebarProvider>,
            { url: '/network/dashboard' },
        );

        expect(
            screen.getByRole('link', { name: /Partner pool/ }),
        ).toHaveAccessibleName('Partner pool 4 waiting');
    });
});

describe('AppSidebar', () => {
    it('builds the menu from the shared user, permissions and counts', () => {
        renderWithApp(
            <PermissionProvider>
                <SidebarProvider>
                    <AppSidebar />
                </SidebarProvider>
            </PermissionProvider>,
            {
                url: '/applications/index',
                pageProps: {
                    auth: {
                        user: {
                            id: 1,
                            first_name: 'Nia',
                            last_name: 'Owner',
                            email: 'nia@example.test',
                            is_network: true,
                        },
                        permissions: networkPermissions,
                    },
                    navCounts: { pendingApplications: 3, fraudFlags: null },
                    networkBranding: { network_name: 'Northwind Network' },
                },
            },
        );
        // Brand block and workspace card both name the tenant.
        expect(
            screen.getAllByText('Northwind Network', { selector: 'strong' }),
        ).toHaveLength(2);
        expect(screen.getByText('Network owner')).toBeInTheDocument();
        const current = screen.getByRole('link', { current: 'page' });
        expect(current).toHaveAccessibleName('Applications 3 waiting');
        expect(
            screen.getAllByRole('link', { name: 'Open docs' })[0],
        ).toHaveAttribute('href', '/docs');
    });
});
