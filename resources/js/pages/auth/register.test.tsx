import { router } from '@/test/inertia';
import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Register from './register';

const guest = { auth: { user: null, permissions: [] } };

describe('Register page', () => {
    it('starts with the account type choice as step 1 of 3', () => {
        renderWithApp(<Register />, { pageProps: guest });
        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Create your account',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radiogroup', { name: 'Account type' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Publisher' })).toBeChecked();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuetext',
            'Step 1 of 3 · Account type',
        );
    });

    it('switches the step set when the role changes', async () => {
        const { user } = renderWithApp(<Register />, { pageProps: guest });

        await user.click(screen.getByRole('button', { name: 'Continue' }));
        expect(
            screen.getByRole('heading', { level: 2, name: 'Your website' }),
        ).toHaveFocus();
        expect(screen.getByLabelText('Business name')).toHaveAttribute(
            'id',
            'publisher-business_name',
        );

        await user.click(screen.getByRole('button', { name: 'Back' }));
        await user.click(screen.getByRole('radio', { name: 'Advertiser' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(
            screen.getByRole('heading', { level: 2, name: 'Your company' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Company name')).toHaveAttribute(
            'id',
            'advertiser-business_name',
        );
        expect(screen.queryByText('Your website')).not.toBeInTheDocument();
    });

    it('validates business details before moving on', async () => {
        const { user } = renderWithApp(<Register />, { pageProps: guest });
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        expect(
            await screen.findByText('Business name is required'),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Business name')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '2',
        );
    });

    it('posts every field with the chosen role', async () => {
        router.post.mockClear();
        const { user } = renderWithApp(<Register />, { pageProps: guest });
        await user.click(screen.getByRole('radio', { name: 'Advertiser' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        await user.type(screen.getByLabelText('Company name'), 'Brightside');
        await user.type(
            screen.getByLabelText('Website URL'),
            'https://brightside.test',
        );
        await user.type(screen.getByLabelText('Industry'), 'Travel');
        await user.type(
            screen.getByLabelText('Chamber of Commerce number'),
            '12345678',
        );
        await user.click(screen.getByRole('button', { name: 'Continue' }));

        await user.type(screen.getByLabelText('First name'), 'Dana');
        await user.type(screen.getByLabelText('Last name'), 'Lee');
        await user.type(
            screen.getByLabelText('Work email'),
            'dana@brightside.test',
        );
        await user.click(
            screen.getByRole('button', { name: 'Create account' }),
        );

        expect(router.post).toHaveBeenCalledTimes(1);
        expect(router.post.mock.calls[0][1]).toMatchObject({
            business_name: 'Brightside',
            website_name: 'https://brightside.test',
            industry: 'Travel',
            coc_number: '12345678',
            first_name: 'Dana',
            last_name: 'Lee',
            email: 'dana@brightside.test',
            role_name: 'advertiser',
        });
    });
});
