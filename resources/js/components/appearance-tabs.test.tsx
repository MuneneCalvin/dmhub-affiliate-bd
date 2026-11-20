import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemePicker } from './appearance-tabs';

afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
});

describe('ThemePicker', () => {
    it('is a Theme radiogroup whose cards switch the appearance', async () => {
        const { user } = renderWithApp(<ThemePicker />);
        expect(
            screen.getByRole('radiogroup', { name: 'Theme' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();

        await user.click(screen.getByRole('radio', { name: 'Dark' }));
        expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
        expect(document.documentElement).toHaveClass('dark');
        expect(localStorage.getItem('appearance')).toBe('dark');

        await user.click(screen.getByRole('radio', { name: 'Light' }));
        expect(document.documentElement).not.toHaveClass('dark');
    });
});
