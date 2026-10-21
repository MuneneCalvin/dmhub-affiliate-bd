/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CustomDialogComponent, InfoRow, ReusablePageTitle, useConfirmationDialog } from '@/dev/core';
import { useCustomDialogContextFactory } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Calendar, Globe, Mail, User, Users, DollarSign, BarChart3, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RejectModal from './modals/reject';
import networks from '@/routes/networks';
import { formatDate } from '@/utils/utils';
import { StatusBadge } from '@/dev/statusBadge';


const PublisherShowPage = () => {
    const { t } = useTranslation();
    const { publisher } = usePage<any>().props;
    const { confirm, ConfirmDialog } = useConfirmationDialog();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Pool'),
            href: networks.pool.publishers.url(),
        },
        {
            title: t('Publishers'),
            href: networks.pool.publishers.url(),
        },
        {
            title: `${publisher.user?.first_name} ${publisher.user?.last_name}`,
            href: '',
        },
    ];

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            publisher?: any;
            type?: 'advertiser' | 'publisher';
        }>();


    const handleApprove = () => {
        confirm({
            title: t('Approve Publisher'),
            description: `Are you sure you want to approve ${publisher.user?.first_name} ${publisher.user?.last_name} and assign them to your network?`,
            confirmLabel: t('Approve'),
            cancelLabel: t('Cancel'),
            onConfirm: () => {
                router.post(networks.pool.publishers.approve(publisher?.id));
            },
        });
    };

    return (
        <AppLayout>
            <Head title={`${t('Publisher')} - ${publisher.user?.first_name} ${publisher.user?.last_name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t('Publisher Details')}
                    breadcrumbs={breadcrumbs}
                >
                    {!publisher.is_verified && (
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleApprove}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {t('Approve & Add to Network')}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleDialogContextSwitch({
                                    Component: RejectModal,
                                    componentProps: {
                                        publisher,
                                        type: 'publisher',
                                    },
                                })}
                            >
                                {t('Reject')}
                            </Button>
                        </div>
                    )}
                </ReusablePageTitle>

                <div className="w-full">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    {t('Contact Information')}
                                </CardTitle>
                                <CardDescription>{t('Details about the publisher')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Name')}
                                    value={`${publisher.user?.first_name} ${publisher.user?.last_name}`}
                                    icon={User}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Email')}
                                    value={publisher.user?.email}
                                    icon={Mail}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Registered At')}
                                    value={formatDate(publisher.user?.created_at)}
                                    icon={Calendar}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('COC Number')}
                                    value={publisher.coc_number || 'N/A'}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    {t('Website Information')}
                                </CardTitle>
                                <CardDescription>{t('Traffic and website details')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Website')}
                                    value={
                                        publisher.website_url ? (
                                            <a href={publisher.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {publisher.website_url}
                                            </a>
                                        ) : 'N/A'
                                    }
                                    icon={Globe}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Monthly Visitors')}
                                    value={publisher.monthly_visitors ? publisher.monthly_visitors.toLocaleString() : 'N/A'}
                                    icon={Users}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Traffic Sources')}
                                    value={Array.isArray(publisher.traffic_sources) ? publisher.traffic_sources.join(', ') : (publisher.traffic_sources || 'N/A')}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Primary Verticals')}
                                    value={publisher.primary_verticals || 'N/A'}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Secondary Verticals')}
                                    value={publisher.secondary_verticals || 'N/A'}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    {t('Payout Settings')}
                                </CardTitle>
                                <CardDescription>{t('Payment preferences')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Payout Method')}
                                    value={publisher.payout_method || 'N/A'}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Payout Threshold')}
                                    value={publisher.payout_threshold ? `$${parseFloat(String(publisher.payout_threshold)).toFixed(2)}` : 'N/A'}
                                    icon={DollarSign}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    {t('Performance Stats')}
                                </CardTitle>
                                <CardDescription>{t('Historical performance')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Total Clicks')}
                                    value={publisher.total_clicks?.toLocaleString() || '0'}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Total Conversions')}
                                    value={publisher.total_conversions?.toLocaleString() || '0'}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Total Earnings')}
                                    value={publisher.total_earnings ? `$${parseFloat(String(publisher.total_earnings)).toFixed(2)}` : '$0.00'}
                                    icon={DollarSign}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Conversion Rate')}
                                    value={publisher.conversion_rate ? `${parseFloat(String(publisher.conversion_rate)).toFixed(2)}%` : '0%'}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    {t('Status')}
                                </CardTitle>
                                <CardDescription>{t('Current status and verification')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('User Status')}
                                     value={<StatusBadge status={publisher.user?.status} />}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Verified')}
                                    value={publisher.is_verified ? 'Yes' : 'No'}
                                />
                                {publisher.verified_at && (
                                    <>
                                        <Separator />
                                        <InfoRow
                                            label={t('Verified At')}
                                            value={formatDate(publisher.verified_at)}
                                            icon={Calendar}
                                        />
                                    </>
                                )}
                                <Separator />
                                <InfoRow
                                    label={t('Account Health Score')}
                                    value={publisher.account_health_score ? `${parseFloat(String(publisher.account_health_score)).toFixed(1)}/100` : 'N/A'}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Last Active')}
                                    value={formatDate(publisher.last_active_at)}
                                    icon={Calendar}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <CustomDialogComponent
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className='sm:max-w-[500px]'>
                    {dialogContent?.Component && (
                        <dialogContent.Component
                            {...{
                                componentProps: dialogContent.componentProps,
                                handleDialogContextSwitch,
                            }}
                        />
                    )}
                </CustomDialogComponent>

                <ConfirmDialog />
            </div>
        </AppLayout>
    );
};

export default PublisherShowPage;
