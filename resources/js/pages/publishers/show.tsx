

import { CustomDialogComponent, InfoRow, ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publishers from '@/routes/publishers';
import { BreadcrumbItem, SharedData, TPublisher, ViewPublisherProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Globe, DollarSign, TrendingUp, Activity, Shield, Mail, User, Clock, RefreshCcw } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/utils/utils';
import { StatusBadge } from '@/dev/statusBadge';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useCustomDialogContextFactory } from '@/hooks';
import { ChangeNetworkModal } from './publisher_modals/change-network';


const ViewPublisher = () => {

    const { publisher, auth } = usePage<ViewPublisherProps & SharedData>().props;
    const { t } = useTranslation();
    const isSuperAdmin =
        auth?.user?.is_super_admin === true ||
        auth?.user?.is_super_admin === 1 ||
        auth?.user?.is_super_admin === '1' ||
        auth?.user?.is_super_admin === 'Y';
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Publishers'),
            href: publishers.index.url(),
        },
        {
            title: `${publisher?.user_name}`,
            href: publishers.show.url(publisher?.publisher_id),
        }
    ];

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            publishers?: TPublisher,
        }>();

    return (
        <AppLayout>
            <Head title={publisher?.user_name} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Publishers")}
                    description={t('Manage Publisher Information')}
                    breadcrumbs={breadcrumbs}
                    children={
                        isSuperAdmin ? (
                            <div className="flex items-center gap-2">
                                <Button variant="default" size="sm" onClick={() =>
                                handleDialogContextSwitch({
                                    Component: ChangeNetworkModal,
                                    componentProps: {
                                        data: publisher,
                                        currentNetworkId: publisher?.network_id,
                                    },
                                })
                                }>
                                    <RefreshCcw className="h-4 w-4 mr-2" />
                                    {t('Change Network')}
                                </Button>
                            </div>
                        ) : null
                    }
                />
                <div className='w-full'>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    {t('User Information')}
                                </CardTitle>
                                <CardDescription>{t('Personal and account details')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Name")}
                                    value={`${publisher.first_name} ${publisher.last_name}`}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Username")}
                                    value={publisher.user_name}
                                    icon={User}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Email")}
                                    value={publisher.email}
                                    icon={Mail}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Title")}
                                    value={publisher.title || t('N/A')}
                                />
                                  <InfoRow
                                    label={t("Network")}
                                    value={publisher.network_name || t('N/A')}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Status")}
                                    value={<StatusBadge status={publisher?.status} />}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Country")}
                                    value={publisher.country_iso}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Timezone")}
                                    value={publisher.timezone}
                                    icon={Clock}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Language")}
                                    value={publisher.language}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    {t('Publisher Details')}
                                </CardTitle>
                                <CardDescription>{t('Business and website information')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Website URL")}
                                    value={
                                        <a href={publisher?.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            {publisher?.website_url}
                                        </a>
                                    }
                                    icon={Globe}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Monthly Visitors")}
                                    value={formatNumber(publisher?.monthly_visitors)}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Traffic Sources")}
                                    value={publisher?.traffic_sources}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Primary Verticals")}
                                    value={publisher?.primary_verticals}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Secondary Verticals")}
                                    value={publisher?.secondary_verticals}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Verification Status")}
                                    value={
                                        <div className="flex items-center gap-2">
                                            {publisher?.is_verified ? (
                                                <>
                                                    <Badge className="bg-green-500">{t('Verified')}</Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDate(publisher?.verified_at)}
                                                    </span>
                                                </>
                                            ) : (
                                                <Badge className="bg-yellow-500">{t('Pending')}</Badge>
                                            )}
                                        </div>
                                    }
                                    icon={Shield}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    {t('Performance Metrics')}
                                </CardTitle>
                                <CardDescription>{t('Stats and earnings overview')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Total Clicks")}
                                    value={formatNumber(publisher?.total_clicks)}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Total Conversions")}
                                    value={formatNumber(publisher?.total_conversions)}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Total Earnings")}
                                    value={formatCurrency(publisher?.total_earnings)}
                                    icon={DollarSign}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Conversion Rate")}
                                    value={
                                        typeof publisher?.conversion_rate === 'number'
                                            ? `${publisher.conversion_rate.toFixed(2)}%`
                                            : t('N/A')
                                    }
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Account Health")}
                                    value={
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full"
                                                    style={{ width: `${publisher?.account_health_score}%` }}
                                                />
                                            </div>
                                            <span>{publisher?.account_health_score}%</span>
                                        </div>
                                    }
                                    icon={Activity}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    {t('Payment Information')}
                                </CardTitle>
                                <CardDescription>{t('Payout settings and currency')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Payout Method")}
                                    value={publisher?.payout_method}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Payout Threshold")}
                                    value={formatCurrency(publisher?.payout_threshold)}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Currency")}
                                    value={`${publisher?.currency_name} (${publisher?.currency_code})`}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    {t('Security & Access')}
                                </CardTitle>
                                <CardDescription>{t('Authentication and permissions')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Two-Factor Auth")}
                                    value={
                                        publisher.enable_two_factor == 'Y' ? (
                                            <Badge className="bg-green-500">{t('Enabled')}</Badge>
                                        ) : (
                                            <Badge className="bg-gray-500">{t('Disabled')}</Badge>
                                        )
                                    }
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Email Verified")}
                                    value={
                                        publisher.email_verified_at ? (
                                            <Badge className="bg-green-500">{t('Yes')}</Badge>
                                        ) : (
                                            <Badge className="bg-red-500">{t('No')}</Badge>
                                        )
                                    }
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Publisher Role")}
                                    value={
                                        publisher.is_publisher ? (
                                            <Badge className="bg-blue-500">{t('Yes')}</Badge>
                                        ) : (
                                            <Badge className="bg-gray-500">{t('No')}</Badge>
                                        )
                                    }
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Advertiser Role")}
                                    value={
                                        publisher.is_advertiser ? (
                                            <Badge className="bg-blue-500">{t('Yes')}</Badge>
                                        ) : (
                                            <Badge className="bg-gray-500">{t('No')}</Badge>
                                        )
                                    }
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Super Admin")}
                                    value={
                                        publisher.is_super_admin ? (
                                            <Badge className="bg-purple-500">{t('Yes')}</Badge>
                                        ) : (
                                            <Badge className="bg-gray-500">{t('No')}</Badge>
                                        )
                                    }
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    {t('Activity Timeline')}
                                </CardTitle>
                                <CardDescription>{t('Important dates and activity')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Account Created")}
                                    value={formatDate(publisher?.publisher_created_at)}
                                    icon={Calendar}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Last Updated")}
                                    value={formatDate(publisher?.publisher_updated_at)}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Last Active")}
                                    value={formatDate(publisher?.last_active_at)}
                                    icon={Activity}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <CustomDialogComponent
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className='sm:max-w-[700px]'>
                    {dialogContent?.Component && (
                        <dialogContent.Component
                            {...{
                                componentProps: dialogContent.componentProps,
                                handleDialogContextSwitch,
                            }}
                        />
                    )}
                </CustomDialogComponent>
            </div>
        </AppLayout>
    )
}
export default ViewPublisher;
