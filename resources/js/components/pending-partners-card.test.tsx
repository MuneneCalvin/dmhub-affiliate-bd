import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PendingPartnersCard } from './pending-partners-card';

describe('PendingPartnersCard', () => {
    it('shows the totals and links to the pool of what is waiting', () => {
        renderWithApp(
            <PendingPartnersCard
                counts={{ advertisers: 1, publishers: 3, total: 4 }}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Pending approvals' }),
        ).toBeInTheDocument();
        expect(screen.getByText('4 waiting for approval')).toBeInTheDocument();
        expect(screen.getByText('Advertisers: 1')).toBeInTheDocument();
        expect(screen.getByText('Publishers: 3')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Review in the partner pool' }),
        ).toHaveAttribute('href', '/networks/pool/publishers');
    });

    it('opens the advertiser pool when only advertisers are waiting', () => {
        renderWithApp(
            <PendingPartnersCard
                counts={{ advertisers: 2, publishers: 0, total: 2 }}
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Review in the partner pool' }),
        ).toHaveAttribute('href', '/networks/pool/advertisers');
    });

    it('renders nothing when nobody is waiting or the count is missing', () => {
        const { container, rerender } = renderWithApp(
            <PendingPartnersCard
                counts={{ advertisers: 0, publishers: 0, total: 0 }}
            />,
        );
        expect(container).toBeEmptyDOMElement();

        rerender(<PendingPartnersCard counts={undefined} />);
        expect(container).toBeEmptyDOMElement();
    });
});
