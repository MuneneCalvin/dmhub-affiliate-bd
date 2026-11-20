import { EmptyState, PageHeader } from '@/components/app';
import { IntegrationSteps } from '@/components/integration-steps';
import { ScriptDetailPanel, ScriptListCard } from '@/components/scripts';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import publishers from '@/routes/publishers';
import type { CampaignScript } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { BookOpen, Code2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function initialSelection(scripts: CampaignScript[]) {
    try {
        const wanted = Number(
            new URLSearchParams(window.location.search).get('script'),
        );
        if (scripts.some((script) => script.id === wanted)) return wanted;
    } catch {
        // No window (tests) or an unreadable URL: fall back to the first one.
    }
    return scripts[0]?.id ?? null;
}

export default function ScriptsIndex() {
    const { t } = useTranslation();
    const { campaigns } = usePage<{ campaigns: CampaignScript[] }>().props;
    const scripts = campaigns ?? [];
    const [selectedId, setSelectedId] = useState<number | null>(() =>
        initialSelection(scripts),
    );
    const selected =
        scripts.find((script) => script.id === selectedId) ?? scripts[0];

    const select = (id: number) => {
        setSelectedId(id);
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('script', String(id));
            window.history.replaceState(window.history.state, '', url);
        } catch {
            // Keeping the selection in the URL is a convenience only.
        }
    };

    return (
        <AppLayout>
            <Head title={t('Embed scripts')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Embed scripts')}
                    description={t(
                        'Add the script to your site so referrals are kept until the conversion',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: publishers.my.campaign.url(),
                        },
                        {
                            title: t('Embed scripts'),
                            href: publisher.scripts.url(),
                        },
                    ]}
                    icon={<Code2 />}
                    tone="analytics"
                    actions={
                        selected ? (
                            <Button asChild variant="secondary">
                                <Link
                                    href={publisher.scripts.docs.url(
                                        selected.id,
                                    )}
                                >
                                    <BookOpen className="text-finance" />
                                    {t('Documentation')}
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                {!selected ? (
                    <EmptyState
                        icon={<Code2 />}
                        tone="analytics"
                        title={t('No active campaigns yet')}
                        description={t(
                            'Once you have approved campaigns, your embed scripts will appear here.',
                        )}
                        action={
                            <div className="flex flex-wrap justify-center gap-3">
                                <Button asChild>
                                    <a href="/publisher_dashboard/dashboard">
                                        {t('Browse campaigns')}
                                    </a>
                                </Button>
                                <Button asChild variant="secondary">
                                    <a href={publishers.my.campaign.url()}>
                                        {t('Check my applications')}
                                    </a>
                                </Button>
                            </div>
                        }
                        className="rounded-card border border-border bg-surface"
                    />
                ) : (
                    <div className="flex flex-wrap items-start gap-[18px]">
                        <section
                            aria-label={t('Your scripts')}
                            className="flex max-w-full min-w-0 flex-[1_1_340px] flex-col gap-2.5 lg:max-w-[420px]"
                        >
                            {scripts.map((script) => (
                                <ScriptListCard
                                    key={script.id}
                                    script={script}
                                    selected={script.id === selected.id}
                                    onClick={() => select(script.id)}
                                />
                            ))}
                        </section>
                        <div className="min-w-0 flex-[2_1_520px]">
                            <ScriptDetailPanel script={selected} />
                        </div>
                    </div>
                )}

                <IntegrationSteps />
            </div>
        </AppLayout>
    );
}
