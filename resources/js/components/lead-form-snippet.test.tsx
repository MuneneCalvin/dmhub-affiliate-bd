import { renderWithApp, router } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeadFormSnippet, type LeadFormSettings } from './lead-form-snippet';

vi.mock('sonner', () => {
    const toast = Object.assign(vi.fn(), { error: vi.fn() });
    return { toast };
});

const settings: LeadFormSettings = {
    key: 'abc123',
    snippet: '<script async src="https://bnd.test/lf/abc123.js"></script>',
    destinationHost: 'forms.brandnewday.example',
    allowedOrigins: ['https://forms.partner.example'],
};

describe('LeadFormSnippet', () => {
    afterEach(() => vi.clearAllMocks());

    it('shows the snippet and the host that may report for this offer', () => {
        renderWithApp(<LeadFormSnippet offerId={7} leadForm={settings} />);

        expect(screen.getByText(settings.snippet)).toBeInTheDocument();
        expect(
            screen.getByText('forms.brandnewday.example'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('https://forms.partner.example'),
        ).toBeInTheDocument();
    });

    it('copies the snippet', async () => {
        const { user } = renderWithApp(
            <LeadFormSnippet offerId={7} leadForm={settings} />,
        );
        const writeText = vi
            .spyOn(navigator.clipboard, 'writeText')
            .mockResolvedValue(undefined);

        await user.click(screen.getByRole('button', { name: /^Copy: / }));

        expect(writeText).toHaveBeenCalledWith(settings.snippet);
        expect(toast).toHaveBeenCalled();
    });

    it('adds an origin and saves the whole list', async () => {
        const { user } = renderWithApp(
            <LeadFormSnippet offerId={7} leadForm={settings} />,
        );

        await user.type(
            screen.getByLabelText('Extra allowed origin'),
            'https://other.example',
        );
        await user.click(screen.getByRole('button', { name: 'Add origin' }));
        await user.click(screen.getByRole('button', { name: 'Save origins' }));

        expect(router.post).toHaveBeenCalledWith(
            '/advertiser/offers/7/lead-form',
            {
                allowed_origins: [
                    'https://forms.partner.example',
                    'https://other.example',
                ],
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('removes an origin before saving', async () => {
        const { user } = renderWithApp(
            <LeadFormSnippet offerId={7} leadForm={settings} />,
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Remove https://forms.partner.example',
            }),
        );
        await user.click(screen.getByRole('button', { name: 'Save origins' }));

        expect(router.post).toHaveBeenCalledWith(
            '/advertiser/offers/7/lead-form',
            { allowed_origins: [] },
            expect.anything(),
        );
    });

    it('ignores an origin that is not a scheme and host', async () => {
        const { user } = renderWithApp(
            <LeadFormSnippet offerId={7} leadForm={settings} />,
        );

        await user.type(screen.getByLabelText('Extra allowed origin'), 'nope');
        await user.click(screen.getByRole('button', { name: 'Add origin' }));

        expect(
            screen.getByText('Enter an origin like https://forms.example'),
        ).toBeInTheDocument();
        expect(screen.queryByText('nope')).not.toBeInTheDocument();
    });

    it('asks before rotating the key, then posts the rotation', async () => {
        const { user } = renderWithApp(
            <LeadFormSnippet offerId={7} leadForm={settings} />,
        );

        await user.click(screen.getByRole('button', { name: 'Rotate key' }));
        expect(router.post).not.toHaveBeenCalled();

        const dialog = await screen.findByRole('alertdialog');
        await user.click(
            within(dialog).getByRole('button', { name: 'Rotate key' }),
        );

        expect(router.post).toHaveBeenCalledWith(
            '/advertiser/offers/7/lead-form',
            { rotate: true },
            expect.anything(),
        );
    });
});
