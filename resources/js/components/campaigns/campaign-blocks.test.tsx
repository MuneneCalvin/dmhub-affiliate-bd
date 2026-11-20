import { TagInput } from '@/components/app';
import {
    CampaignHeader,
    CampaignPreviewCard,
    CommissionPill,
    TrackingLinkCard,
    campaignStatusKey,
    formatRate,
} from '@/components/campaigns';
import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

const tabs = [
    { key: 'overview', label: 'Overview', href: '/c/1?tab=overview' },
    { key: 'offers', label: 'Offers', href: '/c/1?tab=offers', count: 4 },
    { key: 'publishers', label: 'Publishers', href: '/c/1?tab=publishers' },
];

describe('CampaignHeader', () => {
    it('marks the current tab and shows the campaign identity', () => {
        renderWithApp(
            <CampaignHeader
                name="Summer Sale"
                status="P"
                advertiser="Stylehaus"
                commission="8% · CPS"
                countries={['NLD', 'BEL']}
                startDate="2026-06-01"
                endDate={null}
                tabs={tabs}
                currentTab="offers"
            />,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Summer Sale' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Paused')).toBeInTheDocument();
        expect(screen.getByText('8% · CPS')).toBeInTheDocument();
        expect(screen.getByText('NLD · BEL')).toBeInTheDocument();
        expect(screen.getByText(/No end date/)).toBeInTheDocument();

        const nav = screen.getByRole('navigation', {
            name: 'Campaign sections',
        });
        expect(nav).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Offers 4' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(
            screen.getByRole('link', { name: 'Overview' }),
        ).not.toHaveAttribute('aria-current');
    });

    it('says all countries when the campaign is not geo targeted', () => {
        renderWithApp(
            <CampaignHeader
                name="Global"
                status="A"
                advertiser="Brand"
                tabs={tabs}
                currentTab="overview"
            />,
        );
        expect(screen.getByText('All countries')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });
});

describe('TrackingLinkCard', () => {
    it('shows a copyable link with its signals', () => {
        renderWithApp(
            <TrackingLinkCard
                title="Your tracking link"
                link="https://trk.test/t/abc"
                emptyMessage="Not ready"
                signals={[{ label: 'Conversion received', state: 'ok' }]}
            />,
        );
        expect(
            screen.getByRole('region', { name: 'Your tracking link' }),
        ).toBeInTheDocument();
        expect(screen.getByText('https://trk.test/t/abc')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Copy/ }),
        ).toBeInTheDocument();
        expect(screen.getByText('Conversion received')).toBeInTheDocument();
    });

    it('explains when there is no link yet', () => {
        renderWithApp(
            <TrackingLinkCard
                title="Tracking link"
                link={null}
                emptyMessage="Approved publishers get a link."
            />,
        );
        expect(
            screen.getByText('Approved publishers get a link.'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});

function TagHarness({ initial = [] as string[] }) {
    const [value, setValue] = useState(initial);
    return (
        <>
            <label htmlFor="tags">Tags</label>
            <TagInput
                id="tags"
                value={value}
                onChange={setValue}
                suggestions={[{ value: 'high_payout', label: 'High Payout' }]}
            />
            <output>{value.join('|')}</output>
        </>
    );
}

describe('TagInput', () => {
    it('adds tags on Enter, maps suggestion labels and removes chips', async () => {
        const { user } = renderWithApp(<TagHarness />);
        const input = screen.getByRole('combobox', { name: 'Tags' });
        await user.type(input, 'Gifts{Enter}high payout{Enter}Gifts{Enter}');
        expect(screen.getByRole('status')).toHaveTextContent(
            'Gifts|high_payout',
        );
        expect(screen.getByText('High Payout')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Remove tag Gifts' }),
        );
        expect(screen.getByRole('status')).toHaveTextContent('high_payout');

        await user.type(input, '{Backspace}');
        expect(screen.getByRole('status')).toHaveTextContent('');
    });
});

describe('campaign helpers', () => {
    it('formats rates by commission model', () => {
        const money = (value: number) => `€${value.toFixed(2)}`;
        expect(formatRate('CPS', '8', money)).toBe('8%');
        expect(formatRate('RevShare', 12.5, money)).toBe('12.5%');
        expect(formatRate('CPL', '1.5', money)).toBe('€1.50');
        expect(formatRate('CPA', null, money)).toBeNull();
    });

    it('maps campaign status codes to badge keywords', () => {
        expect(campaignStatusKey('A')).toBe('active');
        expect(campaignStatusKey('P')).toBe('paused');
        expect(campaignStatusKey('I')).toBe('inactive');
        expect(campaignStatusKey(undefined)).toBe('inactive');
    });

    it('renders commission pills and a decorative preview card', () => {
        renderWithApp(
            <>
                <CommissionPill type="CPL" />
                <CampaignPreviewCard
                    name="Holiday Bundles"
                    advertiser="Stylehaus"
                    tags={['Gifts', 'Seasonal']}
                    startDate="2026-12-01"
                />
            </>,
        );
        expect(screen.getByText('CPL')).toBeInTheDocument();
        const card = screen.getByRole('article', {
            name: 'Marketplace preview',
        });
        expect(card).toHaveTextContent('Gifts · Seasonal');
        expect(card).toHaveTextContent('Holiday Bundles');
        expect(card).toHaveTextContent(/by Stylehaus · from (1 Dec|Dec 1)/);
        expect(card.querySelector('a, button')).toBeNull();
    });
});
