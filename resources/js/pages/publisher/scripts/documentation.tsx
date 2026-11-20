import { CopyField, PageHeader, SectionCard } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import type { ScriptDocsCampaign, ScriptDocsDocumentation } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    Code2,
    Download,
    EyeOff,
    Globe,
    KeyRound,
    MousePointerClick,
    Server,
    Terminal,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function DocumentationPage() {
    const { t } = useTranslation();
    const { campaign, documentation, scriptToken, baseUrl } = usePage<{
        campaign: ScriptDocsCampaign;
        documentation: ScriptDocsDocumentation;
        scriptToken: string;
        baseUrl: string;
    }>().props;
    const doc = documentation;

    const sections: {
        id: string;
        title: string;
        description?: string;
        icon: ReactNode;
        tone: 'brand' | 'partners' | 'finance' | 'admin' | 'analytics';
        body: ReactNode;
    }[] = [
        {
            id: 'quick-start',
            title: doc.quick_start.title,
            description: doc.quick_start.description,
            icon: <Code2 />,
            tone: 'analytics',
            body: (
                <CopyField
                    label={t('Embed script')}
                    value={doc.quick_start.code}
                    multiline
                    variant="code"
                />
            ),
        },
        {
            id: 'platforms',
            title: t('Platform-specific instructions'),
            description: t(
                'Choose your platform for detailed integration instructions',
            ),
            icon: <Globe />,
            tone: 'partners',
            body: doc.platforms.length ? (
                <Tabs defaultValue={slug(doc.platforms[0].name)}>
                    <TabsList aria-label={t('Platform')} className="flex-wrap">
                        {doc.platforms.map((platform) => (
                            <TabsTrigger
                                key={platform.name}
                                value={slug(platform.name)}
                            >
                                {platform.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {doc.platforms.map((platform) => (
                        <TabsContent
                            key={platform.name}
                            value={slug(platform.name)}
                            className="flex flex-col gap-4 pt-4"
                        >
                            <p className="text-sm text-ink-muted">
                                {platform.instructions}
                            </p>
                            <CopyField
                                label={platform.name}
                                value={platform.code}
                                multiline
                                variant="code"
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            ) : null,
        },
        {
            id: 'exclude-forms',
            title: doc.exclude_forms.title,
            description: doc.exclude_forms.description,
            icon: <EyeOff />,
            tone: 'admin',
            body: (
                <div className="grid gap-4 xl:grid-cols-2">
                    {doc.exclude_forms.methods.map((method) => (
                        <CopyField
                            key={method.name}
                            label={method.name}
                            value={method.code}
                            multiline
                            variant="code"
                        />
                    ))}
                </div>
            ),
        },
        {
            id: 'manual-trigger',
            title: doc.manual_trigger.title,
            description: doc.manual_trigger.description,
            icon: <MousePointerClick />,
            tone: 'brand',
            body: (
                <CopyField
                    label={doc.manual_trigger.title}
                    value={doc.manual_trigger.code}
                    multiline
                    variant="code"
                />
            ),
        },
        {
            id: 'api',
            title: doc.api_direct.title,
            description: doc.api_direct.description,
            icon: <Server />,
            tone: 'analytics',
            body: (
                <CopyField
                    label={doc.api_direct.title}
                    value={doc.api_direct.code}
                    multiline
                    variant="code"
                />
            ),
        },
        {
            id: 'testing',
            title: doc.testing.title,
            description: doc.testing.description,
            icon: <Terminal />,
            tone: 'partners',
            body: (
                <ol className="grid gap-2.5 text-sm">
                    {doc.testing.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                            <CheckCircle2
                                className="mt-0.5 size-4 shrink-0 text-success-dot"
                                aria-hidden="true"
                            />
                            <span>{step}</span>
                        </li>
                    ))}
                </ol>
            ),
        },
        {
            id: 'troubleshooting',
            title: doc.troubleshooting.title,
            description: t('Common issues and their solutions'),
            icon: <AlertTriangle />,
            tone: 'finance',
            body: (
                <div className="grid gap-4">
                    {doc.troubleshooting.issues.map((issue, index) => (
                        <div
                            key={index}
                            className="rounded-[14px] border-l-4 border-warning-dot bg-surface-muted p-4"
                        >
                            <h3 className="mb-2 text-sm font-bold">
                                {issue.problem}
                            </h3>
                            <ul className="list-inside list-disc space-y-1 text-sm text-ink-muted">
                                {issue.solutions.map((solution, sIndex) => (
                                    <li key={sIndex}>{solution}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            id: 'reference',
            title: t('Reference information'),
            description: t('Your unique identifiers for this campaign'),
            icon: <KeyRound />,
            tone: 'brand',
            body: (
                <div className="grid gap-4 md:grid-cols-2">
                    <CopyField label={t('Script token')} value={scriptToken} />
                    <CopyField label={t('Base URL')} value={baseUrl} />
                </div>
            ),
        },
    ];

    return (
        <AppLayout>
            <Head title={`${t('Documentation')} - ${campaign.name}`} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Integration documentation')}
                    description={`${campaign.name} · ${campaign.offer}`}
                    breadcrumbs={[
                        {
                            title: t('Embed scripts'),
                            href: publisher.scripts.url(),
                        },
                        {
                            title: campaign.name,
                            href: publisher.scripts.show.url(campaign.id),
                        },
                        {
                            title: t('Documentation'),
                            href: publisher.scripts.docs.url(campaign.id),
                        },
                    ]}
                    icon={<BookOpen />}
                    tone="finance"
                    actions={
                        <Button asChild>
                            <a
                                href={publisher.scripts.download.url(
                                    campaign.id,
                                )}
                            >
                                <Download />
                                {t('Download as Markdown')}
                            </a>
                        </Button>
                    }
                />
                <div className="grid items-start gap-[18px] lg:grid-cols-[240px_minmax(0,1fr)]">
                    <nav
                        aria-label={t('On this page')}
                        className="rounded-card border border-border bg-surface p-4 shadow-card lg:sticky lg:top-24"
                    >
                        <p className="mb-2 px-2 text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                            {t('On this page')}
                        </p>
                        <ol className="grid gap-0.5">
                            {sections
                                .filter((section) => section.body)
                                .map((section) => (
                                    <li key={section.id}>
                                        <a
                                            href={`#${section.id}`}
                                            className="flex min-h-11 items-center rounded-[11px] px-2 text-sm font-semibold text-ink hover:bg-surface-muted hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                                        >
                                            {section.title}
                                        </a>
                                    </li>
                                ))}
                        </ol>
                    </nav>
                    <article className="flex min-w-0 flex-col gap-[18px]">
                        {sections
                            .filter((section) => section.body)
                            .map((section) => (
                                <SectionCard
                                    key={section.id}
                                    id={section.id}
                                    title={section.title}
                                    description={section.description}
                                    icon={section.icon}
                                    tone={section.tone}
                                    className="scroll-mt-24"
                                >
                                    {section.body}
                                </SectionCard>
                            ))}
                    </article>
                </div>
            </div>
        </AppLayout>
    );
}
