import { Button } from '@/components/ui/button';
import { CopyButton, InfoCardSkeleton, ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { BreadcrumbItem, CampaignScript } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ExternalLink, FileText, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ScriptsIndex = () => {
    const { t } = useTranslation();
    const { campaigns } = usePage<{ campaigns: CampaignScript[] }>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Embed Scripts'),
            href: publisher.scripts.url(),
        }
    ];

    return (
        <AppLayout>
            <Head title={t("Embed Scripts")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Embed Scripts")}
                    description={t("Get embed scripts and documentation for your campaigns to share with website owners")}
                    breadcrumbs={breadcrumbs}
                />
                {!campaigns?.length ? (
                    <InfoCardSkeleton
                        icon={<FileText className="h-5 w-5" />}
                        title={t('No Active Campaigns')}
                        description={t('You don\'t have any active campaigns yet. Apply to campaigns to get your embed scripts.')}
                    >
                        <div className="flex flex-col items-center justify-center py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground text-center max-w-md">
                                {t('Once you have approved campaigns, your embed scripts will appear here.')}
                            </p>
                        </div>
                    </InfoCardSkeleton>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {campaigns?.map((campaign) => (
                            <InfoCardSkeleton
                                key={campaign?.id}
                                icon={<Link2 className="h-5 w-5" />}
                                title={campaign?.campaign_name}
                                description={campaign?.offer_name}
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t('Embed Script')}</label>
                                        <div className="relative">
                                            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-20">
                                                {campaign?.embed_tag}
                                            </pre>
                                            <div className="absolute top-1 right-1">
                                                <CopyButton text={campaign?.embed_tag || ''} />
                                            </div>
                                        </div>
                                    </div>

                                    {campaign?.tracking_link && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{t('Tracking Link')}</label>
                                            <div className="relative">
                                                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                                                    {campaign?.tracking_link}
                                                </pre>
                                                <div className="absolute top-1 right-1">
                                                    <CopyButton text={campaign?.tracking_link || ''} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-auto pt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => router.visit(publisher.scripts.show.url(campaign?.id))}
                                        >
                                            <FileText className="h-4 w-4 mr-1" />
                                            {t('Details')}
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => router.visit(publisher.scripts.docs.url(campaign?.id))}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-1" />
                                            {t('Full Docs')}
                                        </Button>
                                    </div>
                                </div>
                            </InfoCardSkeleton>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default ScriptsIndex;
