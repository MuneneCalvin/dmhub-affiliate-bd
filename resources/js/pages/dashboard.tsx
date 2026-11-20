import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import { edit } from '@/routes/profile';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
    const { t } = useTranslation();
    return (
        <AppLayout>
            <Head title={t('Workspace')} />
            <div className="workspace-page flex flex-1 flex-col">
                <ReusablePageTitle
                    title={t('Workspace')}
                    description={t('Manage your profile and account settings')}
                    breadcrumbs={[]}
                />
                <Card className="max-w-2xl">
                    <CardContent className="space-y-5">
                        <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-primary">
                            <Settings className="size-5" />
                        </span>
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold">
                                {t('Your account')}
                            </h2>
                            <p className="text-sm leading-6 text-muted-foreground">
                                {t(
                                    'Use the navigation to access the tools available to your role, or manage your account settings below.',
                                )}
                            </p>
                        </div>
                        <Button asChild>
                            <Link href={edit()}>
                                {t('Settings')}
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
