/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReusablePageTitle, StatCard, InfoCardSkeleton } from '@/dev/core';
import { StatusBadge } from '@/dev/statusBadge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import {
    Megaphone,
    TrendingUp,
    Clock,
    Rss,
    BookOpenCheck,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/utils';
import { useTranslation } from 'react-i18next';

const NetworkDashboard = () => {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Network Dashboard'),
            href: '/network/dashboard',
        },
    ];
    const {
        network,
        stats,
        pendingPublishers,
        pendingAdvertisers,
        recentCampaigns,
        performance,
    } = usePage<any>().props;

    return (
        <AppLayout>
            <Head title={t("Network Dashboard")} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <ReusablePageTitle
                    title={`${network?.network_name || t('Network')} ${t('Dashboard')}`}
                    breadcrumbs={breadcrumbs}
                />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title={t('Total Publishers')}
                        value={formatNumber(stats?.total_publishers)}
                        description={`${stats?.pending_publishers || 0} ${t('pending approval')}`}
                        icon={<BookOpenCheck className="h-4 w-4 text-muted-foreground" />}
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
                        icon={<Megaphone className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title={t('Active Offers')}
                        value={formatNumber(stats?.active_offers)}
                        description={`${stats?.total_offers || 0} ${t('total offers')}`}
                        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    <StatCard
                        title={t('Total Clicks')}
                        value={formatNumber(performance?.total_clicks)}
                        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title={t('Total Conversions')}
                        value={formatNumber(performance?.total_conversions)}
                        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title={t('Total Revenue')}
                        value={formatCurrency(performance?.total_revenue || 0, 'USD')}
                        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title={t('Total Commissions')}
                        value={formatCurrency(performance?.total_commission || 0, 'USD')}
                        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <InfoCardSkeleton
                        title={t('Pending Publishers')}
                        description={t('Publishers awaiting approval')}
                        icon={<Clock className="h-5 w-5" />}>
                        {pendingPublishers && pendingPublishers.length > 0 ? (
                            <div className="space-y-3">
                                {pendingPublishers.map((publisher: any) => (
                                    <div key={publisher.id} className="flex items-center justify-between border-b pb-2">
                                        <div>
                                            <p className="font-medium">
                                                {publisher.user?.first_name} {publisher.user?.last_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{publisher.user?.email}</p>
                                        </div>
                                        <StatusBadge status="P" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">{t('No pending publishers')}</p>
                        )}
                    </InfoCardSkeleton>
                    <InfoCardSkeleton
                        title={t('Pending Advertisers')}
                        description={t('Advertisers awaiting approval')}
                        icon={<Clock className="h-5 w-5" />}>
                        {pendingAdvertisers && pendingAdvertisers.length > 0 ? (
                            <div className="space-y-3">
                                {pendingAdvertisers.map((advertiser: any) => (
                                    <div key={advertiser.id} className="flex items-center justify-between border-b pb-2">
                                        <div>
                                            <p className="font-medium">
                                                {advertiser.user?.first_name} {advertiser.user?.last_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">{advertiser.business_name}</p>
                                        </div>
                                        <StatusBadge status="P" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">{t('No pending advertisers')}</p>
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
                                <div key={campaign.id} className="flex items-center justify-between border-b pb-2">
                                    <div>
                                        <p className="font-medium">{campaign.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('Budget')}: {formatCurrency(campaign.total_budget || 0, campaign.currency || 'USD')}
                                        </p>
                                    </div>
                                    <StatusBadge status={campaign.campaign_status} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">{t('No campaigns yet')}</p>
                    )}
                </InfoCardSkeleton>
            </div>
        </AppLayout>
    );
};

export default NetworkDashboard;
