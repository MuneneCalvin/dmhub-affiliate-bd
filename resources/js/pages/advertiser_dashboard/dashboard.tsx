/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReusablePageTitle, StatCard, InfoCardSkeleton } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Megaphone,
    TrendingUp,
    DollarSign,
    MousePointerClick,
    Target,
    Clock,
    Plus,
    Wallet,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/utils';
import advertiser from '@/routes/advertiser';
import { useTranslation } from 'react-i18next';

const AdvertiserDashboard = () => {
    const { t } = useTranslation();
    const {
        advertiser: advertiserData,
        stats,
        campaigns,
        performance,
        pendingApplications,
        conversionRate,
    } = usePage<any>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Advertiser Dashboard'),
            href: advertiser.dashboard.url(),
        },
    ];

    return (
        <AppLayout>
            <Head title={t("Advertiser Dashboard")} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <ReusablePageTitle
                    title={t("Advertiser Dashboard")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <Link href={advertiser.campaign.create.url()}>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                {t('Create Campaign')}
                            </Button>
                        </Link>
                    } />
                <section>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        {t('Budget')}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        <StatCard
                            title={t("Total Budget")}
                            value={formatCurrency(stats?.total_budget || 0, advertiserData?.currency)}
                            icon={<Wallet className="h-4 w-4" />}
                        />
                        <StatCard
                            title={t("Available Budget")}
                            value={formatCurrency(stats?.available_budget || 0, advertiserData?.currency)}
                            icon={<DollarSign className="h-4 w-4" />}
                            variant="highlight"
                            valueClassName="text-green-600 dark:text-green-400"
                        />
                        <StatCard
                            title={t("Spent Budget")}
                            value={formatCurrency(stats?.spent_budget || 0, advertiserData?.currency)}
                            icon={<DollarSign className="h-4 w-4" />}
                            valueClassName="text-red-600 dark:text-red-400"
                        />
                    </div>
                </section>
                <section>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        {t('Campaign Performance')}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard
                            title={t("Total Campaigns")}
                            value={formatNumber(stats?.total_campaigns)}
                            description={`${stats?.active_campaigns || 0} ${t('active')}`}
                            icon={<Megaphone className="h-4 w-4" />}
                        />
                        <StatCard
                            title={t("Total Clicks")}
                            value={formatNumber(performance?.total_clicks)}
                            icon={<MousePointerClick className="h-4 w-4" />}
                        />
                        <StatCard
                            title={t("Total Conversions")}
                            value={formatNumber(performance?.total_conversions)}
                            icon={<Target className="h-4 w-4" />}
                        />
                        <StatCard
                            title={t("Conversion Rate")}
                            value={`${conversionRate}%`}
                            icon={<TrendingUp className="h-4 w-4" />}
                            variant="highlight"
                        />
                    </div>
                </section>
                <section>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        {t('Overview')}
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <InfoCardSkeleton
                            title={t("My Campaigns")}
                            description={t("Your recent campaigns")}
                            icon={<Megaphone className="h-4 w-4" />}
                            variant="bordered"
                            children={
                                <>
                                    {campaigns && campaigns.length > 0 ? (
                                        <div className="divide-y divide-border rounded-md border">
                                            {campaigns.map((campaign: any) => (
                                                <div key={campaign.id} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium truncate">{campaign.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {campaign.offers?.length || 0} {t('offers')}
                                                        </p>
                                                    </div>
                                                    <Badge variant={campaign.campaign_status === 'A' ? 'default' : 'secondary'}>
                                                        {campaign.campaign_status === 'A' ? t('Active') : t('Pending')}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-md border border-dashed py-8 text-center">
                                            <p className="text-muted-foreground mb-4 text-sm">{t('No campaigns yet')}</p>
                                            <Link href={advertiser.campaign.create.url()}>
                                                <Button variant="outline">
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    {t('Create your first campaign')}
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </>
                            } />

                        <InfoCardSkeleton
                            title={t("Pending Applications")}
                            description={t("Publishers waiting for approval")}
                            icon={<Clock className="h-4 w-4" />}
                            variant="bordered"
                            children={
                                <>
                                    {pendingApplications && pendingApplications.length > 0 ? (
                                        <div className="divide-y divide-border rounded-md border">
                                            {pendingApplications.map((application: any) => (
                                                <div key={application.id} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium truncate">
                                                            {application.first_name} {application.last_name}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground truncate">
                                                            {t('Applied for')}: {application.offer_name}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline">{t('Review')}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">{t('No pending applications')}</p>
                                    )}
                                </>
                            } />
                    </div>
                </section>
                <section>
                    <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        {t('Revenue')}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <StatCard
                            title={t("Total Revenue Generated")}
                            value={formatCurrency(performance?.total_revenue || 0, advertiserData?.currency)}
                            icon={<DollarSign className="h-4 w-4" />}
                            variant="highlight"
                            valueClassName="text-green-600 dark:text-green-400"
                        />
                        <StatCard
                            title={t("Total Commissions Paid")}
                            value={formatCurrency(performance?.total_commission || 0, advertiserData?.currency)}
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