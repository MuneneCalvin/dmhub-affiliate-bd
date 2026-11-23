import {
    EmptyState,
    IdentityCell,
    MetricTile,
    PageHeader,
    SectionCard,
    StatCard,
} from '@/components/app';
import {
    RevenueChart,
    type RevenueSeries,
} from '@/components/dashboard/revenue-chart';
import { partnerMoney } from '@/components/partner-money';
import {
    PendingPartnersCard,
    type PendingPartnerCounts,
} from '@/components/pending-partners-card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { useCount } from '@/lib/format';
import { domainTones, initialsFrom, toneClasses } from '@/lib/tones';
import { cn } from '@/lib/utils';
import networks from '@/routes/networks';
import system from '@/routes/system';
import { type SharedData } from '@/types';
import { hasPermission as checkPermission } from '@/utils/permissions';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowUpRight,
    Building2,
    CheckCheck,
    Network,
    ShieldAlert,
    UserCog,
    UserRound,
    Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type AdminDashboardProps = SharedData & {
    pendingPartners?: PendingPartnerCounts;
    stats: Record<string, number>;
    pendingUsers: {
        id: number;
        first_name: string | null;
        last_name: string | null;
        email: string;
        is_publisher: boolean;
        is_advertiser: boolean;
    }[];
    performance: {
        by_currency: {
            currency: string;
            revenue: number;
            commission: number;
        }[];
    };
    dailyRevenue: RevenueSeries[];
    networkBreakdown: {
        id: number;
        network_name: string;
        publishers_count: number;
        advertisers_count: number;
        campaigns_count: number;
    }[];
    recentDisputes: { id: number; status: string | null }[];
};

const AdminDashboard = () => {
    const { t } = useTranslation();
    const count = useCount();
    const {
        auth,
        stats = {},
        pendingUsers = [],
        pendingPartners,
        performance,
        dailyRevenue = [],
        networkBreakdown = [],
        recentDisputes = [],
    } = usePage<AdminDashboardProps>().props;
    const can = (permission: string) =>
        checkPermission(auth.permissions, permission);
    // Platform-wide there is no single home currency: open on the busiest one.
    const busiestCurrency =
        [...dailyRevenue].sort(
            (a, b) =>
                b.days.reduce((sum, day) => sum + day.commission, 0) -
                a.days.reduce((sum, day) => sum + day.commission, 0),
        )[0]?.currency ?? 'USD';
    const topCount = Math.max(
        1,
        ...networkBreakdown.map((n) => n.campaigns_count),
    );

    return (
        <AppLayout>
            <Head title={t('Platform overview')} />
            <div className="workspace-page flex flex-col gap-7">
                <PageHeader
                    title={t('Platform overview')}
                    description={t(
                        'Every network, partner and campaign on the platform',
                    )}
                    breadcrumbs={[{ title: t('Overview'), href: '' }]}
                    actions={
                        <>
                            {can('manage_system_users') && (
                                <Button asChild variant="secondary">
                                    <Link href={system.settings.users.url()}>
                                        <UserCog
                                            aria-hidden="true"
                                            className="text-admin"
                                        />
                                        {t('Open team directory')}
                                    </Link>
                                </Button>
                            )}
                            {can('view_networks') && (
                                <Button asChild>
                                    <Link href={networks.index.url()}>
                                        <Network aria-hidden="true" />
                                        {t('Explore networks')}
                                    </Link>
                                </Button>
                            )}
                        </>
                    }
                />
                <PendingPartnersCard counts={pendingPartners} />

                <section
                    aria-label={t('Platform metrics')}
                    className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4"
                >
                    <StatCard
                        variant="solid"
                        tone="brand"
                        icon={<Network />}
                        label={t('Networks')}
                        value={count(stats.total_networks)}
                        badge={t('{{count}} pending', {
                            count: stats.pending_networks ?? 0,
                        })}
                    />
                    <StatCard
                        variant="solid"
                        tone="admin"
                        icon={<Users />}
                        label={t('Total users')}
                        value={count(stats.total_users)}
                        badge={t('{{count}} network owners', {
                            count: stats.total_network_owners ?? 0,
                        })}
                    />
                    <StatCard
                        variant="solid"
                        tone="partners"
                        icon={<UserRound />}
                        label={t('Publishers')}
                        value={count(stats.total_publishers)}
                        badge={t('{{count}} pending approval', {
                            count: stats.pending_publishers ?? 0,
                        })}
                    />
                    <StatCard
                        variant="solid"
                        tone="finance"
                        icon={<Building2 />}
                        label={t('Advertisers')}
                        value={count(stats.total_advertisers)}
                        badge={t('{{count}} pending approval', {
                            count: stats.pending_advertisers ?? 0,
                        })}
                    />
                </section>

                <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
                    <SectionCard
                        title={t('Campaign activity')}
                        description={t('Live campaigns across the platform')}
                        icon={<Activity />}
                        tone="brand"
                    >
                        <div className="flex flex-col gap-5">
                            <p className="flex flex-wrap items-end gap-x-3.5 gap-y-1">
                                <strong className="text-[56px] leading-none font-extrabold tracking-[-0.03em] text-brand tabular-nums">
                                    {count(stats.active_campaigns)}
                                </strong>
                                <span className="pb-1.5 text-ink-muted">
                                    {t(
                                        'campaigns active · {{count}} total campaigns',
                                        { count: stats.total_campaigns ?? 0 },
                                    )}
                                </span>
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <MetricTile
                                    tone="brand"
                                    label={t('Active offers')}
                                    value={`${count(stats.active_offers)} / ${count(stats.total_offers)}`}
                                />
                                <MetricTile
                                    tone="partners"
                                    label={t('All-time net sales')}
                                    value={partnerMoney(
                                        performance?.by_currency,
                                        'revenue',
                                    )}
                                />
                                <MetricTile
                                    tone="finance"
                                    label={t('All-time net commissions')}
                                    value={partnerMoney(
                                        performance?.by_currency,
                                        'commission',
                                    )}
                                />
                            </div>
                            <h3 className="mt-1 text-sm font-bold">
                                {t('Top networks by campaign count')}
                            </h3>
                            {networkBreakdown.length ? (
                                <ul className="flex flex-col gap-3">
                                    {networkBreakdown.map((network, index) => {
                                        const tone =
                                            domainTones[
                                                index % domainTones.length
                                            ];
                                        return (
                                            <li
                                                key={network.id}
                                                className="flex flex-wrap items-center gap-3 sm:flex-nowrap"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] text-[13px] font-extrabold',
                                                        toneClasses[tone]
                                                            .strong,
                                                    )}
                                                >
                                                    {initialsFrom(
                                                        network.network_name,
                                                    )}
                                                </span>
                                                <span className="flex min-w-0 flex-1 flex-col sm:w-[190px] sm:flex-none">
                                                    {can('view_networks') ? (
                                                        <Link
                                                            href={networks.show.url(
                                                                network.id,
                                                            )}
                                                            className="truncate font-bold text-ink hover:underline"
                                                        >
                                                            {
                                                                network.network_name
                                                            }
                                                        </Link>
                                                    ) : (
                                                        <strong className="truncate">
                                                            {
                                                                network.network_name
                                                            }
                                                        </strong>
                                                    )}
                                                    <span className="text-xs text-ink-muted">
                                                        {t(
                                                            '{{publishers}} publishers · {{advertisers}} advertisers',
                                                            {
                                                                publishers:
                                                                    network.publishers_count,
                                                                advertisers:
                                                                    network.advertisers_count,
                                                            },
                                                        )}
                                                    </span>
                                                </span>
                                                <span
                                                    aria-hidden="true"
                                                    className="order-last h-2.5 w-full rounded-full bg-surface-tint sm:order-none sm:w-auto sm:flex-1"
                                                >
                                                    <span
                                                        className={cn(
                                                            'block h-full rounded-full',
                                                            toneClasses[tone]
                                                                .fill,
                                                        )}
                                                        style={{
                                                            width: `${(network.campaigns_count / topCount) * 100}%`,
                                                        }}
                                                    />
                                                </span>
                                                <strong className="w-auto text-right tabular-nums sm:w-24">
                                                    {t('{{count}} campaigns', {
                                                        count: network.campaigns_count,
                                                    })}
                                                </strong>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <EmptyState
                                    icon={<Network />}
                                    title={t('No active networks')}
                                    description={t(
                                        'Approved networks appear here, ranked by campaigns.',
                                    )}
                                />
                            )}
                        </div>
                    </SectionCard>

                    <div className="flex min-w-0 flex-col gap-[18px]">
                        <SectionCard
                            title={t('Pending user approvals')}
                            description={t(
                                'Partners waiting for account approval',
                            )}
                            icon={<UserRound />}
                            tone="admin"
                            action={
                                can('manage_system_users') && (
                                    <Button asChild variant="ghost" size="sm">
                                        <Link
                                            href={system.settings.users.url()}
                                        >
                                            {t('View all')}
                                            <ArrowUpRight aria-hidden="true" />
                                        </Link>
                                    </Button>
                                )
                            }
                        >
                            {pendingUsers.length ? (
                                <ul className="flex flex-col">
                                    {pendingUsers.slice(0, 5).map((user) => {
                                        const name =
                                            `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
                                            user.email;
                                        const role = user.is_publisher
                                            ? t('Publisher')
                                            : t('Advertiser');
                                        const href = can('access_pool')
                                            ? user.is_publisher
                                                ? networks.pool.publishers.url()
                                                : networks.pool.advertisers.url()
                                            : undefined;
                                        return (
                                            <li
                                                key={user.id}
                                                className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                                            >
                                                <IdentityCell
                                                    className="flex-1"
                                                    name={name}
                                                    tone={
                                                        user.is_publisher
                                                            ? 'partners'
                                                            : 'finance'
                                                    }
                                                    subtitle={`${role} · ${user.email}`}
                                                />
                                                {href ? (
                                                    <Button
                                                        asChild
                                                        variant="secondary"
                                                        size="sm"
                                                    >
                                                        <Link
                                                            href={href}
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
                                    title={t('No pending approvals')}
                                />
                            )}
                        </SectionCard>

                        <SectionCard
                            title={t('Recent disputes')}
                            description={t('Latest dispute activity')}
                            icon={<ShieldAlert />}
                            tone="danger"
                        >
                            {recentDisputes.length ? (
                                <ul className="flex flex-col">
                                    {recentDisputes.map((dispute) => (
                                        <li
                                            key={dispute.id}
                                            className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                                        >
                                            <strong className="flex-1">
                                                {t('Dispute #{{id}}', {
                                                    id: dispute.id,
                                                })}
                                            </strong>
                                            <StatusBadge
                                                status={dispute.status}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState
                                    icon={<ShieldAlert />}
                                    tone="danger"
                                    title={t('No disputes')}
                                    description={t(
                                        'Disputes raised on conversions appear here.',
                                    )}
                                />
                            )}
                        </SectionCard>
                    </div>
                </div>

                <RevenueChart
                    series={dailyRevenue}
                    defaultCurrency={busiestCurrency}
                />
            </div>
        </AppLayout>
    );
};

export default AdminDashboard;
