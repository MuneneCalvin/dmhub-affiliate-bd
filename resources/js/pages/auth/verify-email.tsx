import { StatePanel } from '@/components/app';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { logout } from '@/routes';
import { send } from '@/routes/verification';
import { type SharedData } from '@/types';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { CircleCheck, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function VerifyEmail({ status }: { status?: string }) {
    const { t } = useTranslation();
    const email = usePage<SharedData>().props.auth?.user?.email;

    return (
        <AuthLayout width="wide">
            <Head title={t('Email verification')} />

            {status === 'verification-link-sent' && (
                <Alert variant="success">
                    <CircleCheck aria-hidden="true" />
                    <AlertDescription>
                        {t(
                            'A new verification link has been sent to the email address you provided during registration.',
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <StatePanel
                tone="analytics"
                icon={<Mail strokeWidth={1.8} />}
                title={t('Check your inbox')}
                description={
                    email
                        ? t(
                              'We sent a verification link to {{email}}. Click it to activate your account.',
                              { email },
                          )
                        : t(
                              'We sent you a verification link. Click it to activate your account.',
                          )
                }
                actions={
                    <>
                        <Form {...send.form()}>
                            {({ processing }) => (
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    {t('Resend email')}
                                </Button>
                            )}
                        </Form>
                        <Button variant="ghost" asChild>
                            <Link
                                href={logout()}
                                as="button"
                                onClick={() => router.flushAll()}
                            >
                                {t('Log out')}
                            </Link>
                        </Button>
                    </>
                }
            />
        </AuthLayout>
    );
}
