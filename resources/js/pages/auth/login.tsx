import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, InputGroup } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { useAuthBrand } from '@/layouts/auth/auth-brand-panel';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { LoginProps } from '@/types';
import { Form, Head } from '@inertiajs/react';
import { ArrowRight, CircleCheck, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: LoginProps) {
    const { t } = useTranslation();
    const { name } = useAuthBrand();

    return (
        <AuthLayout
            title={t('Welcome back')}
            description={t('Sign in to your workspace.')}
        >
            <Head title={t('Sign in')} />

            {status && (
                <Alert variant="success">
                    <CircleCheck aria-hidden="true" />
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
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
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="you@company.com"
                                    aria-invalid={
                                        errors.email ? true : undefined
                                    }
                                    aria-describedby={
                                        errors.email ? 'email-error' : undefined
                                    }
                                />
                            </InputGroup>
                            <InputError
                                id="email-error"
                                message={errors.email}
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="password">
                                    {t('Password')}
                                </Label>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="text-[13px]"
                                    >
                                        {t('Forgot password?')}
                                    </TextLink>
                                )}
                            </div>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                aria-invalid={
                                    errors.password ? true : undefined
                                }
                                aria-describedby={
                                    errors.password
                                        ? 'password-error'
                                        : undefined
                                }
                            />
                            <InputError
                                id="password-error"
                                message={errors.password}
                            />
                        </div>

                        <div className="flex min-h-11 items-center gap-2.5">
                            <Checkbox id="remember" name="remember" />
                            <Label htmlFor="remember" className="font-medium">
                                {t('Keep me signed in')}
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            {t('Sign in')}
                            {!processing && <ArrowRight aria-hidden="true" />}
                        </Button>

                        {canRegister && (
                            <p className="text-center text-ink-muted">
                                {t('New to {{name}}?', { name })}{' '}
                                <TextLink href={register()}>
                                    {t('Create an account')}
                                </TextLink>
                            </p>
                        )}
                    </>
                )}
            </Form>

            <a
                href="/docs"
                className="self-center rounded-sm text-[13px] font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
                {t('Documentation')}
            </a>
        </AuthLayout>
    );
}
