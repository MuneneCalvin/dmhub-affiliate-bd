import CreativesIndex from '@/pages/creatives/index';
import CreativeShow from '@/pages/creatives/show';
import { renderWithApp, router } from '@/test/render';
import { fireEvent, screen, within } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreativeCard } from './creative-card';
import { CreativeDropZone } from './creative-drop-zone';
import { VIDEO_UPLOAD, creativeKind, uploadError } from './creative-types';

vi.mock('sonner', () => {
    const toast = Object.assign(vi.fn(), { error: vi.fn() });
    return { toast };
});

const png = () => new File(['png'], 'banner.png', { type: 'image/png' });

const banner = {
    id: 7,
    name: 'Leaderboard summer',
    type: 'banner',
    width: 728,
    height: 90,
    file_url: '/storage/creatives/a.png',
    preview_url: '/storage/creatives/a.png',
    alt_text: 'Summer sale',
    clicks: 12402,
    embed_code: '<a href="https://t.example/c/abc"><img></a>',
    campaign: { id: 3, name: 'Summer Sale 2026' },
    offer: { id: 4, name: 'Main offer' },
    offer_id: 4,
    campaign_id: 3,
    status: 'A',
};

function libraryProps(overrides: Record<string, unknown> = {}) {
    return {
        creatives: {
            data: [banner],
            current_page: 1,
            last_page: 1,
            total: 1,
            from: 1,
            to: 1,
        },
        type: 'all',
        typeCounts: { all: 1, banner: 1, text: 0, email: 0, html: 0, video: 0 },
        campaign: null,
        campaigns: [{ id: 3, name: 'Summer Sale 2026' }],
        offers: [{ id: 4, name: 'Main offer', campaign_id: 3 }],
        can: { upload: true, manage: true },
        ...overrides,
    };
}

describe('creative helpers', () => {
    it('maps legacy image creatives to banners and checks upload limits', () => {
        expect(creativeKind('image')).toBe('banner');
        expect(creativeKind('text')).toBe('text');
        expect(uploadError(png(), VIDEO_UPLOAD)).toBe(VIDEO_UPLOAD.error);
        expect(
            uploadError(
                new File(['x'], 'clip.mp4', { type: 'video/mp4' }),
                VIDEO_UPLOAD,
            ),
        ).toBeNull();
    });
});

describe('CreativeDropZone', () => {
    it('rejects a wrong file type with a message and accepts an image', () => {
        const onFile = vi.fn();
        renderWithApp(<CreativeDropZone onFile={onFile} />);
        const input = screen.getByLabelText(/Drop files to upload/);

        // A drop or a picker without `accept` support can still deliver this.
        fireEvent.change(input, {
            target: {
                files: [
                    new File(['<?php'], 'shell.php', { type: 'text/plain' }),
                ],
            },
        });
        expect(onFile).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Choose a JPG, PNG, GIF or WebP image up to 10 MB.',
        );
        expect(input).toHaveAttribute('aria-invalid', 'true');

        const image = png();
        fireEvent.change(input, { target: { files: [image] } });
        expect(onFile).toHaveBeenCalledWith(image);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('rejects oversized files dropped onto the card', () => {
        const onFile = vi.fn();
        renderWithApp(<CreativeDropZone onFile={onFile} />);
        const big = png();
        Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
        fireEvent.drop(
            screen.getByText('Drop files to upload').closest('label')!,
            { dataTransfer: { files: [big] } },
        );
        expect(onFile).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('explains why it is disabled', () => {
        renderWithApp(
            <CreativeDropZone
                onFile={vi.fn()}
                disabled
                disabledReason="Create an offer first to upload creatives."
            />,
        );
        expect(screen.getByLabelText(/Drop files to upload/)).toBeDisabled();
        expect(
            screen.getByText('Create an offer first to upload creatives.'),
        ).toBeInTheDocument();
    });
});

describe('CreativeCard', () => {
    afterEach(() => vi.clearAllMocks());

    it('shows the real preview, size, type and campaign and copies the embed code', async () => {
        const { user } = renderWithApp(
            <CreativeCard
                creative={banner}
                href="/advertiser/creatives/show/7"
                editHref="/advertiser/creatives/edit/7"
            />,
        );
        const writeText = vi
            .spyOn(navigator.clipboard, 'writeText')
            .mockResolvedValue(undefined);
        expect(
            screen.getByRole('img', { name: 'Summer sale' }),
        ).toHaveAttribute('src', '/storage/creatives/a.png');
        expect(screen.getByText('728×90')).toBeInTheDocument();
        expect(screen.getByText('Banner')).toBeInTheDocument();
        expect(screen.getByText('Summer Sale 2026')).toBeInTheDocument();
        expect(screen.getByText(/12,402/)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Leaderboard summer' }),
        ).toHaveAttribute('href', '/advertiser/creatives/show/7');
        expect(
            screen.getByRole('link', { name: /Edit Leaderboard summer/ }),
        ).toHaveAttribute('href', '/advertiser/creatives/edit/7');

        await user.click(
            screen.getByRole('button', {
                name: /Copy embed code for Leaderboard summer/,
            }),
        );
        expect(writeText).toHaveBeenCalledWith(banner.embed_code);
        expect(toast).toHaveBeenCalled();
    });
});

describe('Creatives library page', () => {
    afterEach(() => vi.clearAllMocks());

    it('filters by type through the server query', async () => {
        const { user } = renderWithApp(<CreativesIndex />, {
            pageProps: libraryProps({
                typeCounts: {
                    all: 5,
                    banner: 2,
                    text: 1,
                    email: 1,
                    html: 0,
                    video: 1,
                },
            }),
            url: '/advertiser/creatives/index',
        });
        const filter = screen.getByRole('group', { name: 'Creative type' });
        expect(
            within(filter).getByRole('button', { name: /All/ }),
        ).toHaveAttribute('aria-pressed', 'true');
        // HTML has no creatives so it is hidden; video has one so it shows.
        expect(
            within(filter).queryByRole('button', { name: /HTML/ }),
        ).not.toBeInTheDocument();
        expect(
            within(filter).getByRole('button', { name: /Video/ }),
        ).toBeInTheDocument();

        await user.click(
            within(filter).getByRole('button', { name: /Text links/ }),
        );
        expect(router.get).toHaveBeenCalledWith(
            '/advertiser/creatives/index',
            { type: 'text' },
            expect.objectContaining({ preserveState: true }),
        );
    });

    it('switches between grid and list view', async () => {
        const { user } = renderWithApp(<CreativesIndex />, {
            pageProps: libraryProps(),
            url: '/advertiser/creatives/index',
        });
        expect(
            screen.getByLabelText(/Drop files to upload/),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'List view' }));
        expect(
            screen.getByRole('button', { name: 'List view' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('link', {
                name: 'Details for Leaderboard summer',
            }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Grid view' }));
    });

    it('hides upload controls without the upload permission', () => {
        renderWithApp(<CreativesIndex />, {
            pageProps: libraryProps({ can: { upload: false, manage: false } }),
            url: '/advertiser/creatives/index',
        });
        expect(
            screen.queryByLabelText(/Drop files to upload/),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'New creative' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /Edit Leaderboard summer/ }),
        ).not.toBeInTheDocument();
    });
});

describe('Creative details page', () => {
    afterEach(() => vi.clearAllMocks());

    it('offers the embed code in a CopyField', async () => {
        const { user } = renderWithApp(<CreativeShow />, {
            pageProps: {
                creative: {
                    ...banner,
                    impressions: 1000,
                    clicks: 25,
                    tracking_code: 'abc',
                    tracking_pixel: '<img src="https://t.example/i/abc">',
                    html_code: '',
                },
                trackingBase: 'https://t.example/',
                can: { manage: true },
            },
        });
        const writeText = vi
            .spyOn(navigator.clipboard, 'writeText')
            .mockResolvedValue(undefined);
        const field = screen
            .getByText('Embed code (click tracking)')
            .closest('[data-slot="copy-field"]') as HTMLElement;
        expect(field).toBeInTheDocument();
        expect(within(field).getByText(banner.embed_code)).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', {
                name: 'Copy: Embed code (click tracking)',
            }),
        );
        expect(writeText).toHaveBeenCalledWith(banner.embed_code);
        expect(screen.getByText('2.50%')).toBeInTheDocument();
        expect(screen.getByText('https://t.example/c/abc')).toBeInTheDocument();
    });
});
