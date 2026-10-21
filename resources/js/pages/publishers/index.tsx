/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button'
import { ActionColumn, PublishersColumns } from '@/dev/columns/columns'
import { CustomDialogComponent, ReusablePageTitle, useConfirmationDialog } from '@/dev/core'
import { CustomBaseTable, SearchTools } from '@/dev/table'
import { useCustomDialogContextFactory, useDebounce } from '@/hooks'
import AppLayout from '@/layouts/app-layout'
import publishers, { show } from '@/routes/publishers'
import { BreadcrumbItem, SingleActionsHandler, TFilterOptions, TPaginationFilters, TPublisher } from '@/types'
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants'
import { Head, router, usePage } from '@inertiajs/react'
import { Plus } from 'lucide-react'
import React, { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import CreatePublisherForm from './publisher_modals/create'
import EditPublisherForm from './publisher_modals/edit'
import { ChangeNetworkModal } from './publisher_modals/change-network'

const PublishersPage = () => {
    const { t } = useTranslation();
    const { pbshers } = usePage<any>().props;
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Publishers'),
            href: publishers.index.url(),
        },
    ];
    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            publishers?: TPublisher,
        }>();

    const ActionsHandlerMapping: SingleActionsHandler<TPublisher>[] = [
        {
            label: t('View'),
            onSelect: (data: any) => {
                router.visit(show.url(data?.id))
            }
        },
        {
            label: t('Edit'),
            onSelect: (data: any) => {
                handleDialogContextSwitch({
                    Component: EditPublisherForm,
                    componentProps: {
                        data
                    }
                })
            }
        },
        {
            label: t('Change Network'),
            onSelect: (data: any) => {
                handleDialogContextSwitch({
                    Component: ChangeNetworkModal,
                    componentProps: {
                        data: data,
                        currentNetworkId: data?.network_id,
                    },
                })
            }
        },
        {
            label: t('Deactivate'),
            onSelect: (data: any) => {
                confirm({
                    title: t('Deactivate Publisher'),
                    description: t('Are you sure you want to deactivate {{name}}?', { name: `${data?.first_name} ${data?.last_name}` }),
                    confirmLabel: t('Deactivate'),
                    cancelLabel: t('Cancel'),
                    variant: 'destructive',
                    onConfirm: () => {
                        router.post(publishers.deactivate.url(data?.id), {}, {
                            preserveScroll: true,
                        });
                    },
                });
            },
        },
    ]
    return (
        <AppLayout>
            <Head title={t("Publishers")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Publishers")}
                    description={t('Manage Publishers here')}
                    breadcrumbs={breadcrumbs}
                    children={
                        <Button
                            className="rounded-xl px-4 py-2 cursor-pointer bg-gray-800 dark:bg-gray-200 dark:text-gray-800"
                            onClick={() =>
                                handleDialogContextSwitch({
                                    Component: CreatePublisherForm,
                                })
                            }>
                            <Plus size="medium" />
                            <p className="font-medium leading-6 text-lg">
                                {t('Add Publisher')}
                            </p>
                        </Button>
                    }
                />
                <div className='w-full'>
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
                                ...PublishersColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                            OtherTools:SearchTools,
                            data: pbshers?.data ?? [],
                            pageCount: pbshers?.last_page ?? 1,
                            title: t('Publishers'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: pbshers?.per_page,
                            page: pbshers?.current_page,
                        }}
                    />
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

                <ConfirmDialog />
            </div>
        </AppLayout>
    )
}
export default PublishersPage
