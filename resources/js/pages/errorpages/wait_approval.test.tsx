import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WaitForApproval from './wait_approval';

describe('WaitForApproval', () => {
    it('tells a pending partner what to do next', () => {
        renderWithApp(<WaitForApproval />, { pageProps: { status: 'P' } });

        expect(
            screen.getByText('Your account is under review'),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                /Check your inbox for the email with your password link/,
            ),
        ).toBeInTheDocument();
    });

    it('says plainly when the account was not approved', () => {
        renderWithApp(<WaitForApproval />, { pageProps: { status: 'R' } });

        expect(
            screen.getByText('Your account was not approved'),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Check your inbox/)).not.toBeInTheDocument();
    });
});
