import { DashboardRevenue } from '@/components/dashboard-revenue';
import { partnerMoney } from '@/components/partner-money';
import { WorkflowWelcome } from '@/components/workflow-welcome';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { InfoCardSkeleton, StatCard } from '@/dev/core';
import { StatusBadge } from '@/dev/statusBadge';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatNumber } from '@/utils/utils';
import { Head, Link, usePage } from '@inertiajs/react';
import { BookOpenCheck, Clock, Megaphone, Rss, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NetworkDashboard = () => {
    const { t } = useTranslation();
    const {
        dailyRevenue,
        stats,
        pendingPublishers,
        pendingAdvertisers,
        recentCampaigns,
        performance,
    } = usePage<any>().props;

    return (
        <AppLayout>
            <Head title={t('Network Dashboard')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-6">
                <WorkflowWelcome role="network" />
                <div className="dashboard-summary grid grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title={t('Total Publishers')}
                        value={formatNumber(stats?.total_publishers)}
                        description={`${stats?.pending_publishers || 0} ${t('pending approval')}`}
                        icon={
                            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
                        }
                    />
                    <StatCard
                        title={t('Total Advertisers')}
                        value={formatNumber(stats?.total_advertisers)}
                        description={`${stats?.pending_advertisers || 0} ${t('pending approval')}`}
                        icon={<Rss className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title={t('Active Campaigns')}
                        value={formatNumber(stats?.active_campaigns)}
                        description={`${stats?.total_campaigns || 0} ${t('total campaigns')}`}
                        icon={
                            <Megaphone className="h-4 w-4 text-muted-foreground" />
                        }
                    />
                    <StatCard
                        title={t('Active Offers')}
                        value={formatNumber(stats?.active_offers)}
                        description={`${stats?.total_offers || 0} ${t('total offers')}`}
                        icon={
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        }
                    />
                </div>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                    <DashboardRevenue series={dailyRevenue ?? []} />
                    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
                        <h2 className="border-b px-5 py-4 text-base font-semibold">
                            {t('Performance overview')}
                        </h2>
                        <div className="dashboard-summary operational-stats grid flex-1 grid-cols-2">
                            <StatCard
                                title={t('Total Clicks')}
                                value={formatNumber(performance?.total_clicks)}
                                icon={
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                }
                            />
                            <StatCard
                                title={t('Approved conversions')}
                                value={formatNumber(
                                    performance?.total_conversions,
                                )}
                                icon={
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                }
                            />
                            <StatCard
                                title={t('Net approved sales')}
                                value={partnerMoney(
                                    performance?.by_currency,
                                    'revenue',
                                )}
                                icon={
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                }
                            />
                            <StatCard
                                title={t('Net approved commissions')}
                                value={partnerMoney(
                                    performance?.by_currency,
                                    'commission',
                                )}
                                icon={
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                }
                            />
                        </div>
                    </section>
                </div>
                <WorkflowWelcome role="network" actionsOnly />
                <div className="grid gap-6 md:grid-cols-2">
                    <InfoCardSkeleton
                        title={t('Pending Publishers')}
                        description={t('Publishers awaiting approval')}
                        icon={<Clock className="h-5 w-5" />}
                    >
                        {pendingPublishers && pendingPublishers.length > 0 ? (
                            <div className="space-y-3">
                                {pendingPublishers.map((publisher: any) => (
                                    <div
                                        key={publisher.id}
                                        className="flex items-center justify-between border-b pb-2"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {publisher.user?.first_name}{' '}
                                                {publisher.user?.last_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {publisher.user?.email}
                                            </p>
                                        </div>
                                        <StatusBadge status="P" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-2 text-sm text-muted-foreground">
                                {t('No pending publishers')}
                            </p>
                        )}
                    </InfoCardSkeleton>
                    <InfoCardSkeleton
                        title={t('Pending Advertisers')}
                        description={t('Advertisers awaiting approval')}
                        icon={<Clock className="h-5 w-5" />}
                    >
                        {pendingAdvertisers && pendingAdvertisers.length > 0 ? (
                            <div className="space-y-3">
                                {pendingAdvertisers.map((advertiser: any) => (
                                    <div
                                        key={advertiser.id}
                                        className="flex items-center justify-between border-b pb-2"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {advertiser.user?.first_name}{' '}
                                                {advertiser.user?.last_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {advertiser.business_name}
                                            </p>
                                        </div>
                                        <StatusBadge status="P" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-2 text-sm text-muted-foreground">
                                {t('No pending advertisers')}
                            </p>
                        )}
                    </InfoCardSkeleton>
                </div>
                <InfoCardSkeleton
                    title={t('Recent Campaigns')}
                    description={t('Latest campaigns in your network')}
                    icon={<Megaphone className="h-5 w-5" />}
                >
                    {recentCampaigns && recentCampaigns.length > 0 ? (
                        <div className="space-y-3">
                            {recentCampaigns.map((campaign: any) => (
                                <div
                                    key={campaign.id}
                                    className="flex items-center justify-between border-b pb-2"
                                >
                                    <div>
                                        <Link
                                            className="font-medium text-primary hover:underline"
                                            href={`/advertiser/campaigns/show/${campaign.id}`}
                                        >
                                            {campaign.name}
                                        </Link>
                                        <p className="text-sm text-muted-foreground">
                                            {t('Budget')}:{' '}
                                            {formatCurrency(
                                                campaign.total_budget || 0,
                                                campaign.currency || 'USD',
                                            )}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={campaign.campaign_status}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="py-2 text-sm text-muted-foreground">
                            {t('No campaigns yet')}
                        </p>
                    )}
                </InfoCardSkeleton>
            </div>
        </AppLayout>
    );
};

export default NetworkDashboard;
