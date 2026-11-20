import CampaignForm, {
    firstStepWithError,
    type CampaignFormProps,
} from '@/components/campaign-form';
import { renderWithApp } from '@/test/render';
import type { TCampaign } from '@/types';
import { screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const baseProps: CampaignFormProps = {
    currencies: [{ currency_code: 'EUR', currency_name: 'Euro' }],
    countries: [
        { country_iso: 'NLD', country_name: 'Netherlands', status: 'A' },
    ],
    terms: [],
    advertisers: [
        {
            id: 7,
            business_name: 'Stylehaus',
            available_budget: '0',
            currency: 'EUR',
        },
    ],
};

const campaign = {
    id: 3,
    name: 'Summer Sale',
    description: '',
    currency: 'EUR',
    campaign_status: 'A',
    start_date: '2026-06-01T00:00:00.000000Z',
    end_date: '2100-12-31T23:59:59.000000Z',
    total_budget: '0',
    daily_budget: '0',
} as unknown as TCampaign;

const currentStep = () =>
    within(screen.getByRole('navigation', { name: 'Campaign setup steps' }))
        .getAllByRole('listitem')
        .find((item) => item.getAttribute('aria-current') === 'step');

describe('CampaignForm wizard', () => {
    it('keeps entered values when moving between steps', async () => {
        const { user } = renderWithApp(
            <CampaignForm
                {...baseProps}
                campaign={campaign}
                advertiserName="Stylehaus"
            />,
            { pageProps: { errors: {} } },
        );
        const name = screen.getByRole('textbox', { name: 'Campaign name' });
        await user.clear(name);
        await user.type(name, 'Holiday Bundles');
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(currentStep()).toHaveTextContent('Audience & targeting');
        await user.type(
            screen.getByRole('combobox', { name: 'Campaign tags' }),
            'Gifts{Enter}',
        );
        await user.click(screen.getByRole('button', { name: 'Back' }));

        expect(currentStep()).toHaveTextContent('The essentials');
        expect(
            screen.getByRole('textbox', { name: 'Campaign name' }),
        ).toHaveValue('Holiday Bundles');

        await user.click(screen.getByRole('button', { name: 'Continue' }));
        expect(
            screen.getByRole('button', { name: 'Remove tag Gifts' }),
        ).toBeInTheDocument();
    });

    it('stops on the step with a missing required field', async () => {
        const { user } = renderWithApp(<CampaignForm {...baseProps} />, {
            pageProps: { errors: {} },
        });
        // Jump straight to the review step from the step list.
        await user.click(screen.getByRole('button', { name: /Check details/ }));

        expect(currentStep()).toHaveTextContent('The essentials');
        expect(
            await screen.findByText('Campaign name is required'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Campaign name' }),
        ).toHaveAttribute('aria-invalid', 'true');
    });

    it('opens on the step of the first server error', () => {
        renderWithApp(<CampaignForm {...baseProps} campaign={campaign} />, {
            pageProps: { errors: { total_budget: 'Budget is too high' } },
        });

        expect(currentStep()).toHaveTextContent('Budget & terms');
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Budget is too high',
        );
    });

    it('maps error keys to steps', () => {
        expect(firstStepWithError({ name: 'x' })).toBe(0);
        expect(firstStepWithError({ advertiser_id: 'x' })).toBe(0);
        expect(firstStepWithError({ 'geo_targeting.0': 'x' })).toBe(1);
        expect(firstStepWithError({ terms: 'x', end_date: 'y' })).toBe(0);
        expect(firstStepWithError({ daily_budget: 'x' })).toBe(2);
        expect(firstStepWithError({})).toBeNull();
    });

    it('updates the marketplace preview with name, advertiser and tags', async () => {
        const { user } = renderWithApp(
            <CampaignForm {...baseProps} canSelectAdvertiser />,
            { pageProps: { errors: {} } },
        );
        const preview = screen.getByRole('article', {
            name: 'Marketplace preview',
        });
        expect(preview).toHaveTextContent('Untitled campaign');
        expect(preview).toHaveTextContent('by Stylehaus');

        await user.type(
            screen.getByRole('textbox', { name: 'Campaign name' }),
            'Holiday Bundles',
        );
        expect(preview).toHaveTextContent('Holiday Bundles');
    });

    it('shows the ROI error, stays on budget and focuses the field', async () => {
        const { user } = renderWithApp(
            <CampaignForm
                {...baseProps}
                campaign={campaign}
                advertiserName="Stylehaus"
            />,
            { pageProps: { errors: {} } },
        );
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        expect(currentStep()).toHaveTextContent('Budget & terms');
        const roi = screen.getByLabelText(/^Target ROI/);
        await user.type(roi, '-1');
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        expect(currentStep()).toHaveTextContent('Budget & terms');
        expect(await screen.findByText('Invalid ROI format')).toBeVisible();
        await vi.waitFor(() => expect(roi).toHaveFocus());
    });
});
