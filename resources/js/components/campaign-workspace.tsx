import { FundingSheet } from '@/components/advertiser-funding-sheet';
import {
    EmptyState,
    ProgressRing,
    SectionCard,
    StatCard,
    type LinkTab,
} from '@/components/app';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { CampaignAnalytics } from '@/components/campaign-analytics';
import { CampaignFinance } from '@/components/campaign-finance';
import { CampaignOffers } from '@/components/campaign-offers';
import { CampaignOverviewChart } from '@/components/campaign-overview-chart';
import {
    CampaignPublishers,
    PublisherAssignment,
} from '@/components/campaign-publishers';
import { CampaignSettings } from '@/components/campaign-settings';
import { CampaignTrackingHub } from '@/components/campaign-tracking-hub';
import {
    CampaignHeader,
    CommissionPill,
    TrackingLinkCard,
    formatRate,
    offerStatusKey,
    type TrackingSignal,
} from '@/components/campaigns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useCount, useDate, useMoney } from '@/lib/format';
import { relativeTime } from '@/lib/relative-time';
import advertiser from '@/routes/advertiser';
import campaignRoutes from '@/routes/campaign';
import type { SharedData } from '@/types';
import type { OffersWorkspace } from '@/types/campaign-offers';
import type { CampaignOverview } from '@/types/campaign-overview';
import { Head, Link, router, usePage, usePoll } from '@inertiajs/react';
import {
    BadgeCheck,
    BarChart3,
    CheckCircle2,
    Clock3,
    Copy,
    Database,
    File,
    FileText,
    Info,
    LayoutGrid,
    Link2,
    MousePointerClick,
    Pause,
    Pencil,
    Play,
    Plus,
    Settings,
    ShoppingBag,
    Tag,
    Target,
    TriangleAlert,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import '../../css/campaign-workspace.css';

type TabKey =
    | 'overview'
    | 'offers'
    | 'publishers'
    | 'assignment'
    | 'tracking'
    | 'analytics'
    | 'finance'
    | 'settings';

const tabIcons: Record<TabKey, ReactNode> = {
    overview: <LayoutGrid className="text-brand" />,
    offers: <Tag className="text-brand" />,
    publishers: <Users className="text-partners" />,
    assignment: <BadgeCheck className="text-partners" />,
    tracking: <Link2 className="text-analytics" />,
    analytics: <BarChart3 className="text-analytics" />,
    finance: <Wallet className="text-finance" />,
    settings: <Settings className="text-ink-muted" />,
};

const managerTabs: [TabKey, string][] = [
    ['overview', 'Overview'],
    ['offers', 'Offers'],
    ['publishers', 'Publishers'],
    ['tracking', 'Tracking'],
    ['analytics', 'Analytics'],
    ['finance', 'Finance'],
    ['settings', 'Settings'],
];
const publisherTabs: [TabKey, string][] = [
    ['overview', 'Overview'],
    ['offers', 'Offers & materials'],
    ['assignment', 'My assignment'],
    ['tracking', 'Tracking'],
    ['analytics', 'Analytics'],
    ['finance', 'Earnings & payouts'],
];
const earningStates: Record<string, string> = {
    pending: 'commission awaiting review',
    approved: 'commission approved',
    locked: 'commission included in an invoice',
    payable: 'commission awaiting payment',
    paid: 'commission paid',
    rejected: 'commission rejected',
    reversed: 'commission reversed',
};

/** A label/value pair inside the budget and earnings cards. */
function Figure({
    label,
    value,
    note,
}: {
    label: string;
    value: ReactNode;
    note?: string;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                {label}
            </dt>
            <dd className="text-base font-extrabold text-ink tabular-nums">
                {value}
            </dd>
            {note && <dd className="text-xs text-ink-muted">{note}</dd>}
        </div>
    );
}

function Workspace() {
    const {
        props: { overview: data, offerWorkspace },
        url,
    } = usePage<
        SharedData & {
            overview: CampaignOverview;
            offerWorkspace?: OffersWorkspace;
        }
    >();
    const { t, i18n } = useTranslation();
    const [fundingOpen, setFundingOpen] = useState(false);
    const [statusBusy, setStatusBusy] = useState(false);
    usePoll(60000, { only: ['overview'] });
    const {
        campaign,
        publisher_view: publisher,
        budget,
        earnings,
        assignment,
        lifecycle,
        metrics,
    } = data;
    const money = useMoney(campaign.currency);
    const count = useCount();
    const formatDate = useDate();
    const tabs = publisher ? publisherTabs : managerTabs;
    const requestedTab =
        new URLSearchParams(url.split('?')[1]).get('tab') || 'overview';
    const activeTab = tabs.some(([key]) => key === requestedTab)
        ? (requestedTab as TabKey)
        : 'overview';
    const baseUrl = url.split('?')[0];
    const tabUrl = (tab: string) => `${baseUrl}?tab=${tab}`;
    const directory = publisher
        ? '/publishers/my/campaigns'
        : advertiser.campaign.index.url();
    const offers = offerWorkspace?.offers ?? [];
    const counts: Partial<Record<TabKey, number | null | undefined>> = {
        offers: data.counts?.offers ?? offers.length,
        publishers: data.counts?.publishers,
    };
    const headerTabs: LinkTab[] = tabs.map(([key, label]) => ({
        key,
        label: t(label),
        href: tabUrl(key),
        icon: tabIcons[key],
        count: counts[key] ?? undefined,
    }));
    const link = assignment?.tracking_link;

    // Headline commission: the publisher's agreed rate, else the first offer's.
    const headline = publisher
        ? assignment?.commission_type
            ? {
                  type: assignment.commission_type,
                  value: assignment.commission_value,
              }
            : null
        : (offers[0]?.rates[0] ?? null);
    const headlineRate = headline
        ? formatRate(headline.type, headline.value, (value) => money(value))
        : null;
    const commission = headline
        ? [headlineRate, headline.type].filter(Boolean).join(' · ')
        : null;

    const setStatus = (status: 'A' | 'P') => {
        setStatusBusy(true);
        router.patch(
            campaignRoutes.status.update.url(campaign.id),
            { campaign_status: status },
            { preserveScroll: true, onFinish: () => setStatusBusy(false) },
        );
    };
    const copyLink = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            toast(t('Tracking link copied'), { icon: <Copy /> });
        } catch {
            toast.error(t('Could not copy'));
        }
    };

    const actions = publisher ? (
        link ? (
            <Button onClick={copyLink}>
                <Copy />
                {t('Copy tracking link')}
            </Button>
        ) : null
    ) : (
        <>
            {data.can?.manage && campaign.status === 'A' && (
                <Button
                    variant="soft"
                    className="bg-warning-soft text-warning-ink hover:bg-warning-soft/80"
                    disabled={statusBusy}
                    onClick={() => setStatus('P')}
                >
                    <Pause />
                    {t('Pause')}
                </Button>
            )}
            {data.can?.manage && campaign.status === 'P' && (
                <Button
                    variant="success"
                    disabled={statusBusy}
                    onClick={() => setStatus('A')}
                >
                    <Play />
                    {t('Resume')}
                </Button>
            )}
            {data.can?.manage && (
                <Button variant="secondary" asChild>
                    <Link href={advertiser.campaign.edit.url(campaign.id)}>
                        <Pencil />
                        {t('Edit')}
                    </Link>
                </Button>
            )}
            {data.can?.create_offers && (
                <Button asChild>
                    <Link href={advertiser.offers.index.url(campaign.id)}>
                        <Plus />
                        {t('Add offer')}
                    </Link>
                </Button>
            )}
        </>
    );

    const attention: {
        key: string;
        title: string;
        description: string;
        tab: string;
        action: string;
        icon: LucideIcon;
        warning?: boolean;
    }[] = [
        ...(data.applications
            ? [
                  {
                      key: 'applications',
                      title: t('{{count}} publisher applications', {
                          count: data.applications,
                      }),
                      description: t(
                          data.tools.publishers
                              ? 'Review and approve or decline applications.'
                              : 'Publisher applications are awaiting review by your network.',
                      ),
                      tab: 'publishers',
                      action: t(
                          data.tools.publishers
                              ? 'Review applications'
                              : 'View applications',
                      ),
                      icon: Users,
                  },
              ]
            : []),
        ...(lifecycle.pending
            ? [
                  {
                      key: 'pending',
                      title: t('{{count}} commissions awaiting review', {
                          count: lifecycle.pending,
                      }),
                      description: t(
                          publisher || !data.tools.finance
                              ? 'Your confirmed outcomes are awaiting financial review.'
                              : 'Check outcomes and approve or reject.',
                      ),
                      tab: 'finance',
                      action: t(publisher ? 'View earnings' : 'Open finance'),
                      icon: FileText,
                  },
              ]
            : []),
        ...data.alerts
            .filter((alert) => !alert.blocks)
            .map((alert) => ({
                key: alert.code,
                title: t(alert.title),
                description: t(alert.description, alert.values),
                tab: alert.tab,
                action: t(alert.action),
                icon: TriangleAlert,
                warning: true,
            })),
    ];
    const stages: {
        title: string;
        value: ReactNode;
        icon: LucideIcon;
    }[] = [
        {
            title: 'Configured',
            value: (
                <StatusBadge
                    status={data.configured ? 'success' : 'warning'}
                    tone={data.configured ? 'success' : 'warning'}
                    label={t(data.configured ? 'Completed' : 'Setup needed')}
                />
            ),
            icon: CheckCircle2,
        },
        {
            title: 'Traffic eligibility',
            value: (
                <StatusBadge
                    status={data.traffic_eligible ? 'success' : 'paused'}
                    tone={data.traffic_eligible ? 'success' : 'warning'}
                    label={t(data.traffic_eligible ? 'Eligible' : 'Paused')}
                />
            ),
            icon: Target,
        },
        {
            title: 'Confirmed outcomes',
            value: count(lifecycle.confirmed),
            icon: BarChart3,
        },
        {
            title: 'Financial review',
            value: t('{{count}} awaiting review', { count: lifecycle.pending }),
            icon: File,
        },
        { title: 'Invoiced', value: count(lifecycle.invoiced), icon: FileText },
        { title: 'Paid', value: count(lifecycle.paid), icon: Database },
    ];

    const signals: TrackingSignal[] = [
        data.tracking?.last_outcome_at
            ? { label: t('Conversion received'), state: 'ok' }
            : { label: t('No conversion yet'), state: 'muted' },
        data.tracking?.last_click_at
            ? {
                  label: t('Last click {{time}}', {
                      time: relativeTime(
                          data.tracking.last_click_at,
                          i18n.language,
                      ),
                  }),
                  state: 'wait',
              }
            : { label: t('No clicks yet'), state: 'muted' },
    ];
    const epc = metrics.clicks ? metrics.commissions / metrics.clicks : 0;
    const spentShare =
        budget && budget.total_limit > 0
            ? Math.min(100, (budget.spent / budget.total_limit) * 100)
            : null;

    const overview = (
        <>
            <section
                aria-label={t('Performance in the selected period')}
                className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4"
            >
                <StatCard
                    label={t('Clicks')}
                    value={count(metrics.clicks)}
                    icon={<MousePointerClick />}
                    tone="analytics"
                    hint={t('Last 30 days')}
                />
                <StatCard
                    label={t('Approved conversions')}
                    value={count(metrics.conversions)}
                    icon={<Target />}
                    tone="brand"
                    hint={t('Last 30 days')}
                />
                <StatCard
                    label={t('Net sales')}
                    value={money(metrics.sales)}
                    icon={<ShoppingBag />}
                    tone="finance"
                    hint={t('Approved, last 30 days')}
                />
                <StatCard
                    label={t('EPC')}
                    value={money(epc)}
                    icon={<Wallet />}
                    tone="partners"
                    hint={t('Approved commission per click')}
                />
            </section>
            <div className="grid items-start gap-[18px] xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                <SectionCard
                    title={t('Offers')}
                    icon={<Tag />}
                    tone="brand"
                    flush
                    action={
                        <Button variant="link" asChild>
                            <Link href={tabUrl('offers')} preserveScroll>
                                {t(
                                    publisher
                                        ? 'View offers & materials'
                                        : 'Manage offers',
                                )}
                            </Link>
                        </Button>
                    }
                >
                    {offers.length ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Offer')}</TableHead>
                                    <TableHead>{t('Type')}</TableHead>
                                    <TableHead>{t('Payout')}</TableHead>
                                    <TableHead className="text-right">
                                        {t('Conv. (30 days)')}
                                    </TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {offers.map((offer) => (
                                    <TableRow key={offer.id}>
                                        <TableCell>
                                            <div className="flex min-w-[180px] items-center gap-3">
                                                {offer.thumbnail_url ? (
                                                    <img
                                                        src={
                                                            offer.thumbnail_url
                                                        }
                                                        alt=""
                                                        className="size-10 shrink-0 rounded-xl object-cover"
                                                    />
                                                ) : (
                                                    <span
                                                        aria-hidden="true"
                                                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
                                                    >
                                                        <Tag className="size-4" />
                                                    </span>
                                                )}
                                                <span className="flex min-w-0 flex-col">
                                                    <Link
                                                        href={`${tabUrl('offers')}&offer=${offer.id}`}
                                                        className="font-bold text-ink hover:text-brand-ink"
                                                    >
                                                        {offer.name}
                                                    </Link>
                                                    {offer.preview_url && (
                                                        <span className="truncate text-xs text-ink-muted">
                                                            {offer.preview_url.replace(
                                                                /^https?:\/\//,
                                                                '',
                                                            )}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex flex-wrap gap-1">
                                                {offer.rates.length
                                                    ? offer.rates.map(
                                                          (rate) => (
                                                              <CommissionPill
                                                                  key={`${rate.type}-${rate.id}`}
                                                                  type={
                                                                      rate.type
                                                                  }
                                                              />
                                                          ),
                                                      )
                                                    : '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-bold tabular-nums">
                                            {offer.rates
                                                .map((rate) =>
                                                    formatRate(
                                                        rate.type,
                                                        rate.value,
                                                        (value) => money(value),
                                                    ),
                                                )
                                                .filter(Boolean)
                                                .join(' + ') || '—'}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {count(
                                                data.offer_conversions?.[
                                                    offer.id
                                                ] ?? 0,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={offerStatusKey(
                                                    offer.offer_status,
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <EmptyState
                            icon={<Tag />}
                            title={t('No offers yet')}
                            description={t(
                                'Add an offer so publishers can promote this campaign.',
                            )}
                            action={
                                data.can?.create_offers ? (
                                    <Button asChild>
                                        <Link
                                            href={advertiser.offers.index.url(
                                                campaign.id,
                                            )}
                                        >
                                            <Plus />
                                            {t('Add offer')}
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    )}
                </SectionCard>
                <div className="flex min-w-0 flex-col gap-[18px]">
                    {budget && (
                        <SectionCard
                            title={t('Budget')}
                            icon={<Wallet />}
                            tone="finance"
                            footer={
                                data.can?.fund && data.funding_advertiser ? (
                                    <Button
                                        variant="soft"
                                        tone="finance"
                                        className="w-full"
                                        onClick={() => setFundingOpen(true)}
                                    >
                                        <Plus />
                                        {t('Add funds')}
                                    </Button>
                                ) : undefined
                            }
                        >
                            <div className="flex flex-wrap items-center gap-5">
                                {spentShare !== null && (
                                    <ProgressRing
                                        value={spentShare}
                                        max={100}
                                        tone="finance"
                                        size={112}
                                        hideLabel
                                        label={t(
                                            '{{percent}}% of budget spent',
                                            {
                                                percent: Math.round(spentShare),
                                            },
                                        )}
                                        display={
                                            <span className="flex flex-col items-center leading-tight">
                                                <strong className="text-xl font-extrabold">
                                                    {Math.round(spentShare)}%
                                                </strong>
                                                <span className="text-xs text-ink-muted">
                                                    {t('spent')}
                                                </span>
                                            </span>
                                        }
                                    />
                                )}
                                <dl className="grid min-w-0 flex-1 gap-3">
                                    <Figure
                                        label={t('Spending limit')}
                                        value={
                                            budget.total_limit > 0
                                                ? money(budget.total_limit)
                                                : t('No limit')
                                        }
                                    />
                                    <Figure
                                        label={t('Spent')}
                                        value={money(budget.spent)}
                                        note={t(
                                            'Includes pending commissions.',
                                        )}
                                    />
                                    {budget.total_limit > 0 && (
                                        <Figure
                                            label={t('Remaining')}
                                            value={money(
                                                Math.max(
                                                    0,
                                                    budget.total_limit -
                                                        budget.spent,
                                                ),
                                            )}
                                        />
                                    )}
                                </dl>
                            </div>
                            <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                                <Figure
                                    label={t("Today's gross usage")}
                                    value={`${money(budget.daily_usage)} / ${
                                        budget.daily_limit > 0
                                            ? money(budget.daily_limit)
                                            : t('No limit')
                                    }`}
                                    note={t(
                                        'UTC day · reversals do not reduce daily usage.',
                                    )}
                                />
                                <Figure
                                    label={t('Advertiser available balance')}
                                    value={money(budget.available)}
                                    note={t(
                                        'Shared across all {{advertiser}} campaigns.',
                                        { advertiser: campaign.advertiser },
                                    )}
                                />
                            </dl>
                        </SectionCard>
                    )}
                    {earnings && (
                        <SectionCard
                            title={t('Your earnings')}
                            description={t('All time · this assignment')}
                            icon={<Wallet />}
                            tone="finance"
                        >
                            <dl className="grid gap-3">
                                <Figure
                                    label={t('Awaiting review')}
                                    value={money(earnings.pending)}
                                    note={t(
                                        'Confirmed commissions awaiting financial review.',
                                    )}
                                />
                                <Figure
                                    label={t('Approved, not invoiced')}
                                    value={money(earnings.approved)}
                                    note={t(
                                        'Payout eligibility also depends on your account threshold and recoveries.',
                                    )}
                                />
                                <Figure
                                    label={t('Paid commissions')}
                                    value={money(earnings.paid)}
                                    note={t(
                                        'Net commissions with recorded payment.',
                                    )}
                                />
                            </dl>
                        </SectionCard>
                    )}
                    <TrackingLinkCard
                        title={t(
                            publisher ? 'Your tracking link' : 'Tracking link',
                        )}
                        link={link}
                        emptyMessage={t(
                            publisher
                                ? 'Your tracking link will be available after your assignment is approved and configured.'
                                : 'Each approved publisher gets a personal tracking link. Open Tracking to see links and integration status.',
                        )}
                        signals={signals}
                        footer={
                            <Link
                                href={tabUrl('tracking')}
                                preserveScroll
                                className="text-sm font-bold text-sidebar-text underline-offset-4 hover:text-white hover:underline"
                            >
                                {t('Open tracking')}
                            </Link>
                        }
                    />
                </div>
            </div>
            <div className="grid items-start gap-[18px] xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                <SectionCard
                    title={t('Daily approved conversions')}
                    description={`${formatDate(data.period.start)} – ${formatDate(data.period.end)} · UTC${
                        publisher ? ` · ${t('Your assignment only')}` : ''
                    }`}
                    icon={<BarChart3 />}
                    tone="analytics"
                >
                    <CampaignOverviewChart days={data.days} />
                    {metrics.conversions === 0 && (
                        <p className="mt-2 text-sm text-ink-muted">
                            {t(
                                lifecycle.pending
                                    ? 'Confirmed outcomes are awaiting financial review. Approved conversions will appear here.'
                                    : 'No approved conversions in this period yet.',
                            )}
                        </p>
                    )}
                </SectionCard>
                <SectionCard
                    title={t('Needs attention')}
                    icon={<TriangleAlert />}
                    tone="warning"
                    flush
                >
                    {attention.length ? (
                        <ul className="divide-y divide-border">
                            {attention.map(
                                ({
                                    key,
                                    title,
                                    description,
                                    tab,
                                    action,
                                    icon: Icon,
                                    warning,
                                }) => (
                                    <li
                                        key={key}
                                        className="flex flex-wrap items-start gap-3 px-[22px] py-4"
                                    >
                                        <Icon
                                            aria-hidden="true"
                                            className={
                                                warning
                                                    ? 'mt-0.5 size-5 shrink-0 text-warning-dot'
                                                    : 'mt-0.5 size-5 shrink-0 text-brand'
                                            }
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-bold">
                                                {title}
                                            </h3>
                                            <p className="text-[13px] text-ink-muted">
                                                {description}
                                            </p>
                                        </div>
                                        <Button
                                            variant="soft"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={tabUrl(tab)}
                                                preserveScroll
                                            >
                                                {action}
                                            </Link>
                                        </Button>
                                    </li>
                                ),
                            )}
                        </ul>
                    ) : (
                        <EmptyState
                            icon={<CheckCircle2 />}
                            tone="success"
                            title={t('You’re all caught up')}
                            description={t(
                                'No campaign issues need attention right now.',
                            )}
                        />
                    )}
                </SectionCard>
            </div>
            <SectionCard
                title={t('Campaign lifecycle')}
                description={t(
                    'Lifecycle counts are all time; invoiced and paid count distinct invoices.',
                )}
                icon={<Target />}
                tone="brand"
            >
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
                    {stages.map(({ title, value, icon: Icon }) => (
                        <div
                            key={title}
                            className="flex flex-col gap-1.5 rounded-control bg-surface-muted p-3.5"
                        >
                            <dt className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                                <Icon aria-hidden="true" className="size-3.5" />
                                {t(title)}
                            </dt>
                            <dd className="text-base font-extrabold tabular-nums">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </SectionCard>
            <SectionCard
                title={t('Recent activity')}
                icon={<Clock3 />}
                tone="neutral"
            >
                {data.activity ? (
                    <p className="text-sm">
                        {t(
                            data.activity.status === 'pending'
                                ? 'Outcome confirmed'
                                : 'Commission updated',
                        )}{' '}
                        ·{' '}
                        {new Intl.NumberFormat(i18n.language, {
                            style: 'currency',
                            currency: data.activity.currency,
                        }).format(data.activity.amount)}{' '}
                        {t(
                            earningStates[data.activity.status] ||
                                'commission updated',
                        )}
                        .{' '}
                        <time
                            dateTime={data.activity.at}
                            className="text-ink-muted"
                        >
                            {formatDate(data.activity.at)} · UTC
                        </time>
                    </p>
                ) : (
                    <p className="text-sm text-ink-muted">
                        {t(
                            'No commission activity yet. Confirmed outcomes will appear here.',
                        )}
                    </p>
                )}
            </SectionCard>
            <p className="flex items-center gap-2 text-xs text-ink-muted">
                <Info className="size-3.5 shrink-0" aria-hidden="true" />
                {t(
                    'Performance covers the last 30 UTC days. Lifecycle and financial balances are all time. Figures refresh every minute.',
                )}
            </p>
        </>
    );

    return (
        <div className="workspace-page campaign-workspace flex flex-col gap-6">
            <Head
                title={`${campaign.name} · ${t(tabs.find(([key]) => key === activeTab)?.[1] ?? 'Overview')}`}
            />
            <Breadcrumbs
                breadcrumbs={[
                    { title: t('Campaigns'), href: directory },
                    ...(data.tools.publisher
                        ? [
                              {
                                  title: t('My publisher account'),
                                  href: data.tools.publisher.href,
                              },
                          ]
                        : []),
                    { title: campaign.name, href: baseUrl },
                ]}
            />
            <CampaignHeader
                name={campaign.name}
                status={campaign.status}
                advertiser={
                    data.tools.advertiser ? (
                        <Link
                            href={data.tools.advertiser.href}
                            className="hover:text-brand-ink hover:underline"
                        >
                            {campaign.advertiser}
                        </Link>
                    ) : (
                        campaign.advertiser
                    )
                }
                commission={commission}
                countries={data.campaign.countries}
                startDate={campaign.start_date}
                endDate={campaign.end_date}
                actions={actions}
                tabs={headerTabs}
                currentTab={activeTab}
            />
            <div
                id="campaign-content"
                tabIndex={-1}
                className="flex min-w-0 flex-col gap-6 outline-none"
            >
                {data.alerts
                    .filter((alert) => alert.blocks)
                    .map((alert) => (
                        <Alert key={alert.code} variant="warning" role="status">
                            <TriangleAlert />
                            <AlertTitle>
                                {t(
                                    alert.code === 'daily_cap'
                                        ? 'Daily cap reached'
                                        : alert.title,
                                )}
                            </AlertTitle>
                            <AlertDescription>
                                <p>{t(alert.description, alert.values)}</p>
                                <Link
                                    href={tabUrl(alert.tab)}
                                    preserveScroll
                                    className="font-bold underline underline-offset-4"
                                >
                                    {t(alert.action)}
                                </Link>
                            </AlertDescription>
                        </Alert>
                    ))}
                {activeTab === 'overview' ? (
                    overview
                ) : activeTab === 'publishers' && !publisher ? (
                    <CampaignPublishers campaign={campaign} />
                ) : activeTab === 'assignment' && publisher ? (
                    <PublisherAssignment campaign={campaign} />
                ) : activeTab === 'settings' && !publisher ? (
                    <CampaignSettings campaign={campaign} />
                ) : activeTab === 'finance' ? (
                    <CampaignFinance />
                ) : activeTab === 'analytics' ? (
                    <CampaignAnalytics />
                ) : activeTab === 'tracking' ? (
                    <CampaignTrackingHub />
                ) : (
                    <CampaignOffers campaign={campaign} publisher={publisher} />
                )}
            </div>
            {data.funding_advertiser && (
                <FundingSheet
                    open={fundingOpen}
                    onOpenChange={setFundingOpen}
                    advertisers={[data.funding_advertiser]}
                />
            )}
        </div>
    );
}

export default function CampaignWorkspace() {
    return (
        <AppLayout>
            <Workspace />
        </AppLayout>
    );
}
