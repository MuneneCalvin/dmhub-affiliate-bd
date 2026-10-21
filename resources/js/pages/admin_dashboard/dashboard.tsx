/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReusablePageTitle, StatCard, InfoCardSkeleton } from '@/dev/core';
import { StatusBadge } from '@/dev/statusBadge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Network,
    Users,
    Megaphone,
    TrendingUp,
    DollarSign,
    Clock,
    Plus,
    BookOpenCheck,
    Rss,
    Shield,
    AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/utils';
import networks from '@/routes/networks';
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Admin Dashboard'),
            href: '/admin/dashboard',
        },
    ];
    const {
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
            <Head title={t("Admin Dashboard")} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <ReusablePageTitle
                    title={t("Platform Administration")}
                    breadcrumbs={breadcrumbs}>
                    <Link href={networks.index.url()}>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('Create Network')}
                        </Button>
                    </Link>
                </ReusablePageTitle>
                <section>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        {t('Platform Overview')}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                </section>
                <section>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        {t('Performance')}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-4">
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
                            title={t('Platform Revenue')}
                            value={formatCurrency(performance?.total_revenue || 0, 'USD')}
                            icon={<DollarSign className="h-4 w-4" />}
                            variant="highlight"
                            valueClassName="text-green-600 dark:text-green-400"
                        />
                        <StatCard
                            title={t('Total Commissions')}
                            value={formatCurrency(performance?.total_commission || 0, 'USD')}
                            icon={<DollarSign className="h-4 w-4" />}
                            variant="highlight"
                        />
                    </div>
                </section>
                <section>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        {t('Actions Required')}
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <InfoCardSkeleton
                            title={t('Pending Networks')}
                            description={t('Networks awaiting approval')}
                            icon={<Clock className="h-4 w-4" />}
                            variant="bordered">
                            {pendingNetworks && pendingNetworks.length > 0 ? (
                                <div className="divide-y divide-border rounded-md border">
                                    {pendingNetworks.map((network: any) => (
                                        <div key={network.id} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">{network.network_name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{network.owner_email}</p>
                                            </div>
                                            <StatusBadge status="P" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">{t('No pending networks')}</p>
                            )}
                        </InfoCardSkeleton>

                        <InfoCardSkeleton
                            title={t('Pending User Approvals')}
                            description={t('Publishers and advertisers awaiting approval')}
                            icon={<Users className="h-4 w-4" />}
                            variant="bordered">
                            {pendingUsers && pendingUsers.length > 0 ? (
                                <div className="divide-y divide-border rounded-md border">
                                    {pendingUsers.map((user: any) => (
                                        <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">
                                                    {user.first_name} {user.last_name}
                                                </p>
                                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                            <StatusBadge status="P" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">{t('No pending approvals')}</p>
                            )}
                        </InfoCardSkeleton>
                    </div>
                </section>
                <section>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        {t('Networks')}
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <InfoCardSkeleton
                            title={t('Top Networks')}
                            description={t('Networks by campaign count')}
                            icon={<Network className="h-4 w-4" />}
                            variant="elevated">
                            {networkBreakdown && networkBreakdown.length > 0 ? (
                                <div className="divide-y divide-border rounded-md border">
                                    {networkBreakdown.map((network: any) => (
                                        <div key={network.id} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">{network.network_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {network.publishers_count} {t('publishers')}, {network.advertisers_count} {t('advertisers')}
                                                </p>
                                            </div>
                                            <StatusBadge status="A" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">{t('No active networks')}</p>
                            )}
                        </InfoCardSkeleton>

                        <InfoCardSkeleton
                            title={t('Recent Networks')}
                            description={t('Latest network registrations')}
                            icon={<Shield className="h-4 w-4" />}
                            variant="elevated">
                            {recentNetworks && recentNetworks.length > 0 ? (
                                <div className="divide-y divide-border rounded-md border">
                                    {recentNetworks.map((network: any) => (
                                        <div key={network.id} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">{network.network_name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{network.owner_email}</p>
                                            </div>
                                            <StatusBadge status={network.status} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">{t('No networks yet')}</p>
                            )}
                        </InfoCardSkeleton>
                    </div>
                </section>
                {recentDisputes && recentDisputes.length > 0 && (
                    <section>
                        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            {t('Disputes')}
                        </h2>
                        <InfoCardSkeleton
                            title={t('Recent Disputes')}
                            description={t('Disputes requiring attention')}
                            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                            variant="bordered"
                            className="border-l-amber-500">
                            <div className="divide-y divide-border rounded-md border">
                                {recentDisputes.map((dispute: any) => (
                                    <div key={dispute.id} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                                        <div>
                                            <p className="font-medium">{t('Dispute')} #{dispute.id}</p>
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