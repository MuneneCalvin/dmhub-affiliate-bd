import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label } from './label';
import { PasswordInput } from './password-input';

describe('PasswordInput', () => {
    it('toggles the password visibility with a labelled button', async () => {
        const { user } = renderWithApp(
            <>
                <Label htmlFor="pw">Password</Label>
                <PasswordInput id="pw" name="password" />
            </>,
        );
        const input = screen.getByLabelText('Password');
        expect(input).toHaveAttribute('type', 'password');
        expect(input).toHaveAttribute('name', 'password');

        const toggle = screen.getByRole('button', { name: 'Show password' });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        expect(toggle).toHaveAttribute('type', 'button');

        await user.click(toggle);
        expect(input).toHaveAttribute('type', 'text');
        expect(
            screen.getByRole('button', { name: 'Hide password' }),
        ).toHaveAttribute('aria-pressed', 'true');

        await user.click(screen.getByRole('button', { name: 'Hide password' }));
        expect(input).toHaveAttribute('type', 'password');
    });

    it('marks the group invalid through the input', () => {
        renderWithApp(<PasswordInput aria-label="Password" aria-invalid />);
        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });
});
