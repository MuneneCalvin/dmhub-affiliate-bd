import { DashboardRevenue } from '@/components/dashboard-revenue';
import { partnerMoney } from '@/components/partner-money';
import { WorkflowWelcome } from '@/components/workflow-welcome';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { InfoCardSkeleton, StatCard } from '@/dev/core';
import { StatusBadge } from '@/dev/statusBadge';
import AppLayout from '@/layouts/app-layout';
import { formatNumber } from '@/utils/utils';
import { Head, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpenCheck,
    DollarSign,
    Megaphone,
    Network,
    Rss,
    Shield,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
    const { t } = useTranslation();
    const {
        dailyRevenue,
        stats,
        recentNetworks,
        pendingNetworks,
        pendingUsers,
        performance,
        networkBreakdown,
        recentDisputes,
    } = usePage<any>().props;

    return (
        <AppLayout>
            <Head title={t('Admin Dashboard')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-6">
                <WorkflowWelcome role="admin" />
                <div className="dashboard-summary grid grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title={t('Networks')}
                        value={formatNumber(stats?.total_networks)}
                        description={`${stats?.active_networks || 0} ${t('active')}, ${stats?.pending_networks || 0} ${t('pending')}`}
                        icon={<Network className="h-4 w-4" />}
                    />
                    <StatCard
                        title={t('Total Users')}
                        value={formatNumber(stats?.total_users)}
                        description={`${stats?.total_network_owners || 0} ${t('network owners')}`}
                        icon={<Users className="h-4 w-4" />}
                    />
                    <StatCard
                        title={t('Publishers')}
                        value={formatNumber(stats?.total_publishers)}
                        description={`${stats?.pending_publishers || 0} ${t('pending approval')}`}
                        icon={<BookOpenCheck className="h-4 w-4" />}
                    />
                    <StatCard
                        title={t('Advertisers')}
                        value={formatNumber(stats?.total_advertisers)}
                        description={`${stats?.pending_advertisers || 0} ${t('pending approval')}`}
                        icon={<Rss className="h-4 w-4" />}
                    />
                </div>
                <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                    <DashboardRevenue series={dailyRevenue ?? []} />
                    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
                        <h2 className="border-b border-border px-5 py-4 text-base font-semibold">
                            {t('Campaign activity')}
                        </h2>
                        <div className="dashboard-summary operational-stats grid flex-1 grid-cols-2">
                            <StatCard
                                title={t('Total Campaigns')}
                                value={formatNumber(stats?.total_campaigns)}
                                description={`${stats?.active_campaigns || 0} ${t('active')}`}
                                icon={<Megaphone className="h-4 w-4" />}
                            />
                            <StatCard
                                title={t('Total Offers')}
                                value={formatNumber(stats?.total_offers)}
                                description={`${stats?.active_offers || 0} ${t('active')}`}
                                icon={<TrendingUp className="h-4 w-4" />}
                            />
                            <StatCard
                                title={t('Net approved sales')}
                                value={partnerMoney(
                                    performance?.by_currency,
                                    'revenue',
                                )}
                                icon={<DollarSign className="h-4 w-4" />}
                                variant="highlight"
                                valueClassName="text-green-600 dark:text-green-400"
                            />
                            <StatCard
                                title={t('Net approved commissions')}
                                value={partnerMoney(
                                    performance?.by_currency,
                                    'commission',
                                )}
                                icon={<DollarSign className="h-4 w-4" />}
                                variant="highlight"
                            />
                        </div>
                    </section>
                </div>
                <WorkflowWelcome role="admin" actionsOnly />
                <section className="approval-summary">
                    <h2 className="mb-4 text-sm font-semibold">
                        {t('Actions Required')}
                    </h2>
                    <div className="grid gap-6 rounded-xl border bg-card px-6 md:grid-cols-2">
                        <div className="py-5">
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="font-medium">
                                    {t('Pending Networks')}
                                </h3>
                                <span className="text-sm text-muted-foreground">
                                    {pendingNetworks?.length || 0}
                                </span>
                            </div>
                            {pendingNetworks?.length ? (
                                <ul className="mt-3 divide-y divide-border">
                                    {pendingNetworks.map((network: any) => (
                                        <li
                                            key={network.id}
                                            className="flex items-center justify-between gap-4 py-3"
                                        >
                                            <div>
                                                <p>{network.network_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {network.owner_email}
                                                </p>
                                            </div>
                                            <StatusBadge status="P" />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('No pending networks')}
                                </p>
                            )}
                        </div>
                        <div className="py-5">
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="font-medium">
                                    {t('Pending User Approvals')}
                                </h3>
                                <span className="text-sm text-muted-foreground">
                                    {pendingUsers?.length || 0}
                                </span>
                            </div>
                            {pendingUsers?.length ? (
                                <ul className="mt-3 divide-y divide-border">
                                    {pendingUsers.map((user: any) => (
                                        <li
                                            key={user.id}
                                            className="flex items-center justify-between gap-4 py-3"
                                        >
                                            <div>
                                                <p>
                                                    {user.first_name}{' '}
                                                    {user.last_name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <StatusBadge status="P" />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('No pending approvals')}
                                </p>
                            )}
                        </div>
                    </div>
                </section>
                <section>
                    <h2 className="mb-4 text-sm font-semibold text-foreground">
                        {t('Networks')}
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <InfoCardSkeleton
                            title={t('Top Networks')}
                            description={t('Networks by campaign count')}
                            icon={<Network className="h-4 w-4" />}
                            variant="elevated"
                        >
                            {networkBreakdown && networkBreakdown.length > 0 ? (
                                <div className="divide-y divide-border rounded-md border">
                                    {networkBreakdown.map((network: any) => (
                                        <div
                                            key={network.id}
                                            className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">
                                                    {network.network_name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {network.publishers_count}{' '}
                                                    {t('publishers')},{' '}
                                                    {network.advertisers_count}{' '}
                                                    {t('advertisers')}
                                                </p>
                                            </div>
                                            <StatusBadge status="A" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-2 text-sm text-muted-foreground">
                                    {t('No active networks')}
                                </p>
                            )}
                        </InfoCardSkeleton>

                        <InfoCardSkeleton
                            title={t('Recent Networks')}
                            description={t('Latest network registrations')}
                            icon={<Shield className="h-4 w-4" />}
                            variant="elevated"
                        >
                            {recentNetworks && recentNetworks.length > 0 ? (
                                <div className="divide-y divide-border rounded-md border">
                                    {recentNetworks.map((network: any) => (
                                        <div
                                            key={network.id}
                                            className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">
                                                    {network.network_name}
                                                </p>
                                                <p className="truncate text-sm text-muted-foreground">
                                                    {network.owner_email}
                                                </p>
                                            </div>
                                            <StatusBadge
                                                status={network.status}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-2 text-sm text-muted-foreground">
                                    {t('No networks yet')}
                                </p>
                            )}
                        </InfoCardSkeleton>
                    </div>
                </section>
                {recentDisputes && recentDisputes.length > 0 && (
                    <section>
                        <h2 className="mb-4 text-sm font-semibold text-foreground">
                            {t('Disputes')}
                        </h2>
                        <InfoCardSkeleton
                            title={t('Recent Disputes')}
                            description={t('Disputes requiring attention')}
                            icon={
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            }
                            variant="bordered"
                            className="border-l-amber-500"
                        >
                            <div className="divide-y divide-border rounded-md border">
                                {recentDisputes.map((dispute: any) => (
                                    <div
                                        key={dispute.id}
                                        className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {t('Dispute')} #{dispute.id}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {t('Status')}: {dispute.status}
                                            </p>
                                        </div>
                                        <StatusBadge status={dispute.status} />
                                    </div>
                                ))}
                            </div>
                        </InfoCardSkeleton>
                    </section>
                )}
            </div>
        </AppLayout>
    );
};

export default AdminDashboard;
