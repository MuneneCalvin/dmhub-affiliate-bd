import { renderWithApp } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SettingsLayout from './layout';

const sections = () =>
    within(screen.getByRole('navigation', { name: 'Settings sections' }))
        .getAllByRole('link')
        .map((link) => link.textContent);

describe('SettingsLayout', () => {
    it('lists only the sections the user has and marks the current one', () => {
        renderWithApp(<SettingsLayout>body</SettingsLayout>, {
            url: '/settings/password',
            pageProps: { settingsSections: { company: false } },
        });
        expect(sections()).toEqual([
            'Profile',
            'Password',
            'Two-factor',
            'Appearance',
        ]);
        expect(screen.getByRole('link', { name: 'Password' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Account settings',
        );
    });

    it('adds company details for advertiser and publisher accounts', () => {
        renderWithApp(<SettingsLayout>body</SettingsLayout>, {
            url: '/settings/profile',
            pageProps: { settingsSections: { company: true } },
        });
        expect(sections()).toContain('Company details');
    });
});
