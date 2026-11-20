import {
    EmptyState,
    IdentityCell,
    PageHeader,
    ProgressBar,
    ProgressRing,
    SectionCard,
    StatCard,
} from '@/components/app';
import {
    RevenueChart,
    type RevenueSeries,
} from '@/components/dashboard/revenue-chart';
import { partnerMoney } from '@/components/partner-money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { useCount, useMoney } from '@/lib/format';
import { initialsFrom, toneClasses, toneFromName } from '@/lib/tones';
import { cn } from '@/lib/utils';
import advertiser from '@/routes/advertiser';
import { type SharedData } from '@/types';
import { hasPermission as checkPermission } from '@/utils/permissions';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCheck,
    CircleCheck,
    FileText,
    Megaphone,
    MousePointerClick,
    Plus,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Campaign = {
    id: number;
    name: string;
    campaign_status: string;
    total_budget: string | number | null;
    spent_amount: string | number | null;
    currency: string | null;
    offers?: unknown[];
};

type Application = {
    id: number;
    campaign_id: number | null;
    campaign_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string;
    offer_name: string | null;
};

type AdvertiserDashboardProps = SharedData & {
    advertiser: { business_name: string; currency: string | null };
    stats: {
        total_campaigns: number;
        active_campaigns: number;
        net_funded_budget: number;
        available_budget: number | string;
        spent_budget: number | string;
    };
    campaigns: Campaign[];
    performance: {
        total_clicks: number;
        total_conversions: number;
        by_currency: {
            currency: string;
            revenue: number;
            commission: number;
        }[];
    };
    dailyRevenue: RevenueSeries[];
    pendingApplications: Application[];
    pendingApplicationsCount: number;
    conversionRate: number;
};

const AdvertiserDashboard = () => {
    const { t } = useTranslation();
    const {
        auth,
        advertiser: account,
        stats,
        campaigns = [],
        performance,
        dailyRevenue = [],
        pendingApplications = [],
        pendingApplicationsCount = 0,
        conversionRate,
    } = usePage<AdvertiserDashboardProps>().props;
    const currency = account?.currency || 'USD';
    const money = useMoney(currency);
    const count = useCount();
    const funded = Number(stats?.net_funded_budget ?? 0);
    const spent = Number(stats?.spent_budget ?? 0);
    const available = Number(stats?.available_budget ?? 0);
    const canViewCampaigns = checkPermission(
        auth.permissions,
        'view_campaigns',
    );
    const canCreate = checkPermission(auth.permissions, 'create_campaigns');

    return (
        <AppLayout>
            <Head title={t('Advertiser dashboard')} />
            <div className="workspace-page flex flex-col gap-7">
                <PageHeader
                    title={t('Advertiser dashboard')}
                    description={t(
                        '{{name}} · your account funding and campaign results',
                        { name: account?.business_name },
                    )}
                    breadcrumbs={[{ title: t('Overview'), href: '' }]}
                    actions={
                        canCreate && (
                            <Button asChild>
                                <Link href={advertiser.campaign.create.url()}>
                                    <Plus aria-hidden="true" />
                                    {t('Create campaign')}
                                </Link>
                            </Button>
                        )
                    }
                />

                <section
                    aria-label={t('Headline metrics')}
                    className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4"
                >
                    <StatCard
                        label={t('Total campaigns')}
                        value={count(stats?.total_campaigns)}
                        hint={t('{{count}} active campaigns', {
                            count: stats?.active_campaigns ?? 0,
                        })}
                        icon={<Megaphone />}
                        tone="brand"
                    />
                    <StatCard
                        label={t('Total clicks')}
                        value={count(performance?.total_clicks)}
                        hint={t('All-time campaign traffic')}
                        icon={<MousePointerClick />}
                        tone="analytics"
                    />
                    <StatCard
                        label={t('Approved conversions')}
                        value={count(performance?.total_conversions)}
                        hint={t('All-time approved results')}
                        icon={<CircleCheck />}
                        tone="partners"
                    />
                    <StatCard
                        label={t('Conversion rate')}
                        value={`${count(conversionRate ?? 0, 2)}%`}
                        hint={t('Approved conversions per click')}
                        icon={<TrendingUp />}
                        tone="admin"
                    />
                </section>

                <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                    <SectionCard
                        title={t('Budget overview')}
                        description={t('Your account funding at a glance')}
                        icon={<Wallet />}
                        tone="finance"
                    >
                        {funded > 0 ? (
                            <div className="flex flex-wrap items-center gap-6">
                                <ProgressRing
                                    value={spent}
                                    max={Math.max(funded, spent)}
                                    tone="finance"
                                    size={148}
                                    label={t('Budget used')}
                                />
                                <ul className="flex min-w-[200px] flex-1 flex-col gap-3">
                                    <LegendRow
                                        swatch="bg-finance"
                                        label={t('Spent budget')}
                                        value={money(spent)}
                                    />
                                    <LegendRow
                                        swatch="bg-finance-soft border border-finance/40"
                                        label={t('Available budget')}
                                        value={money(available)}
                                        valueClassName="text-success-ink"
                                    />
                                    <li className="flex items-center gap-2.5 border-t border-border pt-2.5">
                                        <span className="flex-1 font-bold">
                                            {t('Net funded budget')}
                                        </span>
                                        <strong className="tabular-nums">
                                            {money(funded)}
                                        </strong>
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<Wallet />}
                                tone="finance"
                                title={t('No funded budget yet')}
                                description={t(
                                    'Your network adds funds to your account. Spend and available budget appear here once it does.',
                                )}
                            />
                        )}
                    </SectionCard>

                    <SectionCard
                        title={t('Recent campaigns')}
                        description={t(
                            'Your latest campaigns and their status',
                        )}
                        icon={<Megaphone />}
                        tone="brand"
                        action={
                            canViewCampaigns && (
                                <Button asChild variant="ghost" size="sm">
                                    <Link
                                        href={advertiser.campaign.index.url()}
                                    >
                                        {t('View all')}
                                        <ArrowUpRight aria-hidden="true" />
                                    </Link>
                                </Button>
                            )
                        }
                    >
                        {campaigns.length ? (
                            <ul className="flex flex-col gap-2.5">
                                {campaigns.slice(0, 4).map((campaign) => (
                                    <CampaignRow
                                        key={campaign.id}
                                        campaign={campaign}
                                        currency={campaign.currency || currency}
                                        href={
                                            canViewCampaigns
                                                ? advertiser.campaign.show.url(
                                                      campaign.id,
                                                  )
                                                : undefined
                                        }
                                    />
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={<Megaphone />}
                                title={t('No campaigns yet')}
                                description={t(
                                    'Create a campaign to start building your partnerships.',
                                )}
                                action={
                                    canCreate && (
                                        <Button asChild variant="soft">
                                            <Link
                                                href={advertiser.campaign.create.url()}
                                            >
                                                <Plus aria-hidden="true" />
                                                {t('Create campaign')}
                                            </Link>
                                        </Button>
                                    )
                                }
                            />
                        )}
                    </SectionCard>
                </div>

                <SectionCard
                    title={
                        <span className="flex items-center gap-2">
                            {t('Pending applications')}
                            {pendingApplicationsCount > 0 && (
                                <Badge variant="count">
                                    {pendingApplicationsCount}
                                </Badge>
                            )}
                        </span>
                    }
                    description={t('Publishers waiting to join your campaigns')}
                    icon={<FileText />}
                    tone="admin"
                >
                    {pendingApplications.length ? (
                        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                            {pendingApplications.map((application) => {
                                const name =
                                    `${application.first_name ?? ''} ${application.last_name ?? ''}`.trim() ||
                                    application.email;
                                return (
                                    <li
                                        key={application.id}
                                        className="flex items-center gap-3 rounded-[14px] border border-border bg-surface-muted p-3.5"
                                    >
                                        <IdentityCell
                                            className="flex-1"
                                            name={name}
                                            subtitle={
                                                application.campaign_name ??
                                                application.offer_name ??
                                                t('Campaign application')
                                            }
                                        />
                                        {canViewCampaigns &&
                                        application.campaign_id ? (
                                            <Button asChild size="sm">
                                                <Link
                                                    href={`${advertiser.campaign.show.url(application.campaign_id)}?tab=publishers`}
                                                    aria-label={t(
                                                        'Review {{name}}',
                                                        { name },
                                                    )}
                                                >
                                                    {t('Review')}
                                                </Link>
                                            </Button>
                                        ) : (
                                            <StatusBadge status="P" />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <EmptyState
                            icon={<CheckCheck />}
                            tone="admin"
                            title={t('You’re all caught up')}
                            description={t(
                                'New publisher applications will appear here.',
                            )}
                        />
                    )}
                </SectionCard>

                <RevenueChart
                    series={dailyRevenue}
                    defaultCurrency={currency}
                    footer={
                        <p className="text-xs text-ink-muted">
                            {t('All time')}: {t('Sales')}{' '}
                            <strong className="text-ink">
                                {partnerMoney(
                                    performance?.by_currency,
                                    'revenue',
                                )}
                            </strong>{' '}
                            · {t('Commissions')}{' '}
                            <strong className="text-ink">
                                {partnerMoney(
                                    performance?.by_currency,
                                    'commission',
                                )}
                            </strong>
                        </p>
                    }
                />
            </div>
        </AppLayout>
    );
};

function LegendRow({
    swatch,
    label,
    value,
    valueClassName,
}: {
    swatch: string;
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <li className="flex items-center gap-2.5">
            <span
                aria-hidden="true"
                className={cn('size-3 shrink-0 rounded-[4px]', swatch)}
            />
            <span className="flex-1">{label}</span>
            <strong className={cn('tabular-nums', valueClassName)}>
                {value}
            </strong>
        </li>
    );
}

function CampaignRow({
    campaign,
    currency,
    href,
}: {
    campaign: Campaign;
    currency: string;
    href?: string;
}) {
    const { t } = useTranslation();
    const money = useMoney(currency);
    const budget = Number(campaign.total_budget ?? 0);
    const spent = Number(campaign.spent_amount ?? 0);
    const tone = toneFromName(campaign.name);
    const offers = campaign.offers?.length ?? 0;
    const body = (
        <>
            <span
                aria-hidden="true"
                className={cn(
                    'inline-flex size-11 shrink-0 items-center justify-center rounded-[13px] text-sm font-extrabold',
                    toneClasses[tone].strong,
                )}
            >
                {initialsFrom(campaign.name)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-2">
                    <strong className="truncate">{campaign.name}</strong>
                    <StatusBadge status={campaign.campaign_status} />
                </span>
                <ProgressBar
                    size="sm"
                    tone={tone}
                    value={spent}
                    max={Math.max(budget, spent, 1)}
                    label={t('{{name}} budget spent', { name: campaign.name })}
                />
            </span>
            <span className="flex min-w-[110px] flex-col items-end text-right">
                <strong className="tabular-nums">{money(spent)}</strong>
                <span className="text-xs text-ink-muted">
                    {t('of {{budget}} · {{count}} offers', {
                        budget: money(budget, true),
                        count: offers,
                    })}
                </span>
            </span>
        </>
    );
    const className =
        'flex items-center gap-3.5 rounded-[14px] border border-border p-3 text-ink';
    return (
        <li>
            {href ? (
                <Link
                    href={href}
                    className={cn(
                        className,
                        'transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                    )}
                >
                    {body}
                </Link>
            ) : (
                <div className={className}>{body}</div>
            )}
        </li>
    );
}

export default AdvertiserDashboard;
