import { ActionTile, PageHeader, StatCard } from '@/components/app';
import {
    CampaignHealth,
    type BudgetRow,
} from '@/components/dashboard/campaign-health';
import {
    PendingApplications,
    type PendingApplication,
} from '@/components/dashboard/pending-applications';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import {
    PERIODS,
    RevenueChart,
    seriesFor,
    type Period,
    type RevenueSeries,
} from '@/components/dashboard/revenue-chart';
import { partnerMoney } from '@/components/partner-money';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { useCount, useMoney } from '@/lib/format';
import adminInvoices from '@/routes/admin/invoices';
import advertiser from '@/routes/advertiser';
import advertisers from '@/routes/advertisers';
import applications from '@/routes/applications';
import publishers from '@/routes/publishers';
import { type SharedData } from '@/types';
import { hasPermission as checkPermission } from '@/utils/permissions';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarDays,
    Download,
    FileText,
    Megaphone,
    MousePointerClick,
    Plus,
    ReceiptText,
    Target,
    Users,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type NetworkDashboardProps = SharedData & {
    network: {
        id: number;
        network_name: string;
        default_currency: string | null;
    };
    stats: {
        total_publishers: number;
        pending_publishers: number;
        total_advertisers: number;
        pending_advertisers: number;
        total_campaigns: number;
        active_campaigns: number;
        total_offers: number;
        active_offers: number;
    };
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
    dailyClicks: { date: string; count: number }[];
    campaignStatusCounts: Record<string, number>;
    budgets: BudgetRow[];
    pendingApplications: PendingApplication[];
    pendingApplicationsCount: number;
};

/** CSV of the daily series currently on screen. */
function downloadCsv(filename: string, rows: (string | number)[][]) {
    const csv = rows
        .map((row) =>
            row
                .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                .join(','),
        )
        .join('\n');
    const url = URL.createObjectURL(
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

const NetworkDashboard = () => {
    const { t } = useTranslation();
    const {
        auth,
        navCounts,
        network,
        stats,
        performance,
        dailyRevenue = [],
        dailyClicks = [],
        campaignStatusCounts = {},
        budgets = [],
        pendingApplications = [],
        pendingApplicationsCount = 0,
    } = usePage<NetworkDashboardProps>().props;
    const can = (permission: string) =>
        checkPermission(auth.permissions, permission);
    const [period, setPeriod] = useState<Period>(30);
    const currency = network?.default_currency || 'USD';
    const money = useMoney(currency);
    const count = useCount();
    const days = seriesFor(dailyRevenue, currency, period)?.days ?? [];
    const conversionDays = dailyRevenue.length
        ? dailyRevenue[0].days
              .slice(-period)
              .map((_, index) =>
                  dailyRevenue.reduce(
                      (sum, item) =>
                          sum +
                          (item.days.slice(-period)[index]?.conversions ?? 0),
                      0,
                  ),
              )
        : [];
    const clicks = dailyClicks.slice(-period).map((day) => day.count);
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const commission = days.map((day) => day.commission);
    const lastDays = t('Last {{count}} days', { count: period });
    const pendingCount =
        (navCounts as { pendingApplications?: number | null } | undefined)
            ?.pendingApplications ?? pendingApplicationsCount;

    const exportCsv = () => {
        const rows: (string | number)[][] = [
            [
                'date',
                'currency',
                'sales',
                'commission',
                'conversions',
                'clicks',
            ],
        ];
        const clickByDate = new Map(
            dailyClicks.map((day) => [day.date, day.count]),
        );
        dailyRevenue.forEach((series) =>
            series.days
                .slice(-period)
                .forEach((day) =>
                    rows.push([
                        day.date,
                        series.currency,
                        day.revenue,
                        day.commission,
                        day.conversions,
                        clickByDate.get(day.date) ?? 0,
                    ]),
                ),
        );
        downloadCsv(`network-performance-${period}d.csv`, rows);
    };

    const quickActions = [
        can('create_campaigns') && {
            key: 'launch',
            href: advertiser.campaign.create.url(),
            title: t('Launch campaign'),
            description: t('Set offers, budget and terms'),
            icon: <Megaphone />,
            tone: 'brand' as const,
        },
        can('review_applications') && {
            key: 'applications',
            href: applications.index.url(),
            title: t('Review applications'),
            description: t('{{count}} waiting for a decision', {
                count: pendingCount,
            }),
            icon: <FileText />,
            tone: 'admin' as const,
            count: pendingCount,
        },
        can('view_publishers') && {
            key: 'publishers',
            href: publishers.index.url(),
            title: t('Publishers'),
            description: t('{{total}} total · {{pending}} pending approval', {
                total: stats?.total_publishers ?? 0,
                pending: stats?.pending_publishers ?? 0,
            }),
            icon: <Users />,
            tone: 'partners' as const,
        },
        can('view_advertisers') && {
            key: 'advertisers',
            href: advertisers.index.url(),
            title: t('Advertisers'),
            description: t('{{total}} total · {{pending}} pending approval', {
                total: stats?.total_advertisers ?? 0,
                pending: stats?.pending_advertisers ?? 0,
            }),
            icon: <Building2 />,
            tone: 'partners' as const,
        },
        can('view_network_invoices') && {
            key: 'invoices',
            href: adminInvoices.index.url(),
            title: t('Publisher invoices'),
            description: t('Approve and settle payouts'),
            icon: <ReceiptText />,
            tone: 'finance' as const,
        },
    ].filter((item) => item !== false);

    return (
        <AppLayout>
            <Head title={t('Network overview')} />
            <div className="workspace-page flex flex-col gap-7">
                <PageHeader
                    title={t('Network overview')}
                    description={t(
                        '{{network}} · live performance for the last {{count}} days',
                        { network: network?.network_name, count: period },
                    )}
                    breadcrumbs={[{ title: t('Overview'), href: '' }]}
                    actions={
                        <>
                            <Select
                                value={String(period)}
                                onValueChange={(value) =>
                                    setPeriod(Number(value) as Period)
                                }
                            >
                                <SelectTrigger
                                    aria-label={t('Reporting period')}
                                    className="w-auto min-w-[160px] bg-surface"
                                >
                                    <CalendarDays
                                        aria-hidden="true"
                                        className="text-analytics"
                                    />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PERIODS.map((length) => (
                                        <SelectItem
                                            key={length}
                                            value={String(length)}
                                        >
                                            {t('Last {{count}} days', {
                                                count: length,
                                            })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={exportCsv}
                            >
                                <Download aria-hidden="true" />
                                {t('Export')}
                            </Button>
                            {can('create_campaigns') && (
                                <Button asChild>
                                    <Link
                                        href={advertiser.campaign.create.url()}
                                    >
                                        <Plus aria-hidden="true" />
                                        {t('New campaign')}
                                    </Link>
                                </Button>
                            )}
                        </>
                    }
                />

                <section
                    aria-label={t('Headline metrics')}
                    className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4"
                >
                    <StatCard
                        label={t('Net commissions')}
                        value={money(sum(commission))}
                        hint={`${lastDays} · ${currency}`}
                        icon={<Wallet />}
                        tone="finance"
                        sparkline={commission}
                    />
                    <StatCard
                        label={t('Clicks')}
                        value={count(sum(clicks))}
                        hint={lastDays}
                        icon={<MousePointerClick />}
                        tone="analytics"
                        sparkline={clicks}
                    />
                    <StatCard
                        label={t('Approved conversions')}
                        value={count(sum(conversionDays))}
                        hint={lastDays}
                        icon={<Target />}
                        tone="partners"
                        sparkline={conversionDays}
                    />
                    <StatCard
                        label={t('Active campaigns')}
                        value={count(stats?.active_campaigns)}
                        icon={<Megaphone />}
                        tone="brand"
                        progress={{
                            value:
                                (stats?.total_campaigns ?? 0) > 0
                                    ? (stats.active_campaigns /
                                          stats.total_campaigns) *
                                      100
                                    : 0,
                            label: t('Share of campaigns active'),
                            caption: t('{{active}} of {{total}} campaigns', {
                                active: stats?.active_campaigns ?? 0,
                                total: stats?.total_campaigns ?? 0,
                            }),
                        }}
                    />
                </section>

                {quickActions.length > 0 && (
                    <section
                        aria-labelledby="quick-actions"
                        className="flex flex-col gap-3"
                    >
                        <h2
                            id="quick-actions"
                            className="text-[15px] font-bold text-ink"
                        >
                            {t('Quick actions')}
                        </h2>
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                            {quickActions.map(({ key, ...action }) => (
                                <ActionTile
                                    key={key}
                                    {...action}
                                    countLabel={
                                        action.count !== undefined
                                            ? t('{{count}} waiting', {
                                                  count: action.count,
                                              })
                                            : undefined
                                    }
                                />
                            ))}
                        </div>
                    </section>
                )}

                <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                    <RevenueChart
                        series={dailyRevenue}
                        defaultCurrency={currency}
                        period={period}
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
                    <CampaignHealth
                        statusCounts={campaignStatusCounts}
                        budgets={budgets}
                        activeOffers={stats?.active_offers ?? 0}
                        totalOffers={stats?.total_offers ?? 0}
                    />
                </div>

                <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
                    <PendingApplications
                        items={pendingApplications}
                        total={pendingApplicationsCount}
                        canReview={can('review_applications')}
                        canApprove={can('approve_applications')}
                        canReject={can('reject_applications')}
                    />
                    <RecentActivity />
                </div>
            </div>
        </AppLayout>
    );
};

export default NetworkDashboard;
