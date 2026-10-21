/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ActionColumn,
    MyCampaignsColumns
} from '@/dev/columns/columns';
import { CustomDialogComponent, ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useCustomDialogContextFactory, useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import publishers from '@/routes/publishers';
import publisher from '@/routes/publisher';
import {
    BreadcrumbItem,
    SingleActionsHandler,
    TFilterOptions,
    TPaginationFilters
} from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Head, router, usePage } from '@inertiajs/react';
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next';
import QrCodeModal from './modals/qrcode';

const MyCampaignsIndexPage = () => {
    const { t } = useTranslation();
    const { campaigns } = usePage<any>().props;
    const [filter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            campaignId?: number;
            campaignName?: string;
        }>();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('My Campaigns'),
            href: publishers.my.campaign.url(),
        },
    ];

    const ActionsHandlerMapping: SingleActionsHandler<any>[] = [
        {
            label: t('View'),
            onSelect:(data: any) => {
                router.visit(publishers.my.campaign.show(data?.publisher_campaign_id))
            }
        },
        {
            label: t('QR Code'),
            onSelect:(data: any) => {
                handleDialogContextSwitch({
                    Component: QrCodeModal,
                    componentProps: {
                        campaignId: data?.publisher_campaign_id,
                        campaignName: data?.campaign_name,
                    },
                });
            }
        },
        {
            label: t('Script'),
            onSelect:(data: any) => {
                router.visit(publisher.scripts.show.url(data?.publisher_campaign_id))
            }
        },
        {
            label: t('View docs'),
            onSelect:(data: any) => {
                router.visit(publisher.scripts.docs.url(data?.publisher_campaign_id))
            }
        }
    ];

    return (
        <AppLayout>
            <Head title={t("My Campaigns")} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <ReusablePageTitle
                    title={t("My Campaigns")}
                    description={t('View and manage your campaigns')}
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
                                placeholder: t('Search'),
                                includeFilter: true,
                            },
                            columns: [
                                ...MyCampaignsColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                            OtherTools: SearchTools,
                            data: campaigns?.data ?? [],
                            pageCount: campaigns?.last_page ?? 1,
                            title: t('My Campaigns'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: campaigns?.per_page ?? 25,
                            page: campaigns?.current_page ?? 1,
                        }}
                    />
                </div>
            </div>

            <CustomDialogComponent
                {...{ handleDialogContextSwitch, dialogOpen }}
                className='sm:max-w-md'>
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

export default MyCampaignsIndexPage;
