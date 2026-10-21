/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionColumn, PoolPublishersColumns } from '@/dev/columns/columns'
import { CustomDialogComponent, ReusablePageTitle } from '@/dev/core'
import { CustomBaseTable, SearchTools } from '@/dev/table'
import { useCustomDialogContextFactory, useDebounce } from '@/hooks'
import AppLayout from '@/layouts/app-layout'
import { BreadcrumbItem, SingleActionsHandler, TFilterOptions, TPaginationFilters } from '@/types'
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants'
import { Head, router } from '@inertiajs/react'
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import RejectModal from './modals/reject'
import networks from '@/routes/networks'

const PoolPublishersPage = ({ publishers }: any) => {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Pool'),
            href: networks.pool.publishers.url(),
        },
        {
            title: t('Publishers'),
            href: networks.pool.publishers.url(),
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
            publisher?: any;
            type?: 'advertiser' | 'publisher';
        }>();

    const ActionsHandlerMapping: SingleActionsHandler<any>[] = [
        {
            label: t('View Details'),
            onSelect: (data: any) => {
                router.visit(networks.pool.publishers.show(data?.id))
            },
        },
        {
            label: t('Approve'),
            onSelect: (data: any) =>{
                router.post(networks.pool.publishers.approve(data?.id))
            },
        },
        {
            label: t('Reject'),
            onSelect: (data: any) => {
                handleDialogContextSwitch({
                    Component: RejectModal,
                    componentProps: {
                        publisher: data,
                        type: 'publisher',
                    },
                });
            },
        },
    ];

    return (
        <AppLayout>
            <Head title={t("Pool - Publishers")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Publisher Pool")}
                    description={t("Review and approve publishers to add them to your network")}
                    breadcrumbs={breadcrumbs}
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
                                placeholder: t('Search publishers...'),
                                includeFilter: true,
                            },
                            columns: [
                                ...PoolPublishersColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                             OtherTools:SearchTools,
                            data: publishers?.data ?? [],
                            pageCount: publishers?.last_page ?? 1,
                            title: t('Publishers'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: publishers?.per_page,
                            page: publishers?.current_page,
                        }}
                    />
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
            </div>
        </AppLayout>
    );
};

export default PoolPublishersPage;
