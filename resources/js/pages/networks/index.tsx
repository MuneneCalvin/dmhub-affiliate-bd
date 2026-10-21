/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { CustomDialogComponent, ReusableAlertModal, ReusablePageTitle } from '@/dev/core';
import { useCustomDialogContextFactory, useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import networks, { show, activate, deactivate } from '@/routes/networks';
import { BreadcrumbItem, NetworkPageProps, SharedData, SingleActionsHandler, TFilterOptions, TNetwork, TPaginationFilters } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { AddNetworksForm } from './networks_modals/index_modals';
import { useTranslation } from 'react-i18next';
import { ActionColumn, NetworksColumns } from '@/dev/columns/columns';
import { useReducer } from 'react';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { EditNetworkModal } from './networks_modals/edit_modal';
import { CustomBaseTable, SearchTools } from '@/dev/table';

const NetworksPage = () => {
    const { networksData, auth } = usePage<NetworkPageProps & SharedData>().props;

    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Networks'),
            href: networks.index.url(),
        }
    ];
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            networks?: TNetwork,
        }>();

    const ActionsHandlerMapping: SingleActionsHandler<TNetwork>[] = [
        {
            label: t('View'),
            onSelect: (data: TNetwork) => {
                router.visit(show.url(data?.id))
            }
        },
        {
            label: t('Edit'),
            onSelect: (data: TNetwork) => {
                handleDialogContextSwitch({
                    Component: EditNetworkModal,
                    componentProps: { data },
                });
            },
        },
        ...(auth?.user?.is_super_admin === 'Y' ? [
            {
                label: t('Approve'),
                onSelect: (data: TNetwork) => {
                    handleDialogContextSwitch({
                        Component: ReusableAlertModal,
                        componentProps: {
                            title: t('Approve Network'),
                            description: t('Are you sure you want to approve this network?'),
                            confirmText: t('Approve'),
                            cancelText: t('Cancel'),
                            variant: 'default',
                            onConfirm: () => {
                                router.post(activate.url(data?.id));
                            },
                            onClose: () => handleDialogContextSwitch({}),
                        },
                    });
                },
                conditional: (data: TNetwork) => data?.status !== 'A',
            },
            {
                label: t('Deactivate'),
                onSelect: (data: TNetwork) => {
                    handleDialogContextSwitch({
                        Component: ReusableAlertModal,
                        componentProps: {
                            title: t('Deactivate Network'),
                            description: t('Are you sure you want to deactivate this network?'),
                            confirmText: t('Deactivate'),
                            cancelText: t('Cancel'),
                            variant: 'delete',
                            onConfirm: () => {
                                router.post(deactivate.url(data?.id));
                            },
                            onClose: () => handleDialogContextSwitch({}),
                        },
                    });
                },
                conditional: (data: TNetwork) => data?.status === 'A',
            },
        ] : []),
    ];

    return (
        <AppLayout>
            <Head title={t("Networks")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Networks")}
                    description={t("Manage networks here")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-4">
                            <Button
                                className="bg-primary flex items-center gap-2"
                                onClick={() =>
                                    handleDialogContextSwitch({
                                        Component: AddNetworksForm,
                                    })
                                }>
                                <Plus size="medium" />
                                <p className="font-medium leading-6 text-lg">
                                    {t('Add Network')}
                                </p>
                            </Button>
                        </div>
                    } />
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
                            ...NetworksColumns,
                            ActionColumn({ ActionsHandlerMapping }),
                        ],
                        OtherTools:SearchTools,
                        data: networksData?.results ?? [],
                        pageCount: networksData?.pageCount ?? 1,
                        title: t('Networks'),
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
    );
};
export default NetworksPage;
