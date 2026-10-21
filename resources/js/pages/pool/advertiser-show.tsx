/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CustomDialogComponent, InfoRow, ReusablePageTitle, useConfirmationDialog } from '@/dev/core';
import { useCustomDialogContextFactory } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Building2, Calendar, Globe, Mail, User, Briefcase, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RejectModal from './modals/reject';
import { formatDate } from '@/utils/utils';
import { StatusBadge } from '@/dev/statusBadge';
import networks from '@/routes/networks';


const AdvertiserShowPage = () => {
    const { t } = useTranslation();
    const { advertiser } = usePage<any>().props;
    const { confirm, ConfirmDialog } = useConfirmationDialog();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Pool'),
            href: networks.pool.advertisers.url(),
        },
        {
            title: t('Advertisers'),
            href: networks.pool.advertisers.url(),
        },
        {
            title: advertiser.business_name || `${advertiser.user?.first_name} ${advertiser.user?.last_name}`,
            href: '',
        },
    ];

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            advertiser?: any;
            type?: 'advertiser' | 'publisher';
        }>();
    const handleApprove = () => {
        confirm({
            title: t('Approve Advertiser'),
            description: `Are you sure you want to approve ${advertiser.user?.first_name} ${advertiser.user?.last_name} (${advertiser.business_name}) and assign them to your network?`,
            confirmLabel: t('Approve'),
            cancelLabel: t('Cancel'),
            onConfirm: () => {
                router.post(networks.pool.advertisers.approve(advertiser?.id));
            },
        });
    };

    return (
        <AppLayout>
            <Head title={`${t('Advertiser')} - ${advertiser.business_name || advertiser.user?.first_name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t('Advertiser Details')}
                    breadcrumbs={breadcrumbs}
                >
                    {!advertiser.is_verified && (
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
                                        advertiser,
                                        type: 'advertiser',
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
                                <CardDescription>{t('Details about the advertiser')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Name')}
                                    value={`${advertiser?.user?.first_name} ${advertiser.user?.last_name}`}
                                    icon={User}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Email')}
                                    value={advertiser.user?.email}
                                    icon={Mail}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Registered At')}
                                    value={formatDate(advertiser.user?.created_at)}
                                    icon={Calendar}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    {t('Business Information')}
                                </CardTitle>
                                <CardDescription>{t('Company details')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Business Name')}
                                    value={advertiser.business_name || 'N/A'}
                                    icon={Building2}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Website')}
                                    value={
                                        advertiser.website_name ? (
                                            <a href={advertiser.website_name} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                {advertiser.website_name}
                                            </a>
                                        ) : 'N/A'
                                    }
                                    icon={Globe}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Industry')}
                                    value={advertiser.industry || 'N/A'}
                                    icon={Briefcase}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('COC Number')}
                                    value={advertiser.coc_number || 'N/A'}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    {t('Budget Information')}
                                </CardTitle>
                                <CardDescription>{t('Financial details')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Total Budget')}
                                    value={advertiser.total_budget ? `${advertiser.currency || ''} ${parseFloat(String(advertiser.total_budget)).toFixed(2)}` : 'N/A'}
                                    icon={DollarSign}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Available Budget')}
                                    value={advertiser.available_budget ? `${advertiser.currency || ''} ${parseFloat(String(advertiser.available_budget)).toFixed(2)}` : 'N/A'}
                                    icon={DollarSign}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Currency')}
                                    value={advertiser.currency || 'N/A'}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    {t('Status')}
                                </CardTitle>
                                <CardDescription>{t('Current status and verification')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Status')}
                                    value = {<StatusBadge status={advertiser?.status} />}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Verified')}
                                    value={advertiser.is_verified ? 'Yes' : 'No'}
                                />
                                {advertiser.verified_at && (
                                    <>
                                        <Separator />
                                        <InfoRow
                                            label={t('Verified At')}
                                            value={formatDate(advertiser.verified_at)}
                                            icon={Calendar}
                                        />
                                    </>
                                )}
                                <Separator />
                                <InfoRow
                                    label={t('Auto-approve Publishers')}
                                    value={advertiser.auto_approve_publishers ? 'Yes' : 'No'}
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

export default AdvertiserShowPage;
