import { StatePanel } from '@/components/app';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import AuthLayout from '@/layouts/auth-layout';
import { logout } from '@/routes';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Hourglass, LogOut, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function WaitForApproval() {
    const { t } = useTranslation();
    const { status } = usePage<{ status?: string }>().props;
    const cleanup = useMobileNavigation();
    const rejected = status === 'R';

    return (
        <AuthLayout width="wide">
            <Head title={t('Account Pending Approval')} />

            <StatePanel
                tone={rejected ? 'danger' : 'warning'}
                icon={
                    rejected ? (
                        <XCircle strokeWidth={1.8} />
                    ) : (
                        <Hourglass strokeWidth={1.8} />
                    )
                }
                badge={
                    rejected ? (
                        <StatusBadge status="rejected" />
                    ) : (
                        <StatusBadge
                            status="pending"
                            label={t('Pending approval')}
                        />
                    )
                }
                title={
                    rejected
                        ? t('Your account was not approved')
                        : t('Your account is under review')
                }
                description={
                    <>
                        <p>
                            {rejected
                                ? t(
                                      'The network did not approve this account, so you cannot open the workspace.',
                                  )
                                : t(
                                      "Check your inbox for the email with your password link, then wait while we review your application. We'll email you as soon as you're in.",
                                  )}
                        </p>
                        <p className="mt-2">
                            {t(
                                'If you have any questions, please contact our support team.',
                            )}
                        </p>
                    </>
                }
                actions={
                    <Button variant="soft" tone="brand" asChild>
                        <Link
                            href={logout()}
                            as="button"
                            onClick={() => {
                                cleanup();
                                router.flushAll();
                            }}
                        >
                            <LogOut aria-hidden="true" />
                            {t('Back to sign in')}
                        </Link>
                    </Button>
                }
            />
        </AuthLayout>
    );
}
