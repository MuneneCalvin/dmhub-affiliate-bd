import FinanceErrorNotice from '@/components/finance-error-notice';
import RecordPayment from '@/components/record-payment';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import AppLayout from '@/layouts/app-layout';
import {
    BreadcrumbItem,
    SingleActionsHandler,
    TFilterOptions,
    TPaginationFilters,
} from '@/types';

import { ActionColumn, NetworkInvoiceColumns } from '@/dev/columns/columns';
import { useDebounce } from '@/hooks';
import networks from '@/routes/networks';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Plus } from 'lucide-react';

const NetworkInvoiceIndex = () => {
    const { t } = useTranslation();
    const { invoices, is_super_admin, is_network, currencies } =
        usePage<any>().props;
    const [currency, setCurrency] = useState<string>(currencies[0]);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [cancelId, setCancelId] = useState<number | null>(null);
    const cancelForm = useForm({ reason: '' });
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Network Invoices'),
            href: '/networks/invoices',
        },
    ];
    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 },
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const ActionsHandlerMapping: SingleActionsHandler<any>[] = [
        {
            label: t('Approve'),
            onSelect: (data) =>
                router.post(`/networks/invoices/${data.id}/approve`),
            conditional: (data) =>
                !!is_super_admin && data.status === 'pending',
        },
        {
            label: t('Cancel invoice'),
            onSelect: (data) => setCancelId(data.id),
            conditional: (data) =>
                !!is_super_admin &&
                ['pending', 'approved'].includes(data.status),
        },
        {
            label: t('Record payment'),
            onSelect: (data) =>
                setPaymentUrl(networks.invoices.markPaid.url(data.id)),
            conditional: (data) =>
                !!is_super_admin && data.status === 'approved',
        },
    ];
    return (
        <AppLayout>
            <FinanceErrorNotice />
            <RecordPayment
                url={paymentUrl}
                onClose={() => setPaymentUrl(null)}
            />
            <Head title={t('Network Invoices')} />

            <div className="workspace-page flex h-full flex-1 flex-col gap-4">
                <ReusablePageTitle
                    title={t('Network Invoices')}
                    description={t('Manage and track network payouts')}
                    breadcrumbs={breadcrumbs}
                    children={
                        is_network && (
                            <div className="flex flex-wrap items-center gap-3">
                                <Label htmlFor="network-currency">
                                    {t('Currency')}
                                </Label>
                                <select
                                    id="network-currency"
                                    className="rounded-md border bg-background p-2"
                                    value={currency}
                                    onChange={(e) =>
                                        setCurrency(e.target.value)
                                    }
                                >
                                    {currencies.map((code: string) => (
                                        <option key={code}>{code}</option>
                                    ))}
                                </select>
                                <Button
                                    onClick={() =>
                                        router.post(
                                            networks.invoices.store.url(),
                                            { currency },
                                        )
                                    }
                                >
                                    <Plus />
                                    <span>{t('Generate Invoice')}</span>
                                </Button>
                            </div>
                        )
                    }
                />
                {cancelId && (
                    <form
                        className="space-y-3 rounded-xl border bg-card p-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            cancelForm.post(
                                `/networks/invoices/${cancelId}/reject`,
                                { onSuccess: () => setCancelId(null) },
                            );
                        }}
                    >
                        <Label htmlFor="cancel-reason">
                            {t('Cancellation reason')}
                        </Label>
                        <Input
                            id="cancel-reason"
                            required
                            maxLength={500}
                            value={cancelForm.data.reason}
                            onChange={(e) =>
                                cancelForm.setData('reason', e.target.value)
                            }
                        />
                        {cancelForm.errors.reason && (
                            <p role="alert" className="text-destructive">
                                {cancelForm.errors.reason}
                            </p>
                        )}
                        <Button disabled={cancelForm.processing}>
                            {t('Cancel invoice')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCancelId(null)}
                        >
                            {t('Keep invoice')}
                        </Button>
                    </form>
                )}
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
