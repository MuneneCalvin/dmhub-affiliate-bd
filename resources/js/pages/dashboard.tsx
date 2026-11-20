import { PageHeader, StatePanel } from '@/components/app';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { edit } from '@/routes/profile';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, LayoutDashboard, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Fallback home for accounts without a role dashboard. */
export default function Dashboard() {
    const { t } = useTranslation();
    return (
        <AppLayout>
            <Head title={t('Workspace')} />
            <div className="workspace-page flex flex-1 flex-col gap-7">
                <PageHeader
                    title={t('Workspace')}
                    description={t('Manage your profile and account settings')}
                    icon={<LayoutDashboard />}
                    breadcrumbs={[{ title: t('Overview'), href: '' }]}
                />
                <div className="rounded-card border border-border bg-surface shadow-card">
                    <StatePanel
                        icon={<Settings />}
                        tone="brand"
                        headingLevel={2}
                        title={t('Your account')}
                        description={t(
                            'Use the navigation to access the tools available to your role, or manage your account settings below.',
                        )}
                        actions={
                            <Button asChild>
                                <Link href={edit()}>
                                    {t('Settings')}
                                    <ArrowRight aria-hidden="true" />
                                </Link>
                            </Button>
                        }
                    />
                </div>
            </div>
        </AppLayout>
    );
}
