/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionColumn, PoolAdvertisersColumns } from '@/dev/columns/columns'
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

const PoolAdvertisersPage = ({ advertisers }: any) => {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Pool'),
            href: networks.pool.advertisers.url(),
        },
        {
            title: t('Advertisers'),
            href:networks.pool.advertisers.url(),
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
            advertiser?: any;
            type?: 'advertiser' | 'publisher';
        }>();

    const ActionsHandlerMapping: SingleActionsHandler<any>[] = [
        {
            label: t('View Details'),
            onSelect: (data: any) => {
                router.visit(networks.pool.advertisers.show(data?.id))
            },
        },
        {
            label: t('Approve'),
            onSelect:(data: any) =>{
                router.post(networks.pool.advertisers.approve(data?.id))
            }
        },
        {
            label: t('Reject'),
            onSelect: (data: any) => {
                handleDialogContextSwitch({
                    Component: RejectModal,
                    componentProps: {
                        advertiser: data,
                        type: 'advertiser',
                    },
                });
            },
        },
    ];

    return (
        <AppLayout>
            <Head title={t("Pool - Advertisers")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Advertiser Pool")}
                    description={t("Review and approve advertisers to add them to your network")}
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
                                placeholder: t('Search advertisers...'),
                                includeFilter: true,
                            },
                            columns: [
                                ...PoolAdvertisersColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                             OtherTools:SearchTools,
                            data: advertisers?.data ?? [],
                            pageCount: advertisers?.last_page ?? 1,
                            title: t('Advertisers'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: advertisers?.per_page,
                            page: advertisers?.current_page,
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

export default PoolAdvertisersPage;
