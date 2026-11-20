import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailList } from './detail-list';
import { LinkTabs } from './link-tabs';
import { ProfileBanner } from './profile-banner';

describe('profile building blocks', () => {
    it('DetailList pairs labels with values and dashes empty ones', () => {
        renderWithApp(
            <DetailList
                rows={[
                    { label: 'Contact', value: 'Dana Visser' },
                    { label: 'VAT number', value: '' },
                    false,
                ]}
            />,
        );
        const terms = screen.getAllByRole('term');
        const values = screen.getAllByRole('definition');
        expect(terms.map((term) => term.textContent)).toEqual([
            'Contact',
            'VAT number',
        ]);
        expect(values[0]).toHaveTextContent('Dana Visser');
        expect(values[1]).toHaveTextContent('—');
    });

    it('ProfileBanner renders the name as the page heading with status, chips and actions', () => {
        renderWithApp(
            <ProfileBanner
                name="Brightside Media"
                status={<span>Approved</span>}
                chips={[
                    { label: 'Content / blog', tone: 'analytics' },
                    { label: 'Member since Mar 2025' },
                ]}
                actions={<button type="button">Edit profile</button>}
            />,
        );
        expect(
            screen.getByRole('heading', { level: 1, name: 'Brightside Media' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(
            screen.getByRole('button', { name: 'Edit profile' }),
        ).toBeInTheDocument();
        // Initials stand in for a missing logo and are hidden from assistive tech.
        expect(screen.getByText('BM')).toHaveAttribute('aria-hidden', 'true');
    });

    it('LinkTabs marks the current tab as the current page', () => {
        renderWithApp(
            <LinkTabs
                label="Advertiser navigation"
                current="funding"
                tabs={[
                    {
                        key: 'overview',
                        label: 'Overview',
                        href: '/a?tab=overview',
                    },
                    {
                        key: 'funding',
                        label: 'Funding',
                        href: '/a?tab=funding',
                        count: 3,
                    },
                ]}
            />,
        );
        const nav = screen.getByRole('navigation', {
            name: 'Advertiser navigation',
        });
        expect(nav).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Funding/ })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(
            screen.getByRole('link', { name: 'Overview' }),
        ).not.toHaveAttribute('aria-current');
    });
});
