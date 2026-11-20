import { Button } from '@/components/ui/button';
import { renderWithApp } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { Building2 } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
    it('renders breadcrumbs, the h1, description, icon tile and actions', () => {
        const { container } = renderWithApp(
            <PageHeader
                title="Advertisers"
                description="Brands running campaigns"
                breadcrumbs={[
                    { title: 'Partners', href: '/advertisers/index' },
                    { title: 'Advertisers', href: '/advertisers/index' },
                ]}
                icon={<Building2 />}
                tone="partners"
                actions={<Button>Add advertiser</Button>}
            />,
        );
        expect(
            screen.getByRole('heading', { level: 1, name: 'Advertisers' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Brands running campaigns'),
        ).toBeInTheDocument();
        const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
        expect(
            within(trail).getByRole('link', { name: 'Partners' }),
        ).toHaveAttribute('href', '/advertisers/index');
        expect(within(trail).getByText('Advertisers')).toHaveAttribute(
            'aria-current',
            'page',
        );
        const tile = container.querySelector('[data-slot="icon-tile"]');
        expect(tile).toHaveAttribute('data-tone', 'partners');
        expect(tile).toHaveAttribute('data-variant', 'solid');
        expect(tile).toHaveAttribute('aria-hidden', 'true');
        expect(
            screen.getByRole('button', { name: 'Add advertiser' }),
        ).toBeInTheDocument();
    });

    it('omits the trail, tile and actions when not given', () => {
        const { container } = renderWithApp(<PageHeader title="Overview" />);
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(
            container.querySelector('[data-slot="icon-tile"]'),
        ).not.toBeInTheDocument();
        expect(
            container.querySelector('[data-slot="page-header-actions"]'),
        ).not.toBeInTheDocument();
    });
});
