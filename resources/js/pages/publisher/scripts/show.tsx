import { Button } from '@/components/ui/button';
import { CodeBlock, CopyButton, InfoCardSkeleton, InfoRow, ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { BreadcrumbItem, CampaignScript } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Code, Download, ExternalLink, FileText, Globe, Key, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';

const ScriptsShow = () => {
    const { t } = useTranslation();
    const { script } = usePage<{ script: CampaignScript; baseUrl: string }>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Embed Scripts'),
            href: publisher.scripts.url(),
        },
        {
            title: script?.campaign_name,
            href: publisher.scripts.show.url(script.id),
        }
    ];

    return (
        <AppLayout>
            <Head title={`${t("Script")} - ${script.campaign_name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={script.campaign_name}
                    description={script.offer_name}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="default"
                                onClick={() => router.visit(publisher.scripts.docs.url(script.id))}>
                                <FileText className="h-4 w-4 mr-1" />
                                {t('Full Documentation')}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => window.open(publisher.scripts.download.url(script.id), '_blank')}>
                                <Download className="h-4 w-4 mr-1" />
                                {t('Download Guide')}
                            </Button>
                        </div>
                    }
                />
                <div className="grid gap-6 lg:grid-cols-2">
                    <InfoCardSkeleton
                        icon={<Code className="h-5 w-5" />}
                        title={t('Quick Start')}
                        description={t('Add this single line of code to any website to start capturing leads')}
                        children={
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">{t('Embed Script Tag')}</label>
                                    <CodeBlock code={script.embed_tag} />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {t('Place this code just before the closing </body> tag on any page where you want to capture leads.')}
                                </p>
                            </div>
                        } />

                    <InfoCardSkeleton
                        icon={<Link2 className="h-5 w-5" />}
                        title={t('Script Details')}
                        description={t('Script URL and token information')}
                        children={
                            <>
                                <InfoRow
                                    label={t('Script URL')}
                                    value={
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                                                {script.script_url}
                                            </code>
                                            <CopyButton text={script.script_url} />
                                        </div>
                                    }
                                    icon={Globe}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Script Token')}
                                    value={
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                                {script.script_token}
                                            </code>
                                            <CopyButton text={script.script_token} />
                                        </div>
                                    }
                                    icon={Key}
                                />
                            </>
                        } />
                    <InfoCardSkeleton
                        icon={<Globe className="h-5 w-5" />}
                        title={t('Tracking Link')}
                        description={t('Use this link to track visits and conversions')}
                        children={
                            <>
                                {script.tracking_link ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">{t('Your Tracking Link')}</label>
                                            <CodeBlock code={script.tracking_link} />
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => window.open(script.tracking_link, '_blank')}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-1" />
                                            {t('Test Link')}
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground py-4">
                                        {t('No tracking link configured for this campaign.')}
                                    </p>
                                )}
                            </>
                        } />

                    <InfoCardSkeleton
                        icon={<FileText className="h-5 w-5" />}
                        title={t('How It Works')}
                        description={t('Step-by-step guide to lead capture')}
                        children={
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                <li>{t('Add the embed script to the website (before </body>)')}</li>
                                <li>{t('The script automatically detects all forms on the page')}</li>
                                <li>{t('When a form with an email field is submitted, the lead data is captured')}</li>
                                <li>{t('The original form submission continues normally (non-blocking)')}</li>
                                <li>{t('Leads are attributed to your publisher account')}</li>
                                <li>{t('You earn commission based on the campaign\'s commission structure')}</li>
                            </ol>
                        } />
                    <InfoCardSkeleton
                        icon={<Code className="h-5 w-5" />}
                        title={t('Excluding Specific Forms')}
                        description={t('Website owners can exclude certain forms from being tracked')}
                    children={
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium mb-2 block">{t('Using CSS Class')}</label>
                                <CodeBlock
                                    code={`<form class="no-dmhub">
                                        <!-- This form will NOT be tracked -->
                                        </form>`}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">{t('Using Data Attribute')}</label>
                                <CodeBlock
                                    code={`<form data-dmhub-ignore="true">
                                        <!-- This form will NOT be tracked -->
                                        </form>`}
                                />
                            </div>
                        </div>
                    }/>
                </div>
            </div>
        </AppLayout>
    );
};

export default ScriptsShow;
