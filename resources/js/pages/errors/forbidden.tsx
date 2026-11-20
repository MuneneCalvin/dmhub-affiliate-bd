import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
export default function Forbidden() {
    const { t } = useTranslation();
    return (
        <main className="mx-auto max-w-xl space-y-5 px-6 py-20">
            <Head title={t('Access unavailable')} />
            <p className="text-sm text-muted-foreground">403</p>
            <h1 className="text-3xl font-semibold">
                {t('Access unavailable')}
            </h1>
            <p>
                {t(
                    'This account cannot open this page. Your role, network membership or account status may not allow this action. Ask your network operator to review your access.',
                )}
            </p>
            <div className="flex flex-wrap gap-5">
                <Link className="text-primary underline" href="/dashboard">
                    {t('Return to my dashboard')}
                </Link>
                <a
                    className="text-primary underline"
                    href="/docs/campaign-setup"
                >
                    {t('Campaign setup help')}
                </a>
            </div>
        </main>
    );
}
