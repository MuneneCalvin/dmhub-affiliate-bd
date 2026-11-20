import { SidebarProvider } from '@/components/ui/sidebar';
import { LanguageProvider } from '@/context/language-context';
import { PermissionProvider } from '@/context/permission-context';
import { renderWithApp, router } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppSidebarHeader } from './app-sidebar-header';

const notifications = [
    {
        id: 'n1',
        data: { message: '3 new applications for Winter Getaways' },
        read_at: null,
        created_at: new Date(Date.now() - 12 * 60_000).toISOString(),
    },
    {
        id: 'n2',
        data: { message: 'Invoice INV-2048 paid' },
        read_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 86_400_000).toISOString(),
    },
];

const renderTopbar = (userExtra: Record<string, unknown> = {}) =>
    renderWithApp(
        <LanguageProvider>
            <PermissionProvider>
                <SidebarProvider>
                    <AppSidebarHeader />
                </SidebarProvider>
            </PermissionProvider>
        </LanguageProvider>,
        {
            pageProps: {
                auth: {
                    user: {
                        id: 1,
                        first_name: 'Alex',
                        last_name: 'Kamau',
                        email: 'alex@example.test',
                        is_network: true,
                        notifications,
                        ...userExtra,
                    },
                    permissions: ['access_network_dashboard', 'view_campaigns'],
                },
                locale: {
                    current: 'en',
                    fallback: 'en',
                    available: {
                        nl: { name: 'Dutch', native: 'Nederlands' },
                        en: { name: 'English', native: 'English' },
                    },
                },
            },
        },
    );

describe('AppSidebarHeader', () => {
    it('gives every icon button an accessible name', () => {
        renderTopbar();
        // Buttons with visible text are named by it (plus a hidden label), so
        // match the accessible names loosely.
        for (const name of [
            /^Toggle sidebar$/,
            /^Search pages and tools…/,
            /^Change language \(English\) EN$/,
            /^Switch to dark mode$/,
            /^Notifications, 1 unread$/,
            /Account menu$/,
        ]) {
            expect(screen.getByRole('button', { name })).toBeInTheDocument();
        }
        expect(screen.getByText('Network owner')).toBeInTheDocument();
        for (const button of screen.getAllByRole('button')) {
            expect(button).toHaveAccessibleName();
        }
    });

    it('opens the notifications panel and marks everything read', async () => {
        const { user } = renderTopbar();
        await user.click(
            screen.getByRole('button', { name: 'Notifications, 1 unread' }),
        );
        const panel = screen.getByRole('region', { name: 'Notifications' });
        expect(panel).toHaveTextContent(
            '3 new applications for Winter Getaways',
        );
        expect(panel).toHaveTextContent('Invoice INV-2048 paid');
        expect(
            within(panel).getAllByRole('button', { name: 'Mark as read' }),
        ).toHaveLength(1);
        await user.click(
            within(panel).getByRole('button', { name: 'Mark all as read' }),
        );
        expect(router.post).toHaveBeenCalledWith(
            '/notifications/mark-all-as-read',
            {},
            expect.anything(),
        );
    });

    it('shows an empty notifications state', async () => {
        const { user } = renderTopbar({ notifications: [] });
        await user.click(screen.getByRole('button', { name: 'Notifications' }));
        expect(
            screen.getByRole('region', { name: 'Notifications' }),
        ).toHaveTextContent('No notifications');
    });

    it('toggles the theme', async () => {
        const { user } = renderTopbar();
        await user.click(
            screen.getByRole('button', { name: 'Switch to dark mode' }),
        );
        expect(document.documentElement).toHaveClass('dark');
        await user.click(
            screen.getByRole('button', { name: 'Switch to light mode' }),
        );
        expect(document.documentElement).not.toHaveClass('dark');
    });

    it('opens the search palette with the user’s pages', async () => {
        const { user } = renderTopbar();
        await user.click(
            screen.getByRole('button', { name: /^Search pages and tools/ }),
        );
        const dialog = screen.getByRole('dialog', { name: 'Search workspace' });
        expect(
            within(dialog).getByRole('option', { name: 'Campaigns' }),
        ).toBeInTheDocument();
        expect(
            within(dialog).queryByRole('option', { name: 'System users' }),
        ).not.toBeInTheDocument();
    });

    it('opens the account menu with settings and log out', async () => {
        const { user } = renderTopbar();
        await user.click(screen.getByRole('button', { name: /Account menu$/ }));
        expect(
            screen.getByRole('menuitem', { name: 'Account settings' }),
        ).toHaveAttribute('href', '/settings/profile');
        expect(
            screen.getByRole('menuitem', { name: 'Log out' }),
        ).toBeInTheDocument();
    });
});
