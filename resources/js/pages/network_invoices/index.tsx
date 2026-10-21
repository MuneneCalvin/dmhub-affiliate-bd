/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useReducer } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import {
    BreadcrumbItem,
    TFilterOptions,
    TPaginationFilters,
    SingleActionsHandler,
} from '@/types';

import {
    FILTEROPTIONS,
    ReusableReducer,
} from '@/utils/constants';
import { useDebounce } from '@/hooks';
import { ActionColumn, NetworkInvoiceColumns } from '@/dev/columns/columns';
import { Plus } from 'lucide-react';
import networks from '@/routes/networks';

const NetworkInvoiceIndex = () => {
    const { t } = useTranslation();
    const { invoices, is_super_admin, is_network } = usePage<any>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Network Invoices'),
            href: '/networks/invoices',
        },
    ];
    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const markAsPaid = (id: number) => {
        if (confirm(t('Are you sure you want to mark this invoice as paid? This will affect network earnings.'))) {
            router.post(networks.invoices.markPaid.url(id), {
                payment_method: 'Manual',
                payment_reference: 'Admin Action'
            })

        }
    };
    const ActionsHandlerMapping: SingleActionsHandler<any>[] = [
        {
            label: (t('Mark as Paid')),
            onSelect: (data: any) => markAsPaid(data?.id),
            conditional: () => !!is_super_admin
        }
    ];
    return (
        <AppLayout>
            <Head title={t('Network Invoices')} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t('Network Invoices')}
                    description={t('Manage and track network payouts')}
                    breadcrumbs={breadcrumbs}
                    children={
                        is_network && (
                            <Button onClick={() => router.post(networks.invoices.store.url())}>
                                <Plus />
                                <span>{t('Generate Invoice')}</span>
                            </Button>
                        )}
                />
                <div className="w-full">
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
                                ...NetworkInvoiceColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                            OtherTools: SearchTools,
                            data: invoices?.data ?? [],
                            pageCount: invoices?.last_page ?? 1,
                            title: t('Invoices'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: invoices?.per_page ?? 15,
                            page: invoices?.current_page ?? 1,
                        }}
                    />
                </div>
            </div>
        </AppLayout>
    );
};

export default NetworkInvoiceIndex;
