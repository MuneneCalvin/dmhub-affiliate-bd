import { setFormErrors } from '@/test/inertia';
import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TwoFactorChallenge from './two-factor-challenge';

const guest = { auth: { user: null, permissions: [] } };

describe('Two-factor challenge', () => {
    // input-otp schedules password-manager probes for up to 6s; drop them
    // after each test so they don't fire once jsdom is gone.
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('accepts exactly six digits in the code field', async () => {
        const { user } = renderWithApp(<TwoFactorChallenge />, {
            pageProps: guest,
        });
        const code = screen.getByLabelText('Authentication code');
        expect(code).toHaveAttribute('name', 'code');

        await user.click(code);
        await user.keyboard('12ab3456789');
        expect(code).toHaveValue('123456');
    });

    it('switches to a recovery code and back', async () => {
        const { user } = renderWithApp(<TwoFactorChallenge />, {
            pageProps: guest,
        });
        await user.click(
            screen.getByRole('button', { name: 'Use a recovery code instead' }),
        );
        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Use a recovery code',
            }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Recovery code')).toHaveAttribute(
            'name',
            'recovery_code',
        );
        expect(
            screen.queryByLabelText('Authentication code'),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('button', {
                name: 'Use an authentication code instead',
            }),
        );
        expect(
            screen.getByLabelText('Authentication code'),
        ).toBeInTheDocument();
    });

    it('shows the server error for the code', () => {
        setFormErrors({
            code: 'The provided two factor authentication code was invalid.',
        });
        renderWithApp(<TwoFactorChallenge />, { pageProps: guest });
        expect(
            screen.getByText(
                'The provided two factor authentication code was invalid.',
            ),
        ).toBeInTheDocument();
    });
});
