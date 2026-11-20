import { Button } from '@/components/ui/button';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import AuthLayout from '@/layouts/auth-layout';
import { logout } from '@/routes';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Clock3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function WaitForApproval() {
    const { t } = useTranslation();
    const { status } = usePage<{ status: string }>().props;
    const cleanup = useMobileNavigation();
    return (
        <AuthLayout
            title={t('Your account is under review')}
            description={t('Your account is pending approval.')}
        >
            <Head title={t('Account Pending Approval')} />
            <div className="space-y-6">
                <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-4">
                    <Clock3 className="size-5 text-primary" />
                    <p className="text-sm">
                        {t('Current Status')}:{' '}
                        <span className="font-medium">
                            {status === 'R' ? t('Rejected') : t('Pending')}
                        </span>
                    </p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                    {t(
                        'If you have any questions, please contact our support team.',
                    )}
                </p>
                <Button asChild className="w-full">
                    <Link
                        href={logout()}
                        as="button"
                        onClick={() => {
                            cleanup();
                            router.flushAll();
                        }}
                    >
                        {t('Go Back To Login')}
                    </Link>
                </Button>
            </div>
        </AuthLayout>
    );
}
