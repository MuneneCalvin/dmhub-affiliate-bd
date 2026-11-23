import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublisherChannels } from './publisher-channels';

describe('PublisherChannels', () => {
    it('names each channel and shows where to find it', () => {
        renderWithApp(
            <PublisherChannels
                channels={[
                    { type: 'instagram', handle: '@anna.spaart' },
                    { type: 'newsletter', handle: 'Pensioen Weekly' },
                ]}
            />,
        );

        const items = screen.getAllByRole('listitem');
        expect(items[0]).toHaveTextContent('Instagram');
        expect(items[0]).toHaveTextContent('@anna.spaart');
        expect(items[1]).toHaveTextContent('Newsletter');
        expect(items[1]).toHaveTextContent('Pensioen Weekly');
    });

    it('links only addresses that are web URLs, safely', () => {
        renderWithApp(
            <PublisherChannels
                channels={[
                    { type: 'website', handle: 'https://voorbeeld.example.nl' },
                    { type: 'tiktok', handle: '@anna' },
                    { type: 'other', handle: 'javascript:alert(1)' },
                ]}
            />,
        );

        const link = screen.getByRole('link', {
            name: 'https://voorbeeld.example.nl',
        });
        expect(link).toHaveAttribute('href', 'https://voorbeeld.example.nl');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link).toHaveAttribute('target', '_blank');
        expect(screen.getAllByRole('link')).toHaveLength(1);
        expect(screen.getByText('@anna')).toBeInTheDocument();
        expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
    });

    it('says so when no channel was given', () => {
        renderWithApp(<PublisherChannels channels={[]} />);

        expect(screen.getByText('No channels given')).toBeInTheDocument();
    });

    it('shows an unknown channel type as it was stored', () => {
        renderWithApp(
            <PublisherChannels
                channels={[{ type: 'myspace', handle: 'tom' }]}
            />,
        );

        expect(screen.getByRole('listitem')).toHaveTextContent('myspace');
    });
});
