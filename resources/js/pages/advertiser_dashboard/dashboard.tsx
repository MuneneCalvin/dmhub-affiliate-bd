import { DashboardRevenue } from '@/components/dashboard-revenue';
import { partnerMoney } from '@/components/partner-money';
import { WorkflowWelcome } from '@/components/workflow-welcome';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfoCardSkeleton, StatCard } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import { formatCurrency, formatNumber } from '@/utils/utils';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Clock,
    DollarSign,
    Megaphone,
    MousePointerClick,
    Plus,
    Target,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdvertiserDashboard = () => {
    const { t } = useTranslation();
    const {
        advertiser: advertiserData,
        dailyRevenue,
        stats,
        campaigns,
        performance,
        pendingApplications,
        conversionRate,
    } = usePage<any>().props;

    return (
        <AppLayout>
            <Head title={t('Advertiser Dashboard')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-6">
                <WorkflowWelcome role="advertiser" />
                <section>
                    <h2 className="mb-4 text-sm font-semibold text-foreground">
                        {t('Campaign Performance')}
                    </h2>
                    <div className="dashboard-summary grid grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title={t('Total Campaigns')}
                            value={formatNumber(stats?.total_campaigns)}
                            description={`${stats?.active_campaigns || 0} ${t('active')}`}
                            icon={<Megaphone className="h-4 w-4" />}
                        />
                        <StatCard
                            title={t('Total Clicks')}
                            value={formatNumber(performance?.total_clicks)}
                            icon={<MousePointerClick className="h-4 w-4" />}
                        />
                        <StatCard
                            title={t('Approved conversions')}
                            value={formatNumber(performance?.total_conversions)}
                            icon={<Target className="h-4 w-4" />}
                        />
                        <StatCard
                            title={t('Conversion Rate')}
                            value={`${conversionRate}%`}
                            icon={<TrendingUp className="h-4 w-4" />}
                            variant="highlight"
                        />
                    </div>
                </section>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                    <DashboardRevenue
                        series={dailyRevenue ?? []}
                        defaultCurrency={advertiserData?.currency || 'USD'}
                    />
                    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
                        <h2 className="border-b px-5 py-4 text-sm font-semibold text-foreground">
                            {t('Budget')}
                        </h2>
                        <div className="dashboard-summary budget-stats grid flex-1 grid-cols-1">
                            <StatCard
                                title={t('Net funded budget')}
                                value={formatCurrency(
                                    stats?.net_funded_budget || 0,
                                    advertiserData?.currency,
                                )}
                                icon={<Wallet className="h-4 w-4" />}
                            />
                            <StatCard
                                title={t('Available Budget')}
                                value={formatCurrency(
                                    stats?.available_budget || 0,
                                    advertiserData?.currency,
                                )}
                                icon={<DollarSign className="h-4 w-4" />}
                                variant="highlight"
                                valueClassName="text-green-600 dark:text-green-400"
                            />
                            <StatCard
                                title={t('Spent Budget')}
                                value={formatCurrency(
                                    stats?.spent_budget || 0,
                                    advertiserData?.currency,
                                )}
                                icon={<DollarSign className="h-4 w-4" />}
                                valueClassName="text-red-600 dark:text-red-400"
                            />
                        </div>
                    </section>
                </div>
                <WorkflowWelcome role="advertiser" actionsOnly />
                <section>
                    <h2 className="mb-4 text-sm font-semibold text-foreground">
                        {t('Overview')}
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <InfoCardSkeleton
                            title={t('My Campaigns')}
                            description={t('Your recent campaigns')}
                            icon={<Megaphone className="h-4 w-4" />}
                            variant="bordered"
                            children={
                                <>
                                    {campaigns && campaigns.length > 0 ? (
                                        <div className="divide-y divide-border rounded-md border">
                                            {campaigns.map((campaign: any) => (
                                                <div
                                                    key={campaign.id}
                                                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate font-medium">
                                                            {campaign.name}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {campaign.offers
                                                                ?.length ||
                                                                0}{' '}
                                                            {t('offers')}
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        variant={
                                                            campaign.campaign_status ===
                                                            'A'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {campaign.campaign_status ===
                                                        'A'
                                                            ? t('Active')
                                                            : t('Pending')}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-md border border-dashed py-8 text-center">
                                            <p className="mb-4 text-sm text-muted-foreground">
                                                {t('No campaigns yet')}
                                            </p>
                                            <Link
                                                href={advertiser.campaign.create.url()}
                                            >
                                                <Button variant="outline">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    {t(
                                                        'Create your first campaign',
                                                    )}
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </>
                            }
                        />

                        <InfoCardSkeleton
                            title={t('Pending Applications')}
                            description={t('Publishers waiting for approval')}
                            icon={<Clock className="h-4 w-4" />}
                            variant="bordered"
                            children={
                                <>
                                    {pendingApplications &&
                                    pendingApplications.length > 0 ? (
                                        <div className="divide-y divide-border rounded-md border">
                                            {pendingApplications.map(
                                                (application: any) => (
                                                    <div
                                                        key={application.id}
                                                        className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate font-medium">
                                                                {
                                                                    application.first_name
                                                                }{' '}
                                                                {
                                                                    application.last_name
                                                                }
                                                            </p>
                                                            <p className="truncate text-sm text-muted-foreground">
                                                                {t(
                                                                    'Applied for',
                                                                )}
                                                                :{' '}
                                                                {
                                                                    application.offer_name
                                                                }
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline">
                                                            {t('Review')}
                                                        </Badge>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <p className="py-2 text-sm text-muted-foreground">
                                            {t('No pending applications')}
                                        </p>
                                    )}
                                </>
                            }
                        />
                    </div>
                </section>
                <section>
                    <h2 className="mb-4 text-sm font-semibold text-foreground">
                        {t('Revenue')}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
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
                            icon={<Wallet className="h-4 w-4" />}
                            variant="highlight"
                        />
                    </div>
                </section>
            </div>
        </AppLayout>
    );
};

export default AdvertiserDashboard;
