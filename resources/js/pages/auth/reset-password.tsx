import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input, InputGroup } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { update } from '@/routes/password';
import { ResetPasswordProps } from '@/types';
import { Form, Head } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { t } = useTranslation();

    return (
        <AuthLayout
            title={t('Choose a new password')}
            description={t('Enter a new password for your account below.')}
        >
            <Head title={t('Reset password')} />

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-[18px]"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-1.5">
                            <Label htmlFor="email">{t('Email address')}</Label>
                            <InputGroup
                                leading={
                                    <Mail
                                        className="text-brand"
                                        aria-hidden="true"
                                    />
                                }
                            >
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    value={email}
                                    readOnly
                                />
                            </InputGroup>
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="password">
                                {t('New password')}
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                autoFocus
                                aria-invalid={
                                    errors.password ? true : undefined
                                }
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="password_confirmation">
                                {t('Confirm password')}
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                autoComplete="new-password"
                                aria-invalid={
                                    errors.password_confirmation
                                        ? true
                                        : undefined
                                }
                            />
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={processing}
                            data-test="reset-password-button"
                        >
                            {processing && <Spinner />}
                            {t('Reset password')}
                        </Button>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
