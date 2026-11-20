import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CampaignCard } from './campaign-card';
import { campaignCta, type MarketplaceCampaign } from './types';

const base: MarketplaceCampaign = {
    id: 3,
    name: 'Winter Getaways',
    campaign_status: 'A',
    currency: 'EUR',
    end_date: '2999-01-01',
    epc: 1.1,
    advertiser: { business_name: 'Skyline Travel', industry: 'Travel' },
    enrollment: null,
    offers: [
        {
            id: 9,
            name: 'Booking',
            offer_status: 'A',
            commission_type_1: 'CPA',
            commission_value_1: '35.00',
            click_cookie_lifetime_hours: 720,
        },
    ],
};

const withStatus = (status: string | null): MarketplaceCampaign => ({
    ...base,
    enrollment: status ? { id: 44, status } : null,
});

describe('marketplace campaign card', () => {
    it.each([
        [null, 'apply'],
        ['A', 'links'],
        ['P', 'details'],
        ['R', 'details'],
    ])('application status %s → %s', (status, cta) => {
        expect(campaignCta(withStatus(status))).toBe(cta);
    });

    it('offers Apply when the publisher has not applied', () => {
        renderWithApp(
            <CampaignCard campaign={withStatus(null)} onDetails={vi.fn()} />,
        );
        expect(
            screen.getByRole('link', { name: 'Apply: Winter Getaways' }),
        ).toHaveAttribute('href', '/publishers/3/campaign/application');
        expect(screen.getByText('Not applied')).toBeInTheDocument();
        expect(screen.getByText('€35.00 CPA')).toBeInTheDocument();
        expect(screen.getByText('€1.10')).toBeInTheDocument();
        expect(screen.getByText('30 days')).toBeInTheDocument();
    });

    it('offers Get links once approved', () => {
        renderWithApp(
            <CampaignCard campaign={withStatus('A')} onDetails={vi.fn()} />,
        );
        expect(
            screen.getByRole('link', { name: 'Get links: Winter Getaways' }),
        ).toHaveAttribute('href', '/publishers/my/campaigns/show/44');
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /Apply/ }),
        ).not.toBeInTheDocument();
    });

    it('offers View details while pending', async () => {
        const onDetails = vi.fn();
        const { user } = renderWithApp(
            <CampaignCard campaign={withStatus('P')} onDetails={onDetails} />,
        );
        expect(screen.getByText('Pending')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'View details' }));
        expect(onDetails).toHaveBeenCalledWith(
            expect.objectContaining({ id: 3 }),
        );
        expect(
            screen.getByRole('button', {
                name: 'View details: Winter Getaways',
            }),
        ).toBeInTheDocument();
    });

    it('shows a dash when the campaign has no clicks yet', () => {
        renderWithApp(
            <CampaignCard
                campaign={{ ...base, epc: null, offers: [] }}
                onDetails={vi.fn()}
            />,
        );
        expect(screen.getAllByText('—').length).toBe(3);
    });
});
