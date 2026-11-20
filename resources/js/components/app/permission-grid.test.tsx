import {
    groupPermissions,
    permissionGroup,
    permissionLabel,
} from '@/lib/permissions';
import { renderWithApp } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { PermissionGrid } from './permission-grid';

const permissions = [
    { id: 1, name: 'view_campaigns' },
    { id: 2, name: 'manage_campaigns' },
    { id: 3, name: 'view_publishers' },
    { id: 4, name: 'view_network_invoices' },
    { id: 5, name: 'manage_roles' },
];

function Example({ initial = [1] }: { initial?: number[] }) {
    const [value, setValue] = useState<(number | string)[]>(initial);
    const [query, setQuery] = useState('');
    return (
        <>
            <input
                aria-label="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <PermissionGrid
                permissions={permissions}
                value={value}
                onValueChange={setValue}
                query={query}
            />
        </>
    );
}

const group = (name: string) => screen.getByRole('group', { name });

describe('permission catalogue', () => {
    it('groups permissions by domain, specific words first', () => {
        expect(permissionGroup('view_network_invoices')).toBe('finance');
        expect(permissionGroup('configure_network')).toBe('administration');
        expect(permissionGroup('view_campaign_performance')).toBe('analytics');
        expect(permissionGroup('view_publishers')).toBe('partners');
        expect(permissionGroup('upload_creatives')).toBe('campaigns');
        expect(permissionGroup('something_else')).toBe('other');
        expect(groupPermissions(permissions).map((g) => g.key)).toEqual([
            'campaigns',
            'partners',
            'finance',
            'administration',
        ]);
    });

    it('labels known permissions and humanises unknown ones', () => {
        expect(permissionLabel('configure_network')).toBe('Network settings');
        expect(permissionLabel('export_data')).toBe('Export data');
    });
});

describe('PermissionGrid', () => {
    it('shows "x of y on" per group and updates it when toggling', async () => {
        const { user } = renderWithApp(<Example />);
        const campaigns = group('Campaigns');
        expect(campaigns).toHaveTextContent('1 of 2 on');
        expect(group('Partners')).toHaveTextContent('0 of 1 on');

        await user.click(
            within(campaigns).getByRole('checkbox', { name: 'Edit campaigns' }),
        );
        expect(group('Campaigns')).toHaveTextContent('2 of 2 on');

        await user.click(
            within(group('Campaigns')).getByRole('checkbox', {
                name: 'View campaigns',
            }),
        );
        expect(group('Campaigns')).toHaveTextContent('1 of 2 on');
        expect(
            screen.getByRole('checkbox', { name: 'View campaigns' }),
        ).not.toBeChecked();
    });

    it('filters by label or code but keeps counts for the whole group', async () => {
        const { user } = renderWithApp(<Example initial={[1, 2]} />);
        await user.type(screen.getByLabelText('Search'), 'view_c');
        expect(
            screen.getByRole('checkbox', { name: 'View campaigns' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('checkbox', { name: 'Edit campaigns' }),
        ).not.toBeInTheDocument();
        expect(group('Campaigns')).toHaveTextContent('2 of 2 on');
        expect(screen.queryByRole('group', { name: 'Partners' })).toBeNull();

        await user.clear(screen.getByLabelText('Search'));
        await user.type(screen.getByLabelText('Search'), 'zzz');
        expect(screen.getByText('No permissions found')).toBeInTheDocument();
    });
});
