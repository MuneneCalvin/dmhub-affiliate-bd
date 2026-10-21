/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useReducer } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import advertiser from '@/routes/advertiser';
import {
    BreadcrumbItem,
    TFilterOptions,
    TPaginationFilters,
    TNetwork,
    SingleActionsHandler,
    campaignsPageProps,
    TCampaign,
} from '@/types';

import {
    FILTEROPTIONS,
    ReusableReducer,
} from '@/utils/constants';
import { useDebounce } from '@/hooks';
import { ActionColumn, AdvertiserCampaignsColumns } from '@/dev/columns/columns';

const AdvertiserIndex = () => {
    const { t } = useTranslation();
    const { campaigns } = usePage<campaignsPageProps>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Campaigns'),
            href: advertiser.campaign.index.url(),
        },
    ];

    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const ActionsHandlerMapping: SingleActionsHandler<TCampaign>[] = [
        {
            label: (t('View')),
            onSelect: (data: any) => {
               router.visit(advertiser.campaign.show(data?.id))
            },
        }
    ];
    return (
        <AppLayout>
            <Head title={t('Campaigns')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t('Campaigns')}
                    description={t('Manage Your Campaigns here')}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-4">
                            <Button
                                className="rounded-xl px-4 py-2 cursor-pointer "
                                onClick={() =>
                                    router.visit(advertiser.campaign.create())
                                }>
                                <Plus size="medium" />
                                <p className="font-medium leading-6 text-lg">
                                    {t('Create Campaign')}
                                </p>
                            </Button>
                        </div>
                    }
                />
                <div className="w-full">
                    <CustomBaseTable
                        onPageChange={(page) =>
                            optionsDispatcher({
                                payload: { page },
                                type: 'page',
                            })
                        }
                        OtherToolsProps={{
                            onChange: (term: any) =>
                                optionsDispatcherDebounce({
                                    payload: { term },
                                    type: 'term',
                                }),
                            placeholder: t('Search'),
                            includeFilter: true,
                        }}
                        columns={[
                            ...AdvertiserCampaignsColumns,
                            ActionColumn({ ActionsHandlerMapping }),
                        ]}
                        OtherTools= {SearchTools}
                        data={campaigns?.results?.data ?? []}
                        pageCount={campaigns?.results?.last_page ?? 1}
                        title={t('Campaigns')}
                        showPagination
                        setPageSize={(pageSize) =>
                            optionsDispatcher({
                                payload: { pageSize },
                                type: 'pageSize',
                            })
                        }
                        pageSize={campaigns?.results?.per_page}
                        page={campaigns?.results?.current_page}
                    />
                </div>
            </div>
        </AppLayout>
    );
};

export default AdvertiserIndex;
