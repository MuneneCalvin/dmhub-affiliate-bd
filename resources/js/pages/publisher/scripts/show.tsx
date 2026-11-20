import {
    CopyField,
    MetricTile,
    PageHeader,
    SectionCard,
} from '@/components/app';
import { IntegrationSteps } from '@/components/integration-steps';
import { InstallSteps, ScriptStatusBadge } from '@/components/scripts';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import publisher from '@/routes/publisher';
import type { CampaignScript } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Code2,
    Download,
    ExternalLink,
    Globe,
    KeyRound,
    ListChecks,
    Send,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ScriptsShow() {
    const { t, i18n } = useTranslation();
    const { script } = usePage<{ script: CampaignScript; baseUrl: string }>()
        .props;
    const formatDate = useDate();
    const number = (value: number | null | undefined) =>
        new Intl.NumberFormat(i18n.language).format(Number(value ?? 0));

    const howItWorks = [
        t('Add the embed script to the website (before </body>)'),
        t('The script exposes DMHub.getReferral() for your integration'),
        t('Send the referral to your backend with your existing form request'),
        t('Keep all contact details and form contents on your website'),
        t(
            'The script preserves the latest eligible referral for returning visitors',
        ),
        t(
            'After a successful form save, report a submission event with spam-check results to create a conversion and pending commission',
        ),
    ];

    return (
        <AppLayout>
            <Head title={`${t('Script')} - ${script.campaign_name}`} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={script.campaign_name}
                    description={script.offer_name}
                    breadcrumbs={[
                        {
                            title: t('Embed scripts'),
                            href: publisher.scripts.url(),
                        },
                        {
                            title: script.campaign_name,
                            href: publisher.scripts.show.url(script.id),
                        },
                    ]}
                    icon={<Code2 />}
                    tone="analytics"
                    actions={
                        <>
                            <Button asChild variant="secondary">
                                <a
                                    href={publisher.scripts.download.url(
                                        script.id,
                                    )}
                                >
                                    <Download className="text-analytics" />
                                    {t('Download guide')}
                                </a>
                            </Button>
                            <Button asChild>
                                <Link
                                    href={publisher.scripts.docs.url(script.id)}
                                >
                                    <BookOpen />
                                    {t('Full documentation')}
                                </Link>
                            </Button>
                        </>
                    }
                />

                <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                    <SectionCard
                        title={t('Install the script')}
                        description={t(
                            'Install the SDK after completing the conversion setup steps below',
                        )}
                        icon={<Code2 />}
                        tone="analytics"
                        action={<ScriptStatusBadge script={script} withLoads />}
                        bodyClassName="flex flex-col gap-5"
                    >
                        <InstallSteps />
                        <CopyField
                            label={t('Embed script')}
                            value={script.embed_tag}
                            copiedMessage={t('Embed script copied')}
                            multiline
                            variant="code"
                        />
                        <div className="grid gap-3 sm:grid-cols-3">
                            <MetricTile
                                label={t('Script loads')}
                                value={number(script.script_loads)}
                                tone="analytics"
                            />
                            <MetricTile
                                label={t('Clicks')}
                                value={number(script.clicks)}
                                tone="brand"
                            />
                            <MetricTile
                                label={t('Last click')}
                                value={
                                    script.last_click_at
                                        ? formatDate(script.last_click_at)
                                        : t('None yet')
                                }
                                tone="partners"
                            />
                        </div>
                    </SectionCard>

                    <div className="flex min-w-0 flex-col gap-[18px]">
                        <SectionCard
                            title={t('Script details')}
                            description={t('Script URL and token information')}
                            icon={<KeyRound />}
                            tone="brand"
                            bodyClassName="flex flex-col gap-4"
                        >
                            <CopyField
                                label={t('Script URL')}
                                value={script.script_url}
                            />
                            <CopyField
                                label={t('Script token')}
                                value={script.script_token}
                            />
                        </SectionCard>
                        <SectionCard
                            title={t('Tracking link')}
                            description={t(
                                'Use this link to track visits and conversions',
                            )}
                            icon={<Globe />}
                            tone="partners"
                            bodyClassName="flex flex-col gap-4"
                        >
                            {script.tracking_link ? (
                                <>
                                    <CopyField
                                        label={t('Your tracking link')}
                                        value={script.tracking_link}
                                        copiedMessage={t(
                                            'Tracking link copied',
                                        )}
                                    />
                                    <Button
                                        asChild
                                        variant="secondary"
                                        className="self-start"
                                    >
                                        <a
                                            href={script.tracking_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink />
                                            {t('Test link')}
                                        </a>
                                    </Button>
                                </>
                            ) : (
                                <p className="text-sm text-ink-muted">
                                    {t(
                                        'No tracking link configured for this campaign.',
                                    )}
                                </p>
                            )}
                        </SectionCard>
                    </div>
                </div>

                <div className="grid items-start gap-[18px] lg:grid-cols-2">
                    <SectionCard
                        title={t('How it works')}
                        description={t(
                            'Step-by-step guide to submission tracking',
                        )}
                        icon={<ListChecks />}
                        tone="finance"
                    >
                        <ol className="grid gap-2.5 text-sm">
                            {howItWorks.map((step, index) => (
                                <li
                                    key={index}
                                    className="flex items-start gap-3"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-finance-soft text-xs font-extrabold text-finance-ink"
                                    >
                                        {index + 1}
                                    </span>
                                    <span className="pt-0.5">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </SectionCard>
                    <SectionCard
                        title={t('Submission events')}
                        description={t(
                            'The script only provides attribution. Your backend reports successful submissions without sending contact details.',
                        )}
                        icon={<Send />}
                        tone="brand"
                        bodyClassName="flex flex-col gap-4"
                    >
                        <CopyField
                            label={t('Accepted form handler')}
                            multiline
                            variant="code"
                            value={`// Wait for this script to load, then attach attribution to your form request.
const sdk = window.DMHub?.instances?.['${script.script_token}'];
if (!sdk) throw new Error('DM Hub SDK is not ready');
const referral = await sdk.getReferral();
// Include referral in your existing form request to your own backend.`}
                        />
                        <CopyField
                            label={t('Referral identity')}
                            multiline
                            variant="code"
                            value={`// referral_id is preserved in first-party storage.
// Your backend validates and saves the form, then sends a submission event
// with successful: true and spam_checks to POST /api/v1/events.
// Keep the advertiser credential on the server.`}
                        />
                    </SectionCard>
                </div>

                <IntegrationSteps />
            </div>
        </AppLayout>
    );
}
