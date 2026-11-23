import { router } from '@/test/inertia';
import { renderWithApp } from '@/test/render';
import { act, screen, within } from '@testing-library/react';
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
            screen.getByRole('heading', { level: 2, name: 'Your channels' }),
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
        expect(screen.queryByText('Your channels')).not.toBeInTheDocument();
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

    describe('publisher step', () => {
        const toStepTwo = async () => {
            const view = renderWithApp(<Register />, { pageProps: guest });
            await view.user.click(
                screen.getByRole('button', { name: 'Continue' }),
            );
            return view.user;
        };

        it('registers as a company by default and asks for the company details', async () => {
            await toStepTwo();

            expect(
                screen.getByRole('radio', { name: 'Company' }),
            ).toBeChecked();
            expect(screen.getByLabelText('Business name')).toBeInTheDocument();
            expect(screen.getByLabelText('Industry')).toBeInTheDocument();
            expect(
                screen.getByLabelText('Chamber of Commerce number'),
            ).toBeInTheDocument();
            expect(
                screen.queryByLabelText('Website URL'),
            ).not.toBeInTheDocument();
        });

        it('offers the channels the client named', async () => {
            await toStepTwo();

            const group = screen.getByRole('group', {
                name: 'Where will you promote?',
            });
            for (const name of [
                'Website or blog',
                'Comparison website',
                'Facebook',
                'Instagram',
                'TikTok',
                'YouTube',
                'Newsletter',
                'Cashback or loyalty platform',
                'Paid media',
                'Other',
            ]) {
                expect(
                    within(group).getByRole('checkbox', { name }),
                ).not.toBeChecked();
            }
        });

        it('hides the company details for an individual', async () => {
            const user = await toStepTwo();

            await user.click(screen.getByRole('radio', { name: 'Individual' }));

            expect(
                screen.queryByLabelText('Business name'),
            ).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Industry')).not.toBeInTheDocument();
            expect(
                screen.queryByLabelText('Chamber of Commerce number'),
            ).not.toBeInTheDocument();
        });

        it('shows an input for each ticked channel and removes it when unticked', async () => {
            const user = await toStepTwo();

            await user.click(
                screen.getByRole('checkbox', { name: 'Instagram' }),
            );
            expect(
                screen.getByLabelText('Instagram: URL or account name'),
            ).toBeInTheDocument();

            await user.click(
                screen.getByRole('checkbox', { name: 'Instagram' }),
            );
            expect(
                screen.queryByLabelText('Instagram: URL or account name'),
            ).not.toBeInTheDocument();
        });

        it('will not continue without a channel', async () => {
            const user = await toStepTwo();
            await user.type(
                screen.getByLabelText('Business name'),
                'Voorbeeld BV',
            );
            await user.type(screen.getByLabelText('Industry'), 'Media');
            await user.type(
                screen.getByLabelText('Chamber of Commerce number'),
                '12345678',
            );

            await user.click(screen.getByRole('button', { name: 'Continue' }));

            expect(
                await screen.findByText('Choose at least one channel'),
            ).toBeInTheDocument();
            expect(screen.getByRole('progressbar')).toHaveAttribute(
                'aria-valuenow',
                '2',
            );
        });

        it('wants a web address for a website, and any account name for Instagram', async () => {
            const user = await toStepTwo();
            await user.click(screen.getByRole('radio', { name: 'Individual' }));
            await user.click(
                screen.getByRole('checkbox', { name: 'Website or blog' }),
            );
            await user.click(
                screen.getByRole('checkbox', { name: 'Instagram' }),
            );
            await user.type(
                screen.getByLabelText('Website or blog: URL or account name'),
                'voorbeeld',
            );
            await user.type(
                screen.getByLabelText('Instagram: URL or account name'),
                '@anna.spaart',
            );

            await user.click(screen.getByRole('button', { name: 'Continue' }));

            expect(
                await screen.findByText(
                    'Enter a web address starting with https://',
                ),
            ).toBeInTheDocument();
            expect(
                screen.getByLabelText('Website or blog: URL or account name'),
            ).toHaveAttribute('aria-invalid', 'true');
            expect(
                screen.getByLabelText('Instagram: URL or account name'),
            ).not.toHaveAttribute('aria-invalid');
        });

        it('posts an individual with their channels and no company details', async () => {
            router.post.mockClear();
            const user = await toStepTwo();
            await user.click(screen.getByRole('radio', { name: 'Individual' }));
            await user.click(
                screen.getByRole('checkbox', { name: 'Instagram' }),
            );
            await user.click(screen.getByRole('checkbox', { name: 'TikTok' }));
            await user.type(
                screen.getByLabelText('Instagram: URL or account name'),
                '@anna.spaart',
            );
            await user.type(
                screen.getByLabelText('TikTok: URL or account name'),
                'https://www.tiktok.com/@anna',
            );
            await user.click(screen.getByRole('button', { name: 'Continue' }));
            await user.type(screen.getByLabelText('First name'), 'Anna');
            await user.type(screen.getByLabelText('Last name'), 'de Vries');
            await user.type(
                screen.getByLabelText('Work email'),
                'anna@example.nl',
            );
            await user.click(
                screen.getByRole('button', { name: 'Create account' }),
            );

            const payload = router.post.mock.calls[0][1];
            expect(payload).toMatchObject({
                role_name: 'publisher',
                publisher_type: 'individual',
                first_name: 'Anna',
                channels: [
                    { type: 'instagram', handle: '@anna.spaart' },
                    { type: 'tiktok', handle: 'https://www.tiktok.com/@anna' },
                ],
            });
            expect(payload).not.toHaveProperty('business_name');
            expect(payload).not.toHaveProperty('coc_number');
        });

        it('posts a company with its details and channels', async () => {
            router.post.mockClear();
            const user = await toStepTwo();
            await user.type(
                screen.getByLabelText('Business name'),
                'Voorbeeld BV',
            );
            await user.type(screen.getByLabelText('Industry'), 'Media');
            await user.type(
                screen.getByLabelText('Chamber of Commerce number'),
                '12345678',
            );
            await user.click(
                screen.getByRole('checkbox', { name: 'Website or blog' }),
            );
            await user.type(
                screen.getByLabelText('Website or blog: URL or account name'),
                'https://voorbeeld.example.nl',
            );
            await user.click(screen.getByRole('button', { name: 'Continue' }));
            await user.type(screen.getByLabelText('First name'), 'Anna');
            await user.type(screen.getByLabelText('Last name'), 'de Vries');
            await user.type(
                screen.getByLabelText('Work email'),
                'anna@voorbeeld.example.nl',
            );
            await user.click(
                screen.getByRole('button', { name: 'Create account' }),
            );

            expect(router.post.mock.calls[0][1]).toMatchObject({
                role_name: 'publisher',
                publisher_type: 'company',
                business_name: 'Voorbeeld BV',
                industry: 'Media',
                coc_number: '12345678',
                channels: [
                    { type: 'website', handle: 'https://voorbeeld.example.nl' },
                ],
            });
        });

        it('shows a server error on the channel it belongs to', async () => {
            router.post.mockClear();
            const user = await toStepTwo();
            await user.click(screen.getByRole('radio', { name: 'Individual' }));
            await user.click(
                screen.getByRole('checkbox', { name: 'Instagram' }),
            );
            await user.click(screen.getByRole('checkbox', { name: 'TikTok' }));
            await user.type(
                screen.getByLabelText('Instagram: URL or account name'),
                '@anna',
            );
            await user.type(
                screen.getByLabelText('TikTok: URL or account name'),
                '@anna',
            );
            await user.click(screen.getByRole('button', { name: 'Continue' }));
            await user.type(screen.getByLabelText('First name'), 'Anna');
            await user.type(screen.getByLabelText('Last name'), 'de Vries');
            await user.type(
                screen.getByLabelText('Work email'),
                'anna@example.nl',
            );
            await user.click(
                screen.getByRole('button', { name: 'Create account' }),
            );

            act(() => {
                router.post.mock.calls[0][2].onError({
                    'channels.1.handle':
                        'Enter a web address starting with https://.',
                });
            });

            expect(
                await screen.findByText(
                    'Enter a web address starting with https://.',
                ),
            ).toBeInTheDocument();
            expect(
                screen.getByLabelText('TikTok: URL or account name'),
            ).toHaveAttribute('aria-invalid', 'true');
            expect(
                screen.getByLabelText('Instagram: URL or account name'),
            ).not.toHaveAttribute('aria-invalid');
        });
    });
});
