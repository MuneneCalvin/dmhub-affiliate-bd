import LeadsIndex from '@/pages/leads/index';
import { renderWithApp, router } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const anna = {
    id: 1,
    first_name: 'Anna',
    last_name: 'de Vries',
    email: 'anna@example.nl',
    phone: '+31201234567',
    company: 'Voorbeeld BV',
    status: 'new',
    notes: null,
    created_at: '2026-11-20T10:00:00.000000Z',
    campaign: { id: 3, name: 'Zomeractie' },
    offer: { id: 4, name: 'Hoofdaanbod' },
};
const pieter = {
    ...anna,
    id: 2,
    first_name: 'Pieter',
    last_name: 'Jansen',
    email: 'pieter@example.nl',
    phone: null,
    company: null,
    status: 'qualified',
    campaign: null,
};

function props(overrides: Record<string, unknown> = {}) {
    return {
        leads: {
            data: [anna, pieter],
            current_page: 1,
            last_page: 1,
            total: 2,
            from: 1,
            to: 2,
        },
        status: 'all',
        statusCounts: {
            all: 2,
            new: 1,
            contacted: 0,
            qualified: 1,
            converted: 0,
            lost: 0,
        },
        ...overrides,
    };
}

const render = (overrides: Record<string, unknown> = {}) =>
    renderWithApp(<LeadsIndex />, {
        pageProps: props(overrides),
        url: '/leads',
    });

describe('Leads page account opened', () => {
    it('calls a converted lead an opened account, in the tile, the row and the actions', async () => {
        const { user } = render({
            leads: {
                data: [{ ...anna, status: 'converted' }],
                current_page: 1,
                last_page: 1,
                total: 1,
                from: 1,
                to: 1,
            },
            statusCounts: {
                all: 1,
                new: 0,
                contacted: 0,
                qualified: 0,
                converted: 1,
                lost: 0,
            },
        });

        expect(
            screen.getByText('Account opened', {
                selector: '[data-slot="status-badge"]',
            }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Account opened').length).toBeGreaterThan(1);
        expect(screen.queryByText('Converted')).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: /More actions for/ }),
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Mark as converted' }),
        ).not.toBeInTheDocument();
    });

    it('offers "Mark as account opened" for a lead that has not opened one', async () => {
        const { user } = render();

        await user.click(
            screen.getAllByRole('button', { name: /More actions for/ })[0],
        );

        expect(
            screen.getByRole('menuitem', { name: 'Mark as account opened' }),
        ).toBeInTheDocument();
    });
});

describe('Leads page', () => {
    beforeEach(() => {
        Object.values(router).forEach(
            (fn) => 'mockClear' in fn && fn.mockClear(),
        );
    });

    it('shows the contacts with their company, campaign and status', () => {
        render();
        expect(
            screen.getByRole('heading', { level: 1, name: 'Leads' }),
        ).toBeInTheDocument();
        const rows = within(screen.getByRole('region', { name: 'Lead list' }))
            .getAllByRole('row')
            .slice(1);
        expect(rows).toHaveLength(2);
        expect(within(rows[0]).getByText('Anna de Vries')).toBeInTheDocument();
        expect(
            within(rows[0]).getByText(/anna@example\.nl/),
        ).toBeInTheDocument();
        expect(within(rows[0]).getByText('Voorbeeld BV')).toBeInTheDocument();
        expect(within(rows[0]).getByText('Zomeractie')).toBeInTheDocument();
        expect(within(rows[0]).getByText('New')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Qualified')).toBeInTheDocument();
    });

    it('filters by status through the server, with counts on the tiles', async () => {
        const { user } = render();
        const tile = screen.getByRole('button', { name: /Qualified/ });
        expect(tile).toHaveTextContent('1');
        await user.click(tile);
        expect(router.get).toHaveBeenCalledWith(
            '/leads',
            { status: 'qualified' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('changes the status from the row menu and hides the current status', async () => {
        const { user } = render();
        await user.click(
            screen.getByRole('button', {
                name: 'More actions for Anna de Vries',
            }),
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Mark as new' }),
        ).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('menuitem', { name: 'Mark as contacted' }),
        );
        expect(router.patch).toHaveBeenCalledWith(
            '/leads/1',
            { status: 'contacted' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('asks before deleting and then removes only that contact', async () => {
        const { user } = render();
        await user.click(
            screen.getByRole('button', {
                name: 'More actions for Pieter Jansen',
            }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
        expect(router.delete).not.toHaveBeenCalled();
        await user.click(
            within(screen.getByRole('alertdialog')).getByRole('button', {
                name: 'Delete',
            }),
        );
        expect(router.delete).toHaveBeenCalledWith(
            '/leads/2',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('links the export to the current status filter', () => {
        render({ status: 'qualified' });
        expect(screen.getByRole('link', { name: /Export/ })).toHaveAttribute(
            'href',
            '/leads/export?status=qualified',
        );
    });

    it('explains an empty list', () => {
        render({
            leads: {
                data: [],
                current_page: 1,
                last_page: 1,
                total: 0,
                from: null,
                to: null,
            },
            statusCounts: {
                all: 0,
                new: 0,
                contacted: 0,
                qualified: 0,
                converted: 0,
                lost: 0,
            },
        });
        expect(screen.getByText('No leads yet')).toBeInTheDocument();
    });
});
