import WaitForApproval from '@/pages/errorpages/wait_approval';
import Forbidden from '@/pages/errors/forbidden';
import { setFormErrors } from '@/test/inertia';
import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Login from './login';
import VerifyEmail from './verify-email';

const guest = { auth: { user: null, permissions: [] } };

describe('Login page', () => {
    it('renders the sign in form with links and the language switch', () => {
        renderWithApp(
            <Login canResetPassword canRegister status="Password reset." />,
            { pageProps: guest },
        );
        expect(
            screen.getByRole('heading', { level: 1, name: 'Welcome back' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'autocomplete',
            'email',
        );
        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'type',
            'password',
        );
        expect(
            screen.getByRole('checkbox', { name: 'Keep me signed in' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute(
            'type',
            'submit',
        );
        expect(
            screen.getByRole('link', { name: 'Forgot password?' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Create an account' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /^Change language/ }),
        ).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('Password reset.');
    });

    it('hides register and reset links when disabled and flags errors', () => {
        setFormErrors({ email: 'These credentials do not match our records.' });
        renderWithApp(<Login canResetPassword={false} canRegister={false} />, {
            pageProps: guest,
        });
        expect(
            screen.queryByRole('link', { name: 'Create an account' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Forgot password?' }),
        ).not.toBeInTheDocument();
        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(
            screen.getByLabelText('Email address'),
        ).toHaveAccessibleDescription(
            'These credentials do not match our records.',
        );
    });

    it('uses the tenant name and logo when the page has branding', () => {
        renderWithApp(<Login canResetPassword canRegister />, {
            pageProps: {
                ...guest,
                networkBranding: {
                    network_name: 'Acme Network',
                    sidebar_logo_url: '/storage/acme.png',
                },
            },
        });
        expect(screen.getByText('New to Acme Network?')).toBeInTheDocument();
        expect(screen.getAllByText('Acme Network').length).toBeGreaterThan(0);
        expect(
            document.querySelector('img[src="/storage/acme.png"]'),
        ).not.toBeNull();
    });
});

describe('Access state pages', () => {
    it('waiting approval shows a pending badge and a way out', () => {
        renderWithApp(<WaitForApproval />, { pageProps: { status: 'P' } });
        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Your account is under review',
            }),
        ).toBeInTheDocument();
        expect(screen.getByText('Pending approval')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Back to sign in' }),
        ).toBeInTheDocument();
    });

    it('waiting approval explains a rejected account', () => {
        renderWithApp(<WaitForApproval />, { pageProps: { status: 'R' } });
        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Your account was not approved',
            }),
        ).toBeInTheDocument();
        expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    it('verify email names the address and offers resend and log out', () => {
        renderWithApp(<VerifyEmail status="verification-link-sent" />);
        expect(
            screen.getByRole('heading', { level: 1, name: 'Check your inbox' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/test\.user@example\.test/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Resend email' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Log out' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent(
            /new verification link/,
        );
    });

    it('403 page links back to the dashboard', () => {
        renderWithApp(<Forbidden />);
        expect(
            screen.getByRole('heading', {
                level: 1,
                name: "You don't have access to this page",
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Back to overview' }),
        ).toHaveAttribute('href', '/dashboard');
    });
});
