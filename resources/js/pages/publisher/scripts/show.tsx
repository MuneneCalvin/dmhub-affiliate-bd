import { IntegrationSteps } from '@/components/integration-steps';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    CodeBlock,
    CopyButton,
    InfoCardSkeleton,
    InfoRow,
    ReusablePageTitle,
} from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { BreadcrumbItem, CampaignScript } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Code,
    Download,
    ExternalLink,
    FileText,
    Globe,
    Key,
    Link2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ScriptsShow = () => {
    const { t } = useTranslation();
    const { script } = usePage<{ script: CampaignScript; baseUrl: string }>()
        .props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Embed Scripts'),
            href: publisher.scripts.url(),
        },
        {
            title: script?.campaign_name,
            href: publisher.scripts.show.url(script.id),
        },
    ];

    return (
        <AppLayout>
            <Head title={`${t('Script')} - ${script.campaign_name}`} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-4">
                <ReusablePageTitle
                    title={script.campaign_name}
                    description={script.offer_name}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="default"
                                onClick={() =>
                                    router.visit(
                                        publisher.scripts.docs.url(script.id),
                                    )
                                }
                            >
                                <FileText className="mr-1 h-4 w-4" />
                                {t('Full Documentation')}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    window.open(
                                        publisher.scripts.download.url(
                                            script.id,
                                        ),
                                        '_blank',
                                    )
                                }
                            >
                                <Download className="mr-1 h-4 w-4" />
                                {t('Download Guide')}
                            </Button>
                        </div>
                    }
                />
                <IntegrationSteps />
                <div className="grid gap-6 lg:grid-cols-2">
                    <InfoCardSkeleton
                        icon={<Code className="h-5 w-5" />}
                        title={t('Quick Start')}
                        description={t(
                            'Install the SDK after completing the conversion setup steps above',
                        )}
                        children={
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        {t('Embed Script Tag')}
                                    </label>
                                    <CodeBlock code={script.embed_tag} />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {t(
                                        'Place this code just before the closing </body> tag on your landing and form pages to preserve referrals.',
                                    )}
                                </p>
                            </div>
                        }
                    />

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
                                            <code className="max-w-[200px] truncate rounded bg-muted px-2 py-1 text-xs">
                                                {script.script_url}
                                            </code>
                                            <CopyButton
                                                text={script.script_url}
                                            />
                                        </div>
                                    }
                                    icon={Globe}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Script Token')}
                                    value={
                                        <div className="flex items-center gap-2">
                                            <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                                                {script.script_token}
                                            </code>
                                            <CopyButton
                                                text={script.script_token}
                                            />
                                        </div>
                                    }
                                    icon={Key}
                                />
                            </>
                        }
                    />
                    <InfoCardSkeleton
                        icon={<Globe className="h-5 w-5" />}
                        title={t('Tracking Link')}
                        description={t(
                            'Use this link to track visits and conversions',
                        )}
                        children={
                            <>
                                {script.tracking_link ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium">
                                                {t('Your Tracking Link')}
                                            </label>
                                            <CodeBlock
                                                code={script.tracking_link}
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() =>
                                                window.open(
                                                    script.tracking_link,
                                                    '_blank',
                                                )
                                            }
                                        >
                                            <ExternalLink className="mr-1 h-4 w-4" />
                                            {t('Test Link')}
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="py-4 text-muted-foreground">
                                        {t(
                                            'No tracking link configured for this campaign.',
                                        )}
                                    </p>
                                )}
                            </>
                        }
                    />

                    <InfoCardSkeleton
                        icon={<FileText className="h-5 w-5" />}
                        title={t('How It Works')}
                        description={t(
                            'Step-by-step guide to submission tracking',
                        )}
                        children={
                            <ol className="list-inside list-decimal space-y-2 text-sm">
                                <li>
                                    {t(
                                        'Add the embed script to the website (before </body>)',
                                    )}
                                </li>
                                <li>
                                    {t(
                                        'The script exposes DMHub.getReferral() for your integration',
                                    )}
                                </li>
                                <li>
                                    {t(
                                        'Send the referral to your backend with your existing form request',
                                    )}
                                </li>
                                <li>
                                    {t(
                                        'Keep all contact details and form contents on your website',
                                    )}
                                </li>
                                <li>
                                    {t(
                                        'The script preserves the latest eligible referral for returning visitors',
                                    )}
                                </li>
                                <li>
                                    {t(
                                        'After a successful form save, report a submission event with spam-check results to create a conversion and pending commission',
                                    )}
                                </li>
                            </ol>
                        }
                    />
                    <InfoCardSkeleton
                        icon={<Code className="h-5 w-5" />}
                        title={t('Submission Events')}
                        description={t(
                            'The script only provides attribution. Your backend reports successful submissions without sending contact details.',
                        )}
                        children={
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        {t('Accepted form handler')}
                                    </label>
                                    <CodeBlock
                                        code={`// Wait for this script to load, then attach attribution to your form request.
const sdk = window.DMHub?.instances?.['${script.script_token}'];
if (!sdk) throw new Error('DM Hub SDK is not ready');
const referral = await sdk.getReferral();
// Include referral in your existing form request to your own backend.`}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        {t('Referral identity')}
                                    </label>
                                    <CodeBlock
                                        code={`// referral_id is preserved in first-party storage.
// Your backend validates and saves the form, then sends a submission event
// with successful: true and spam_checks to POST /api/v1/events.
// Keep the advertiser credential on the server.`}
                                    />
                                </div>
                            </div>
                        }
                    />
                </div>
            </div>
        </AppLayout>
    );
};

export default ScriptsShow;
