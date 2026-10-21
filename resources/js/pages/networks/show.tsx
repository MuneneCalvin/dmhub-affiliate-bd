/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { CustomDialogComponent, InfoCardSkeleton, InfoRow, ReusableAlertModal, ReusablePageTitle } from '@/dev/core';
import { useCustomDialogContextFactory, useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import networks, { activate, deactivate } from '@/routes/networks';
import { BreadcrumbItem, SingleActionsHandler, TFilterOptions, TNetwork, TPaginationFilters, User, viewNetworkProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useReducer } from 'react'
import AddUsers from './networks_modals/add_users';
import EditNetworkUser from './networks_modals/edit_user';
import { CheckCircle, Plus, Users, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Calendar, Globe, Mail } from 'lucide-react';
import { formatDate } from '@/utils/utils';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { ActionColumn, UsersColumns } from '@/dev/columns/columns';
import { StatusBadge } from '@/dev/statusBadge';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const ShowNetwork = () => {
    const { network, users, auth } = usePage<viewNetworkProps>().props;
    const { t } = useTranslation();
    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            network?: TNetwork,
            user?: User,
        }>();

    const ActionsHandlerMapping: SingleActionsHandler<User>[] = [
        {
            label: t('Edit'),
            onSelect: (user: User) => {
                handleDialogContextSwitch({
                    Component: EditNetworkUser,
                    componentProps: {
                        user,
                        networkId: network?.id,
                    },
                });
            },
        },
        {
            label: t('Deactivate'),
            onSelect: (user: User) => {
                handleDialogContextSwitch({
                    Component: ReusableAlertModal,
                    componentProps: {
                        title: t('Deactivate User'),
                        description: t('Are you sure you want to deactivate this user? They will no longer have access to this network.'),
                        confirmText: t('Deactivate'),
                        cancelText: t('Cancel'),
                        variant: 'delete',
                        onConfirm: () => {
                            router.post(`/networks/users/${user?.id}/deactivate`, {
                                network_id: network?.id,
                            });
                        },
                        onClose: () => handleDialogContextSwitch({ state: false }),
                    },
                });
            },
            conditional: (user: User) => user?.status === 'A',
        },
        {
            label: t('Activate'),
            onSelect: (user: User) => {
                handleDialogContextSwitch({
                    Component: ReusableAlertModal,
                    componentProps: {
                        title: t('Activate User'),
                        description: t('Are you sure you want to activate this user? They will regain access to this network.'),
                        confirmText: t('Activate'),
                        cancelText: t('Cancel'),
                        variant: 'default',
                        onConfirm: () => {
                            router.post(`/networks/users/${user?.id}/activate`, {
                                network_id: network?.id,
                            });
                        },
                        onClose: () => handleDialogContextSwitch({ state: false }),
                    },
                });
            },
            conditional: (user: User) => user?.status !== 'A',
        },
        {
            label: t('Remove'),
            onSelect: (user: User) => {
                handleDialogContextSwitch({
                    Component: ReusableAlertModal,
                    componentProps: {
                        title: t('Remove User from Network'),
                        description: t('Are you sure you want to remove this user from the network? This action cannot be undone.'),
                        confirmText: t('Remove'),
                        cancelText: t('Cancel'),
                        variant: 'delete',
                        onConfirm: () => {
                            router.post(`/networks/users/${user?.id}/remove`, {
                                network_id: network?.id,
                            });
                        },
                        onClose: () => handleDialogContextSwitch({}),
                    },
                });
            },
        },
    ];
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Networks'),
            href: networks.index.url(),
        },
        {
            title: `${network?.network_name}`,
            href: networks.index.url(),
        },
        {
            title: t('Show'),
            href: '',
        },
    ];

    return (
        <AppLayout>
            <Head title={network?.network_name} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={network?.network_name}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-2">
                            <Button
                                className={cn('bg-primary')}
                                onClick={() =>
                                    handleDialogContextSwitch({
                                        Component: AddUsers,
                                        componentProps: {
                                            network
                                        }
                                    })
                                }>
                                <Plus className="h-4 w-4 mr-1" />
                                {t('Add Users')}
                            </Button>
                            {auth?.user?.is_super_admin === 'Y' && network?.status !== 'A' && (
                                <Button
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() =>
                                        handleDialogContextSwitch({
                                            Component: ReusableAlertModal,
                                            componentProps: {
                                                title: t('Approve Network'),
                                                description: t('Are you sure you want to approve this network? This will make the network active.'),
                                                confirmText: t('Approve'),
                                                cancelText: t('Cancel'),
                                                variant: 'default',
                                                onConfirm: () => {
                                                    router.post(activate.url(network?.id));
                                                },
                                                onClose: () => handleDialogContextSwitch({}),
                                            },
                                        })
                                    }>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {t('Approve')}
                                </Button>
                            )}
                            {auth?.user?.is_super_admin === 'Y' && network?.status === 'A' && (
                                <Button
                                    variant="destructive"
                                    onClick={() =>
                                        handleDialogContextSwitch({
                                            Component: ReusableAlertModal,
                                            componentProps: {
                                                title: t('Deactivate Network'),
                                                description: t('Are you sure you want to deactivate this network? This action can be reversed.'),
                                                confirmText: t('Deactivate'),
                                                cancelText: t('Cancel'),
                                                variant: 'delete',
                                                onConfirm: () => {
                                                    router.post(deactivate.url(network?.id));
                                                },
                                                onClose: () => handleDialogContextSwitch({}),
                                            },
                                        })
                                    }>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    {t('Deactivate')}
                                </Button>
                            )}
                        </div>
                    }
                />
                <div className='w-full'>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <InfoCardSkeleton
                            icon={<Users className="h-5 w-5" />}
                            title={t('Network Information')}
                            description={t('Network and account details')}
                            children={
                                <>
                                    <InfoRow label={t("Name")} value={network?.network_name} />
                                    <Separator />
                                    <InfoRow label={t("Email")} value={network?.owner_email} icon={Mail} />
                                    <Separator />
                                    <InfoRow label={t("Status")} value={<StatusBadge status={(network?.status)} />} />
                                    <Separator />
                                    <InfoRow label={t("Country")} value={`${network?.country_iso} - ${network?.country_name}`} />
                                    <Separator />
                                    <InfoRow label={t("Default Currency")} value={network?.default_currency} />
                                    <Separator />
                                    <InfoRow label={t("Payment Frequency")} value={<StatusBadge status={network?.payment_frequency}/>} />
                                    <Separator />
                                    <InfoRow label={t("Pay Day of Month")} value={network?.pay_day_of_month} />
                                    <Separator />
                                    <InfoRow label={t("Pay Day of Week")} value={network?.pay_day_of_week} />
                                </>
                            } />

                        <InfoCardSkeleton
                            icon={<Globe className="h-5 w-5" />}
                            title={t('Other Details')}
                            description={t('Business and website information')}
                            children={
                                <>
                                    <InfoRow
                                        label={t("Logo URL")}
                                        value={
                                            <a
                                                href={network?.logo_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline max-w-[180px] truncate block"
                                                title={network?.logo_url}>
                                                {network?.logo_url}
                                            </a>
                                        }
                                        icon={Globe}
                                    />
                                    <Separator />
                                    <InfoRow label={t("Min Payment Threshold")} value={network?.min_payment_threshold} />
                                    <Separator />
                                    <InfoRow label={t("Default Commission Model")} value={<StatusBadge status={network?.default_commission_model}/>} />
                                    <Separator />
                                    <InfoRow label={t("Default Commission Value")} value={network?.default_commission_value} />
                                    <Separator />
                                    <InfoRow label={t("Support Email")} value={network?.support_email} />
                                    <Separator />
                                    <InfoRow label={t("Support Phone")} value={network?.support_phone} />
                                </>
                            } />

                        <InfoCardSkeleton
                            icon={<Calendar className="h-5 w-5" />}
                            title={t('Other Details')}
                            description={t('Business and website information')}
                            children={
                                <>
                                    <InfoRow label={t("Created At")} value={formatDate(network?.created_at)} icon={Calendar} />
                                    <Separator />
                                    <InfoRow label={t("Updated At")} value={formatDate(network?.updated_at)} />
                                    <Separator />
                                    <InfoRow label={t("Approved At")} value={network?.approved_at ? formatDate(network.approved_at) : ''} />
                                    <Separator />
                                    <InfoRow label={t("Approved By")} value={network?.approved_by || ''} />
                                </>
                            } />
                    </div>

                    <div className='mt-2'>
                        <InfoCardSkeleton
                            children={
                                <>
                                    <CustomBaseTable
                                        {...{
                                            onPageChange: (page) =>
                                                optionsDispatcher({
                                                    payload: { page },
                                                    type: 'page',
                                                }),
                                            OtherToolsProps: {
                                                onChange: (data: any) =>
                                                    optionsDispatcherDebounce({
                                                        payload: { term: data },
                                                        type: 'term',
                                                    }),
                                                placeholder: t('Search'),
                                                includeFilter: true,
                                            },
                                            columns: [
                                                ...UsersColumns,
                                                ActionColumn({ ActionsHandlerMapping }),
                                            ],
                                            OtherTools:SearchTools,
                                            data: users ?? [],
                                            pageCount: users?.pageCount ?? 1,
                                            title: t('Our Users'),
                                            showPagination: true,
                                            setPageSize: (pageSize) =>
                                                optionsDispatcher({
                                                    payload: { pageSize },
                                                    type: 'pageSize',
                                                }),
                                            pageSize: PageFilter?.pageSize,
                                            page: PageFilter?.page,
                                        }}
                                    />
                                </>
                            } />
                    </div>
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
        </AppLayout>
    )
}
export default ShowNetwork;