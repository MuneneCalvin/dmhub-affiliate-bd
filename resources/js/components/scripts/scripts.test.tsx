import ScriptsIndex from '@/pages/publisher/scripts/index';
import { renderWithApp } from '@/test/render';
import type { CampaignScript } from '@/types';
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScriptStatusBadge } from './script-blocks';

vi.mock('sonner', () => {
    const toast = Object.assign(vi.fn(), { error: vi.fn() });
    return { toast };
});

const script = (overrides: Partial<CampaignScript>): CampaignScript => ({
    id: 1,
    campaign_name: 'Summer Sale',
    offer_name: 'Main offer',
    script_token: 'tok1',
    script_url: 'https://t.example/s/tok1.js',
    embed_tag: '<script async src="https://t.example/s/tok1.js"></script>',
    tracking_link: 'https://t.example/t/one',
    install_status: 'installed',
    script_loads: 12,
    clicks: 4,
    last_click_at: '2026-11-18T10:00:00+00:00',
    ...overrides,
});

const scripts = [
    script({}),
    script({
        id: 2,
        campaign_name: 'Winter Getaways',
        script_token: 'tok2',
        embed_tag: '<script async src="https://t.example/s/tok2.js"></script>',
        tracking_link: 'https://t.example/t/two',
        install_status: 'not_seen',
        script_loads: 0,
        clicks: 0,
        last_click_at: null,
    }),
];

describe('ScriptStatusBadge', () => {
    it('shows installed with loads, and not seen as a warning', () => {
        renderWithApp(
            <>
                <ScriptStatusBadge script={scripts[0]} withLoads />
                <ScriptStatusBadge script={scripts[1]} withLoads />
            </>,
        );
        expect(screen.getByText(/Installed · 12/)).toHaveAttribute(
            'data-tone',
            'success',
        );
        expect(screen.getByText('Not seen')).toHaveAttribute(
            'data-tone',
            'warning',
        );
    });
});

describe('Embed scripts page', () => {
    afterEach(() => {
        vi.clearAllMocks();
        window.history.replaceState(null, '', '/');
    });

    it('opens the first script and switches the detail panel on selection', async () => {
        const { user } = renderWithApp(<ScriptsIndex />, {
            pageProps: { campaigns: scripts },
            url: '/publisher/scripts',
        });
        const list = screen.getByRole('region', { name: 'Your scripts' });
        const [first, second] = within(list).getAllByRole('button');
        expect(first).toHaveAttribute('aria-pressed', 'true');
        expect(second).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByText(scripts[0].embed_tag)).toBeInTheDocument();
        expect(screen.getByText('https://t.example/t/one')).toBeInTheDocument();

        await user.click(second);
        expect(second).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('heading', { name: 'Winter Getaways' }),
        ).toBeInTheDocument();
        expect(screen.getByText(scripts[1].embed_tag)).toBeInTheDocument();
        expect(screen.getByText('None yet')).toBeInTheDocument();
        expect(window.location.search).toBe('?script=2');
    });

    it('reopens the script named in the URL', () => {
        window.history.replaceState(null, '', '/publisher/scripts?script=2');
        renderWithApp(<ScriptsIndex />, {
            pageProps: { campaigns: scripts },
            url: '/publisher/scripts?script=2',
        });
        expect(
            screen.getByRole('button', { name: /Winter Getaways/ }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('copies the snippet with the CopyField', async () => {
        const { user } = renderWithApp(<ScriptsIndex />, {
            pageProps: { campaigns: scripts },
            url: '/publisher/scripts',
        });
        const writeText = vi
            .spyOn(navigator.clipboard, 'writeText')
            .mockResolvedValue(undefined);
        await user.click(
            screen.getByRole('button', { name: 'Copy: Embed script' }),
        );
        expect(writeText).toHaveBeenCalledWith(scripts[0].embed_tag);
    });

    it('shows an empty state without active campaigns', () => {
        renderWithApp(<ScriptsIndex />, {
            pageProps: { campaigns: [] },
            url: '/publisher/scripts',
        });
        expect(
            screen.getByRole('heading', { name: 'No active campaigns yet' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Browse campaigns' }),
        ).toBeInTheDocument();
    });
});
