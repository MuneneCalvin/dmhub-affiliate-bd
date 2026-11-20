import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from './breadcrumbs';

describe('Breadcrumbs', () => {
    it('links every crumb except the current page', () => {
        renderWithApp(
            <Breadcrumbs
                breadcrumbs={[
                    { title: 'Campaigns', href: '/advertiser/campaigns/index' },
                    {
                        title: 'Summer Sale',
                        href: '/advertiser/campaigns/show/1',
                    },
                ]}
            />,
        );
        expect(screen.getByRole('link', { name: 'Campaigns' })).toHaveAttribute(
            'href',
            '/advertiser/campaigns/index',
        );
        const current = screen.getByText('Summer Sale');
        expect(current).toHaveAttribute('aria-current', 'page');
        expect(current).not.toHaveAttribute('href');
    });

    it('renders nothing without crumbs', () => {
        const { container } = renderWithApp(<Breadcrumbs breadcrumbs={[]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
