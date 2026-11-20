import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/password/confirm';
import { Form, Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function ConfirmPassword() {
    const { t } = useTranslation();

    return (
        <AuthLayout
            title={t('Confirm your password')}
            description={t(
                'This is a secure area of the application. Please confirm your password before continuing.',
            )}
        >
            <Head title={t('Confirm password')} />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-[18px]"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-1.5">
                            <Label htmlFor="password">{t('Password')}</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="current-password"
                                autoFocus
                                aria-invalid={
                                    errors.password ? true : undefined
                                }
                            />
                            <InputError message={errors.password} />
                        </div>

                        <Button
                            className="w-full"
                            disabled={processing}
                            data-test="confirm-password-button"
                        >
                            {processing && <Spinner />}
                            {t('Confirm password')}
                        </Button>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
