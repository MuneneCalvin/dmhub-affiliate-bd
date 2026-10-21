/* eslint-disable @typescript-eslint/no-explicit-any */

import { CustomDialogComponent, InfoRow, ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout'
import advertisers from '@/routes/advertisers';
import { BreadcrumbItem, SharedData, TNetwork, viewAdvertiserProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Globe, DollarSign, Activity, Shield, Mail, User, Clock, RefreshCcw } from 'lucide-react';
import { formatCurrency, formatDate} from '@/utils/utils';
import { StatusBadge } from '@/dev/statusBadge';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useCustomDialogContextFactory } from '@/hooks';
import { ChangeNetworkModal } from './modals/change-network';

const Show = () => {
    const { advertiser, auth } = usePage<viewAdvertiserProps & SharedData & { networks: TNetwork[] }>().props;
    const { t } = useTranslation();
    const isSuperAdmin =
        auth?.user?.is_super_admin === true ||
        auth?.user?.is_super_admin === 1 ||
        auth?.user?.is_super_admin === '1' ||
        auth?.user?.is_super_admin === 'Y';
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            advertisers?: any;
        }>();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Advertiser'),
            href: advertisers.index.url(),
        },
        {
            title: `${advertiser?.user_name}`,
            href: advertisers.show.url(advertiser?.id),
        }
    ];
    return (
        <AppLayout>
            <Head title={advertiser?.user_name} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Advertiser")}
                    description={t('Manage Advertiser Infomation')}
                    breadcrumbs={breadcrumbs}
                    children={
                        isSuperAdmin ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() =>
                                        handleDialogContextSwitch({
                                            Component: ChangeNetworkModal,
                                            componentProps: {
                                                entityId: advertiser?.advertiser_id,
                                                currentNetworkId: advertiser?.network_id,
                                                data: advertiser,
                                            },
                                        })
                                    }>
                                       <RefreshCcw className='h-4 w-4' />
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
                                    value={`${advertiser.first_name} ${advertiser.last_name}`}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Username")}
                                    value={advertiser.user_name}
                                    icon={User}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Email")}
                                    value={advertiser.email}
                                    icon={Mail}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Network")}
                                    value={advertiser.network_name || t('N/A')}
                                    icon={Globe}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Title")}
                                    value={advertiser.title || 'N/A'}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Status")}
                                    value={<StatusBadge status={advertiser?.status} />}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Country")}
                                    value={advertiser.country_iso}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Timezone")}
                                    value={advertiser.timezone}
                                    icon={Clock}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Language")}
                                    value={advertiser.language}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    {t('Advertiser Details')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Business and website information')}
                                    </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Website URL")}
                                    value={
                                        <a href={advertiser?.website_name} target="_blank" rel="noopener noreferrer" 
                                        className="text-blue-600 hover:underline">
                                            {advertiser?.website_name}
                                        </a>
                                    }
                                    icon={Globe}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Business Name")}
                                    value={advertiser?.business_name}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Industry")}
                                    value={advertiser.industry}
                                />
                                <Separator />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    {t('Budget Information')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Payout settings and currency')}
                                    </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Total Budget")}
                                    value={formatCurrency(advertiser?.total_budget)}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Available Amount")}
                                    value={formatCurrency(advertiser?.available_budget)}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Currency")}
                                    value={`${advertiser?.currency_name} (${advertiser?.currency_code})`}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    {t('Security & Access')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Authentication and permissions')}
                                    </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Two-Factor Auth")}
                                    value={
                                        advertiser.enable_two_factor == 'Y' ? (
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
                                        advertiser.email_verified_at ? (
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
                                        advertiser?.is_publisher ? (
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
                                        advertiser?.is_advertiser ? (
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
                                        advertiser?.is_super_admin ? (
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
                                <CardDescription>
                                    {t('Important dates and activity')}
                                    </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t("Account Created")}
                                    value={formatDate(advertiser?.advertiser_created_at)}
                                    icon={Calendar}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Last Updated")}
                                    value={formatDate(advertiser?.advertiser_updated_at)}
                                />
                                <Separator />
                                <InfoRow
                                    label={t("Last Active")}
                                    value={formatDate(advertiser?.last_active_at)}
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

export default Show;
