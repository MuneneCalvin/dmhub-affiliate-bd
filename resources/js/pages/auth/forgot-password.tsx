import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, InputGroup } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { email } from '@/routes/password';
import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, CircleCheck, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useTranslation();

    return (
        <AuthLayout
            title={t('Forgot your password?')}
            description={t(
                "Enter your email address and we'll send you a link to choose a new password.",
            )}
        >
            <Head title={t('Forgot password')} />

            {status && (
                <Alert variant="success">
                    <CircleCheck aria-hidden="true" />
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <Form {...email.form()} className="flex flex-col gap-[18px]">
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
                                    autoComplete="email"
                                    autoFocus
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

                        <Button
                            className="w-full"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            {t('Email password reset link')}
                        </Button>
                    </>
                )}
            </Form>

            <TextLink
                href={login()}
                className="inline-flex min-h-11 items-center gap-1.5 self-center"
            >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t('Back to sign in')}
            </TextLink>
        </AuthLayout>
    );
}
