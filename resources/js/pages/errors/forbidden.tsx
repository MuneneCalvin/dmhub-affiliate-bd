import { StatePanel } from '@/components/app';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { dashboard } from '@/routes';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** 403 page (rendered by the exception handler, status code stays 403). */
export default function Forbidden() {
    const { t } = useTranslation();

    return (
        <AuthLayout width="wide">
            <Head title={t('Access unavailable')} />

            <StatePanel
                variant="inverse"
                tone="danger"
                tileVariant="solid"
                icon={<span aria-hidden="true">403</span>}
                title={t("You don't have access to this page")}
                description={t(
                    'Your role, network membership or account status does not allow this. Ask your network owner for the right role, or head back to your workspace.',
                )}
                actions={
                    <>
                        <Button asChild variant="inverse">
                            <Link href={dashboard()}>
                                <ArrowLeft aria-hidden="true" />
                                {t('Back to overview')}
                            </Link>
                        </Button>
                        <a
                            href="/docs/campaign-setup"
                            className="inline-flex min-h-11 items-center rounded-control px-2 font-bold text-white underline-offset-4 hover:underline"
                        >
                            {t('Campaign setup help')}
                        </a>
                    </>
                }
            />
        </AuthLayout>
    );
}
