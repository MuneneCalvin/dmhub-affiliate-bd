import { renderWithApp } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { CheckCircle2, LayoutGrid } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import {
    DirectoryHeading,
    pageWindow,
    ResourceDirectory,
} from './resource-directory';

type Row = { id: number; name: string; email: string; status: string };

const rows: Row[] = [
    { id: 1, name: 'Stylehaus', email: 'hi@stylehaus.test', status: 'active' },
    {
        id: 2,
        name: 'Clearbank',
        email: 'hi@clearbank.test',
        status: 'inactive',
    },
    { id: 3, name: 'Voltix', email: 'hi@voltix.test', status: 'active' },
];

const tiles = [
    {
        value: 'all',
        label: 'All',
        count: 3,
        tone: 'brand' as const,
        icon: <LayoutGrid />,
    },
    {
        value: 'active',
        label: 'Active',
        count: 2,
        tone: 'success' as const,
        icon: <CheckCircle2 />,
    },
    {
        value: 'inactive',
        label: 'Inactive',
        count: 1,
        tone: 'neutral' as const,
        icon: <CheckCircle2 />,
    },
];

function renderDirectory(
    props: Partial<React.ComponentProps<typeof ResourceDirectory<Row>>> = {},
) {
    return renderWithApp(
        <ResourceDirectory<Row>
            label="Advertiser list"
            rows={rows}
            rowKey={(row) => row.id}
            nameHeader="Advertiser"
            name={(row) => row.name}
            subtitle={(row) => row.email}
            status={(row) => row.status}
            href={(row) => `/advertisers/show/${row.id}`}
            {...props}
        />,
    );
}

const bodyRows = () =>
    within(screen.getByRole('region', { name: 'Advertiser list' }))
        .getAllByRole('row')
        .slice(1);

describe('ResourceDirectory', () => {
    it('filters rows with the status tiles and marks the pressed tile', async () => {
        const onStatusChange = vi.fn();
        const { user } = renderDirectory({
            statusTiles: tiles,
            onStatusChange,
        });

        expect(screen.getByRole('button', { name: /All\s*3/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(bodyRows()).toHaveLength(3);

        const inactive = screen.getByRole('button', { name: /Inactive\s*1/ });
        await user.click(inactive);

        expect(inactive).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /All\s*3/ })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        expect(onStatusChange).toHaveBeenCalledWith('inactive');
        expect(bodyRows()).toHaveLength(1);
        expect(bodyRows()[0]).toHaveTextContent('Clearbank');
    });

    it('searches only the rows on this page', async () => {
        const { user } = renderDirectory();
        await user.type(
            screen.getByRole('searchbox', { name: 'Search this page' }),
            'volt',
        );
        expect(bodyRows()).toHaveLength(1);
        expect(bodyRows()[0]).toHaveTextContent('Voltix');
        expect(
            screen.getByText(/^1 match(es)? on this page$/),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Clear search' }));
        expect(bodyRows()).toHaveLength(3);
    });

    it('shows status badges, a Details link and the row actions menu', async () => {
        const onSelect = vi.fn();
        const { user } = renderDirectory({
            actions: () => [
                {
                    label: 'Deactivate',
                    onSelect,
                    hidden: (row) => row.status !== 'active',
                },
            ],
        });
        expect(
            screen.getByRole('link', { name: 'Details for Stylehaus' }),
        ).toHaveAttribute('href', '/advertisers/show/1');
        expect(within(bodyRows()[1]).getByText('Inactive')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'More actions for Stylehaus' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Deactivate' }));
        expect(onSelect).toHaveBeenCalledWith(rows[0]);
        // Hidden actions leave no empty menu behind.
        expect(
            screen.queryByRole('button', {
                name: 'More actions for Clearbank',
            }),
        ).not.toBeInTheDocument();
    });

    it('shows an empty state, with a reset when filters hide everything', async () => {
        const { user, rerender } = renderDirectory({
            rows: [],
            emptyTitle: 'No advertisers yet',
        });
        expect(
            screen.getByRole('heading', { name: 'No advertisers yet' }),
        ).toBeInTheDocument();

        rerender(
            <ResourceDirectory<Row>
                label="Advertiser list"
                rows={rows}
                rowKey={(row) => row.id}
                nameHeader="Advertiser"
                name={(row) => row.name}
            />,
        );
        await user.type(screen.getByRole('searchbox'), 'zzz');
        expect(
            screen.getByRole('heading', { name: 'No matches' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(bodyRows()).toHaveLength(3);
    });

    it('shows an error state with a retry', async () => {
        const onRetry = vi.fn();
        const { user } = renderDirectory({ isError: true, onRetry });
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Unable to load data',
        );
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetry).toHaveBeenCalled();
    });

    it('labels server pagination and changes page', async () => {
        const onPageChange = vi.fn();
        const { user } = renderDirectory({
            pagination: {
                page: 2,
                pageCount: 6,
                total: 48,
                from: 9,
                to: 16,
                onPageChange,
            },
        });
        expect(screen.getByText('Showing 9–16 of 48')).toBeInTheDocument();
        const nav = screen.getByRole('navigation', { name: 'Pagination' });
        expect(
            within(nav).getByRole('button', { name: 'Page 2' }),
        ).toHaveAttribute('aria-current', 'page');
        await user.click(
            within(nav).getByRole('button', { name: 'Next page' }),
        );
        expect(onPageChange).toHaveBeenCalledWith(3);
        await user.click(within(nav).getByRole('button', { name: 'Page 6' }));
        expect(onPageChange).toHaveBeenCalledWith(6);
    });

    it('renders a heading in the toolbar without the search box', () => {
        renderDirectory({
            searchable: false,
            heading: (
                <DirectoryHeading icon={<LayoutGrid />} title="Invoices" />
            ),
            toolbar: <button type="button">Open</button>,
        });
        const region = screen.getByRole('region', { name: 'Advertiser list' });
        expect(
            within(region).getByRole('heading', { level: 2, name: 'Invoices' }),
        ).toBeInTheDocument();
        expect(within(region).queryByRole('searchbox')).not.toBeInTheDocument();
        expect(
            within(region).getByRole('button', { name: 'Open' }),
        ).toBeInTheDocument();
    });

    it('windows long page lists', () => {
        expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
        expect(pageWindow(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
        expect(pageWindow(1, 12)).toEqual([1, 2, null, 12]);
    });
});
