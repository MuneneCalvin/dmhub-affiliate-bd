/* eslint-disable @typescript-eslint/no-explicit-any */
import { InfoCardSkeleton, InfoRow, ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publishers from '@/routes/publishers';
import { BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Separator } from '@/components/ui/separator';
import {
    Activity,
    Calendar,
    DollarSign,
    Globe,
    Link,
    MousePointerClick,
    QrCode,
    Target,
    TrendingUp,
    User,
} from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/utils/utils';
import { StatusBadge } from '@/dev/statusBadge';
import { useTranslation } from 'react-i18next';



const PublisherCampaignsShow = () => {
    const { t } = useTranslation();
    const { campaign, qrCode } = usePage<any>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('My Campaigns'),
            href: publishers.my.campaign.url(),
        },
        {
            title: campaign?.campaign_name,
            href: publishers.my.campaign.show.url(campaign?.id),
        },
    ];

    return (
        <AppLayout>
            <Head title={campaign?.campaign_name || t('My Campaign')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={campaign?.offer_name || t('Campaign Details')}
                    breadcrumbs={breadcrumbs}
                />
                <div className="w-full">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <InfoCardSkeleton
                            icon={<Activity />}
                            title={t('Campaign Information')}
                            description={t('Basic campaign and offer details')}
                            children={
                                <>
                                    <InfoRow label={t("Campaign Name")} value={campaign?.campaign_name} />
                                    <Separator />
                                    <InfoRow label={t("Offer Name")} value={campaign?.offer_name} />
                                    <Separator />
                                    <InfoRow label={t("Network")} value={campaign?.network_name} />
                                    <Separator />
                                    <InfoRow
                                        label={t("Campaign Status")}
                                        value={<StatusBadge status={campaign?.campaign_status || ''} />}
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("Offer Status")}
                                        value={<StatusBadge status={campaign?.offer_status || ''} />}
                                    />
                                </>
                            }
                        />
                        <InfoCardSkeleton
                            icon={<Target />}
                            title={t("Application Status")}
                            description={t("Your application details")}>
                            <InfoRow
                                label={t("Status")}
                                value={<StatusBadge status={campaign?.status} />}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Applied At")}
                                value={formatDate(campaign?.applied_at)}
                                icon={Calendar}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Approved At")}
                                value={formatDate(campaign?.approved_at)}
                                icon={Calendar}
                            />
                            <Separator />
                            {campaign?.rejection_reason && (
                                <>
                                    <InfoRow
                                        label={t("Rejection Reason")}
                                        value={campaign?.rejection_reason}
                                    />
                                    <Separator />
                                </>
                            )}
                            <InfoRow label={t("Notes")} value={campaign?.applied_notes || ''} />
                        </InfoCardSkeleton>
                        <InfoCardSkeleton
                            icon={<DollarSign />}
                            title={t("Commission & Payout")}
                            description={t("Earnings and commission settings")}>
                            <InfoRow
                                label={t("Commission Type")}
                                value={campaign?.commission_type || ''}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Commission Value")}
                                value={formatCurrency(
                                    campaign?.commission_value || 0,
                                    campaign?.currency_code || campaign?.currency || 'USD'
                                )}
                                icon={DollarSign}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Conversion Window")}
                                value={campaign?.conversion_window_hours ? `${campaign.conversion_window_hours} ${t('hours')}` : ''}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Cookie Lifetime")}
                                value={campaign?.click_cookie_lifetime_hours ? `${campaign.click_cookie_lifetime_hours} ${t('hours')}` : ''}
                            />
                        </InfoCardSkeleton>
                        <InfoCardSkeleton
                            icon={<TrendingUp />}
                            title={t("Performance Statistics")}
                            description={t("Your campaign performance")}>
                            <InfoRow
                                label={t("Total Clicks")}
                                value={formatNumber(campaign?.total_clicks)}
                                icon={MousePointerClick}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Total Conversions")}
                                value={formatNumber(campaign?.total_conversions)}
                                icon={Target}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Total Revenue")}
                                value={formatCurrency(
                                    campaign?.total_revenue || 0,
                                    campaign?.currency_code || campaign?.currency || 'USD'
                                )}
                                icon={DollarSign}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Total Commission")}
                                value={formatCurrency(
                                    campaign?.total_commission || 0,
                                    campaign?.currency_code || campaign?.currency || 'USD'
                                )}
                                icon={DollarSign}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Conversion Rate")}
                                value={
                                    campaign?.total_clicks > 0
                                        ? `${((campaign?.total_conversions / campaign?.total_clicks) * 100).toFixed(2)}%`
                                        : '0%'
                                }
                                icon={TrendingUp}
                            />
                        </InfoCardSkeleton>
                        <InfoCardSkeleton
                            icon={<Calendar />}
                            title={t("Campaign Timeline")}
                            description={t("Important dates")}>
                            <InfoRow
                                label={t("Start Date")}
                                value={formatDate(campaign?.start_date)}
                                icon={Calendar}
                            />
                            <Separator />
                            <InfoRow
                                label={t("End Date")}
                                value={formatDate(campaign?.end_date)}
                                icon={Calendar}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Created At")}
                                value={formatDate(campaign?.created_at)}
                                icon={Calendar}
                            />
                            {campaign?.terminated_at && (
                                <>
                                    <Separator />
                                    <InfoRow
                                        label={t("Terminated At")}
                                        value={formatDate(campaign?.terminated_at)}
                                        icon={Calendar}
                                    />
                                </>
                            )}
                        </InfoCardSkeleton>
                        <InfoCardSkeleton
                            icon={<Link />}
                            title={t("Tracking Information")}
                            description={t("Your tracking link and parameters")}>
                            <InfoRow
                                label={t("Tracking Link")}
                                value={
                                    campaign?.tracking_link ? (
                                        <a
                                            href={campaign?.tracking_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline break-all"
                                        >
                                            {campaign?.tracking_link}
                                        </a>
                                    ) : (
                                        t('Not generated yet')
                                    )
                                }
                                icon={Link}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Sub Parameter")}
                                value={campaign?.sub || ''}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Publisher Website")}
                                value={
                                    campaign?.publisher_website ? (
                                        <a
                                            href={campaign?.publisher_website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            {campaign?.publisher_website}
                                        </a>
                                    ) : (
                                        ''
                                    )
                                }
                                icon={Globe}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Publisher")}
                                value={campaign?.publisher_name}
                                icon={User}
                            />
                        </InfoCardSkeleton>
                        {qrCode && (
                            <InfoCardSkeleton
                                icon={<QrCode />}
                                title={t("QR Code")}
                                description={t("Scan to access tracking link")}>
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <img
                                        src={qrCode}
                                        alt={t("Tracking Link QR Code")}
                                        className="w-48 h-48 rounded-lg border border-gray-200 dark:border-gray-700"
                                    />
                                    <p className="text-sm text-muted-foreground text-center">
                                        {t('Scan this QR code to access your tracking link')}
                                    </p>
                                    <a
                                        href={qrCode}
                                        download={`qr-code-${campaign?.campaign_name || 'tracking'}.png`}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        {t('Download QR Code')}
                                    </a>
                                </div>
                            </InfoCardSkeleton>
                        )}
                    </div>


                </div>
            </div>
        </AppLayout>
    );
};

export default PublisherCampaignsShow;
